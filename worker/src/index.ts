import { MuseConnector } from "./model/muse";
import { runTurn, type TurnRequest } from "./turn";

export interface Env {
  MODEL_API_KEY: string;
  /** The app's key: every request must carry it in `X-Coach-Key`, so the Meta credit is not an open proxy. */
  COACH_APP_KEY: string;
}

/** What one turn may carry. A glasses frame at 720 px and JPEG 0.5 is ~60 KB of base64; these leave headroom. */
export const MAX_FRAMES = 8;
export const MAX_FRAME_CHARS = 400_000;
export const MAX_UTTERANCE = 500;
export const MAX_SEEN = 50;
export const MAX_BODY_BYTES = 4_000_000;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function isTurn(b: unknown): b is TurnRequest {
  const t = b as TurnRequest;
  return !!t && typeof t.sessionId === "string" && t.sessionId.length <= 100
    && Number.isInteger(t.stepIndex) && t.stepIndex >= 0
    && typeof t.utterance === "string" && t.utterance.length <= MAX_UTTERANCE
    && Array.isArray(t.frames) && t.frames.length <= MAX_FRAMES
    && t.frames.every((f) => typeof f === "string" && f.length <= MAX_FRAME_CHARS && BASE64.test(f))
    && Array.isArray(t.seen) && t.seen.length <= MAX_SEEN && t.seen.every((s) => typeof s === "string" && s.length <= 100);
}

/** Constant-time compare, so the key can't be guessed a character at a time from response timing. */
function sameKey(given: string | null, expected: string): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/v1/turn") {
      if (!sameKey(request.headers.get("X-Coach-Key"), env.COACH_APP_KEY)) {
        return Response.json({ error: "unauthorised" }, { status: 401 });
      }
      if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) {
        return Response.json({ error: "too_large" }, { status: 413 });
      }
      const body = await request.json().catch(() => null);
      if (!isTurn(body)) return Response.json({ error: "bad_request" }, { status: 400 });
      return new Response(runTurn(body, new MuseConnector(env.MODEL_API_KEY)), {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }
    return Response.json({ error: "not_found" }, { status: 404 });
  },
};
