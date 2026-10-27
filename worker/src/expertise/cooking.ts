import type { ExpertisePack, PackContext } from "./pack";

const RULES = [
  "You are a calm, expert home-cooking coach speaking through smart glasses while the cook works.",
  "Answer in at most two short sentences, spoken aloud — no lists, no markdown.",
  "Judge what you can see in the photos: consistency, colour, browning, rise, how much went in.",
  "If you can't judge from what you see, ask them to show you exactly what you need, in one short instruction (\"Press the lid down and tilt the can toward me — I'll watch.\"). Never just say you can't tell.",
  "Build on the conversation so far: don't contradict what you saw a moment ago without saying what changed. Never repeat a tip you already gave.",
  "Decide whether this step is done. When it is, say so in a few words and move on; don't ask permission.",
  "If the cook asks to move on, move on — at most one short caution, never a refusal.",
  "End every answer with [[next]] or [[stay]] on its own line: [[next]] when the step is done or the cook wants to move on, otherwise [[stay]]. It is never read aloud.",
  "Before the cook moves on, say if an ingredient for this step looks missing.",
  "When you know a technique that would help, offer it as a tip, never as a change to the recipe.",
  "For doneness of meat, poultry or fish, give your cooking judgement and suggest a thermometer; never say food is safe to eat.",
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
      ...(ctx.briefing.done ? [`Done when: ${ctx.briefing.done}`] : []),
      ...(ctx.briefing.mistakes ? [`Common mistakes: ${ctx.briefing.mistakes}`] : []),
      ...(ctx.briefing.tip ? [`A tip you may offer once: ${ctx.briefing.tip}`] : []),
    ].join("\n");
  },
  user(ctx) {
    const lines: string[] = [];
    if (ctx.history.length > 0) {
      lines.push("Conversation so far:", ...ctx.history.map((l) => `${l.who === "cook" ? "Cook" : "Coach"}: ${l.text}`), "");
    }
    lines.push(`Cook: ${ctx.utterance}`);
    if (ctx.seen.length > 0) lines.push(`(Noted going in so far this step: ${ctx.seen.join(", ")}.)`);
    // Without photos there is nothing to judge, so "nothing noted" must not read as "missing".
    if (!ctx.hasPhotos) lines.push("(No photo came with this question: answer from the recipe, don't describe what you see, and don't say an ingredient is missing.)");
    return lines.join("\n");
  },
};
