#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 10,19,27
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
#
# CAWS-GOAL-AC-STOP-GATE-01 — hold a session to its bound spec's acceptance criteria.
#
# Opt-in. With no goal binding for this session the handler is a no-op and the
# stop chain behaves exactly as it did before this feature existed.
#
# When `caws goal set <spec-id>` has written a binding, this handler re-derives
# that spec's acceptance evidence with `caws specs verify-acs --json` and emits a
# {"decision":"block"} control decision while any criterion is unmet, so the
# session keeps working instead of stopping on an unproven claim.
#
# Why this and not the native /goal evaluator: that evaluator READS a rendering
# of a check in the transcript. This handler EXECUTES the check and reads its
# real exit status. The two can agree; only this one can be the authority.
#
# "Met" means verdict == verified. A not_rederived criterion is NOT a pass —
# narrative-only evidence is exactly what this gate exists to refuse.
#
# The gate never writes evidence: `caws specs evidence` remains the single
# writer of acceptance truth. It only ever reads verify-acs and writes its own
# block counter to a sidecar next to the binding.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh" 2>/dev/null || exit 0
# shellcheck source=lib/agent-surface.sh
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true

# `|| true`, not the pack's usual `|| exit 0`. Today those are identical: every
# return inside parse_hook_input is `return 0`, so the other handlers' `|| exit 0`
# is unreachable (parse-input.sh's one non-zero return is a file-level sourcing
# guard, already caught by the `source ... || exit 0` above). Mutation testing
# confirms it -- swapping this line back changes no test. The difference only
# appears if parse_hook_input ever gains a failure path: for an advisory handler
# exiting then is right; for the one handler whose job is to refuse, it would put
# an off-switch upstream of every fail-closed path below. Keep refusal reachable.
parse_hook_input >/dev/null 2>&1 || true

# THIS is the line that keeps the gate alive on a host with no working python3,
# and it is a different mechanism from the one above.
#
# parse_hook_input extracts HOOK_SESSION_ID with python3, and reports a failed
# extraction as the literal "unknown" rather than as an error. Treating
# "unknown" as "no identity, stay inert" is right for a genuinely unidentified
# session -- but it would also silently disable the gate for a merely broken
# interpreter, BEFORE any of the fail-closed paths below could run.
#
# The gate needs exactly one field, and the surface exports it too, so resolve
# it independently. Still inert when no source has an id: no identity really
# does mean there is no binding to enforce. (A3)
HOOK_SESSION_ID="${HOOK_SESSION_ID:-}"
if [[ -z "$HOOK_SESSION_ID" || "$HOOK_SESSION_ID" == "unknown" ]]; then
  HOOK_SESSION_ID="${CLAUDE_CODE_SESSION_ID:-${CAWS_SESSION_ID:-}}"
fi

# A1/A5 bound: after this many consecutive blocks with an unchanged unmet set,
# the gate degrades to a warning. A goal must never trap a session.
GOAL_MAX_CONSECUTIVE_BLOCKS_DEFAULT=3
GOAL_MAX_CONSECUTIVE_BLOCKS="${CAWS_GOAL_MAX_CONSECUTIVE_BLOCKS:-$GOAL_MAX_CONSECUTIVE_BLOCKS_DEFAULT}"

# Validate before ANY arithmetic. `(( COUNT > $notanumber ))` under `set -u` is
# not a comparison that returns false -- bash resolves the bare word as a
# variable name, finds it unset, and a non-interactive shell EXITS. That would
# kill this handler before it could emit anything, silently releasing the stop:
# a misconfigured budget would disable the gate in the fail-OPEN direction,
# which is the one direction a guard must never fail.
if ! [[ "$GOAL_MAX_CONSECUTIVE_BLOCKS" =~ ^[0-9]+$ ]] || [[ "$GOAL_MAX_CONSECUTIVE_BLOCKS" == "0" ]]; then
  printf 'CAWS goal-ac-gate: CAWS_GOAL_MAX_CONSECUTIVE_BLOCKS=%s is not a positive integer; falling back to %s. The gate stays ACTIVE.\n' \
    "$GOAL_MAX_CONSECUTIVE_BLOCKS" "$GOAL_MAX_CONSECUTIVE_BLOCKS_DEFAULT" >&2
  GOAL_MAX_CONSECUTIVE_BLOCKS="$GOAL_MAX_CONSECUTIVE_BLOCKS_DEFAULT"
