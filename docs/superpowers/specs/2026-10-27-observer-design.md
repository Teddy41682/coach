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

## Decided

- **Cadence 2.5 s, one 640 px frame, `muse-spark-1.3` minimal, non-streaming.** One observation in flight at a time:
  if the last hasn't answered, the tick is skipped. Paused while a timer runs (the cook has walked away) and after
  the recipe is finished.
- **Cost:** ~0.17¢ an observation (~1,000 input tokens at $1.25/M + ~100 output at $4.25/M — estimate, to be
  measured) → ~4¢ a minute, ~60¢ for a 15-minute cook.
- **Limits:** observations are counted apart from turns — at most 1,500 per device per day (~1 hour of cooking) —
  and every 10 observations charge 1¢ against the global daily cap, so the overall ceiling still holds.
- **The log lives on the phone** and travels with each turn (`seen`, ≤ 50 lines of ≤ 100 characters), keeping the
  Worker stateless per request. The recorder writes every observation into `events.jsonl` (kind `seen`).

## Not now

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

Plus, read from the recording: seconds from the end of his words to the coach's first word on every turn, and
the observer's cost per minute.
