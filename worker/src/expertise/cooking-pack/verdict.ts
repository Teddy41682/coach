import type { CoachRecipe } from "../pack";
import { parseAmount, ratio as ratioOf, scaleAmount, type Amount } from "../amount";
import { PACK } from "./index";
import { normaliseItem, rolesFor } from "./lookup";
import type { Band, Kind, Pack, Role, Verdict } from "./types";

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
export function rule(item: string, said: Amount | null, recipe: CoachRecipe, kind: Kind, pack: Pack = PACK): Ruling {
  const roles = rolesFor(item, pack);
  const role = roles.find((r) => r.tight) ?? roles[0];
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
  const rescue = role.rescues.find((x) => x.id === band.rescue);
  if (!rescue || rescue.provisional) return { ...base, verdict: "redo", reason: "no sourced rescue" };
  const said_ = { say: rescue.say, when: rescue.when };

  if (rescue.kind === "scale") {
    const by = Math.ceil((r / fineCeiling(bands)) * 4) / 4;
    if (by > MAX_SCALE) return { ...base, verdict: "redo", reason: "would need a bigger batch than one pan" };
    const adds = recipe.ingredients.filter((i) => i !== line)
      .map((i) => ({ item: i.item.split(",")[0].trim(), amount: parseAmount(i.amount), roles: rolesFor(i.item, pack) }))
      .filter((x): x is { item: string; amount: Amount; roles: Role[] } => !!x.amount)
      .map((x) => ({ item: x.item, amount: scaleAmount(x.amount, by - 1), egg: x.roles.some((q) => q.id === "egg") }));
    if (adds.some((a) => a.egg && !Number.isInteger(a.amount.value * 2))) {
      return { ...base, verdict: "redo", reason: "would need part of an egg" };
    }
    return { ...base, verdict: "fixable", reason: `scale ${by}×`, sources: rescue.sources,
      rescue: { kind: "scale", by, adds: adds.map(({ item: i, amount }) => ({ item: i, amount })), ...said_ } };
  }

  if (rescue.kind === "add" && rescue.add) {
    const { role: addRole, per = 1 } = rescue.add;
    if (addRole === role.id) {
      // Not enough of it: put in what's missing.
      const missing = scaleAmount(recipeAmount, Math.max(0, 1 - r));
      return { ...base, verdict: "fixable", reason: "add what's missing", sources: rescue.sources,
        rescue: { kind: "add", adds: [{ item: line!.item.split(",")[0].trim(), amount: missing }], ...said_ } };
    }
    const other = recipe.ingredients.find((i) => rolesFor(i.item, pack).some((q) => q.id === addRole));
    const otherAmount = other ? parseAmount(other.amount) : null;
    const adds = other && otherAmount ? [{ item: other.item.split(",")[0].trim(), amount: scaleAmount(otherAmount, per * (r - 1)) }] : [];
    return { ...base, verdict: "fixable", reason: `balance with ${addRole}`, sources: rescue.sources, rescue: { kind: "add", adds, ...said_ } };
  }

  return { ...base, verdict: "fixable", reason: rescue.id, sources: rescue.sources, rescue: { kind: "none", adds: [], ...said_ } };
}

/** Where "fine" ends above the recipe's own amount: the `below` of the fine band that holds a ratio of 1. */
function fineCeiling(bands: Band[]): number {
  const at1 = bands.find((b) => 1 < b.below);
  return at1 && at1.verdict === "fine" && Number.isFinite(at1.below) ? at1.below : 1;
}
