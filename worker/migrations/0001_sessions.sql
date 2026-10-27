-- One row per cooking session: the recipe as sent, and which ingredients belong to each step.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  device TEXT NOT NULL,
  recipe_json TEXT NOT NULL,
  links_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_device ON sessions (device, created_at);
