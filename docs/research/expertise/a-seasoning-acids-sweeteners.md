# Expertise pack A — seasoning, acids, sweeteners, extracts

**Purpose.** Tolerance bands that let *code* (not the model) rule on a cook's slip — `fine` / `fixable` (with a
concrete rescue) / `redo` — for salt, salty-umami condiments, dried spices and herbs, hot sauces, acids, sugars
and flavour extracts. Owner's rule: a confident wrong rescue is worse than starting over; where in doubt, or where
sources disagree, the safer verdict is recorded.

**Researched:** 2026-10-30. Every rule cites ≥2 trusted sources by ID (registry at the end). Rules with only one
trusted source, or resting on derived engineering judgement, carry `provisional: true`.

---

## 0. Conventions shared by every role (encode these once)

- **ratio** `R = actual ÷ recipe amount`, measured in the *same effective unit* (see salt conversion). Forgot = `R = 0`.
  "A tablespoon instead of a teaspoon" = `R = 3`. "Half a teaspoon instead of a teaspoon" = `R = 0.5`.
- **Bands** are ascending thresholds: the first `below X` that the ratio satisfies wins; `above` is the remainder.
- **Stage gate.** Almost every rescue in baking is valid **only before the item goes into the oven** (for yeast
  dough: only before bulk fermentation is well under way). After baking or after a sauce has broken, the band falls
  through to its `after` verdict. The code must know the step the cook is on.
- **remove-excess (universal, pre-mix).** If the over-measured ingredient is still sitting un-incorporated
  (a pile on top of flour, a spoonful floating on unstirred liquid, in a separate bowl), the rescue is to
  spoon out the excess → verdict `fine`. Once stirred or dissolved, this rescue is gone. *provisional: true*
  (mechanical common sense; no source states it as a rule).
