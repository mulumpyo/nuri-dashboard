import { describe, expect, it } from "vitest";
import type { BoardDay } from "@nuri/shared";
import { BOARD_ROWS, dayPages, flattenDay, pageIndex, viewDays } from "./page-board";

const company = (id: string, name: string) => ({
  companyId: id,
  shipmentId: id,
  name,
  boxCount: 1,
  payType: "prepaid" as const,
  shipTime: null,
  note: "",
});

const day = (carriers: BoardDay["carriers"]): BoardDay => ({
  date: "2026-10-10",
  label: "오늘",
  isToday: true,
  isTomorrow: false,
  carriers,
});

describe("page-board", () => {
  it("keeps nine rows on a page and shows the carrier again after a cut", () => {
    const rows = Array.from({ length: 10 }, (_, i) => company(`s${i}`, `업체${i}`));
    const pages = dayPages(
      day([{ carrierId: "c1", name: "CJ", companies: rows }]),
    );
    expect(BOARD_ROWS).toBe(9);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(9);
    expect(pages[1]).toHaveLength(1);
    expect(pages[0][0]?.showCarrier).toBe(true);
    expect(pages[0][1]?.showCarrier).toBe(false);
    expect(pages[1][0]?.showCarrier).toBe(true);
    expect(pages[1][0]?.name).toBe("업체9");
  });

  it("splits carrier groups across pages without dropping a row", () => {
    const board = day([
      { carrierId: "a", name: "CJ", companies: [company("a1", "한빛"), company("a2", "샛별")] },
      {
        carrierId: "b",
        name: "퀵발송",
        companies: Array.from({ length: 9 }, (_, i) => company(`b${i}`, `퀵${i}`)),
      },
    ]);
    expect(flattenDay(board)).toHaveLength(11);
    const pages = dayPages(board);
    expect(pages[0]?.some((row) => row.name === "한빛")).toBe(true);
    expect(pages[1]?.[0]?.carrier).toBe("퀵발송");
    expect(pages[1]?.[0]?.showCarrier).toBe(true);
  });

  it("keeps 경기택배 at the top of a day", () => {
    const rows = flattenDay(
      day([
        { carrierId: "cj", name: "CJ", companies: [company("c1", "한빛")] },
        { carrierId: "qk", name: "퀵발송", companies: [company("q1", "샛별")] },
        { carrierId: "gg", name: "경기택배", companies: [company("g1", "누리")] },
      ]),
    );
    expect(rows.map((row) => row.carrier)).toEqual(["경기택배", "CJ", "퀵발송"]);
    expect(rows[0]?.name).toBe("누리");
  });

  it("walks pages per day from the same tick", () => {
    const long = day([
      {
        carrierId: "c1",
        name: "CJ",
        companies: Array.from({ length: 10 }, (_, i) => company(`s${i}`, `업체${i}`)),
      },
    ]);
    const short = { ...long, date: "2026-10-12", label: "월", isToday: false };
    short.carriers = [{ carrierId: "c1", name: "CJ", companies: [company("x", "한빛")] }];
    expect(pageIndex(2, 0)).toBe(0);
    expect(pageIndex(2, 1)).toBe(1);
    expect(pageIndex(2, 2)).toBe(0);
    const first = viewDays([long, short], 0);
    const next = viewDays([long, short], 1);
    expect(first[0]?.page[0]?.name).toBe("업체0");
    expect(next[0]?.page[0]?.name).toBe("업체9");
    expect(first[1]?.pageCount).toBe(1);
    expect(next[1]?.page[0]?.name).toBe("한빛");
  });

  it("keeps every row on one page when paging is off", () => {
    const long = day([
      {
        carrierId: "c1",
        name: "CJ",
        companies: Array.from({ length: 10 }, (_, i) => company(`s${i}`, `업체${i}`)),
      },
    ]);
    const all = viewDays([long], 3, false);
    expect(all[0]?.page).toHaveLength(10);
    expect(all[0]?.pageCount).toBe(1);
    expect(all[0]?.pageIndex).toBe(0);
  });
});
