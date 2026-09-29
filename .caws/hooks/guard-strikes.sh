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
# Shared progressive strike handling for CAWS pre-write guard hooks.
#
# STRIKE-STATE KEYING (CAWS-DESIGN-GLOBAL-IDENTITY-HOME-001 A6):
# The counter is SESSION-GLOBAL, keyed by the RESOLVED session id in the
# global home:
#   ~/.caws/state/sessions/<sanitized-session>/strikes.json
# A session wedged in one repo stays wedged in every repo — the sidechain
# route-around (blocked in repo A, go edit repo B instead) does not exist.
# This REVERSES the per-checkout isolation of the pre-global-home model:
# cross-REPO wedge bleed is now the protected property (a wedge is a
# session property, not a repo property). Legacy repo-local strike files
# (vendor logs + worktree gitdirs) are read ONCE for continuity into the
# global record and never written again. An unresolved/unknown session is
# refused with a loud stderr note — no anonymous buckets.
#
# If you are reading this because a guard blocked you: editing this file (or the
# generated guard-strikes JSON) to BYPASS enforcement is the one edit the growth
# stance does not cover — it weakens the guard rather than growing it. The
# correct recovery paths are:
#   1. Switch into the right CAWS worktree.
#   2. Bring the target file into the active spec's scope.in (if it legitimately
#      belongs there), then ask the user to reset your strikes by running:
#        bash ${CAWS_HOOKS_DIR:-.caws/hooks}/reset-strikes.sh --current
#      or the equivalent narrower reset (see --help).
#   3. Ask the user to resolve the conflict explicitly.
# Never edit guard-strikes-*.json files by hand — use reset-strikes.sh so the
# reason is logged.

# This file is SOURCED by scope-guard.sh / worktree-guard.sh. Locate lib/
# relative to THIS file (BASH_SOURCE[0]) so the canonical emit primitives
# are available regardless of the sourcing hook's cwd
# (HOOK-LIB-CONSOLIDATION-001 T3a).
_GUARD_STRIKES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_VENDOR_DIR and caws_source_lib. Must come before caws_source_lib calls.
source "$_GUARD_STRIKES_DIR/lib/agent-surface.sh" 2>/dev/null || true
# shellcheck source=lib/emit.sh
# Use caws_source_lib so a vendor override is preferred over the shared default.
# guard-strikes.sh is sourced (not executed), so CAWS_SHARED_LIB_DIR is set either
# by the dispatcher or by agent-surface.sh's own location fallback.
caws_source_lib emit.sh 2>/dev/null || true

guard_worktree_state_dir() {
  local cwd_hint="${1:-}"
  local project_dir="${CAWS_PROJECT_DIR:-.}"
  local worktree_dir=""

  if [[ -n "$cwd_hint" ]] && [[ "$cwd_hint" =~ ^(.*\/\.caws\/worktrees\/[^/]+)($|/) ]]; then
    worktree_dir="${BASH_REMATCH[1]}"
  fi

  if [[ -z "$worktree_dir" ]] && [[ "$project_dir" =~ ^(.*\/\.caws\/worktrees\/[^/]+)($|/) ]]; then
    worktree_dir="${BASH_REMATCH[1]}"
  fi

  if [[ -z "$worktree_dir" ]] || [[ ! -d "$worktree_dir" ]]; then
    return 1
  fi

  # The strike file must NOT land in the worktree's WORKING TREE. A linked
  # worktree is its own working tree with its own `git status`; a strike file
  # written to `<worktree>/tmp/` shows up as `?? tmp/` and a routine
  # `git add -A` from inside the worktree sweeps it into the feature commit
  # (friction-probe Event 5, CAWS-GUARD-STRIKE-FILE-OUT-OF-TREE-001).
  #
  # Resolve the worktree's GITDIR instead — a linked worktree's `.git` is a
  # FILE whose single line is `gitdir: <canonical>/.git/worktrees/<name>`.
  # Anything under that directory is structurally outside every working tree,
  # so git can never track it. We parse the file directly (no `git` call:
  # these hooks are pure-bash by design and must not shell out).
  local git_pointer="$worktree_dir/.git"
  if [[ -f "$git_pointer" ]]; then
    local gitdir_line
    gitdir_line=$(grep -m1 '^gitdir:' "$git_pointer" 2>/dev/null || true)
    if [[ -n "$gitdir_line" ]]; then
      local gitdir="${gitdir_line#gitdir:}"
      # Trim leading whitespace from `gitdir: <path>`.
      gitdir="${gitdir#"${gitdir%%[![:space:]]*}"}"
      if [[ -n "$gitdir" ]] && [[ -d "$gitdir" ]]; then
        mkdir -p "$gitdir/caws-guard-strikes"
        printf '%s\n' "$gitdir/caws-guard-strikes"
        return 0
      fi
    fi
  fi

  # Could not resolve a gitdir (no .git file, unreadable, or not a linked
  # worktree). Signal the caller to fall back to the canonical vendor logs
  # location — never fail closed, and never re-introduce the in-tree leak.
  return 1
}

