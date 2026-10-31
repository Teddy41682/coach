import type { Band, Role } from "../types";

/*
 * Group D — liquids, aromatics, proteins, frying, heat & time. Encoded from
 * docs/research/expertise/d-proteins-liquids-heat.md (researched 2026-10-30). Nothing here goes beyond that file.
 *
 * Encoding choices, so a reader can check them against the research:
 * - Ratios: amount roles use actual ÷ recipe amount; protein and bake-time roles use actual ÷ recipe time;
 *   heat-oven and heat-frying use actual ÷ recipe temperature in °F.
 * - One band set per kind. Where the research gives several sub-types under one kind (bread dough / cake batter /
 *   pancake batter under baking; plain / jollof rice under grains; breast / thigh chicken), the STRICTEST set is the
 *   one encoded and the others are kept in comments beside it — the research's rule: "When sources disagree, the
 *   stricter verdict is recorded", and the coach can't yet tell the sub-type apart.
 * - Anything the research leaves uncovered by a band is "redo" (the research's convention).
 * - `tight` is a single flag; where the research says "true for X, false for Y" the stricter `true` is taken.
 * - A band whose cut-point the research marks provisional (or rests on fewer than two sources) carries
 *   `provisional: true` (via `prov()` for a whole set). Where the research marks only the thresholds provisional but
 *   says the verdicts and rescues have ≥ 2 sources (chicken, ground meat, frying, oven, bake time), the bands are
 *   provisional and the rescues are not.
 * - Rescue kinds follow this pack's engine: "add" with the role's own id means "put in what's missing"; "scale"
 *   means a bigger batch of everything else; "none" is technique only. The research's "scale" for reducing,
 *   reheating or frying a smaller batch is therefore encoded as "none".
 * - Renamed: research "frying-oil" → "heat-frying". Not defined here: research "thickener-cornstarch" — rescues that
 *   need it add role "starch-thickener" (another group).
 *
 * NOT ENCODED (needs code):
 * 1. Temperature deltas vs ratios (research open question 1). A °F ratio is unit-dependent; the research recommends
 *    encoding ±°F/°C deltas for oven and oil. heat-oven and heat-frying are encoded as °F ratios only; the deltas
 *    (fine ≈ ±15–20 °F oven at 350 °F; oil 325–375 °F fine, >400 °F stop) need a delta band in code.
 * 2. Step-level vs dish-level redo (open question 8). Burnt garlic / onion / ginger, black fond, smoking fat and
 *    scorched sauce are "redo the STEP", not the dish; the data model has one "redo". Rescues `garlic-restart` and
 *    `pan-restart` carry the step-redo line but no band can reach them.
 * 3. Hygiene prompt after raw chicken / raw meat (open question 7). `back-in-and-probe` mentions washing hands and
 *    boards in the research; a separate hygiene prompt needs code.
 * 4. State verdicts that are not ratios: burnt aromatics, split coconut milk (`coconut-rebind`), pan too cold / too
 *    hot / smoking (heat-pan has no ratio bands at all), charred protein → redo, "pink centre reported" overrides
 *    time, cut vs uncut / hot vs cooled / sunk cakes and loaves, forgot to preheat (provisional), fan oven treated as
 *    ratio [1.05, 1.12), oil smoking → stop, oil fire → safety line, breading falling off.
 * 5. A second ratio per role: frying load (pieces ÷ batch: [0,1.25) fine, [1.25,2.0) `fry-batch-smaller`, ≥2.0
 *    remove half) and air-fryer basket overlap (provisional).
 * 6. Protein time bands only decide whether to prompt a thermometer check (open question 2): a "fine" time is never
 *    proof of doneness; the coach must still prompt the probe.
 * 7. Oil temperature drop on loading: 300–325 °F just after food goes in is expected and fine if it climbs back.
 * 8. Sub-kinds (see comments at each role): bread dough, pancake batter, jollof / flavoured rice, fried rice,
 *    chicken thighs, ground-meat cooking styles.
 * 9. Engine quantity mismatches: `rice-add-hot-water` and `pastry-add-water-spoon` give a fixed small amount, but
 *    the engine's self-add puts in the whole deficit; `thicken-starch` / dough / pancake flour amounts are per unit of
 *    EXCESS LIQUID, but the engine scales the other ingredient's own recipe amount. The research figures are kept in
 *    `amount` (and `per` where it is a plain ratio of the excess).
 */

// ---- Sources (the research's keys, written out) ----
const MCGEE = "Harold McGee, On Food and Cooking, rev. ed. 2004 (Scribner)";
const M3 = `${MCGEE}, ch. 3 "Meat"`;
const M6 = `${MCGEE}, ch. 6 "A Survey of Common Vegetables" (onion family, garlic)`;
const M8 = `${MCGEE}, ch. 8 "Flavorings from Plants" (ginger)`;
const M9 = `${MCGEE}, ch. 9 "Seeds" (rice)`;
const M10 = `${MCGEE}, ch. 10 "Cereal Doughs and Batters"`;
const M11 = `${MCGEE}, ch. 11 "Sauces"`;
const M14 = `${MCGEE}, ch. 14 "Cooking Methods and Utensil Materials" (frying, heat transfer)`;
const SFAT = "Samin Nosrat, Salt Fat Acid Heat (2017)";
const SFAT_SALT = `${SFAT}, chapter "Salt"`;
const SFAT_FAT = `${SFAT}, chapter "Fat" (frying, oil temperature)`;
const SFAT_HEAT = `${SFAT}, chapter "Heat" (browning, layering heat, doneness, carryover)`;
const FOODLAB = "J. Kenji López-Alt, The Food Lab (2015)";
const FL_CHICKEN = `${FOODLAB}, chicken chapter`;
const FL_GROUND = `${FOODLAB}, ground meat chapter (burgers, meatballs)`;
const FL_BRAISE = `${FOODLAB}, braises and stews chapter`;
const FL_BATTERS = `${FOODLAB}, chapter "Batters and Breadings"`;
const FL_FRIED_RICE = `${FOODLAB}, fried rice`;
const SE = "Serious Eats (seriouseats.com), Food Lab columns";
const SE_RICE = `${SE}: rice`;
const SE_FRIED_RICE = `${SE}: fried rice`;
const SE_COCONUT = `${SE}: coconut milk and Thai curry`;
const SE_ONION = `${SE}: raw onion`;
const SGC = "America's Test Kitchen, The Science of Good Cooking (2012)";
const ATK_CS = "America's Test Kitchen, \"How to Thicken Sauces with Cornstarch\" — https://www.americastestkitchen.com/articles/how-to-thicken-sauces-with-cornstarch";
const CI = "Cook's Illustrated / America's Test Kitchen recipe test notes";
const CI_RICE = `${CI}: rice ratios, pasta-method rice, towel-under-lid rest`;
const CI_BRAISE = `${CI}: braising liquid depth, uncovering to reduce, wine reduction`;
const CI_FRIED_RICE = `${CI}: fried rice`;
const CI_SUBS = `${CI}: substitution chart`;
const CI_CHICKEN = `${CI}: chicken thighs to 175 °F+`;
const CI_FRYING = `${CI}: fried chicken (finish in the oven), resting breaded cutlets before frying`;
const CI_AIRFRY = "America's Test Kitchen air-fryer testing";
const CI_EQUIPMENT = `${CI}: equipment testing (oven accuracy, convection)`;
const MC = "Nathan Myhrvold et al., Modernist Cuisine at Home (2012)";
const MODERNIST_BREAD = "Modernist Bread (Modernist Cuisine team) — hydration";
const FSIS_T = "USDA FSIS, Safe Minimum Internal Temperature Chart — https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart";
const FSG = "FoodSafety.gov, Safe Minimum Internal Temperatures chart — https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures";
const FSIS_F = "USDA FSIS, \"Deep Fat Frying and Food Safety\" — fsis.usda.gov, Food Safety Basics";
const UNL = "University of Nebraska–Lincoln Extension, \"Safe cooking temperatures\" — https://food.unl.edu/safe-cooking-temperatures/";
const CCE = "Cornell Cooperative Extension, \"Safe minimum cooking temperatures\" — https://erie.cce.cornell.edu/community-health-nutrition/safe-minimum-cooking-temperatures";
const MSU = "Michigan State University Extension, \"Deep fat fryer safety\" — https://www.canr.msu.edu/news/deep_fat_fryer_safety";
const KA_T = "King Arthur Baking, \"Using a thermometer with yeast bread\" — https://www.kingarthurbaking.com/blog/2017/04/07/using-a-thermometer-with-yeast-bread";
const KA_D = "King Arthur Baking, \"How to tell if bread is done\" — https://www.kingarthurbaking.com/blog/2023/05/31/how-to-tell-if-bread-is-done";
const KA_QB = "King Arthur Baking, \"How to tell when banana bread is done\" — https://www.kingarthurbaking.com/blog/2018/03/15/how-to-tell-when-banana-bread-is-done";
const KA_BP = "King Arthur Baking, \"Baker's percentage\" guide — kingarthurbaking.com";
const KA_GUIDES = "King Arthur Baking, baking guides — kingarthurbaking.com";

