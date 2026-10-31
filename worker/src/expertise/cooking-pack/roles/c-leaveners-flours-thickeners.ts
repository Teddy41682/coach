/*
 * Group C — leaveners, flours, starches, binders, coatings.
 * Encoded from docs/research/expertise/c-leaveners-flours-thickeners.md. Ratio = actual ÷ recipe amount.
 *
 * NOT ENCODED (needs code):
 * (upTo below is the fraction of the recipe amount, converted 2026-10-31 from the ratio this file first used.)
 *  1. Doubt → redo. Where a band is provisional the engine should prefer the more conservative neighbouring verdict.
 *     `Band` has no provisional flag, so provisional bands are marked by comment only: soda 1.25/2.0; powder 1.3 and
 *     the pastry restriction; yeast 1.5/2.0; wheat-flour 0.6 floor; every gf-flour-binder band; starch-thickener
 *     2.5 sauce cap and every pie cut-point.
 *  2. Scale rescue cap = 2×, and only when ratio ≤ 2.0, the cook confirms they have the extra ingredients, the
 *     vessel/pan can hold it, and the mixture has not yet been cooked. A 3× slip (tbsp for tsp) is never scaled — redo.
 *     ("Scale batch" means every *other* ingredient grows by the same factor, the recipe's acid included.)
 *  3. Oven gate. Every leavener/binder "add" rescue requires the item not yet in the oven / pan; once heat has set the
 *     structure a missing leavener or binder is redo (or "eat it as is"), never fixable. Only stated in `when` here.
 *  4. Bake-time gate for chemical leaveners: a batter that has sat mixed > ~20–30 min has spent some lift. No verdict
 *     change; the say-lines tell the cook to bake promptly.
 *  5. Stage-dependent verdicts: pie filling after baking — below 0.5 redo (serve as cobbler/compote), below 1.3 fine,
 *     below 2.0 fine-ish (firm, slightly pasty), above redo; no rescue after the bake. Powder in biscuits/scones once
 *     cut or shaped → redo. Psyllium binder only before shaping. Soda add not for laminated or already-shaped doughs.
 *  6. Item-specific bands inside one role (bands are keyed by kind, not item):
 *     - psyllium (GF yeast bread / boules): below 0.6 fixable add-missing-binder (before shaping); below 1.25 fine;
 *       below 1.6 fixable add-liquid-by-feel; above redo — provisional. Psyllium is therefore NOT indexed (it would get
 *       the xanthan bands).
 *     - wheat flour in yeast bread: below 0.8 fixable add-missing-flour (during mixing/kneading); below 1.15 fine
 *       (adjust water by feel); below 1.5 fixable scale-batch (scale water, yeast, salt to the flour used); above redo —
 *       1.5 provisional. It shares the "baking" kind with cakes, so only the cake bands are encoded.
 *     - gf-flour-binder "pastry" holds the pão de queijo tapioca bands; xanthan in a GF pie crust would get them too.
 *     - GF base flours (rice, sweet rice, sorghum, GF blends, cassava flour) have no bands ("adjust by feel"), so they
 *       are not indexed. Cassava flour is NOT tapioca starch; sweet rice flour is NOT rice flour.
 *  7. Role choice by kind: verdict.ts takes the first tight role whatever the kind. Flour and tapioca/potato starch
 *     carry copies of the sauce bands for that reason; cornstarch or rice flour used as a dredge (saute) still gets the
 *     sauce bands of starch-thickener.
 *  8. starch-thickener is tight only in baked pie fillings (false in stove-top sauces); one boolean, encoded false.
 *  9. Yeast: liquid ≥ 60 °C / 140 °F kills yeast (redo the yeast, not the recipe) — an event, not a ratio. Salt dumped
 *     on yeast and mixed within minutes → fine. Salt in bread dough (belongs to the salt role): forgot salt fixable if
 *     caught before the bulk rise is ~half done (sprinkle with a few drops of water, knead in); after shaping fine but
 *     bland; salt ≥ 2× redo (or scale if ≤ 2× before bulk rise) — provisional. [Hamelman; Reinhart; McGee; ATK-web]
 * 10. Self-raising flour + the recipe's baking powder ≈ 2.3× leavening — the engine should ask "plain or self-raising
 *     flour?" whenever leaveners come up, then apply the powder bands.
 * 11. Excess soda really depends on how much acid the recipe has (excess beyond the acid tastes soapy) — needs the
 *     recipe's acid, not the ratio alone. Non-baking soda uses (velveting meat, beans, onions) are not banded.
 * 12. Breading sequence slips are events, not ratios: skipped flour before egg → fixable before cooking (wipe, dredge,
 *     re-dip, re-crumb), fine after; skipped egg → fixable before cooking; "club hands" → fine; not rested → fine
 *     (10–20 min on a rack helps). Dredge/egg/crumb that touched raw poultry must be discarded (food-safety pack).
 * 13. Cornstarch that thinned after over-boiling or acid: one fresh slurry only; if it thins again accept or redo.
 * 14. Instant ↔ active dry yeast: treat 0.75–1.33 as fine either way and do not flag (sources disagree).
 */
import type { Band, Rescue, Role } from "../types";

