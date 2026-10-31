import type { Band, Role } from "../types";

/*
 * Group A — seasoning, acids, sweeteners, extracts. Encoded from
 * docs/research/expertise/a-seasoning-acids-sweeteners.md (researched 2026-10-30).
 *
 * Kind mapping (the research's kinds of cooking → the pack's Kind):
 *   - salt: "baking" = yeast bread (the tight, sourced rule); "pastry" = chemically leavened cakes, cookies, muffins,
 *     pie dough, biscuits. A cake or cookie should be ruled under "pastry" for salt.
 *   - "other" = an uncooked, small-batch preparation: a stir-fry sauce mixed but not yet in the pan, a dressing,
 *     vinaigrette, mayo or dip.
 *   - sugar-baking: "baking"/"pastry" = cookies, creamed cakes, brownies (the stricter of the research's two baking
 *     band sets); "eggs" = meringue and custard (sugar decides stability/setting).
 *   - liquid-sweetener: "pastry" and "eggs" = the strict candy / pecan pie / ice-cream-base bands (safer verdict).
 *   - flavour-extract: "baking"/"pastry"/"eggs" = baked goods and cooked custards; default = uncooked uses
 *     (frosting, whipped cream, no-bake), the stricter set.
 *
 * Mirrored bands: the verdict engine picks an ingredient's tight role whatever the kind of cooking. Where one item
 * fills two roles here (lemon juice / vinegar → acid-flavour + acid-leavening; sugar / brown sugar → sugar-baking +
 * sugar-savory; honey etc. in savory use), the tight role carries the other role's savory bands for the savory
 * kinds, copied from that role with its sources, so savory use is still ruled by the savory research.
 *
 * Where the research offers two rescues for one band ("balance-acid … or scale-batch"), the band names the sourced,
 * computable one (scale-batch); the provisional alternative is still defined on the role.
 *
 * NOT ENCODED (needs code):
 *   1. Salt-type effective-unit conversion before computing R: table / fine sea / pickling = 1.0; Morton kosher ≈ 0.67
 *      (1 tsp table = 1½ tsp Morton); Diamond Crystal ≈ 0.5 (1 tsp table = 2 tsp DC); flaky finishing salt ≈ 0.5
 *      (provisional). Weights: Morton ≈ 4.8 g/tsp, DC ≈ 2.8 g/tsp, table ≈ 6 g/tsp. Recipe "kosher salt" with no
 *      brand and the cook used table salt at equal volume → assume the worse case (DC), R = 2.
 *      (ATK-SALT, ATK-KOSHER, SFAH-SALT, BT.)
 *   2. Condiment → salt equivalence for total sodium (provisional, brand-dependent): table salt 1 tsp ≈ 2,300 mg;
 *      soy ≈ 900–1,000 mg/Tbsp (≈ ⅖ tsp salt); fish sauce ≈ 1,400–1,500 mg/Tbsp (≈ ⅗ tsp); white miso ≈ 600–700
 *      mg/Tbsp (≈ ¼–⅓ tsp). When a dish has both, total sodium is what matters.
 *   3. Stage gate: nearly every baking rescue holds only before the oven (yeast dough: before bulk fermentation is
 *      well under way); after baking or once a sauce has broken the band falls through to its "after" verdict. Only
 *      carried here as `when` text. Specific after-stage verdicts lost: salt in yeast bread — forgot and caught after
 *      the rise → `bake-anyway-salty-serve` (defined, not band-reachable); short (<0.75) after the rise → fine;
 *      1.25–2.0 after the rise → redo. Salt on a surface after cooking → redo for R ≥ 2, fine with unsalted sides
 *      below 2. Acid-leavening forgot → fixable only if the soda went in < 10 min ago, else redo; after baking redo.
 *      Vanilla / almond forgot and noticed after baking → fine. Sugar-baking short and already creamed/mixed → redo.
 *      Liquid sweetener / sugar for candy not yet heating → scale-batch instead of redo.
 *   4. Scale caps by kind (provisional, section 0): S = R ÷ fine_upper; max 2.0 for liquid dishes, a separate sauce,
 *      yeast dough (before bulk rise), cookie dough and muffin/quick-bread batter; 1.0 (no scaling) for creamed or
 *      whipped cake batter, meringue, custard, eggs, cooked grains and a seasoned roast surface; S > cap → redo. The
 *      engine applies one MAX_SCALE = 2 and cannot tell an aerated batter from a non-aerated one; the `when` text says
 *      "not for a whipped or creamed batter". scale-sauce's own cap is 2.5 (provisional) — the engine caps it at 2.
 *   5. remove-excess (universal, provisional): an over-measured ingredient still sitting un-incorporated (a pile on
 *      the flour, a spoonful on unstirred liquid, in a separate bowl) → spoon out the excess → fine. Gone once
 *      stirred or dissolved. Needs the engine to know whether it has been mixed in.
 *   6. Seasoning is one-way (SFAH-SALT, MCG-14, ATK-SGC): salt, heat and sweetness can be added, never taken out —
 *      only diluted or masked. Reflected in the bands; no field for it.
 *   7. Never offer "a potato absorbs salt" (a myth: WOLKE, ATK-SGC). Never offer baking soda to neutralise excess acid
 *      as a primary rescue (at most ⅛ tsp per quart in a tomato sauce; provisional). Never offer re-kneading salt
 *      into a dough after its rise (KA).
 *   8. dilute-unsalted amount: research gives added liquid ≈ (R − 1.25) × original liquid volume; the engine's add
 *      computes per × (R − 1) × the recipe's liquid, i.e. slightly more. Never use "low-sodium broth" to dilute.
 *   9. Per-item bands within one role: cloves/nutmeg are stricter than cinnamon (the stricter set is encoded for
 *      baking; cinnamon's own looser set — fine to 2×, fixable to 3× — is lost); black pepper on a surface above
 *      2× → fixable only by brushing off; chipotle in adobo counted per pepper (one extra when the recipe calls for
 *      1 = R 2 → only scale-batch max 2, else redo) and chipotle/habanero sauces are tight while sriracha is not;
 *      vinegar hot sauce at R ≥ 3 adds noticeable sourness (check acid-flavour).
 *  10. Sub-kinds the pack's Kind can't name: cinnamon kneaded into yeast dough (below 1.5 fine; above → scale-batch
 *      during mixing only, else redo; provisional); muffins / quick breads / pancakes / sweet yeast doughs for
 *      sugar-baking (below 0.5 fixable add-more; below 1.25 fine; below 2.0 scale-batch; above redo); candy, caramel,
 *      sorbet, jam for sugar (below 0.9 redo; below 1.1 fine; above redo); acid in a dairy (milk) sauce or soup added
 *      hot (below 1.0 add-more off the heat; below 1.5 fine if added off the boil; above 1.5 watch for curdling; if
 *      curdled → redo; heavy cream ≥ 36 % fat → cooked-savory bands); acid marinade / ceviche (R ≤ 1.5 fine; above →
 *      cut the time in proportion, time ÷ R; fish in pure citrus past ≈ 30–60 min → redo; provisional); acid added
 *      to green vegetables or pulses before they are tender (any R > 0 → fixable: add acid at the end next time, cook
 *      beans longer; provisional for beans); a soy marinade's "fine below 2× if the marinade is ≤ 1 h"; a sugar
 *      glaze under the broiler above 1.5× → watch for scorching, lower the heat.
 *  11. Cross-ingredient and cross-unit substitutions: salted butter for unsalted → cut ≈ ¼ tsp table salt per stick
 *      (113 g) from the recipe's salt (ATK ⅓, range ⅓–½; KA-BUTTER, ATK-SBUTTER); garlic powder for fresh garlic ⅛
 *      tsp per clove (granulated ¼ tsp) and onion powder 1 Tbsp per medium onion (provisional); chipotle in adobo →
 *      ¼–½ tsp chipotle powder per pepper, adobo sauce alone for a whole pepper (provisional); 1 vanilla bean ≈ 1 Tbsp
 *      extract, ⅓ bean per tsp (provisional); honey in baking also −¼ cup liquid, +¼ tsp soda per cup honey, oven
 *      −25 °F, and replace no more than half the sugar (ATK) — the same "no more than half" for maple.
 *  12. Negative substitutions (a "don't" has no ratio): flaky/coarse sea salt in a dough or batter (salty pockets;
 *      finishing only — ATK-SALT, SFAH-SALT); powdered sugar for granulated (contains cornstarch, different volume —
 *      ATK-SWEET, KA-SUGARS); orange juice for lemon as an acid (≈ ⅙ the acid — MCG-7, SFAH-ACID); pancake syrup for
 *      maple in baking (provisional); honey for corn syrup in candy (crystallises, scorches; provisional).
 *  13. change.ts returns a role's first non-provisional substitution whatever the item asked about, so the order
 *      below puts the commonest ask first; per-item substitutions need code. Likewise `changes` carry no kind: the
 *      most conservative safe amount is listed first.
 *  14. Yoghurt and sour cream count as leavening acid only when the recipe uses them with baking soda; not indexed
 *      here (a conditional role). Buttermilk and cream of tartar are indexed to acid-leavening outright.
 *  15. Hot/pure chile powder or cayenne used 1:1 for US "chili powder" → treat as R = 5 → redo unless caught before
 *      mixing (provisional encoding; MCG-8, ATK-SGC). Needs the engine to compare the item used with the item named.
 */

