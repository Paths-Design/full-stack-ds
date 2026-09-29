#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 10,11,19
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# SessionStart dispatcher — shared core (surface-neutral).
#
# Fires once per session. Same fan-out semantics as pre_tool_use.sh and
# post_tool_use.sh: reads stdin once, exports HOOK_* env vars, invokes
# each registered handler with stdin piped and stderr prefixed.
#
# HANDLERS entries may carry a positional argument (e.g. "audit.sh
# session-start" — audit.sh's event type is an argv, not a field in
# the stdin payload). Entries are split on whitespace and passed as argv.
#
# SessionStart semantics: these hooks inform the agent about session
# state (CAWS briefing, audit log bootstrap, session-log meta file).
# None should block. Exit 2 is treated the same as exit 1 here —
# recorded as max_exit but does not short-circuit.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(dirname "$SCRIPT_DIR")"

# Export shared lib dir so caws_source_lib knows the shared fallback.
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

HANDLERS=(
  "audit.sh session-start"
  # "session-caws-status.sh session-start"
  "session-log.sh"
  # MULTI-AGENT-ACTIVITY-REGISTRY-001: self-register into the leases
  # substrate so other sessions can see this one. Non-blocking; refuses
  # silently when HOOK_SESSION_ID is empty or "unknown".
  "agent-register.sh"
)

# CAWS-REPO-HOOK-POLICY-PROJECT-WIRED-01: a repo may commit a compiled chain
# sidecar (dispatch/session_start.chain, written by `caws hooks compile` from
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
if declare -F caws_local_chain >/dev/null 2>&1 && caws_local_chain session_start; then
  HANDLERS=(${CAWS_LOCAL_CHAIN[@]+"${CAWS_LOCAL_CHAIN[@]}"})
fi

# CAWS-HOOKPACK-DISPATCH-EMPTY-HANDLERS-CRASH-001: guard the count before
# expanding "${HANDLERS[@]}" -- on bash 3.2 (macOS default /bin/bash),
# expanding an empty array under `set -u` throws "unbound variable" rather
# than a normal empty expansion. HANDLERS is a static literal today, but this
# keeps the invariant true if it ever becomes filterable like post_tool_use.sh.
if (( ${#HANDLERS[@]} > 0 )); then
  run_handlers "${HANDLERS[@]}"
else
  run_handlers
fi
