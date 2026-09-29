#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 6,21,36
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it. The CAWS-MANAGED-HOOK marker above is only how caws init finds
#   hooks it can offer updates for. One edit to avoid: gutting a guard to dodge a
#   block instead of fixing the cause.
#
# CAWS Working-Tree Overlap Guard (shared, WORKING-TREE-PROVENANCE-GUARD-001).
#
# Refuses cleanup commands (git stash / git stash push, git restore <path>,
# git checkout -- <path>, git clean -f/-fd/-fdx) when ANOTHER active session's
# claimed_paths / last_modified_paths overlap the working tree. The operator
# must explicitly ack each session+path before the cleanup proceeds, via
# `caws working-tree ack --session <id> --paths <p> [--target <cmd>]`.
#
# This is the shared-checkout multi-session complement to the worktree-active
# block that worktree-guard.sh already enforces. It does NOT remove that block;
# it ADDS the stronger overlap-aware case. Advisory/refusal only — never
# authority; it does not change scope, claim, ownership, or lifecycle state.
#
# Fallback (not silent): if the overlap predicate/CLI cannot run (e.g. an older
# caws without `working-tree check`, or no metadata), the hook admits and emits
# a stderr diagnostic noting the stronger predicate is dormant; worktree-active
# protection still applies via worktree-guard.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
if [[ -f "$SCRIPT_DIR/lib/agent-surface.sh" ]]; then
  source "$SCRIPT_DIR/lib/agent-surface.sh"
else
  echo "[working-tree-guard] CAWS hook infrastructure incomplete: lib/agent-surface.sh is missing — cannot resolve project dir. Failing CLOSED." >&2
  printf '{"decision":"block","reason":"CAWS working-tree-guard: cannot load lib/agent-surface.sh. Failing closed. Restore the hook pack: caws init --adopt"}\n'
  exit 2
fi
# shellcheck source=lib/emit.sh
caws_source_lib emit.sh 2>/dev/null || true

parse_hook_input
TOOL_NAME="$HOOK_TOOL_NAME"
COMMAND="$HOOK_COMMAND"
if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
  exit 0
fi

PROJECT_DIR="$(resolve_canonical_dir "${CAWS_PROJECT_DIR:-.}")"

# Only cleanup-command catalog. Everything else is handled by other guards.
if ! echo "$COMMAND" | grep -qE '(^|[;|&() ])(git[[:space:]]+(stash([[:space:]]+push)?|restore([[:space:]]+.*)?|checkout([[:space:]]+--|-[a-z]+[[:space:]]+--)|clean[[:space:]]+-f))'; then
  exit 0
fi

# CAWS_BIN (hook-pack test seam) else the on-PATH caws.
CAWS_BIN="${CAWS_BIN:-caws}"

# Run the overlap predicate. If the CLI lacks `working-tree check` (older build),
# it exits 2 — fall back to admitting (worktree-guard.sh still covers the
# worktree case) with a visible note.
OVERLAP_JSON="$("$CAWS_BIN" working-tree check --json 2>/dev/null)" || {
  echo "[working-tree-guard] working-tree overlap predicate unavailable (older caws?); falling back to worktree-active protection only." >&2
  exit 0
}

# overlap:true => another session overlaps; exit code 1.
if echo "$OVERLAP_JSON" | grep -q '"overlap":true'; then
  # Build a compact ack hint from the report's overlap entries.
  ACK_HINT=""
  while IFS= read -r line; do
    session_id="$(echo "$line" | sed -n 's/.*"session_id": *"\([^"]*\)".*/\1/p')"
    if [[ -n "$session_id" ]]; then
      ACK_HINT="${ACK_HINT}caws working-tree ack --session ${session_id} --paths <overlap-path>"
    fi
  done < <(echo "$OVERLAP_JSON" | tr -d '\n' | sed 's/},{/}\n{/g')
  printf '{"decision":"block","reason":"CAWS working-tree-guard: another active session has dirty overlap in this working tree; refusing the cleanup. Inspect with `caws working-tree check`, then acknowledge each session+path explicitly: %s"}\n' "$ACK_HINT"
  exit 2
fi

exit 0
