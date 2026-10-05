import { passwordIssue } from "@nuri/shared";
import { badRequest } from "../common/errors";
import { hashPassword } from "../domain/password";
import { UserRepository } from "./user.repository";

const PASSWORD_CODE: Record<string, "PASSWORD_SHORT" | "PASSWORD_LONG" | "PASSWORD_MIX"> = {
  "비밀번호는 8자 이상이어야 해요": "PASSWORD_SHORT",
  "비밀번호가 너무 길어요": "PASSWORD_LONG",
  "문자와 숫자를 함께 넣어 주세요": "PASSWORD_MIX",
};

export const assertPassword = (password?: string) => {
  const value = password ?? "";
  const issue = passwordIssue(value);
  if (issue) throw badRequest(PASSWORD_CODE[issue] ?? "PASSWORD_INVALID", issue);
  return value;
};

export const hashAssertedPassword = (password?: string) => hashPassword(assertPassword(password));

export const provisionFromInvite = async (
  users: UserRepository,
  invite: { id: string; email: string },
  opts: { passwordHash?: string; totpSecret?: string },
) => {
  const existing = await users.findByEmail(invite.email);
  const user =
    existing ??
    (await users.createUser({
      email: invite.email.trim().toLowerCase(),
      role: (await users.hasAny()) ? "admin" : "owner",
      passwordHash: opts.passwordHash,
      totpSecret: opts.totpSecret,
    }));
  if (existing && opts.passwordHash) await users.setPasswordHash(user.id, opts.passwordHash);
  if (existing && opts.totpSecret) await users.setTotpSecret(user.id, opts.totpSecret);
  await users.consumeInvite(invite.id);
  return user;
};
