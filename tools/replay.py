#!/usr/bin/env python3
"""Replay a Coach recording through the eyes and the mind, as if it were live.

Usage: python3 tools/replay.py <Recordings/<stamp> folder> [--recipe tuna|eggs|boule] [--dry] [--no-spoken]
                               [--out scorecard.md] [--json out.json] [--device replay-test]

The recording's frames are looked at two a second by the same eyes as the phone (Eyes.swift — keep the constants
equal): a greyscale 8×8 thumbnail compared with the last frame the mind saw, waking it when the picture has changed
and held steady, at most every 2.5 s, plus a 30 s heartbeat. The cook's words (`heard` events) are injected at their
real times as spoken wakes. Each call's real latency is played out on a simulated clock: one mind call in flight, an
unprompted line spoken only if the guardrails allow it when the answer lands. Prints what really happened beside
what the mind would have done, and the wakes and cents per minute.

--dry runs the eyes alone (no network, no spend). Otherwise it calls the deployed Worker with COACH_APP_KEY, read
from ~/imogen/.env inside this script and never printed.
"""
import argparse, base64, heapq, io, json, pathlib, re, sys, time, urllib.error, urllib.request

from PIL import Image

WORKER = "https://coach.teddy41682.workers.dev"
HERE = pathlib.Path(__file__).parent

# The eyes — perception tuning, not behaviour. Equal to Eyes.swift.
THUMB = 8            # thumbnail side, px
CHANGE = 0.10        # this different from the mind's last look…
STEADY = 0.06        # …and no more than this different from a second ago (the cook has settled on something)
SPACING = 2.5        # eye wakes at least this far apart
HEARTBEAT = 30.0     # a look anyway after this long without one
LOOK_EVERY = 0.5     # the phone's frame buffer keeps two a second

# The guardrails — the only rules. Equal to Guardrails.swift.
UNPROMPTED_SPACING = 20.0


def thumb(path):
    """A greyscale THUMB×THUMB box-averaged thumbnail, as a flat list of 0–255."""
    im = Image.open(path)
    im.draft("L", (THUMB * 8, THUMB * 8))
    return list(im.convert("L").resize((THUMB, THUMB), Image.BOX).get_flattened_data())


def diff(a, b):
    """Mean absolute difference after removing each picture's mean (so exposure swings don't count), 0–1."""
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    return sum(abs((x - ma) - (y - mb)) for x, y in zip(a, b)) / len(a) / 255


class Eyes:
    def __init__(self):
        self.reference = None      # the last frame the mind saw
        self.history = []          # (t, thumb) of recent looks
        self.last_eye = -1e9
        self.last_call = None

    def look(self, t, th, busy=False):
        """'changed', 'heartbeat' or None for this frame."""
        self.history = [h for h in self.history if t - h[0] <= 3] + [(t, th)]
        if busy:
            return None
        if self.reference is None:
            return "changed"
        if self.last_call is not None and t - self.last_call >= HEARTBEAT:
            return "heartbeat"
        if t - self.last_eye < SPACING - 1e-6:
            return None
        before = [h for h in self.history if h[0] <= t - 1.0 + 1e-6]
        if not before:
            return None
        steady = diff(th, before[-1][1]) <= STEADY
        return "changed" if steady and diff(th, self.reference) >= CHANGE else None

    def woke(self, t, th, eye=True):
        """The mind was called at t, shown th (spoken wakes count for the heartbeat, not the spacing)."""
        if th is not None:
            self.reference = th
        self.last_call = t
        if eye:
            self.last_eye = t


class Guardrails:
    def __init__(self):
        self.last = -1e9

    def allows(self, t, cook_speaking, coach_speaking, finished):
        return not (cook_speaking or coach_speaking or finished) and t - self.last >= UNPROMPTED_SPACING - 1e-6

    def spoke(self, t):
        self.last = t


class Timeline:
    def __init__(self):
        self.entries = []

    def add(self, t, who, text):
        if who == "saw" and any(e[1] == "saw" and e[2] == text and t - e[0] < 10 for e in self.entries):
            return
        self.entries.append((t, who, text))

    def lines(self, limit=50):
        out = []
        for t, who, text in self.entries[-limit:]:
            s = int(t)
            out.append(f"{s // 60}:{s % 60:02d} {who}: {text}"[:200])
        return out


