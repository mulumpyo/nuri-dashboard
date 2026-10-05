import { describe, expect, it } from "vitest";
import { fitText } from "./fit-text";

describe("fitText", () => {
  it("shrinks overflowing text to fit the box", () => {
    const el = document.createElement("div");
    el.style.width = "40px";
    el.style.fontSize = "24px";
    el.textContent = "한빛상사주식회사";
    document.body.append(el);
    Object.defineProperty(el, "clientWidth", { value: 40 });
    Object.defineProperty(el, "scrollWidth", { configurable: true, get: () => (parseFloat(el.style.fontSize) > 12 ? 80 : 40) });
    fitText(el, 10);
    expect(parseFloat(el.style.fontSize)).toBeLessThanOrEqual(12.5);
    el.remove();
  });
});
