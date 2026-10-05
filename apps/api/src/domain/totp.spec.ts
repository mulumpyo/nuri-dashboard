import { createTotp, enrollTotp, verifyTotp } from "./totp";

describe("totp", () => {
  it("accepts a current Google Authenticator code", async () => {
    const enrolled = await enrollTotp("owner@nuri.test");
    const code = createTotp("owner@nuri.test", enrolled.secret).generate();
    expect(verifyTotp(enrolled.secret, code)).toBe(true);
    expect(enrolled.otpauthUrl).toContain("otpauth://totp/");
    expect(enrolled.qr.startsWith("data:image/png")).toBe(true);
  });

  it("rejects a wrong code", async () => {
    const enrolled = await enrollTotp("owner@nuri.test");
    expect(verifyTotp(enrolled.secret, "000000")).toBe(false);
  });
});
