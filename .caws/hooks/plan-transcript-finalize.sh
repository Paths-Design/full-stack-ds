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
# Plan Transcript Finalize — drains the pending-plan-snapshots list and
# overwrites each snapshot with the FINAL turn-end transcript (which includes
# user approval, any subsequent reasoning, and the rest of the turn).
#
# Wired into: Stop (and optionally PreCompact).
#
# Companion: plan-transcript-snapshot.sh (PostToolUse/ExitPlanMode) builds
# the pending list.
# Promoted from Sterling per CAWS-HOOK-PACK-PROMOTE-001.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_VENDOR_DIR for PENDING path.
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true
parse_hook_input

TRANSCRIPT_PATH="$HOOK_TRANSCRIPT_PATH"
[ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ] || exit 0

# CAWS-HOOKPACK-HOME-UNSET-ROOT-AUTHORITY-ALIAS-001: no HOME means this
# best-effort lookup has nowhere to look, not a namespace at "/". Skip
# rather than resolve "${CAWS_VENDOR_DIR}/.pending-plan-snapshots" at root.
[ -n "${HOME:-}" ] || exit 0

# FLAG: session-level pending plan snapshots list.
# This path uses CAWS_VENDOR_DIR for surface-neutrality.
# For claude-code: ~/.claude/.pending-plan-snapshots (CAWS_VENDOR_DIR=.claude)
# For other surfaces: ~/${CAWS_VENDOR_DIR}/.pending-plan-snapshots
PENDING="${HOME}/${CAWS_VENDOR_DIR}/.pending-plan-snapshots"
[ -f "$PENDING" ] || exit 0

while IFS= read -r snapshot; do
  [ -z "$snapshot" ] && continue
  # Overwrite the at-plan-present snapshot with the full final transcript.
  cp "$TRANSCRIPT_PATH" "$snapshot" 2>/dev/null || true
done < "$PENDING"

# Drain the pending list — all snapshots have been finalized.
rm -f "$PENDING" 2>/dev/null || true

exit 0
