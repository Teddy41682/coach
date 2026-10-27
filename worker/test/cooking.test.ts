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
  briefing: { done: "Thick enough to hold a spoon upright.", mistakes: "Adding the flour before it gels.", tip: "Whisk hard for 30 seconds so it gels evenly." },
  hasPhotos: true,
  history: [],
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

  it("still names the dish for a recipe with no steps", () => {
    const s = cooking.system(ctx({ recipe: { title: "Toast", ingredients: [], steps: [] }, stepIndex: 0, stepIngredients: [] }));
    expect(s).toContain("Toast");
    expect(s).not.toContain("undefined");
  });

  it("clamps a step index past the end to the last step", () => {
    expect(cooking.system(ctx({ stepIndex: 9 }))).toContain("Step 2 of 2");
  });

  it("tells the model not to describe what it sees when no photo came with the question", () => {
    expect(cooking.user(ctx({ hasPhotos: false }))).toContain("No photo came with this question");
    expect(cooking.user(ctx({ hasPhotos: true }))).not.toContain("No photo");
  });

  it("only hunts for missing ingredients when it has photos to judge", () => {
    expect(cooking.user(ctx({ hasPhotos: false }))).toContain("don't say an ingredient is missing");
    expect(cooking.user(ctx({ hasPhotos: true }))).not.toContain("don't say an ingredient is missing");
  });

  it("leaves out the 'noted so far' line when nothing has been noted", () => {
    expect(cooking.user(ctx({ seen: [] }))).not.toContain("Noted going in");
  });

  it("lists the conversation so far, cook and coach", () => {
    const u = cooking.user(ctx({ history: [{ who: "cook", text: "is it drained?" }, { who: "coach", text: "Tilt it toward me." }] }));
    expect(u).toContain("Cook: is it drained?");
    expect(u).toContain("Coach: Tilt it toward me.");
  });

  it("carries the flow rules: decide, move on when asked, ask to see, don't repeat", () => {
    const s = cooking.system(ctx());
    expect(s).toContain("End every answer with [[next]] or [[stay]]");
    expect(s).toContain("If the cook asks to move on, move on");
    expect(s).toContain("ask them to show you");
    expect(s).toContain("Never repeat a tip you already gave");
    expect(s).toContain("don't say what the next step is");
  });

  it("judges against the step's briefing", () => {
    const s = cooking.system(ctx());
    expect(s).toContain("Done when: Thick enough to hold a spoon upright.");
    expect(s).toContain("Common mistakes: Adding the flour before it gels.");
    expect(s).toContain("A tip you may offer once: Whisk hard for 30 seconds so it gels evenly.");
  });

  it("leaves out an empty briefing", () => {
    expect(cooking.system(ctx({ briefing: { done: "", mistakes: "", tip: "" } }))).not.toContain("Done when:");
  });
});
