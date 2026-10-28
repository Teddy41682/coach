import { describe, expect, it } from "vitest";
import worker, { type Purpose } from "../src/index";
import { MemorySessionStore } from "../src/session";
import { MemoryUsageStore, DEVICE_DAILY_TURNS } from "../src/limits";
import { verifyToken, TOKEN_MAX_LIFETIME_S, TOKEN_SKEW_S } from "../src/token";
import type { ModelConnector } from "../src/model/connector";

const SECRET = "test-token-secret-0123456789abcdef";
const NOW_S = 1_800_000_000;
const SUB = "0123456789abcdef0123456789abcdef";

/** The host app's side, written independently of the Worker's verifier. */
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function sign(payload: unknown, secret = SECRET): Promise<string> {
  const head = "v1." + b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(head)));
  return head + "." + b64url(mac);
}
const claims = (over: Record<string, unknown> = {}) =>
  ({ sub: SUB, aud: "coach", iat: NOW_S, exp: NOW_S + 3600, jti: "00112233445566778899aabbccddeeff", ...over });

describe("verifyToken", () => {
  it("accepts a good token and returns its sub", async () => {
    expect(await verifyToken(await sign(claims()), SECRET, NOW_S * 1000)).toBe(SUB);
  });
  it("refuses a token signed with another secret", async () => {
    expect(await verifyToken(await sign(claims(), "another-secret"), SECRET, NOW_S * 1000)).toBeNull();
  });
  it("refuses a payload changed after signing", async () => {
    const good = await sign(claims());
    const [v, , mac] = good.split(".");
    const forged = b64url(new TextEncoder().encode(JSON.stringify(claims({ sub: "f".repeat(32) }))));
    expect(await verifyToken(`${v}.${forged}.${mac}`, SECRET, NOW_S * 1000)).toBeNull();
  });
  it("refuses another audience", async () => {
    expect(await verifyToken(await sign(claims({ aud: "other" })), SECRET, NOW_S * 1000)).toBeNull();
  });
  it("refuses an expired token, allowing 60 s of skew", async () => {
    const t = await sign(claims({ iat: NOW_S - 3600, exp: NOW_S }));
    expect(await verifyToken(t, SECRET, (NOW_S + TOKEN_SKEW_S) * 1000)).toBe(SUB);
    expect(await verifyToken(t, SECRET, (NOW_S + TOKEN_SKEW_S + 1) * 1000)).toBeNull();
  });
  it("refuses a lifetime over an hour", async () => {
    expect(TOKEN_MAX_LIFETIME_S).toBe(3600);
    expect(await verifyToken(await sign(claims({ exp: NOW_S + 3601 })), SECRET, NOW_S * 1000)).toBeNull();
  });
  it("refuses a token issued in the future beyond the skew", async () => {
    expect(await verifyToken(await sign(claims({ iat: NOW_S + 120, exp: NOW_S + 1200 })), SECRET, NOW_S * 1000)).toBeNull();
  });
  it("refuses a malformed sub, version or shape", async () => {
    expect(await verifyToken(await sign(claims({ sub: "*" })), SECRET, NOW_S * 1000)).toBeNull();
    expect(await verifyToken((await sign(claims())).replace(/^v1/, "v2"), SECRET, NOW_S * 1000)).toBeNull();
    expect(await verifyToken("v1.abc", SECRET, NOW_S * 1000)).toBeNull();
    expect(await verifyToken("not a token", SECRET, NOW_S * 1000)).toBeNull();
  });
  it("refuses every token when no secret is configured", async () => {
    expect(await verifyToken(await sign(claims()), "", NOW_S * 1000)).toBeNull();
    expect(await verifyToken(await sign(claims()), undefined, NOW_S * 1000)).toBeNull();
  });
});

