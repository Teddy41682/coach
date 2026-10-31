import type { Pack, Role } from "../src/expertise/cooking-pack/types";

/** A small hand-written pack for the code's tests — the shipped pack's numbers come from the research. */
const S = ["McGee, On Food and Cooking", "King Arthur Baking"];
const r = (id: string, tight: boolean, bands: Role["bands"], rescues: Role["rescues"] = []): Role => ({
  id, name: id, does: id, tight, bands, rescues, substitutions: [], changes: [], shows: "", sources: S,
});
const scale = { id: "scale", kind: "scale" as const, say: "make the batch bigger", sources: S };

export const FIXTURE: Pack = {
  version: "fixture",
  roles: [
    r("flavour-extract", true, { default: [
      { below: 0.25, verdict: "fine" }, { below: 2.01, verdict: "fine" }, { below: 4.01, verdict: "fixable", rescue: "scale" },
      { below: Infinity, verdict: "redo" }] }, [scale]),
    r("chemical-leavener-base", true, { default: [
      { below: 0.01, verdict: "fixable", rescue: "add-missing" }, { below: 0.75, verdict: "fixable", rescue: "add-missing" },
      { below: 1.26, verdict: "fine" }, { below: 1.6, verdict: "fixable", rescue: "scale" }, { below: Infinity, verdict: "redo" }] },
      [scale, { id: "add-missing", kind: "add", add: { role: "chemical-leavener-base" }, when: "before it goes in the oven", say: "whisk the rest in now", sources: S }]),
    r("chemical-leavener-powder", true, { default: [
      { below: 0.01, verdict: "fixable", rescue: "add-missing" }, { below: 1.26, verdict: "fine" }, { below: Infinity, verdict: "redo" }] },
      [{ id: "add-missing", kind: "add", add: { role: "chemical-leavener-powder" }, when: "before it goes in the oven", say: "whisk it in now", sources: S }]),
    r("salt", true, { default: [{ below: 0.5, verdict: "fixable", rescue: "add-missing" }, { below: 1.5, verdict: "fine" }, { below: Infinity, verdict: "redo" }],
      braise: [{ below: 1.5, verdict: "fine" }, { below: 2.6, verdict: "fixable", rescue: "dilute" }, { below: Infinity, verdict: "redo" }] },
      [{ id: "add-missing", kind: "add", add: { role: "salt" }, say: "add the rest", sources: S },
       { id: "dilute", kind: "add", add: { role: "liquid", per: 1 }, say: "add more liquid", sources: S }]),
    r("liquid", false, { default: [{ below: Infinity, verdict: "fine" }] }),
    r("flour", false, { default: [{ below: Infinity, verdict: "fine" }] }),
    r("sugar", false, { default: [{ below: Infinity, verdict: "fine" }] }),
    r("fat-solid", false, { default: [{ below: Infinity, verdict: "fine" }] }),
    r("egg", false, { default: [{ below: Infinity, verdict: "fine" }] }),
    r("dairy", false, { default: [{ below: Infinity, verdict: "fine" }] }),
  ],
  index: {
    "vanilla": ["flavour-extract"], "vanilla extract": ["flavour-extract"], "almond extract": ["flavour-extract"],
    "baking soda": ["chemical-leavener-base"], "bicarbonate of soda": ["chemical-leavener-base"], "bicarbonate": ["chemical-leavener-base"],
    "baking powder": ["chemical-leavener-powder"], "salt": ["salt"], "kosher salt": ["salt"],
    "water": ["liquid"], "stock": ["liquid"], "broth": ["liquid"], "beef stock": ["liquid"], "chicken stock": ["liquid"],
    "flour": ["flour"], "all-purpose flour": ["flour"], "sugar": ["sugar"], "butter": ["fat-solid"], "egg": ["egg"], "milk": ["dairy"],
  },
  aliases: { "vanilla": "vanilla extract", "bicarbonate of soda": "baking soda", "bicarbonate": "baking soda" },
};

/** The cupcakes the plan's tests use: 1 tsp vanilla, 1½ tsp baking powder. */
export const CUPCAKES = {
  title: "Vanilla Cupcakes",
  ingredients: [
    { amount: "1 1/2 cups", item: "all-purpose flour" }, { amount: "1 cup", item: "sugar" },
    { amount: "1/2 cup", item: "butter, softened" }, { amount: "2", item: "large eggs" },
    { amount: "1 tsp", item: "pure vanilla extract" }, { amount: "1 1/2 tsp", item: "baking powder" },
    { amount: "1/2 cup", item: "milk" },
  ],
  steps: ["Cream the butter and sugar until pale and fluffy.", "Beat in the eggs one at a time, then the vanilla.",
    "Whisk the flour and baking powder together.", "Fold in the flour in two parts, alternating with the milk.",
    "Fill the liners two-thirds full and bake at 350°F for 18 to 20 minutes."],
};

export const COOKIES = {
  title: "Chocolate Chip Cookies",
  ingredients: [{ amount: "2 1/4 cups", item: "all-purpose flour" }, { amount: "1 tsp", item: "baking soda" },
    { amount: "1 tsp", item: "salt" }, { amount: "1 cup", item: "butter" }, { amount: "2", item: "eggs" }],
  steps: ["Whisk the flour, baking soda and salt.", "Cream the butter, beat in the eggs, then fold in the flour."],
};

/** A soup for the taste tests: 1 tsp salt in 4 cups of stock, braised. */
export const SOUP = {
  title: "Chicken Noodle Soup",
  ingredients: [{ amount: "4 cups", item: "chicken stock" }, { amount: "1 tsp", item: "salt" }, { amount: "1 cup", item: "milk" }],
  steps: ["Bring the stock to a simmer and add the salt.", "Stir in the milk and simmer ten minutes."],
};