// ---- Shared band sets ----

/** Cooking liquid in a sauce (also the default). */
const LIQUID_SAUCE: Band[] = [
  { below: 0.5, verdict: "fixable", rescue: "add-back-liquid" }, // research: redo if scorched (in the rescue's `when`)
  { below: 0.8, verdict: "fixable", rescue: "add-back-liquid" },
  { below: 1.25, verdict: "fine" },
  { below: 2.0, verdict: "fixable", rescue: "reduce-uncovered" }, // or thicken-starch
  { below: 3.0, verdict: "fixable", rescue: "reduce-uncovered" }, // + taste-rebalance; flag the long time
  { below: Infinity, verdict: "redo" }, // too diluted to reduce back without over-concentrating salt
];

/**
 * Cake / muffin / quick-bread batter — the strictest of the research's three baking sets, so it is the one encoded.
 * Numbers provisional (sources give the mechanism, not a percentage tolerance), hence provisional rescues.
 * Not encoded (sub-kinds): bread/yeast dough — <0.85 fixable `dough-add-liquid` before shaping only, else redo;
 * [0.85,0.95) fixable `dough-add-liquid`; [0.95,1.05) fine; [1.05,1.20) fixable `dough-add-flour-proportional` before
 * the first rise ends; ≥1.20 redo. Pancake/crêpe batter — [0.75,0.9) fixable `batter-add-liquid`; [0.9,1.15) fine;
 * [1.15,1.4) fixable `batter-add-flour-proportional` (provisional); ≥1.4 redo; below 0.75 uncovered → redo.
 */
const LIQUID_CAKE_BATTER: Band[] = [
  { below: 0.9, verdict: "redo" },
  { below: 0.95, verdict: "fixable", rescue: "batter-add-liquid" },
  { below: 1.05, verdict: "fine" },
  { below: 1.1, verdict: "fixable", rescue: "batter-scale-all" },
  { below: Infinity, verdict: "redo" },
];

/** The research marks these cut-points provisional (or they rest on fewer than two sources). */
const prov = (bands: Band[]): Band[] => bands.map((b) => ({ ...b, provisional: true }));

