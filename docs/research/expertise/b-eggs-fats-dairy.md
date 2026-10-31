# Expertise pack B: eggs, fats and dairy (tolerance bands for slip verdicts)

**Purpose.** These are the rules the code uses to decide the verdict when a cook slips with eggs, fats, oils, dairy or cheese: `fine`, `fixable` (with a concrete rescue) or `redo`. Everything here is meant to be encoded as typed data.

**How the bands work.**
- `ratio = actual amount / recipe amount`. Forgot = 0. "Doubled" = 2.
- Each band list goes up in order. The first threshold the ratio falls *below* gives the verdict. The final `above` covers everything else.
- For eggs, count whole eggs: one extra egg in a 2-egg recipe gives ratio 1.5, and one missing egg gives 0.5.

**Owner's rule.** A confident wrong rescue is worse than starting over. When the sources are vague, the band goes to the safer verdict, and that rule is marked `provisional: true`.

**Status of the numbers (read this first).** The sources rarely state a threshold such as "1.25x is fine." They state the mechanism and effect, for example "larger eggs add liquid and increase spread", or "an extra egg makes cookies cakey." The cut-points below are my synthesis of those statements.
- A rule is unmarked when ≥2 sources agree on both the direction and the order of magnitude.
- Where only one source gives the number, or I interpolated it, the rule is marked `provisional: true`.

**Timing qualifier (applies everywhere).** A `fixable` verdict that adds or scales holds only **before the item has been baked, set or cooked through**. Once the batter is in the oven, or the custard has set or the sauce has curdled, the code must fall through to the role's `post-cook` verdict. That verdict is given per role, and it is usually `redo` or `fine-with-effect`.

**Rescue kinds** (as specified): `scale` (enlarge the whole batch proportionally), `add` (add a named role per unit of excess) and `none` (a technique fix, or no fix). Some rescues need a fourth kind, `remove`: taking an unmixed excess back out. Today these are recorded as `kind: none` with `technique: remove-unmixed`. See open questions.

---

## Source key

Each rule below cites these short keys.

| Key | Source |
|---|---|
| MCG-EGG | Harold McGee, *On Food and Cooking* (rev. 2004), ch. "Eggs": sections on egg composition, custards, egg foams, egg-yolk emulsions |
| MCG-MILK | McGee, *On Food and Cooking*, ch. "Milk and Dairy Products": cream and whipping, butter, fermented milks, cheese and melting |
| MCG-SAUCE | McGee, *On Food and Cooking*, ch. "Sauces": emulsified sauces (mayonnaise, hollandaise, beurre blanc) and why they break |
| MCG-DOUGH | McGee, *On Food and Cooking*, ch. "Bread, Cakes, Pastry and Pasta": cake batters and creaming, pastry fat |
| MCG-FAT | McGee, *On Food and Cooking*, ch. "Cooking Methods" and the fats and oils appendix: frying and smoke points |
| SFAH | Samin Nosrat, *Salt Fat Acid Heat* (2017), ch. "Fat" (cold fat in pastry, emulsions, mayonnaise, vinaigrette) and ch. "Acid" (balancing a dressing) |
| FL | J. Kenji López-Alt, *The Food Lab* (2015): ch. on eggs and breakfast; ch. on salads, emulsions, vinaigrettes and mayonnaise; ch. on deep frying |
| SE-CCC | Serious Eats, Kenji López-Alt, "The Food Lab: The Best Chocolate Chip Cookies" (seriouseats.com; URL not fetch-verified because the site blocks the crawler) |
| SE-MAC | Serious Eats, Kenji López-Alt, "The Food Lab: Ultra-Gooey Stovetop Mac and Cheese" (evaporated milk as stabiliser; not fetch-verified) |
| BT | Stella Parks, *BraveTart: Iconic American Desserts* (2017), front-matter technique notes on butter temperature, creaming, eggs and meringue |
| KA-EGG | King Arthur Baking, "Guide for substituting eggs": https://www.kingarthurbaking.com/blog/2021/01/21/guide-for-substituting-eggs-best-egg-replacers |
| KA-BM | King Arthur Baking, "Buttermilk substitute" (tested in biscuits, pancakes and cake): https://www.kingarthurbaking.com/blog/2019/01/28/buttermilk-substitute |
| KA-SHORT | King Arthur Baking, "Shortening vs. butter in baking": https://www.kingarthurbaking.com/blog/2016/11/16/shortening-vs-butter-in-baking |
| KA-OILCAKE | King Arthur Baking, oil for a moist cake: https://www.kingarthurbaking.com/blog/2022/06/28/oil-for-moist-rich-cake-like-boxed-mix |
| KA-COOKIE | King Arthur Baking, "Cookie chemistry" (equal-volume fat swaps): https://www.kingarthurbaking.com/blog/2015/07/09/cookie-chemistry |
| KA-SPREAD | King Arthur Baking, "Why are my cookies spreading?": https://www.kingarthurbaking.com/blog/2023/12/19/why-are-my-cookies-spreading |
| KA-CURDLE | King Arthur Baking, preventing curdled cake batter: https://www.kingarthurbaking.com/blog/2021/08/11/preventing-curdled-cake-batter-emulsions |
| KA-BUTTERCAKE | King Arthur Baking, "Building a better butter cake": https://www.kingarthurbaking.com/blog/2015/03/16/building-better-butter-cake |
| ATK-CULT | America's Test Kitchen, "How to substitute cultured dairy products": https://www.americastestkitchen.com/how_tos/5525-how-to-substitute-cultured-dairy-products |
| ATK-MAYO | Cook's Illustrated, "How to fix broken mayo": https://www.americastestkitchen.com/cooksillustrated/how_tos/13363-how-to-fix-broken-mayo |
| ATK-BROKEN | America's Test Kitchen, "How to fix a broken sauce" (pan sauces): https://www.americastestkitchen.com/articles/6748-how-to-fix-a-broken-sauce |
| ATK-CHEESE | America's Test Kitchen, "The gooey science of melting cheese": https://www.americastestkitchen.com/articles/6836-the-gooey-science-of-melting-cheese |
| ATK-CITRATE | Cook's Illustrated, "Cook's Illustrated explains: sodium citrate": https://www.americastestkitchen.com/articles/7649-cook-s-illustrated-explains-sodium-citrate |
| ATK-EGGSUB | America's Test Kitchen, egg substitutes taste test (failed in popovers): https://www.americastestkitchen.com/taste_tests/131-egg-substitutes |
| MC | Myhrvold et al., *Modernist Cuisine at Home* (2012), mac and cheese with sodium citrate (about 4 g citrate per 100 g cheese); summary at https://modernistcuisine.com/tag/mac-and-cheese/ |
| USDA-AMS | USDA AMS *Egg-Grading Manual* (Agric. Handbook 75), weight classes (Large = minimum 24 oz per dozen, in shell): https://www.ams.usda.gov/sites/default/files/media/Egg%20Grading%20Manual.pdf |
| NCSU-EGG | NC State Extension (Polk Co.), "Egg substitutes": https://polk.ces.ncsu.edu/2025/03/egg-substitutes |
| FSIS-FRY | USDA FSIS, "Deep fat frying and food safety": https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/deep-fat-frying (the page returned 403 to the crawler; content not re-verified) |

**Reference facts used throughout.**
- **Egg weight.** A US large egg weighs about 50 g out of the shell: roughly 30 g white and 18–20 g yolk. In the shell it is ≥ 56.7 g (USDA-AMS, KA-SPREAD, MCG-EGG). Medium is about 44 g and jumbo about 63 g out of the shell, so swapping egg sizes changes the egg amount by roughly ±20–25%.
- **Butter** is about 80–82% fat, 16–18% water and 1–2% milk solids. **Shortening and oil** are 100% fat (KA-SHORT, MCG-MILK).

