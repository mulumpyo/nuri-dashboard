import { afterEach, describe, expect, it } from "vitest";
import { kstStamp, readAsOf, shiftStamp, writeAsOf } from "./as-of";

describe("as-of", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/display/");
  });

  it("reads and writes a preview stamp", () => {
    expect(readAsOf("?asOf=2026-10-10")).toBe("2026-10-10");
    expect(readAsOf("?asOf=nope")).toBe("");
    writeAsOf("2026-10-08");
    expect(window.location.search).toContain("asOf=2026-10-08");
    writeAsOf("");
    expect(window.location.search).not.toContain("asOf");
  });

  it("shifts a stamp and names today in KST", () => {
    expect(shiftStamp("2026-10-08", 1)).toBe("2026-10-09");
    expect(kstStamp(new Date("2026-10-07T16:00:00.000Z"))).toBe("2026-10-08");
  });
});
