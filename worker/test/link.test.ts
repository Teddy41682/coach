import { describe, expect, it } from "vitest";
import { linkSteps } from "../src/link";
import type { ModelConnector } from "../src/model/connector";
import type { CoachRecipe } from "../src/expertise/pack";

const recipe: CoachRecipe = {
  title: "Pancakes",
  ingredients: [{ amount: "200 g", item: "flour" }, { amount: "1 tsp", item: "salt" }, { amount: "2", item: "eggs" }],
  steps: ["Whisk the flour and salt.", "Beat in the eggs."],
};
const answering = (text: string): ModelConnector => ({ async *stream() { yield text.slice(0, 10); yield text.slice(10); } });
const everything = [["flour", "salt", "eggs"], ["flour", "salt", "eggs"]];

describe("linkSteps", () => {
  it("returns the model's per-step ingredient lists", async () => {
    expect(await linkSteps(recipe, answering('{"steps":[["flour","salt"],["eggs"]]}'))).toEqual([["flour", "salt"], ["eggs"]]);
  });
  it("drops an item the recipe doesn't have", async () => {
    expect(await linkSteps(recipe, answering('{"steps":[["flour","oregano"],["eggs"]]}'))).toEqual([["flour"], ["eggs"]]);
  });
  it("tolerates a fenced JSON answer", async () => {
    expect(await linkSteps(recipe, answering('```json\n{"steps":[["flour"],["eggs"]]}\n```'))).toEqual([["flour"], ["eggs"]]);
  });
  it("falls back to every ingredient on every step when the answer is unparsable", async () => {
    expect(await linkSteps(recipe, answering("sorry, I can't"))).toEqual(everything);
  });
  it("falls back when the step count doesn't match", async () => {
    expect(await linkSteps(recipe, answering('{"steps":[["flour"]]}'))).toEqual(everything);
  });
  it("falls back when the model throws", async () => {
    const broken: ModelConnector = { async *stream() { throw new Error("down"); } };
    expect(await linkSteps(recipe, broken)).toEqual(everything);
  });
  it("needs no model call for a recipe with no steps", async () => {
    let called = false;
    const spy: ModelConnector = { async *stream() { called = true; yield "{}"; } };
    expect(await linkSteps({ ...recipe, steps: [] }, spy)).toEqual([]);
    expect(called).toBe(false);
  });
});
