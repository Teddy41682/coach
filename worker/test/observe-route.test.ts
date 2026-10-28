import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { MemorySessionStore } from "../src/session";
import { MemoryUsageStore, checkObserve, DEVICE_DAILY_OBSERVES } from "../src/limits";

const env = { MODEL_API_KEY: "k", COACH_APP_KEY: "app" };
const H = { "Content-Type": "application/json", "X-Coach-Key": "app", "X-Coach-Device": "d1" };
const body = { sessionId: "s1", stepIndex: 0, frame: "QUFB", recent: ["0:12 cracked 2 eggs into the bowl"] };
const plan = { ingredients: ["eggs"], done: "Smooth.", mistakes: "No salt.", tip: "" };

async function deps(answer = '{"events":["shook salt over the bowl"],"interject":null}') {
  const store = new MemorySessionStore();
  await store.put({ id: "s1", device: "d1", recipe: { title: "Eggs", ingredients: [{ amount: "3", item: "eggs" }], steps: ["Beat the eggs."] }, links: [plan], createdAt: 0 });
  const model = { async *stream() { yield ""; }, async complete() { return { text: answer, usage: { input: 900, cachedInput: 100, output: 30 } }; } };
  return { store, usage: new MemoryUsageStore(), model: () => model, now: () => Date.parse("2026-10-27T20:00:00Z") };
}
const post = (b: unknown, headers: Record<string, string> = H) =>
  new Request("https://c/v1/observe", { method: "POST", headers, body: JSON.stringify(b) });

describe("POST /v1/observe", () => {
  it("returns what was seen and the real usage", async () => {
    const r = await worker.handle(post(body), env, await deps());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ events: ["shook salt over the bowl"], interject: null, usage: { input: 900, cachedInput: 100, output: 30 } });
  });
  it("needs the app key", async () => {
    const { "X-Coach-Key": _, ...noKey } = H;
    expect((await worker.handle(post(body, noKey), env, await deps())).status).toBe(401);
  });
  it("needs a device id", async () => {
    const { "X-Coach-Device": _, ...noDevice } = H;
    expect((await worker.handle(post(body, noDevice), env, await deps())).status).toBe(400);
  });
  it("refuses a frame that isn't one base64 image", async () => {
    expect((await worker.handle(post({ ...body, frame: ["QUFB", "QUFB"] }), env, await deps())).status).toBe(400);
    expect((await worker.handle(post({ ...body, frame: "not base64!" }), env, await deps())).status).toBe(400);
  });
  it("refuses more than 10 recent log lines", async () => {
    expect((await worker.handle(post({ ...body, recent: Array(11).fill("x") }), env, await deps())).status).toBe(400);
  });
  it("is 404 for an unknown session", async () => {
    expect((await worker.handle(post({ ...body, sessionId: "nope" }), env, await deps())).status).toBe(404);
  });
  it("is 429 once the device's observations are spent, without asking the model", async () => {
    const d = await deps();
    let asked = false;
    d.model = () => ({ async *stream() { yield ""; }, async complete() { asked = true; return { text: "{}", usage: { input: 0, cachedInput: 0, output: 0 } }; } });
    for (let i = 0; i < DEVICE_DAILY_OBSERVES; i++) await checkObserve(d.usage, "d1", "2026-10-27");
    expect((await worker.handle(post(body), env, d)).status).toBe(429);
    expect(asked).toBe(false);
  });
});
