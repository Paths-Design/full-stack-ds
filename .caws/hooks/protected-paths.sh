#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,16,23
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
# CAWS Protected Paths Guard
#
# Blocks direct Write/Edit access to:
#   - hook SCRIPTS under the shared pack's install directory (.caws/hooks/)
#     and any vendor-surface hooks dir (no agent-side hook editing):
#     *.sh, *.py, *.cjs — the executable guard artifacts
#   - strike-state files in vendor logs (no manual manipulation of
#     progressive-strike counters)
#
# The shared pack installs its executable guards to .caws/hooks/ for every
# agent surface; CAWS_VENDOR_DIR selects a separate, per-surface
# settings/config directory (e.g. .claude for claude-code) that is not
# generally where the guard scripts themselves live. Protecting only the
# vendor-dir path leaves the pack's actual install directory — where every
# live guard resides — unprotected, so this guard covers both.
#
# Documentation under the hooks dir (*.md — e.g. the installer-managed
# CLAUDE.md, or a hand-authored README.md) is NOT a guard artifact and is
# explicitly ADMITTED. The doctrine this hook enforces protects the
# executable guards from being removed or weakened, not the docs that
# describe them (CAWS-PROTECTED-PATHS-DOCS-NOT-SCRIPTS-001). Blocking a
# legitimate doc edit was the over-match defect: it refused the very
# CLAUDE.md `caws init` itself ships and re-writes, pushing the agent
# toward a bypass — the exact failure mode CAWS exists to prevent. This
# admission applies uniformly across every protected hooks directory,
# including .caws/hooks/ — .pristine/ baselines under .caws/hooks/ are
# written by the CAWS CLI process directly (never by an agent Write/Edit
# tool call), so no separate carve-out is needed for them.
#
# The match keys on the artifact CLASS, not the directory: docs are
# allowlisted, every other extension under the hooks dir stays blocked
# (fail-closed — an unrecognized extension defaults to protected).
#
# SECURITY NOTE: case patterns in bash cannot expand variables, so the
# vendor-dir pattern is written as a conditional using [[ == ]] with
# CAWS_VENDOR_DIR. The .caws/hooks/ pattern is a plain literal — that path
# is the pack's fixed install location, not surface-derived.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_VENDOR_DIR for protected-path matching — load-bearing. A fatal
# `source <missing>` under `set -euo pipefail` is NOT caught by `|| true`, so
# guard with an existence test and fail CLOSED if absent: a guard that protects
# hook files from edits must not silently disappear when its lib is missing
# (CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001).
if [[ -f "$SCRIPT_DIR/lib/agent-surface.sh" ]]; then
  source "$SCRIPT_DIR/lib/agent-surface.sh"
else
  echo "[protected-paths] CAWS hook infrastructure incomplete: lib/agent-surface.sh is missing — cannot resolve protected hook paths. Failing CLOSED (refusing the edit). Restore the shared hook libs with: caws init --adopt" >&2
  printf '{"decision":"block","reason":"CAWS protected-paths: cannot load lib/agent-surface.sh, so protected-path matching cannot run. Failing closed. Restore the hook pack: caws init --adopt"}\n'
  exit 2
fi
parse_hook_input
# Shared legibility helpers (identity prefix + escape-hatch naming) — same
# fail-soft pattern scope-guard.sh uses: absence degrades the message, never
# the enforcement.
[[ -f "$SCRIPT_DIR/lib/guard-message.sh" ]] && source "$SCRIPT_DIR/lib/guard-message.sh"

# Which write channel is this call arriving on?
#
# CAWS-PROTECTED-PATHS-BASH-CHANNEL-001: protection is a property of the PATH,
# not of the tool that reaches it. Keying this guard on Write|Edit alone left
# the entire shell channel open — `echo x > .caws/hooks/protected-paths.sh`,
# `sed -i` over a guard, `rm .caws/hooks/lib/write-allowlist.sh` were all
# admitted, so a guard could be disarmed by choosing a different tool. The
# other pre_tool_use handlers do not close it either: bash-write-guard.sh
# delegates admission to caws_is_write_allowlisted, which returns 0
# (unconditionally allowed) for `.caws/*`, and block-dangerous.sh protects one
# filename under the vendor hooks dir, not the pack's own install directory.
#
# Both channels are adjudicated by _protected_adjudicate below. Two matchers
# for one resource diverge, and the permissive one becomes the bypass — the
# failure shape CAWS-GUARD-ALLOWLIST-SYNC-001 already names.
case "$HOOK_TOOL_NAME" in
  Write|Edit) PROTECTED_CHANNEL="file" ;;
  Bash) PROTECTED_CHANNEL="bash" ;;
  *) exit 0 ;;