- **scale rescue maths.** To bring an over-dose back into the `fine` band, multiply the whole batch by
  `S = R ÷ fine_upper` (e.g. salt `R = 2` in a soup whose fine band ends at 1.25 → `S = 1.6`). Scaling means
  adding every *other* ingredient in proportion. Caps by kind of cooking (*provisional: true* — derived, not
  sourced; set deliberately low per the owner's rule):
  | kind | max S | condition |
  |---|---|---|
  | soup / braise / stew / sauce (liquid) | 2.0 | pot has room and the cook has the other ingredients |
  | saute / stir-fry *sauce still separate* | 2.0 | the sauce has not met the pan |
  | yeast dough | 2.0 | only during mixing, before bulk rise |
  | cookie dough, muffin / quick-bread batter (muffin method) | 2.0 | before baking |
  | creamed or whipped (aerated) cake batter, meringue, custard | 1.0 (no scaling) | aeration cannot be redone into a bigger batch |
  | eggs, grains (rice cooked), roast (seasoned surface) | 1.0 | — |
  If `S > cap` → `redo`.
- **Seasoning is cumulative and one-way.** Salt, heat and sweetness can always be added; they cannot be taken
  out — only diluted or masked. Sources: SFAH-SALT, MCG-14, ATK-SGC.

---

### role: salt
- **name:** Salt (cooking and baking salt)
- **does:**
  - baking (yeast bread): flavour; tightens gluten; slows yeast so fermentation stays controlled; leaves sugar
    for crust browning. Usual dose 1.8–2.0 % of flour weight (≈ 1 tsp table salt per 2½–3 cups / 300–360 g flour).
  - baking/pastry (chemically leavened, pastry, cookies): flavour only; sharpens sweetness; no structural role.
  - sauce / braise / soup: flavour; dissolves fully so it distributes evenly; can be adjusted at the end.
  - saute / roast: surface seasoning and, when applied well ahead, a dry brine that seasons inside and
    helps moisture retention.
  - eggs: seasoning; salt added before cooking keeps scrambled eggs more tender.
  - grains / pasta water: seasoning absorbed during cooking; hard to correct afterwards.
- **tight:** true in yeast bread and in grains/pasta water (absorbed, cannot be corrected); false in liquid
  savory dishes (adjustable); false for too-little in all savory cooking.
- **items/aliases:** table salt (fine salt, iodised salt, "salt"); kosher salt — Diamond Crystal ("DC",
  "Diamond"), Morton kosher; sea salt — fine sea salt, coarse sea salt, flaky sea salt (Maldon, fleur de sel);
  pickling/canning salt; Himalayan pink salt.
- **effective-unit conversion (apply before computing R).** Saltiness per teaspoon, table = 1.0:
  fine sea salt / pickling salt ≈ 1.0; Morton kosher ≈ 0.67 (1 tsp table = 1½ tsp Morton); Diamond Crystal
  ≈ 0.5 (1 tsp table = 2 tsp DC); flaky finishing salt ≈ 0.5 (*provisional: true*). Weights: Morton ≈ 4.8 g/tsp,
  DC ≈ 2.8 g/tsp; table ≈ 6 g/tsp. Example: recipe says "1 tsp kosher (DC)", cook used 1 tsp table salt →
  effective `R = 2`. If the recipe names kosher salt without a brand and the cook used table salt at equal
  volume, assume the worse case (DC) → `R = 2`.
  - sources: ATK-SALT, ATK-KOSHER, SFAH-SALT (Nosrat specifies DC and warns of the Morton difference),
    BT (Parks writes her recipes for DC and gives weights).
- **bands:**
  - **baking — yeast bread** (at mixing):
    - `R = 0` (forgot) → fixable (rescue: `add-dissolved-salt`) **if caught before bulk rise**; after bulk
      rise → fixable (rescue: `bake-anyway-salty-serve`).
    - below 0.75 → fixable (rescue: `add-dissolved-salt`, the shortfall) before bulk rise; after → fine
      (bland, paler).
    - below 1.25 → fine (≈ 1.5–2.5 % of flour).
    - below 2.0 → fixable (rescue: `scale-batch`, during mixing only); after bulk rise → redo.
    - above 2.0 → redo (≥ 4 % salt strongly suppresses yeast and is unpalatable).
    - sources: KA-SALT-PRO, KA-FORGOT, KA-SALT-BLOG, MCG-10. Upper cut-off 2.0 is the scale cap, not a
      sourced tipping point → that threshold *provisional: true*.
  - **baking/pastry — chemically leavened (cakes, cookies, muffins, pie dough, biscuits):**
    - below 0.5 → fine (flatter, sweeter; cookies: optional flaky salt on top before baking).
    - below 1.5 → fine.
    - below 2.0 → fixable (rescue: `scale-batch`) — only before baking and only for non-aerated
      batters/doughs (cookie dough, muffin, quick bread, pie dough); creamed/whipped cake batter → redo.
    - above 2.0 → redo.
    - sources: MCG-10, BT (salt is a flavour role in her formulas), ATK-SGC. *provisional: true* for the 1.5 and
      2.0 numbers (no source gives a threshold; set from salt being ≈0.5–1 % of flour in these recipes).
  - **sauce / braise / soup (liquid savory) — default for savory:**
    - below 1.0 (incl. forgot) → fixable (rescue: `add-more`, at the end, taste-adjust).
    - below 1.25 → fine.
    - below 2.5 → fixable (rescue: `scale-batch`, S = R ÷ 1.25, max 2) — or `dilute-unsalted` for a brothy
      soup if the cook has unsalted stock/water and the dish can stand thinner.
    - above 2.5 → redo.
    - sources: SFAH-SALT (dilute or add bulk; acid/fat only mask), ATK-SGC, MCG-14. Potato-absorbs-salt is a myth —
      **never offer it** (WOLKE, ATK-SGC).
  - **saute / roast (surface seasoning on raw protein or veg):**
    - below 1.0 → fixable (rescue: `add-more`; at the table for roasts, before cooking for proteins).
    - below 1.5 → fine.
    - below 3.0 → fixable (rescue: `brush-rinse-pat-dry`) **only before cooking**; after cooking → redo
      for R ≥ 2, fine with unsalted sides below 2. *provisional: true* (one solid source: SFAH-SALT on
      surface salt; ATK-SGC on dry-brining).
    - above 3.0 → redo.
  - **grains / pasta water:**
    - below 1.0 → fixable (rescue: `add-more` — season the finished sauce or grain more).
    - below 1.5 → fine.
    - above 1.5 → if not yet cooked: fixable (rescue: `dilute-unsalted` — pour off and refill / add water);
      if already cooked in it → redo (grains absorbed it). sources: SFAH-SALT, FL. *provisional: true* for 1.5.
  - **eggs:** below 1.0 → fixable (`add-more`); below 1.5 → fine; below 2.0 → fixable (`scale-batch`, beat in
    more eggs) before cooking; above → redo. *provisional: true* (SFAH-SALT, FL; no threshold stated).
- **rescues:**
  - `add-more` — kind: add; role: salt; amount = shortfall (recipe − actual), added in halves and tasted.
    Savory only, any time before serving. say: "No harm — add the rest of the salt now, half at a time, and taste."
    sources: SFAH-SALT, ATK-SGC.
  - `add-dissolved-salt` — kind: add; role: salt; amount = full recipe amount dissolved in 2–3 tsp water,
    kneaded or mixed in on low; yeast dough before bulk rise only (sourdough: after a 20–60 min rest).
    say: "Dissolve the salt in a couple of teaspoons of water and knead it in now, before it rises."
    sources: KA-FORGOT, KA-SALT-PRO.
  - `bake-anyway-salty-serve` — kind: none; dough already risen without salt: bake as is; expect pale, bland,
    faster-rising bread; serve with salted butter or salty toppings (or turn into pizza). say: "Too late to add it
    without hurting the dough — bake it anyway and serve it with salted butter." sources: KA-FORGOT, KA-SALT-PRO.
    *note:* KA states re-kneading after the rise damages structure; do not offer it.
  - `scale-batch` — kind: scale; S = R ÷ fine_upper, capped by kind (section 0); every other ingredient
    multiplied by S. Works for soups/braises/sauces and unrisen doughs; not for aerated batters; not after baking.
    say: "That's about double the salt — if you've room and ingredients, make the batch one and a half times
    bigger; otherwise we start again." sources: SFAH-SALT, ATK-SGC (dilute/increase bulk). Cap values
    *provisional: true*.
  - `dilute-unsalted` — kind: add; role: unsalted liquid (water, unsalted stock, unsalted tomatoes); for brothy
    soups and pasta water only; per unit of excess salt, add liquid ≈ (R − 1.25) × original liquid volume, then
    re-reduce if needed. Never "low-sodium broth" (still salty). say: "Add unsalted water or stock to bring it
    back, then let it simmer down." sources: SFAH-SALT, ATK-SGC.
  - `brush-rinse-pat-dry` — kind: none; raw surface-salted protein/veg, before cooking: brush or briefly rinse
    off the excess, pat very dry. say: "Brush the extra salt off and pat it dry before it goes in the pan."
    *provisional: true* (SFAH-SALT only).
- **substitutions:**
  - table ↔ kosher ↔ sea: by effective unit (above): 1 tsp table = 1½ tsp Morton = 2 tsp DC. Effect: none if
    converted. sources: ATK-SALT, ATK-KOSHER, SFAH-SALT.
  - flaky / coarse sea salt in a dough or batter → poor dissolution, salty pockets; use for finishing only.
    sources: ATK-SALT, SFAH-SALT.
  - salted butter for unsalted: subtract ≈ ¼ tsp table salt per stick (113 g / ½ cup) from the recipe's salt
    (ATK estimates ⅓ tsp, range ⅓–½; use ¼–⅓ and taste). sources: KA-BUTTER, ATK-SBUTTER.
  - soy sauce / fish sauce for salt (savory only): see `salty-umami-condiment`.
- **changes:**
  - less: savory — any amount, adjust to taste at the end (effect: flatter). Yeast bread — down to ≈ 1.5 % of
    flour (R ≈ 0.75) is safe; below that, faster, slacker, paler. Cakes/cookies — down to R = 0.5 safe.
    sources: KA-SALT-PRO, SFAH-SALT, MCG-10.
  - more: savory liquid — up to R = 1.25 without verdict; yeast bread up to ≈ 2.5 % (R = 1.25) — slower rise,
    tighter dough. sources: KA-SALT-PRO, MCG-10.
- **shows:** Salt is invisible once dissolved — the camera cannot see an error after mixing; only the
  measuring act (spoon size, salt box label "Morton" vs "Diamond Crystal" vs "iodized") is observable. Bread with
  no salt: rises noticeably faster, dough slacker and stickier, crust pale. Too much in bread: sluggish rise,
  low volume. Surface salt on meat: visible white crystals; heavy crust = over-salted. sources: KA-SALT-PRO,
  KA-SALT-BLOG.

---

### role: salty-umami-condiment
- **name:** Salty umami liquids & pastes (soy sauce, tamari, fish sauce, miso)
- **does:** sauce / braise / saute (stir-fry sauce, marinade, glaze, soup base): salt + glutamate savouriness +
  colour (soy darkens; miso thickens). Fish sauce and miso also add aroma that fades with cooking. Baking: rare
  (miso caramel, cookies) — treat as salt in baking.
- **tight:** false for too little; true for too much in small-volume dishes (dressings, glazes, a single
  stir-fry) where scaling is impractical.
- **items/aliases:** soy sauce (shoyu, light/regular soy, "all-purpose soy"), dark soy sauce (less salty,
  thick, mainly colour), low-sodium soy, tamari (usually wheat-free), fish sauce (nam pla, nuoc mam),
  miso (white/shiro — milder; yellow; red/aka; hatcho — strongest), coconut aminos.
- **salt equivalence (for mixing with the salt role):** per tablespoon, approximate sodium — table salt
  1 tsp ≈ 2,300 mg; soy sauce ≈ 900–1,000 mg/Tbsp (≈ ⅖ tsp table salt); fish sauce ≈ 1,400–1,500 mg/Tbsp
  (≈ ⅗ tsp table salt); white miso ≈ 600–700 mg/Tbsp (≈ ¼–⅓ tsp table salt). Labels vary by brand — read
  the bottle if visible. sources: USDA-FDC, MCG-9 (soy/miso), MCG-4 (fish sauce). Numbers per brand →
  *provisional: true* until checked against the cook's label.
- **bands:**
  - **sauce not yet in the pan (stir-fry sauce, dressing, marinade being mixed):**
    - below 1.0 → fixable (rescue: `add-more`).
    - below 1.25 → fine.
    - below 3.0 → fixable (rescue: `scale-sauce` — make more of the *sauce* only, S = R ÷ 1.25, max 2.5;
      use the extra sauce or discard surplus). Only before it meets the food.
    - above 3.0 → redo the sauce (cheap; the food is unharmed).
    - sources: SFAH-SALT, FL (stir-fry sauces pre-mixed). *provisional: true* for the 2.5 cap.
  - **braise / soup / sauce (already combined, liquid):** same as `salt` savory liquid — below 1.0 fixable
    (`add-more`); below 1.25 fine; below 2.5 fixable (`scale-batch`, max 2); above → redo. Convert to salt
    equivalent first when the dish also has salt: what matters is total sodium. sources: SFAH-SALT, ATK-SGC.
  - **saute / stir-fry (already in the pan):** below 1.0 fixable (`add-more`); below 1.5 fine; below 2.0
    fixable (rescue: `add-unsalted-bulk` — more of the main veg/protein/rice, max +50 %) *provisional: true*;
    above → redo.
  - **default (marinade on raw protein):** below 1.0 fine (less seasoning); below 2.0 fine if the marinade
    time is ≤ 1 h; above 2.0 → fixable (rescue: shorten marinade and pat dry) *provisional: true*.
- **rescues:**
  - `add-more` — kind: add; role: same condiment; shortfall, half at a time. say: "Add the rest now and taste."
    sources: SFAH-SALT, FL.
  - `scale-sauce` — kind: scale (of the sauce sub-recipe only). say: "The sauce is too strong — make a bigger
    batch of just the sauce, then use what the recipe needs." *provisional: true* (derived; SFAH-SALT on dilution).
  - `scale-batch` — as in `salt`.
  - `add-unsalted-bulk` — kind: add; role: main ingredient (plain rice, vegetables, protein), ≤ +50 %.
    say: "Toss in more plain vegetables or rice to spread the saltiness." *provisional: true* (SFAH-SALT).
- **substitutions:**
  - tamari ↔ soy sauce: 1:1; tamari slightly richer, often gluten-free. sources: MCG-9, ATK-SGC.
    *provisional: true* (brand variance).
  - low-sodium soy for regular: 1:1, then expect to add salt (≈ 40 % less sodium). sources: USDA-FDC, ATK-SGC.
  - dark soy for regular: **not 1:1** — much less salt, much more colour; use ≤ ¼ the amount plus salt.
    *provisional: true* (FL only).
  - fish sauce for soy: ½–⅔ the volume (saltier, funkier). *provisional: true* (USDA-FDC sodium only).
  - salt for soy sauce: 1 Tbsp soy ≈ ⅓–½ tsp table salt (loses colour and umami). sources: USDA-FDC, SFAH-SALT.
  - red miso for white: use ½–⅔ the amount (saltier, stronger). *provisional: true*.
  - coconut aminos for soy: 1:1 volume, much less salty and sweeter — add salt. *provisional: true*.
- **changes:** less — down to R = 0.5, make up with salt to taste (effect: less depth/colour). more — up to
  R = 1.25 in liquid dishes. sources: SFAH-SALT, USDA-FDC.
- **shows:** Soy/dark soy: a stir-fry or braise visibly darker/browner than expected; excess dark soy looks
  almost black. Miso: cloudy, opaque broth; too much = thick, beige-brown. Fish sauce is pale and invisible —
  only smell. Glazes with excess soy burn faster (darker spots). sources: MCG-9, FL.

---

### role: dried-mild-seasoning
- **name:** Dried mild seasonings — garlic & onion powder, sweet/smoked paprika, dried leafy herbs, black pepper
- **does:** sauce / braise / roast / saute / eggs / grains: aroma and background flavour; paprika adds colour
  (and burns/turns bitter in very hot fat). Dried herbs need time and moisture (≥ 10 min simmer, or bloom in fat)
  to give flavour. Baking: savory breads, rubs.
- **tight:** false.
- **items/aliases:** garlic powder (granulated garlic — coarser, ≈ ½ as strong by volume as powder;
  *provisional*), onion powder (granulated onion), paprika (sweet, Hungarian sweet, smoked/pimentón dulce;
  **hot paprika and pimentón picante → `chili-heat`**), dried oregano (Mediterranean, Mexican), dried thyme,
  dried basil, Italian seasoning, herbes de Provence, black pepper (ground, cracked, peppercorns), white pepper.
- **bands (default — liquid or mixed dishes: sauce, braise, soup, chili, stew):**
  - below 1.0 (incl. forgot) → fixable (rescue: `add-more`, early enough to cook ≥ 10 min).
  - below 1.5 → fine.
  - below 3.0 → fixable (rescue: `scale-batch`, S = R ÷ 1.5, max 2).
  - above 3.0 → redo.
  - sources: ATK-HERBS-USE, MCG-8, SFAH-ACID (balancing). Thresholds *provisional: true* (no source gives a
    tolerance number; set from the 3–4× dried-vs-fresh strength spread in PSU-HERBS, OSU-HERBS).
- **bands (roast / saute rub, eggs, dry dishes):**
  - below 1.0 → fixable (`add-more`; for eggs, at the end).
  - below 2.0 → fine.
  - below 3.0 → fixable (rescue: `brush-rinse-pat-dry`, raw food, before cooking) *provisional: true*.
  - above 3.0 → redo (black pepper or garlic powder at 3× on a surface is harsh).
  - **black pepper exception:** above 2.0 on a surface → fixable only by brushing off; otherwise redo.
    *provisional: true*.
- **rescues:**
  - `add-more` — kind: add; role: same; shortfall. For dried herbs, add to fat or simmering liquid, not at the
    very end. say: "Add it now and let it simmer ten minutes so it blooms." sources: ATK-HERBS-USE, MCG-8.
  - `scale-batch` — as in `salt`. sources: SFAH-SALT (bulk dilution principle), ATK-SGC.
  - `brush-rinse-pat-dry` — as in `salt`. *provisional: true*.
- **substitutions:**
  - dried herb for fresh: 1 part dried : 3 parts fresh (1 tsp dried = 1 Tbsp fresh); ¼ tsp ground herb =
    1 tsp dried leaf. Hardy herbs (oregano, thyme, rosemary, sage) swap well; delicate (basil, parsley, dill,
    chives, tarragon, cilantro) poorly — warn of a different flavour. sources: ATK-HERBS-SUB, PSU-HERBS,
    OSU-HERBS, NCHFP-HERBS.
  - fresh for dried: 3× the volume, add later in cooking. sources: ATK-HERBS-SUB, PSU-HERBS.
  - garlic powder for fresh garlic: ⅛ tsp powder ≈ 1 clove; granulated ≈ ¼ tsp per clove. Effect: no
    browning/sweetness of fresh garlic. *provisional: true* (no second trusted source confirmed).
  - onion powder for fresh onion: 1 Tbsp powder ≈ 1 medium onion's flavour, none of its bulk/moisture.
    *provisional: true*.
  - smoked paprika for sweet: 1:1 colour but much smokier — use ½. *provisional: true*.
  - white pepper for black: 1:1, more pungent and musty. *provisional: true*.
- **changes:** less — any amount (effect: flatter); more — up to R = 1.5 in liquid dishes, 2.0 on rubs.
  sources: as bands (*provisional: true*).
- **shows:** Paprika: red-orange colour — too much is visibly redder; burnt paprika goes dark brown/black and
  smells acrid (redo the oil step). Dried herbs: green flecks on the surface. Garlic/onion powder: invisible
  in liquids, clumps visibly if dumped into hot liquid. Black pepper: dark specks; heavy coat on meat is visible.
  sources: MCG-8, ATK-HERBS-USE.

---

### role: warm-sweet-spice
- **name:** Warm "sweet" spices — cinnamon (also nutmeg, cloves, allspice, ginger, cardamom)
- **does:** baking/pastry: aroma; savory (braise, curries, tagines): background warmth. **Yeast doughs:**
  cinnamon (cinnamaldehyde) slows yeast when mixed *into* the dough; filling/swirl use is fine.
- **tight:** cinnamon false in batters; true for cloves and nutmeg (strong, medicinal/bitter in excess);
  true for cinnamon kneaded into yeast dough.
- **items/aliases:** ground cinnamon (cassia — common US "cinnamon", stronger; Ceylon — milder), cinnamon
  sticks, ground nutmeg, cloves, allspice, ground ginger, cardamom, pumpkin-pie spice, apple-pie spice.
- **bands:**
  - **baking/pastry (batters, cookie dough, fillings):** below 1.0 → fixable (`add-more`, before baking); below
    2.0 → fine (cinnamon); below 3.0 → fixable (`scale-batch`, non-aerated only, before baking); above → redo.
    **cloves/nutmeg:** below 1.5 fine; below 2.0 fixable (`scale-batch`); above → redo.
  - **yeast dough with cinnamon in the dough itself:** below 1.5 → fine; above 1.5 → fixable only during mixing
    (`scale-batch`), else expect a slow rise → redo if after bulk. *provisional: true*.
  - **braise / sauce:** below 1.0 → fixable (`add-more`); below 1.5 → fine; below 3.0 → fixable (`scale-batch`,
    max 2); above → redo.
  - sources: MCG-8 (spice chemistry), KA-CINN, ATK-SGC. All numeric thresholds *provisional: true*.
- **rescues:** `add-more` (kind add, role same, before baking / with ≥ 10 min simmer), `scale-batch`. say:
  "Stir in the rest now — it's not baked yet, so no harm done." *provisional: true*.
- **substitutions:** pumpkin-pie spice for cinnamon 1:1 (adds nutmeg/clove/ginger); allspice for cinnamon at ½;
  Ceylon for cassia at 1.25–1.5×. *provisional: true* (MCG-8 only for cassia vs Ceylon strength).
- **changes:** less — any; more — cinnamon to 2× in batters/fillings without harm; cloves/nutmeg ≤ 1.5×.
  *provisional: true*.
- **shows:** Cinnamon darkens batter brown and is visible as brown swirl/specks; excess makes batter
  noticeably darker. Slow, low rise in cinnamon-dough breads. sources: KA-CINN, MCG-8.

---

### role: chili-heat
- **name:** Dried chili heat — chili flakes, cayenne, hot paprika, chili/chile powder, chipotle powder
- **does:** saute / sauce / braise / roast / eggs / grains: capsaicin heat (plus fruit/smoke from some chiles).
  Capsaicin is fat- and alcohol-soluble, not water-soluble; it cannot be removed, only diluted or masked by fat,
  dairy (casein), sugar and starch.
- **tight:** true for cayenne, chipotle powder, ground hot chiles (small errors are very noticeable); false for
  US "chili powder" blend and mild paprika.
- **items/aliases:** red pepper flakes (crushed red pepper, chili flakes, Aleppo pepper — milder, Gochugaru —
  milder), cayenne (ground red pepper), hot paprika (pimentón picante), **chili powder (US blend — mostly
  ancho/mild chile + cumin + oregano + garlic; mild)** vs **chile powder / ground chile (single pure chile —
  can be much hotter)**, chipotle powder, ancho powder (mild), Kashmiri chili (mild, red).
- **critical alias trap:** cayenne or pure hot chile powder used 1:1 in place of US "chili powder" → effective
  heat many times the recipe → treat as `R = 5` → redo (unless caught pre-mix). sources: MCG-8, ATK-SGC.
  *provisional: true* for the "R = 5" encoding.
- **bands:**
  - **sauce / braise / soup / chili (liquid):** below 1.0 (incl. forgot) → fixable (`add-more`; heat can be
    added any time; flakes need a few minutes in fat). below 1.5 → fine. below 2.0 → fixable (`scale-batch`,
    S = R ÷ 1.5) or `mask-with-dairy-fat-sugar` for a cream/coconut-compatible dish. above 2.0 → redo.
  - **saute / roast / eggs / grains:** below 1.0 → fixable (`add-more`, at the table: flakes on top); below
    1.5 → fine; above 1.5 → fixable only if raw and the spice is on the surface (`brush-rinse-pat-dry`); else
    redo.
  - **mild items (US chili powder blend, sweet Kashmiri, ancho, Aleppo, gochugaru):** use `dried-mild-seasoning`
    bands.
  - sources: MCG-8 (capsaicin solubility; dilution, fat/dairy), ATK-SGC, SFAH-ACID (balancing). Numeric
    thresholds *provisional: true*.
- **rescues:**
  - `add-more` — kind add. say: "Add a pinch more now; heat is easy to add." sources: MCG-8, SFAH-SALT.
  - `scale-batch` — as `salt`.
  - `mask-with-dairy-fat-sugar` — kind: add; role: dairy or fat (sour cream, yoghurt, cream, coconut milk,
    cheese) served with or stirred in; plus ≈ ½ tsp sugar per quart; reduces *perceived* heat only, roughly
    one notch; only for R < 2 and only where dairy suits the dish. say: "It'll be hot — serve it with yoghurt
    or sour cream to cool it." sources: MCG-8, ATK-SGC. *provisional: true* (sugar amount).
- **substitutions:** flakes ↔ cayenne: ¼ tsp cayenne ≈ ½ tsp flakes; hot paprika for cayenne 2–3× (much
  milder); chipotle powder for chili powder at ¼–½ (hotter, smoky); US chili powder for cayenne — 4–6× volume
  and adds cumin/oregano. *provisional: true* for all (Scoville spread varies by product).
- **changes:** less — any (effect: milder); more — up to R = 1.5 is a matter of taste.
- **shows:** Red-orange colour and red flecks; excess cayenne turns sauce visibly redder; flakes floating
  in oil. Cook coughing/eyes watering when it hits hot oil. Cayenne vs chili powder look similar — read the jar
  label. sources: MCG-8.

---

### role: hot-sauce
- **name:** Hot sauces and chile pastes — sriracha, chipotle in adobo, vinegar hot sauces, sambal, gochujang
- **does:** sauce / braise / saute / eggs / marinade: heat + salt + (vinegar sauces) acid + (sriracha,
  gochujang) sugar/garlic. Chipotles in adobo: smoke, heat, vinegar; one chopped chipotle is a large heat dose.
- **tight:** true for chipotle in adobo (whole peppers), habanero sauces; false for sriracha and Tabasco-style
  used as a condiment.
- **items/aliases:** sriracha ("rooster sauce"), chipotle(s) in adobo (canned chipotle, adobo sauce — the sauce
  alone is milder than the peppers), Tabasco / Louisiana-style hot sauce (Frank's, Crystal — Frank's is mild),
  sambal oelek, gochujang (paste, sweet-salty), harissa, chili crisp.
- **bands:**
  - **sauce / braise / soup:** below 1.0 → fixable (`add-more`); below 1.5 → fine; below 2.0 → fixable
    (`scale-batch` or `mask-with-dairy-fat-sugar`); above 2.0 → redo. **chipotle peppers counted per pepper:**
    one extra pepper when the recipe calls for 1 = `R = 2` → fixable only by `scale-batch` max 2 — else redo.
  - **dressing / mayo / dip (uncooked, small batch):** below 1.0 fixable (`add-more`); below 1.5 fine; below 3.0
    fixable (`scale-sauce`, make more base); above → redo.
  - **saute / eggs:** below 1.0 fixable (add at the table); below 1.5 fine; above 1.5 → fixable
    (`mask-with-dairy-fat-sugar`, serve with dairy) only if R < 2; above 2 → redo.
  - also count the salt and acid: vinegar hot sauce at R ≥ 3 adds noticeable sourness — check `acid-flavour`.
  - sources: MCG-8, ATK-SGC, SFAH-ACID. Numeric thresholds *provisional: true*.
- **rescues:** `add-more`, `scale-batch`, `scale-sauce`, `mask-with-dairy-fat-sugar` (as above). say for
  chipotle: "That's a lot of chipotle — we'd need to make double the sauce to save it; otherwise start the sauce
  again." *provisional: true*.
- **substitutions:** sriracha ↔ sambal 1:1 (sambal less sweet, more raw chile); chipotle in adobo ↔ chipotle
  powder: 1 pepper ≈ ¼–½ tsp powder (+ splash vinegar); adobo sauce only for a whole pepper (milder); Tabasco
  for sriracha at ⅓–½ (thinner, sour, hotter per drop); cayenne for hot sauce: ⅛ tsp per 1 tsp sauce (adds no
  vinegar). *provisional: true* (no two trusted sources found for any of these ratios).
- **changes:** less — any; more — R ≤ 1.5 to taste. *provisional: true*.
- **shows:** Sriracha: bright red, thick; adds visible red streaks. Chipotle: dark brick-red, chunks of pepper
  visible; count peppers on the board. Excess turns sauces visibly redder and oilier. sources: MCG-8.

---

### role: acid-flavour
- **name:** Acid for flavour — citrus juice, vinegars (savory cooking, dressings, finishing)
- **does:** sauce / braise / saute / roast / grains / eggs: brightens, balances fat and salt, lifts a flat dish;
  in dressings it is the second half of a ~3:1 oil:acid emulsion; in marinades it firms/"cooks" surface protein
  (long acid marinades turn fish and chicken mushy/chalky). Acid added to green vegetables early turns them olive
  drab; acid in **beans or some vegetables during cooking slows softening**. Acid meeting hot **milk** (not
  cream) curdles it.
- **tight:** false for too little; true for too much in small uncooked preparations (dressing, ceviche,
  marinade time) and in dairy sauces.
- **items/aliases:** lemon juice (fresh, bottled), lime juice, orange juice (weaker acid, sweet), vinegars —
  white/distilled, cider (apple cider vinegar), red/white wine, sherry, rice (seasoned rice vinegar contains
  sugar and salt), balsamic (sweet), malt; verjuice; tamarind (paste).
- **acid strength guide:** lemon and lime juice ≈ 5–6 % acid (≈ pH 2–2.4); most vinegars ≈ 5 % (rice vinegar
  ≈ 4–4.5 %); orange juice ≈ ⅙–⅕ the acid of lemon. Lemon ↔ vinegar ≈ 1:1 by acidity. sources: MCG-7 (fruit
  acids), MCG-13 (vinegar), KA-BUTTERMILK (5 % vinegar standard).
- **bands:**
  - **sauce / braise / soup / roast (cooked savory):** below 1.0 (incl. forgot) → fixable (`add-more`, at
    the end, ½ tsp at a time, taste). below 1.5 → fine. below 2.5 → fixable (`balance-acid` — fat, salt,
    sweetness; or `scale-batch`). above 2.5 → redo. Vinegar cooked longer loses some sharpness — a long braise
    tolerates up to 2.0 as fine. sources: SFAH-ACID, MCG-13, ATK-SGC. Thresholds *provisional: true*
    (SFAH-ACID describes the correction, gives no numbers).
  - **dressing / vinaigrette (uncooked):** below 1.0 → fixable (`add-more`). below 1.33 → fine. below 4.0 →
    fixable (`add-oil-per-excess`, 3 parts oil per 1 part excess acid; or `scale-sauce`). above → redo the
    dressing (cheap). sources: MCG-11 (vinaigrette ratio), SFAH-ACID, ATK-SGC.
  - **marinade / ceviche on protein (time-dependent):** acid R ≤ 1.5 → fine; R > 1.5 → fixable by cutting
    marinating time in proportion (time ÷ R); fish in a pure-citrus marinade past ≈ 30–60 min → mushy, redo
    the fish. *provisional: true* (MCG-4 on acid denaturing fish; SFAH-ACID).
  - **dairy sauce/soup (milk-based) — acid added while hot:** below 1.0 → fixable (`add-more` off the heat, at
    the end). below 1.5 → fine **if** added off the boil and stirred in gradually. above 1.5 → watch for curdling;
    **if curdled → redo the sauce** (safer verdict; blending can partially smooth a curdled soup but texture
    rarely returns). With heavy cream (≥ 36 % fat) acid tolerance is high: use the cooked-savory bands. sources:
    MCG-1 (milk curdling by acid + heat; cream resists), ISU-CURDLE, SFAH-ACID.
  - **green vegetables / pulses still cooking:** acid at any R > 0 before the veg/beans are tender → fixable
    (rescue: add acid at the end next time; for beans, extend cooking) — tell the cook the effect (dull colour /
    slower softening). sources: MCG-6 (chlorophyll + acid; pectin firmness), FL. *provisional: true* for
    "fixable" verdict on beans.
- **rescues:**
  - `add-more` — kind add; role same acid; ½ tsp at a time, taste. say: "Squeeze in a little more lemon and
    taste — it should taste brighter, not sour." sources: SFAH-ACID, ATK-SGC.
  - `balance-acid` — kind: add; role: fat (butter, olive oil, cream ~1 Tbsp per excess Tbsp acid), salt (a
    pinch), or sweetness (½–1 tsp sugar or honey per excess Tbsp acid); valid only R < 2.5 and only cooked
    savory. say: "It's a bit sharp — swirl in a knob of butter and a pinch of sugar, then taste."
    sources: SFAH-ACID, MCG-13. *provisional: true* for the per-unit amounts.
  - `add-oil-per-excess` — kind: add; role: oil, 3 parts per 1 part excess acid (keeps ~3:1); plus a pinch of
    salt. say: "Too much vinegar — whisk in three spoons of oil for every extra spoon of vinegar."
    sources: MCG-11, SFAH-ACID, ATK-SGC.
  - `scale-sauce`, `scale-batch` — as above.
  - **do not offer** baking soda to neutralise excess acid in a savory dish as a primary rescue — soda in excess
    tastes soapy and dulls flavour; at most a pinch (⅛ tsp per quart) in a tomato sauce. *provisional: true*.
- **substitutions:**
  - lemon ↔ lime: 1:1 (different aroma). lemon ↔ white-wine / cider vinegar: 1:1 by acidity, loses citrus
    aroma (use zest if available). sources: SFAH-ACID, MCG-7, MCG-13.
  - bottled lemon for fresh: 1:1, duller flavour; consistent acidity (KA prefers it where acidity matters).
    sources: KA-BUTTERMILK, ATK-SGC.
  - balsamic for red-wine vinegar: 1:1 but sweet and dark; seasoned rice vinegar for plain rice vinegar — 1:1,
    reduce sugar and salt. *provisional: true*.
  - orange juice for lemon: not a substitute for acidity (≈ ⅙ the acid). sources: MCG-7, SFAH-ACID.
- **changes:** less — any (flatter); more — up to R = 1.5 cooked, 1.33 in dressings. sources: SFAH-ACID,
  MCG-11.
- **shows:** Curdled dairy: grainy, flecked, separated liquid around white specks. Green veg turned olive.
  Over-marinated fish: opaque white, flaky-soft surface. Acid itself is invisible; watch the pour and the bottle
  label (rice vs seasoned rice vinegar). sources: MCG-1, MCG-6, ISU-CURDLE.

---

### role: acid-leavening
- **name:** Acid as a leavening partner — the acid that baking soda reacts with
- **does:** baking/pastry: acid (buttermilk, yoghurt, sour cream, lemon juice, vinegar, brown sugar, honey,
  natural cocoa, molasses) neutralises baking soda to release CO₂. Rule of thumb: ≈ ½ tsp baking soda neutralises
  1 cup buttermilk/yoghurt; soda without enough acid → soapy/metallic taste, yellowish or over-browned crumb, poor
  rise; excess acid → sour, dense, pale. Also: 1 Tbsp lemon juice or 5 % vinegar + milk to 1 cup = soured-milk
  "buttermilk" (rest 5–15 min).
- **tight:** true — the reaction is stoichiometric and happens once.
- **items/aliases:** lemon juice, vinegar (white, cider), cream of tartar (dry acid), buttermilk, soured milk,
  yoghurt, sour cream (these dairy acids are tracked here when the recipe uses them for soda leavening).
- **bands (baking with baking soda, before baking):**
  - `R = 0` (forgot the acid) → fixable (rescue: `add-acid-now`) if the batter isn't baked yet **and** the
    soda was added < 10 min ago; else redo (the soda will taste soapy and the rise is weak). After baking → redo.
  - below 0.75 → fixable (rescue: `add-acid-now`, the shortfall) before baking.
  - below 1.5 → fine (slight tang).
  - below 2.0 → fixable (rescue: `add-soda-per-excess`) — only before baking, only quick bread/muffin/pancake
    batter, not aerated cake. *provisional: true*.
  - above 2.0 → redo.
  - sources: MCG-10 (chemical leaveners), KA-BUTTERMILK, ATK-BUTTERMILK, ATK-SGC. The 1.5/2.0 thresholds
    *provisional: true*.
- **bands (baking powder recipe with a little acid for flavour — e.g. lemon cake):** use `acid-flavour`
  dressing-like tolerance but on batter: below 1.0 fixable (`add-more`, before baking); below 1.5 fine; above
  1.5 → redo for aerated cakes (excess liquid + acid can curdle a creamed batter and weaken structure).
  *provisional: true*.
- **rescues:**
  - `add-acid-now` — kind: add; role: acid; shortfall, folded in briefly (overmixing knocks out gas); bake
    immediately. say: "Fold the lemon juice in now and get it into the oven straight away." sources: MCG-10,
    ATK-SGC. *provisional: true* (neither states this rescue explicitly; it follows from the chemistry).
  - `add-soda-per-excess` — kind: add; role: baking soda; ≈ ¼ tsp per extra 1 Tbsp lemon/vinegar or per extra
    ½ cup buttermilk; folded in; bake at once. *provisional: true* — risk of over-correcting to soapy; prefer redo
    when unsure.
- **substitutions:**
  - buttermilk (1 cup) → 1 Tbsp lemon juice or 5 % white vinegar + milk to 1 cup, rest 5–15 min. sources:
    KA-BUTTERMILK, ATK-BUTTERMILK.
  - buttermilk (1 cup) → 1 cup milk + 1½ tsp cream of tartar (milder taste). sources: ATK-BMPANCAKE;
    *provisional: true* (one source).
  - buttermilk ↔ plain yoghurt thinned with milk (¾ cup yoghurt + ¼ cup milk). sources: KA-BUTTERMILK,
    ATK-BUTTERMILK.
  - lemon ↔ vinegar in a soda batter: 1:1 by volume (both ≈ 5 % acid). sources: KA-BUTTERMILK, MCG-13.
- **changes:** less — not below 0.75 of the recipe's acid when soda is used; more — up to 1.5 (tangier).
  *provisional: true*.
- **shows:** Fizzing/bubbling as soon as acid meets soda (if the bubbles are gone before the pan goes in, gas is
  lost). Under-acid: batter darker/yellow, baked crumb yellow-brown spots, soapy smell. Over-acid: pale, flat,
  dense. Soured milk: visibly thickened and slightly curdled — expected. sources: MCG-10, KA-BUTTERMILK.

---

### role: sugar-baking
- **name:** Dry sugars in baking — granulated, brown, powdered
- **does:** baking/pastry: sweetness; **structure and texture** — tenderises (limits gluten and delays egg/starch
  setting), holds moisture, controls cookie spread (more sugar → more spread, crisper edges), aerates when
  creamed with butter, stabilises meringue, browns (caramelisation/Maillard), feeds yeast. Brown sugar adds
  moisture, molasses acidity (reacts with soda), chew.
- **tight:** true for meringue, candy/caramel, custards' sweetness/setting, cookies and creamed cakes; false
  for muffins/quick breads (±25 %).
- **items/aliases:** granulated sugar (white sugar, caster/superfine — finer, same weight), light brown sugar,
  dark brown sugar, muscovado, demerara/turbinado (coarse, for topping), powdered sugar (confectioners', icing
  sugar — contains cornstarch; ≈ ½ weight per cup).
- **bands:**
  - **cookies, creamed cakes, brownies (before baking):**
    - below 0.67 → fixable (rescue: `add-more`) only if caught before creaming / before mixing the wet and dry;
      once creamed and mixed → redo for cookies and creamed cakes (spread, texture and aeration depend on it).
    - below 0.85 → fine (less sweet, slightly drier/cakier, less spread).
    - below 1.15 → fine.
    - below 1.5 → fixable (rescue: `scale-batch`) — cookie dough / brownie batter only (S ≤ 2); creamed cake →
      redo.
    - above 1.5 → redo (cake: sinks, gummy, sticky crust; cookies: spread thin and burn).
  - **muffins, quick breads, pancakes, yeast breads (sweet doughs):**
    - below 0.5 → fixable (`add-more`, before baking).
    - below 0.67 → fine (≈ ⅓ less sugar: noticeably less sweet, paler, dries sooner).
    - below 1.25 → fine.
    - below 2.0 → fixable (`scale-batch`, before baking / before bulk rise).
    - above 2.0 → redo (sweet yeast dough: high sugar slows yeast).
  - **meringue, caramel, candy, sorbet, jam:** below 0.9 → redo (stability/setting/freezing point depend on
    exact sugar); below 1.1 → fine; above 1.1 → redo. Exception — caramel/candy not yet cooking: rescale the water
    and sugar together (`scale-batch`). sources: BT (meringue/candy formulas), MCG-12, MC.
  - sources for cookie/cake/muffin bands: ACES-ALTER, UGA-ALTER (sugar can be cut by ≈ ⅓ in most quick
    breads/cookies with noticeable but acceptable change; more fails), MCG-10, MCG-12, ATK-SGC, BT. Upper
    thresholds *provisional: true* (no source gives an over-sugar tolerance).
- **rescues:**
  - `add-more` — kind add; role same sugar; shortfall, whisked into the wet ingredients or creamed butter;
    before baking only. say: "Good catch — it isn't baked yet, so stir the rest of the sugar in now."
    sources: BT, ATK-SGC. *provisional: true* (rescue not stated explicitly).
  - `scale-batch` — as `salt` (non-aerated doughs only).
- **substitutions:**
  - light brown (1 cup) → 1 cup granulated + 1 Tbsp molasses (ATK) / 2 tsp (KA); dark brown → + 2 Tbsp (ATK) /
    1 Tbsp (KA). Sources disagree; record KA's lighter amount as the *safer* (less change) default and ATK as the
    upper bound. Effect: near-identical. sources: ATK-SWEET, ATK-BROWN, KA-BROWN, KA-SUGARS.
  - brown for white, 1:1 packed: moister, chewier, darker, slightly more lift with soda; cookies spread
    differently. sources: KA-SUGARS, ATK-SGC.
  - white for brown, 1:1: crisper, paler, less moist; in a soda-only recipe slightly less lift. sources: KA-BROWN,
    ATK-SWEET.
  - powdered for granulated: **no** (cornstarch, different volume). Granulated → powdered: 1 cup sugar + 1 tsp
    cornstarch, blended; fine for dusting, worse in icing. sources: ATK-SWEET, KA-SUGARS.
  - liquid sweetener for sugar: see `liquid-sweetener` (ATK: replace no more than half).
- **changes:** less — down to ⅔ (R = 0.67) in quick breads/muffins; down to ≈ 0.85 in cookies/creamed cakes;
  none in meringue/candy. more — up to 1.15 (cookies/cakes), 1.25 (muffins). sources: ACES-ALTER, UGA-ALTER,
  BT, ATK-SGC.
- **shows:** Too little: pale crust, cookies that don't spread (puffy, cakey), cake domed/dry. Too much:
  cookies spread into thin lace and brown fast; cake with sticky, dark crust that sinks in the centre. Brown vs
  white: visible colour of the sugar and of the dough. Creamed butter-sugar that stays dense/greasy = sugar
  short or butter too warm. sources: BT, KA-SUGARS, MCG-12.

---

### role: sugar-savory
- **name:** Sugar in savory cooking (pinch in tomato sauce, glazes, marinades, stir-fry sauces, braises)
- **does:** sauce / braise / saute / roast: balances acid, bitterness and salt; promotes browning/caramelisation
  in glazes; in stir-fry sauces and BBQ sauces it is a main flavour. Burns above ≈ 170–180 °C (dark, bitter).
- **tight:** false (adjustable), except glazes under high heat (burning).
- **items/aliases:** sugar, brown sugar, palm sugar, honey/maple/molasses when used in savory (see also
  `liquid-sweetener`).
- **bands (default savory):**
  - below 1.0 (incl. forgot) → fixable (`add-more`, dissolve in the sauce, taste).
  - below 1.5 → fine.
  - below 3.0 → fixable (rescue: `balance-sweet` — acid then salt, or `scale-batch`).
  - above 3.0 → redo.
  - **glaze under broiler/grill:** above 1.5 → watch for scorching; reduce heat; else same bands.
  - sources: SFAH-ACID (acid and salt balance sweetness), MCG-12, ATK-SGC. Thresholds *provisional: true*.
- **rescues:**
  - `add-more` — kind add. say: "Add a pinch more sugar and let it dissolve." sources: SFAH-ACID, ATK-SGC.
  - `balance-sweet` — kind: add; role: acid (≈ 1 tsp lemon/vinegar per excess tsp sugar) plus a pinch of salt;
    valid R < 3. say: "It's a touch sweet — add a squeeze of lemon and a pinch of salt, then taste."
    *provisional: true* for the per-unit amount (SFAH-ACID describes the principle).
  - `scale-batch` — as `salt`.
- **substitutions:** honey/maple for sugar in savory: 1:1 by volume (sweeter, browns faster; reduce heat);
  brown for white: 1:1 (molasses note). sources: KA-LIQSWEET, ATK-SWEET (liquid sweeteners), SFAH-ACID.
  *provisional: true* for savory specifically.
- **changes:** less — any; more — R ≤ 1.5.
- **shows:** Over-sweet glazes darken fast and blacken at the edges; sticky, shiny surface. Burnt sugar smells
  acrid. sources: MCG-12.

---

### role: liquid-sweetener
- **name:** Liquid sweeteners — honey, maple syrup, molasses, corn/golden syrup, agave
- **does:** baking/pastry: sweetness + moisture + softer, moister crumb; brown faster than sugar (honey most);
  honey and molasses are acidic (react with soda); invert/corn syrup prevents sugar crystallisation (candy,
  caramel, ice cream, pecan pie). Savory: glazes, dressings, sauces (see `sugar-savory`).
- **tight:** true in candy/caramel, pecan pie, ice cream and any recipe where the syrup is structural; false in
  dressings/marinades.
- **items/aliases:** honey, maple syrup (pure maple; "pancake syrup" is flavoured corn syrup — not the same),
  molasses (light, dark, blackstrap — bitter), light/dark corn syrup, golden syrup (Lyle's), agave nectar,
  date syrup, brown rice syrup.
- **bands:**
  - **baking (as listed sweetener):** below 0.75 → fixable (`add-more` before baking); below 1.25 → fine; below
    1.5 → fixable (`scale-batch`, non-aerated only); above 1.5 → redo (wet, gummy, over-browned).
    sources: KA-LIQSWEET, ATK-SWEET, MU-HONEY. Thresholds *provisional: true*.
  - **candy, caramel, pecan pie, ice cream base:** below 0.9 → redo (crystallisation/setting risk); below 1.1 →
    fine; above → redo — unless not yet heating → `scale-batch`. sources: BT, MCG-12. *provisional: true* for
    exact thresholds.
  - **savory, dressings, glazes:** use `sugar-savory` bands.
- **rescues:** `add-more`, `scale-batch` (as above); `balance-sweet` in savory.
- **substitutions (replacing 1 cup granulated sugar in baking):**
  - **honey:** ¾ cup (KA) — extension gives ½–⅔ cup. Reduce other liquid 3–4 Tbsp (KA) to ¼ cup (Missouri, ATK)
    per cup honey; add ¼ tsp baking soda per cup honey (Missouri); bake ≤ 350 °F / lower the oven 25 °F (both);
    browns faster, moister, denser in creamed cakes. **Safer default:** ¾ cup, −¼ cup liquid, +¼ tsp soda,
    −25 °F, and **replace no more than half the sugar** (ATK). sources: KA-LIQSWEET, MU-HONEY, ATK-SWEET.
  - **maple syrup:** 1:1 volume, reduce liquid 3–4 Tbsp per cup (KA) / ¼ cup (ATK); slightly faster browning;
    cookies spread more, cakier; replace ≤ half the sugar. sources: KA-LIQSWEET, ATK-SWEET.
  - **molasses:** strong flavour — use only as part of the sweetener; blackstrap turns bitter. sources:
    KA-LIQSWEET, ATK-SWEET.
  - **sugar for honey (reverse):** 1¼ cups sugar + ¼ cup extra liquid per cup honey. *provisional: true*.
  - **corn syrup ↔ golden syrup:** 1:1 in candy/pies (golden is more flavoured). honey for corn syrup in candy:
    no — honey can crystallise and scorches. *provisional: true* (BT only).
  - **pancake syrup for maple:** not a substitute in baking (thinner, artificial flavour). *provisional: true*.
- **changes:** less — down to 0.75 in quick breads; more — up to 1.25. *provisional: true*.
- **shows:** Over-browning, dark tops before the centre is done (tent with foil); batter noticeably looser;
  honey cakes with small pinholes on top. sources: KA-LIQSWEET, MU-HONEY.

---

### role: vanilla-extract
- **name:** Vanilla (extract, paste, bean)
- **does:** baking/pastry/custard/frosting: aroma; rounds sweetness. Pure extract is ≈ 35 % alcohol; in baked
  goods much aroma and all the "boozy" edge bake off — baked goods tolerate excess; **uncooked** uses (whipped
  cream, buttercream, no-bake fillings) do not (raw alcohol and bitterness).
- **tight:** false in baked goods; true-ish in uncooked preparations.
- **items/aliases:** pure vanilla extract, imitation vanilla (vanillin), vanilla bean paste, vanilla bean/pod,
  vanilla powder, vanilla sugar.
- **bands:**
  - **baked (batter/dough before baking; also cooked custards before cooking):** `R = 0` → fixable (`add-more`
    before baking; after baking → fine — less aromatic, still good). below 3.0 → fine (a tablespoon for a
    teaspoon in a cake or cookie is fine). below 4.0 → fixable (`scale-batch`, non-aerated). above 4.0 → redo.
  - **uncooked (frosting, whipped cream, no-bake):** `R = 0` → fixable (`add-more`). below 1.5 → fine. below
    3.0 → fixable (`scale-batch` — make more frosting/cream, S = R ÷ 1.5). above 3.0 → redo.
  - sources: MCG-8 (vanilla chemistry; alcohol; heat-volatile aroma), ATK-SGC / ATK-VANILLA (taste-test finding:
    in baked goods imitation and pure taste similar because much flavour bakes off), BT (Parks uses generous
    vanilla). Thresholds *provisional: true*.
- **rescues:** `add-more` — kind add; say: "Pop the vanilla in now; it isn't baked yet." `scale-batch` for
  frosting. sources: MCG-8, BT. *provisional: true*.
- **substitutions:**
  - vanilla paste for extract: 1:1. *provisional: true* (KA-SUGARS-era KA guidance; second source not found).
  - 1 vanilla bean ≈ 1 Tbsp extract (scrape seeds; for 1 tsp extract use ⅓ bean). *provisional: true*.
  - imitation for pure: 1:1 in baked goods (indistinguishable for many tasters); in uncooked use, flatter.
    sources: ATK-VANILLA, MCG-8.
  - omit entirely: allowed (minor flavour loss) — fine. sources: MCG-8, ATK-SGC.
  - bourbon/rum/brandy for vanilla: 1:1 in baking. *provisional: true*.
- **changes:** less — any (flatter); more — up to 2–3× in baking, 1.5× uncooked. *provisional: true*.
- **shows:** Extract slightly browns pale frostings and whipped cream (dark flecks for paste/bean seeds);
  strong alcohol smell in uncooked mixtures. sources: MCG-8.

---

### role: almond-extract
- **name:** Almond extract (bitter-almond / benzaldehyde flavour), and similar potent extracts (peppermint,
  lemon oil, rose/orange-flower water)
- **does:** baking/pastry: a very concentrated flavour (benzaldehyde); a quarter-teaspoon flavours a cake.
  Excess tastes medicinal/bitter, "cherry cough-drop".
- **tight:** true.
- **items/aliases:** almond extract (pure, imitation), bitter almond oil, amaretto (much weaker), peppermint
  extract, lemon extract, orange-flower water, rose water.
- **bands (all kinds):**
  - `R = 0` → fixable (`add-more`, before baking); after baking → fine (lost flavour).
  - below 1.5 → fine.
  - below 2.0 → fixable (`scale-batch`, non-aerated, before baking; or make more frosting).
  - above 2.0 → redo. ("A teaspoon instead of a quarter-teaspoon" = R 4 → redo.)
  - sources: MCG-9 (almonds, benzaldehyde, bitter-almond flavour potency), BT. *provisional: true* for numbers.
- **rescues:** `add-more`, `scale-batch` (as above). say for over-dose: "Almond extract is very strong — at
  double we can only save it by making a bigger batch; otherwise start again." *provisional: true*.
- **substitutions:** almond for vanilla: ¼–½ the amount — start at ¼; vanilla for almond: 2–4× and the dish
  loses its almond character; amaretto for almond extract ≈ 4–6× (adds liquid, sugar). *provisional: true*
  (no trusted source found; only secondary blogs).
- **changes:** less — any; more — ≤ 1.5×.
- **shows:** Invisible; strong marzipan smell. sources: MCG-9.

---

## Source registry

URLs marked ✔ were fetched/confirmed on 2026-10-30; ◐ were found by search (title/snippet seen, not fully read);
books are cited by chapter from the editions named — **page numbers were not verified** (see open questions).

| ID | Source |
|---|---|
| MCG-1 | Harold McGee, *On Food and Cooking* (rev. ed., Scribner 2004), ch. 1 "Milk and Dairy Products" — acid/heat curdling; cream's resistance. |
| MCG-4 | McGee 2004, ch. 4 "Fish and Shellfish" — fish sauces; acid "cooking" (ceviche). |
| MCG-6 | McGee 2004, ch. 6 "A Survey of Common Vegetables" / ch. 5 — chlorophyll and acid; pectin firming. |
| MCG-7 | McGee 2004, ch. 7 "Fruits" — citrus acids. |
| MCG-8 | McGee 2004, ch. 8 "Flavorings from Plants" — herbs, spices, chiles & capsaicin, vanilla, cinnamon. |
| MCG-9 | McGee 2004, ch. 9 "Seeds" — soy sauce, miso; almonds and benzaldehyde. |
| MCG-10 | McGee 2004, ch. 10 "Cereal Doughs and Batters" — salt in bread dough; sugar; chemical leaveners. |
| MCG-11 | McGee 2004, ch. 11 "Sauces" — vinaigrettes and emulsions. |
| MCG-12 | McGee 2004, ch. 12 "Sugars, Chocolate, and Confectionery". |
| MCG-13 | McGee 2004, ch. 13 "Wine, Beer, and Distilled Spirits" — vinegar. |
| MCG-14 | McGee 2004, salt sections (index "salt"; see open questions for chapter). |
| SFAH-SALT | Samin Nosrat, *Salt Fat Acid Heat* (Simon & Schuster 2017), "Salt" chapter — salt types, kosher brands, seasoning, correcting over-salting. |
| SFAH-ACID | Nosrat 2017, "Acid" chapter — balancing acid, using acid to correct flatness and sweetness. |
| FL | J. Kenji López-Alt, *The Food Lab* (Norton 2015) — stir-fry sauces, pasta water, eggs. |
| BT | Stella Parks, *BraveTart: Iconic American Desserts* (Norton 2017) — salt (Diamond Crystal), sugar, meringue, candy, vanilla. |
| MC | Myhrvold et al., *Modernist Cuisine at Home* (2012) — sugar/candy. |
| ATK-SGC | America's Test Kitchen, *The Science of Good Cooking* (2012). |
| ATK-SALT ✔ | https://www.americastestkitchen.com/cooksillustrated/how_tos/5799-salt-types-and-measurements |
| ATK-KOSHER ◐ | https://www.americastestkitchen.com/taste_tests/2109-kosher-salt (Morton 4.8 g/tsp, DC 2.8 g/tsp) |
| ATK-SBUTTER ◐ | https://www.americastestkitchen.com/how_tos/6180-cooking-with-salted-butter |
| ATK-SWEET ✔ | https://www.americastestkitchen.com/cooksillustrated/how_tos/5528-how-to-substitute-sugars-and-other-sweeteners |
| ATK-BROWN ◐ | https://www.americastestkitchen.com/cooksillustrated/how_tos/5704-turning-white-sugar-into-brown |
| ATK-HERBS-SUB ◐ | https://www.americastestkitchen.com/how_tos/9261-science-substituting-dried-herbs-for-fresh ; https://www.americastestkitchen.com/how_tos/5531-how-to-substitute-herbs |
| ATK-HERBS-USE ◐ | https://www.americastestkitchen.com/how_tos/5703-using-dried-herbs |
| ATK-BUTTERMILK ◐ | https://www.americastestkitchen.com/articles/7094-answering-all-your-buttermilk-questions-from-storage-to-substitutions-to-recipes |
| ATK-BMPANCAKE ◐ | https://www.americastestkitchen.com/how_tos/8239-buttermilk-substitutes-for-pancakes |
| ATK-VANILLA | Cook's Illustrated vanilla extract taste test (americastestkitchen.com taste_tests — URL not confirmed). |
| KA-SALT-PRO ✔ | https://www.kingarthurbaking.com/pro/reference/salt |
| KA-FORGOT ✔ | https://www.kingarthurbaking.com/blog/2021/08/31/what-if-i-forgot-salt-or-yeast-in-bread-dough |
| KA-SALT-BLOG ◐ | https://www.kingarthurbaking.com/blog/2020/07/29/why-is-salt-important-in-yeast-bread |
| KA-BUTTER ◐ | https://www.kingarthurbaking.com/blog/2016/08/18/butter-baking |
| KA-LIQSWEET ✔ | https://www.kingarthurbaking.com/blog/2017/08/18/baking-with-liquid-sweeteners |
| KA-BROWN ◐ | https://www.kingarthurbaking.com/blog/2020/03/04/substitute-for-brown-sugar |
| KA-SUGARS ◐ | https://www.kingarthurbaking.com/blog/2023/03/21/a-guide-to-different-types-of-sugars-how-to-use-them-and-when-to-substitute |
| KA-BUTTERMILK ◐ | https://www.kingarthurbaking.com/blog/2019/01/28/buttermilk-substitute |
| KA-CINN | King Arthur Baking guidance on cinnamon slowing yeast in swirl breads (blog; URL not confirmed). |
| MU-HONEY ✔ | University of Missouri Extension GH1120 — https://extension.missouri.edu/gh1120 |
| ISU-CURDLE ◐ | Iowa State Univ. Extension AnswerLine — https://blogs.extension.iastate.edu/answerline/2018/02/15/tips-for-avoiding-curdling/ |
| ACES-ALTER ◐ | Alabama Cooperative Extension, "Altering Recipes for Better Health" — https://www.aces.edu/blog/topics/health/altering-recipes-for-better-health/ |
| UGA-ALTER ◐ | Univ. of Georgia Extension FDNS-E-89-22a — https://fcs.uga.edu/docs/FDNS-E-89-22a.pdf |
| PSU-HERBS ◐ | Penn State Extension — https://extension.psu.edu/preserving-herbs-by-drying (1 Tbsp fresh = 1 tsp dried = ¼ tsp ground) |
| OSU-HERBS ◐ | Oregon State Extension — https://extension.oregonstate.edu/food/preservation/drying-herbs |
| NCHFP-HERBS ◐ | National Center for Home Food Preservation — https://nchfp.uga.edu/how/dry/recipes/herbs/ |
| USDA-FDC | USDA FoodData Central — https://fdc.nal.usda.gov/ (sodium per serving for soy sauce, fish sauce, miso, table salt) |
| WOLKE | Robert L. Wolke, *What Einstein Told His Cook* (Norton 2002) — tests the potato-absorbs-salt myth. |

---

## Open questions / uncertainties

1. **Serious Eats could not be fetched** (blocked to this agent's crawler). Kenji's book *The Food Lab* stands in;
   the Serious Eats salt guide and baking-soda articles should be added by a human pass — they would lift several
   `provisional` flags (salt conversion, acid/soda chemistry, hot-sauce heat).
2. **Book page numbers were not verified**; chapter attributions for McGee are from the 2004 edition's structure.
   McGee's main *salt* discussion (MCG-14) needs its exact chapter confirmed.
3. **Almost no trusted source publishes an *over-dose* tolerance.** All upper thresholds (1.25 / 1.5 / 2 / 3)
   are reasoned from dose ranges and the owner's redo-when-in-doubt rule, and are marked provisional. They should
   be calibrated by tasting tests (e.g. a soup at R = 1.5, 2, 2.5 salt) before Serena relies on them.
4. **Scale caps (section 0) are an engineering choice**, not food science; the cook's pot size, remaining
   ingredients and willingness should be asked before a scale rescue is spoken.
5. **Salt-type ambiguity:** recipes saying "kosher salt" without a brand differ by 1.5×; code assumes the worse
   case. Weighing (grams) removes the problem where the recipe gives grams.
6. **Brown-sugar substitute amounts conflict** (KA 2 tsp / 1 Tbsp molasses vs ATK 1 / 2 Tbsp); honey amount
   conflicts (KA ¾ cup vs Missouri ½–⅔ cup). Lighter/safer values recorded as defaults.
7. **Condiment sodium figures vary by brand** by ±30 %; read the label when the camera can see it.
8. **Heat (capsaicin) varies by product and batch** by an order of magnitude; chili bands are the least reliable
   in this pack, and the cayenne-for-chili-powder trap is the single most damaging slip to catch.
9. **Extract substitution ratios** (vanilla bean/paste, almond for vanilla) rest on secondary sources only.
10. Rescues that *mask* (dairy for heat, fat/sugar for acid, acid for sweetness) reduce perception only; they have
    been restricted to modest over-doses (R < 2–3) per the owner's rule.
