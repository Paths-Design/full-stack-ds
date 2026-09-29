#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: (new — CAWS-SESSION-RESOLVER-GUARD-DIVERGENCE-001)
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# Session-id resolver — the SHELL-SIDE single source of truth for "what is the
# current session id?" across every hook that needs to compare against a
# worktree owner.
#
# WHY THIS EXISTS (CAWS-SESSION-RESOLVER-GUARD-DIVERGENCE-001). Before this lib,
# three shell surfaces each re-implemented their own session-id precedence, and a
# fourth (the write guards) passed ONLY HOOK_SESSION_ID to the ownership oracle.
# The TS resolver (resolve-session.ts) used yet another, broader chain. The four
# chains disagreed, so the surface that STAMPED an owner (worktree create, via the
# resolver) and the surface that CHECKED an owner (the guards, via the oracle)
# read different sources — and whenever they disagreed the rightful owner was
# treated as foreign (false block_foreign_worktree), or, worse, a foreign session
# could be treated as owner-self. This lib is the shell half of the fix: ONE
# env-var precedence every shell surface consults, mirroring the resolver's chain.
#
# THE CANONICAL PRECEDENCE (env vars only; shell cannot scan disk):
#   1. CLAUDE_SESSION_ID     — operator override (deliberate; always wins)
#   2. CLAUDE_CODE_SESSION_ID — Claude Code harness UUID; survives the agent-Bash
#                               tool boundary (HOOK_SESSION_ID does not)
#   3. CODEX_THREAD_ID        — Codex harness per-thread id; survives the tool
#                               boundary. THE fix for the codex incident: codex
#                               exports this, not CLAUDE_*_SESSION_ID.
#   4. QWEN_CODE_SESSION_ID   — Qwen Code harness session UUID (probed live on
#                               0.21.4); survives the tool boundary.
#   5. CAWS_SESSION_ID        — generic CAWS escape hatch (any harness)
#   6. HOOK_SESSION_ID        — the hook-envelope id (set only inside the hook's
#                               own shell; does NOT propagate to agent-Bash)
#   7. CURSOR_TRACE_ID        — cursor low-stability fallback
#   → "unknown" sentinel when nothing is set (the resolver refuses this literal).
#
# This MUST stay in lockstep with resolve-session.ts's env-var tiers
# (claude_env → claude_code_env → codex_thread_env → qwen_env → caws_env →
# hook_env → cursor_env). If you add a source to one, add it to the other.
#
# SURFACE DISPATCH. Each harness exports a DIFFERENT per-session id under a
# DIFFERENT env var. Rather than branch on a hardcoded harness name (architecture
# invariant: the shared core must not), this chain simply consults every known
# per-surface var in priority order. The first non-empty, non-"unknown" value
# wins — and because each harness only sets its OWN var, there is no collision
# across concurrent surfaces in the same shell.
#
# IDEMPOTENT: safe to source multiple times.

