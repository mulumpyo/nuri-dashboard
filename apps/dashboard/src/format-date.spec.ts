import { describe, expect, it } from "vitest";
import { formatBoardDate, formatBoardDay, formatBoardWeekday } from "./format-date";

describe("formatBoardDate", () => {
  it("renders month and day in Korean", () => {
    expect(formatBoardDate("2026-09-30")).toBe("9월 30일 (수)");
    expect(formatBoardDate("2026-10-01")).toBe("10월 1일 (목)");
  });

  it("splits the day and weekday for the column chip", () => {
    expect(formatBoardDay("2026-09-30")).toBe("9월 30일");
    expect(formatBoardWeekday("2026-09-30")).toBe("수");
    expect(formatBoardDay("2026-10-01")).toBe("10월 1일");
    expect(formatBoardWeekday("2026-10-01")).toBe("목");
  });

  it("returns the original value when the stamp is incomplete", () => {
    expect(formatBoardDate("bad")).toBe("bad");
    expect(formatBoardDay("bad")).toBe("bad");
    expect(formatBoardWeekday("bad")).toBe("");
  });
});
