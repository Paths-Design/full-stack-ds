#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 1,17
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# CAWS Command Safety Gate (shared).
# Delegates to classify_command.py for robust command parsing and classification.
# Falls back to bash pattern matching if Python is unavailable.
#
# The Python classifier handles:
#   - Heredoc-aware parsing (won't false-positive on quoted dangerous commands)
#   - Quoted-region stripping (echo "git reset --hard" is safe)
#   - Pipeline-aware dangers (curl | sh)
#   - Context-aware rm classification (safe prefixes vs dangerous targets)
#   - Proper shell segmentation (&&, ||, ;, |)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=lib/agent-surface.sh
# Provides CAWS_VENDOR_DIR and caws_source_lib — LOAD-BEARING for the latch
# (the latch-state path and the emit helper below both need it). Under
# `set -euo pipefail` a bare `source <missing>` is a fatal builtin error that a
# trailing `|| true` does NOT catch, so guard with an existence test and fail
# LOUD if absent (CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001). A missing lib must NOT
# silently disarm the danger latch — emit a block so the safety boundary holds.
if [[ -f "$SCRIPT_DIR/lib/agent-surface.sh" ]]; then
  source "$SCRIPT_DIR/lib/agent-surface.sh"
else
  echo "[block-dangerous] CAWS hook infrastructure incomplete: lib/agent-surface.sh is missing — the danger-latch path cannot resolve. Failing SAFE (blocking). Restore the shared hook libs with: caws init --adopt" >&2
  printf '{"decision":"block","reason":"CAWS command-safety: the block-dangerous guard cannot load lib/agent-surface.sh, so it cannot evaluate command safety or arm the danger latch. Failing safe. Restore the hook pack: caws init --adopt"}\n'
  exit 2
fi
# shellcheck source=lib/emit.sh
# Canonical envelope emitters (HOOK-LIB-CONSOLIDATION-001 T3a).
# Use caws_source_lib so a vendor override is preferred over the shared default.
caws_source_lib emit.sh 2>/dev/null || true
# shellcheck source=lib/caws-state.sh
# sanitize_session — the canonical session-id->filename transform shared with
# reset-danger-latch.sh so the latch WRITER and CLEARER agree on the sentinel
# filename (DANGER-LATCH-UX-001). Optional here (a `command -v sanitize_session`
# fallback follows below), but guard the source with an existence test so a
# missing file does not abort under `set -euo pipefail` — `|| true` does NOT
# catch a fatal `source <missing>` (CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001).
[[ -f "$SCRIPT_DIR/lib/caws-state.sh" ]] && source "$SCRIPT_DIR/lib/caws-state.sh"
# shellcheck source=lib/guard-message.sh
# guard_identity (HOOK-GUARD-LEGIBILITY-001) — so latch reasons self-identify
# as "CAWS command-safety". Non-fatal if absent.
[[ -f "$SCRIPT_DIR/lib/guard-message.sh" ]] && source "$SCRIPT_DIR/lib/guard-message.sh"
# shellcheck source=lib/session-id.sh
# CAWS-SESSION-RESOLVER-GUARD-DIVERGENCE-001 (A6): consolidate the danger-latch
# session-id resolution onto the SAME precedence every other surface uses.
# Best-effort source — a missing helper falls back to the inline chain below.
[[ -f "$SCRIPT_DIR/lib/session-id.sh" ]] && source "$SCRIPT_DIR/lib/session-id.sh"
# shellcheck source=lib/agent-pid.sh
# DANGER-LATCH-QUARANTINE-TRAP-001: resolve_agent_pid_with_start supplies the
# ancestor agent-process identity used to (a) stamp the sentinel at arm time
# and (b) verify the kill target before any escalation signal. Best-effort —
# a missing lib degrades escalation to block-only (never to an unverified
# kill), matching agent-pid.sh's own fail-open contract.
[[ -f "$SCRIPT_DIR/lib/agent-pid.sh" ]] && source "$SCRIPT_DIR/lib/agent-pid.sh"
# shellcheck source=lib/bash-mutation-targets.sh
# CAWS-GUARD-REMEDIATION-CROSS-REPO-CONSISTENCY-01: supplies
# caws_bash_interpreter_foreign_repo, which decides WHICH opaque-exec
# remediation this guard may print. Sourced best-effort, but the absence is
# never silent in the output: the remediation selector below falls back to the
# text that omits the script-file route, so a missing lib narrows advice rather
# than restoring the sentence the lib exists to suppress.
[[ -f "$SCRIPT_DIR/lib/bash-mutation-targets.sh" ]] && source "$SCRIPT_DIR/lib/bash-mutation-targets.sh"

# DANGER-LATCH-QUARANTINE-TRAP-001: the armed sentinel is a TRAP, not a sticky
# warning. A trapped session is quarantined: only a fixed read-only allowlist
# (single simple commands) and the reset invocation run; EVERYTHING else —
# including classifier-allowed mutators like git commit and the caws CLI —
# blocks, is recorded as a strike, and the first such attempt escalates to
# terminating the session's agent process (identity-verified SIGTERM, on
# surfaces where CAWS_TRAP_KILL is enabled; see agent-surface.sh).

# Render the escalation disposition of THE SURFACE THIS SESSION IS ON.
#
# The message used to describe surfaces in general ("on surfaces with kill
# escalation enabled, the first such attempt ends this session's process"),
# which left every agent unable to tell whether the sentence was about them. On
# a shared-process host — dsh, IDE hosts, opencode — it never is, because the
# pid there names the host, not the offender. An agent that reads a threat
# meant for someone else is miscalibrated in one direction; one that reads
# "no kill" as "no consequence" is miscalibrated far worse.
#
# So the disabled wording states the quarantine's full force in the same
# breath. That is not softening: the quarantine is surface-INDEPENDENT. Only
# the SIGTERM is gated (see trap_escalate below). Deny-by-default, the
# read-only allowlist, strike recording and the human-only reset run
# everywhere, and cover the file tools as well as Bash.
#
# CAWS_TRAP_KILL is resolved by agent-surface.sh, sourced above, so the value
# is already settled here.
trap_escalation_note() {
  case "${CAWS_TRAP_KILL:-0}" in
    1)
      printf '%s' "On THIS surface the first such attempt also ends this session's process (identity-verified SIGTERM to the agent pid)."
      ;;
    dryrun)
      # dryrun runs the whole verification path and stops at the signal
      # boundary, so promising an ended process would be a lie.
      printf '%s' "On THIS surface kill escalation is in dry-run: the agent process is identified and logged, but no signal is sent."
      ;;
    *)
      printf '%s' "THIS surface does not process-kill (kill escalation is disabled here), which changes nothing about the quarantine: every further Bash command and file mutation stays denied and recorded until a human clears it."
      ;;
  esac
}

