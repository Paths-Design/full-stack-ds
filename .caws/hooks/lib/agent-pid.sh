#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: CAWS-AGENT-PID-SESSION-CORRELATION-001
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting the re-wrap contract to dodge a block instead of fixing the
#   cause. Grow everything else freely.
# Agent-PID session correlation — the harness-agnostic core.
#
# WHY THIS EXISTS (CAWS-AGENT-PID-SESSION-CORRELATION-001). ZCode and other
# harnesses export NO session-id env var to their tool subprocesses, so the
# shell resolver (lib/session-id.sh) and the TS resolver (resolve-session.ts)
# fall past their env tiers to a durable-envelope scan that is ambiguous at
# the canonical checkout (N sessions, one repoRoot). The agent process,
# however, is a stable, per-session-unique ANCESTOR of both the hook
# subprocess and the agent's own Bash/caws commands — reachable by walking the
# PID tree. That PID is a correlation key that crosses the tool boundary
# without an env var.
#
# The mechanism mirrors the durable-envelope bridge: the hook writes a record
# keyed by agent PID (parse-input.sh's _write_agent_pid_record), and the
# resolvers read their OWN agent PID and look it up. Persists in
# .caws/sessions/ the same way session logs and envelopes do.
#
# HARNESS-AGNOSTIC BY CONSTRUCTION. This lib knows NOTHING about process
# names or harness identity. resolve_agent_pid takes the match set as an
# argument (CAWS_AGENT_PROCESS_NAMES, set per-surface by agent-surface.sh —
# the single adapter). A new harness works the moment its adapter names its
# agent ancestor; this core is unchanged.
#
# FAIL-OPEN. Every path returns empty (no identity) on any miss — missing
# record, unfound ancestor, or PID-reuse start-time mismatch — so callers
# fall through to the existing env→envelope→capsule chain. No new refusal
# modes. (A record's age is NOT a miss condition: validity is liveness + the
# start-time match, not time-since-last-fire.)
#
# IDEMPOTENT: safe to source multiple times.

