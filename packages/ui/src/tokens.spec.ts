import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));

describe("ui tokens", () => {
  it("keeps a 44px touch target", () => {
    const css = readFileSync(join(dir, "tokens.css"), "utf8");
    expect(css).toMatch(/--touch:\s*44px/);
    expect(css).toMatch(/--field-radius:\s*calc\(var\(--radius\) - 8px\)/);
    expect(css).toMatch(/--phone:\s*640px/);
    expect(css).toMatch(/--tablet:\s*1024px/);
  });
});