_TRAP_ESCALATION_NOTE="$(trap_escalation_note)"
_LATCH_SCOPE_NOTE="the session is QUARANTINED: only fixed read-only commands and the reset itself run; every other Bash attempt is blocked and recorded as a strike. $_TRAP_ESCALATION_NOTE"

danger_state_dir() {
  local project_dir="${CAWS_PROJECT_DIR:-.}"
  local state_dir="$project_dir/${CAWS_VENDOR_DIR}/hooks/state"
  # DANGER-LATCH-TRAP-WRITE-EDIT-001: --no-create lets the file-tool trap
  # check ASK whether a sentinel exists without creating the state dir as a
  # side effect of every Write/Edit in every repo it is installed into.
  [[ "${1:-}" == "--no-create" ]] || mkdir -p "$state_dir"
  printf '%s\n' "$state_dir"
}

# Render a complete human-shell command. An immutable snapshot's path cannot
# identify the governed project, and the human may be standing in another repo.
# Quote every value as a shell word, including paths and the payload session id.
danger_recovery_command() {
  local project_dir="${CAWS_PROJECT_DIR:-.}"
  local hooks_dir="${CAWS_HOOKS_DIR:-$SCRIPT_DIR}"
  local machine=0
  [[ "${CAWS_MACHINE_RUNTIME:-0}" == 1 ]] && machine=1
  if [[ -d "$project_dir" ]]; then
    project_dir="$(cd "$project_dir" && pwd -P)"
  fi
  case "$hooks_dir" in
    /*) ;;
    *) hooks_dir="$project_dir/$hooks_dir" ;;
  esac
  printf 'env CAWS_MACHINE_RUNTIME=%s CAWS_PROJECT_DIR=%q CAWS_AGENT_SURFACE=%q bash %q --session %q --reason %q' \
    "$machine" "$project_dir" "$CAWS_AGENT_SURFACE" \
    "$hooks_dir/reset-danger-latch.sh" "$1" '<why this is safe>'
}

# Shared session-id->safe-filename transform.
_danger_safe_session() {
  local session_id="$1"
  if command -v sanitize_session >/dev/null 2>&1; then
    sanitize_session "$session_id"
  else
    printf '%s' "$session_id" | tr -c 'A-Za-z0-9._-' '_'
  fi
}

danger_latch_file() {
  local safe_session
  safe_session=$(_danger_safe_session "$1")
  printf '%s/danger-latch-%s.json\n' "$(danger_state_dir "${2:-}")" "$safe_session"
}

# Warn-marker sibling of the latch file. DANGER-LATCH-APPROVAL-AND-FEEDBACK-001
# (restored in HOOK-CAPABILITY-ENGINE-003): a confirm-class ask WARNS on its
# first occurrence in a session and LATCHES on the second.
danger_warn_file() {
  local safe_session
  safe_session=$(_danger_safe_session "$1")
  printf '%s/danger-warn-%s.json\n' "$(danger_state_dir)" "$safe_session"
}

# Thin adapters over the canonical lib/emit.sh primitives.
emit_block_json() { emit_block "$1"; }
emit_ask_json() { emit_ask "$1"; }

record_danger_latch() {
  local file="$1"
  local decision="$2"
  local reason="$3"
  local command="$4"

  mkdir -p "$(dirname "$file")"
  jq -n \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg hook "block-dangerous.sh" \
    --arg decision "$decision" \
    --arg reason "$reason" \
    --arg command "$command" \
    '{
      ts: $ts,
      hook: $hook,
      decision: $decision,
      reason: $reason,
      command: $command,
      message: "Dangerous command boundary engaged. User reset required before more Bash commands may run in this session."
    }' > "$file"
  # DANGER-LATCH-QUARANTINE-TRAP-001: stamp the ancestor agent-process
  # identity at arm time so escalation can verify the kill target later —
  # pid drift, PID reuse (start-time mismatch), and comm mismatch all refuse
  # to kill. Best-effort: a failed resolution leaves an unstamped sentinel,
  # which escalation treats as "unverifiable, hold the kill".
  if command -v jq >/dev/null 2>&1; then
    local _tpid="" _tstart="" _tcomm=""
    {
      read -r _tpid
      read -r _tstart
      read -r _tcomm
    } < <(trap_resolve_agent_identity) || true
    if [[ -n "$_tpid" ]]; then
      local _ttmp="${file}.ident.$$"
      jq --arg pid "$_tpid" --arg st "${_tstart:-}" --arg cm "${_tcomm:-}" \
        '. + {agent_pid: $pid, agent_pid_started_at: $st, agent_pid_comm: $cm}' \
        "$file" > "$_ttmp" 2>/dev/null && mv "$_ttmp" "$file" || rm -f "$_ttmp" 2>/dev/null || true
    fi
  fi
}

# Classify a command via classify_command.py, echoing the decision
# ("allow" | "ask" | "deny") on stdout.
classify_decision() {
  local cmd="$1"
  local classifier="$SCRIPT_DIR/classify_command.py"
  if [[ ! -f "$classifier" ]] || ! command -v python3 >/dev/null 2>&1; then
    printf 'unavailable'
    return 0
  fi
  # CAWS-HOOKPACK-HOME-UNSET-ROOT-AUTHORITY-ALIAS-001: only pass --home when
  # HOME is actually known. classify_command.py's own default (Path.home())
  # can still resolve a real home via the passwd database even when $HOME is
  # unset in the environment; passing an explicit empty string would instead
  # resolve to the CURRENT DIRECTORY there, weakening its "recursive delete
  # targets home directory" hard-block by aliasing home to cwd.
  local -a _classify_args=(--repo-root "${CAWS_PROJECT_DIR:-.}")
  [[ -n "${HOME:-}" ]] && _classify_args+=(--home "$HOME")
  _classify_args+=(--cwd "$(pwd)")
  local result
  result=$(printf '%s' "$cmd" | python3 "$classifier" "${_classify_args[@]}" 2>/dev/null) || {
    printf 'unavailable'
    return 0
  }
  printf '%s' "$result" | jq -r '.decision // "ask"' 2>/dev/null || printf 'ask'
}

# Does this command INVOKE the pack's own reset-dangerous-latch.sh escape hatch?
# DANGER-LATCH-RESET-EXEMPT-ANCHOR-001 (port of consumer hardening
# STERLING-LATCH-RESET-PREFIX-EXEMPTS-UNEXAMINED-REMAINDER-01 / DOC-TH-MA-001
# §7): the exemption is the trap's ONLY exit, so it must admit exactly ONE
# simple invocation. The pre-fix prefix-match exempted
# `reset-danger-latch.sh ... && <arbitrary remainder>` — a compound command
# rode the exemption past the trap unexamined. Hardened shape, all
# end-anchored (nothing may follow the invocation):
#   - optional benign prefixes: `cd <dir> &&`, `VAR=value` assignments, and
#     `env VAR=value ...` (the emitted machine recovery command's shape)
#   - the reset script, optionally invoked via bash/sh/. with a path
#   - arguments free of command separators, substitution metacharacters
#     ($ backtick), parentheses, and redirection operators
# Fails closed: any shape this cannot prove simple is NOT exempted.
is_reset_latch_invocation() {
  local cmd="$1"
  printf '%s' "$cmd" | grep -qE \
    '^[[:space:]]*((cd[[:space:]]+[^;&|`$<>()]+&&[[:space:]]*)|(env[[:space:]]+[A-Za-z_][A-Za-z0-9_]*=[^;&|`$<>()[:space:]]+([[:space:]]+|$))|([A-Za-z_][A-Za-z0-9_]*=[^;&|`$<>()[:space:]]+[[:space:]]+))*[[:space:]]*((bash|sh|\.)[[:space:]]+)?([^[:space:];&|`$<>()]*/)?reset-danger-latch\.sh([[:space:]]+[^;&|`$<>()]*)?[[:space:]]*$'
}

# --- DANGER-LATCH-QUARANTINE-TRAP-001: quarantine admission + escalation ---
# While the sentinel exists the session is quarantined: deny-by-default with a
# fixed read-only allowlist, an explicit enlist-help refusal, strike recording,
# and an identity-verified kill escalation. Every helper fails toward DENY for
# admission and toward NO-SIGNAL for the kill.

_latch_in_list() {
  local item="$1" list="$2" entry
  for entry in $list; do
    if [[ "$entry" == "$item" ]]; then
      return 0
    fi
  done
  return 1
}

# Fixed read-only admission set. Single simple commands ONLY — no separators,
# pipes, backgrounding, redirects, or $-substitution shapes. Strict by design:
# metacharacters inside quoted arguments also deny, because safely parsing
# shell quoting in this path is harder than denying (fail closed).
_LATCH_RO_BINS="cat ls head tail wc pwd echo printf grep rg diff stat file jq git caws"
_LATCH_RO_GIT_SUBS="status diff log show rev-parse"
_LATCH_RO_CAWS_SUBS="status doctor help version"
_LATCH_RO_CAWS_PAIRS="scope:show scope:check worktree:list worktree:review specs:list specs:show agents:list agents:show message:poll message:inbox message:history message:status"

latch_read_only_command() {
  local cmd="$1"
  if printf '%s' "$cmd" | grep -qE '[;|&><`($]'; then
    return 1
  fi
  if [[ "$cmd" == *$'\n'* || "$cmd" == *$'\r'* ]]; then
    return 1
  fi
  local -a argv
  read -r -a argv <<< "$cmd"
  if [[ "${#argv[@]}" -lt 1 ]]; then
    return 1
  fi
  local bin="${argv[0]##*/}"
  _latch_in_list "$bin" "$_LATCH_RO_BINS" || return 1
  if [[ "$bin" == "git" ]]; then
    if [[ "${#argv[@]}" -eq 1 ]]; then
      return 0
    fi
    local sub="${argv[1]}"
    _latch_in_list "$sub" "$_LATCH_RO_GIT_SUBS" || return 1
    # Hostile path: a git alias shadowing an allowlisted subcommand executes
    # arbitrary shell (alias.status=!rm -rf ...). Admit only when no alias of
    # that name is configured for this repo/user.
    if [[ -n "$(git -C "${CAWS_PROJECT_DIR:-.}" config --get "alias.$sub" 2>/dev/null || true)" ]]; then
      return 1
    fi
    return 0
  fi
  if [[ "$bin" == "caws" ]]; then
    if [[ "${#argv[@]}" -eq 1 ]]; then
      return 0
    fi
    local sub="${argv[1]}"
    if _latch_in_list "$sub" "$_LATCH_RO_CAWS_SUBS"; then
      return 0
    fi
    if [[ "${#argv[@]}" -ge 3 ]] && _latch_in_list "${sub}:${argv[2]}" "$_LATCH_RO_CAWS_PAIRS"; then
      return 0
    fi
    return 1
  fi
  return 0
}

# A quarantined session must not enlist a peer to run what it cannot.
is_caws_enlist_invocation() {
  local cmd="$1"
  local -a argv
  read -r -a argv <<< "$cmd"
  local bin="${argv[0]:-}"
  bin="${bin##*/}"
  if [[ "$bin" != "caws" ]]; then
    return 1
  fi
  if [[ "${argv[1]:-}" != "message" ]]; then
    return 1
  fi
  if [[ "${argv[2]:-}" == "send" || "${argv[2]:-}" == "reply" ]]; then
    return 0
  fi
  return 1
}

# Append one JSON escalation-audit line. Never fatal.
trap_log_event() {
  local session_id="$1" verdict="$2" action="$3" detail="$4" command="$5"
  local log_dir="${CAWS_PROJECT_DIR:-.}/${CAWS_VENDOR_DIR}/logs"
  local log_file="$log_dir/danger-latch-escalations.log"
  command -v jq >/dev/null 2>&1 || return 0
  mkdir -p "$log_dir" 2>/dev/null || true
  jq -c -n \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg session "$session_id" \
    --arg verdict "$verdict" \
    --arg action "$action" \
    --arg detail "$detail" \
    --arg command "$command" \
    '{ts:$ts,session_id:$session,verdict:$verdict,action:$action,detail:$detail,command:$command}' \
    >> "$log_file" 2>/dev/null || true
}

# Record a quarantined denial as a strike in the sentinel. Never fatal.
trap_record_strike() {
  local file="$1" command="$2"
  command -v jq >/dev/null 2>&1 || return 0
  local tmp="${file}.strike.$$"
  jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     --arg cmd "$(printf '%s' "$command" | head -c 200)" \
     '.trap_strikes = ((.trap_strikes // 0) + 1) | .trap_last_strike_ts = $ts | .trap_last_strike_command = $cmd' \
     "$file" > "$tmp" 2>/dev/null && mv "$tmp" "$file" || rm -f "$tmp" 2>/dev/null || true
}

# Live ancestor agent-process identity: prints "<pid>\n<start_epoch>\n<comm>".
# Empty when the walk or the per-surface names are unavailable — callers treat
# empty as "identity unresolvable, hold the kill" (never an unverified kill).
trap_resolve_agent_identity() {
  if ! command -v resolve_agent_pid_with_start >/dev/null 2>&1; then
    return 0
  fi
  if [[ -z "${CAWS_AGENT_PROCESS_NAMES:-}" ]]; then
    return 0
  fi
  local pid="" start="" comm=""
  {
    read -r pid
    read -r start
  } < <(resolve_agent_pid_with_start "${CAWS_AGENT_PROCESS_NAMES}") || true
  if [[ -n "$pid" ]]; then
    comm="$(ps -o comm= -p "$pid" 2>/dev/null || true)"
    printf '%s\n%s\n%s\n' "$pid" "${start:-}" "${comm:-}"
  fi
  return 0
}

# Escalation: terminate the quarantined session's agent process. Every
# failure degrades to "no signal sent" plus an audit line — an unverified
# kill is strictly worse than no kill. Emits nothing; called AFTER the block
# decision so the transcript already shows why the session is dying.
trap_escalate() {
  local latch_file="$1" session_id="$2" command="$3"
  local threshold="${CAWS_TRAP_ESCALATION_THRESHOLD:-1}"
  local strikes
  strikes="$(jq -r '.trap_strikes // 0' "$latch_file" 2>/dev/null || printf '0')"
  [[ "$strikes" =~ ^[0-9]+$ ]] || strikes=0
  if (( strikes < threshold )); then
    return 0
  fi
  # DANGER-LATCH-TRAP-KILL-DRYRUN-001: dryrun runs the whole verification path
  # and stops at the signal boundary, so an operator can confirm the resolved
  # target on a surface before enabling a real kill there. It is neither
  # "disabled" (held) nor "enabled" (signal).
  local kill_mode="${CAWS_TRAP_KILL:-0}"
  if [[ "$kill_mode" != "1" && "$kill_mode" != "dryrun" ]]; then
    trap_log_event "$session_id" "held" "no-kill" "kill escalation disabled for surface ${CAWS_AGENT_SURFACE:-unknown} (shared-process host or unset)" "$command"
    return 0
  fi
  local pid="" start="" comm="" rec_pid="" rec_start="" rec_comm=""
  {
    read -r pid
    read -r start
    read -r comm
  } < <(trap_resolve_agent_identity) || true
  if [[ -z "$pid" ]]; then
    trap_log_event "$session_id" "held" "no-kill" "agent pid unresolved (surface names or PID walk unavailable)" "$command"
    return 0
  fi
  if [[ "$pid" == "1" || "$pid" == "$$" ]]; then
    trap_log_event "$session_id" "held" "no-kill" "invalid kill target pid=$pid" "$command"
    return 0
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    trap_log_event "$session_id" "held" "no-kill" "agent process $pid already gone" "$command"
    return 0
  fi
  rec_pid="$(jq -r '.agent_pid // ""' "$latch_file" 2>/dev/null || true)"
  rec_start="$(jq -r '.agent_pid_started_at // ""' "$latch_file" 2>/dev/null || true)"
  rec_comm="$(jq -r '.agent_pid_comm // ""' "$latch_file" 2>/dev/null || true)"
  if [[ -n "$rec_pid" && "$rec_pid" != "$pid" ]]; then
    trap_log_event "$session_id" "held" "no-kill" "pid drifted: armed=$rec_pid live=$pid" "$command"
    return 0
  fi
  if [[ -n "$rec_start" && -n "$start" && "$rec_start" != "$start" ]]; then
    trap_log_event "$session_id" "held" "no-kill" "start-time mismatch (PID reuse suspected): armed=$rec_start live=$start" "$command"
    return 0
  fi
  if [[ -n "$rec_comm" && -n "$comm" && "$rec_comm" != "$comm" ]]; then
    trap_log_event "$session_id" "held" "no-kill" "comm mismatch: armed=$rec_comm live=$comm" "$command"
    return 0
  fi
  if [[ "$kill_mode" == "dryrun" ]]; then
    # Identity verified by the same checks above; stop before signaling and
    # leave durable evidence of what WOULD have been terminated.
    trap_log_event "$session_id" "dryrun" "no-signal" "kill target verified: pid=$pid comm=${comm:-unknown} start=${start:-unknown} after strike $strikes — dry run, no signal sent" "$command"
    local _dtmp="${latch_file}.dry.$$"
    jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg pid "$pid" \
       '.trap_dryrun_at = $ts | .trap_dryrun_pid = $pid' \
       "$latch_file" > "$_dtmp" 2>/dev/null && mv "$_dtmp" "$latch_file" || rm -f "$_dtmp" 2>/dev/null || true
    return 0
  fi
  if kill -TERM "$pid" 2>/dev/null; then
    trap_log_event "$session_id" "escalated" "sigterm" "terminated agent process $pid (${comm:-unknown}) after strike $strikes" "$command"
    local tmp="${latch_file}.esc.$$"
    jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg pid "$pid" \
       '.trap_escalated_at = $ts | .trap_escalated_pid = $pid' \
       "$latch_file" > "$tmp" 2>/dev/null && mv "$tmp" "$latch_file" || rm -f "$tmp" 2>/dev/null || true
  else
    trap_log_event "$session_id" "held" "no-kill" "signal to $pid failed" "$command"
  fi
  return 0
}

# Read JSON input from the agent harness
INPUT=$(cat)

# Extract tool info
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // ""')
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')
# CAWS-SESSION-RESOLVER-GUARD-DIVERGENCE-001 (A6): resolve through the shared
# helper so the danger latch uses the SAME precedence as the resolver + guards
# (CLAUDE_SESSION_ID → CLAUDE_CODE_SESSION_ID → CODEX_THREAD_ID →
# CAWS_SESSION_ID → HOOK_SESSION_ID → CURSOR_TRACE_ID). The hook payload's
# session_id is extracted first and passed as the override (it is the most
# authoritative for THIS tool call), with the helper falling back to env when it
# is absent/unknown. Falls back to the legacy inline jq chain if the helper is
# not loaded (back-compat for a partial hook-pack install).
_PAYLOAD_SID="$(printf '%s' "$INPUT" | jq -r '.session_id // ""')"
if declare -F resolve_caws_session_id >/dev/null 2>&1; then
  SESSION_ID="$(resolve_caws_session_id "$_PAYLOAD_SID")"
else
  SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // env.CAWS_SESSION_ID // env.CLAUDE_SESSION_ID // env.HOOK_SESSION_ID // "unknown"')
fi
unset _PAYLOAD_SID

# ── DANGER-LATCH-TRAP-WRITE-EDIT-001: the trap covers the FILE TOOLS too ────
# The Bash-only branch below meant a quarantined session could still mutate
# source, specs, and doctrine through Write/Edit. On kill-disabled surfaces
# (server-shaped hosts, where no SIGTERM contains the session) that reduced
# "quarantine" to "no shell mutations" — a claim the trap's own doctrine did
# not qualify. A trapped session gets NO file-tool mutation: every Write/Edit
# is denied, recorded as a strike, and escalated through the SAME
# identity-verified path as Bash. Untrapped sessions are untouched: the lookup
# uses --no-create, emits nothing, and exits 0.
case "$TOOL_NAME" in
  Write|Edit|NotebookEdit|MultiEdit)
    if [[ -n "${SESSION_ID:-}" && "$SESSION_ID" != "unknown" ]]; then
      WRITE_LATCH_FILE="$(danger_latch_file "$SESSION_ID" --no-create)"
      if [[ -f "$WRITE_LATCH_FILE" ]]; then
        WRITE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')"
        trap_record_strike "$WRITE_LATCH_FILE" "$TOOL_NAME $WRITE_PATH"
        REASON="CAWS command-safety: this session is QUARANTINED (danger trap) and file mutations are refused — the trap covers Bash AND the file tools, so there is no read-only Write/Edit. The attempt to $TOOL_NAME '$WRITE_PATH' was recorded as a strike. $_TRAP_ESCALATION_NOTE This is a human-review boundary: do not retry the write, do not route it through another tool, and do not ask another agent to make it. You, the agent, CANNOT clear this in-band: the reset is human-only by design. Ask the USER to run, from their own shell: $(danger_recovery_command "$SESSION_ID")  (or --all to clear every latch). Sentinel: $WRITE_LATCH_FILE"
        emit_block_json "$REASON"
        trap_escalate "$WRITE_LATCH_FILE" "$SESSION_ID" "$TOOL_NAME $WRITE_PATH"
      fi
    fi
    exit 0
    ;;
