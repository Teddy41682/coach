-- Background observations per device per day, counted apart from turns (src/limits.ts, the observer).
ALTER TABLE usage ADD COLUMN observes INTEGER NOT NULL DEFAULT 0;
