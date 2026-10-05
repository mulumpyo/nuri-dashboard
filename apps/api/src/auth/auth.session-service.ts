import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request, Response } from "express";
import { ACCESS_TTL_SEC, DEVICE_REFRESH_TTL_SEC, REFRESH_TTL_SEC } from "../domain/constants";
import { unauthorized } from "../common/errors";
import * as session from "./auth.session";
import { AuthRepository } from "./auth.repository";
import { AccessClaims, ClientSite, RefreshRecord } from "./auth.types";
import { UserRepository } from "./user.repository";

export type { ClientSite };

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: AuthRepository,
    private readonly jwt: JwtService,
  ) {}

  clientSite(req: Request): ClientSite {
    return session.clientSite(req);
  }

  attachCookies(res: Response, access: string, refresh: string, refreshTtl: number, origin?: string): void {
    session.attachCookies(res, access, refresh, refreshTtl, origin);
  }

  clearCookies(res: Response, origin?: string): void {
    session.clearCookies(res, origin);
  }

  private signAccess(claims: AccessClaims): string {
    return this.jwt.sign(claims, { expiresIn: ACCESS_TTL_SEC, jwtid: this.tokens.createId() });
  }

  async issuePair(
    res: Response,
    record: Omit<RefreshRecord, "family"> & { family?: string },
    origin?: string,
  ): Promise<void> {
    const family = record.family ?? this.tokens.createId();
    const refreshId = this.tokens.createId();
    const ttl = record.kind === "device" ? DEVICE_REFRESH_TTL_SEC : REFRESH_TTL_SEC;
    await this.tokens.saveRefresh(refreshId, { ...record, family }, ttl);
    const access = this.signAccess({
      sub: record.userId,
      kind: record.kind,
      deviceId: record.deviceId,
      role: record.kind === "admin" ? (await this.users.findById(record.userId))?.role : undefined,
    });
    if (record.kind === "device" && record.deviceId) await this.tokens.bindDevice(record.deviceId, family, ttl);
    this.attachCookies(res, access, refreshId, ttl, origin);
  }

  async refresh(refreshId: string | undefined, res: Response, origin?: string) {
    if (!refreshId) throw unauthorized();
    const record = await this.tokens.getRefresh(refreshId);
    if (!record) {
      const family = await this.tokens.usedFamily(refreshId);
      if (family) await this.tokens.dropFamily(family);
      throw unauthorized("REFRESH_REUSE", "세션이 만료됐거나 다시 사용됐어요");
    }
    const ttl = record.kind === "device" ? DEVICE_REFRESH_TTL_SEC : REFRESH_TTL_SEC;
    await this.tokens.markUsed(refreshId, record.family, ttl);
    await this.tokens.dropRefresh(refreshId);
    await this.issuePair(res, record, origin);
    return { status: "ok" };
  }

  async logout(refreshId: string | undefined, accessToken: string | undefined, res: Response, origin?: string) {
    if (refreshId) {
      const record = await this.tokens.getRefresh(refreshId);
      if (record) await this.tokens.dropFamily(record.family);
    }
    if (accessToken) {
      const payload = this.jwt.decode(accessToken) as AccessClaims | null;
      if (payload?.jti) await this.tokens.deny(payload.jti, ACCESS_TTL_SEC);
    }
    this.clearCookies(res, origin);
    return { status: "ok" };
  }
}
