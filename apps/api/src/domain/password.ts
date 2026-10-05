import { PASSWORD_MAX, PASSWORD_MIN } from "@nuri/shared";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export { PASSWORD_MAX, PASSWORD_MIN };

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  // Node scrypt 기본값: N=16384, r=8, p=1. 저장 형식은 salt:hex예요.
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
};

export const verifyPassword = async (password: string, stored: string) => {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
};
