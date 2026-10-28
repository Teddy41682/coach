# The observer — design

**Status:** approved by Mr. Graham 2026-10-27 ("yes, write the spec and plan").
**Builds on:** `2026-10-27-coach-led-conversation-design.md`.

## Why

His concern, after two test cooks: *"how is it going to know that I didn't add salt? … if it's not continuously
monitoring the stream, how is it going to be able to detect and tell what's going on and when?"*

He is right. The glasses stream continuously and the phone keeps the last minute of frames, but **the model only
looks when he speaks** — about six frames across the step on "done", the newest two on a question. A two-second
shake of a salt shaker is caught only if it happens to land in one of those frames. Between turns, nothing watches.

## What changes

**An observer runs for the whole cook**, beside the conversation:

1. **Every 2.5 seconds** while cooking, the phone sends the newest frame (downscaled to 640 px) to the Worker's
   `/v1/observe` with the current step, its briefing and the last ten log lines.
2. Muse Spark answers one narrow question — *what is new since the log: what was added, picked up or done?* — as
   short timestamped events in the recipe's own ingredient names ("shook salt over the bowl"). Conservative: nothing
   new → no events.
3. **The phone keeps the running log** for the whole cook. **Every turn is answered against it** (sent as the
   turn's `seen`), so "did I add the salt?" is answered from what was seen, with when.
4. **It speaks up on its own** when an observation shows a clear mistake against the step's briefing ("the eggs went
   in before the butter melted"): one short sentence, never while the coach or the cook is talking, never within 20 s
   of the last time it spoke up, and it joins the conversation history.
5. **What it can't see, it asks about.** The briefing marks steps whose key action is hard to see (a pinch of salt);
   for those the coach confirms by asking rather than guessing.

## Away and back — his end state (2026-10-27)

*"The ideal state is that you just have this person essentially looking over your head that's able to keep track of
where I'm at, what I'm doing, what needs to be done. I should be able to walk away, leave for an hour, come back and
pick up right where we left off… you shouldn't just keep bugging me… and we shouldn't keep charging… when it's
obvious I've moved on… I feel like someone's professional with me, working with me."*

1. **Every look also says whether the cook has left the kitchen** (`away: true` only for another room, outdoors, a
   car). On glasses the camera is wherever they look, so a glance at the phone, a screen or the sink is not away —
   his first try marked 9 of 9 looks away under the looser rule.
2. **Away for a minute (3+ away looks spanning 60 s, none within 2 min of the cook speaking) → it says so once**,
   at most once every 5 minutes, calmly — *"Looks like you've stepped away. I'll hold our place at
   step 3 — come back when you're ready."* — and enters **away**: no turns, no interjections, and observing drops to
   one glance every 30 s, only to notice the return.
3. **Back** — two looks in a row that show the cooking again, or the cook saying they're back — resumes with a recap from the
   log: *"Welcome back — we were on step 3, mixing in the mayo; the tuna's in the bowl, the mayo hasn't gone in yet."*
   Nothing is lost, after five minutes or an hour.
4. **A timer is a planned absence**: the same away state, ended by the timer.

## Decided

- **Cadence 2.5 s, one 640 px frame, `muse-spark-1.3` minimal, non-streaming.** One observation in flight at a time:
  if the last hasn't answered, the tick is skipped. Paused while a timer runs (the cook has walked away) and after
  the recipe is finished.
- **Cost — measured 2026-10-27:** 0.15–0.47¢ a look. The picture is cheap (~530 input tokens); the model's
  reasoning, billed as output (300–675 tokens even at "minimal"), is most of it. ~4–7¢ a minute. The reasoning is the
  lever for the cost discussion, not the picture.
- **Limits:** observations are counted apart from turns — at most 1,500 per device per day (~1 hour of cooking).
  Each look reserves its worst case (1.5¢) against the global daily cap before the model is called, then settles to
  the real cost Meta reports (millicents, so fractions add up; never below 0.1¢). Images must be strict JPEGs
  ≤ 1024 px. A session answers only the device that started it. (Four security-review rounds, 2026-10-27.)
- **Two photos, not one:** each look sends the previous look beside the new one and asks what *changed*. Shown one
  photo and a log, it told a story on an identical frame (chicken, then garlic, then salt); with two, nothing.
- **The log lives on the phone** and travels with each turn (`seen`, ≤ 50 lines of ≤ 100 characters), keeping the
  Worker stateless per request. The recorder writes every observation into `events.jsonl` (kind `seen`).

## Not now

- **Cost.** His call, 2026-10-27: build the observer as designed first, then take cost up as its own discussion —
  ~4¢ a minute (estimate) is "way too much" for a product (a 20-minute cook ≈ 80¢; five cooks a week ≈ $16/month).
  **His direction (2026-10-27):** *"the glasses are just streaming live data and it's going to some brain… using AI
  as little as possible is probably ideal… that brain processes it and then just knows the right times to talk."*
  So the shape to design toward: cheap on-device processing of the whole stream (change detection, presence, motion)
  decides *when* something worth asking about happened, and only then calls the model.
  Levers to weigh then: only observe when the frame changes (on-device diff), cache-friendly prompts (Meta's cached
  input is 8× cheaper), smaller frames, a cheaper open-weight model for observing only. To make that discussion
  rest on facts, every observation records the model's real token usage, and the recording reports ¢/minute.

- **Video clips at "done"** (Muse Spark accepts uploaded video): add only if the observer misses quick motions.
- Changing the conversation's latency (the separate silence problem) — measured on the same test run.

## How we'll know it works — the eggs test card

One recorded run, scrambled eggs, glasses only:

| Checkpoint | He does | Right call |
|---|---|---|
| A | Cracks the eggs, **adds salt**, beats them | the log shows the salt going in |
| B | (second run) **skips the salt**, says "done" | the coach says the salt hasn't gone in, or asks |
| C | Pours eggs into a **cold pan** | it speaks up unprompted, or says so when asked |
| D | Eggs half-cooked: "are these done?" | not yet |
| E | Eggs done: "are these done?" | yes, and it moves on |
| F | Walks out of the kitchen mid-step for a minute, then back | says it's holding the place once; quiet and cheap while away; picks up with a recap |

Plus, read from the recording: seconds from the end of his words to the coach's first word on every turn, and
the observer's cost per minute.
