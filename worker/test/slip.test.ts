import { describe, expect, it } from "vitest";
import { ASK, CARRY_ON, SAFE, SPOT_ON, detectSlip, keptNumbers, scaleRecipe, slipEvents, template, type VerdictEvent } from "../src/expertise/cooking-pack/slip";
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

describe("not mistaking questions and plain statements for slips (the final review's probes)", () => {
  it("a question is not a slip, even with a slip word in it", () => {
    expect(detectSlip("can I use honey instead of sugar?", [], CUPCAKES, FIXTURE)).toBeNull();
    expect(detectSlip("should I add extra vanilla?", [], CUPCAKES, FIXTURE)).toBeNull();
    expect(detectSlip("I forgot how much vanilla goes in", [], CUPCAKES, FIXTURE)).toBeNull();
  });
  it("the amount is the one beside the ingredient, so two right amounts aren't a slip", () => {
    expect(detectSlip("I added 1 tsp vanilla and ½ cup butter", [], CUPCAKES, FIXTURE)).toBeNull();
    expect(detectSlip("I put 2 cups of sugar and the vanilla in", [], CUPCAKES, FIXTURE)).toEqual({ item: "sugar", said: { value: 2, unit: "cup" } });
  });
  it("plurals count, and so does too little", () => {
    expect(detectSlip("I used 3 eggs", [], CUPCAKES, FIXTURE)).toEqual({ item: "large eggs", said: { value: 3, unit: "each" } });
    expect(detectSlip("I only put half the sugar in", [], CUPCAKES, FIXTURE)).toEqual({ item: "sugar", said: null });
  });
});

describe("handling it", () => {
  const ctx = (said: string[], model: ModelConnector, timeline: string[] = []) =>
    collect(slipEvents(detectSlip(said.at(-1)!, timeline, CUPCAKES, FIXTURE)!, { recipe: CUPCAKES, kind: "baking", timeline, model, pack: FIXTURE, utterance: said.at(-1) }));

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

describe("the final review: numbers the model adds, ingredients not in yet, conditions, the confirm answer", () => {
  it("a line with any number code didn't compute is replaced by the fixed one", () => {
    const r = rule("pure vanilla extract", { value: 1, unit: "tbsp" }, CUPCAKES, "baking", FIXTURE);
    expect(keptNumbers(template(r), r)).toBe(true);
    expect(keptNumbers(template(r) + " Then double the oven time to 40 minutes.", r)).toBe(false);
    const fine = rule("pure vanilla extract", { value: 1.25, unit: "tsp" }, CUPCAKES, "baking", FIXTURE);
    expect(keptNumbers("That's fine — just add 2 more tablespoons of milk.", fine)).toBe(false);
  });
  it("a bigger batch adds only what has already gone in — later steps simply arrive scaled", () => {
    // Vanilla goes in at step 2 (index 1); flour, baking powder and milk come later.
    const r = rule("pure vanilla extract", { value: 1, unit: "tbsp" }, CUPCAKES, "baking", FIXTURE,
      new Set(["butter, softened", "sugar", "large eggs", "pure vanilla extract"]));
    expect(r.rescue?.adds.map((a) => a.item).sort()).toEqual(["butter", "large eggs", "sugar"]);
  });
  it("a scale rescue is no rescue when an ingredient's amount can't be read (vanilla: taste first)", () => {
    const odd = { ...CUPCAKES, ingredients: CUPCAKES.ingredients.map((i) => i.item === "milk" ? { ...i, amount: "a splash" } : i) };
    const r = rule("pure vanilla extract", { value: 1, unit: "tbsp" }, odd, "baking", FIXTURE);
    expect(r.verdict).toBe("taste");
    expect(r.reason).toMatch(/can't scale milk/);
  });
  it("a rescue for yeast dough is never offered for a recipe with no yeast", () => {
    const p = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "salt"
      ? { ...r, rescues: r.rescues.map((x) => x.id === "add-missing" ? { ...x, when: "yeast dough, before the bulk rise" } : x) } : r) };
    expect(rule("salt", { value: 0.25, unit: "tsp" }, COOKIES, "baking", p).verdict).toBe("redo");
  });
  it("the cook's 'yes' to the phone's own confirm question carries on; the recipe amount is 'spot on'", async () => {
    const tl = [`0:41 coach: How much pure vanilla extract went in?`];
    const es = await collect(slipEvents(detectSlip("yep", tl, CUPCAKES, FIXTURE)!, { recipe: CUPCAKES, kind: "baking", timeline: tl, model: saying("x"), pack: FIXTURE, utterance: "yep" }));
    expect(texts(es)).toBe(CARRY_ON);
    const right = rule("pure vanilla extract", { value: 1, unit: "tsp" }, CUPCAKES, "baking", FIXTURE);
    expect(template(right)).toBe(SPOT_ON);
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