const recipe = { title: "Pancakes", ingredients: [{ amount: "2", item: "eggs" }], steps: ["Beat the eggs."] };
const linker: ModelConnector = { async *stream() { yield '{"steps":[{"ingredients":["eggs"]}]}'; } };
const answerer: ModelConnector = { async *stream() { yield "Keep going."; } };
function deps() {
  return {
    store: new MemorySessionStore(), usage: new MemoryUsageStore(),
    model: (p: Purpose) => (p === "link" ? linker : answerer), now: () => NOW_S * 1000,
  };
}
const env = { MODEL_API_KEY: "k", COACH_APP_KEY: "app", COACH_TOKEN_SECRET: SECRET };
const post = (path: string, body: unknown, headers: Record<string, string>) =>
  new Request(`https://c${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("a token from the host app at the door", () => {
  it("starts a session owned by its sub, with no device header needed", async () => {
    const d = deps();
    const r = await worker.handle(post("/v1/session", { recipe }, { "X-Coach-Key": await sign(claims()) }), env, d);
    expect(r.status).toBe(200);
    const { sessionId } = await r.json() as { sessionId: string };
    expect((await d.store.get(sessionId))?.device).toBe(`sub:${SUB}`);
  });
  it("is refused when the Worker has no token secret, while the app key still works", async () => {
    const noSecret = { MODEL_API_KEY: "k", COACH_APP_KEY: "app" };
    expect((await worker.handle(post("/v1/session", { recipe }, { "X-Coach-Key": await sign(claims()) }), noSecret, deps())).status).toBe(401);
    expect((await worker.handle(post("/v1/session", { recipe }, { "X-Coach-Key": "app", "X-Coach-Device": "d1" }), noSecret, deps())).status).toBe(200);
  });
  it("is refused when bad, expired or for another audience", async () => {
    for (const t of [await sign(claims(), "wrong"), await sign(claims({ aud: "x" })), await sign(claims({ iat: NOW_S - 7200, exp: NOW_S - 3600 }))]) {
      expect((await worker.handle(post("/v1/session", { recipe }, { "X-Coach-Key": t }), env, deps())).status).toBe(401);
    }
  });
  it("keeps a token's session from a device caller and from another sub", async () => {
    const d = deps();
    const r = await worker.handle(post("/v1/session", { recipe }, { "X-Coach-Key": await sign(claims()) }), env, d);
    const { sessionId } = await r.json() as { sessionId: string };
    const turn = { sessionId, stepIndex: 0, utterance: "hi", frames: [], seen: [] };
    // The device header can't claim it: the colon in `sub:` is not a legal device id.
    expect((await worker.handle(post("/v1/turn", turn, { "X-Coach-Key": "app", "X-Coach-Device": `sub:${SUB}` }), env, d)).status).toBe(400);
    expect((await worker.handle(post("/v1/turn", turn, { "X-Coach-Key": "app", "X-Coach-Device": SUB }), env, d)).status).toBe(403);
    const other = await sign(claims({ sub: "f".repeat(32) }));
    expect((await worker.handle(post("/v1/turn", turn, { "X-Coach-Key": other }), env, d)).status).toBe(403);
    expect((await worker.handle(post("/v1/turn", turn, { "X-Coach-Key": await sign(claims()) }), env, d)).status).toBe(200);
  });
  it("counts the daily turn cap against the sub, whatever device id is sent", async () => {
    const d = deps();
    const made = await worker.handle(post("/v1/session", { recipe }, { "X-Coach-Key": await sign(claims()) }), env, d);
    const { sessionId } = await made.json() as { sessionId: string };
    const turn = { sessionId, stepIndex: 0, utterance: "hi", frames: [], seen: [] };
    // The session start already counted one turn against the sub.
    for (let i = 1; i < DEVICE_DAILY_TURNS; i++) {
      const t = await sign(claims({ jti: i.toString(16).padStart(32, "0") }));
      await worker.handle(post("/v1/turn", turn, { "X-Coach-Key": t, "X-Coach-Device": `phone-${i}` }), env, d);
    }
    const r = await worker.handle(post("/v1/turn", turn, { "X-Coach-Key": await sign(claims()), "X-Coach-Device": "fresh" }), env, d);
    expect(await r.text()).toContain("today's limit");
  });
});
