import type { CoachRecipe } from "../pack";
import type { ModelConnector } from "../../model/connector";
import type { CoachEvent } from "../../sse";
import { parseAmount, scaleAmount, speakAmount } from "../amount";
import { PACK } from "./index";
import { mentionedItem, normaliseItem, rolesFor } from "./lookup";
import type { Pack } from "./types";

/**
 * Substitutions and changes, answered from the pack (spec 2026-10-31): "I don't have buttermilk", "can I cut the
 * sugar?". The pack's entry and code's arithmetic are the answer; the model only says it, and only if the numbers
 * survive. A question the pack can't ground goes to the mind as before, told to give judgement as judgement.
 */
export type ChangeAsk = { item: string; ask: "substitute" | "less" | "more" };

const SUBSTITUTE = /\b(don'?t have|do not have|out of|ran out|run out|no more|instead of|swap|substitute|replace|use something else)\b/;
const LESS = /\b(less|cut|reduce|halve|lower|lighter|skip)\b/;
const MORE = /\b(more|double|extra|increase|add some)\b/;

export function detectChange(utterance: string, recipe: CoachRecipe, pack: Pack = PACK): ChangeAsk | null {
  const named = mentionedItem(utterance, recipe, pack);
  if (!named) return null;
  const lower = utterance.toLowerCase();
  const ask = SUBSTITUTE.test(lower) ? "substitute" : LESS.test(lower) ? "less" : MORE.test(lower) ? "more" : null;
  return ask ? { item: named.item, ask } : null;
}

export type ChangeAnswer = { grounded: boolean; facts: string; numbers: string[] };

/** The pack's answer, with quantities computed in code; ungrounded when no sourced entry fits. */
export function answerChange(q: ChangeAsk, recipe: CoachRecipe, pack: Pack = PACK): ChangeAnswer {
  const none: ChangeAnswer = { grounded: false, facts: "", numbers: [] };
  const roles = rolesFor(q.item, pack);
  const line = recipe.ingredients.find((i) => normaliseItem(i.item) === normaliseItem(q.item));
  const amount = line ? parseAmount(line.amount) : null;
  const name = normaliseItem(q.item);
  if (q.ask === "substitute") {
    // The swap for this ingredient: one whose wording names it; or the role's only sourced swap. Never another
    // ingredient's swap that happens to share the role ("no sour cream?" is not answered with buttermilk's).
    const subs = roles.flatMap((r) => r.substitutions).filter((s) => !s.provisional);
    const sub = subs.find((s) => normaliseItem(s.use.replace(/^for\s+/i, "").split(/[:;]/)[0]) === name || s.use.toLowerCase().includes(name))
      ?? (subs.length === 1 ? subs[0] : undefined);
    if (!sub) return none;
    const what = sub.use.replace(/^for [^:;]+[:;]\s*/i, "");
    if (!amount) return { grounded: true, facts: `Instead of ${name}: ${what}. ${sub.effect}`, numbers: [] };
    const use = speakAmount(scaleAmount(amount, sub.ratio));
    return { grounded: true, facts: `For the ${speakAmount(amount)} of ${name}, use ${use} of ${what}. ${sub.effect}`, numbers: [use] };
  }
  const change = roles.flatMap((r) => r.changes).find((c) => c.direction === q.ask && !c.provisional);
  if (!change) return none;
  const pct = `${Math.round(change.upTo * 100)}%`;
  return { grounded: true, facts: `${q.ask === "less" ? "Cutting" : "Adding more"} ${name}: up to ${pct} is safe. ${change.effect}`, numbers: [pct] };
}

const PHRASE = [
  "You are Serena, a warm, calm cooking coach speaking into the cook's ear through smart glasses.",
  "Tell the cook the answer below in one or two short spoken sentences, in your own words.",
  "Keep every quantity exactly as written. Add no other advice, no new ingredients, no new numbers.",
].join("\n");

/** The events of a grounded answer: said by the model if its line keeps every number, else as the facts. */
export async function* changeEvents(a: ChangeAnswer, model: ModelConnector): AsyncIterable<CoachEvent> {
  let line = "";
  try {
    for await (const piece of model.stream({ system: PHRASE, user: a.facts, images: [] }, new AbortController().signal)) line += piece;
  } catch {
    line = "";
  }
  line = line.trim();
  const ok = line && a.numbers.every((n) => line.includes(n));
  yield { type: "text", text: ok ? line : a.facts };
  yield { type: "action", action: "stay" };
  yield { type: "done" };
}
