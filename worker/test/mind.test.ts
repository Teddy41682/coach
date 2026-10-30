import { describe, expect, it } from "vitest";
import { isMindRequest, wakeMind, type MindContext } from "../src/mind";
import { mindSystem, mindUser } from "../src/expertise/mind-prompt";
import type { Completer, ModelRequest } from "../src/model/connector";

const recipe = { title: "Eggs on Toast", ingredients: [{ amount: "2 slices", item: "bread" }], steps: ["Put the bread in the toaster.", "Crack the eggs."] };
const ctx = (over: Partial<MindContext> = {}): MindContext => ({
  recipe, stepIndex: 0, wake: "changed", timeline: ["0:05 coach: Step 1: Put the bread in the toaster."], quietFor: 12,
  held: false, finished: false, briefing: { done: "Bread is in the slots.", mistakes: "", tip: "", hardToSee: false },
  frame: "NEW", previous: "OLD", ...over,
});
const used = { input: 900, cachedInput: 0, output: 200 };
function model(text: string, seen: ModelRequest[] = []): Completer {
  return { async complete(req) { seen.push(req); return { text, usage: used }; } };
}

describe("wakeMind", () => {
  it("returns what the mind saw, said and decided, with its usage", async () => {
    const a = await wakeMind(ctx(), model('{"seen":["put two slices in the toaster"],"say":null,"step":"stay"}'));
    expect(a).toEqual({ seen: ["put two slices in the toaster"], say: null, step: "stay", usage: used });
  });
  it("says a line and moves on when it judges so", async () => {
    const a = await wakeMind(ctx(), model('Sure: {"seen":[],"say":"Bread\'s in — now the eggs.","step":"next"}'));
    expect(a.say).toBe("Bread's in — now the eggs.");
    expect(a.step).toBe("next");
  });
  it("treats anything malformed as nothing seen, nothing said, stay — keeping the usage", async () => {
    expect(await wakeMind(ctx(), model("I think the bread is in"))).toEqual({ seen: [], say: null, step: "stay", usage: used });
  });
  it("an unknown step is stay; an over-long line is not said", async () => {
    const a = await wakeMind(ctx(), model(`{"seen":[],"say":"${"x".repeat(201)}","step":"jump"}`));
    expect(a.step).toBe("stay");
    expect(a.say).toBeNull();
  });
  it("keeps at most five short events", async () => {
    const a = await wakeMind(ctx(), model(JSON.stringify({ seen: ["a", "b", "c", "d", "e", "f", "y".repeat(150)], say: null, step: "hold" })));
    expect(a.seen).toEqual(["a", "b", "c", "d", "e"]);
    expect(a.step).toBe("hold");
  });
  it("a failed call is silence with zero usage", async () => {
    const failing: Completer = { async complete() { throw new Error("down"); } };
    expect(await wakeMind(ctx(), failing)).toEqual({ seen: [], say: null, step: "stay", usage: { input: 0, cachedInput: 0, output: 0 } });
  });
  it("shows the previous look then the newest, and only the newest when there is no previous", async () => {
    const seen: ModelRequest[] = [];
    await wakeMind(ctx(), model("{}", seen));
    await wakeMind(ctx({ previous: undefined }), model("{}", seen));
    await wakeMind(ctx({ frame: undefined, previous: undefined }), model("{}", seen));
    expect(seen.map((r) => r.images)).toEqual([["OLD", "NEW"], ["NEW"], []]);
  });
});

describe("the mind's prompt", () => {
  it("carries the recipe, the step, its briefing, the wake, the quiet and the timeline", () => {
    const s = mindSystem(ctx(), false), u = mindUser(ctx());
    expect(s).toContain("Step 1 of 2: Put the bread in the toaster.");
    expect(s).toContain("Bread is in the slots.");
    expect(u).toContain("0:05 coach: Step 1");
    expect(u).toContain("12 s");
    expect(u).toMatch(/picture changed/i);
  });
  it("asks for JSON on an eye wake and a spoken answer with a control line on a spoken one", () => {
    expect(mindSystem(ctx(), false)).toContain('"say"');
    const spoken = mindSystem(ctx({ wake: "spoke", utterance: "is it in?" }), true);
    expect(spoken).toContain("[[hold]]");
    expect(mindUser(ctx({ wake: "spoke", utterance: "is it in?" }))).toContain("Cook: is it in?");
  });
  it("says when no photo came, and when the place is held or the recipe is finished", () => {
    expect(mindUser(ctx({ frame: undefined, previous: undefined }))).toMatch(/no photo/i);
    expect(mindUser(ctx({ held: true }))).toMatch(/holding the place/i);
    expect(mindUser(ctx({ finished: true }))).toMatch(/finished/i);
  });
});