// ── Sources (research keys resolved) ────────────────────────────────────────────────────────────────────────────
const McGee10 = "Harold McGee, On Food and Cooking, rev. ed. (Scribner, 2004), ch. 10 \"Breads, Cakes, and Pastries\" (flour, yeast, chemical leavenings)";
const McGee11 = "Harold McGee, On Food and Cooking, rev. ed. (Scribner, 2004), ch. 11 \"Sauces\" (starch thickeners: cornstarch, arrowroot, tapioca, potato, flour/roux)";
const Corriher = "Shirley O. Corriher, BakeWise (Scribner, 2008), ch. 1 (leavening per cup of flour, over-leavening and collapse, soda/acid balance)";
const CorriherBiscuit = "Shirley O. Corriher, BakeWise (Scribner, 2008), biscuit chapter";
const BeranbaumCB = "Rose Levy Beranbaum, The Cake Bible (1988), leavening and cake-fault sections";
const BeranbaumPie = "Rose Levy Beranbaum, The Pie and Pastry Bible (1998), fruit-filling thickeners";
const ATK_SGC = "America's Test Kitchen, The Science of Good Cooking (2012)";
const ATK_Yeast = "America's Test Kitchen, \"Working with Yeast\", https://www.americastestkitchen.com/lessons/articles/1651-working-with-yeast";
const ATK_Flour = "America's Test Kitchen, \"Working with Flour\", https://www.americastestkitchen.com/lessons/articles/1652-working-with-flour; Cook's Illustrated, \"Measuring Flour\", https://www.americastestkitchen.com/cooksillustrated/how_tos/6573-measuring-flour";
const ATK_Pie = "America's Test Kitchen / Cook's Illustrated, fruit pie thickener testing";
const ATK_OvenFried = "America's Test Kitchen, oven-fried chicken (cornflake coating) — URL not verified";
const ATK_GF = "America's Test Kitchen, The How Can It Be Gluten Free Cookbook (2014)";
const KA_Soda = "King Arthur Baking, \"Baking soda vs. baking powder: substitutions\", https://www.kingarthurbaking.com/blog/2021/09/10/difference-between-baking-soda-and-baking-powder-substitutions";
const KA_Yeast = "King Arthur Baking, \"Active dry versus instant yeast\", https://www.kingarthurbaking.com/blog/2022/08/15/active-dry-versus-instant-yeast";
const KA_Xanthan = "King Arthur Baking, \"Xanthan gum\", https://www.kingarthurbaking.com/blog/2015/08/05/xanthan-gum";
const KA_Pie = "King Arthur Baking, \"Pie thickener guide\", https://www.kingarthurbaking.com/learn/guides/pie-thickener";
const KA_PDQ = "King Arthur Baking, \"Brazilian cheese buns (pão de queijo)\", https://www.kingarthurbaking.com/recipes/brazilian-cheese-buns-pao-de-queijo-recipe";
const KA_PDQBlog = "King Arthur Baking blog, \"Gluten-free and lovin' it: cheese buns extraordinaire\", https://www.kingarthurbaking.com/blog/2010/02/20/gluten-free-and-lovin-it-cheese-buns-extraordinaire";
const KA_Flour = "King Arthur Baking, ingredient weight chart (1 cup all-purpose flour = 120 g) and \"How to measure flour\", kingarthurbaking.com";
const KA_SelfRising = "King Arthur Baking, self-rising flour substitute, kingarthurbaking.com";
const KA_GF = "King Arthur Flour, Gluten-Free Baking Companion (2010); https://www.kingarthurbaking.com/blog/2015/02/20/making-recipe-gluten-free";
const CIA = "The Culinary Institute of America, The Professional Chef, 9th ed. (2011): roux, slurries, beurre manié, standard breading procedure";
const FoodLab = "J. Kenji López-Alt, The Food Lab (2015): fried chicken and cutlets (breading, panko, cornstarch), pan sauces";
const SE_Soda = "Serious Eats, The Food Lab on baking soda vs. baking powder (3:1 substitution) — URL to verify";
const SE_Stella = "Serious Eats, Stella Parks (BraveTart) on cake flour and on baking soda and browning — URL to verify";
const Hamelman = "Jeffrey Hamelman, Bread, 2nd ed. (2012): baker's percentages, yeast and salt levels, hydration";
const Reinhart = "Peter Reinhart, The Bread Baker's Apprentice (2001): yeast types and conversions, fermentation timing";
const Goyoaga = "Aran Goyoaga, Cannelle et Vanille Bakes Simple (2022): psyllium-gel gluten-free boules";
const MC = "Nathan Myhrvold et al., Modernist Cuisine (2011), vol. 4: starches and hydrocolloids (xanthan, guar)";
const Joy = "Irma S. Rombauer et al., Joy of Cooking (2019 ed.): white sauce ratios, ingredient substitutions";
const Schwartz = "Leticia Moreinos Schwartz, The Brazilian Kitchen (2010): pão de queijo with polvilho doce/azedo";

