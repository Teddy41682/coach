import type { CoachRecipe } from "../pack";
import { parseAmount, ratio as ratioOf, scaleAmount, type Amount } from "../amount";
import { PACK } from "./index";
import { normaliseItem, rolesFor } from "./lookup";
import type { Band, Kind, Pack, Role, Verdict } from "./types";

/** A rescue amount the engine may use as a number: "¼ cup", "about 2 tbsp", "30 ml" — a quantity and a unit, nothing
 *  else. */
const PLAIN = /^(about\s+)?[\d¼½¾⅓⅔⅛⅜⅝⅞./\s]+\s*(tsp|tbsp|teaspoons?|tablespoons?|cups?|ml|g|grams?)\.?$/i;

/** A bigger batch than this needs more than one pan and a different bake: it's a redo, not a rescue. */
export const MAX_SCALE = 2;

/**
 * Roles that are flavour and nothing else: too much of one is something a cook can taste, so a pro tastes before
 * ruling (his ruling 2026-10-30: "always taste"). Never leaveners, structure or thickeners — taste can't judge those.
 */
export const FLAVOUR = new Set([
  "salt", "salty-umami-condiment", "dried-mild-seasoning", "warm-sweet-spice", "chili-heat", "hot-sauce", "acid-flavour",
  "sugar-savory", "liquid-sweetener", "flavour-extract", "almond-extract", "aromatic-garlic", "aromatic-onion", "aromatic-ginger",
]);

/** Kinds where a mix can't be balanced once it's made: no bigger batch after tasting, only starting that part again. */
const SET_ONCE_MIXED: Kind[] = ["baking", "pastry"];

export type Ruling = {
  /** `taste`: too much of a flavouring that would otherwise be a redo — the cook tastes, then `balance` decides. */
  verdict: Verdict | "unknown" | "taste";
  item: string;
  ratio: number | null;
  role: string | null;
  rescue?: { kind: "scale" | "add" | "none"; by?: number; adds: { item: string; amount: Amount }[]; say: string; when?: string };
  reason: string;
  sources: string[];
};

const unknown = (item: string, reason: string, r: number | null = null): Ruling =>
  ({ verdict: "unknown", item, ratio: r, role: null, reason, sources: [] });

/**
 * The verdict on a slip, decided in code (spec 2026-10-31): the amount the cook put in against the recipe's, through
 * the tightest role the ingredient fills and that role's bands for this kind of cooking. Unknown — so the coach asks,
 * or says to redo — whenever the amount isn't a number, can't be compared, or the ingredient isn't in the pack. A
 * provisional rescue, a batch over MAX_SCALE, or a part of an egg other than a half is a redo.
 */
export function rule(
  item: string, said: Amount | null, recipe: CoachRecipe, kind: Kind, pack: Pack = PACK,
  /** The recipe lines already in (steps up to now): a bigger batch adds only these; later steps arrive scaled. */
  addedSoFar?: Set<string>,
): Ruling {
  const s = strict(item, said, recipe, kind, pack, addedSoFar);
  // Too much of a flavouring is never a blind redo: taste first (a sourced rescue, when there is one, still comes first).
  if (s.verdict === "redo" && s.ratio !== null && s.ratio > 1 && s.role && FLAVOUR.has(s.role)) {
    return { ...s, verdict: "taste", rescue: undefined, reason: `taste first (${s.reason})` };
  }
  return s;
}

/**
 * After a taste that came out too strong: balance it by making more around it — the batch scaled up so the flavouring
 * falls back to the recipe's level — or, in a bake or past a doubled batch, start that part again.
 */
