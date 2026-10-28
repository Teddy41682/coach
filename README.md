# Coach

A live AI coach for hands-on work. It watches what you're doing through Ray-Ban Meta glasses (or your phone's camera),
talks you through each step, notices what you missed, and answers when you ask — hands-free. First domain: cooking.

> "Did I add the salt?" — answered from what it actually watched, not guessed from one photo.

**Built during the Meta Global AI Developer Hackathon, 2026-10-26 → 2026-11-04.** Every commit in this repository was
made inside that window.

<!-- DRAFT 2026-10-27 — fill the TestFlight link and judge code (Sun 11-01), and re-check the architecture section
     against the merged `mind` branch before submission. -->

## Try it

**With Ray-Ban Meta glasses (best):**
1. Install the app from TestFlight: **[TestFlight link — TBD]**.
2. Sign in with the judge code **[TBD]**. Your recipe box comes with two recipes ready to cook.
3. Turn on Developer Mode for your glasses in the Meta AI app (one-time, ~30 seconds — see below).
4. Open a recipe → **Cook it** → **Cook with your glasses**. Put the glasses on and talk.

**Without glasses:** the same flow with **Use my phone** — prop the phone so its camera sees your counter.

### Developer Mode (judges with glasses)
Third-party apps can reach the glasses' camera only with Developer Mode on.
1. Open the **Meta AI** app with your glasses paired.
2. Go to your glasses' settings and turn on **Developer Mode** **[exact menu path — verify on Meta AI app v296]**.
3. The first time Coach starts, approve the camera permission when the Meta AI app asks.

## What it does

- **Guides the recipe step by step**, by voice, and moves on when you're done — or when you say so, in any words.
- **Watches continuously.** The glasses stream; the phone keeps a timeline of what happened ("0:51 shook salt over
  the bowl"), so questions are answered from what it saw.
- **Speaks up only when it matters** — a step skipped, a pan still cold — and otherwise stays quiet.
- **Holds your place** when you walk away, and picks up where you left off when you come back.
- **Records a session** (what it saw, what you said, what it said) for review.

## How it works

```
 Ray-Ban Meta glasses ──camera──▶  iPhone  ──────────────▶  Coach Worker (Cloudflare)  ──▶  Muse Spark
   (Wearables DAT)               ┌────────────────────┐      ┌──────────────────────────┐    (Meta Model API)
                                 │ Eyes: cheap change │ wake │ One mind: recipe + step  │
 your voice ──mic──▶ listener ──▶│ detection, timers, │─────▶│ briefing + timeline +    │
                                 │ speech, heartbeat  │      │ frames → say / stay /    │
 glasses speakers ◀── voice ◀────│ Guardrails only    │◀─────│ next / hold              │
                                 └────────────────────┘      └──────────────────────────┘
```

- **Eyes (phone, always on, cheap):** decide only *when* to wake the mind — the picture changed, you finished
  speaking, a timer ended, or a slow heartbeat. They never decide what to say.
- **One mind (the model):** sees everything a person beside you would — the recipe, the current step's briefing
  (what done looks like, common mistakes), the timeline, the conversation, the newest frame — and decides whether to
  speak, what to say, and whether to move on. Spoken answers stream sentence by sentence.
- **Guardrails, not rules:** never talks over you, never more than one unprompted line every 20 seconds, never past
  the spending cap.

### Three swappable parts
| Part | Today | Swap by |
|---|---|---|
| **Model** | Muse Spark (`muse-spark-1.3`, standard tier) | the `ModelConnector` interface in `worker/src/model/` |
| **Expertise** | cooking (`worker/src/expertise/cooking.ts`) | an `ExpertisePack` — carpentry, plumbing, electrical… |
| **Eyes** | Ray-Ban Meta glasses or the phone camera | the `CoachDevice` protocol in `ios/CoachKit` |

### Meta models used
- **Muse Spark** — vision + conversation: step briefings at session start, the mind's judgement, spoken answers.
- **Muse Voice Transcribe** — **[if adopted]** speech-to-text. Measured on our kitchen recordings: end of speech
  detected 0.25–0.75 s after the cook stops (median 0.64 s) vs ~1.6 s on-device, and far fewer mishears.
- **Wearables Device Access Toolkit 1.0.1** — the glasses' camera stream.

### Safety and cost
- The model key lives only in the Worker. The app authenticates with an app key; a session answers only the device
  that started it.
- Every model call reserves its worst-case cost before it runs and settles to the cost Meta reports, against
  per-device and global daily caps. Images are strict JPEGs ≤ 1024 px.
- Standard tier only — nothing is sent under the contributor terms.

## Repository

| Path | What |
|---|---|
| `worker/` | Cloudflare Worker (TypeScript): sessions, the mind, spoken turns, limits. `npm test` |
| `ios/CoachKit/` | Swift package: session, eyes, listener, speaker, client, recorder, UI. `swift test` on a Mac |
| `ios/CoachGlasses/` | Swift package: Ray-Ban Meta glasses via the Wearables DAT (iOS only) |
| `ios/Demo/` | A minimal host app (xcodegen) |
| `tools/` | `assemble.py` (a recording → point-of-view video with captions), `replay` (a recording → what the mind would do) |
| `docs/superpowers/` | the designs and plans, in the order they were made |

## Built during the hackathon vs existing product

- **This repository — all of it — was built during the hackathon window.**
- **J'habite** (the recipe app the judges' TestFlight build is) is a pre-existing product of the same author. During
  the hackathon only its *integration* with Coach was added: a "Cook it with your glasses" entry behind a feature
  switch, a mapping from a J'habite recipe to a Coach recipe, and a judge sign-in. Its recipe pipeline and prompts
  are not part of this submission.

## Licence

MIT — see `LICENSE`.