esac

if [[ "$PROTECTED_CHANNEL" == "file" && -z "$HOOK_FILE_PATH" ]]; then
  exit 0
fi
if [[ "$PROTECTED_CHANNEL" == "bash" && -z "${HOOK_COMMAND:-}" ]]; then
  exit 0
fi

FILE_PATH="${HOOK_FILE_PATH:-}"

# Match against every directory the shared pack actually installs guard
# scripts into: the pack's own install dir (.caws/hooks/, always — this is
# where every agent surface's guards physically live) and the vendor-surface
# hooks dir (case patterns cannot expand variables — CAWS-PROTECTED-PATHS-
# DOCS-NOT-SCRIPTS-001 original used literal .claude/hooks/; we generalize
# via CAWS_VENDOR_DIR for legacy layouts / per-surface staging).
# Patterns: .caws/hooks/  and  */${CAWS_VENDOR_DIR}/hooks/

_hooks_prefix_match() {
  # Returns 0 (true) if FILE_PATH is under the shared pack's install
  # directory or a vendor-surface hooks dir.
  # The system runtime's executables, adapters, policy overrides and reprieves
  # have the same boundary as the former project hook directory. CLI-mediated
  # installation/configuration is separate from an agent's direct file edit.
  #
  # CAWS-HOOKPACK-HOME-UNSET-ROOT-AUTHORITY-ALIAS-001: only derive machine_home
  # when a real home is known. With both CAWS_HOME and HOME absent, defaulting
  # to "" would make every machine_home/* pattern below a top-level absolute
  # prefix (e.g. "/bin/"*), matching unrelated real paths on the filesystem.
  # No home means no machine-home tier to match against, not a tier rooted at "/".
  local machine_home=""
  if [[ -n "${CAWS_HOME:-}" ]]; then
    machine_home="$CAWS_HOME"
  elif [[ -n "${HOME:-}" ]]; then
    machine_home="${HOME}/.caws"
  fi
  if [[ -n "$machine_home" ]]; then
    [[ "$FILE_PATH" == "$machine_home/bin/"* ]] && return 0
    [[ "$FILE_PATH" == "$machine_home/lib/"* ]] && return 0
    [[ "$FILE_PATH" == "$machine_home/surfaces/"* ]] && return 0
    [[ "$FILE_PATH" == "$machine_home/state/projects/"* ]] && return 0
    [[ "$FILE_PATH" == "$machine_home/state/adapter-runtime.json" ]] && return 0
    [[ "$FILE_PATH" == "$machine_home/state/sessions/"*/guard-reprieve-* ]] && return 0
  fi
  [[ "$FILE_PATH" == */.caws/hooks/* ]] || \
  [[ "$FILE_PATH" == ".caws/hooks/"* ]] || \
  [[ "$FILE_PATH" == */"${CAWS_VENDOR_DIR}"/hooks/* ]] || \
  [[ "$FILE_PATH" == "${CAWS_VENDOR_DIR}/hooks/"* ]]
}

_strikes_match() {
  # Returns 0 (true) if FILE_PATH is a guard-strikes JSON file.
  [[ "$FILE_PATH" == */"${CAWS_VENDOR_DIR}"/logs/guard-strikes-*.json ]] || \
  [[ "$FILE_PATH" == "${CAWS_VENDOR_DIR}/logs/guard-strikes-"*.json ]]
}

