import { describe, expect, it } from "vitest";
import worker, { MAX_BODY_BYTES, MAX_FRAMES, MAX_FRAME_CHARS, MAX_UTTERANCE } from "../src/index";

const env = { MODEL_API_KEY: "k", COACH_APP_KEY: "app-secret" };
const turn = (body: unknown, headers: Record<string, string> = { "X-Coach-Key": "app-secret" }) =>
  new Request("https://coach.test/v1/turn", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
const ok = { sessionId: "s", stepIndex: 0, utterance: "hi", frames: [], seen: [] };
/** With a device id, so a refusal is about the body, not the missing header. */
const DEV = { "X-Coach-Key": "app-secret", "X-Coach-Device": "dev-1" };

describe("the /v1/turn door", () => {
  it("refuses a request without the app key", async () => {
    expect((await worker.fetch(turn(ok, {}), env)).status).toBe(401);
    expect((await worker.fetch(turn(ok, { "X-Coach-Key": "wrong" }), env)).status).toBe(401);
  });
  it("refuses everything when the server has no app key configured", async () => {
    expect((await worker.fetch(turn(ok), { MODEL_API_KEY: "k", COACH_APP_KEY: "" })).status).toBe(401);
  });
  it("refuses too many frames", async () => {
    const r = await worker.fetch(turn({ ...ok, frames: Array(MAX_FRAMES + 1).fill("QUFB") }), env);
    expect(r.status).toBe(400);
  });
  it("refuses an oversized frame", async () => {
    const r = await worker.fetch(turn({ ...ok, frames: ["A".repeat(MAX_FRAME_CHARS + 4)] }), env);
    expect(r.status).toBe(400);
  });
  it("refuses a frame that isn't base64", async () => {
    const r = await worker.fetch(turn({ ...ok, frames: ["not base64!"] }), env);
    expect(r.status).toBe(400);
  });
  it("refuses an overlong utterance", async () => {
    const r = await worker.fetch(turn({ ...ok, utterance: "x".repeat(MAX_UTTERANCE + 1) }), env);
    expect(r.status).toBe(400);
  });
  it("refuses a body over the size cap before parsing it", async () => {
    const req = new Request("https://coach.test/v1/turn", {
      method: "POST", headers: { "X-Coach-Key": "app-secret", "Content-Length": String(MAX_BODY_BYTES + 1) }, body: "{}",
    });
    expect((await worker.fetch(req, env)).status).toBe(413);
  });
  it("refuses an oversized body that doesn't declare its length", async () => {
    const big = new TextEncoder().encode("x".repeat(64 * 1024));
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) { if (sent > MAX_BODY_BYTES) return c.close(); sent += big.length; c.enqueue(big); },
    });
    const req = new Request("https://coach.test/v1/turn", {
      method: "POST", headers: { "X-Coach-Key": "app-secret" }, body, duplex: "half",
    } as RequestInit);
    expect((await worker.fetch(req, env)).status).toBe(413);
  });
  it("refuses more than 12 lines of history", async () => {
    const history = Array.from({ length: 13 }, () => ({ who: "cook", text: "hi" }));
    expect((await worker.fetch(turn({ ...ok, history }, DEV), env)).status).toBe(400);
  });
  it("refuses a history line over 300 characters", async () => {
    expect((await worker.fetch(turn({ ...ok, history: [{ who: "coach", text: "x".repeat(301) }] }, DEV), env)).status).toBe(400);
  });
  it("refuses a history line from anyone but the cook or the coach", async () => {
    expect((await worker.fetch(turn({ ...ok, history: [{ who: "system", text: "hi" }] }, DEV), env)).status).toBe(400);
  });
});
