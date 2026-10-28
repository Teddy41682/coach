# Eyes and One Mind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the observer's hand-written behaviour rules with cheap on-phone eyes that decide *when* to wake one
model "mind", which decides *what* (if anything) to say and whether the step stays, moves on or is held.

**Architecture:** The Worker gains `POST /v1/mind`: one judgement prompt, woken two ways — by the eyes (JSON answer,
non-streamed, charged by reserve-then-settle) or by the cook's words (streamed SSE like `/v1/turn`, control line
`[[stay]]|[[next]]|[[hold]]`). The phone keeps the timeline and runs the eyes (greyscale-thumbnail difference vs the
last frame the mind saw, cook-finished-speaking, timer end, 30 s heartbeat) plus guardrails only. `tools/replay.py`
runs recordings through the same eyes and the live mind to judge prompt versions.

**Tech Stack:** Cloudflare Worker (TypeScript, vitest, D1), Swift 6 package CoachKit (`swift test` on the Mac),
Python 3 + Pillow for the replay.

**Spec:** `docs/superpowers/specs/2026-10-27-eyes-and-mind-design.md` (supersedes the behaviour rules of
`2026-10-27-observer-design.md`).

## Global Constraints

- Model `muse-spark-1.3`, standard tier only (never contributor), `reasoning_effort: "minimal"`.
- At most one mind call in flight; eye wakes at most every 2.5 s; heartbeat 30 s.
- Timeline on the phone; newest 50 lines travel with each wake; whole log in the recording.
- Each eye wake reserves its worst case and settles to Meta's reported cost (existing `checkObserve`/`settleObserve`).
- Reuse `admit` (key, size), `X-Coach-Device`, device-owns-session 403, strict JPEG ≤ 1024 px for every image.
- Guardrails only on the phone: never speak over the cook or itself; ≤ 1 unprompted line per 20 s; nothing
  unprompted once finished; spend cap. No away/back counters anywhere in code.
- `/v1/turn` and `/v1/observe` keep working unchanged for the old app.
- Spoken turns: first word ~1.5–3 s, no regression.
- Public initialisers unchanged: `CoachRunner(recipe:device:client:recorder:)`, `CoachView(runner:)`.
- No secrets in code or output; the replay reads `COACH_APP_KEY` from `~/imogen/.env` inside the script.

## Review Focus

1. **A mind answer that isn't JSON / has unknown `step`** → nothing said, step `stay`; never breaks the cook (Task 1 test).
2. **An eye answer arriving after the cook started talking or the step moved** → dropped, not queued (Task 6 test).
3. **The model writes `[[hold]]` split across stream chunks** → never spoken, action `hold` (Task 2 test).
4. **Phone camera frames (1280 px) on a spoken mind turn** → downscaled on the phone so the ≤ 1024 check passes (Task 7).
5. **Worker refuses (429 cap)** → the eyes stop waking for the rest of the cook instead of hammering (Task 6 test).

---

### Task 1: Worker — `POST /v1/mind` for eye wakes

**Files:**
- Create: `worker/src/mind.ts` (types, request check, `wakeMind`), `worker/src/expertise/mind-prompt.ts` (the one prompt)
- Modify: `worker/src/index.ts` (route; `Purpose` gains `"mind"`)
- Test: `worker/test/mind.test.ts`, `worker/test/mind-route.test.ts`

**Interfaces:**
- Produces: `type Wake = "changed" | "spoke" | "timer" | "heartbeat"`; `type StepCall = "stay" | "next" | "hold"`;
  `type MindRequest = { sessionId: string; stepIndex: number; wake: Wake; timeline: string[]; quietFor: number;
  held?: boolean; finished?: boolean; frame?: string; previous?: string; utterance?: string; frames?: string[] }`;
  `type MindAnswer = { seen: string[]; say: string | null; step: StepCall; usage: Usage }`;
  `isMindRequest(b: unknown): b is MindRequest`; `wakeMind(ctx: MindContext, model: Completer): Promise<MindAnswer>`;
  `mindSystem(ctx: MindContext, spoken: boolean): string`, `mindUser(ctx: MindContext): string`,
  `MIND_PROMPT_VERSION: string`.
- Limits: timeline ≤ 50 lines of ≤ 200 chars; `quietFor` finite, ≥ 0; utterance ≤ 500; frames ≤ 8; every image a
  strict JPEG ≤ 1024 px; `seen` ≤ 5 events of ≤ 100 chars; `say` ≤ 200 chars else null.

