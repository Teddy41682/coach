import { describe, expect, it } from "vitest";
import { buildBrief, kindOf } from "../src/expertise/cooking-pack/brief";
import type { StepPlan } from "../src/link";
import { COOKIES, CUPCAKES, FIXTURE } from "./fixture-pack";

const blank = { done: "", mistakes: "", tip: "", method: "", hardToSee: false };
const steps = (...ingredients: string[][]): StepPlan[] => ingredients.map((i) => ({ ingredients: i, ...blank }));

describe("the chef's brief", () => {
  it("tells the kind of cooking from the recipe's own words", () => {
    expect(kindOf(CUPCAKES)).toBe("baking");
    expect(kindOf({ title: "Beef stew", ingredients: [], steps: ["Brown the beef.", "Simmer covered for 2 hours."] })).toBe("braise");
    expect(kindOf({ title: "Jollof rice", ingredients: [{ amount: "2 cups", item: "long-grain rice" }], steps: ["Cook the rice in the sauce."] })).toBe("grains");
    expect(kindOf({ title: "Garlic chicken", ingredients: [], steps: ["Sear in a hot pan.", "Toss with the sauce."] })).toBe("saute");
    expect(kindOf({ title: "Salad", ingredients: [], steps: ["Toss."] })).toBe("other");
    // The exam: a rice that simmers is still rice; a raw dressing is the uncooked kind the research files it under.
    expect(kindOf({ title: "Steamed Rice", ingredients: [], steps: ["Bring to a boil.", "Cover and simmer for 18 minutes."] })).toBe("grains");
    expect(kindOf({ title: "Lemon Vinaigrette", ingredients: [], steps: ["Whisk in the olive oil."] })).toBe("other");
    expect(kindOf({ title: "Chicken and rice stew", ingredients: [], steps: ["Simmer for an hour."] })).toBe("braise");
  });
  it("marks the small, tight measures as risky — and nothing else", () => {
    const b = buildBrief(CUPCAKES, steps(["butter, softened", "sugar"], ["large eggs", "pure vanilla extract"],
      ["all-purpose flour", "baking powder"], ["all-purpose flour", "milk"], []), FIXTURE);
    expect(b[0].risky).toEqual([]);
    expect(b[1].risky).toEqual([{ item: "pure vanilla extract", amount: { value: 1, unit: "tsp" }, roles: ["flavour-extract"] }]);
    expect(b[2].risky.map((r) => r.item)).toEqual(["baking powder"]);
  });
  it("an amount it can't read, or an ingredient it doesn't know, is never risky", () => {
    const r = { ...COOKIES, ingredients: [...COOKIES.ingredients.filter((i) => i.item !== "salt"), { amount: "to taste", item: "salt" }, { amount: "1 tsp", item: "rose water" }] };
    const b = buildBrief(r, steps(["salt", "rose water", "baking soda"]), FIXTURE);
    expect(b[0].risky.map((x) => x.item)).toEqual(["baking soda"]);
  });
});
