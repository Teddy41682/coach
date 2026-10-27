# Coach-led conversation — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native, per his choice). Steps use `- [ ]`.

**Goal:** The coach moves through the recipe itself, remembers the conversation, asks to see things, only says
"let me take a look" when there's a real wait, and judges each step against a briefing written at session start.

**Architecture:** Worker: turns carry history; the pack adds a step briefing and decision rules; the model ends
each answer with `[[next]]`/`[[stay]]`, which the stream strips and turns into an `action` event; the session call
writes briefings alongside ingredient links. Phone: `CoachEvent.action` advances the session; history is kept and
sent; natural "move on" phrasings advance locally; the ack is delayed and dropped if the answer arrives first.

**Spec:** `docs/superpowers/specs/2026-10-27-coach-led-conversation-design.md`

## Global constraints
- The control line is never spoken or captioned, even when split across stream chunks.
- No decision in the answer → stay. A briefing failure → empty briefing; cooking continues.
- History: ≤ 12 entries, ≤ 300 characters each (Worker refuses more).
- Ack delay 0.75 s.

## Review focus
1. A `[[` split across two chunks (`"…move on. [["` + `"next]]"`) — nothing of it spoken; action emitted.
2. The model writes `[[next]]` mid-sentence or twice — only a trailing control counts; text after it dropped.
3. The cook says "move on" while a question is still being answered — advance once, not twice.
4. History over the limit from an old client — 400, not a crash.
5. The answer arrives at 0.74 s — no ack at all; at 0.8 s — ack, then the answer.

---

### Task 1 (Worker): turns carry history; the pack uses it, plus the decision rules
- Files: `worker/src/turn.ts` (TurnRequest.history), `worker/src/index.ts` (validate), `worker/src/expertise/{pack,cooking}.ts`
- Tests: `cooking.test.ts` — the user prompt lists history as "Cook: …" / "Coach: …" lines; the system prompt carries
  "End every answer with [[next]] or [[stay]]", "If the cook asks to move on, move on", "ask them to show you",
  "never repeat a tip you already gave". `index.test.ts` — 13 history entries → 400; an entry of 301 chars → 400.
- [ ] failing tests → implement → pass → commit

### Task 2 (Worker): strip the control line from the stream, emit `action`
- Files: `worker/src/control.ts` (`class ControlFilter { push(text): {speak: string}; end(): {speak: string; action: "next"|"stay"} }`), `worker/src/sse.ts` (CoachEvent `{type:"action", action}`), `worker/src/turn.ts`
- Tests: `control.test.ts` — "Looks done. [[next]]" → speak "Looks done." + next; split `"… [["`/`"next]]"`; no control → stay;
  "[[next]] extra" → speak nothing after; "[[NEXT]]" → next (case-insensitive). `turn.test.ts` — the event sequence ends
  `action` then `done`; the apology path emits no action.
- [ ] failing tests → implement → pass → commit

### Task 3 (Worker): briefings at session start
- Files: `worker/src/link.ts` (`linkSteps` → `{ ingredients: string[]; done: string; mistakes: string; tip: string }[]`), `worker/src/session.ts`, `worker/src/index.ts` (steps carry `briefing`), `worker/src/expertise/cooking.ts` (system prompt includes the current step's briefing)
- Tests: `link.test.ts` — the model's per-step objects parsed; missing fields → ""; fallback keeps ingredients-everywhere with empty briefings.
  `cooking.test.ts` — "Done when: …" and "Common mistakes: …" appear for the current step.
- [ ] failing tests → implement → pass → commit → deploy → live session on the boule prints briefings

### Task 4 (iOS): act on decisions, keep history, natural "move on", delayed ack
- Files: `ios/CoachKit/Sources/CoachKit/{Models,CoachClient,CoachSession,Intent}.swift`
- Tests: `SSETests` — `{"type":"action","action":"next"}` decodes. `CoachSessionTests` — an `action(next)` advances and
  speaks the next step; history sent with the turn and capped at 12; an answer arriving before 0.75 s means no ack is
  said, after 0.75 s the ack precedes it. `IntentTests` — "shall we move onto the next step", "let's go to the next
  step", "can we move onto step two", "move on", "OK let's go to the next step" → `.next`.
- [ ] failing tests → implement → pass → commit → install on his phone

### Task 5: live check and his re-test
- [ ] `swift test --filter LiveTests` against the Worker (action event arrives; history accepted)
- [ ] He cooks the tuna salad again; pull the recording; compare the timeline with 2026-10-27T23-13-01Z
