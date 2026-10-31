import type { CoachRecipe } from "../pack";
import type { ModelConnector } from "../../model/connector";
import type { CoachEvent } from "../../sse";
import { parseAmount, scaleAmount, speakAmount } from "../amount";
import { PACK } from "./index";
import { mentionedItems, normaliseItem, rolesFor, saidText } from "./lookup";
import type { Pack } from "./types";

/**
 * Substitutions and changes, answered from the pack (spec 2026-10-31): "I don't have buttermilk", "can I cut the
 * sugar?". The pack's entry and code's arithmetic are the answer; the model only says it, and only if the numbers
 * survive. A question the pack can't ground goes to the mind as before, told to give judgement as judgement.
 */
export type ChangeAsk = { item: string; ask: "substitute" | "less" | "more" };

const SUBSTITUTE = /\b(don'?t have|do not have|out of|ran out|run out|no more|instead of|swap|substitute|replace|use something else)\b/;

/**
 * A substitution or a change to an amount, or null. A change is aimed at the amount ("less sugar", "cut the sugar in
 * half", "cut back on the butter", "double the garlic") — "cut the butter into cubes", "lower the heat before the
 * milk" and "any more sugar?" are not (the final review's probes).
 */
export function detectChange(utterance: string, recipe: CoachRecipe, pack: Pack = PACK): ChangeAsk | null {
  const mentions = mentionedItems(utterance, recipe, pack);
  if (!mentions.length) return null;
  const said = saidText(utterance);
  const lower = utterance.toLowerCase();
  if (SUBSTITUTE.test(lower)) {
    // "honey instead of sugar": the recipe's ingredient is the one being replaced.
    return { item: mentions[mentions.length - 1].item, ask: "substitute" };
  }
  for (const m of mentions) {
    const p = m.phrase.replace(/[-&]/g, "\\$&");
    const the = "(?:the |some |my |a bit of |a little )?(?:amount of )?";
    if (new RegExp(`\\b(less|reduce|halve|skip|leave out|cut back on|cut down on|go easy on|lower) ${the}${p}\\b`).test(said)
      || new RegExp(`\\bcut ${the}${p} (?:in half|by|back|down)\\b`).test(said)) return { item: m.item, ask: "less" };
    if (new RegExp(`\\b(?:use|add|put(?: in)?) (?:a bit |a little |some )?(?:more|extra) ${p}\\b`).test(said)
      || new RegExp(`\\b(?:double|triple) ${the}${p}\\b`).test(said)) return { item: m.item, ask: "more" };
  }
  return null;
}

/** What a swap replaces, by the pack's own wording: "for buttermilk: …" or "… in place of buttermilk[, in …]". */
function replaces(use: string): string | null {
  const m = /^for\s+([^:;]+)[:;]/i.exec(use) ?? /\bin place of\s+([^,;(]+?)(?=\s+in\s|\s*[,;(]|$)/i.exec(use);
  return m ? normaliseItem(m[1]) : null;
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
    // Matched by the label naming what it replaces ("for buttermilk: …"); a swap with no label is offered only when it
    // is its role's only one and the role is this ingredient's alone.
    const sub = subs.find((x) => replaces(x.use) === name)
      ?? (subs.length === 1 && !replaces(subs[0].use) && roles.length === 1 ? subs[0] : undefined);
    if (!sub) return none;
    const what = sub.use.replace(/^for [^:;]+[:;]\s*/i, "").replace(/\s+in place of\s+[^,;(]+?(?=\s+in\s|\s*[,;(]|$)/i, "");
    // A swap that carries its own measure ("½ tsp per tsp of extract") is said as written: no amount on top of it.
    if (!amount || /\bper\b|\d/.test(what)) return { grounded: true, facts: `Instead of ${name}: ${what}. ${sub.effect}`, numbers: [] };
    const use = speakAmount(scaleAmount(amount, sub.ratio));
    return { grounded: true, facts: `For the ${speakAmount(amount)} of ${name}, use ${use} of ${what}. ${sub.effect}`, numbers: [use] };
  }
  const change = roles.flatMap((r) => r.changes).find((c) => c.direction === q.ask && !c.provisional);
  if (!change) return none;
  const pct = `${Math.round(change.upTo * 100)}%`;
  if (q.ask === "less" && change.upTo >= 1) return { grounded: true, facts: `You can leave the ${name} out. ${change.effect}`, numbers: [] };
  return { grounded: true, facts: `${q.ask === "less" ? "Cutting" : "Adding more"} ${name}: up to ${pct} ${q.ask} is safe. ${change.effect}`, numbers: [pct] };
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
