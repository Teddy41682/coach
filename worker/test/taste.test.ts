import { describe, expect, it } from "vitest";
import { CARRY_ON, TASTE, detectSlip, slipEvents, type VerdictEvent } from "../src/expertise/cooking-pack/slip";
import { rule } from "../src/expertise/cooking-pack/verdict";
import type { ModelConnector } from "../src/model/connector";
import type { CoachEvent } from "../src/sse";
import { COOKIES, CUPCAKES, FIXTURE, SOUP } from "./fixture-pack";

// His ruling 2026-10-30: defer to what a pro chef does — always taste. Too much of a flavouring is never a blind redo.
type Ev = CoachEvent | VerdictEvent;
const calls = { n: 0 };
const model: ModelConnector = { async *stream() { calls.n++; yield "model words"; } };
const collect = async (it: AsyncIterable<Ev>) => { const out: Ev[] = []; for await (const e of it) out.push(e); return out; };
const texts = (es: Ev[]) => es.filter((e) => e.type === "text").map((e) => (e as { text: string }).text).join("");
const ctx = (recipe: typeof SOUP, kind: "braise" | "baking", timeline: string[], utterance: string) =>
  ({ recipe, kind, timeline, model, pack: FIXTURE, utterance });

describe("too much of a flavouring: taste before any ruling", () => {
  it("triple salt in a soup is a taste, not a redo", () => {
    expect(rule("salt", { value: 1, unit: "tbsp" }, SOUP, "braise", FIXTURE).verdict).toBe("taste");
  });
  it("in a bake too — double salt in cookies is a taste", () => {
    expect(rule("salt", { value: 2, unit: "tsp" }, COOKIES, "baking", FIXTURE).verdict).toBe("taste");
  });
  it("a provisional band on a flavouring is a taste", () => {
    const shaky = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "flavour-extract"
      ? { ...r, bands: { default: r.bands.default.map((b) => (b.verdict === "fixable" ? { ...b, provisional: true } : b)) } } : r) };
    expect(rule("pure vanilla extract", { value: 3, unit: "tsp" }, CUPCAKES, "baking", shaky).verdict).toBe("taste");
  });
  it("not a flavouring — triple baking soda — stays a redo; too little salt is not a taste", () => {
    expect(rule("baking soda", { value: 1, unit: "tbsp" }, COOKIES, "baking", FIXTURE).verdict).toBe("redo");
    expect(rule("salt", { value: 0.25, unit: "tsp" }, COOKIES, "baking", FIXTURE).verdict).not.toBe("taste");
  });
  it("a sourced rescue still comes first", () => {
    expect(rule("salt", { value: 2, unit: "tsp" }, SOUP, "braise", FIXTURE).verdict).toBe("fixable");
  });
  it("the coach says the fixed taste line, with no model call", async () => {
    calls.n = 0;
    const es = await collect(slipEvents({ item: "salt", said: { value: 1, unit: "tbsp" } }, ctx(SOUP, "braise", [], "I put a tablespoon of salt in")));
    expect(texts(es)).toBe(TASTE("salt"));
    expect(es[0]).toMatchObject({ type: "verdict", verdict: "taste" });
    expect(calls.n).toBe(0);
  });
});

