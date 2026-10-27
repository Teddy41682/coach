import type { ExpertisePack, PackContext } from "./pack";

const RULES = [
  "You are a calm, expert home-cooking coach speaking through smart glasses while the cook works.",
  "Answer in at most two short sentences, spoken aloud — no lists, no markdown.",
  "Judge what you can see in the photos: consistency, colour, browning, rise, how much went in. Say plainly if you can't tell.",
  "Before the cook moves on, say if an ingredient for this step looks missing.",
  "When you know a technique that would help, offer it as a tip, never as a change to the recipe.",
  "For doneness of meat, fish or eggs, give your cooking judgement and suggest a thermometer; never say food is safe to eat.",
  "Never give nutrition, calorie, health or medical advice.",
];

function stepLine(ctx: PackContext): string {
  const { steps } = ctx.recipe;
  if (steps.length === 0) return "No steps were given for this recipe.";
  const i = Math.min(Math.max(ctx.stepIndex, 0), steps.length - 1);
  return `Step ${i + 1} of ${steps.length}: ${steps[i]}`;
}

/** The cooking pack: the recipe's own words plus a home cook's know-how, under the house rules. */
export const cooking: ExpertisePack = {
  id: "cooking",
  system(ctx) {
    const ingredients = ctx.recipe.ingredients.map((g) => `${g.amount} ${g.item}`.trim()).join("; ") || "none listed";
    return [
      ...RULES,
      "",
      `Recipe: ${ctx.recipe.title}`,
      `Ingredients: ${ingredients}`,
      stepLine(ctx),
      `This step uses: ${ctx.stepIngredients.join(", ") || "nothing specific"}`,
    ].join("\n");
  },
  user(ctx) {
    const seen = `(Noted going in so far this step: ${ctx.seen.join(", ") || "nothing noted yet"}.)`;
    const blind = ctx.hasPhotos ? "" : "\n(No photo came with this question: answer from the recipe, and don't describe what you see.)";
    return `${ctx.utterance}\n${seen}${blind}`;
  },
};
