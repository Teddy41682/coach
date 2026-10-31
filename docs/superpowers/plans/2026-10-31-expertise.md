# Serena's Expertise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the coach a sourced cooking knowledge pack organised by what ingredients do, a chef's brief per cook, code-decided verdicts for slips, substitutions and alterations, and an exam that proves it — in time to film the demo Tue 2026-11-03.

**Architecture:** The pack is typed data in the Worker. Session planning (`link.ts`) adds a code-built brief (parsed amounts, roles, kind of cooking, risky items). On a spoken turn, code detects a slip or a change request; code computes the verdict and quantities from the pack; the model only phrases it, and a code check falls back to a template if it dropped a number. The eyes flag a suspected slip; the Worker turns it into a fixed "how much went in?" question. The phone adds a prevent cue, a confirm question and a faster look rate on risky steps.

**Tech Stack:** Cloudflare Worker (TypeScript, vitest), CoachKit (Swift 6, swift-testing), Python tools (bench/exam), Muse Spark (standard tier) for the brief's kind-of-cooking call and for phrasing.

**Spec:** `docs/superpowers/specs/2026-10-31-expertise-design.md`

## Global Constraints

- Submission Wed 2026-11-04 4:00 PM HST; demo recipe chosen and filmed Tue 2026-11-03; breadth first, most common roles first.
- A seen amount never leads straight to a numbered verdict; numbers come only from a confirmed amount.
- Anything not in the pack/brief, or with an unknown amount after asking: the safe default (ask, or redo that part) — never an improvised rescue.
- A rule needs ≥ 2 trusted sources to drive a rescue; single-source rules are `provisional` and may only lead to ask/redo.
- Ordinary replies stay one streamed call; only slip turns may add one call (~1.5 s), with no filler line.
- Verdicts, tolerances and arithmetic live in the Worker; the phone only for the prevent cue, the confirm question and the look rate.
- Scaling is spoken only; the coach carries the scale factor for later steps. A scale-up is `fixable` only with no pan/bake-time change and no fractional egg beyond a half.
- J'habite recipes from his box stay out of git (private fixtures under `~/coach-recordings/exam-private/`); the public exam uses written recipes.
- The confirm question is asked once; the cook can carry on past it.
- Pack text in our own words, every rule cited; nothing copied. Standard tier only, never "contributor".
- No nutrition, allergy, dietary or medical advice; food safety unchanged.

## Review Focus

1. **Amount strings in the wild** ("1½ cups (190 g) flour, sifted", "to taste", "2-3 tbsp", "a splash") — parse what's numeric, return `null` for the rest, never throw; `null` routes to the safe default. → Task 1 tests.
2. **An ingredient named two ways** (recipe "vanilla extract", cook says "vanilla"; "baking soda" vs "bicarbonate") — slip detection must match by the index's aliases. → Task 3 + Task 6 tests.
3. **Units that don't convert** (cook says "a glug" or "half the bottle", recipe in grams vs cook in spoons) — unconvertible pair → ask once, then safe default. → Task 5 tests.
4. **Too little, not too much** ("I forgot the baking powder", "only half the sugar") — bands cover ratios below 1 (forgot = 0). → Task 5 tests.
5. **The cook's answer to "how much went in?" with no number** ("a lot", "not sure") — safe default, said once, no loop. → Task 6 tests.

---

### Task 0: What the pack must cover first (role frequency + private fixtures)

**Files:**
- Create: `tools/role_frequency.py`
- Output (not committed): `~/coach-recordings/exam-private/recipes.json`, `~/coach-recordings/exam-private/frequency.md`

**Interfaces:**
- Produces: a ranked list of ingredient items by how many of his recipes use them (drives Task 2's research order); ~40 real recipes as `CoachRecipe` JSON for Task 8's private exam.

- [ ] **Step 1:** Pull his box's recipes read-only: `cd ~/jhabite && npx wrangler d1 execute cookbook --remote --json --command "SELECT data FROM recipes WHERE cookbook_slug = 'osito'"` (SELECT only — memory: J'habite reads are SELECT-only). Convert each `data` to `{title, ingredients:[{amount,item}], steps}` the way `ios/JHabite/Recipe/Cook/Coach/CoachBridge.swift` does.
- [ ] **Step 2:** `tools/role_frequency.py <recipes.json>` prints items by recipe count (normalised: lower-case, singular, brand words dropped). Expected: a table; top rows include salt, butter, sugar, flour, eggs.
- [ ] **Step 3:** Write the top 120 items and a varied sample of 40 recipes (baking, sauces, braises, eggs, grains) to the private folder. Commit only `tools/role_frequency.py`.

