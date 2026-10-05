import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { notFound } from "../common/errors";
import { kstDate } from "../domain/calendar";
import { HolidaysRepository } from "./holidays.repository";

export type HolidayApiItem = {
  locdate?: number | string;
  dateName?: string;
  isHoliday?: string;
};

type HolidayApiBody = {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: HolidayApiItem | HolidayApiItem[] }; totalCount?: number };
  };
};

export const serviceKeyOf = (raw: string) => {
  const value = raw.trim();
  try {
    const once = decodeURIComponent(value);
    return once.includes("%") ? decodeURIComponent(once) : once;
  } catch {
    return value;
  }
};

export const restDeInfoUrl = (key: string, year: number, page: number) => {
  const url = new URL("https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo");
  url.searchParams.set("serviceKey", serviceKeyOf(key));
  url.searchParams.set("solYear", String(year));
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", String(page));
  url.searchParams.set("_type", "json");
  return url;
};

export const restDaysOf = (json: HolidayApiBody) => {
  const item = json.response?.body?.items?.item ?? [];
  const rows = Array.isArray(item) ? item : item ? [item] : [];
  return rows.flatMap((row) => {
    if (!row.locdate || !row.dateName) return [];
    if (String(row.isHoliday ?? "Y").toUpperCase() !== "Y") return [];
    return [
      {
        date: String(row.locdate).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
        name: String(row.dateName),
      },
    ];
  });
};

@Injectable()
export class HolidaysService implements OnModuleInit, OnModuleDestroy {
  private syncState: { status: "idle" | "ok" | "degraded"; at: string | null; count: number; message?: string } = {
    status: "idle",
    at: null,
    count: 0,
  };
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly repo: HolidaysRepository,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    void this.sync();
    this.timer = setInterval(() => {
      void this.sync();
    }, 6 * 60 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  list() {
    return this.repo.list();
  }

  status() {
    return this.syncState;
  }

  addManual(date: string, name: string) {
    return this.repo.upsert({ date, name, source: "manual" });
  }

  async remove(date: string) {
    const row = await this.repo.remove(date);
    if (!row) throw notFound("HOLIDAY_NOT_FOUND", "공휴일을 찾지 못했어요");
    return { status: "ok" };
  }

  async fetchYear(year: number): Promise<{ date: string; name: string }[]> {
    const key = serviceKeyOf(this.config.get<string>("DATA_GO_KR_SERVICE_KEY") ?? "");
    if (!key) throw new Error("HOLIDAY_KEY_MISSING");
    const rows: { date: string; name: string }[] = [];
    let page = 1;
    let total = 1;
    while ((page - 1) * 100 < total && page <= 6) {
      const json = await this.pullPage(key, year, page);
      total = Number(json.response?.body?.totalCount ?? 0);
      const pageRows = restDaysOf(json);
      rows.push(...pageRows);
      if (!total) total = pageRows.length;
      if (!json.response?.body?.items?.item) break;
      page += 1;
    }
    return rows;
  }

  async sync() {
    const year = Number(kstDate().slice(0, 4));
    try {
      const rows = [...(await this.fetchYear(year)), ...(await this.fetchYear(year + 1))];
      const unique = [...new Map(rows.map((row) => [row.date, row])).values()];
      for (const row of unique) await this.repo.upsertApi({ ...row, source: "api" });
      this.syncState = { status: "ok", at: new Date().toISOString(), count: unique.length, message: undefined };
      return this.syncState;
    } catch (err) {
      const missing = err instanceof Error && err.message === "HOLIDAY_KEY_MISSING";
      this.syncState = {
        status: "degraded",
        at: new Date().toISOString(),
        count: 0,
        message: missing
          ? "특일정보 키가 없어 국가 공휴일을 못 가져왔어요"
          : "특일정보를 못 가져왔어요. 마지막 캐시와 직접 넣은 공휴일로 보여요",
      };
      return this.syncState;
    }
  }

  private async pullPage(key: string, year: number, page: number): Promise<HolidayApiBody> {
    const res = await fetch(restDeInfoUrl(key, year, page), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error("holiday api failed");
    const text = await res.text();
    let json: HolidayApiBody;
    try {
      json = JSON.parse(text) as HolidayApiBody;
    } catch {
      throw new Error("holiday api failed");
    }
    const code = json.response?.header?.resultCode;
    if (code && code !== "00") throw new Error("holiday api failed");
    return json;
  }
}