---

## EGGS

### role: egg-structure
- **name:** Eggs as binder and structure
- **does:**
  - **baking:** coagulating proteins set the crumb of cakes, muffins, quick breads, cookies and brownies. They also add moisture (eggs are about 75% water), emulsify the fat and help leavening.
  - **other (coatings and meatballs):** egg glues crumbs and holds a mixture together.
  - Sources: MCG-EGG, KA-EGG.
- **tight:** true for baking; false for coatings and meatballs.
- **items/aliases:** egg, whole egg, large egg, beaten egg, "eggs, room temperature", egg substitute (carton), liquid egg (about 1/4 cup or 50 g = 1 egg).
- **bands:**
  - **baking:**
    - below 0.75 → fixable (rescue: add-missing-egg)
    - below 1.26 → fine. This covers one size off (medium for large, or jumbo for large) and one extra egg in a recipe with 4 or more eggs.
    - below 2.01 → fixable (rescue: scale-batch)
    - above → redo
    - post-cook: below 0.75 → redo (crumbly, falls apart); above 1.26 → fine-with-effect (cakier, spongier, eggier, drier).
    - Sources: KA-SPREAD (larger eggs add liquid and increase spread; a large egg is 50 g), KA-EGG (the more eggs changed, the more the result differs), MCG-EGG (excess egg toughens and dries). The 1.26 cut equals the jumbo/large weight ratio from USDA-AMS. `provisional: true` for the exact cut-points.
  - **baking, recipe has 1 egg, and the cook used 2 (ratio 2.0):**
    - fixable (rescue: scale-batch) when the batter is not yet mixed into the dry ingredients
    - otherwise redo for cakes; fine-with-effect for cookies and brownies (cakier and puffier)
    - Sources: KA-SPREAD, SE-CCC (more egg makes cookies cakier and puffier). `provisional: true`.
  - **other (breading wash, meatball and meatloaf binder):**
    - below 0.5 → fixable (rescue: add-missing-egg, or sub-breading-wash)
    - below 2.5 → fine
    - above → fixable (rescue: add-dry-binder for meatballs; for a wash, just use what is needed)
    - Sources: FL (breading: flour, then egg, then crumbs), MCG-EGG. `provisional: true`.
  - **default:** same as baking.
- **rescues:**
  - **add-missing-egg** — `kind: add`
    - add: role egg-structure, 1 whole egg per missing egg. Beat it in a cup first, then fold or mix in just until combined.
    - conditions: batter or dough not yet baked. For creamed cakes, if the flour is already in, mix on low for no more than 15–20 s to avoid toughening.
    - say: "Not to worry. Beat the missing egg in a cup and mix it in just until it disappears."
    - Sources: KA-CURDLE (eggs can go in after some of the flour), MCG-DOUGH (overmixing after the flour develops gluten). `provisional: true` for creamed cakes.
  - **scale-batch** — `kind: scale`
    - factor = eggs used ÷ eggs in the recipe; multiply every other ingredient by the same factor.
    - conditions: factor ≤ 2.0; pans or oven can take the larger batch; the extra egg is already mixed in. If the egg is still unmixed in its own bowl, take it out instead (technique remove-unmixed).
    - say: "We'll simply make a little more. Scale everything else up to match the eggs."
    - Sources: KA-EGG, MCG-DOUGH (proportions decide structure).
  - **sub-breading-wash** — `kind: none`
    - Use milk or buttermilk, a thin mayonnaise, or mustard thinned with water as the wash.
    - say: "No egg? Dip in a little buttermilk instead, and the crumbs will still cling."
    - Sources: FL. `provisional: true` (single source; adhesion is weaker).
  - **add-dry-binder** — `kind: add`
    - add: 2 Tbsp fine breadcrumbs per extra egg to a meatball or meatloaf mix.
    - say: "The mix is wet. Work in two spoonfuls of breadcrumbs for that extra egg."
    - `provisional: true` (one-source reasoning from MCG-EGG; no tested ratio found).
- **substitutions (per 1 egg, baking):**
  - **Aquafaba:** 1/4 cup (57 g). The best general swap, but it gives little structure. Sources: KA-EGG, NCSU-EGG.
  - **Flax or chia "egg":** 1 Tbsp ground seed + 3 Tbsp (42 g) water, rested 5–10 min. Good for cookies, brownies and muffins; denser. Sources: KA-EGG, NCSU-EGG.
  - **Banana, pumpkin or applesauce:** 1/4 cup (57–64 g). Good for quick breads and muffins; denser and flavoured; makes cookies cakey. Sources: KA-EGG, NCSU-EGG.
  - **Plain or Greek yogurt or buttermilk:** 1/4 cup. Good for muffins and pancakes; heavier. Sources: KA-EGG, NCSU-EGG.
  - **Limits:**
    - Replace at most 2 eggs. With 3 or more eggs → redo.
    - Popovers, sponge, chiffon and angel food cakes, soufflés, quiche and custards → no substitution (redo).
    - Sources: KA-EGG, ATK-EGGSUB (substitutes failed in popovers), NCSU-EGG.
- **changes:**
  - **less:** up to 25% less (for example 3 eggs for 4, or medium for large) is safe; drier and more crumbly. Sources: KA-SPREAD, KA-EGG. `provisional: true`.
  - **more:** up to 25% more is safe; puffier, cakier, more spread in cookies. Sources: KA-SPREAD, SE-CCC.
  - Using yolks only for a whole egg (2 yolks per egg): richer and chewier, safe in cookies and brownies. Sources: SE-CCC, BT.
- **shows:**
  - Too little: dry, crumbly batter that won't hold together, and a pale crumb.
  - Too much: loose, shiny, runny batter. After baking: domed, springy, eggy-smelling, rubbery edges. Cookies puff instead of spreading.
  - Camera cue: count the shells on the counter.

### role: egg-foam
- **name:** Whipped eggs and whites as leavening and foam
- **does:**
  - **baking/pastry:** beaten whites (meringue, soufflé, angel food, chiffon) or whole eggs beaten to the ribbon (génoise) trap air, which is the main lift.
  - Any fat, including yolk, stops whites from foaming. Overbeaten whites go grainy and weep.
  - Sources: MCG-EGG, BT.
- **tight:** true
- **items/aliases:** egg whites, whites, meringue, stiff peaks, whipped eggs, ribbon stage, aquafaba (a foam substitute only).
- **bands:**
  - **pastry and baking (default):**
    - below 0.85 → fixable (rescue: add-missing-egg, before whipping only; after the foam is folded in → redo)
    - below 1.15 → fine
    - below 2.01 → fixable (rescue: scale-batch, before whipping only)
    - above → redo
    - post-fold: any ratio outside 0.85–1.15 → redo
    - Sources: MCG-EGG (foam is what lifts), KA-EGG (folded-white recipes are hard to adapt), BT. `provisional: true` for 0.85/1.15.
  - **yolk or fat in the whites (special slip, any ratio):** more than a trace of yolk → redo the whites; keep the contaminated whites for scrambling. A tiny speck can be lifted out with a piece of eggshell before whipping → fine.
    - Sources: MCG-EGG (yolk fat interferes with foaming), BT, FL.
  - **overwhipped whites (dry, grainy, clumpy):** fixable (rescue: rescue-overwhipped-whites) when only slightly grainy; redo if clumped and weeping.
    - Sources: MCG-EGG (adding a fresh white re-wets overbeaten foam), BT. `provisional: true` for the cut between slight and severe.
