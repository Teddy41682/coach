# Eyes and one mind — design

**Status:** direction agreed with Mr. Graham 2026-10-27 ("this makes sense"); supersedes the observer's hand-written
behaviour rules (`2026-10-27-observer-design.md`). Built overnight for his morning dogfood.

## Why

Three test runs today. Each fix to the observer added another rule: three looks, sixty seconds, five minutes between
lines, two looks to be back, speaking restarts the clock. Each fixed the case in front of us and would break on the
next. His words: *"If we just have a set of really specific rules, we're going to fail… there's going to be an
infinite number of things that might happen… we need something smart enough to know, okay, this is what's happening,
this is what I should say, just like a human would."* And on cost: *"the glasses are just streaming live data and it's
going to some brain… using AI as little as possible… that brain processes it and then just knows the right times to
talk."*

**Goal:** behaviour comes from judgement over the whole situation, not from rules; the AI is called when something
happened, not on a clock.

## The shape

1. **Eyes — cheap, always on, on the phone.** Every frame is compared with the last one the mind saw (a tiny
   greyscale thumbnail difference). Eyes describe nothing and decide nothing; they only say *wake the mind now*:
   - the picture changed meaningfully since the mind last looked;
   - the cook finished speaking;
   - a timer ended;
   - a slow heartbeat (≈ 30 s) with nothing else, so a long quiet stretch is still noticed.
   The thresholds here are perception tuning (how different is "changed"), not behaviour.
2. **One mind — the model.** Called on each wake with everything a person standing beside the cook would know:
   the recipe and the current step with its briefing; the **timeline** so far (what it has seen, what was said, by
   whom, when); the previous frame it looked at and the newest; how long since anyone spoke; what woke it. It answers
   one question: *given all this, should I say something right now — and what?* It returns:
   `{ seen: ["…new events…"], say: "…" | null, step: "stay" | "next" | "hold" }`.
   Most of the time `say` is null. "Looks like you've left the kitchen — shall we pick this up later?", "the pan's
   still cold", "welcome back — the eggs are beaten, the pan's next", and staying silent while the cook is on a phone
   call all come from this judgement. `hold` means the cook has stepped away and the place is held.
3. **Spoken questions stay fast.** When the cook speaks, the same mind is woken with the words, and its answer streams
   sentence by sentence as today (ack, then first sentence ~1.5–3 s). One mind, one prompt, two ways of being woken.
4. **Guardrails only — not behaviour.** Never speak over the cook or over itself; never more than one unprompted line
   per 20 s; never past the spend cap; nothing unprompted once the recipe is finished. Everything else is the mind's call.

What goes away: the observer's away/back counters, spoken-line spacing and recap rules (`Observer.swift`); the
`interject`/`away` fields become `say`/`step`. What stays: glasses, voice, listener, recorder, session start and
step briefings, the Worker's auth, ownership, strict JPEG checks and reserve-then-settle spending.

## The replay — how the mind gets smarter without him cooking every time

Every recording already holds frames at real times, his words, the coach's lines and the timeline. **`tools/replay`**
feeds a recording through eyes + mind as if live (same wake points, his words injected at their times) and prints what
the mind would have said and when, what it logged, how often it woke, and the cost per minute — beside what actually
happened. A change to the mind is judged on all recordings in minutes; he cooks only to confirm the best one.

**First scorecard** (his five recordings of 2026-10-27):

| Recording | What a good coach does |
|---|---|
| 23-13-01Z, 23-34-14Z (tuna) | answers his questions as before; moves on when he asks; no repeated tips |
| 00-30-08Z, 00-30-58Z (walk-around) | does not nag; at most one "stepped away", only once he's clearly left |
| 01-03-11Z (toast, rooms) | notices the empty toaster; says nothing while he glances around; holds the place in the bedroom only if it judges he's gone |

Plus, for every recording: wakes per minute and ¢ per minute, against the observer's ~4¢/min.

## Decided

- **Model:** `muse-spark-1.3`, standard tier, `minimal` reasoning (as now). Non-streamed for eye wakes; streamed for
  spoken turns.
- **Wake budget:** at most one mind call in flight; eye wakes at most every 2.5 s; heartbeat 30 s.
- **Timeline:** kept on the phone, newest 50 lines travel with each wake (as `seen` today), whole log in the recording.
- **Spending:** each wake reserves its worst case and settles to Meta's reported cost (existing machinery).

## Not now

- On-device scene or object recognition (Apple Vision) feeding the eyes — only if the replay shows the difference
  signal wakes too often or too rarely.
- A cheaper or open-weight model for eye wakes — after the replay shows the mind's judgement is right.

## Open risks (measured by the replay, not argued)

- **Chattiness or silence:** a single call may talk too much or miss things. The replay counts both.
- **Latency on spoken turns** must not regress from today's ~1.5–3 s to first word.