def intent(utterance):
    """The phone's fast paths (Intent.swift), navigation only; everything else goes to the mind."""
    cleaned = re.sub(r"[^a-z0-9' ]", "", utterance.lower().replace("’", "'").replace("-", " "))
    words = [w for w in cleaned.split() if w not in ("ok", "okay", "so", "um", "please")]
    phrase = " ".join(words)
    if not words:
        return "ignore"
    if phrase in ("i'm back", "im back", "i am back", "back now", "i'm back now"):
        return "back"
    if phrase in ("go back", "previous step", "go back a step", "last step", "back a step"):
        return "previous"
    if phrase in ("what's next", "whats next", "next step", "next", "what now", "what next"):
        return "next"
    moves = "move on" in phrase or "next step" in phrase or (
        "step" in words and any(n in words for n in ("two", "2", "three", "3", "four", "4", "five", "5")))
    if moves and (len(words) <= 10 and "?" not in utterance or phrase.startswith("shall we") or phrase.startswith("can we")):
        return "next"
    if phrase in ("say that again", "repeat that", "repeat", "what was that", "again"):
        return "repeat"
    if phrase in ("done", "i'm done", "im done", "i am done", "that's done", "thats done", "finished", "all done") or (
            words[0] == "finished" and len(words) <= 3):
        return "done"
    return "question"


def speech_seconds(text):
    return max(0.8, len(text.split()) / 2.7)


def b64_frame(path, side=640):
    im = Image.open(path).convert("RGB")
    im.thumbnail((side, side))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=60)
    return base64.b64encode(buf.getvalue()).decode()


def cents(u):
    return ((u["input"] - u["cachedInput"]) * 1.25 + u["cachedInput"] * 0.15 + u["output"] * 4.25) / 10_000


class Worker:
    def __init__(self, device):
        self.device = device
        self.key = None
        for line in (pathlib.Path.home() / "imogen/.env").read_text().splitlines():
            if line.startswith("COACH_APP_KEY="):
                self.key = line.split("=", 1)[1].strip().strip('"').strip("'")
        if not self.key:
            sys.exit("COACH_APP_KEY not found in ~/imogen/.env")

    def _req(self, path, body):
        return urllib.request.Request(WORKER + path, data=json.dumps(body).encode(), method="POST", headers={
            "Content-Type": "application/json", "X-Coach-Key": self.key, "X-Coach-Device": self.device,
            "User-Agent": "coach-replay"})

    def session(self, recipe):
        cache = HERE / ".replay-sessions.json"
        known = json.loads(cache.read_text()) if cache.exists() else {}
        k = f"{self.device}|{recipe['title']}"
        if k not in known:
            with urllib.request.urlopen(self._req("/v1/session", {"recipe": recipe}), timeout=60) as r:
                known[k] = json.load(r)
            cache.write_text(json.dumps(known))
        return known[k]

    def wake(self, body):
        t0 = time.monotonic()
        try:
            with urllib.request.urlopen(self._req("/v1/mind", body), timeout=60) as r:
                answer = json.load(r)
        except urllib.error.HTTPError as e:
            answer = {"seen": [], "say": None, "step": "stay", "usage": {"input": 0, "cachedInput": 0, "output": 0},
                      "error": e.code}
        return answer, time.monotonic() - t0

    def spoken(self, body):
        """Streams a spoken wake: (text, action, seconds to first text, seconds to done)."""
        t0 = time.monotonic()
        text, action, first = "", "stay", None
        with urllib.request.urlopen(self._req("/v1/mind", body), timeout=60) as r:
            for raw in r:
                line = raw.decode().strip()
                if not line.startswith("data: "):
                    continue
                e = json.loads(line[6:])
                if e["type"] in ("text", "error"):
                    if first is None and e.get("text", "").strip():
                        first = time.monotonic() - t0
                    text += e.get("text", "")
                elif e["type"] == "action":
                    action = e["action"]
        return " ".join(text.split()), action, first or (time.monotonic() - t0), time.monotonic() - t0


def load(folder):
    events = [json.loads(l) for l in (folder / "events.jsonl").read_text().splitlines() if l.strip()]
    frames = sorted((folder / "frames").glob("*.jpg"), key=lambda p: int(p.stem))
    looks, last = [], -1.0
    for p in frames:
        t = int(p.stem) / 1000
        if t - last >= LOOK_EVERY - 1e-6:
            looks.append((t, p))
            last = t
    return events, looks