if [[ -n "${_CAWS_AGENT_PID_SH_LOADED:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi
_CAWS_AGENT_PID_SH_LOADED=1

# The record filename prefix avoids both the caws-*.json capsule glob (read by
# lib/session-id.sh's capsule tier) and the per-session <sid>/ subdirs that
# hold .session-envelope.json. Files are flat: <sessions>/agent-pid-<pid>.json.
CAWS_AGENT_PID_PREFIX="agent-pid-"

# resolve_agent_pid — walk up the current process's PID tree until an ancestor's
# comm (basename) matches one of the space-separated names in $1. Prints the
# matching PID and returns 0; prints nothing and returns 1 on no match (incl.
# when $1 is empty — the unknown-surface fail-open case) or when ps is absent.
#
# Generic over the match set: the caller (agent-surface.sh) supplies the only
# harness-specific knowledge. Bounded at 16 hops so a pathological cycle cannot
# spin; init (pid 1) terminates the walk.
#
# Pure: reads the process table only, writes nothing.
resolve_agent_pid() {
  local names="${1:-}"
  [[ -z "$names" ]] && return 1
  command -v ps >/dev/null 2>&1 || return 1

  local pid=$$ _hop=0 _comm _base
  while [[ "$pid" != "1" && "$_hop" -lt 16 ]]; do
    _comm=$(ps -o comm= -p "$pid" 2>/dev/null) || { break; }
    # comm may be a full path (e.g. /Applications/ZCode.app/.../zcode-cli);
    # match on the basename so adapter entries stay short.
    _base="${_comm##*/}"
    for _name in $names; do
      if [[ "$_base" == "$_name" ]]; then
        printf '%s\n' "$pid"
        return 0
      fi
    done
    # Walk to the parent. read + set is more portable than ps -o ppid= parsing
    # across BSD/macOS/Linux.
    local _ppid
    _ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
    [[ -z "$_ppid" || "$_ppid" == "0" || "$_ppid" == "$pid" ]] && break
    pid="$_ppid"
    _hop=$((_hop + 1))
  done
  return 1
}

# resolve_agent_pid_with_start — like resolve_agent_pid, but also prints the
# matching process's start time (epoch seconds) on a second line. Used by the
# writer so the record can carry started_at for the PID-reuse guard. Returns
# 0 and prints "<pid>\n<start_epoch>" on a match; returns 1 and prints nothing
# otherwise.
resolve_agent_pid_with_start() {
  local pid
  pid=$(resolve_agent_pid "${1:-}") || return 1
  printf '%s\n' "$pid"
  # Start time as epoch seconds. ps -o lstart= gives a locale-dependent date
  # string; normalize via date. Fall back to empty if unavailable (the reader
  # treats an empty started_at as "do not validate start time" — slightly
  # weaker but never blocks).
  local _lstart _epoch
  _lstart=$(ps -o lstart= -p "$pid" 2>/dev/null) || { printf '\n'; return 0; }
  _epoch=$(date -d "$_lstart" +%s 2>/dev/null || date -jf '%a %b %d %T %Y' "$_lstart" +%s 2>/dev/null || true)
  printf '%s\n' "${_epoch:-}"
  return 0
}

# read_session_id_from_agent_pid — the read-side of the correlation. Resolves
# the current process's agent PID (via CAWS_AGENT_PROCESS_NAMES), reads
# <sessions>/agent-pid-<pid>.json, and validates the PID-reuse guard (the live
# process at <pid> still has a start time matching the record's started_at).
# Prints the session_id and returns 0 on a valid match; prints nothing and
# returns 1 on any miss.
#
# NO FRESHNESS WINDOW (CAWS-AGENT-PID-SESSION-CORRELATION-001 refinement).
# Unlike the durable-envelope tier, this record is keyed to a SPECIFIC LIVE
# PROCESS — resolve_agent_pid just walked to it from $$, so it is alive by
# construction. Validity is established by liveness (the walk) + the start-time
# match (guards against PID reuse), NOT by time-since-last-fire. A record
# written days ago for a process that is still running (same start time) is
# authoritative regardless of age. This is what lets a session leave its
# worktree and return after any gap: the agent process is unchanged, so the
# record is valid. last_seen_at is still WRITTEN (refresh hygiene + future
# cleanup heuristics) but is NOT consulted on the read path.
#
# $1 = cawsDir (the .caws dir; the sessions/ subdir under it holds the records).
# $2 = CAWS_AGENT_PROCESS_NAMES (the per-surface match set; required).
read_session_id_from_agent_pid() {
  local caws_dir="${1:-}"
  local names="${2:-}"
  [[ -z "$caws_dir" || -z "$names" ]] && return 1

  local pid start_epoch
  # Tolerate EOF (CAWS-DEFECT-HOOK-AGENT-PID-FAILOPEN-01): a no-match walk
  # prints nothing, so the reads fail. Guarded so this function's own control
  # flow (the `[[ -z "$pid" ]] && return 1` below) always decides the miss
  # return — an unguarded read-group failure is a latent mid-function abort
  # under set -e, the same defect class fixed in parse-input.sh.
  {
    read -r pid
    read -r start_epoch
  } < <(resolve_agent_pid_with_start "$names") || true
  [[ -z "$pid" ]] && return 1

  local record="$caws_dir/sessions/${CAWS_AGENT_PID_PREFIX}${pid}.json"
  [[ -f "$record" ]] || return 1

  # One python call: read + validate + emit session_id. Validates:
  #   - shape (session_id is a non-empty string)
  #   - PID-reuse (started_at, if present and start_epoch known, must match)
  # No freshness check — see the function header for why this tier omits it.
  # Emits only the session_id on success; emits nothing on any validation
  # failure (fail-open — the caller falls through to the existing chain).
  local sid
  sid=$(python3 - "$record" "${start_epoch:-}" <<'PY' 2>/dev/null || true
import json, sys
record_path, live_start = sys.argv[1], sys.argv[2]
try:
    with open(record_path) as f:
        d = json.load(f)
except Exception:
    sys.exit(0)
sid = d.get("session_id")
if not isinstance(sid, str) or not sid:
    sys.exit(0)
rec_start = d.get("started_at")
if rec_start and live_start:
    try:
        if int(float(live_start)) != int(float(rec_start)):
            sys.exit(0)  # PID reuse: start time mismatch
    except Exception:
        pass  # unparseable -> don't validate (weaker, never blocks)
print(sid)
PY
)
  [[ -z "$sid" ]] && return 1
  printf '%s\n' "$sid"
  return 0
}
