import { ConfigService } from "@nestjs/config";
import { MailService } from "./mail.service";

const sendMail = jest.fn();
const close = jest.fn();
const createTransport = jest.fn((_options?: unknown) => ({ sendMail, close }));

jest.mock("nodemailer", () => ({
  createTransport: (options: unknown) => createTransport(options),
}));

const configOf = (values: Record<string, string | undefined>) =>
  ({ get: (key: string) => values[key] }) as ConfigService;

describe("MailService", () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue({});
    close.mockReset();
    createTransport.mockClear();
    delete process.env.MAIL_TEST;
  });

  it("does not log the fallback URL in production", async () => {
    const prev = process.env.NODE_ENV;
    process.env.MAIL_TEST = "1";
    process.env.NODE_ENV = "production";
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const mail = new MailService(configOf({}));
    await expect(mail.send({ to: "a@b.c", subject: "s", html: "<p>x</p>", fallback: "invite: secret" })).resolves.toBe(
      false,
    );
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
    process.env.NODE_ENV = prev;
  });

  it("logs the fallback when no transport is configured", async () => {
    process.env.MAIL_TEST = "1";
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const mail = new MailService(configOf({}));
    await expect(mail.send({ to: "a@b.c", subject: "s", html: "<p>x</p>", fallback: "invite: link" })).resolves.toBe(
      false,
    );
    expect(log).toHaveBeenCalledWith("invite: link");
    expect(createTransport).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("sends through SMTP when MAIL_TEST is on", async () => {
    process.env.MAIL_TEST = "1";
    const mail = new MailService(
      configOf({
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        SMTP_USER: "nuri@example.com",
        SMTP_PASS: "secret",
        SMTP_FROM: "누리디에스엠 <nuri@example.com>",
      }),
    );
    await expect(
      mail.send({
        to: "guest@example.com",
        subject: "누리디에스엠 관리자 초대",
        html: "<p>hello</p>",
        text: "hello",
        fallback: "invite: link",
      }),
    ).resolves.toBe(true);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        auth: { user: "nuri@example.com", pass: "secret" },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "guest@example.com",
        subject: "누리디에스엠 관리자 초대",
        html: "<p>hello</p>",
      }),
    );
    expect(close).toHaveBeenCalled();
  });

  it("throws MAIL_FAILED when SMTP rejects", async () => {
    process.env.MAIL_TEST = "1";
    sendMail.mockRejectedValue(new Error("relay denied"));
    const mail = new MailService(configOf({ SMTP_HOST: "smtp.example.com" }));
    await expect(
      mail.send({ to: "guest@example.com", subject: "s", html: "<p>x</p>", fallback: "invite: link" }),
    ).rejects.toMatchObject({ code: "MAIL_FAILED" });
    expect(close).toHaveBeenCalled();
  });
});
