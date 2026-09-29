#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 9
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# CAWS Audit Hook
# Logs agent actions for compliance and debugging
# @author @darianrosebrook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true

# --- CWD resilience ---
# PostToolUse hooks fire AFTER the command runs. If the command destroyed
# the working directory (e.g., caws worktree merge deletes the worktree),
# the hook process inherits a nonexistent CWD and most commands will fail.
# Recover to a safe directory before doing anything else.
if ! pwd >/dev/null 2>&1 || [ ! -d "$(pwd 2>/dev/null || echo __gone__)" ]; then
  cd "${CAWS_PROJECT_DIR:-${HOME:-/tmp}}" 2>/dev/null || cd "${HOME:-/tmp}"
fi

parse_hook_input

# Get event type from argument or input
EVENT_TYPE="${1:-tool-use}"

# Back-compat aliases. HOOK_CWD can be "" when stdin lacks a cwd field;
# audit.sh always wants a non-empty placeholder so jq --arg stays happy.
SESSION_ID="$HOOK_SESSION_ID"
CWD="${HOOK_CWD:-.}"
HOOK_EVENT="${HOOK_EVENT_NAME:-unknown}"
TOOL_NAME="$HOOK_TOOL_NAME"
PERMISSION_MODE="$HOOK_PERMISSION_MODE"

# Ensure log directory exists
LOG_DIR="${CAWS_LOG_DIR:-${CAWS_PROJECT_DIR:-.}/${CAWS_VENDOR_DIR}/logs}"
mkdir -p "$LOG_DIR"

# Log file path
LOG_FILE="$LOG_DIR/audit.log"
DATE_LOG_FILE="$LOG_DIR/audit-$(date +%Y-%m-%d).log"

# Timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build log entry based on event type
case "$EVENT_TYPE" in
  session-start)
    SOURCE="${HOOK_SOURCE:-unknown}"
    MODEL="${HOOK_MODEL:-unknown}"
    LOG_ENTRY=$(jq -cn \
      --arg ts "$TIMESTAMP" \
      --arg sid "$SESSION_ID" \
      --arg event "session_start" \
      --arg source "$SOURCE" \
      --arg model "$MODEL" \
      --arg cwd "$CWD" \
      '{timestamp: $ts, session_id: $sid, event: $event, source: $source, model: $model, cwd: $cwd}')
    ;;

  stop)
    # HOOK_STOP_HOOK_ACTIVE is "0" or "1"; jq --argjson needs true/false.
    if [[ "$HOOK_STOP_HOOK_ACTIVE" == "1" ]]; then
      STOP_HOOK_ACTIVE="true"
    else
      STOP_HOOK_ACTIVE="false"
    fi
    LOG_ENTRY=$(jq -cn \
      --arg ts "$TIMESTAMP" \
      --arg sid "$SESSION_ID" \
      --arg event "session_stop" \
      --arg cwd "$CWD" \
      --argjson hook_active "$STOP_HOOK_ACTIVE" \
      '{timestamp: $ts, session_id: $sid, event: $event, cwd: $cwd, stop_hook_active: $hook_active}')
    ;;

  tool-use)
    # Tool-specific info lifted from HOOK_* env vars set by parse_hook_input.
    # HOOK_TOOL_INPUT_JSON and HOOK_TOOL_RESPONSE_JSON are pre-serialized
    # JSON strings, always valid (empty "{}" at minimum), so jq --argjson
    # below never trips on missing fields.
    #
    # AUDIT-JSONL-EMISSION-001: the record carries the tool payload
    # (tool_use_id / tool_input / tool_response) and a derived is_error so a
    # postmortem can reconstruct what ran and whether it failed; the compact
    # (-c) emission keeps one record on one line for line-wise consumers.
    TOOL_INPUT="$HOOK_TOOL_INPUT_JSON"
    TOOL_RESPONSE="$HOOK_TOOL_RESPONSE_JSON"
    TOOL_USE_ID="$HOOK_TOOL_USE_ID"
    FILE_PATH="$HOOK_FILE_PATH"
    COMMAND="$HOOK_COMMAND"

    LOG_ENTRY=$(jq -cn \
      --arg ts "$TIMESTAMP" \
      --arg sid "$SESSION_ID" \
      --arg event "tool_use" \
      --arg tool "$TOOL_NAME" \
      --arg tool_use_id "$TOOL_USE_ID" \
      --argjson tool_input "$TOOL_INPUT" \
      --argjson tool_response "$TOOL_RESPONSE" \
      --arg file "$FILE_PATH" \
      --arg cmd "$COMMAND" \
      --arg cwd "$CWD" \
      --arg mode "$PERMISSION_MODE" \
      '{timestamp: $ts, session_id: $sid, event: $event, tool: $tool, tool_use_id: $tool_use_id, tool_input: $tool_input, tool_response: $tool_response, is_error: (($tool_response.exit_code // 0) != 0), file: $file, command: $cmd, cwd: $cwd, permission_mode: $mode}')
    ;;

  *)
    LOG_ENTRY=$(jq -cn \
      --arg ts "$TIMESTAMP" \
      --arg sid "$SESSION_ID" \
      --arg event "$EVENT_TYPE" \
      --arg hook "$HOOK_EVENT" \
      --arg cwd "$CWD" \
      '{timestamp: $ts, session_id: $sid, event: $event, hook_event: $hook, cwd: $cwd}')
    ;;
esac

# Append to log files
echo "$LOG_ENTRY" >> "$LOG_FILE"
echo "$LOG_ENTRY" >> "$DATE_LOG_FILE"

# Success - allow operation to continue
exit 0
