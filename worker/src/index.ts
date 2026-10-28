import { cooking } from "./expertise/cooking";
import type { CoachRecipe } from "./expertise/pack";
import { linkSteps } from "./link";
import type { ModelConnector } from "./model/connector";
import { MuseConnector } from "./model/muse";
import { realMillicents, settleObserve } from "./limits";
import { checkAndCount, checkObserve, costOf, D1UsageStore, hstDay, LIMIT_LINE, LINK_CENTS, type UsageStore } from "./limits";
import { observeFrame } from "./observe";
import { jpegSize } from "./jpeg";
import type { Completer } from "./model/connector";
import { D1SessionStore, type SessionStore } from "./session";
import { encodeEvent } from "./sse";
import { runTurn, type TurnRequest } from "./turn";

export interface Env {
  MODEL_API_KEY: string;
  /** The app's key: every request must carry it in `X-Coach-Key`, so the Meta credit is not an open proxy. */
  COACH_APP_KEY: string;
  DB?: D1Database;
}

/** What the routes need from the world, so tests can swap the store and the model. */
/** `link` answers are long JSON after the model has reasoned, so linking gets a bigger token allowance. */
export type Purpose = "turn" | "link" | "observe";
export type Deps = { store: SessionStore; usage: UsageStore; model: (purpose: Purpose) => ModelConnector; now: () => number };
/** Measured 2026-10-27: linking alone used 281 reasoning + ~90 answer tokens and 400 truncated it; briefings add ~60 tokens a step. */
export const LINK_MAX_TOKENS = 4_000;

/** What one turn may carry. A glasses frame at 720 px and JPEG 0.5 is ~60 KB of base64; these leave headroom. */
export const MAX_FRAMES = 8;
export const MAX_FRAME_CHARS = 400_000;
export const MAX_UTTERANCE = 500;
export const MAX_SEEN = 50;
export const MAX_HISTORY = 12;
export const MAX_LINE = 300;
export const MAX_BODY_BYTES = 4_000_000;
/** The observer's images are billed by pixels: nothing over this on its long side (the phone sends 640). */
export const MAX_OBSERVE_SIDE = 1024;
const smallJpeg = (b64: string) => {
  const size = jpegSize(b64);
  return !!size && Math.max(size.width, size.height) <= MAX_OBSERVE_SIDE;
};
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
/** Plain ids only: never '*', which names the day-total row in the usage table. */
const DEVICE_ID = /^[A-Za-z0-9._-]{1,100}$/;
const deviceOf = (request: Request) => {
  const d = request.headers.get("X-Coach-Device");
  return d && DEVICE_ID.test(d) ? d : null;
};

function isTurn(b: unknown): b is TurnRequest {
  const t = b as TurnRequest;
  return !!t && str(t.sessionId, 100)
    && Number.isInteger(t.stepIndex) && t.stepIndex >= 0
    && str(t.utterance, MAX_UTTERANCE)
    && Array.isArray(t.frames) && t.frames.length <= MAX_FRAMES
    && t.frames.every((f) => str(f, MAX_FRAME_CHARS) && BASE64.test(f))
    && Array.isArray(t.seen) && t.seen.length <= MAX_SEEN && t.seen.every((s) => str(s, 100))
    && (t.history === undefined || (Array.isArray(t.history) && t.history.length <= MAX_HISTORY
      && t.history.every((l) => !!l && (l.who === "cook" || l.who === "coach") && str(l.text, MAX_LINE))));
}

function isRecipe(r: unknown): r is CoachRecipe {
  const x = r as CoachRecipe;
  return !!x && str(x.title, 200)
    && Array.isArray(x.ingredients) && x.ingredients.length <= 100
    && x.ingredients.every((i) => !!i && str(i.amount, 100) && str(i.item, 200))
    && Array.isArray(x.steps) && x.steps.length <= 60 && x.steps.every((s) => str(s, 1000));
}

/** The body as text, or null once it passes `max` bytes — counted as it streams, whatever Content-Length claims. */
async function readBounded(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(all);
}

/** Constant-time compare, so the key can't be guessed a character at a time from response timing. */
function sameKey(given: string | null, expected: string): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

const bad = (status: number, error: string) => Response.json({ error }, { status });

/** Auth, size cap and JSON parse, shared by every POST route. Returns the parsed body or the refusal. */
async function admit(request: Request, env: Env): Promise<{ body: unknown } | Response> {
  if (!sameKey(request.headers.get("X-Coach-Key"), env.COACH_APP_KEY)) return bad(401, "unauthorised");
  if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) return bad(413, "too_large");
  const text = await readBounded(request, MAX_BODY_BYTES);
  if (text === null) return bad(413, "too_large");
  try { return { body: JSON.parse(text) }; } catch { return { body: null }; }
}

