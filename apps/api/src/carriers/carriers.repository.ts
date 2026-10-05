import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { carriers, shipments } from "../db/schema";

@Injectable()
export class CarriersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  list() {
    return this.db.select().from(carriers).orderBy(asc(carriers.sortOrder));
  }

  find(id: string) {
    return this.db.select().from(carriers).where(eq(carriers.id, id)).then((rows) => rows[0]);
  }

  findByName(name: string) {
    return this.db.select().from(carriers).where(eq(carriers.name, name)).then((rows) => rows[0]);
  }

  async ensureDefaults(rows: readonly { name: string; sortOrder: number }[] = []) {
    for (const row of rows) {
      if (await this.findByName(row.name)) continue;
      await this.create({ name: row.name, sortOrder: row.sortOrder, active: true });
    }
  }

  create(input: { name: string; sortOrder?: number; active?: boolean }) {
    return this.db.insert(carriers).values(input).returning().then((rows) => rows[0]);
  }

  update(id: string, input: Partial<{ name: string; sortOrder: number; active: boolean }>) {
    return this.db.update(carriers).set(input).where(eq(carriers.id, id)).returning().then((rows) => rows[0]);
  }

  remove(id: string) {
    return this.db.transaction(async (tx) => {
      await tx.delete(shipments).where(eq(shipments.carrierId, id));
      const rows = await tx.delete(carriers).where(eq(carriers.id, id)).returning();
      return rows[0];
    });
  }
}