### Task 1: Amounts in code

**Files:**
- Create: `worker/src/expertise/amount.ts`
- Test: `worker/test/amount.test.ts`

**Interfaces:**
- Produces:
  - `type Unit = "tsp" | "tbsp" | "cup" | "ml" | "l" | "g" | "kg" | "oz" | "lb" | "pinch" | "dash" | "each"`
  - `type Amount = { value: number; unit: Unit }`
  - `parseAmount(s: string): Amount | null` — first numeric quantity + unit in the string; fractions `1/2`, `1 1/2`, `½`, `1½`; ranges take the lower bound; words "a"/"an"/"one".."twelve"; no number → `null`.
  - `toBase(a: Amount): { value: number; dim: "volume" | "mass" | "count" | "pinch" }` — volume in ml (tsp 4.93, tbsp 14.79, cup 236.6), mass in g (oz 28.35, lb 453.6).
  - `ratio(actual: Amount, recipe: Amount): number | null` — `null` when dimensions differ.
  - `speakAmount(a: Amount): string` — "¾ cup", "1½ tsp", "2 eggs"; rounds to the nearest ⅛ for cups/spoons, 5 g for grams.
  - `scaleAmount(a: Amount, by: number): Amount`

- [ ] **Step 1: Failing tests** in `worker/test/amount.test.ts`:
```ts
expect(parseAmount("1 tsp")).toEqual({ value: 1, unit: "tsp" });
expect(parseAmount("1½ cups (190 g) flour, sifted")).toEqual({ value: 1.5, unit: "cup" });
expect(parseAmount("2-3 tbsp")).toEqual({ value: 2, unit: "tbsp" });
expect(parseAmount("a tablespoon")).toEqual({ value: 1, unit: "tbsp" });
expect(parseAmount("2")).toEqual({ value: 2, unit: "each" });
expect(parseAmount("to taste")).toBeNull();
expect(parseAmount("a splash")).toBeNull();
expect(ratio({ value: 1, unit: "tbsp" }, { value: 1, unit: "tsp" })).toBeCloseTo(3, 1);
expect(ratio({ value: 10, unit: "g" }, { value: 1, unit: "tsp" })).toBeNull();
expect(speakAmount({ value: 0.75, unit: "cup" })).toBe("¾ cup");
expect(speakAmount(scaleAmount({ value: 1, unit: "cup" }, 0.5))).toBe("½ cup");
```
- [ ] **Step 2:** `cd worker && npx vitest run test/amount.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implement `amount.ts` with the signatures above.
- [ ] **Step 4:** Re-run → PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5:** Commit `feat(expertise): amounts in code — parse, convert, ratio, speak`.

### Task 2: The pack's shape, its validator, and the first roles

**Files:**
- Create: `worker/src/expertise/cooking/types.ts`, `worker/src/expertise/cooking/roles/*.ts` (one file per role group), `worker/src/expertise/cooking/index.ts` (assembles `PACK`), `worker/src/expertise/cooking/validate.ts`
- Test: `worker/test/pack.test.ts`

**Interfaces:**
- Produces (in `types.ts`):
  - `type Kind = "baking" | "pastry" | "sauce" | "braise" | "saute" | "roast" | "eggs" | "grains" | "other"`
  - `type Verdict = "fine" | "fixable" | "redo"`
  - `type Band = { below: number; verdict: Verdict; rescue?: string }` — bands sorted by `below` (ratio actual/recipe); the first band whose `below` exceeds the ratio applies; the last band's `below` is `Infinity`.
  - `type Rescue = { id: string; kind: "scale" | "add" | "none"; add?: { role: string; per: number }; say: string; sources: string[] }` — `scale`: make the batch `ratio`-proportional, capped by Task 5's limits; `add`: add `per` × (excess in recipe units) of an ingredient filling `role` (e.g. salt over → liquid).
  - `type Substitution = { for: string /* role or item */; use: string; ratio: number; effect: string; sources: string[] }`
  - `type Change = { direction: "less" | "more"; upTo: number; effect: string; sources: string[] }`
  - `type Role = { id: string; name: string; does: string; tight: boolean; bands: Partial<Record<Kind, Band[]>> & { default: Band[] }; rescues: Rescue[]; substitutions: Substitution[]; changes: Change[]; shows: string; sources: string[]; provisional?: boolean }`
  - `type Pack = { version: string; roles: Role[]; index: Record<string, string[]> /* normalised item or alias → role ids */ }`
  - `validatePack(p: Pack): string[]` — errors: unsorted bands, missing `default`, last band not `Infinity`, a `rescue` id not in `rescues`, `add.role` unknown, an index role id unknown, a non-provisional rule (role, rescue, substitution, change) with fewer than 2 sources.
- Consumes: Task 0's frequency list (research order).

- [ ] **Step 1: Failing tests:** the shipped `PACK` validates with zero errors; a pack with an unsorted band, a single-source non-provisional rescue, and an unknown index role each produce exactly one named error; `PACK.index["vanilla"]` and `PACK.index["vanilla extract"]` both contain `"flavour-extract"`; `PACK.index["baking soda"]` and `["bicarbonate of soda"]` contain `"chemical-leavener-base"`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `types.ts`, `validate.ts`, and the first role files: `flavour-extract`, `chemical-leavener-base`, `chemical-leavener-powder`, `salt`, `sugar`, `fat-solid`, `egg` — content from Task 2R's first research batch.
- [ ] **Step 4:** Run → PASS; `tsc` clean.
- [ ] **Step 5:** Commit `feat(expertise): the cooking pack — roles, tolerance bands, rescues, a validator`.

### Task 2R: Researching the pack (Imogen, in parallel with Tasks 3–9)

**Files:** `worker/src/expertise/cooking/roles/*.ts`; research notes in `docs/research/expertise/<group>.md` (sources and the reasoning behind each band).

- [ ] **Step 1:** Batch the roles by group in Task 0's frequency order: (a) leaveners, salt, sugars, extracts/spices; (b) fats, eggs, dairy; (c) flours, starches, thickeners, liquids, acids; (d) proteins by doneness, aromatics, heat/time/mixing. One `anthropic-skills:deep-research` run per group (Opus), sources limited to recognised cookbooks, food-science references and test kitchens; each band, rescue, substitution and change cited ≥ 2 sources or marked `provisional`; where sources disagree, the safer verdict.
- [ ] **Step 2:** Encode each group as role files; extend `index` with the top-120 items and their common aliases.
- [ ] **Step 3:** `npx vitest run test/pack.test.ts` → PASS after each group. Commit per group `content(expertise): <group> roles, sourced`.

### Task 3: Ingredients to roles

**Files:**
- Create: `worker/src/expertise/cooking/lookup.ts`
- Test: `worker/test/lookup.test.ts`

**Interfaces:**
- Consumes: `PACK` (Task 2).
- Produces:
  - `normaliseItem(item: string): string` — lower-case, strip parentheticals, prep words (chopped, sifted, softened, divided, room temperature), brand words; singularise.
  - `rolesFor(item: string): Role[]` — exact index hit, else longest indexed phrase contained in the item ("unsalted butter, softened" → butter), else `[]`.
  - `mentionedItem(utterance: string, recipe: CoachRecipe): { item: string; recipeAmount: Amount | null } | null` — the recipe ingredient the words name, matching by the item's normalised form and its index aliases; longest match wins.

- [ ] **Step 1: Failing tests:** `rolesFor("1 tsp pure vanilla extract")` → `flavour-extract`; `rolesFor("unsalted butter, softened")` → `fat-solid`; `rolesFor("dragon fruit")` → `[]`; `mentionedItem("I put way too much vanilla in", cupcakes)` → `{ item: "vanilla extract", recipeAmount: {1, "tsp"} }`; `mentionedItem("used bicarbonate instead", recipeWithBakingSoda)` → baking soda.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(expertise): ingredients to roles, and which ingredient the cook means`.

### Task 4: The chef's brief

**Files:**
- Modify: `worker/src/link.ts` (StepPlan, SYSTEM, parse), `worker/src/index.ts:~150` (`/v1/session` response)
- Create: `worker/src/expertise/cooking/brief.ts`
- Modify: `ios/CoachKit/Sources/CoachKit/Models.swift` (`LinkedStep`)
- Test: `worker/test/brief.test.ts`, `worker/test/link.test.ts`, `ios/CoachKit/Tests/CoachKitTests/CoachSessionTests.swift` (decode)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `type Risky = { item: string; amount: Amount; roles: string[] }`
  - `StepPlan` gains `risky: Risky[]`; the plan gains `kind: Kind` (one per recipe; the link model call returns `"kind"`, validated against `Kind`, else `"other"`).
  - `buildBrief(recipe: CoachRecipe, steps: StepPlan[], kind: Kind): StepPlan[]` — per step, `risky` = the step's ingredients whose amount parses, whose roles include a `tight` role, and whose amount is ≤ 2 tbsp (or ≤ 30 g).
  - `/v1/session` steps gain `risky: [{item, amount: "1 tsp"}]`; `LinkedStep` gains `public var risky: [RiskyItem]?` with `RiskyItem { item: String; amount: String }` (optional: older Workers omit it).

- [ ] **Step 1: Failing tests:** cupcakes brief → step 2 `risky` = `[{ item: "vanilla extract", amount: {1,"tsp"} }]`, step 1 (butter + sugar, cups) has none; an unparseable amount ("to taste" salt) is not risky; link's model answer with `"kind":"baking"` → `kind === "baking"`, with `"kind":"cake"` → `"other"`; Swift decodes a step with and without `risky`.
- [ ] **Step 2–4:** FAIL → implement → PASS (worker vitest + `swift test`).
- [ ] **Step 5:** Commit `feat(expertise): the chef's brief — kind of cooking and risky measures, built in code`.

### Task 5: The verdict engine

**Files:**
- Create: `worker/src/expertise/cooking/verdict.ts`
- Test: `worker/test/verdict.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `type Ruling = { verdict: Verdict | "unknown"; item: string; ratio: number | null; role: string | null; rescue?: { kind: "scale" | "add"; by?: number; adds: { item: string; amount: Amount }[] }; reason: string; sources: string[] }`
  - `rule(item: string, said: Amount | null, recipe: CoachRecipe, kind: Kind): Ruling`
    - `said === null` or `ratio === null` → `unknown`.
    - Role = the tightest role of the item (a `tight` role first); band from `bands[kind] ?? bands.default`.
    - `fixable` with a `scale` rescue: `by = ratio` capped at 2; every other ingredient's add = `scaleAmount(amount, by - 1)`; if any egg add isn't a whole or half egg, or `by > 2`, the verdict becomes `redo` with `reason: "would need a bigger batch than one pan"`.
    - A rescue whose rule is `provisional` → `redo`.
  - `MAX_SCALE = 2`

- [ ] **Step 1: Failing tests** (the deterministic heart of the exam; values from the pack's bands once 2R(a) lands — write them against the shipped pack):
```ts
rule("vanilla extract", {value: 1.5, unit:"tsp"}, cupcakes, "baking").verdict === "fine"
rule("vanilla extract", {value: 3, unit:"tsp"}, cupcakes, "baking") → fixable, scale by 1.5, adds include ¾ cup flour, ½ cup sugar, 1 egg
rule("baking soda", {value: 1, unit:"tbsp"}, cookies /* 1 tsp */, "baking").verdict === "redo"
rule("baking powder", {value: 0, unit:"tsp"}, cupcakes, "baking").verdict === "fixable" // forgot: add before baking, if batter not yet in the oven — band below 1
rule("vanilla extract", null, cupcakes, "baking").verdict === "unknown"
rule("vanilla extract", {value: 10, unit:"g"}, cupcakes, "baking").verdict === "unknown" // can't compare units
```
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(expertise): verdicts in code — tolerance bands, scaling arithmetic, the safe default`.

