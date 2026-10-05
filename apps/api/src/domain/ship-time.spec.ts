import { carrierNeedsTime, nextShipTime, parseShipTime } from "./ship-time";

describe("ship time", () => {
  it("requires time only for 퀵 carriers", () => {
    expect(carrierNeedsTime("퀵발송")).toBe(true);
    expect(carrierNeedsTime("서울퀵")).toBe(true);
    expect(carrierNeedsTime("CJ")).toBe(false);
    expect(carrierNeedsTime("경기택배")).toBe(false);
  });

  it("accepts HH:mm", () => {
    expect(parseShipTime("14:30")).toBe("14:30");
    expect(parseShipTime("08:00")).toBe("08:00");
    expect(parseShipTime("25:00")).toBeNull();
    expect(parseShipTime("")).toBeNull();
  });

  it("rounds up to the next half hour in KST", () => {
    expect(nextShipTime(new Date("2026-09-23T00:05:00.000Z"))).toBe("09:30");
    expect(nextShipTime(new Date("2026-09-23T05:00:00.000Z"))).toBe("14:00");
    expect(nextShipTime(new Date("2026-09-22T22:10:00.000Z"))).toBe("08:00");
  });
});
