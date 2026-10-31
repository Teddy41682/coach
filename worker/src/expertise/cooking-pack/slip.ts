import type { CoachRecipe } from "../pack";
import type { ModelConnector } from "../../model/connector";
import type { CoachEvent } from "../../sse";
import { parseAmount, ratio, scaleAmount, speakAmount, type Amount } from "../amount";
import { PACK } from "./index";
import { mentionedItem, mentionedItems, normaliseItem, saidText, type Mention } from "./lookup";
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
/** The answer to the phone's own confirm question with no number and nothing wrong said: carry on. */
export const CARRY_ON = "Okay — carry on.";
export const SPOT_ON = "Spot on — carry on.";
/** What the coach says when the eyes think too much went in: still a question, never a number. */
export const SEEN = (item: string) => `That looks like a lot of ${spoken(item)} — how much ${spoken(item)} went in?`;
export const SAFE = (item: string) => `I can't be sure that'll come out right — let's redo that part with a fresh measure of ${spoken(item)}.`;
const ASKED = /how much (.+) went in\?/i;

/** The newest thing the coach said, from the timeline ("0:41 coach: …"). */
function lastCoachLine(timeline: string[]): string {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const m = /^\d+:\d+ coach: (.*)$/.exec(timeline[i]);
    if (m) return m[1];
  }
  return "";
}

export type Slip = { item: string; said: Amount | null };

/** A question about the recipe ("can I use honey instead?", "how much vanilla goes in?") is never a slip. */
const QUESTION = /^(can|could|should|shall|do|does|did|is|are|was|will|would|what|how|when|which|why|any)\b|\?\s*$|\bhow (much|many)\b/;
const TOO_LITTLE = /\b(only|not enough|too little|short on|half the|half of the|less than)\b/;

/** The amount said beside a mention: in the words since the previous mention, else in the few words after it. */
function amountBeside(said: string, mentions: Mention[], k: number): Amount | null {
  const m = mentions[k];
  const from = k > 0 ? mentions[k - 1].at + mentions[k - 1].phrase.length : 0;
  const before = parseAmount(said.slice(from, m.at).split(" ").slice(-6).join(" "));
  if (before) return before;
  const to = k + 1 < mentions.length ? mentions[k + 1].at : said.length;
  return parseAmount(said.slice(m.at + m.phrase.length, to).split(" ").slice(0, 6).join(" "));
}

/**
 * A slip in the cook's words, or null: the answer to the coach's own "how much … went in?"; or, in a statement (never
 * a question), a recipe ingredient whose amount beside it is off the recipe's by more than a fifth, one said to be
 * forgotten, one there's too little of, or one named with a slip word ("too much", "instead", "by mistake"…). Naming
 * an ingredient alone, or two right amounts, is not a slip.
 */
export function detectSlip(utterance: string, timeline: string[], recipe: CoachRecipe, pack: Pack = PACK): Slip | null {
  const asked = ASKED.exec(lastCoachLine(timeline));
  if (asked) {
    const item = mentionedItem(asked[1], recipe, pack)?.item;
    if (item) return { item, said: parseAmount(utterance) };
  }
  const lower = utterance.toLowerCase().trim();
  if (QUESTION.test(lower)) return null;
  const said = saidText(utterance);
  const mentions = mentionedItems(utterance, recipe, pack);
  if (!mentions.length) return null;
  const amounts = mentions.map((_, k) => amountBeside(said, mentions, k));
  if (FORGOT.test(lower) && !/\bhow (much|many)\b/.test(lower)) {
    const after = said.search(FORGOT);
    const m = mentions.find((x) => x.at > after) ?? mentions[0];
    return { item: m.item, said: { value: 0, unit: m.recipeAmount?.unit ?? "each" } };
  }
  for (const [k, m] of mentions.entries()) {
    const a = amounts[k];
    const r = a && m.recipeAmount ? ratio(a, m.recipeAmount) : null;
    if (r !== null && Math.abs(r - 1) > 0.2) return { item: m.item, said: a };
  }
  const longest = mentions.reduce((b, m) => (m.phrase.length > b.phrase.length ? m : b));
  const k = mentions.indexOf(longest);
  if (TOO_LITTLE.test(lower)) return { item: longest.item, said: amounts[k] };
  if (SLIP_WORDS.test(lower)) return { item: longest.item, said: amounts[k] };
  return null;
}

