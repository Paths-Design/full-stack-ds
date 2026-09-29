#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,13
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# CAWS Quality Check Hook
# Runs CAWS quality validation after file edits.
# OPT-IN: not wired into the default post_tool_use HANDLERS array
# (commented out there). Promoted from Sterling per
# HOOK-PACK-DIVERGENCE-RECONCILE-001 — the v11-correct version using
# `caws gates run --spec <id>` (the caws-local copy called removed
# --quiet/--json flags).
# @author @darianrosebrook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true
# shellcheck source=lib/emit.sh
caws_source_lib emit.sh 2>/dev/null || true
parse_hook_input

FILE_PATH="$HOOK_FILE_PATH"
TOOL_NAME="$HOOK_TOOL_NAME"

# Only run on Write/Edit of source files
if [[ "$TOOL_NAME" != "Write" ]] && [[ "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Skip non-source files and node_modules/dist
if [[ ! "$FILE_PATH" =~ \.(js|ts|jsx|tsx|py|go|rs|java|mjs|cjs)$ ]] || \
   [[ "$FILE_PATH" =~ node_modules ]] || \
   [[ "$FILE_PATH" =~ dist/ ]] || \
   [[ "$FILE_PATH" =~ build/ ]]; then
  exit 0
fi

# Determine project directory
PROJECT_DIR="${CAWS_PROJECT_DIR:-.}"

# Check if we're in a CAWS project. v11 has no project-level
# working-spec.yaml — specs live exclusively under .caws/specs/.
# Accept either marker so this hook keeps working across v10 → v11.
if [[ ! -f "$PROJECT_DIR/.caws/working-spec.yaml" ]] && \
   ! { [[ -d "$PROJECT_DIR/.caws/specs" ]] && \
       [[ -n "$(ls -A "$PROJECT_DIR/.caws/specs" 2>/dev/null | grep -v '^\.archive$')" ]]; }; then
  exit 0
fi

# Check if CAWS CLI is available
if ! command -v caws &> /dev/null; then
  # Suggest installing CAWS
  emit_additional_context "CAWS CLI not available. Consider installing with: npm install -g @caws/cli" "PostToolUse"
  exit 0
fi

# Run CAWS quality gates (v11.1.7: `caws gates run`, no --quiet/--json flags).
#
# A2 invariant: do NOT invent --quiet or --json — neither exists on
# `caws gates run`. We capture combined output and check exit code.
# `caws gates run` also REQUIRES --spec <id>; we discover it from the
# worktree binding (when CWD is a worktree) and skip otherwise.
#
# A3 invariant: bootstrap failures (unknown command, missing policy,
# schema-load errors, missing CAWS binary) must NOT emit a misleading
# `decision: block` with "Quality gate violations detected". They emit
# a non-blocking advisory tagged "(hook bootstrap)" so the agent can
# distinguish "your edit is fine, CAWS itself can't load" from "your
# edit violated a real gate."
#
# Exit codes:
#   0  — gates ran AND all enforced gates passed (or skipped because
#         no spec is bound — gates are a per-spec operation in v11)
#   1  — gates ran AND at least one enforced gate blocked
#   2  — bootstrap failure (policy not loaded, unknown command, etc.)

# Discover the bound spec id from .caws/worktrees.json (v11 flat-map
# shape) using the worktree directory the agent is editing from. If
# unbound, skip — per-edit gates aren't meaningful without a spec.
SPEC_ID=""
if [[ -f "$PROJECT_DIR/.caws/worktrees.json" ]] && command -v node >/dev/null 2>&1; then
  AGENT_CWD="${HOOK_CWD:-$PROJECT_DIR}"
  SPEC_ID=$(node -e "
    try {
      const reg = JSON.parse(require('fs').readFileSync('$PROJECT_DIR/.caws/worktrees.json', 'utf8'));
      // Both v11 flat-map and v10 nested-envelope shapes
      const entries = reg.worktrees && typeof reg.worktrees === 'object' ? reg.worktrees : reg;
      const cwd = '$AGENT_CWD';
      for (const [name, e] of Object.entries(entries)) {
        if (!e || typeof e !== 'object') continue;
        const path = e.path || '';
        if (path && (cwd === path || cwd.startsWith(path + '/'))) {
          // Both v11 spec_id and v10 specId
          const id = e.spec_id || e.specId || '';
          if (id) { console.log(id); break; }
        }
      }
    } catch (_) { /* silent */ }
  " 2>/dev/null || true)
fi

if [[ -z "$SPEC_ID" ]]; then
  # No bound spec — gates are per-spec in v11. Skip silently.
  exit 0
fi

GATES_OUT=$(caws gates run --spec "$SPEC_ID" --context commit 2>&1)
GATES_RC=$?

if [[ $GATES_RC -eq 0 ]]; then
  # Silent on success.
  exit 0
fi

# Distinguish bootstrap failure from real gate violation. A bootstrap
# failure surfaces as schema/load/unknown-command text; the CAWS CLI
# emits these with a "policy.schema.*" / "store.*" / "rule:" prefix.
# A real gate violation surfaces with gate names from policy.yaml.
if echo "$GATES_OUT" | grep -qE '(policy\.schema\.|store\.|no policy\.yaml loaded|unknown command|command not found)'; then
  # Bootstrap failure — non-blocking, prefixed advisory (verbatim diagnostic).
  MSG=$(printf '(hook bootstrap) caws gates run could not evaluate: rc=%s\n%s' "$GATES_RC" "$GATES_OUT")
  emit_additional_context "$MSG" "PostToolUse"
  exit 0
fi

# Real gate violation — pass CLI text through verbatim.
REASON="CAWS gate violation detected. Verbatim caws gates run output:

$GATES_OUT

Run 'caws gates run --context commit' for full details."

emit_block "$REASON"

exit 0