// ── Shared sauce / coating pieces (flour and starches land in sauces and dredges too) ─────────────────────────
/** Stove-top sauce or braise thickened with starch or flour. 2.5 cap provisional. */
const sauceBands = (under: string): Band[] => [
  { below: 0.75, verdict: "fixable", rescue: under },
  { below: 1.35, verdict: "fine" },
  { below: 2.5, verdict: "fixable", rescue: "thin-with-liquid", provisional: true },
  { below: Infinity, verdict: "redo" },
];
const thinWithLiquid: Rescue = {
  id: "thin-with-liquid", kind: "add", add: { role: "liquid-water-stock", per: 1 },
  when: "while the sauce is still on the heat",
  say: "It's only thick — loosen it with a little more stock at a time, then taste for salt.",
  sources: [CIA, Joy],
};
const addSlurry = (role: string): Rescue => ({
  id: "add-slurry", kind: "add", add: { role, amount: "the missing starch stirred into twice its volume of cold liquid" },
  when: "while the sauce is still on the heat; never add the starch dry to hot liquid",
  say: "Stir the starch into twice as much cold water, whisk it in and bring it back to a bubble.",
  sources: [CIA, McGee11, FoodLab],
});
const breadingBands: Band[] = [
  { below: 0.5, verdict: "fixable", rescue: "make-more-station" },
  { below: Infinity, verdict: "fine" },
];
const makeMoreStation = (role: string): Rescue => ({
  id: "make-more-station", kind: "add", add: { role, amount: "any — top up the dish" },
  say: "Just top up the coating — there's no exact amount to hit here.",
  sources: [CIA, FoodLab],
});

// ── Roles ────────────────────────────────────────────────────────────────────────────────────────────────────────
const sodaBands: Band[] = [
  { below: 0.75, verdict: "fixable", rescue: "add-missing-soda" },
  { below: 1.25, verdict: "fine", provisional: true }, // 1.25 provisional
  { below: 2.0, verdict: "fixable", rescue: "scale-batch", provisional: true }, // 2.0 provisional
  { below: Infinity, verdict: "redo" },
];

const powderBands = (under: string, pastry = false): Band[] => [
  { below: 0.75, verdict: "fixable", rescue: under, ...(pastry ? { provisional: true } : {}) }, // pastry restriction provisional
  { below: 1.3, verdict: "fine", provisional: true }, // 1.3 provisional
  { below: 2.0, verdict: "fixable", rescue: "scale-batch" },
  { below: Infinity, verdict: "redo" },
];

const yeastBands: Band[] = [
  { below: 0.25, verdict: "fixable", rescue: "add-missing-yeast" },
  { below: 0.75, verdict: "fine", rescue: "proof-by-sight" }, // longer rise — advice only
  { below: 1.5, verdict: "fine", provisional: true }, // 1.5 provisional
  { below: 2.0, verdict: "fixable", rescue: "proof-by-sight", provisional: true }, // 2.0 provisional; proof cooler and shorter
  { below: Infinity, verdict: "redo" },
];

/** Cakes, cookies, quick breads, pastry. The 0.6 floor is provisional. 1.1–1.3: scale-batch for cakes (cookie doughs
 *  could instead take add-liquid-by-feel, which is provisional — the stricter scale is encoded). */
const flourBakingBands: Band[] = [
  { below: 0.6, verdict: "redo", provisional: true }, // 0.6 floor provisional
  { below: 0.9, verdict: "fixable", rescue: "add-missing-flour" },
  { below: 1.1, verdict: "fine" },
  { below: 1.3, verdict: "fixable", rescue: "scale-batch" },
  { below: 2.0, verdict: "fixable", rescue: "scale-batch" },
  { below: Infinity, verdict: "redo" },
];

/** Xanthan (and guar, 1:1 with it). All cut-points provisional. */
const xanthanBands: Band[] = [
  { below: 0.5, verdict: "fixable", rescue: "add-missing-binder", provisional: true },
  { below: 1.5, verdict: "fine", provisional: true },
  { below: 2.0, verdict: "fixable", rescue: "scale-batch", provisional: true },
  { below: Infinity, verdict: "redo", provisional: true },
];

/** Tapioca starch in pão de queijo — the research's "pastry/baking sub-kind", mapped to pastry. Provisional. */
const paoDeQueijoBands: Band[] = [
  { below: 0.75, verdict: "fixable", rescue: "add-missing-flour", provisional: true },
  { below: 1.2, verdict: "fine", provisional: true },
  { below: 1.5, verdict: "fixable", rescue: "add-liquid-by-feel", provisional: true },
  { below: Infinity, verdict: "redo", provisional: true },
];

/** Fruit pie filling, before baking ("pie" mapped to pastry). Cut-points provisional; after-bake is NOT ENCODED. */
const pieBands: Band[] = [
  { below: 0.5, verdict: "fixable", rescue: "add-missing-thickener", provisional: true },
  { below: 1.3, verdict: "fine", provisional: true },
  { below: 2.0, verdict: "fixable", rescue: "scale-batch", provisional: true },
  { below: Infinity, verdict: "redo", provisional: true },
];

