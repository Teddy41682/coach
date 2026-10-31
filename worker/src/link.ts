import type { CoachRecipe } from "./expertise/pack";
import type { ModelConnector } from "./model/connector";

const SYSTEM = [
  "You prepare a cooking coach to guide someone through a recipe, step by step.",
  "For each step: the ingredients that go in at that step (names exactly as given; an ingredient may be in more than one step, or none);",
  "what 'done' looks like for that step, as something you could judge by looking (done);",
  "the common mistakes at that step (mistakes); one short expert tip that isn't already in the recipe (tip);",
  "and your method for that step: exactly how you, the chef, will coach it — the one technique you'll keep to all the way through (method), so your advice never contradicts itself.",
  "Each of done, mistakes, tip and method is one short sentence, spoken-style.",
  "hardToSee: true if the step's key action can't be judged from a photo (a pinch of salt, a splash of vanilla), otherwise false.",
  'Answer with JSON only, in this shape: {"steps": [{"ingredients": ["item"], "done": "…", "mistakes": "…", "tip": "…", "method": "…", "hardToSee": false}, …]} — one object per step, in step order.',
].join("\n");

/** What the coach knows about one step before the cook starts: what goes in, and how to judge it. */
export type StepPlan = {
  ingredients: string[]; done: string; mistakes: string; tip: string; method?: string; hardToSee: boolean;
  /** The step's small, tight measures (cooking-pack/brief.ts): warned before, confirmed after. */
  risky?: import("./expertise/cooking-pack/brief").Risky[];
};

const FIELD_MAX = 300;
const field = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, FIELD_MAX) : "");

/** Every ingredient on every step, no briefing: what the coach falls back to when planning fails, so cooking still works. */
function everything(recipe: CoachRecipe): StepPlan[] {
  return recipe.steps.map(() => ({ ingredients: recipe.ingredients.map((i) => i.item), done: "", mistakes: "", tip: "", method: "", hardToSee: false }));
}

/**
 * Plans the recipe when a session starts (Muse Spark, one call): which ingredients go in at each step — so the
 * coach can say "I didn't see the oregano" — and a briefing per step (what done looks like, the common mistakes,
 * one tip), so it judges against a checklist instead of improvising. Invented ingredients are dropped and
 * malformed fields are empty; any failure — an error, unparsable JSON, the wrong number of steps — falls back to
 * every ingredient on every step with empty briefings. Fallbacks are logged: a silent one hid a truncation bug once.
 */
export async function linkSteps(recipe: CoachRecipe, model: ModelConnector): Promise<StepPlan[]> {
  if (recipe.steps.length === 0) return [];
  const user = [
    `Recipe: ${recipe.title}`,
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
    return steps.map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const items = Array.isArray(o.ingredients) ? o.ingredients : [];
      return {
        ingredients: items.filter((x): x is string => typeof x === "string" && known.has(x)),
        done: field(o.done), mistakes: field(o.mistakes), tip: field(o.tip), method: field(o.method), hardToSee: o.hardToSee === true,
      };
    });
  } catch (error) {
    // The fallback keeps cooking working, but it must be visible: a silent fallback hid a truncation bug once.
    console.warn("linkSteps fell back:", error instanceof Error ? error.message : String(error));
    return everything(recipe);
  }
}
