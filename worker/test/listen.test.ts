import { describe, expect, it } from "vitest";
import worker, { type Deps } from "../src/index";
import { MAX_HELD_BYTES, museConfig, relay, type Sock } from "../src/listen";
import { GLOBAL_DAILY_CENTS, hstDay, MemoryUsageStore } from "../src/limits";
import { MemorySessionStore } from "../src/session";

/** A socket that records what it was sent and lets a test play the other side. */
class Fake implements Sock {
  sent: (string | ArrayBuffer)[] = [];
  closed: { code?: number; reason?: string } | null = null;
  private on: Record<string, ((e: any) => void)[]> = {};
  send(d: string | ArrayBuffer) { this.sent.push(d); }
  close(code?: number, reason?: string) { this.closed = { code, reason }; this.fire("close"); }
  addEventListener(type: string, fn: (e: any) => void) { (this.on[type] ??= []).push(fn); }
  fire(type: string, data?: string | ArrayBuffer) { for (const fn of this.on[type] ?? []) fn({ data }); }
}
const audio = (n: number) => new Uint8Array(n).buffer;
const never = (() => 0) as unknown as typeof setTimeout;

describe("the relay to Muse", () => {
  it("sends Muse our key first, holds the phone's audio until Muse answers, then pipes both ways", () => {
    const phone = new Fake(), muse = new Fake();
    relay(phone, muse, "meta-key", 1000, never);
    expect(muse.sent).toEqual([museConfig("meta-key")]);
    const a = audio(4800);
    phone.fire("message", a);
    expect(muse.sent).toHaveLength(1);
    muse.fire("message", '{"sessionId":"x"}');
    expect(muse.sent[1]).toBe(a);
    expect(phone.sent).toEqual(['{"sessionId":"x"}']);
    phone.fire("message", a);
    muse.fire("message", '{"type":"speechComplete","transcript":"Is the pan hot?"}');
    expect(muse.sent).toHaveLength(3);
    expect(phone.sent[1]).toContain("Is the pan hot?");
  });
  it("never tells the phone the Meta key", () => {
    const phone = new Fake(), muse = new Fake();
    relay(phone, muse, "meta-key", 1000, never);
    muse.fire("message", '{"sessionId":"x"}');
    expect(phone.sent.join("")).not.toContain("meta-key");
  });
  it("closes Muse when the phone goes, and the phone when Muse goes", () => {
    const p1 = new Fake(), m1 = new Fake();
    relay(p1, m1, "k", 1000, never);
    p1.fire("close");
    expect(m1.closed).not.toBeNull();
    const p2 = new Fake(), m2 = new Fake();
    relay(p2, m2, "k", 1000, never);
    m2.fire("error");
    expect(p2.closed?.code).toBe(1011);
  });
  it("gives up when Muse never answers and the held audio piles up", () => {
    const phone = new Fake(), muse = new Fake();
    relay(phone, muse, "k", 1000, never);
    for (let i = 0; i * 4800 <= MAX_HELD_BYTES; i++) phone.fire("message", audio(4800));
    expect(phone.closed?.reason).toBe("muse_silent");
  });
  it("closes both after the longest cook", () => {
    const phone = new Fake(), muse = new Fake();
    let fire = () => {};
    relay(phone, muse, "k", 1000, ((fn: () => void) => { fire = fn; return 0; }) as unknown as typeof setTimeout);
    fire();
    expect(phone.closed?.reason).toBe("too_long");
    expect(muse.closed).not.toBeNull();
  });
});

const env = { MODEL_API_KEY: "k", COACH_APP_KEY: "app-secret" };
const H = { "X-Coach-Key": "app-secret", "X-Coach-Device": "dev-1", Upgrade: "websocket" };
const get = (headers: Record<string, string>) => new Request("https://coach.test/v1/listen", { headers });
function deps(opened: Sock | null = null, usage = new MemoryUsageStore()): Deps & { asked: number } {
  const d = { store: new MemorySessionStore(), usage, model: () => { throw new Error("no model"); }, now: () => Date.now(), asked: 0,
    muse: async () => { d.asked++; return opened; } };
  return d as Deps & { asked: number };
}

describe("the /v1/listen door", () => {
  it("refuses without the key or a device, before opening Muse", async () => {
    const d = deps();
    expect((await worker.handle(get({ ...H, "X-Coach-Key": "wrong" }), env, d)).status).toBe(401);
    expect((await worker.handle(get({ "X-Coach-Key": "app-secret", Upgrade: "websocket" }), env, d)).status).toBe(400);
    expect(d.asked).toBe(0);
  });
  it("is a WebSocket only", async () => {
    const d = deps();
    expect((await worker.handle(get({ "X-Coach-Key": "app-secret", "X-Coach-Device": "dev-1" }), env, d)).status).toBe(426);
    expect(d.asked).toBe(0);
  });
  it("stops at the day's global cap", async () => {
    const usage = new MemoryUsageStore();
    await usage.tryAdd(hstDay(Date.now()), "dev-9", GLOBAL_DAILY_CENTS, 10_000, 1_000_000);
    const d = deps(null, usage);
    expect((await worker.handle(get(H), env, d)).status).toBe(429);
    expect(d.asked).toBe(0);
  });
  it("says so when Muse won't open", async () => {
    expect((await worker.handle(get(H), env, deps(null))).status).toBe(502);
  });
});