def replay(folder, recipe, worker=None, spoken=True):
    events, looks = load(folder)
    title_said = [e for e in events if e["kind"] == "said"]
    start = title_said[0]["t"] if title_said else (looks[0][0] if looks else 0)
    end = max([looks[-1][0] if looks else 0] + [e["t"] for e in events])
    heard = [e for e in events if e["kind"] == "heard"]
    session = worker.session(recipe) if worker else {"sessionId": "dry", "steps": []}
    steps = recipe["steps"]

    st = {"step": 0, "held": False, "finished": False, "step_start": start, "eye_busy": -1, "turn_busy": -1,
          "coach_until": -1, "last_speech": start, "last_turn_start": -1e9, "seen_frame": None}
    eyes, guard, tl = Eyes(), Guardrails(), Timeline()
    rows, wakes, spent, latencies, says = [], {"changed": 0, "heartbeat": 0, "spoke": 0, "timer": 0}, 0.0, [], []
    q, seq = [], 0

    def push(t, kind, payload=None):
        nonlocal seq
        heapq.heappush(q, (t, seq, kind, payload)); seq += 1

    def cook_speaking(t):
        return any(h["t"] - max(1.0, len(h["text"].split()) / 2.5) <= t <= h["t"] + 0.3 for h in heard)

    def coach_say(t, line, unprompted=False):
        at = max(t, st["coach_until"])
        st["coach_until"] = at + speech_seconds(line)
        st["last_speech"] = st["coach_until"]
        tl.add(at, "coach", line)
        rows.append((at, "mind", ("» " if unprompted else "") + line))
        if unprompted:
            says.append((round(at, 1), line))

    def advance(t):
        if st["finished"]:
            return
        if st["step"] + 1 >= len(steps):
            st["finished"] = True
            coach_say(t, "That was the last step. Enjoy it.")
            return
        st["step"] += 1
        st["step_start"] = t
        coach_say(t, f"Step {st['step'] + 1}: {steps[st['step']]}")

    def frames_at(t, n=2, since=None):
        past = [p for (ft, p) in looks if ft <= t and (since is None or ft >= since)]
        if since is not None and len(past) > 6:
            past = [past[round(i * (len(past) - 1) / 5)] for i in range(6)]
            return past
        return past[-n:]

    coach_say(start, f"Let's make {recipe['title']}. Step 1: {steps[0]}")
    for t, p in looks:
        if t >= start:
            push(t, "look", p)
    for h in heard:
        push(h["t"], "heard", h)

    while q:
        t, _, kind, payload = heapq.heappop(q)
        if kind == "look":
            if st["finished"]:
                continue
            th = thumb(payload)
            busy = t < st["eye_busy"] or t < st["turn_busy"]
            reason = eyes.look(t, th, busy=busy)
            if not reason:
                continue
            wakes[reason] += 1
            eyes.woke(t, th)
            rows.append((t, "mind", f"[wake: {reason}]"))
            if not worker:
                continue
            body = {"sessionId": session["sessionId"], "stepIndex": st["step"], "wake": reason, "timeline": tl.lines(),
                    "quietFor": max(0.0, t - st["last_speech"]), "held": st["held"], "finished": st["finished"],
                    "frame": b64_frame(payload)}
            if st["seen_frame"]:
                body["previous"] = b64_frame(st["seen_frame"])
            st["seen_frame"] = payload
            answer, took = worker.wake(body)
            spent += cents(answer["usage"])
            latencies.append(took)
            st["eye_busy"] = t + took
            push(t + took, "answer", (t, st["step"], answer))
        elif kind == "answer":
            woke_at, step_then, a = payload
            for s in a["seen"]:
                tl.add(woke_at, "saw", s)
            info = f"  seen {a['seen']} say={a['say']!r} step={a['step']}" + (f" ERROR {a['error']}" if "error" in a else "")
            rows.append((t, "mind", info))
            stale = st["step"] != step_then or st["last_turn_start"] > woke_at
            if stale:
                rows.append((t, "mind", "  (stale: dropped)"))
                continue
            if a["say"] or a["step"] == "next":
                if guard.allows(t, cook_speaking(t), t < st["coach_until"], st["finished"]):
                    if a["say"]:
                        coach_say(t, a["say"], unprompted=True)
                        guard.spoke(t)
                    if a["step"] == "next":
                        advance(st["coach_until"])
                else:
                    rows.append((t, "mind", "  (guardrail: not now)"))
            if a["step"] == "hold" and not st["held"]:
                st["held"] = True
                tl.add(t, "note", f"place held at step {st['step'] + 1}")
            elif a["step"] != "hold" and st["held"]:
                st["held"] = False
                tl.add(t, "note", "the cook is back")
        elif kind == "heard":
            words = payload["text"]
            st["last_speech"] = t
            what = intent(words)
            if what == "ignore":
                continue
            tl.add(t, "cook", words)
            st["held"] = False
            if what == "next":
                advance(t + 0.1)
                continue
            if what == "previous":
                st["step"] = max(0, st["step"] - 1); st["step_start"] = t
                coach_say(t + 0.1, f"Step {st['step'] + 1}: {steps[st['step']]}")
                continue
            if what == "repeat":
                coach_say(t + 0.1, f"Step {st['step'] + 1}: {steps[st['step']]}")
                continue
            if not worker or not spoken:
                rows.append((t, "mind", "[spoken wake: not replayed]"))
                continue
            utterance = {"done": "I've finished this step. Did I miss anything before I move on?",
                         "back": "I'm back. How is it looking?"}.get(what, words)
            fr = frames_at(t, since=st["step_start"]) if what == "done" else frames_at(t)
            wakes["spoke"] += 1
            st["last_turn_start"] = t
            eyes.woke(t, thumb(fr[-1]) if fr else None, eye=False)
            if fr:
                st["seen_frame"] = fr[-1]
            body = {"sessionId": session["sessionId"], "stepIndex": st["step"], "wake": "spoke",
                    "timeline": tl.lines(), "quietFor": 0, "held": False, "finished": st["finished"],
                    "utterance": utterance, "frames": [b64_frame(p) for p in fr]}
            text, action, first, done = worker.spoken(body)
            latencies.append(done)
            st["turn_busy"] = t + done
            push(t + first, "spoken", (text, action, first, done, t))
        elif kind == "spoken":
            text, action, first, done, asked = payload
            if text:
                coach_say(t, text)
            rows.append((t, "mind", f"  [{action}] first word {first:.1f} s"))
            if action == "next":
                advance(st["coach_until"])
            elif action == "hold":
                st["held"] = True
                tl.add(t, "note", f"place held at step {st['step'] + 1}")

    actual = [(e["t"], "real", ("cook: " if e["kind"] == "heard" else "") + e["text"]) for e in events
              if e["kind"] in ("heard", "said") and e.get("text", "").strip()]
    minutes = max((end - start) / 60, 1 / 60)
    eye_wakes = wakes["changed"] + wakes["heartbeat"] + wakes["timer"]
    firsts = [r[2] for r in rows if "first word" in r[2]]
    return {
        "recording": folder.name, "recipe": recipe["title"], "minutes": round(minutes, 2),
        "wakes": wakes, "eye_wakes_per_min": round(eye_wakes / minutes, 1),
        "all_wakes_per_min": round(sum(wakes.values()) / minutes, 1),
        "eye_cents": round(spent, 2), "eye_cents_per_min": round(spent / minutes, 2),
        "unprompted": says, "steps_reached": st["step"] + 1, "finished": st["finished"],
        "first_word": [float(re.search(r"([\d.]+) s", f).group(1)) for f in firsts],
        "rows": sorted(actual + rows, key=lambda r: r[0]),
    }


