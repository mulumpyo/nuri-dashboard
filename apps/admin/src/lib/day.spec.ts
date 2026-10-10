import { describe, expect, it } from "vitest";
import { addDays, isWeekend, shiftBusinessDay } from "./day";

describe("shiftBusinessDay", () => {
  it("skips weekends", () => {
    expect(isWeekend("2026-10-03")).toBe(true);
    expect(shiftBusinessDay("2026-10-02", 1)).toBe("2026-10-05");
    expect(shiftBusinessDay("2026-10-05", -1)).toBe("2026-10-02");
  });

  it("skips holidays", () => {
    expect(shiftBusinessDay("2026-10-05", 1, ["2026-10-06"])).toBe("2026-10-07");
  });

  it("steps past a four-day window", () => {
    let cursor = "2026-10-05";
    for (let i = 0; i < 6; i++) cursor = shiftBusinessDay(cursor, 1);
    expect(cursor).toBe("2026-10-13");
    expect(addDays("2026-10-05", 8)).toBe("2026-10-13");
  });
});
