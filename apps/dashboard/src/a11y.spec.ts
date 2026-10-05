import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(dir, "../index.html"), "utf8");

describe("dashboard document", () => {
  it("keeps clickjacking headers on the dashboard nginx", () => {
    const nginx = readFileSync(join(dir, "../nginx.conf"), "utf8");
    expect(nginx).toMatch(/X-Frame-Options DENY/);
    expect(nginx).toMatch(/X-Content-Type-Options nosniff/);
  });

  it("does not serve the board at slash or fall back missing display assets", () => {
    const nginx = readFileSync(join(dir, "../nginx.conf"), "utf8");
    const assets = nginx.match(/location \/display\/assets\/ \{[^}]+\}/)?.[0];
    expect(assets).toBeTruthy();
    expect(assets).not.toMatch(/try_files/);
    expect(nginx).toMatch(/location \/\s*\{\s*return 404;/);
  });

  it("keeps language and zoom", () => {
    expect(html).toMatch(/lang="ko"/);
    expect(html).not.toMatch(/user-scalable\s*=\s*no/);
    expect(html).not.toMatch(/maximum-scale\s*=\s*1/);
  });
});
