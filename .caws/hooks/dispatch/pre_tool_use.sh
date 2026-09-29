#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,11,17,19,22,23,24,26
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
# PreToolUse dispatcher — shared core (surface-neutral).
#
# Single entry point invoked from the vendor wiring's PreToolUse block. Reads
# stdin ONCE, sanitizes it via lib/parse-input.sh, then invokes every
# registered handler with HOOK_* env vars inherited and the sanitized
# JSON piped to each handler's stdin.
#
# The vendor wiring injects the surface identity before invoking this script:
#   CAWS_AGENT_SURFACE=<surface>  (e.g. claude-code | codex)
#   CAWS_PROJECT_DIR=<repo-root>  (replaces harness-specific PROJECT_DIR vars)
#
# lib/agent-surface.sh is sourced first to derive all surface-specific values
# (CAWS_VENDOR_DIR, CAWS_LOG_DIR, CAWS_PLATFORM_FLAG) from CAWS_AGENT_SURFACE.
# Individual handlers read those exported vars rather than branching on the
# surface name themselves.
#
# Handlers self-filter via their own matcher predicate (a case statement on
# $HOOK_TOOL_NAME at the top of the script).
#
# Exit-code aggregation:
#   - First handler exiting 2 short-circuits the remaining handlers and
#     the dispatcher returns 2 (blocking).
#   - Non-zero non-2 exits are warnings; the dispatcher continues and
#     returns the max non-2 code at the end.
#
# Fail posture (two distinct cases — CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001):
#   - A TRANSIENT error after the core libs load (a malformed payload that
#     parse_hook_input rejects) fails OPEN — exit 0 — so a guard hiccup never
#     blocks a legitimate tool call.
#   - A MISSING CORE LIB (agent-surface.sh / parse-input.sh / run-handlers.sh
#     absent) is NOT a transient bug: it means EVERY guard is disabled — the
#     danger latch, scope guard, and write guards never run. Silently exiting 0
#     there is the governance hole that disarmed enforcement in a consumer repo
#     whose agent-surface.sh was never vendored. That case fails LOUD + SAFE:
#     a self-identifying diagnostic to stderr and a block decision, so a broken
#     hook install surfaces as a recoverable refusal ("run caws init --adopt")
#     instead of silent, total loss of enforcement.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(dirname "$SCRIPT_DIR")"

# Export shared lib dir so caws_source_lib (defined in agent-surface.sh) knows
# where the shared fallback lives when invoked from handlers that inherit this
# environment. Must be set BEFORE sourcing agent-surface.sh.
export CAWS_SHARED_LIB_DIR="$HOOKS_DIR/lib"

# _caws_dispatch_missing_core <lib-basename>: fail LOUD + SAFE when a core
# enforcement lib is absent. Emits a diagnostic + a block decision and exits 2.
_caws_dispatch_missing_core() {
  echo "[pre_tool_use dispatcher] CAWS hook infrastructure incomplete: lib/$1 is missing — the guard chain (danger latch, scope, write guards) cannot run. Failing SAFE (blocking). Restore the shared hook libs with: caws init --adopt" >&2
  printf '{"decision":"block","reason":"CAWS PreToolUse dispatcher: core hook lib %s is missing, so no guard can run (the danger latch and scope/write guards are disabled). Failing safe rather than silently allowing every command. Restore the hook pack: caws init --adopt"}\n' "$1"
  exit 2
}

# Resolve surface-specific env (CAWS_VENDOR_DIR, CAWS_LOG_DIR, etc.)
# Also defines caws_source_lib used below. A MISSING agent-surface.sh leaves
# caws_source_lib undefined and would skip the whole chain at the next `||
# exit 0`; treat its absence as a broken install and fail loud + safe.
# shellcheck source=../lib/agent-surface.sh
if [[ -f "$HOOKS_DIR/lib/agent-surface.sh" ]]; then
  source "$HOOKS_DIR/lib/agent-surface.sh"
else
  _caws_dispatch_missing_core agent-surface.sh
fi

