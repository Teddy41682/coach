/**
 * Group B — eggs, fats, oils, dairy and cheese. Encoded from docs/research/expertise/b-eggs-fats-dairy.md.
 *
 * NOT ENCODED (needs code):
 * - Frying-oil fill level: oil deeper than half the pot → remove the excess BEFORE heating; if already hot, turn the
 *   heat off and do not move the pot; never add water (FL, FSIS-FRY). Independent of the recipe ratio and must
 *   override any "fine" band (oil-frying's shallow band above 2.01 is "fine" only on the ratio).
 * - Raw / lightly cooked yolks (mayonnaise, aioli, Caesar, hollandaise, béarnaise): pasteurised eggs for vulnerable
 *   diners. A hard rule that overrides any "fine".
 * - Stage input (unmixed / mixed / in the oven / done) for every slip. Almost every "fixable" here becomes "redo" or
 *   fine-with-effect once the item is mixed, whipped, folded, emulsified, baked or set; today that lives only in each
 *   rescue's `when`. The research's post-cook verdicts (e.g. egg-structure after baking: under 0.75 → redo, over 1.26
 *   → fine-with-effect; fat-creamed post-bake → fine-with-effect; oil-baking post-bake → fine-with-effect) need it.
 * - A `remove` rescue kind (research open question 2): taking an unmixed excess back out (an extra egg still in its
 *   bowl; overfilled frying oil still cold). Encoded as kind "none" with the technique in `say`.
 * - "fine-with-effect" is not a Verdict: where the research gives it as a ratio band it is encoded "fine" and the
 *   effect is in the role's `shows` / comments.
 * - State slips with no ratio (rescues defined below, but no band can reach them): yolk in the whites (more than a
 *   trace → redo the whites; a speck lifted out with a shell → fine); overwhipped whites; broken mayonnaise / broken
 *   hollandaise (rebuild-emulsion) and scrambled hollandaise (redo); melted butter instead of softened; butter too cold
 *   to cream; curdled creamed batter; pastry fat too warm or melted; burnt butter (redo the fat); wrong oil for deep
 *   frying (EVOO capped at 175 °C; smoking oil → replace); curdled milk / cultured dairy; overwhipped or separated
 *   cream; half-and-half or milk used for whipping (redo); cold lumpy cream cheese; broken cheese sauce; aged cheese
 *   as the main sauce cheese; pre-shredded cheese in a smooth sauce; salty aged cheese doubled; forgot buttermilk with
 *   baking soda baked without (fine-with-effect); egg-free custard requested (redo).
 * - Sub-kinds the Kind list can't separate (one band set per kind): hot emulsions (hollandaise/béarnaise: below 0.75 →
 *   fixable add a yolk with 1 Tbsp water and whisk the sauce into it, `provisional`; below 1.5 → fine; above → fine,
 *   thin with warm water) vs cold (encoded as `sauce`); cookies/brownies/bars (fat-creamed: below 0.75 fixable, below
 *   1.2 fine, below 2.01 fixable scale or chill-dough, above redo) vs cakes (encoded as `baking`); roux (fat-cooking:
 *   below 0.75 add fat then cook 1 min, below 1.35 fine, above skim the excess, `provisional`) vs pan sauce (encoded as
 *   `sauce`); a 1-egg recipe given 2 eggs (fixable by scaling before the batter meets the dry ingredients, else redo for
 *   cakes / cakier cookies, `provisional`) — falls in egg-structure's 1.26–2.01 scale band.
 * - Item-specific bands: sesame oil and strong nut oils as a flavouring (below 2.01 fine, above scale, above 4 redo,
 *   `provisional`) — so sesame and nut oils are deliberately NOT indexed to oil-dressing (its vinaigrette rescue,
 *   balance-acid, would be wrong for them; unknown means the coach asks).
 * - Substitutions the research rules out (whole egg for a whipped-white recipe; any egg substitute for popovers,
 *   sponge, chiffon, angel food, soufflé, quiche, custards, or for 3+ eggs; oil for butter in creamed cookies; butter
 *   for deep frying; low-fat cream cheese in cheesecake, single source KA-COOKIE; plain milk with no acid for
 *   buttermilk where the recipe relies on baking soda; anything below 30% fat for whipping) — a Substitution can't say
 *   "don't", so they live here and in the `effect` text of the nearest allowed swap.
 *
 * Conventions: Substitution.ratio = amount of the substitute per unit of the recipe's amount (verdict/change code
 * scales the recipe amount by it). Where the research gives a per-egg volume (aquafaba 1/4 cup per egg), the ratio is
 * 1 "egg's worth" and the measure is spelled in `use`. Change.upTo is the fraction of change (0.25 = 25%).
 * Kinds: the research's "default" lines are copied into `default`; where it names none, the safest (tightest) of its
 * kinds is used and a comment says so.
 */
import type { Role } from "../types";

const S = {
  MCG_EGG: "Harold McGee, On Food and Cooking (rev. 2004), ch. \"Eggs\" (composition, custards, egg foams, egg-yolk emulsions)",
  MCG_MILK: "Harold McGee, On Food and Cooking (rev. 2004), ch. \"Milk and Dairy Products\" (cream and whipping, butter, fermented milks, cheese and melting)",
  MCG_SAUCE: "Harold McGee, On Food and Cooking (rev. 2004), ch. \"Sauces\" (emulsified sauces: mayonnaise, hollandaise, beurre blanc, and why they break)",
  MCG_DOUGH: "Harold McGee, On Food and Cooking (rev. 2004), ch. \"Bread, Cakes, Pastry and Pasta\" (cake batters and creaming, pastry fat)",
  MCG_FAT: "Harold McGee, On Food and Cooking (rev. 2004), ch. \"Cooking Methods\" and the fats and oils appendix (frying, smoke points)",
  SFAH: "Samin Nosrat, Salt Fat Acid Heat (2017), ch. \"Fat\" and ch. \"Acid\"",
  FL: "J. Kenji López-Alt, The Food Lab (2015): chapters on eggs and breakfast; salads, emulsions, vinaigrettes and mayonnaise; deep frying",
  SE_CCC: "Serious Eats, J. Kenji López-Alt, \"The Food Lab: The Best Chocolate Chip Cookies\" (seriouseats.com; URL not fetch-verified)",
  SE_MAC: "Serious Eats, J. Kenji López-Alt, \"The Food Lab: Ultra-Gooey Stovetop Mac and Cheese\" (seriouseats.com; not fetch-verified)",
  BT: "Stella Parks, BraveTart: Iconic American Desserts (2017), technique notes on butter temperature, creaming, eggs and meringue",
  KA_EGG: "King Arthur Baking, \"Guide for substituting eggs\": https://www.kingarthurbaking.com/blog/2021/01/21/guide-for-substituting-eggs-best-egg-replacers",
  KA_BM: "King Arthur Baking, \"Buttermilk substitute\": https://www.kingarthurbaking.com/blog/2019/01/28/buttermilk-substitute",
  KA_SHORT: "King Arthur Baking, \"Shortening vs. butter in baking\": https://www.kingarthurbaking.com/blog/2016/11/16/shortening-vs-butter-in-baking",
  KA_OILCAKE: "King Arthur Baking, oil for a moist cake: https://www.kingarthurbaking.com/blog/2022/06/28/oil-for-moist-rich-cake-like-boxed-mix",
  KA_COOKIE: "King Arthur Baking, \"Cookie chemistry\": https://www.kingarthurbaking.com/blog/2015/07/09/cookie-chemistry",
  KA_SPREAD: "King Arthur Baking, \"Why are my cookies spreading?\": https://www.kingarthurbaking.com/blog/2023/12/19/why-are-my-cookies-spreading",
  KA_CURDLE: "King Arthur Baking, preventing curdled cake batter: https://www.kingarthurbaking.com/blog/2021/08/11/preventing-curdled-cake-batter-emulsions",
  KA_BUTTERCAKE: "King Arthur Baking, \"Building a better butter cake\": https://www.kingarthurbaking.com/blog/2015/03/16/building-better-butter-cake",
  ATK_CULT: "America's Test Kitchen, \"How to substitute cultured dairy products\": https://www.americastestkitchen.com/how_tos/5525-how-to-substitute-cultured-dairy-products",
  ATK_MAYO: "Cook's Illustrated, \"How to fix broken mayo\": https://www.americastestkitchen.com/cooksillustrated/how_tos/13363-how-to-fix-broken-mayo",
  ATK_BROKEN: "America's Test Kitchen, \"How to fix a broken sauce\": https://www.americastestkitchen.com/articles/6748-how-to-fix-a-broken-sauce",
  ATK_CHEESE: "America's Test Kitchen, \"The gooey science of melting cheese\": https://www.americastestkitchen.com/articles/6836-the-gooey-science-of-melting-cheese",
  ATK_CITRATE: "Cook's Illustrated, \"Cook's Illustrated explains: sodium citrate\": https://www.americastestkitchen.com/articles/7649-cook-s-illustrated-explains-sodium-citrate",
  ATK_EGGSUB: "America's Test Kitchen, egg substitutes taste test: https://www.americastestkitchen.com/taste_tests/131-egg-substitutes",
  MC: "Nathan Myhrvold et al., Modernist Cuisine at Home (2012), mac and cheese with sodium citrate: https://modernistcuisine.com/tag/mac-and-cheese/",
  USDA_AMS: "USDA AMS, Egg-Grading Manual (Agric. Handbook 75), weight classes: https://www.ams.usda.gov/sites/default/files/media/Egg%20Grading%20Manual.pdf",
  NCSU_EGG: "NC State Extension (Polk Co.), \"Egg substitutes\": https://polk.ces.ncsu.edu/2025/03/egg-substitutes",
  FSIS_FRY: "USDA FSIS, \"Deep fat frying and food safety\": https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/deep-fat-frying (not re-verified)",
};

