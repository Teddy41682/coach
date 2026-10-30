# Idea: a natural, expressive voice for the coach

**Filed:** 2026-10-30 · **From:** his eighth PB&J — "her voice still feels very robotic and unemotive" (with Serena
Premium, the best Apple voice on his phone; logged in the recording as `voice: Serena (Premium)`).
**Status:** open · **Priority:** after the coach's behaviour is right; not before the hackathon demo unless cheap.

## Why
The coach's words are now good; the voice is what still says "machine". Meta has no text-to-speech, so the
system voice (AVSpeechSynthesizer) is what speaks today.

## Options to measure (none measured yet — prices and latencies below are to verify, not facts)
- **A streaming neural voice through the Worker** (ElevenLabs Flash, OpenAI's TTS, …): send each sentence as it
  streams, play audio as it arrives. Questions: first-audio latency on top of today's ~2.5 s; cost per cook (a PB&J
  is ~20 lines, ~1,200 characters); the key stays on the Worker, like Muse's.
- **Expressive control**: a voice that can be told the mood of a line (a quip, a correction, praise).
- Keep the system voice as the fallback when the network is slow.

## Done when
He hears a cook and the voice no longer reads as a machine, with no more than ~0.3 s added before the first word.
