#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 30
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
# CAWS Duplicate Export Check
#
# Advisory: on Write of a new JS/TS file, flags an exported symbol whose exact
# name already exists in the enclosing package src tree (generic-name allowlist).
# Always exit 0.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
# Provides caws_source_lib for vendor-override resolution.
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true
# shellcheck source=lib/emit.sh
caws_source_lib emit.sh 2>/dev/null || true
parse_hook_input

TOOL_NAME="$HOOK_TOOL_NAME"
FILE_PATH="$HOOK_FILE_PATH"

# Only on Write of JS/TS source files
if [[ "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

case "$FILE_PATH" in
  *.js|*.ts|*.jsx|*.tsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  */node_modules/*|*/dist/*|*/build/*|*/coverage/*) exit 0 ;;
esac

# Find the package root (directory containing package.json).
PKG_ROOT="$(dirname "$FILE_PATH")"
while [[ "$PKG_ROOT" != "/" ]]; do
  [[ -f "$PKG_ROOT/package.json" ]] && break
  PKG_ROOT="$(dirname "$PKG_ROOT")"
done

[[ "$PKG_ROOT" == "/" ]] && exit 0

# Extract exported names from the new file content.
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Generic names that are expected to appear in many modules.
GENERIC_NAMES="^(default|index|main|handler|router|config|utils|helpers|types|constants|interfaces|exports)$"

# Grep for "export (function|class|const|let|var|type|interface|enum) NAME"
EXPORTS=$(grep -oE 'export[[:space:]]+(default[[:space:]]+)?(function|class|const|let|var|type|interface|enum)[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' "$FILE_PATH" 2>/dev/null \
  | sed -E 's/.*[[:space:]]([A-Za-z_][A-Za-z0-9_]*)$/\1/' \
  | grep -vE "$GENERIC_NAMES" \
  | sort -u \
  || true)

[[ -z "$EXPORTS" ]] && exit 0

SRC_DIR="$PKG_ROOT/src"
[[ -d "$SRC_DIR" ]] || SRC_DIR="$PKG_ROOT"

DUPLICATES=""
while IFS= read -r sym; do
  [[ -z "$sym" ]] && continue
  # Search for the same exported name in other source files.
  existing=$(grep -rlE "export[[:space:]]+(default[[:space:]]+)?(function|class|const|let|var|type|interface|enum)[[:space:]]+${sym}\b" \
    "$SRC_DIR" \
    --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
    2>/dev/null \
    | grep -v "^${FILE_PATH}$" \
    | head -1 || true)
  if [[ -n "$existing" ]]; then
    DUPLICATES="${DUPLICATES}  • '$sym' also in $existing\n"
  fi
done <<< "$EXPORTS"

if [[ -n "$DUPLICATES" ]]; then
  MSG="duplicate-export-check: exported names in '${FILE_PATH}' already exist in the package tree:
$(printf '%b' "$DUPLICATES")
Consider re-exporting from a shared module or renaming. (Advisory — always allowed.)"
  emit_additional_context "$MSG" "PostToolUse"
fi

exit 0
