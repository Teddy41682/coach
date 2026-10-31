import { describe, expect, it } from "vitest";
import { speakAmount } from "../src/expertise/amount";
import { MAX_SCALE, rule } from "../src/expertise/cooking-pack/verdict";
import { COOKIES, CUPCAKES, FIXTURE } from "./fixture-pack";

const adds = (r: ReturnType<typeof rule>) => (r.rescue?.adds ?? []).map((a) => `${speakAmount(a.amount)} ${a.item}`);

describe("verdicts in code", () => {
  it("a little over is fine", () => {
    expect(rule("pure vanilla extract", { value: 1.5, unit: "tsp" }, CUPCAKES, "baking", FIXTURE).verdict).toBe("fine");
  });
  it("3× vanilla is fixable: the smallest bigger batch that brings it back in range, every quantity computed", () => {
    const r = rule("pure vanilla extract", { value: 1, unit: "tbsp" }, CUPCAKES, "baking", FIXTURE);
    expect(r.verdict).toBe("fixable");
    expect(r.rescue?.kind).toBe("scale");
    expect(r.rescue?.by).toBe(1.5);
    expect(adds(r)).toEqual(expect.arrayContaining(["¾ cup all-purpose flour", "½ cup sugar", "1 large eggs", "¼ cup milk"]));
    expect(adds(r).some((a) => a.includes("vanilla"))).toBe(false);
  });
  it("3× baking soda is a redo", () => {
    expect(rule("baking soda", { value: 1, unit: "tbsp" }, COOKIES, "baking", FIXTURE).verdict).toBe("redo");
  });
  it("forgot the baking powder: add it, before it goes in the oven", () => {
    const r = rule("baking powder", { value: 0, unit: "tsp" }, CUPCAKES, "baking", FIXTURE);
    expect(r.verdict).toBe("fixable");
    expect(r.rescue?.when).toBe("before it goes in the oven");
    expect(adds(r)).toEqual(["1½ tsp baking powder"]);
  });
  it("salt twice in a braise: add another measure of the liquid", () => {
    const stew = { title: "Stew", ingredients: [{ amount: "4 cups", item: "beef stock" }, { amount: "1 tsp", item: "salt" }], steps: ["Simmer."] };
    const r = rule("salt", { value: 2, unit: "tsp" }, stew, "braise", FIXTURE);
    expect(r.verdict).toBe("fixable");
    expect(adds(r)).toEqual(["4 cups beef stock"]);
  });
  it("a batch more than twice the size is a redo, and so is a scale that needs part of an egg", () => {
    expect(MAX_SCALE).toBe(2);
    expect(rule("pure vanilla extract", { value: 4, unit: "tsp" }, CUPCAKES, "baking", FIXTURE).verdict).toBe("fixable");
    const threeEggs = { ...CUPCAKES, ingredients: CUPCAKES.ingredients.map((i) => i.item === "large eggs" ? { ...i, amount: "3" } : i) };
    // 2.5× vanilla → make 1.25×: ¾ of an egg more — not a half, not whole.
    expect(rule("pure vanilla extract", { value: 2.5, unit: "tsp" }, threeEggs, "baking", FIXTURE).verdict).toBe("redo");
  });
  it("unknown when the amount isn't a number, can't be compared, or the ingredient isn't in the pack", () => {
    expect(rule("pure vanilla extract", null, CUPCAKES, "baking", FIXTURE).verdict).toBe("unknown");
    expect(rule("pure vanilla extract", { value: 10, unit: "g" }, CUPCAKES, "baking", FIXTURE).verdict).toBe("unknown");
    const odd = { ...CUPCAKES, ingredients: [...CUPCAKES.ingredients, { amount: "1 tsp", item: "rose water" }] };
    expect(rule("rose water", { value: 3, unit: "tsp" }, odd, "baking", FIXTURE).verdict).toBe("unknown");
  });
  it("a fixable band whose cut-point is provisional is a redo (doubt → redo)", () => {
    const shaky = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "flavour-extract"
      ? { ...r, bands: { default: r.bands.default.map((b) => (b.verdict === "fixable" ? { ...b, provisional: true } : b)) } } : r) };
    expect(rule("pure vanilla extract", { value: 3, unit: "tsp" }, CUPCAKES, "baking", shaky).verdict).toBe("redo");
    expect(rule("pure vanilla extract", { value: 1.5, unit: "tsp" }, CUPCAKES, "baking", shaky).verdict).toBe("fine");
  });
  it("chooses the role that has rules for this kind of cooking: butter in a sauté isn't cake butter", () => {
    const S = ["a", "b"];
    const fat = (id: string, tight: boolean, bands: Record<string, unknown>) => ({ id, name: id, does: id, tight, bands, rescues: [
      { id: "fix", kind: "none" as const, say: id, sources: S }], substitutions: [], changes: [], shows: "", sources: S });
    const p = { ...FIXTURE,
      roles: [...FIXTURE.roles, fat("fat-creamed", true, { default: [{ below: 1.2, verdict: "fine" }, { below: Infinity, verdict: "redo" }] }),
        fat("fat-cooking", false, { default: [{ below: 1.2, verdict: "fine" }, { below: Infinity, verdict: "redo" }],
          saute: [{ below: 3, verdict: "fine" }, { below: Infinity, verdict: "fixable", rescue: "fix" }] })] as never,
      index: { ...FIXTURE.index, butter: ["fat-creamed", "fat-cooking"] } };
    const pan = { title: "Garlic chicken", ingredients: [{ amount: "1 tbsp", item: "butter" }], steps: ["Sear."] };
    const r = rule("butter", { value: 2, unit: "tbsp" }, pan, "saute", p);
    expect(r.role).toBe("fat-cooking");
    expect(r.verdict).toBe("fine");
  });
  it("a rescue with a fixed amount adds that amount, not a scaled recipe quantity", () => {
    const S = ["a", "b"];
    const p = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "salt"
      ? { ...r, rescues: r.rescues.map((x) => x.id === "dilute" ? { ...x, add: { role: "liquid", amount: "1/4 cup" } } : x) } : r) };
    const stew = { title: "Stew", ingredients: [{ amount: "4 cups", item: "beef stock" }, { amount: "1 tsp", item: "salt" }], steps: ["Simmer."] };
    expect(adds(rule("salt", { value: 2, unit: "tsp" }, stew, "braise", p))).toEqual(["¼ cup beef stock"]);
    void S;
  });
  it("a per-unit-of-excess rescue the engine can't compute gives the technique, never a wrong number", () => {
    const p = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "salt"
      ? { ...r, rescues: r.rescues.map((x) => x.id === "dilute" ? { ...x, add: { role: "liquid", amount: "1 cup", per: 1 } } : x) } : r) };
    const stew = { title: "Stew", ingredients: [{ amount: "4 cups", item: "beef stock" }, { amount: "1 tsp", item: "salt" }], steps: ["Simmer."] };
    const r = rule("salt", { value: 2, unit: "tsp" }, stew, "braise", p);
    expect(r.verdict).toBe("fixable");
    expect(r.rescue?.adds).toEqual([]);
  });
  it("an amount written as text ('about ¼ tsp per extra Tbsp of lemon') is technique only — never read as a flat ¼ tsp", () => {
    for (const amount of ["about ¼ tsp per extra Tbsp of lemon", "sour cream or yoghurt served with it", "1 tsp cornstarch slurried in 1 Tbsp water"]) {
      const p = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "salt"
        ? { ...r, rescues: r.rescues.map((x) => x.id === "dilute" ? { ...x, add: { role: "liquid", amount } } : x) } : r) };
      const stew = { title: "Stew", ingredients: [{ amount: "4 cups", item: "beef stock" }, { amount: "1 tsp", item: "salt" }], steps: ["Simmer."] };
      expect(rule("salt", { value: 2, unit: "tsp" }, stew, "braise", p).rescue?.adds).toEqual([]);
    }
  });
  it("a provisional rescue is never offered: redo", () => {
    const shaky = { ...FIXTURE, roles: FIXTURE.roles.map((r) => r.id === "flavour-extract"
      ? { ...r, rescues: r.rescues.map((x) => ({ ...x, provisional: true })) } : r) };
    expect(rule("pure vanilla extract", { value: 3, unit: "tsp" }, CUPCAKES, "baking", shaky).verdict).toBe("redo");
  });
});