export function balance(item: string, said: Amount | null, recipe: CoachRecipe, kind: Kind, pack: Pack = PACK, addedSoFar?: Set<string>): Ruling {
  const s = strict(item, said, recipe, kind, pack, addedSoFar);
  if (s.verdict === "unknown" || s.ratio === null || !s.role) return s;
  const base = { item, ratio: s.ratio, role: s.role, sources: s.sources };
  if (SET_ONCE_MIXED.includes(kind)) return { ...base, verdict: "redo", reason: "a bake can't be balanced once it's mixed" };
  const role = pack.roles.find((r) => r.id === s.role)!;
  const bands = role.bands[kind] ?? role.bands.default;
  const line = recipe.ingredients.find((i) => normaliseItem(i.item) === normaliseItem(item))!;
  const by = Math.ceil((s.ratio / fineCeiling(bands)) * 4) / 4;
  return scaled(base, by, line, recipe, pack, addedSoFar, { say: "make more around it" }, role.sources);
}

function strict(
  item: string, said: Amount | null, recipe: CoachRecipe, kind: Kind, pack: Pack, addedSoFar?: Set<string>,
): Ruling {
  const roles = rolesFor(item, pack);
  // The role with rules for this kind of cooking first (butter in a sauté is cooking fat, not cake butter), then the
  // tightest of them.
  const forKind = roles.filter((r) => r.bands[kind]);
  const pool = forKind.length ? forKind : roles;
  const role = pool.find((r) => r.tight) ?? pool[0];
  if (!role) return unknown(item, "not in the pack");
  const line = recipe.ingredients.find((i) => normaliseItem(i.item) === normaliseItem(item));
  const recipeAmount = line ? parseAmount(line.amount) : null;
  if (!said || !recipeAmount) return unknown(item, "no amount to compare");
  const r = ratioOf(said, recipeAmount);
  if (r === null) return unknown(item, "the amounts can't be compared", null);
  const bands = role.bands[kind] ?? role.bands.default;
  const band = bands.find((b) => r < b.below) ?? bands[bands.length - 1];
  const base = { item, ratio: r, role: role.id, sources: role.sources };
  if (band.verdict !== "fixable") return { ...base, verdict: band.verdict, reason: `${band.verdict} for ${role.id}` };
  if (band.provisional) return { ...base, verdict: "redo", reason: "the fixable range isn't sourced well enough to offer a rescue" };
  const rescue = role.rescues.find((x) => x.id === band.rescue);
  if (!rescue || rescue.provisional) return { ...base, verdict: "redo", reason: "no sourced rescue" };
  // A rescue for yeast dough is no rescue for a recipe with no yeast (its `when` is a condition, not just words). Only
  // when every case it names is about the rise: "the pot has room; for a dough, before the rise" still serves a stew.
  const hasYeast = recipe.ingredients.some((i) => /yeast/i.test(i.item) || rolesFor(i.item, pack).some((q) => q.id === "yeast"));
  const cases = (rescue.when ?? "").split(";").map((c) => c.trim()).filter(Boolean);
  if (cases.length && cases.every((c) => /\b(yeast|rise|proof)/i.test(c)) && !hasYeast) {
    return { ...base, verdict: "redo", reason: "the rescue is for yeast dough; this recipe has none" };
  }
  // Said aloud, the condition keeps only the cases that fit this dish: a stew isn't told about dough or batter.
  const fits = cases.filter((c) => !(/\b(yeast|rise|proof)/i.test(c) && !hasYeast) && !(/\b(dough|batter)/i.test(c) && !SET_ONCE_MIXED.includes(kind)));
  const said_ = { say: rescue.say, when: fits.length ? fits.join("; ") : undefined };

  if (rescue.kind === "scale") {
    return scaled(base, Math.ceil((r / fineCeiling(bands)) * 4) / 4, line!, recipe, pack, addedSoFar, said_, rescue.sources);
  }

  if (rescue.kind === "add" && rescue.add) {
    const { role: addRole, per = 1 } = rescue.add;
    // A rescue that names its own amount ("about ¼ cup water") adds exactly that, never a scaled recipe quantity.
    const fixed = rescue.add.amount && PLAIN.test(rescue.add.amount.trim()) ? parseAmount(rescue.add.amount) : null;
    // An amount that isn't a plain quantity — "per cup of excess liquid", "slurried in…", "served with it" — needs
    // more than arithmetic to turn into a number, so the technique is said with no number rather than a wrong one.
    if (rescue.add.amount && (!fixed || rescue.add.per !== undefined)) {
      return { ...base, verdict: "fixable", reason: `${rescue.id} (amount per unit of excess: technique only)`, sources: rescue.sources,
        rescue: { kind: "add", adds: [], ...said_ } };
    }
    if (addRole === role.id) {
      // Not enough of it: put in what's missing.
      const missing = fixed ?? scaleAmount(recipeAmount, Math.max(0, 1 - r));
      return { ...base, verdict: "fixable", reason: "add what's missing", sources: rescue.sources,
        rescue: { kind: "add", adds: [{ item: line!.item.split(",")[0].trim(), amount: missing }], ...said_ } };
    }
    const other = recipe.ingredients.find((i) => rolesFor(i.item, pack).some((q) => q.id === addRole));
    const otherAmount = other ? parseAmount(other.amount) : null;
    const adds = other && (fixed || otherAmount)
      ? [{ item: other.item.split(",")[0].trim(), amount: fixed ?? scaleAmount(otherAmount!, per * (r - 1)) }] : [];
    return { ...base, verdict: "fixable", reason: `balance with ${addRole}`, sources: rescue.sources, rescue: { kind: "add", adds, ...said_ } };
  }

  return { ...base, verdict: "fixable", reason: rescue.id, sources: rescue.sources, rescue: { kind: "none", adds: [], ...said_ } };
}