const SRC: Record<string, string> = {
  "MCG-1": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 1 \"Milk and Dairy Products\"",
  "MCG-4": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 4 \"Fish and Shellfish\"",
  "MCG-6": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 5–6 \"A Survey of Common Vegetables\"",
  "MCG-7": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 7 \"Fruits\"",
  "MCG-8": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 8 \"Flavorings from Plants\"",
  "MCG-9": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 9 \"Seeds\"",
  "MCG-10": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 10 \"Cereal Doughs and Batters\"",
  "MCG-11": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 11 \"Sauces\"",
  "MCG-12": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 12 \"Sugars, Chocolate, and Confectionery\"",
  "MCG-13": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), ch. 13 \"Wine, Beer, and Distilled Spirits\" (vinegar)",
  "MCG-14": "Harold McGee, On Food and Cooking (rev. ed., Scribner 2004), salt sections (chapter unconfirmed)",
  "SFAH-SALT": "Samin Nosrat, Salt Fat Acid Heat (Simon & Schuster 2017), \"Salt\" chapter",
  "SFAH-ACID": "Samin Nosrat, Salt Fat Acid Heat (Simon & Schuster 2017), \"Acid\" chapter",
  "FL": "J. Kenji López-Alt, The Food Lab (Norton 2015)",
  "BT": "Stella Parks, BraveTart: Iconic American Desserts (Norton 2017)",
  "MC": "Nathan Myhrvold et al., Modernist Cuisine at Home (2012)",
  "ATK-SGC": "America's Test Kitchen, The Science of Good Cooking (2012)",
  "ATK-SALT": "America's Test Kitchen, \"Salt types and measurements\" — https://www.americastestkitchen.com/cooksillustrated/how_tos/5799-salt-types-and-measurements",
  "ATK-KOSHER": "America's Test Kitchen, kosher salt taste test — https://www.americastestkitchen.com/taste_tests/2109-kosher-salt",
  "ATK-SBUTTER": "America's Test Kitchen, \"Cooking with salted butter\" — https://www.americastestkitchen.com/how_tos/6180-cooking-with-salted-butter",
  "ATK-SWEET": "America's Test Kitchen, \"How to substitute sugars and other sweeteners\" — https://www.americastestkitchen.com/cooksillustrated/how_tos/5528-how-to-substitute-sugars-and-other-sweeteners",
  "ATK-BROWN": "America's Test Kitchen, \"Turning white sugar into brown\" — https://www.americastestkitchen.com/cooksillustrated/how_tos/5704-turning-white-sugar-into-brown",
  "ATK-HERBS-SUB": "America's Test Kitchen, substituting dried herbs for fresh — https://www.americastestkitchen.com/how_tos/9261-science-substituting-dried-herbs-for-fresh ; https://www.americastestkitchen.com/how_tos/5531-how-to-substitute-herbs",
  "ATK-HERBS-USE": "America's Test Kitchen, \"Using dried herbs\" — https://www.americastestkitchen.com/how_tos/5703-using-dried-herbs",
  "ATK-BUTTERMILK": "America's Test Kitchen, buttermilk questions and substitutions — https://www.americastestkitchen.com/articles/7094-answering-all-your-buttermilk-questions-from-storage-to-substitutions-to-recipes",
  "ATK-BMPANCAKE": "America's Test Kitchen, \"Buttermilk substitutes for pancakes\" — https://www.americastestkitchen.com/how_tos/8239-buttermilk-substitutes-for-pancakes",
  "ATK-VANILLA": "Cook's Illustrated / America's Test Kitchen, vanilla extract taste test (URL not confirmed)",
  "KA-SALT-PRO": "King Arthur Baking, Pro reference: Salt — https://www.kingarthurbaking.com/pro/reference/salt",
  "KA-FORGOT": "King Arthur Baking, \"What if I forgot salt or yeast in bread dough\" — https://www.kingarthurbaking.com/blog/2021/08/31/what-if-i-forgot-salt-or-yeast-in-bread-dough",
  "KA-SALT-BLOG": "King Arthur Baking, \"Why is salt important in yeast bread\" — https://www.kingarthurbaking.com/blog/2020/07/29/why-is-salt-important-in-yeast-bread",
  "KA-BUTTER": "King Arthur Baking, \"Butter baking\" — https://www.kingarthurbaking.com/blog/2016/08/18/butter-baking",
  "KA-LIQSWEET": "King Arthur Baking, \"Baking with liquid sweeteners\" — https://www.kingarthurbaking.com/blog/2017/08/18/baking-with-liquid-sweeteners",
  "KA-BROWN": "King Arthur Baking, \"Substitute for brown sugar\" — https://www.kingarthurbaking.com/blog/2020/03/04/substitute-for-brown-sugar",
  "KA-SUGARS": "King Arthur Baking, \"A guide to different types of sugars\" — https://www.kingarthurbaking.com/blog/2023/03/21/a-guide-to-different-types-of-sugars-how-to-use-them-and-when-to-substitute",
  "KA-BUTTERMILK": "King Arthur Baking, \"Buttermilk substitute\" — https://www.kingarthurbaking.com/blog/2019/01/28/buttermilk-substitute",
  "KA-CINN": "King Arthur Baking, guidance on cinnamon slowing yeast in swirl breads (blog; URL not confirmed)",
  "MU-HONEY": "University of Missouri Extension GH1120 — https://extension.missouri.edu/gh1120",
  "ISU-CURDLE": "Iowa State University Extension AnswerLine, \"Tips for avoiding curdling\" — https://blogs.extension.iastate.edu/answerline/2018/02/15/tips-for-avoiding-curdling/",
  "ACES-ALTER": "Alabama Cooperative Extension, \"Altering Recipes for Better Health\" — https://www.aces.edu/blog/topics/health/altering-recipes-for-better-health/",
  "UGA-ALTER": "University of Georgia Extension FDNS-E-89-22a — https://fcs.uga.edu/docs/FDNS-E-89-22a.pdf",
  "PSU-HERBS": "Penn State Extension, \"Preserving herbs by drying\" — https://extension.psu.edu/preserving-herbs-by-drying",
  "OSU-HERBS": "Oregon State University Extension, \"Drying herbs\" — https://extension.oregonstate.edu/food/preservation/drying-herbs",
  "NCHFP-HERBS": "National Center for Home Food Preservation, drying herbs — https://nchfp.uga.edu/how/dry/recipes/herbs/",
  "USDA-FDC": "USDA FoodData Central — https://fdc.nal.usda.gov/",
  "WOLKE": "Robert L. Wolke, What Einstein Told His Cook (Norton 2002)",
};

const s = (...keys: string[]): string[] => keys.map((k) => {
  const v = SRC[k];
  if (!v) throw new Error(`unknown source ${k}`);
  return v;
});

const INF = Infinity;

/** Every band of a role whose thresholds the research marks provisional throughout. */
const allProvisional = (r: Role): Role => ({
  ...r,
  bands: Object.fromEntries(Object.entries(r.bands).map(([k, b]) => [k, b!.map((x) => ({ ...x, provisional: true }))])) as Role["bands"],
});
const prov = (b: Band[]): Band[] => b.map((x) => ({ ...x, provisional: true }));