fi

ESCAPE_HINT='Clear it with: caws goal clear'

# No session identity -> no binding can be resolved -> inert. (A3)
if [[ -z "${HOOK_SESSION_ID:-}" || "$HOOK_SESSION_ID" == "unknown" ]]; then
  exit 0
fi

PROJECT_DIR="${CAWS_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

# Session state is CANONICAL-only, so the binding must be looked up there and
# not under PROJECT_DIR.
#
# agent-surface.sh resolves CAWS_PROJECT_DIR with `git rev-parse
# --show-toplevel`, which inside a linked worktree returns the WORKTREE root.
# That tree has its own `.caws/`, and its `sessions/` is empty -- every session
# dir is written to the canonical checkout. Looking for the binding under the
# worktree therefore finds nothing and the gate goes inert down the A3
# no-binding path: not an error, no diagnostic, just a goal that silently
# stops enforcing for exactly the multi-agent case CAWS is built around.
#
# `--git-common-dir` is the one that points at canonical from either place (it
# is `<canonical>/.git` in a worktree and in the main checkout alike), so its
# parent is the canonical root in both. Fall back to PROJECT_DIR when git
# cannot answer, which is also what makes the bats fixture (a plain repo, where
# the two roots coincide) exercise the same code path.
SESSIONS_ROOT="$PROJECT_DIR"
_goal_common_dir="$(cd "$PROJECT_DIR" 2>/dev/null && git rev-parse --git-common-dir 2>/dev/null || true)"
if [[ -n "$_goal_common_dir" ]]; then
  # --git-common-dir may be relative to PROJECT_DIR; resolve from there.
  _goal_canonical="$(cd "$PROJECT_DIR" 2>/dev/null && cd "$_goal_common_dir/.." 2>/dev/null && pwd || true)"
  [[ -n "$_goal_canonical" ]] && SESSIONS_ROOT="$_goal_canonical"
fi
unset _goal_common_dir _goal_canonical

BINDING_FILE="$SESSIONS_ROOT/.caws/sessions/$HOOK_SESSION_ID/goal.json"

# The opt-in switch. No binding -> byte-identical to the pre-feature chain. (A3)
[[ -f "$BINDING_FILE" ]] || exit 0

# Bash-only JSON string escaper. Our reason strings are built here and never
# contain raw control characters, so escaping backslash and double-quote is
# sufficient to produce a valid JSON string body.
_goal_json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  printf '%s' "$s"
}

