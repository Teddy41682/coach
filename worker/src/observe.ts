import { observerSystem, observerUser } from "./expertise/cooking";
import type { CoachRecipe } from "./expertise/pack";
import type { Completer, Usage } from "./model/connector";

/** What the observer needs to judge one frame: the step, how to judge it, and what's already in the log. */
export type ObserveContext = {
  recipe: CoachRecipe;
  stepIndex: number;
  briefing: { done: string; mistakes: string; tip: string };
  /** The newest log lines ("0:51 shook salt over the bowl"), so only what's new is reported. */
  recent: string[];
};

/** `away`: the photo shows the cook isn't at the cooking (another room, a desk, a screen) — the phone holds the place. */
export type Observation = { events: string[]; interject: string | null; away: boolean; usage: Usage };

const NONE: Usage = { input: 0, cachedInput: 0, output: 0 };
const MAX_EVENTS = 5;
const EVENT_MAX = 100;
const INTERJECT_MAX = 160;

/**
 * One look at the cook, in the background: what is new since the log, and — only for a clear mistake — one line to
 * say unprompted. Anything malformed or failed means nothing was seen; the observer never breaks the cook.
 */
export async function observeFrame(ctx: ObserveContext, frame: string, model: Completer, previous?: string): Promise<Observation> {
  let text = "", usage = NONE;
  // With the previous look beside it, the question becomes "what changed?" — shown one photo and a log, the model
  // told a story on an identical frame (chicken, then garlic, then salt, 2026-10-27).
  const images = previous ? [previous, frame] : [frame];
  try {
    ({ text, usage } = await model.complete({ system: observerSystem(ctx, !!previous), user: observerUser(ctx), images }));
  } catch (error) {
    console.warn("observe failed:", error instanceof Error ? error.message : String(error));
    return { events: [], interject: null, away: false, usage: NONE };
  }
  try {
    const o = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { events?: unknown; interject?: unknown; away?: unknown };
    const events = Array.isArray(o.events)
      ? o.events.filter((e): e is string => typeof e === "string" && e.trim() !== "").slice(0, MAX_EVENTS).map((e) => e.trim().slice(0, EVENT_MAX))
      : [];
    const said = typeof o.interject === "string" ? o.interject.trim() : "";
    return { events, interject: said && said.length <= INTERJECT_MAX ? said : null, away: o.away === true, usage };
  } catch {
    return { events: [], interject: null, away: false, usage };
  }
}
