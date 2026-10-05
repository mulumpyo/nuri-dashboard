import { describe, expect, it } from "vitest";
import { sessionTarget } from "./session";

describe("sessionTarget", () => {
  it("sends guests to login", () => {
    expect(sessionTarget("/", null)).toBe("/login");
  });

  it("keeps invite and recover public", () => {
    expect(sessionTarget("/invite/tok", null)).toBe(true);
    expect(sessionTarget("/recover/tok", null)).toBe(true);
  });

  it("sends signed-in admins away from login", () => {
    expect(sessionTarget("/login", { kind: "admin" })).toBe("/");
  });

  it("rejects device sessions on admin pages", () => {
    expect(sessionTarget("/", { kind: "device" })).toBe("/login");
  });

  it("hides accounts from invited admins", () => {
    expect(sessionTarget("/accounts", { kind: "admin", canManageUsers: false })).toBe("/");
    expect(sessionTarget("/accounts", { kind: "admin", canManageUsers: true })).toBe(true);
  });
});
