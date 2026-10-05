import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { DB } from "../db/db.module";
import type { Database } from "../db/drizzle";
import { displayDevices, invites, users } from "../db/schema";

@Injectable()
export class UserRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  findByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalized}`)
      .then((rows) => rows[0]);
  }

  findOpenInviteByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return this.db
      .select()
      .from(invites)
      .where(and(sql`lower(${invites.email}) = ${normalized}`, isNull(invites.consumedAt), gt(invites.expiresAt, new Date())))
      .then((rows) => rows[0]);
  }

  findById(id: string) {
    return this.db.select().from(users).where(eq(users.id, id)).then((rows) => rows[0]);
  }

  hasAny() {
    return this.db
      .select({ id: users.id })
      .from(users)
      .limit(1)
      .then((rows) => rows.length > 0);
  }

  createUser(input: { email: string; role: string; totpSecret?: string; passwordHash?: string }) {
    return this.db.insert(users).values(input).returning().then((rows) => rows[0]);
  }

  setTotpSecret(id: string, totpSecret: string) {
    return this.db.update(users).set({ totpSecret }).where(eq(users.id, id));
  }

  setPasswordHash(id: string, passwordHash: string) {
    return this.db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  findInvite(token: string) {
    return this.db.select().from(invites).where(eq(invites.token, token)).then((rows) => rows[0]);
  }

  createInvite(input: { email: string; token: string; invitedBy?: string; expiresAt: Date }) {
    return this.db.insert(invites).values(input).returning().then((rows) => rows[0]);
  }

  consumeInvite(id: string) {
    return this.db.update(invites).set({ consumedAt: new Date() }).where(eq(invites.id, id));
  }

  list() {
    return this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt));
  }

  async remove(id: string) {
    await this.db.transaction(async (tx) => {
      await tx.update(invites).set({ invitedBy: null }).where(eq(invites.invitedBy, id));
      await tx.update(displayDevices).set({ approvedBy: null }).where(eq(displayDevices.approvedBy, id));
      await tx.delete(users).where(eq(users.id, id));
    });
  }
}
