#!/usr/bin/env python3
"""Turn a Coach recording into a point-of-view video with both voices and captions.

Usage: python3 tools/assemble.py <Recordings/<stamp> folder> [--out pov.mp4]

The folder (pulled off the phone) holds frames/<ms>.jpg, mic.caf, said/<ms>.caf and events.jsonl.
Writes, next to --out: the video (each frame held until the next, at its real time), the audio (the mic with
every coach line laid in at the moment it was spoken), and captions.srt ("You:" / "Coach:") as a soft subtitle
track. Burned-in captions are left to the reel tools (this Mac's ffmpeg has no libass).
"""
import argparse, json, pathlib, subprocess, sys

def ms(p): return int(p.stem)

def srt_time(t):
    h, rem = divmod(int(t * 1000), 3_600_000); m, rem = divmod(rem, 60_000); s, milli = divmod(rem, 1000)
    return f"{h:02}:{m:02}:{s:02},{milli:03}"

def captions(events, end):
    talk = [e for e in events if e["kind"] in ("heard", "said")]
    out = []
    for i, e in enumerate(talk):
        start = e["t"] - (1.2 if e["kind"] == "heard" else 0)   # "heard" is stamped when speech ended
        stop = min(talk[i + 1]["t"] if i + 1 < len(talk) else end, start + 6)
        who = "You" if e["kind"] == "heard" else "Coach"
        out.append(f"{len(out) + 1}\n{srt_time(max(start, 0))} --> {srt_time(max(stop, start + 0.8))}\n{who}: {e['text']}\n")
    return "\n".join(out)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", type=pathlib.Path)
    ap.add_argument("--out", type=pathlib.Path)
    a = ap.parse_args()
    d = a.folder
    out = (a.out or d / "pov.mp4").resolve()
    frames = sorted((d / "frames").glob("*.jpg"), key=ms)
    if not frames: sys.exit("no frames in " + str(d / "frames"))
    events = [json.loads(l) for l in (d / "events.jsonl").read_text().splitlines() if l.strip()]
    end = max(ms(frames[-1]) / 1000 + 0.5, max((e["t"] for e in events), default=0) + 4)

    # Frames at their real times: the concat demuxer with each frame's duration until the next.
    lst = d / "frames.txt"
    with lst.open("w") as f:
        f.write(f"file '{frames[0].resolve()}'\nduration {ms(frames[0]) / 1000:.3f}\n")   # hold the first from t=0
        for cur, nxt in zip(frames, frames[1:] + [None]):
            dur = (ms(nxt) - ms(cur)) / 1000 if nxt else end - ms(cur) / 1000
            f.write(f"file '{cur.resolve()}'\nduration {max(dur, 0.001):.3f}\n")
        f.write(f"file '{frames[-1].resolve()}'\n")

    # Audio: the mic, with each coach line delayed to when it was spoken. Input 0 is the video, so audio
    # inputs are numbered from 1.
    said = sorted((d / "said").glob("*.caf"), key=ms)
    mic = d / "mic.caf"
    tracks = ([(mic, 0)] if mic.exists() else []) + [(s, ms(s)) for s in said]
    srt = d / "captions.srt"
    srt.write_text(captions(events, end))

    vf = "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30"
    fc = [f"[0:v]{vf}[v]"]
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst)]
    for n, (path, delay) in enumerate(tracks, start=1):
        cmd += ["-i", str(path)]
        fc.append(f"[{n}:a]aresample=48000,adelay={delay}|{delay}[a{n}]")
    if tracks:
        fc.append("".join(f"[a{n}]" for n in range(1, len(tracks) + 1)) + f"amix=inputs={len(tracks)}:normalize=0[aout]")
    cmd += ["-i", str(srt)]   # soft subtitle track
    cmd += ["-filter_complex", ";".join(fc), "-map", "[v]"]
    if tracks: cmd += ["-map", "[aout]", "-c:a", "aac"]
    cmd += ["-map", f"{len(tracks) + 1}:s", "-c:s", "mov_text"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-t", f"{end:.2f}", str(out)]
    subprocess.run(cmd, check=True, cwd=d)
    print(f"{out}  ({len(frames)} frames, {len(said)} coach lines, {end:.1f} s) · captions: {srt}")

if __name__ == "__main__":
    main()
