# Coach-led conversation — design

**Status:** approved by Mr. Graham 2026-10-27 ("this sounds good… put together the spec and the plan").
**Builds on:** the Cook Coach design (private J'habite repo, `docs/superpowers/specs/2026-10-27-cook-coach-design.md`).

## Why — the first real cook

His first real test (Quick Tuna Salad, 2026-10-27 23:13 UTC, recording `2026-10-27T23-13-01Z`) never got past
step 1 in 2 m 40 s. The timeline shows five causes:

1. **It couldn't move on.** Only exact phrases ("next", "what's next") advanced. "Shall we move onto the next
   step", "let's go to the next step", "can we move onto step two" all went to the model as questions — and the
   model had no way to advance even when it judged the step done.
2. **No memory.** Each turn was answered from scratch, so it flip-flopped: "still looks full of liquid" →
   "looks well drained" → "can't tell if all the water is out" → "nicely drained" → "can't tell".
3. **Repeated tips** ("keep the lid pressed down", four times) — same cause.
4. **"Let me take a look" before every answer**, though answers arrive in ~1.5 s: robotic, not reassuring.
5. **It never directed him.** "I can't tell from here" instead of "tilt the can toward me, I'll watch" — so he felt
   he had to stand in the right place and look at the right thing. His words: *"It should just feel more natural
   and I should be able to move around in flow. And if there's something specific it wants me to look at, it
   should just ask me to look at it."*

## What changes

1. **The coach runs the flow.** Every answer ends with a decision — stay on this step, or move on. When it judges
   the step done it says so briefly and the phone reads the next step. **If the cook asks to move on, in any
   wording, it moves on** (it may add one short caution, never a refusal).
2. **It remembers.** Each turn carries the conversation so far (the last 12 lines, cook's and coach's), so it
   builds on what it has already seen and said and never repeats a tip.
3. **It asks to see things.** When it can't judge, it tells the cook exactly what to show: *"Press the lid down
   and tilt it toward me — I'll watch the liquid."* The next turn judges what was shown.
4. **"Let me take a look" only when there's a real wait** — spoken only if the answer hasn't started ~0.75 s
   after the cook stops talking.
5. **Step briefings.** When a session starts, the same model call that links ingredients to steps also writes,
   per step: what *done* looks like, the common mistakes, and one tip. Every turn judges against that briefing
   instead of improvising (expertise layer 1).

## Decided

- **Decision format:** the model ends its spoken answer with a control line, `[[next]]` or `[[stay]]`. The Worker
  strips it from the stream (never spoken, even when split across chunks) and emits an `action` event. Missing or
  malformed → stay.
- **History travels with the turn** (`history: [{who: "cook"|"coach", text}]`, at most 12 entries, 300 characters
  each), so the Worker stays stateless per turn. The phone keeps it.
- **Fast local paths stay** for unambiguous commands (next / previous / repeat / timers), now matching natural
  phrasings ("move on", "let's go to the next step", "step two"). Everything else goes to the coach.
- **Briefings ride the linking call** (one model call at session start; token allowance raised for it). A failed or
  malformed briefing is empty, never fatal — cooking still works.

## Not now

- The coach noticing on its own that a step is done (continuous watching without being asked) — Thursday's
  watching experiment, because it costs battery.
- Expertise layer 2 (a curated cooking knowledge pack) — later this week, eggs / browning / rise first.
