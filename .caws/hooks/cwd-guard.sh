#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 22
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
# CWD Guard — warns when the agent's working directory is missing or
# inaccessible. A nonexistent CWD causes most Bash/tool-call invocations
# to fail silently; surfacing it early lets the agent recover before
# accumulating confusing errors.
#
# Promoted from Sterling per CAWS-HOOK-PACK-PROMOTE-001.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
parse_hook_input

CWD="${HOOK_CWD:-.}"

# Nothing to guard if no CWD was supplied.
[[ -z "$CWD" ]] && exit 0

if [[ ! -d "$CWD" ]]; then
  printf 'CAWS cwd-guard: working directory is missing or inaccessible: %s\n' "$CWD" >&2
  printf 'This may cause subsequent tool calls to fail. Consider recovering the directory or switching to a valid one.\n' >&2
fi

exit 0
