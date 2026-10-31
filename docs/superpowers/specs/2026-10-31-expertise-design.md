# Serena's expertise — design

**Date:** 2026-10-31 · **Status:** draft for Mr. Graham's approval · **Repo:** `~/coach` (public)
**Builds on:** `2026-10-27-eyes-and-mind-design.md` (the eyes and one mind), the drill log
(`brain/…/meta-hackathon/outputs/2026-10-29-pbj-drill.md`), and `Gates.swift` (decisions in code, 2026-10-31).

## Why

Ten PB&J runs made Serena a good coach for a sandwich: she watches, catches planted mistakes, moves the cook on,
keeps quiet when she should. What she is not yet is an *expert*. Asked about too much vanilla she gives sensible
advice, but it is the model's improvisation in the moment — uneven, unverifiable, and drawn from everything it ever
read, the best cookbook and the worst blog alike, with no way to tell which it is leaning on. If nobody tells her,
she would not notice the vanilla at all.

Mr. Graham's aim is a coach people trust like the best cook they've stood next to: one who knows what to do in any
situation and gives the best guidance for it. His rules for getting there:

- **A confident wrong answer is worse than starting over.** A coach that guides you to a bad cake has failed; one
  that says "that can't be saved, let's redo it" has not.
- **Deterministic, not hopeful.** Decisions that can be made in code are made in code; the model is not trusted to
  get them right every time (his ruling 2026-10-31).
- **Expertise is understanding what ingredients do.** Once she knows each ingredient's role, one body of knowledge
  powers everything: rescuing a mistake, substituting, altering a recipe, explaining a step, judging doneness.
- **Precision is the idea.** Every step has a tolerance — how exact it must be, and what happens a little off, a
  lot off, past saving. (His framing: "giving a realm of confidence — how precise do we have to be?")

## Goals

1. **A cooking knowledge pack** — written, versioned, sourced — that covers all of home cooking and baking, not the
   demo dishes. Organised by what things *do* (roles), each role carrying tolerances, rescues and substitutions.
2. **A chef's brief for every cook**, made before cooking starts: this recipe's ingredients mapped onto roles, and
   for each step what can go wrong, how it shows, and the verdict for each slip.
3. **In-the-moment handling where code decides**: the model spots and speaks; code compares against tolerances,
   chooses the verdict and does all arithmetic. Anything not covered falls back to the safe answer.
4. **The same knowledge answers substitutions and alterations** ("no buttermilk?", "can I cut the sugar?").
5. **An exam** that proves it: scenarios with known right answers across many real recipes, run after every change.
6. **The hackathon demo** (submission Wed 2026-11-04 4:00 PM HST): a full, difficult recipe cooked with the glasses,
   with real mistakes made on camera, each caught and rescued or redone — "something complex made easy".

## Non-goals (for now)

- Packs beyond cooking (carpentry, electrical). The pack format is general so they can follow; none are built.
- Safety-critical domains of any kind; in cooking, food safety stays as today (doneness judgement + thermometer,
  never "it's safe to eat").
- Nutrition, allergies, dietary or medical advice.
- Measuring amounts precisely from video. Seeing "that looks like far too much" is a goal (below); a measured
  number from pixels is not promised.
- A natural voice (filed: `docs/backlog/natural-voice.md`).

## Anti-goals — failure even if it technically works

- Serena confidently gives a rescue that ruins the dish.
- Advice that contradicts itself within a cook, or between the brief and what she says.
- Advice that sounds expert but comes from nowhere we can point to.
- A pack shaped around the demo dishes that falls apart on the next recipe someone saves in J'habite.
- Slower or chattier than today. Expertise is spoken only when it serves the cook; the gates still apply.

## Constraints

- **Wednesday 2026-11-04, 4:00 PM HST.** The demo must work end to end on his phone through J'habite.
- **Meta's models for the hackathon.** Muse Spark (standard tier only, never "contributor") does the model work —
  including the brief, at a higher reasoning effort, since it runs before cooking and latency doesn't matter there.
- **No real chef available.** The pack's correctness rests on research: the best cookbooks, food-science references
  and reputable test kitchens; each rule backed by more than one trusted source, cited; where sources disagree, the
  safer verdict. Written in our own words — nothing copied. Mr. Graham spot-checks.
- **Public repo.** The pack lives in `~/coach` and is public; J'habite's private pipeline stays private.
- **The live path stays fast.** Nothing added to a spoken reply's path may add noticeable delay (today ~1.5–2 s).
- Existing structure: Worker (`worker/src/expertise/` already holds a cooking "pack" seam), CoachKit (`Gates.swift`,
  `Mind.swift`, `CoachSession.swift`), the bench (`tools/bench.py`, `tools/replay.py`), session planning
  (`worker/src/link.ts`, which today produces per-step done / mistakes / tip / method).

## The design

### 1. The knowledge pack — what things do

