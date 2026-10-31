import { describe, expect, it } from "vitest";
import { answerChange, changeEvents, detectChange } from "../src/expertise/cooking-pack/change";
import type { Pack } from "../src/expertise/cooking-pack/types";
import type { ModelConnector } from "../src/model/connector";
import { CUPCAKES, FIXTURE } from "./fixture-pack";

const S = ["King Arthur Baking", "America's Test Kitchen"];
const WITH_SUBS: Pack = {
  ...FIXTURE,
  roles: [...FIXTURE.roles.map((r) => r.id === "sugar"
    ? { ...r, changes: [{ direction: "less" as const, upTo: 0.33, effect: "Less sugar makes a drier, paler crumb.", sources: S }] } : r),
    { id: "dairy-cultured", name: "buttermilk", does: "acid + liquid", tight: false, bands: { default: [{ below: Infinity, verdict: "fine" }] },
      rescues: [], changes: [], shows: "", sources: S,
      substitutions: [{ use: "milk with 1 tbsp lemon juice per cup", ratio: 1, effect: "Let it stand 5 minutes first.", sources: S }] }],
  index: { ...FIXTURE.index, buttermilk: ["dairy-cultured"] },
};
const PANCAKES = { title: "Pancakes", ingredients: [{ amount: "1 cup", item: "buttermilk" }, { amount: "1 cup", item: "sugar" }], steps: ["Whisk."] };
const saying = (t: string): ModelConnector => ({ async *stream() { yield t; } });

describe("substitutions and changes, from the pack", () => {
  it("knows what's being asked", () => {
    expect(detectChange("I don't have buttermilk", PANCAKES, WITH_SUBS)).toEqual({ item: "buttermilk", ask: "substitute" });
    expect(detectChange("can I cut the sugar in half?", PANCAKES, WITH_SUBS)).toEqual({ item: "sugar", ask: "less" });
    expect(detectChange("how's it looking?", PANCAKES, WITH_SUBS)).toBeNull();
  });
  it("a sourced substitution, with the amount computed", () => {
    const a = answerChange({ item: "buttermilk", ask: "substitute" }, PANCAKES, WITH_SUBS);
    expect(a.grounded).toBe(true);
    expect(a.facts).toContain("1 cup of milk with 1 tbsp lemon juice per cup");
  });
  it("a sourced change, with how far it's safe", () => {
    const a = answerChange({ item: "sugar", ask: "less" }, PANCAKES, WITH_SUBS);
    expect(a.facts).toContain("up to 33%");
    expect(a.facts).toContain("drier");
  });
  it("a substitution is chosen for this ingredient, never another one the same role covers", () => {
    const two: Pack = { ...WITH_SUBS, roles: WITH_SUBS.roles.map((r) => r.id === "dairy-cultured" ? { ...r, substitutions: [
      { use: "for buttermilk: milk with 1 tbsp lemon juice per cup", ratio: 1, effect: "Stand 5 minutes.", sources: S },
      { use: "for sour cream: Greek yogurt", ratio: 1, effect: "A little tangier.", sources: S }] } : r),
      index: { ...WITH_SUBS.index, "sour cream": ["dairy-cultured"] } };
    const dip = { title: "Dip", ingredients: [{ amount: "1 cup", item: "sour cream" }], steps: ["Stir."] };
    expect(answerChange({ item: "sour cream", ask: "substitute" }, dip, two).facts).toContain("Greek yogurt");
    const odd = { title: "Dip", ingredients: [{ amount: "1 cup", item: "crème fraîche" }], steps: ["Stir."] };
    const three: Pack = { ...two, index: { ...two.index, "creme fraiche": ["dairy-cultured"] } };
    expect(answerChange({ item: "crème fraîche", ask: "substitute" }, odd, three).grounded).toBe(false);
  });
  it("nothing sourced: not grounded, so the mind answers as judgement", () => {
    expect(answerChange({ item: "pure vanilla extract", ask: "substitute" }, CUPCAKES, WITH_SUBS).grounded).toBe(false);
  });
  it("the model's line is said only if it keeps the numbers", async () => {
    const a = answerChange({ item: "sugar", ask: "less" }, PANCAKES, WITH_SUBS);
    const said = async (m: ModelConnector) => { for await (const e of changeEvents(a, m)) if (e.type === "text") return e.text; };
    expect(await said(saying("You can cut it by up to 33% — it'll just be a bit drier."))).toContain("33%");
    expect(await said(saying("Sure, cut it in half."))).toBe(a.facts);
  });
});