### Task 6: Slip turns — spot, rule, phrase

**Files:**
- Create: `worker/src/expertise/cooking/slip.ts`
- Modify: `worker/src/index.ts` (`/v1/mind` spoken branch), `worker/src/turn.ts` (a `verdict` SSE event)
- Test: `worker/test/slip.test.ts`, `worker/test/mind-route.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - `detectSlip(utterance: string, timeline: string[], recipe: CoachRecipe): { item: string; said: Amount | null } | null` — a slip when the words name a recipe ingredient (Task 3) **and** carry an amount or a slip word (`too much|too little|extra|instead of|doubled|forgot|spilled|whole bottle|by mistake`), **or** the newest coach line in `timeline` is `How much <item> went in?` (the cook is answering).
  - `ASK = (item: string) => \`How much ${item} went in?\``; `SAFE = (item: string) => \`I can't be sure that'll come out right — let's redo that part with fresh ${item}.\``
  - `phraseRuling(r: Ruling, model): AsyncIterable<string>` — one Muse call; prompt carries the ruling and every number as text; Serena's voice; one or two sentences.
  - `keptNumbers(line: string, r: Ruling): boolean` — every `speakAmount` in `r.rescue.adds` appears in the line.
  - `template(r: Ruling): string` — fixed Serena-voice line per verdict with code's numbers.
  - The spoken branch: `detectSlip` → `null`: today's turn, unchanged. `said === null` and the newest coach line isn't already `ASK(item)`: stream `ASK(item)` (no model call). Asked already and still no amount: stream `SAFE(item)`. Else `rule(...)`; `unknown` → `SAFE`; else phrase, check `keptNumbers`, fall back to `template`. Emit `{type:"verdict", verdict, item, ratio}` before the text (the phone ignores unknown types — `decodeEvent` returns nil).

  - A `fixable` scale ruling stores `scale: number` on the session (`SessionRow.scale`, default 1); every later prompt for that session carries the code-computed scaled ingredient list ("The batch is now ×1.5: 2¼ cups flour, …"), and `rule` compares later slips against scaled amounts.

