/**
 * Daily spending caps: judges (and anyone who finds the app key) spend our Meta credit. One question is about
 * 0.2¢ (a ~1,400-token frame at $1.25/M plus a short answer); `costOf` charges an upper bound. Over a cap, the
 * coach says so out loud and the model is never called.
 */
export const DEVICE_DAILY_TURNS = 150;
export const GLOBAL_DAILY_CENTS = 1_500;
/** Observations are counted apart from turns: ~1 hour of cooking at one every 2.5 s… */
export const DEVICE_DAILY_OBSERVES = 1_500;
/*
 * …and each look is charged its REAL cost — Meta's own token counts, in millicents, accumulated on the shared '*' row
 * so fractions add up and rotating device ids can't dodge it (security review, 2026-10-27). Measured 0.15–0.47¢ a
 * look. A look is only let through while the day's cents have room; looks already in flight when the cap is hit
 * can each overshoot by one look's cost (≤ ~1¢ with the 1024 px and token caps) — accepted.
 */
export const LIMIT_LINE = "I've reached today's limit — try again tomorrow.";
/** Session start: planning reasons, then answers with up to 4,000 tokens (~1.7¢ at $4.25/M) plus the recipe; charged 3¢. */
export const LINK_CENTS = 3;

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
  /** Adds a look's real cost (millicents) to the day; whole cents roll into the day's total in the same update. */
  chargeMillicents(day: string, millicents: number): Promise<void>;
  /** Counts one observation if the device is under `max` and the day's cents have room (the cost comes after). */
  tryObserve(day: string, device: string, max: number, maxCents: number): Promise<CountResult>;
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
  private milli = new Map<string, number>();
  async chargeMillicents(day: string, millicents: number) {
    const before = this.milli.get(day) ?? 0, after = before + millicents;
    this.milli.set(day, after);
    this.cents.set(day, (this.cents.get(day) ?? 0) + Math.floor(after / 1000) - Math.floor(before / 1000));
  }
  private observes = new Map<string, number>();
  async tryObserve(day: string, device: string, max: number, maxCents: number): Promise<CountResult> {
    const k = `${day}|${device}`;
    const n = this.observes.get(k) ?? 0;
    if (n >= max) return "device";
    if ((this.cents.get(day) ?? 0) >= maxCents) return "global";
    this.observes.set(k, n + 1);
    return "ok";
  }
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
  async chargeMillicents(day: string, millicents: number) {
    // Whole-cent arithmetic: D1 binds JS numbers as REAL, so without the CASTs SQLite divides with fractions
    // (live, 2026-10-27: cents became 134.776). The cents column gains exactly the whole cents this charge crosses.
    await this.db
      .prepare(`INSERT INTO usage (day, device, turns, cents, millicents)
                  VALUES (?1, '*', 0, CAST(?2 AS INTEGER) / 1000, CAST(?2 AS INTEGER))
                ON CONFLICT (day, device) DO UPDATE SET
                  cents = cents + (CAST(millicents AS INTEGER) + CAST(?2 AS INTEGER)) / 1000 - CAST(millicents AS INTEGER) / 1000,
                  millicents = CAST(millicents AS INTEGER) + CAST(?2 AS INTEGER)`)
      .bind(day, millicents)
      .run();
  }
  async tryObserve(day: string, device: string, max: number, maxCents: number): Promise<CountResult> {
    if ((await this.totalCents(day)) >= maxCents) return "global";
    const row = await this.db
      .prepare(
        `INSERT INTO usage (day, device, turns, cents, observes) VALUES (?1, ?2, 0, 0, 1)
         ON CONFLICT (day, device) DO UPDATE SET observes = observes + 1 WHERE observes < ?3
         RETURNING observes`,
      )
      .bind(day, device, max)
      .first<{ observes: number }>();
    return row ? "ok" : "device";
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

export function checkObserve(usage: UsageStore, device: string, day: string): Promise<CountResult> {
  return usage.tryObserve(day, device, DEVICE_DAILY_OBSERVES, GLOBAL_DAILY_CENTS);
}

/** What a call really cost, in thousandths of a cent, from Meta's token counts (muse-spark-1.3 standard prices). */
export function realMillicents(u: { input: number; cachedInput: number; output: number }): number {
  // $/M tokens × 100 ¢ × 1000 m¢ / 1e6 tokens = rate / 10 millicents per token.
  return Math.ceil(((u.input - u.cachedInput) * 1.25 + u.cachedInput * 0.15 + u.output * 4.25) / 10);
}