if [[ -n "${_CAWS_SESSION_ID_SH_LOADED:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi
_CAWS_SESSION_ID_SH_LOADED=1

# resolve_caws_session_id — print the current session id per the canonical
# precedence, or "unknown" if no source is set. Pure function (no side effects,
# no exports) so callers can compose it. Callers that need the id as a variable:
# s="$(resolve_caws_session_id)".
#
# Precedence (CAWS-DEFECT-SESSION-IDENTITY-ENV-SHADOWING-01; mirrors the TS
# resolver resolve-session.ts so shell + TS agree on identity by construction):
#   1. the LIVE agent-PID record — the trust ANCHOR. When a start-time-guarded
#      record for this process exists, it wins over any env/payload
#      disagreement (it was written under this process; spoofing it requires
#      owning the PID, and killing the PID kills the agent). A disagreement
#      with env/payload is surfaced on stderr naming both ids.
#   2. $1 payload id (harness-stamped stdin session_id)
#   3. the surface-PINNED var: when CAWS_AGENT_SURFACE names the dispatching
#      platform, that surface's own env var wins and foreign vars cannot
#      shadow it (a stray CLAUDE_SESSION_ID in a dsh process no longer
#      rewrites self).
#   4. CAWS_SESSION_ID — the canonical var (operator override or normalized
#      upstream by caws_normalize_session_env)
#   5. the per-surface env chain (CLAUDE_SESSION_ID / CLAUDE_CODE_SESSION_ID /
#      CODEX_THREAD_ID / QWEN_CODE_SESSION_ID / DSH_SESSION_ID /
#      HOOK_SESSION_ID / CURSOR_TRACE_ID)
# Returns "unknown" when no source resolves — deliberately. The former
# capsule-glob fallback tier is REMOVED (doctrine shift from
# CAWS-SESSION-SHELL-RESOLVER-CAPSULE-001): a first-match glob manufactured
# identity with no process correlation. The TS resolver keeps its
# caller-pointer-correlated capsule tier for the interactive owner; the shell
# resolver refuses to guess. Verbs fail loudly on "unknown" instead.
_caws_env_or_payload_id() {
  local payload_id="${1:-}"
  # The hook payload's session_id is the most authoritative env-class source
  # when present (it is what the harness stamped on THIS tool call).
  if [[ -n "$payload_id" && "$payload_id" != "unknown" ]]; then
    printf '%s\n' "$payload_id"
    return 0
  fi
  # Surface-pinned precedence: the dispatcher knows the true platform; a
  # foreign surface's var must not shadow it. The pin map derives from the
  # registry via the generated snippet (A5); the local case is the fallback
  # for environments that predate the snippet.
  local pinned_var=""
  if declare -F _caws_surface_pin_var >/dev/null 2>&1; then
    pinned_var="$(_caws_surface_pin_var "${CAWS_AGENT_SURFACE:-}")" || pinned_var=""
  else
    case "${CAWS_AGENT_SURFACE:-}" in
      claude-code) pinned_var="CLAUDE_SESSION_ID" ;;
      codex) pinned_var="CODEX_THREAD_ID" ;;
      qwen-code) pinned_var="QWEN_CODE_SESSION_ID" ;;
      dsh) pinned_var="DSH_SESSION_ID" ;;
      *) pinned_var="" ;;
    esac
  fi
  if [[ -n "$pinned_var" ]]; then
    local pinned_val
    pinned_val="$(printf '%s' "${!pinned_var:-}")"
    if [[ -n "$pinned_val" && "$pinned_val" != "unknown" ]]; then
      printf '%s\n' "$pinned_val"
      return 0
    fi
  fi
  # The canonical var: normalized upstream or operator-set.
  if [[ -n "${CAWS_SESSION_ID:-}" && "${CAWS_SESSION_ID}" != "unknown" ]]; then
    printf '%s\n' "$CAWS_SESSION_ID"
    return 0
  fi
  if [[ -n "${CLAUDE_SESSION_ID:-}" ]]; then
    printf '%s\n' "$CLAUDE_SESSION_ID"
    return 0
  fi
  if [[ -n "${CLAUDE_CODE_SESSION_ID:-}" && "${CLAUDE_CODE_SESSION_ID}" != "unknown" ]]; then
    printf '%s\n' "$CLAUDE_CODE_SESSION_ID"
    return 0
  fi
  if [[ -n "${CODEX_THREAD_ID:-}" && "${CODEX_THREAD_ID}" != "unknown" ]]; then
    printf '%s\n' "$CODEX_THREAD_ID"
    return 0
  fi
  if [[ -n "${QWEN_CODE_SESSION_ID:-}" && "${QWEN_CODE_SESSION_ID}" != "unknown" ]]; then
    printf '%s\n' "$QWEN_CODE_SESSION_ID"
    return 0
  fi
  if [[ -n "${DSH_SESSION_ID:-}" && "${DSH_SESSION_ID}" != "unknown" ]]; then
    printf '%s\n' "$DSH_SESSION_ID"
    return 0
  fi
  if [[ -n "${HOOK_SESSION_ID:-}" && "${HOOK_SESSION_ID}" != "unknown" ]]; then
    printf '%s\n' "$HOOK_SESSION_ID"
    return 0
  fi
  if [[ -n "${CURSOR_TRACE_ID:-}" ]]; then
    printf '%s\n' "$CURSOR_TRACE_ID"
    return 0
  fi
  return 1
}

