import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { deviceTag } from "@nuri/shared";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { Observable, tap } from "rxjs";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { auditEvents, carriers, companies, displayDevices, holidays, invites, shipments, users } from "../db/schema";

export type ActivityKind = "work" | "login";

export type ActivityItem = {
  at: string;
  actor: string;
  talk: string;
  requestId: string;
  ok: boolean;
  email: string;
  kind: ActivityKind;
  detail: string;
};

export type ActivityQuery = {
  kind?: string;
  q?: string;
  page?: number;
  limit?: number;
};

type ActivityPreview = {
  kind: ActivityKind;
  email: string;
  detail: string;
  talk: string;
  actor: string;
};

type AuditReq = {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, string | undefined>;
  user?: { sub?: string; kind?: string; role?: string };
  body?: {
    name?: string;
    email?: string;
    ids?: string[];
    companyName?: string;
    date?: string;
    totpRequired?: boolean;
    token?: string;
    code?: string;
  };
};

const SKIP_PREFIX = ["/api/auth/refresh", "/api/auth/logout", "/api/events", "/api/docs", "/api/health"];
const SKIP_EXACT = ["/api/auth/login"];

const LOGIN_KEYS = new Set([
  "POST /api/auth/login/verify",
  "POST /api/auth/register",
  "POST /api/auth/register/verify",
  "POST /api/auth/recovery/start",
]);

const talkBy = [
  ["POST /api/companies", "업체를 등록했어요"],
  ["PATCH /api/companies/:id", "업체 이름을 바꿨어요"],
  ["DELETE /api/companies/:id", "업체를 지웠어요"],
  ["POST /api/companies/bulk-delete", "업체를 여러 곳 지웠어요"],
  ["POST /api/shipments", "발송을 추가했어요"],
  ["PATCH /api/shipments/:id", "발송을 고쳤어요"],
  ["DELETE /api/shipments/:id", "발송을 지웠어요"],
  ["POST /api/holidays", "쉬는 날을 넣었어요"],
  ["DELETE /api/holidays/:date", "쉬는 날을 지웠어요"],
  ["POST /api/holidays/sync", "쉬는 날을 가져왔어요"],
  ["POST /api/carriers", "택배사를 등록했어요"],
  ["PATCH /api/carriers/:id", "택배사를 고쳤어요"],
  ["DELETE /api/carriers/:id", "택배사를 지웠어요"],
  ["POST /api/devices/approve", "화면을 연결했어요"],
  ["POST /api/devices/claim", "화면이 들어왔어요"],
  ["POST /api/devices/:id/revoke", "화면 연결을 끊었어요"],
  ["POST /api/auth/invites", "초대를 보냈어요"],
  ["DELETE /api/auth/users/:id", "계정을 지웠어요"],
  ["PATCH /api/auth/security", "로그인 방식을 바꿨어요"],
  ["POST /api/auth/login/verify", "로그인했어요"],
  ["POST /api/auth/register", "초대를 수락하고 들어왔어요"],
  ["POST /api/auth/register/verify", "인증 앱을 등록하고 들어왔어요"],
  ["POST /api/auth/recovery/start", "비밀번호를 다시 만들고 들어왔어요"],
] as const;

export const normalizePath = (path: string) =>
  path
    .split("?")[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/\d{4}-\d{2}-\d{2}(?=\/|$)/, "/:date");

export const kindFor = (method: string, path: string): ActivityKind =>
  LOGIN_KEYS.has(`${method} ${normalizePath(path)}`) ? "login" : "work";

export const searchTerm = (term: string) => term.replace(/[%_\\]/g, "").trim();

export const talkFor = (method: string, path: string, detail = "", ok = true) => {
  const key = `${method} ${normalizePath(path)}`;
  if (key === "POST /api/auth/login/verify" && !ok) return "로그인에 실패했어요";
  const base = talkBy.find(([row]) => row === key)?.[1] ?? "작업을 처리했어요";
  const sentence = (() => {
    if (!detail) return base;
    if (key === "POST /api/companies") return `${detail} 업체를 등록했어요`;
    if (key === "PATCH /api/companies/:id") return `${detail} 업체 이름을 바꿨어요`;
    if (key === "DELETE /api/companies/:id") return `${detail} 업체를 지웠어요`;
    if (key === "POST /api/companies/bulk-delete") return `${detail} 업체를 지웠어요`;
    if (key === "POST /api/shipments") return `${detail} 발송을 추가했어요`;
    if (key === "PATCH /api/shipments/:id") return `${detail} 발송을 고쳤어요`;
    if (key === "DELETE /api/shipments/:id") return `${detail} 발송을 지웠어요`;
    if (key === "POST /api/holidays") return `${detail} 쉬는 날을 넣었어요`;
    if (key === "DELETE /api/holidays/:date") return `${detail} 쉬는 날을 지웠어요`;
    if (key === "POST /api/carriers") return `${detail} 택배사를 등록했어요`;
    if (key === "PATCH /api/carriers/:id") return `${detail} 택배사를 고쳤어요`;
    if (key === "DELETE /api/carriers/:id") return `${detail} 택배사를 지웠어요`;
    if (key === "POST /api/auth/invites") return `${detail}에 초대를 보냈어요`;
    if (key === "DELETE /api/auth/users/:id") return `${detail} 계정을 지웠어요`;
    if (key === "POST /api/devices/approve") return `${detail} 화면을 연결했어요`;
    if (key === "POST /api/devices/claim") return `${detail} 화면이 들어왔어요`;
    if (key === "POST /api/devices/:id/revoke") return `${detail} 화면 연결을 끊었어요`;
    if (key === "PATCH /api/auth/security") return `${detail}${roFor(detail)} 로그인하게 바꿨어요`;
    if (key.startsWith("POST /api/auth/")) return `${detail} ${base}`;
    return `${detail} · ${base}`;
  })();
  if (!ok && !sentence.includes("실패")) return `${sentence} · 실패`;
  return sentence;
};

