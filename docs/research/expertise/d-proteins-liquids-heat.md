# Expertise pack D — liquids, aromatics, proteins, frying, heat & time

**Project:** coach-expertise
**Researched:** 2026-10-30
**Purpose:** tolerance bands that CODE uses to rule a cook's slip *fine / fixable / redo*. Serena (the voice coach)
only voices the verdict and the rescue line; she never invents one.

## Conventions (read before encoding)

- **ratio** = actual ÷ recipe amount. For time: actual ÷ recipe time. For temperature: actual ÷ recipe temperature
  **in °F** (ratios of °C and °F differ because neither scale starts at zero — see Open questions; a ±°F delta is
  given beside every temperature band and is the safer thing to encode).
- Bands are **ascending, half-open**: `[lower, upper) → verdict`. Anything not covered by a band is **redo**.
- `fine` = carry on, no action. `fixable` = a named rescue exists and is safe within its limits. `redo` = start the
  step (or the dish) again. When sources disagree, the stricter verdict is recorded.
- **Food safety:** temperatures below are USDA FSIS minimums. The coach never says food *is* safe — every protein
  rescue ends with "check it with a thermometer". Colour, juices and texture are never declared proof of doneness
  (USDA and Nebraska Extension both say colour is unreliable).
- **Source keys** (used throughout):
  - **[McGee]** Harold McGee, *On Food and Cooking*, rev. ed. 2004 (Scribner). Chapters cited by name: ch.3 "Meat";
    ch.6 "A Survey of Common Vegetables" (onion family, garlic); ch.8 "Flavorings from Plants" (ginger);
    ch.9 "Seeds" (rice); ch.10 "Cereal Doughs and Batters"; ch.11 "Sauces"; ch.14 "Cooking Methods and Utensil
    Materials" (frying, heat transfer).
  - **[SFAT]** Samin Nosrat, *Salt Fat Acid Heat*, 2017 — chapters "Fat" (frying, oil temperature) and "Heat"
    (browning, layering heat, doneness, carryover).
  - **[FoodLab]** J. Kenji López-Alt, *The Food Lab*, 2015 — chapters on chicken, ground meat (burgers, meatballs),
    braises/stews, and "Batters and Breadings" (frying).
  - **[SE]** Serious Eats (seriouseats.com), Food Lab columns — same author/editorial standard as [FoodLab].
  - **[SGC]** America's Test Kitchen, *The Science of Good Cooking*, 2012 (concepts on gentle heat, high-heat
    browning, resting meat, starch in sauces, frying temperature).
  - **[ATK-CS]** ATK article "How to Thicken Sauces with Cornstarch" —
    https://www.americastestkitchen.com/articles/how-to-thicken-sauces-with-cornstarch
  - **[CI]** Cook's Illustrated / ATK recipe test notes (rice ratios, braising liquid depth, breading rest).
  - **[MC]** Nathan Myhrvold et al., *Modernist Cuisine at Home*, 2012 (frying, oven calibration, doneness).
  - **[FSIS-T]** USDA FSIS Safe Minimum Internal Temperature Chart —
    https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart
  - **[FSG]** FoodSafety.gov chart (federal, same figures) —
    https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures
  - **[FSIS-F]** USDA FSIS "Deep Fat Frying and Food Safety" (oil can exceed 400 °F; no water on a grease fire;
    don't overcrowd) — fsis.usda.gov, Food Safety Basics section.
  - **[UNL]** University of Nebraska–Lincoln Extension, "Safe cooking temperatures" (colour is not a doneness test)
    — https://food.unl.edu/safe-cooking-temperatures/
  - **[CCE]** Cornell Cooperative Extension, "Safe minimum cooking temperatures" —
    https://erie.cce.cornell.edu/community-health-nutrition/safe-minimum-cooking-temperatures
  - **[MSU]** Michigan State University Extension, "Deep fat fryer safety" —
    https://www.canr.msu.edu/news/deep_fat_fryer_safety
  - **[KA-T]** King Arthur Baking, "Using a thermometer with yeast bread" (yeast bread ≈190 °F; rye/lean 205–210 °F)
    — https://www.kingarthurbaking.com/blog/2017/04/07/using-a-thermometer-with-yeast-bread
  - **[KA-D]** King Arthur Baking, "How to tell if bread is done" —
    https://www.kingarthurbaking.com/blog/2023/05/31/how-to-tell-if-bread-is-done
  - **[KA-QB]** King Arthur Baking, "How to tell when banana bread is done" (a cut quick bread with a raw centre
    cannot go back in — the crust dries before the centre sets) —
    https://www.kingarthurbaking.com/blog/2018/03/15/how-to-tell-when-banana-bread-is-done
  - **[KA-BP]** King Arthur Baking, baker's percentage guide (hydration = water ÷ flour) — kingarthurbaking.com
    "Baker's percentage" page.

---

### role: liquid-water-stock

- **name:** Cooking liquid (water, stock, broth)
- **does:** sauce — body and dilution; braise — heat transfer and the future sauce; grains — absorbed by the starch;
  baking/pastry — hydrates flour, sets dough/batter consistency; other (soups) — the base.
- **tight:** **true** for baking, pastry and grains (absorption method); **false** for sauce, braise, soup.
- **items/aliases:** water, stock, broth, bouillon (made up), chicken/beef/vegetable/bone broth, dashi, cooking
  liquid, "the liquid", wine or beer when used as the braising liquid.

**bands**

| kind | too little | fine | too much |
|---|---|---|---|
| default / sauce | `<0.5` redo-if-scorched else fixable (`add-back-liquid`); `[0.5,0.8)` fixable (`add-back-liquid`) | `[0.8,1.25)` | `[1.25,2.0)` fixable (`reduce-uncovered`, or `thicken-starch`); `[2.0,3.0)` fixable (`reduce-uncovered` + `taste-rebalance`, flag long time); `≥3.0` redo (flavour too diluted to reduce back without over-concentrating salt) |
| braise | `<0.6` fixable (`add-back-liquid`) unless scorched → redo; `[0.6,0.8)` fixable (`add-back-liquid`) | `[0.8,1.5)` | `[1.5,2.5)` fixable (`braise-uncovered-reduce`); `≥2.5` fixable (`remove-solids-reduce`) only if pot still has headroom, else redo |
| grains (absorption: rice, jollof, pilaf) | `[0.6,0.9)` fixable (`rice-add-hot-water`) if caught before the pot is dry and not scorched; `<0.6` same rescue if not scorched; scorched/burnt smell → redo | `[0.9,1.1)` | `[1.1,1.35)` fixable (`rice-uncover-steam-off`); `[1.35,2.0)` fixable for **plain long-grain only** (`rice-drain-pasta-method`); jollof/flavoured rice `≥1.35` redo-texture (mushy — see note); `≥2.0` redo |
| fried rice (liquid = sauce/stock splashed into cooked rice) | n/a | `[0,1.25)` | `[1.25,2.0)` fixable (`stir-fry-dry-out`: spread, high heat, toss until steam stops); `≥2.0` redo (rice turns pasty) |
| baking — bread/yeast dough | `[0.85,0.95)` fixable (`dough-add-liquid`); `<0.85` fixable before shaping only, else redo | `[0.95,1.05)` | `[1.05,1.20)` fixable (`dough-add-flour-proportional`) before first rise ends; `≥1.20` redo (too much flour added changes salt/yeast balance; scale rescue needed — see `dough-scale-all`) |
| baking — cake/muffin/quick-bread batter | `[0.9,0.95)` fixable (`batter-add-liquid`) before baking; `<0.9` redo | `[0.95,1.05)` | `[1.05,1.10)` fixable (`batter-scale-all`) only if flour not yet mixed in; otherwise redo; `≥1.10` redo |
| baking — pancake/crêpe batter | `[0.75,0.9)` fixable (`batter-add-liquid`) | `[0.9,1.15)` | `[1.15,1.4)` fixable (`batter-add-flour-proportional`); `≥1.4` redo |
| pastry (pie, shortcrust) | `[0.8,1.0)` fixable (`pastry-add-water-spoon`) | `[1.0,1.1)` | `≥1.1` redo (sticky, tough pastry; extra flour toughens further) |

Note on jollof: jollof's rice is steamed in a seasoned tomato–stock base, often parboiled rice. Excess liquid can be
cooked off uncovered in a low oven, but the grains swell and burst first; the sources treat over-wet absorption rice
as a texture loss, not a reliable rescue → **redo-texture** (dish edible; coach says so honestly and offers
`rice-uncover-steam-off` as damage limitation, not a fix). Provisional for jollof specifically (no Western reference
book tests jollof ratios).

**rescues**

- `add-back-liquid` — kind: scale. Add the missing liquid (recipe amount × (1 − ratio)), hot, a third at a time.
  Limit: only if nothing has scorched. *Say:* "Add the rest of the liquid now, hot, a little at a time."
- `reduce-uncovered` — kind: scale. Lid off, simmer briskly until volume returns to the recipe's; taste for salt
  only at the end. Limit: excess ≤ 2× recipe; do not reduce dairy-heavy sauces at a hard boil. *Say:* "Take the lid
  off and let it simmer down until it's back to where the recipe wants it; season at the end."
- `thicken-starch` — kind: add (role `thickener-cornstarch`), **1 tbsp cornstarch slurried in 2 tbsp cold water per
  1 cup (240 ml) of excess liquid**; or flour 2 tbsp per cup as beurre manié. Simmer 1 min after it thickens; do not
  boil long after (starch thins again). Limit: excess ≤ 1 cup per tbsp step; not for baking. *Say:* "Whisk a spoon of
  cornstarch into cold water, stir it in, and let it bubble a minute."
- `taste-rebalance` — kind: none (advisory). After a long reduction, taste — salt concentrates. *Say:* "Taste before
  you salt; it'll have concentrated."
- `braise-uncovered-reduce` — kind: scale. Cook the last 30–45 min uncovered (oven or stovetop) so the liquid falls
  to ⅓–½ up the meat. *Say:* "Leave the lid off for the last half hour so it reduces."
- `remove-solids-reduce` — kind: scale. Lift meat out, reduce the liquid on the stove to the recipe volume, return
  meat. *Say:* "Lift the meat out, boil the liquid down, then put the meat back."
- `rice-add-hot-water` — kind: add (role liquid), **2–4 tbsp (30–60 ml) boiling water per cup of dry rice**, lid on,
  lowest heat, 5–10 min. Limit: not if bottom has scorched. *Say:* "Sprinkle in a few spoons of boiling water, lid
  on, lowest heat, ten more minutes."
- `rice-uncover-steam-off` — kind: none (time). Lid off, lowest heat 5–10 min, then off the heat with a towel under
  the lid 10 min. *Say:* "Lid off on the lowest heat for a few minutes to steam off the extra water."
- `rice-drain-pasta-method` — kind: scale. Plain long-grain only: keep boiling until tender, drain in a sieve, return
  to pot, lid + towel 10 min. *Say:* "Treat it like pasta: cook till tender, drain it, then let it steam dry."
- `stir-fry-dry-out` — kind: none. *Say:* "Spread it out on high heat and keep tossing until the steam stops."
- `dough-add-flour-proportional` — kind: add (role flour), **per gram of excess water add excess ÷ hydration grams of
  flour** (e.g. 65 % hydration: 10 g extra water → ≈15 g flour), plus salt at 2 % of the added flour. Limit: before
  the end of bulk rise; ratio < 1.20. *Say:* "Work in about one and a half times the extra water in flour, with a
  pinch of salt."
- `dough-add-liquid` — kind: add (role liquid), the deficit, a tablespoon at a time while kneading. *Say:* "Knead in
  the rest of the water a spoonful at a time."
- `batter-scale-all` — kind: scale. Multiply every other ingredient by the ratio. Only before flour is mixed in
  (re-mixing after develops gluten). *Say:* "Before the flour goes in, scale up the rest of the recipe to match."
- `batter-add-liquid` — kind: add (role liquid), the deficit, folded gently. *Say:* "Fold in the rest of the liquid
  gently, just until combined."
- `batter-add-flour-proportional` — kind: add (role flour), pancake: **≈ 1 tbsp flour per 2 tbsp excess liquid**,
  rest 5 min. Provisional. *Say:* "Whisk in a spoon of flour for every two spoons of extra milk, then let it rest."
- `pastry-add-water-spoon` — kind: add, 1 tsp ice water at a time until it holds when pinched. *Say:* "Add ice water a
  teaspoon at a time until it holds together when you pinch it."

**substitutions**

- stock ↔ water, 1:1 by volume. Water for stock: flatter flavour — add bouillon per its label or more salt/aromatics.
  Stock for water: more savoury and saltier — reduce added salt by roughly a third, taste at the end. In rice, stock is
  fine 1:1. In bread dough, do not swap stock for water (salt and fat alter rise) → no substitution.
- wine for stock in a braise, up to ½ of the liquid; reduce the wine by half first (raw alcohol taste otherwise).
- milk for water in pancake batter 1:1 (richer, browns faster).

**changes**

- less (sauce/braise/soup): down to 0.8 safe — thicker, saltier; below needs `add-back-liquid`.
- more (sauce/braise/soup): up to 1.25 safe — thinner; season at end.
- grains / baking / pastry: ±5 % (0.95–1.05) only; beyond changes texture.

**shows:** too much — soupy sauce that doesn't coat a spoon; braising liquid covering the meat; rice sitting in
standing water, swollen burst grains; slack dough spreading flat, sticking to hands; runny batter. Too little — pan
going dry, sizzling instead of simmering, browning/sticking at the base, smoke; rice with hard white cores, crackling
sound; shaggy dough that won't come together.

**sources**

- sauce bands, `reduce-uncovered`, `taste-rebalance`: [McGee] ch.11 (reduction concentrates flavour and salt);
  [SFAT] "Salt" and "Heat" (season after reducing); [SGC] (reduction concepts).
- `thicken-starch` (1 tbsp per cup; starch thins with prolonged boiling): [McGee] ch.11 (starch gelatinisation and
  breakdown); [ATK-CS].
- braise bands, `braise-uncovered-reduce`, `remove-solids-reduce`: [FoodLab] braise chapter (liquid partway up,
  reduce at end); [CI] (liquid ⅓–½ up the meat; uncover to reduce); [McGee] ch.3 (braising).
- grain bands, `rice-add-hot-water`, `rice-uncover-steam-off`, `rice-drain-pasta-method`: [McGee] ch.9 (rice absorbs
  roughly its own weight-plus of water; excess makes it sticky/swollen); [CI] (stovetop long-grain ≈1.5 : 1 by volume,
  pasta-method rice; towel-under-lid rest); [SE] rice columns. **Jollof-specific band: provisional: true** (only
  general absorption-rice sources).
- fried-rice band, `stir-fry-dry-out`: [FoodLab]/[SE] fried rice (dry, day-old or air-dried rice; wet rice clumps);
  [CI] fried rice notes. Numeric thresholds **provisional: true**.
- dough bands, `dough-add-flour-proportional`, `dough-add-liquid`: [KA-BP] (hydration arithmetic); [McGee] ch.10
  (water–gluten balance); Modernist Bread / [MC] (hydration). Salt-with-flour rule: [KA-BP] + [McGee] ch.10.
- cake batter bands, `batter-scale-all`: [McGee] ch.10 (overmixing develops gluten → tough cake); [SGC] (cake mixing
  concepts). Numbers **provisional: true** (sources give the mechanism, not a percentage tolerance).
- pancake band, `batter-add-flour-proportional`: **provisional: true** ([SGC] pancake concepts only).
- pastry band, `pastry-add-water-spoon`: [McGee] ch.10 (water toughens pastry); [SGC] (pie dough water).
- substitutions: [SFAT] "Salt" (stock carries salt); [CI] (wine reduction before braising); [McGee] ch.11.
- changes: as for bands.

---

### role: liquid-coconut-milk

- **name:** Coconut milk / coconut cream
- **does:** sauce/braise (curries, stews, rice and peas) — body, fat, sweetness; grains (coconut rice) — absorbed;
  baking — fat + liquid.
- **tight:** false for sauce/braise; **true** for grains and baking.
- **items/aliases:** coconut milk, full-fat coconut milk, light coconut milk, coconut cream, "a tin of coconut milk".

**bands**

- sauce/braise: too little `[0.5,0.8)` fixable (`add-back-liquid` with more coconut milk or stock); fine `[0.8,1.4)`;
  `[1.4,2.0)` fixable (`reduce-uncovered`, gentle simmer; add salt/acid/spice to rebalance — `taste-rebalance`);
  `≥2.0` fixable only by `scale-other-components` (add more of the curry paste/protein); else redo. Provisional above
  1.4.
- grains (coconut rice): same as `liquid-water-stock` grains bands, but coconut rice scorches faster → too little
  `<0.9` fixable only if not catching; scorched → redo.
- baking: same as cake batter bands (tight).
- **split/curdled ("cracked")** at a hard boil: in Thai curries cracking the cream is intentional; in a creamy sauce
  where it wasn't intended → fixable (whisk off heat; a teaspoon of cornstarch slurry re-binds) — provisional.

**rescues**

- `reduce-uncovered` (as above; simmer, not hard boil). *Say:* "Let it simmer gently with the lid off to thicken."
- `scale-other-components` — kind: scale. Add paste/spice/protein proportionally to the excess. *Say:* "Add a bit
  more paste and seasoning so it isn't bland."
- `coconut-rebind` — kind: add (role thickener-cornstarch), 1 tsp cornstarch per cup of sauce, slurried, off-boil.
  Provisional. *Say:* "Take it off the boil and whisk in a little cornstarch slurry to bring it back together."

**substitutions:** light coconut milk for full-fat 1:1 (thinner, less rich; may need reduction). Coconut cream for
milk: 1 part cream + 1 part water ≈ milk. Dairy (heavy cream) 1:1 in curries — loses coconut flavour, no
sweetness. Evaporated milk 1:1 — provisional.

**changes:** less to 0.8 safe (more intense, less creamy); more to 1.4 safe (milder, sweeter, thinner).

**shows:** too much — pale, thin, milky curry, spice dulled; too little — paste frying/catching, thick and oily;
split — oil pooling on top, grainy flecks.

**sources:** bands/rescues: [McGee] ch.11 (coconut milk as an emulsion; fat separates with boiling) and ch.9/rice for
grains; [SE] coconut-milk and Thai curry columns (cracking cream intentionally). Reduction: [McGee] ch.11 + [SGC].
Rebind and `≥2.0` scaling: **provisional: true**. Substitutions: [McGee] ch.11 (composition of coconut milk/cream);
[CI] substitution notes — evaporated-milk swap **provisional: true**.

---

### role: thickener-cornstarch (support role referenced by rescues)

- **name:** Starch thickener (cornstarch, flour, arrowroot)
- **does:** sauce, braise, other (gravies, stir-fry sauces)
- **tight:** false
- **items/aliases:** cornstarch, cornflour (UK), arrowroot, potato starch, flour (as roux / beurre manié).
- **bands (when the cook added too much):** fine `[0,1.5)`; `[1.5,3.0)` fixable (`add-back-liquid` to thin — add
  liquid in proportion: ~1 cup per extra tbsp cornstarch); `≥3.0` redo (gluey, starchy taste).
- **rescues:** `add-back-liquid` (above). *Say:* "It's too thick — stir in some more stock until it loosens."
- **substitutions:** flour = 2× cornstarch by volume (cook ≥2 min to lose raw taste); arrowroot 1:1 with cornstarch
  (don't boil long, clearer); potato starch 1:1.
- **changes:** less → thinner sauce; more → gloopy.
- **shows:** gloopy, gelled, matte; lumps if added dry.
- **sources:** [ATK-CS]; [McGee] ch.11 (starch types, flour ≈ half the thickening power of pure starch);
  [SGC] (starch concept). Thinning-ratio numbers **provisional: true**.

---

### role: aromatic-garlic

- **name:** Garlic (fresh)
- **does:** saute/sauce/braise/roast — flavour base; other (dressings, raw) — pungency.
- **tight:** false (cooked); **true** when raw (aioli, dressings, salsa).
- **items/aliases:** garlic, garlic cloves, minced/crushed/grated garlic, garlic paste.

**bands**

- cooked (saute/sauce/braise/roast): too little — any ratio `<0.8` **fine** (milder; may add more late);
  fine `[0.8,1.75)`; `[1.75,3.0)` fixable (`dilute-scale` or `cook-gently-longer` if not yet browned); `≥3.0`
  provisional fixable (`dilute-scale`) else redo — provisional.
- raw (dressing, aioli, salsa): fine `[0.5,1.25)`; `[1.25,2.0)` fixable (`dilute-scale`); `≥2.0` redo (raw garlic
  is harsh and can't be cooked out of a cold dish).
- **burnt garlic** (dark brown/black, acrid smell) — a state, not a ratio → **redo the step**: discard garlic and the
  oil it fried in, wipe the pan, start the aromatics again. Golden is fine; light brown in a dish meant to be mellow is
  fine-to-fixable (taste).

**rescues**

- `dilute-scale` — kind: scale. Increase the other components (liquid, base, protein) toward the ratio. *Say:* "That's
  a lot of garlic — bulk up the rest of the dish a little to balance it."
- `cook-gently-longer` — kind: none. Cooked longer and gently, garlic mellows and sweetens. *Say:* "Keep it on low a
  few more minutes; it'll mellow." Provisional.
- `garlic-restart` — kind: none (redo step). *Say:* "That garlic's burnt and it'll taste bitter. Tip it out, wipe the
  pan and start the garlic again."

**substitutions:** garlic powder ⅛ tsp ≈ 1 clove (flatter, no browning stage; add with liquid, not to hot oil);
granulated garlic ¼ tsp ≈ 1 clove; shallot or more onion for a milder base (different flavour). Jarred minced garlic
½ tsp ≈ 1 clove (weaker, slightly sour).

**changes:** less — always safe in cooked dishes (milder). More — up to 1.75× cooked is a matter of taste.

**shows:** burnt — black/dark brown specks, acrid blue smoke, pan smoking; too much raw — visibly heaps of mince.
Golden-edged pale pieces = fine.

**sources:** burnt-garlic redo + `garlic-restart`: [SFAT] "Heat" (garlic burns quickly, add it after onions or to
cooler fat; burnt garlic is bitter); [FoodLab] (garlic browns and turns bitter in seconds — add late); [SGC] (garlic
bitterness when browned). Cooked/raw tolerance & mellowing: [McGee] ch.6 (garlic's pungency forms when cells are
crushed and is tamed by cooking; raw stays harsh). `dilute-scale` numbers and `cook-gently-longer`: **provisional:
true** (mechanism in [McGee]; no second source gives a threshold). Substitution ratios: [CI] substitution chart;
second trusted source not confirmed → **provisional: true**.

---

### role: aromatic-onion

- **name:** Onion family (onion, shallot, leek, spring onion)
- **does:** saute/braise/sauce — sweet savoury base; other (raw in salads/salsa) — sharpness.
- **tight:** false.
- **items/aliases:** onion, yellow/white/red/brown onion, shallot, leek, scallion, spring onion, green onion.

**bands**

- cooked: too little `<0.5` fixable (`add-more-onion` early) else fine; fine `[0.5,2.0)`; `[2.0,3.0)` fixable
  (`cook-down-longer` — sweats down); `≥3.0` provisional redo-to-taste.
- raw: fine `[0.5,1.5)`; `[1.5,2.5)` fixable (`soak-raw-onion` for future portions / `dilute-scale`); `≥2.5` redo.
- **burnt onion** (black edges, bitter smell — distinct from deliberately deep-caramelised brown) → redo the step if
  more than a few pieces are black; a few dark edges → fine (pick out).

**rescues**

- `cook-down-longer` — kind: none. More onion just takes longer to soften; lower heat, salt pinch to draw water.
  *Say:* "That's plenty of onion; give it a few extra minutes so it softens down."
- `add-more-onion` — kind: add (role onion), the deficit, before the liquid goes in. *Say:* "Add a bit more onion now,
  before the liquid."
- `soak-raw-onion` — kind: none. Rinse/soak sliced raw onion 10 min in cold water to tame it. *Say:* "Rinse the onion
  in cold water to soften its bite."
- `dilute-scale` (as garlic).

**substitutions:** shallot for onion 1:1 by volume (milder, sweeter); leek 1:1 (milder, wash grit); onion powder
1 tsp ≈ 1 medium onion (no texture/sweetness; provisional).

**changes:** less → lighter, less sweet base; more → sweeter, softer, longer sweat.

**shows:** too hot — edges black before centre softens; too cold — pale, steaming, not sizzling; burnt — black
pieces, bitter smoke.

**sources:** cooking-down, browning vs burning: [McGee] ch.6 (onion sugars caramelise; raw sulphur compounds); [SFAT]
"Heat" (sweating vs browning onions, heat control). `soak-raw-onion`: [McGee] ch.6 (rinsing removes pungent
compounds); [SE] raw-onion column. Ratio thresholds and onion-powder ratio: **provisional: true**.

---

### role: aromatic-ginger

- **name:** Ginger (fresh)
- **does:** saute/sauce/braise (stir-fries, curries) — warm pungency; baking — spice.
- **tight:** false cooked; **true** in baking.
- **items/aliases:** ginger, fresh ginger, ginger root, grated/minced ginger, ginger paste.
- **bands:** cooked — too little any `<0.8` fine; fine `[0.8,1.5)`; `[1.5,2.5)` fixable (`dilute-scale`, or add
  sweetness/coconut milk to round it — provisional); `≥2.5` redo (pungency persists, can read as burning).
  Baking (fresh ginger in gingerbread/cake): fine `[0.75,1.25)`; outside → redo (provisional).
  Burnt ginger (dark, bitter) → redo the step, as garlic.
- **rescues:** `dilute-scale`; `garlic-restart` pattern for burnt (*Say:* "The ginger's burnt; tip it out and start
  that step again.").
- **substitutions:** ground ginger ¼ tsp ≈ 1 tbsp fresh grated (different, earthier, less bright; provisional);
  galangal is not a 1:1 swap (piney, sharper).
- **changes:** less → milder; more → hotter, sharper (gingerol pungency).
- **shows:** fibrous strands; burnt dark bits; cook says "it's too spicy/hot".
- **sources:** pungency chemistry and cooking effects: [McGee] ch.8 (gingerols → milder zingerone on cooking; dried
  ginger contains sharper shogaols). Second source for thresholds and substitutions not confirmed → **provisional:
  true** for all ginger bands, rescues and substitutions.

---

### role: protein-chicken

- **name:** Chicken (breasts, thighs, tenders, wings, drumsticks; whole or pieces)
- **does:** saute, roast, braise, other (grill, fry — see frying role).
- **tight:** **true** for undercooking (safety); false for overcooking (quality).
- **items/aliases:** chicken breast, chicken thigh (bone-in/boneless), chicken tenders/tenderloins, chicken strips,
  wings, drumsticks, whole chicken, ground chicken.
- **USDA:** all poultry, including ground, **165 °F (74 °C)** in the thickest part, not touching bone [FSIS-T][FSG].

**bands (ratio = actual cook time ÷ recipe time)**

- **undercooked** — any `<1.0` where the cook reports or the camera shows pink/raw/translucent centre, or time
  `<0.9` → **fixable** (`back-in-and-probe`). Never "fine" on time alone. Cut chicken found raw after slicing →
  fixable (`back-in-and-probe`; slices cook fast).
- breasts / tenders (lean, dry out quickly): fine `[0.9,1.15)` (then probe); `[1.15,1.5)` fixable
  (`rescue-overcooked-slice-sauce`); `≥1.5` fixable (`rescue-overcooked-slice-sauce` — repurpose shredded in sauce,
  soup or salad); blackened/charred exterior → redo (or trim if only spots).
- thighs / drumsticks / wings (dark meat, forgiving — collagen): fine `[0.9,1.5)`; `[1.5,2.0)` fixable (sauce);
  `≥2.0` fixable (shred into sauce) unless charred → redo.
- braise (chicken in liquid): fine `[0.9,1.75)` for thighs; breasts in a braise fine `[0.9,1.3)`, beyond fixable
  (shred into the sauce).

**rescues**

- `back-in-and-probe` — kind: none (time). Return to pan/oven at recipe heat; for pieces 3–5 min more, whole birds
  10–15 min, then measure the thickest part with an instant-read thermometer; repeat until it reads 165 °F. Sliced
  raw pieces: back in the pan with a splash of liquid, lid on, 2–4 min. Wash hands/boards that touched raw juices.
  *Say:* "It needs a bit longer. Put it back in for a few minutes, then check the thickest part with a thermometer —
  you're looking for 165."
- `rescue-overcooked-slice-sauce` — kind: none. Slice thinly across the grain; serve with a sauce, gravy, pan juices
  or dressing; or shred into soup/sauce/salad. *Say:* "It's gone a bit far. Slice it thin across the grain and serve
  it with plenty of sauce — it'll eat well."

**substitutions:** thighs for breasts 1:1 by weight (more forgiving, richer; cook to higher temp for texture); breasts
for thighs 1:1 (cook time shorter, dry out sooner); tenders for breasts — about half the time.

**changes (doneness targets, quality — all above USDA minimum):** dark meat eats best at **175–195 °F** (connective
tissue softens) — cooking thighs further than 165 °F is safe and better. Breasts are juiciest pulled close to 165 °F;
going past ~170 °F dries them. Carryover raises temperature a few degrees during a rest. (Some sources discuss holding
breasts at lower temperatures for longer — the coach does **not** use that; USDA's 165 °F is the only number it gives.)

**shows:** undercooked — pink/glossy translucent centre, rubbery, juices pink, joint not moving freely (not proof
either way); overcooked breast — stringy, dry, pale-white fibres, shrunken; burnt — black crust, smoke.

**sources:**

- 165 °F, thermometer rule: [FSIS-T]; [FSG]; [CCE].
- colour/juices not reliable → always probe: [UNL]; [FSIS-T].
- `back-in-and-probe`: [FSIS-T] + [UNL] (re-cook to the minimum; use thermometer); [FoodLab] chicken chapter
  (instant-read thermometer in thickest part).
- breast vs thigh tolerance and 175–195 °F dark-meat quality: [FoodLab] chicken chapter; [CI] (thighs to 175 °F+);
  [McGee] ch.3 (dark meat's connective tissue/collagen needs higher temperatures; breast meat dries as proteins
  squeeze out water).
- `rescue-overcooked-slice-sauce`: [SFAT] "Heat" (overcooked meat — slice thin and serve with sauce/broth);
  [McGee] ch.3 (slicing across the grain shortens fibres, perceived as more tender). Time-ratio numbers are this
  pack's synthesis → **provisional: true** for the numeric thresholds; verdicts themselves have ≥2 sources.
- carryover/rest: [SGC] (resting concept); [SFAT] "Heat".
- substitutions: [FoodLab]; [CI]. Tenders "about half the time": **provisional: true**.

---

### role: protein-ground-meat

- **name:** Ground meat & meatballs (beef, pork, lamb, turkey, chicken; burgers, meatballs, meatloaf, mince)
- **does:** saute (browned mince), roast/bake (meatballs, meatloaf), braise (meatballs in sauce), other (burgers).
- **tight:** **true** for undercooking.
- **items/aliases:** ground beef, minced beef, mince, ground pork, ground lamb, ground turkey, ground chicken,
  meatballs, burgers, patties, meatloaf, sausage meat.
- **USDA:** ground beef/pork/lamb/veal **160 °F (71 °C)**; ground turkey/chicken **165 °F (74 °C)** [FSIS-T][FSG].
  Grinding spreads surface bacteria through the meat, which is why the whole-cut 145 °F does not apply.

**bands (time ratio)**

- undercooked: any reported pink/raw centre, or `<0.9` → fixable (`back-in-and-probe-ground`). Browned mince still
  pink in places → fixable (keep cooking, break up, until no raw-looking bits, then probe a meatball/patty).
- meatballs in sauce (braise): fine `[0.9,2.0)` — very forgiving once cooked through; `≥2.0` fixable (they firm up;
  keep in sauce).
- baked/pan meatballs, burgers: fine `[0.9,1.25)`; `[1.25,1.75)` fixable (`rescue-overcooked-in-sauce`); `≥1.75`
  fixable (crumble into sauce/chilli) unless charred → redo.
- browned mince: fine `[0.9,1.5)`; beyond fixable (add liquid/sauce; dry crumbles soften in sauce); burnt → redo.

**rescues**

- `back-in-and-probe-ground` — kind: none. Meatballs/patties back in pan or oven 3–5 min (or simmer meatballs in the
  sauce 8–10 min), then thermometer in the centre of the largest one: 160 °F (beef/pork/lamb) or 165 °F (poultry).
  *Say:* "Give them a few more minutes, then check the middle of the biggest one — 160 for beef, 165 for chicken or
  turkey."
- `rescue-overcooked-in-sauce` — kind: none. Simmer in a sauce or gravy 5 min; crumble overcooked burgers into a
  sauce. *Say:* "They're a bit firm — let them sit in the sauce for a few minutes."

**substitutions:** ground turkey/chicken for beef 1:1 (leaner, needs 165 °F, may need a little oil); ground pork for
part of the beef 1:1 (juicier); plant-based mince per pack instructions (no safety temp beyond the pack).

**changes:** fat content — leaner mince dries faster when overcooked (narrower overcook band; provisional).

**shows:** undercooked — pink/red centre, raw-looking strands in mince, soft squishy centre; colour can turn brown
before it is safe, and can stay pink after it is safe — both why the coach probes; overcooked — dry, crumbly,
shrunken, cracked; burnt — black crust.

**sources:** 160/165 °F and grinding rationale: [FSIS-T]; [FSG]; [McGee] ch.3 (surface bacteria mixed through by
grinding). Browning-colour unreliability: [UNL]; [FSIS-T] (hamburger "premature browning" guidance on the same
site). Meatball forgiveness in sauce: [FoodLab] ground meat chapter (meatballs braised in sauce stay tender);
[SGC] (panade keeps meatballs moist). Time-ratio thresholds **provisional: true**. Substitutions: [FSIS-T] (poultry
temp) + [CI].

---

### role: protein-whole-cut (support role — steaks, chops, roasts)

- **name:** Whole-muscle beef, pork, lamb, veal
- **does:** saute, roast, braise.
- **tight:** true for undercooking pork (safety minimum); false for beef doneness preference.
- **items/aliases:** steak, pork chop, pork tenderloin, roast beef, lamb chops, leg of lamb.
- **USDA:** **145 °F (63 °C) + 3-minute rest** for beef, pork, veal, lamb whole cuts [FSIS-T][FSG]. Braises
  (chuck, shoulder, short rib) are cooked far past this for tenderness (~195–205 °F) — quality, not safety.
- **bands:** undercooked vs recipe → fixable (`back-in-and-probe` at 145 °F + rest). Overcooked steak/chop → fixable
  (`rescue-overcooked-slice-sauce`). Braise cut "tough after recipe time" (ratio ~1.0) → fixable (`braise-longer`:
  30 min more, test with fork) — undercooked braises are tough, not overcooked. Braise ratio `≥2.0` with liquid gone →
  check for scorching → redo if burnt.
- **rescues:** `braise-longer` — kind: none. *Say:* "If it's still tough, it needs more time, not less. Lid on,
  another half hour, then try a fork."
- **sources:** 145 °F + rest: [FSIS-T]; [FSG]; [CCE]. Tough braise = needs longer (collagen → gelatin): [McGee] ch.3;
  [FoodLab] braise chapter; [SGC]. Overcooked slice thin: [SFAT] "Heat" + [McGee] ch.3.

---

### role: frying-oil

- **name:** Frying oil temperature & load (deep-fry, shallow-fry, pan-fry breaded items)
- **does:** other (frying), saute (shallow frying).
- **tight:** true.
- **items/aliases (actions):** deep fry, shallow fry, pan fry, fry, oil temperature, "heat the oil to 350",
  fried chicken, fries, tempura, schnitzel, cutlets, fritters.

**bands (ratio = actual ÷ recipe oil temperature in °F; deltas given for code)**

| ratio (°F) | Δ at recipe 350 °F | verdict |
|---|---|---|
| `<0.86` | below ~300 °F | fixable — `fry-wait-recover` (food is soaking up oil; lift it out, reheat, refry) |
| `[0.86,0.93)` | ~300–325 °F | fixable — `fry-wait-recover` (raise heat, add fewer pieces) |
| `[0.93,1.07)` | ~325–375 °F | fine |
| `[1.07,1.15)` | ~375–400 °F | fixable — `fry-lower-heat` (outside browns before inside cooks; for chicken finish with `fry-oven-finish`) |
| `≥1.15` or oil visibly smoking | >400 °F | **redo-step / safety** — `fry-smoking-stop`: heat off, don't add food, let cool; if the oil smells acrid, discard once cool and use fresh oil |

Note: adding cold food drops the oil temperature 25–75 °F; a recipe's "350 °F" is the starting temperature, and a
reading of ~300–325 °F just after loading is expected and fine if it climbs back.

- **overcrowding** (load ratio = pieces added ÷ recipe batch, or pan surface covered > ~⅔–¾): `[0,1.25)` fine;
  `[1.25,2.0)` fixable (`fry-batch-smaller` for the rest; the current batch may be greasy → `fry-wait-recover`);
  `≥2.0` fixable (remove half now).
- **breading falling off:** fixable for the rest of the batch (`breading-fix`); pieces already bald → fine to eat
  (cosmetic), not redo.
- **fried chicken dark outside, centre unknown/raw** → fixable (`fry-oven-finish`).
- **oil fire** (flames) → not a cooking verdict: `oil-fire` safety line.

**rescues**

- `fry-wait-recover` — kind: none. Lift food out, let the oil climb back to temperature (thermometer), fry fewer
  pieces at once, drain on a rack. Greasy pieces can be refried briefly at the right temperature. *Say:* "The oil's
  too cool, so it's soaking in. Take them out, wait for the oil to come back up, and fry fewer at once."
- `fry-lower-heat` — kind: none. Turn the heat down, wait for the thermometer to fall into range. *Say:* "The oil's too
  hot — turn it down and wait a minute before the next batch."
- `fry-oven-finish` — kind: none. Move pieces to a rack on a tray in a 350 °F oven until the thickest piece reads
  165 °F (chicken). *Say:* "The outside's done ahead of the inside. Finish them in the oven and check the thickest
  piece with a thermometer for 165."
- `fry-smoking-stop` — kind: none. *Say:* "The oil's smoking. Turn the heat off and don't add anything; let it cool
  down before you carry on."
- `fry-batch-smaller` — kind: scale (load ÷ ratio). *Say:* "Fry these in smaller batches with space between."
- `breading-fix` — kind: none. Pat food dry first; flour → egg → crumbs; press crumbs on; rest breaded pieces 10–20
  min on a rack before frying; don't move them until the first side sets (~2 min). *Say:* "For the next ones, pat them
  dry, press the crumbs on and let them sit ten minutes before frying — and don't move them until they've set."
- `oil-fire` — kind: none. Heat off; cover with a metal lid or baking sheet; never water; don't carry the pan; call
  emergency services if it spreads. *Say:* "Turn the heat off and slide a lid over it. No water. Don't move the pan."

**air-frying (same role, kind other)**

- items: air fryer, air-fry, air-fried.
- bands — load (basket coverage): single layer fine; overlap `[1.25,2.0)` fixable (`fry-batch-smaller`, shake
  half-way); stacked `≥2.0` fixable (split into two batches). Temperature: as oven bands (heat-oven role). Time: as
  chicken/meat bands with `back-in-and-probe`.
- rescues: `airfry-shake-spray` — *Say:* "Spread them in one layer, give them a light spray of oil, and shake the
  basket half-way." Breading in an air fryer can blow off loose crumbs → press firmly, light oil spray.
- shows: pale, steamed, soggy pieces; uneven browning; dry crumbs loose in the basket.

**substitutions:** neutral high-smoke-point oils interchangeable 1:1 (canola, peanut, vegetable, rice bran,
sunflower); extra-virgin olive oil and butter are poor deep-frying choices (lower smoke points). Shallow-fry depth
≈ ½ the food's thickness.

**changes:** oil a little cooler (to ~325 °F) for thick bone-in pieces that need time to cook through; hotter
(~375 °F) for thin quick items — both within the fine band.

**shows:** too cold — pale, greasy, sodden, few bubbles, food sinks and sits; too hot — wisps of smoke, rapid
darkening in seconds, acrid smell; overcrowded — temperature crash, pieces stuck together, steaming; breading
falling off — bare patches, crumbs floating; spent oil — dark, foamy, smells off.

**sources:** temperature bands (325–375 °F working range; low oil = greasy; high = burnt outside/raw inside):
[McGee] ch.14 (frying); [SFAT] "Fat" (oil temperature and greasiness); [SGC] (frying temperature concept); [FoodLab]
"Batters and Breadings". Temperature drop on loading + overcrowding: [FSIS-F] (don't overcrowd); [McGee] ch.14;
[FoodLab]. Smoking oil / >400 °F hazard, `oil-fire` (no water, lid): [FSIS-F]; [MSU]. `fry-oven-finish` + 165 °F:
[FSIS-T]; [FoodLab]/[CI] fried-chicken method (finish in oven). Breading adhesion (dry, three-step, rest, don't move):
[FoodLab] "Batters and Breadings"; [CI] (rest breaded cutlets before frying). Air-frying load/shake: [CI]/ATK
air-fryer testing; second trusted source not confirmed → **provisional: true**. Oil substitutions & smoke points:
[FSIS-F] (canola/peanut/vegetable suitable); [McGee] ch.14 (smoke points). Exact ratio cut-offs in °F are this pack's
mapping of the sources' 325–375 °F range → thresholds **provisional: true** at ±1 band.

---

### role: heat-pan

- **name:** Pan heat (stovetop) — too hot / too cold
- **does:** saute, eggs, sauce, other (searing, stir-fry).
- **tight:** false (mostly recoverable) except burnt fond / burnt fat.
- **items/aliases (actions):** heat the pan, sear, brown, saute, stir-fry, "medium-high heat", preheat the pan.
- **bands (states, not ratios — the camera/cook reports them):**
  - pan too cold (food added to a cold pan, no sizzle, meat grey and steaming, sticking) → **fixable**
    (`pan-reheat`).
  - pan too hot, fat shimmering → fine (that's the target for searing).
  - fat smoking lightly → fixable (`pan-off-heat-cool`).
  - fat smoking heavily / acrid / fond black → **redo step** (`pan-restart`): discard fat, wipe/wash, restart;
    don't deglaze black fond — it makes the sauce bitter.
  - food burnt on one side → fixable if only spots (trim/scrape); fully black → redo.
  - sauce scorched on the bottom → fixable (`scorch-transfer`) only if it doesn't taste burnt; burnt taste → redo.
- **rescues**
  - `pan-reheat` — lift food out, heat the pan until the fat shimmers, return food in a single layer with space;
    pat wet food dry. *Say:* "Take it out, let the pan get properly hot, then put it back in one layer."
  - `pan-off-heat-cool` — pull pan off the burner 30–60 s, lower the flame. *Say:* "Lift the pan off the heat for a
    moment and turn it down."
  - `pan-restart` — *Say:* "That's burnt, and it'll make everything bitter. Tip it out, wipe the pan and start this
    step again."
  - `scorch-transfer` — pour into a clean pot without scraping the bottom; taste. *Say:* "Pour it into a clean pot
    without scraping the bottom, then taste it."
- **shows:** cold — no sizzle, grey meat, water pooling; hot — wisps of smoke, oil darkening, instant blackening,
  black flecks in the fond.
- **sources:** browning needs a hot dry pan / crowding steams: [McGee] ch.14 (Maillard browning needs surface above
  boiling point) and ch.3; [SFAT] "Heat"; [FoodLab] (don't crowd the pan; pat dry). Burnt fond bitter → don't
  deglaze: [SGC] (fond concept); [FoodLab]. Smoking fat: [McGee] ch.14 (smoke point, breakdown products) + [FSIS-F].
  `scorch-transfer`: [CI] test notes + [SFAT] "Heat" — **provisional: true** (second source's wording is general).

---

### role: heat-oven

- **name:** Oven temperature — too hot / too cold
- **does:** baking, pastry, roast, other.
- **tight:** **true** for baking and pastry; false for roast/braise.
- **items/aliases (actions):** preheat the oven, bake at, roast at, oven temperature, "forgot to preheat", fan/
  convection oven.

**bands (ratio = actual ÷ recipe temperature in °F; Δ given)**

- baking (cakes, cookies, quick breads, bread): `<0.88` (≥ ~40 °F low at 350) fixable (`oven-correct-temp` + extend
  time, probe/test) if caught in the first ⅓ of bake, else follow underbaked rules; `[0.88,0.95)` fixable
  (`oven-correct-temp`); **fine `[0.95,1.05)`** (≈ ±15–20 °F); `[1.05,1.12)` fixable (`oven-correct-temp`, tent with
  foil, check early); `≥1.12` (≥ ~40 °F hot) fixable if caught early (`oven-correct-temp` + tent) else follow
  overbaked rules.
- "forgot to preheat" (food went into a cold oven): cakes/soufflés/choux/puff pastry → **redo-risk**: fixable only if
  caught within ~5 min (leave it, finish preheat, add ~5–10 min, test); otherwise expect dense result — provisional.
  Roasts/casseroles → fine (add time, probe).
- convection: fan ovens run ~25 °F hotter in effect; using a conventional-oven temperature with fan on → treat as
  `[1.05,1.12)`.
- roast / braise: fine `[0.85,1.15)`; outside → fixable (`oven-correct-temp` + thermometer); the internal-temperature
  rules of the protein roles govern doneness, not oven temperature.

**rescues**

- `oven-correct-temp` — set the right temperature; check with an oven thermometer; adjust time; test early. *Say:*
  "Set it to the right temperature and start checking a few minutes early."
- `tent-foil` — loose foil over the top when browning runs ahead of the centre. *Say:* "Lay a sheet of foil loosely
  over the top so it doesn't brown any further."

**shows:** too hot — domed and cracked cake top, dark crust with wet centre, burnt bottoms on cookies, smoke; too
cold — pale, spread-out cookies, sunken or dense cake, no oven spring in bread.

**sources:** baking tolerance and oven error (home ovens often off by 25–50 °F; use an oven thermometer): [SGC]
(oven calibration concept); [MC] (oven temperature variation); [CI] equipment testing. Effects of hot/cold ovens on
cakes and bread: [McGee] ch.10; [KA-D]. Convection ≈ 25 °F: [CI] + [KA] baking guides. Forgot-to-preheat band:
**provisional: true**. Exact ratio cut-offs: **provisional: true** (sources give ±°F ranges, mapped here).

---

### role: heat-time-bake

- **name:** Bake time — underbaked / overbaked (bread, cakes, cookies, quick breads)
- **does:** baking, pastry.
- **tight:** true.
- **items/aliases (actions):** bake for, bake until, underbaked, raw in the middle, gummy, overbaked, burnt, dry cake.
- **doneness tests (not safety claims):** yeast bread internal **~190 °F** enriched/sandwich, **200–210 °F** lean
  and crusty/rye; quick breads ~200–205 °F; cakes — skewer comes out with a few moist crumbs, centre springs back.

**bands (ratio = actual ÷ recipe bake time) and state rules**

- **yeast bread, underbaked, NOT yet cut:** `[0.7,0.95)` → fixable (`bread-back-in`), even if it has cooled.
  `<0.7` → fixable (`bread-back-in`) but provisional (may stay dense).
- **yeast bread, underbaked and already sliced:** → fixable for slices as toast only; the loaf as a loaf → redo
  (provisional).
- **cakes / quick breads / muffins, underbaked, still hot and uncut:** `[0.8,1.0)` → fixable (`cake-back-in`),
  only if it hasn't sunk.
- **cakes / quick breads underbaked and already cut, or sunk/collapsed, or cooled:** → **redo** (the crust dries
  before the centre sets; a collapsed crumb won't rise again).
- fine: `[0.95,1.10)` with the doneness test passing (recipes give ranges; ovens vary).
- **overbaked, light (dry edges, darker crust):** `[1.10,1.30)` → fixable (`cake-syrup` for cakes; bread: fine — trim
  dark crust if wanted).
- **overbaked heavily / burnt (black base or top, burnt smell):** `≥1.30` or visibly black → bread/cake fixable only
  if burnt is a thin crust (`trim-burnt`), else redo. Cookies browned past edge-golden → fine-to-redo by taste; black
  bottoms → redo.

**rescues**

- `bread-back-in` — kind: none. Uncut loaf back in at the recipe temperature (or ~350 °F), directly on the rack, tent
  if dark, 5–15 min until it sounds hollow and reads ~190–210 °F per type. *Say:* "Pop it back in, straight on the
  rack, for about ten minutes, and check it reaches around 190 to 200 inside."
- `cake-back-in` — kind: none. Return to the oven immediately, 5 min at a time, skewer test. *Say:* "Straight back
  in for five minutes, then test the middle with a skewer."
- `cake-syrup` — kind: add (simple syrup, 1:1 sugar:water, brushed on, ~2–3 tbsp per layer). *Say:* "Brush the cake
  with a little sugar syrup to bring back the moisture." Provisional.
- `trim-burnt` — kind: none. *Say:* "Cut away the burnt crust with a serrated knife — the inside's fine."

**shows:** underbaked — wet sheen, gummy streak at the bottom, centre wobbling, pale crust, sinking when removed,
skewer wet; overbaked — dark/black crust, dry crumbly crumb, pulled-in shrunken edges, burnt smell.

**sources:** bread internal temps & returning an uncut loaf: [KA-T]; [KA-D]; [McGee] ch.10 (starch gelatinisation /
crumb setting). Cut quick bread can't be rescued: [KA-QB]; [McGee] ch.10 (crumb structure sets once; collapse is
permanent) — redo verdict also matches owner's safer-verdict rule. Cake back-in while hot and uncut: [SGC] cake
doneness concept; [KA-D] — **provisional: true** for the 0.8 threshold. `cake-syrup`: pastry practice in [CI]
recipe notes; second trusted source not confirmed → **provisional: true**. Sliced-bread-as-toast: **provisional:
true**. Overbake thresholds: **provisional: true**.

---

## Open questions / uncertainties

1. **Temperature ratios.** A ratio of temperatures is unit-dependent (350 °F vs 177 °C give different ratios for the
   same 25-degree error). This pack expresses temperature bands in °F ratios *and* °F deltas; recommend the code
   encode **deltas** (±°F/°C) for oven and oil and keep ratios only for amounts and times.
2. **Time ratios for proteins are a weak proxy.** Thickness, starting temperature and pan/oven variance dominate.
   The verdict for any protein is driven by the internal-temperature check; the time bands only decide whether to
   *prompt* a check or a rescue. Numeric time thresholds are this pack's synthesis — marked provisional.
3. **Jollof and fried-rice ratios** have no Western food-science reference with tested numbers; jollof is treated as
   absorption rice with a strict over-liquid verdict (redo-texture). A recognised West African cookbook (candidates to
   verify: Lopè Ariyo, *Hibiscus*; Yewande Komolafe, *My Everlasting Mother*) would strengthen it.
4. **Ginger and onion thresholds** rest on McGee alone for mechanism — all provisional.
5. **Overbaked-cake syrup, forgot-to-preheat, and air-fryer load** — practice-based; second trusted source not yet
   confirmed.
6. **Sources not re-read page-by-page for this pass:** book citations are by chapter; the FSIS chart figures were
   confirmed via federal/extension mirrors (FoodSafety.gov, Cornell CCE) rather than the FSIS page itself. Someone
   should spot-check [FSIS-T] and [FSIS-F] URLs and the [CI] items before shipping.
7. **Raw-protein cross-contamination** after a "back in" rescue (boards, tongs, plates that held raw chicken) — the
   rescue line mentions washing; the code may want a separate hygiene prompt.
8. **Burnt-garlic/onion scope.** The verdict is "redo the step", not "redo the dish". The data model needs a
   step-level redo distinct from dish-level redo.
