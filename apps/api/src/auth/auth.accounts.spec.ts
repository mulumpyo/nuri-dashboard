import { AuthAccountsService } from "./auth.accounts";

const admin = { sub: "owner-1", kind: "admin" as const };

describe("AuthAccountsService", () => {
  const users = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
    createUser: jest.fn(),
    setPasswordHash: jest.fn(),
    hasAny: jest.fn(),
  };
  const tokens = { dropUserSessions: jest.fn() };
  const settings = { getBool: jest.fn().mockResolvedValue(false), set: jest.fn() };

  const service = () => new AuthAccountsService(users as never, tokens as never, settings as never);

  beforeEach(() => {
    jest.clearAllMocks();
    settings.getBool.mockResolvedValue(false);
    process.env.BOOTSTRAP_ADMIN_EMAIL = "boot@nuri.test";
  });

  it("lets an owner manage users", () => {
    expect(service().canManageUsers({ email: "owner@nuri.test", role: "owner" })).toBe(true);
    expect(service().canManageUsers({ email: "invited@nuri.test", role: "admin" })).toBe(false);
    expect(service().canManageUsers({ email: "boot@nuri.test", role: "admin" })).toBe(true);
  });

  it("forbids invited admins from listing accounts", async () => {
    users.findById.mockResolvedValue({ id: "a1", email: "invited@nuri.test", role: "admin" });
    await expect(service().listUsers(admin)).rejects.toMatchObject({ code: "USERS_FORBIDDEN" });
  });

  it("refuses to delete the current user or the bootstrap account", async () => {
    users.findById.mockImplementation(async (id: string) => {
      if (id === "owner-1") return { id: "owner-1", email: "owner@nuri.test", role: "owner" };
      if (id === "boot-1") return { id: "boot-1", email: "boot@nuri.test", role: "admin" };
      return { id, email: "other@nuri.test", role: "admin" };
    });
    const accounts = service();
    await expect(accounts.removeUser(admin, "owner-1")).rejects.toMatchObject({ code: "USER_SELF" });
    await expect(accounts.removeUser(admin, "boot-1")).rejects.toMatchObject({ code: "USER_BOOTSTRAP" });
    expect(users.remove).not.toHaveBeenCalled();
  });

  it("returns a device shape from me()", async () => {
    await expect(service().me({ sub: "d1", kind: "device", deviceId: "d1" })).resolves.toEqual({
      kind: "device",
      deviceId: "d1",
    });
  });

  it("lets only the bootstrap admin preview another today", async () => {
    users.findById.mockResolvedValue({ id: "b1", email: "boot@nuri.test", role: "admin" });
    await expect(service().previewToday({ sub: "b1", kind: "admin" }, "2026-10-10")).resolves.toBe("2026-10-10");
    users.findById.mockResolvedValue({ id: "a1", email: "invited@nuri.test", role: "admin" });
    await expect(service().previewToday({ sub: "a1", kind: "admin" }, "2026-10-10")).resolves.toBeUndefined();
    await expect(service().previewToday({ sub: "d1", kind: "device", deviceId: "d1" }, "2026-10-10")).resolves.toBeUndefined();
    await expect(service().previewToday({ sub: "b1", kind: "admin" }, "nope")).resolves.toBeUndefined();
  });

  it("marks bootstrap on me()", async () => {
    settings.getBool.mockResolvedValue(false);
    users.findById.mockResolvedValue({ id: "b1", email: "boot@nuri.test", role: "admin" });
    await expect(service().me({ sub: "b1", kind: "admin" })).resolves.toMatchObject({
      bootstrap: true,
      canManageTotp: true,
    });
  });
});
