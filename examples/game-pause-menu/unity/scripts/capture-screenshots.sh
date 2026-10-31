#!/usr/bin/env bash
# Builds the committed Unity scene as a standalone macOS Player, drives the capture states
# declared in fixtures/parity-layout.json and writes 1280x800 PNGs plus result.json into evidence/.
# Requires an activated Unity 6000.5.3f1 Editor; override with UNITY_EDITOR.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
lane="$(cd "$here/.." && pwd)"
editor="${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.5.3f1/Unity.app/Contents/MacOS/Unity}"
evidence="${FSDS_PAUSE_EVIDENCE:-$lane/evidence}"
mkdir -p "$evidence"
app="$evidence/OrionN5PauseMenu.app"
build_log="$evidence/build.log"
player_log="$evidence/player.log"
run_id="$(uuidgen)"

if [[ ! -x "$editor" ]]; then
    echo "Unity Editor not found at $editor (set UNITY_EDITOR)." >&2
    exit 2
fi

rm -rf "$app"
rm -f "$evidence/map.png" "$evidence/map-popover.png" "$evidence/progress.png" \
      "$evidence/abilities.png" "$evidence/abilities-hover.png" "$evidence/settings.png" \
      "$evidence/settings-remap-modal.png" "$evidence/settings-subtitle.png" "$evidence/result.json"

echo "Building Player: $app"
FSDS_PAUSE_APP="$app" "$editor" -batchmode -quit -projectPath "$lane" \
    -executeMethod GamePauseMenu.Editor.PauseMenuBuild.BuildPlayer -logFile "$build_log"

executable="$(find "$app/Contents/MacOS" -type f -perm +111 | head -n 1)"
if [[ -z "$executable" ]]; then
    echo "Player executable not found under $app (inspect $build_log)." >&2
    exit 1
fi

echo "Running Player: $executable"
set +e
FSDS_PAUSE_EVIDENCE="$evidence" FSDS_PAUSE_RUN="$run_id" "$executable" \
    -screen-fullscreen 0 -screen-width 1280 -screen-height 800 -logFile "$player_log"
status=$?
set -e

for capture in map map-popover progress abilities abilities-hover settings settings-remap-modal settings-subtitle; do
    if [[ ! -s "$evidence/$capture.png" ]]; then
        echo "Missing capture $evidence/$capture.png (player exit $status; inspect $player_log)." >&2
        exit 1
    fi
done
if [[ ! -f "$evidence/result.json" ]]; then
    echo "Missing receipt $evidence/result.json (player exit $status; inspect $player_log)." >&2
    exit 1
fi
if ! grep -q '"passed": true' "$evidence/result.json"; then
    echo "Player witness reported failure (inspect $evidence/result.json)." >&2
    exit 1
fi

echo "Capture witnesses:"
for capture in map map-popover progress abilities abilities-hover settings settings-remap-modal settings-subtitle; do
    echo "  $evidence/$capture.png ($(stat -f%z "$evidence/$capture.png") bytes)"
done
echo "Receipt: $evidence/result.json"
