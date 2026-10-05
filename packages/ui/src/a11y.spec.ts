import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const glass = readFileSync(join(dir, "glass.css"), "utf8");
const tokens = readFileSync(join(dir, "tokens.css"), "utf8");

const hex = (value: string) => {
  const n = Number.parseInt(value.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255].map((channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
};

const luminance = (value: string) => {
  const [r, g, b] = hex(value);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("shared a11y tokens", () => {
  it("exposes skip, sr-only, and keyboard focus styles", () => {
    expect(glass).toMatch(/\.sr-only\s*\{/);
    expect(glass).toMatch(/\.skip\s*\{/);
    expect(glass).toMatch(/:focus-visible\s*\{/);
    expect(glass).toMatch(/outline:\s*2px solid var\(--accent\)/);
  });

  it("keeps body text contrast at WCAG AA", () => {
    expect(contrast("#000000", "#f2f2f7")).toBeGreaterThanOrEqual(7);
    expect(contrast("#636366", "#f2f2f7")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#f4f6fb", "#0b0d12")).toBeGreaterThanOrEqual(7);
    expect(contrast("#b4bcc8", "#0b0d12")).toBeGreaterThanOrEqual(4.5);
    expect(tokens).toMatch(/--muted:\s*#636366/);
    expect(tokens).toMatch(/--muted:\s*#b4bcc8/);
  });

  it("shortens motion when the user asks", () => {
    expect(tokens).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(tokens).toMatch(/--snappy:\s*1ms linear/);
  });
});