- [ ] **Step 1: Failing tests:** "oh no, way too much vanilla" → event `text` = "How much vanilla extract went in?", no model call; the same with timeline's last coach line = that ask and utterance "about a tablespoon" → `verdict` fixable + text containing "¾ cup"; utterance "not sure" after the ask → `SAFE`; a phrase that drops "¾ cup" → the template is spoken instead; "how's the batter looking?" → no slip, the ordinary turn runs; after the scale ruling, the session's `scale` is 1.5 and the next turn's prompt lists "2¼ cups" flour.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(expertise): slip turns — ask for the amount, rule in code, phrase, check the numbers`.

### Task 7: Substitutions and changes

**Files:**
- Create: `worker/src/expertise/cooking/change.ts`
- Modify: `worker/src/index.ts` (spoken branch, after `detectSlip`)
- Test: `worker/test/change.test.ts`

**Interfaces:**
- Produces:
  - `detectChange(utterance: string, recipe: CoachRecipe): { item: string; ask: "substitute" | "less" | "more" } | null` — `don't have|out of|instead of|swap|substitute|replace` → substitute; `less|cut|reduce|halve` → less; `more|double|extra` (no slip word) → more.
  - `answerChange(q, recipe, kind): { grounded: boolean; facts: string }` — the pack's substitution (ratio → `speakAmount`) or change entry for the item's roles; `grounded: false` when none.
  - Spoken branch: grounded → phrase with facts, numbers checked as in Task 6; not grounded → today's turn with the system line "Not in the pack: give your own judgement as judgement, or say you'd keep it as written."