describe("after the taste", () => {
  const tl = (slip: string) => [`0:40 cook: ${slip}`, `0:41 coach: ${TASTE("salt")}`];
  it("the answer to the taste question is caught as that slip, with its amount", () => {
    expect(detectSlip("yeah it's really salty", tl("I put a tablespoon of salt in"), SOUP, FIXTURE))
      .toEqual({ item: "salt", said: { value: 1, unit: "tbsp" }, tasted: "strong" });
    expect(detectSlip("no, it tastes good", tl("I put a tablespoon of salt in"), SOUP, FIXTURE))
      .toEqual({ item: "salt", said: { value: 1, unit: "tbsp" }, tasted: "fine" });
    expect(detectSlip("not too strong actually", tl("I put a tablespoon of salt in"), SOUP, FIXTURE)?.tasted).toBe("fine");
    expect(detectSlip("it's not great", tl("I put a tablespoon of salt in"), SOUP, FIXTURE)?.tasted).toBe("strong");
  });
  it("tastes fine: carry on", async () => {
    const t = tl("I put a tablespoon of salt in");
    const s = detectSlip("tastes fine", t, SOUP, FIXTURE)!;
    expect(texts(await collect(slipEvents(s, ctx(SOUP, "braise", t, "tastes fine"))))).toBe(CARRY_ON);
  });
  it("too strong in a soup: balance it by making more around it, with code's amounts", async () => {
    const t = tl("I put a tablespoon of salt in");
    const s = detectSlip("way too salty", t, SOUP, FIXTURE)!;
    const es = await collect(slipEvents(s, ctx(SOUP, "braise", t, "way too salty")));
    expect(es[0]).toMatchObject({ type: "verdict", verdict: "fixable", by: 2 });
    expect(texts(es)).toMatch(/2× bigger/);
    expect(texts(es)).toMatch(/4 cups chicken stock/);
  });
  it("too strong past a doubled batch, or in a bake: start that part again", async () => {
    const big = [`0:40 cook: I put 2 tablespoons of salt in`, `0:41 coach: ${TASTE("salt")}`];
    const s = detectSlip("too salty", big, SOUP, FIXTURE)!;
    expect((await collect(slipEvents(s, ctx(SOUP, "braise", big, "too salty"))))[0]).toMatchObject({ verdict: "redo" });
    const ck = [`0:40 cook: I put 2 teaspoons of salt in`, `0:41 coach: ${TASTE("salt")}`];
    const c = detectSlip("yes too salty", ck, COOKIES, FIXTURE)!;
    expect((await collect(slipEvents(c, ctx(COOKIES, "baking", ck, "yes too salty"))))[0]).toMatchObject({ verdict: "redo" });
  });
  it("the taste question after an answer to 'how much went in?' still finds the amount", () => {
    const t = ["0:39 coach: How much salt went in?", "0:40 cook: about a tablespoon", `0:41 coach: ${TASTE("salt")}`];
    expect(detectSlip("too salty", t, SOUP, FIXTURE)).toEqual({ item: "salt", said: { value: 1, unit: "tbsp" }, tasted: "strong" });
  });
});

describe("two misses the exam turned up (2026-10-30)", () => {
  it("an amount said well before the ingredient is still read", () => {
    expect(detectSlip("I put a teaspoon and a half of salt in by mistake", [], SOUP, FIXTURE))
      .toEqual({ item: "salt", said: { value: 1.5, unit: "tsp" } });
  });
  it("a rescue whose condition only mentions a rise among others is not a yeast-only rescue", () => {
    const p = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "salt"
      ? { ...r, rescues: r.rescues.map((x) => x.id === "dilute"
        ? { ...x, when: "the pot has room; for a dough, during mixing before the rise" } : x) } : r) };
    expect(rule("salt", { value: 2, unit: "tsp" }, SOUP, "braise", p).verdict).toBe("fixable");
    const yeastOnly = { ...p, roles: p.roles.map((r) => r.id === "salt"
      ? { ...r, rescues: r.rescues.map((x) => x.id === "dilute" ? { ...x, when: "yeast dough, before the bulk rise" } : x) } : r) };
    expect(rule("salt", { value: 2, unit: "tsp" }, SOUP, "braise", yeastOnly).verdict).not.toBe("fixable");
  });
});

describe("the rescue's condition is said only where it fits the dish", () => {
  it("a stew isn't told about dough or batter", () => {
    const p = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "salt"
      ? { ...r, rescues: r.rescues.map((x) => x.id === "dilute"
        ? { ...x, when: "the pot has room; for a dough, during mixing before the rise; never for a whipped or creamed batter" } : x) } : r) };
    expect(rule("salt", { value: 2, unit: "tsp" }, SOUP, "braise", p).rescue?.when).toBe("the pot has room");
    expect(rule("salt", { value: 2, unit: "tsp" }, COOKIES, "baking", p).rescue?.when ?? "").not.toMatch(/the rise/);
  });
});
