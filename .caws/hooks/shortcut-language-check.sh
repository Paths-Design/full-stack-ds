#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 29
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
# CAWS Shortcut-Language Progressive Check (QG-HOOKS-EXTRACT-001)
#
# PostToolUse hook firing on Write/Edit. Flags "shortcut" / incomplete-work
# language in committed-bound source — the edit-time analogue of the
# quality-gates `todo_detection` gate.
# Shortcut/placeholder quality signal: re-implements the practical intent in
# self-contained bash: catch the agent
# leaving a TODO/FIXME/placeholder/"not implemented" stub in a NON-test source
# file.
#
# Unlike the other three advisory hooks, this one escalates via the existing
# progressive-strike mechanism (guard-strikes.sh):
#   strike 1 -> warn (allow)
#   strike 2 -> ask  (permission prompt)
#   strike 3 -> block
# Rationale: TODO/placeholder language in committed code is the CLAUDE.md
# "No fake implementations" rule; repeated offenses in a session warrant
# escalation, matching how scope-guard treats repeated scope violations.
#
# Test files (*.test.* / *.spec.*) are NOT strike-eligible: TODO/placeholder
# language in tests is routine (describing pending cases, fixture stubs).
#
# Patterns (case-insensitive) — only the high-signal subset of the
# todo-analyzer engine, kept to single-file grep for hook-time speed:
#   \bTODO\b \bFIXME\b \bXXX\b \bHACK\b \bTBD\b
#   "not implemented" "implement later" "coming soon" "placeholder"
#   stub-return shapes: return null;? // TODO ; throw new Error("not implemented")
#
# env: none (strike count fixed at 3 via guard-strikes.sh).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh" 2>/dev/null || exit 0
parse_hook_input || exit 0
# shellcheck source=guard-strikes.sh
source "$SCRIPT_DIR/guard-strikes.sh" 2>/dev/null || exit 0

FILE_PATH="$HOOK_FILE_PATH"
TOOL_NAME="$HOOK_TOOL_NAME"

case "$TOOL_NAME" in
  Write | Edit) ;;
  *) exit 0 ;;
esac

[[ -z "$FILE_PATH" ]] && exit 0

