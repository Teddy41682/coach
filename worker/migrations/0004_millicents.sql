-- Observations are charged their real cost in thousandths of a cent, accumulated on the '*' row (src/limits.ts).
ALTER TABLE usage ADD COLUMN millicents INTEGER NOT NULL DEFAULT 0;
