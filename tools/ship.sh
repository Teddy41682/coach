#!/bin/bash
# Ships one round of a drill: the tests, the coach Worker, then the demo app on the first paired iPhone.
# Stops at the first failure. Usage: tools/ship.sh   (run outside any sandbox: wrangler, xcodebuild, devicectl)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DERIVED="$HOME/Library/Developer/Xcode/DerivedData/coachdemo-drill"

echo "== tests"
(cd "$ROOT/worker" && npx tsc --noEmit && npx vitest run --reporter=dot | tail -3)
(cd "$ROOT/ios/CoachKit" && swift test 2>&1 | grep -E "Test run|✘" | tail -5; exit "${PIPESTATUS[0]}")

echo "== worker"
(cd "$ROOT/worker" && npx wrangler deploy 2>&1 | grep -E "Version ID|ERROR")

echo "== phone"
UDID="$(xcrun devicectl list devices --json-output /dev/stdout --quiet 2>/dev/null | python3 -c '
import json, sys
for d in json.load(sys.stdin)["result"]["devices"]:
    if d["hardwareProperties"].get("deviceType") == "iPhone":
        print(d["hardwareProperties"]["udid"], d["identifier"]); break')"
read -r HW CORE <<<"$UDID"
[ -n "${HW:-}" ] || { echo "no paired iPhone"; exit 1; }
(cd "$ROOT/ios/Demo" && xcodebuild -project CoachDemo.xcodeproj -scheme CoachDemo -configuration Debug \
  -destination "id=$HW" -allowProvisioningUpdates -derivedDataPath "$DERIVED" -quiet build)
xcrun devicectl device install app --device "$CORE" "$DERIVED/Build/Products/Debug-iphoneos/CoachDemo.app" --quiet
echo "== shipped: $(git -C "$ROOT" log --oneline -1)"
