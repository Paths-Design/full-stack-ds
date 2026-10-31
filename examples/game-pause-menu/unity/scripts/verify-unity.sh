#!/usr/bin/env bash
# Runs the committed Unity lane's EditMode tests (fixture seam + I1..I15 interaction coverage).
# Requires an activated Unity 6000.5.3f1 Editor; override with UNITY_EDITOR.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
lane="$(cd "$here/.." && pwd)"
editor="${UNITY_EDITOR:-/Applications/Unity/Hub/Editor/6000.5.3f1/Unity.app/Contents/MacOS/Unity}"
evidence="${FSDS_PAUSE_EVIDENCE:-$lane/evidence}"
mkdir -p "$evidence"
results="$evidence/editmode-results.xml"
log="$evidence/editmode.log"
rm -f "$results"

echo "Unity lane:  $lane"
echo "Editor:      $editor"
echo "Evidence:    $evidence"

if [[ ! -x "$editor" ]]; then
    echo "Unity Editor not found at $editor (set UNITY_EDITOR)." >&2
    exit 2
fi

set +e
"$editor" -batchmode -projectPath "$lane" -runTests -testPlatform EditMode \
    -testResults "$results" -logFile "$log"
status=$?
set -e

if [[ ! -f "$results" ]]; then
    echo "Unity produced no test results (exit $status). Inspect $log" >&2
    exit 1
fi

summary="$(grep -o '<test-run[^>]*>' "$results" | head -n 1)"
echo "$summary"
passed="$(sed -n 's/.*passed="\([0-9]*\)".*/\1/p' <<<"$summary" | head -n 1)"
failed="$(sed -n 's/.*failed="\([0-9]*\)".*/\1/p' <<<"$summary" | head -n 1)"
results_attr="$(sed -n 's/.*result="\([A-Za-z]*\)".*/\1/p' <<<"$summary" | head -n 1)"

if [[ "$status" -ne 0 || "$results_attr" != "Passed" || "${passed:-0}" -eq 0 || "${failed:-0}" -ne 0 ]]; then
    echo "EditMode lane FAILED (exit $status, result=${results_attr:-unknown}, passed=${passed:-0}, failed=${failed:-0})." >&2
    echo "Log: $log  Results: $results" >&2
    exit 1
fi
echo "EditMode lane passed: ${passed} tests, ${failed} failures, result=${results_attr}."