describe("isMindRequest", () => {
  const ok = { sessionId: "s1", stepIndex: 0, wake: "heartbeat", timeline: [], quietFor: 3 };
  it("takes a plain eye wake", () => expect(isMindRequest(ok)).toBe(true));
  it("refuses a bad wake, a long timeline or line, a negative or infinite quiet", () => {
    expect(isMindRequest({ ...ok, wake: "nap" })).toBe(false);
    expect(isMindRequest({ ...ok, timeline: Array(51).fill("x") })).toBe(false);
    expect(isMindRequest({ ...ok, timeline: ["x".repeat(201)] })).toBe(false);
    expect(isMindRequest({ ...ok, quietFor: -1 })).toBe(false);
    expect(isMindRequest({ ...ok, quietFor: "5" })).toBe(false);
  });
  it("a spoken wake needs words; frames are a short list of base64", () => {
    expect(isMindRequest({ ...ok, wake: "spoke" })).toBe(false);
    expect(isMindRequest({ ...ok, wake: "spoke", utterance: "hi", frames: ["QUFB"] })).toBe(true);
    expect(isMindRequest({ ...ok, wake: "spoke", utterance: "hi", frames: Array(9).fill("QUFB") })).toBe(false);
    expect(isMindRequest({ ...ok, frame: "not base64!" })).toBe(false);
  });
});

describe("the mind's judgement, v4 (his first PB&J, 2026-10-30)", () => {
  it("lets the coach lean over with one expert touch a step, and keeps it honest", async () => {
    const { mindSystem } = await import("../src/expertise/mind-prompt");
    const ctx = { sessionId: "s", stepIndex: 0, wake: "changed", timeline: [], quietFor: 0,
      recipe: { title: "PB&J", ingredients: [], steps: ["Spread it."] }, stepIngredients: [],
      briefing: { done: "", mistakes: "", tip: "", hardToSee: false } } as never;
    const s = mindSystem(ctx, false);
    expect(s).toContain("lean in the way a chef would");
    expect(s).toContain("you don't have to be quiet");
    expect(s).toContain("Be honest about what the photos show");
    expect(s).not.toContain("Unprompted is never for tips");
  });
});

describe("the mind's judgement, v7 (his fourth PB&J: 'talking so fast')", () => {
  it("asks for an unhurried rhythm, no follow-ups on itself, nothing invented, and lets the hello breathe", async () => {
    const { mindSystem } = await import("../src/expertise/mind-prompt");
    const ctx = { sessionId: "s", stepIndex: 0, wake: "spoke", timeline: [], quietFor: 0,
      recipe: { title: "PB&J", ingredients: [], steps: ["Spread it."] }, stepIngredients: [],
      briefing: { done: "", mistakes: "", tip: "", hardToSee: false } } as never;
    const s = mindSystem(ctx, true);
    expect(s).toContain("calm, unhurried adult");
    expect(s).toContain("Never follow up on your own last line");
    expect(s).toContain("Never invent a problem");
    expect(s).toContain("opens with you introducing yourself");
  });
});

describe("the mind's judgement, v8 (his sixth PB&J: tortillas passed as bread)", () => {
  it("puts the coach in charge: checks against the recipe, directs the fix, never calls a wrong step done", async () => {
    const { mindSystem } = await import("../src/expertise/mind-prompt");
    const ctx = { sessionId: "s", stepIndex: 0, wake: "changed", timeline: [], quietFor: 0,
      recipe: { title: "PB&J", ingredients: [], steps: ["Lay two slices of bread on a plate."] }, stepIngredients: [],
      briefing: { done: "", mistakes: "", tip: "", hardToSee: false } } as never;
    const s = mindSystem(ctx, false);
    expect(s).toContain("You are the chef in charge");
    expect(s).toContain("Tortillas are not sandwich bread");
    expect(s).toContain("Never call a step done because the cook says so");
  });
});

describe("the mind's judgement, v9 (his seventh PB&J: 'too quiet a lot of the time')", () => {
  it("stays with the cook while their hands work, claims only the newest photo, and keeps to one method", async () => {
    const { mindSystem } = await import("../src/expertise/mind-prompt");
    const ctx = { sessionId: "s", stepIndex: 0, wake: "changed", timeline: [], quietFor: 0,
      recipe: { title: "PB&J", ingredients: [], steps: ["Cut it in half."] }, stepIngredients: [],
      briefing: { done: "", mistakes: "", tip: "", method: "One firm press straight down with a sharp knife.", hardToSee: false } } as never;
    const s = mindSystem(ctx, false);
    expect(s).toContain("coach at their shoulder");
    expect(s).toContain("Only claim to see what is in the newest photo");
    expect(s).toContain("never contradict it: One firm press straight down");
  });
});

describe("the mind's judgement, v10 (his eighth PB&J: 'some opportunity for humor')", () => {
  it("has a dry, kind humour and never restates a cue", async () => {
    const { mindSystem } = await import("../src/expertise/mind-prompt");
    const ctx = { sessionId: "s", stepIndex: 0, wake: "changed", timeline: [], quietFor: 0,
      recipe: { title: "PB&J", ingredients: [], steps: ["Spread it."] }, stepIngredients: [],
      briefing: { done: "", mistakes: "", tip: "", hardToSee: false } } as never;
    const s = mindSystem(ctx, false);
    expect(s).toContain("dry, warm sense of humour");
    expect(s).toContain("Never at the cook's expense");
    expect(s).toContain("don't repeat a cue in new words");
  });
});
