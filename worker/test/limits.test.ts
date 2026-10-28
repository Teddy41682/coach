import { describe, expect, it } from "vitest";
import { MemoryUsageStore, checkAndCount, checkObserve, costOf, realMillicents, settleObserve, OBSERVE_RESERVE_MILLICENTS, OBSERVE_MIN_MILLICENTS, DEVICE_DAILY_OBSERVES, DEVICE_DAILY_TURNS, GLOBAL_DAILY_CENTS, LIMIT_LINE, LINK_CENTS } from "../src/limits";
import worker from "../src/index";
import { MemorySessionStore } from "../src/session";
import type { ModelConnector } from "../src/model/connector";

const day = "2026-10-27";

describe("costOf — an upper bound on what a request can cost", () => {
  it("charges more for more photos", () => {
    expect(costOf(0)).toBe(1);
    expect(costOf(1)).toBe(2);
    expect(costOf(8)).toBe(3); // 8 frames ≈ 12k tokens ≈ 1.6¢ measured-price ceiling
  });
  it("charges linking its own cost", () => expect(LINK_CENTS).toBeGreaterThanOrEqual(1));
});

describe("checkAndCount", () => {
  it("lets a device through until its daily cap, then refuses it", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < DEVICE_DAILY_TURNS; i++) expect(await checkAndCount(u, "d1", day, 1)).toBe("ok");
    expect(await checkAndCount(u, "d1", day, 1)).toBe("device");
    expect(await checkAndCount(u, "d2", day, 1)).toBe("ok");
  });
  it("resets each day", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < DEVICE_DAILY_TURNS; i++) await checkAndCount(u, "d1", day, 1);
    expect(await checkAndCount(u, "d1", "2026-10-28", 1)).toBe("ok");
  });
  it("refuses every device once the day's spend would pass the global cap", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < GLOBAL_DAILY_CENTS; i++) await checkAndCount(u, `dev-${i % 100}`, day, 1);
    expect(await checkAndCount(u, "fresh-device", day, 1)).toBe("global");
  });
  it("counts a request's real cost against the global cap", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < GLOBAL_DAILY_CENTS - 2; i++) await checkAndCount(u, `dev-${i % 100}`, day, 1);
    expect(await checkAndCount(u, "x", day, 3)).toBe("global");
    expect(await checkAndCount(u, "x", day, 2)).toBe("ok");
  });
  it("counts nothing for a refused request", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i <= DEVICE_DAILY_TURNS + 5; i++) await checkAndCount(u, "d1", day, 1);
    expect(await u.totalCents(day)).toBe(DEVICE_DAILY_TURNS);
  });
  it("holds the device cap under a burst of simultaneous requests", async () => {
    const u = new MemoryUsageStore();
    const results = await Promise.all(Array.from({ length: DEVICE_DAILY_TURNS + 40 }, () => checkAndCount(u, "d1", day, 1)));
    expect(results.filter((r) => r === "ok")).toHaveLength(DEVICE_DAILY_TURNS);
  });
});

describe("checkObserve", () => {
  it("lets a device observe until its own daily cap", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < DEVICE_DAILY_OBSERVES; i++) {
      expect(await checkObserve(u, "d1", day)).toBe("ok");
      await settleObserve(u, day, 300);
    }
    expect(await checkObserve(u, "d1", day)).toBe("device");
  });
  it("reserves a look's worst case before it happens, then settles to the real cost", async () => {
    const u = new MemoryUsageStore();
    await checkObserve(u, "d1", day);
    expect(await u.totalCents(day)).toBe(Math.floor(OBSERVE_RESERVE_MILLICENTS / 1000));
    await settleObserve(u, day, 400);
    expect(await u.totalCents(day)).toBe(0);
    await checkObserve(u, "d1", day); await settleObserve(u, day, 700);
    expect(await u.totalCents(day)).toBe(1);   // 0.4¢ + 0.7¢
  });
  it("refuses a look when its reserve won't fit under the day's cap", async () => {
    const u = new MemoryUsageStore();
    await u.chargeMillicents(day, (GLOBAL_DAILY_CENTS - 1) * 1000);
    expect(await checkObserve(u, "d1", day)).toBe("global");
  });
  it("simultaneous looks each reserve, so together they can't pass the cap", async () => {
    const u = new MemoryUsageStore();
    await u.chargeMillicents(day, (GLOBAL_DAILY_CENTS - 5) * 1000);
    const r = await Promise.all(Array.from({ length: 10 }, (_, i) => checkObserve(u, `d${i}`, day)));
    expect(r.filter((x) => x === "ok").length).toBeLessThanOrEqual(Math.floor(5_000 / OBSERVE_RESERVE_MILLICENTS));
  });
  it("a failed look still costs the minimum", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < 10; i++) { await checkObserve(u, "d1", day); await settleObserve(u, day, 0); }
    expect(await u.totalCents(day)).toBe(Math.floor(10 * OBSERVE_MIN_MILLICENTS / 1000));
  });
  it("charges each look's real cost, and fractions of a cent add up", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < 3; i++) await u.chargeMillicents(day, 400);   // 0.4¢ each
    expect(await u.totalCents(day)).toBe(1);                          // 1.2¢ so far → 1 whole cent
    await u.chargeMillicents(day, 900);                               // 2.1¢
    expect(await u.totalCents(day)).toBe(2);
  });
  it("realMillicents prices tokens at muse-spark-1.3 standard rates", () => {
    // 1M input − 200k cached at $1.25/M + 200k cached at $0.15/M + 100k output at $4.25/M = $1.455 = 145.5¢
    expect(realMillicents({ input: 1_000_000, cachedInput: 200_000, output: 100_000 })).toBe(145_500);
  });
  it("stops observing when the global cap is spent", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < GLOBAL_DAILY_CENTS; i++) await checkAndCount(u, `dev-${i % 100}`, day, 1);
    expect(await checkObserve(u, "fresh", day)).toBe("global");
  });
  it("observations don't use up the device's turns", async () => {
    const u = new MemoryUsageStore();
    for (let i = 0; i < 200; i++) { await checkObserve(u, "d1", day); await settleObserve(u, day, 300); }
    expect(await checkAndCount(u, "d1", day, 1)).toBe("ok");
  });
});

describe("a capped turn", () => {
  it("is spoken, and the model is never called", async () => {
    let called = false;
    const model: ModelConnector = { async *stream() { called = true; yield "x"; } };
    const store = new MemorySessionStore();
    await store.put({ id: "s1", device: "d1", recipe: { title: "T", ingredients: [], steps: ["a"] }, links: [{ ingredients: [], done: "", mistakes: "", tip: "", hardToSee: false }], createdAt: 0 });
    const usage = new MemoryUsageStore();
    for (let i = 0; i < DEVICE_DAILY_TURNS; i++) await checkAndCount(usage, "d1", day, 1);
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
  it("refuses a device id that isn't plain letters, digits, - _ or . (e.g. the global row's '*')", async () => {
    const deps = { store: new MemorySessionStore(), usage: new MemoryUsageStore(), model: () => ({ async *stream() { yield ""; } }), now: () => 0 };
    for (const device of ["*", "a b", "x;DROP", ""]) {
      const r = await worker.handle(new Request("https://c/v1/session", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Coach-Key": "app", "X-Coach-Device": device },
        body: JSON.stringify({ recipe: { title: "T", ingredients: [], steps: [] } }),
      }), { MODEL_API_KEY: "k", COACH_APP_KEY: "app" }, deps);
      expect(r.status, device).toBe(400);
    }
  });
});