export const ROLES: Role[] = [
  {
    id: "chemical-leavener-base",
    name: "Baking soda",
    does: "Leavens by reacting with an acid already in the recipe (buttermilk, yoghurt, brown sugar, molasses, natural cocoa, honey, lemon) to give CO₂; raises pH, which speeds browning, darkens cocoa, spreads cookies and tenderises. About ¼ tsp per cup of flour, or what the acid can neutralise (≈ ½ tsp per cup of buttermilk); ~3–4× the power of baking powder.",
    tight: true,
    bands: { default: sodaBands, baking: sodaBands },
    rescues: [
      {
        id: "add-missing-soda", kind: "add", add: { role: "chemical-leavener-base" },
        when: "before it goes in the oven; not for laminated or already-shaped doughs",
        say: "No harm done — sprinkle the missing soda over, fold it in just until there are no streaks, and bake straight away.",
        sources: [Corriher, KA_Soda], provisional: true,
      },
      {
        id: "scale-batch", kind: "scale",
        when: "before cooking, if you have enough of everything and the extra can bake in a second pan",
        say: "That much soda would taste soapy, so we'll make the batch bigger to match — I'll give you the new amounts.",
        sources: [Corriher, ATK_SGC],
      },
      // Not offered: extra acid to neutralise excess soda — no trusted source gives a quantity → redo.
    ],
    substitutions: [
      { use: "baking powder", ratio: 3, effect: "Rise roughly matched, but the recipe's acid is no longer neutralised: tangier, paler, less spread and browning, can taste slightly bitter. Fine for quick breads and pancakes; where the recipe has more than ½ tsp soda, redo.", sources: [KA_Soda, SE_Soda] },
      { use: "potassium bicarbonate", ratio: 1, effect: "Salt-free, slightly less browning.", sources: [McGee10], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Slightly paler, less spread; fine in acid-light recipes.", sources: [Corriher, ATK_SGC] },
      { direction: "more", upTo: 0.25, effect: "More browning, flatter, more spread in cookies; beyond this it tastes soapy.", sources: [Corriher, SE_Stella] },
    ],
    shows: "Batter foaming soon after mixing is normal. Too much: unusually dark, reddish-brown crust, speckled crumb, very flat spread cookies — but the soapy taste is invisible, so rely on what the cook reports. Too little: pale, flat, tight crumb with no dome.",
    sources: [Corriher, McGee10, ATK_SGC, KA_Soda],
  },
  {
    id: "chemical-leavener-powder",
    name: "Baking powder (double-acting)",
    does: "Self-contained leavener — soda plus a fast acid that reacts on wetting and a slow acid that reacts in the oven — for cakes, muffins, scones, biscuits, pancakes, waffles and frying batters. 1 to 1¼ tsp per cup of flour for most cakes; biscuits and scones up to ~1½–2 tsp.",
    tight: true,
    // pastry = biscuits/scones: same cut-points, but the add is only before the dough is cut or shaped (provisional).
    bands: { default: powderBands("add-missing-powder"), baking: powderBands("add-missing-powder"), pastry: powderBands("add-missing-powder-uncut", true) },
    rescues: [
      {
        id: "add-missing-powder", kind: "add", add: { role: "chemical-leavener-powder" },
        when: "before it goes in the oven",
        say: "Easily fixed — whisk the missing powder into a spoonful of the flour, fold it in gently, and bake straight away.",
        sources: [McGee10, KA_Soda],
      },
      {
        id: "add-missing-powder-uncut", kind: "add", add: { role: "chemical-leavener-powder" },
        when: "before the dough is cut or shaped, and before the oven",
        say: "Whisk the missing powder into a spoonful of flour and work it in lightly before you cut them, then bake promptly.",
        sources: [CorriherBiscuit, KA_Soda], provisional: true,
      },
      {
        id: "scale-batch", kind: "scale",
        when: "before cooking, if you have enough of everything and the extra can bake in a second pan",
        say: "That much powder would make it sink and taste bitter, so we'll enlarge the batch to match — new amounts coming.",
        sources: [Corriher, BeranbaumCB],
      },
    ],
    substitutions: [
      { use: "baking soda plus cream of tartar (¼ tsp soda + ½ tsp cream of tartar per 1 tsp powder; + ¼ tsp cornstarch if storing)", ratio: 0.25, effect: "Single-acting — reacts at once, so bake immediately.", sources: [KA_Soda, ATK_SGC] },
      { use: "baking soda plus lemon juice or white vinegar (¼ tsp soda + ½ tsp acid per 1 tsp powder, or swap ½ cup of the liquid for buttermilk or yoghurt)", ratio: 0.25, effect: "Slight tang; bake immediately.", sources: [KA_Soda, Joy] },
      // Not acceptable: baking soda alone with no acid (soapy, little rise) → redo.
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Slightly denser.", sources: [Corriher, KA_Soda] },
      { direction: "more", upTo: 0.25, effect: "More dome, slightly coarser; above this it risks collapse.", sources: [Corriher, BeranbaumCB] },
    ],
    shows: "Batter looks normal either way. Too much: very fast rise with big surface bubbles, then a sunken, cratered or cracked centre after cooling; pancakes puff then deflate. Too little: flat top, no dome, dense crumb; thin flat pancakes.",
    sources: [Corriher, BeranbaumCB, McGee10, KA_Soda],
  },
  {
    id: "yeast",
    name: "Commercial yeast (instant, active dry, fresh)",
    does: "Biological leavening and flavour in bread, pizza, rolls, enriched doughs and gluten-free boules. Instant ~0.5–1.5% of flour weight in straight doughs. Too little is a time problem, not a failure — rises run longer.",
    tight: false, // for quantity (time compensates); liquid temperature is tight — NOT ENCODED
    bands: { default: yeastBands, baking: yeastBands },
    rescues: [
      {
        id: "add-missing-yeast", kind: "add", add: { role: "yeast" },
        when: "before the dough is baked; restart the first rise from now",
        say: "Simple fix — dissolve the yeast in a couple of spoons of lukewarm water, work it through the dough until even, and we'll start the rise again.",
        sources: [KA_Yeast, Hamelman], provisional: true,
      },
      {
        id: "proof-by-sight", kind: "none",
        say: "It won't keep to the recipe's clock, so we'll judge the rise by eye — I'll tell you when it has doubled.",
        sources: [Hamelman, KA_Yeast, Reinhart],
      },
    ],
    substitutions: [
      { use: "active dry yeast (for instant), or instant for active dry", ratio: 1, effect: "Sources differ (King Arthur 1:1, active dry ~15–20 min slower; ATK 25% apart) — anything from 0.75 to 1.33 is fine either way.", sources: [KA_Yeast, ATK_Yeast] },
      { use: "fresh yeast (for instant)", ratio: 3, effect: "Fresh yeast is roughly 2–3× the weight of dry; 3× for instant.", sources: [Hamelman, Reinhart] },
      { use: "fresh yeast (for active dry)", ratio: 2, effect: "Fresh yeast is roughly 2× the weight of active dry.", sources: [Hamelman, Reinhart] },
      // Not substitutes: sourdough starter (changes the timeline by hours → redo or pause); no yeast at all → another recipe.
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "Longer rise, more flavour.", sources: [KA_Yeast, Hamelman] },
      { direction: "more", upTo: 0.5, effect: "Faster rise; safe if proofed by sight.", sources: [Hamelman, Reinhart] },
    ],
    shows: "Too much: dough rising very fast, large irregular bubbles, sagging or collapsing when touched, strong beery smell. None or dead yeast: no visible rise after the expected time — ask how hot the liquid was.",
    sources: [Hamelman, Reinhart, KA_Yeast, McGee10],
  },
  {
    id: "wheat-flour",
    name: "Wheat flour (all-purpose, bread, cake, pastry, self-raising)",
    does: "The structure of cakes, cookies, pastry and bread (gluten plus starch; protein cake ~7–9%, all-purpose ~10–12%, bread ~12–14%); also a sauce thickener via roux or dredge, and the base of a breading. A cup weighs 120 g spooned or ~142 g dipped, so method alone is an 18–25% error.",
    tight: true,
    bands: {
      default: flourBakingBands, baking: flourBakingBands, pastry: flourBakingBands,
      // Research: flour in a sauce or braise follows the starch-thickener bands; as a dredge, the breading bands.
      sauce: sauceBands("add-beurre-manie"), braise: sauceBands("add-beurre-manie"),
      saute: breadingBands, roast: breadingBands, other: breadingBands,
    },
    rescues: [
      {
        id: "add-missing-flour", kind: "add", add: { role: "wheat-flour" },
        when: "before baking; in two or three additions, mixing only until absorbed",
        say: "Add the rest of the flour in two goes and mix just until it disappears.",
        sources: [ATK_Flour, KA_Flour],
      },
      {
        id: "scale-batch", kind: "scale",
        when: "before baking, if you have enough of everything",
        say: "We'll bring the other ingredients up to match the flour that's already in.",
        sources: [Hamelman, Corriher],
      },
      {
        id: "add-liquid-by-feel", kind: "add", add: { role: "liquid-water-stock", amount: "about 1 tbsp per 30 g of excess flour to start, until the dough looks as described" },
        when: "cookie doughs and bread only — never cakes",
        say: "Work in a spoonful of liquid at a time until the dough looks right.",
        sources: [ATK_Flour], provisional: true,
      },
      {
        id: "add-beurre-manie", kind: "add", add: { role: "wheat-flour", amount: "the missing flour kneaded with the same weight of soft butter" },
        when: "while the sauce is on the heat; simmer at least 5 minutes after",
        say: "Rub a spoonful each of butter and flour together, whisk it in bit by bit and let it simmer.",
        sources: [CIA, Joy, McGee11],
      },
      thinWithLiquid,
      makeMoreStation("wheat-flour"),
    ],
    substitutions: [
      { use: "bread flour (for all-purpose), or all-purpose for bread", ratio: 1, effect: "By weight. All-purpose for bread flour: softer, less chewy, slightly lower rise, may need 1–2% less water. Bread flour in cakes: tougher — avoid (fine for pizza and cookies).", sources: [KA_Flour, ATK_Flour] },
      { use: "cake flour from all-purpose (per cup: take out 2 tbsp flour, add 2 tbsp cornstarch, sift)", ratio: 1, effect: "Close but not identical to chlorinated cake flour, which holds more sugar and liquid.", sources: [ATK_SGC, BeranbaumCB, SE_Stella] },
      { use: "self-raising flour for plain flour plus leavener (1 cup ≈ 1 cup plain + 1½ tsp baking powder + ¼ tsp salt — leave those out)", ratio: 1, effect: "Matches if the recipe's powder and salt are left out; with the recipe's powder as well it is a double dose.", sources: [KA_SelfRising, Joy] },
      { use: "gluten-free 1:1 blend", ratio: 1, effect: "Acceptable in cookies, muffins, quick breads and cakes (some dryness); not in yeast bread or laminated pastry — redo there.", sources: [KA_GF, ATK_GF] },
    ],
    changes: [
      { direction: "less", upTo: 0.1, effect: "Within normal measuring error.", sources: [ATK_Flour, KA_Flour] },
      { direction: "more", upTo: 0.1, effect: "Within normal measuring error; 20–25% more gives dry, tough, domed cakes and cookies that don't spread.", sources: [ATK_Flour, KA_Flour, Corriher] },
    ],
    shows: "Too much: batter stiff, holds peaks and won't level; bread dough stiff and tearing. Too little: batter thin and runny where it should be thick, cookie dough glossy and slack, bread dough a sticky puddle.",
    sources: [ATK_Flour, KA_Flour, Corriher, Hamelman],
  },
  {
    id: "gf-flour-binder",
    name: "Gluten-free starches and binders (xanthan, guar, tapioca and potato starch)",
    does: "Substitute structure in gluten-free baking: binders (xanthan, guar) stand in for gluten's elasticity and gas-holding; starches (tapioca, potato) give stretch and chew. In pão de queijo, scalded tapioca starch alone is the structure. Xanthan: ~¼ tsp per cup of GF flour for cookies, ~⅜–¾ tsp for cakes and muffins, never more than ~1 tbsp per home recipe. Starches also thicken sauces.",
    tight: true,
    bands: {
      default: xanthanBands, baking: xanthanBands,
      pastry: paoDeQueijoBands,
      // Tapioca and potato starch in a sauce follow the starch-thickener sauce bands (see NOT ENCODED 7).
      sauce: sauceBands("add-slurry"), braise: sauceBands("add-slurry"),
    },
    rescues: [
      {
        id: "add-missing-binder", kind: "add", add: { role: "gf-flour-binder" },
        when: "before baking; whisk xanthan into a spoonful of sugar, oil or the dry mix first — never straight into wet batter",
        say: "Mix the xanthan into a spoonful of sugar first so it doesn't clump, then beat it in.",
        sources: [KA_GF, MC], provisional: true,
      },
      {
        id: "scale-batch", kind: "scale",
        when: "before baking, if you have enough of everything",
        say: "We'll make the batch bigger so the binder is back in proportion.",
        sources: [KA_Xanthan, ATK_GF], provisional: true,
      },
      {
        id: "add-missing-flour", kind: "add", add: { role: "gf-flour-binder", amount: "until the dough holds its shape, like choux paste" },
        when: "before baking",
        say: "Work in more tapioca starch, a spoonful at a time, until the dough holds its shape.",
        sources: [KA_PDQ, Schwartz], provisional: true,
      },
      {
        id: "add-liquid-by-feel", kind: "add", add: { role: "dairy-liquid", amount: "a tablespoon of milk at a time, or an extra egg" },
        when: "before baking",
        say: "Loosen it with a spoonful of milk at a time until it's smooth again.",
        sources: [KA_PDQ, Schwartz], provisional: true,
      },
      addSlurry("gf-flour-binder"),
      thinWithLiquid,
    ],
    substitutions: [
      { use: "guar gum (for xanthan)", ratio: 1, effect: "Works in most recipes.", sources: [KA_Xanthan, ATK_GF] },
      { use: "potato starch or cornstarch (for tapioca starch in a GF blend)", ratio: 1, effect: "By weight, for small fractions of a blend; texture shifts (tapioca is chewier). Not in pão de queijo — tapioca is the structure there, so redo.", sources: [KA_GF, ATK_GF] },
      { use: "polvilho azedo (for polvilho doce), or the reverse", ratio: 1, effect: "Works, but azedo puffs more and tastes tangier.", sources: [Schwartz, KA_PDQBlog], provisional: true },
      // Not substitutes: psyllium ↔ xanthan (different hydration → redo or pause; provisional); rice flour ↔ sweet
      // rice flour (redo); wheat flour into a GF recipe (never fine — redo if baking for a coeliac guest).
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "Xanthan: texture shifts only.", sources: [KA_Xanthan, ATK_GF], provisional: true },
      { direction: "more", upTo: 0.5, effect: "Xanthan: texture shifts only; beyond this gummy and slimy.", sources: [KA_Xanthan, ATK_GF], provisional: true },
      { direction: "less", upTo: 0.25, effect: "Psyllium: slacker dough.", sources: [ATK_GF, Goyoaga], provisional: true },
      { direction: "more", upTo: 0.25, effect: "Psyllium: firmer dough.", sources: [ATK_GF, Goyoaga], provisional: true },
    ],
    shows: "GF batters look thicker and pastier than wheat ones. Stringy, gelled lumps mean xanthan went straight into liquid. Pão de queijo dough runny like pancake batter means too little tapioca; crumbly and cracking when rolled means too much. A slack boule spreading on the board means too little psyllium or too much water.",
    sources: [KA_Xanthan, KA_GF, ATK_GF, Goyoaga, KA_PDQ, Schwartz],
  },
  {
    id: "starch-thickener",
    name: "Starch and flour thickeners (cornstarch, arrowroot, tapioca, potato starch, roux, instant flour)",
    does: "Thickens sauces, gravies, braises, pie fillings and pastry cream by starch gelatinisation. Per cup of liquid for a medium sauce: cornstarch ~1 tbsp, flour ~2 tbsp, arrowroot ~1 tbsp. Cornstarch must boil to thicken and thins with long hard boiling or acid; arrowroot thickens below the boil, stays clear, but goes slimy in dairy; tapioca is glossy and goes stringy if over-cooked; flour needs 10–20 min simmering to lose its raw taste.",
    tight: false, // stove-top sauces are correctable until served; baked pie fillings are tight — NOT ENCODED 8
    bands: { default: sauceBands("add-slurry"), sauce: sauceBands("add-slurry"), braise: sauceBands("add-slurry"), pastry: pieBands },
    rescues: [
      addSlurry("starch-thickener"),
      thinWithLiquid,
      {
        id: "add-missing-thickener", kind: "add", add: { role: "starch-thickener" },
        when: "before the pie is baked; toss it into the fruit, and let quick-cooking tapioca rest 15–30 min",
        say: "Toss the rest of the thickener through the fruit before it goes into the crust.",
        sources: [KA_Pie, BeranbaumPie],
      },
      {
        id: "scale-batch", kind: "scale",
        when: "before the pie is baked — add fruit to match",
        say: "We'll add more fruit so the thickener is back in proportion.",
        sources: [KA_Pie, ATK_Pie, BeranbaumPie],
      },
      {
        id: "strain-or-blend", kind: "none",
        say: "Lumps are no trouble — push it through a sieve or give it a quick blitz.",
        sources: [CIA, Joy],
      },
      {
        id: "re-slurry-once", kind: "none",
        when: "only once; if it thins again, accept it or start over",
        say: "It's thinned from the boiling — one fresh slurry and a brief boil should bring it back.",
        sources: [McGee11, CIA], provisional: true,
      },
    ],
    substitutions: [
      { use: "flour (for cornstarch)", ratio: 2, effect: "Opaque, needs a longer simmer. A true béchamel or velouté needs a roux.", sources: [CIA, Joy, KA_Pie] },
      { use: "arrowroot (for cornstarch)", ratio: 1, effect: "Some say 2 tsp per tbsp; use 1 tbsp and adjust. Not in dairy sauces; add at the end.", sources: [McGee11, ATK_SGC] },
      { use: "potato starch (for cornstarch)", ratio: 1, effect: "Thickens fast, thins with boiling.", sources: [McGee11, MC], provisional: true },
      { use: "tapioca starch (for cornstarch)", ratio: 1, effect: "Sources disagree on its strength; use 1:1 and add a slurry if it's thin — thin is easier to fix than gluey.", sources: [KA_Pie, McGee11] },
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Looser sauce (pie filling: fine to −25%).", sources: [CIA, KA_Pie] },
      { direction: "more", upTo: 0.35, effect: "Tighter, glossier sauce (pie filling: fine only to +25%).", sources: [CIA, KA_Pie] },
    ],
    shows: "Nappe test: sauce coats the back of a spoon or runs straight off. Gloopy, gel-like mass or visible lumps; cloudy versus clear glaze. Pie filling soupy when cut after baking — no rescue then.",
    sources: [CIA, Joy, McGee11, KA_Pie, FoodLab],
  },
  {
    id: "breading",
    name: "Breadings and coatings (flour dredge, egg wash, crumbs, panko, cornflakes, crackers)",
    does: "A crisp crust that protects the food and carries seasoning, for shallow frying, deep frying and oven-frying. Flour dries the surface so the egg sticks; egg glues the crumb. Excess at each station is simply discarded.",
    tight: false,
    bands: { default: breadingBands },
    rescues: [makeMoreStation("breading")],
    substitutions: [
      { use: "dry breadcrumbs (for panko), or panko for breadcrumbs", ratio: 1, effect: "Panko is coarser, lighter, crisper and absorbs less oil; fine crumbs give a denser, more even crust.", sources: [FoodLab, ATK_SGC] },
      { use: "crushed cornflakes (for crumbs)", ratio: 1, effect: "Very crunchy, browns faster, slightly sweet; good for oven-frying.", sources: [ATK_OvenFried, FoodLab], provisional: true },
      { use: "crushed crackers, saltines or matzo meal (for crumbs)", ratio: 1, effect: "Saltier — cut the added salt.", sources: [Joy, ATK_SGC], provisional: true },
      // No ratio given in the research (so not encoded as substitutions): GF — rice flour or cornstarch dredge with GF
      // panko or malt-free cornflakes [ATK-GF; Food Lab]; no egg — mayonnaise, buttermilk, or milk + mustard as the
      // glue [Food Lab; ATK-SGC; provisional].
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "Only coverage changes.", sources: [CIA, FoodLab] },
      { direction: "more", upTo: 1.0, effect: "Fine — the excess is discarded.", sources: [CIA, FoodLab] },
    ],
    shows: "Bald patches or coating sliding off in sheets (skipped flour, crowded pan, moved too early); crumbs burning before the inside cooks (cornflakes or sugary coatings in very hot oil). A pale, soggy crust is oil too cool — the frying pack's call.",
    sources: [CIA, FoodLab, ATK_SGC],
  },
];

