import { describe, expect, it } from "vitest";
import { FOCUSABLE } from "./focus";

describe("focus helpers", () => {
  it("selects tabbable controls used by dialogs", () => {
    expect(FOCUSABLE).toMatch(/button:not\(\[disabled\]\)/);
    expect(FOCUSABLE).toMatch(/input:not\(\[disabled\]\)/);
    expect(FOCUSABLE).toMatch(/a\[href\]/);
  });
});