resolve_caws_session_id() {
  local resolved=""
  resolved="$(_caws_env_or_payload_id "${1:-}")" || resolved=""

  # The agent-PID record tier is the trust anchor: a LIVE, start-time-guarded
  # record for this process outranks any env/payload disagreement. Kill the
  # PID and the identity dies with it — that is the whole spoofing defense.
  local _caws_sid_dir="${CAWS_PROJECT_DIR:-}"
  if [[ -z "$_caws_sid_dir" || "$_caws_sid_dir" == "." ]]; then
    local _caws_self="${BASH_SOURCE[0]:-}"
    if [[ -n "$_caws_self" ]]; then
      _caws_sid_dir="$(cd "$(dirname "$_caws_self")/../../.." 2>/dev/null && pwd)"
    fi
  fi
  if [[ -n "$_caws_sid_dir" ]]; then
    if ! declare -F read_session_id_from_agent_pid >/dev/null 2>&1; then
      local _caws_self2="${BASH_SOURCE[0]:-}"
      [[ -n "$_caws_self2" ]] && source "$(dirname "$_caws_self2")/agent-pid.sh" 2>/dev/null || true
    fi
    if declare -F read_session_id_from_agent_pid >/dev/null 2>&1; then
      local _caws_pid_sid
      _caws_pid_sid="$(read_session_id_from_agent_pid \
        "${_caws_sid_dir}/.caws" "${CAWS_AGENT_PROCESS_NAMES:-}")"
      if [[ -n "$_caws_pid_sid" && "$_caws_pid_sid" != "unknown" ]]; then
        if [[ -n "$resolved" && "$resolved" != "$_caws_pid_sid" ]]; then
          printf 'Warning: session identity disagreement — env/payload resolved %s but the live agent-PID record for this process says %s; trusting the PID record (it was written under this process).\n' \
            "$resolved" "$_caws_pid_sid" >&2
        fi
        printf '%s\n' "$_caws_pid_sid"
        return 0
      fi
    fi
  fi

  if [[ -n "$resolved" ]]; then
    printf '%s\n' "$resolved"
    return 0
  fi
  printf '%s\n' "unknown"
}

# caws_normalize_session_env — resolve once and export the result as the
# canonical CAWS_SESSION_ID so every handler and child process in this
# dispatch reads ONE variable (CAWS-DEFECT-SESSION-IDENTITY-ENV-SHADOWING-01).
# Call it DIRECTLY (not in a $(...) subshell) from the dispatch entry; a
# pre-resolved id may be passed to avoid re-resolution. "unknown" is NOT
# exported — an unresolved identity stays absent, never canonicalized into a
# lie.
caws_normalize_session_env() {
  local id="${1:-}"
  if [[ -z "$id" || "$id" == "unknown" ]]; then
    id="$(resolve_caws_session_id)"
  fi
  if [[ -n "$id" && "$id" != "unknown" ]]; then
    export CAWS_SESSION_ID="$id"
    printf '%s\n' "$id"
  fi
  return 0
}

# resolve_caws_session_id_with_payload — convenience wrapper for guards that
# have HOOK_SESSION_ID already populated from the hook payload but ALSO need to
# fall back to the boundary-crossing vars when HOOK_SESSION_ID is absent (the
# agent-Bash case). Prints the resolved id. Identical to resolve_caws_session_id
# with HOOK_SESSION_ID as the payload argument; kept as a named entry point so
# call sites read clearly.
resolve_caws_session_id_with_payload() {
  resolve_caws_session_id "${1:-${HOOK_SESSION_ID:-}}"
}