- [ ] **Step 1: Failing tests:** "I don't have buttermilk" (recipe 1 cup buttermilk) → grounded, facts include "1 cup milk" + "1 tbsp lemon juice"; "can I cut the sugar in half?" in a cake → facts include the pack's `less` effect; "can I use dragon fruit instead?" → `grounded: false`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat(expertise): substitutions and changes from the pack`.

### Task 8: The eyes flag; the phone prevents and confirms

**Files:**
- Modify: `worker/src/mind.ts` (`MindAnswer.slip?: { item: string }`), `worker/src/expertise/mind-prompt.ts` (EYES: `"slip": {"item": "…"}` when an amount looks wrong — no numbers), `worker/src/index.ts` (eye branch: a `slip` replaces `say` with `"That looks like a lot of ${item} — " + ASK(item)` and `kind: "mistake"`)
- Modify: `ios/CoachKit/Sources/CoachKit/CoachSession.swift`, `ios/CoachKit/Sources/CoachKit/Eyes.swift`, `ios/CoachKit/Sources/CoachKit/UI/CoachRunner.swift`
- Test: `worker/test/mind-route.test.ts`, `ios/CoachKit/Tests/CoachKitTests/CoachSessionTests.swift`, `EyesTests.swift`

**Interfaces:**
- Consumes: `LinkedStep.risky` (Task 4), `ASK` wording (Task 6, copied as a Swift constant `CoachSession.ask(item:)`).
- Produces:
  - Prevent cue: after a step with `risky` is read, `say("Measure the \(item) into the spoon over the side, not over the bowl.")` once per risky item.
  - Confirm: before a step with unconfirmed `risky` items is left (eyes' next, cook's next or done), say `ask(item:)` once; the step still advances; the cook's answer goes to the Worker as an ordinary spoken turn (Task 6 handles it from the timeline).
  - `Eyes.lookFaster(_ on: Bool)` — on: spacing 1.5 s, working 2.5 s; runner turns it on while the current step has `risky`.

