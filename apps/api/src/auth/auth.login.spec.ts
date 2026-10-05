import { AuthLoginService } from "./auth.login";

const site = { origin: "http://localhost:5173", hostname: "localhost" };

describe("AuthLoginService", () => {
  const users = {
    findByEmail: jest.fn(),
    findInvite: jest.fn(),
    findOpenInviteByEmail: jest.fn(),
    createInvite: jest.fn(),
    setPasswordHash: jest.fn(),
  };
  const tokens = { createId: jest.fn(), saveChallenge: jest.fn() };
  const mail = { send: jest.fn() };
  const accounts = {
    totpRequired: jest.fn(),
    isBootstrap: jest.fn(),
    bootstrapEmail: jest.fn(),
  };
  const session = { issuePair: jest.fn() };
  const config = { get: jest.fn().mockReturnValue("http://localhost:5173") };
  const service = () =>
    new AuthLoginService(
      users as never,
      tokens as never,
      mail as never,
      accounts as never,
      session as never,
      config as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    accounts.totpRequired.mockResolvedValue(false);
    accounts.isBootstrap.mockReturnValue(false);
  });

  it("marks a missing invite link", async () => {
    users.findInvite.mockResolvedValue(null);
    await expect(service().inviteStatus("gone")).resolves.toEqual({ status: "missing" });
  });

  it("marks an expired invite link", async () => {
    users.findInvite.mockResolvedValue({ consumedAt: null, expiresAt: new Date("2020-01-01") });
    await expect(service().inviteStatus("old")).resolves.toEqual({ status: "expired" });
  });

  it("opens the same password form for an unknown email", async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(service().startLogin("ghost@nuri.test", site, {} as never)).resolves.toEqual({
      mode: "password",
      email: "ghost@nuri.test",
    });
  });

  it("asks for a password only when the account already has one", async () => {
    users.findByEmail.mockResolvedValue({ id: "u1", passwordHash: "hash" });
    await expect(service().startLogin("a@b.c", site, {} as never)).resolves.toEqual({
      mode: "password",
      email: "a@b.c",
    });
  });

  it("rejects an unknown password with the same login error", async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      service().finishLogin({ email: "ghost@nuri.test", password: "한글비밀번호12" }, {} as never, site),
    ).rejects.toMatchObject({ code: "PASSWORD_INVALID" });
    expect(session.issuePair).not.toHaveBeenCalled();
  });

  it("does not return an invite link in production", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    users.findByEmail.mockResolvedValue(null);
    users.findOpenInviteByEmail.mockResolvedValue(null);
    tokens.createId.mockReturnValue("tok");
    mail.send.mockResolvedValue(false);
    await expect(service().invite("new@nuri.test")).rejects.toMatchObject({ code: "MAIL_FAILED" });
    process.env.NODE_ENV = prev;
  });

  it("does not let an invited account set a password at login", async () => {
    users.findByEmail.mockResolvedValue({ id: "u1" });
    await expect(
      service().finishLogin({ email: "a@b.c", password: "한글비밀번호12" }, {} as never, site),
    ).rejects.toMatchObject({ code: "PASSWORD_INVALID" });
    expect(users.setPasswordHash).not.toHaveBeenCalled();
  });

  it("answers the same for an unknown recovery email", async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(service().requestRecovery("ghost@nuri.test", site)).resolves.toEqual({ status: "queued" });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it("also queues recovery when the account exists", async () => {
    users.findByEmail.mockResolvedValue({ id: "u1" });
    tokens.createId.mockReturnValue("tok");
    mail.send.mockResolvedValue(true);
    await expect(service().requestRecovery("a@b.c", site)).resolves.toEqual({ status: "queued" });
    expect(mail.send).toHaveBeenCalled();
  });
});