- **rescues:**
  - **rescue-overwhipped-whites** — `kind: add`
    - add: role egg-foam, 1 fresh unbeaten white per 4 whites already whipped; whisk briefly, about 20–30 s.
    - conditions: not yet folded in; whites only slightly grainy.
    - say: "They've gone a touch too far. Add one fresh white and whisk briefly, and they'll smooth."
    - Sources: MCG-EGG. `provisional: true` (one strong source).
  - **scale-batch** and **add-missing-egg:** as under egg-structure, but only before whipping.
- **substitutions:**
  - Aquafaba for whites: 3 Tbsp ≈ 1 white, 1/4 cup per whole egg. Meringue only works with a stabiliser such as cream of tartar. Sources: KA-EGG, NCSU-EGG.
  - Whole egg for a whipped-white recipe → redo. Sources: KA-EGG, MCG-EGG.
- **changes:**
  - **less:** ≤ 15% → fine (slightly lower rise).
  - **more:** ≤ 15% → fine (slightly drier).
  - `provisional: true`.
- **shows:**
  - Yolk streak in the whites; whites that will not pass soft peak after 3–4 min of beating.
  - Overbeaten: cottony, lumpy, dull, with liquid at the bottom.
  - Deflated: batter turns runny and glossy after folding. Sunken soufflé or cake.

### role: egg-emulsifier
- **name:** Egg yolk as emulsifier
- **does:**
  - **sauce:** mayonnaise, aioli, Caesar dressing, hollandaise and béarnaise. Lecithin and proteins in the yolk coat the oil or butter droplets.
  - One yolk can carry far more oil than recipes use. The usual failures are adding oil too fast, too little water phase, or too much heat (hollandaise curdles at roughly 75–80 °C / 165–175 °F).
  - Sources: MCG-SAUCE, SFAH, FL.
- **tight:** true for the method; false for the yolk amount.
- **items/aliases:** egg yolk, yolks, raw yolk, mayo base, coddled egg.
- **bands:**
  - **sauce (cold emulsions: mayo, aioli, Caesar):**
    - below 0.01 (forgot) → fixable (rescue: add-missing-egg — add the yolk before any oil, or treat as a broken emulsion if the oil is already in)
    - below 0.5 → fine (one yolk still holds about 1 cup of oil if added slowly)
    - below 3.01 → fine (richer, thicker; thin with water or lemon)
    - above → fixable (rescue: scale-batch, i.e. whisk in more oil slowly)
    - Sources: MCG-SAUCE (yolk capacity is large), SFAH (mayonnaise method), FL.
  - **sauce (hot emulsions: hollandaise, béarnaise):**
    - below 0.75 → fixable (add a yolk with 1 Tbsp water, then whisk the sauce into it)
    - below 1.5 → fine
    - above → fine (thicker; thin with warm water)
    - The yolk amount is forgiving. The heat is not: a curdled, grainy hollandaise → redo.
    - Sources: MCG-SAUCE, FL. `provisional: true` for the 0.75 cut.
  - **broken cold emulsion (oil added too fast; greasy, curdled look):** fixable (rescue: rebuild-emulsion).
    - Sources: ATK-MAYO, MCG-SAUCE, SFAH.
  - **broken hot emulsion, separated but not scrambled:** fixable (rescue: rebuild-emulsion with a fresh yolk over gentle heat).
  - **hot emulsion scrambled (curds visible):** redo.
    - Sources: MCG-SAUCE, FL.
- **rescues:**
  - **rebuild-emulsion** — `kind: add`
    - Either 4 tsp water (ATK-MAYO), or 1 fresh yolk with 1 tsp water or mustard (MCG-SAUCE, SFAH), in a clean bowl.
    - Whisk in the broken sauce a teaspoon at a time until it thickens, then in a thin stream.
    - conditions: the sauce is broken but not scrambled.
    - say: "It's split, which is easily mended. A fresh yolk in a clean bowl, then whisk the sauce back in a spoonful at a time."
    - Sources: ATK-MAYO, MCG-SAUCE, SFAH.
- **substitutions:**
  - Whole egg for yolk in a blender mayo: 1 whole egg ≈ 2 yolks. Lighter and looser. Sources: FL, MCG-SAUCE.
  - Store-bought mayo as a base for aioli or Caesar → fine. Sources: SFAH, FL. `provisional: true`.
  - No egg → redo, or use a mustard vinaigrette instead.
- **changes:**
  - **less yolk:** down to 0.5 → fine if the oil goes in slowly.
  - **more yolk:** up to 3× → fine (richer).
  - Sources: MCG-SAUCE, SFAH.
- **shows:**
  - Broken: oily puddles, a thin curdled look, oil sheen on top that won't come back.
  - Scrambled hollandaise: grainy, visible curds, steam.
  - Healthy: thick, glossy, holds a ribbon.

### role: egg-custard-set
- **name:** Eggs setting a custard
- **does:**
  - **pastry/baking/eggs:** quiche, crème brûlée, flan, pumpkin pie, bread pudding, cheesecake.
  - Egg proteins gel the dairy. You need roughly 1 whole egg (or 2–3 yolks) per cup (240 ml) of milk or cream for a firm set. Too hot curdles; too little egg won't set.
  - Sources: MCG-EGG, BT.