# shellcheck source=../lib/parse-input.sh
# Use caws_source_lib so a vendor adapter can override parse-input.sh
# (e.g. codex normalizes apply_patch -> Edit/Write). A missing parse-input.sh
# is a broken install (fail loud + safe); a parse FAILURE on a malformed
# payload is transient (fail open, exit 0).
caws_source_lib parse-input.sh 2>/dev/null || _caws_dispatch_missing_core parse-input.sh
parse_hook_input || exit 0

# shellcheck source=../lib/run-handlers.sh
# Use caws_source_lib so a vendor adapter can override run-handlers.sh
# (e.g. codex adds a deny exit-code arm). Missing -> broken install, fail safe.
caws_source_lib run-handlers.sh 2>/dev/null || _caws_dispatch_missing_core run-handlers.sh

# Registered handlers in execution order. Each handler self-filters
# on $HOOK_TOOL_NAME; non-matching cases return exit 0 cheaply.
#
# MULTI-AGENT-ACTIVITY-REGISTRY-001: agent-heartbeat.sh runs FIRST so the
# lease is refreshed and parallel-agent presence is surfaced even when a
# later guard short-circuits the chain with exit 2 (block). Heartbeat is
# non-blocking and never produces a "block" decision — its stdout is an
# additionalContext envelope (priority 1), so it does not outrank a real
# block from scope-guard / worktree-guard. The dispatcher's
# stdout-priority logic ensures a block from a later handler still wins.
HANDLERS=(
  agent-heartbeat.sh
  cwd-guard.sh
  block-dangerous.sh
  worktree-guard.sh
  scope-guard.sh
  worktree-write-guard.sh
  # WORKTREE-ISOLATION-HARDENING-001 (Fix 3): Bash mutation target authority.
  # Self-filters to Bash; extracts write targets for a narrow set of mutation
  # forms (redirection, tee, sed -i, rm/mv/cp, git restore, ...) and routes each
  # through the same worktree-claim-oracle as worktree-write-guard, so a Bash
  # mutation of a foreign worktree's payload blocks at the same boundary as a
  # foreign Write/Edit. Runs after worktree-write-guard (file-tool authority)
  # since the two cover disjoint tool surfaces.
  bash-write-guard.sh
  # worktree-pin-guard.sh (OPT-IN — Entry 41, CAWS-DEFECT-WORKTREE-ISOLATION-
  # PIN-RELEASE-01): pins a session whose project root is inside a worktree to
  # that worktree, refuses commands whose working directory resolves outside
  # it, and RELEASES the pin when the pinned directory no longer exists (so a
  # session that merges its own worktree is never bricked). Not wired by
  # default: it is a broad session-level cwd enforcement; uncomment to adopt.
  protected-paths.sh
  scan-secrets.sh
  # quiet-merge.sh MUST be the last interceptor: it emits
  # updatedInput which replaces any prior hook's updatedInput.
  # The hook itself self-filters to Bash + caws worktree merge|destroy
  # so non-matching tool calls are cheap exits.
  quiet-merge.sh
)

# CAWS-REPO-HOOK-POLICY-PROJECT-WIRED-01: a repo may commit a compiled chain
# sidecar (dispatch/pre_tool_use.chain, written by `caws hooks compile` from
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
if declare -F caws_local_chain >/dev/null 2>&1 && caws_local_chain pre_tool_use; then
  HANDLERS=(${CAWS_LOCAL_CHAIN[@]+"${CAWS_LOCAL_CHAIN[@]}"})
fi

# CAWS-HOOKPACK-DISPATCH-EMPTY-HANDLERS-CRASH-001: guard the count before
# expanding "${HANDLERS[@]}" -- on bash 3.2 (macOS default /bin/bash),
# expanding an empty array under `set -u` throws "unbound variable" rather
# than a normal empty expansion. HANDLERS is a static literal today, but this
# keeps the invariant true if it ever becomes filterable like post_tool_use.sh.
if (( ${#HANDLERS[@]} > 0 )); then
  run_handlers --short-circuit-on-block "${HANDLERS[@]}"
else
  run_handlers --short-circuit-on-block
fi
