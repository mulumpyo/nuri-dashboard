import { eq, inArray, like, sql } from "drizzle-orm";
import { TOTP_REQUIRED_KEY } from "../src/auth/settings.repository";
import type { Database } from "../src/db/drizzle";
import {
  appSettings,
  carriers,
  companies,
  displayDevices,
  holidays,
  invites,
  shipments,
  users,
} from "../src/db/schema";

export const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);

if (process.env.CI && !hasInfra) {
  throw new Error("CI e2e needs DATABASE_URL and REDIS_URL");
}

export const cookieOf = (res: { headers: { "set-cookie"?: string[] | string } }, name: string) => {
  const header = res.headers["set-cookie"];
  const list = Array.isArray(header) ? header : header ? [header] : [];
  return list.find((row) => row.startsWith(`${name}=`))?.split(";")[0] ?? "";
};

const testCompany = sql`${companies.name} ~ '^(한빛상사|등록업체|유지업체|일괄A|일괄B|업체)-[0-9]+(-더)?$'`;
const testCarrier = sql`${carriers.name} ~ '^(CJ|삭제택배|퀵)-[0-9]+$'`;
const testEmail = like(users.email, "%@nuri.test");
const testInvite = like(invites.email, "%@nuri.test");

export const sweepE2e = async (db: Database) => {
  const companyRows = await db.select({ id: companies.id }).from(companies).where(testCompany);
  const carrierRows = await db.select({ id: carriers.id }).from(carriers).where(testCarrier);
  const userRows = await db.select({ id: users.id }).from(users).where(testEmail);
  const companyIds = companyRows.map((row) => row.id);
  const carrierIds = carrierRows.map((row) => row.id);
  const userIds = userRows.map((row) => row.id);

  if (companyIds.length) await db.delete(shipments).where(inArray(shipments.companyId, companyIds));
  if (carrierIds.length) await db.delete(shipments).where(inArray(shipments.carrierId, carrierIds));
  if (companyIds.length) await db.delete(companies).where(inArray(companies.id, companyIds));
  if (carrierIds.length) await db.delete(carriers).where(inArray(carriers.id, carrierIds));

  if (userIds.length) {
    await db.delete(displayDevices).where(inArray(displayDevices.approvedBy, userIds));
    await db.update(invites).set({ invitedBy: null }).where(inArray(invites.invitedBy, userIds));
  }
  await db.delete(invites).where(testInvite);
  if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));

  await db.delete(holidays).where(eq(holidays.date, "2027-03-11"));
  await db.delete(appSettings).where(eq(appSettings.key, TOTP_REQUIRED_KEY));
};
