import { addDays, collectBusinessDays, dayLabel, isStamp, isWeekend, kstDate, weekdayLabel } from "./calendar";

describe("calendar", () => {
  it("marks weekends", () => {
    expect(isWeekend("2026-09-26")).toBe(true);
    expect(isWeekend("2026-09-23")).toBe(false);
  });

  it("skips weekends and holidays", () => {
    const days = collectBusinessDays("2026-09-25", 4, new Set(["2026-09-29"]));
    expect(days).toEqual(["2026-09-25", "2026-09-28", "2026-09-30", "2026-10-01"]);
  });

  it("starts after a weekend", () => {
    expect(collectBusinessDays("2026-09-26", 2, new Set())).toEqual(["2026-09-28", "2026-09-29"]);
  });

  it("stops when holidays block more than 40 days", () => {
    const blocked = new Set(Array.from({ length: 50 }, (_, i) => addDays("2026-09-21", i)));
    expect(collectBusinessDays("2026-09-21", 4, blocked)).toEqual([]);
  });

  it("adds days", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("accepts only real calendar stamps", () => {
    expect(isStamp("2026-10-10")).toBe(true);
    expect(isStamp("2026-13-40")).toBe(false);
    expect(isStamp("today")).toBe(false);
    expect(isStamp("")).toBe(false);
  });

  it("formats KST date", () => {
    expect(kstDate(new Date("2026-09-22T16:00:00.000Z"))).toBe("2026-09-23");
  });

  it("labels weekdays", () => {
    expect(weekdayLabel("2026-09-25")).toBe("금");
    expect(weekdayLabel("2026-09-26")).toBe("토");
  });

  it("labels today and calendar tomorrow only", () => {
    expect(dayLabel("2026-09-23", "2026-09-23")).toBe("오늘");
    expect(dayLabel("2026-09-24", "2026-09-23")).toBe("내일");
    expect(dayLabel("2026-09-25", "2026-09-23")).toBe("금");
  });

  it("does not call the next business day tomorrow after a holiday gap", () => {
    expect(dayLabel("2026-10-06", "2026-10-03")).toBe("화");
    expect(dayLabel("2026-10-05", "2026-10-03")).toBe("월");
    expect(dayLabel("2026-10-04", "2026-10-03")).toBe("내일");
  });
});