guard_global_strikes_file() {
  local session_id="$1"
  local safe_session

  if [[ -z "$session_id" || "$session_id" == "unknown" ]]; then
    printf 'guard-strikes: refusing to record strikes for an unresolved session (no identity, no wedge state)\n' >&2
    return 1
  fi

  safe_session=$(printf '%s' "$session_id" | tr -c 'A-Za-z0-9._-' '_')
  mkdir -p "${HOME:-/tmp}/.caws/state/sessions/${safe_session}"
  printf '%s/.caws/state/sessions/%s/strikes.json' "${HOME:-/tmp}" "$safe_session"
}

# Legacy repo-local strike files, read ONCE for continuity (never written).
_guard_legacy_strikes_files() {
  local project_dir="${CAWS_PROJECT_DIR:-.}"
  local cwd_hint="${2:-}"
  local session_id="$1"
  local safe_session
  safe_session=$(printf '%s' "$session_id" | tr -c 'A-Za-z0-9._-' '_')
  printf '%s/%s/logs/guard-strikes-%s.json\n' "$project_dir" "${CAWS_VENDOR_DIR:-.claude}" "$safe_session"
  local gitdir
  gitdir=$(guard_worktree_state_dir "$cwd_hint" 2>/dev/null || true)
  if [[ -n "$gitdir" ]]; then
    printf '%s/guard-strikes-%s.json\n' "$gitdir" "$safe_session"
  fi
}

guard_strikes_file() {
  guard_global_strikes_file "$1"
}

guard_record_strike() {
  local session_id="$1"
  local guard_name="$2"
  local cwd_hint="${3:-}"
  local state_file
  local current_count

  state_file=$(guard_strikes_file "$session_id" "$cwd_hint") || return 0
  if [[ ! -f "$state_file" ]]; then
    # First write: fold legacy repo-local counts into the global record
    # ONCE, read-only (the legacy files are never written again).
    local legacy_files=()
    local legacy_file
    while IFS= read -r legacy_file; do
      [[ -n "$legacy_file" && -f "$legacy_file" ]] && legacy_files+=("$legacy_file")
    done < <(_guard_legacy_strikes_files "$session_id" "$cwd_hint")
    if [[ ${#legacy_files[@]} -gt 0 ]] && command -v jq >/dev/null 2>&1; then
      jq -s 'reduce .[] as $o ({}; . * $o)' "${legacy_files[@]}" > "$state_file" 2>/dev/null || printf '{}\n' > "$state_file"
    else
      printf '{}\n' > "$state_file"
    fi
  fi

  current_count=$(jq -r --arg guard "$guard_name" '.[$guard] // 0' "$state_file" 2>/dev/null || printf '0')
  if [[ ! "$current_count" =~ ^[0-9]+$ ]]; then
    current_count=0
  fi

  current_count=$((current_count + 1))

  jq --arg guard "$guard_name" --argjson count "$current_count" '.[$guard] = $count' "$state_file" > "$state_file.tmp"
  mv "$state_file.tmp" "$state_file"

  printf '%s\n' "$current_count"
}

# Progressive-strike emitters: thin adapters over the canonical
# lib/emit.sh primitives. The progressive logic (warn -> ask -> block by
# strike count) stays here; the envelope JSON lives only in lib/emit.sh
# (HOOK-LIB-CONSOLIDATION-001 T3a).
guard_emit_warning_allow() { emit_additional_context "$1"; }
guard_emit_permission_ask() { emit_ask "$1"; }
guard_emit_block() { emit_block "$1"; }

guard_enforce_progressive_strikes() {
  local session_id="$1"
  local guard_name="$2"
  local cwd_hint="$3"
  local first_message="$4"
  local second_message="$5"
  local third_message="$6"
  local strike

  strike=$(guard_record_strike "$session_id" "$guard_name" "$cwd_hint")

  case "$strike" in
    1)
      guard_emit_warning_allow "$first_message"
      ;;
    2)
      guard_emit_permission_ask "$second_message"
      ;;
    *)
      guard_emit_block "$third_message"
      ;;
  esac
}