export const ROLES: Role[] = [
  // ------------------------------------------------------------------------------------------------------------
  {
    id: "liquid-water-stock",
    name: "Cooking liquid (water, stock, broth)",
    does: "Sauce: body and dilution. Braise: carries the heat and becomes the sauce. Grains: absorbed by the starch. Baking and pastry: hydrates the flour and sets the dough or batter. Soups: the base.",
    tight: true, // research: true for baking, pastry and grains (absorption); false for sauce, braise, soup
    bands: {
      default: [...LIQUID_SAUCE],
      sauce: [...LIQUID_SAUCE],
      braise: [
        { below: 0.6, verdict: "fixable", rescue: "add-back-liquid" }, // unless scorched → redo
        { below: 0.8, verdict: "fixable", rescue: "add-back-liquid" },
        { below: 1.5, verdict: "fine" },
        { below: 2.5, verdict: "fixable", rescue: "braise-uncovered-reduce" },
        { below: Infinity, verdict: "fixable", rescue: "remove-solids-reduce" }, // only with headroom, else redo
      ],
      // Absorption rice (rice, pilaf). Scorched / burnt smell → redo (a state; see NOT ENCODED 4).
      // Not encoded (sub-kind): jollof / flavoured rice ≥1.35 → redo-texture (provisional; mushy, burst grains —
      // `rice-uncover-steam-off` offered only as damage limitation).
      grains: [
        { below: 0.6, verdict: "fixable", rescue: "rice-add-hot-water" },
        { below: 0.9, verdict: "fixable", rescue: "rice-add-hot-water" },
        { below: 1.1, verdict: "fine" },
        { below: 1.35, verdict: "fixable", rescue: "rice-uncover-steam-off" },
        { below: 2.0, verdict: "fixable", rescue: "rice-drain-pasta-method" }, // plain long-grain only
        { below: Infinity, verdict: "redo" },
      ],
      // Research kind "fried rice" (stock or sauce splashed into cooked rice) mapped to saute. Numeric thresholds
      // provisional (research).
      saute: prov([
        { below: 1.25, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "stir-fry-dry-out" },
        { below: Infinity, verdict: "redo" }, // rice turns pasty
      ]),
      baking: prov(LIQUID_CAKE_BATTER),
      pastry: [
        { below: 0.8, verdict: "redo" }, // not covered by the research → redo
        { below: 1.0, verdict: "fixable", rescue: "pastry-add-water-spoon" },
        { below: 1.1, verdict: "fine" },
        { below: Infinity, verdict: "redo" }, // sticky, tough pastry; extra flour toughens it further
      ],
    },
    rescues: [
      {
        id: "add-back-liquid", kind: "add", add: { role: "liquid-water-stock" },
        when: "only if nothing has scorched — add it hot, a third at a time",
        say: "Add the rest of the liquid now, hot, a little at a time.",
        sources: [M11, SFAT_HEAT, SGC, FL_BRAISE, CI_BRAISE],
      },
      {
        id: "reduce-uncovered", kind: "none",
        when: "only while the excess is no more than double the recipe's, and never at a hard boil for a dairy-heavy sauce",
        say: "Lid off, let it simmer down to what the recipe wants, and season only at the end.",
        sources: [M11, SFAT_SALT, SFAT_HEAT, SGC],
      },
      {
        id: "thicken-starch", kind: "add",
        // 1 tbsp cornstarch per cup of excess liquid = 1/16 by volume of the excess.
        add: { role: "starch-thickener", per: 1 / 16, amount: "1 tbsp cornstarch slurried in 2 tbsp cold water per cup (240 ml) of extra liquid, or 2 tbsp flour per cup as beurre manié" },
        when: "not for baking; simmer one minute once it thickens, then don't keep boiling it",
        say: "Whisk a spoon of cornstarch into cold water, stir it in and let it bubble for a minute.",
        sources: [M11, ATK_CS],
      },
      {
        id: "taste-rebalance", kind: "none",
        when: "after a long reduction",
        say: "Taste before you add salt — it will have concentrated.",
        sources: [M11, SFAT_SALT, SFAT_HEAT],
      },
      {
        id: "braise-uncovered-reduce", kind: "none",
        when: "for the last 30–45 minutes, until the liquid sits a third to half way up the meat",
        say: "Leave the lid off for the last half hour so it reduces.",
        sources: [FL_BRAISE, CI_BRAISE, M3],
      },
      {
        id: "remove-solids-reduce", kind: "none",
        when: "only if the pot still has headroom",
        say: "Lift the meat out, boil the liquid down to the recipe's amount, then put the meat back.",
        sources: [FL_BRAISE, CI_BRAISE, M3],
      },
      {
        id: "rice-add-hot-water", kind: "add",
        add: { role: "liquid-water-stock", amount: "2–4 tbsp (30–60 ml) boiling water per cup of dry rice" },
        when: "only before the pot is dry and if the bottom hasn't scorched; lid on, lowest heat, 5–10 minutes",
        say: "Sprinkle in a few spoons of boiling water, lid on, lowest heat, ten more minutes.",
        sources: [M9, CI_RICE, SE_RICE],
      },
      {
        id: "rice-uncover-steam-off", kind: "none",
        when: "lid off on the lowest heat 5–10 minutes, then off the heat with a towel under the lid for 10",
        say: "Take the lid off on the lowest heat for a few minutes to steam off the extra water.",
        sources: [M9, CI_RICE, SE_RICE],
      },
      {
        id: "rice-drain-pasta-method", kind: "none",
        when: "plain long-grain rice only",
        say: "Treat it like pasta — boil it till tender, drain it, then let it steam dry under the lid.",
        sources: [M9, CI_RICE, SE_RICE],
      },
      {
        id: "stir-fry-dry-out", kind: "none",
        say: "Spread it out over high heat and keep tossing until the steam stops.",
        sources: [FL_FRIED_RICE, SE_FRIED_RICE, CI_FRIED_RICE],
      },
      {
        id: "dough-add-flour-proportional", kind: "add",
        add: { role: "wheat-flour", amount: "extra water ÷ hydration in grams of flour (at 65 % hydration, 10 g extra water → about 15 g flour), plus salt at 2 % of the added flour" },
        when: "before the end of bulk rise, and only while the water is under 1.2× the recipe's",
        say: "Work in about one and a half times the extra water in flour, with a pinch of salt.",
        sources: [KA_BP, M10, MODERNIST_BREAD, MC],
      },
      {
        id: "dough-add-liquid", kind: "add", add: { role: "liquid-water-stock" },
        when: "a tablespoon at a time while kneading, before shaping",
        say: "Knead in the rest of the water a spoonful at a time.",
        sources: [KA_BP, M10, MODERNIST_BREAD, MC],
      },
      {
        id: "batter-scale-all", kind: "scale",
        when: "only before the flour is mixed in — re-mixing after develops gluten",
        say: "Before the flour goes in, scale up the rest of the recipe to match.",
        sources: [M10, SGC],
        provisional: true,
      },
      {
        id: "batter-add-liquid", kind: "add", add: { role: "liquid-water-stock" },
        when: "before it bakes; fold gently",
        say: "Fold in the rest of the liquid gently, just until it comes together.",
        sources: [M10, SGC],
        provisional: true,
      },
      {
        id: "batter-add-flour-proportional", kind: "add",
        add: { role: "wheat-flour", per: 0.5, amount: "about 1 tbsp flour per 2 tbsp extra liquid, then rest 5 minutes" },
        when: "pancake batter",
        say: "Whisk in a spoon of flour for every two spoons of extra liquid, then let it rest.",
        sources: [SGC],
        provisional: true,
      },
      {
        id: "pastry-add-water-spoon", kind: "add",
        add: { role: "liquid-water-stock", amount: "1 tsp ice water at a time" },
        when: "until it holds together when pinched",
        say: "Add ice water a teaspoon at a time until it holds when you pinch it.",
        sources: [M10, SGC],
      },
    ],
    substitutions: [
      { use: "stock in place of water", ratio: 1, effect: "More savoury and saltier — cut the added salt by about a third and taste at the end. Fine 1:1 in rice. Not in bread dough: its salt and fat change the rise.", sources: [SFAT_SALT, CI_BRAISE, M11] },
      { use: "water in place of stock", ratio: 1, effect: "Flatter flavour — add bouillon per its label, or more salt and aromatics.", sources: [SFAT_SALT, CI_BRAISE, M11] },
      { use: "wine in place of stock in a braise (up to half the liquid)", ratio: 1, effect: "Reduce the wine by half first, or it tastes of raw alcohol.", sources: [SFAT_SALT, CI_BRAISE, M11] },
      { use: "milk in place of water in pancake batter", ratio: 1, effect: "Richer; browns faster.", sources: [SFAT_SALT, CI_BRAISE, M11] },
    ],
    changes: [
      { direction: "less", upTo: 0.8, effect: "Sauce, braise or soup: thicker and saltier; below this it needs add-back-liquid.", sources: [M11, SFAT_HEAT, SGC, FL_BRAISE, CI_BRAISE] },
      { direction: "more", upTo: 1.25, effect: "Sauce, braise or soup: thinner; season at the end.", sources: [M11, SFAT_HEAT, SGC, FL_BRAISE, CI_BRAISE] },
      { direction: "less", upTo: 0.95, effect: "Grains, baking, pastry: only ±5 %; beyond that the texture changes.", sources: [M9, CI_RICE, M10, KA_BP] },
      { direction: "more", upTo: 1.05, effect: "Grains, baking, pastry: only ±5 %; beyond that the texture changes.", sources: [M9, CI_RICE, M10, KA_BP] },
    ],
    shows: "Too much: a soupy sauce that won't coat a spoon; braising liquid covering the meat; rice sitting in standing water with swollen, burst grains; slack dough spreading flat and sticking to hands; runny batter. Too little: the pan going dry, sizzling instead of simmering, browning or sticking at the base, smoke; rice with hard white cores and a crackling sound; shaggy dough that won't come together.",
    sources: [M11, M9, M10, M3, SFAT_SALT, SFAT_HEAT, SGC, ATK_CS, FL_BRAISE, CI_BRAISE, CI_RICE, SE_RICE, KA_BP, MC],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "liquid-coconut-milk",
    name: "Coconut milk / coconut cream",
    does: "Curries, stews, rice and peas: body, fat and sweetness. Coconut rice: absorbed by the grain. Baking: fat and liquid.",
    tight: true, // research: false for sauce/braise; true for grains and baking
    bands: {
      // Sauce / braise. Below 0.5 is not covered by the research → redo. Provisional above 1.4 (rescues flagged).
      default: [
        { below: 0.5, verdict: "redo" },
        { below: 0.8, verdict: "fixable", rescue: "add-back-liquid" },
        { below: 1.4, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "reduce-uncovered", provisional: true }, // then taste-rebalance
        { below: Infinity, verdict: "fixable", rescue: "scale-other-components", provisional: true }, // else redo
      ],
      sauce: [
        { below: 0.5, verdict: "redo" },
        { below: 0.8, verdict: "fixable", rescue: "add-back-liquid" },
        { below: 1.4, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "reduce-uncovered", provisional: true },
        { below: Infinity, verdict: "fixable", rescue: "scale-other-components", provisional: true },
      ],
      braise: [
        { below: 0.5, verdict: "redo" },
        { below: 0.8, verdict: "fixable", rescue: "add-back-liquid" },
        { below: 1.4, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "reduce-uncovered", provisional: true },
        { below: Infinity, verdict: "fixable", rescue: "scale-other-components", provisional: true },
      ],
      // Coconut rice: the water/stock grains bands, but it scorches faster (too little fixable only if not catching),
      // and as a flavoured rice its over-liquid ≥1.35 is the research's redo-texture, not the plain-rice drain.
      grains: [
        { below: 0.6, verdict: "fixable", rescue: "rice-add-hot-water" },
        { below: 0.9, verdict: "fixable", rescue: "rice-add-hot-water" },
        { below: 1.1, verdict: "fine" },
        { below: 1.35, verdict: "fixable", rescue: "rice-uncover-steam-off" },
        { below: Infinity, verdict: "redo" },
      ],
      baking: prov(LIQUID_CAKE_BATTER), // research: same as the cake batter bands
    },
    rescues: [
      {
        id: "add-back-liquid", kind: "add", add: { role: "liquid-coconut-milk" },
        when: "with more coconut milk, or stock",
        say: "Stir in a little more coconut milk, or some stock, to loosen it.",
        sources: [M11, SE_COCONUT],
      },
      {
        id: "reduce-uncovered", kind: "none",
        when: "a gentle simmer, not a hard boil; then taste for salt, acid and spice",
        say: "Let it simmer gently with the lid off to thicken.",
        sources: [M11, SGC],
        provisional: true, // research: provisional above 1.4
      },
      {
        id: "taste-rebalance", kind: "none",
        when: "after reducing",
        say: "Taste it now and add a little salt, acid or spice to balance it.",
        sources: [M11, SGC],
        provisional: true, // research: provisional above 1.4
      },
      {
        id: "scale-other-components", kind: "scale",
        say: "Add a bit more paste, seasoning and protein so it isn't bland.",
        sources: [M11, SE_COCONUT],
        provisional: true,
      },
      {
        // A state, not a ratio: a creamy sauce that cracked when it wasn't meant to (in Thai curries cracking the
        // cream is intentional). See NOT ENCODED 4.
        id: "coconut-rebind", kind: "add",
        add: { role: "starch-thickener", amount: "1 tsp cornstarch per cup of sauce, slurried" },
        when: "off the boil, and only where the split wasn't intended",
        say: "Take it off the boil and whisk in a little cornstarch slurry to bring it back together.",
        sources: [M11, SE_COCONUT],
        provisional: true,
      },
      {
        id: "rice-add-hot-water", kind: "add",
        add: { role: "liquid-water-stock", amount: "2–4 tbsp (30–60 ml) boiling water per cup of dry rice" },
        when: "only if the bottom isn't catching; lid on, lowest heat, 5–10 minutes",
        say: "Sprinkle in a few spoons of boiling water, lid on, lowest heat, ten more minutes.",
        sources: [M9, CI_RICE, SE_RICE],
      },
      {
        id: "rice-uncover-steam-off", kind: "none",
        when: "lid off on the lowest heat 5–10 minutes, then off the heat with a towel under the lid for 10",
        say: "Take the lid off on the lowest heat for a few minutes to steam off the extra liquid.",
        sources: [M9, CI_RICE, SE_RICE],
      },
      {
        id: "batter-add-liquid", kind: "add", add: { role: "liquid-coconut-milk" },
        when: "before it bakes; fold gently",
        say: "Fold in the rest of the coconut milk gently, just until it comes together.",
        sources: [M10, SGC],
        provisional: true,
      },
      {
        id: "batter-scale-all", kind: "scale",
        when: "only before the flour is mixed in",
        say: "Before the flour goes in, scale up the rest of the recipe to match.",
        sources: [M10, SGC],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "light coconut milk in place of full-fat", ratio: 1, effect: "Thinner and less rich; may need reducing.", sources: [M11, CI_SUBS] },
      { use: "coconut cream thinned with an equal amount of water, in place of coconut milk", ratio: 0.5, effect: "Half cream, half water is about coconut milk.", sources: [M11, CI_SUBS] },
      { use: "heavy cream in place of coconut milk in a curry", ratio: 1, effect: "Loses the coconut flavour and the sweetness.", sources: [M11, CI_SUBS] },
      { use: "evaporated milk in place of coconut milk", ratio: 1, effect: "A dairy stand-in.", sources: [CI_SUBS], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.8, effect: "More intense, less creamy.", sources: [M11, SE_COCONUT] },
      { direction: "more", upTo: 1.4, effect: "Milder, sweeter, thinner.", sources: [M11, SE_COCONUT] },
    ],
    shows: "Too much: a pale, thin, milky curry with the spice dulled. Too little: the paste frying and catching, thick and oily. Split: oil pooling on top, grainy flecks.",
    sources: [M11, M9, SE_COCONUT, SGC, CI_SUBS],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "aromatic-garlic",
    name: "Garlic (fresh)",
    does: "Sautés, sauces, braises and roasts: a flavour base. Dressings and raw uses: pungency.",
    tight: true, // research: false cooked; true raw (aioli, dressings, salsa)
    bands: {
      // Cooked (saute / sauce / braise / roast). Burnt garlic is a state → redo the step (`garlic-restart`).
      default: prov([
        { below: 1.75, verdict: "fine" }, // too little is fine — milder; more can go in late
        { below: 3.0, verdict: "fixable", rescue: "dilute-scale" }, // or cook-gently-longer if not yet browned
        { below: Infinity, verdict: "fixable", rescue: "dilute-scale" }, // provisional, else redo
      ]),
      // Raw (dressing, aioli, salsa) mapped to "other". Below 0.5 is not covered by the research → redo.
      other: prov([
        { below: 0.5, verdict: "redo" },
        { below: 1.25, verdict: "fine" },
        { below: 2.0, verdict: "fixable", rescue: "dilute-scale" },
        { below: Infinity, verdict: "redo" }, // raw garlic is harsh and can't be cooked out of a cold dish
      ]),
    },
    rescues: [
      {
        id: "dilute-scale", kind: "scale",
        say: "That's a lot of garlic — bulk up the rest of the dish a little to balance it.",
        sources: [M6],
        provisional: true,
      },
      {
        id: "cook-gently-longer", kind: "none",
        when: "only if the garlic hasn't browned yet",
        say: "Keep it on low a few more minutes; it'll mellow.",
        sources: [M6],
        provisional: true,
      },
      {
        // Step-level redo for burnt garlic (a state; NOT ENCODED 2 and 4).
        id: "garlic-restart", kind: "none",
        when: "the garlic is dark brown or black and smells acrid",
        say: "That garlic's burnt and will taste bitter — tip it out with its oil, wipe the pan and start it again.",
        sources: [SFAT_HEAT, FOODLAB, SGC],
      },
    ],
    substitutions: [
      { use: "garlic powder, ⅛ tsp per clove", ratio: 0.125, effect: "Flatter, with no browning stage; add it with the liquid, not to hot oil.", sources: [CI_SUBS], provisional: true },
      { use: "granulated garlic, ¼ tsp per clove", ratio: 0.25, effect: "Flatter, with no browning stage.", sources: [CI_SUBS], provisional: true },
      { use: "jarred minced garlic, ½ tsp per clove", ratio: 0.5, effect: "Weaker and slightly sour.", sources: [CI_SUBS], provisional: true },
      // Shallot or more onion for a milder base: the research gives no ratio, so not encoded.
    ],
    changes: [
      { direction: "less", upTo: 0, effect: "Always safe in a cooked dish — just milder.", sources: [M6], provisional: true },
      { direction: "more", upTo: 1.75, effect: "In a cooked dish, a matter of taste up to here.", sources: [M6], provisional: true },
    ],
    shows: "Burnt: black or dark-brown specks, acrid blue smoke, the pan smoking. Too much raw: visible heaps of mince. Golden-edged pale pieces are fine.",
    sources: [SFAT_HEAT, FOODLAB, SGC, M6, CI_SUBS],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "aromatic-onion",
    name: "Onion family (onion, shallot, leek, spring onion)",
    does: "Sautés, braises and sauces: a sweet, savoury base. Raw in salads and salsa: sharpness.",
    tight: false,
    bands: {
      // Cooked. Ratio thresholds provisional (research). Burnt onion is a state: a few dark edges fine (pick out);
      // more than a few black pieces → redo the step.
      default: prov([
        { below: 0.5, verdict: "fixable", rescue: "add-more-onion" }, // early, before the liquid; else fine
        { below: 2.0, verdict: "fine" },
        { below: 3.0, verdict: "fixable", rescue: "cook-down-longer" },
        { below: Infinity, verdict: "redo" }, // provisional redo-to-taste
      ]),
      // Raw mapped to "other". Below 0.5 is not covered by the research → redo.
      other: prov([
        { below: 0.5, verdict: "redo" },
        { below: 1.5, verdict: "fine" },
        { below: 2.5, verdict: "fixable", rescue: "soak-raw-onion" }, // or dilute-scale
        { below: Infinity, verdict: "redo" },
      ]),
    },
    rescues: [
      {
        id: "cook-down-longer", kind: "none",
        when: "lower the heat; a pinch of salt draws the water out",
        say: "That's plenty of onion — give it a few extra minutes so it softens down.",
        sources: [M6, SFAT_HEAT],
      },
      {
        // The research names no source for this rescue → provisional.
        id: "add-more-onion", kind: "add", add: { role: "aromatic-onion" },
        when: "before the liquid goes in",
        say: "Add a bit more onion now, before the liquid.",
        sources: [],
        provisional: true,
      },
      {
        id: "soak-raw-onion", kind: "none",
        when: "sliced raw onion, 10 minutes in cold water",
        say: "Rinse the onion in cold water to soften its bite.",
        sources: [M6, SE_ONION],
      },
      {
        id: "dilute-scale", kind: "scale",
        say: "That's a lot of onion — bulk up the rest of the dish a little to balance it.",
        sources: [M6],
        provisional: true,
      },
    ],
    substitutions: [
      // The research names no source for the shallot and leek swaps → provisional.
      { use: "shallot in place of onion", ratio: 1, effect: "Milder and sweeter (by volume).", sources: [], provisional: true },
      { use: "leek in place of onion", ratio: 1, effect: "Milder; wash out the grit.", sources: [], provisional: true },
      { use: "onion powder, 1 tsp per medium onion", ratio: 1, effect: "No texture or sweetness.", sources: [], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0.5, effect: "A lighter, less sweet base.", sources: [M6, SFAT_HEAT], provisional: true },
      { direction: "more", upTo: 2.0, effect: "Sweeter and softer; a longer sweat.", sources: [M6, SFAT_HEAT], provisional: true },
    ],
    shows: "Too hot: edges black before the centre softens. Too cold: pale and steaming, not sizzling. Burnt: black pieces, bitter smoke.",
    sources: [M6, SFAT_HEAT, SE_ONION],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "aromatic-ginger",
    name: "Ginger (fresh)",
    does: "Stir-fries, curries, sauces and braises: warm pungency. Baking: spice.",
    tight: true, // research: false cooked; true in baking
    bands: {
      // Cooked. Burnt ginger is a state → redo the step (`garlic-restart`, the research's pattern).
      default: prov([
        { below: 1.5, verdict: "fine" }, // too little is fine
        { below: 2.5, verdict: "fixable", rescue: "dilute-scale" }, // or round it with sweetness / coconut milk (provisional)
        { below: Infinity, verdict: "redo" }, // pungency persists, can read as burning
      ]),
      baking: prov([
        { below: 0.75, verdict: "redo" },
        { below: 1.25, verdict: "fine" },
        { below: Infinity, verdict: "redo" },
      ]),
    },
    rescues: [
      {
        id: "dilute-scale", kind: "scale",
        say: "That's a lot of ginger — bulk up the rest of the dish a little to balance it.",
        sources: [M8],
        provisional: true,
      },
      {
        id: "garlic-restart", kind: "none",
        when: "the ginger is dark and bitter",
        say: "The ginger's burnt — tip it out and start that step again.",
        sources: [M8],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "ground ginger, ¼ tsp per 1 tbsp fresh grated", ratio: 0.25, effect: "Different — earthier, less bright. Galangal is not a 1:1 swap (piney, sharper).", sources: [M8], provisional: true },
    ],
    changes: [
      { direction: "less", upTo: 0, effect: "Milder.", sources: [M8], provisional: true },
      { direction: "more", upTo: 1.5, effect: "Hotter and sharper.", sources: [M8], provisional: true },
    ],
    shows: "Fibrous strands; burnt dark bits; the cook says it's too spicy or hot.",
    sources: [M8],
    provisional: true, // research: a second source not confirmed for any ginger rule
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "protein-chicken",
    name: "Chicken (breasts, thighs, tenders, wings, drumsticks; whole or pieces)",
    does: "Sautés, roasts, braises, grills and fries. USDA minimum: 165 °F in the thickest part, not touching bone, for all poultry including ground.",
    tight: true, // research: true for undercooking (safety), false for overcooking (quality)
    // Ratio = actual cook time ÷ recipe time. Time thresholds are this pack's synthesis (provisional); the verdicts
    // have ≥ 2 sources. A reported pink / raw / translucent centre is fixable (`back-in-and-probe`) whatever the time,
    // and "fine" on time alone is never proof — the coach still prompts the probe (NOT ENCODED 4, 6). Charred → redo.
    bands: {
      // Breasts / tenders — the stricter set. Not encoded (sub-kind) thighs / drumsticks / wings: <0.9 back-in;
      // [0.9,1.5) fine; [1.5,2.0) fixable (sauce); ≥2.0 fixable (shred into sauce) unless charred → redo.
      default: prov([
        { below: 0.9, verdict: "fixable", rescue: "back-in-and-probe" },
        { below: 1.15, verdict: "fine" },
        { below: 1.5, verdict: "fixable", rescue: "rescue-overcooked-slice-sauce" },
        { below: Infinity, verdict: "fixable", rescue: "rescue-overcooked-slice-sauce" }, // shred into sauce, soup, salad
      ]),
      // Breasts in a braise — stricter than thighs (thighs fine [0.9,1.75)).
      braise: prov([
        { below: 0.9, verdict: "fixable", rescue: "back-in-and-probe" },
        { below: 1.3, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "rescue-overcooked-slice-sauce" }, // shred into the sauce
      ]),
    },
    rescues: [
      {
        id: "back-in-and-probe", kind: "none",
        when: "back at the recipe heat: pieces 3–5 minutes, whole birds 10–15; raw slices in the pan with a splash of liquid, lid on, 2–4 minutes; repeat until it reads 165 °F; wash hands and boards that touched raw juices",
        say: "It needs a little longer — put it back for a few minutes, then check the thickest part with a thermometer for 165.",
        sources: [FSIS_T, UNL, FL_CHICKEN],
      },
      {
        id: "rescue-overcooked-slice-sauce", kind: "none",
        say: "It's gone a bit far — slice it thin across the grain, serve it with plenty of sauce, and check the thickest part with a thermometer.",
        sources: [SFAT_HEAT, M3],
      },
    ],
    substitutions: [
      { use: "thighs in place of breasts (by weight)", ratio: 1, effect: "More forgiving and richer; cook to a higher temperature for texture.", sources: [FL_CHICKEN, CI_CHICKEN] },
      { use: "breasts in place of thighs (by weight)", ratio: 1, effect: "Shorter cook time; they dry out sooner.", sources: [FL_CHICKEN, CI_CHICKEN] },
      { use: "tenders in place of breasts", ratio: 1, effect: "About half the cooking time.", sources: [FL_CHICKEN, CI_CHICKEN], provisional: true },
    ],
    // Doneness targets (quality, all above the USDA minimum) are temperatures, not amounts, so not a `change`:
    // dark meat eats best at 175–195 °F; breasts are juiciest pulled close to 165 °F and dry past ~170 °F; carryover
    // adds a few degrees during a rest. USDA's 165 °F is the only number the coach gives.
    changes: [],
    shows: "Undercooked: a pink, glossy, translucent centre; rubbery; pink juices; a joint that doesn't move freely (none of it proof either way). Overcooked breast: stringy, dry, pale-white fibres, shrunken. Burnt: black crust, smoke.",
    sources: [FSIS_T, FSG, CCE, UNL, FL_CHICKEN, CI_CHICKEN, M3, SFAT_HEAT, SGC],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "protein-ground-meat",
    name: "Ground meat and meatballs (beef, pork, lamb, turkey, chicken; burgers, meatballs, meatloaf, mince)",
    does: "Browned mince, baked or pan meatballs and meatloaf, meatballs braised in sauce, burgers. USDA minimum: 160 °F for ground beef, pork, lamb and veal; 165 °F for ground turkey and chicken — grinding spreads surface bacteria through the meat.",
    tight: true,
    // Ratio = actual cook time ÷ recipe time; thresholds provisional (research). A reported pink / raw centre is
    // fixable whatever the time; colour can brown before it's safe and stay pink after — always probe. Charred → redo.
    bands: {
      // Baked / pan meatballs and burgers (the default and roast).
      default: prov([
        { below: 0.9, verdict: "fixable", rescue: "back-in-and-probe-ground" },
        { below: 1.25, verdict: "fine" },
        { below: 1.75, verdict: "fixable", rescue: "rescue-overcooked-in-sauce" },
        { below: Infinity, verdict: "fixable", rescue: "rescue-overcooked-in-sauce" }, // crumble into sauce / chilli
      ]),
      roast: prov([
        { below: 0.9, verdict: "fixable", rescue: "back-in-and-probe-ground" },
        { below: 1.25, verdict: "fine" },
        { below: 1.75, verdict: "fixable", rescue: "rescue-overcooked-in-sauce" },
        { below: Infinity, verdict: "fixable", rescue: "rescue-overcooked-in-sauce" },
      ]),
      // Meatballs in sauce — very forgiving once cooked through.
      braise: prov([
        { below: 0.9, verdict: "fixable", rescue: "back-in-and-probe-ground" },
        { below: 2.0, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "rescue-overcooked-in-sauce" }, // they firm up; keep in sauce
      ]),
      // Browned mince. Still pink in places → keep cooking and breaking it up, then probe. Burnt → redo.
      saute: prov([
        { below: 0.9, verdict: "fixable", rescue: "back-in-and-probe-ground" },
        { below: 1.5, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "rescue-overcooked-in-sauce" }, // add liquid or sauce
      ]),
    },
    rescues: [
      {
        id: "back-in-and-probe-ground", kind: "none",
        when: "meatballs or patties back in the pan or oven 3–5 minutes (or simmered in the sauce 8–10); mince kept cooking and broken up until no raw-looking bits remain",
        say: "Give them a few more minutes, then check the middle of the biggest one with a thermometer — 160 for beef, pork or lamb, 165 for chicken or turkey.",
        sources: [FSIS_T, FSG, UNL],
      },
      {
        id: "rescue-overcooked-in-sauce", kind: "none",
        when: "simmer in a sauce or gravy about 5 minutes; crumble overcooked burgers into a sauce",
        say: "They're a bit firm — let them sit in the sauce a few minutes, and check one in the middle with a thermometer.",
        sources: [FL_GROUND, SGC],
      },
    ],
    substitutions: [
      { use: "ground turkey or chicken in place of beef", ratio: 1, effect: "Leaner; may need a little oil; needs 165 °F, not 160.", sources: [FSIS_T, CI_SUBS] },
      { use: "ground pork for part of the beef", ratio: 1, effect: "Juicier.", sources: [CI_SUBS], provisional: true },
      // Plant-based mince: per its pack instructions; no ratio given, so not encoded.
    ],
    // Leaner mince dries faster when overcooked (a narrower overcook band; provisional) — no numbers, not encoded.
    changes: [],
    shows: "Undercooked: a pink or red centre, raw-looking strands in mince, a soft squishy centre — though colour can brown before it's safe and stay pink after, which is why the coach probes. Overcooked: dry, crumbly, shrunken, cracked. Burnt: black crust.",
    sources: [FSIS_T, FSG, UNL, M3, FL_GROUND, SGC, CI_SUBS],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "protein-whole-cut",
    name: "Whole-muscle beef, pork, lamb, veal (steaks, chops, roasts)",
    does: "Sautés, roasts and braises. USDA minimum: 145 °F plus a 3-minute rest for whole cuts. Braising cuts (chuck, shoulder, short rib) are cooked far past this, to about 195–205 °F, for tenderness — quality, not safety.",
    tight: true, // research: true for undercooking pork; false for beef doneness preference
    // Ratio = actual cook time ÷ recipe time. The research gives no numeric cut-offs here, only "undercooked vs
    // recipe" (below 1); overcooked steak or chop is reported as a state → `rescue-overcooked-slice-sauce`
    // (NOT ENCODED 4). Braise ratio ≥2.0 with the liquid gone → check for scorching → redo if burnt (a state).
    bands: {
      default: [
        { below: 1, verdict: "fixable", rescue: "back-in-and-probe" },
        { below: Infinity, verdict: "fine" },
      ],
      // Undercooked braises are tough, not overcooked: tough after the recipe's time needs longer.
      braise: [
        { below: 1, verdict: "fixable", rescue: "braise-longer" },
        { below: Infinity, verdict: "fine" },
      ],
    },
    rescues: [
      {
        id: "back-in-and-probe", kind: "none",
        when: "back at the recipe heat, then rest 3 minutes",
        say: "Give it a few more minutes and a three-minute rest, then check the centre with a thermometer for 145.",
        sources: [FSIS_T, FSG, CCE],
      },
      {
        id: "braise-longer", kind: "none",
        when: "lid on, about 30 minutes more, then test with a fork",
        say: "If it's still tough it needs more time, not less — lid on another half hour, try a fork, and check it with a thermometer.",
        sources: [M3, FL_BRAISE, SGC],
      },
      {
        id: "rescue-overcooked-slice-sauce", kind: "none",
        say: "It's gone a bit far — slice it thin across the grain, serve it with sauce, and check the centre with a thermometer.",
        sources: [SFAT_HEAT, M3],
      },
    ],
    substitutions: [],
    changes: [],
    shows: "A braise that is still tough and resists a fork after the recipe's time needs longer; an overcooked steak or chop is dry and firm.",
    sources: [FSIS_T, FSG, CCE, M3, FL_BRAISE, SGC, SFAT_HEAT],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    // Research id "frying-oil", renamed: another group defines the oil itself as "oil-frying".
    id: "heat-frying",
    name: "Frying oil temperature and load (deep-fry, shallow-fry, pan-fry breaded items)",
    does: "Deep and shallow frying: the oil's temperature decides between crisp and greasy, and between browned outside and raw inside.",
    tight: true,
    // Ratio = actual ÷ recipe oil temperature in °F (at a recipe 350 °F: <0.86 ≈ below 300; [0.86,0.93) ≈ 300–325;
    // [0.93,1.07) ≈ 325–375; [1.07,1.15) ≈ 375–400; ≥1.15 > 400). The research's kinds are "other (frying)" and
    // "saute (shallow frying)" — the research kind "frying" is mapped to default. Cut-offs provisional at ±1 band
    // (this pack's mapping of the sources' 325–375 °F range). Load, breading and air-frying are NOT ENCODED 4, 5.
    bands: {
      default: prov([
        { below: 0.86, verdict: "fixable", rescue: "fry-wait-recover" }, // the food is soaking up oil
        { below: 0.93, verdict: "fixable", rescue: "fry-wait-recover" }, // raise the heat, fewer pieces
        { below: 1.07, verdict: "fine" },
        { below: 1.15, verdict: "fixable", rescue: "fry-lower-heat" }, // chicken: finish with fry-oven-finish
        { below: Infinity, verdict: "redo", rescue: "fry-smoking-stop" }, // redo the step — safety
      ]),
    },
    rescues: [
      {
        id: "fry-wait-recover", kind: "none",
        when: "unless it's the expected dip just after loading that is already climbing back; refry greasy pieces briefly at the right temperature, drain on a rack",
        say: "The oil's too cool, so it's soaking in — lift them out, let it come back up, and fry fewer at once.",
        sources: [M14, SFAT_FAT, SGC, FL_BATTERS, FSIS_F],
      },
      {
        id: "fry-lower-heat", kind: "none",
        say: "The oil's too hot — turn it down and wait a minute before the next batch.",
        sources: [M14, SFAT_FAT, SGC, FL_BATTERS],
      },
      {
        id: "fry-oven-finish", kind: "none",
        when: "fried chicken dark outside with the centre unknown or raw: on a rack over a tray in a 350 °F oven",
        say: "The outside's ahead of the inside — finish them in the oven and check the thickest piece with a thermometer for 165.",
        sources: [FSIS_T, FL_BATTERS, CI_FRYING],
      },
      {
        id: "fry-smoking-stop", kind: "none",
        when: "the oil is above about 400 °F or visibly smoking; if it smells acrid, discard it once cool",
        say: "The oil's smoking — turn the heat off, add nothing, and let it cool before you carry on.",
        sources: [FSIS_F, MSU],
      },
      {
        // Research kind "scale" (load ÷ ratio) means a SMALLER batch; this engine's "scale" makes it bigger → none.
        id: "fry-batch-smaller", kind: "none",
        when: "load over 1.25× the recipe's batch (or more than about two-thirds of the surface covered); at 2× remove half now",
        say: "Fry the rest in smaller batches, with space between them.",
        sources: [FSIS_F, M14, FOODLAB],
      },
      {
        id: "breading-fix", kind: "none",
        when: "breading falling off — for the rest of the batch; bald pieces are cosmetic and fine to eat",
        say: "For the next ones, pat them dry, press the crumbs on and let them sit ten minutes — and don't move them until they've set.",
        sources: [FL_BATTERS, CI_FRYING],
      },
      {
        id: "oil-fire", kind: "none",
        when: "flames — a safety line, not a cooking verdict; call emergency services if it spreads",
        say: "Turn the heat off and slide a metal lid over it — no water, and don't move the pan.",
        sources: [FSIS_F, MSU],
      },
      {
        id: "airfry-shake-spray", kind: "none",
        when: "air fryer: overlapping or stacked pieces, pale or soggy results, loose crumbs blowing off",
        say: "Spread them in one layer, give them a light spray of oil, and shake the basket half-way.",
        sources: [CI_AIRFRY],
        provisional: true,
      },
    ],
    substitutions: [
      { use: "another neutral high-smoke-point oil (canola, peanut, vegetable, rice bran, sunflower)", ratio: 1, effect: "Interchangeable. Extra-virgin olive oil and butter are poor deep-frying choices (lower smoke points). Shallow-fry depth is about half the food's thickness.", sources: [FSIS_F, M14] },
    ],
    changes: [
      { direction: "less", upTo: 0.93, effect: "A little cooler (about 325 °F) for thick bone-in pieces that need time to cook through.", sources: [M14, SFAT_FAT, SGC, FL_BATTERS], provisional: true },
      { direction: "more", upTo: 1.07, effect: "Hotter (about 375 °F) for thin, quick items.", sources: [M14, SFAT_FAT, SGC, FL_BATTERS], provisional: true },
    ],
    shows: "Too cold: pale, greasy, sodden; few bubbles; food sinks and sits. Too hot: wisps of smoke, darkening in seconds, an acrid smell. Overcrowded: the temperature crashes, pieces stick together and steam. Breading falling off: bare patches, crumbs floating. Spent oil: dark, foamy, smells off. Air fryer: pale, steamed, soggy pieces; uneven browning; loose dry crumbs in the basket.",
    sources: [M14, SFAT_FAT, SGC, FL_BATTERS, FSIS_F, MSU, FSIS_T, CI_FRYING],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "heat-pan",
    name: "Pan heat (stovetop) — too hot or too cold",
    does: "Searing, browning, sautéing, stir-frying, eggs and sauces: a hot, dry pan browns; a cold or crowded one steams.",
    tight: false, // research: mostly recoverable, except burnt fond / burnt fat
    // The research gives states, not ratios (NOT ENCODED 4): cold pan → `pan-reheat`; fat shimmering → fine; fat
    // smoking lightly → `pan-off-heat-cool`; heavy smoke / acrid / black fond → redo the step (`pan-restart`; never
    // deglaze black fond); burnt spots → trim, fully black → redo; scorched sauce → `scorch-transfer` if it doesn't
    // taste burnt, else redo. No ratio is covered, so by the research's convention the ratio band is redo.
    bands: {
      default: [{ below: Infinity, verdict: "redo" }],
    },
    rescues: [
      {
        id: "pan-reheat", kind: "none",
        when: "food went into a cold pan: no sizzle, grey and steaming, sticking; pat wet food dry",
        say: "Take it out, let the pan get properly hot, then put it back in one layer.",
        sources: [M14, M3, SFAT_HEAT, FOODLAB],
      },
      {
        id: "pan-off-heat-cool", kind: "none",
        when: "the fat is smoking lightly; 30–60 seconds off the burner",
        say: "Lift the pan off the heat for a moment and turn it down.",
        sources: [M14, FSIS_F],
      },
      {
        id: "pan-restart", kind: "none",
        when: "heavy smoke, an acrid smell or black fond — discard the fat, wipe or wash the pan",
        say: "That's burnt and will make everything bitter — tip it out, wipe the pan and start this step again.",
        sources: [SGC, FOODLAB, M14, FSIS_F],
      },
      {
        id: "scorch-transfer", kind: "none",
        when: "a sauce scorched on the bottom that doesn't taste burnt",
        say: "Pour it into a clean pot without scraping the bottom, then taste it.",
        sources: [CI, SFAT_HEAT],
        provisional: true,
      },
    ],
    substitutions: [],
    changes: [],
    shows: "Cold: no sizzle, grey meat, water pooling. Hot: wisps of smoke, oil darkening, instant blackening, black flecks in the fond.",
    sources: [M14, M3, SFAT_HEAT, FOODLAB, SGC, FSIS_F],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "heat-oven",
    name: "Oven temperature — too hot or too cold",
    does: "Baking, pastry, roasting: the oven's heat sets the crumb, the rise and the browning.",
    tight: true, // research: true for baking and pastry; false for roast / braise
    // Ratio = actual ÷ recipe temperature in °F (at 350 °F: 0.88 ≈ 40 °F low, [0.95,1.05) ≈ ±15–20 °F, 1.12 ≈ 40 °F
    // hot). Cut-offs provisional (sources give ±°F ranges). Forgot to preheat (provisional) and fan oven are states
    // (NOT ENCODED 4). Pastry has no bands of its own in the research, so it falls to the default (baking) bands.
    bands: {
      default: prov([
        { below: 0.88, verdict: "fixable", rescue: "oven-correct-temp" }, // caught in the first third, else underbaked rules
        { below: 0.95, verdict: "fixable", rescue: "oven-correct-temp" },
        { below: 1.05, verdict: "fine" },
        { below: 1.12, verdict: "fixable", rescue: "oven-correct-temp" }, // tent with foil, check early
        { below: Infinity, verdict: "fixable", rescue: "oven-correct-temp" }, // caught early, + tent; else overbaked rules
      ]),
      baking: prov([
        { below: 0.88, verdict: "fixable", rescue: "oven-correct-temp" },
        { below: 0.95, verdict: "fixable", rescue: "oven-correct-temp" },
        { below: 1.05, verdict: "fine" },
        { below: 1.12, verdict: "fixable", rescue: "oven-correct-temp" },
        { below: Infinity, verdict: "fixable", rescue: "oven-correct-temp" },
      ]),
      // Roast / braise: the protein roles' internal temperatures govern doneness, not the oven's.
      roast: prov([
        { below: 0.85, verdict: "fixable", rescue: "oven-correct-temp" },
        { below: 1.15, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "oven-correct-temp" },
      ]),
      braise: prov([
        { below: 0.85, verdict: "fixable", rescue: "oven-correct-temp" },
        { below: 1.15, verdict: "fine" },
        { below: Infinity, verdict: "fixable", rescue: "oven-correct-temp" },
      ]),
    },
    rescues: [
      {
        id: "oven-correct-temp", kind: "none",
        when: "set the right temperature, check it with an oven thermometer, adjust the time and test early; when it was well off, only if caught early in the bake",
        say: "Set it to the right temperature and start checking a few minutes early.",
        sources: [SGC, MC, CI_EQUIPMENT],
      },
      {
        // The research names no source for tenting on its own → provisional.
        id: "tent-foil", kind: "none",
        when: "browning is running ahead of the centre",
        say: "Lay a sheet of foil loosely over the top so it doesn't brown any further.",
        sources: [],
        provisional: true,
      },
    ],
    substitutions: [],
    changes: [],
    shows: "Too hot: a domed, cracked cake top; a dark crust with a wet centre; burnt cookie bottoms; smoke. Too cold: pale, spread-out cookies; a sunken or dense cake; no oven spring in bread.",
    sources: [SGC, MC, CI_EQUIPMENT, M10, KA_D, KA_GUIDES],
  },

  // ------------------------------------------------------------------------------------------------------------
  {
    id: "heat-time-bake",
    name: "Bake time — underbaked or overbaked (bread, cakes, cookies, quick breads)",
    does: "Baking and pastry: the time in the oven sets the crumb. Doneness tests (not safety claims): yeast bread about 190 °F enriched, 200–210 °F lean, crusty or rye; quick breads about 200–205 °F; cakes — a skewer with a few moist crumbs, a centre that springs back.",
    tight: true,
    // Ratio = actual ÷ recipe bake time. The cake / quick-bread set (stricter) is encoded; whether it's still hot,
    // uncut and unsunk is a state the code must check (NOT ENCODED 4): cut, sunk, collapsed or cooled → redo.
    // Thresholds provisional (0.8 cake back-in; overbake). Fine assumes the doneness test passes.
    // Not encoded (sub-kind) yeast bread: uncut [0.7,0.95) `bread-back-in`, even cooled; <0.7 `bread-back-in`
    // (provisional, may stay dense); already sliced → toast the slices (provisional), the loaf → redo; [1.10,1.30)
    // fine (trim dark crust if wanted). Cookies past golden → fine-to-redo by taste; black bottoms → redo.
    bands: {
      default: [
        { below: 0.8, verdict: "redo", provisional: true },
        { below: 0.95, verdict: "fixable", rescue: "cake-back-in", provisional: true }, // still hot, uncut, not sunk
        { below: 1.1, verdict: "fine", provisional: true },
        { below: 1.3, verdict: "fixable", rescue: "cake-syrup", provisional: true },
        { below: Infinity, verdict: "fixable", rescue: "trim-burnt", provisional: true }, // only a thin burnt crust, else redo
      ],
    },
    rescues: [
      {
        id: "bread-back-in", kind: "none",
        when: "an uncut loaf: back in at the recipe temperature (or about 350 °F), straight on the rack, tented if dark, 5–15 minutes until it sounds hollow",
        say: "Pop it back in, straight on the rack, for about ten minutes, until it reads around 190 to 200 inside.",
        sources: [KA_T, KA_D, M10],
      },
      {
        id: "cake-back-in", kind: "none",
        when: "only while it is still hot, uncut and hasn't sunk; five minutes at a time",
        say: "Straight back in for five minutes, then test the middle with a skewer.",
        sources: [SGC, KA_D],
      },
      {
        // Research kind "add" (simple syrup, 1:1 sugar:water, ~2–3 tbsp per layer). No syrup role exists among the
        // pack's roles, so it is encoded as technique ("none") with the amount in `when`.
        id: "cake-syrup", kind: "none",
        when: "a cake: simple syrup, 1:1 sugar and water, about 2–3 tbsp brushed on each layer",
        say: "Brush the cake with a little sugar syrup to bring back the moisture.",
        sources: [CI],
        provisional: true,
      },
      {
        // The research names no source for trimming on its own → provisional.
        id: "trim-burnt", kind: "none",
        when: "only when the burnt part is a thin crust",
        say: "Cut away the burnt crust with a serrated knife — the inside's fine.",
        sources: [],
        provisional: true,
      },
    ],
    substitutions: [],
    changes: [],
    shows: "Underbaked: a wet sheen, a gummy streak at the bottom, a wobbling centre, a pale crust, sinking when removed, a wet skewer. Overbaked: a dark or black crust, a dry crumbly crumb, pulled-in shrunken edges, a burnt smell.",
    sources: [KA_T, KA_D, KA_QB, M10, SGC, CI],
  },
];

