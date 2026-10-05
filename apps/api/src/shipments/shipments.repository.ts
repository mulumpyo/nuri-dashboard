import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { companies, shipments } from "../db/schema";

@Injectable()
export class ShipmentsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  findCompany(id: string) {
    return this.db.select().from(companies).where(eq(companies.id, id)).then((rows) => rows[0]);
  }

  findCompanyByName(name: string) {
    return this.db.select().from(companies).where(eq(companies.name, name)).then((rows) => rows[0]);
  }

  searchCompanies(q: string) {
    return this.db
      .select()
      .from(companies)
      .where(sql`${companies.name} ilike ${"%" + q + "%"}`)
      .limit(12);
  }

  increment(input: {
    companyId: string;
    carrierId: string;
    shipDate: string;
    boxCount: number;
    payType: string;
    shipTime: string | null;
  }) {
    return this.db
      .insert(shipments)
      .values(input)
      .onConflictDoUpdate({
        target: [shipments.companyId, shipments.carrierId, shipments.shipDate, shipments.payType],
        set: {
          boxCount: sql`${shipments.boxCount} + excluded.box_count`,
          shipTime: sql`excluded.ship_time`,
          updatedAt: sql`now()`,
        },
      })
      .returning()
      .then((rows) => rows[0]);
  }

  updateCount(id: string, boxCount: number) {
    return this.db
      .update(shipments)
      .set({ boxCount, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  updatePayType(id: string, payType: string) {
    return this.db
      .update(shipments)
      .set({ payType, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  updateShipTime(id: string, shipTime: string) {
    return this.db
      .update(shipments)
      .set({ shipTime, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning()
      .then((rows) => rows[0]);
  }

  remove(id: string) {
    return this.db.delete(shipments).where(eq(shipments.id, id)).returning().then((rows) => rows[0]);
  }

  find(id: string) {
    return this.db.select().from(shipments).where(eq(shipments.id, id)).then((rows) => rows[0]);
  }

  inRange(from: string, to: string) {
    return this.db
      .select({
        id: shipments.id,
        companyId: shipments.companyId,
        carrierId: shipments.carrierId,
        shipDate: shipments.shipDate,
        boxCount: shipments.boxCount,
        payType: shipments.payType,
        shipTime: shipments.shipTime,
        companyName: companies.name,
      })
      .from(shipments)
      .innerJoin(companies, eq(companies.id, shipments.companyId))
      .where(and(gte(shipments.shipDate, from), lte(shipments.shipDate, to)));
  }
}
