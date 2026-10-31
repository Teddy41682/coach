import type { CoachRecipe } from "../pack";
import type { ModelConnector } from "../../model/connector";
import type { CoachEvent } from "../../sse";
import { parseAmount, ratio, scaleAmount, speakAmount, type Amount } from "../amount";
import { PACK } from "./index";
import { mentionedItem, normaliseItem } from "./lookup";
import type { Kind, Pack } from "./types";
import { rule, type Ruling } from "./verdict";

/**
 * A slip, handled the way the spec decides (2026-10-31): the model never invents a rescue. Code spots the slip in the
 * cook's words, asks for the amount when there isn't one (a fixed line, no model call), rules on it with the pack, and
 * hands the ruling to the model only to say it; if the model's line drops a number, the fixed line is said instead.
 */

const SLIP_WORDS = /\b(too much|too little|way more|extra|instead|double|doubled|twice|forgot|forgotten|left out|spilled|whole bottle|by mistake|accident|oops|oh no|messed up|way too)\b/;
const FORGOT = /\b(forgot|forgotten|left out|didn't put|didn't add|never added)\b/;

/** What the cook calls it, aloud: "vanilla extract", not "pure vanilla extract". */
const spoken = (item: string) => normaliseItem(item) || item;

export const ASK = (item: string) => `How much ${spoken(item)} went in?`;
export const SAFE = (item: string) => `I can't be sure that'll come out right — let's redo that part with a fresh measure of ${spoken(item)}.`;
const ASKED = /How much (.+) went in\?/;

/** The newest thing the coach said, from the timeline ("0:41 coach: …"). */
function lastCoachLine(timeline: string[]): string {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const m = /^\d+:\d+ coach: (.*)$/.exec(timeline[i]);
    if (m) return m[1];
  }
  return "";
}

export type Slip = { item: string; said: Amount | null };

/**
 * A slip in the cook's words, or null: the answer to the coach's own "how much … went in?"; or a recipe ingredient
 * named with a slip word ("too much", "forgot", "instead"…) or with an amount off the recipe's by more than a fifth.
 * Naming an ingredient alone ("is the vanilla in this step?") is not a slip.
 */
export function detectSlip(utterance: string, timeline: string[], recipe: CoachRecipe, pack: Pack = PACK): Slip | null {
  const asked = ASKED.exec(lastCoachLine(timeline));
  if (asked) {
    const item = mentionedItem(asked[1], recipe, pack)?.item;
    if (item) return { item, said: parseAmount(utterance) };
  }
  const named = mentionedItem(utterance, recipe, pack);
  if (!named) return null;
  const lower = utterance.toLowerCase();
  if (FORGOT.test(lower)) return { item: named.item, said: { value: 0, unit: named.recipeAmount?.unit ?? "each" } };
  const said = parseAmount(utterance);
  const off = said && named.recipeAmount ? Math.abs((ratio(said, named.recipeAmount) ?? 1) - 1) > 0.2 : false;
  if (!SLIP_WORDS.test(lower) && !off) return null;
  return { item: named.item, said };
}

const list = (r: Ruling) => (r.rescue?.adds ?? []).map((a) => `${speakAmount(a.amount)} ${a.item}`).join(", ");

/** The fixed line for a ruling, with code's numbers — what is said when the model's line can't be trusted. */
export function template(r: Ruling): string {
  const item = spoken(r.item);
  const when = r.rescue?.when ? ` — ${r.rescue.when}` : "";
  if (r.verdict === "fine") return `That's a little off on the ${item}, but well within range — carry on.`;
  if (r.verdict === "redo" || r.verdict === "unknown") return SAFE(r.item);
  const rescue = r.rescue!;
  if (rescue.kind === "scale") return `We can save it — make the batch ${rescue.by}× bigger: add ${list(r)}${when}.`;
  if (rescue.kind === "add" && rescue.adds.length) return `We can fix that — add ${list(r)}${when}.`;
  return `${rescue.say}${when}.`;
}

/** Every quantity code computed is in the line, exactly as `speakAmount` says it. */
export function keptNumbers(line: string, r: Ruling): boolean {
  return (r.rescue?.adds ?? []).every((a) => line.includes(speakAmount(a.amount)));
}

/** The recipe at a bigger batch: every readable amount scaled and said as a cook would. */
export function scaleRecipe(recipe: CoachRecipe, by: number): CoachRecipe {
  if (by === 1) return recipe;
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((i) => {
      const a = parseAmount(i.amount);
      return a ? { ...i, amount: speakAmount(scaleAmount(a, by)) } : i;
    }),
  };
}

const PHRASE = [
  "You are Serena, a warm, calm cooking coach speaking into the cook's ear through smart glasses.",
  "Say the ruling below to the cook in one or two short spoken sentences, in your own words.",
  "Keep every quantity exactly as written. Add no other advice, no new ingredients, no new numbers.",
].join("\n");

export type SlipContext = { recipe: CoachRecipe; kind: Kind; timeline: string[]; model: ModelConnector; pack?: Pack };
export type VerdictEvent = Extract<CoachEvent, { type: "verdict" }>;

/** The events one slip turn streams: maybe a verdict, the line to say, then stay and done. */
export async function* slipEvents(slip: Slip, ctx: SlipContext): AsyncIterable<CoachEvent | VerdictEvent> {
  const say = (text: string): (CoachEvent | VerdictEvent)[] => [{ type: "text", text }, { type: "action", action: "stay" }, { type: "done" }];
  if (!slip.said) {
    const alreadyAsked = lastCoachLine(ctx.timeline) === ASK(slip.item);
    yield* say(alreadyAsked ? SAFE(slip.item) : ASK(slip.item));
    return;
  }
  const r = rule(slip.item, slip.said, ctx.recipe, ctx.kind, ctx.pack ?? PACK);
  yield { type: "verdict", verdict: r.verdict, item: r.item, ratio: r.ratio, by: r.rescue?.by };
  if (r.verdict === "unknown") { yield* say(SAFE(slip.item)); return; }
  const fixed = template(r);
  let line = "";
  try {
    for await (const piece of ctx.model.stream({ system: PHRASE, user: `Ruling: ${fixed}\nWhy: ${r.reason}`, images: [] }, new AbortController().signal)) line += piece;
  } catch {
    line = "";
  }
  line = line.trim();
  yield* say(line && keptNumbers(line, r) ? line : fixed);
}
