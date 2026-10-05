CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "at" timestamptz NOT NULL DEFAULT now(),
  "actor" text NOT NULL,
  "talk" text NOT NULL,
  "request_id" text NOT NULL DEFAULT '',
  "ok" boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS "audit_events_at_idx" ON "audit_events" ("at" DESC);
