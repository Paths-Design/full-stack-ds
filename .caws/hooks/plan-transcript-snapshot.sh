#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 27
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
# Plan Transcript Snapshot — capture conversation context at the moment
# the agent presents a plan via ExitPlanMode.
#
# Wired into: PostToolUse with matcher "ExitPlanMode" (self-filters on
# $HOOK_TOOL_NAME at the top).
#
# Output:
#   - <plan-path>.transcript.jsonl  — co-located transcript snapshot.
#   - $HOME/${CAWS_VENDOR_DIR}/.pending-plan-snapshots — newline-separated
#     list of snapshot paths awaiting Stop-hook finalization.
#
# FLAG (session-log.sh companion): the transcript discovery path
# $HOME/${CAWS_VENDOR_DIR}/projects/ is harness-specific for claude-code.
# For other surfaces the pending file path is sufficient; the resolver in
# session-log.sh handles transcript lookup surface-specifically.
#
# Companion: plan-transcript-finalize.sh (Stop hook) drains the pending
# list and finalizes each snapshot with the turn-end transcript.
# Promoted from Sterling per CAWS-HOOK-PACK-PROMOTE-001.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_VENDOR_DIR for PENDING path.
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true
parse_hook_input

# Hook gates — bail silently if anything is wrong rather than fail visibly.
# A snapshot hook should never block the agent's flow.
TOOL_NAME="$HOOK_TOOL_NAME"
[ "$TOOL_NAME" = "ExitPlanMode" ] || exit 0

TRANSCRIPT_PATH="$HOOK_TRANSCRIPT_PATH"
[ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ] || exit 0

# Find the most recent plan file Write in the transcript. The transcript
# is a JSONL stream of conversation events; grep is cheaper and more
# robust than jq for this lookup since field nesting can vary.
# `|| true` swallows grep's exit-1 on no-match so set -e doesn't abort
# the script before our bail-out check runs.
PLAN_FILE=$(grep -oE '"file_path":"[^"]*\/\.caws\/plans\/[^"]*\.md"|"file_path":"[^"]*\/plans\/[^"]*\.md"' "$TRANSCRIPT_PATH" 2>/dev/null \
    | tail -1 \
    | sed -E 's/^"file_path":"//; s/"$//' \
    || true)

[ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ] || exit 0

# Snapshot at this moment (plan finalized + presented).
SNAPSHOT="${PLAN_FILE%.md}.transcript.jsonl"
cp "$TRANSCRIPT_PATH" "$SNAPSHOT" 2>/dev/null || exit 0

# CAWS-HOOKPACK-HOME-UNSET-ROOT-AUTHORITY-ALIAS-001: no HOME means nowhere
# to track pending snapshots, not a namespace at "/". The snapshot file
# above is still written; it just will not be Stop-hook finalized.
[ -n "${HOME:-}" ] || exit 0

# Mark for Stop-hook finalization.
PENDING="${HOME}/${CAWS_VENDOR_DIR}/.pending-plan-snapshots"
mkdir -p "$(dirname "$PENDING")" 2>/dev/null || true

# Idempotent append: don't duplicate if already pending.
if [ ! -f "$PENDING" ] || ! grep -qxF "$SNAPSHOT" "$PENDING" 2>/dev/null; then
    echo "$SNAPSHOT" >> "$PENDING"
fi

exit 0
