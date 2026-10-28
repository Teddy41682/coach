# Mind replay — prompt versions against his five recordings (2026-10-28, overnight)

**Question:** does one mind, woken by cheap eyes, behave like a good coach on his five recordings of 2026-10-27 — and
at what cost — before he cooks with it?

**Method:** `tools/replay.py` plays each recording through the eyes (8×8 greyscale thumbnail vs the mind's last look:
change ≥ 0.10 and steady ≤ 0.06 over 1 s; eye wakes ≥ 2.5 s apart; heartbeat 30 s; looks at 2 frames/s) and the
deployed `/v1/mind` (muse-spark-1.3, standard, minimal). His `heard` words are injected at their real times as
spoken wakes (navigation fast paths as on the phone). Each call's real latency plays out on a simulated clock;
unprompted lines pass the guardrails (not over the cook or itself, ≥ 20 s apart, not after finished).

**Ground truth from the frames** (contact sheets, looked at by eye):
- 00-30-08Z (eggs, 45 s): open-plan kitchen/living room the whole time; picks the phone up and scrolls it. Never left.
- 00-30-58Z (tuna, 35 s): walks out past the bathroom (≈ 16–20 s) to the desk with monitors (≈ 24–35 s) — he did
  leave the kitchen, while saying "I haven't stepped away" at 19.9 s (he was testing it).
- 01-03-11Z (eggs/toast, 2 min): empty toaster ≈ 20 s; bedroom ≈ 28–52 s; back at the empty toaster ≈ 58–70 s;
  bedroom with the mirror ≈ 76–112 s; desk ≈ 124 s.
- 23-13-01Z, 23-34-14Z (tuna): at the counter/sink throughout.

**Known replay limits (measured, not argued away):** his words answered the *old* coach, so when the mind moves on
earlier than the old coach did, his later "let's go to the next step" overshoots (23-13 reached step 5 that way).
Spoken-turn cost isn't reported by the stream; spoken wakes are charged as turns (≤ 2¢ cap charge each).
Cook speech windows are estimated from word counts (2.5 words/s).

## Baseline — the observer (measured on the phone, 2026-10-27)

24 looks/min, 0.12–0.36¢ a look → **~4.8¢/min** (01-03-11Z: 42 looks in 2 min); said "stepped away" 3 times in 35 s
on 00-30-58Z and once on 00-30-08Z (he never left).

## v1 — the judgement written from the spec (Worker 1246f8ca)

| Recording | eye wakes/min | eye ¢/min | unprompted | spoken first word | verdict |
|---|---:|---:|---:|---|---|
| 23-13-01Z tuna | 6.5 | 1.76 | 1 | 1.0–2.2 s | answers well, moves on when shown; one early salt question 12 s into step 5 |
| 23-34-14Z tuna | 3.8 | 1.20 | 2 | 0.8–2.4 s | good answers; **asked about the pickled onions 4 times** and wouldn't move on at 350 s |
| 00-30-08Z walk | 8.2 | 2.39 | 1 | — | never said "away" ✓; **nudged "get the bread in" at 33 s while he scrolled his phone** |
| 00-30-58Z walk | 3.8 | 0.82 | 0 | 1.9 s | **"I'll hold your place" right after "I haven't stepped away"**, and "still holding" again 8 s later |
| 01-03-11Z toast | 4.0 | 1.13 | 2 | 1.1–1.8 s | ✓ welcome back + **empty toaster noticed** on return; held once per absence in the bedroom |

Measured: ¢/min 0.8–2.4 (eye wakes only) vs ~4.8 observer. Hypothesis for v2: the judgement needs (a) the cook's own
words outrank the picture about where he is, (b) raise a concern once then trust him, (c) don't hurry an idle cook.

## v2 — cook's words outrank the picture; raise once; don't hurry (Worker 2eb459a0)

