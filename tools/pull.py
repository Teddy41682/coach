#!/usr/bin/env python3
"""Pull new coach recordings off the phone into ~/coach-recordings/<stamp>/ — from J'habite (every coached cook is
recorded) and from the demo app. Recordings already on the Mac are skipped.

Usage: python3 tools/pull.py [--device <name or id>]   (default: the first paired iPhone)
Needs the phone unlocked and on the same network or cable; run outside any sandbox (devicectl).
"""
import argparse, json, pathlib, subprocess, sys, tempfile

APPS = {"co.jhabite.app": "jhabite", "co.jhabite.coachdemo": "demo"}
DEST = pathlib.Path.home() / "coach-recordings"


def devicectl(*args, timeout=600):
    with tempfile.NamedTemporaryFile(suffix=".json") as out:
        subprocess.run(["xcrun", "devicectl", *args, "--json-output", out.name, "--quiet"],
                       check=True, timeout=timeout, capture_output=True)
        return json.load(open(out.name))["result"]


def iphone(wanted):
    for d in devicectl("list", "devices")["devices"]:
        name, ident = d["deviceProperties"]["name"], d["identifier"]
        if wanted in (name, ident) or (not wanted and d["hardwareProperties"].get("deviceType") == "iPhone"):
            return ident
    sys.exit(f"no iPhone {wanted or ''} paired")


def stamps(device, bundle):
    try:
        files = devicectl("device", "info", "files", "--device", device, "--domain-type", "appDataContainer",
                          "--domain-identifier", bundle, "--subdirectory", "Documents/Recordings")["files"]
    except subprocess.CalledProcessError:
        return []   # not installed, or nothing recorded yet
    return sorted({f["relativePath"].split("/")[0] for f in files if f.get("relativePath")})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--device")
    device = iphone(ap.parse_args().device)
    DEST.mkdir(exist_ok=True)
    for bundle, app in APPS.items():
        for stamp in stamps(device, bundle):
            if (DEST / stamp).exists():
                continue
            print(f"{app}: {stamp}", flush=True)
            devicectl("device", "copy", "from", "--device", device, "--domain-type", "appDataContainer",
                      "--domain-identifier", bundle, "--source", f"Documents/Recordings/{stamp}",
                      "--destination", str(DEST / stamp))


if __name__ == "__main__":
    main()