// ---------------------------------------------------------------------------------------------------------- EGGS

const eggStructureBaking = [
  { below: 0.75, verdict: "fixable", rescue: "add-missing-egg" },
  // One size off (medium or jumbo for large; 1.26 = jumbo/large weight, USDA-AMS), or one extra egg in 4+.
  { below: 1.26, verdict: "fine" },
  { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
  { below: Infinity, verdict: "redo" },
] as const;

const eggFoamBands = [
  { below: 0.85, verdict: "fixable", rescue: "add-missing-egg" },
  { below: 1.15, verdict: "fine" },
  { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
  { below: Infinity, verdict: "redo" },
] as const;

const coldEmulsion = [
  // Forgot the yolk.
  { below: 0.01, verdict: "fixable", rescue: "add-missing-yolk" },
  // One yolk still holds about 1 cup of oil if added slowly.
  { below: 0.5, verdict: "fine" },
  // Richer, thicker; thin with water or lemon.
  { below: 3.01, verdict: "fine" },
  { below: Infinity, verdict: "fixable", rescue: "scale-batch" },
] as const;

const custardBands = [
  { below: 0.75, verdict: "fixable", rescue: "add-missing-egg" },
  { below: 1.34, verdict: "fine", provisional: true },
  { below: 2.01, verdict: "fixable", rescue: "scale-batch", provisional: true },
  { below: Infinity, verdict: "redo" },
] as const;

// ---------------------------------------------------------------------------------------------------- SOLID FATS

const creamedCakes = [
  { below: 0.85, verdict: "fixable", rescue: "add-more-fat" },
  { below: 1.15, verdict: "fine" },
  { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
  { below: Infinity, verdict: "redo" },
] as const;

const coldCutPastry = [
  { below: 0.75, verdict: "fixable", rescue: "add-more-fat" },
  { below: 1.2, verdict: "fine" },
  { below: 1.5, verdict: "fixable", rescue: "scale-batch" },
  { below: Infinity, verdict: "redo" },
] as const;

const fatCookingDefault = [
  { below: 0.34, verdict: "fixable", rescue: "add-more" },
  { below: 2.01, verdict: "fine" },
  { below: 4.01, verdict: "fixable", rescue: "pour-off-fat" },
  { below: Infinity, verdict: "fixable", rescue: "pour-off-fat" },
] as const;

// ------------------------------------------------------------------------------------------------ CULTURED DAIRY

const culturedBaking = [
  { below: 0.8, verdict: "fixable", rescue: "add-more", provisional: true },
  { below: 1.2, verdict: "fine", provisional: true },
  { below: 2.01, verdict: "fixable", rescue: "scale-batch", provisional: true },
  { below: Infinity, verdict: "redo" },
] as const;

const culturedSauce = [
  { below: 0.34, verdict: "fixable", rescue: "add-more" },
  { below: 2.01, verdict: "fine" },
  { below: Infinity, verdict: "fixable", rescue: "scale-batch" },
] as const;

const cheesecake = [
  { below: 0.85, verdict: "fixable", rescue: "add-more" },
  { below: 1.15, verdict: "fine" },
  { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
  { below: Infinity, verdict: "redo" },
] as const;

const cheeseSauce = [
  { below: 0.5, verdict: "fixable", rescue: "add-more" },
  { below: 1.5, verdict: "fine" },
  { below: 2.5, verdict: "fixable", rescue: "loosen-sauce" },
  { below: Infinity, verdict: "fixable", rescue: "loosen-sauce" },
] as const;

const cheeseTopping = [
  { below: 0.34, verdict: "fixable", rescue: "add-more" },
  { below: 2.01, verdict: "fine" },
  // Research: fine-with-effect (greasy; blot with paper towel).
  { below: Infinity, verdict: "fine" },
] as const;

const cheeseBakedIn = [
  { below: 0.5, verdict: "fixable", rescue: "add-more" },
  { below: 1.5, verdict: "fine" },
  { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
  { below: Infinity, verdict: "redo" },
] as const;

/** `as const` band tables, widened back to Band[] (fresh arrays, so no role shares a mutable list). */
type BandRow = { below: number; verdict: "fine" | "fixable" | "redo"; rescue?: string; provisional?: boolean };
const b = (bands: readonly BandRow[]) => bands.map((x) => ({ ...x }));
/** The same, every cut-point marked provisional (the research's synthesis, or fewer than two sources). */
const prov = (bands: readonly BandRow[]) => bands.map((x) => ({ ...x, provisional: true }));

export const ROLES: Role[] = [
  // ------------------------------------------------------------------------------------------------ egg-structure
  {
    id: "egg-structure",
    name: "Eggs as binder and structure",
    does: "Baking: coagulating egg proteins set the crumb of cakes, muffins, quick breads, cookies and brownies, and add moisture (about 75% water), emulsify the fat and help leavening. Coatings and meatballs: egg glues crumbs and holds a mixture together.",
    // Research: true for baking, false for coatings and meatballs — the safer value is kept.
    tight: true,
    bands: {
      baking: prov(eggStructureBaking),
      // Breading wash, meatball and meatloaf binder.
      other: prov([
        { below: 0.5, verdict: "fixable", rescue: "add-missing-egg" },
        { below: 2.5, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "add-dry-binder" },
      ]),
      default: prov(eggStructureBaking),
    },
    rescues: [
      {
        id: "add-missing-egg",
        kind: "add",
        add: { role: "egg-structure", per: 1 },
        // The research marks the creamed-cake-with-flour-in case provisional (mix on low no more than 15–20 s); it is
        // left outside this `when` so the sourced rescue doesn't claim it.
        when: "as long as it hasn't been baked, and for a creamed cake before the flour goes in",
        say: "Not to worry. Beat the missing egg in a cup and mix it in just until it disappears.",
        sources: [S.KA_CURDLE, S.MCG_DOUGH],
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "once the extra egg is mixed in and before baking, with pans and oven room for the bigger batch; if the egg is still in its own bowl, take it out instead",
        say: "We'll simply make a little more. Scale everything else up to match the eggs.",
        sources: [S.KA_EGG, S.MCG_DOUGH],
      },
      {
        id: "sub-breading-wash",
        kind: "none",
        when: "for a breading wash",
        say: "No egg? Dip in a little buttermilk instead, and the crumbs will still cling. Milk, a thin mayonnaise, or mustard thinned with water also work.",
        sources: [S.FL],
        provisional: true,
      },
      {
        id: "add-dry-binder",
        kind: "add",
        add: { role: "breading", amount: "2 Tbsp fine breadcrumbs per extra egg" },
        when: "in a meatball or meatloaf mix; for a wash, just use what is needed",
        say: "The mix is wet. Work in two spoonfuls of breadcrumbs for that extra egg.",
        sources: [S.MCG_EGG],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "aquafaba — 1/4 cup (57 g) for each egg", ratio: 1, effect: "The best general swap, but it gives little structure. Replace no more than 2 eggs; not for popovers, sponge, chiffon, angel food, soufflé, quiche or custard.", sources: [S.KA_EGG, S.NCSU_EGG] },
      { use: "a flax or chia \"egg\" — 1 Tbsp ground seed + 3 Tbsp (42 g) water, rested 5–10 min, for each egg", ratio: 1, effect: "Good for cookies, brownies and muffins; denser. Replace no more than 2 eggs.", sources: [S.KA_EGG, S.NCSU_EGG] },
      { use: "mashed banana, pumpkin or applesauce — 1/4 cup (57–64 g) for each egg", ratio: 1, effect: "Good for quick breads and muffins; denser and flavoured; makes cookies cakey. Replace no more than 2 eggs.", sources: [S.KA_EGG, S.NCSU_EGG] },
      { use: "plain or Greek yogurt or buttermilk — 1/4 cup for each egg", ratio: 1, effect: "Good for muffins and pancakes; heavier. Replace no more than 2 eggs.", sources: [S.KA_EGG, S.NCSU_EGG] },
      { use: "egg yolks — 2 yolks for each whole egg", ratio: 2, effect: "Richer and chewier; safe in cookies and brownies.", sources: [S.SE_CCC, S.BT] },
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Drier and more crumbly (for example 3 eggs for 4, or medium for large).", sources: [S.KA_SPREAD, S.KA_EGG], provisional: true },
      { direction: "more", upTo: 0.25, effect: "Puffier and cakier, and cookies spread more.", sources: [S.KA_SPREAD, S.SE_CCC] },
    ],
    shows: "Too little: dry, crumbly batter that won't hold together, and a pale crumb. Too much: loose, shiny, runny batter; after baking domed, springy, eggy-smelling with rubbery edges; cookies puff instead of spreading. Count the shells on the counter.",
    sources: [S.MCG_EGG, S.KA_EGG, S.KA_SPREAD, S.USDA_AMS],
    // The exact cut-points are the research's synthesis.
    provisional: true,
  },

  // ----------------------------------------------------------------------------------------------------- egg-foam
  {
    id: "egg-foam",
    name: "Whipped eggs and whites as leavening and foam",
    does: "Baking and pastry: beaten whites (meringue, soufflé, angel food, chiffon) or whole eggs beaten to the ribbon (génoise) trap air, which is the main lift. Any fat, including yolk, stops whites foaming; overbeaten whites go grainy and weep.",
    tight: true,
    bands: { pastry: prov(eggFoamBands), baking: prov(eggFoamBands), default: prov(eggFoamBands) },
    rescues: [
      {
        id: "add-missing-egg",
        kind: "add",
        add: { role: "egg-foam", per: 1 },
        when: "before whipping only; once the foam is folded in it's a redo",
        say: "Add the missing egg now, before we whip.",
        sources: [S.KA_CURDLE, S.MCG_DOUGH],
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "before whipping only; once the foam is folded in it's a redo",
        say: "We'll simply make a little more. Scale everything else up to match the eggs.",
        sources: [S.KA_EGG, S.MCG_DOUGH],
      },
      {
        id: "rescue-overwhipped-whites",
        kind: "add",
        add: { role: "egg-foam", amount: "1 fresh unbeaten white per 4 whites already whipped" },
        when: "only slightly grainy and not yet folded in",
        say: "They've gone a touch too far. Add one fresh white and whisk briefly, and they'll smooth.",
        sources: [S.MCG_EGG],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "aquafaba — 3 Tbsp for each white (1/4 cup per whole egg)", ratio: 1, effect: "Meringue only works with a stabiliser such as cream of tartar. Never a whole egg for a whipped-white recipe.", sources: [S.KA_EGG, S.NCSU_EGG] },
    ],
    changes: [
      { direction: "less", upTo: 0.15, effect: "Slightly lower rise.", sources: [], provisional: true },
      { direction: "more", upTo: 0.15, effect: "Slightly drier.", sources: [], provisional: true },
    ],
    shows: "A yolk streak in the whites; whites that won't pass soft peak after 3–4 min of beating. Overbeaten: cottony, lumpy, dull, liquid at the bottom. Deflated: batter runny and glossy after folding; a sunken soufflé or cake.",
    sources: [S.MCG_EGG, S.BT, S.KA_EGG],
    // 0.85 / 1.15 cut-points.
    provisional: true,
  },

  // ----------------------------------------------------------------------------------------------- egg-emulsifier
  {
    id: "egg-emulsifier",
    name: "Egg yolk as emulsifier",
    does: "Sauce: mayonnaise, aioli, Caesar dressing, hollandaise and béarnaise — lecithin and proteins in the yolk coat the oil or butter droplets. One yolk carries far more oil than recipes use; the failures are oil added too fast, too little water phase, or too much heat (hollandaise curdles at about 75–80 °C / 165–175 °F).",
    // Research: true for the method, false for the yolk amount. The bands are about the amount.
    tight: false,
    // `sauce` = cold emulsions (mayo, aioli, Caesar); hot emulsions are in the NOT ENCODED block.
    bands: { sauce: b(coldEmulsion), default: b(coldEmulsion) },
    rescues: [
      {
        id: "add-missing-yolk",
        kind: "add",
        add: { role: "egg-emulsifier", per: 1 },
        when: "before any oil goes in; if the oil is already in, it's a broken sauce — rebuild it on a fresh yolk",
        say: "Add the yolk first, then the oil in a thin stream.",
        sources: [S.MCG_SAUCE, S.SFAH, S.FL],
      },
      {
        id: "scale-batch",
        kind: "scale",
        say: "Plenty of yolk, so whisk in more oil slowly and make a little more.",
        sources: [S.MCG_SAUCE, S.SFAH, S.FL],
      },
      {
        id: "rebuild-emulsion",
        kind: "add",
        add: { role: "egg-emulsifier", amount: "1 fresh yolk with 1 tsp water or mustard in a clean bowl (or 4 tsp water alone)" },
        when: "broken but not scrambled",
        say: "It's split, which is easily mended. A fresh yolk in a clean bowl, then whisk the sauce back in a spoonful at a time.",
        sources: [S.ATK_MAYO, S.MCG_SAUCE, S.SFAH],
      },
    ],
    substitutions: [
      // Store-bought mayo as a base for aioli or Caesar (SFAH, FL, provisional) has no ratio in the research — left out.
      { use: "whole egg — 1 whole egg for every 2 yolks, in a blender mayo", ratio: 0.5, effect: "Lighter and looser.", sources: [S.FL, S.MCG_SAUCE] },
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "Fine as long as the oil goes in slowly.", sources: [S.MCG_SAUCE, S.SFAH] },
      { direction: "more", upTo: 2, effect: "Richer and thicker (up to 3 times the yolk).", sources: [S.MCG_SAUCE, S.SFAH] },
    ],
    shows: "Broken: oily puddles, a thin curdled look, an oil sheen that won't come back. Scrambled hollandaise: grainy, visible curds, steam. Healthy: thick, glossy, holds a ribbon.",
    sources: [S.MCG_SAUCE, S.SFAH, S.FL],
  },

  // ----------------------------------------------------------------------------------------------- egg-custard-set
  {
    id: "egg-custard-set",
    name: "Eggs setting a custard",
    does: "Pastry, baking and eggs: quiche, crème brûlée, flan, pumpkin pie, bread pudding, cheesecake. Egg proteins gel the dairy — roughly 1 whole egg (or 2–3 yolks) per cup (240 ml) of milk or cream for a firm set. Too hot curdles; too little egg won't set.",
    tight: true,
    bands: { pastry: b(custardBands), baking: b(custardBands), default: b(custardBands) },
    rescues: [
      {
        id: "add-missing-egg",
        kind: "add",
        add: { role: "egg-custard-set", per: 1 },
        when: "before it goes in the oven; once baked it won't slice and weeps, so it's a redo",
        say: "Whisk the missing egg into the base now, before it goes in.",
        sources: [S.MCG_EGG, S.KA_EGG],
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "before baking only",
        say: "A little more egg than called for, so add dairy, sugar and flavour to match it.",
        sources: [S.MCG_EGG, S.KA_EGG],
      },
    ],
    // No safe substitution (KA-EGG, ATK-EGGSUB).
    substitutions: [],
    changes: [
      { direction: "less", upTo: 0.1, effect: "Fine (one medium for one large).", sources: [], provisional: true },
      { direction: "more", upTo: 0.33, effect: "Firmer and more rubbery.", sources: [], provisional: true },
    ],
    shows: "Too little: a liquid centre that won't jiggle as one mass; weeps when cut. Too much: rubbery, puffed, cracked top; eggy smell. Overheated: bubbles, a curdled grainy texture, liquid weeping out.",
    sources: [S.MCG_EGG, S.BT, S.KA_EGG],
    // 1.34 cut-point.
    provisional: true,
  },

  // ------------------------------------------------------------------------------------------------- fat-creamed
  {
    id: "fat-creamed",
    name: "Butter or shortening, creamed or softened, in baking",
    does: "Baking: creaming soft fat (about 18–21 °C / 65–70 °F) with sugar traps air for lift, tenderises and carries flavour in cakes and cookies. Butter melts lower than shortening, so it spreads more; melted butter skips the aeration (denser, chewier).",
    tight: true,
    // `baking` = the research's cakes band (its stated default). Cookies/brownies/bars: see NOT ENCODED.
    bands: { baking: prov(creamedCakes), default: prov(creamedCakes) },
    rescues: [
      {
        id: "add-more-fat",
        kind: "add",
        add: { role: "fat-creamed", per: 1 },
        when: "for a cake only while it's still at the creaming stage (once the flour is in it's a redo); for cookies any time before baking",
        say: "Soften the rest of the butter and beat it in now.",
        sources: [S.KA_BUTTERCAKE, S.BT],
        provisional: true,
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "before baking; no more than double",
        say: "We'll make a little more: scale everything else up to match the butter.",
        sources: [S.MCG_DOUGH, S.KA_SPREAD],
      },
      {
        id: "chill-dough",
        kind: "none",
        when: "cookie dough, before baking",
        say: "A touch rich, so chill the dough half an hour and it will hold its shape.",
        sources: [S.KA_SPREAD, S.SE_CCC],
      },
      {
        id: "re-solidify-butter",
        kind: "none",
        when: "melted butter not yet mixed, for a cake",
        say: "Pop it in the fridge and stir now and then until it's soft but solid, then carry on.",
        sources: [S.BT, S.KA_SPREAD],
        provisional: true,
      },
      {
        id: "chill-butter-sugar",
        kind: "none",
        when: "melted butter already mixed with the sugar, before the eggs or flour go in",
        say: "Chill the butter and sugar fifteen to twenty minutes until firm but soft, then cream as normal.",
        sources: [S.SE_CCC, S.KA_SPREAD, S.BT],
        provisional: true,
      },
      {
        id: "warm-butter",
        kind: "none",
        when: "butter too cold or hard to cream",
        say: "Cut it into small cubes and give it fifteen to twenty minutes, or warm the bowl briefly over hot water.",
        sources: [S.KA_BUTTERCAKE, S.BT],
      },
      {
        id: "fix-curdled-batter",
        kind: "add",
        add: { role: "wheat-flour", amount: "2 Tbsp of the recipe's own flour (up to 3–4 Tbsp in all)" },
        when: "creamed batter curdled after the eggs went in",
        say: "It's curdling. Add two spoonfuls of the flour and it will come back together.",
        sources: [S.KA_CURDLE, S.KA_BUTTERCAKE],
      },
    ],
    substitutions: [
      { use: "shortening for butter, or butter for shortening, cup for cup", ratio: 1, effect: "Shortening: less spread, crumblier and sandier cookies, a taller more tender cake, no butter flavour. Butter: more spread, so chill the dough.", sources: [S.KA_SHORT, S.KA_COOKIE, S.KA_SPREAD] },
      { use: "oil for up to a quarter of the butter — cakes only", ratio: 1, effect: "A moister cake. Not in cookies: they go greasy and crumbly with an off flavour.", sources: [S.KA_COOKIE, S.KA_OILCAKE] },
      { use: "salted butter for unsalted, with about 1/4 tsp less salt per 1/2 cup (113 g) of butter", ratio: 1, effect: "The same bake once the salt is cut.", sources: [], provisional: true },
    ],
    changes: [
      // Research: cakes to 0.85, cookies to 0.75 — the tighter (cake) figure is the number.
      { direction: "less", upTo: 0.15, effect: "Drier, tougher, less spread (cookies tolerate down to 25% less).", sources: [S.KA_SPREAD, S.MCG_DOUGH], provisional: true },
      { direction: "more", upTo: 0.15, effect: "Greasier, more spread, flatter (cookies tolerate up to 20% more).", sources: [S.KA_SPREAD, S.MCG_DOUGH], provisional: true },
    ],
    shows: "Melted or warm butter: glossy, slick, flat batter with no fluff, a pale yellow pool. Curdled batter: lumpy cottage-cheese look with weeping liquid. Too much fat: greasy dough that shines and smears the bowl; cookies spread thin and lacy. Too little: dry, crumbly dough that won't hold in a scoop.",
    sources: [S.MCG_DOUGH, S.BT, S.KA_SHORT, S.KA_SPREAD, S.SE_CCC, S.KA_BUTTERCAKE],
    provisional: true,
  },

  // ------------------------------------------------------------------------------------------------ fat-cold-cut
  {
    id: "fat-cold-cut",
    name: "Cold butter or shortening cut into pastry and biscuits",
    does: "Pastry and baking: pie crust, biscuits, scones, rough puff, laminated dough. Solid cold pieces of fat separate the flour layers and their water steams for flake; warm or melted fat makes the pastry tough, greasy and flat.",
    tight: true,
    // The research's band is "pastry"; biscuits and scones classify as baking, so baking gets the same band.
    bands: { pastry: prov(coldCutPastry), baking: prov(coldCutPastry), default: prov(coldCutPastry) },
    rescues: [
      {
        id: "add-more-fat",
        kind: "add",
        add: { role: "fat-cold-cut", per: 1 },
        when: "cold and cubed, cut in to pea size, before the water goes in",
        say: "Cut the rest of the cold butter into cubes and work it in to pea size.",
        sources: [S.SFAH, S.MCG_DOUGH],
        provisional: true,
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "adding flour and liquid to match; no more than 1.5 times",
        say: "We'll make a little more: add flour and liquid to match the butter.",
        sources: [S.MCG_DOUGH],
        provisional: true,
      },
      {
        id: "chill-pastry",
        kind: "none",
        when: "fat gone warm or soft, before rolling or baking",
        say: "It's gone soft. Into the fridge for half an hour, then we roll.",
        sources: [S.SFAH, S.KA_SPREAD],
      },
    ],
    substitutions: [
      { use: "shortening or lard for butter, or half and half", ratio: 1, effect: "More tender and flaky, less flavour.", sources: [S.KA_SHORT, S.MCG_DOUGH] },
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Tougher.", sources: [], provisional: true },
      { direction: "more", upTo: 0.2, effect: "More fragile, greasier.", sources: [], provisional: true },
    ],
    shows: "Warm fat: sticky, greasy dough that smears on the board, no visible butter flecks. Too much fat: dough tears and leaks butter in the oven; the crust slumps. Good: visible pea-sized butter streaks.",
    sources: [S.SFAH, S.MCG_DOUGH, S.KA_SHORT],
    provisional: true,
  },

  // ------------------------------------------------------------------------------------------------- fat-cooking
  {
    id: "fat-cooking",
    name: "Butter or solid fat for cooking and finishing",
    does: "Sauté and roast: a browning medium — butter's milk solids burn above about 175 °C / 350 °F; clarified butter, ghee or oil go hotter. Sauce: finishing a pan sauce (monter au beurre), beurre blanc, roux (fat to flour about 1:1 by weight). Grains: richness.",
    // Research: true only for beurre blanc and other butter emulsions.
    tight: false,
    bands: {
      saute: prov(fatCookingDefault),
      roast: prov(fatCookingDefault),
      grains: prov(fatCookingDefault),
      // Pan sauce finished with butter; the roux variant is in NOT ENCODED.
      sauce: [
        { below: 0.5, verdict: "fixable", rescue: "add-more" },
        { below: 1.6, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "re-emulsify-pan-sauce" },
      ],
      default: prov(fatCookingDefault),
    },
    rescues: [
      {
        id: "add-more",
        kind: "add",
        add: { role: "fat-cooking", per: 1 },
        say: "Add the rest of the fat and let it heat before the food goes in.",
        sources: [S.SFAH, S.MCG_FAT],
      },
      {
        id: "pour-off-fat",
        kind: "none",
        say: "Too much fat, so tip the pan and spoon off the extra.",
        sources: [S.SFAH, S.FL],
      },
      {
        id: "re-emulsify-pan-sauce",
        kind: "add",
        add: { role: "liquid-water-stock", amount: "about 1/4 cup water" },
        when: "no flour or cornstarch — water only, whisked at a vigorous simmer",
        say: "It's turned greasy. A splash of water, whisk hard at a simmer, and it'll come back.",
        sources: [S.ATK_BROKEN, S.MCG_SAUCE],
      },
    ],
    substitutions: [
      { use: "oil for butter in sautéing", ratio: 1, effect: "Fine: less flavour, higher smoke point.", sources: [S.MCG_FAT, S.SFAH] },
      { use: "ghee for butter", ratio: 1, effect: "Fine.", sources: [S.MCG_FAT, S.SFAH] },
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "Fine, with some risk of sticking.", sources: [S.SFAH], provisional: true },
      { direction: "more", upTo: 1, effect: "Richer; beyond double, pour off the extra.", sources: [S.SFAH], provisional: true },
    ],
    shows: "Smoking, blackening butter (burnt: wipe the pan and start the fat again; brown and nutty is fine). Food swimming in fat. Broken pan sauce: fat beading or pooling on the surface. Too little: food sticks and browns unevenly.",
    sources: [S.MCG_MILK, S.MCG_SAUCE, S.SFAH, S.MCG_FAT],
    // The saute/roast/grains band is provisional.
    provisional: true,
  },

  // -------------------------------------------------------------------------------------------------- oil-baking
  {
    id: "oil-baking",
    name: "Oil as the fat in batters",
    does: "Baking: oil cakes (chiffon, carrot, chocolate), muffins, quick breads, brownies, olive oil cake. Oil coats the flour and stays liquid, so the crumb is moist and tender; it has no aeration role.",
    tight: true,
    bands: {
      baking: prov([
        { below: 0.75, verdict: "fixable", rescue: "add-more-oil" },
        { below: 1.15, verdict: "fine" },
        { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
        { below: Infinity, verdict: "redo" },
      ]),
      default: prov([
        { below: 0.75, verdict: "fixable", rescue: "add-more-oil" },
        { below: 1.15, verdict: "fine" },
        { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
        { below: Infinity, verdict: "redo" },
      ]),
    },
    rescues: [
      {
        id: "add-more-oil",
        kind: "add",
        add: { role: "oil-baking", per: 1 },
        when: "any time before baking",
        say: "Stir in the rest of the oil until just combined.",
        sources: [S.KA_OILCAKE, S.MCG_DOUGH],
        provisional: true,
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "before baking; no more than double",
        say: "We'll make a little more: scale everything else up to match the oil.",
        sources: [S.MCG_DOUGH, S.KA_OILCAKE],
      },
    ],
    substitutions: [
      { use: "melted butter for oil, plus about 1 Tbsp extra per 1/2 cup", ratio: 1.125, effect: "Slightly drier; firms when cold.", sources: [S.KA_SHORT, S.KA_OILCAKE], provisional: true },
      { use: "oil for melted butter, at three quarters the volume", ratio: 0.75, effect: "Oil is all fat and butter about 80%; more tender.", sources: [S.KA_SHORT, S.KA_OILCAKE], provisional: true },
      { use: "extra-virgin olive oil for a neutral oil", ratio: 1, effect: "Fine; adds a peppery flavour.", sources: [S.SFAH, S.KA_OILCAKE], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Drier.", sources: [], provisional: true },
      { direction: "more", upTo: 0.15, effect: "Moister, greasier.", sources: [], provisional: true },
    ],
    shows: "Too much: batter glistens and oil separates at the edges; the baked crumb is oily and dense with a sunken centre. Too little: thick, pasty batter.",
    sources: [S.KA_OILCAKE, S.MCG_DOUGH, S.KA_COOKIE],
    provisional: true,
  },

  // -------------------------------------------------------------------------------------------------- oil-frying
  {
    id: "oil-frying",
    name: "Oil for deep and shallow frying",
    does: "Sauté and other: heat transfer. Deep frying submerges the food at 175–190 °C / 350–375 °F; shallow frying uses oil about half the food's height, or about 1 cm. Too little oil or overcrowding crashes the temperature and makes the food greasy; too much risks an overflow fire.",
    // Research: false for the amount; true for safety (fill level, temperature) — safety is in NOT ENCODED.
    tight: false,
    bands: {
      // Shallow fry. Above 2.01 the ratio is fine, but the half-pot fill rule (NOT ENCODED) must still be checked.
      saute: prov([
        { below: 0.5, verdict: "fixable", rescue: "add-more" },
        { below: 2.01, verdict: "fine" },
        { below: Infinity, verdict: "fine" },
      ]),
      // Deep fry.
      other: [
        { below: 0.75, verdict: "fixable", rescue: "add-more", provisional: true },
        { below: 1.5, verdict: "fine", provisional: true },
        { below: Infinity, verdict: "fixable", rescue: "remove-excess-oil" },
      ],
      // The research names no default; the deep-fry band is the safer one.
      default: [
        { below: 0.75, verdict: "fixable", rescue: "add-more", provisional: true },
        { below: 1.5, verdict: "fine", provisional: true },
        { below: Infinity, verdict: "fixable", rescue: "remove-excess-oil" },
      ],
    },
    rescues: [
      {
        id: "add-more",
        kind: "add",
        add: { role: "oil-frying", per: 1 },
        when: "then let it come back to temperature (check with a thermometer) before adding food, and fry in smaller batches",
        say: "Add a little more oil and let it come back to temperature before the next piece.",
        sources: [S.FL, S.MCG_FAT],
      },
      {
        id: "remove-excess-oil",
        kind: "none",
        when: "only while the oil is still cold; if it's already hot, turn the heat off and don't move the pot",
        say: "That's too full to fry safely. Before you turn the heat on, ladle some out until it's half full.",
        sources: [S.FL, S.FSIS_FRY],
      },
    ],
    substitutions: [
      { use: "any refined neutral oil (peanut, canola, rice bran)", ratio: 1, effect: "Fine. Not butter for deep frying — it burns.", sources: [S.MCG_FAT, S.FL] },
    ],
    changes: [
      // "More: any amount within the half-pot rule" has no number, so only "less" is encoded.
      { direction: "less", upTo: 0.5, effect: "Shallow frying only, down to half.", sources: [S.FL, S.FSIS_FRY] },
    ],
    shows: "Too little or too cold: food sits in still oil with few bubbles and comes out pale and greasy. Too hot: smoke, fast darkening, a raw centre. Overfull: oil near the rim, violent foam when food goes in.",
    sources: [S.MCG_FAT, S.FL, S.FSIS_FRY],
    provisional: true,
  },

  // ------------------------------------------------------------------------------------------------- oil-dressing
  {
    id: "oil-dressing",
    name: "Oil in dressings, vinaigrettes and finishing",
    does: "Sauce and other: a vinaigrette starts at about 3 parts oil to 1 part acid, adjusted to taste; mustard, honey or yolk keeps it emulsified. Drizzled extra-virgin olive oil finishes a dish.",
    tight: false,
    bands: {
      sauce: [
        { below: 0.34, verdict: "fixable", rescue: "add-more-oil" },
        // Sharp, but balanced by taste.
        { below: 0.67, verdict: "fixable", rescue: "add-more-oil" },
        { below: 1.5, verdict: "fine" },
        { below: 3.01, verdict: "fixable", rescue: "balance-acid" },
        { below: Infinity, verdict: "fixable", rescue: "scale-batch" },
      ],
      default: [
        { below: 0.34, verdict: "fixable", rescue: "add-more-oil" },
        { below: 0.67, verdict: "fixable", rescue: "add-more-oil" },
        { below: 1.5, verdict: "fine" },
        { below: 3.01, verdict: "fixable", rescue: "balance-acid" },
        { below: Infinity, verdict: "fixable", rescue: "scale-batch" },
      ],
    },
    rescues: [
      {
        id: "add-more-oil",
        kind: "add",
        add: { role: "oil-dressing", per: 1 },
        say: "Whisk in the rest of the oil, then taste.",
        sources: [S.SFAH, S.FL],
      },
      {
        id: "balance-acid",
        kind: "add",
        // per 1 of the recipe's own acid for each unit over keeps the recipe's oil-to-acid ratio (1 part acid per 3
        // parts extra oil in a 3:1 vinaigrette).
        add: { role: "acid-flavour", per: 1 },
        say: "It's oily. Add a spoon of vinegar for every three of extra oil, with a pinch of salt, then taste.",
        sources: [S.SFAH, S.FL],
      },
      {
        id: "scale-batch",
        kind: "scale",
        say: "Make a little more dressing to match the oil, and keep the leftover.",
        sources: [S.SFAH, S.FL],
      },
      {
        id: "reshake",
        kind: "none",
        when: "a vinaigrette that has separated",
        say: "Just shake it again; half a teaspoon of mustard per quarter cup will hold it.",
        sources: [S.FL, S.MCG_SAUCE],
      },
    ],
    substitutions: [
      { use: "any neutral oil for olive oil, or olive oil for a neutral oil", ratio: 1, effect: "Neutral oil is milder; olive oil may solidify in the fridge.", sources: [S.SFAH, S.MCG_FAT] },
    ],
    changes: [
      { direction: "less", upTo: 0.33, effect: "Sharper; adjust to taste.", sources: [S.SFAH, S.FL] },
      { direction: "more", upTo: 0.5, effect: "Milder and oilier; adjust to taste.", sources: [S.SFAH, S.FL] },
    ],
    shows: "A pool of oil on the plate or leaves; dressing separating into layers (normal for an unemulsified vinaigrette).",
    sources: [S.SFAH, S.FL, S.MCG_SAUCE],
  },

  // -------------------------------------------------------------------------------------------------- oil-cooking
  {
    id: "oil-cooking",
    name: "Oil for sautéing and roasting",
    does: "Sauté, roast, braise and grains: browning and heat transfer, and stops sticking. About 1–2 Tbsp per pan, or about 1 Tbsp per 450 g of vegetables for roasting.",
    tight: false,
    bands: {
      default: prov([
        { below: 0.34, verdict: "fixable", rescue: "add-more" },
        { below: 3.01, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "pour-off-fat" },
      ]),
    },
    rescues: [
      {
        id: "add-more",
        kind: "add",
        add: { role: "oil-cooking", per: 1 },
        say: "Add the rest of the oil and let it heat before the food goes in.",
        sources: [S.SFAH, S.MCG_FAT],
      },
      {
        id: "pour-off-fat",
        kind: "none",
        say: "Too much oil, so tip the pan and spoon off the extra; for a roast, drain it on a rack or paper towel.",
        sources: [S.SFAH, S.FL],
      },
    ],
    substitutions: [
      { use: "butter for oil (ghee for high heat)", ratio: 1, effect: "Fine at moderate heat.", sources: [S.MCG_FAT, S.SFAH] },
      { use: "extra-virgin olive oil for a neutral oil", ratio: 1, effect: "Fine at sauté heat.", sources: [S.MCG_FAT, S.SFAH] },
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "Risk of sticking.", sources: [], provisional: true },
      { direction: "more", upTo: 2, effect: "Greasy; pour off the extra.", sources: [], provisional: true },
    ],
    shows: "Dry pan, food sticking, smoke; or food deep in oil and a greasy roast pan.",
    sources: [S.SFAH, S.MCG_FAT, S.FL],
    provisional: true,
  },

  // ------------------------------------------------------------------------------------------------- dairy-liquid
  {
    id: "dairy-liquid",
    name: "Milk and cream as the liquid",
    does: "Baking: hydrates the flour, adds tenderness and browning. Sauce: béchamel and cream sauces. Eggs: custards (see egg-custard-set). Braise and grains: a creamy liquid. Cream of 25%+ fat can boil without curdling; milk curdles with acid and heat.",
    // Research: true for baking, false for sauces and grains.
    tight: true,
    bands: {
      baking: prov([
        { below: 0.8, verdict: "fixable", rescue: "add-more-liquid" },
        { below: 1.15, verdict: "fine" },
        // 1.15–1.5 and 1.5–2.0 are both scale-batch (research: "up to 2.0, then redo"). For doughs the research also
        // offers adding flour a tablespoon at a time (provisional).
        { below: 1.5, verdict: "fixable", rescue: "scale-batch" },
        { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
        { below: Infinity, verdict: "redo" },
      ]),
      sauce: [
        { below: 0.5, verdict: "fixable", rescue: "add-more-simmer" },
        { below: 1.5, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "reduce" },
      ],
      grains: prov([
        { below: 0.5, verdict: "fixable", rescue: "add-more-simmer" },
        { below: 2.01, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "reduce" },
      ]),
      braise: prov([
        { below: 0.5, verdict: "fixable", rescue: "add-more-simmer" },
        { below: 2.01, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "reduce" },
      ]),
      // The research names no default; the baking band is the tightest.
      default: prov([
        { below: 0.8, verdict: "fixable", rescue: "add-more-liquid" },
        { below: 1.15, verdict: "fine" },
        { below: 1.5, verdict: "fixable", rescue: "scale-batch" },
        { below: 2.01, verdict: "fixable", rescue: "scale-batch" },
        { below: Infinity, verdict: "redo" },
      ]),
    },
    rescues: [
      {
        id: "add-more-liquid",
        kind: "add",
        add: { role: "dairy-liquid", per: 1 },
        when: "before baking",
        say: "Add the rest of the milk and mix just to combine.",
        sources: [S.MCG_DOUGH, S.KA_BM],
        provisional: true,
      },
      {
        id: "add-more-simmer",
        kind: "add",
        add: { role: "dairy-liquid", per: 1 },
        say: "Add the rest of the milk and let it simmer a couple of minutes.",
        sources: [S.MCG_SAUCE, S.SFAH],
      },
      {
        id: "reduce",
        kind: "none",
        when: "gentle heat for milk, to avoid a skin and scorching; for béchamel a little roux or slurry also thickens",
        say: "Bit thin. Let it simmer and stir until it coats the spoon.",
        sources: [S.MCG_MILK, S.MCG_SAUCE],
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "before baking; no more than double",
        say: "We'll make a little more: scale everything else up to match the milk.",
        sources: [],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "whole milk in place of cream, in a sauce", ratio: 1, effect: "Thinner, and it may curdle — don't boil it with acid.", sources: [S.MCG_MILK, S.SFAH] },
      { use: "half-and-half for heavy cream", ratio: 1, effect: "Fine in coffee and soups; it won't whip and may curdle with acid or a boil.", sources: [S.MCG_MILK, S.FL], provisional: true },
      { use: "water for milk, in baking", ratio: 1, effect: "Paler, less tender, less browning.", sources: [S.MCG_DOUGH], provisional: true },
    ],
    changes: [
      // Research: baking ±15%, sauces ±50% — the tighter (baking) figure is the number.
      { direction: "less", upTo: 0.15, effect: "In baking; sauces take up to 50% less, then adjust the thickness.", sources: [S.MCG_DOUGH, S.MCG_SAUCE], provisional: true },
      { direction: "more", upTo: 0.15, effect: "In baking; sauces take up to 50% more, then adjust the thickness.", sources: [S.MCG_DOUGH, S.MCG_SAUCE], provisional: true },
    ],
    shows: "Batter too thin (pours like cream when it should scoop) or too stiff. Sauce curdled: tiny white flecks, a watery edge (slightly grainy: whisk or blend; in a custard it's a redo). Scorched: brown skin on the base, a burnt smell.",
    sources: [S.MCG_MILK, S.SFAH, S.MCG_DOUGH, S.KA_BM, S.MCG_SAUCE],
    provisional: true,
  },

  // ------------------------------------------------------------------------------------------ dairy-whipped-cream
  {
    id: "dairy-whipped-cream",
    name: "Cream whipped as a foam",
    does: "Pastry: whipped cream, mousse, chantilly. Needs 30%+ fat and cold cream (about 5 °C). Overwhipping makes it grainy, then turns it to butter.",
    tight: true,
    // The amount is non-critical; the state slips (overwhipped, separated, low-fat cream) are in NOT ENCODED.
    bands: {
      pastry: [
        { below: 0.75, verdict: "fixable", rescue: "use-sparingly" },
        { below: 1.5, verdict: "fine" },
        // Make extra.
        { below: Infinity, verdict: "fine" },
      ],
      default: [
        { below: 0.75, verdict: "fixable", rescue: "use-sparingly" },
        { below: 1.5, verdict: "fine" },
        { below: Infinity, verdict: "fine" },
      ],
    },
    rescues: [
      {
        id: "use-sparingly",
        kind: "none",
        say: "There's a little less cream, so spread it a touch thinner.",
        sources: [S.MCG_MILK, S.BT],
      },
      {
        id: "rescue-overwhipped-cream",
        kind: "add",
        add: { role: "dairy-liquid", amount: "2 Tbsp cold liquid cream per 1 cup of whipped cream" },
        when: "still a foam, not yet separated; fold gently by hand",
        say: "Gone a whisker too far. Fold in a couple of spoons of cold cream by hand.",
        sources: [S.MCG_MILK, S.BT],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "coconut cream, chilled, solids only", ratio: 1, effect: "Whips, with a flavour change. Nothing under 30% fat will whip.", sources: [S.MCG_MILK], provisional: true },
    ],
    changes: [],
    shows: "Overwhipped: lumpy, matte, curdled, yellowing, liquid at the bottom (separated into butter: redo, keep it as butter). Won't whip: stays liquid after 3–4 min.",
    sources: [S.MCG_MILK, S.BT],
  },

  // ---------------------------------------------------------------------------------------------- dairy-cultured
  {
    id: "dairy-cultured",
    name: "Cultured dairy (acid and moisture)",
    does: "Baking: acid activates baking soda and tenderises (biscuits, pancakes, soda bread, cakes, muffins). Sauce and braise: tang and body; yogurt and low-fat sour cream curdle if boiled, crème fraîche won't.",
    // Research: true for baking with baking soda, false otherwise.
    tight: true,
    bands: {
      baking: b(culturedBaking),
      sauce: prov(culturedSauce),
      braise: prov(culturedSauce),
      default: b(culturedBaking),
    },
    rescues: [
      {
        id: "add-more",
        kind: "add",
        add: { role: "dairy-cultured", per: 1 },
        when: "before baking; in a sauce, off the heat",
        say: "Add the rest and mix just to combine.",
        sources: [S.KA_BM, S.ATK_CULT],
        provisional: true,
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "before baking; no more than double",
        say: "We'll make a little more: scale everything else up to match.",
        sources: [],
        provisional: true,
      },
      {
        id: "temper-before-adding",
        kind: "none",
        when: "adding yogurt or sour cream to a hot sauce",
        say: "Take it off the heat first and stir the yogurt in, so it stays smooth.",
        sources: [S.MCG_MILK, S.SFAH],
      },
    ],
    substitutions: [
      { use: "for buttermilk: Greek yogurt thinned with water — 1/3 cup yogurt to 2/3 cup water per cup (or 1 part Greek yogurt to 2 parts milk)", ratio: 1, effect: "The best match.", sources: [S.ATK_CULT, S.KA_BM] },
      { use: "for buttermilk: plain whole-milk yogurt and water, half and half", ratio: 1, effect: "Fine.", sources: [S.ATK_CULT, S.KA_BM] },
      { use: "for buttermilk: milk with 1 Tbsp lemon juice or vinegar per cup, rested 10–15 min", ratio: 1, effect: "Fine in cakes and muffins; for biscuits and pancakes use the thinned yogurt instead (sources disagree). Plain milk with no acid fails where the recipe relies on baking soda.", sources: [S.KA_BM, S.ATK_CULT] },
      { use: "for buttermilk: kefir", ratio: 1, effect: "Fine; browns faster.", sources: [S.ATK_CULT], provisional: true },
      { use: "sour cream for whole-milk yogurt, or yogurt for sour cream", ratio: 1, effect: "Fine; yogurt gives drier cakes (sour cream has over 4 times the fat).", sources: [S.ATK_CULT, S.KA_EGG] },
      { use: "Greek yogurt for regular yogurt in baking, thinned about 2 parts yogurt to 1 part water", ratio: 1, effect: "Unthinned, batters turn stiff.", sources: [S.ATK_CULT, S.KA_BM] },
      { use: "Greek yogurt for sour cream, or sour cream for Greek yogurt", ratio: 1, effect: "Fine for dips and toppings; tangier and thicker.", sources: [], provisional: true },
    ],
    changes: [
      // Research: baking ±20%; sauces and dips freely 0.34–2 — the baking figure is the number.
      { direction: "less", upTo: 0.2, effect: "In baking; sauces and dips take down to a third.", sources: [], provisional: true },
      { direction: "more", upTo: 0.2, effect: "In baking; sauces and dips take up to double.", sources: [], provisional: true },
    ],
    shows: "Too much: batter loose and pourable when it should be a soft dough; biscuits slump. Too little: dough shaggy and dry. Curdled in a sauce: white flecks and whey separating (grainy but edible). Plain milk used: biscuits pale and flat.",
    sources: [S.MCG_MILK, S.KA_BM, S.ATK_CULT, S.SFAH],
    provisional: true,
  },

  // ------------------------------------------------------------------------------------------- dairy-fresh-cheese
  {
    id: "dairy-fresh-cheese",
    name: "Fresh soft cheeses (cottage, ricotta, cream cheese, mascarpone)",
    does: "Baking and pastry: body and moisture (cheesecake, cheese filling, frosting). Other: fillings (lasagne, stuffed pasta) and dips. Cream cheese must be soft (about 18–21 °C) or it lumps; low-fat versions weep in baked uses.",
    // Research: true for cheesecake, false for fillings and dips.
    tight: true,
    bands: {
      // Cheesecake (research: pastry). Cheesecakes classify as baking, so baking gets the same band; so does default.
      pastry: prov(cheesecake),
      baking: prov(cheesecake),
      // Fillings and dips.
      other: prov([
        { below: 0.5, verdict: "fixable", rescue: "add-more" },
        { below: 2.01, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "scale-batch" },
      ]),
      default: prov(cheesecake),
    },
    rescues: [
      {
        id: "add-more",
        kind: "add",
        add: { role: "dairy-fresh-cheese", per: 1 },
        when: "before baking",
        say: "Beat in the rest of the cheese until smooth.",
        sources: [S.BT, S.MCG_EGG],
        provisional: true,
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "before baking; eggs, sugar and the rest to match; no more than double",
        say: "We'll make a little more: scale the eggs, sugar and the rest up to match the cheese.",
        sources: [S.BT, S.MCG_EGG],
        provisional: true,
      },
      {
        id: "soften",
        kind: "none",
        when: "cold, lumpy cream cheese",
        say: "It's lumpy because it's cold. Beat the cream cheese alone until smooth, then add the rest.",
        sources: [S.BT, S.KA_COOKIE],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "cottage cheese blended smooth for ricotta, or ricotta for cottage cheese", ratio: 1, effect: "Fine in lasagne and fillings; wetter, so drain it.", sources: [], provisional: true },
      { use: "mascarpone for cream cheese, in frosting", ratio: 1, effect: "Softer and richer. Not low-fat cream cheese in a cheesecake: it bakes hard and pale.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.15, effect: "Cheesecake; fillings change freely.", sources: [], provisional: true },
      { direction: "more", upTo: 0.15, effect: "Cheesecake; fillings change freely.", sources: [], provisional: true },
    ],
    shows: "Lumpy, flecked batter; a weeping or cracked cheesecake; watery lasagne layers.",
    sources: [S.MCG_MILK, S.BT, S.MCG_EGG],
    provisional: true,
  },

  // ------------------------------------------------------------------------------------------------ cheese-melting
  {
    id: "cheese-melting",
    name: "Cheese melted in sauces and toppings",
    does: "Sauce: mac and cheese, fondue, queso. Roast and baking: toppings, gratins, pizza. Young moist cheeses (mozzarella, Monterey Jack, mild cheddar, young Gruyère, fontina) melt smoothly; aged ones (Parmesan, aged cheddar) break into fat and grains. Overheating squeezes out fat; starch, evaporated milk or sodium citrate stabilise a sauce.",
    // Research: false for toppings, true for smooth sauces.
    tight: false,
    bands: {
      roast: prov(cheeseTopping),
      baking: prov(cheeseTopping),
      sauce: prov(cheeseSauce),
      // The research names no default; the sauce band is the tighter.
      default: prov(cheeseSauce),
    },
    rescues: [
      {
        id: "add-more",
        kind: "add",
        add: { role: "cheese-melting", per: 1 },
        when: "in a sauce, off the heat, a handful at a time",
        say: "Add the rest of the cheese, a handful at a time.",
        sources: [S.ATK_CHEESE, S.MCG_MILK, S.SE_MAC],
        provisional: true,
      },
      {
        id: "loosen-sauce",
        kind: "add",
        add: { role: "dairy-liquid", amount: "2 Tbsp warm milk per extra 1/4 cup of cheese" },
        when: "over low heat",
        say: "Thick and heavy. Whisk in warm milk a little at a time, over low heat.",
        sources: [S.SE_MAC, S.MCG_MILK],
        provisional: true,
      },
      {
        id: "rebuild-cheese-sauce",
        kind: "add",
        add: { role: "starch-thickener", amount: "1 tsp cornstarch slurried in 1 Tbsp cold liquid, with 1 tsp lemon juice or white wine, per 2 cups of sauce (or sodium citrate at about 4% of the cheese weight)" },
        when: "off the heat; only just split, not burnt",
        say: "It's split from the heat. Off the burner, whisk in a little cornstarch slurry, and it will smooth.",
        sources: [S.ATK_CITRATE, S.MC, S.MCG_MILK],
        provisional: true,
      },
      {
        id: "blend-young-melter",
        kind: "add",
        add: { role: "cheese-melting", amount: "at least 2 parts young melting cheese to 1 part aged" },
        when: "Parmesan or very aged cheddar used as the main sauce cheese",
        say: "Aged cheese alone goes grainy. Melt in twice as much young cheese, like Jack or mild cheddar.",
        sources: [S.ATK_CHEESE, S.MCG_MILK],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "any young melting cheese for another (Jack, mild cheddar, fontina, young Gruyère), by weight", ratio: 1, effect: "Fine. American cheese, or sodium citrate added, gives the smoothest sauce.", sources: [S.ATK_CHEESE, S.MCG_MILK, S.ATK_CITRATE] },
      { use: "aged hard cheese for a melter, as no more than a third of the total", ratio: 1, effect: "Flavour only; the rest must be a young melter.", sources: [S.ATK_CHEESE, S.MCG_MILK, S.ATK_CITRATE] },
    ],
    changes: [
      // Research: toppings 0.5–2, sauces ±50% (with a liquid adjustment) — the sauce figure is the number.
      { direction: "less", upTo: 0.5, effect: "Toppings and sauces; a sauce gets thinner and paler.", sources: [S.ATK_CHEESE, S.SE_MAC], provisional: true },
      { direction: "more", upTo: 0.5, effect: "In a sauce, adjust with more liquid; toppings take up to double.", sources: [S.ATK_CHEESE, S.SE_MAC], provisional: true },
    ],
    shows: "Broken: oil slick on the sauce or pizza; clumpy, ropey strands; a grainy, sandy texture. Too hot: bubbling, browning fat. Too little cheese: a pale, thin sauce. Too much on a topping: greasy — blot with paper towel.",
    sources: [S.ATK_CHEESE, S.MCG_MILK, S.ATK_CITRATE, S.SE_MAC],
    provisional: true,
  },

  // ----------------------------------------------------------------------------------------------- cheese-baked-in
  {
    id: "cheese-baked-in",
    name: "Cheese folded into doughs and batters",
    does: "Baking: flavour, fat and moisture in gougères, cheese scones and biscuits, cheese bread, savoury muffins and cornbread. Grated aged cheese adds salt.",
    tight: false,
    bands: { baking: prov(cheeseBakedIn), default: prov(cheeseBakedIn) },
    rescues: [
      {
        id: "add-more",
        kind: "add",
        add: { role: "cheese-baked-in", per: 1 },
        when: "folded in before baking",
        say: "Fold in the rest of the cheese now.",
        sources: [S.MCG_DOUGH, S.MCG_MILK],
        provisional: true,
      },
      {
        id: "scale-batch",
        kind: "scale",
        when: "before baking; no more than double",
        say: "We'll make a little more: scale everything else up to match the cheese.",
        sources: [S.MCG_DOUGH, S.MCG_MILK],
        provisional: true,
      },
      {
        id: "cut-added-salt",
        kind: "none",
        when: "a salty aged cheese doubled, and the recipe's salt not yet added",
        say: "That cheese brings salt, so put in only half the recipe's salt.",
        sources: [],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "any firm grating cheese, by weight", ratio: 1, effect: "Fine; the flavour changes.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "Milder.", sources: [], provisional: true },
      { direction: "more", upTo: 0.5, effect: "Richer and saltier.", sources: [], provisional: true },
    ],
    shows: "Greasy dough with an oil sheen; puddles of fat on the tray; scones spreading and browning fast.",
    sources: [S.MCG_MILK, S.MCG_DOUGH],
    provisional: true,
  },
];

/** Normalised item → role ids, the role it most often plays first. */
export const INDEX: Record<string, string[]> = {
  // Eggs
  "egg": ["egg-structure", "egg-custard-set", "egg-foam", "egg-emulsifier"],
  "egg white": ["egg-foam", "egg-structure"],
  "egg yolk": ["egg-custard-set", "egg-emulsifier", "egg-structure"],
  "liquid egg": ["egg-structure"],
  "egg substitute": ["egg-structure"],
  "aquafaba": ["egg-foam"],
  // Solid fats
  "butter": ["fat-creamed", "fat-cold-cut", "fat-cooking"],
  "shortening": ["fat-creamed", "fat-cold-cut", "oil-frying"],
  "margarine": ["fat-creamed"],
  "vegan butter": ["fat-creamed"],
  "lard": ["fat-cold-cut", "fat-creamed", "fat-cooking", "oil-frying"],
  "leaf lard": ["fat-cold-cut"],
  "ghee": ["fat-cooking"],
  "clarified butter": ["fat-cooking"],
  "brown butter": ["fat-cooking"],
  "bacon fat": ["fat-cooking"],
  "duck fat": ["fat-cooking"],
  "schmaltz": ["fat-cooking"],
  // Oils (sesame and nut oils deliberately absent — see NOT ENCODED)
  "vegetable oil": ["oil-cooking", "oil-baking", "oil-frying"],
  "canola oil": ["oil-cooking", "oil-baking", "oil-frying"],
  "neutral oil": ["oil-cooking", "oil-baking", "oil-frying"],
  "sunflower oil": ["oil-cooking", "oil-baking", "oil-frying"],
  "grapeseed oil": ["oil-baking"],
  "olive oil": ["oil-cooking", "oil-dressing", "oil-baking", "oil-frying"],
  "extra-virgin olive oil": ["oil-dressing", "oil-cooking", "oil-baking"],
  "coconut oil": ["oil-baking"],
  "peanut oil": ["oil-frying"],
  "rice bran oil": ["oil-frying"],
  "frying oil": ["oil-frying"],
  "avocado oil": ["oil-cooking"],
  "cooking oil": ["oil-cooking"],
  "cooking spray": ["oil-cooking"],
  "salad oil": ["oil-dressing"],
  // Milk and cream
  "milk": ["dairy-liquid"],
  "whole milk": ["dairy-liquid"],
  "skim milk": ["dairy-liquid"],
  "half-and-half": ["dairy-liquid"],
  "cream": ["dairy-liquid", "dairy-whipped-cream"],
  "single cream": ["dairy-liquid"],
  "heavy cream": ["dairy-liquid", "dairy-whipped-cream"],
  "whipping cream": ["dairy-whipped-cream", "dairy-liquid"],
  "double cream": ["dairy-whipped-cream", "dairy-liquid"],
  "evaporated milk": ["dairy-liquid"],
  "non-dairy milk": ["dairy-liquid"],
  "oat milk": ["dairy-liquid"],
  "almond milk": ["dairy-liquid"],
  "soy milk": ["dairy-liquid"],
  // Cultured dairy
  "buttermilk": ["dairy-cultured"],
  "yogurt": ["dairy-cultured"],
  "greek yogurt": ["dairy-cultured"],
  "labneh": ["dairy-cultured"],
  "skyr": ["dairy-cultured"],
  "sour cream": ["dairy-cultured"],
  "creme fraiche": ["dairy-cultured"],
  "kefir": ["dairy-cultured"],
  // Fresh cheese
  "cottage cheese": ["dairy-fresh-cheese"],
  "ricotta": ["dairy-fresh-cheese"],
  "cream cheese": ["dairy-fresh-cheese"],
  "neufchatel": ["dairy-fresh-cheese"],
  "mascarpone": ["dairy-fresh-cheese"],
  "quark": ["dairy-fresh-cheese"],
  "farmer cheese": ["dairy-fresh-cheese"],
  "fromage blanc": ["dairy-fresh-cheese"],
  // Cheese
  "cheddar": ["cheese-melting", "cheese-baked-in"],
  "mild cheddar": ["cheese-melting", "cheese-baked-in"],
  "sharp cheddar": ["cheese-melting", "cheese-baked-in"],
  "mozzarella": ["cheese-melting"],
  "monterey jack": ["cheese-melting"],
  "gruyere": ["cheese-melting", "cheese-baked-in"],
  "swiss cheese": ["cheese-melting"],
  "emmental": ["cheese-melting"],
  "fontina": ["cheese-melting"],
  "provolone": ["cheese-melting"],
  "american cheese": ["cheese-melting"],
  "parmesan": ["cheese-baked-in", "cheese-melting"],
  "pecorino": ["cheese-baked-in", "cheese-melting"],
  "shredded cheese": ["cheese-melting", "cheese-baked-in"],
  "grated cheese": ["cheese-baked-in", "cheese-melting"],
  "cheese blend": ["cheese-melting"],
  "feta": ["cheese-baked-in"],
};

/** Another name for the very same ingredient → its INDEX key. */
export const ALIASES: Record<string, string> = {
  "whole egg": "egg",
  "beaten egg": "egg",
  "yolk": "egg yolk",
  "white of egg": "egg white",
  "cubed butter": "butter",
  "frozen butter": "butter",
  "frozen grated butter": "butter",
  "grated butter": "butter",
  "room-temperature butter": "butter",
  "butter stick": "butter",
  "vegetable shortening": "shortening",
  "crisco": "shortening",
  "beurre noisette": "brown butter",
  "browned butter": "brown butter",
  "bacon grease": "bacon fat",
  "chicken fat": "schmaltz",
  "canola": "canola oil",
  "sunflower": "sunflower oil",
  "extra virgin olive oil": "extra-virgin olive oil",
  "evoo": "extra-virgin olive oil",
  "nonstick cooking spray": "cooking spray",
  "spray oil": "cooking spray",
  "half and half": "half-and-half",
  "half & half": "half-and-half",
  "heavy whipping cream": "heavy cream",
  "cultured buttermilk": "buttermilk",
  "yoghurt": "yogurt",
  "plain yogurt": "yogurt",
  "whole-milk yogurt": "yogurt",
  "whole milk yogurt": "yogurt",
  "greek yoghurt": "greek yogurt",
  "strained yogurt": "greek yogurt",
  "plain greek yogurt": "greek yogurt",
  "cr me fra che": "creme fraiche",
  "ricotta cheese": "ricotta",
  "neufch tel": "neufchatel",
  "mascarpone cheese": "mascarpone",
  "farmer s cheese": "farmer cheese",
  "farmers cheese": "farmer cheese",
  "cheddar cheese": "cheddar",
  "shredded cheddar": "cheddar",
  "grated cheddar": "cheddar",
  "mozzarella cheese": "mozzarella",
  "shredded mozzarella": "mozzarella",
  "jack cheese": "monterey jack",
  "monterey jack cheese": "monterey jack",
  "gruy re": "gruyere",
  "gruyere cheese": "gruyere",
  "swiss": "swiss cheese",
  "emmentaler": "emmental",
  "fontina cheese": "fontina",
  "provolone cheese": "provolone",
  "parmesan cheese": "parmesan",
  "grated parmesan": "parmesan",
  "parmigiano": "parmesan",
  "parmigiano-reggiano": "parmesan",
  "parmigiano reggiano": "parmesan",
  "pecorino romano": "pecorino",
  "feta cheese": "feta",
  "crumbled feta": "feta",
};
