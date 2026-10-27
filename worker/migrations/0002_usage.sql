-- Turns and estimated cents per device per (Hawaii) day, for the daily caps in src/limits.ts.
CREATE TABLE usage (
  day TEXT NOT NULL,
  device TEXT NOT NULL,
  turns INTEGER NOT NULL DEFAULT 0,
  cents INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, device)
);