A structured, versioned file set in the repo (`worker/src/expertise/cooking/` or similar — builder's call), loaded
by the Worker. Organised by **role**, not by recipe and not one entry per ingredient:

- **Roles**, a few dozen: chemical and biological raising agents, salt, sugars, fats (solid / liquid), eggs (as
  binder, as raising, as emulsifier), flours and starches, acids, flavour extracts and spices, aromatics, liquids,
  thickeners, dairy, proteins (by doneness behaviour), and the non-ingredient factors heat, time and mixing.
- **Each role records:** what it does (and in which kind of cooking); its **tolerance bands** — the ranges, as a
  ratio of what the recipe calls for, that are *fine*, *fixable*, *redo* — which differ by **kind of cooking**
  (baking is chemistry and tight; a sauce or stew is tasted and forgiving); the **rescues** for each band, as
  structured actions (add X per unit over, scale the batch, dilute, balance with acid/sugar/fat, cook longer…);
  **substitutions** (what replaces it, in what ratio, with what effect); **what changing it does** (cut sugar →
  less moist, paler, firmer); **how a slip shows** (visual and other signs, for the eyes).
- **Ingredient index:** common ingredients mapped to roles (vanilla → flavour extract; baking soda → chemical
  raising agent, needs acid; brown butter → fat + flavour), so most recipes map without the model.
- **Sources:** every role and rule cites its sources. A rule without at least two trusted sources is marked
  provisional and treated as "ask/redo", not as a rescue.

Coverage target: everything a home cook meets in J'habite's recipes — baking, sauces, stews, roasts, eggs, grains.

### 2. The chef's brief — before every cook

Extends today's session planning (`link.ts`), which already runs once when a coached cook starts:

- Each recipe ingredient is mapped to its roles — from the ingredient index first (code), the model only for what
  the index doesn't know, and the model's mapping is checked against the role list (unknown role → cautious).
- Each quantity is parsed into number + unit **in code** (cups, tsp, g, "a pinch"…), so tolerances and scaling are
  arithmetic, not prose.
- The **kind of cooking** is classified (baking / pastry / sauce / braise / sauté / …), which selects the tolerance
  bands.
- Per step: the ingredients going in, the high-risk ones (tight tolerance + small amount — salt, raising agents,
  extracts), what "done" looks like, what can go wrong and how it shows, and the **verdict table** for each
  likely slip, built from the pack.
- Code validates the brief's shape and numbers; anything that fails validation falls back to the cautious default
  for that step. The existing per-step *method* (one consistent technique) stays.

### 3. In the moment — the model spots and speaks, code decides

When something may have gone wrong:

1. **Spot.** The eyes, the conversation, or the brief's high-risk flag raise it. During a high-risk step the eyes
   look more often, so a pour is seen. The model's job is narrow and structured: *which* ingredient or action, and
   *how much* if it can tell — with how sure it is.
   - The goal (his): she can see "that looks like way too much". Where the model is confident, its estimate counts.
   - Where it isn't, she **asks** ("how much vanilla went in?"); the answer is parsed into number + unit in code.
   - For high-risk ingredients she **prevents** first: a deterministic cue before the pour ("measure it into the
     spoon over the side, not over the bowl"), and a deterministic confirmation before the step is called done.
2. **Decide (code).** Amount ÷ recipe amount → which band for this role and kind of cooking → the verdict:
   - *fine* — reassure briefly, carry on;
   - *fixable* — the rescue from the brief, with every quantity computed in code ("make 1.5×: add ¾ cup flour, ½
     cup sugar, 1 egg …"), including scaling the rest of the recipe for the remaining steps;
   - *redo* — the honest answer, and how (pour off, start that part again).
   Anything that isn't in the brief, or whose amount stays unknown after asking, gets the **safe default**: redo
   that part, or ask a clarifying question — never an improvised rescue.
3. **Speak.** Code hands the model the verdict and the numbers; the model only phrases it in Serena's voice. A
   check in code confirms the spoken line kept the numbers.

The same machinery answers **substitutions and alterations**: the question is mapped to a role; code looks up the
pack's substitution or change entry and computes amounts; the model phrases it. Questions the pack can't ground
get an answer framed as Serena's judgement, not a rule, or "I'd keep it as written".

### 4. The exam

A bench of **scenarios with known right answers**, run after every change (extends `tools/bench.py`):

- **Rescues:** "3 tsp vanilla in cupcakes (recipe 1 tsp)" → fixable, scale 1.5×; "1 tbsp baking soda instead of
  1 tsp" → redo; "salted the stew twice" → fixable, dilute/extend; and so on per role and kind of cooking.
- **Substitutions and alterations:** "no buttermilk" → milk + acid in a stated ratio; "halve the sugar in a cake"
  → warn: dry, pale.
- **Coverage:** recipes drawn from a varied sample of real J'habite recipes (his own box), not just the demo dish,
  so "works for anything" is measured. Each scenario's right verdict is written down with its source.
- **His filmed cooks:** every real slip in a recording becomes a scenario.
- The exam scores the *verdict* (deterministic, from code) and that the spoken line kept it; phrasing is not scored.

### 5. The demo

A full, genuinely difficult recipe cooked through J'habite on the glasses, with two or three real mistakes made on
camera, each caught and handled — at least one rescue and one honest redo. **The recipe is chosen the day before
submission (Tue 2026-11-03; his ruling 2026-10-31)**, from what the pack covers by then — so the work builds breadth
first, most common roles first (the ones the J'habite sample uses most), rather than finishing any one dish's
corner early. Filming is Tuesday; anything the pack doesn't yet cover gets the safe default (ask, or redo that
part), never an improvised rescue.

## Decided by Mr. Graham

- A wrong rescue is worse than a restart; when unsure, redo.
- Decisions in code wherever they can be; the model spots and speaks.
- Expertise = understanding ingredients' roles; it must cover all of cooking, for J'habite, not the demo dishes.
- Tolerance ("how precise do we have to be") is the organising idea.
- No chef: Imogen researches the pack from the best sources; he spot-checks.
- It is part of the hackathon submission.
- The demo recipe is chosen the day before submission, not earlier; breadth comes first.

## Imogen's calls (his to overrule)

- Organising the pack by role with an ingredient index, rather than per ingredient or per recipe.
- Tolerances as ratio bands per role × kind of cooking.
- Two trusted sources per rule; disagreements take the safer verdict; single-source rules are provisional.
- The brief built by Muse Spark at higher reasoning effort, validated by code.
- Prevent-and-confirm for high-risk ingredients as the reliable path; seeing the amount as the goal on top of it.

## Settled after the builder check (Imogen's calls, his to overrule)

- **Who writes the pack and the exam's answers:** Imogen, by research, in parallel with the engineering, in the
  format the builder sets on day one. A rule backed by two trusted sources may drive a rescue without waiting for
  his check; he spot-checks afterwards. Single-source rules stay provisional (ask/redo only).
- **A seen amount never leads straight to a numbered verdict.** When the eyes think it's too much, Serena says so
  ("that looks like a lot of vanilla — how much went in?"); a *fixable* or *redo* verdict with numbers comes only
  from an amount the cook confirmed, or from the brief's prevent-and-confirm path. This keeps his rule (a wrong
  rescue is worse than a restart) and gives "confident" no threshold to tune.
- **Slip turns may take a second model call.** Ordinary replies stay one streamed call. A turn that handles a slip
  may spend a second call (spot → code decides → phrase), accepting ~1.5 s more on those turns only, with no
  filler line. If the phrased line drops or changes a number, a fixed Serena-voice template with code's numbers is
  spoken instead.
- **Where the logic lives:** verdicts, tolerances and arithmetic in the Worker (deployable any time); the phone
  only for what must be there (the prevent cue, the confirm question, a faster look rate on high-risk steps).
  TestFlight takes new builds at any time, so the Sun 11-01 external build is not a freeze; the judges get the
  latest build before submission.
- **How far scaling reaches:** spoken only, plus the coach carrying the scale factor so the amounts it reads for
  later steps are scaled. J'habite's own recipe screen is unchanged for Wednesday. A scale-up counts as *fixable*
  only when it needs no change of pan or bake time and no fractional egg past a half (otherwise: say what it would
  take, and offer the redo).
- **Exam recipes and the public repo:** recipes from his J'habite box stay in a private fixture set outside git;
  the public exam uses written or paraphrased recipes.
- **Confirming vs. moving on:** the confirm question is asked once and the cook can carry on past it (his earlier
  rule: if the cook asks to move on, move on). An unconfirmed high-risk amount is noted and Serena says once that
  she couldn't check it.

## Left to the builder

File layout and format of the pack; the exact role list; parsing of units; how the brief is cached; how the eyes'
higher look rate during high-risk steps is set; the exam's file format and scoring script; the order of work
against the Wednesday deadline (a pack-first vertical slice is suggested: a few roles end to end through the exam,
then breadth).

## Addendum 2026-10-30 — always taste (Mr. Graham's ruling)

"Defer to what a pro chef would do — which would be always taste." Too much of a **flavouring** (salt, seasonings,
spices, chili, acids, savoury sweeteners, extracts, garlic/onion/ginger — `FLAVOUR` in `verdict.ts`) is never a blind
redo. Where the engine would have said redo (no sourced rescue, a provisional band, a batch too big), the verdict is
`taste`: the coach says a fixed line, "That's more X than the recipe has — give it a small taste. Is the X too strong?"
(no model call). The answer is caught in code: "fine/good/no" → "Okay — carry on."; anything else → `balance`: in
savoury cooking, a bigger batch around it (capped at 2×, code's amounts), and in a bake (baking, pastry), start that
part again. A sourced rescue still comes first; leaveners, structure and thickeners are never a taste. A rescue's
spoken condition keeps only the cases that fit the dish.
