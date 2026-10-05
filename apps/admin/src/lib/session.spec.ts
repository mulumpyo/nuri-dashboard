import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api", () => ({
  api: { get: vi.fn() },
}));

import { api } from "../api";
import { clearMe, loadMe, me } from "./session";

describe("session", () => {
  beforeEach(() => {
    clearMe();
    vi.mocked(api.get).mockReset();
  });

  it("caches /auth/me until cleared", async () => {
    vi.mocked(api.get).mockResolvedValue({ kind: "admin", canManageUsers: true });
    const first = await loadMe();
    const second = await loadMe();
    expect(first?.canManageUsers).toBe(true);
    expect(second).toEqual(first);
    expect(api.get).toHaveBeenCalledTimes(1);
    clearMe();
    expect(me.value).toBeNull();
    await loadMe();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("treats a failed /auth/me as signed out", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("로그인이 필요해요"));
    await expect(loadMe()).resolves.toBeNull();
    expect(me.value).toBeNull();
  });
});
