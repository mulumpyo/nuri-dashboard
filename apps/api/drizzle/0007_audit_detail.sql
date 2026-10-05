ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "email" text NOT NULL DEFAULT '';
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'work';
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "detail" text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "audit_events_kind_at_idx" ON "audit_events" ("kind", "at" DESC);
