import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { hashPassword, PASSWORD_MIN } from "../domain/password";
import { createDb } from "./drizzle";
import { loadEnv } from "./env";
import { carriers, invites, users } from "./schema";

const SEED_CARRIERS = [
  { name: "CJ", sortOrder: 0 },
  { name: "경기택배", sortOrder: 1 },
  { name: "퀵발송", sortOrder: 2 },
];

const run = async () => {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const { client, db } = createDb(url);

  for (const row of SEED_CARRIERS) {
    const found = await db.select().from(carriers).where(eq(carriers.name, row.name));
    if (found.length === 0) await db.insert(carriers).values(row);
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() ?? "";
  if (email && password.length >= PASSWORD_MIN) {
    const existing = await db.select().from(users).where(eq(users.email, email));
    const hash = await hashPassword(password);
    if (existing.length === 0) {
      await db.insert(users).values({
        email,
        role: "owner",
        passwordHash: hash,
      });
      console.log(`bootstrap admin: ${email}`);
    } else if (!existing[0]?.passwordHash) {
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, existing[0]!.id));
      console.log(`bootstrap password set: ${email}`);
    }
  } else if (email) {
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length === 0) {
      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.insert(invites).values({ email, token, expiresAt });
      const origin = process.env.PUBLIC_ORIGIN ?? "http://localhost";
      console.log(`bootstrap invite: ${origin}/invite/${token}`);
    }
  } else {
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(invites).values({
      email: "owner@localhost",
      token,
      expiresAt,
    });
    const origin = process.env.PUBLIC_ORIGIN ?? "http://localhost";
    console.log(`bootstrap invite: ${origin}/invite/${token}`);
  }

  await client.end();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
