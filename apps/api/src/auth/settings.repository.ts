import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { appSettings } from "../db/schema";

export const TOTP_REQUIRED_KEY = "totp_required";

@Injectable()
export class SettingsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  get(key: string) {
    return this.db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .then((rows) => rows[0]?.value ?? null);
  }

  async getBool(key: string, fallback = false) {
    const value = await this.get(key);
    if (value == null) return fallback;
    return value === "true" || value === "1";
  }

  async set(key: string, value: string) {
    await this.db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  }
}
