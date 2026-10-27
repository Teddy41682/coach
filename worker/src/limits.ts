/**
 * Daily spending caps: judges (and anyone who finds the app key) spend our Meta credit. One question is about
 * 0.2¢ (a ~1,400-token frame at $1.25/M plus a short answer); `costOf` charges an upper bound. Over a cap, the
 * coach says so out loud and the model is never called.
 */
export const DEVICE_DAILY_TURNS = 150;
export const GLOBAL_DAILY_CENTS = 1_500;
export const LIMIT_LINE = "I've reached today's limit — try again tomorrow.";
/** Session start: linking reasons, then answers with up to 2,000 tokens (~0.9¢ at $4.25/M); charged 2¢. */
export const LINK_CENTS = 2;

/**
 * An upper bound on one question's cost, in whole cents: 1¢ for the prompt and answer, plus 1¢ per 4 photos
 * (a ~1,500-token frame at $1.25/M is ~0.19¢, so 4 frames stay under 1¢). 8 frames → 3¢ against a ~1.6¢ ceiling.
 */
export function costOf(frames: number): number {
  return 1 + Math.ceil(frames / 4);
}

export type CountResult = "ok" | "device" | "global";

/**
 * The day's counters. `tryAdd` is the whole check-and-count in one step — a burst of simultaneous requests can't
 * slip between a check and an increment.
 */
export interface UsageStore {
  tryAdd(day: string, device: string, cents: number, maxTurns: number, maxCents: number): Promise<CountResult>;
  totalCents(day: string): Promise<number>;
}

/** For tests. Synchronous inside, so it is atomic in the same way the D1 statements are. */
export class MemoryUsageStore implements UsageStore {
  private turns = new Map<string, number>();
  private cents = new Map<string, number>();
  async tryAdd(day: string, device: string, cents: number, maxTurns: number, maxCents: number): Promise<CountResult> {
    const k = `${day}|${device}`;
    if ((this.turns.get(k) ?? 0) >= maxTurns) return "device";
    if ((this.cents.get(day) ?? 0) + cents > maxCents) return "global";
    this.turns.set(k, (this.turns.get(k) ?? 0) + 1);
    this.cents.set(day, (this.cents.get(day) ?? 0) + cents);
    return "ok";
  }
  async totalCents(day: string) { return this.cents.get(day) ?? 0; }
}

/**
 * Per-device rows plus one `device = '*'` row per day holding the global total. Each step is a single conditional
 * upsert, judged by whether it changed a row: the device row only moves while `turns < maxTurns`, the global row
 * only while `cents + cost <= maxCents`. A global refusal hands the device's turn back.
 */
export class D1UsageStore implements UsageStore {
  constructor(private readonly db: D1Database) {}
  private bump(day: string, device: string, cents: number, condition: string, limit: number) {
    return this.db
      .prepare(
        `INSERT INTO usage (day, device, turns, cents) VALUES (?1, ?2, 1, ?3)
         ON CONFLICT (day, device) DO UPDATE SET turns = turns + 1, cents = cents + ?3 WHERE ${condition}`,
      )
      .bind(day, device, cents, limit)
      .run();
  }
  async tryAdd(day: string, device: string, cents: number, maxTurns: number, maxCents: number): Promise<CountResult> {
    const mine = await this.bump(day, device, cents, "turns < ?4", maxTurns);
    if (mine.meta.changes === 0) return "device";
    const all = await this.bump(day, "*", cents, "cents + ?3 <= ?4", maxCents);
    if (all.meta.changes === 0) {
      await this.db.prepare("UPDATE usage SET turns = turns - 1, cents = cents - ?3 WHERE day = ?1 AND device = ?2")
        .bind(day, device, cents).run();
      return "global";
    }
    return "ok";
  }
  async totalCents(day: string) {
    const r = await this.db.prepare("SELECT cents FROM usage WHERE day = ?1 AND device = '*'").bind(day).first<{ cents: number }>();
    return r?.cents ?? 0;
  }
}

/** Counts the request if it may go ahead; a refused request is not counted. */
export function checkAndCount(usage: UsageStore, device: string, day: string, cents: number): Promise<CountResult> {
  return usage.tryAdd(day, device, cents, DEVICE_DAILY_TURNS, GLOBAL_DAILY_CENTS);
}

/** The cook's day: caps reset at midnight in Hawaii, where the coach is run from. */
export function hstDay(nowMs: number): string {
  return new Date(nowMs - 10 * 3_600_000).toISOString().slice(0, 10);
}
