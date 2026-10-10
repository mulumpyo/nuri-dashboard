import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(join(dir, file), "utf8");

describe("admin a11y document", () => {
  it("keeps language and zoom", () => {
    const html = read("../index.html");
    expect(html).toMatch(/lang="ko"/);
    expect(html).not.toMatch(/user-scalable\s*=\s*no/);
    expect(html).not.toMatch(/maximum-scale\s*=\s*1/);
  });

  it("keeps clickjacking headers on the admin nginx", () => {
    const nginx = read("../nginx.conf");
    expect(nginx).toMatch(/X-Frame-Options DENY/);
    expect(nginx).toMatch(/X-Content-Type-Options nosniff/);
  });

  it("does not fall back missing admin assets to html", () => {
    const nginx = read("../nginx.conf");
    expect(nginx).toMatch(/location \/assets\//);
    expect(nginx).toMatch(/try_files \$uri =404/);
  });

  it("keeps list and card gutters in the owning stylesheets", () => {
    const dirCss = read("styles/dir.css");
    const home = read("styles/home.css");
    expect(dirCss).toMatch(/--dir-gutter:\s*10px/);
    expect(dirCss).toMatch(/\.dir-page \.dir-toolbar[\s\S]*padding-inline:\s*var\(--dir-gutter\)/);
    expect(dirCss).toMatch(/\.dir-viewport[\s\S]*padding:\s*0 var\(--dir-gutter\) 12px/);
    expect(home).toMatch(/--card-w:\s*148px/);
    expect(home).toMatch(/repeat\(auto-fill,\s*var\(--card-w\)\)/);
    expect(home).toMatch(/\.card-note-edit[\s\S]*grid-template-columns:\s*0fr/);
    expect(home).toMatch(/\.card-note:not\(\.add\):hover \.card-note-edit[\s\S]*grid-template-columns:\s*1fr/);
    const chrome = read("styles/chrome.css");
    expect(chrome).toMatch(/:has\(\.set-logs\)/);
  });
});