# Skip generated / vendored / build output.
case "$FILE_PATH" in
  */node_modules/* | */dist/* | */build/* | */coverage/* | */.next/* | */out/* | */vendor/*)
    exit 0
    ;;
esac

# Skip non-source artifacts: markdown/docs and lockfiles routinely contain
# the word "placeholder"/"TODO" as prose. The hook targets code.
case "$(basename "$FILE_PATH")" in
  *.md | *.markdown | *.txt | *.lock | *-lock.json | package-lock.json | *.min.js | *.bundle.js | *.map)
    exit 0
    ;;
esac

# Test files are exempt from strikes (TODO/placeholder is routine in specs).
case "$FILE_PATH" in
  *.test.* | *.spec.* | */tests/* | */__tests__/* | */test/* | */fixtures/*)
    exit 0
    ;;
esac

# The content to scan: prefer the tool payload (works on untracked files and
# is exactly what the agent just wrote). Write -> .content; Edit -> .new_string.
CONTENT=""
if [[ -n "${HOOK_TOOL_INPUT_JSON:-}" ]] && command -v jq >/dev/null 2>&1; then
  CONTENT=$(printf '%s' "$HOOK_TOOL_INPUT_JSON" | jq -r '.content // .new_string // empty' 2>/dev/null || printf '')
fi
# Fallback: read the file from disk if the payload had no content field.
if [[ -z "$CONTENT" ]] && [[ -f "$FILE_PATH" ]]; then
  CONTENT=$(cat "$FILE_PATH" 2>/dev/null || printf '')
fi
[[ -z "$CONTENT" ]] && exit 0

# Match the high-signal patterns. grep -nE on the content via a here-string;
# -i case-insensitive. Word-boundary keywords first, then phrases, then
# stub-return shapes.
MATCH=""
PATTERN_DESC=""

# Determiner / preposition words that, immediately before a keyword, mark it as
# a REFERENCED NOUN (a description of the concept) rather than an ACTIVE marker.
_REFERENCE_DETERMINERS='the|a|an|this|that|these|those|its|our|their|your|my|no|any|some|each|avoid|instead of|without|of|todo|fixme|xxx|hack|tbd'

# active_keyword_hit PATTERN — echo the first content line that contains the
# keyword PATTERN in ACTIVE (non-reference) position, or nothing.
active_keyword_hit() {
  local kw_pattern="$1"
  printf '%s' "$CONTENT" \
    | grep -niE "$kw_pattern" 2>/dev/null \
    | grep -vniE "($_REFERENCE_DETERMINERS)[[:space:]]+($kw_pattern)" 2>/dev/null \
    | head -1
}

# 1. Keyword markers (word-boundary).
if hit=$(active_keyword_hit '\b(TODO|FIXME|XXX|HACK|TBD)\b'); then
  if [[ -n "$hit" ]]; then
    MATCH="$hit"
    PATTERN_DESC="incomplete-work marker (TODO/FIXME/XXX/HACK/TBD)"
  fi
fi

# 2. Placeholder / not-implemented phrases.
# The bare word "placeholder" is a real stub marker in prose ("// placeholder,
# fill later") but ALSO a legitimate identifier/attribute/filename token in
# normal code: the JSX/HTML `placeholder="..."` input attribute, an imported
# asset (`placeholder.svg`, `placeholderUrl`), a kebab/snake identifier
# (`placeholder-text`), or a path segment (`assets/placeholder`). Those are not
# shortcut language. Match "placeholder" only when it is NOT followed by a token
# continuation (`= . / - _ :` or an alphanumeric). The LEADING boundary is a
# zero-width `\b`, not a consumed non-token char: a consumed leading char would
# break composition with the _REFERENCE_DETERMINERS suppression layer, whose
# `(determiner)[[:space:]]+(pattern)` test needs the pattern to start exactly
# where the post-space word begins (so "avoid the TODO placeholder" and "the
# placeholder line" stay suppressed as descriptive references).
# (CAWS-SHORTCUT-LANG-PLACEHOLDER-TOKEN-FALSE-POSITIVE-002)
_PLACEHOLDER_MARKER='\bplaceholder([^A-Za-z0-9=._/:-]|$)'
if [[ -z "$MATCH" ]]; then
  if hit=$(active_keyword_hit 'not implemented|implement later|coming soon'); then
    if [[ -n "$hit" ]]; then
      MATCH="$hit"
      PATTERN_DESC="placeholder / not-implemented language"
    fi
  fi
fi
if [[ -z "$MATCH" ]]; then
  if hit=$(active_keyword_hit "$_PLACEHOLDER_MARKER"); then
    if [[ -n "$hit" ]]; then
      MATCH="$hit"
      PATTERN_DESC="placeholder / not-implemented language"
    fi
  fi
fi

# 3. Stub-return shapes.
if [[ -z "$MATCH" ]]; then
  if hit=$(printf '%s' "$CONTENT" | grep -niE 'throw new Error\(["'"'"']not implemented' 2>/dev/null | head -1); then
    if [[ -n "$hit" ]]; then
      MATCH="$hit"
      PATTERN_DESC="explicit not-implemented stub throw"
    fi
  fi
fi

[[ -z "$MATCH" ]] && exit 0

# Trim the matched line for the message (strip leading whitespace, cap length).
LINE_TEXT=$(printf '%s' "$MATCH" | sed 's/^[0-9]*://; s/^[[:space:]]*//' | cut -c1-120)

BASE="Shortcut-language advisory in ${FILE_PATH}: ${PATTERN_DESC} — \"${LINE_TEXT}\". CAWS doctrine (\"No fake implementations\") asks for complete code in committed source, not TODO/placeholder stubs."
MSG1="${BASE} (strike 1 of 3 — advisory.)"
MSG2="${BASE} (strike 2 of 3 — please resolve before continuing.)"
MSG3="${BASE} (strike 3 — blocked. Replace the placeholder/stub with a real implementation, or move the work to a tracked spec.)"

guard_enforce_progressive_strikes \
  "${HOOK_SESSION_ID:-unknown}" \
  "shortcut_language" \
  "${HOOK_CWD:-}" \
  "$MSG1" "$MSG2" "$MSG3"

# guard_enforce_progressive_strikes emits the decision JSON. For strikes 1/2
# it is an allow/ask (exit 0). For strike 3 it emits a block decision; exit 0
# is correct for PostToolUse (the tool already ran) — the block decision in
# the JSON is what the harness honors.
exit 0
