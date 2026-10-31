import { describe, expect, it, vi, afterEach } from "vitest";
import { runTurn, TURN_TIMEOUT_MS, type TurnRequest } from "../src/turn";
import type { ModelConnector, ModelRequest } from "../src/model/connector";
import type { CoachEvent } from "../src/sse";

const req = (over: Partial<TurnRequest> = {}): TurnRequest => ({
  sessionId: "s1", stepIndex: 0, utterance: "Is this mixed enough?", frames: ["AAAA"], seen: [], ...over,
});

/** Reads the whole SSE stream; each event is stamped with the ms since the read began. */
async function collect(stream: ReadableStream<Uint8Array>, now = () => performance.now()) {
  const t0 = now();
  const out: { at: number; event: CoachEvent }[] = [];
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i); buf = buf.slice(i + 2);
      if (frame.startsWith("data: ")) out.push({ at: now() - t0, event: JSON.parse(frame.slice(6)) });
    }
  }
  return out;
}

function fake(fn: (req: ModelRequest, signal: AbortSignal) => AsyncIterable<string>): ModelConnector {
  return { stream: fn };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => vi.useRealTimers());

describe("runTurn", () => {
  it("sends an ack before the model's first token", async () => {
    const model = fake(async function* () { await sleep(500); yield "Looks good."; });
    const events = await collect(runTurn(req(), model));
    expect(events[0].event.type).toBe("ack");
    expect(events[0].at).toBeLessThan(100);
    expect(events.slice(1).map((e) => e.event)).toEqual([{ type: "text", text: "Looks good." }, { type: "action", action: "stay" }, { type: "done" }]);
  });

  it("acks only when frames are sent", async () => {
    const model = fake(async function* () { yield "Step two: fold it in."; });
    const events = await collect(runTurn(req({ frames: [] }), model));
    expect(events.map((e) => e.event.type)).toEqual(["text", "action", "done"]);
  });

  it("turns a model error into a spoken apology", async () => {
    const model = fake(async function* () { throw new Error("boom"); });
    const events = await collect(runTurn(req(), model));
    expect(events.at(-1)!.event).toEqual({ type: "error", text: "Sorry, I lost that — ask me again." });
  });

  it("cuts off a model that stalls", async () => {
    vi.useFakeTimers();
    const model = fake(async function* (_r, signal) {
      await new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    });
    const done = collect(runTurn(req(), model), () => Date.now());
    await vi.advanceTimersByTimeAsync(TURN_TIMEOUT_MS + 10);
    const events = await done;
    expect(events.at(-1)!.event).toEqual({ type: "error", text: "Sorry, I lost that — ask me again." });
  });

  it("passes the frames to the model as images", async () => {
    let seen: ModelRequest | undefined;
    const model = fake(async function* (r) { seen = r; yield "ok"; });
    await collect(runTurn(req({ frames: ["F1", "F2"] }), model));
    expect(seen!.images).toEqual(["F1", "F2"]);
    expect(seen!.user).toContain("Is this mixed enough?");
  });

  it("turns a trailing [[next]] into an action, unspoken", async () => {
    const model = fake(async function* () { yield "Nicely drained. On to the bowl. ["; yield "[next]]"; });
    const events = (await collect(runTurn(req(), model))).map((e) => e.event);
    expect(events.filter((e) => e.type === "text").map((e) => (e as { text: string }).text).join("")).toBe("Nicely drained. On to the bowl. ");
    expect(events.slice(-2)).toEqual([{ type: "action", action: "next" }, { type: "done" }]);
  });

  it("a reply of only [[stay]] says nothing — words not meant for the coach go unanswered (Katie's PB&J)", async () => {
    const model = fake(async function* () { yield "[[stay]]"; });
    const events = (await collect(runTurn(req({ frames: [] }), model))).map((e) => e.event);
    expect(events.filter((e) => e.type === "text")).toEqual([]);
    expect(events).toEqual([{ type: "action", action: "stay" }, { type: "done" }]);
  });

  it("an apology carries no action", async () => {
    const model = fake(async function* () { throw new Error("boom"); });
    const events = (await collect(runTurn(req(), model))).map((e) => e.event);
    expect(events.some((e) => e.type === "action")).toBe(false);
  });
});