| Recording | eye wakes/min | eye ¢/min | unprompted | spoken first word | verdict |
|---|---:|---:|---:|---|---|
| 23-13-01Z tuna | 6.5 | 1.75 | 2 | 0.9–1.7 s | good answers; unprompted mayo tip; **"have you added the salt and pepper yet?" 7 s into step 5** |
| 23-34-14Z tuna | 3.7 | 1.14 | 3 | 0.9–2.1 s | **held on its very first look (he was setting up a tripod in the open-plan living area) → a false "welcome back" at 21 s**; onions asked about twice (was 4); "chop them small" proposed 3× (guardrails dropped 2) |
| 00-30-08Z walk | 8.2 | 1.92 | 0 | — | ✓ silent |
| 00-30-58Z walk | 3.8 | 1.21 | 0 | 1.5 s | ✓ "Got it, you're still here with me."; hold judged at the desk but dropped as stale (he was talking) |
| 01-03-11Z toast | 4.0 | 1.09 | 2 | 1.0–1.2 s | ✓ one hold per bedroom trip; ✓ "welcome back — ready to get the toast in?" then "just drop the two slices in" (empty toaster implied, less explicit than v1) |

Measured: the contradiction and the idle nudge are gone. Hypothesis for v3: being sure someone has left takes more
than one look; a welcome back only follows a held place; unprompted lines are for mistakes, absences and returns —
not tips or "have you done X yet" right after a step starts.

## v3 — leaving takes more than one look; unprompted is for mistakes, absences and returns (Worker 9cb8ed3e)

Run twice (v3, v3b) because one run of a model is one sample.

| Recording | eye wakes/min | eye ¢/min | unprompted (v3 / v3b) | verdict (both runs) |
|---|---:|---:|---:|---|
| 23-13-01Z tuna | 6.5 | 1.6 | 0 / 1 | ✓ answers as before; moves on when he asks; v3b's one line was "That's it all in, nicely done" + next as the tuna went in |
| 23-34-14Z tuna | 3.7 | 1.1 | 1 / 0 | ✓ no false hold; onions not nagged (asked once, at "so done" on the last step); no repeated tips |
| 00-30-08Z walk | 8.2 | 2.0 | 0 / 0 | ✓ silent while he scrolled his phone in the open-plan room |
| 00-30-58Z walk | 3.8 | 1.4 | 0 / 0 | ✓ "Got it, you're still here"; never said "stepped away" (judged a hold at the desk, but he was mid-sentence, so it was dropped) |
| 01-03-11Z toast | 4.0 | 1.2 | 2 / 1 | ✓ v3: "Welcome back from the bedroom — toaster's still empty"; v3b: "Yep, I'm here — toaster's still empty" (spoken reply); exactly one "I'll hold our place" in the second bedroom trip; quiet while he glanced round |

**Stopped at v3: the scorecard is met on both samples.**

Measured across all four runs (128 spoken turns, 4 × 5 recordings):
- Eye wakes 3.7–8.2/min (observer: 24/min); eye cost **1.1–2.0¢/min** (observer: ~4.8¢/min) — about 3× cheaper.
  Spoken turns are extra (charged as turns; their real cost isn't reported by the stream — hypothesis ~0.3–0.5¢ each,
  like an eye wake).
- Spoken first word: median 1.4–2.1 s, p90 1.9–2.7 s — **but one turn in ~30 per v3 run took 8–9 s** (both on long
  timelines; v1/v2 never passed 2.4 s). Hypothesis: Meta-side variance, worse with five replays running at once;
  the phone's 1.3 s ack covers the wait and its 12 s timeout bounds it. Watch it in the morning's recording.
- Replay spend tonight: 64¢ of eye wakes measured + 128 spoken turns (≈ 40–65¢, hypothesis) + 12 session starts.

What's still a hypothesis: none of these recordings has a cooking *mistake* (cold pan, missing salt) — the mind's
speaking up for one is untested by the replay. The eggs test card (observer spec) is the morning's check for it.