async function handle(request: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "POST") return bad(404, "not_found");

  if (url.pathname === "/v1/session") {
    const got = await admit(request, env);
    if (got instanceof Response) return got;
    const device = deviceOf(request);
    if (!device) return bad(400, "no_device");
    const recipe = (got.body as { recipe?: unknown } | null)?.recipe;
    if (!isRecipe(recipe)) return bad(400, "bad_recipe");
    if ((await checkAndCount(deps.usage, device, hstDay(deps.now()), LINK_CENTS)) !== "ok") return bad(429, "daily_limit");
    const links = await linkSteps(recipe, deps.model("link"));
    const id = crypto.randomUUID();
    await deps.store.put({ id, device, recipe, links, createdAt: deps.now() });
    return Response.json({
      sessionId: id,
      steps: recipe.steps.map((text, index) => {
        const p = links[index] ?? { ingredients: [], done: "", mistakes: "", tip: "", hardToSee: false };
        return { index, text, ingredients: p.ingredients, briefing: { done: p.done, mistakes: p.mistakes, tip: p.tip, hardToSee: p.hardToSee } };
      }),
    });
  }

  if (url.pathname === "/v1/turn") {
    const got = await admit(request, env);
    if (got instanceof Response) return got;
    if (!isTurn(got.body)) return bad(400, "bad_request");
    const turn = got.body;
    const device = deviceOf(request);
    if (!device) return bad(400, "no_device");
    const session = await deps.store.get(turn.sessionId);
    if (!session) return bad(404, "unknown_session");
    // A session belongs to the device that started it, so caps can't be dodged by inventing device ids.
    if (session.device !== device) return bad(403, "not_your_session");
    if ((await checkAndCount(deps.usage, device, hstDay(deps.now()), costOf(turn.frames.length))) !== "ok") {
      // Spoken like any answer, so the cook hears why; the model is never asked.
      const said = new Blob([encodeEvent({ type: "text", text: LIMIT_LINE }), encodeEvent({ type: "done" })]);
      return new Response(said.stream(), { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }
    const plan = session.links[Math.min(turn.stepIndex, Math.max(session.links.length - 1, 0))];
    const ctx = {
      recipe: session.recipe, stepIndex: turn.stepIndex, utterance: turn.utterance, seen: turn.seen,
      stepIngredients: plan?.ingredients ?? [],
      briefing: { done: plan?.done ?? "", mistakes: plan?.mistakes ?? "", tip: plan?.tip ?? "", hardToSee: plan?.hardToSee ?? false },
      hasPhotos: turn.frames.length > 0,
      history: turn.history ?? [],
    };
    return new Response(runTurn(turn, deps.model("turn"), { system: cooking.system(ctx), user: cooking.user(ctx) }), {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  if (url.pathname === "/v1/observe") {
    const got = await admit(request, env);
    if (got instanceof Response) return got;
    const device = deviceOf(request);
    if (!device) return bad(400, "no_device");
    const b = got.body as { sessionId?: unknown; stepIndex?: unknown; frame?: unknown; previous?: unknown; recent?: unknown } | null;
    const ok = !!b && str(b.sessionId, 100) && Number.isInteger(b.stepIndex) && (b.stepIndex as number) >= 0
      && str(b.frame, MAX_FRAME_CHARS) && BASE64.test(b.frame as string)
      && Array.isArray(b.recent) && b.recent.length <= 10 && b.recent.every((l) => str(l, 100))
      && (b.previous === undefined || (str(b.previous, MAX_FRAME_CHARS) && BASE64.test(b.previous as string)))
      && smallJpeg(b.frame as string) && (b.previous === undefined || smallJpeg(b.previous as string));
    if (!ok || !b) return bad(400, "bad_request");
    const session = await deps.store.get(b.sessionId as string);
    if (!session) return bad(404, "unknown_session");
    if (session.device !== device) return bad(403, "not_your_session");
    const day = hstDay(deps.now());
    if ((await checkObserve(deps.usage, device, day)) !== "ok") return bad(429, "daily_limit");
    const stepIndex = b.stepIndex as number;
    const plan = session.links[Math.min(stepIndex, Math.max(session.links.length - 1, 0))];
    const model = deps.model("observe") as Partial<Completer>;
    if (typeof model.complete !== "function") return bad(500, "no_completer");
    const seen = await observeFrame(
      { recipe: session.recipe, stepIndex, recent: b.recent as string[],
        briefing: { done: plan?.done ?? "", mistakes: plan?.mistakes ?? "", tip: plan?.tip ?? "" } },
      b.frame as string, model as Completer, b.previous as string | undefined);
    // The reserve taken by checkObserve settles to what the look really cost, by Meta's own count.
    await settleObserve(deps.usage, day, realMillicents(seen.usage));
    return Response.json(seen);
  }

  return bad(404, "not_found");
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, env, {
      store: new D1SessionStore(env.DB as D1Database),
      usage: new D1UsageStore(env.DB as D1Database),
      model: (purpose) => purpose === "link"
        ? new MuseConnector(env.MODEL_API_KEY, "muse-spark-1.3", "minimal", undefined, LINK_MAX_TOKENS)
        : new MuseConnector(env.MODEL_API_KEY),
      now: () => Date.now(),
    });
  },
  handle,
};
