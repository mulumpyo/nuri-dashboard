import { describe, expect, it } from "vitest";
import { isAuth, menuHops, menuIndex, menuTravelMs, pageMotion } from "./motion";

describe("page motion", () => {
  it("treats login paths as auth", () => {
    expect(isAuth("/login")).toBe(true);
    expect(isAuth("/invite/x")).toBe(true);
    expect(isAuth("/recover/x")).toBe(true);
    expect(isAuth("/")).toBe(false);
    expect(isAuth("/companies")).toBe(false);
  });

  it("slides between app menus and keeps auth separate", () => {
    expect(pageMotion("/login")).toBe("page-auth");
    expect(pageMotion("/", "/login")).toBe("page-auth");
    expect(pageMotion("/")).toBe("page-fade");
    expect(pageMotion("/companies", "/")).toBe("page-travel");
    expect(pageMotion("/", "/accounts")).toBe("page-travel");
    expect(pageMotion("/carriers", "/companies")).toBe("page-travel");
    expect(pageMotion("/settings", "/companies")).toBe("page-travel");
  });

  it("walks skipped menus as a filmstrip", () => {
    expect(menuIndex("/")).toBe(0);
    expect(menuIndex("/accounts")).toBe(3);
    expect(menuHops("/", "/accounts")?.paths).toEqual(["/", "/companies", "/carriers", "/accounts"]);
    expect(menuHops("/", "/accounts")?.from).toBe(0);
    expect(menuHops("/", "/accounts")?.to).toBe(3);
    expect(menuHops("/accounts", "/")?.dir).toBe(-1);
    expect(menuHops("/", "/settings", false)?.paths).toEqual(["/", "/companies", "/carriers", "/settings"]);
    expect(menuHops("/", "/")).toBeNull();
    expect(menuTravelMs(1)).toBe(390);
    expect(menuTravelMs(3)).toBe(610);
  });
});
