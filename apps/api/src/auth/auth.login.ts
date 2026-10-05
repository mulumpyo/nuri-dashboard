import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { hashPassword, verifyPassword } from "../domain/password";
import { verifyTotp } from "../domain/totp";
import { badGateway, badRequest, conflict, notFound, unauthorized } from "../common/errors";
import { isProduction } from "../config/env";
import { MailService } from "../mail/mail.service";
import { AuthAccountsService } from "./auth.accounts";
import { readTotpChallenge, startTotpEnroll } from "./auth.challenge";
import { inviteMail, recoveryMail } from "./auth.mail";
import { assertPassword, hashAssertedPassword, provisionFromInvite } from "./auth.provision";
import { AuthRepository } from "./auth.repository";
import { AuthSessionService } from "./auth.session-service";
import { ClientSite } from "./auth.types";
import { UserRepository } from "./user.repository";

@Injectable()
export class AuthLoginService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: AuthRepository,
    private readonly mail: MailService,
    private readonly accounts: AuthAccountsService,
    private readonly session: AuthSessionService,
    private readonly config: ConfigService,
  ) {}

  private fallbackOrigin() {
    return this.config.get("PUBLIC_ORIGIN") ?? "http://localhost:5173";
  }

  private async acceptInvite(
    invite: { id: string; email: string },
    res: Response,
    origin: string,
    passwordHash?: string,
  ) {
    const user = await provisionFromInvite(this.users, invite, { passwordHash });
    await this.session.issuePair(res, { userId: user.id, kind: "admin" }, origin);
    return { mode: "ready" as const, status: "ok" as const };
  }

  async invite(email: string, invitedBy?: string, site?: ClientSite) {
    const normalized = email.trim().toLowerCase();
    const exists = await this.users.findByEmail(normalized);
    if (exists) throw conflict("USER_EXISTS", "이미 등록된 이메일이에요");
    const open = await this.users.findOpenInviteByEmail(normalized);
    const token = open?.token ?? this.tokens.createId();
    if (!open) {
      await this.users.createInvite({
        email: normalized,
        token,
        invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }
    const link = `${site?.origin ?? this.fallbackOrigin()}/invite/${token}`;
    const mailed = await this.mail.send({
      to: normalized,
      ...inviteMail(link, await this.accounts.totpRequired()),
    });
    if (!mailed && isProduction()) {
      throw badGateway("MAIL_FAILED", "메일을 보내지 못했어요. 메일 설정을 확인해 주세요");
    }
    return { status: "queued" as const, resent: Boolean(open), ...(mailed || isProduction() ? {} : { link }) };
  }

  private rejectInvite<T extends { consumedAt?: Date | null; expiresAt?: Date }>(invite?: T | null) {
    if (!invite) throw notFound("INVITE_INVALID", "초대 링크가 없어요");
    if (invite.consumedAt) throw conflict("INVITE_USED", "이미 사용한 초대예요");
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw notFound("INVITE_EXPIRED", "초대가 만료됐어요");
    }
    return invite;
  }

  async inviteStatus(token: string) {
    const invite = await this.users.findInvite(token);
    if (!invite) return { status: "missing" as const };
    if (invite.consumedAt) return { status: "used" as const };
    if (invite.expiresAt < new Date()) return { status: "expired" as const };
    return { status: "ok" as const };
  }

  async startRegister(token: string, site: ClientSite, res: Response, password?: string) {
    const invite = this.rejectInvite(await this.users.findInvite(token));
    if (!(await this.accounts.totpRequired())) {
      return this.acceptInvite(invite, res, site.origin, await hashAssertedPassword(password));
    }
    return startTotpEnroll(this.tokens, {
      kind: "invite",
      token,
      origin: site.origin,
      email: invite.email,
    });
  }

  async finishRegister(challengeKey: string, code: string, res: Response) {
    const ctx = await readTotpChallenge(this.tokens, challengeKey);
    if (!ctx) throw badRequest("CHALLENGE_EXPIRED", "인증 시간이 지났어요");
    if (!verifyTotp(ctx.secret, code)) throw unauthorized("TOTP_INVALID", "인증 번호가 맞지 않아요");
    await this.tokens.takeChallenge(challengeKey);

    if (ctx.kind === "recovery" && ctx.userId) {
      await this.users.setTotpSecret(ctx.userId, ctx.secret);
      await this.session.issuePair(res, { userId: ctx.userId, kind: "admin" }, ctx.origin);
      return { status: "ok" };
    }

    const invite = this.rejectInvite(await this.users.findInvite(ctx.token ?? ""));
    const user = await provisionFromInvite(this.users, invite, {
      totpSecret: ctx.secret,
    });
    await this.session.issuePair(res, { userId: user.id, kind: "admin" }, ctx.origin);
    return { status: "ok" };
  }

  async ensureSetupInvite(email: string) {
    const normalized = email.trim().toLowerCase();
    const open = await this.users.findOpenInviteByEmail(normalized);
    if (open) return open;
    const bootstrap = this.accounts.bootstrapEmail();
    if (bootstrap && bootstrap === normalized) {
      return this.users.createInvite({
        email: normalized,
        token: this.tokens.createId(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }
    throw notFound("USER_NOT_FOUND", "계정을 찾지 못했어요. 초대를 먼저 받아 주세요.");
  }

  private startEnrollForUser(
    user: { id: string; email: string },
    site: ClientSite,
    kind: "invite" | "recovery" = "recovery",
  ) {
    return startTotpEnroll(this.tokens, {
      kind,
      userId: user.id,
      origin: site.origin,
      email: user.email,
    });
  }

  async startLogin(email: string, site: ClientSite, res: Response) {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    const bootstrap = this.accounts.isBootstrap(normalized);
    if (!(await this.accounts.totpRequired())) {
      if (user?.passwordHash) return { mode: "password" as const, email: normalized };
      if (bootstrap) {
        if (!user) await this.ensureSetupInvite(normalized);
        return { mode: "set-password" as const, email: normalized };
      }
      return { mode: "password" as const, email: normalized };
    }
    if (user?.totpSecret) return { mode: "login" as const, email: normalized };
    if (user) return this.startEnrollForUser(user, site);
    if (bootstrap) {
      const invite = await this.ensureSetupInvite(normalized);
      return this.startRegister(invite.token, site, res);
    }
    return { mode: "login" as const, email: normalized };
  }

  async finishLogin(
    input: { email?: string; challengeKey?: string; code?: string; password?: string },
    res: Response,
    site: ClientSite,
  ) {
    if (input.challengeKey) {
      if (!input.code) throw badRequest("CODE_REQUIRED", "인증 번호를 입력해 주세요");
      return this.finishRegister(input.challengeKey, input.code, res);
    }
    const email = input.email?.trim().toLowerCase();
    if (!email) throw badRequest("EMAIL_REQUIRED", "이메일을 입력해 주세요");
    const user = await this.users.findByEmail(email);
    if (!(await this.accounts.totpRequired())) {
      if (user?.passwordHash) {
        const secret = input.password ?? "";
        if (secret.length < 8) throw badRequest("PASSWORD_SHORT", "비밀번호는 8자 이상이어야 해요");
        if (!(await verifyPassword(secret, user.passwordHash))) {
          throw unauthorized("PASSWORD_INVALID", "이메일 또는 비밀번호가 맞지 않아요");
        }
        await this.session.issuePair(res, { userId: user.id, kind: "admin" }, site.origin);
        return { status: "ok" };
      }
      const secret = assertPassword(input.password);
      if (user) {
        if (this.accounts.isBootstrap(email)) {
          await this.users.setPasswordHash(user.id, await hashPassword(secret));
        } else {
          throw unauthorized("PASSWORD_INVALID", "이메일 또는 비밀번호가 맞지 않아요");
        }
        await this.session.issuePair(res, { userId: user.id, kind: "admin" }, site.origin);
        return { status: "ok" };
      }
      if (!this.accounts.isBootstrap(email)) {
        throw unauthorized("PASSWORD_INVALID", "이메일 또는 비밀번호가 맞지 않아요");
      }
      const invite = await this.ensureSetupInvite(email);
      return this.acceptInvite(invite, res, site.origin, await hashPassword(secret));
    }
    if (!user?.totpSecret) throw unauthorized("TOTP_INVALID", "인증 번호가 맞지 않아요");
    if (!input.code) throw badRequest("CODE_REQUIRED", "인증 번호를 입력해 주세요");
    if (!verifyTotp(user.totpSecret, input.code)) throw unauthorized("TOTP_INVALID", "인증 번호가 맞지 않아요");
    const usedKey = `totp-used:${user.id}:${input.code}`;
    if (await this.tokens.getChallenge(usedKey)) {
      throw unauthorized("TOTP_REUSED", "방금 쓴 번호예요. 다음 번호를 입력해 주세요");
    }
    await this.tokens.saveChallenge(usedKey, "1", 90);
    await this.session.issuePair(res, { userId: user.id, kind: "admin" }, site.origin);
    return { status: "ok" };
  }

  async recoveryStatus(token: string) {
    const userId = await this.tokens.getChallenge(`rec:${token}`);
    return { status: userId ? ("ok" as const) : ("expired" as const) };
  }

  async requestRecovery(email: string, site?: ClientSite) {
    const user = await this.users.findByEmail(email);
    if (!user) return { status: "queued" };
    const token = this.tokens.createId();
    await this.tokens.saveChallenge(`rec:${token}`, user.id, 30 * 60);
    const link = `${site?.origin ?? this.fallbackOrigin()}/recover/${token}`;
    const mailed = await this.mail.send({
      to: email.trim().toLowerCase(),
      ...recoveryMail(link, await this.accounts.totpRequired()),
    });
    if (!mailed && process.env.NODE_ENV !== "production") {
      console.info(JSON.stringify({ kind: "recovery", to: email.trim().toLowerCase(), link }));
    }
    return { status: "queued" as const };
  }

  async startRecoveryRegister(token: string, site: ClientSite, res: Response, password?: string) {
    const userId = await this.tokens.takeChallenge(`rec:${token}`);
    if (!userId) throw notFound("RECOVERY_INVALID", "복구 링크가 만료됐어요");
    const user = await this.users.findById(userId);
    if (!user) throw notFound("USER_NOT_FOUND", "계정을 찾지 못했어요");
    if (!(await this.accounts.totpRequired())) {
      await this.users.setPasswordHash(user.id, await hashAssertedPassword(password));
      await this.session.issuePair(res, { userId: user.id, kind: "admin" }, site.origin);
      return { mode: "ready" as const, status: "ok" as const };
    }
    return this.startEnrollForUser(user, site);
  }
}
