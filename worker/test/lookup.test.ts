import { describe, expect, it } from "vitest";
import { mentionedItem, normaliseItem, rolesFor } from "../src/expertise/cooking-pack/lookup";
import { COOKIES, CUPCAKES, FIXTURE } from "./fixture-pack";

const ids = (item: string) => rolesFor(item, FIXTURE).map((r) => r.id);

describe("ingredients to roles", () => {
  it("normalises an ingredient line to its name", () => {
    expect(normaliseItem("1 tsp pure vanilla extract")).toBe("vanilla extract");
    expect(normaliseItem("unsalted butter, softened")).toBe("butter");
    expect(normaliseItem("Large Eggs (room temperature)")).toBe("egg");
  });
  it("finds roles by the ingredient's own name or a declared alias — never by a word inside another name", () => {
    expect(ids("1 tsp pure vanilla extract")).toEqual(["flavour-extract"]);
    expect(ids("unsalted butter, softened")).toEqual(["fat-solid"]);
    expect(ids("1 tsp bicarbonate of soda")).toEqual(["chemical-leavener-base"]);
    expect(ids("dragon fruit")).toEqual([]);
    // Rose water is not water, peanut butter is not butter, coconut milk is not milk: unknown, so the coach asks.
    expect(ids("rose water")).toEqual([]);
    expect(ids("peanut butter")).toEqual([]);
    expect(ids("coconut milk")).toEqual([]);
  });
  it("knows which recipe ingredient the cook means, by its name or an alias", () => {
    expect(mentionedItem("I put way too much vanilla in", CUPCAKES, FIXTURE)).toEqual({
      item: "pure vanilla extract", recipeAmount: { value: 1, unit: "tsp" } });
    expect(mentionedItem("I used bicarbonate of soda by mistake, a whole tablespoon", COOKIES, FIXTURE)?.item).toBe("baking soda");
    expect(mentionedItem("how's the batter looking?", CUPCAKES, FIXTURE)).toBeNull();
  });
  it("never takes one ingredient for another that merely does the same job (almond extract is not vanilla)", () => {
    expect(mentionedItem("I added almond extract instead", CUPCAKES, FIXTURE)).toBeNull();
  });
  it("prefers the longest match: 'baking powder' is not 'baking soda'", () => {
    const both = { ...COOKIES, ingredients: [...COOKIES.ingredients, { amount: "1 tsp", item: "baking powder" }] };
    expect(mentionedItem("too much baking powder", both, FIXTURE)?.item).toBe("baking powder");
  });
});