def render(r):
    out = [f"## {r['recording']} — {r['recipe']}", "",
           f"- {r['minutes']} min · eye wakes {r['wakes']['changed']} changed + {r['wakes']['heartbeat']} heartbeat"
           f" = **{r['eye_wakes_per_min']}/min** · spoken wakes {r['wakes']['spoke']} · all {r['all_wakes_per_min']}/min",
           f"- eye cost {r['eye_cents']}¢ = **{r['eye_cents_per_min']}¢/min** (observer measured ~4–5¢/min)",
           f"- unprompted lines: {len(r['unprompted'])} · reached step {r['steps_reached']}{' (finished)' if r['finished'] else ''}",
           f"- spoken first word (s): {', '.join(f'{x:.1f}' for x in r['first_word']) or '—'}", "",
           "| t | what really happened | the mind (replay) |", "|---:|---|---|"]
    for t, col, text in r["rows"]:
        cell = text.replace("|", "/").replace("\n", " ")
        out.append(f"| {t:.1f} | {cell if col == 'real' else ''} | {cell if col == 'mind' else ''} |")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", type=pathlib.Path)
    ap.add_argument("--recipe", choices=["tuna", "eggs", "boule"])
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--no-spoken", action="store_true")
    ap.add_argument("--out", type=pathlib.Path)
    ap.add_argument("--json", type=pathlib.Path)
    ap.add_argument("--device", default="replay-test")
    a = ap.parse_args()
    recipes = json.loads((HERE / "recipes.json").read_text())
    if a.recipe:
        recipe = recipes[a.recipe]
    else:
        events = [json.loads(l) for l in (a.folder / "events.jsonl").read_text().splitlines() if l.strip()]
        title = next((e["text"][7:] for e in events if e["kind"] == "note" and e["text"].startswith("start: ")), "")
        recipe = next((r for r in recipes.values() if r["title"] == title), None)
        if not recipe:
            sys.exit(f"no recipe for {title!r}: pass --recipe")
    r = replay(a.folder, recipe, None if a.dry else Worker(a.device), spoken=not a.no_spoken)
    md = render(r)
    print(md)
    if a.out:
        a.out.write_text(md)
    if a.json:
        a.json.write_text(json.dumps({k: v for k, v in r.items()}, indent=1))


if __name__ == "__main__":
    main()
