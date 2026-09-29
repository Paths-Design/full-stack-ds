#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,16,25,27,28,29,30,31
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# PostToolUse dispatcher — shared core (surface-neutral).
#
# Single entry point invoked from the vendor wiring's PostToolUse block. Reads
# stdin ONCE, sanitizes via lib/parse-input.sh, then invokes every registered
# handler with HOOK_* env vars inherited and the sanitized JSON piped to each
# handler's stdin.
#
# Differences from pre_tool_use.sh:
#   - HANDLERS entries may carry a positional argument (e.g. "audit.sh
#     tool-use"). Entries are split on whitespace and passed to the
#     handler as argv, so existing scripts that dispatch on $1 keep
#     working without change.
#   - Exit 2 is a no-op for PostToolUse semantically (the tool has
#     already run) but we still honor it to short-circuit the chain and
#     propagate the blocker's stderr, matching the pre-tool-use contract.
#
# Stdout: last non-empty handler buffer wins. Most PostToolUse handlers
# write hookSpecificOutput JSON (quality-check, validate-spec, naming,
# doc-frontmatter). Since each of those self-filters on file type, only
# one of them emits stdout for any given Write/Edit. If two ever collide
# (e.g., a YAML file that happens to match both the spec validator and
# the naming check), the later-in-HANDLERS wins. Order below is set so
# the more informative check runs last.
#
# Stderr: prefixed with "[<handler>]" so the source of any message is
# visible to the agent.
#
# Fail-open: parser or lib failure returns exit 0 silently.
#
# Per-surface HANDLERS note: certain surfaces disable specific handlers. The
# current HANDLERS list reflects the claude-code defaults. A codex adapter
# would omit quality-check.sh (disabled on codex). When per-surface override
# lists are implemented, this file will be the base and the surface adapter
# will carry only its delta.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(dirname "$SCRIPT_DIR")"

# Export shared lib dir so caws_source_lib knows the shared fallback.
# Must be set before sourcing agent-surface.sh.
export CAWS_SHARED_LIB_DIR="$HOOKS_DIR/lib"

# Resolve surface-specific env (CAWS_VENDOR_DIR, CAWS_LOG_DIR, etc.)
# Also defines caws_source_lib used below.
# shellcheck source=../lib/agent-surface.sh
source "$HOOKS_DIR/lib/agent-surface.sh" 2>/dev/null || true

# shellcheck source=../lib/parse-input.sh
caws_source_lib parse-input.sh 2>/dev/null || exit 0
parse_hook_input || exit 0

# shellcheck source=../lib/run-handlers.sh
caws_source_lib run-handlers.sh 2>/dev/null || exit 0

# Registered handlers in execution order. Mirrors the pre-registry
# vendor wiring groups so ordering-sensitive behavior (stdout "last
# wins" policy, audit log ordering) is preserved.
#
# Per-surface HANDLERS skip: CAWS_DISABLED_HANDLERS is a colon-separated
# list of handler basenames to skip. Vendor wiring (or override lib files)
# can set this to suppress surface-specific entries without forking the
# dispatcher. Example: codex sets CAWS_DISABLED_HANDLERS=quality-check.sh
# in its hooks.json command invocation prefix.
#   CAWS_DISABLED_HANDLERS=quality-check.sh CAWS_AGENT_SURFACE=codex ...
# The filter is applied at dispatch time, not at install time, so no
# additional file is needed to express the difference.
_DISABLED="${CAWS_DISABLED_HANDLERS:-}"

_is_handler_disabled() {
  local h="$1"
  [[ -z "$_DISABLED" ]] && return 1
  local entry
  # Split colon-separated list and check exact matches.
  IFS=: read -ra _disabled_arr <<< "$_DISABLED"
  for entry in "${_disabled_arr[@]}"; do
    [[ "$entry" == "$h" ]] && return 0
  done
  return 1
}

_ALL_HANDLERS=(
  # "quality-check.sh"
  # Note: codex disables quality-check.sh by setting
  #   CAWS_DISABLED_HANDLERS=quality-check.sh
  # in its vendor wiring command prefix. This shared base includes it
  # commented out (disabled by default for all surfaces). Enable by
  # un-commenting AND removing it from CAWS_DISABLED_HANDLERS.
  # "validate-spec.sh"
  "naming-check.sh"
  # -- QG-HOOKS-EXTRACT-001: advisory edit-time quality plane --
  # Each self-filters by tool + file type and emits at most one
  # additionalContext block; all are advisory (exit 0) except
  # shortcut-language-check, which escalates via guard-strikes on the
  # third session strike. Independent of `caws gates run` (option-C
  # doctrine: gates run is the governed policy-gate runner; these are
  # installed hook-pack utilities the repo tunes via env).
  "god-object-check.sh"
  "shortcut-language-check.sh"
  "duplicate-export-check.sh"
  "loc-delta-check.sh"
  # "doc-frontmatter-check.sh"
  # "audit.sh tool-use"
  "plan-transcript-snapshot.sh"
  "session-log.sh"
)

# Build the effective HANDLERS list, filtering disabled entries.
HANDLERS=()
for _h in "${_ALL_HANDLERS[@]}"; do
  # Extract basename (first whitespace-delimited token) for the disable check.
  _h_base="${_h%% *}"
  if ! _is_handler_disabled "$_h_base"; then
    HANDLERS+=("$_h")
  fi
done
unset _h _h_base _DISABLED _disabled_arr

# CAWS-REPO-HOOK-POLICY-PROJECT-WIRED-01: a repo may commit a compiled chain
# sidecar (dispatch/post_tool_use.chain, written by `caws hooks compile` from
# .caws/hooks/hook-policy.json) that REPLACES the array above. This is the
# project-wired counterpart of the machine launcher's policy tier — without it
# a repo's committed policy would govern only the two machine-routed surfaces
# and silently not the five wired to this dispatcher.
#
# The array above is left INTACT rather than regenerated: rewriting it would
# put this managed pack file permanently in `managed_drift`, so `caws init`
# would refuse every future upstream dispatcher fix.
#
# Absent sidecar -> stock array, one stat. Absent lib -> stock array, via the
# `declare -F` guard, so a partially upgraded pack still dispatches. A
# MALFORMED sidecar is the one case that does not degrade: caws_local_chain
# blocks and exits 2 rather than running a partial guard chain.
if [[ -f "$HOOKS_DIR/lib/local-chain.sh" ]]; then
  # shellcheck source=../lib/local-chain.sh
  source "$HOOKS_DIR/lib/local-chain.sh"
fi
if declare -F caws_local_chain >/dev/null 2>&1 && caws_local_chain post_tool_use; then
  HANDLERS=(${CAWS_LOCAL_CHAIN[@]+"${CAWS_LOCAL_CHAIN[@]}"})
fi

# CAWS-HOOKPACK-DISPATCH-EMPTY-HANDLERS-CRASH-001: guard the count before
# expanding "${HANDLERS[@]}" -- on bash 3.2 (macOS default /bin/bash),
# expanding an empty array under `set -u` throws "unbound variable" rather
# than a normal empty expansion. Disabling every handler above is a real,
# supported configuration (see CAWS_DISABLED_HANDLERS above), not a
# theoretical one.
if (( ${#HANDLERS[@]} > 0 )); then
  run_handlers "${HANDLERS[@]}"
else
  run_handlers
fi
