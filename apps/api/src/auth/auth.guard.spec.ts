import { AuthGuard } from "./auth.guard";
import { ApiError } from "../common/errors";

const ctxOf = (cookies: Record<string, string | undefined>) => {
  const req: { cookies: Record<string, string | undefined>; user?: unknown } = { cookies };
  return {
    req,
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    },
  };
};

describe("AuthGuard", () => {
  const jwt = { verify: jest.fn() };
  const tokens = {
    isDenied: jest.fn().mockResolvedValue(false),
    isRevoked: jest.fn().mockResolvedValue(false),
    isUserRevoked: jest.fn().mockResolvedValue(false),
  };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

  const guard = () => new AuthGuard(jwt as never, tokens as never, reflector as never);

  beforeEach(() => {
    jwt.verify.mockReset();
    tokens.isDenied.mockResolvedValue(false);
    tokens.isRevoked.mockResolvedValue(false);
    tokens.isUserRevoked.mockResolvedValue(false);
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it("rejects a missing cookie", async () => {
    await expect(guard().canActivate(ctxOf({}).ctx as never)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("accepts an admin session", async () => {
    const admin = { sub: "u1", kind: "admin", jti: "j1" };
    jwt.verify.mockReturnValue(admin);
    const { ctx, req } = ctxOf({ access: "tok" });
    await expect(guard().canActivate(ctx as never)).resolves.toBe(true);
    expect(req.user).toEqual(admin);
  });

  it("blocks a device token on admin routes", async () => {
    jwt.verify.mockReturnValue({ sub: "d1", kind: "device", deviceId: "d1" });
    await expect(guard().canActivate(ctxOf({ access: "tok" }).ctx as never)).rejects.toBeInstanceOf(ApiError);
    await expect(guard().canActivate(ctxOf({ access: "tok" }).ctx as never)).rejects.toMatchObject({
      code: "ADMIN_REQUIRED",
    });
  });

  it("allows a device token when the route opts in", async () => {
    jwt.verify.mockReturnValue({ sub: "d1", kind: "device", deviceId: "d1" });
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard().canActivate(ctxOf({ access: "tok" }).ctx as never)).resolves.toBe(true);
  });

  it("rejects a revoked device", async () => {
    jwt.verify.mockReturnValue({ sub: "d1", kind: "device", deviceId: "d1" });
    tokens.isRevoked.mockResolvedValue(true);
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard().canActivate(ctxOf({ access: "tok" }).ctx as never)).rejects.toMatchObject({
      code: "DEVICE_REVOKED",
    });
  });
});
