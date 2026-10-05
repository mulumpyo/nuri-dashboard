import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { pairingCode } from "../domain/pairing";
import Redis from "ioredis";
import { ACCESS_TTL_SEC, PAIRING_TTL_SEC } from "../domain/constants";
import { REDIS } from "../redis/redis.module";
import { RefreshRecord } from "./auth.types";

@Injectable()
export class AuthRepository {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async saveRefresh(id: string, record: RefreshRecord, ttlSec: number): Promise<void> {
    await this.redis.set(`refresh:${id}`, JSON.stringify(record), "EX", ttlSec);
    await this.redis.sadd(`family:${record.family}`, id);
    await this.redis.expire(`family:${record.family}`, ttlSec);
  }

  async markUsed(id: string, family: string, ttlSec: number): Promise<void> {
    await this.redis.set(`used:${id}`, family, "EX", ttlSec);
  }

  async usedFamily(id: string): Promise<string | null> {
    return this.redis.get(`used:${id}`);
  }

  async getRefresh(id: string): Promise<RefreshRecord | null> {
    const raw = await this.redis.get(`refresh:${id}`);
    return raw ? (JSON.parse(raw) as RefreshRecord) : null;
  }

  async dropRefresh(id: string): Promise<void> {
    await this.redis.del(`refresh:${id}`);
  }

  async dropFamily(family: string): Promise<void> {
    const ids = await this.redis.smembers(`family:${family}`);
    if (ids.length) await this.redis.del(...ids.map((item) => `refresh:${item}`), `family:${family}`);
  }

  async bindDevice(deviceId: string, family: string, ttlSec: number): Promise<void> {
    const previous = await this.redis.get(`device-family:${deviceId}`);
    if (previous && previous !== family) await this.dropFamily(previous);
    await this.redis.set(`device-family:${deviceId}`, family, "EX", ttlSec);
  }

  async dropDevice(deviceId: string): Promise<void> {
    const family = await this.redis.get(`device-family:${deviceId}`);
    if (family) await this.dropFamily(family);
    await this.redis.set(`revoked:${deviceId}`, "1", "EX", ACCESS_TTL_SEC);
    await this.redis.del(`device-family:${deviceId}`);
  }

  async isRevoked(deviceId: string): Promise<boolean> {
    return Boolean(await this.redis.get(`revoked:${deviceId}`));
  }

  async dropUserSessions(userId: string): Promise<void> {
    let cursor = "0";
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", "refresh:*", "COUNT", 80);
      cursor = next;
      for (const key of keys) {
        const raw = await this.redis.get(key);
        if (!raw) continue;
        const record = JSON.parse(raw) as RefreshRecord;
        if (record.userId === userId) await this.dropFamily(record.family);
      }
    } while (cursor !== "0");
    await this.redis.set(`user-revoked:${userId}`, "1", "EX", ACCESS_TTL_SEC);
  }

  async isUserRevoked(userId: string): Promise<boolean> {
    return Boolean(await this.redis.get(`user-revoked:${userId}`));
  }

  async deny(jti: string, ttlSec: number): Promise<void> {
    await this.redis.set(`deny:${jti}`, "1", "EX", ttlSec);
  }

  async isDenied(jti: string): Promise<boolean> {
    return Boolean(await this.redis.get(`deny:${jti}`));
  }

  async saveChallenge(key: string, value: string, ttlSec = 120): Promise<void> {
    await this.redis.set(`chal:${key}`, value, "EX", ttlSec);
  }

  async getChallenge(key: string): Promise<string | null> {
    return this.redis.get(`chal:${key}`);
  }

  async takeChallenge(key: string): Promise<string | null> {
    const value = await this.getChallenge(key);
    if (value) await this.redis.del(`chal:${key}`);
    return value;
  }

  async savePairing(code: string, payload: string, ttlSec = PAIRING_TTL_SEC): Promise<void> {
    await this.redis.set(`pair:${code}`, payload, "EX", ttlSec);
  }

  async getPairing(code: string): Promise<string | null> {
    return this.redis.get(`pair:${code}`);
  }

  async dropPairing(code: string): Promise<void> {
    await this.redis.del(`pair:${code}`);
  }

  createId(): string {
    return randomBytes(24).toString("hex");
  }

  createCode(): string {
    return pairingCode();
  }
}
