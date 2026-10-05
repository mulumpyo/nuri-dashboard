import { describe, expect, it } from "vitest";
import { scanNames } from "./a11y-scan";

describe("scanNames", () => {
  it("flags a nameless button and duplicate ids", () => {
    const root = document.createElement("div");
    root.innerHTML = `<button></button><p id="same">a</p><span id="same">b</span>`;
    expect(scanNames(root)).toEqual(["button[0]", "duplicate#same"]);
  });

  it("accepts an aria-label", () => {
    const root = document.createElement("div");
    root.innerHTML = `<button aria-label="등록"></button>`;
    expect(scanNames(root)).toEqual([]);
  });
});
