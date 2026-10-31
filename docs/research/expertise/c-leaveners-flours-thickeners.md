# Expertise pack C — leaveners, flours, starches, binders, coatings

Research for the coach's verdict engine. Code reads these bands; the model only phrases them.
Ratio everywhere = **actual amount ÷ recipe amount** (forgot = 0; tablespoon-for-teaspoon = 3; teaspoon-for-tablespoon ≈ 0.33).
Thresholds are read top to bottom: the first "below X" that the ratio is under wins; "above" is the remainder.

**House rules that apply to every role below (encode once, globally):**

- **Doubt → redo.** Where a band is provisional, the engine should prefer the more conservative neighbouring verdict.
- **Scale rescue cap = 2×.** "Scale batch" means making every *other* ingredient bigger by the same factor. It is offered only when ratio ≤ 2.0, the cook confirms they have the extra ingredients, the vessel/pan can hold it, and the mixture has *not yet been cooked*. A 3× slip (tbsp for tsp) is never rescued by scaling — it is redo. (Reason: tripling a batch is rarely practical at home, and partial scaling leaves the error in place.)
- **Oven gate.** Every leavener/binder "add" rescue requires that the item is **not yet in the oven / pan**. Once heat has set the structure, the verdict for a missing leavener or binder is redo (or "eat it as is", never "fixable").
- **Bake-time gate for chemical leaveners.** Soda (and the first action of double-acting powder) reacts on wetting; a batter that has sat mixed for more than ~20–30 min has spent some lift. This doesn't change verdicts, but the say-line should tell the cook to bake promptly after a rescue.

