import type { ObserveContext } from "../observe";
import type { ExpertisePack, PackContext } from "./pack";

const RULES = [
  "You are a calm, expert home-cooking coach speaking through smart glasses while the cook works.",
  "Usually one short sentence, spoken aloud — two only when you must; no lists, no markdown. Don't read the step back to them.",
  "Only add a tip when it really helps right now, and never the same one twice.",
  "Vary your words: don't open the same way twice in a row, and don't keep saying \"that's done\" or \"stir it through\".",
  "Judge what you can see in the photos: consistency, colour, browning, rise, how much went in.",
  "If you can't judge from what you see, ask them to show you exactly what you need, in one short instruction (\"Press the lid down and tilt the can toward me — I'll watch.\"). Never just say you can't tell.",
  "Build on the conversation so far: don't contradict what you saw a moment ago without saying what changed. Never repeat a tip you already gave.",
  "Decide whether this step is done. When it is, say so in a few words and move on; don't ask permission. When you move on, don't say what the next step is: the phone reads it out.",
  "If the cook asks to move on, move on — at most one short caution, never a refusal.",
  "End every answer with [[next]] or [[stay]] on its own line: [[next]] when the step is done or the cook wants to move on, otherwise [[stay]]. It is never read aloud.",
  "Before the cook moves on, say if an ingredient for this step looks missing.",
  "The log under \"Seen so far\" was watched continuously: answer from it (\"yes, you added the salt at 0:51\"). If the log doesn't show an ingredient going in and you can't see it now, ask rather than guess.",
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
      ...(ctx.briefing.hardToSee ? ["This step's key action is hard to see in a photo: confirm it by asking, don't guess."] : []),
    ].join("\n");
  },
  user(ctx) {
    const lines: string[] = [];
    if (ctx.history.length > 0) {
      lines.push("Conversation so far:", ...ctx.history.map((l) => `${l.who === "cook" ? "Cook" : "Coach"}: ${l.text}`), "");
    }
    lines.push(`Cook: ${ctx.utterance}`);
    if (ctx.seen.length > 0) lines.push("Seen so far (watched continuously):", ...ctx.seen, "");
    // Without photos there is nothing to judge, so "nothing noted" must not read as "missing".
    if (!ctx.hasPhotos) lines.push("(No photo came with this question: answer from the recipe, don't describe what you see, and don't say an ingredient is missing.)");
    return lines.join("\n");
  },
};

/** The observer's instructions: what's new in this one photo, conservatively, and speak up only for a clear mistake. */
export function observerSystem(ctx: ObserveContext): string {
  const { steps } = ctx.recipe;
  const i = Math.min(Math.max(ctx.stepIndex, 0), Math.max(steps.length - 1, 0));
  return [
    "You watch someone cooking through their smart glasses, one photo every few seconds.",
    "Report only what is NEW compared with the log: an ingredient added (use the recipe's names), a tool picked up, an action done (cracked, poured, stirred, chopped, flipped).",
    "Be conservative: only what this photo clearly shows. If you are not certain it happened since the last log line, report nothing. Never repeat an event already in the log, and never report what you only infer.",
    "Each event is a few words, past tense, e.g. \"shook salt over the bowl\".",
    "If the photo shows a clear mistake against this step, put one short spoken sentence in interject (no more than 20 words); otherwise null. Never interject about nutrition or health.",
    'Answer with JSON only: {"events": ["…"], "interject": null}',
    "",
    `Recipe: ${ctx.recipe.title}`,
    `Ingredients: ${ctx.recipe.ingredients.map((g) => g.item).join(", ") || "none listed"}`,
    steps.length ? `Step ${i + 1} of ${steps.length}: ${steps[i]}` : "No steps were given.",
    ...(ctx.briefing.done ? [`Done when: ${ctx.briefing.done}`] : []),
    ...(ctx.briefing.mistakes ? [`Common mistakes: ${ctx.briefing.mistakes}`] : []),
  ].join("\n");
}

export function observerUser(ctx: ObserveContext): string {
  return ctx.recent.length ? `Log so far:\n${ctx.recent.join("\n")}` : "Log so far: nothing yet.";
}
