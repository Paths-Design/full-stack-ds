#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,16
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# Shared hook input parser for CAWS hooks.
#
# Handlers source this file and call `parse_hook_input` to get HOOK_* env
# vars populated from the tool-call payload. This replaces the per-handler
# pattern of `INPUT=$(read_hook_input_json)` followed by 3-5 `jq` calls.
#
# Two invocation modes:
#   1. Standalone handler (legacy): reads stdin via read_hook_input_json,
#      parses, exports HOOK_*.
#   2. Via dispatcher (planned Phase 2): HOOK_INPUT_JSON already exported
#      by the router; parse_hook_input just re-extracts scalar fields.
#
# Why one shared parser: before this lib, each of 17 handlers independently
# ran read_hook_input_json + 3-5 jq calls on the same payload. A bug in the
# parser (like the control-char failure fixed in runtime-paths.sh) ripples
# to every handler. One parser, one bug surface, one fix.
#
# Idempotent source: safe to source multiple times.

if [[ -n "${_HOOK_PARSE_INPUT_LOADED:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi
_HOOK_PARSE_INPUT_LOADED=1

# CAWS-DEFECT-HOOK-PAYLOAD-ENV-E2BIG-01. Largest payload (bytes) that may be
# exported into the environment. Everything about a payload is serialized at
# least twice on the way to a handler (the sanitized JSON plus the per-field
# TOOL_*_JSON strings), so the inline ceiling is set well below any platform
# argument-list limit rather than near it. Override with
# CAWS_HOOK_INLINE_PAYLOAD_MAX_BYTES for a harness whose environment is already
# crowded; set it to 0 to force file transport for every payload.
_hook_payload_transport() {
  local max="${CAWS_HOOK_INLINE_PAYLOAD_MAX_BYTES:-131072}"
  [[ "$max" =~ ^[0-9]+$ ]] || max=131072
  local bytes
  bytes=$(LC_ALL=C printf '%s' "${HOOK_INPUT_JSON:-}" | wc -c | tr -d ' ')
  [[ "$bytes" =~ ^[0-9]+$ ]] || bytes=0
  if (( bytes >= max )); then
    HOOK_PAYLOAD_TRUNCATED=1
  else
    HOOK_PAYLOAD_TRUNCATED=0
  fi

  # Remove the file a previous parse in this process left behind, so no handler
  # can resolve a path whose content no longer matches this payload.
  if [[ -n "${HOOK_PAYLOAD_FILE:-}" && -f "${HOOK_PAYLOAD_FILE:-}" ]]; then
    rm -f "$HOOK_PAYLOAD_FILE" 2>/dev/null || true
  fi
  HOOK_PAYLOAD_FILE=""
  export HOOK_PAYLOAD_TRUNCATED HOOK_PAYLOAD_FILE
}

# _write_payload_file <payload>
# Writes the full payload to a dispatch-scoped file and exports its path.
# Fails open: if no safe temp directory is available the payload stays inline
# for this dispatch (a bounded overshoot) rather than dropping the bytes or
# blocking the tool call. Only whole payloads are ever written; no handler can
# observe a truncated file presented as complete.
# Registered in CAWS_TEMP_FILES so a dispatcher that sources
# runtime-paths.sh removes it on exit.
_write_payload_file() {
  local payload="${1:-}"
  local dir="${TMPDIR:-/tmp}"
  local file
  file=$(mktemp "${dir%/}/caws-hook-payload-XXXXXX" 2>/dev/null) || {
    export HOOK_INPUT_JSON
    HOOK_PAYLOAD_TRUNCATED=0
    export HOOK_PAYLOAD_TRUNCATED
    return 0
  }
  if printf '%s' "$payload" > "$file" 2>/dev/null; then
    HOOK_PAYLOAD_FILE="$file"
    if [[ -n "${CAWS_TEMP_FILES+x}" ]]; then
      CAWS_TEMP_FILES+=("$file")
    else
      CAWS_TEMP_FILES=("$file")
    fi
    # Dispatch-scoped cleanup. parse_hook_input runs once per dispatch, so this
    # traps the oldest payload reference if a dispatch is ever reused; the file
    # still outlives every handler for the dispatch that created it.
    trap 'rm -f "$HOOK_PAYLOAD_FILE" 2>/dev/null || true' EXIT 2>/dev/null || true
    export HOOK_PAYLOAD_FILE
  else
    rm -f "$file" 2>/dev/null || true
    export HOOK_INPUT_JSON
    HOOK_PAYLOAD_TRUNCATED=0
    export HOOK_PAYLOAD_TRUNCATED
  fi
  return 0
}

_hook_lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../runtime-paths.sh
source "$_hook_lib_dir/../runtime-paths.sh"

_hook_extract_scalar_fields() {
  python3 -c '
import json
import shlex
import sys

try:
    data = json.loads(sys.stdin.read() or "{}")
except Exception:
    data = {}
if not isinstance(data, dict):
    data = {}

tool_input = data.get("tool_input")
if not isinstance(tool_input, dict):
    tool_input = {}

tool_response = data.get("tool_response")
if not isinstance(tool_response, dict):
    tool_response = {}

fields = {
    "HOOK_TOOL_NAME": data.get("tool_name") or "",
    "HOOK_FILE_PATH": tool_input.get("file_path") or "",
    "HOOK_COMMAND": tool_input.get("command") or "",
    "HOOK_CWD": data.get("cwd") or "",
    "HOOK_SESSION_ID": data.get("session_id") or "unknown",
    "HOOK_TRANSCRIPT_PATH": data.get("transcript_path") or "",
    "HOOK_EVENT_NAME": data.get("hook_event_name") or "",
    "HOOK_MODEL": data.get("model") or "",
    "HOOK_SOURCE": data.get("source") or "",
    "HOOK_PERMISSION_MODE": data.get("permission_mode") or "default",
    "HOOK_TOOL_USE_ID": data.get("tool_use_id") or "",
    "HOOK_STOP_HOOK_ACTIVE": "1" if data.get("stop_hook_active") else "0",
    # Whole objects as JSON strings -- consumed by audit.sh for log payloads.
    # Always valid JSON ("{}" at minimum) so `jq --argjson` works without
    # a defensive check in every caller.
    "HOOK_TOOL_INPUT_JSON": json.dumps(tool_input),
    "HOOK_TOOL_RESPONSE_JSON": json.dumps(tool_response),
}
for k, v in fields.items():
    print(f"{k}={shlex.quote(str(v))}")
' 2>/dev/null || true
}

parse_hook_input() {
  # Fast path: the dispatcher already parsed the input and exported
  # HOOK_* env vars to the handler's environment. Re-extracting from
  # HOOK_INPUT_JSON would be a wasted python subprocess. HOOK_TOOL_NAME
  # is the canonical "parse completed" marker -- after a completed parse
  # it's always defined (possibly empty for malformed input), so the
  # `${HOOK_TOOL_NAME+set}` test distinguishes "parser ran" from
  # "handler invoked standalone and parser hasn't run yet".
  if [[ -n "${HOOK_TOOL_NAME+set}" ]]; then
    return 0
  fi

  # If HOOK_INPUT_JSON is set but HOOK_TOOL_NAME is not, a caller staged
  # the sanitized payload but didn't run the extractor. Extract now.
  # Otherwise (standalone handler), read stdin via the sanitizer.
  if [[ -z "${HOOK_INPUT_JSON:-}" ]]; then
    HOOK_INPUT_JSON="$(read_hook_input_json)"
  fi

  # CAWS-DEFECT-HOOK-PAYLOAD-ENV-E2BIG-01: bound the bytes that reach the
  # process environment. The payload used to be exported unconditionally, so a
  # multi-megabyte tool response (a base64 image, a large command dump) pushed
  # the environment past the kernel argument-list limit and every subsequent
  # fork in the dispatch chain died with `Argument list too long` -- surfacing
  # as `Required runtime library failed: session-id.sh`, because that is the
  # first fork, not the cause. The environment is a fixed-size kernel resource;
  # unbounded payload bytes belong in a file.
  #
  # Small payloads keep the historical inline representation (no consumer
  # changes). Payloads at or above the threshold move to a dispatch-scoped file:
  # the inline variables are NOT exported in that mode, so no reader can consume
  # a partial value as if it were the whole payload; HOOK_PAYLOAD_FILE is the
  # only path to the bytes, and HOOK_PAYLOAD_TRUNCATED=1 states that the inline
  # representation is absent by design rather than empty.
  _hook_payload_transport
  if [[ "${HOOK_PAYLOAD_TRUNCATED:-0}" == "1" ]]; then
    _write_payload_file "$HOOK_INPUT_JSON"
  else
    # Local-only staging for the extractor below. Never exported on this path:
    # the extractor reaches it through the pipeline, not through the
    # environment, and an exported copy would restore the E2BIG class for every
    # handler child this dispatch spawns.
    export -n HOOK_INPUT_JSON 2>/dev/null || true
  fi

  # Extract all common scalar fields in ONE python call, emitting
  # shlex-quoted bash assignments. Compared to 3-5 separate `jq` calls,
  # this is one subprocess per handler instead of many. Values are sh-safe
  # via shlex.quote, so `eval` is not a code-injection hazard.
  #
  # Input selection (CAWS-DEFECT-HOOK-PAYLOAD-ENV-E2BIG-01): a file-transported
  # payload reaches the extractor by stdin redirection, NOT as a shell variable
  # or an exported path. Passing the bytes as an argument would put them back
  # into the child process environment and reintroduce the exact E2BIG this fix
  # removes; the payload must never travel as an argv/env value, only as a
  # stream (inline pipe) or a path (file).
  local assignments
  if [[ "${HOOK_PAYLOAD_TRUNCATED:-0}" == "1" && -n "${HOOK_PAYLOAD_FILE:-}" ]]; then
    assignments=$(_hook_extract_scalar_fields < "$HOOK_PAYLOAD_FILE")
  else
    assignments=$(printf '%s' "$HOOK_INPUT_JSON" | _hook_extract_scalar_fields)
  fi

  # Fail-open: if the python subprocess failed for any reason, leave
  # HOOK_* vars unset/empty. Handlers will see empty tool_name and
  # short-circuit on their own matcher predicate. Guard infrastructure
  # must never block a tool call because its parser crashed.
  if [[ -n "$assignments" ]]; then
    eval "$assignments"
  fi

  # In file-transport mode the full tool input/response JSON is deliberately not
  # exported: those are the variables whose size was unbounded, and a reader that
  # needs them reads HOOK_PAYLOAD_FILE instead. They are exported as empty with
  # HOOK_PAYLOAD_TRUNCATED=1 so absence is explicit, never a partial value. The
  # scalar fields (name, path, command, cwd, ids) are always extracted from the
  # file and always exported -- a guard's matcher predicate must keep working.
  local _inline_tool_json=1
  [[ "${HOOK_PAYLOAD_TRUNCATED:-0}" == "1" ]] && _inline_tool_json=0
  export HOOK_TOOL_NAME="${HOOK_TOOL_NAME:-}" \
         HOOK_FILE_PATH="${HOOK_FILE_PATH:-}" \
         HOOK_COMMAND="${HOOK_COMMAND:-}" \
         HOOK_CWD="${HOOK_CWD:-}" \
         HOOK_SESSION_ID="${HOOK_SESSION_ID:-unknown}" \
         HOOK_TRANSCRIPT_PATH="${HOOK_TRANSCRIPT_PATH:-}" \
         HOOK_EVENT_NAME="${HOOK_EVENT_NAME:-}" \
         HOOK_MODEL="${HOOK_MODEL:-}" \
         HOOK_SOURCE="${HOOK_SOURCE:-}" \
         HOOK_PERMISSION_MODE="${HOOK_PERMISSION_MODE:-default}" \
         HOOK_TOOL_USE_ID="${HOOK_TOOL_USE_ID:-}" \
         HOOK_STOP_HOOK_ACTIVE="${HOOK_STOP_HOOK_ACTIVE:-0}"
  if (( _inline_tool_json )); then
    export HOOK_TOOL_INPUT_JSON="${HOOK_TOOL_INPUT_JSON:-{\}}" \
           HOOK_TOOL_RESPONSE_JSON="${HOOK_TOOL_RESPONSE_JSON:-{\}}"
  else
    HOOK_TOOL_INPUT_JSON=""
    HOOK_TOOL_RESPONSE_JSON=""
    export HOOK_TOOL_INPUT_JSON HOOK_TOOL_RESPONSE_JSON
  fi

  # CAWS-SESSION-ID-DURABLE-HOOK-ENVELOPE-001: write/refresh the
  # durable session envelope so agent-Bash CLI invocations (which
  # don't inherit HOOK_SESSION_ID) can recover the harness session id
  # via the on-disk bridge. Skipped when session id is missing/unknown
  # (the resolver refuses literal "unknown" anyway). Non-fatal on any
  # error — the hook must never block on this cache write.
  _write_durable_session_envelope
  # CAWS-AGENT-PID-SESSION-CORRELATION-001: write/refresh the agent-PID
  # correlation record so canonical-checkout CLI invocations (which carry no
  # session-id env var and resolve to an ambiguous envelope set) can recover
  # their session id keyed by their own agent process's PID. Sibling to the
  # envelope write; same non-fatal posture.
  _write_agent_pid_record
}

# CAWS-SESSION-ID-DURABLE-HOOK-ENVELOPE-001
# One writer serves shared and surface-specific parsers.
_caws_cache_lib="${CAWS_SHARED_LIB_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}/session-cache.sh"
source "$_caws_cache_lib" || return 2
unset _caws_cache_lib

# CAWS-AGENT-PID-SESSION-CORRELATION-001
# Write/refresh `<repo_root>/.caws/sessions/agent-pid-<agentPid>.json`.
# Called from parse_hook_input right after _write_durable_session_envelope.
# Idempotent; preserves created_at across refreshes; updates last_seen_at.
#
# This is the WRITE side of the agent-PID correlation bridge: the hook knows
# the session id (HOOK_SESSION_ID, from the payload) and can find the agent
# process PID (resolve_agent_pid_with_start, from lib/agent-pid.sh, matched
# against CAWS_AGENT_PROCESS_NAMES set by agent-surface.sh). The resolver READ
# side (lib/agent-pid.sh read_session_id_from_agent_pid, consumed by
# session-id.sh and resolve-session.ts) keys by the same PID — which the
# agent's own caws/Bash process shares as a stable ancestor.
#
# All failures are silently swallowed; hooks MUST NOT block on this cache.
# No-ops gracefully when: session id missing/unknown, agent-pid.sh is not
# sourced (resolve_agent_pid_with_start undefined), no agent ancestor is found
# (unknown surface — CAWS_AGENT_PROCESS_NAMES empty), or git is unavailable.
_write_agent_pid_record() {
  local sid="${HOOK_SESSION_ID:-}"
  if [[ -z "$sid" || "$sid" == "unknown" ]]; then
    return 0
  fi

  # The agent-PID resolver is in lib/agent-pid.sh, which may not be sourced by
  # every handler that calls parse_hook_input. Best-effort source from the
  # same lib dir as this file; a missing/unsourceable copy degrades to a
  # silent no-op (the envelope + caller-pointer bridges still cover the
  # env-var-carrying case).
  if ! declare -F resolve_agent_pid_with_start >/dev/null 2>&1; then
    local _self="${BASH_SOURCE[0]:-}"
    [[ -n "$_self" ]] && source "$(dirname "$_self")/agent-pid.sh" 2>/dev/null || true
  fi
  if ! declare -F resolve_agent_pid_with_start >/dev/null 2>&1; then
    return 0
  fi

  local names="${CAWS_AGENT_PROCESS_NAMES:-}"
  [[ -z "$names" ]] && return 0

  local agent_pid start_epoch
  # The read-group MUST tolerate EOF (CAWS-DEFECT-HOOK-AGENT-PID-FAILOPEN-01):
  # when no ancestor matches (bats/CI/plain terminal — names non-empty but no
  # agent process), the resolver prints nothing and the second read fails. An
  # unguarded failure here aborts the whole guard under `set -euo pipefail`
  # with exit 1 and zero output — the exact silent death this function's
  # "all failures silently swallowed" contract forbids.
  {
    read -r agent_pid
    read -r start_epoch
  } < <(resolve_agent_pid_with_start "$names") || true
  [[ -z "$agent_pid" ]] && return 0

  # Canonical repo root (same resolution as _write_durable_session_envelope).
  local cwd="${HOOK_CWD:-$PWD}"
  local repo_root common
  common=$(cd "$cwd" 2>/dev/null && git rev-parse --git-common-dir 2>/dev/null) || return 0
  [[ -z "$common" ]] && return 0
  case "$common" in
    /*) : ;;
    *)  common="$cwd/$common" ;;
  esac
  repo_root=$(cd "$common/.." 2>/dev/null && pwd -P) || return 0
  [[ -z "$repo_root" || ! -d "$repo_root/.caws" ]] && return 0

  local sessions_dir="$repo_root/.caws/sessions"
  local record_path="$sessions_dir/agent-pid-${agent_pid}.json"
  if [[ -L "$repo_root/.caws" || -L "$sessions_dir" || -L "$record_path" ]]; then
    printf '[caws session cache] unsafe PID record path; capture skipped\n' >&2
    return 0
  fi
  mkdir -p "$sessions_dir" 2>/dev/null || return 0

  # Preserve created_at across refreshes; update last_seen_at.
  local now created_at
  now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  created_at="$now"
  if [[ -f "$record_path" ]]; then
    local existing_created
    existing_created=$(python3 -c '
import json, sys
try:
    with open(sys.argv[1]) as f:
        d = json.load(f)
    v = d.get("created_at")
    if isinstance(v, str) and v:
        print(v)
except Exception:
    pass
' "$record_path" 2>/dev/null)
    if [[ -n "$existing_created" ]]; then
      created_at="$existing_created"
    fi
  fi

  local tmpfile="$sessions_dir/.agent-pid-${agent_pid}.tmp.$$"
  python3 -c '
import json, sys
payload = {
    "agent_pid": int(sys.argv[1]),
    "session_id": sys.argv[2],
    "surface": sys.argv[3],
    "repo_root": sys.argv[4],
    "created_at": sys.argv[5],
    "last_seen_at": sys.argv[6],
    "started_at": sys.argv[7] if sys.argv[7] else None,
}
with open(sys.argv[8], "w") as f:
    json.dump(payload, f)
    f.write("\n")
' "$agent_pid" "$sid" "${CAWS_PLATFORM_FLAG:-claude-code}" "$repo_root" \
    "$created_at" "$now" "${start_epoch:-}" "$tmpfile" 2>/dev/null || {
    rm -f "$tmpfile" 2>/dev/null
    return 0
  }
  mv -f "$tmpfile" "$record_path" 2>/dev/null || {
    rm -f "$tmpfile" 2>/dev/null
    return 0
  }
  _reap_stale_agent_pid_records "$sessions_dir"
  return 0
}

# CAWS-HOOKS-AGENT-PID-PROGRESSIVE-REAP-001
# Progressive age-based reap for .caws/sessions/agent-pid-*.json records.
# Called from _write_agent_pid_record, right after a successful write/refresh
# of THIS session's own record — so the record just written is always "now"
# and can never be swept by this same pass.
#
# Nothing else ever deletes these records (read_session_id_from_agent_pid
# treats a live-process match as authoritative regardless of age — see
# agent-pid.sh), so absent a reaper the directory grows by one file per
# distinct OS pid, forever. Real agent sessions here run days, rarely a
# week, so retention is tiered to that lifecycle rather than a single
# cliff-edge TTL:
#   < 3 days old:  never touched (the common case; costs nothing extra).
#   3-7 days old:  deleted ONLY if the recorded pid is confirmed dead
#                  (kill -0) — a still-live long session is left alone.
#   > 7 days old:  deleted unconditionally. No plausible caws session runs
#                  that long; this is a hard backstop against a wrong/stale
#                  liveness read (permission edge cases, clock skew), not
#                  the common path. Losing a record here only degrades the
#                  resolver to its next fallback tier (envelope/capsule
#                  scan) — never a hard failure, per the fail-open contract
#                  this correlation cache already has.
# Orphaned `.agent-pid-<pid>.tmp.<random>` atomic-write remnants (from a
# write killed mid-rename) get the same >60m sweep regardless of pid — a
# legitimate write completes in milliseconds.
#
# Rate-limited to once per hour via a marker file's mtime, so this scan does
# not run on every single hook fire. All failures are silently swallowed;
# this MUST NOT block or slow the caller's write.
_reap_stale_agent_pid_records() {
  local sessions_dir="$1"
  [[ -d "$sessions_dir" ]] || return 0

  local marker="$sessions_dir/.agent-pid-reap-marker"
  if [[ -e "$marker" ]]; then
    [[ -n "$(find "$marker" -mmin -60 2>/dev/null)" ]] && return 0
  fi
  # Claim the slot before scanning (not after), so a slow scan cannot let a
  # concurrent hook fire start a second redundant sweep.
  : > "$marker" 2>/dev/null || return 0

  # Hard backstop: unconditional past 7 days.
  local f
  while IFS= read -r -d '' f; do
    rm -f "$f" 2>/dev/null
  done < <(find "$sessions_dir" -maxdepth 1 -name 'agent-pid-*.json' -mtime +7 -print0 2>/dev/null)

  # Grace band: 3-7 days old, pid-liveness-gated.
  local pid
  while IFS= read -r -d '' f; do
    pid=$(python3 -c '
import json, sys
try:
    with open(sys.argv[1]) as fh:
        d = json.load(fh)
    v = d.get("agent_pid")
    if isinstance(v, int):
        print(v)
except Exception:
    pass
' "$f" 2>/dev/null)
    [[ -z "$pid" ]] && continue
    kill -0 "$pid" 2>/dev/null || rm -f "$f" 2>/dev/null
  done < <(find "$sessions_dir" -maxdepth 1 -name 'agent-pid-*.json' -mtime +3 -mtime -7 -print0 2>/dev/null)

  # Orphaned atomic-write temp files: age alone is sufficient, no pid to check.
  while IFS= read -r -d '' f; do
    rm -f "$f" 2>/dev/null
  done < <(find "$sessions_dir" -maxdepth 1 -name '.agent-pid-*.tmp.*' -mmin +60 -print0 2>/dev/null)

  return 0
}
