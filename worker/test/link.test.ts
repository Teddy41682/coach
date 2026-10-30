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
const blank = { done: "", mistakes: "", tip: "", method: "", hardToSee: false };
const everything = [{ ingredients: ["flour", "salt", "eggs"], ...blank }, { ingredients: ["flour", "salt", "eggs"], ...blank }];
const plan = (steps: unknown) => answering(JSON.stringify({ steps }));

describe("linkSteps — ingredients and a briefing per step", () => {
  it("returns each step's ingredients and briefing", async () => {
    const r = await linkSteps(recipe, plan([
      { ingredients: ["flour", "salt"], done: "No dry pockets.", mistakes: "Clumps at the bottom.", tip: "Whisk from the edge in.", method: "Whisk in circles from the middle out." },
      { ingredients: ["eggs"], done: "Smooth batter.", mistakes: "Overmixing.", tip: "Stop when streaks vanish." },
    ]));
    expect(r[0]).toEqual({ ingredients: ["flour", "salt"], done: "No dry pockets.", mistakes: "Clumps at the bottom.", tip: "Whisk from the edge in.", method: "Whisk in circles from the middle out.", hardToSee: false });
    expect(r[1].ingredients).toEqual(["eggs"]);
  });
  it("reads hardToSee, true only when the model says so", async () => {
    const r = await linkSteps(recipe, plan([{ ingredients: ["salt"], hardToSee: true }, { ingredients: [], hardToSee: "yes" }]));
    expect(r.map((s) => s.hardToSee)).toEqual([true, false]);
  });
  it("drops an item the recipe doesn't have", async () => {
    const r = await linkSteps(recipe, plan([{ ingredients: ["flour", "oregano"] }, { ingredients: ["eggs"] }]));
    expect(r.map((s) => s.ingredients)).toEqual([["flour"], ["eggs"]]);
  });
  it("a missing or non-string briefing field is empty, not fatal", async () => {
    const r = await linkSteps(recipe, plan([{ ingredients: ["flour"], done: 3 }, { ingredients: ["eggs"] }]));
    expect(r[0]).toEqual({ ingredients: ["flour"], ...blank });
  });
  it("caps each briefing field at 300 characters", async () => {
    const r = await linkSteps(recipe, plan([{ ingredients: [], tip: "x".repeat(500) }, { ingredients: [] }]));
    expect(r[0].tip.length).toBe(300);
  });
  it("tolerates a fenced JSON answer", async () => {
    const r = await linkSteps(recipe, answering('```json\n{"steps":[{"ingredients":["flour"]},{"ingredients":["eggs"]}]}\n```'));
    expect(r.map((s) => s.ingredients)).toEqual([["flour"], ["eggs"]]);
  });
  it("falls back to every ingredient everywhere, empty briefings, when unparsable", async () => {
    expect(await linkSteps(recipe, answering("sorry, I can't"))).toEqual(everything);
  });
  it("falls back when the step count doesn't match", async () => {
    expect(await linkSteps(recipe, plan([{ ingredients: ["flour"] }]))).toEqual(everything);
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
