import { describe, expect, it } from "vitest";
import { ASK, SAFE, detectSlip, keptNumbers, scaleRecipe, slipEvents, template, type VerdictEvent } from "../src/expertise/cooking-pack/slip";
import { rule } from "../src/expertise/cooking-pack/verdict";
import type { ModelConnector } from "../src/model/connector";
import type { CoachEvent } from "../src/sse";
import { COOKIES, CUPCAKES, FIXTURE } from "./fixture-pack";

const saying = (text: string, calls: { n: number } = { n: 0 }): ModelConnector =>
  ({ async *stream() { calls.n++; yield text; } });
type Ev = CoachEvent | VerdictEvent;
const collect = async (it: AsyncIterable<Ev>) => { const out: Ev[] = []; for await (const e of it) out.push(e); return out; };
const texts = (es: Ev[]) => es.filter((e) => e.type === "text").map((e) => (e as { text: string }).text).join("");

describe("spotting a slip in the cook's words", () => {
  it("an ingredient and a slip word, with or without an amount", () => {
    expect(detectSlip("oh no, way too much vanilla", [], CUPCAKES, FIXTURE)).toEqual({ item: "pure vanilla extract", said: null });
    expect(detectSlip("I put a tablespoon of vanilla in instead of a teaspoon", [], CUPCAKES, FIXTURE))
      .toEqual({ item: "pure vanilla extract", said: { value: 1, unit: "tbsp" } });
    expect(detectSlip("I forgot the baking powder", [], CUPCAKES, FIXTURE)).toEqual({ item: "baking powder", said: { value: 0, unit: "tsp" } });
  });
  it("the answer to the coach's own question", () => {
    const tl = [`0:41 coach: ${ASK("pure vanilla extract")}`];
    expect(detectSlip("about a tablespoon", tl, CUPCAKES, FIXTURE)).toEqual({ item: "pure vanilla extract", said: { value: 1, unit: "tbsp" } });
    expect(detectSlip("not sure", tl, CUPCAKES, FIXTURE)).toEqual({ item: "pure vanilla extract", said: null });
  });
  it("not a slip: a question, or an ingredient named without anything going wrong", () => {
    expect(detectSlip("how's the batter looking?", [], CUPCAKES, FIXTURE)).toBeNull();
    expect(detectSlip("is the vanilla in this step?", [], CUPCAKES, FIXTURE)).toBeNull();
  });
});

describe("handling it", () => {
  const ctx = (said: string[], model: ModelConnector, timeline: string[] = []) =>
    collect(slipEvents(detectSlip(said.at(-1)!, timeline, CUPCAKES, FIXTURE)!, { recipe: CUPCAKES, kind: "baking", timeline, model, pack: FIXTURE }));

  it("no amount yet: asks how much — a fixed line, no model call", async () => {
    const calls = { n: 0 };
    const es = await ctx(["oh no, way too much vanilla"], saying("x", calls));
    expect(texts(es)).toBe(ASK("pure vanilla extract"));
    expect(calls.n).toBe(0);
  });
  it("asked already and still no number: the safe answer, said once", async () => {
    const es = await ctx(["not sure"], saying("x"), [`0:41 coach: ${ASK("pure vanilla extract")}`]);
    expect(texts(es)).toBe(SAFE("pure vanilla extract"));
  });
  it("an amount: code rules, the model phrases, the numbers survive", async () => {
    const es = await ctx(["about a tablespoon"], saying("No harm done — just make it a bigger batch: add ¾ cup all-purpose flour, ½ cup sugar, 1 large eggs, ¼ cup milk and ¼ cup butter."),
      [`0:41 coach: ${ASK("pure vanilla extract")}`]);
    expect(es[0]).toMatchObject({ type: "verdict", verdict: "fixable", item: "pure vanilla extract" });
    expect(texts(es)).toContain("¾ cup all-purpose flour");
  });
  it("a phrasing that drops a number is replaced by the fixed line with code's numbers", async () => {
    const es = await ctx(["about a tablespoon"], saying("Just add a bit more flour and sugar, you'll be fine."), [`0:41 coach: ${ASK("pure vanilla extract")}`]);
    const r = rule("pure vanilla extract", { value: 1, unit: "tbsp" }, CUPCAKES, "baking", FIXTURE);
    expect(texts(es)).toBe(template(r));
    expect(texts(es)).toContain("¾ cup all-purpose flour");
  });
  it("redo is said plainly", async () => {
    const es = await collect(slipEvents(detectSlip("I put a tablespoon of baking soda in", [], COOKIES, FIXTURE)!,
      { recipe: COOKIES, kind: "baking", timeline: [], model: saying("That much soda will taste soapy — let's start that dough again."), pack: FIXTURE }));
    expect(es[0]).toMatchObject({ type: "verdict", verdict: "redo" });
    expect(texts(es)).toContain("start");
  });
});

describe("numbers and the bigger batch", () => {
  it("keptNumbers checks every quantity code computed", () => {
    const r = rule("pure vanilla extract", { value: 1, unit: "tbsp" }, CUPCAKES, "baking", FIXTURE);
    expect(keptNumbers(template(r), r)).toBe(true);
    expect(keptNumbers("add some flour", r)).toBe(false);
  });
  it("a scaled batch reads every amount scaled", () => {
    const big = scaleRecipe(CUPCAKES, 1.5);
    expect(big.ingredients.find((i) => i.item === "all-purpose flour")?.amount).toBe("2¼ cups");
    expect(big.ingredients.find((i) => i.item === "large eggs")?.amount).toBe("3");
  });
});