- **tight:** true
- **items/aliases:** eggs, yolks, custard base, quiche filling, flan.
- **bands:**
  - **pastry/baking (default):**
    - below 0.75 → fixable (rescue: add-missing-egg before baking); after baking → redo (won't slice, weeps)
    - below 1.34 → fine (firmer, eggier)
    - below 2.01 → fixable (rescue: scale-batch: more dairy to match, before baking only)
    - above → redo
    - Sources: MCG-EGG (egg-to-liquid ratio controls the set), KA-EGG (custard pies can't be adapted). `provisional: true` for 1.34.
  - **egg-free custard requested ("I don't have eggs"):** redo, or choose an egg-free recipe. Sources: KA-EGG, NCSU-EGG.
- **rescues:** add-missing-egg (whisk the egg into the base before it goes in the oven); scale-batch (more dairy, sugar and flavour per extra egg). Same conditions as above.
- **substitutions:** none safe. Sources: KA-EGG, ATK-EGGSUB.
- **changes:**
  - **less:** ≤ 10% (one medium for one large) → fine.
  - **more:** ≤ 33% → fine (firmer, more rubbery).
  - `provisional: true`.
- **shows:**
  - Too little: liquid centre that won't jiggle as one mass; weeps when cut.
  - Too much: rubbery, puffed, cracked top; eggy smell.
  - Overheated: bubbles, a curdled grainy texture, liquid weeping out.

---

## SOLID FATS

### role: fat-creamed
- **name:** Butter or shortening, creamed or softened, in baking
- **does:**
  - **baking:** creaming soft fat (about 18–21 °C / 65–70 °F) with sugar traps air for lift, tenderises, and carries flavour in cakes and cookies.
  - Butter melts lower than shortening, so it spreads more. Melted butter skips the aeration, giving denser and chewier results.
  - Sources: MCG-DOUGH, BT, KA-SHORT, KA-SPREAD, SE-CCC.
- **tight:** true
- **items/aliases:** butter, unsalted butter, salted butter, softened butter, room-temperature butter, shortening, vegetable shortening, Crisco, margarine (stick), vegan butter (stick), lard (in cookies).
- **bands:**
  - **baking (cakes):**
    - below 0.85 → fixable (rescue: add-more-fat, only while still at the creaming stage; once the flour is in → redo)
    - below 1.15 → fine
    - below 2.01 → fixable (rescue: scale-batch)
    - above → redo
    - post-bake: outside 0.85–1.15 → fine-with-effect (greasy or dry); not redo-worthy unless it sank.
    - Sources: MCG-DOUGH (fat-to-flour balance), KA-BUTTERCAKE, BT. `provisional: true` for the cut-points.
  - **baking (cookies, brownies, bars):**
    - below 0.75 → fixable (rescue: add-more-fat — softened butter beats in fine even after the flour, because cookies tolerate mixing)
    - below 1.2 → fine
    - below 2.01 → fixable (rescue: scale-batch, or chill-dough for ratios 1.2–1.4)
    - above → redo
    - Sources: KA-SPREAD (more butter and warmer butter cause more spread; chill 30–60 min), SE-CCC, KA-COOKIE. `provisional: true`.
  - **melted instead of softened (a state slip, ratio 1):**
    - cookies, brownies, bars → fine (chewier, denser; chill the dough 30–60 min before baking)
    - cakes, butter not yet mixed → fixable (rescue: re-solidify-butter)
    - cakes, butter already mixed with the sugar → fixable (rescue: chill the butter–sugar mix 15–20 min until it is firm-soft, then cream; `provisional: true`)
    - cakes, eggs or flour already in → redo
    - Sources: SE-CCC, KA-SPREAD, BT.
  - **too cold or hard (won't cream):** fixable (rescue: warm-butter — cut into 1 cm cubes and wait 15–20 min, or warm the bowl briefly over hot water). Sources: KA-BUTTERCAKE, BT.
  - **curdled creamed batter (after adding eggs):** fixable (rescue: fix-curdled-batter). Sources: KA-CURDLE, KA-BUTTERCAKE.
  - **default:** cakes band.
- **rescues:**
  - **add-more-fat** — `kind: add`
    - add: role fat-creamed, the missing amount of softened butter; beat 30–60 s.
    - conditions: cakes only before the flour goes in; cookies any time before baking.
    - say: "Soften the rest of the butter and beat it in now."
    - Sources: KA-BUTTERCAKE, BT. `provisional: true`.
  - **scale-batch** — `kind: scale`: multiply everything else by the fat ratio. Limit 2×. Sources: MCG-DOUGH, KA-SPREAD.
  - **chill-dough** — `kind: none`
    - Refrigerate the cookie dough 30–60 min before baking.
    - say: "A touch rich, so chill the dough half an hour and it will hold its shape."
    - Sources: KA-SPREAD, SE-CCC.
  - **re-solidify-butter** — `kind: none`
    - Refrigerate the melted butter 20–30 min, stirring every 5 min, until it is like soft clay (about 18 °C), then cream as normal.
    - say: "Pop it in the fridge and stir now and then until it's soft but solid, then carry on."
    - Sources: BT, KA-SPREAD. `provisional: true` (the aeration is weaker).
  - **fix-curdled-batter** — `kind: add`
    - add: 2 Tbsp of the recipe's own flour per curdled look (up to 3–4 Tbsp in total), or warm the bowl 10 s over hot water.
    - say: "It's curdling. Add two spoonfuls of the flour and it will come back together."
    - Sources: KA-CURDLE, KA-BUTTERCAKE.
- **substitutions:**
  - **Shortening for butter:** 1:1 by volume. Less spread; crumblier, sandier cookies; a taller, more tender cake; no butter flavour. Sources: KA-SHORT, KA-COOKIE.
  - **Butter for shortening:** 1:1, plus chill the dough (more spread). Sources: KA-SHORT, KA-SPREAD.
  - **Oil for butter in creamed recipes:** cookies → greasy and crumbly with an off flavour, so avoid (redo-level). Cakes → swap at most 25% of the butter volume for oil (a moister cake). Sources: KA-COOKIE, KA-OILCAKE.
  - **Salted for unsalted:** 1:1. Cut the recipe salt by about 1/4 tsp per 1/2 cup (113 g) butter. `provisional: true` (common US test-kitchen guidance; no second source fetched).
- **changes:**
  - **less:** to 0.85 (cakes) or 0.75 (cookies): drier, tougher, less spread.
  - **more:** to 1.15 (cakes) or 1.2 (cookies): greasier, more spread, flatter.
  - Sources: KA-SPREAD, MCG-DOUGH. `provisional: true` for the exact fractions.
- **shows:**
  - Melted or warm butter: glossy, slick, flat batter with no fluff, and a pale yellow pool.
  - Curdled batter: lumpy, cottage-cheese look with weeping liquid.
  - Too much fat: greasy dough that shines and smears the bowl; cookies spread into thin lacy discs.
  - Too little: dry, crumbly dough that won't hold in a scoop.

### role: fat-cold-cut
- **name:** Cold butter or shortening cut into pastry and biscuits
- **does:**
  - **pastry/baking:** pie crust, biscuits, scones, rough puff, laminated dough. Solid cold pieces of fat separate the flour layers; their water steams for flake.
  - Warm or melted fat makes the pastry tough, greasy and flat.
  - Sources: SFAH (ch. Fat: "keep fat cold"), MCG-DOUGH, KA-SHORT.
- **tight:** true
- **items/aliases:** cold butter, cubed butter, frozen grated butter, shortening, lard, leaf lard.
- **bands:**
  - **pastry:**
    - below 0.75 → fixable (rescue: add-more-fat, cold and cubed, before the water goes in; after the water → redo-level tough, but still edible)
    - below 1.2 → fine
    - below 1.5 → fixable (rescue: scale-batch, adding flour and liquid to match)
    - above → redo (crumbles, leaks, slumps)
    - Sources: MCG-DOUGH, SFAH, KA-SHORT. `provisional: true` for the cut-points.
  - **fat too warm or soft (a state slip):** fixable (rescue: chill-pastry).
  - **fat fully melted into the dough:** redo for flaky pastry; fine-with-effect (a tender, crumbly, press-in crust).
  - Sources: SFAH, MCG-DOUGH, KA-SPREAD (chilling firms the fat).
- **rescues:**
  - **chill-pastry** — `kind: none`
    - Refrigerate 30 min (or freeze 10–15 min) before rolling or baking.
    - say: "It's gone soft. Into the fridge for half an hour, then we roll."
    - Sources: SFAH, KA-SPREAD.
  - **add-more-fat** — `kind: add`: cold cubes, cut in to pea size. Sources: SFAH, MCG-DOUGH. `provisional: true`.
  - **scale-batch** — `kind: scale`: limit 1.5×. Sources: MCG-DOUGH. `provisional: true`.
- **substitutions:** shortening or lard for butter 1:1 → more tender and flaky, less flavour; half and half is common. Sources: KA-SHORT, MCG-DOUGH.
- **changes:**
  - **less:** to 0.75 (tougher).
  - **more:** to 1.2 (more fragile, greasier).
  - `provisional: true`.
- **shows:**
  - Warm fat: sticky, greasy dough that smears on the board, with no visible butter flecks.
  - Too much fat: dough tears and leaks butter in the oven, and the crust slumps.
  - Good: visible pea-sized butter streaks.

### role: fat-cooking
- **name:** Butter or solid fat for cooking and finishing
- **does:**
  - **saute/roast:** browning medium. Butter's milk solids burn above about 175 °C / 350 °F; clarified butter, ghee or oil go hotter.
  - **sauce:** finishing a pan sauce (monter au beurre), beurre blanc, roux (fat to flour about 1:1 by weight).
  - **grains:** richness.
  - Sources: MCG-MILK, MCG-SAUCE, SFAH.
- **tight:** false; true only for beurre blanc and other butter emulsions.
- **items/aliases:** butter, ghee, clarified butter, brown butter, beurre noisette, bacon fat, duck fat, lard, schmaltz.
- **bands:**
  - **saute/roast/grains (default):**
    - below 0.34 → fixable (rescue: add-more)
    - below 2.01 → fine
    - below 4.01 → fixable (rescue: pour-off-fat)
    - above → fixable (pour-off-fat)
    - Sources: SFAH, MCG-FAT. `provisional: true`.
  - **sauce (pan sauce finished with butter):**
    - below 0.5 → fixable (add-more)
    - below 1.6 → fine
    - above → fixable (rescue: re-emulsify-pan-sauce)
    - Sources: ATK-BROKEN, MCG-SAUCE.
  - **sauce (roux):**
    - below 0.75 → fixable (add-more: add fat, then cook 1 min)
    - below 1.35 → fine
    - above → fixable (skim the excess fat off the finished sauce; `provisional: true`)
    - Sources: MCG-SAUCE, FL. `provisional: true`.
  - **butter burnt (black specks, acrid):** redo the fat — wipe the pan and start the fat again. Brown, nutty butter is fine. Sources: MCG-MILK, SFAH.
- **rescues:**
  - **add-more** — `kind: add`: add the missing fat and let it heat. Sources: SFAH, MCG-FAT.
  - **pour-off-fat** — `kind: none`
    - Tilt the pan and spoon off the excess.
    - say: "Too much fat, so tip the pan and spoon off the extra."
    - Sources: SFAH, FL.
  - **re-emulsify-pan-sauce** — `kind: add`
    - add: about 1/4 cup water to the pan, then whisk at a vigorous simmer. No flour or cornstarch.
    - say: "It's turned greasy. A splash of water, whisk hard at a simmer, and it'll come back."
    - Sources: ATK-BROKEN, MCG-SAUCE.
- **substitutions:**
  - Oil for butter in sautéing: 1:1 → fine (less flavour, higher smoke point).
  - Ghee for butter: 1:1 → fine.
  - Sources: MCG-FAT, SFAH.
- **changes:**
  - **less:** to 0.5 → fine (sticking risk).
  - **more:** to 2 → fine (richer); beyond that, pour off.
  - Sources: SFAH. `provisional: true`.
- **shows:**
  - Smoking, blackening butter. Food swimming in fat.
  - Broken pan sauce: fat beading or pooling on the surface.
  - Too little fat: food sticks and browns unevenly.

---

## LIQUID FATS AND OILS

### role: oil-baking
- **name:** Oil as the fat in batters
- **does:**
  - **baking:** oil cakes (chiffon, carrot, chocolate), muffins, quick breads, brownies, olive oil cake.
  - Oil coats the flour and stays liquid, so the crumb is moist and tender. There is no aeration role.
  - Sources: KA-OILCAKE, MCG-DOUGH.
- **tight:** true (moderately)
- **items/aliases:** vegetable oil, canola, neutral oil, sunflower, grapeseed, light olive oil, extra-virgin olive oil (EVOO), melted coconut oil.
- **bands:**
  - **baking:**
    - below 0.75 → fixable (rescue: add-more-oil, any time before baking; oil stirs in easily)
    - below 1.15 → fine
    - below 2.01 → fixable (rescue: scale-batch)
    - above → redo
    - post-bake: under 0.75 → dry but edible; over 1.15 → greasy, dense, may sink. Both are fine-with-effect, not redo.
    - Sources: KA-OILCAKE, MCG-DOUGH, KA-COOKIE (too much oil gives a greasy, crumbly result). `provisional: true` for the cut-points.
  - **default:** baking.
- **rescues:**
  - **add-more-oil** — `kind: add`: the missing oil; stir until just combined. Sources: KA-OILCAKE, MCG-DOUGH. `provisional: true`.
  - **scale-batch** — `kind: scale`: limit 2×. Sources: MCG-DOUGH, KA-OILCAKE.
- **substitutions:**
  - **Melted butter for oil:** 1:1 by volume plus about 1 Tbsp extra per 1/2 cup (butter is about 20% water). Slightly drier; firms when cold. Sources: KA-SHORT (butter composition), KA-OILCAKE. `provisional: true` for the "+1 Tbsp".
  - **Oil for melted butter (a melted-butter recipe):** 3/4 the volume (oil is 100% fat; butter is 80%). Sources: KA-SHORT (composition), KA-OILCAKE (oil weighs less and adds tenderness). `provisional: true` because the low-trust web disagrees (some sites say 1:1). The safer lower amount is recorded.
  - **EVOO for neutral oil:** 1:1 → fine; adds a peppery flavour. Sources: SFAH, KA-OILCAKE. `provisional: true`.
- **changes:**
  - **less:** to 0.75 (drier).
  - **more:** to 1.15 (moister, greasier).
  - `provisional: true`.
- **shows:**
  - Too much: batter glistens and oil separates at the edges; the baked crumb is oily and dense with a sunken centre.
  - Too little: thick, pasty batter.

### role: oil-frying
- **name:** Oil for deep and shallow frying
- **does:**
  - **saute/other:** heat transfer.
  - Deep frying: the food is submerged at 175–190 °C / 350–375 °F.
  - Shallow frying: oil about 1/2 the food's height, or about 1 cm.
  - Too little oil, or overcrowding, makes the temperature crash and the food greasy. Too much oil risks an overflow fire.
  - Sources: MCG-FAT, FL (deep-frying chapter), FSIS-FRY.
- **tight:** false for the amount; true for safety (fill level, temperature).
- **items/aliases:** frying oil, vegetable oil, peanut oil, canola, rice bran oil, sunflower, shortening (for frying), lard, olive oil.
- **bands:**
  - **saute (shallow fry):**
    - below 0.5 → fixable (rescue: add-more, then reheat before adding food)
    - below 2.01 → fine
    - above → fine, but check the fill-level rule
    - Sources: FL, MCG-FAT. `provisional: true`.
  - **other (deep fry):**
    - below 0.75 → fixable (rescue: add-more and fry in smaller batches, or switch to shallow-fry-and-turn)
    - below 1.5 → fine
    - above → fixable (rescue: remove-excess-oil)
    - **Fill-level rule, independent of the recipe:** oil deeper than half the pot → remove the excess BEFORE heating. If the oil is already hot, turn off the heat and do not move the pot. Never add water.
    - Sources: FL, FSIS-FRY, MCG-FAT. `provisional: true` for 0.75. The fill rule is in both FL and FSIS-FRY.
  - **wrong oil (EVOO or unrefined oil for deep frying):**
    - EVOO up to 175 °C / 350 °F → fine.
    - At 190 °C+ → fixable (lower the temperature to 175 °C and fry a little longer).
    - Smoking oil → turn off the heat, cool, and replace (redo the oil).
    - Sources: MCG-FAT (smoke points), FL. Sources disagree on EVOO for deep frying, so the safer cap is recorded.
- **rescues:**
  - **add-more** — `kind: add`
    - Add oil up to the needed depth; let it recover to the target temperature (check with a thermometer) before adding food.
    - say: "Add a little more oil and let it come back to temperature before the next piece."
    - Sources: FL, MCG-FAT.
  - **remove-excess-oil** — `kind: none` (technique remove)
    - Only while the oil is cold: ladle oil out until the pot is no more than half full.
    - say: "That's too full to fry safely. Before you turn the heat on, ladle some out until it's half full."
    - Sources: FL, FSIS-FRY.
- **substitutions:**
  - Any refined neutral oil 1:1 (peanut, canola, rice bran) → fine.
  - Butter for frying → redo for deep frying (it burns); fine for a gentle shallow fry.
  - Sources: MCG-FAT, FL.
- **changes:**
  - **less:** shallow down to 0.5.
  - **more:** any amount, within the half-pot rule.
  - Sources: FL, FSIS-FRY.
- **shows:**
  - Too little or too cold: food sits in still oil with few bubbles and comes out pale and greasy.
  - Too hot: smoke, fast darkening, a raw centre.
  - Overfull: oil near the rim, and violent foam when food goes in.

### role: oil-dressing
- **name:** Oil in dressings, vinaigrettes and finishing
- **does:**
  - **sauce/other:** a vinaigrette starts at about 3 parts oil to 1 part acid, adjusted to taste. Mustard, honey or yolk keeps it emulsified.
  - Drizzled EVOO finishes a dish.
  - Sources: SFAH (Fat and Acid), FL (vinaigrette chapter), MCG-SAUCE.
- **tight:** false
- **items/aliases:** olive oil, extra-virgin olive oil, EVOO, salad oil, nut oil, sesame oil (flavouring; see note).
- **bands:**
  - **sauce (vinaigrette):**
    - below 0.34 → fixable (rescue: add-more-oil)
    - below 0.67 → fixable (rescue: add-more-oil; sharp but balanced by taste)
    - below 1.5 → fine
    - below 3.01 → fixable (rescue: balance-acid)
    - above → fixable (rescue: scale-batch: more of everything else)
    - Sources: SFAH, FL, MCG-SAUCE.
  - **sesame oil or a strong nut oil (a flavouring, not the base):**
    - below 2.01 → fine
    - above → fixable (scale-batch). Above 4 → redo (bitter, overpowering).
    - `provisional: true` (no trusted pair found).
- **rescues:**
  - **balance-acid** — `kind: add`
    - add: role acid (vinegar or citrus), 1 part per 3 parts excess oil, plus a pinch of salt; whisk and taste.
    - say: "It's oily. Add a spoon of vinegar for every three of extra oil, with a pinch of salt, then taste."
    - Sources: SFAH, FL.
  - **add-more-oil** — `kind: add`: 3 parts oil per extra part of acid. Sources: SFAH, FL.
  - **scale-batch** — `kind: scale`: no hard limit; keep the leftover. Sources: SFAH, FL.
  - **broken vinaigrette:** fine (shake again); add 1/2 tsp mustard per 1/4 cup to stabilise. Sources: FL, MCG-SAUCE.
- **substitutions:**
  - Any neutral oil for EVOO 1:1 → fine (milder).
  - EVOO for neutral oil → fine; it may solidify in the fridge.
  - Sources: SFAH, MCG-FAT.
- **changes:** both directions are freely adjustable to taste, between 0.67 and 1.5. Sources: SFAH, FL.
- **shows:** a pool of oil on the plate or leaves; dressing separating into layers (normal for an unemulsified vinaigrette).

### role: oil-cooking
- **name:** Oil for sautéing and roasting
- **does:**
  - **saute/roast/braise/grains:** browning and heat transfer, and stops sticking. About 1–2 Tbsp per pan, or about 1 Tbsp per 450 g of vegetables for roasting.
  - Sources: SFAH, MCG-FAT.
- **tight:** false
- **items/aliases:** cooking oil, olive oil, vegetable oil, avocado oil, canola, spray oil.
- **bands:**
  - **default:**
    - below 0.34 → fixable (rescue: add-more)
    - below 3.01 → fine
    - above → fixable (rescue: pour-off-fat; for roasting, drain on a rack or paper towel)
    - Sources: SFAH, FL. `provisional: true` for the numbers.
- **rescues:** add-more (`kind: add`) and pour-off-fat (`kind: none`), as under fat-cooking.
- **substitutions:**
  - Butter for oil → fine at moderate heat; use ghee for high heat.
  - EVOO for neutral oil → fine at sauté heat.
  - Sources: MCG-FAT, SFAH.
- **changes:**
  - **less:** to 0.5 (sticking).
  - **more:** to 3 (greasy; pour off).
- **shows:** dry pan and food sticking, smoke; or food deep in oil, with a greasy roast pan.

---

## CULTURED AND FRESH DAIRY

### role: dairy-liquid
- **name:** Milk and cream as the liquid
- **does:**
  - **baking:** hydrates the flour, adds tenderness and browning (lactose and protein).
  - **sauce:** béchamel and cream sauces.
  - **eggs:** custards (see egg-custard-set).
  - **braise/grains:** a creamy liquid.
  - Cream with ≥ 25% fat can boil without curdling. Milk curdles with acid and heat.
  - Sources: MCG-MILK, SFAH.
- **tight:** true for baking; false for sauces and grains.
- **items/aliases:** milk, whole milk, 2%, skim, half-and-half, light cream, single cream, heavy cream, whipping cream, double cream, evaporated milk, non-dairy milk.
- **bands:**
  - **baking (batters and doughs):**
    - below 0.8 → fixable (rescue: add-more-liquid before baking)
    - below 1.15 → fine
    - below 1.5 → fixable (rescue: scale-batch, or for doughs add flour, 1 Tbsp at a time, until it feels right; `provisional: true`)
    - above → fixable (scale-batch) up to 2.0, then redo
    - Sources: MCG-DOUGH, KA-BM (liquid swaps change rise and texture). `provisional: true` for the cut-points.
  - **sauce (béchamel, cream sauce, soups):**
    - below 0.5 → fixable (add-more and simmer 2 min)
    - below 1.5 → fine (adjust thickness)
    - above → fixable (rescue: reduce: simmer to thicken, or add roux or slurry for béchamel)
    - Sources: MCG-SAUCE, SFAH.
  - **grains/braise:**
    - below 0.5 → fixable (add-more)
    - below 2.01 → fine
    - above → fixable (reduce)
    - `provisional: true`.
  - **curdled (milk + acid or boil):**
    - fine-with-effect if only slightly grainy; blend or whisk.
    - In custards → redo.
    - Sources: MCG-MILK, SFAH.
- **rescues:**
  - **add-more-liquid** — `kind: add`: the missing milk; mix just to combine. Sources: MCG-DOUGH, KA-BM. `provisional: true`.
  - **reduce** — `kind: none`
    - Simmer, stirring, until it coats a spoon. Heavy cream is fine; milk needs gentle heat to avoid a skin and scorching.
    - say: "Bit thin. Let it simmer and stir until it coats the spoon."
    - Sources: MCG-MILK, MCG-SAUCE.
  - **scale-batch** — `kind: scale`: limit 2×.
- **substitutions:**
  - **Whole milk for cream in a sauce:** fine only if it is not boiled with acid. Thinner; may curdle. Sources: MCG-MILK, SFAH.
  - **Half-and-half for heavy cream:** fine in coffee and soups. It won't whip; it may curdle with acid or a boil. Sources: MCG-MILK, FL. `provisional: true`.
  - **Milk for buttermilk:** see dairy-cultured.
  - **Water for milk in baking:** 1:1 → paler, less tender, less browning. Sources: MCG-DOUGH. `provisional: true`.
- **changes:**
  - **baking:** ±15%.
  - **sauces:** ±50%, then adjust thickness.
  - Sources: MCG-DOUGH, MCG-SAUCE. `provisional: true`.
- **shows:**
  - Batter too thin (pours like cream when it should be a thick scoop) or too stiff.
  - Sauce curdled: tiny white flecks, a watery edge.
  - Scorched: brown skin on the base, a burnt smell.

### role: dairy-whipped-cream
- **name:** Cream whipped as a foam
- **does:**
  - **pastry:** whipped cream, mousse, chantilly.
  - Needs ≥ 30% fat and cold cream (about 5 °C). Overwhipping makes it grainy, then turns it to butter.
  - Sources: MCG-MILK, BT.
- **tight:** true
- **items/aliases:** heavy cream, whipping cream, double cream, crème chantilly.
- **bands:**
  - **pastry:**
    - The amount is non-critical: below 0.75 → fixable (scale down the use); below 1.5 → fine; above → fine (make extra).
    - The state slips matter:
      - slightly overwhipped (grainy, stiff) → fixable (rescue: rescue-overwhipped-cream)
      - separated into butter and liquid → redo the cream (keep it as butter)
      - half-and-half or milk used → redo (won't whip)
    - Sources: MCG-MILK, BT.
- **rescues:**
  - **rescue-overwhipped-cream** — `kind: add`
    - add: role dairy-liquid (cold liquid cream), 2 Tbsp per 1 cup of whipped cream, folded gently by hand.
    - conditions: still a foam; not yet separated.
    - say: "Gone a whisker too far. Fold in a couple of spoons of cold cream by hand."
    - Sources: MCG-MILK, BT. `provisional: true` for the exact ratio.
- **substitutions:** none for whipping below 30% fat. Coconut cream (chilled, solids only) whips → fine with a flavour change. Sources: MCG-MILK. `provisional: true` for coconut.
- **changes:** n/a
- **shows:**
  - Overwhipped: lumpy, matte, curdled, yellowing, liquid at the bottom.
  - Won't whip: stays liquid after 3–4 min.

### role: dairy-cultured
- **name:** Cultured dairy (acid and moisture)
- **does:**
  - **baking:** acid activates baking soda and tenderises (biscuits, pancakes, soda bread, cakes, muffins).
  - **sauce/braise:** tang and body. Yogurt and low-fat sour cream curdle if boiled; crème fraîche (high fat) won't.
  - Sources: MCG-MILK, KA-BM, ATK-CULT.
- **tight:** true for baking with baking soda; false otherwise.
- **items/aliases:** buttermilk, cultured buttermilk, yogurt, plain yogurt, whole-milk yogurt, Greek yogurt, strained yogurt, labneh, skyr, sour cream, crème fraîche, kefir.
- **bands:**
  - **baking:**
    - below 0.8 → fixable (rescue: add-more before baking)
    - below 1.2 → fine
    - below 2.01 → fixable (rescue: scale-batch)
    - above → redo
    - **forgot, with baking soda in the recipe (ratio 0):** fixable only before baking (add it). Baked without → fine-with-effect (soapy, dense, darker).
    - Sources: KA-BM (plain milk in a soda cake gave a darker, denser result), ATK-CULT, MCG-MILK. `provisional: true` for 0.8/1.2.
  - **sauce/braise (stirred in as the finish):**
    - below 0.34 → fixable (add-more)
    - below 2.01 → fine
    - above → fixable (scale-batch)
    - **boiled and curdled:** fine-with-effect (grainy but edible). If presentation matters → fixable only by blending; otherwise accept.
    - Sources: MCG-MILK, SFAH. `provisional: true`.
  - **default:** baking.
- **rescues:**
  - **add-more** — `kind: add`: the missing amount; mix just to combine. Sources: KA-BM, ATK-CULT. `provisional: true`.
  - **scale-batch** — `kind: scale`: limit 2×.
  - **temper-before-adding** (prevention) — `kind: none`
    - Stir a few spoons of the hot sauce into the yogurt, then add it off the heat. Do not boil.
    - say: "Take it off the heat first and stir the yogurt in, so it stays smooth."
    - Sources: MCG-MILK, SFAH.
- **substitutions (1 cup buttermilk):**
  - 1/3 cup Greek yogurt + 2/3 cup water (ATK-CULT), or 1 part Greek yogurt to 2 parts milk (KA-BM) → best match. Sources: ATK-CULT, KA-BM.
  - 1/2 cup plain whole-milk yogurt + 1/2 cup water → fine. Sources: ATK-CULT, KA-BM (yogurt thinned to heavy-cream consistency).
  - Kefir 1:1 → fine (browns faster). Sources: ATK-CULT.
  - Milk + 1 Tbsp lemon juice or vinegar, rested 10–15 min → fine in cakes. **Sources disagree on biscuits and pancakes:** KA-BM found the rise adequate; ATK-CULT found them thinner and spreading. Safer verdict: fine for cakes and muffins; for biscuits and pancakes, use the thinned-yogurt option.
  - Plain milk with no acid → not acceptable when the recipe relies on baking soda (KA-BM: the only failure in the cake test).
- **substitutions (other):**
  - Sour cream ↔ whole-milk yogurt 1:1 → fine. Yogurt gives drier cakes (sour cream has more than 4× the fat). Sources: ATK-CULT, KA-EGG.
  - Greek yogurt ↔ sour cream 1:1 → fine for dips and toppings; tangier and thicker. `provisional: true`.
  - Greek yogurt for regular yogurt in baking → thin it about 2:1 yogurt to water, or batters turn stiff. Sources: ATK-CULT, KA-BM.
- **changes:**
  - **baking:** ±20%.
  - **sauces and dips:** freely, from 0.34 to 2.
  - `provisional: true`.
- **shows:**
  - Too much: batter loose and pourable when it should be a soft dough; biscuits slump.
  - Too little: dough shaggy and dry.
  - Curdled in a sauce: white flecks and whey separating.
  - Plain milk used: biscuits pale and flat.

### role: dairy-fresh-cheese
- **name:** Fresh soft cheeses (cottage, ricotta, cream cheese, mascarpone)
- **does:**
  - **baking/pastry:** body and moisture (cheesecake, cheese filling, frosting).
  - **other:** fillings (lasagne, stuffed pasta), dips.
  - Cream cheese must be soft (about 18–21 °C) or it lumps. Low-fat versions weep in baked uses.
  - Sources: MCG-MILK, BT.
- **tight:** true for cheesecake; false for fillings and dips.
- **items/aliases:** cottage cheese, ricotta, cream cheese, Neufchâtel, mascarpone, quark, farmer's cheese, fromage blanc.
- **bands:**
  - **pastry (cheesecake):**
    - below 0.85 → fixable (add-more before baking)
    - below 1.15 → fine
    - below 2.01 → fixable (rescue: scale-batch: eggs, sugar and the rest to match)
    - above → redo
    - Sources: BT, MCG-EGG (the egg-to-dairy set). `provisional: true`.
  - **other (fillings and dips):**
    - below 0.5 → fixable (add-more)
    - below 2.01 → fine
    - above → fixable (scale-batch)
    - `provisional: true`.
  - **cold cream cheese, lumpy:** fixable (rescue: soften: let it stand 30–45 min, or beat alone before adding other ingredients). Sources: BT, KA-COOKIE (cream cheese behaviour). `provisional: true`.
- **rescues:** add-more (`kind: add`); scale-batch (`kind: scale`, limit 2×); soften (`kind: none`).
  - say for soften: "It's lumpy because it's cold. Beat the cream cheese alone until smooth, then add the rest."
- **substitutions:**
  - Cottage cheese (blended smooth) ↔ ricotta 1:1 → fine in lasagne and fillings; wetter, so drain it.
  - Mascarpone for cream cheese → fine in frosting; softer and richer.
  - Low-fat cream cheese in cheesecake → avoid (KA-COOKIE found low-fat cream cheese baked hard and pale).
  - All `provisional: true` except the low-fat note, which has a single source.
- **changes:**
  - **cheesecake:** ±15%.
  - **fillings:** freely.
  - `provisional: true`.
- **shows:** lumpy, flecked batter; a weeping or cracked cheesecake; watery lasagne layers.

---

## CHEESE

### role: cheese-melting
- **name:** Cheese melted in sauces and toppings
- **does:**
  - **sauce:** mac and cheese, fondue, queso.
  - **roast/baking:** toppings, gratins, pizza.
  - Young, moist cheeses (mozzarella, Monterey Jack, mild cheddar, young Gruyère, fontina) melt smoothly. Aged ones (Parmesan, aged cheddar) break into fat and grains.
  - Overheating squeezes out fat. Starch, evaporated milk or sodium citrate stabilise a sauce.
  - Sources: ATK-CHEESE, MCG-MILK, ATK-CITRATE, SE-MAC.
- **tight:** false for toppings; true for smooth sauces.
- **items/aliases:** cheddar, mozzarella, Monterey Jack, Gruyère, Swiss, Emmental, fontina, provolone, American cheese, Parmesan, Parmigiano, pecorino, pre-shredded cheese, cheese blend.
- **bands:**
  - **roast/baking (topping, gratin, pizza):**
    - below 0.34 → fixable (add-more)
    - below 2.01 → fine
    - above → fine-with-effect (greasy; blot with paper towel)
    - Sources: ATK-CHEESE, MCG-MILK. `provisional: true`.
  - **sauce (cheese sauce):**
    - below 0.5 → fixable (add-more off the heat, a handful at a time)
    - below 1.5 → fine
    - below 2.5 → fixable (rescue: loosen-sauce)
    - above → fixable (loosen-sauce, scale)
    - Sources: MCG-MILK, SE-MAC. `provisional: true`.
  - **sauce broken (greasy, stringy or grainy):** fixable (rescue: rebuild-cheese-sauce) if it has only just split. Grainy from aged cheese that has boiled hard → redo.
    - Sources: ATK-CITRATE, MCG-MILK, MC.
  - **wrong cheese for the sauce (Parmesan or very aged cheddar as the main cheese):** fixable (rescue: blend in a young melter at ≥ 2 parts young to 1 part aged). Sources: ATK-CHEESE, MCG-MILK. `provisional: true` for the 2:1.
  - **pre-shredded used for a smooth sauce:** fine-with-effect (slightly grainy; the anti-caking starch thickens). `provisional: true`.
- **rescues:**
  - **loosen-sauce** — `kind: add`
    - add: role dairy-liquid (warm milk), 2 Tbsp per extra 1/4 cup of cheese, over low heat.
    - say: "Thick and heavy. Whisk in warm milk a little at a time, over low heat."
    - Sources: SE-MAC, MCG-MILK. `provisional: true`.
  - **rebuild-cheese-sauce** — `kind: add`
    - Take it off the heat. Then either add 1 tsp lemon juice or white wine with 1 tsp cornstarch slurried in 1 Tbsp cold liquid per 2 cups of sauce, or sodium citrate at about 4% of the cheese weight (MC). Whisk or blend.
    - conditions: just split, not burnt.
    - say: "It's split from the heat. Off the burner, whisk in a little cornstarch slurry, and it will smooth."
    - Sources: ATK-CITRATE (emulsifying salts), MC (sodium citrate at 4 g per 100 g cheese), MCG-MILK (acid and starch stabilise melted cheese). `provisional: true` for the cornstarch quantity.
- **substitutions:**
  - Any young melter for another (Jack ↔ mild cheddar ↔ fontina ↔ young Gruyère) 1:1 by weight → fine.
  - Aged hard cheese for a melter → only as a flavouring (≤ 1/3 of the total).
  - American cheese or sodium citrate added → the smoothest result.
  - Sources: ATK-CHEESE, MCG-MILK, ATK-CITRATE.
- **changes:**
  - **toppings:** freely, from 0.5 to 2.
  - **sauces:** ±50% with a liquid adjustment.
  - Sources: ATK-CHEESE, SE-MAC. `provisional: true`.
- **shows:**
  - Broken: oil slick on the sauce or pizza; clumpy, ropey strands; a grainy, sandy texture.
  - Too hot: bubbling, browning fat.
  - Too little cheese: a pale, thin sauce.

### role: cheese-baked-in
- **name:** Cheese folded into doughs and batters
- **does:**
  - **baking:** flavour, fat and moisture in gougères, cheese scones and biscuits, cheese bread, savoury muffins, cornbread. Grated aged cheese adds salt.
  - Sources: MCG-MILK, MCG-DOUGH.
- **tight:** false
- **items/aliases:** grated cheese, shredded cheddar, Parmesan, Gruyère, feta (crumbled).
- **bands:**
  - **baking:**
    - below 0.5 → fixable (add-more, folded in before baking)
    - below 1.5 → fine
    - below 2.01 → fixable (rescue: scale-batch)
    - above → redo (greasy; spreads; heavy)
    - Sources: MCG-DOUGH, MCG-MILK. `provisional: true` (no second trusted source quantifies this).
  - **salty aged cheese doubled:** fixable (rescue: cut the recipe's added salt by half, if not yet added). `provisional: true`.
- **rescues:** add-more (`kind: add`), scale-batch (`kind: scale`, limit 2×). `provisional: true`.
- **substitutions:** any firm grating cheese 1:1 by weight → fine (a flavour change). `provisional: true`.
- **changes:** to 0.5 or 1.5. `provisional: true`.
- **shows:** greasy dough with an oil sheen; puddles of fat on the tray; scones spreading and browning fast.

---

## Open questions and uncertainties

1. **The cut-points are synthesis, not citation.** No trusted source states "1.25× egg is fine." Sources give the direction and the mechanism; the numbers are mine, anchored where possible to physical facts (the egg-size spread from USDA-AMS; butter's 80% fat from KA-SHORT; the vinaigrette 3:1). Hence the many `provisional: true` marks. A small home test (a 2-egg cake at 1, 1.25 and 1.5 eggs; cookies at 1.0, 1.2 and 1.4 butter) would turn the key bands from provisional to measured.
2. **Rescue kinds are missing `remove`.** Several real rescues mean taking an unmixed excess back out: an extra egg still in its own bowl, or overfilled frying oil that is still cold. These are recorded as `kind: none, technique: remove-unmixed`. The schema likely needs a fourth kind, and a "has it been mixed in yet?" question the coach asks before ruling.
3. **Timing state matters as much as the ratio.** Almost every `fixable` becomes `redo` or `fine-with-effect` once the item is baked, set, folded or emulsified. The code needs a stage input (unmixed / mixed / in the oven / done) for each slip.
4. **Serious Eats could not be fetched** (it blocks the crawler). The SE citations rest on the named articles and Kenji's *The Food Lab* book, and their URLs are unverified. FSIS-FRY returned 403. Its fill-level and temperature content matches FL but was not re-read today.
5. **Disagreements recorded at the safer verdict:**
   - clabbered milk as buttermilk (KA-BM ok; ATK-CULT spreads);
   - oil-for-butter ratio (3/4 recorded rather than 1:1);
   - EVOO for deep frying (capped at 175 °C).
6. **Safety lives outside the ratio bands.** Hollandaise and raw-yolk mayonnaise use raw eggs (pasteurised eggs advised for vulnerable diners), and a pot more than half full of frying oil is a fire risk. These should be hard rules in code that override any `fine`, not bands.
7. **Not covered here:** egg-free and dairy-free swaps beyond those listed; vegan butter brands (water content varies); goat and sheep dairy; aged cheese in a savoury custard (gratin dauphinois); low-fat dairy beyond the cheesecake note.
