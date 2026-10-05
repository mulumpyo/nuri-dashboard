import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applySecurityHeaders } from "./security-headers";
import { docsEnabled, isProduction } from "./env";

describe("security headers", () => {
  it("sets clickjacking and sniffing headers", () => {
    const headers: Record<string, string> = {};
    applySecurityHeaders({ setHeader: (key, value) => {
      headers[key] = value;
    } });
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("keeps docs off in production unless DOCS_ENABLED", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDocs = process.env.DOCS_ENABLED;
    process.env.NODE_ENV = "production";
    delete process.env.DOCS_ENABLED;
    expect(isProduction()).toBe(true);
    expect(docsEnabled()).toBe(false);
    process.env.DOCS_ENABLED = "true";
    expect(docsEnabled()).toBe(true);
    process.env.NODE_ENV = prevEnv;
    if (prevDocs === undefined) delete process.env.DOCS_ENABLED;
    else process.env.DOCS_ENABLED = prevDocs;
  });

  it("does not pass a client proto through the inner nginx", () => {
    const nginx = readFileSync(join(__dirname, "../../../../deploy/nginx.conf"), "utf8");
    expect(nginx).toMatch(/X-Forwarded-Proto \$scheme/);
    expect(nginx).not.toMatch(/X-Forwarded-Proto \$http_x_forwarded_proto/);
  });
});
