import { describe, expect, it } from "vitest";
import { formatDay, parseDay } from "./day";

describe("admin day helpers", () => {
  it("formats a local date as ISO day", () => {
    expect(formatDay(new Date(2026, 8, 30))).toBe("2026-09-30");
  });

  it("parses an ISO day back to local midnight", () => {
    const parsed = parseDay("2026-10-03");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(3);
  });
});