export const INDEX: Record<string, string[]> = {
  // chemical-leavener-base
  "baking soda": ["chemical-leavener-base"],
  "bicarbonate of soda": ["chemical-leavener-base"],
  // "sodium bicarbonate" normalises to "bicarbonate" ("sodium" is a descriptor) — covered by that alias.
  // chemical-leavener-powder
  "baking powder": ["chemical-leavener-powder"],
  "double-acting baking powder": ["chemical-leavener-powder"],
  "single-acting baking powder": ["chemical-leavener-powder"],
  // yeast
  "yeast": ["yeast"],
  "instant yeast": ["yeast"],
  "active dry yeast": ["yeast"],
  "dry yeast": ["yeast"],
  "cake yeast": ["yeast"],
  "compressed yeast": ["yeast"],
  // wheat-flour
  "flour": ["wheat-flour"],
  "all-purpose flour": ["wheat-flour"],
  "bread flour": ["wheat-flour"],
  "cake flour": ["wheat-flour"],
  "pastry flour": ["wheat-flour"],
  "self-rising flour": ["wheat-flour"],
  "wheat flour": ["wheat-flour"],
  // gf-flour-binder (psyllium and GF base flours deliberately not indexed — NOT ENCODED 6)
  "xanthan gum": ["gf-flour-binder"],
  "guar gum": ["gf-flour-binder"],
  "tapioca starch": ["gf-flour-binder", "starch-thickener"],
  "polvilho azedo": ["gf-flour-binder"],
  "potato starch": ["gf-flour-binder", "starch-thickener"],
  // starch-thickener
  "cornstarch": ["starch-thickener"],
  "arrowroot": ["starch-thickener"],
  "quick-cooking tapioca": ["starch-thickener"],
  "tapioca pearl": ["starch-thickener"],
  "instant flour": ["starch-thickener"],
  "instant clearjel": ["starch-thickener"],
  "roux": ["starch-thickener"],
  "beurre manie": ["starch-thickener"],
  // breading
  "panko": ["breading"],
  "breadcrumb": ["breading"],
  "dry breadcrumb": ["breading"],
  "cornflake": ["breading"],
  "cracker crumb": ["breading"],
  "saltine": ["breading"],
  "matzo meal": ["breading"],
  "seasoned flour": ["breading"],
};