- [ ] **Step 1: Failing tests:** an eye answer with `slip: {item:"vanilla extract"}` → `say` = "That looks like a lot of vanilla extract — How much vanilla extract went in?" lower-cased after the dash, `kind` mistake; CoachSession on a risky step says the prevent cue once after the step line, and the ask once before advancing; `Eyes` with `lookFaster(true)` wakes at 1.5 s spacing.
- [ ] **Step 2–4:** FAIL → implement → PASS (vitest, `swift test`, iOS build).
- [ ] **Step 5:** Commit `feat(coach): the eyes flag a slip; risky steps get a prevent cue, a confirm question and faster looks`.

### Task 9: The exam

**Files:**
- Create: `tools/exam.py`, `tools/exam/scenarios.json` (public, written recipes)
- Uses (not committed): `~/coach-recordings/exam-private/recipes.json` (Task 0)
- Modify: `tools/replay.py` only to share its `Worker` client

**Interfaces:**
- Consumes: `/v1/session`, `/v1/mind` (spoken) and the `verdict` SSE event (Task 6).
- Produces: `python3 tools/exam.py [--private] [--label v13]` → a table per scenario (expected vs got verdict, numbers kept, latency) appended to `~/coach-recordings/exam.md`; exit 1 if any verdict is wrong.
  - Scenario: `{ "recipe": <CoachRecipe or private ref>, "step": 1, "says": ["oh no too much vanilla", "about a tablespoon"], "expect": { "verdict": "fixable", "item": "vanilla extract", "mentions": ["¾ cup"] } }` — `says` are played in order with the coach's replies added to the timeline between them.

- [ ] **Step 1:** Write ≥ 30 public scenarios across roles and kinds: rescues (vanilla 3×, salt 2× in a soup, baking soda 3× → redo, forgot baking powder), substitutions (buttermilk, self-raising flour, brown sugar), changes (halve sugar in a cake), unknowns ("a glug", "not sure"), and non-slips ("how's it looking?" → no verdict).
- [ ] **Step 2:** `python3 tools/exam.py` → all public scenarios pass; record the run.
- [ ] **Step 3:** Generate private scenarios from Task 0's 40 recipes (one rescue and one substitution per recipe, right answers from the pack's rules, written by Imogen) → `python3 tools/exam.py --private` → record; every miss is a pack or detection fix, not a prompt edit.
- [ ] **Step 4:** Commit `tools: the exam — slips, substitutions and changes with known right answers`.

### Task 10: Ship to J'habite and dress-rehearse

- [ ] **Step 1:** `tools/ship.sh` (Worker + demo app). Rebuild J'habite Debug from `~/jhabite` in a worktree against `~/coach` main and install (as on 2026-10-29); confirm in the recording that a J'habite cook notes `voice:` and `ears: muse`.
- [ ] **Step 2:** Mr. Graham cooks one J'habite recipe with one planted slip (his choice); pull, bench and exam; fix only through pack, brief or code.
- [ ] **Step 3 (Tue 11-03):** he chooses the demo recipe from what the exam covers; film.
