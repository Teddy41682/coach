import { describe, expect, it } from "vitest";
import { observeFrame, type ObserveContext } from "../src/observe";
import type { Completer } from "../src/model/connector";

const ctx: ObserveContext = {
  recipe: { title: "Scrambled Eggs", ingredients: [{ amount: "3", item: "eggs" }, { amount: "1 pinch", item: "salt" }], steps: ["Crack and beat the eggs with the salt."] },
  stepIndex: 0,
  briefing: { done: "Smooth, no streaks of white.", mistakes: "Forgetting the salt.", tip: "" },
  recent: ["0:12 cracked 2 eggs into the bowl"],
};
const usage = { input: 900, cachedInput: 0, output: 40 };
const answering = (text: string): Completer => ({ async complete() { return { text, usage }; } });

describe("observeFrame", () => {
  it("returns the new events, any interjection, and the real usage", async () => {
    const r = await observeFrame(ctx, "QUFB", answering('{"events":["shook salt over the bowl"],"interject":null}'));
    expect(r).toEqual({ events: ["shook salt over the bowl"], interject: null, usage });
  });
  it("tolerates a fenced answer", async () => {
    const r = await observeFrame(ctx, "QUFB", answering('```json\n{"events":["picked up a fork"],"interject":null}\n```'));
    expect(r.events).toEqual(["picked up a fork"]);
  });
  it("an answer that isn't JSON means nothing seen, not a crash", async () => {
    expect(await observeFrame(ctx, "QUFB", answering("I see a bowl."))).toEqual({ events: [], interject: null, usage });
  });
  it("keeps at most 5 events of at most 100 characters", async () => {
    const many = JSON.stringify({ events: Array.from({ length: 8 }, (_, i) => `e${i} ` + "x".repeat(150)), interject: null });
    const r = await observeFrame(ctx, "QUFB", answering(many));
    expect(r.events).toHaveLength(5);
    expect(r.events.every((e) => e.length <= 100)).toBe(true);
  });
  it("drops an interjection longer than one short sentence", async () => {
    const r = await observeFrame(ctx, "QUFB", answering(JSON.stringify({ events: [], interject: "x".repeat(161) })));
    expect(r.interject).toBeNull();
  });
  it("passes the step, its briefing and the recent log to the model, with the frame", async () => {
    let seen: { system: string; user: string; images: string[] } | undefined;
    const spy: Completer = { async complete(req) { seen = req; return { text: '{"events":[]}', usage }; } };
    await observeFrame(ctx, "FRAME", spy);
    expect(seen!.images).toEqual(["FRAME"]);
    expect(seen!.system).toContain("Crack and beat the eggs with the salt.");
    expect(seen!.system).toContain("Forgetting the salt.");
    expect(seen!.user).toContain("0:12 cracked 2 eggs into the bowl");
  });
  it("a model error means nothing seen", async () => {
    const broken: Completer = { async complete() { throw new Error("down"); } };
    expect(await observeFrame(ctx, "QUFB", broken)).toEqual({ events: [], interject: null, usage: { input: 0, cachedInput: 0, output: 0 } });
  });
});
