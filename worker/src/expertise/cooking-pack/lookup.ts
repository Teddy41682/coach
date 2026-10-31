import type { CoachRecipe } from "../pack";
import { parseAmount, type Amount } from "../amount";
import { PACK } from "./index";
import type { Pack, Role } from "./types";

/** Words that describe an ingredient's state, size or brand, not what it is. */
const DESCRIPTORS = new Set([
  "pure", "unsalted", "salted", "large", "small", "medium", "fresh", "chopped", "minced", "diced", "sliced", "sifted",
  "softened", "melted", "divided", "packed", "finely", "roughly", "boneless", "skinless", "light", "low", "sodium",
  "organic", "raw", "cold", "warm", "room", "temperature", "optional", "plus", "more", "for", "serving", "to", "taste",
]);
const UNIT_WORDS = /^(tsp|tbsp|tbs|teaspoons?|tablespoons?|cups?|ml|l|g|kg|oz|lbs?|pounds?|grams?|pinch(es)?|dash(es)?)$/;

/** "1 tsp pure vanilla extract" → "vanilla extract"; "Large Eggs (room temperature)" → "egg". */
export function normaliseItem(item: string): string {
  const words = item.toLowerCase().replace(/\(.*?\)/g, " ").split(",")[0]
    .replace(/[^a-z&\s-]/g, " ").split(/\s+/).filter(Boolean)
    .filter((w) => !DESCRIPTORS.has(w) && !UNIT_WORDS.test(w));
  if (!words.length) return "";
  const last = words[words.length - 1];
  words[words.length - 1] = last.length > 3 && last.endsWith("s") && !last.endsWith("ss") ? last.slice(0, -1) : last;
  return words.join(" ");
}

const has = (text: string, phrase: string) => new RegExp(`(^|\\s)${phrase.replace(/[-&]/g, "\\$&")}(\\s|$)`).test(text);

/** The roles an ingredient fills: its index entry, else the longest indexed phrase inside its name, else none. */
export function rolesFor(item: string, pack: Pack = PACK): Role[] {
  const name = normaliseItem(item);
  const key = pack.index[name] ? name
    : Object.keys(pack.index).filter((k) => has(name, k)).sort((a, b) => b.length - a.length)[0];
  const ids = key ? pack.index[key] : [];
  return ids.map((id) => pack.roles.find((r) => r.id === id)).filter((r): r is Role => !!r);
}

/**
 * The recipe ingredient the cook's words name — by its own name, a shorter form of it ("vanilla" for "pure vanilla
 * extract"), or a declared alias ("bicarbonate of soda" for "baking soda"). Never by another ingredient that merely
 * does the same job (almond extract is not vanilla). The longest match wins, so "baking powder" is never taken for
 * "baking soda". Null when no ingredient is named.
 */
export function mentionedItem(
  utterance: string, recipe: CoachRecipe, pack: Pack = PACK,
): { item: string; recipeAmount: Amount | null } | null {
  const said = ` ${utterance.toLowerCase().replace(/[^a-z&\s-]/g, " ").replace(/\s+/g, " ")} `;
  let best: { item: string; recipeAmount: Amount | null; length: number } | null = null;
  for (const ing of recipe.ingredients) {
    const name = normaliseItem(ing.item);
    const canonical = pack.aliases[name] ?? name;
    const words = new Set(name.split(" "));
    const names = new Set([name, canonical,
      ...Object.keys(pack.aliases).filter((a) => pack.aliases[a] === canonical),
      // A shorter form of its own name that the pack knows: "vanilla" for "vanilla extract".
      ...Object.keys(pack.index).filter((k) => k !== name && k.split(" ").every((w) => words.has(w))),
    ]);
    for (const n of names) {
      if (!n || !has(said.trim(), n) && !has(said.trim(), n.replace(/s$/, ""))) continue;
      if (!best || n.length > best.length) best = { item: ing.item.split(",")[0].trim(), recipeAmount: parseAmount(ing.amount), length: n.length };
    }
  }
  return best && { item: best.item, recipeAmount: best.recipeAmount };
}
