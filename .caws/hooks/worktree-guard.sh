#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 4,6,11,19,32
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
# CAWS Worktree Safety Guard (shared, v11-shape).
# Blocks dangerous git operations and cross-boundary file copies when
# parallel worktrees are active.
#
# Registry-shape compatibility:
#   v11 direct-key: { "<name>": { "status": "active", ... } }
#   v10 nested:     { "worktrees": { "<name>": { ... } } }

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/caws-state.sh
# Guard the source: a fatal `source <missing>` under `set -euo pipefail` is NOT
# caught by `|| true`. caws-state.sh is optional here (worktree-guard reads the
# registry via node), so a missing file is non-fatal but must not abort the
# guard (CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001).
[[ -f "$SCRIPT_DIR/lib/caws-state.sh" ]] && source "$SCRIPT_DIR/lib/caws-state.sh"
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_PROJECT_DIR and caws_source_lib — load-bearing (caws_source_lib
# is called below). Fail CLOSED if absent: a guard that blocks dangerous git ops
# while worktrees are active must not silently disappear because a lib is missing.
if [[ -f "$SCRIPT_DIR/lib/agent-surface.sh" ]]; then
  source "$SCRIPT_DIR/lib/agent-surface.sh"
else
  echo "[worktree-guard] CAWS hook infrastructure incomplete: lib/agent-surface.sh is missing — cannot evaluate worktree-active git safety. Failing CLOSED. Restore the shared hook libs with: caws init --adopt" >&2
  printf '{"decision":"block","reason":"CAWS worktree-guard: cannot load lib/agent-surface.sh, so worktree-active git safety cannot be evaluated. Failing closed. Restore the hook pack: caws init --adopt"}\n'
  exit 2
fi
# shellcheck source=lib/emit.sh
# Use caws_source_lib so a vendor override is preferred over the shared default.
caws_source_lib emit.sh 2>/dev/null || true
parse_hook_input

TOOL_NAME="$HOOK_TOOL_NAME"
COMMAND="$HOOK_COMMAND"

if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Share lexical command positions with the write boundary. No quote sentinels
# over the raw command: those would hide executable $(...) inside double quotes.
if [[ -f "$SCRIPT_DIR/lib/heredoc.sh" && -f "$SCRIPT_DIR/lib/bash-mutation-targets.sh" ]]; then
  source "$SCRIPT_DIR/lib/heredoc.sh"
  source "$SCRIPT_DIR/lib/bash-mutation-targets.sh"
  COMMAND="$(caws_bash_command_lines "$COMMAND")"
else
  echo "[worktree-guard] command-recognition library unavailable; blocked" >&2
  exit 2
fi

# Resolve main repo root (shared helper — HOOK-LIB-CONSOLIDATION-001 T2a).
PROJECT_DIR="$(resolve_canonical_dir "${CAWS_PROJECT_DIR:-.}")"

# Block sparse checkout (runs before "only check git commands" early-exit)
if echo "$COMMAND" | grep -qE '^caws\s+(worktree\s+create|parallel\s+setup).*--scope'; then
  echo "BLOCKED: --scope (sparse checkout) is not allowed." >&2
  echo "Sparse checkout breaks cross-module imports in most projects." >&2
  echo "Use full worktrees without --scope. Scope enforcement comes from" >&2
  echo "CAWS feature specs and lane discipline, not from hiding files." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '^git\s+sparse-checkout'; then
  # WORKTREE-SPEC-CANONICAL-ACCESS-GUARD-001 A3: blanket refusal stays.
  echo "BLOCKED: agent-issued git sparse-checkout is refused in CAWS projects." >&2
  echo "" >&2
  echo "Sparse-checkout in a CAWS linked worktree carries the mechanical guard" >&2
  echo "against the v10.2 split-brain authority class: .caws/specs/ is excluded" >&2
  echo "from the worktree by design, so canonical spec authority cannot be" >&2
  echo "materialized inside the worktree as a divergent private copy. Disabling" >&2
  echo "sparse-checkout (or any sparse-checkout reconfiguration via agent Bash)" >&2
  echo "would re-open that class. Linked worktrees must not use worktree-local" >&2
  echo ".caws/specs/ files as authority; CAWS resolves spec reads through the" >&2
  echo "canonical control plane regardless of cwd." >&2
  echo "" >&2
  echo "To read a spec from any cwd (including this worktree), use:" >&2
  echo "  caws specs show <id>" >&2
  echo "" >&2
  echo "To check scope from any cwd, use:" >&2
  echo "  caws scope show <path>" >&2
  echo "  caws scope check <path>" >&2
  echo "" >&2
  echo "To restore the sparse-checkout invariant on a linked worktree (e.g.," >&2
  echo "after a human-authorized sparse-checkout reconfiguration left the tree" >&2
  echo "with materialized .caws/specs/ files), run from the canonical checkout:" >&2
  echo "  caws worktree repair-sparse <name>" >&2
  echo "" >&2
  echo "The repair command is non-destructive: it refuses dirty .caws/specs/" >&2
  echo "rather than stashing, cleaning, or deleting work." >&2
  exit 2
fi

# ─── CANONICAL-CHECKOUT-WORKTREE-GUARD-001 (Entry 19) ────────────────
# Block mutating git commands from the canonical checkout while at
# least one active CAWS worktree exists.
canonical_guard_emit_block() {
  local action="$1"
  local first_active="$2"
  echo "BLOCKED: $action from the canonical checkout while CAWS worktrees are active." >&2
  echo "Active worktree(s) detected (e.g. '$first_active' in .caws/worktrees.json)." >&2
  echo "Switch into your worktree before mutating: cd .caws/worktrees/$first_active" >&2
  echo "Or destroy any worktree that is genuinely abandoned: caws worktree destroy <name>" >&2
}

CANONICAL_GUARD_CHECK_CWD="${HOOK_CWD:-$PROJECT_DIR}"
if is_canonical_checkout "$CANONICAL_GUARD_CHECK_CWD"; then
    WORKTREES_JSON="$PROJECT_DIR/.caws/worktrees.json"
      if [[ -f "$WORKTREES_JSON" ]] && command -v node >/dev/null 2>&1; then
        FIRST_ACTIVE_WT=$(node -e "
          $CAWS_NODE_ENTRIES_OF
          try {
            var reg = JSON.parse(require('fs').readFileSync('$WORKTREES_JSON', 'utf8'));
            var active = entriesOf(reg).filter(function(w) {
              var s = w.status;
              return s === 'active' || s === undefined || s === null || s === '';
            });
            if (active.length > 0) console.log(active[0].name);
            else console.log('');
          } catch(e) { console.log(''); }
        " 2>/dev/null || echo "")
        if [[ -n "$FIRST_ACTIVE_WT" ]]; then
          if echo "$COMMAND" | grep -qE '^git\s+checkout\s+[^[:space:]-]'; then
            canonical_guard_emit_block "git checkout (branch switch)" "$FIRST_ACTIVE_WT"
            exit 2
          fi
          if echo "$COMMAND" | grep -qE '^git\s+switch\s+[^[:space:]-]'; then
            canonical_guard_emit_block "git switch (branch switch)" "$FIRST_ACTIVE_WT"
            exit 2
          fi
          if echo "$COMMAND" | grep -qE '^git\s+branch\s+(-f|--force)'; then
            canonical_guard_emit_block "git branch -f (force branch update)" "$FIRST_ACTIVE_WT"
            exit 2
          fi
          if echo "$COMMAND" | grep -qE '^git\s+reset\b' \
             && ! echo "$COMMAND" | grep -qE '^git\s+reset\s+--hard'; then
            canonical_guard_emit_block "git reset (HEAD mutation)" "$FIRST_ACTIVE_WT"
            exit 2
          fi
        fi
      fi
fi
# ─── /CANONICAL-CHECKOUT-WORKTREE-GUARD-001 ──────────────────────────

# Block cross-boundary file copies (worktree → main).
WORKTREE_BASE="$PROJECT_DIR/.caws/worktrees"
if [[ -d "$WORKTREE_BASE" ]]; then
  if echo "$COMMAND" | grep -qE '^(cp|mv)[[:space:]]'; then
    AGENT_IN_WORKTREE=false
    if [[ -n "$HOOK_CWD" ]] && [[ "$HOOK_CWD" == "$WORKTREE_BASE"/* ]]; then
      AGENT_IN_WORKTREE=true
    fi

    if [[ "$AGENT_IN_WORKTREE" != "true" ]]; then
      if echo "$COMMAND" | grep -qF ".caws/worktrees/" || echo "$COMMAND" | grep -qF "$WORKTREE_BASE"; then
        HAS_WT_PATH=false
        HAS_MAIN_PATH=false
        if echo "$COMMAND" | grep -qE '\.caws/worktrees/|'"$(echo "$WORKTREE_BASE" | sed 's/[\/&]/\\&/g')"''; then
          HAS_WT_PATH=true
        fi
        if echo "$COMMAND" | grep -qE "(^|\s)$PROJECT_DIR/[^.]|core/|src/|tests/|packages/" && [[ "$HAS_WT_PATH" == "true" ]]; then
          HAS_MAIN_PATH=true
        fi
        if [[ "$HAS_WT_PATH" == "true" ]] && [[ "$HAS_MAIN_PATH" == "true" ]]; then
          echo "BLOCKED: Copying files from a worktree to the main repo is forbidden." >&2
          echo "This bypasses worktree isolation. Work entirely within your worktree." >&2
          echo "If tests need the main repo's venv, activate it with:" >&2
          echo "  source $PROJECT_DIR/.venv/bin/activate" >&2
          exit 2
        fi
      fi
    fi
  fi
fi

# Only check git commands from here on
if ! echo "$COMMAND" | grep -qE '^git\s'; then
  exit 0
fi

# Determine if worktrees are active (dual-shape aware).
WORKTREES_ACTIVE=false
PARALLEL_BASE=""

if [[ -f "$PROJECT_DIR/.caws/parallel.json" ]] && command -v node >/dev/null 2>&1; then
  PARALLEL_INFO=$(node -e "
    try {
      var reg = JSON.parse(require('fs').readFileSync('$PROJECT_DIR/.caws/parallel.json', 'utf8'));
      var agents = (reg.agents || []).length;
      console.log(agents + ':' + (reg.baseBranch || ''));
    } catch(e) { console.log('0:'); }
  " 2>/dev/null || echo "0:")

  AGENT_COUNT=$(echo "$PARALLEL_INFO" | cut -d: -f1)
  PARALLEL_BASE=$(echo "$PARALLEL_INFO" | cut -d: -f2)

  if [[ "$AGENT_COUNT" -gt 0 ]] 2>/dev/null; then
    WORKTREES_ACTIVE=true
  fi
fi

if [[ "$WORKTREES_ACTIVE" != "true" ]] && [[ -f "$PROJECT_DIR/.caws/worktrees.json" ]] && command -v node >/dev/null 2>&1; then
  ACTIVE_COUNT=$(node -e "
    $CAWS_NODE_ENTRIES_OF
    try {
      var reg = JSON.parse(require('fs').readFileSync('$PROJECT_DIR/.caws/worktrees.json', 'utf8'));
      var active = entriesOf(reg).filter(function(w) {
        var s = w.status;
        return s === 'active' || s === undefined || s === null || s === '';
      });
      console.log(active.length);
    } catch(e) { console.log('0'); }
  " 2>/dev/null || echo "0")

  if [[ "$ACTIVE_COUNT" -gt 0 ]] 2>/dev/null; then
    WORKTREES_ACTIVE=true
  fi
fi

if [[ "$WORKTREES_ACTIVE" != "true" ]]; then
  exit 0
fi

# --- Block dangerous git operations when worktrees are active ---

if echo "$COMMAND" | grep -qE '^git\s+commit\s+.*--amend'; then
  echo "BLOCKED: git commit --amend is not allowed while worktrees are active." >&2
  echo "Amending commits risks rewriting another agent's work." >&2
  echo "Create a new commit instead." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '^git\s+stash' && ! echo "$COMMAND" | grep -qE '^git\s+stash\s+list'; then
  echo "BLOCKED: git stash is not allowed while worktrees are active." >&2
  echo "Stash is shared across all worktrees and can capture or destroy another agent's work." >&2
  echo "Commit your changes to your branch instead." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '^git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard is not allowed while worktrees are active." >&2
  echo "This could discard work that other agents depend on." >&2
  exit 2
fi

# WORKTREE-ISOLATION-HARDENING-001 (Fix 5): the git restore synonym gap.
if echo "$COMMAND" | grep -qE '^git\s+restore\b'; then
  echo "BLOCKED: git restore (working-tree/path restore) is not allowed while worktrees are active." >&2
  echo "git restore DISCARDS uncommitted changes by path — the same work-loss hazard as git reset --hard." >&2
  echo "This is a path/working-tree restore, NOT a branch switch." >&2
  echo "Commit the work you want to keep first; to intentionally drop a specific file's changes," >&2
  echo "do it from a session rooted in the owning worktree, not from a shared/foreign checkout." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '^git\s+checkout\s+--\s'; then
  echo "BLOCKED: git checkout -- <path> (working-tree discard) is not allowed while worktrees are active." >&2
  echo "This discards uncommitted changes to the named path(s) — a work-loss hazard while parallel work exists." >&2
  echo "Commit first, or operate from the owning worktree's session." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '^git\s+clean\b'; then
  echo "BLOCKED: git clean (untracked-file deletion) is not allowed while worktrees are active." >&2
  echo "git clean can delete another agent's untracked files across the shared tree." >&2
  echo "Remove specific files you own explicitly instead." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '^git\s+push\s+.*(--force|-f\s)'; then
  echo "BLOCKED: Force push is not allowed while worktrees are active." >&2
  echo "This could rewrite history that other agents have based work on." >&2
  exit 2
fi

# --- Base branch protections ---
AGENT_DIR="${HOOK_CWD:-${CAWS_PROJECT_DIR:-.}}"
CURRENT_BRANCH=$(caws_current_branch "$AGENT_DIR")  # HOOK-LIB-CONSOLIDATION-001 T2b

BASE_BRANCH="$PARALLEL_BASE"
if [[ -z "$BASE_BRANCH" ]] && [[ -f "$PROJECT_DIR/.caws/worktrees.json" ]] && command -v node >/dev/null 2>&1; then
  BASE_BRANCH=$(node -e "
    $CAWS_NODE_ENTRIES_OF
    try {
      var reg = JSON.parse(require('fs').readFileSync('$PROJECT_DIR/.caws/worktrees.json', 'utf8'));
      var active = entriesOf(reg).filter(function(w) {
        var s = w.status;
        return s === 'active' || s === undefined || s === null || s === '';
      });
      if (active.length > 0) console.log(active[0].baseBranch || '');
      else console.log('');
    } catch(e) { console.log(''); }
  " 2>/dev/null || echo "")
fi

if [[ -n "$BASE_BRANCH" ]] && [[ "$CURRENT_BRANCH" == "$BASE_BRANCH" ]]; then
  # CAWS-WORKTREE-GUARD-BASE-PUSH-RETIRE-001: an ordinary `git push` from the
  # base branch used to be refused here unconditionally. That block was
  # inherited unreviewed from a bulk hook migration (no incident or rationale
  # attached) and fired even when a peer's worktree had nothing to do with the
  # push — merely being on the base branch with any worktree active anywhere
  # in the repo was enough. Publishing already-merged commits rewrites no
  # history and races no sibling's index; it has no isolation cost to justify
  # refusing it, unlike the force-push case just above, which stays blocked
  # because it CAN rewrite history other agents have based work on.
  if echo "$COMMAND" | grep -qE '^git\s+merge\b'; then
    emit_additional_context "Merging into base branch ($BASE_BRANCH) while worktrees are active. The commit-msg hook will enforce the merge(worktree): message format. Make sure the worktree for this branch has been destroyed first."
    exit 0
  fi

  if echo "$COMMAND" | grep -qE '^git\s+commit\b' && ! echo "$COMMAND" | grep -qE -e '--amend'; then
    emit_additional_context "NOTE: committing to the base branch ($BASE_BRANCH) while worktrees are active. Worktrees are preferred for isolated feature work, but logical checkpoint commits from the current checkout are allowed by CAWS governance. Avoid --amend and force-push while worktrees are active."
    exit 0
  fi
fi

exit 0
