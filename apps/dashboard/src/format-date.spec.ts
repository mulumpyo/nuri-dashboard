import { describe, expect, it } from "vitest";
import { formatBoardDate } from "./format-date";

describe("formatBoardDate", () => {
  it("renders month and day in Korean", () => {
    expect(formatBoardDate("2026-09-30")).toBe("9월 30일");
    expect(formatBoardDate("2026-10-01")).toBe("10월 1일");
  });

  it("returns the original value when the stamp is incomplete", () => {
    expect(formatBoardDate("bad")).toBe("bad");
  });
});
