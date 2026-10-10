ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "note" text NOT NULL DEFAULT '';

DROP INDEX IF EXISTS "shipments_day_company_carrier_pay";

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_day_company_carrier_pay_note"
  ON "shipments" ("company_id", "carrier_id", "ship_date", "pay_type", "note");
