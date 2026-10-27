import { MuseConnector } from "./model/muse";
import { runTurn, type TurnRequest } from "./turn";

export interface Env {
  MODEL_API_KEY: string;
}

function isTurn(b: unknown): b is TurnRequest {
  const t = b as TurnRequest;
  return !!t && typeof t.sessionId === "string" && Number.isInteger(t.stepIndex) && typeof t.utterance === "string"
    && Array.isArray(t.frames) && t.frames.every((f) => typeof f === "string")
    && Array.isArray(t.seen) && t.seen.every((s) => typeof s === "string");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/v1/turn") {
      const body = await request.json().catch(() => null);
      if (!isTurn(body)) return Response.json({ error: "bad_request" }, { status: 400 });
      return new Response(runTurn(body, new MuseConnector(env.MODEL_API_KEY)), {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }
    return Response.json({ error: "not_found" }, { status: 404 });
  },
};