export const roFor = (word: string) => {
  const last = [...word.trim()].at(-1);
  if (!last) return "로";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "로";
  const batchim = (code - 0xac00) % 28;
  return batchim === 0 || batchim === 8 ? "로" : "으로";
};

export const loginFinished = (result: unknown) => {
  if (!result || typeof result !== "object") return false;
  const row = result as { mode?: string; status?: string };
  if (row.mode === "enroll") return false;
  return row.status === "ok" || row.mode === "ready";
};

export const actorFor = (user?: { kind?: string; role?: string }) => {
  if (user?.kind === "device") return "화면";
  if (user?.role === "owner") return "소유자";
  if (user?.kind === "admin") return "관리자";
  return "손님";
};

const skipPath = (path: string) => {
  const clean = path.split("?")[0];
  return SKIP_EXACT.includes(clean) || SKIP_PREFIX.some((row) => clean.startsWith(row));
};

const idIn = (path: string) =>
  path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? "";

const dateIn = (path: string) => path.match(/\/(\d{4}-\d{2}-\d{2})(?:\?|$)/)?.[1] ?? "";

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) && value >= min ? Math.min(max, Math.floor(value)) : fallback;

@Injectable()
export class ActivityService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async record(item: Omit<ActivityItem, "at"> & { at?: string }) {
    await this.db.insert(auditEvents).values({
      actor: item.actor,
      talk: item.talk,
      requestId: item.requestId,
      ok: item.ok,
      email: item.email,
      kind: item.kind,
      detail: item.detail,
    });
  }

  async list(query: ActivityQuery = {}) {
    const kind = query.kind === "login" || query.kind === "work" ? query.kind : undefined;
    const term = searchTerm(query.q ?? "");
    const page = clamp(Number(query.page), 1, 9999, 1);
    const limit = clamp(Number(query.limit), 1, 50, 20);
    const filters = [
      ...(kind ? [eq(auditEvents.kind, kind)] : []),
      ...(term
        ? [
            or(
              ilike(auditEvents.talk, `%${term}%`),
              ilike(auditEvents.email, `%${term}%`),
              ilike(auditEvents.detail, `%${term}%`),
              ilike(auditEvents.actor, `%${term}%`),
            ),
          ]
        : []),
    ];
    const where = filters.length ? and(...filters) : undefined;
    const [{ total }] = await this.db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(auditEvents)
      .where(where);
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const rows = await this.db
      .select()
      .from(auditEvents)
      .where(where)
      .orderBy(desc(auditEvents.at))
      .limit(limit)
      .offset((safePage - 1) * limit);
    return {
      items: rows.map((row) => ({
        at: row.at.toISOString(),
        actor: row.actor,
        talk: row.talk,
        requestId: row.requestId,
        ok: row.ok,
        email: row.email,
        kind: (row.kind === "login" ? "login" : "work") as ActivityKind,
        detail: row.detail,
      })),
      page: safePage,
      pages,
      total,
    };
  }

  async preview(req: AuditReq) {
    const method = req.method ?? "";
    const path = req.originalUrl ?? req.url ?? "";
    const body = req.body ?? {};
    const kind = kindFor(method, path);
    const actorEmail = await this.emailOf(req.user?.sub);
    const detail = await this.subject(method, path, body);
    const email = (kind === "login" ? String(body.email ?? "").trim().toLowerCase() : "") || actorEmail || detailEmail(path, body, detail);
    return {
      kind,
      email,
      detail,
      talk: talkFor(method, path, detail),
      actor: actorFor(req.user),
    };
  }

  async commit(req: AuditReq, preview: ActivityPreview, ok: boolean, result?: unknown) {
    const method = req.method ?? "";
    const path = req.originalUrl ?? req.url ?? "";
    if (preview.kind === "login" && ok && !loginFinished(result)) return;
    const detail = ok ? await this.detailAfter(method, path, preview.detail, result) : preview.detail;
    await this.record({
      actor: await this.actorAfter(method, path, preview, ok),
      talk: talkFor(method, path, detail, ok),
      requestId: req.headers?.["x-request-id"] ?? "",
      ok,
      email: preview.email,
      kind: preview.kind,
      detail,
    });
  }

  private async actorAfter(method: string, path: string, preview: ActivityPreview, ok: boolean) {
    if (ok && `${method} ${normalizePath(path)}` === "POST /api/devices/claim") return "화면";
    if (preview.kind !== "login" || !ok || !preview.email) return preview.actor;
    const role = await this.roleOf(preview.email);
    if (role === "owner") return "소유자";
    if (role) return "관리자";
    return preview.actor;
  }

  private async detailAfter(method: string, path: string, detail: string, result?: unknown) {
    const key = `${method} ${normalizePath(path)}`;
    if (key === "POST /api/devices/approve" || key === "POST /api/devices/claim") {
      const id = resultId(result);
      if (id) return this.deviceLabel(id);
    }
    return detail;
  }

  private async emailOf(userId?: string) {
    if (!userId) return "";
    const [row] = await this.db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    return row?.email ?? "";
  }

  private async roleOf(email: string) {
    const [row] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    return row?.role ?? "";
  }

  private async subject(method: string, path: string, body: NonNullable<AuditReq["body"]>) {
    const key = `${method} ${normalizePath(path)}`;
    const id = idIn(path);
    if (key === "POST /api/companies" || key === "PATCH /api/companies/:id") return String(body.name ?? "").trim();
    if (key === "DELETE /api/companies/:id") return this.nameOf(companies, id);
    if (key === "POST /api/companies/bulk-delete") return this.namesOf(companies, body.ids ?? []);
    if (key === "POST /api/shipments") return String(body.companyName ?? "").trim();
    if (key === "PATCH /api/shipments/:id" || key === "DELETE /api/shipments/:id") return this.shipmentName(id);
    if (key === "POST /api/carriers" || key === "PATCH /api/carriers/:id") return String(body.name ?? "").trim();
    if (key === "DELETE /api/carriers/:id") return this.nameOf(carriers, id);
    if (key === "POST /api/holidays") return [body.date, body.name].filter(Boolean).join(" ");
    if (key === "DELETE /api/holidays/:date") return this.holidayName(dateIn(path));
    if (key === "POST /api/auth/invites") return String(body.email ?? "").trim().toLowerCase();
    if (key === "DELETE /api/auth/users/:id") return this.emailOf(id);
    if (key === "POST /api/devices/:id/revoke") return this.deviceLabel(id);
    if (key === "PATCH /api/auth/security") return body.totpRequired ? "인증 앱" : "비밀번호";
    if (key === "POST /api/auth/register" || key === "POST /api/auth/recovery/start") {
      return this.inviteEmail(String(body.token ?? ""));
    }
    if (key === "POST /api/auth/login/verify") return String(body.email ?? "").trim().toLowerCase();
    return "";
  }

  private async nameOf(table: typeof companies | typeof carriers, id: string) {
    if (!id) return "";
    const [row] = await this.db.select({ name: table.name }).from(table).where(eq(table.id, id)).limit(1);
    return row?.name ?? "";
  }

  private async namesOf(table: typeof companies, ids: string[]) {
    if (!ids.length) return "";
    const rows = await this.db.select({ name: table.name }).from(table).where(inArray(table.id, ids));
    return rows.map((row) => row.name).join(", ");
  }

  private async shipmentName(id: string) {
    if (!id) return "";
    const [row] = await this.db
      .select({ name: companies.name })
      .from(shipments)
      .innerJoin(companies, eq(shipments.companyId, companies.id))
      .where(eq(shipments.id, id))
      .limit(1);
    return row?.name ?? "";
  }

  private async holidayName(date: string) {
    if (!date) return "";
    const [row] = await this.db.select().from(holidays).where(eq(holidays.date, date)).limit(1);
    return row ? `${row.date} ${row.name}` : date;
  }

  private async deviceLabel(id: string) {
    if (!id) return "";
    const [row] = await this.db.select({ name: displayDevices.name }).from(displayDevices).where(eq(displayDevices.id, id)).limit(1);
    return [deviceTag(id), row?.name].filter(Boolean).join(" ");
  }

  private async inviteEmail(token: string) {
    if (!token) return "";
    const [row] = await this.db.select({ email: invites.email }).from(invites).where(eq(invites.token, token)).limit(1);
    return row?.email ?? "";
  }
}

const resultId = (value: unknown) => {
  if (!value || typeof value !== "object" || !("deviceId" in value)) return "";
  const id = (value as { deviceId?: unknown }).deviceId;
  return typeof id === "string" ? id : "";
};

const detailEmail = (path: string, body: NonNullable<AuditReq["body"]>, detail: string) => {
  if (body.email) return String(body.email).trim().toLowerCase();
  if (normalizePath(path).includes("/auth/users") || normalizePath(path).includes("/auth/invites")) return detail;
  return "";
};

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private readonly activity: ActivityService) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = ctx.switchToHttp().getRequest<AuditReq>();
    const method = req.method ?? "";
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next.handle();
    const path = req.originalUrl ?? req.url ?? "";
    if (skipPath(path)) return next.handle();
    const preview = await this.activity.preview(req);
    return next.handle().pipe(
      tap({
        next: (result) => {
          void this.activity.commit(req, preview, true, result);
        },
        error: () => {
          void this.activity.commit(req, preview, false);
        },
      }),
    );
  }
}
