/**
 * Daily spending caps: judges (and anyone who finds the app key) spend our Meta credit. One question is about
 * 0.2¢ (a ~1,400-token frame at $1.25/M plus a short answer); counting each turn as 1¢ keeps the estimate on the
 * safe side. Over a cap, the coach says so out loud and the model is never called.
 */
export const DEVICE_DAILY_TURNS = 150;
export const GLOBAL_DAILY_CENTS = 1_500;
export const EST_CENTS_PER_TURN = 1;
export const LIMIT_LINE = "I've reached today's limit — try again tomorrow.";

export interface UsageStore {
  deviceTurns(day: string, device: string): Promise<number>;
  totalCents(day: string): Promise<number>;
  add(day: string, device: string, cents: number): Promise<void>;
}

/** For tests. */
export class MemoryUsageStore implements UsageStore {
  private rows = new Map<string, { turns: number; cents: number }>();
  async deviceTurns(day: string, device: string) { return this.rows.get(`${day}|${device}`)?.turns ?? 0; }
  async totalCents(day: string) {
    let sum = 0;
    for (const [k, v] of this.rows) if (k.startsWith(`${day}|`)) sum += v.cents;
    return sum;
  }
  async add(day: string, device: string, cents: number) {
    const k = `${day}|${device}`;
    const r = this.rows.get(k) ?? { turns: 0, cents: 0 };
    this.rows.set(k, { turns: r.turns + 1, cents: r.cents + cents });
  }
}

export class D1UsageStore implements UsageStore {
  constructor(private readonly db: D1Database) {}
  async deviceTurns(day: string, device: string) {
    const r = await this.db.prepare("SELECT turns FROM usage WHERE day = ?1 AND device = ?2").bind(day, device).first<{ turns: number }>();
    return r?.turns ?? 0;
  }
  async totalCents(day: string) {
    const r = await this.db.prepare("SELECT COALESCE(SUM(cents), 0) AS c FROM usage WHERE day = ?1").bind(day).first<{ c: number }>();
    return r?.c ?? 0;
  }
  async add(day: string, device: string, cents: number) {
    await this.db
      .prepare("INSERT INTO usage (day, device, turns, cents) VALUES (?1, ?2, 1, ?3) ON CONFLICT (day, device) DO UPDATE SET turns = turns + 1, cents = cents + ?3")
      .bind(day, device, cents)
      .run();
  }
}

/** Counts the turn if it may go ahead; a refused turn is not counted. */
export async function checkAndCount(usage: UsageStore, device: string, day: string): Promise<"ok" | "device" | "global"> {
  if ((await usage.deviceTurns(day, device)) >= DEVICE_DAILY_TURNS) return "device";
  if ((await usage.totalCents(day)) + EST_CENTS_PER_TURN > GLOBAL_DAILY_CENTS) return "global";
  await usage.add(day, device, EST_CENTS_PER_TURN);
  return "ok";
}

/** The cook's day: caps reset at midnight in Hawaii, where the coach is run from. */
export function hstDay(nowMs: number): string {
  return new Date(nowMs - 10 * 3_600_000).toISOString().slice(0, 10);
}
