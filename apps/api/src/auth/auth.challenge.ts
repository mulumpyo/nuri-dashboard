import { enrollTotp } from "../domain/totp";
import { AuthRepository } from "./auth.repository";

export type TotpChallenge = {
  kind: "invite" | "recovery";
  token?: string;
  userId?: string;
  secret: string;
  origin: string;
  email: string;
};

export const startTotpEnroll = async (
  tokens: AuthRepository,
  payload: Omit<TotpChallenge, "secret">,
) => {
  const enrolled = await enrollTotp(payload.email);
  const challengeKey = tokens.createId();
  await tokens.saveChallenge(
    challengeKey,
    JSON.stringify({ ...payload, secret: enrolled.secret } satisfies TotpChallenge),
    10 * 60,
  );
  return { mode: "enroll" as const, challengeKey, otpauthUrl: enrolled.otpauthUrl, qr: enrolled.qr, secret: enrolled.secret };
};

export const readTotpChallenge = async (tokens: AuthRepository, challengeKey: string) => {
  const raw = await tokens.getChallenge(challengeKey);
  return raw ? (JSON.parse(raw) as TotpChallenge) : null;
};
