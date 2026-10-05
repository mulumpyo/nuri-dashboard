import { Injectable, OnModuleInit } from "@nestjs/common";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN } from "../domain/password";
import { conflict, forbidden, notFound, unauthorized } from "../common/errors";
import { AuthRepository } from "./auth.repository";
import { AccessClaims } from "./auth.types";
import { SettingsRepository, TOTP_REQUIRED_KEY } from "./settings.repository";
import { UserRepository } from "./user.repository";

@Injectable()
export class AuthAccountsService implements OnModuleInit {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: AuthRepository,
    private readonly settings: SettingsRepository,
  ) {}

  async onModuleInit() {
    await this.ensureBootstrapAccount();
  }

  bootstrapEmail() {
    return (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").trim().toLowerCase();
  }

  private bootstrapPassword() {
    return (process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "").trim();
  }

  async ensureBootstrapAccount() {
    const email = this.bootstrapEmail();
    const password = this.bootstrapPassword();
    if (!email || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return;
    const user = await this.users.findByEmail(email);
    if (!user) {
      await this.users.createUser({
        email,
        role: (await this.users.hasAny()) ? "admin" : "owner",
        passwordHash: await hashPassword(password),
      });
      return;
    }
    if (!user.passwordHash) await this.users.setPasswordHash(user.id, await hashPassword(password));
  }

  isBootstrap(email?: string | null) {
    const boot = this.bootstrapEmail();
    return Boolean(boot && email && boot === email.trim().toLowerCase());
  }

  totpRequired() {
    return this.settings.getBool(TOTP_REQUIRED_KEY, false);
  }

  async security(claims?: AccessClaims) {
    const totpRequired = await this.totpRequired();
    if (!claims || claims.kind !== "admin") return { totpRequired, canManageTotp: false };
    const user = await this.users.findById(claims.sub);
    return { totpRequired, canManageTotp: this.isBootstrap(user?.email) };
  }

  async setTotpRequired(claims: AccessClaims, on: boolean) {
    const user = await this.users.findById(claims.sub);
    if (!user || !this.isBootstrap(user.email)) {
      throw forbidden("TOTP_FORBIDDEN", "처음 등록한 관리자만 바꿀 수 있어요");
    }
    await this.settings.set(TOTP_REQUIRED_KEY, on ? "true" : "false");
    return { totpRequired: on, canManageTotp: true };
  }

  async me(claims: AccessClaims) {
    if (claims.kind === "device") return { kind: "device", deviceId: claims.deviceId };
    const user = await this.users.findById(claims.sub);
    if (!user) throw unauthorized();
    const totpRequired = await this.totpRequired();
    return {
      kind: "admin",
      id: user.id,
      email: user.email,
      role: user.role,
      totpRequired,
      canManageTotp: this.isBootstrap(user.email),
      canManageUsers: this.canManageUsers(user),
    };
  }

  canManageUsers(user: { email: string; role: string }) {
    return user.role === "owner" || this.isBootstrap(user.email);
  }

  async requireUserManager(claims: AccessClaims) {
    if (claims.kind !== "admin") throw forbidden();
    const actor = await this.users.findById(claims.sub);
    if (!actor || !this.canManageUsers(actor)) {
      throw forbidden("USERS_FORBIDDEN", "처음 등록한 관리자만 계정을 관리할 수 있어요");
    }
    return actor;
  }

  async listUsers(claims: AccessClaims) {
    await this.requireUserManager(claims);
    const rows = await this.users.list();
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt,
      bootstrap: this.isBootstrap(row.email),
    }));
  }

  async removeUser(claims: AccessClaims, id: string) {
    const actor = await this.requireUserManager(claims);
    if (actor.id === id) throw conflict("USER_SELF", "자기 계정은 삭제할 수 없어요");
    const target = await this.users.findById(id);
    if (!target) throw notFound("USER_NOT_FOUND", "계정을 찾지 못했어요");
    if (this.isBootstrap(target.email)) throw conflict("USER_BOOTSTRAP", "처음 등록한 관리자는 삭제할 수 없어요");
    await this.tokens.dropUserSessions(target.id);
    await this.users.remove(target.id);
    return { status: "ok" as const };
  }
}