esac

# Only check Bash tool
if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
  exit 0
fi

RECOVERY_COMMAND="$(danger_recovery_command "$SESSION_ID")"
LATCH_FILE="$(danger_latch_file "$SESSION_ID")"
if [[ -f "$LATCH_FILE" ]]; then
  # DANGER-LATCH-QUARANTINE-TRAP-001: the sentinel means QUARANTINE. Only the
  # reset invocation and the fixed read-only allowlist run; everything else is
  # denied, recorded as a strike, and escalated (identity-verified SIGTERM on
  # kill-enabled surfaces). Classifier "allow" no longer admits anything here.
  if is_reset_latch_invocation "$COMMAND"; then
    exit 0
  fi
  if is_caws_enlist_invocation "$COMMAND"; then
    trap_record_strike "$LATCH_FILE" "$COMMAND"
    REASON="CAWS command-safety: this session is QUARANTINED (danger trap) and cannot enlist another agent to do what it cannot: caws message send / caws message reply are refused while trapped. The attempt was recorded as a strike. $_LATCH_SCOPE_NOTE — you cannot reset it yourself. Ask the USER to run, from their own shell: $RECOVERY_COMMAND  (or --all to clear every latch). Sentinel: $LATCH_FILE. Command was: $COMMAND"
    emit_block_json "$REASON"
    trap_escalate "$LATCH_FILE" "$SESSION_ID" "$COMMAND"
    exit 0
  fi
  # DANGER-LATCH-TRAP-CLASSIFIER-INTERSECTION-001: the allowlist is a
  # NECESSARY condition, not a sufficient one. The pre-fix branch made it an
  # ALTERNATIVE to the classifier for allowlisted binaries, so `cat` with any
  # separator-free path was admitted while trapped — including credential
  # files the classifier explicitly denies (`cat ~/.ssh/id_rsa`,
  # `cat /etc/passwd`, `cat .env`), exactly when the session is under
  # suspicion. Admission is now the INTERSECTION: allowlist AND classifier
  # "allow". ask-class denies too (a quarantined session cannot prompt a
  # human), and an unresolvable classifier ("unavailable") fails closed. The
  # corpus harness over 4,759 real commands is the falsifier: false admits -> 0.
  TRAP_INTERSECTION_NOTE=""
  if latch_read_only_command "$COMMAND"; then
    TRAP_CLS_DECISION="$(classify_decision "$COMMAND")"
    if [[ "$TRAP_CLS_DECISION" == "allow" ]]; then
      exit 0
    fi
    TRAP_INTERSECTION_NOTE=" This command IS read-only in shape and on the fixed allowlist, but the classifier refuses it (decision: ${TRAP_CLS_DECISION:-unavailable}), so the intersection denies it."
  fi

  trap_record_strike "$LATCH_FILE" "$COMMAND"

  ORIG_CMD=""
  ORIG_WHY=""
  if command -v jq >/dev/null 2>&1; then
    ORIG_CMD=$(jq -r '.command // ""' "$LATCH_FILE" 2>/dev/null)
    ORIG_WHY=$(jq -r '.reason // ""' "$LATCH_FILE" 2>/dev/null)
  fi
  TRIGGER_NOTE="The trap was engaged earlier in this session"
  if [[ -n "$ORIG_CMD" ]]; then
    TRIGGER_NOTE="$TRIGGER_NOTE by this command: \`${ORIG_CMD%%$'\n'*}\`"
    if [[ -n "$ORIG_WHY" ]]; then
      TRIGGER_NOTE="$TRIGGER_NOTE (reason: $ORIG_WHY)"
    fi
    TRIGGER_NOTE="$TRIGGER_NOTE — NOT by the command you just ran. The trap is sticky: only fixed read-only commands and the reset itself run."
  fi
  REASON="CAWS command-safety: this session is QUARANTINED. $TRIGGER_NOTE$TRAP_INTERSECTION_NOTE This command is not admissible while trapped — trapped admission requires BOTH the fixed read-only allowlist AND a classifier allow — so it is blocked and the attempt was recorded as a strike. $_TRAP_ESCALATION_NOTE This is a human-review boundary, not a retryable syntax error. Do not rephrase, wrap, reorder, alias, or indirectly invoke anything to get around it, and do not ask another agent to run it for you. You, the agent, CANNOT clear this in-band: the reset is human-only by design. Ask the USER to run, from their own shell (use --session with THIS session id, not --current): $RECOVERY_COMMAND  (or --all to clear every latch). Sentinel: $LATCH_FILE"
  emit_block_json "$REASON"
  trap_escalate "$LATCH_FILE" "$SESSION_ID" "$COMMAND"
  exit 0
