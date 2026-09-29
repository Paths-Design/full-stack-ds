#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 4,8,13
# edit_stance: YOURS TO EDIT. This is a starting hook lib, not a locked one —
#   shape it to your repo. The CAWS-MANAGED-HOOK marker above is only how
#   caws init finds libs it can offer updates for; it is NOT a keep-out sign.
#
# CAWS Write Allowlist (shared lib).
# CAWS-GUARD-ALLOWLIST-SYNC-001.
#
# ONE source of truth for the unconditional-allow path set. Both
# worktree-write-guard.sh (Write/Edit arm) and bash-write-guard.sh (Bash
# mutation arm) call caws_is_write_allowlisted so the two guards return the
# SAME allow verdict for the SAME path — they cannot diverge by tool.
#
# Doctrine: docs/failure-lineage.md:888 lists the must-permit governance
# allowlist paths (.caws/specs/*, .caws/worktrees.json, .caws/policy.yaml,
# instruction files, docs/). The allowlist encodes that posture so a
# canonical-checkout coordination edit is not blocked regardless of which
# tool the agent reaches for.
#
# CRITICAL: this helper handles ONLY unconditional-allow paths. The
# .caws/worktrees/<name>/<rest> payload path is OWNERSHIP-CHECKED (routed
# through worktree-claim-oracle.cjs) and is deliberately EXCLUDED from this
# allowlist. If a path is on this allowlist, it is allowed with no further
# adjudication; if it is not, the caller still runs its oracle/claim logic.
#
# NOTE on bash case patterns and shell variables:
#   bash case patterns CANNOT expand shell variables, so the agent-state
#   home dir ("${HOME:-}/${CAWS_VENDOR_DIR}/") and the vendor hooks dir
#   ("$PROJECT_DIR/${CAWS_VENDOR_DIR}/") and CAWS_INSTRUCTION_FILES arms
#   are matched via [[ == ]] conditionals, not case patterns. Any future
#   allowlist arm that needs a variable must follow the same pattern.
#
# Requires (sourced by caller BEFORE calling the function):
#   - CAWS_VENDOR_DIR        (from lib/agent-surface.sh)
#   - CAWS_INSTRUCTION_FILES (from lib/agent-surface.sh; optional — empty ok)
#   - HOME                   (env; falls back to empty)
# Caller passes PROJECT_DIR as $2 (falls back to CAWS_PROJECT_DIR or '.').

# lib/guard-config.sh is pulled in HERE rather than by each caller, so that
# every guard reaching the allowlist gets the repo's configured prefixes
# without having to know they exist. A caller that forgot to source it would
# otherwise get shipped-only behavior while its sibling got the configured
# table — the exact desynchronization this lib exists to prevent.
#
# `[[ -f ]] &&` is required, not stylistic: under the callers' `set -euo
# pipefail`, `source <missing>` is a fatal builtin error that a trailing
# `|| true` does NOT catch (CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001). The test is
# exempt from `set -e` as a non-final member of an && list.
if [[ -f "$(dirname "${BASH_SOURCE[0]}")/guard-config.sh" ]]; then
  # shellcheck source=lib/guard-config.sh
  source "$(dirname "${BASH_SOURCE[0]}")/guard-config.sh"
  caws_guard_config_load "${CAWS_PROJECT_DIR:-.}" || true
fi

