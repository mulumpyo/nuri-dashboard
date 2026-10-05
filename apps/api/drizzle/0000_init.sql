CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'admin',
  "password_hash" text,
  "totp_secret" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "invited_by" uuid REFERENCES "users"("id"),
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "credential_id" text NOT NULL UNIQUE,
  "public_key" text NOT NULL,
  "counter" integer NOT NULL DEFAULT 0,
  "transports" text
);

CREATE TABLE IF NOT EXISTS "display_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL DEFAULT '디스플레이',
  "approved_by" uuid REFERENCES "users"("id"),
  "last_seen_at" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "carriers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "sort_order" integer NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "shipments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "carrier_id" uuid NOT NULL REFERENCES "carriers"("id"),
  "ship_date" date NOT NULL,
  "box_count" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_day_company_carrier"
  ON "shipments" ("company_id", "carrier_id", "ship_date");

CREATE TABLE IF NOT EXISTS "holidays" (
  "date" date PRIMARY KEY,
  "name" text NOT NULL,
  "source" text NOT NULL
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" text;
