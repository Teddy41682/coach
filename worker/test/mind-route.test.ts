import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { MemorySessionStore } from "../src/session";
import { MemoryUsageStore, checkObserve, DEVICE_DAILY_OBSERVES } from "../src/limits";

const env = { MODEL_API_KEY: "k", COACH_APP_KEY: "app" };
const H = { "Content-Type": "application/json", "X-Coach-Key": "app", "X-Coach-Device": "d1" };
function jpeg(width: number, height: number): string {
  const b = [0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x02];
  return btoa(String.fromCharCode(...b));
}
const body = { sessionId: "s1", stepIndex: 0, wake: "changed", timeline: ["0:12 saw: cracked 2 eggs into the bowl"], quietFor: 8, frame: jpeg(640, 360) };
const plan = { ingredients: ["eggs"], done: "Smooth.", mistakes: "No salt.", tip: "", hardToSee: false };

async function deps(answer = '{"seen":["shook salt over the bowl"],"say":null,"step":"stay"}', used = { input: 900, cachedInput: 100, output: 30 }) {
  const store = new MemorySessionStore();
  await store.put({ id: "s1", device: "d1", recipe: { title: "Eggs", ingredients: [{ amount: "3", item: "eggs" }], steps: ["Beat the eggs."] }, links: [plan], createdAt: 0 });
  const calls = { complete: 0, stream: 0 };
  const model = {
    async *stream() { calls.stream++; yield "Yes, the salt went in."; yield "\n[[ne"; yield "xt]]"; },
    async complete() { calls.complete++; return { text: answer, usage: used }; },
  };
  return { store, usage: new MemoryUsageStore(), model: () => model, now: () => Date.parse("2026-10-27T20:00:00Z"), calls };
}
const post = (b: unknown, headers: Record<string, string> = H) =>
  new Request("https://c/v1/mind", { method: "POST", headers, body: JSON.stringify(b) });

describe("POST /v1/mind (eye wakes)", () => {
  it("returns what the mind saw, said and decided, with the real usage", async () => {
    const r = await worker.handle(post(body), env, await deps());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ seen: ["shook salt over the bowl"], say: null, step: "stay", usage: { input: 900, cachedInput: 100, output: 30 } });
  });
  it("needs the app key and a device", async () => {
    const { "X-Coach-Key": _, ...noKey } = H;
    const { "X-Coach-Device": __, ...noDevice } = H;
    expect((await worker.handle(post(body, noKey), env, await deps())).status).toBe(401);
    expect((await worker.handle(post(body, noDevice), env, await deps())).status).toBe(400);
  });
  it("answers only the device that started the session, and only known sessions", async () => {
    expect((await worker.handle(post(body, { ...H, "X-Coach-Device": "other" }), env, await deps())).status).toBe(403);
    expect((await worker.handle(post({ ...body, sessionId: "nope" }), env, await deps())).status).toBe(404);
  });
  it("refuses a malformed wake", async () => {
    expect((await worker.handle(post({ ...body, timeline: Array(51).fill("x") }), env, await deps())).status).toBe(400);
    expect((await worker.handle(post({ ...body, wake: "nap" }), env, await deps())).status).toBe(400);
    expect((await worker.handle(post({ ...body, quietFor: -2 }), env, await deps())).status).toBe(400);
  });
  it("refuses an image over 1024 px or not a JPEG, newest or previous", async () => {
    expect((await worker.handle(post({ ...body, frame: jpeg(4032, 3024) }), env, await deps())).status).toBe(400);
    expect((await worker.handle(post({ ...body, previous: jpeg(1080, 1920) }), env, await deps())).status).toBe(400);
    expect((await worker.handle(post({ ...body, frame: "QUFB" }), env, await deps())).status).toBe(400);
  });
  it("takes a wake with no photo (a heartbeat with no frame yet)", async () => {
    const { frame: _, ...noFrame } = body;
    expect((await worker.handle(post({ ...noFrame, wake: "heartbeat" }), env, await deps())).status).toBe(200);
  });
  it("is 429 once the device's looks are spent, without asking the model", async () => {
    const d = await deps();
    for (let i = 0; i < DEVICE_DAILY_OBSERVES; i++) await checkObserve(d.usage, "d1", "2026-10-27");
    expect((await worker.handle(post(body), env, d)).status).toBe(429);
    expect(d.calls.complete).toBe(0);
  });
  it("settles each wake to what Meta says it really cost", async () => {
    const d = await deps(undefined, { input: 2_000_000, cachedInput: 0, output: 0 });   // 250¢
    await worker.handle(post(body), env, d);
    expect(await d.usage.totalCents("2026-10-27")).toBe(250);
  });
});

/** Reads an SSE body into its events. */
async function events(r: Response) {
  return (await r.text()).split("\n\n").filter((f) => f.startsWith("data: ")).map((f) => JSON.parse(f.slice(6)));
}

describe("POST /v1/mind (spoken wakes, streamed)", () => {
  const spoke = { sessionId: "s1", stepIndex: 0, wake: "spoke", timeline: [], quietFor: 0, utterance: "did the salt go in?", frames: [jpeg(640, 360)] };
  it("streams the answer, the control line held back, then the decision", async () => {
    const d = await deps();
    const r = await worker.handle(post(spoke), env, d);
    expect(r.headers.get("Content-Type")).toBe("text/event-stream");
    const e = await events(r);
    expect(e.filter((x) => x.type === "text").map((x) => x.text).join("")).toBe("Yes, the salt went in.\n");
    expect(e.at(-2)).toEqual({ type: "action", action: "next" });
    expect(e.at(-1)).toEqual({ type: "done" });
    expect(d.calls.stream).toBe(1);
  });
  it("refuses a spoken frame over 1024 px", async () => {
    expect((await worker.handle(post({ ...spoke, frames: [jpeg(1280, 720)] }), env, await deps())).status).toBe(400);
  });
  it("over the day's turn cap, says so and never asks the model", async () => {
    const d = await deps();
    for (let i = 0; i < 150; i++) await d.usage.tryAdd("2026-10-27", "d1", 0, 150, 1500);
    const e = await events(await worker.handle(post(spoke), env, d));
    expect(e[0].text).toMatch(/limit/);
    expect(d.calls.stream).toBe(0);
  });
});