# caws_is_write_allowlisted <abs_path> [<project_dir>]
#   Returns 0 if <abs_path> is on the unconditional-allow list.
#   Returns 1 otherwise (caller proceeds to oracle/claim adjudication).
#   Never calls exit — the caller decides what an allow means in its context.
caws_is_write_allowlisted() {
  local file_path="$1"
  local project_dir="${2:-${CAWS_PROJECT_DIR:-.}}"

  # Nothing to check — not allowlisted, caller proceeds.
  [[ -n "$file_path" ]] || return 1

  # Normalize to absolute for the variable-based arms below. A relative path
  # is matched against the case patterns as-is (the worktree-write-guard
  # historically allowed relative forms like 'docs/x' alongside absolute).
  local file_path_abs="$file_path"
  case "$file_path" in
    /*) ;;
    *)  file_path_abs="" ;;  # leave empty; relative paths matched by case only
  esac

  # ── Agent-state home dir: $HOME/$CAWS_VENDOR_DIR/... ───────────────────
  # Must use [[ ]] because case patterns cannot expand CAWS_VENDOR_DIR.
  if [[ -n "$file_path_abs" && "$file_path_abs" == "${HOME:-}/${CAWS_VENDOR_DIR}/"* ]]; then
    return 0
  fi

  # ── Case-pattern arms (constant globs) ─────────────────────────────────
  # NOTE: .caws/worktrees/* is worktree PAYLOAD — ownership-checked by the
  # oracle in both guards, never unconditionally allowed. It MUST be excluded
  # here BEFORE the .caws/* arm, or payload paths would be swept up by .caws/*
  # and bypass worktree isolation. Returning 1 (not allowlisted) routes the
  # caller to its oracle/claim logic.
  case "$file_path" in
    "$project_dir"/.caws/worktrees/*|.caws/worktrees/*) return 1 ;;
  esac

  # ── Repo-declared additional allow prefixes (tier-2 guard config) ──────
  # Deliberately placed AFTER the worktree-payload exclusion above and never
  # before it. Configuration is append-only over the shipped table, and this
  # position is what makes that true of ORDER as well as of content: a repo
  # cannot re-admit .caws/worktrees/<name>/<payload> by declaring a prefix,
  # because that arm has already returned 1. Validation rejects `.caws` as a
  # reserved prefix too, so the property holds twice over — by ordering here
  # and by refusal at authoring time.
  #
  # Both guards that call this function inherit the entry together, which is
  # the point of the shared lib: bash-write-guard.sh and
  # worktree-write-guard.sh cannot disagree about a configured prefix any more
  # than they can about a shipped one (CAWS-GUARD-ALLOWLIST-SYNC-001).
  if declare -F caws_guard_prefixes >/dev/null 2>&1; then
    local _cfg_prefix
    while IFS= read -r _cfg_prefix; do
      [[ -z "$_cfg_prefix" ]] && continue
      if [[ "$file_path" == "$project_dir/$_cfg_prefix"* ]] || \
         [[ "$file_path" == "$_cfg_prefix"* ]]; then
        return 0
      fi
    done < <(caws_guard_prefixes write-allowlist.sh)
  fi

  case "$file_path" in
    "$project_dir"/.caws/*|.caws/*) return 0 ;;
    "$project_dir"/.gitignore|.gitignore) return 0 ;;
    "$project_dir"/.tmp/*|.tmp/*) return 0 ;;
    "$project_dir"/tmp/*|tmp/*) return 0 ;;
    "$project_dir"/.archive/*|.archive/*) return 0 ;;
    "$project_dir"/.githooks/*|.githooks/*) return 0 ;;
    "$project_dir"/.github/*|.github/*) return 0 ;;
    "$project_dir"/docs/*|docs/*) return 0 ;;
  esac

  # ── Vendor hooks dir: $PROJECT_DIR/$CAWS_VENDOR_DIR/... ────────────────
  # Must use [[ ]] because case patterns cannot expand CAWS_VENDOR_DIR.
  if [[ -n "$CAWS_VENDOR_DIR" ]]; then
    if [[ "$file_path" == "$project_dir/${CAWS_VENDOR_DIR}/"* ]] || \
       [[ "$file_path" == "${CAWS_VENDOR_DIR}/"* ]]; then
      return 0
    fi
  fi

  # ── Root instruction files (CAWS_INSTRUCTION_FILES) ────────────────────
  # Surface-derived (e.g. CLAUDE.md on claude-code, AGENTS.md on others).
  # Matched via [[ ]] because case patterns cannot expand variables.
  # Generalizes the former hardcoded CLAUDE.md arm so every surface's
  # instruction file gets the same allowlist treatment.
  if [[ -n "${CAWS_INSTRUCTION_FILES:-}" ]]; then
    local _instr
    for _instr in $CAWS_INSTRUCTION_FILES; do
      if [[ "$file_path" == "$project_dir/$_instr" ]] || \
         [[ "$file_path" == "$_instr" ]]; then
        return 0
      fi
    done
  fi

  # Not on the unconditional allowlist — caller proceeds to adjudication.
  return 1
}
