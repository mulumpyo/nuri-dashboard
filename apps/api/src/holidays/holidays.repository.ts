import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { holidays } from "../db/schema";

@Injectable()
export class HolidaysRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  list() {
    return this.db.select().from(holidays);
  }

  upsert(row: { date: string; name: string; source: "api" | "manual" }) {
    return this.db
      .insert(holidays)
      .values(row)
      .onConflictDoUpdate({ target: holidays.date, set: { name: row.name, source: row.source } })
      .returning()
      .then((rows) => rows[0]);
  }

  upsertApi(row: { date: string; name: string; source: "api" }) {
    return this.db
      .insert(holidays)
      .values(row)
      .onConflictDoUpdate({
        target: holidays.date,
        set: { name: row.name, source: "api" },
        setWhere: eq(holidays.source, "api"),
      })
      .returning()
      .then((rows) => rows[0]);
  }

  remove(date: string) {
    return this.db.delete(holidays).where(eq(holidays.date, date)).returning().then((rows) => rows[0]);
  }
}