fi

# --- Protect the write guard itself from shell-based self-modification ---
# FLAG: PROTECTED_HOOK_REL / PROTECTED_HOOK_ABS use CAWS_VENDOR_DIR from
# lib/agent-surface.sh so the protection path matches the installed location.
# CAWS_VENDOR_DIR is exported by agent-surface.sh (sourced above).
PROTECTED_HOOK_REL="${CAWS_VENDOR_DIR}/hooks/worktree-write-guard.sh"
PROTECTED_HOOK_ABS="${CAWS_PROJECT_DIR:-.}/${CAWS_VENDOR_DIR}/hooks/worktree-write-guard.sh"
if printf '%s' "$COMMAND" | grep -qF "$PROTECTED_HOOK_REL" || printf '%s' "$COMMAND" | grep -qF "$PROTECTED_HOOK_ABS"; then
  # DANGER-LATCH-TRIGGER-DISCRIMINATION-001
  _GUARD_TOKEN=""
  if printf '%s' "$COMMAND" | grep -qF "$PROTECTED_HOOK_ABS"; then
    _GUARD_TOKEN="$PROTECTED_HOOK_ABS"
  else
    _GUARD_TOKEN="$PROTECTED_HOOK_REL"
  fi
  _LAST_TOKEN="$(printf '%s' "$COMMAND" | sed -E 's/[[:space:]]*[;&|][[:space:]]*$//' | awk '{print $NF}')"
  _GUARD_IS_DEST=0
  [[ "$_LAST_TOKEN" == "$_GUARD_TOKEN" ]] && _GUARD_IS_DEST=1

  if printf '%s' "$COMMAND" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+(add|commit|status|diff|log|show)\b'; then
    :
  elif printf '%s' "$COMMAND" | grep -qE '(>>|>)[[:space:]]*'"$_GUARD_TOKEN"; then
    record_danger_latch "$LATCH_FILE" "block" "shell redirect into protected guard (destination)" "$COMMAND"
    emit_block_json "$PROTECTED_HOOK_REL is protected from Bash-based edits — it is the guard that enforces worktree write boundaries. Do not redirect output into it. Ask the user for permission before modifying this hook. Command was: $COMMAND"
    exit 0
  elif printf '%s' "$COMMAND" | grep -qE '(^|[;&|[:space:]])(rm|tee|touch|truncate|install|chmod)[[:space:]]'; then
    record_danger_latch "$LATCH_FILE" "block" "shell edit of protected guard (in-place mutator)" "$COMMAND"
    emit_block_json "$PROTECTED_HOOK_REL is protected from Bash-based edits — it is the guard that enforces worktree write boundaries. Do not modify it via the shell. Ask the user for permission before modifying this hook. Command was: $COMMAND"
    exit 0
  elif printf '%s' "$COMMAND" | grep -qE '(^|[;&|[:space:]])(sed|perl)[[:space:]]' \
       && printf '%s' "$COMMAND" | grep -qE '(^|[[:space:]])(-i|-pi|-ip|--in-place)([[:space:]]|=|$)'; then
    record_danger_latch "$LATCH_FILE" "block" "shell edit of protected guard (in-place sed/perl)" "$COMMAND"
    emit_block_json "$PROTECTED_HOOK_REL is protected from Bash-based edits — it is the guard that enforces worktree write boundaries. Do not modify it in place. Ask the user for permission before modifying this hook. Command was: $COMMAND"
    exit 0
  elif printf '%s' "$COMMAND" | grep -qE '(^|[;&|[:space:]])(cp|mv)[[:space:]]' && [[ "$_GUARD_IS_DEST" == "1" ]]; then
    record_danger_latch "$LATCH_FILE" "block" "shell edit of protected guard (copy/move destination)" "$COMMAND"
    emit_block_json "$PROTECTED_HOOK_REL is protected from Bash-based edits — it is the guard that enforces worktree write boundaries. Do not copy/move over it. Ask the user for permission before modifying this hook. Command was: $COMMAND"
    exit 0
  elif printf '%s' "$COMMAND" | grep -qE '(^|[;&|[:space:]])(cp|mv|node|python|python3|ruby)[[:space:]]'; then
    REASON="CAWS command-safety: this command references the protected guard $PROTECTED_HOOK_REL but does not appear to write INTO it (guard is a copy source or an interpreter argument, not the destination). If you are reading/copying it out for a fixture, that is allowed once approved; if you intend to modify the guard in place, that requires explicit human approval. This did NOT arm the danger latch. Command was: $COMMAND"
    if command -v emit_ask_json >/dev/null 2>&1; then
      emit_ask_json "$REASON"
    else
      printf '%s\n' "$REASON" >&2
    fi
    exit 0
  fi
