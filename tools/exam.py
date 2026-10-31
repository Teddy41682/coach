#!/usr/bin/env python3
"""The exam: mistake, substitution and change scenarios with known right answers, played through the live coach.
Proves the coach handles them — the verdict code decided, and that what was said kept code's numbers.

Usage: python3 tools/exam.py [--private] [--label v13] [--only <substring>]
  public scenarios:  tools/exam/scenarios.json (recipes written for the exam)
  --private:         ~/coach-recordings/exam-private/scenarios.json (built from his own recipes; never in git)
Each scenario: {"name", "recipe": {title, ingredients, steps}, "step": 1, "says": ["…", "…"],
                "expect": {"verdict": "fixable"|"fine"|"redo"|"unknown"|"none"|"ask"|"*", "item": "…", "mentions": ["¾ cup"]}}
  verdict "*" (private scenarios): any ruling from code, or the coach asking how much — never an improvised answer.
  "says" are spoken in order; the coach's replies join the timeline between them, as on the phone.
  verdict "none": no verdict event (not a slip); "ask": the coach asked how much and ruled nothing.
Appends a table to ~/coach-recordings/exam.md; exits 1 if any scenario fails. Reads the Worker key itself (replay.py),
never prints it. Each scenario starts its own session (a rescue that scales the batch must not leak into the next).
"""
import argparse, json, pathlib, sys, time, urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import replay as rp  # noqa: E402

HERE = pathlib.Path(__file__).parent
PRIVATE = pathlib.Path.home() / "coach-recordings/exam-private/scenarios.json"
OUT = pathlib.Path.home() / "coach-recordings/exam.md"


def spoken(worker, body):
    """One spoken turn: (events, seconds to first text)."""
    t0, first, events = time.monotonic(), None, []
    with urllib.request.urlopen(worker._req("/v1/mind", body), timeout=60) as r:
        for raw in r:
            line = raw.decode().strip()
            if not line.startswith("data: "):
                continue
            e = json.loads(line[6:])
            if e["type"] == "text" and first is None and e.get("text", "").strip():
                first = time.monotonic() - t0
            events.append(e)
    return events, first or (time.monotonic() - t0)


def run(worker, s):
    with urllib.request.urlopen(worker._req("/v1/session", {"recipe": s["recipe"]}), timeout=90) as r:
        session = json.load(r)
    timeline, verdict, said, firsts = [], None, "", []
    for i, words in enumerate(s["says"]):
        timeline.append(f"0:{10 + i * 10:02d} cook: {words}")
        body = {"sessionId": session["sessionId"], "stepIndex": s["step"], "wake": "spoke", "timeline": timeline[-50:],
                "quietFor": 0, "utterance": words, "frames": []}
        events, first = spoken(worker, body)
        firsts.append(first)
        said = " ".join(e["text"] for e in events if e["type"] == "text").strip()
        verdict = next((e for e in events if e["type"] == "verdict"), verdict)
        timeline.append(f"0:{15 + i * 10:02d} coach: {said}")
    want = s["expect"]
    got = verdict["verdict"] if verdict else ("ask" if said.lower().startswith("how much") else "none")
    problems = []
    if want["verdict"] == "*":
        # Private scenarios: any ruling from code, never the mind improvising a rescue.
        if not verdict and not said.lower().startswith("how much"):
            problems.append("no ruling: the slip wasn't caught")
    elif got != want["verdict"]:
        problems.append(f"verdict {got}, wanted {want['verdict']}")
    if want.get("item") and verdict and verdict.get("item") != want["item"]:
        problems.append(f"item {verdict.get('item')}, wanted {want['item']}")
    for m in want.get("mentions", []):
        if m not in said:
            problems.append(f"didn't say “{m}”")
    return {"name": s["name"], "got": got, "said": said, "first": max(firsts), "problems": problems}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--private", action="store_true")
    ap.add_argument("--label", default="")
    ap.add_argument("--only", default="")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--device", default="exam", help="each device has its own daily turn cap on the Worker")
    a = ap.parse_args()
    path = PRIVATE if a.private else HERE / "exam/scenarios.json"
    scenarios = [s for s in json.loads(path.read_text()) if a.only in s["name"]]
    if a.limit:
        scenarios = scenarios[:a.limit]
    worker = rp.Worker(a.device)
    rows = [f"\n## Exam {time.strftime('%Y-%m-%d %H:%M')} {'private' if a.private else 'public'} {a.label}".rstrip(), "",
            "| scenario | verdict | ok | slowest first word | said |", "|---|---|---|---:|---|"]
    failed = 0
    for s in scenarios:
        r = run(worker, s)
        ok = not r["problems"]
        failed += not ok
        cell = (r["said"][:110] + ("…" if len(r["said"]) > 110 else "")).replace("|", "/")
        rows.append(f"| {r['name']} | {r['got']} | {'✓' if ok else '✗ ' + '; '.join(r['problems'])} | {r['first']:.1f} s | {cell} |")
        print(rows[-1], flush=True)
    rows.append(f"\n**{len(scenarios) - failed}/{len(scenarios)} passed.**")
    print(rows[-1])
    with open(OUT, "a") as f:
        f.write("\n".join(rows) + "\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
