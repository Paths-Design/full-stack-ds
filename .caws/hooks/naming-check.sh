#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 25
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
# CAWS Naming Check
#
# Advisory: flags files or exported identifiers that violate CAWS naming
# conventions (shadow files: *-enhanced.*, *-new.*, *-v2.*, *-final.*,
# *-copy.*). Always exit 0.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true
# shellcheck source=lib/emit.sh
caws_source_lib emit.sh 2>/dev/null || true
parse_hook_input

TOOL_NAME="$HOOK_TOOL_NAME"
FILE_PATH="$HOOK_FILE_PATH"

case "$TOOL_NAME" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

[[ -z "$FILE_PATH" ]] && exit 0

BASENAME="$(basename "$FILE_PATH")"
# Strip extension for comparison.
NAME_NOEXT="${BASENAME%.*}"

# Shadow-file patterns (CAWS quality standard: no shadow files).
case "$NAME_NOEXT" in
  *-enhanced|*-new|*-v[0-9]|*-final|*-copy|*_enhanced|*_new|*_final|*_copy|*_v[0-9])
    MSG="naming-check: '$BASENAME' looks like a shadow/duplicate file (CAWS doctrine: no *-enhanced.*, *-new.*, *-v2.*, *-final.*, *-copy.* files). Edit the original in place instead. (Advisory — allowed.)"
    emit_additional_context "$MSG" "PostToolUse"
    ;;
esac

exit 0