// Shared band sets reused (mirrored) across roles — see the header.
/** Cooked-savory acid thresholds are provisional (SFAH-ACID describes the correction, gives no numbers). */
const ACID_COOKED: Band[] = prov([
  { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
  { below: 2.5, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
]);
/** A long braise cooks some sharpness out of vinegar: up to 2.0 is fine. */
const ACID_BRAISE: Band[] = prov([
  { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 2.0, verdict: "fine" },
  { below: 2.5, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
]);
const ACID_DRESSING: Band[] = [
  { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.33, verdict: "fine" },
  { below: 4.0, verdict: "fixable", rescue: "add-oil-per-excess" }, { below: INF, verdict: "redo" },
];
/** Sugar-savory thresholds are provisional throughout. */
const SUGAR_SAVORY = (add: string, scale: string): Band[] => prov([
  { below: 1.0, verdict: "fixable", rescue: add }, { below: 1.5, verdict: "fine" },
  { below: 3.0, verdict: "fixable", rescue: scale }, { below: INF, verdict: "redo" },
]);

export const ROLES: Role[] = [
  // ───────────────────────────────────────────── salt
  {
    id: "salt",
    name: "Salt (cooking and baking salt)",
    does: "Flavour everywhere. Yeast bread: tightens gluten and slows the yeast so fermentation stays controlled, leaving sugar for crust browning (usually 1.8–2 % of flour weight). Chemically leavened baking and pastry: flavour only, sharpens sweetness. Sauces, braises, soups: dissolves and spreads evenly, adjustable at the end. Saute and roast: surface seasoning, or a dry brine when applied well ahead. Eggs: salted before cooking keeps scrambled eggs tender. Grains and pasta water: absorbed while cooking, hard to correct afterwards.",
    // True in yeast bread and grains/pasta water; false in liquid savory dishes and for too little in savory cooking.
    tight: true,
    bands: {
      // Liquid savory — the research's default for savory.
      default: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.25, verdict: "fine" },
        { below: 2.5, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      sauce: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.25, verdict: "fine" },
        { below: 2.5, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      braise: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.25, verdict: "fine" },
        { below: 2.5, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      // Yeast bread at mixing. The 2.0 upper cut-off is the scale cap, not a sourced tipping point (provisional).
      baking: [
        { below: 0.75, verdict: "fixable", rescue: "add-dissolved-salt" }, { below: 1.25, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "scale-batch", provisional: true }, { below: INF, verdict: "redo" },
      ],
      // Chemically leavened cakes, cookies, muffins, pie dough, biscuits. 1.5 and 2.0 provisional (no sourced threshold).
      pastry: [
        { below: 1.5, verdict: "fine", provisional: true }, { below: 2.0, verdict: "fixable", rescue: "scale-batch", provisional: true },
        { below: INF, verdict: "redo" },
      ],
      // Surface seasoning on raw protein or veg (provisional: one solid source).
      saute: prov([
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "brush-rinse-pat-dry" }, { below: INF, verdict: "redo" },
      ]),
      roast: prov([
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "brush-rinse-pat-dry" }, { below: INF, verdict: "redo" },
      ]),
      // Grains / pasta water. 1.5 provisional. Above 1.5: fixable only if not yet cooked in it; else redo.
      grains: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine", provisional: true },
        { below: INF, verdict: "fixable", rescue: "dilute-unsalted", provisional: true },
      ],
      // Eggs (provisional: no threshold stated).
      eggs: prov([
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "scale-eggs" }, { below: INF, verdict: "redo" },
      ]),
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "salt", amount: "the shortfall, in halves, tasting between" },
        when: "savory cooking, any time before serving",
        say: "No harm done — add the rest of the salt now, half at a time, tasting as you go.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      { id: "add-dissolved-salt", kind: "add", add: { role: "salt", amount: "the missing salt, dissolved in 2–3 tsp water" },
        when: "yeast dough, before the bulk rise (sourdough: after a 20–60 minute rest)",
        say: "Dissolve the salt in a couple of teaspoons of water and knead it in now, before the dough rises.",
        sources: s("KA-FORGOT", "KA-SALT-PRO") },
      { id: "bake-anyway-salty-serve", kind: "none",
        when: "the dough has already risen without salt",
        say: "It's too late to work salt in without hurting the dough — bake it as it is and serve it with salted butter.",
        sources: s("KA-FORGOT", "KA-SALT-PRO") },
      { id: "scale-batch", kind: "scale",
        when: "the pot has room and you have the other ingredients; for a dough, during mixing before the rise and before baking; never for a whipped or creamed batter",
        say: "That's too much salt for this batch — make the batch bigger to bring it back, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      { id: "dilute-unsalted", kind: "add", add: { role: "liquid-water-stock", amount: "unsalted water or stock, about (R − 1.25) × the original liquid" },
        when: "a brothy soup or pasta water, before the pasta or grain goes in; never low-sodium broth",
        say: "Pour some off and top it up with plain water, then bring it back to the boil.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      { id: "brush-rinse-pat-dry", kind: "none",
        when: "raw surface-salted protein or veg, before it cooks",
        say: "Brush the extra salt off, or rinse it quickly, and pat it very dry before it goes in the pan.",
        sources: s("SFAH-SALT"), provisional: true },
      // The eggs band's "scale-batch, beat in more eggs" — the eggs rule is provisional in the research.
      { id: "scale-eggs", kind: "scale",
        when: "before the eggs are cooked",
        say: "Beat in more eggs to spread the salt out.",
        sources: s("SFAH-SALT", "FL"), provisional: true },
    ],
    substitutions: [
      { use: "Morton kosher salt (for table salt)", ratio: 1.5, effect: "1 tsp table salt = 1½ tsp Morton kosher; same saltiness once converted.", sources: s("ATK-SALT", "ATK-KOSHER", "SFAH-SALT") },
      { use: "Diamond Crystal kosher salt (for table salt)", ratio: 2, effect: "1 tsp table salt = 2 tsp Diamond Crystal; same saltiness once converted.", sources: s("ATK-SALT", "ATK-KOSHER", "SFAH-SALT") },
      { use: "table salt (for Diamond Crystal kosher salt)", ratio: 0.5, effect: "2 tsp Diamond Crystal = 1 tsp table salt.", sources: s("ATK-SALT", "ATK-KOSHER", "SFAH-SALT") },
      { use: "table salt (for Morton kosher salt)", ratio: 0.67, effect: "1½ tsp Morton kosher = 1 tsp table salt.", sources: s("ATK-SALT", "ATK-KOSHER", "SFAH-SALT") },
      { use: "fine sea salt or pickling salt (for table salt)", ratio: 1, effect: "About the same saltiness by volume.", sources: s("ATK-SALT", "SFAH-SALT") },
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Yeast bread is safe down to about 1.5 % of flour; below that it rises faster and comes out slacker and paler. Savory dishes can go lower to taste; cakes and cookies to half.", sources: s("KA-SALT-PRO", "SFAH-SALT", "MCG-10") },
      { direction: "more", upTo: 0.25, effect: "A savory liquid takes a quarter more without trouble; in yeast bread it means a slower rise and a tighter dough.", sources: s("KA-SALT-PRO", "MCG-10") },
    ],
    shows: "Invisible once dissolved — watch the spoon size and the box (Morton, Diamond Crystal, iodized); saltless bread rises fast, slack and pale; crystals crust visibly on over-salted meat.",
    sources: s("ATK-SALT", "ATK-KOSHER", "SFAH-SALT", "BT", "KA-SALT-PRO", "KA-FORGOT", "KA-SALT-BLOG", "MCG-10", "MCG-14", "ATK-SGC", "FL", "WOLKE"),
  },

  // ───────────────────────────────────────────── salty-umami-condiment
  {
    id: "salty-umami-condiment",
    name: "Salty umami liquids and pastes (soy sauce, tamari, fish sauce, miso)",
    does: "In sauces, braises, stir-fries, marinades, glazes and soup bases: salt plus glutamate savouriness, and colour (soy darkens; miso thickens). Fish sauce and miso add aroma that fades with cooking. In baking (miso caramel, cookies) it is treated as salt.",
    // False for too little; true for too much only in small-volume dishes (dressings, glazes, a single stir-fry).
    tight: false,
    bands: {
      // Marinade on raw protein (the research's default). Below 2.0 fine if marinated ≤ 1 h (not encoded).
      default: [
        { below: 2.0, verdict: "fine" }, { below: INF, verdict: "fixable", rescue: "shorten-marinade", provisional: true },
      ],
      // Already combined in a liquid dish — same as salt's savory liquid bands.
      sauce: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.25, verdict: "fine" },
        { below: 2.5, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      braise: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.25, verdict: "fine" },
        { below: 2.5, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      // Already in the pan.
      saute: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "add-unsalted-bulk", provisional: true }, { below: INF, verdict: "redo" },
      ],
      // A sauce mixed but not yet in the pan (stir-fry sauce, dressing, marinade being mixed) → "other".
      other: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.25, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "scale-sauce" }, { below: INF, verdict: "redo" },
      ],
      // "Treat as salt in baking": salt's chemically-leavened bands (provisional numbers).
      baking: [
        { below: 1.5, verdict: "fine", provisional: true }, { below: 2.0, verdict: "fixable", rescue: "scale-batch", provisional: true }, { below: INF, verdict: "redo" },
      ],
      pastry: [
        { below: 1.5, verdict: "fine", provisional: true }, { below: 2.0, verdict: "fixable", rescue: "scale-batch", provisional: true }, { below: INF, verdict: "redo" },
      ],
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "salty-umami-condiment", amount: "the shortfall, half at a time" },
        say: "Add the rest now, a little at a time, and taste.", sources: s("SFAH-SALT", "FL") },
      { id: "scale-sauce", kind: "scale", when: "only the sauce, before it meets the food",
        say: "The sauce is too strong — make a bigger batch of just the sauce and use what the recipe needs.",
        sources: s("SFAH-SALT"), provisional: true },
      { id: "scale-batch", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That's too salty for this batch — make the batch bigger to bring it back, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      // Research: kind add, role = the main ingredient (plain rice, veg, protein), ≤ +50 %. No single role id fits.
      { id: "add-unsalted-bulk", kind: "none", when: "up to half as much again of the main ingredient",
        say: "Toss in more plain vegetables or rice to spread the saltiness.", sources: s("SFAH-SALT"), provisional: true },
      { id: "shorten-marinade", kind: "none", when: "the protein is still marinating",
        say: "Cut the marinating time short, then pat it dry before cooking.", sources: s("SFAH-SALT"), provisional: true },
    ],
    substitutions: [
      { use: "table salt (for soy sauce)", ratio: 0.11, effect: "1 Tbsp soy ≈ ⅓–½ tsp table salt; you lose the colour and the umami.", sources: s("USDA-FDC", "SFAH-SALT") },
      { use: "low-sodium soy sauce (for regular)", ratio: 1, effect: "About 40 % less sodium — expect to add salt.", sources: s("USDA-FDC", "ATK-SGC") },
      { use: "tamari (for soy sauce)", ratio: 1, effect: "Slightly richer, often gluten-free.", sources: s("MCG-9", "ATK-SGC"), provisional: true },
      { use: "dark soy sauce (for regular)", ratio: 0.25, effect: "Much less salt and much more colour — use at most a quarter, plus salt.", sources: s("FL"), provisional: true },
      { use: "fish sauce (for soy sauce)", ratio: 0.5, effect: "Saltier and funkier — half to two-thirds the volume.", sources: s("USDA-FDC"), provisional: true },
      { use: "red miso (for white miso)", ratio: 0.5, effect: "Saltier and stronger — half to two-thirds the amount.", sources: [], provisional: true },
      { use: "coconut aminos (for soy sauce)", ratio: 1, effect: "Much less salty and sweeter — add salt.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "Down to half, made up with salt to taste; less depth and colour.", sources: s("SFAH-SALT", "USDA-FDC") },
      { direction: "more", upTo: 0.25, effect: "Up to a quarter more in liquid dishes.", sources: s("SFAH-SALT", "USDA-FDC") },
    ],
    shows: "Soy darkens a stir-fry or braise (excess dark soy looks near black); miso clouds and thickens a broth; fish sauce is invisible — only the smell.",
    sources: s("SFAH-SALT", "ATK-SGC", "FL", "MCG-9", "MCG-4", "USDA-FDC"),
  },

  // ───────────────────────────────────────────── dried-mild-seasoning
  allProvisional({
    id: "dried-mild-seasoning",
    name: "Dried mild seasonings — garlic and onion powder, sweet and smoked paprika, dried leafy herbs, black pepper",
    does: "Aroma and background flavour in sauces, braises, roasts, sautes, eggs and grains; paprika adds colour (and burns bitter in very hot fat). Dried herbs need time and moisture — at least ten minutes' simmer, or bloomed in fat — to give their flavour. Also mild chile blends (US chili powder, ancho, Aleppo, gochugaru, Kashmiri), which the research rules on these bands.",
    tight: false,
    bands: {
      // Liquid or mixed dishes: sauce, braise, soup, chili, stew.
      default: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      // Roast / saute rub, eggs, dry dishes.
      roast: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 2.0, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "brush-rinse-pat-dry" }, { below: INF, verdict: "redo" },
      ],
      saute: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 2.0, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "brush-rinse-pat-dry" }, { below: INF, verdict: "redo" },
      ],
      eggs: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 2.0, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "brush-rinse-pat-dry" }, { below: INF, verdict: "redo" },
      ],
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "dried-mild-seasoning", amount: "the shortfall" },
        when: "dried herbs into the fat or a simmering liquid with at least ten minutes to go (eggs: at the end)",
        say: "Add it now and let it simmer ten minutes so it blooms.", sources: s("ATK-HERBS-USE", "MCG-8") },
      { id: "scale-batch", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That's heavy on the seasoning — make the batch bigger to even it out, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      { id: "brush-rinse-pat-dry", kind: "none", when: "raw food, before it cooks",
        say: "Brush most of the rub off and pat it dry before it cooks.", sources: s("SFAH-SALT"), provisional: true },
    ],
    substitutions: [
      { use: "fresh herbs (for dried)", ratio: 3, effect: "Three times the volume, added later in cooking.", sources: s("ATK-HERBS-SUB", "PSU-HERBS") },
      { use: "dried herbs (for fresh)", ratio: 0.33, effect: "1 tsp dried = 1 Tbsp fresh. Hardy herbs (oregano, thyme, rosemary, sage) swap well; delicate ones (basil, parsley, dill, chives, tarragon, cilantro) taste different.", sources: s("ATK-HERBS-SUB", "PSU-HERBS", "OSU-HERBS", "NCHFP-HERBS") },
      { use: "ground herb (for dried leaf)", ratio: 0.25, effect: "¼ tsp ground = 1 tsp dried leaf.", sources: s("ATK-HERBS-SUB", "PSU-HERBS", "OSU-HERBS", "NCHFP-HERBS") },
      { use: "granulated garlic (for garlic powder)", ratio: 2, effect: "Coarser and about half as strong by volume.", sources: [], provisional: true },
      { use: "smoked paprika (for sweet)", ratio: 0.5, effect: "Same colour but much smokier — use half.", sources: [], provisional: true },
      { use: "white pepper (for black)", ratio: 1, effect: "More pungent and musty.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 1, effect: "Any amount; flatter.", sources: s("ATK-HERBS-USE", "MCG-8"), provisional: true },
      { direction: "more", upTo: 0.5, effect: "Up to half as much again in liquid dishes, double on rubs.", sources: s("ATK-HERBS-USE", "MCG-8"), provisional: true },
    ],
    shows: "Too much paprika reads redder, burnt paprika goes dark and acrid; dried herbs fleck the surface green; garlic and onion powder vanish into liquid but clump if dumped in hot; black pepper coats meat in dark specks.",
    sources: s("ATK-HERBS-USE", "MCG-8", "SFAH-ACID", "PSU-HERBS", "OSU-HERBS"),
    provisional: true, // every numeric threshold is provisional in the research
  }),

  // ───────────────────────────────────────────── warm-sweet-spice
  allProvisional({
    id: "warm-sweet-spice",
    name: "Warm sweet spices — cinnamon, nutmeg, cloves, allspice, ground ginger, cardamom",
    does: "Aroma in baking and pastry; background warmth in braises, curries and tagines. Cinnamon mixed into a yeast dough slows the yeast; in a filling or swirl it is fine.",
    // False for cinnamon in batters; true for cloves and nutmeg, and for cinnamon kneaded into yeast dough.
    tight: true,
    bands: {
      // Batters, cookie dough, fillings — the stricter cloves/nutmeg set (cinnamon's looser set is in NOT ENCODED).
      baking: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      pastry: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      // Braise / sauce.
      default: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "warm-sweet-spice", amount: "the shortfall" },
        when: "before baking, or with at least ten minutes' simmer left",
        say: "Stir in the rest now — it isn't baked yet, so no harm done.", sources: s("MCG-8", "KA-CINN", "ATK-SGC"), provisional: true },
      { id: "scale-batch", kind: "scale", when: "before baking; not for a whipped or creamed batter",
        say: "That's a lot of spice — make the batch bigger to balance it, or we start again.",
        sources: s("MCG-8", "KA-CINN", "ATK-SGC"), provisional: true },
    ],
    substitutions: [
      { use: "pumpkin-pie spice (for cinnamon)", ratio: 1, effect: "Adds nutmeg, clove and ginger.", sources: [], provisional: true },
      { use: "allspice (for cinnamon)", ratio: 0.5, effect: "Use half.", sources: [], provisional: true },
      { use: "Ceylon cinnamon (for cassia)", ratio: 1.25, effect: "Milder — 1¼ to 1½ times as much.", sources: s("MCG-8"), provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 1, effect: "Any amount.", sources: [], provisional: true },
      { direction: "more", upTo: 0.5, effect: "Cloves and nutmeg up to half again; cinnamon to double in batters and fillings.", sources: [], provisional: true },
    ],
    shows: "Cinnamon browns batter and shows as specks or swirls — too much and the batter is noticeably darker; a cinnamon-heavy bread dough rises slow and low.",
    sources: s("MCG-8", "KA-CINN", "ATK-SGC"),
    provisional: true, // all numeric thresholds provisional
  }),

  // ───────────────────────────────────────────── chili-heat
  allProvisional({
    id: "chili-heat",
    name: "Dried chili heat — chili flakes, cayenne, hot paprika, pure chile powder, chipotle powder",
    does: "Capsaicin heat (plus fruit or smoke from some chiles) in sautes, sauces, braises, roasts, eggs and grains. Capsaicin dissolves in fat and alcohol, not water; it cannot be taken out, only diluted or masked by fat, dairy, sugar and starch.",
    // True for cayenne, chipotle powder and ground hot chiles; the mild blends are indexed to dried-mild-seasoning.
    tight: true,
    bands: {
      // Sauce / braise / soup / chili (liquid).
      default: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      // Above 1.5: fixable only if raw with the spice on the surface; else redo.
      saute: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: INF, verdict: "fixable", rescue: "brush-rinse-pat-dry" },
      ],
      roast: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: INF, verdict: "fixable", rescue: "brush-rinse-pat-dry" },
      ],
      eggs: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: INF, verdict: "fixable", rescue: "brush-rinse-pat-dry" },
      ],
      grains: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: INF, verdict: "fixable", rescue: "brush-rinse-pat-dry" },
      ],
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "chili-heat", amount: "a pinch more" },
        when: "any time; flakes want a few minutes in the fat (or scatter them on at the table)",
        say: "Add a pinch more now — heat is easy to add.", sources: s("MCG-8", "SFAH-SALT") },
      { id: "scale-batch", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That'll be too hot — make the batch bigger to spread the heat, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      { id: "mask-with-dairy-fat-sugar", kind: "add", add: { role: "dairy-cultured", amount: "sour cream or yoghurt served with it, plus about ½ tsp sugar per quart" },
        when: "only under twice the heat, and only where dairy suits the dish",
        say: "It'll be hot — serve it with yoghurt or sour cream to cool it.", sources: s("MCG-8", "ATK-SGC"), provisional: true },
      { id: "brush-rinse-pat-dry", kind: "none", when: "raw food with the spice on its surface, before it cooks",
        say: "Brush the spice off the surface and pat it dry before it cooks.", sources: s("SFAH-SALT"), provisional: true },
    ],
    substitutions: [
      { use: "cayenne (for red pepper flakes)", ratio: 0.5, effect: "¼ tsp cayenne ≈ ½ tsp flakes.", sources: [], provisional: true },
      { use: "red pepper flakes (for cayenne)", ratio: 2, effect: "½ tsp flakes ≈ ¼ tsp cayenne.", sources: [], provisional: true },
      { use: "hot paprika (for cayenne)", ratio: 2, effect: "Much milder — two to three times as much.", sources: [], provisional: true },
      { use: "chipotle powder (for US chili powder)", ratio: 0.25, effect: "Hotter and smoky — a quarter to half.", sources: [], provisional: true },
      { use: "US chili powder (for cayenne)", ratio: 4, effect: "Four to six times the volume; adds cumin and oregano.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 1, effect: "Any amount; milder.", sources: s("MCG-8"), provisional: true },
      { direction: "more", upTo: 0.5, effect: "Up to half as much again is a matter of taste.", sources: s("MCG-8"), provisional: true },
    ],
    shows: "Red-orange colour and red flecks — too much cayenne turns a sauce visibly redder; flakes float in the oil; cayenne and chili powder look alike, so read the jar.",
    sources: s("MCG-8", "ATK-SGC", "SFAH-ACID"),
    provisional: true, // numeric thresholds provisional
  }),

  // ───────────────────────────────────────────── hot-sauce
  allProvisional({
    id: "hot-sauce",
    name: "Hot sauces and chile pastes — sriracha, chipotle in adobo, vinegar hot sauces, sambal, gochujang",
    does: "Heat plus salt, plus acid (vinegar sauces) or sugar and garlic (sriracha, gochujang), in sauces, braises, sautes, eggs and marinades. Chipotles in adobo bring smoke, heat and vinegar; one chopped chipotle is a large dose of heat.",
    // True for chipotle in adobo and habanero sauces; false for sriracha and Tabasco-style used as a condiment.
    tight: false,
    bands: {
      // Sauce / braise / soup.
      default: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      // Dressing / mayo / dip (uncooked, small batch) → "other".
      other: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "scale-sauce" }, { below: INF, verdict: "redo" },
      ],
      saute: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "mask-with-dairy-fat-sugar" }, { below: INF, verdict: "redo" },
      ],
      eggs: [
        { below: 1.0, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "mask-with-dairy-fat-sugar" }, { below: INF, verdict: "redo" },
      ],
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "hot-sauce", amount: "a little more" },
        when: "any time; for sautes and eggs, at the table",
        say: "Add a little more now — heat is easy to add.", sources: s("MCG-8", "SFAH-SALT") },
      { id: "scale-batch", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That's a lot of heat — we'd need a bigger batch to save it; otherwise start the sauce again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      { id: "scale-sauce", kind: "scale", when: "only the dressing or dip, before it meets the food",
        say: "Make more of the base to tame it, then use what you need.", sources: s("SFAH-SALT"), provisional: true },
      { id: "mask-with-dairy-fat-sugar", kind: "add", add: { role: "dairy-cultured", amount: "sour cream or yoghurt served with it" },
        when: "only under twice the heat, and only where dairy suits the dish",
        say: "It'll be fiery — serve it with yoghurt or sour cream.", sources: s("MCG-8", "ATK-SGC"), provisional: true },
    ],
    substitutions: [
      { use: "sambal oelek (for sriracha)", ratio: 1, effect: "Less sweet, more raw chile.", sources: [], provisional: true },
      { use: "Tabasco (for sriracha)", ratio: 0.33, effect: "Thinner, sourer and hotter per drop — a third to half.", sources: [], provisional: true },
      { use: "cayenne (for hot sauce)", ratio: 0.125, effect: "⅛ tsp per 1 tsp sauce; adds no vinegar.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 1, effect: "Any amount.", sources: [], provisional: true },
      { direction: "more", upTo: 0.5, effect: "Up to half as much again, to taste.", sources: [], provisional: true },
    ],
    shows: "Sriracha streaks bright red; chipotle is dark brick-red with visible pieces — count the peppers on the board; too much turns a sauce redder and oilier.",
    sources: s("MCG-8", "ATK-SGC", "SFAH-ACID"),
    provisional: true, // numeric thresholds provisional
  }),

  // ───────────────────────────────────────────── acid-flavour
  {
    id: "acid-flavour",
    name: "Acid for flavour — citrus juice and vinegars",
    does: "Brightens and balances fat and salt, lifting a flat dish; in a dressing the second half of a roughly 3:1 oil-to-acid emulsion; in a marinade it firms surface protein (long acid marinades turn fish and chicken mushy). Added early it turns green vegetables olive and slows beans softening; meeting hot milk it curdles it.",
    // False for too little; true for too much only in small uncooked preparations and dairy sauces.
    tight: false,
    bands: {
      // Cooked savory: sauce, braise, soup, roast. Thresholds provisional (SFAH-ACID gives no numbers).
      default: ACID_COOKED,
      braise: ACID_BRAISE,
      // Dressing / vinaigrette (uncooked) → "other".
      other: ACID_DRESSING,
      // Acid for flavour in a baking-powder batter (e.g. lemon cake) — provisional.
      baking: prov([
        { below: 1.0, verdict: "fixable", rescue: "add-more-before-baking" }, { below: 1.5, verdict: "fine" },
        { below: INF, verdict: "redo" },
      ]),
      pastry: prov([
        { below: 1.0, verdict: "fixable", rescue: "add-more-before-baking" }, { below: 1.5, verdict: "fine" },
        { below: INF, verdict: "redo" },
      ]),
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "acid-flavour", amount: "½ tsp at a time, tasting" }, when: "at the end",
        say: "Squeeze in a little more and taste — it should taste brighter, not sour.", sources: s("SFAH-ACID", "ATK-SGC") },
      { id: "add-more-before-baking", kind: "add", add: { role: "acid-flavour", amount: "the shortfall" }, when: "before baking",
        say: "Stir the rest in now, before it goes in the oven.", sources: s("SFAH-ACID"), provisional: true },
      { id: "balance-acid", kind: "add", add: { role: "fat-cooking", amount: "about 1 Tbsp butter, olive oil or cream per extra Tbsp of acid; or a pinch of salt; or ½–1 tsp sugar or honey per extra Tbsp" },
        when: "cooked savory dishes, under 2½ times the acid",
        say: "It's a bit sharp — swirl in a knob of butter and a pinch of sugar, then taste.", sources: s("SFAH-ACID", "MCG-13"), provisional: true },
      { id: "add-oil-per-excess", kind: "add", add: { role: "oil-dressing", per: 1, amount: "3 parts oil per extra part of acid, plus a pinch of salt" },
        when: "an uncooked dressing",
        say: "Too sharp — whisk in three spoons of oil for every extra spoon of vinegar.", sources: s("MCG-11", "SFAH-ACID", "ATK-SGC") },
      { id: "scale-batch", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That's too sharp for this batch — make the batch bigger to balance it, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
    ],
    substitutions: [
      { use: "lime juice (for lemon juice)", ratio: 1, effect: "Same acidity, different aroma.", sources: s("SFAH-ACID", "MCG-7", "MCG-13") },
      { use: "white-wine or cider vinegar (for lemon juice)", ratio: 1, effect: "Same acidity; loses the citrus aroma — add zest if you have it.", sources: s("SFAH-ACID", "MCG-7", "MCG-13") },
      { use: "bottled lemon juice (for fresh)", ratio: 1, effect: "Duller flavour, steadier acidity.", sources: s("KA-BUTTERMILK", "ATK-SGC") },
      { use: "balsamic vinegar (for red-wine vinegar)", ratio: 1, effect: "Sweet and dark.", sources: [], provisional: true },
      { use: "seasoned rice vinegar (for plain rice vinegar)", ratio: 1, effect: "It carries sugar and salt — cut those.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 1, effect: "Any amount; flatter.", sources: s("SFAH-ACID", "MCG-11") },
      { direction: "more", upTo: 0.33, effect: "A third more in a dressing, half more in a cooked dish.", sources: s("SFAH-ACID", "MCG-11") },
    ],
    shows: "Acid itself is invisible — watch the pour and the label (rice vs seasoned rice vinegar); curdled milk goes grainy and separated; green veg turns olive; over-marinated fish goes opaque and soft.",
    sources: s("SFAH-ACID", "MCG-13", "ATK-SGC", "MCG-11", "MCG-7", "MCG-1", "MCG-6", "ISU-CURDLE"),
  },

  // ───────────────────────────────────────────── acid-leavening
  {
    id: "acid-leavening",
    name: "Acid as a leavening partner — the acid baking soda reacts with",
    does: "In baking, acid (buttermilk, yoghurt, sour cream, lemon juice, vinegar, cream of tartar, brown sugar, honey, natural cocoa, molasses) neutralises baking soda to release carbon dioxide — about ½ tsp soda per cup of buttermilk. Too little acid leaves soda soapy and metallic, the crumb yellowish and the rise poor; too much makes it sour, dense and pale.",
    tight: true, // the reaction is stoichiometric and happens once
    bands: {
      // Baking with baking soda, before baking. 1.5 / 2.0 provisional.
      baking: [
        { below: 0.75, verdict: "fixable", rescue: "add-acid-now" }, { below: 1.5, verdict: "fine", provisional: true },
        { below: 2.0, verdict: "fixable", rescue: "add-soda-per-excess", provisional: true }, { below: INF, verdict: "redo" },
      ],
      pastry: [
        { below: 0.75, verdict: "fixable", rescue: "add-acid-now" }, { below: 1.5, verdict: "fine", provisional: true },
        { below: 2.0, verdict: "fixable", rescue: "add-soda-per-excess", provisional: true }, { below: INF, verdict: "redo" },
      ],
      // Savory kinds mirror acid-flavour (lemon juice and vinegar fill both roles; see header).
      default: ACID_COOKED,
      braise: ACID_BRAISE,
      other: ACID_DRESSING,
    },
    rescues: [
      { id: "add-acid-now", kind: "add", add: { role: "acid-leavening", amount: "the shortfall, folded in briefly" },
        when: "before baking, and only if the soda went in less than ten minutes ago; bake straight away",
        say: "Fold the acid in now, gently, and get it into the oven straight away.", sources: s("MCG-10", "ATK-SGC"), provisional: true },
      { id: "add-soda-per-excess", kind: "add", add: { role: "chemical-leavener-base", amount: "about ¼ tsp per extra Tbsp of lemon or vinegar, or per extra ½ cup buttermilk" },
        when: "before baking, quick bread, muffin or pancake batter only — not an aerated cake",
        say: "Fold in a little more baking soda and bake at once.", sources: s("MCG-10", "KA-BUTTERMILK"), provisional: true },
      // Mirrors of acid-flavour's savory rescues.
      { id: "add-more", kind: "add", add: { role: "acid-leavening", amount: "½ tsp at a time, tasting" }, when: "at the end",
        say: "Squeeze in a little more and taste — it should taste brighter, not sour.", sources: s("SFAH-ACID", "ATK-SGC") },
      { id: "add-oil-per-excess", kind: "add", add: { role: "oil-dressing", per: 1, amount: "3 parts oil per extra part of acid, plus a pinch of salt" },
        when: "an uncooked dressing",
        say: "Too sharp — whisk in three spoons of oil for every extra spoon of vinegar.", sources: s("MCG-11", "SFAH-ACID", "ATK-SGC") },
      { id: "scale-batch", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That's too sharp for this batch — make the batch bigger to balance it, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
    ],
    substitutions: [
      { use: "milk soured with 1 Tbsp lemon juice or white vinegar per cup (for buttermilk), rested 5–15 minutes", ratio: 1, effect: "Works the same with the soda.", sources: s("KA-BUTTERMILK", "ATK-BUTTERMILK") },
      { use: "plain yoghurt thinned with milk, ¾ cup yoghurt to ¼ cup milk (for buttermilk)", ratio: 1, effect: "Works the same with the soda.", sources: s("KA-BUTTERMILK", "ATK-BUTTERMILK") },
      { use: "vinegar (for lemon juice) in a soda batter", ratio: 1, effect: "Both are about 5 % acid.", sources: s("KA-BUTTERMILK", "MCG-13") },
      { use: "milk with 1½ tsp cream of tartar per cup (for buttermilk)", ratio: 1, effect: "Milder taste.", sources: s("ATK-BMPANCAKE"), provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Not below three-quarters of the recipe's acid when it uses baking soda.", sources: [], provisional: true },
      { direction: "more", upTo: 0.5, effect: "Up to half as much again; tangier.", sources: [], provisional: true },
    ],
    shows: "Fizzing the moment acid meets soda — if the bubbles are gone before the pan goes in, the gas is lost; too little acid gives a yellowish, soapy-smelling crumb; too much bakes pale, flat and dense.",
    sources: s("MCG-10", "KA-BUTTERMILK", "ATK-BUTTERMILK", "ATK-SGC"),
  },

  // ───────────────────────────────────────────── sugar-baking
  {
    id: "sugar-baking",
    name: "Dry sugars in baking — granulated, brown, powdered",
    does: "Sweetness, and structure and texture: it tenderises (limits gluten, delays egg and starch setting), holds moisture, controls cookie spread, aerates when creamed with butter, stabilises meringue, browns and feeds yeast. Brown sugar adds moisture, chew and molasses acidity that reacts with soda.",
    // True for meringue, candy, custards, cookies and creamed cakes; false for muffins and quick breads (±25 %).
    tight: true,
    bands: {
      // Cookies, creamed cakes, brownies, before baking. Upper thresholds provisional.
      baking: [
        { below: 0.67, verdict: "fixable", rescue: "add-more" }, { below: 1.15, verdict: "fine", provisional: true },
        { below: 1.5, verdict: "fixable", rescue: "scale-batch", provisional: true }, { below: INF, verdict: "redo" },
      ],
      pastry: [
        { below: 0.67, verdict: "fixable", rescue: "add-more" }, { below: 1.15, verdict: "fine", provisional: true },
        { below: 1.5, verdict: "fixable", rescue: "scale-batch", provisional: true }, { below: INF, verdict: "redo" },
      ],
      // Meringue and custard: stability and setting depend on the exact sugar.
      eggs: [
        { below: 0.9, verdict: "redo" }, { below: 1.1, verdict: "fine" }, { below: INF, verdict: "redo" },
      ],
      // Savory kinds mirror sugar-savory (sugar and brown sugar fill both roles; see header). Thresholds provisional.
      default: SUGAR_SAVORY("add-more-savory", "scale-batch-savory"),
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "sugar-baking", amount: "the shortfall, whisked into the wet ingredients or the creamed butter" },
        when: "before creaming, or before the wet and dry are mixed; before baking",
        say: "Good catch — it isn't baked yet, so stir the rest of the sugar in now.", sources: s("BT", "ATK-SGC"), provisional: true },
      { id: "scale-batch", kind: "scale", when: "before baking; cookie dough or brownie batter only — not a creamed cake or meringue",
        say: "That's too sweet for this dough — make the batch bigger to bring it back, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      // Mirrors of sugar-savory's rescues.
      { id: "add-more-savory", kind: "add", add: { role: "sugar-baking", amount: "the shortfall, dissolved in the sauce" },
        say: "Add a pinch more sugar and let it dissolve, then taste.", sources: s("SFAH-ACID", "ATK-SGC") },
      { id: "scale-batch-savory", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That's on the sweet side — make the batch bigger to balance it, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
    ],
    substitutions: [
      { use: "granulated sugar plus 2 teaspoons molasses per cup (for light brown sugar)", ratio: 1, effect: "Near-identical. King Arthur's lighter amount; America's Test Kitchen uses up to 1 Tbsp. For dark brown: 1 Tbsp, up to 2 Tbsp.", sources: s("ATK-SWEET", "ATK-BROWN", "KA-BROWN", "KA-SUGARS") },
      { use: "brown sugar, packed (for white sugar)", ratio: 1, effect: "Moister, chewier, darker, a little more lift with soda; cookies spread differently.", sources: s("KA-SUGARS", "ATK-SGC") },
      { use: "white sugar (for brown sugar)", ratio: 1, effect: "Crisper, paler, less moist; a little less lift in a soda-only recipe.", sources: s("KA-BROWN", "ATK-SWEET") },
      { use: "granulated sugar blended with 1 tsp cornstarch per cup (for powdered sugar)", ratio: 1, effect: "Fine for dusting, worse in icing.", sources: s("ATK-SWEET", "KA-SUGARS") },
      // From the liquid-sweetener section ("replacing 1 cup granulated sugar"), placed where the ask "no sugar" lands.
      { use: "honey (for granulated sugar in baking)", ratio: 0.75, effect: "Replace no more than half the sugar; take out about ¼ cup liquid and add ¼ tsp baking soda per cup of honey, lower the oven 25 °F. Browns faster, moister, denser in creamed cakes.", sources: s("KA-LIQSWEET", "MU-HONEY", "ATK-SWEET") },
      { use: "maple syrup (for granulated sugar in baking)", ratio: 1, effect: "Replace no more than half the sugar; take out 3–4 Tbsp liquid per cup. Browns a little faster; cookies spread more and turn cakier.", sources: s("KA-LIQSWEET", "ATK-SWEET") },
    ],
    changes: [
      { direction: "less", upTo: 0.15, effect: "Cookies and creamed cakes take about 15 % less (less sweet, a little drier and cakier, less spread); muffins and quick breads up to a third less. None in meringue or candy.", sources: s("ACES-ALTER", "UGA-ALTER", "BT", "ATK-SGC") },
      { direction: "more", upTo: 0.15, effect: "Up to 15 % more in cookies and cakes, 25 % in muffins.", sources: s("ACES-ALTER", "UGA-ALTER", "BT", "ATK-SGC") },
    ],
    shows: "Too little: pale crust, puffy cakey cookies, a dry domed cake. Too much: cookies spread thin and brown fast; a cake with a sticky dark crust that sinks; butter and sugar that stay dense when creamed mean sugar short or butter too warm.",
    sources: s("ACES-ALTER", "UGA-ALTER", "MCG-10", "MCG-12", "ATK-SGC", "BT", "MC", "KA-SUGARS"),
  },

  // ───────────────────────────────────────────── sugar-savory
  allProvisional({
    id: "sugar-savory",
    name: "Sugar in savory cooking — tomato sauce, glazes, marinades, stir-fry sauces, braises",
    does: "Balances acid, bitterness and salt; promotes browning in glazes; a main flavour in stir-fry and barbecue sauces. Burns dark and bitter above about 170–180 °C.",
    tight: false, // adjustable, except glazes under high heat
    bands: {
      default: SUGAR_SAVORY("add-more", "scale-batch"),
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "sugar-savory", amount: "the shortfall, dissolved in the sauce" },
        say: "Add a pinch more sugar and let it dissolve, then taste.", sources: s("SFAH-ACID", "ATK-SGC") },
      { id: "balance-sweet", kind: "add", add: { role: "acid-flavour", amount: "about 1 tsp lemon juice or vinegar per extra tsp of sugar, plus a pinch of salt" },
        when: "under three times the sugar",
        say: "It's a touch sweet — add a squeeze of lemon and a pinch of salt, then taste.", sources: s("SFAH-ACID"), provisional: true },
      { id: "scale-batch", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That's on the sweet side — make the batch bigger to balance it, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
    ],
    substitutions: [
      { use: "honey or maple syrup (for sugar in a savory dish)", ratio: 1, effect: "Sweeter and browns faster — lower the heat.", sources: s("KA-LIQSWEET", "ATK-SWEET", "SFAH-ACID"), provisional: true },
      { use: "brown sugar (for white, savory)", ratio: 1, effect: "A molasses note.", sources: s("KA-LIQSWEET", "ATK-SWEET", "SFAH-ACID"), provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 1, effect: "Any amount.", sources: [], provisional: true },
      { direction: "more", upTo: 0.5, effect: "Up to half as much again.", sources: [], provisional: true },
    ],
    shows: "An over-sweet glaze darkens fast and blackens at the edges, sticky and shiny; burnt sugar smells acrid.",
    sources: s("SFAH-ACID", "MCG-12", "ATK-SGC"),
    provisional: true, // thresholds provisional
  }),

  // ───────────────────────────────────────────── liquid-sweetener
  allProvisional({
    id: "liquid-sweetener",
    name: "Liquid sweeteners — honey, maple syrup, molasses, corn and golden syrup, agave",
    does: "In baking: sweetness, moisture and a softer crumb; they brown faster than sugar (honey most); honey and molasses are acidic and react with soda; corn and invert syrups stop sugar crystallising in candy, caramel, ice cream and pecan pie. In savory: glazes, dressings, sauces.",
    // True in candy, caramel, pecan pie, ice cream and wherever the syrup is structural; false in dressings/marinades.
    tight: true,
    bands: {
      // As the listed sweetener in baking.
      baking: [
        { below: 0.75, verdict: "fixable", rescue: "add-more" }, { below: 1.25, verdict: "fine" },
        { below: 1.5, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      // Candy, caramel, pecan pie, ice-cream base — the strict set, used for pastry and eggs (custard bases).
      pastry: [
        { below: 0.9, verdict: "redo" }, { below: 1.1, verdict: "fine" }, { below: INF, verdict: "redo" },
      ],
      eggs: [
        { below: 0.9, verdict: "redo" }, { below: 1.1, verdict: "fine" }, { below: INF, verdict: "redo" },
      ],
      // Savory, dressings, glazes: sugar-savory's bands (the research says so).
      default: SUGAR_SAVORY("add-more-savory", "scale-batch-savory"),
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "liquid-sweetener", amount: "the shortfall" }, when: "before baking",
        say: "It isn't baked yet — stir the rest in now.", sources: s("BT", "ATK-SGC"), provisional: true },
      { id: "scale-batch", kind: "scale", when: "before baking; not for a whipped or creamed batter",
        say: "That's too much syrup for this batter — make the batch bigger, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      // Mirrors of sugar-savory's rescues.
      { id: "add-more-savory", kind: "add", add: { role: "liquid-sweetener", amount: "the shortfall" },
        say: "Add a little more and let it melt in, then taste.", sources: s("SFAH-ACID", "ATK-SGC") },
      { id: "scale-batch-savory", kind: "scale", when: "the pot has room and you have the other ingredients",
        say: "That's on the sweet side — make the batch bigger to balance it, or we start again.",
        sources: s("SFAH-SALT", "ATK-SGC") },
      { id: "balance-sweet", kind: "add", add: { role: "acid-flavour", amount: "about 1 tsp lemon juice or vinegar per extra tsp, plus a pinch of salt" },
        when: "savory dishes, under three times the sweetener",
        say: "It's a touch sweet — add a squeeze of lemon and a pinch of salt, then taste.", sources: s("SFAH-ACID"), provisional: true },
    ],
    substitutions: [
      { use: "granulated sugar, 1¼ cups plus ¼ cup extra liquid per cup (for honey)", ratio: 1.25, effect: "Drier, paler, less browning.", sources: [], provisional: true },
      { use: "golden syrup (for corn syrup)", ratio: 1, effect: "More flavoured; fine in candy and pies.", sources: s("BT"), provisional: true },
      { use: "molasses (as part of the sweetener only)", ratio: 1, effect: "Strong — only as part of the sweetener; blackstrap turns bitter.", sources: s("KA-LIQSWEET", "ATK-SWEET"), provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.25, effect: "Down to three-quarters in quick breads.", sources: [], provisional: true },
      { direction: "more", upTo: 0.25, effect: "Up to a quarter more.", sources: [], provisional: true },
    ],
    shows: "Tops brown dark before the middle is done (tent with foil); the batter looks noticeably looser; honey cakes show small pinholes on top.",
    sources: s("KA-LIQSWEET", "ATK-SWEET", "MU-HONEY", "BT", "MCG-12"),
    provisional: true, // thresholds provisional
  }),

  // ───────────────────────────────────────────── flavour-extract (the research's vanilla-extract)
  allProvisional({
    id: "flavour-extract",
    name: "Vanilla (extract, paste, bean)",
    does: "Aroma that rounds sweetness in baking, pastry, custards and frostings. Pure extract is about 35 % alcohol; in baked goods much of the aroma and all the boozy edge bake off, so they tolerate excess — uncooked uses (whipped cream, buttercream, no-bake fillings) do not.",
    tight: false, // false in baked goods; "true-ish" uncooked
    bands: {
      // Uncooked (frosting, whipped cream, no-bake) — the stricter set, as default.
      default: [
        { below: 0.01, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      // Batter or dough before baking; cooked custards before cooking.
      baking: [
        { below: 0.01, verdict: "fixable", rescue: "add-more" }, { below: 3.0, verdict: "fine" },
        { below: 4.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      pastry: [
        { below: 0.01, verdict: "fixable", rescue: "add-more" }, { below: 3.0, verdict: "fine" },
        { below: 4.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
      eggs: [
        { below: 0.01, verdict: "fixable", rescue: "add-more" }, { below: 3.0, verdict: "fine" },
        { below: 4.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "flavour-extract", amount: "the recipe's amount" },
        when: "before baking (once baked, leaving it out is fine — just less aromatic)",
        say: "Pop the vanilla in now — it isn't baked yet.", sources: s("MCG-8", "BT"), provisional: true },
      { id: "scale-batch", kind: "scale", when: "before baking, not a whipped or creamed batter; or make more frosting or cream",
        say: "That's a lot of vanilla — make a bigger batch to balance it, or we start again.",
        sources: s("MCG-8", "BT"), provisional: true },
    ],
    substitutions: [
      { use: "imitation vanilla (for pure)", ratio: 1, effect: "In baked goods many tasters can't tell; flatter in uncooked uses.", sources: s("ATK-VANILLA", "MCG-8") },
      { use: "vanilla bean paste (for extract)", ratio: 1, effect: "Adds visible seeds.", sources: s("KA-SUGARS"), provisional: true },
      { use: "bourbon, rum or brandy (for vanilla, in baking)", ratio: 1, effect: "A different, boozier warmth.", sources: [], provisional: true },
      // From the almond-extract section; placed where the ask "no vanilla" lands.
      { use: "almond extract (for vanilla)", ratio: 0.25, effect: "Start at a quarter, up to half; it is far stronger and changes the flavour.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 1, effect: "It can be left out entirely — a minor loss of flavour.", sources: s("MCG-8", "ATK-SGC") },
      { direction: "more", upTo: 0.5, effect: "Half as much again uncooked; two to three times in baking.", sources: [], provisional: true },
    ],
    shows: "Extract tints pale frostings and whipped cream slightly brown (paste and bean leave dark flecks); a strong alcohol smell in uncooked mixtures.",
    sources: s("MCG-8", "ATK-SGC", "ATK-VANILLA", "BT"),
    provisional: true, // thresholds provisional
  }),

  // ───────────────────────────────────────────── almond-extract
  allProvisional({
    id: "almond-extract",
    name: "Almond extract and similar potent extracts (peppermint, lemon oil, rose and orange-flower water)",
    does: "A very concentrated flavour (benzaldehyde for almond) in baking and pastry — a quarter teaspoon flavours a cake. Too much tastes medicinal and bitter, like a cherry cough drop.",
    tight: true,
    bands: {
      default: [
        { below: 0.01, verdict: "fixable", rescue: "add-more" }, { below: 1.5, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "scale-batch" }, { below: INF, verdict: "redo" },
      ],
    },
    rescues: [
      { id: "add-more", kind: "add", add: { role: "almond-extract", amount: "the recipe's amount" },
        when: "before baking (once baked, leaving it out is fine — the flavour is just missing)",
        say: "Add it now, before it goes in the oven.", sources: s("MCG-9", "BT"), provisional: true },
      { id: "scale-batch", kind: "scale", when: "before baking, not a whipped or creamed batter; or make more frosting",
        say: "Almond extract is very strong — at double we can only save it with a bigger batch; otherwise start again.",
        sources: s("MCG-9", "BT"), provisional: true },
    ],
    substitutions: [
      { use: "vanilla extract (for almond)", ratio: 2, effect: "Two to four times as much, and the dish loses its almond character.", sources: [], provisional: true },
      { use: "amaretto (for almond extract)", ratio: 4, effect: "Four to six times as much; adds liquid and sugar.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 1, effect: "Any amount.", sources: [], provisional: true },
      { direction: "more", upTo: 0.5, effect: "At most half as much again.", sources: [], provisional: true },
    ],
    shows: "Invisible; a strong marzipan smell.",
    sources: s("MCG-9", "BT"),
    provisional: true, // numbers provisional
  }),
];

const SALT = ["salt"];
const UMAMI = ["salty-umami-condiment"];
const MILD = ["dried-mild-seasoning"];
const WARM = ["warm-sweet-spice"];
const HEAT = ["chili-heat"];
const HOT = ["hot-sauce"];
const ACID = ["acid-flavour"];
const ACID_BOTH = ["acid-flavour", "acid-leavening"];
const LEAVEN = ["acid-leavening"];
const SUGAR_BOTH = ["sugar-baking", "sugar-savory"];
const SUGAR = ["sugar-baking"];
const SAVORY_SUGAR = ["sugar-savory"];
const SYRUP = ["liquid-sweetener"];
const VANILLA = ["flavour-extract"];
const POTENT = ["almond-extract"];

/** Normalised item name (lookup.ts `normaliseItem`) → role ids. */
export const INDEX: Record<string, string[]> = {
  // salt
  "salt": SALT, "table salt": SALT, "fine salt": SALT, "iodized salt": SALT, "iodised salt": SALT,
  "kosher salt": SALT, "coarse kosher salt": SALT, "diamond crystal kosher salt": SALT, "diamond crystal salt": SALT,
  "morton kosher salt": SALT, "sea salt": SALT, "fine sea salt": SALT, "coarse sea salt": SALT, "coarse salt": SALT,
  "flaky sea salt": SALT, "flaky salt": SALT, "flake salt": SALT, "sea salt flake": SALT, "maldon salt": SALT,
  "maldon sea salt": SALT, "fleur de sel": SALT, "finishing salt": SALT, "pickling salt": SALT, "canning salt": SALT,
  "himalayan pink salt": SALT, "pink himalayan salt": SALT, "himalayan salt": SALT,
  // salty umami
  "soy sauce": UMAMI, "soy": UMAMI, "shoyu": UMAMI, "regular soy sauce": UMAMI, "all-purpose soy sauce": UMAMI,
  "reduced-sodium soy sauce": UMAMI, "low-sodium soy sauce": UMAMI, "dark soy sauce": UMAMI, "dark soy": UMAMI, "tamari": UMAMI,
  "gluten-free tamari": UMAMI, "fish sauce": UMAMI, "nam pla": UMAMI, "nuoc mam": UMAMI, "miso": UMAMI,
  "miso paste": UMAMI, "white miso": UMAMI, "white miso paste": UMAMI, "shiro miso": UMAMI, "yellow miso": UMAMI,
  "red miso": UMAMI, "aka miso": UMAMI, "hatcho miso": UMAMI, "coconut amino": UMAMI,
  // dried mild seasonings
  "garlic powder": MILD, "granulated garlic": MILD, "onion powder": MILD, "granulated onion": MILD,
  "paprika": MILD, "sweet paprika": MILD, "hungarian paprika": MILD, "hungarian sweet paprika": MILD,
  "smoked paprika": MILD, "sweet smoked paprika": MILD, "pimenton": MILD, "pimenton dulce": MILD, "piment n dulce": MILD,
  "dried oregano": MILD, "mexican oregano": MILD, "dried mexican oregano": MILD, "dried thyme": MILD,
  "dried thyme leave": MILD, "dried basil": MILD, "dried rosemary": MILD, "dried sage": MILD, "rubbed sage": MILD,
  "dried parsley": MILD, "dried dill": MILD, "dried dill weed": MILD, "dried tarragon": MILD,
  "italian seasoning": MILD, "dried italian seasoning": MILD, "herbes de provence": MILD, "herbs de provence": MILD,
  "black pepper": MILD, "ground black pepper": MILD, "freshly ground black pepper": MILD, "cracked black pepper": MILD,
  "coarsely ground black pepper": MILD, "pepper": MILD, "ground pepper": MILD, "freshly ground pepper": MILD,
  "black peppercorn": MILD, "peppercorn": MILD, "white pepper": MILD, "ground white pepper": MILD,
  // mild chile blends — the research rules them on dried-mild bands
  "chili powder": MILD, "chilli powder": MILD, "ancho chili powder": MILD, "ancho chile powder": MILD,
  "ancho powder": MILD, "aleppo pepper": MILD, "aleppo pepper flake": MILD, "gochugaru": MILD,
  "korean chili flake": MILD, "korean red pepper flake": MILD, "kashmiri chili powder": MILD, "kashmiri chilli powder": MILD,
  "kashmiri red chili powder": MILD, "kashmiri chili": MILD,
  // warm sweet spices
  "cinnamon": WARM, "ground cinnamon": WARM, "cassia": WARM, "cassia cinnamon": WARM, "ceylon cinnamon": WARM,
  "cinnamon stick": WARM, "nutmeg": WARM, "ground nutmeg": WARM, "freshly grated nutmeg": WARM, "grated nutmeg": WARM,
  "clove": WARM, "ground clove": WARM, "whole clove": WARM, "allspice": WARM, "ground allspice": WARM,
  "ground ginger": WARM, "cardamom": WARM, "ground cardamom": WARM, "cardamom pod": WARM, "green cardamom pod": WARM,
  "pumpkin pie spice": WARM, "pumpkin-pie spice": WARM, "pumpkin spice": WARM, "apple pie spice": WARM,
  "apple-pie spice": WARM, "mixed spice": WARM,
  // chili heat
  "red pepper flake": HEAT, "crushed red pepper": HEAT, "crushed red pepper flake": HEAT, "chili flake": HEAT,
  "chilli flake": HEAT, "chile flake": HEAT, "dried chili flake": HEAT, "dried red pepper flake": HEAT,
  "cayenne": HEAT, "cayenne pepper": HEAT, "ground cayenne": HEAT, "ground cayenne pepper": HEAT,
  "ground red pepper": HEAT, "hot paprika": HEAT, "pimenton picante": HEAT, "piment n picante": HEAT,
  "chile powder": HEAT, "ground chile": HEAT, "chipotle powder": HEAT,
  "chipotle chili powder": HEAT, "chipotle chile powder": HEAT, "ground chipotle": HEAT,
  // hot sauces and pastes
  "sriracha": HOT, "sriracha sauce": HOT, "rooster sauce": HOT, "chipotle in adobo": HOT, "chipotle in adobo sauce": HOT,
  "chipotle pepper in adobo": HOT, "chipotle pepper in adobo sauce": HOT, "chipotle peppers in adobo": HOT,
  "chipotle peppers in adobo sauce": HOT, "chipotles in adobo": HOT, "chipotles in adobo sauce": HOT,
  "chipotle chiles in adobo": HOT, "chipotle chiles in adobo sauce": HOT, "chipotle chile in adobo": HOT,
  "canned chipotle": HOT, "chipotle pepper": HOT, "adobo sauce": HOT, "tabasco": HOT, "tabasco sauce": HOT,
  "hot sauce": HOT, "louisiana hot sauce": HOT, "louisiana-style hot sauce": HOT, "frank s red hot": HOT,
  "frank s redhot": HOT, "frank s red hot sauce": HOT, "frank s redhot sauce": HOT, "crystal hot sauce": HOT,
  "sambal oelek": HOT, "sambal": HOT, "gochujang": HOT, "gochujang paste": HOT, "harissa": HOT, "harissa paste": HOT,
  "chili crisp": HOT, "chilli crisp": HOT, "chili garlic sauce": HOT,
  // acid for flavour (and leavening, for the ones a soda batter uses)
  "lemon juice": ACID_BOTH, "bottled lemon juice": ACID_BOTH, "juice of lemon": ACID_BOTH, "lime juice": ACID,
  "juice of lime": ACID, "orange juice": ACID,
  "vinegar": ACID_BOTH, "white vinegar": ACID_BOTH, "distilled white vinegar": ACID_BOTH, "distilled vinegar": ACID_BOTH,
  "cider vinegar": ACID_BOTH, "apple cider vinegar": ACID_BOTH, "red wine vinegar": ACID, "white wine vinegar": ACID,
  "champagne vinegar": ACID, "sherry vinegar": ACID, "rice vinegar": ACID, "rice wine vinegar": ACID,
  "seasoned rice vinegar": ACID, "balsamic vinegar": ACID, "balsamic": ACID, "malt vinegar": ACID, "verjuice": ACID,
  "tamarind": ACID, "tamarind paste": ACID, "tamarind concentrate": ACID,
  // acid as a leavening partner
  "cream of tartar": LEAVEN, "buttermilk": LEAVEN, "soured milk": LEAVEN, "sour milk": LEAVEN,
  // sugars
  "sugar": SUGAR_BOTH, "granulated sugar": SUGAR_BOTH, "white sugar": SUGAR_BOTH, "granulated white sugar": SUGAR_BOTH,
  "cane sugar": SUGAR_BOTH, "caster sugar": SUGAR, "superfine sugar": SUGAR, "brown sugar": SUGAR_BOTH,
  "dark brown sugar": SUGAR_BOTH, "muscovado": SUGAR, "muscovado sugar": SUGAR, "dark muscovado sugar": SUGAR,
  "demerara": SUGAR, "demerara sugar": SUGAR, "turbinado": SUGAR, "turbinado sugar": SUGAR,
  "powdered sugar": SUGAR, "confectioners sugar": SUGAR, "confectioner s sugar": SUGAR, "icing sugar": SUGAR,
  "palm sugar": SAVORY_SUGAR, "jaggery": SAVORY_SUGAR,
  // liquid sweeteners
  "honey": SYRUP, "maple syrup": SYRUP, "molasse": SYRUP, "dark molasse": SYRUP, "blackstrap molasse": SYRUP,
  "unsulphured molasse": SYRUP, "corn syrup": SYRUP, "dark corn syrup": SYRUP, "golden syrup": SYRUP,
  "lyle s golden syrup": SYRUP, "agave": SYRUP, "agave nectar": SYRUP, "agave syrup": SYRUP, "date syrup": SYRUP,
  "brown rice syrup": SYRUP, "pancake syrup": SYRUP,
  // vanilla
  "vanilla extract": VANILLA, "vanilla": VANILLA, "imitation vanilla": VANILLA, "imitation vanilla extract": VANILLA,
  "vanilla bean paste": VANILLA, "vanilla paste": VANILLA, "vanilla bean": VANILLA, "vanilla pod": VANILLA,
  "vanilla powder": VANILLA, "vanilla sugar": VANILLA, "vanilla essence": VANILLA,
  // potent extracts
  "almond extract": POTENT, "imitation almond extract": POTENT, "almond essence": POTENT, "bitter almond oil": POTENT,
  "amaretto": POTENT, "peppermint extract": POTENT, "mint extract": POTENT, "lemon extract": POTENT, "lemon oil": POTENT,
  "orange-flower water": POTENT, "orange flower water": POTENT, "orange blossom water": POTENT,
  "rose water": POTENT, "rosewater": POTENT,
};

/** Another name for the very same ingredient → its INDEX key. */
export const ALIASES: Record<string, string> = {
  "iodised salt": "iodized salt",
  "diamond crystal": "diamond crystal kosher salt",
  "diamond kosher salt": "diamond crystal kosher salt",
  "morton salt": "morton kosher salt",
  "canning salt": "pickling salt",
  "pink himalayan salt": "himalayan pink salt",
  "himalayan salt": "himalayan pink salt",
  "maldon": "maldon sea salt",
  "shoyu": "soy sauce",
  "nam pla": "fish sauce",
  "nuoc mam": "fish sauce",
  "shiro miso": "white miso",
  "aka miso": "red miso",
  "pimenton dulce": "smoked paprika",
  "piment n dulce": "smoked paprika",
  "granulated garlic powder": "granulated garlic",
  "herbs de provence": "herbes de provence",
  "crushed red pepper": "red pepper flake",
  "crushed red pepper flake": "red pepper flake",
  "red chili flake": "red pepper flake",
  "ground red pepper": "cayenne",
  "cayenne pepper": "cayenne",
  "pimenton picante": "hot paprika",
  "piment n picante": "hot paprika",
  "gochugaru flake": "gochugaru",
  "korean chili flake": "gochugaru",
  "korean red pepper flake": "gochugaru",
  "rooster sauce": "sriracha",
  "chipotle peppers in adobo": "chipotle in adobo",
  "chipotle pepper in adobo": "chipotle in adobo",
  "chipotles in adobo": "chipotle in adobo",
  "chipotle chiles in adobo": "chipotle in adobo",
  "pumpkin-pie spice": "pumpkin pie spice",
  "apple-pie spice": "apple pie spice",
  "distilled vinegar": "distilled white vinegar",
  "cider vinegar": "apple cider vinegar",
  "rice wine vinegar": "rice vinegar",
  "balsamic": "balsamic vinegar",
  "sour milk": "soured milk",
  "white sugar": "granulated sugar",
  "caster sugar": "superfine sugar",
  "confectioners sugar": "powdered sugar",
  "confectioner s sugar": "powdered sugar",
  "icing sugar": "powdered sugar",
  "agave": "agave nectar",
  "agave syrup": "agave nectar",
  "lyle s golden syrup": "golden syrup",
  "vanilla": "vanilla extract",
  "vanilla pod": "vanilla bean",
  "vanilla paste": "vanilla bean paste",
  "orange blossom water": "orange-flower water",
  "orange flower water": "orange-flower water",
  "rosewater": "rose water",
};