# The single adjudication both channels run, over whatever FILE_PATH currently
# holds. Blocks by exiting 2; returns 0 when the path is not protected.
_protected_adjudicate() {
if _hooks_prefix_match; then
  # Check if it's a doc (*.md) — docs are admitted.
  case "$FILE_PATH" in
    *.md)
      # Documentation under the hooks dir (CLAUDE.md, README.md, ...) is not a
      # guard artifact. Admit it — the doctrine protects executable guards, not
      # the docs describing them (CAWS-PROTECTED-PATHS-DOCS-NOT-SCRIPTS-001).
      #
      # `return 0`, not `exit 0`: on the Bash channel one command can name
      # several targets, and admitting a doc must not stop the loop before it
      # has adjudicated the rest — `sed -i s/x/y/ hooks/README.md hooks/g.sh`
      # would otherwise pass on the strength of its first operand.
      return 0
      ;;
    *)
      # Everything else under the hooks dir is a guard artifact (*.sh, *.py,
      # *.cjs, lib/, caws_dispatch/, or an unrecognized extension). Fail closed.
      echo "BLOCKED: $FILE_PATH is protected." >&2
      echo "Ask the user for permission before editing CAWS hook scripts." >&2
      if command -v guard_reprieve_hint >/dev/null 2>&1; then
        guard_reprieve_hint protected-paths.sh >&2
      fi
      # exit 2, not 1: the Claude Code PreToolUse protocol treats ONLY exit 2
      # as a block. Exit 1 is a non-blocking error — the dispatcher (which
      # returns the max handler exit code) reports failure, but the tool call
      # itself still proceeds, silently defeating the "BLOCKED" message above.
      # The missing-lib branch above and the strike-state branch below both
      # already exit 2; this keeps this branch consistent with them and with
      # its own diagnostic.
      exit 2
      ;;
  esac
fi

if _strikes_match; then
  echo "BLOCKED: $FILE_PATH is protected guard state." >&2
  echo "Do not edit strike counters by hand to bypass enforcement." >&2
  echo "If the scope was legitimately corrected and prior strikes are stale, ask the user to run:" >&2
  echo "  bash ${CAWS_HOOKS_DIR:-.caws/hooks}/reset-strikes.sh --current" >&2
  echo "(or --session <uuid> / --worktree <name> / --all --confirm; resets are logged)." >&2
  echo "Otherwise switch into the correct worktree, update the active CAWS spec scope, or ask the user for direction." >&2
  if command -v guard_reprieve_hint >/dev/null 2>&1; then
    guard_reprieve_hint protected-paths.sh >&2
  fi
  exit 2
fi

return 0
}

if [[ "$PROTECTED_CHANNEL" == "file" ]]; then
  _protected_adjudicate
  exit 0
fi

# ── Bash channel ───────────────────────────────────────────────────────────
# Reuse the shared mutation-target recognizer rather than re-deriving which
# commands write: a private parser here would drift from the one the write
# guards use, and the looser of the two becomes the bypass.
#
# Fail CLOSED on a missing lib, matching this guard's agent-surface.sh posture
# above. A guard whose whole job is keeping hook files un-editable must not
# quietly stop adjudicating a channel when a dependency disappears.
if [[ -r "$SCRIPT_DIR/lib/bash-mutation-targets.sh" ]]; then
  # shellcheck source=lib/bash-mutation-targets.sh
  source "$SCRIPT_DIR/lib/bash-mutation-targets.sh"
fi
if ! declare -F caws_bash_mutation_candidates >/dev/null 2>&1; then
  echo "[protected-paths] CAWS hook infrastructure incomplete: lib/bash-mutation-targets.sh is missing or did not load — cannot extract Bash mutation targets, so a shell write to a protected hook path cannot be detected. Failing CLOSED. Restore the shared hook libs with: caws init adapters install" >&2
  printf '{"decision":"block","reason":"CAWS protected-paths: cannot load lib/bash-mutation-targets.sh, so Bash-channel protected-path matching cannot run. Failing closed. Restore the hook pack: caws init adapters install"}\n'
  exit 2
fi

while IFS= read -r _candidate; do
  [[ -n "$_candidate" ]] || continue
  FILE_PATH="$_candidate"
  _protected_adjudicate
done < <(caws_bash_mutation_candidates "$HOOK_COMMAND")

exit 0
