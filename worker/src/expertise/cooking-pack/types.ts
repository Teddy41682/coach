/**
 * The cooking knowledge pack's shape (spec 2026-10-31, Serena's expertise). Organised by what things *do* — roles —
 * so it covers any recipe: every ingredient maps onto one or more roles through the index. Each role carries its
 * tolerance bands per kind of cooking, its rescues, substitutions and changes, and the sources behind each rule.
 * A rule with fewer than two trusted sources is `provisional` and may only lead to "ask" or "redo".
 */
export type Kind = "baking" | "pastry" | "sauce" | "braise" | "saute" | "roast" | "eggs" | "grains" | "other";
export const KINDS: Kind[] = ["baking", "pastry", "sauce", "braise", "saute", "roast", "eggs", "grains", "other"];

export type Verdict = "fine" | "fixable" | "redo";

/**
 * One band of a role's tolerance: applies to ratios (actual ÷ recipe amount) below `below`. Bands are sorted by
 * `below`; the first whose `below` exceeds the ratio applies; the last is `Infinity`. A ratio of 0 is "forgot it".
 */
export type Band = { below: number; verdict: Verdict; rescue?: string;
  /** The cut-point rests on fewer than two trusted sources: a fixable band here is treated as redo (doubt → redo). */
  provisional?: boolean };

/**
 * How a `fixable` band is put right. `scale`: make the batch proportionally bigger (capped by the verdict engine).
 * `add`: add an ingredient filling `add.role`, `add.per` of the recipe's unit for each unit over (or `add.amount`
 * once). `none`: say how to carry on, no quantities.
 */
export type Rescue = {
  id: string;
  kind: "scale" | "add" | "none";
  add?: { role: string; per?: number; amount?: string };
  /** Only when this holds ("before it goes in the oven"); said with the rescue. */
  when?: string;
  say: string;
  sources: string[];
  provisional?: boolean;
};

export type Substitution = { use: string; ratio: number; effect: string; sources: string[]; provisional?: boolean };
/**
 * How far an amount may be changed and what that does. `upTo` is the fraction of the recipe amount it may change by:
 * 0.25 = up to a quarter less (or more); 1 with "less" = it can be left out. Never a ratio of the recipe amount.
 */
export type Change = { direction: "less" | "more"; upTo: number; effect: string; sources: string[]; provisional?: boolean };

export type Role = {
  id: string;
  name: string;
  does: string;
  /** Small errors ruin the result: its measures are "risky" in the brief. */
  tight: boolean;
  bands: Partial<Record<Kind, Band[]>> & { default: Band[] };
  rescues: Rescue[];
  substitutions: Substitution[];
  changes: Change[];
  /** How a slip shows, for the eyes. */
  shows: string;
  sources: string[];
  provisional?: boolean;
};

export type Pack = {
  version: string;
  roles: Role[];
  /** Normalised ingredient name or alias → role ids. */
  index: Record<string, string[]>;
  /** Another name for the very same ingredient → its indexed name ("bicarbonate of soda" → "baking soda"). Never a
   *  different ingredient that does the same job: almond extract is not vanilla. */
  aliases: Record<string, string>;
};
