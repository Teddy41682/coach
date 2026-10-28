import { mindSystem, mindUser } from "./expertise/mind-prompt";
import type { CoachRecipe } from "./expertise/pack";
import type { Completer, Usage } from "./model/connector";

/** What woke the mind: the eyes (the picture changed, a timer ended, a quiet heartbeat) or the cook's own words. */
export type Wake = "changed" | "spoke" | "timer" | "heartbeat";
/** The mind's call on the step: keep going, move on, or hold the place while the cook is away. */
export type StepCall = "stay" | "next" | "hold";

/** One wake as the phone sends it. The timeline lives on the phone; the newest 50 lines travel with each wake. */
export type MindRequest = {
  sessionId: string;
  stepIndex: number;
  wake: Wake;
  timeline: string[];
  /** Seconds since anyone (cook or coach) last spoke. */
  quietFor: number;
  held?: boolean;
  finished?: boolean;
  /** Eye wakes: the newest frame and the previous one the mind looked at (base64 JPEG ≤ 1024 px). */
  frame?: string;
  previous?: string;
  /** Spoken wakes: the cook's words and the frames to judge by. */
  utterance?: string;
  frames?: string[];
};

export type MindContext = Omit<MindRequest, "sessionId"> & {
  recipe: CoachRecipe;
  briefing: { done: string; mistakes: string; tip: string; hardToSee?: boolean };
  stepIngredients?: string[];
};

export type MindAnswer = { seen: string[]; say: string | null; step: StepCall; usage: Usage };

export const MAX_TIMELINE = 50;
export const TIMELINE_LINE = 200;
const WAKES: Wake[] = ["changed", "spoke", "timer", "heartbeat"];
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_FRAME_CHARS = 400_000;
const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const image = (v: unknown) => str(v, MAX_FRAME_CHARS) && BASE64.test(v as string);

/** The shape check; image sizes are checked by the route (strict JPEG ≤ 1024 px). */
export function isMindRequest(b: unknown): b is MindRequest {
  const m = b as MindRequest;
  return !!m && str(m.sessionId, 100)
    && Number.isInteger(m.stepIndex) && m.stepIndex >= 0
    && WAKES.includes(m.wake)
    && Array.isArray(m.timeline) && m.timeline.length <= MAX_TIMELINE && m.timeline.every((l) => str(l, TIMELINE_LINE))
    && typeof m.quietFor === "number" && Number.isFinite(m.quietFor) && m.quietFor >= 0
    && (m.held === undefined || typeof m.held === "boolean")
    && (m.finished === undefined || typeof m.finished === "boolean")
    && (m.frame === undefined || image(m.frame))
    && (m.previous === undefined || image(m.previous))
    && (m.wake !== "spoke" || str(m.utterance, 500))
    && (m.utterance === undefined || str(m.utterance, 500))
    && (m.frames === undefined || (Array.isArray(m.frames) && m.frames.length <= 8 && m.frames.every(image)));
}

const NONE: Usage = { input: 0, cachedInput: 0, output: 0 };
const MAX_SEEN = 5;
const SEEN_MAX = 100;
const SAY_MAX = 200;
const STEPS: StepCall[] = ["stay", "next", "hold"];

/**
 * One eye wake: the mind looks at the previous and newest frames against the timeline and answers what it saw,
 * whether to say something now, and its call on the step. Anything malformed or failed is silence and "stay" —
 * the mind never breaks the cook.
 */
export async function wakeMind(ctx: MindContext, model: Completer): Promise<MindAnswer> {
  const images = ctx.frame ? (ctx.previous ? [ctx.previous, ctx.frame] : [ctx.frame]) : [];
  let text = "", usage = NONE;
  try {
    ({ text, usage } = await model.complete({ system: mindSystem(ctx, false), user: mindUser(ctx), images }));
  } catch (error) {
    console.warn("mind failed:", error instanceof Error ? error.message : String(error));
    return { seen: [], say: null, step: "stay", usage: NONE };
  }
  try {
    const o = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { seen?: unknown; say?: unknown; step?: unknown };
    const seen = Array.isArray(o.seen)
      ? o.seen.filter((e): e is string => typeof e === "string" && e.trim() !== "").slice(0, MAX_SEEN).map((e) => e.trim().slice(0, SEEN_MAX))
      : [];
    const said = typeof o.say === "string" ? o.say.trim() : "";
    const step = STEPS.includes(o.step as StepCall) ? (o.step as StepCall) : "stay";
    return { seen, say: said && said.length <= SAY_MAX ? said : null, step, usage };
  } catch {
    return { seen: [], say: null, step: "stay", usage };
  }
}
