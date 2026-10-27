import { describe, expect, it } from "vitest";
import { cooking } from "../src/expertise/cooking";
import type { PackContext } from "../src/expertise/pack";

const ctx = (over: Partial<PackContext> = {}): PackContext => ({
  recipe: {
    title: "Gluten-Free Crusty Boule",
    ingredients: [{ amount: "140 g", item: "brown rice flour" }, { amount: "15 g", item: "whole psyllium husk" }],
    steps: ["Proof the yeast in warm water with honey.", "Whisk in the psyllium and vinegar; let it gel."],
  },
  stepIndex: 1,
  utterance: "Is this gel thick enough?",
  seen: ["water", "psyllium husk"],
  stepIngredients: ["whole psyllium husk"],
  ...over,
});

describe("the cooking pack", () => {
  it("puts the current step and its ingredients in the system prompt", () => {
    const s = cooking.system(ctx());
    expect(s).toContain("Gluten-Free Crusty Boule");
    expect(s).toContain("Step 2 of 2");
    expect(s).toContain("Whisk in the psyllium and vinegar; let it gel.");
    expect(s).toContain("whole psyllium husk");
  });

  it("carries the house rules", () => {
    const s = cooking.system(ctx());
    expect(s).toContain("Never give nutrition, calorie, health or medical advice");
    expect(s).toContain("suggest a thermometer");
    expect(s).toContain("offer it as a tip, never as a change to the recipe");
    expect(s).toContain("at most two short sentences");
  });

  it("puts the question and what's been seen in the user turn", () => {
    const u = cooking.user(ctx());
    expect(u).toContain("Is this gel thick enough?");
    expect(u).toContain("water, psyllium husk");
  });

  it("says when nothing has been seen yet", () => {
    expect(cooking.user(ctx({ seen: [] }))).toContain("nothing noted yet");
  });

  it("still names the dish for a recipe with no steps", () => {
    const s = cooking.system(ctx({ recipe: { title: "Toast", ingredients: [], steps: [] }, stepIndex: 0, stepIngredients: [] }));
    expect(s).toContain("Toast");
    expect(s).not.toContain("undefined");
  });

  it("clamps a step index past the end to the last step", () => {
    expect(cooking.system(ctx({ stepIndex: 9 }))).toContain("Step 2 of 2");
  });
});