export const ALIASES: Record<string, string> = {
  // baking soda
  "bicarbonate": "baking soda",
  "bicarb": "baking soda",
  "bicarb soda": "baking soda",
  "bicarb of soda": "baking soda",
  "bread soda": "baking soda",
  "cooking soda": "baking soda",
  // baking powder
  "backpulver": "baking powder",
  "levure chimique": "baking powder",
  "polvo de hornear": "baking powder",
  "rumford baking powder": "baking powder",
  "clabber girl baking powder": "baking powder",
  "royal baking powder": "baking powder",
  // yeast
  "rapid-rise yeast": "instant yeast",
  "rapid rise yeast": "instant yeast",
  "quick-rise yeast": "instant yeast",
  "quick rise yeast": "instant yeast",
  "fast-action yeast": "instant yeast",
  "fast action yeast": "instant yeast",
  "easy-blend yeast": "instant yeast",
  "easy blend yeast": "instant yeast",
  "bread machine yeast": "instant yeast",
  "saf instant yeast": "instant yeast",
  "dried active yeast": "active dry yeast",
  "active dried yeast": "active dry yeast",
  // wheat flour
  "all purpose flour": "all-purpose flour",
  "ap flour": "all-purpose flour",
  "plain flour": "all-purpose flour",
  "white flour": "all-purpose flour",
  "unbleached all-purpose flour": "all-purpose flour",
  "bleached all-purpose flour": "all-purpose flour",
  "strong flour": "bread flour",
  "strong white flour": "bread flour",
  "strong white bread flour": "bread flour",
  "soft flour": "cake flour",
  "self-raising flour": "self-rising flour",
  "self raising flour": "self-rising flour",
  "self rising flour": "self-rising flour",
  // gf binders and starches (cassava flour is NOT tapioca starch; potato flour is NOT potato starch)
  "xanthan": "xanthan gum",
  "guar": "guar gum",
  "tapioca flour": "tapioca starch",
  "polvilho doce": "tapioca starch",
  // starch thickeners
  "corn starch": "cornstarch",
  "cornflour": "cornstarch",
  "maizena": "cornstarch",
  "cornstarch slurry": "cornstarch",
  "arrowroot powder": "arrowroot",
  "arrowroot starch": "arrowroot",
  "arrowroot flour": "arrowroot",
  "minute tapioca": "quick-cooking tapioca",
  "instant tapioca": "quick-cooking tapioca",
  "quick tapioca": "quick-cooking tapioca",
  "wondra": "instant flour",
  "wondra flour": "instant flour",
  "beurre mani": "beurre manie", // "beurre manié" once normalised (accents are stripped)
  // breading
  "panko breadcrumb": "panko",
  "panko bread crumb": "panko",
  "japanese breadcrumb": "panko",
  "bread crumb": "breadcrumb",
  "dry bread crumb": "dry breadcrumb",
  "dried breadcrumb": "dry breadcrumb",
  "dried bread crumb": "dry breadcrumb",
  "corn flake": "cornflake",
  "crushed cornflake": "cornflake",
  "cornflake crumb": "cornflake",
  "crushed cracker": "cracker crumb",
  "saltine cracker": "saltine",
  "matzah meal": "matzo meal",
};
