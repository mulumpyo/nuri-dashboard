import { Inject, Injectable } from "@nestjs/common";
import { eq, isNull } from "drizzle-orm";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { displayDevices } from "../db/schema";

@Injectable()
export class DevicesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  create(input: { name?: string; approvedBy?: string }) {
    return this.db.insert(displayDevices).values(input).returning().then((rows) => rows[0]);
  }

  list() {
    return this.db.select().from(displayDevices).where(isNull(displayDevices.revokedAt));
  }

  revoke(id: string) {
    return this.db
      .update(displayDevices)
      .set({ revokedAt: new Date() })
      .where(eq(displayDevices.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  touch(id: string) {
    return this.db.update(displayDevices).set({ lastSeenAt: new Date() }).where(eq(displayDevices.id, id));
  }
}
