#!/usr/bin/env python3
"""The bench: replay his drill recordings through the deployed coach and score each one, so a change is measured
before he cooks with it. He cooks to confirm it feels right, not to find the bugs.

Usage: python3 tools/bench.py [stamp …] [--label v9]      (default: the bench set below)

Scores per recording (replay.py does the replaying; it reads the Worker key itself and never prints it):
  catches        planted mistakes named in time (tools/bench-labels.json)
  longest quiet  the longest stretch with nobody talking, from the first step to the finish — his "too quiet"
  quiet > 10 s   how many such stretches
  lines/min      unprompted lines a minute — his "too chatty" sits at the other end
  all/min        every line the coach said a minute, answers included (Katie's run: 14/min live — "a train wreck")
  repeats        unprompted lines nearly the same as an earlier one
  first word     median seconds from his words to the coach's first word (the Worker's own time)
Results append to ~/coach-recordings/bench.md. A full run costs roughly 10–15¢ a recording.
"""
import argparse, difflib, json, pathlib, statistics, sys, time

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import replay as rp  # noqa: E402

RECORDINGS = pathlib.Path.home() / "coach-recordings"
HERE = pathlib.Path(__file__).parent
# Clean hearing from run 3 on; 6 and 7 are the bad-cook runs.
BENCH = ["2026-10-30T21-56-36Z", "2026-10-30T22-12-21Z", "2026-10-30T22-38-27Z"]
QUIET = 10.0


def score(r, labels):
    talk = [(a, b) for a, b, _ in r["talk"] if b >= r["start"]]
    gaps, at = [], r["start"]
    for a, b in talk:
        if a > at:
            gaps.append(a - at)
        at = max(at, b)
    if r["end"] > at:
        gaps.append(r["end"] - at)
    said = r["said"]
    caught = []
    for lab in labels:
        hit = next((t for t, line in said
                    if lab["at"] <= t <= lab["at"] + lab["within"] and any(k in line.lower() for k in lab["any"])), None)
        caught.append((lab["what"], hit))
    lines = [l for _, l in r["unprompted"]]
    repeats = sum(1 for i, l in enumerate(lines)
                  if any(difflib.SequenceMatcher(None, l.lower(), m.lower()).ratio() > 0.7 for m in lines[:i]))
    return {
        "catches": caught,
        "longest_quiet": round(max(gaps, default=0), 1),
        "quiet_over_10": sum(1 for g in gaps if g > QUIET),
        "lines_per_min": round(len(lines) / r["minutes"], 1),
        "all_per_min": round(len(said) / r["minutes"], 1),
        "repeats": repeats,
        "first_word": round(statistics.median(r["first_word"]), 2) if r["first_word"] else None,
        "finished": r["finished"],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stamps", nargs="*")
    ap.add_argument("--label", default="")
    a = ap.parse_args()
    labels = json.loads((HERE / "bench-labels.json").read_text())
    recipes = json.loads((HERE / "recipes.json").read_text())
    worker = rp.Worker("bench")
    out = [f"\n## Bench {time.strftime('%Y-%m-%d %H:%M')} {a.label}".rstrip(), "",
           "| recording | catches | longest quiet | quiet > 10 s | lines/min | all/min | repeats | first word | finished |",
           "|---|---|---:|---:|---:|---:|---:|---:|---|"]
    for stamp in a.stamps or BENCH:
        r = rp.replay(RECORDINGS / stamp, recipes["pbj"], worker=worker)
        s = score(r, labels.get(stamp, []))
        got = sum(1 for _, t in s["catches"] if t is not None)
        misses = ", ".join(w for w, t in s["catches"] if t is None)
        catches = f"{got}/{len(s['catches'])}" + (f" (missed: {misses})" if misses else "") if s["catches"] else "—"
        out.append(f"| {stamp} | {catches} | {s['longest_quiet']} s | {s['quiet_over_10']} | {s['lines_per_min']} | "
                   f"{s['all_per_min']} | {s['repeats']} | {s['first_word'] or '—'} s | {'yes' if s['finished'] else 'no'} |")
        (RECORDINGS / stamp / f"replay{('-' + a.label) if a.label else ''}.md").write_text(rp.render(r))
        print(out[-1], flush=True)
    with open(RECORDINGS / "bench.md", "a") as f:
        f.write("\n".join(out) + "\n")


if __name__ == "__main__":
    main()
