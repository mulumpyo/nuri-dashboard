import { describe, expect, it } from "vitest";
import { fitListSize, pageAfterFit } from "./fit-list";

describe("fitListSize", () => {
  it("returns a fallback without a box", () => {
    expect(fitListSize(null)).toBe(10);
  });

  it("fits rows after chrome", () => {
    expect(fitListSize({ clientHeight: 572 } as HTMLElement, 52, 56)).toBe(9);
    expect(fitListSize({ clientHeight: 220 } as HTMLElement, 44, 0)).toBe(4);
    expect(fitListSize({ clientHeight: 80 } as HTMLElement, 44, 0)).toBe(1);
    expect(fitListSize({ clientHeight: 328 } as HTMLElement, 64, 0)).toBe(5);
  });

  it("keeps the first row when the page size changes", () => {
    expect(pageAfterFit(1, 6, 8)).toBe(1);
    expect(pageAfterFit(3, 6, 8)).toBe(2);
    expect(pageAfterFit(2, 8, 6)).toBe(2);
    expect(pageAfterFit(4, 6, 6)).toBe(4);
  });
});
