import type { CoachRecipe } from "./expertise/pack";

export type SessionRow = {
  id: string;
  device: string;
  recipe: CoachRecipe;
  /** Ingredient names per step, from `linkSteps`. */
  links: string[][];
  createdAt: number;
};

export interface SessionStore {
  put(row: SessionRow): Promise<void>;
  get(id: string): Promise<SessionRow | null>;
}

/** For tests. */
export class MemorySessionStore implements SessionStore {
  private rows = new Map<string, SessionRow>();
  async put(row: SessionRow) { this.rows.set(row.id, row); }
  async get(id: string) { return this.rows.get(id) ?? null; }
}

export class D1SessionStore implements SessionStore {
  constructor(private readonly db: D1Database) {}
  async put(r: SessionRow) {
    await this.db
      .prepare("INSERT INTO sessions (id, device, recipe_json, links_json, created_at) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(r.id, r.device, JSON.stringify(r.recipe), JSON.stringify(r.links), r.createdAt)
      .run();
  }
  async get(id: string) {
    const row = await this.db
      .prepare("SELECT id, device, recipe_json, links_json, created_at FROM sessions WHERE id = ?1")
      .bind(id)
      .first<{ id: string; device: string; recipe_json: string; links_json: string; created_at: number }>();
    return row
      ? { id: row.id, device: row.device, recipe: JSON.parse(row.recipe_json), links: JSON.parse(row.links_json), createdAt: row.created_at }
      : null;
  }
}
