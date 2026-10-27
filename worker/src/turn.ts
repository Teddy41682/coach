import type { ModelConnector } from "./model/connector";
import { encodeEvent, type CoachEvent } from "./sse";

export type TurnRequest = {
  sessionId: string;
  stepIndex: number;
  utterance: string;
  /** Base64 JPEG frames; none means a question that needs no look. */
  frames: string[];
  /** What the coach has noted going in so far this step. */
  seen: string[];
};

/** A model that hasn't finished by now is cut off and the cook hears the apology instead of silence. */
export const TURN_TIMEOUT_MS = 12_000;
export const ACKS = ["Let me take a look.", "One sec, looking.", "Let me see."];
export const APOLOGY = "Sorry, I lost that — ask me again.";

/**
 * One exchange as an event stream. A turn with frames is acknowledged at once, before the model is asked, so
 * there is never dead air while it looks; the model's text follows as it streams. Any failure — a thrown error or
 * a model past TURN_TIMEOUT_MS — ends with a spoken apology, never a silent close.
 */
export function runTurn(req: TurnRequest, model: ModelConnector, timeoutMs = TURN_TIMEOUT_MS): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const send = (e: CoachEvent) => controller.enqueue(encodeEvent(e));
      if (req.frames.length > 0) send({ type: "ack", text: ACKS[req.stepIndex % ACKS.length] });

      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(new Error("timeout")), timeoutMs);
      const timedOut = new Promise<never>((_, reject) =>
        abort.signal.addEventListener("abort", () => reject(new Error("timeout")), { once: true }));
      try {
        const it = model.stream(
          { system: "You are a cooking coach speaking through smart glasses. Answer in one or two short sentences.",
            user: req.utterance, images: req.frames },
          abort.signal,
        )[Symbol.asyncIterator]();
        for (;;) {
          const next = await Promise.race([it.next(), timedOut]);
          if (next.done) break;
          send({ type: "text", text: next.value });
        }
        send({ type: "done" });
      } catch {
        send({ type: "error", text: APOLOGY });
      } finally {
        clearTimeout(timer);
        controller.close();
      }
    },
  });
}
