import { describe, expect, it } from "vitest";
import { MemoryUsageStore, checkAndCount, DEVICE_DAILY_TURNS, GLOBAL_DAILY_CENTS, EST_CENTS_PER_TURN, LIMIT_LINE } from "../src/limits";
import worker from "../src/index";
import { MemorySessionStore } from "../src/session";
import type { ModelConnector } from "../src/model/connector";

describe("checkAndCount", () => {
  it("lets a device through until its daily cap, then refuses it", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < DEVICE_DAILY_TURNS; i++) expect(await checkAndCount(u, "d1", "2026-10-27")).toBe("ok");
    expect(await checkAndCount(u, "d1", "2026-10-27")).toBe("device");
    expect(await checkAndCount(u, "d2", "2026-10-27")).toBe("ok");
  });
  it("resets each day", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < DEVICE_DAILY_TURNS; i++) await checkAndCount(u, "d1", "2026-10-27");
    expect(await checkAndCount(u, "d1", "2026-10-28")).toBe("ok");
  });
  it("refuses every device once the day's estimated spend reaches the global cap", async () => {
    const u = new MemoryUsageStore();
    const turnsToCap = GLOBAL_DAILY_CENTS / EST_CENTS_PER_TURN;
    for (let i = 0; i < turnsToCap; i++) await checkAndCount(u, `dev-${i % 100}`, "2026-10-27");
    expect(await checkAndCount(u, "fresh-device", "2026-10-27")).toBe("global");
  });
  it("does not count a refused turn", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i <= DEVICE_DAILY_TURNS + 5; i++) await checkAndCount(u, "d1", "2026-10-27");
    expect(await u.totalCents("2026-10-27")).toBe(DEVICE_DAILY_TURNS * EST_CENTS_PER_TURN);
  });
});

describe("a capped turn", () => {
  it("is spoken, and the model is never called", async () => {
    let called = false;
    const model: ModelConnector = { async *stream() { called = true; yield "x"; } };
    const store = new MemorySessionStore();
    await store.put({ id: "s1", device: "d1", recipe: { title: "T", ingredients: [], steps: ["a"] }, links: [[]], createdAt: 0 });
    const usage = new MemoryUsageStore();
    for (let i = 0; i < DEVICE_DAILY_TURNS; i++) await checkAndCount(usage, "d1", "2026-10-27");
    const deps = { store, usage, model: () => model, now: () => Date.parse("2026-10-27T20:00:00Z") };
    const r = await worker.handle(new Request("https://c/v1/turn", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Coach-Key": "app", "X-Coach-Device": "d1" },
      body: JSON.stringify({ sessionId: "s1", stepIndex: 0, utterance: "hi", frames: [], seen: [] }),
    }), { MODEL_API_KEY: "k", COACH_APP_KEY: "app" }, deps);
    expect(await r.text()).toContain(LIMIT_LINE);
    expect(called).toBe(false);
  });
  it("needs a device header", async () => {
    const deps = { store: new MemorySessionStore(), usage: new MemoryUsageStore(), model: () => ({ async *stream() { yield ""; } }), now: () => 0 };
    const r = await worker.handle(new Request("https://c/v1/turn", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Coach-Key": "app" },
      body: JSON.stringify({ sessionId: "s1", stepIndex: 0, utterance: "hi", frames: [], seen: [] }),
    }), { MODEL_API_KEY: "k", COACH_APP_KEY: "app" }, deps);
    expect(r.status).toBe(400);
  });
});