# Bounded block. $1 = a key identifying WHY we are blocking; $2 = reason text.
#
# Every block path must go through here. A block that does not increment a
# bounded counter can repeat forever, and "a goal can never trap a session" is
# an invariant of this gate -- it has to hold for gate FAILURES too, not just
# for unmet criteria. A persistently broken verify-acs is exactly the case
# where an unbounded refusal would strand the session with no in-band exit.
#
# The counter lives in a plain-text sidecar and is maintained with pure bash so
# that bounding still works when python3 is unavailable or broken. The key is
# hashed to a filename-safe token; a CHANGED key restarts the budget, so real
# progress (a different unmet set) is never punished.
COUNT_FILE="${BINDING_FILE%/goal.json}/goal-blocks"
_goal_bounded_block() {
  local key="$1" reason="$2" prev_key="" n=0
  # The sidecar is one TAB-separated line, so a tab or newline inside the key
  # would desynchronize the parse on the next stop and silently reset the budget
  # every time -- an unbounded block wearing a bounded one's clothes. An AC
  # `reason` is free text from the spec and can contain either.
  key="${key//$'\t'/ }"
  key="${key//$'\n'/ }"
  if [[ -n "$COUNT_FILE" && -f "$COUNT_FILE" ]]; then
    IFS=$'\t' read -r prev_key n < "$COUNT_FILE" 2>/dev/null || { prev_key=""; n=0; }
    [[ "$n" =~ ^[0-9]+$ ]] || n=0
  fi
  if [[ "$prev_key" == "$key" ]]; then
    n=$(( n + 1 ))
  else
    n=1
  fi
  [[ -n "$COUNT_FILE" ]] && printf '%s\t%s\n' "$key" "$n" > "$COUNT_FILE" 2>/dev/null

  if (( n > GOAL_MAX_CONSECUTIVE_BLOCKS )); then
    printf 'CAWS goal-ac-gate: still blocking after %d consecutive stops with no change - releasing the stop rather than trapping the session.\n  Reason: %s\n  %s\n' \
      "$GOAL_MAX_CONSECUTIVE_BLOCKS" "$reason" "$ESCAPE_HINT" >&2
    return 1
  fi
  emit_block "$reason Block $n of $GOAL_MAX_CONSECUTIVE_BLOCKS before this gate releases the stop."
  return 0
}

emit_block() {
  # $1 = reason text (already free of raw newlines).
  # Compact separators so the emitted decision is byte-identical in shape to
  # every other guard in this pack ({"decision":"block",...}); anything that
  # greps for that literal must match this handler too.
  #
  # The bash fallback is load-bearing, not belt-and-braces: python3 can be
  # PRESENT but non-functional (broken venv, missing stdlib, wrong arch). If
  # emit_block depended on it alone, that case would produce no stdout at all
  # and silently release the stop -- a guard failing open through its own
  # error path. Blocking must not depend on the thing that might be broken.
  if python3 -c 'import json,sys; print(json.dumps({"decision":"block","reason":sys.argv[1]},separators=(",",":"),ensure_ascii=False))' "$1" 2>/dev/null; then
    return 0
  fi
  printf '{"decision":"block","reason":"%s"}\n' "$(_goal_json_escape "$1")"
}

# A missing interpreter is an operator problem, but "cannot evaluate" is never a
# pass: the gate refuses rather than waving the stop through. It is safe to fail
# CLOSED here precisely because the refusal is bounded and the counter above is
# pure bash -- the session gets a loud, actionable message for a few stops and
# is then released, so a broken environment degrades instead of trapping.
if ! command -v python3 >/dev/null 2>&1; then
  _goal_bounded_block "no-python3" \
    "CAWS goal-ac-gate: python3 was not found, so this session's acceptance gate cannot evaluate its bound spec. Not evaluating is not the same as passing, so the stop is refused. Install python3 in the hook environment, or release the session with: caws goal clear."
  exit 0
fi

SPEC_ID="$(python3 -c '
import json,sys
try:
    with open(sys.argv[1]) as f: b=json.load(f)
except Exception: sys.exit(0)
v=b.get("spec_id")
if isinstance(v,str): print(v.strip())
' "$BINDING_FILE" 2>/dev/null)"

if [[ -z "$SPEC_ID" ]]; then
  _goal_bounded_block "no-spec-id" \
    "CAWS goal-ac-gate: the goal binding at .caws/sessions/$HOOK_SESSION_ID/goal.json is unreadable or names no spec_id, so the acceptance bar for this session cannot be determined. Re-set it with: caws goal set <spec-id>. $ESCAPE_HINT"
  exit 0
fi

CAWS_BIN="${CAWS_BIN:-caws}"
if ! command -v "$CAWS_BIN" >/dev/null 2>&1; then
  _goal_bounded_block "no-caws-bin" \
    "CAWS goal-ac-gate: '$CAWS_BIN' is not on PATH, so the acceptance criteria of $SPEC_ID cannot be re-derived. Not evaluating is not the same as passing, so the stop is refused. Put the caws CLI on PATH (or set CAWS_BIN), or release the session with: caws goal clear."
  exit 0
fi

