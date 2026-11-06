#!/usr/bin/env bash
# Runs the committed Unity lane's EditMode tests (fixture seam + I1..I15 interaction coverage).
# Requires an activated Unity 6000.5.3f1 Editor; override with UNITY_EDITOR.
# Python 3's standard XML parser validates the complete test receipt.
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

python3 - "$results" "$status" "$log" <<'PY'
import re
import sys
import xml.etree.ElementTree as ET

results, editor_status, log = sys.argv[1:]

def fail(reason):
    print(f"EditMode lane FAILED: {reason}. Log: {log} Results: {results}", file=sys.stderr)
    sys.exit(1)

if int(editor_status) != 0:
    fail(f"Unity Editor exited {editor_status}")
try:
    run = ET.parse(results).getroot()
except (ET.ParseError, OSError) as error:
    fail(f"invalid XML receipt: {error}")
if run.tag != "test-run":
    fail("receipt root must be test-run")

counts = {}
for field in ("total", "passed", "failed", "skipped", "inconclusive"):
    value = run.get(field)
    if value is None or re.fullmatch(r"[0-9]+", value) is None:
        fail(f"missing or invalid {field} counter")
    counts[field] = int(value)

if run.get("result") != "Passed":
    fail(f"receipt result is {run.get('result', 'missing')}")
if counts["passed"] == 0 or counts["total"] != counts["passed"]:
    fail("total must equal a nonzero passed count")
if any(counts[field] != 0 for field in ("failed", "skipped", "inconclusive")):
    fail(f"failed/skipped/inconclusive counts must be zero: {counts}")
print(f"EditMode lane passed: {counts['passed']} tests, 0 failures, 0 skipped, 0 inconclusive.")
PY