Source keys used below (full references in the Sources appendix):
`McGee` · `Corriher-BW` (Shirley Corriher, *BakeWise*) · `Beranbaum-CB` (*The Cake Bible*) · `ATK-SGC` (*The Science of Good Cooking*) · `ATK-web` · `ATK-GF` (*How Can It Be Gluten Free*) · `KA-web` · `KA-GF` · `CIA` (*The Professional Chef*) · `FoodLab` (Kenji López-Alt, *The Food Lab*) · `SE` (Serious Eats) · `Hamelman` (*Bread*) · `Reinhart` (*The Bread Baker's Apprentice*) · `Goyoaga` (Aran Goyoaga, *Cannelle et Vanille Bakes Simple*) · `MC` (*Modernist Cuisine*) · `Joy` (*Joy of Cooking*).

---

### role: baking-soda

- **name:** Baking soda
- **does:**
  - baking: leavening by reaction with an acid already in the recipe (buttermilk, yoghurt, brown sugar, molasses, natural cocoa, honey, lemon) → CO₂; also raises pH, which speeds browning, darkens cocoa, spreads cookies and weakens gluten (more tender, flatter).
  - other: tenderising/velveting meat (alkaline brine), softening beans, speeding onion browning — **not** covered by these bands (see open questions).
- **tight:** true
- **items/aliases:** baking soda, bicarbonate of soda, bicarb, bread soda (IE), sodium bicarbonate, NaHCO₃, cooking soda.
- **reference amount:** typical ¼ tsp per 1 cup (≈125 g) flour, or the amount the recipe's acid can neutralise (≈ ½ tsp per 1 cup buttermilk/yoghurt). [`Corriher-BW` ch. 1; `ATK-SGC` concept on leaveners]
- **potency:** ~3–4× baking powder by leavening power. [`KA-web` soda/powder substitutions; `ATK-SGC`]

**bands — baking (default):**

| ratio | verdict | rescue |
|---|---|---|
| below 0.75 (incl. 0 = forgot) | fixable | `add-missing-soda` (before oven only) |
| below 1.25 | fine | — |
| below 2.0 | fixable | `scale-batch` |
| above (≥ 2.0, incl. tbsp-for-tsp = 3) | redo | — |

- Taste threshold: excess soda beyond what the acid neutralises tastes soapy/metallic and gives a yellowish, coarse, over-browned crumb. A ~25% excess in a robustly flavoured bake (gingerbread, chocolate, banana bread) is generally not noticed; at ~1.5× it becomes detectable in delicate cakes and pancakes; at 2× it is reliably soapy/bitter with off colour. Hence fine < 1.25, rescue window 1.25–2.0 only by restoring the soda:everything ratio (scaling), and redo at ≥ 2. [`Corriher-BW` ch. 1 (excess leavening & soapy taste); `McGee` ch. 10 "Chemical leavenings"; `ATK-SGC`]
- Too little soda: dense, pale, flat, slightly sour/tangy (unneutralised acid). If noticed before baking, adding the missing soda works because the acid is still present. [`Corriher-BW` ch. 1; `KA-web` soda/powder substitutions]
- **provisional: true** for the exact 1.25 / 2.0 cut-points (sources agree on direction and on "double = bad", not on a published numeric threshold).

**rescues:**

- `add-missing-soda` — kind: add (role: baking-soda, amount = recipe amount × (1 − ratio)).
  Conditions: batter/dough not yet in the oven; sprinkle the shortfall evenly over the surface (or whisk it into 1 tbsp of the recipe's flour first, to avoid soapy pockets) and fold just until no streaks; bake immediately. Not for laminated or already-shaped doughs (redo).
  Say: "Not a problem — sprinkle in the missing soda, fold it through gently until there are no streaks, and get it straight into the oven."
  Sources: `Corriher-BW` ch. 1; `KA-web` (soda reacts immediately — bake promptly). Note: neither source explicitly endorses late addition; it follows from the chemistry both describe. **provisional: true**
- `scale-batch` — kind: scale (factor = ratio; cap 2.0; all other ingredients scaled, including the acid).
  Conditions: before cooking; cook has enough of everything; extra batter can be baked as a second pan/tray.
  Say: "Too much soda will taste soapy, so we'll make the batch bigger to match — I'll give you the new amounts."
  Sources: `Corriher-BW` ch. 1 (leavening must stay in proportion to flour/acid); `ATK-SGC`.
- **Not offered:** "add extra acid to neutralise excess soda" — it changes liquid, flavour and texture unpredictably; no trusted source gives a quantity. → redo instead.

**substitutions (I don't have baking soda):**

- Baking powder, **3 tsp per 1 tsp soda**. Effect: rise roughly matched but the recipe's acid is no longer neutralised → tangier, paler, less spread/browning; the larger powder dose can taste slightly bitter. Acceptable for quick breads/pancakes; not for recipes where soda > ½ tsp (that much powder starts tasting chemical) → redo there. [`KA-web` soda/powder substitutions; `SE` Food Lab baking-soda article (3:1)]
- Potassium bicarbonate, 1:1 (salt-free, slightly less browning). [`McGee` ch. 10] **provisional: true** (second trusted source not found).

**changes:**

- less: down to ~0.75× fine in acid-light recipes (slightly paler, less spread). [`Corriher-BW`; `ATK-SGC`]
- more: up to ~1.25× fine; more browning, flatter, more spread in cookies (BraveTart's cookie recipes use this deliberately). Beyond that, soapy. [`Corriher-BW`; `SE` (Stella Parks on soda & browning)]

**shows (camera):** batter foams/bubbles visibly soon after mixing (normal); excess soda → unusually dark/reddish-brown crust, freckled/speckled crumb, very flat spread cookies; too little → pale, flat, tight crumb, little or no doming. Most excess-soda damage (taste) is **invisible** → the engine must rely on the cook's report, not vision.

---

### role: baking-powder

- **name:** Baking powder (double-acting, the US/UK default)
- **does:**
  - baking/pastry: self-contained leavener (soda + one fast acid that reacts on wetting + one slow acid that reacts in the oven + starch). Cakes, muffins, scones, biscuits, pancakes, waffles, batters for frying.
- **tight:** true
- **items/aliases:** baking powder, double-acting baking powder, single-acting baking powder, Backpulver, levure chimique, polvo de hornear, Royal/Clabber Girl/Rumford (brands).
- **reference amount:** 1 to 1¼ tsp per 1 cup flour is the ceiling for most cakes; biscuits/scones up to ~1½–2 tsp per cup. [`Corriher-BW` ch. 1; `Beranbaum-CB` (leavening per cake flour; "too much leavening" faults)]

**bands — baking (default; cakes, muffins, quick breads, pancakes):**

| ratio | verdict | rescue |
|---|---|---|
| below 0.75 (incl. 0) | fixable | `add-missing-powder` (before oven only) |
| below 1.3 | fine | — |
| below 2.0 | fixable | `scale-batch` |
| above | redo | — |

**bands — pastry (biscuits, scones):** identical cut-points, but `add-missing-powder` only if the dough has *not* been cut/shaped (re-working a cut biscuit dough toughens it and melts the fat — redo). [`Corriher-BW` (biscuit chapter, ch. 5); `KA-web`] **provisional: true** for the pastry restriction.

- Too much powder: bubbles grow too large, rise and burst → the cake domes fast then **sinks/collapses** in the centre, coarse open crumb, bitter/metallic "chemical" aftertaste. Corriher identifies over-leavening as a leading cause of fallen cakes; Beranbaum lists it as a cause of coarse texture and sinking. [`Corriher-BW` ch. 1; `Beranbaum-CB` (cake faults); `McGee` ch. 10]
- Too little: dense, heavy, tight crumb, low volume, but tastes normal. [`KA-web` soda/powder substitutions; `Corriher-BW`]
- Rule of thumb: 1.25× is within normal recipe variation (recipes range 1–1¼ tsp/cup); 2× is reliably faulty. **provisional: true** for 1.3 exact.

**rescues:**

- `add-missing-powder` — kind: add (role: baking-powder, amount = recipe amount × (1 − ratio)).
  Conditions: before oven; whisk the shortfall into 1–2 tbsp of the recipe's flour (or sift over) and fold just to combine. Double-acting powder still gives its oven-stage lift, so a late addition works better than with soda. Do not beat (toughens cakes).
  Say: "That's fixable — whisk the missing powder into a spoonful of flour, fold it in gently, and we'll bake straight away."
  Sources: `McGee` ch. 10 (double-acting reacts again on heating); `KA-web` (double action; prompt baking).
- `scale-batch` — kind: scale (cap 2.0). Same conditions as for soda.
  Say: "That much powder would make it sink and taste bitter, so let's enlarge the batch to match — new amounts coming."
  Sources: `Corriher-BW` ch. 1; `Beranbaum-CB`.

**substitutions (I don't have baking powder):**

- Per 1 tsp baking powder: **¼ tsp baking soda + ½ tsp cream of tartar** (+ ¼ tsp cornstarch if storing). Effect: single-acting — reacts at once, bake immediately. [`KA-web` soda/powder substitutions; `ATK-SGC`]
- Per 1 tsp baking powder: ¼ tsp baking soda + ½ tsp lemon juice or white vinegar (or replace ½ cup of the liquid with buttermilk/yoghurt). Effect: slight tang; bake immediately. [`KA-web`; `Joy` (ingredient substitutions)]
- Self-raising / self-rising flour in place of plain flour + powder: 1 cup self-rising ≈ 1 cup AP + 1½ tsp baking powder + ¼ tsp salt. If the cook used self-rising flour *and* added the recipe's powder → effectively ~2.3× leavening → apply the ratio band (likely `scale-batch` or redo). [`KA-web` self-rising substitute; `Joy`]
- Not acceptable: baking soda alone without acid (soapy, little rise) → redo.

**changes:**

- less: to ~0.75× fine (slightly denser). [`Corriher-BW`; `KA-web`]
- more: to ~1.25× fine (more dome, slightly coarser). Above → collapse risk. [`Corriher-BW`; `Beranbaum-CB`]

**shows (camera):** batter looks normal either way at mixing. In the oven: excess → very rapid rise with big surface bubbles/craters, then a sunken centre and a "cratered" or cracked top after cooling; too little → flat top, no dome, dense cut crumb. Pancakes: excess → very puffy then deflating, speckled; too little → thin and flat.

---

### role: yeast

- **name:** Commercial yeast (instant / active dry / fresh) — with salt interaction
- **does:**
  - baking: biological leavening and flavour in bread, pizza, rolls, enriched doughs; gluten-free boules too.
- **tight:** false for quantity (time compensates); true for temperature (≥ 60 °C / 140 °F liquid kills yeast — redo the yeast, not the recipe).
- **items/aliases:** instant yeast, rapid-rise, quick-rise, bread-machine yeast, fast-action (UK), easy-blend (UK), active dry yeast, dried active yeast (UK), fresh/cake/compressed yeast, levure boulangère, SAF, Fleischmann's, Red Star. One US packet = 7 g ≈ 2¼ tsp.
- **reference amount:** instant ~0.5–1.5% of flour weight for straight doughs; salt 1.8–2.2% of flour weight. [`Hamelman` (baker's percentages); `Reinhart`]

**bands — baking (default):**

| ratio | verdict | rescue |
|---|---|---|
| below 0.25 (incl. 0 = forgot) | fixable | `add-missing-yeast` (before baking) |
| below 0.75 | fine (longer rise) | `proof-by-sight` (advice) |
| below 1.5 | fine | — |
| below 2.0 | fixable | `proof-by-sight` + cooler/shorter proof |
| above | redo (or `scale-batch` only if ≤ 2.0 — so in practice redo) | — |

- Too little yeast is a time problem, not a failure: halving yeast roughly lengthens rises by ~1.5–2× and often improves flavour. [`KA-web` (using less yeast; active dry vs instant post); `Hamelman`; `Reinhart`]
- Too much (≥ 2×): very fast rise, beery/yeasty smell and taste, weak structure that overproofs and collapses, pale or uneven crust. 1.5–2× is manageable by shortening and cooling the proof (watch the dough, not the clock). [`Hamelman`; `KA-web`; `McGee` ch. 10 "Yeast"] **provisional: true** for the 1.5 / 2.0 cut-points.

**salt interaction (sub-bands, role `salt` in bread dough — to be cross-referenced with the salt pack):**

- Salt in direct, prolonged contact with yeast (dry, concentrated) can damage it; ATK says not to pour salt straight onto yeast. Mixing both into the flour, or brief contact, is fine. → If the cook dumped salt on the yeast and mixed within minutes: **fine**. [`ATK-web` "Working with yeast"; `Hamelman` (salt added with flour, or after autolyse)]
- Forgot salt (ratio 0) in bread dough: **fixable** if noticed before the bulk rise is ~half done — sprinkle it over the dough with a few drops of water and knead/fold in thoroughly. After shaping → **fine but bland** (no rescue; tell the cook). Salt-free dough rises faster and is slack/sticky. [`Hamelman` (late salt addition with autolyse); `Reinhart`; `McGee` ch. 10 (salt tightens gluten, slows fermentation)]
- Salt ≥ 2× in bread dough: strongly salty and markedly slowed fermentation → **redo** (or `scale-batch` if ≤ 2× and before bulk rise). [`Hamelman`; `McGee`] **provisional: true** for the exact threshold.

**rescues:**

- `add-missing-yeast` — kind: add (role: yeast, amount = recipe amount × (1 − ratio)).
  Conditions: dough not yet baked. Instant yeast: dissolve in 1–2 tbsp lukewarm (≈ 35–40 °C / 95–105 °F) water, then knead/squish into the dough until uniform; restart the first rise. Active dry: same, let it sit 5 min first.
  Say: "Easy fix — dissolve the yeast in a couple of spoons of warm water, work it into the dough until it's even, and we'll start the rise from now."
  Sources: `KA-web` (active dry vs instant: no proofing strictly needed; dissolving speeds dispersion); `Hamelman`. **provisional: true** (late incorporation endorsed by practice, not explicitly by both sources).
- `proof-by-sight` — kind: none (technique only: judge rise by volume — "doubled", finger-poke test — rather than the recipe time; for excess yeast, use cooler water, a cooler spot, or refrigerate to retard).
  Say: "It'll rise faster than the recipe says, so we'll go by the look of the dough — I'll tell you when it's doubled."
  Sources: `Hamelman`; `KA-web`; `Reinhart`.

**substitutions:**

- Instant ↔ active dry: **1:1** (KA; active dry ~15–20 min slower on a 1 h rise) vs ATK: use 25% less instant / 25% more active dry. Sources disagree; **safer encoded rule: treat 0.75–1.33 as "fine" either way** and do not flag. [`KA-web` 2022/08/15 active-dry-versus-instant; `ATK-web` "Working with yeast"]
- Fresh yeast ≈ 2–3× the weight of instant (common: 3× instant, 2× active dry). [`Hamelman`; `Reinhart`] 
- Sourdough starter for commercial yeast: not a coach-level substitution (changes timeline by many hours) → treat as "can't substitute; redo or pause". [`Hamelman`; `Reinhart`]
- No yeast at all and a quick bread is acceptable: not the same recipe → redo/choose another recipe.

**changes:**

- less: down to 0.5× safe — longer rise, more flavour. [`KA-web`; `Hamelman`]
- more: up to 1.5× safe if proofed by sight. [`Hamelman`; `Reinhart`]

**shows (camera):** dough rising very fast, large irregular bubbles, dough sagging/collapsing when touched (over-proofed); no visible rise after the expected time (dead/missing yeast — ask about liquid temperature); smells strongly of beer/alcohol.

---

### role: wheat-flour

- **name:** Wheat flour (all-purpose / plain, bread / strong, cake / soft, pastry, self-rising)
- **does:**
  - baking/pastry: the structure (gluten + starch). Protein content differs: cake ~7–9%, AP ~10–12%, bread ~12–14%.
  - sauce/braise: thickener via roux or dredge (bands under `starch-thickener`).
  - other: dredge / breading base (bands under `breading`).
- **tight:** true in cakes, cookies and pastry; moderate in yeast bread (hydration adjusted by feel).
- **items/aliases:** all-purpose flour, AP, plain flour, white flour, bread flour, strong flour, cake flour, soft flour, pastry flour, Italian 00 (roughly AP-to-bread), self-rising / self-raising flour (contains leavener + salt — see baking-powder), T55/T65, type 550.
- **measuring:** 1 cup AP = 120 g (King Arthur, spoon-and-level) vs ~142 g (ATK, dip-and-sweep); a scooped, packed cup can reach ~150 g. So a recipe-method mismatch is a real **+18–25% flour error** with no "slip" at all. [`KA-web` ingredient weight chart; `ATK-web` "Measuring flour" / "Working with flour"]

**bands — baking (cakes, cookies, quick breads, pastry; default):**

| ratio | verdict | rescue |
|---|---|---|
| below 0.6 | redo (batter far too loose; usually also means other measuring went wrong) | — |
| below 0.9 | fixable | `add-missing-flour` |
| below 1.1 | fine | — |
| below 1.3 | fixable | `scale-batch` (cakes) or `add-liquid-by-feel` (cookie doughs only — **not** cakes) |
| below 2.0 | fixable | `scale-batch` |
| above | redo | — |

- ±10% is inside the normal volume-measuring error the sources describe; 20–25% too much gives dry, tough, domed/cracked cakes and cakey cookies that don't spread; 20% too little gives spread, greasy cookies and sunken cakes. [`ATK-web` measuring flour; `KA-web` "how to measure flour"; `Corriher-BW`] **provisional: true** for the exact 0.6 floor.

**bands — baking, yeast bread (sub-kind):**

| ratio | verdict | rescue |
|---|---|---|
| below 0.8 | fixable | `add-missing-flour` (during mixing/kneading) |
| below 1.15 | fine (adjust water by feel) | — |
| below 1.5 | fixable | `scale-batch` (scale water, yeast, salt to the flour actually used) |
| above | redo | — |

[`Hamelman` (hydration and adjusting by feel); `Reinhart`; `KA-web`] **provisional: true** for 1.5.

**rescues:**

- `add-missing-flour` — kind: add (role: wheat-flour, amount = recipe × (1 − ratio)). Conditions: before baking; add in 2–3 additions and mix *only* until absorbed (over-mixing a cake batter toughens it). Say: "Add the rest of the flour in two goes and mix just until it disappears."
  Sources: `ATK-web` working with flour; `KA-web`.
- `scale-batch` — kind: scale (factor = ratio, cap 2.0). For yeast bread scale water, salt, yeast. Say: "We'll match the other ingredients to the flour you've got in."
  Sources: `Hamelman`; `Corriher-BW`.
- `add-liquid-by-feel` — kind: add (role: the recipe's liquid; ~1 tbsp per 30 g excess flour as a starting point, until the dough looks like the recipe describes). Cookie doughs/bread only. **provisional: true** (only practice guidance; no two sources give a number).

**substitutions:**

- Bread ↔ AP: 1:1 by weight. AP for bread flour → softer, less chewy, slightly lower rise; may need ~1–2% less water. Bread for AP in cakes → tougher; avoid (redo for cakes, fine for pizza/cookies). [`KA-web` (flour types); `ATK-web` working with flour]
- Cake flour from AP: per 1 cup, remove 2 tbsp AP and add 2 tbsp cornstarch, sift. Effect: close but not identical (chlorinated cake flour holds more sugar/liquid; Stella Parks argues it doesn't truly replicate it). [`ATK-SGC`; `Beranbaum-CB` (bleached cake flour's role); `SE` (Stella Parks on cake flour)]
- Self-rising for AP + leavener: see baking-powder role.
- Gluten-free 1:1 blend for wheat flour: acceptable in cookies, muffins, quick breads, cakes (some dryness); **not** in yeast bread or laminated pastry → redo. [`KA-GF`; `ATK-GF`]

**changes:** less: 0.9× fine; more: 1.1× fine (see bands).

**shows (camera):** batter much thicker/stiffer than expected (holds peaks, won't level) → too much flour; batter thin and runny where recipe says "thick", cookie dough glossy and slack → too little; bread dough tearing and stiff vs sticky puddle.

---

### role: gf-flour-binder

- **name:** Gluten-free flours, starches and binders (rice flour, tapioca starch, potato starch, sorghum, GF blends; psyllium husk, xanthan, guar)
- **does:**
  - baking: substitute structure. Starches (tapioca, potato) give stretch and chew; rice/sorghum give body; **binders** (xanthan, psyllium) replace gluten's elasticity and gas-holding. In pão de queijo, *tapioca starch alone* (scalded with hot milk/fat, then eggs + cheese) is the structure.
- **tight:** true for binders; moderate for the base flours (adjust by dough feel).
- **items/aliases:** white/brown rice flour, sweet/glutinous rice flour (mochiko — **not** interchangeable with rice flour), tapioca starch = tapioca flour = polvilho doce (sweet) / polvilho azedo (sour, fermented — different behaviour); cassava flour (whole root — **not** the same as tapioca starch despite some labelling), potato starch (≠ potato flour), sorghum, GF all-purpose / measure-for-measure blends (may already contain xanthan); psyllium husk (whole) and psyllium powder (~ finer, use less by volume); xanthan gum; guar gum.

**bands — xanthan (baking, default):** reference ¼ tsp per cup GF flour (cookies/base), ~⅜–¾ tsp per cup for cakes/muffins, more for bread; never more than ~1 tbsp per home recipe.

| ratio | verdict | rescue |
|---|---|---|
| below 0.5 (incl. 0) | fixable | `add-missing-binder` (before baking) |
| below 1.5 | fine | — |
| below 2.0 | fixable | `scale-batch` |
| above | redo (gummy, sticky, slimy crumb) | — |

- Forgot xanthan in cookies made with a blend that already contains it → fine. Ask whether the blend lists xanthan. [`KA-web` xanthan guide 2015; `KA-GF`]
- Sources: `KA-web` 2015/08/05 xanthan-gum (¼ tsp/cup baseline; too much → gummy; 1 tbsp max); `ATK-GF` (binder function; their blend uses xanthan). **provisional: true** for numeric cut-points (one source gives numbers).

**bands — psyllium (baking, GF yeast bread / boules):** recipes typically use psyllium at a few percent of flour weight (whole husk gelled in the recipe water).

| ratio | verdict | rescue |
|---|---|---|
| below 0.6 (incl. 0) | fixable | `add-missing-binder` — only before shaping |
| below 1.25 | fine | — |
| below 1.6 | fixable | `add-liquid-by-feel` (+ a little water; dough firmer) |
| above | redo (dense, gummy, rubbery crumb; darkened colour) | — |

- Too little: slack dough that won't hold a boule shape, spreads flat, crumbly loaf. Too much: stiff dough, gummy interior, purplish-grey tint with some brands. [`ATK-GF` (psyllium in breads); `Goyoaga` (psyllium gel boules)] **provisional: true** — both sources describe function; neither publishes tolerance numbers.

**bands — tapioca starch in pão de queijo (pastry/baking sub-kind):** the dough is meant to be adjusted by feel; brands differ in absorption.

| ratio | verdict | rescue |
|---|---|---|
| below 0.75 | fixable | `add-missing-flour` (role: tapioca starch, add until dough holds its shape, like choux paste) |
| below 1.2 | fine | — |
| below 1.5 | fixable | `add-liquid-by-feel` (milk, a tablespoon at a time, or extra egg) |
| above | redo (dry, cracked, dense puffs) | — |

[`KA-web` Brazilian cheese buns recipe (absorption varies; add more if thin); Leticia Moreinos Schwartz, *The Brazilian Kitchen* (pão de queijo method)] **provisional: true** — tolerance numbers are inferred from "adjust by feel".

**rescues:**

- `add-missing-binder` — kind: add (role: gf-flour-binder, the shortfall). Xanthan: whisk the powder into 1 tbsp sugar or oil (or a spoon of the dry mix) first, then beat into batter — added straight to wet batter it clumps into slimy lumps. Psyllium: stir into 2–3 tbsp water, let gel 5 min, knead in; only before shaping. Say: "Mix the xanthan into a spoonful of sugar first so it doesn't clump, then beat it in." **provisional: true** (dispersion advice from `KA-GF` + general hydrocolloid behaviour in `MC`; neither addresses late addition).
- `scale-batch` — kind: scale (cap 2.0). Sources: as xanthan band. **provisional: true**
- `add-liquid-by-feel` — kind: add (role: recipe liquid). **provisional: true**

**substitutions:**

- Guar ↔ xanthan: 1:1 in most recipes. [`KA-web` xanthan guide; `ATK-GF`]
- Psyllium ↔ xanthan: **not** 1:1 — different hydration; treat as no substitution in bread (redo or pause). [`ATK-GF`; `Goyoaga`] **provisional: true**
- Tapioca ↔ potato starch / cornstarch in a GF blend: roughly 1:1 by weight for small fractions (texture shifts — tapioca chewier). For **pão de queijo, no substitution** — tapioca is the structure → redo. [`KA-GF`; `ATK-GF`]
- Polvilho azedo ↔ doce: works, but azedo puffs more and tastes tangier. [Schwartz, *The Brazilian Kitchen*; `KA-web` blog 2010/02/20] **provisional: true**
- Rice flour ↔ sweet (glutinous) rice flour: **no** — redo.
- Wheat flour into a GF recipe: never "fine" — if the cook bakes for a coeliac guest, redo (safety, not texture).

**changes:** xanthan less 0.5× / more 1.5× (texture shifts only). Psyllium ±25%. [as above] **provisional: true**

**shows (camera):** GF batters look thicker and pastier than wheat; slack boule dough spreading on the board (too little psyllium/too much water); pão de queijo dough runny like pancake batter (too little tapioca) vs crumbly and cracking when rolled (too much); stringy, gelled lumps in batter (xanthan added straight to liquid).

---

### role: starch-thickener

- **name:** Starch and flour thickeners in sauces, gravies, braises, pie fillings
- **does:**
  - sauce/braise: thicken liquids by starch gelatinisation (cornstarch, arrowroot, tapioca, potato starch) or flour (roux, beurre manié, dredged meat, slurry).
  - pastry: thicken fruit pie fillings, custards (pastry cream).
- **tight:** false in stove-top sauces (correctable until served); true in baked pie fillings (can't be fixed once baked).
- **items/aliases:** cornstarch = cornflour (UK) = Maizena; arrowroot (powder/starch); tapioca starch/flour, quick-cooking/minute tapioca, tapioca pearls; potato starch (fécule); flour roux (blond/brown), beurre manié, slurry, Wondra/instant flour, Instant ClearJel.
- **reference amounts (medium-bodied sauce, per 1 cup / 240 ml liquid):** cornstarch ~1 tbsp (light ~1½–2 tsp); flour ~2 tbsp (in roux with 2 tbsp fat; light 1 tbsp, thick 3 tbsp); arrowroot ~1 tbsp; cornstarch has ~2× flour's thickening power. [`CIA` (roux & slurries; standard thickness ratios); `Joy` (white sauce thin/medium/thick); `McGee` ch. 11 "Starch" section]
- **behaviour:** cornstarch must reach a boil (~95 °C) to thicken, thins again with prolonged hard boiling/vigorous stirring and with acid; sets opaque-ish and goes spongy/weepy when frozen. Arrowroot thickens below the boil, is clear, tolerates acid and freezing, but thins with long cooking and turns slimy in dairy. Tapioca is glossy and freezes well, goes stringy if over-cooked. Flour is opaque, very stable to reheating, needs ~10–20 min simmer to lose raw taste. [`McGee` ch. 11; `CIA`; `KA-web` pie thickener guide (clarity, cornstarch must bubble)]

**bands — sauce / braise (default):**

| ratio | verdict | rescue |
|---|---|---|
| below 0.75 (incl. 0) | fixable | `add-slurry` (starch) or `add-beurre-manie` (flour) |
| below 1.35 | fine | — |
| below 2.5 | fixable | `thin-with-liquid` |
| above | redo (pasty, gluey; dilution needed exceeds the pan / flavour collapses) | — |

- Stove-top sauces are self-correcting: too thin and too thick are both reversible while the sauce is on the heat; only raw-starch taste and lumps are failure modes, both rescuable (simmer longer; strain or blend). [`CIA`; `McGee` ch. 11; `FoodLab` (pan sauces, slurries)] **provisional: true** for the 2.5 cap (practical judgement).

**bands — pastry (fruit pie filling, before baking / after baking):**

| ratio | verdict (before bake) | after bake |
|---|---|---|
| below 0.5 (incl. 0) | fixable — `add-missing-thickener` (toss into fruit; for quick tapioca, rest 15–30 min) | redo (runny; serve as cobbler/compote — no rescue) |
| below 1.3 | fine | fine |
| below 2.0 | fixable — `scale-batch` (add fruit) | fine-ish (firm, slightly pasty; no rescue) |
| above | redo | redo |

[`KA-web` pie thickener guide (per-cup amounts; tapioca rest; cornstarch must bubble through the crust); `ATK-web`/Cook's Illustrated pie testing; `Beranbaum` *The Pie and Pastry Bible*] **provisional: true** for cut-points.

**rescues:**

- `add-slurry` — kind: add (role: starch-thickener; shortfall amount of starch, stirred into **2× its volume of cold liquid**, never dry into hot liquid). Whisk into the simmering sauce, return to a gentle boil 30–60 s (cornstarch) / just until thick (arrowroot — don't keep boiling). Say: "Mix the cornstarch with twice as much cold water, whisk it in, and bring it back to a bubble."
  Sources: `CIA` (slurry method); `McGee` ch. 11; `FoodLab`.
- `add-beurre-manie` — kind: add (equal weights soft butter + flour kneaded; ~1 tbsp each per cup of sauce still needing body), whisk in small pieces, simmer ≥ 5 min to cook out flour taste. Say: "Rub together a spoon each of butter and flour, whisk it in a bit at a time and let it simmer."
  Sources: `CIA`; `Joy`; `McGee` ch. 11.
- `thin-with-liquid` — kind: add (role: the sauce's own liquid — stock, milk, water; start with ½ cup per cup of sauce per unit of excess ratio, i.e. liquid ≈ original liquid × (ratio − 1); then re-season). Say: "It's just thick — add a splash more stock, a little at a time, and taste for salt." Sources: `CIA`; `Joy`.
- `add-missing-thickener` (pie) — kind: add, before bake only. Sources: `KA-web` pie thickener; Beranbaum *Pie and Pastry Bible*.
- **Lumps** (any ratio): strain through a sieve or blitz with a stick blender — fine. [`CIA`; `Joy`]
- **Thinned after over-boiling cornstarch / acid:** add a fresh slurry once, brief boil; if it thins again → accept or redo (no repeated rescue). [`McGee` ch. 11; `CIA`] **provisional: true**

**substitutions (per 1 tbsp cornstarch):**

- Flour: **2 tbsp** (opaque, needs longer simmer). [`CIA`; `Joy`; `KA-web` pie chart shows flour weaker]
- Arrowroot: **1 tbsp** (some say 2 tsp; use 1 tbsp and adjust) — not in dairy sauces; add at the end. [`McGee` ch. 11; `ATK-SGC`] 
- Potato starch: ~1 tbsp (thickens fast, thins with boiling). [`McGee`; `MC` (starch table)] **provisional: true**
- Tapioca starch: sources **disagree** — general guides say ~2 tbsp tapioca per 1 tbsp cornstarch, while KA's pie chart needs *less* quick-cooking tapioca than cornstarch for berries. **Safer rule: substitute 1:1, then use `add-slurry` if thin** (thin is easy to correct; gluey is harder). [`KA-web` pie thickener; `McGee` ch. 11]
- Roux ↔ slurry: interchangeable in gravies/pan sauces (2 tbsp flour ≈ 1 tbsp cornstarch); a béchamel/velouté **needs** a roux (redo if the cook wants a true béchamel). [`CIA`; `Joy`]

**changes:** less: to 0.75× fine (looser sauce). more: to 1.35× fine (tighter, glossier). Pie: ±25% fine. [`CIA`; `KA-web`]

**shows (camera):** sauce coats the back of a spoon vs runs straight off (nappe test); gloopy/gel-like mass or visible lumps; cloudy vs clear glaze; pie filling soupy when cut (after bake — no rescue).

---

### role: breading

- **name:** Breadings and coatings (flour dredge → egg wash → crumb; panko, breadcrumbs, cornflakes, crackers; dry dredges)
- **does:**
  - saute/roast/other (shallow fry, deep fry, oven-fry): crisp crust, protects the food, carries seasoning. Flour dries the surface so the egg sticks; egg glues the crumb.
- **tight:** false
- **items/aliases:** all-purpose flour dredge, seasoned flour, egg wash, panko (Japanese breadcrumbs), dried breadcrumbs, fresh breadcrumbs, cornflake crumbs, crushed crackers/saltines, matzo meal, cornmeal, rice flour or cornstarch dredge (crisper, GF), buttermilk dip.

**bands — default (amount of each coating station):**

| ratio | verdict | rescue |
|---|---|---|
| below 0.5 | fixable | `make-more-station` (top up the dish) |
| above | fine (excess is discarded) | — |

**sequence slips (not ratio-based; encode as events):**

- Skipped flour before egg → fixable before cooking: wipe, dredge, re-dip, re-crumb (otherwise crust slips off in patches). After cooking → fine (cosmetic). [`CIA` standard breading procedure; `FoodLab` (cutlets / fried chicken chapter)]
- Skipped egg → fixable before cooking (crumb won't stick). [`CIA`; `ATK-SGC`]
- Wet hand/dry hand ignored, clumpy "club hands" → fine. [`CIA`; `FoodLab`]
- Breaded food not rested → fine; resting 10–20 min on a rack helps the coating adhere. [`ATK-SGC`; `FoodLab`] 
- Raw-meat contamination: leftover dredge/egg/crumb that touched raw poultry must be discarded, not reused for other foods — a food-safety rule, not a texture one. [USDA FSIS safe handling; `ATK-SGC`] **provisional: true** (cite in the food-safety pack).

**rescues:**

- `make-more-station` — kind: add (more of the same coating; any amount). Say: "Just top up the crumbs — there's no exact amount here." Sources: `CIA`; `FoodLab`.

**substitutions (by volume, crushed):**

- Panko ↔ dry breadcrumbs: 1:1. Panko is coarser, lighter and crisper and absorbs less oil; fine breadcrumbs give a denser, more even crust. [`FoodLab`; `ATK-SGC`]
- Crushed cornflakes ↔ crumbs: 1:1 (crushed). Very crunchy, browns faster, slightly sweet; good for oven-frying. [`ATK-web` oven-fried chicken (cornflake coating); `FoodLab`] **provisional: true** (exact recipe URLs not verified this pass)
- Crackers/saltines, matzo meal: 1:1 (saltier — reduce added salt). [`Joy`; `ATK-SGC`] **provisional: true**
- GF: rice flour or cornstarch dredge + GF panko/crushed GF cornflakes (check cornflakes are malt-free if coeliac). [`ATK-GF`; `FoodLab` (cornstarch for crisp crusts)]
- No egg: mayonnaise, buttermilk, or milk + mustard as the glue. [`FoodLab`; `ATK-SGC`] **provisional: true**

**changes:** less/more of any station: fine — only coverage changes.

**shows (camera):** bald patches, coating sliding off in sheets in the pan (skipped flour or overcrowded/moved too early); pale soggy crust (oil too cool — belongs to the frying pack); crumbs burning before the inside cooks (cornflakes/sugary coatings in very hot oil).

---

## Open questions / uncertainties

1. **No trusted source publishes numeric "fine/redo" tolerances.** The cut-points (1.25, 2.0, etc.) are interpolations from sources that agree on direction and on "double is a failure". They are marked provisional where that applies; the global "doubt → redo" rule should bias the engine toward the stricter neighbour.
2. **Soapy-taste threshold for soda** depends on how much acid the recipe has. A recipe with lots of buttermilk or molasses may absorb a 1.5× slip; one with only brown sugar will not. A better encoding would compute *excess soda beyond the acid* — not possible from the ratio alone.
3. **Instant vs active dry:** KA says 1:1, ATK says 25% different. Encoded as "fine either way" (0.75–1.33); confirm the owner is comfortable with that.
4. **Tapioca strength vs cornstarch:** sources conflict (general guides: tapioca weaker; KA's pie chart: quick tapioca stronger). Encoded 1:1 with an easy follow-up thicken. Pearl/quick tapioca vs tapioca starch also differ; the item map should keep them separate.
5. **Psyllium and pão de queijo tolerances** are inferred from "adjust by feel" guidance — weakest evidence in this pack. Worth a measured test bake on the owner's own boule and cheese-puff recipes (he bakes both) to set real numbers.
6. **Late addition of leaveners/binders** (forgot, caught before the oven) is standard practice and follows from the chemistry, but neither primary source explicitly endorses it; marked provisional. Pastry doughs already cut/shaped should stay redo.
7. **Cassava flour vs tapioca starch:** a KA blog post treats them as the same; they are not (cassava flour is the whole root, tapioca is the extracted starch). The alias map must keep them separate.
8. **Source access:** Serious Eats could not be fetched this pass; SE citations are from known Food Lab / Stella Parks articles and should be URL-verified before shipping. Book page numbers are given as chapter/section only — pages vary by edition.
9. **Baking soda in non-baking uses** (velveting meat ~¼ tsp per 250 g, beans, onions) has much looser tolerances, except taste; not banded here — route to a separate "other" role if the coach needs it.
10. **Self-rising flour + recipe leavener** is a common hidden double-dose; the engine should ask "plain or self-raising flour?" whenever leaveners are discussed.

## Sources appendix

- `McGee` — Harold McGee, *On Food and Cooking*, rev. ed. (Scribner, 2004): ch. 10 "Breads, Cakes, and Pastries" (sections on flour, yeast, chemical leavenings, batters); ch. 11 "Sauces" (starch thickeners: cornstarch, arrowroot, tapioca, potato, flour/roux).
- `Corriher-BW` — Shirley O. Corriher, *BakeWise* (Scribner, 2008): ch. 1 (leavening amounts per cup of flour, over-leavening and collapse, soda/acid balance); biscuit chapter.
- `Beranbaum-CB` — Rose Levy Beranbaum, *The Cake Bible* (1988): leavening and cake-fault sections. Also *The Pie and Pastry Bible* (1998): fruit-filling thickeners.
- `ATK-SGC` — America's Test Kitchen, *The Science of Good Cooking* (2012): concepts on leaveners, gluten/flour, starch thickeners, breading adhesion.
- `ATK-web` — https://www.americastestkitchen.com/lessons/articles/1651-working-with-yeast (salt and yeast; 25% conversion; 2¼ tsp per packet) · https://www.americastestkitchen.com/lessons/articles/1652-working-with-flour · https://www.americastestkitchen.com/cooksillustrated/how_tos/6573-measuring-flour (dip-and-sweep ≈ 5 oz/142 g).
- `ATK-GF` — America's Test Kitchen, *The How Can It Be Gluten Free Cookbook* (2014): GF blend, xanthan and psyllium in breads.
- `KA-web` — https://www.kingarthurbaking.com/blog/2021/09/10/difference-between-baking-soda-and-baking-powder-substitutions (3 tsp powder per 1 tsp soda; ¼ soda + ½ cream of tartar per 1 tsp powder; prompt baking) · https://www.kingarthurbaking.com/blog/2022/08/15/active-dry-versus-instant-yeast (1:1; +15–20 min) · https://www.kingarthurbaking.com/blog/2015/08/05/xanthan-gum (¼ tsp/cup; ≤ 1 tbsp; guar 1:1) · https://www.kingarthurbaking.com/learn/guides/pie-thickener (per-cup chart; properties) · https://www.kingarthurbaking.com/recipes/brazilian-cheese-buns-pao-de-queijo-recipe (tapioca absorption varies) · https://www.kingarthurbaking.com/blog/2010/02/20/gluten-free-and-lovin-it-cheese-buns-extraordinaire · KA ingredient weight chart (1 cup AP = 120 g).
- `KA-GF` — King Arthur Flour, *Gluten-Free Baking Companion* (2010) and https://www.kingarthurbaking.com/blog/2015/02/20/making-recipe-gluten-free.
- `CIA` — The Culinary Institute of America, *The Professional Chef*, 9th ed. (2011): roux, slurries, beurre manié, standard breading procedure.
- `FoodLab` — J. Kenji López-Alt, *The Food Lab* (2015): fried chicken / cutlets (breading, panko, cornstarch for crispness), pan sauces.
- `SE` — Serious Eats: Food Lab baking soda vs powder (3:1 substitution); Stella Parks (BraveTart) on cake flour and soda/browning. URLs to verify (site not fetchable in this pass).
- `Hamelman` — Jeffrey Hamelman, *Bread*, 2nd ed. (2012): baker's percentages, yeast and salt levels, hydration adjustment.
- `Reinhart` — Peter Reinhart, *The Bread Baker's Apprentice* (2001): yeast types and conversions, fermentation timing.
- `Goyoaga` — Aran Goyoaga, *Cannelle et Vanille Bakes Simple* (2022): psyllium-gel GF boules.
- `MC` — Nathan Myhrvold et al., *Modernist Cuisine* (2011), vol. 4: starches and hydrocolloids (xanthan, guar) dispersion.
- `Joy` — Rombauer et al., *Joy of Cooking* (2019 ed.): white sauce ratios, ingredient substitutions.
- Leticia Moreinos Schwartz, *The Brazilian Kitchen* (2010): pão de queijo with polvilho doce/azedo.
