import { attachCookies, clearCookies, clientSite, cookieSecure } from "./auth.session";

describe("auth session", () => {
  it("marks cookies secure on https or COOKIE_SECURE=true", () => {
    expect(cookieSecure("https://nuri.mulumpyo.com", "false")).toBe(true);
    expect(cookieSecure("http://localhost:5173", "true")).toBe(true);
    expect(cookieSecure("http://localhost:5173", "false")).toBe(false);
  });

  it("reads forwarded host and proto", () => {
    const site = clientSite({
      headers: { "x-forwarded-host": "nuri.mulumpyo.com", "x-forwarded-proto": "https" },
      protocol: "http",
    } as never);
    expect(site.origin).toBe("https://nuri.mulumpyo.com");
    expect(site.hostname).toBe("nuri.mulumpyo.com");
  });

  it("sets the Secure flag when requested", () => {
    const cookies: Array<{ name: string; options: { secure?: boolean; httpOnly?: boolean } }> = [];
    const res = {
      cookie: (name: string, _value: string, options: { secure?: boolean; httpOnly?: boolean }) => {
        cookies.push({ name, options });
      },
    };
    attachCookies(res as never, "a", "r", 60, "https://nuri.mulumpyo.com");
    expect(cookies).toHaveLength(2);
    expect(cookies.every((row) => row.options.secure && row.options.httpOnly)).toBe(true);
  });

  it("clears cookies with the same flags", () => {
    const cleared: Array<{ name: string; options: { secure?: boolean; sameSite?: string; httpOnly?: boolean } }> = [];
    const res = {
      clearCookie: (name: string, options: { secure?: boolean; sameSite?: string; httpOnly?: boolean }) => {
        cleared.push({ name, options });
      },
    };
    clearCookies(res as never, "https://nuri.mulumpyo.com");
    expect(cleared).toHaveLength(2);
    expect(cleared.every((row) => row.options.secure && row.options.httpOnly && row.options.sameSite === "lax")).toBe(
      true,
    );
  });
});
