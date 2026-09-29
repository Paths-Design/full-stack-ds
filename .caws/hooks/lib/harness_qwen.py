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
"""Qwen Code harness adapter: normalize Qwen-native transcript rows.

Qwen Code emits JSONL rows of shape {"type": "user"|"assistant"|
"tool_result"|"system", "message": {"role": ..., "parts": [...]},
"timestamp": ..., "sessionId": ..., "uuid": ..., "provenance": ...}
(Gemini-style parts, not Claude-style content blocks). Verified live
against Qwen Code 0.21.4 transcripts (~/.qwen/projects/<slug>/chats/
<session-id>.jsonl) during CAWS qwen-code surface work, 2026-08-04.

Row taxonomy (probed):
  type=user, provenance=real_user            -> human turn (parts[].text)
  type=user, subtype=mid_turn_user_message   -> mid-flight human steering
  type=user, subtype=notification            -> task-notification envelopes
                                                (text starts <task-notification>)
  type=assistant, message.parts[]            -> {text[, thought]} reasoning/
                                                output + {functionCall} tool calls
  type=tool_result                           -> {functionResponse} per part plus a
                                                row-level toolCallResult status
  type=system (ui_telemetry, attribution_snapshot, file_history_snapshot,
               slash_command, at_command)    -> harness noise; dropped

Tool names arrive as Qwen RUNTIME ids (write_file, run_shell_command, ...);
the renderer's accumulation branches key on the canonical harness names
(Write, Edit, Bash, ...), so this adapter normalizes at the boundary —
same precedent as the qwen-code parse-input.sh hook override.

Ordering contract: this module's adapters MUST run before harness_claude's.
Qwen rows use the same `type` values the claude matcher claims (user/
assistant), and the claude adapter would swallow them producing zero
events (message.parts vs message.content). The matcher below is also
parts-shaped so it never claims genuine Claude rows.
"""

from __future__ import annotations

import re
from typing import Any

from harness_common import (
    TranscriptRowAdapter,
    parse_timestamp,
)

# Qwen runtime tool id -> canonical harness tool name the renderer's
# accumulation branches understand. Unlisted ids pass through unchanged
# (they fall through the accumulation branches as generic tool calls).
QWEN_TOOL_NAME_MAP: dict[str, str] = {
    "write_file": "Write",
    "edit": "Edit",
    "read_file": "Read",
    "run_shell_command": "Bash",
    "glob": "Glob",
    "grep_search": "Grep",
    "notebook_edit": "NotebookEdit",
    "web_fetch": "WebFetch",
    "agent": "Agent",
    "skill": "Skill",
    "exit_plan_mode": "ExitPlanMode",
}

# system-row subtypes Qwen injects that are harness telemetry, not agent
# work. Kept as a named set so the match condition reads at the site that
# uses it; unrecognized system subtypes are dropped too (system rows never
# carry model output).
QWEN_SYSTEM_NOISE_SUBTYPES = {
    "ui_telemetry",
    "attribution_snapshot",
    "file_history_snapshot",
    "slash_command",
    "at_command",
}

# When a user prompt references a file (@-mention / editor context), Qwen
# delivers the file content as SEPARATE user-type rows wrapped in marker
# lines. They are context injection, not human turns — left in, each wrapper
# row opens a phantom turn and the real turn loses its tool timeline to the
# fragment after it. Matched against stripped text (the wrapper rows carry a
# leading space). Verified on 0.21.4.
_QWEN_CONTEXT_INJECTION_PATTERNS = (
    re.compile(r"^--- Content from referenced files ---"),
    re.compile(r"^--- End of content ---"),
    re.compile(r"^Content from /\S+"),
    re.compile(r"^Showing lines \d+"),
)


def _message_parts(row: dict[str, Any]) -> list[Any]:
    message = row.get("message")
    if not isinstance(message, dict):
        return []
    parts = message.get("parts")
    return parts if isinstance(parts, list) else []


def _matches_qwen(row: dict[str, Any]) -> bool:
    kind = row.get("type")
    if kind == "tool_result":
        # Only Qwen emits a top-level tool_result row type.
        return True
    if kind in ("user", "assistant"):
        # Qwen rows carry Gemini-style message.parts; Claude rows carry
        # message.content. The parts discriminator keeps this adapter from
        # claiming Claude-shaped rows (and vice versa).
        return isinstance(_message_parts(row), list) and len(_message_parts(row)) > 0
    if kind == "system":
        return "systemPayload" in row or row.get("subtype") in QWEN_SYSTEM_NOISE_SUBTYPES
    return False


def _normalize_user(row: dict[str, Any], ts: str | None) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    is_interjection = row.get("subtype") == "mid_turn_user_message"
    for part in _message_parts(row):
        if not isinstance(part, dict):
            continue
        text = part.get("text")
        if not isinstance(text, str) or not text.strip():
            continue
        stripped = text.strip()
        if any(pattern.match(stripped) for pattern in _QWEN_CONTEXT_INJECTION_PATTERNS):
            continue
        if is_interjection:
            events.append({"ev": "interjection", "text": text, "ts": ts})
        else:
            # notification rows (task-notification envelopes) flow through
            # as user_text; the renderer's SESSION_EVENT_PREFIXES routes
            # them to control events, same as Claude's task notifications.
            events.append({"ev": "user_text", "text": text, "ts": ts})
    return events


def _normalize_assistant(row: dict[str, Any], ts: str | None) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for part in _message_parts(row):
        if not isinstance(part, dict):
            continue
        text = part.get("text")
        if isinstance(text, str) and text.strip():
            events.append({"ev": "assistant_text", "text": text, "ts": ts})
            continue
        call = part.get("functionCall")
        if isinstance(call, dict):
            raw_name = call.get("name", "") or ""
            args = call.get("args")
            events.append({
                "ev": "tool_use",
                "name": QWEN_TOOL_NAME_MAP.get(raw_name, raw_name),
                "id": call.get("id", ""),
                "input": args if isinstance(args, dict) else {},
                "ts": ts,
            })
    return events


def _normalize_tool_result(row: dict[str, Any], ts: str | None) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    call_result = row.get("toolCallResult")
    status = call_result.get("status") if isinstance(call_result, dict) else None
    for part in _message_parts(row):
        if not isinstance(part, dict):
            continue
        response = part.get("functionResponse")
        if not isinstance(response, dict):
            continue
        payload = response.get("response")
        if isinstance(payload, dict):
            output = payload.get("output", "")
            if not isinstance(output, str):
                import json

                output = json.dumps(output, ensure_ascii=False)
        else:
            output = ""
        events.append({
            "ev": "tool_result",
            "id": response.get("id", "") or (call_result.get("callId", "") if isinstance(call_result, dict) else ""),
            "content": output,
            "is_error": isinstance(status, str) and status != "success",
            "ts": ts,
        })
    return events


def normalize_qwen_row(obj: dict[str, Any], _state: dict[str, Any]) -> list[dict[str, Any]]:
    ts = parse_timestamp(obj.get("timestamp"))
    kind = obj.get("type")
    if kind == "user":
        return _normalize_user(obj, ts)
    if kind == "assistant":
        return _normalize_assistant(obj, ts)
    if kind == "tool_result":
        return _normalize_tool_result(obj, ts)
    # system rows: harness noise (telemetry snapshots, slash-command echoes).
    return []


from harness_common import HarnessModule  # noqa: E402

MODULE = HarnessModule(
    name="qwen-code",
    adapters=(
        TranscriptRowAdapter("qwen-code", _matches_qwen, normalize_qwen_row),
    ),
)
