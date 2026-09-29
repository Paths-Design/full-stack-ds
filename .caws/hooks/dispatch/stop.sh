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
# Stop dispatcher — shared core (surface-neutral).
#
# Fires at end of session. Same fan-out semantics as the other dispatchers.
# Handlers here finalize session artifacts: audit log closeout, worktree
# cleanup reminder, plan-transcript finalize, session-log handoff.
#
# Stop semantics: EXIT CODES here are advisory. All non-zero exits are treated
# as warnings; max_exit is reported but no handler short-circuits the chain,
# because the finalizers must all get to run even when one of them fails.
#
# That is a statement about exit codes, NOT about stdout. A handler may still
# emit a hard control decision ({"decision":"block"}) on stdout, which
# run_handlers forwards with priority over any advisory context. Today exactly
# one handler does: goal-ac-gate.sh (CAWS-GOAL-AC-STOP-GATE-01), which refuses
# the stop while the session's bound spec has unproven acceptance criteria.
# A blocking handler here does not end the session — it tells the agent to keep
# working — so the finalizers still running afterwards is correct, not a leak.

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
  # "audit.sh stop"
  # "stop-worktree-check.sh"
  # CAWS-GOAL-AC-STOP-GATE-01: the one handler here that may emit a hard
  # control decision. Inert unless `caws goal set <spec-id>` wrote a binding
  # for this session; then it blocks the stop while any acceptance criterion
  # of the bound spec is unmet. Runs first so its decision is on stdout
  # before the finalizers append advisory context.
  "goal-ac-gate.sh"
  "plan-transcript-finalize.sh"
  "session-log.sh"
  # MULTI-AGENT-ACTIVITY-REGISTRY-001: mark our lease as stopped so other
  # sessions can distinguish "stopped cleanly" from "went stale and is
  # presumed dead." Non-blocking; refuses silently when HOOK_SESSION_ID
  # is empty or "unknown".
  "agent-stop.sh"
)

# CAWS-REPO-HOOK-POLICY-PROJECT-WIRED-01: a repo may commit a compiled chain
# sidecar (dispatch/stop.chain, written by `caws hooks compile` from
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
if declare -F caws_local_chain >/dev/null 2>&1 && caws_local_chain stop; then
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
