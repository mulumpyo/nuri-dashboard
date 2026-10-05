ALTER TABLE "shipments" ADD COLUMN IF NOT EXISTS "pay_type" text NOT NULL DEFAULT 'prepaid';

DROP INDEX IF EXISTS "shipments_day_company_carrier";

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_day_company_carrier_pay"
  ON "shipments" ("company_id", "carrier_id", "ship_date", "pay_type");