fi

# --- Python classifier (preferred path) ---
CLASSIFIER="$SCRIPT_DIR/classify_command.py"
if [[ ! -f "$CLASSIFIER" ]] || ! command -v python3 >/dev/null 2>&1; then
  record_danger_latch "$LATCH_FILE" "ask" "classifier unavailable" "$COMMAND"
  REASON="CAWS command-safety: command classifier unavailable; dangerous-command safety cannot verify Bash semantics. The session danger latch is NOW ARMED (fail-closed). $_LATCH_SCOPE_NOTE — you cannot reset it yourself. Ask the USER to run: $RECOVERY_COMMAND. Command was: $COMMAND"
  emit_ask_json "$REASON"
  exit 0
fi

REPO_ROOT="${CAWS_PROJECT_DIR:-.}"
CLASSIFIER_STDERR=$(mktemp)
# CAWS-HOOKPACK-HOME-UNSET-ROOT-AUTHORITY-ALIAS-001: see classify_decision's
# identical guard above -- omit --home when unknown so Python's own
# Path.home() default (which can resolve via the passwd db) applies instead
# of an explicit empty string aliasing home to the current directory.
declare -a _CLASSIFY_ARGS=(--repo-root "$REPO_ROOT")
[[ -n "${HOME:-}" ]] && _CLASSIFY_ARGS+=(--home "$HOME")
_CLASSIFY_ARGS+=(--cwd "$(pwd)")
RESULT=$(printf '%s' "$COMMAND" | python3 "$CLASSIFIER" "${_CLASSIFY_ARGS[@]}" 2>"$CLASSIFIER_STDERR") || {
  DIAG=$(head -c 200 "$CLASSIFIER_STDERR" 2>/dev/null || true)
  rm -f "$CLASSIFIER_STDERR"
  RESULT="{\"decision\":\"ask\",\"reason\":\"command classifier failed: ${DIAG:-unknown error}\",\"source\":\"classifier_error\",\"enforcement\":\"confirm\"}"
}
rm -f "$CLASSIFIER_STDERR"