- [ ] Step 1: tests — `wakeMind` parses `{"seen":["put bread in"],"say":null,"step":"stay"}`; malformed JSON → `{seen:[],say:null,step:"stay"}` with usage kept; unknown step → stay; model throws → empty, zero usage; with `previous` the images are `[previous, frame]`; with no frame the prompt says no photo came.
- [ ] Step 2: route tests — 200 JSON with usage; 401 no key; 400 no device; 403 other device; 404 unknown session; 400 timeline of 51 / a 201-char line / negative quietFor / bad wake; 400 frame > 1024 px or not JPEG; 429 after device observe cap without calling the model; real cost settles like `/v1/observe`.
- [ ] Step 3: run `npx vitest run test/mind*.test.ts` → FAIL (module missing).
- [ ] Step 4: implement; prompt v1 written from the spec (judgement, not rules: what a person beside the cook would say; camera is where he looks; glances aren't leaving; null most of the time; `hold` when he has clearly gone; welcome back with where we were; `next` only when the step is clearly done or he asked).
- [ ] Step 5: `npx vitest run && npx tsc --noEmit` → all pass; mutate the 1024 guard and the cap check, see a test fail, restore by exact edit.
- [ ] Step 6: commit `feat(worker): /v1/mind — one mind woken by the eyes`.

### Task 2: Worker — spoken turns through the mind, streamed

**Files:** Modify `worker/src/control.ts` (`Action` gains `"hold"`), `worker/src/sse.ts`, `worker/src/index.ts`; Test `worker/test/control.test.ts`, `worker/test/mind-route.test.ts`.

**Interfaces:** `wake: "spoke"` with `utterance` → `text/event-stream` of `ack?`, `text…`, `action(stay|next|hold)`, `done` (same events as `/v1/turn`), via `runTurn(turn, model, { system: mindSystem(ctx, true), user: mindUser(ctx) })`. Charged like a turn: `checkAndCount(..., costOf(frames.length))`; over cap → the spoken `LIMIT_LINE`.

- [ ] Step 1: tests — `[[hold]]` (also split `[[ho` + `ld]]`) → action hold, never spoken; spoke wake streams text then action next; spoke without utterance → 400; spoke over the turn cap → LIMIT_LINE and the model never asked; `/v1/turn` tests unchanged and passing.
- [ ] Step 2: run → FAIL. Step 3: implement. Step 4: all tests + tsc pass; mutate the hold parse, see fail, restore.
- [ ] Step 5: commit `feat(worker): spoken turns through the same mind, streamed`.
- [ ] Step 6: deploy `cd /Users/nathangraham/coach/worker && npx wrangler deploy`; record the version id.

### Task 3: `tools/replay.py` — a recording through eyes + mind

**Files:** Create `tools/replay.py`, `tools/recipes.json` (the demo's three recipes, copied from `Recipes.swift`); Test `tools/test_replay.py` (pytest-free `unittest`).

**Interfaces:**
- Eyes (must match Swift Task 5 exactly): `thumb(jpeg_path) -> list[int]` = greyscale 32×32 box-averaged;
  `diff(a, b) -> float` = mean |(a−mean a) − (b−mean b)| / 255 (exposure-normalised);
  `Eyes.look(t, thumb) -> str | None` → `"changed"` when `diff(thumb, reference) ≥ CHANGE` and
  `diff(thumb, thumb ≈1 s ago) ≤ STEADY` and `t − last_eye_wake ≥ 2.5` and nothing in flight; `"heartbeat"` when
  `t − last_mind_call ≥ 30`. `reference` becomes the frame sent on each mind call. Evaluated at 2 frames/s.
  Starting values `CHANGE = 0.10`, `STEADY = 0.05`; tuned on `--dry` runs (no API) before any spend.
- CLI: `python3 tools/replay.py <recording-dir> --recipe tuna|eggs|boule [--dry] [--out scorecard.md] [--device replay-test]`.
  Simulated clock: each call's real latency occupies `[t, t+latency]`; an unprompted `say` lands at `t+latency` and is
  dropped if the cook was speaking (heard time − words/2.5 s … heard time), the coach was speaking (words/2.7 s per
  line), < 20 s since the last unprompted line, or finished. `heard` events are injected as spoken wakes (local
  fast paths for next/previous/repeat via a Python port of `parseIntent`'s navigation phrases).
- Output: side-by-side timeline (actual | replay), wakes by reason, wakes/min, ¢/min, spoken first-text latency;
  markdown scorecard to `--out`.

- [ ] Step 1: tests — `diff` of an image with itself is 0 and with a brightened copy ≈ 0; eyes don't wake twice inside 2.5 s; heartbeat after 30 s; changed needs steady; the guardrail drops a say during the cook's words.
- [ ] Step 2: run → FAIL. Step 3: implement. Step 4: pass; `--dry` on all five recordings prints wakes/min.
- [ ] Step 5: commit `feat(tools): replay a recording through the eyes and the mind`.

### Task 4: Prompt iteration on the replay (≤ ~6 versions, ≤ ~300¢ total)

**Files:** Modify `worker/src/expertise/mind-prompt.ts`; Create `docs/experiments/2026-10-28-mind-replay.md`.

- [ ] Each version: deploy, replay all five recordings, judge against the spec's scorecard (tuna: answers, moves on when asked, no repeated tips; walk-around: no nagging, ≤ 1 "stepped away" only once clearly gone; toast: notices the empty toaster, quiet while he glances around), record measured vs hypothesis, wakes/min, ¢/min, spend so far.
- [ ] Stop when the scorecard is met or after ~6 versions; say which. Commit each version `tune(mind): prompt vN — <finding>`.

### Task 5: iOS — `Eyes` and `Timeline` (pure logic)

**Files:** Create `ios/CoachKit/Sources/CoachKit/Eyes.swift`, `Timeline.swift`; Delete `ObservationLog.swift` (Timeline replaces it); Test `Tests/CoachKitTests/EyesTests.swift`, `TimelineTests.swift`.

**Interfaces:**
- `public struct Thumb: Sendable, Equatable { let pixels: [UInt8] }`, `public static func Thumb.of(jpeg: Data) -> Thumb?` (CGImageSource thumbnail → 32×32 grey), `func diff(_ other: Thumb) -> Double` (formula of Task 3).
- `public enum WakeReason: String, Sendable, Codable { case changed, spoke, timer, heartbeat }`
- `public struct Eyes { init(change: Double = CHANGE, steady: Double = STEADY); mutating func look(_ t: Thumb, at: Date, busy: Bool) -> WakeReason?; mutating func woke(at: Date, showing: Thumb?) }` — same constants as the tuned Python.
- `public struct Timeline { init(start: Date); mutating func add(_ kind: Kind, _ text: String, at: Date); func lines(_ limit: Int = 50) -> [String] }` with `Kind { seen, cook, coach, step, note }`; lines `"m:ss saw: …"`, `"m:ss cook: …"`, `"m:ss coach: …"`, `"m:ss step 2 began: …"`, `"m:ss note: …"`, each ≤ 200 chars; a seen event repeated within 10 s dropped.

- [ ] Steps: failing tests (same image → no wake; changed+steady → `.changed`; 2.5 s spacing; busy → nil; heartbeat 30 s; brightened copy diff < 0.02; timeline formats and caps) → implement → `swift test` passes, count rises → commit `feat(coachkit): eyes and the timeline`.

### Task 6: iOS — the mind client, `Mind` loop and guardrails (replaces `Observer`)

**Files:** Create `Mind.swift` (loop), `Guardrails.swift`; Modify `Models.swift` (`MindRequest`, `MindAnswer`, `Decision` gains `.hold`), `CoachClient.swift` (`mind(_:)`, `mindTurn(_:)`), `Recording.swift` (`.wake` event); Delete `Observer.swift` + `ObserverTests` (behaviour moved to the mind); Test `MindTests.swift`, `GuardrailsTests.swift`.

**Interfaces:**
- `public struct Guardrails { static let spacing = 20.0; static let centsCap = 50.0; func allows(at: Date, cookSpeaking: Bool, coachSpeaking: Bool, finished: Bool) -> Bool; mutating func spoke(at: Date) }`.
- `@MainActor public final class Mind { init(sessionId:, start:, call: (MindRequest) async throws -> MindAnswer, frame: () -> (jpeg: String, thumb: Thumb)?, now:); var timeline: Timeline; var cents: Double; var wakes: Int; var onWake: ((WakeReason, MindAnswer) -> Void)?; func tick(step: Int, held: Bool, finished: Bool, state: () -> (step: Int, cookSpeaking: Bool, coachSpeaking: Bool, turnActive: Bool)) async -> MindAnswer?; func wakeNow(_ r: WakeReason) }` — returns the answer only when its `say`/`step` may act (stale step or busy → `say` stripped and `step` forced to stay; a refused call (throws) stops further wakes when it was a cap refusal).

- [ ] Steps: failing tests (one call in flight; answer during cook speech → say dropped; stale step → no act; finished → no wakes; 429 → stops; heartbeat; timeline gets seen lines; ≤ 1 unprompted line / 20 s) → implement → pass → commit `feat(coachkit): the mind replaces the observer's rules`.

### Task 7: iOS — runner wiring, spoken turns via the mind, install

**Files:** Modify `UI/CoachRunner.swift`, `CoachSession.swift` (decision `.hold`; `timeline` closure; `public func moveOn()`), `Listener.swift` (`public var isHearing`), `UI/CoachView.swift` (wakes and ¢); Test `CoachSessionTests.swift`.

- [ ] Steps: CoachSession test — a `[[hold]]` decision leaves the step and reports `held`; spoken turns send the timeline. Runner: eyes tick every 0.5 s on the newest frame; spoken turns go to `client.mindTurn` with frames downscaled to ≤ 768 px; timer end → `wakeNow(.timer)`; recorder notes each wake (reason, seen, say, step, usage, cents); audio-route note stays. `swift test` passes; `xcodegen && xcodebuild … build` succeeds; install on the phone. Commit `feat(coachkit): the runner wakes one mind`.

### Task 8: Review and finish

- [ ] One fresh Opus reviewer on the whole branch diff with the spec; fix what's real; `git push -u origin mind`; no background processes left.