const list = (r: Ruling) => (r.rescue?.adds ?? []).map((a) => `${speakAmount(a.amount)} ${a.item}`).join(", ");

/** The fixed line for a ruling, with code's numbers — what is said when the model's line can't be trusted. */
export function template(r: Ruling): string {
  const item = spoken(r.item);
  const when = r.rescue?.when ? ` — ${r.rescue.when}` : "";
  if (r.verdict === "fine" && r.ratio !== null && Math.abs(r.ratio - 1) <= 0.05) return SPOT_ON;
  if (r.verdict === "fine") return `That's a little off on the ${item}, but well within range — carry on.`;
  if (r.verdict === "redo" || r.verdict === "unknown") return SAFE(r.item);
  const rescue = r.rescue!;
  if (rescue.kind === "scale" && !rescue.adds.length) {
    return `We can save it — we'll make the batch ${rescue.by}× bigger, and I'll give you every amount from here scaled up${when}.`;
  }
  if (rescue.kind === "scale") return `We can save it — make the batch ${rescue.by}× bigger: add ${list(r)} now, and I'll give you every amount from here scaled up${when}.`;
  if (rescue.kind === "add" && rescue.adds.length) return `We can fix that — add ${list(r)}${when}.`;
  return `${rescue.say}${when}.`;
}

const NUMBER = /\d+(?:[./]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|third|double|twice|triple|dozen)\b/gi;
const numbersIn = (s: string) => new Set((s.match(NUMBER) ?? []).map((n) => n.toLowerCase()));

/**
 * The model's line may be said only if every quantity code computed is in it, exactly as `speakAmount` says it, and
 * it has no number of its own — not "double the oven time", not "2 more tablespoons" on a fine verdict (the final
 * review: a fine verdict passed any number before).
 */
export function keptNumbers(line: string, r: Ruling): boolean {
  const allowed = numbersIn(template(r));
  if ([...numbersIn(line)].some((n) => !allowed.has(n))) return false;
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

export type SlipContext = {
  recipe: CoachRecipe; kind: Kind; timeline: string[]; model: ModelConnector; pack?: Pack;
  /** Recipe lines already in (steps up to now): a bigger batch adds only these. */
  addedSoFar?: Set<string>;
  /** The cook's words this turn. */
  utterance?: string;
};

const AFFIRM = /\b(yes|yep|yeah|yup|right|correct|exactly|what it said|the right amount|as (the )?recipe|all of it)\b/;

/** The cook's line before the newest coach line — what they said that led to the question. */
function cookBeforeAsk(timeline: string[]): string {
  for (let i = timeline.length - 1, seenCoach = false; i >= 0; i--) {
    const m = /^\d+:\d+ (cook|coach): (.*)$/.exec(timeline[i]);
    if (!m) continue;
    if (m[1] === "coach") seenCoach = true;
    else if (seenCoach) return m[2].toLowerCase();
  }
  return "";
}
export type VerdictEvent = Extract<CoachEvent, { type: "verdict" }>;

/** The events one slip turn streams: maybe a verdict, the line to say, then stay and done. */
export async function* slipEvents(slip: Slip, ctx: SlipContext): AsyncIterable<CoachEvent | VerdictEvent> {
  const say = (text: string): (CoachEvent | VerdictEvent)[] => [{ type: "text", text }, { type: "action", action: "stay" }, { type: "done" }];
  if (!slip.said) {
    const last = lastCoachLine(ctx.timeline);
    if (!ASKED.test(last)) { yield* say(ASK(slip.item)); return; }
    // Asked already and no number. If nothing wrong was ever said — the phone's own confirm question — a "yep" means
    // carry on; after a slip ("way too much", "that looks like a lot"), the safe answer.
    const signalled = /^that looks like a lot/i.test(last) || SLIP_WORDS.test(cookBeforeAsk(ctx.timeline))
      || TOO_LITTLE.test(cookBeforeAsk(ctx.timeline));
    const latest = (ctx.utterance ?? /^\d+:\d+ cook: (.*)$/.exec(ctx.timeline[ctx.timeline.length - 1] ?? "")?.[1] ?? "").toLowerCase();
    yield* say(!signalled && (AFFIRM.test(latest) || !/(a lot|too much|not sure|no idea|don'?t know)/.test(latest)) ? CARRY_ON : SAFE(slip.item));
    return;
  }
  const r = rule(slip.item, slip.said, ctx.recipe, ctx.kind, ctx.pack ?? PACK, ctx.addedSoFar);
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
