-- A rescue that makes the batch bigger (expertise spec 2026-10-31): every later amount is read at this scale.
ALTER TABLE sessions ADD COLUMN scale REAL NOT NULL DEFAULT 1;
