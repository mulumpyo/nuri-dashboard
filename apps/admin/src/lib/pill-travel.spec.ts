import { describe, expect, it } from "vitest";
import { menuTravelMs } from "../router/motion";
import { pillTravelMs } from "./pill-travel";

describe("pillTravelMs", () => {
  it("snaps without motion on resize or first paint", () => {
    expect(pillTravelMs(true, 0, 1)).toBe(0);
    expect(pillTravelMs(false, -1, 0)).toBe(0);
    expect(pillTravelMs(false, 1, 1)).toBe(0);
  });

  it("travels when the selected index changes", () => {
    expect(pillTravelMs(false, 0, 1)).toBe(menuTravelMs(1));
    expect(pillTravelMs(false, 0, 3)).toBe(menuTravelMs(3));
  });
});
