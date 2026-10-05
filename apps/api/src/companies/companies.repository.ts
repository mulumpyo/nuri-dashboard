import { Inject, Injectable } from "@nestjs/common";
import { asc, count, eq, sql } from "drizzle-orm";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { companies, shipments } from "../db/schema";

@Injectable()
export class CompaniesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  find(id: string) {
    return this.db.select().from(companies).where(eq(companies.id, id)).then((rows) => rows[0]);
  }

  findByName(name: string) {
    return this.db.select().from(companies).where(eq(companies.name, name)).then((rows) => rows[0]);
  }

  async list(q: string, page: number, limit: number) {
    const term = q.replace(/[%_\\]/g, "").trim();
    const where = term ? sql`${companies.name} ilike ${"%" + term + "%"}` : undefined;
    const offset = (page - 1) * limit;
    const [items, totals] = await Promise.all([
      this.db
        .select()
        .from(companies)
        .where(where)
        .orderBy(asc(companies.name))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(companies)
        .where(where),
    ]);
    const total = Number(totals[0]?.total ?? 0);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  create(name: string) {
    return this.db.insert(companies).values({ name }).returning().then((rows) => rows[0]);
  }

  update(id: string, name: string) {
    return this.db.update(companies).set({ name }).where(eq(companies.id, id)).returning().then((rows) => rows[0]);
  }

  remove(id: string) {
    return this.db.transaction(async (tx) => {
      await tx.delete(shipments).where(eq(shipments.companyId, id));
      const rows = await tx.delete(companies).where(eq(companies.id, id)).returning();
      return rows[0];
    });
  }
}
