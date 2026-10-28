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

export type Observation = { events: string[]; interject: string | null; usage: Usage };

const NONE: Usage = { input: 0, cachedInput: 0, output: 0 };
const MAX_EVENTS = 5;
const EVENT_MAX = 100;
const INTERJECT_MAX = 160;

/**
 * One look at the cook, in the background: what is new since the log, and — only for a clear mistake — one line to
 * say unprompted. Anything malformed or failed means nothing was seen; the observer never breaks the cook.
 */
export async function observeFrame(ctx: ObserveContext, frame: string, model: Completer): Promise<Observation> {
  let text = "", usage = NONE;
  try {
    ({ text, usage } = await model.complete({ system: observerSystem(ctx), user: observerUser(ctx), images: [frame] }));
  } catch (error) {
    console.warn("observe failed:", error instanceof Error ? error.message : String(error));
    return { events: [], interject: null, usage: NONE };
  }
  try {
    const o = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { events?: unknown; interject?: unknown };
    const events = Array.isArray(o.events)
      ? o.events.filter((e): e is string => typeof e === "string" && e.trim() !== "").slice(0, MAX_EVENTS).map((e) => e.trim().slice(0, EVENT_MAX))
      : [];
    const said = typeof o.interject === "string" ? o.interject.trim() : "";
    return { events, interject: said && said.length <= INTERJECT_MAX ? said : null, usage };
  } catch {
    return { events: [], interject: null, usage };
  }
}