DECISION=$(printf '%s' "$RESULT" | jq -r '.decision // "ask"')
REASON=$(printf '%s' "$RESULT" | jq -r '.reason // "unknown"')
SOURCE=$(printf '%s' "$RESULT" | jq -r '.source // "unknown"')
ENFORCEMENT=$(printf '%s' "$RESULT" | jq -r '.enforcement // ""')
if [[ -z "$ENFORCEMENT" ]]; then
  case "$DECISION" in
    deny) ENFORCEMENT="block" ;;
    allow) ENFORCEMENT="pass" ;;
    *) ENFORCEMENT="advisory" ;;
  esac
fi

case "$DECISION" in
  allow)
    exit 0
    ;;
  deny)
    record_danger_latch "$LATCH_FILE" "$DECISION" "$REASON" "$COMMAND"
    FULL_REASON="CAWS command-safety: $REASON. This is a HARD BLOCK (catastrophic deny) and the session danger latch is NOW ARMED. $_LATCH_SCOPE_NOTE — you CANNOT reset it yourself. Do not rephrase, wrap, reorder, alias, or indirectly invoke this command (e.g. via 'command git ...', 'env ... git ...', 'bash -lc \"...\"', or 'git --bare init'). Ask the USER to run: $RECOVERY_COMMAND, then ask for the next step. Command was: $COMMAND"
    emit_block_json "$FULL_REASON"
    exit 0
    ;;
  ask)
    if [[ "$ENFORCEMENT" == "confirm" ]]; then
      # Opaque-exec carve-out (CAWS-CLASSIFY-LITERAL-OPAQUE-EXEC-READONLY-001):
      # an inline interpreter payload the classifier cannot prove (python3/node
      # -c/-e with $VAR / $() / backtick expansion) is REFUSED with an actionable
      # remediation — modeled on protected-paths.sh: block THIS command and tell
      # the agent the sanctioned alternative — but it does NOT arm the sticky
      # session latch. Recall is unchanged (the command still never runs); only
      # the session-wide freeze + human-reset round-trip is removed, because the
      # safe fix (write the probe to a file by path, or use the Read tool) is
      # entirely in the agent's own hands. Keyed to the exact classifier reason
      # so it cannot swallow any other capability ask or a deny.
      if [[ "$SOURCE" == "capability" && "$REASON" == "opaque execution — cannot prove payload"* ]]; then
        # CAWS-GUARD-REMEDIATION-CROSS-REPO-CONSISTENCY-01: which remediation
        # is printable depends on where the payload would WRITE.
        #
        # "Write the probe to a script file and run it by path" is sound advice
        # for an ordinary opaque payload and it is the proximate cause of a
        # cross-repo write when it is not. In session 1aa3f0bd the agent was
        # refused a direct Bash write into a sibling repository, read this
        # sentence, wrote a script to /tmp, and ran it by path. The route the
        # sentence names is one bash-write-guard refuses — so a guard was
        # recommending what its sibling blocks, at the exact moment the agent
        # was looking for a way through. A remediation that names a refused
        # route is worse than no remediation: it reads as authorization, and it
        # comes from the guard itself.
        #
        # Three states, and the default is the conservative one:
        #   detector says cross-repo  -> name the repository, drop the route
        #   detector unavailable      -> drop the route (cannot prove it safe)
        #   detector says not cross-repo -> full remediation, route included
        _OPAQUE_XREPO=""
        _OPAQUE_DETECTOR="unavailable"
        if declare -F caws_bash_interpreter_foreign_repo >/dev/null 2>&1 &&
          declare -F caws_foreign_repo_root >/dev/null 2>&1; then
          _OPAQUE_DETECTOR="ok"
          _OPAQUE_XREPO="$(caws_bash_interpreter_foreign_repo \
            "$COMMAND" "${CAWS_PROJECT_DIR:-.}" "$(pwd)" "${HOME:-/nonexistent-home}" 2>/dev/null || true)"
        fi
        _OPAQUE_HEAD="CAWS command-safety: $REASON. This inline payload cannot be verified, so it is refused — but the session danger latch was NOT armed and you can proceed immediately by rewriting it."
        _OPAQUE_READ_ARM="for read-only inspection, use the Read tool / cat / jq against the file directly"
        _OPAQUE_LITERAL_ARM="if the payload is genuinely a literal with no \$VAR/\$()/backtick, inline it without shell interpolation"
        _OPAQUE_TAIL="Do NOT rephrase the same opaque -c/-e to evade this. Command was: $COMMAND"
        if [[ -n "$_OPAQUE_XREPO" ]]; then
          FULL_REASON="$_OPAQUE_HEAD This payload also names a write target inside a DIFFERENT git repository ($_OPAQUE_XREPO), and that — not the opacity — is the harder boundary: a cross-repository write is refused whether it comes from a direct Bash mutation, an inline interpreter payload, or a script file run by path, so rewriting this as a script would not help. Do this instead: (1) make the change from a session rooted in $_OPAQUE_XREPO, which is the only place that work is governed; or (2) $_OPAQUE_READ_ARM — a cross-repository READ is fine. $_OPAQUE_TAIL"
        elif [[ "$_OPAQUE_DETECTOR" != "ok" ]]; then
          FULL_REASON="$_OPAQUE_HEAD The shared target library (lib/bash-mutation-targets.sh) did not load, so this guard cannot tell whether the payload writes outside this repository and will not suggest a rewrite that might. Do this instead: (1) $_OPAQUE_READ_ARM; or (2) $_OPAQUE_LITERAL_ARM; or (3) restore the hook libs with \`caws init adapters install\` for the full remediation. $_OPAQUE_TAIL"
        else
          FULL_REASON="$_OPAQUE_HEAD Do this instead: (1) write the probe to a script file in your scope (e.g. a .py or .js file) and run it by path — file payloads are inspectable and are not opaque. A script file's write targets are adjudicated exactly as a direct write, so this makes the payload reviewable; it does not reach anywhere a direct write could not; or (2) $_OPAQUE_READ_ARM; or (3) $_OPAQUE_LITERAL_ARM. $_OPAQUE_TAIL"
        fi
        emit_block_json "$FULL_REASON"
        exit 0
      fi
      # Bare-commit staged-deletions carve-out
      # (CAWS-GUARD-COMMIT-DELETES-UNNAMED-001): a bare `git commit` whose
      # index stages deletions of tracked files — or whose staged state the
      # classifier could not verify — is REFUSED with the path-scoped
      # remediation, but it does NOT arm the sticky session latch. A commit
      # with no pathspec sweeps the ENTIRE index; under a stale or foreign
      # index that deletes tracked content under an unrelated message (two
      # real sweeps shipped this way). The safe fix — inspect the staged
      # set, then name the intended paths after `--` — is entirely in the
      # agent's own hands, so ordinary deletions get one refusal-with-
      # remediation, never a session freeze. Keyed on the classifier source
      # so it cannot swallow any other confirm-class ask.
      if [[ "$SOURCE" == "commit_deletions" ]]; then
        FULL_REASON="CAWS command-safety: $REASON. This command was refused — the session danger latch was NOT armed. Do this instead: (1) inspect what is actually staged: git status && git diff --cached --stat; (2) if the staged set is exactly what you intend, commit it with the paths named explicitly: git commit -m \"<msg>\" -- <paths>; (3) if the staged set contains work that is NOT yours (another session's files, a half-applied revert), STOP and ask the user before unstaging anything. Do NOT rephrase the same bare commit to evade this. Command was: $COMMAND"
        emit_block_json "$FULL_REASON"
        exit 0
      fi
      if [[ "$SOURCE" == "capability" ]]; then
        WARN_FILE="$(danger_warn_file "$SESSION_ID")"
        if [[ ! -f "$WARN_FILE" ]]; then
          mkdir -p "$(dirname "$WARN_FILE")"
          jq -n \
            --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --arg reason "$REASON" \
            --arg command "$COMMAND" \
            '{ts: $ts, hook: "block-dangerous.sh", kind: "capability-warn", reason: $reason, command: $command}' \
            > "$WARN_FILE" 2>/dev/null || true
          printf 'caws command-safety (WARN, first capability ask — not blocked): %s\n' "$REASON" >&2
          printf '  A SECOND capability-risk command this session will ARM the danger latch. Command was: %s\n' "$COMMAND" >&2
          exit 0
        fi
        record_danger_latch "$LATCH_FILE" "ask" "$REASON" "$COMMAND"
        FULL_REASON="CAWS command-safety: $REASON. This is the SECOND capability-risk command this session — the first was a non-blocking warning; this one ARMS the session danger latch. $_LATCH_SCOPE_NOTE — you CANNOT reset it yourself. Do not rephrase, wrap, reorder, alias, or indirectly invoke the command to evade this. Ask the USER to confirm and run: $RECOVERY_COMMAND, then proceed. Command was: $COMMAND"
        emit_block_json "$FULL_REASON"
        exit 0
      fi
      record_danger_latch "$LATCH_FILE" "ask" "$REASON" "$COMMAND"
      FULL_REASON="CAWS command-safety: $REASON. This requires USER CONFIRMATION before it runs and the session danger latch is NOW ARMED (fail-closed: the classifier could not verify this command). $_LATCH_SCOPE_NOTE — you CANNOT reset it yourself. Do not rephrase, wrap, reorder, alias, or indirectly invoke the command to evade this. Ask the USER to confirm and run: $RECOVERY_COMMAND, then proceed. Command was: $COMMAND"
      emit_block_json "$FULL_REASON"
      exit 0
    fi
    # advisory (and any non-confirm enforcement): non-blocking, exit 0.
    printf 'caws advisory (non-blocking): %s\n' "$REASON" >&2
    exit 0
    ;;
  *)
    record_danger_latch "$LATCH_FILE" "ask" "classifier unknown decision: $DECISION" "$COMMAND"
    FULL_REASON="CAWS command-safety: command classifier returned an unrecognized decision '$DECISION'. The session danger latch is NOW ARMED (fail-closed). $_LATCH_SCOPE_NOTE — you cannot reset it yourself. Ask the USER to run: $RECOVERY_COMMAND. Command was: $COMMAND"
    emit_ask_json "$FULL_REASON"
    exit 0
    ;;
esac

# shellcheck disable=SC2317
exit 0
