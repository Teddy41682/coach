import type { CoachRecipe } from "./expertise/pack";
import type { StepPlan } from "./link";

export type SessionRow = {
  id: string;
  device: string;
  recipe: CoachRecipe;
  /** Per step, from `linkSteps`: the ingredients that go in, and the briefing. */
  links: StepPlan[];
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
      ? { id: row.id, device: row.device, recipe: JSON.parse(row.recipe_json), links: upgrade(JSON.parse(row.links_json)), createdAt: row.created_at }
      : null;
  }
}

/** Sessions stored before briefings held plain ingredient lists per step. */
function upgrade(links: unknown): StepPlan[] {
  if (!Array.isArray(links)) return [];
  return links.map((l) => (Array.isArray(l) ? { ingredients: l as string[], done: "", mistakes: "", tip: "" } : (l as StepPlan)));
}
