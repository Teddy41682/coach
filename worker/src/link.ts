import type { CoachRecipe } from "./expertise/pack";
import type { ModelConnector } from "./model/connector";

const SYSTEM = [
  "You split a recipe's ingredients across its steps.",
  'Answer with JSON only, in this shape: {"steps": [["item", ...], ...]} — one list per step, in step order.',
  "Use each ingredient's name exactly as given. An ingredient may appear in more than one step, or in none.",
].join("\n");

/** Every ingredient on every step: what the coach falls back to when linking fails, so cooking still works. */
function everything(recipe: CoachRecipe): string[][] {
  return recipe.steps.map(() => recipe.ingredients.map((i) => i.item));
}

/**
 * Which ingredients belong to each step, worked out by the model (Muse Spark) when a session starts. This is what
 * lets the coach say "I didn't see the oregano" before you move on. Anything the model invents is dropped; any
 * failure — an error, unparsable JSON, the wrong number of steps — falls back to every ingredient on every step.
 */
export async function linkSteps(recipe: CoachRecipe, model: ModelConnector): Promise<string[][]> {
  if (recipe.steps.length === 0) return [];
  const user = [
    `Ingredients: ${JSON.stringify(recipe.ingredients.map((i) => i.item))}`,
    ...recipe.steps.map((s, n) => `Step ${n + 1}: ${s}`),
  ].join("\n");
  try {
    let text = "";
    for await (const piece of model.stream({ system: SYSTEM, user, images: [] }, new AbortController().signal)) text += piece;
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const steps = (JSON.parse(json) as { steps?: unknown }).steps;
    if (!Array.isArray(steps) || steps.length !== recipe.steps.length) {
      console.warn("linkSteps fell back: wrong step count", Array.isArray(steps) ? steps.length : typeof steps, recipe.steps.length);
      return everything(recipe);
    }
    const known = new Set(recipe.ingredients.map((i) => i.item));
    return steps.map((s) => (Array.isArray(s) ? s.filter((x): x is string => typeof x === "string" && known.has(x)) : []));
  } catch (error) {
    // The fallback keeps cooking working, but it must be visible: a silent fallback hid a truncation bug once.
    console.warn("linkSteps fell back:", error instanceof Error ? error.message : String(error));
    return everything(recipe);
  }
}
