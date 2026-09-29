#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,16
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# Shared hook-output envelope emitters (surface-neutral default).
#
# This is the shared/default version of emit.sh, derived from the Claude Code
# baseline. It implements the "ask" permission vocabulary. Vendor adapters that
# need different behavior (e.g. codex maps "ask" -> "deny") install an override
# at $CAWS_PROJECT_DIR/$CAWS_VENDOR_DIR/hooks/lib/emit.sh. The override is
# resolved by caws_source_lib (defined in lib/agent-surface.sh).
#
# There are exactly THREE envelope shapes the pack emits:
#
#   1. block            { "decision": "block", "reason": <msg> }
#                       PreToolUse hard block. Pair with `exit 2`.
#
#   2. ask              { "hookSpecificOutput": {
#                           "hookEventName": "PreToolUse",
#                           "permissionDecision": "ask",
#                           "permissionDecisionReason": <msg> } }
#                       PreToolUse user-approval prompt.
#
#   3. additionalContext { "hookSpecificOutput": {
#                            "hookEventName": <event>,
#                            "additionalContext": <msg> } }
#                       Inject advisory text without blocking. Used by
#                       both PreToolUse (warn/allow) and PostToolUse.
#
# Functions:
#   emit_block <reason>
#       Print the block envelope. Caller still controls the exit code
#       (the harness honors `decision: block` regardless, but the pack
#       convention is to follow with `exit 2`).
#
#   emit_ask <reason> [event]
#       Print the permission-ask envelope. <event> defaults to "PreToolUse";
#       pass "PostToolUse" from PostToolUse hooks. The harness validates
#       hookSpecificOutput.hookEventName against the actual hook event and
#       rejects a mismatch ("expected PostToolUse but got PreToolUse"), so
#       callers that emit ask from a non-PreToolUse event must pass the
#       correct event name.
#       NOTE: surfaces where "ask" is not supported (e.g. Codex) install
#       a vendor override that maps this to "deny". See codex adapter.
#
#   emit_additional_context <message> [event]
#       Print the additionalContext envelope. <event> defaults to
#       "PreToolUse"; pass "PostToolUse" from PostToolUse hooks.
#
# Implementation: jq when available (canonical), with a pure-bash
# JSON-string-escaping printf fallback so the envelopes still emit valid
# JSON on a runner without jq. The fallback escapes the five JSON string
# metacharacters (\ " newline tab carriage-return) — sufficient for the
# message strings these hooks produce.

# Guard against double-sourcing.
if [[ -n "${_CAWS_EMIT_SH_LOADED:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi
_CAWS_EMIT_SH_LOADED=1

# _emit_json_escape <string>
#   Escape a string for embedding in a JSON double-quoted value. Used by
#   the printf fallback path only (jq does its own escaping).
_emit_json_escape() {
  local s="${1:-}"
  s="${s//\\/\\\\}"   # backslash first
  s="${s//\"/\\\"}"   # double quote
  s="${s//$'\n'/\\n}" # newline
  s="${s//$'\t'/\\t}" # tab
  s="${s//$'\r'/\\r}" # carriage return
  printf '%s' "$s"
}

emit_block() {
  local reason="${1:-}"
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg msg "$reason" '{ decision: "block", reason: $msg }'
  else
    printf '{ "decision": "block", "reason": "%s" }\n' "$(_emit_json_escape "$reason")"
  fi
}

emit_ask() {
  local reason="${1:-}"
  local event="${2:-PreToolUse}"
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg msg "$reason" --arg ev "$event" '{
      hookSpecificOutput: {
        hookEventName: $ev,
        permissionDecision: "ask",
        permissionDecisionReason: $msg
      }
    }'
  else
    printf '{ "hookSpecificOutput": { "hookEventName": "%s", "permissionDecision": "ask", "permissionDecisionReason": "%s" } }\n' \
      "$(_emit_json_escape "$event")" "$(_emit_json_escape "$reason")"
  fi
}

emit_additional_context() {
  local message="${1:-}"
  local event="${2:-PreToolUse}"
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg msg "$message" --arg ev "$event" '{
      hookSpecificOutput: {
        hookEventName: $ev,
        additionalContext: $msg
      }
    }'
  else
    printf '{ "hookSpecificOutput": { "hookEventName": "%s", "additionalContext": "%s" } }\n' \
      "$(_emit_json_escape "$event")" "$(_emit_json_escape "$message")"
  fi
}
