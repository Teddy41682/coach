import { describe, expect, it } from "vitest";
import worker, { type Purpose } from "../src/index";
import { MemorySessionStore } from "../src/session";
import { MemoryUsageStore } from "../src/limits";
import type { ModelConnector } from "../src/model/connector";

const env = { MODEL_API_KEY: "k", COACH_APP_KEY: "app" };
const H = { "Content-Type": "application/json", "X-Coach-Key": "app", "X-Coach-Device": "dev-1" };
const recipe = { title: "Pancakes", ingredients: [{ amount: "200 g", item: "flour" }, { amount: "2", item: "eggs" }], steps: ["Whisk the flour.", "Beat in the eggs."] };

function deps(model: ModelConnector, purposes: string[] = []) {
  return { store: new MemorySessionStore(), usage: new MemoryUsageStore(), model: (p: Purpose) => { purposes.push(p); return model; }, now: () => 1_000 };
}
const linker: ModelConnector = { async *stream() { yield '{"steps":[{"ingredients":["flour"],"done":"No lumps."},{"ingredients":["eggs"]}]}'; } };

describe("POST /v1/session", () => {
  it("creates a session and returns the linked steps", async () => {
    const d = deps(linker);
    const r = await worker.handle(new Request("https://c/v1/session", { method: "POST", headers: H, body: JSON.stringify({ recipe }) }), env, d);
    expect(r.status).toBe(200);
    const body = await r.json() as { sessionId: string; steps: unknown };
    expect(body.steps).toEqual([
      { index: 0, text: "Whisk the flour.", ingredients: ["flour"], risky: [], briefing: { done: "No lumps.", mistakes: "", tip: "", hardToSee: false } },
      { index: 1, text: "Beat in the eggs.", ingredients: ["eggs"], risky: [], briefing: { done: "", mistakes: "", tip: "", hardToSee: false } },
    ]);
    expect((await d.store.get(body.sessionId))?.links[0]).toMatchObject({ ingredients: ["flour"], done: "No lumps." });
  });
  it("needs a device header", async () => {
    const { "X-Coach-Device": _, ...noDevice } = H;
    const r = await worker.handle(new Request("https://c/v1/session", { method: "POST", headers: noDevice, body: JSON.stringify({ recipe }) }), env, deps(linker));
    expect(r.status).toBe(400);
  });
  it("refuses a malformed recipe", async () => {
    const r = await worker.handle(new Request("https://c/v1/session", { method: "POST", headers: H, body: JSON.stringify({ recipe: { title: 3 } }) }), env, deps(linker));
    expect(r.status).toBe(400);
  });
});

describe("POST /v1/turn with sessions", () => {
  it("is 404 for an unknown session", async () => {
    const turn = { sessionId: "nope", stepIndex: 0, utterance: "hi", frames: [], seen: [] };
    const r = await worker.handle(new Request("https://c/v1/turn", { method: "POST", headers: H, body: JSON.stringify(turn) }), env, deps(linker));
    expect(r.status).toBe(404);
  });
  it("frames the question with the session's recipe and the step's ingredients", async () => {
    let system = "";
    const model: ModelConnector = { async *stream(req) { if (req.system.includes("Recipe:")) system = req.system; yield '{"steps":[{"ingredients":["flour"]},{"ingredients":["eggs"],"done":"Smooth."}]}'; } };
    const d = deps(model);
    const made = await worker.handle(new Request("https://c/v1/session", { method: "POST", headers: H, body: JSON.stringify({ recipe }) }), env, d);
    const { sessionId } = await made.json() as { sessionId: string };
    const turn = { sessionId, stepIndex: 1, utterance: "ok?", frames: [], seen: [] };
    const r = await worker.handle(new Request("https://c/v1/turn", { method: "POST", headers: H, body: JSON.stringify(turn) }), env, d);
    await r.text();
    expect(system).toContain("Step 2 of 2: Beat in the eggs.");
    expect(system).toContain("This step uses: eggs");
    expect(system).toContain("Done when: Smooth.");
  });
});

describe("model purposes", () => {
  it("asks for the linking model when a session starts", async () => {
    const purposes: string[] = [];
    await worker.handle(new Request("https://c/v1/session", { method: "POST", headers: H, body: JSON.stringify({ recipe }) }), env, deps(linker, purposes));
    expect(purposes).toEqual(["link"]);
  });
});

describe("sessions belong to their device", () => {
  it("refuses a turn from a device that didn't start the session", async () => {
    const d = deps(linker);
    const made = await worker.handle(new Request("https://c/v1/session", { method: "POST", headers: H, body: JSON.stringify({ recipe }) }), env, d);
    const { sessionId } = await made.json() as { sessionId: string };
    const turn = { sessionId, stepIndex: 0, utterance: "hi", frames: [], seen: [] };
    const r = await worker.handle(new Request("https://c/v1/turn", { method: "POST", headers: { ...H, "X-Coach-Device": "other" }, body: JSON.stringify(turn) }), env, d);
    expect(r.status).toBe(403);
  });
});