REPORT="$("$CAWS_BIN" specs verify-acs "$SPEC_ID" --json 2>/dev/null)"
VERIFY_STATUS=$?

# A4: verify-acs could not produce a report at all (missing spec, malformed
# YAML, crash). Block and name the failure — never pass the stop silently on an
# unreadable gate.
if [[ -z "$REPORT" ]]; then
  _goal_bounded_block "no-report" \
    "CAWS goal-ac-gate: 'caws specs verify-acs $SPEC_ID --json' produced no report (exit $VERIFY_STATUS), so the acceptance bar for $SPEC_ID cannot be re-derived. This is a gate failure, not a pass. Investigate, then retry. $ESCAPE_HINT"
  exit 0
fi

# Single python pass: classify criteria and emit "<digest>\t<unmet summary>".
SUMMARY="$(printf '%s' "$REPORT" | python3 -c '
import json,sys
try:
    r=json.load(sys.stdin)
except Exception:
    print("PARSE_ERROR\t"); sys.exit(0)
crit=r.get("criteria")
if not isinstance(crit,list) or not crit:
    print("NO_CRITERIA\t"); sys.exit(0)
unmet=[]
for c in crit:
    if not isinstance(c,dict): continue
    cid=str(c.get("id","?"))
    verdict=str(c.get("verdict","unknown"))
    # verified is the ONLY pass. not_rederived is narrative-only: not proof.
    if verdict!="verified":
        reason=str(c.get("reason") or "")
        unmet.append(cid+"="+verdict+("("+reason+")" if reason else ""))
if not unmet:
    print("MET\t"); sys.exit(0)
print("UNMET\t"+", ".join(unmet))
' 2>/dev/null)"

STATE="${SUMMARY%%$'\t'*}"
UNMET_LIST="${SUMMARY#*$'\t'}"

if [[ "$STATE" == "PARSE_ERROR" || "$STATE" == "NO_CRITERIA" ]]; then
  _goal_bounded_block "bad-report-$STATE" \
    "CAWS goal-ac-gate: the verify-acs report for $SPEC_ID was unreadable or declared no criteria ($STATE), so the acceptance bar cannot be evaluated. This is a gate failure, not a pass. $ESCAPE_HINT"
  exit 0
fi

# A4: anything that is not one of the four states the classifier can emit means
# the classifier itself failed (interpreter died, SIGPIPE, truncated output).
# Dispatch on it EXPLICITLY. Falling through to the unmet branch would render a
# gate failure as a legitimate "criteria not met" verdict with an empty criteria
# list, and -- worse -- would spend the A5 budget on it, releasing the session
# after N stops as though the bar had been fairly tested and missed.
if [[ "$STATE" != "MET" && "$STATE" != "UNMET" ]]; then
  _goal_bounded_block "classifier-failed" \
    "CAWS goal-ac-gate: the acceptance classifier produced no usable verdict for $SPEC_ID (state='$STATE'), so the criteria were never evaluated. This is a gate failure, not an unmet-criteria result and not a pass. Check that python3 can run in the hook environment. $ESCAPE_HINT"
  exit 0
fi

# A2: every criterion verified -> the goal is met. Clear the counter so a later
# regression starts from a full budget rather than a spent one, and stay silent.
if [[ "$STATE" == "MET" ]]; then
  rm -f "$COUNT_FILE" 2>/dev/null
  exit 0
fi

# A1/A5: unmet. The key IS the unmet set, so the budget only accumulates while
# nothing changes — recording new evidence changes the key and restarts the
# count, and real progress is never punished for taking more than N stops.
_goal_bounded_block "unmet:$UNMET_LIST" \
  "CAWS goal-ac-gate: goal for $SPEC_ID is not met — $UNMET_LIST. Only verdict=verified counts as met; not_rederived is narrative-only evidence, not proof. Record real proof with 'caws specs evidence' (cite a commit_sha/test_nodeid, then re-derive with 'caws specs verify-acs $SPEC_ID'). $ESCAPE_HINT"
exit 0
