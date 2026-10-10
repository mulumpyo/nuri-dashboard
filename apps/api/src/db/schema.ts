import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("admin"),
  passwordHash: text("password_hash"),
  totpSecret: text("totp_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const displayDevices = pgTable("display_devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().default("디스플레이"),
  approvedBy: uuid("approved_by").references(() => users.id),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carriers = pgTable("carriers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
});

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    carrierId: uuid("carrier_id")
      .notNull()
      .references(() => carriers.id),
    shipDate: date("ship_date").notNull(),
    boxCount: integer("box_count").notNull(),
    payType: text("pay_type").notNull().default("prepaid"),
    shipTime: text("ship_time"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("shipments_day_company_carrier_pay_note").on(
      t.companyId,
      t.carrierId,
      t.shipDate,
      t.payType,
      t.note,
    ),
  ],
);

export const holidays = pgTable("holidays", {
  date: date("date").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  actor: text("actor").notNull(),
  talk: text("talk").notNull(),
  requestId: text("request_id").notNull().default(""),
  ok: boolean("ok").notNull().default(true),
  email: text("email").notNull().default(""),
  kind: text("kind").notNull().default("work"),
  detail: text("detail").notNull().default(""),
});