// ---- Index: normalised item name → role ids (keys are already in `normaliseItem` form) ----
const WATER = ["liquid-water-stock"];
const COCONUT = ["liquid-coconut-milk"];
const GARLIC = ["aromatic-garlic"];
const ONION = ["aromatic-onion"];
const GINGER = ["aromatic-ginger"];
const CHICKEN = ["protein-chicken"];
const GROUND = ["protein-ground-meat"];
const WHOLE = ["protein-whole-cut"];
const FRY = ["heat-frying"];
const PAN = ["heat-pan"];
const OVEN = ["heat-oven"];
const BAKE = ["heat-time-bake"];

/*
 * Left out on purpose: wine and beer (the research counts them only "when used as the braising liquid"; indexing
 * them would put a tight liquid role over their acid / flavour role everywhere); "minced beef" / "minced pork"
 * (normalise to plain "beef" / "pork", which would make every cut ground meat); "raw in the middle" (normalises to
 * "in the middle"); ground ginger and garlic powder (different ingredients — substitutions, not this role).
 */
export const INDEX: Record<string, string[]> = {
  // liquid-water-stock
  "water": WATER, "hot water": WATER, "boiling water": WATER, "ice water": WATER, "lukewarm water": WATER,
  "stock": WATER, "broth": WATER, "bouillon": WATER, "bouillon cube": WATER,
  "chicken stock": WATER, "chicken broth": WATER, "chicken bouillon": WATER,
  "beef stock": WATER, "beef broth": WATER, "beef bouillon": WATER,
  "vegetable stock": WATER, "vegetable broth": WATER, "vegetable bouillon": WATER,
  "bone broth": WATER, "chicken bone broth": WATER, "beef bone broth": WATER,
  "fish stock": WATER, "turkey stock": WATER, "turkey broth": WATER,
  "dashi": WATER, "cooking liquid": WATER, "liquid": WATER,
  // liquid-coconut-milk
  "coconut milk": COCONUT, "coconut cream": COCONUT,
  // aromatic-garlic
  "garlic": GARLIC, "garlic clove": GARLIC, "garlic paste": GARLIC,
  // aromatic-onion
  "onion": ONION, "yellow onion": ONION, "white onion": ONION, "red onion": ONION, "brown onion": ONION,
  "sweet onion": ONION, "shallot": ONION, "leek": ONION, "scallion": ONION, "spring onion": ONION,
  "green onion": ONION,
  // aromatic-ginger
  "ginger": GINGER, "ginger root": GINGER, "ginger paste": GINGER,
  // protein-chicken
  "chicken": CHICKEN, "chicken breast": CHICKEN, "chicken thigh": CHICKEN, "bone-in chicken thigh": CHICKEN,
  "skin-on chicken thigh": CHICKEN, "bone-in skin-on chicken thigh": CHICKEN, "chicken tender": CHICKEN,
  "chicken tenderloin": CHICKEN, "chicken strip": CHICKEN, "chicken wing": CHICKEN, "wing": CHICKEN,
  "chicken drumstick": CHICKEN, "drumstick": CHICKEN, "chicken leg": CHICKEN, "whole chicken": CHICKEN,
  "chicken piece": CHICKEN, "chicken cutlet": CHICKEN, "fried chicken": [...CHICKEN, ...FRY],
  // protein-ground-meat (ground chicken also fills protein-chicken, as the research lists it under both)
  "ground beef": GROUND, "lean ground beef": GROUND, "ground pork": GROUND, "ground lamb": GROUND,
  "ground veal": GROUND, "ground turkey": GROUND, "ground chicken": [...GROUND, ...CHICKEN],
  "mince": GROUND, "beef mince": GROUND, "pork mince": GROUND, "lamb mince": GROUND, "turkey mince": GROUND,
  "chicken mince": [...GROUND, ...CHICKEN],
  "meatball": GROUND, "burger": GROUND, "patty": GROUND, "pattie": GROUND, "burger pattie": GROUND,
  "meatloaf": GROUND, "sausage meat": GROUND,
  // protein-whole-cut
  "steak": WHOLE, "pork chop": WHOLE, "pork tenderloin": WHOLE, "roast beef": WHOLE, "lamb chop": WHOLE,
  "leg of lamb": WHOLE, "chuck roast": WHOLE, "beef chuck": WHOLE, "pork shoulder": WHOLE, "lamb shoulder": WHOLE,
  "short rib": WHOLE, "beef short rib": WHOLE, "pork loin": WHOLE, "veal chop": WHOLE,
  // heat-frying (actions and fried dishes, as the research lists them)
  "deep fry": FRY, "deep-fry": FRY, "shallow fry": FRY, "shallow-fry": FRY, "pan fry": FRY, "pan-fry": FRY,
  "fry": FRY, "frying": FRY, "frie": FRY, "tempura": FRY, "schnitzel": FRY, "cutlet": FRY,
  "fritter": FRY, "air fryer": FRY, "air fry": FRY, "air-fry": FRY, "air fried": FRY, "air-fried": FRY,
  // heat-pan
  "heat the pan": PAN, "preheat the pan": PAN, "sear": PAN, "brown": PAN, "saute": PAN, "stir-fry": PAN,
  "stir fry": PAN, "medium-high heat": PAN,
  // heat-oven
  "preheat the oven": OVEN, "bake at": OVEN, "roast at": OVEN, "forgot preheat": OVEN,
  "fan oven": OVEN, "convection oven": OVEN,
  // heat-time-bake
  "bake": BAKE, "bake until": BAKE, "underbaked": BAKE, "gummy": BAKE, "overbaked": BAKE, "burnt": BAKE,
  "dry cake": BAKE,
};

