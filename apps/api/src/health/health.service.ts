import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { sql } from "drizzle-orm";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { REDIS } from "../redis/redis.module";

@Injectable()
export class HealthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  live() {
    return { status: "ok" as const };
  }

  async ready() {
    await this.db.execute(sql`select 1`);
    await this.redis.ping();
    return { status: "ok" as const };
  }
}
