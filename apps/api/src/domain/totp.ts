import { Secret, TOTP } from "otpauth";
import { toDataURL } from "qrcode";

export const totpIssuer = () => process.env.TOTP_ISSUER ?? "누리디에스엠";

export const createTotp = (email: string, secretBase32?: string) => {
  const secret = secretBase32 ? Secret.fromBase32(secretBase32) : new Secret({ size: 20 });
  return new TOTP({
    issuer: totpIssuer(),
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
};

export const enrollTotp = async (email: string) => {
  const totp = createTotp(email);
  const otpauthUrl = totp.toString();
  const qr = await toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { secret: totp.secret.base32, otpauthUrl, qr };
};

export const verifyTotp = (secret: string, code: string) => {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  return createTotp("verify", secret).validate({ token, window: 1 }) !== null;
};
