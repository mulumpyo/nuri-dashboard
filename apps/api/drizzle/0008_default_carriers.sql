INSERT INTO "carriers" ("name", "sort_order", "active")
VALUES
  ('CJ', 0, true),
  ('경기택배', 1, true),
  ('퀵발송', 2, true)
ON CONFLICT ("name") DO NOTHING;