type Base = { item: string; ratio: number; role: string; sources: string[] };

/** A bigger batch by `by`: what to add of every recipe line already in, or a redo when one pan, a readable amount or a
 *  whole egg can't do it. */
function scaled(
  base: Base, by: number, line: CoachRecipe["ingredients"][number], recipe: CoachRecipe, pack: Pack,
  addedSoFar: Set<string> | undefined, said_: { say: string; when?: string }, sources: string[],
): Ruling {
  if (by > MAX_SCALE) return { ...base, verdict: "redo", reason: "would need a bigger batch than one pan" };
  const inSoFar = recipe.ingredients.filter((i) => i !== line && (!addedSoFar || addedSoFar.has(i.item)));
  // An amount that can't be read can't be scaled: the batch would come out of proportion — a redo.
  const unreadable = inSoFar.find((i) => i.amount.trim() && !parseAmount(i.amount) && !/taste|needed|serv|optional|garnish/i.test(`${i.amount} ${i.item}`));
  if (unreadable) return { ...base, verdict: "redo", reason: `can't scale ${unreadable.item} (${unreadable.amount})` };
  const adds = inSoFar
    .map((i) => ({ item: i.item.split(",")[0].trim(), amount: parseAmount(i.amount), roles: rolesFor(i.item, pack) }))
    .filter((x): x is { item: string; amount: Amount; roles: Role[] } => !!x.amount && x.amount.value > 0)
    .map((x) => ({ item: x.item, amount: scaleAmount(x.amount, by - 1), egg: x.roles.some((q) => q.id === "egg" || q.id.startsWith("egg-")) }));
  if (adds.some((a) => a.egg && !Number.isInteger(a.amount.value * 2))) {
    return { ...base, verdict: "redo", reason: "would need part of an egg" };
  }
  return { ...base, verdict: "fixable", reason: `scale ${by}×`, sources,
    rescue: { kind: "scale", by, adds: adds.map(({ item: i, amount }) => ({ item: i, amount })), ...said_ } };
}

/** Where "fine" ends above the recipe's own amount: the `below` of the fine band that holds a ratio of 1. */
function fineCeiling(bands: Band[]): number {
  const at1 = bands.find((b) => 1 < b.below);
  return at1 && at1.verdict === "fine" && Number.isFinite(at1.below) ? at1.below : 1;
}
