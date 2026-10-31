import type { CoachRecipe } from "../pack";
import type { StepPlan } from "../../link";
import { parseAmount, toBase, type Amount } from "../amount";
import { PACK } from "./index";
import { normaliseItem, rolesFor } from "./lookup";
import type { Kind, Pack } from "./types";

/** A measure in a step that a small slip can ruin: the coach warns before it and confirms after it. */
export type Risky = { item: string; amount: Amount; roles: string[] };

/** Small enough that a slip is easy and matters: up to 2 tbsp (by volume), 30 g, or a pinch. */
const SMALL_ML = 2 * 14.79, SMALL_G = 30;

/**
 * The kind of cooking, from the recipe's own words — in code, so the same recipe always gets the same tolerance
 * bands. First match wins, most specific first; anything else is "other" (the default bands).
 */
export function kindOf(recipe: CoachRecipe): Kind {
  const text = `${recipe.title} ${recipe.steps.join(" ")} ${recipe.ingredients.map((i) => i.item).join(" ")}`.toLowerCase();
  const any = (...w: string[]) => w.some((x) => new RegExp(`\\b${x}`).test(text));
  if (any("pastry", "pie crust", "puff", "croissant", "laminat")) return "pastry";
  if (any("bake", "oven", "°f", "°c", "loaf", "muffin", "cupcake", "cake", "cookie", "boule", "dough")) return "baking";
  if (any("braise", "simmer", "stew", "slow cook", "pressure cook")) return "braise";
  if (any("rice", "quinoa", "risotto", "oats", "couscous")) return "grains";
  if (any("roast", "air fr")) return "roast";
  if (any("omelet", "scrambl", "fried egg", "poach", "frittata")) return "eggs";
  // The cooking method before the sauce it ends in: "sear in a hot pan, toss with the sauce" is a sauté.
  if (any("saut", "sear", "stir-fry", "stir fry", "pan", "fry")) return "saute";
  if (any("sauce", "gravy", "dressing", "vinaigrette", "curry")) return "sauce";
  return "other";
}

/**
 * Each step with its risky measures, built in code from the pack: an ingredient the step uses whose amount parses,
 * which fills a tight role, and which is small. An unreadable amount or an unknown ingredient is never risky — the
 * coach can't check what it can't measure.
 */
export function buildBrief(recipe: CoachRecipe, steps: StepPlan[], pack: Pack = PACK): (StepPlan & { risky: Risky[] })[] {
  return steps.map((step) => ({
    ...step,
    risky: step.ingredients.flatMap((name): Risky[] => {
      const line = recipe.ingredients.find((i) => normaliseItem(i.item) === normaliseItem(name) || i.item === name);
      const amount = line ? parseAmount(line.amount) : null;
      const roles = rolesFor(name, pack);
      if (!line || !amount || !roles.some((r) => r.tight)) return [];
      const b = toBase(amount);
      const small = b.dim === "pinch" || (b.dim === "volume" && b.value <= SMALL_ML + 0.01) || (b.dim === "mass" && b.value <= SMALL_G);
      return small ? [{ item: line.item.split(",")[0].trim(), amount, roles: roles.map((r) => r.id) }] : [];
    }),
  }));
}