/** Other names for the very same ingredient → its indexed name (already normalised). */
export const ALIASES: Record<string, string> = {
  "tap water": "water", "filtered water": "water",
  "the liquid": "liquid",
  "stock cube": "bouillon cube", "chicken stock cube": "bouillon cube",
  "veg stock": "vegetable stock", "veggie stock": "vegetable stock", "veggie broth": "vegetable broth",
  "dashi stock": "dashi",
  "full-fat coconut milk": "coconut milk", "full fat coconut milk": "coconut milk",
  "canned coconut milk": "coconut milk", "unsweetened coconut milk": "coconut milk",
  "can coconut milk": "coconut milk", "can of coconut milk": "coconut milk", "tin of coconut milk": "coconut milk",
  "crushed garlic": "garlic", "grated garlic": "garlic", "pressed garlic": "garlic",
  "clove garlic": "garlic clove", "cloves garlic": "garlic clove", "clove of garlic": "garlic clove",
  "cloves of garlic": "garlic clove",
  "grated ginger": "ginger", "ginger knob": "ginger",
  "ground chuck": "ground beef", "hamburger meat": "ground beef",
  "burger patty": "burger pattie", "hamburger patty": "burger pattie", "hamburger pattie": "burger pattie",
  "sausagemeat": "sausage meat",
  "pan-sear": "sear",
};
