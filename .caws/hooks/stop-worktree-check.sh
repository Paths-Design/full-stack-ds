#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 4,8
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# CAWS Worktree Cleanup Reminder
# Warns at session end if active worktrees remain. OPT-IN: not wired into
# the default stop HANDLERS array. Promoted from Sterling per
# HOOK-PACK-DIVERGENCE-RECONCILE-001.
# @author @darianrosebrook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/caws-state.sh
source "$SCRIPT_DIR/lib/caws-state.sh" 2>/dev/null || true
# Hook does not read stdin fields; only checks worktree registry state.
# Sourcing parse-input.sh still wires up PATH for node (used below).

# Resolve main repo root (shared helper — HOOK-LIB-CONSOLIDATION-001 T2a).
PROJECT_DIR="$(resolve_canonical_dir "${CAWS_PROJECT_DIR:-.}")"

# Check for active worktrees
if [[ -f "$PROJECT_DIR/.caws/worktrees.json" ]] && command -v node >/dev/null 2>&1; then
  ACTIVE_INFO=$(node -e "
    $CAWS_NODE_ENTRIES_OF
    try {
      var reg = JSON.parse(require('fs').readFileSync('$PROJECT_DIR/.caws/worktrees.json', 'utf8'));
      // Status-less entries (CLI-created — caws-cli 11.1.7+ persists no
      // status field) count as active alongside the explicit
      // 'active'/'fresh' states (HOOK-LIB-CONSOLIDATION-001 T1b).
      var active = entriesOf(reg).filter(function(w) {
        var s = w.status;
        return s === 'active' || s === 'fresh' || s === undefined || s === null || s === '';
      });
      if (active.length > 0) {
        console.log(active.length + ':' + active.map(function(w) { return w.name; }).join(', '));
      } else {
        console.log('0:');
      }
    } catch(e) { console.log('0:'); }
  " 2>/dev/null || echo "0:")

  COUNT=$(echo "$ACTIVE_INFO" | cut -d: -f1)
  NAMES=$(echo "$ACTIVE_INFO" | cut -d: -f2)

  if [[ "$COUNT" -eq 0 ]] 2>/dev/null; then
    echo "REMINDER: No active worktrees. Worktrees are preferred for isolated feature work; on the base branch the write guard's always-allowed allowlist still permits coordination/docs/config edits. To start isolated work: caws worktree create <name> --spec <id>. If a worktree's work is complete, run: caws worktree destroy <name> (then git branch -d <branch> to remove the branch)." >&2
    exit 0
  fi

  if [[ "$COUNT" -gt 0 ]] 2>/dev/null; then
    echo "REMINDER: $COUNT active worktree(s) remain: $NAMES. Other agents cannot commit to the base branch until all worktrees are destroyed. If your work is complete, run: caws worktree destroy <name> (then git branch -d <branch> to remove the branch)" >&2
    exit 0
  fi

fi

exit 0
