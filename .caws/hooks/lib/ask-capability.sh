#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# A prompt is a boundary only if it requires an actual human decision.
# Do not generalize bypassPermissions to other mode names without evidence.
caws_guard_cannot_ask() {
  [[ "${CAWS_GUARD_NO_ASK:-0}" == 1 ]] && return 0
  [[ "${HOOK_PERMISSION_MODE:-default}" == bypassPermissions ]] && return 0
  command -v emit_ask >/dev/null 2>&1 || return 0
  return 1
}
