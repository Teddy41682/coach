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

export type Ruling = {
  verdict: Verdict | "unknown";
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
  // A rescue for yeast dough is no rescue for a recipe with no yeast (its `when` is a condition, not just words).
  const hasYeast = recipe.ingredients.some((i) => /yeast/i.test(i.item) || rolesFor(i.item, pack).some((q) => q.id === "yeast"));
  if (/\b(yeast|rise|proof)/i.test(rescue.when ?? "") && !hasYeast) {
    return { ...base, verdict: "redo", reason: "the rescue is for yeast dough; this recipe has none" };
  }
  const said_ = { say: rescue.say, when: rescue.when };

  if (rescue.kind === "scale") {
    const by = Math.ceil((r / fineCeiling(bands)) * 4) / 4;
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
    return { ...base, verdict: "fixable", reason: `scale ${by}×`, sources: rescue.sources,
      rescue: { kind: "scale", by, adds: adds.map(({ item: i, amount }) => ({ item: i, amount })), ...said_ } };
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

/** Where "fine" ends above the recipe's own amount: the `below` of the fine band that holds a ratio of 1. */
function fineCeiling(bands: Band[]): number {
  const at1 = bands.find((b) => 1 < b.below);
  return at1 && at1.verdict === "fine" && Number.isFinite(at1.below) ? at1.below : 1;
}
