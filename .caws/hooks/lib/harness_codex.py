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
"""Codex harness adapter: normalize Codex-native transcript rows.

Codex emits JSONL rows of shape {"type": "turn_context"|"response_item",
"payload": {...}, "timestamp": ...}. This module owns the translation from
that shape to canonical renderer events, plus the Codex functions-exec
program parser that projects inner tool calls from the JS source.

Behavior moved verbatim from session_log_renderer.py (v17 of the hook pack).
"""

from __future__ import annotations

import ast
import json
import re
from typing import Any

from harness_common import (
    TranscriptRowAdapter,
    decode_structured_text_payload,
    parse_context_authority_block,
    parse_timestamp,
    patch_paths,
)

JS_STRING_TOKEN = r'("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`)'

# Codex injects the repository operating context as a user-role row that
# begins with this header. It is instruction material, not a human turn; the
# normalize function drops it. Kept as a named constant rather than inlined so
# the match condition reads at the site that uses it.
AGENTS_MD_PREFIX = "# AGENTS.md instructions for "


def decode_js_string(token: str) -> str | None:
    try:
        if token.startswith('"'):
            value = json.loads(token)
        elif token.startswith("'"):
            value = ast.literal_eval(token)
        elif token.startswith("`"):
            if "${" in token:
                return None  # Runtime interpolation is not an exact command literal.
            value = token[1:-1]
            value = re.sub(r"\\([`\\])", r"\1", value)
            value = value.replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t")
        else:
            return None
    except Exception:
        return None
    return value if isinstance(value, str) else None


def _balanced_call_argument(source: str, open_paren: int) -> tuple[str, int]:
    depth = 1
    index = open_paren + 1
    quote = ""
    escaped = False
    while index < len(source):
        char = source[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = ""
        elif char in ('"', "'", "`"):
            quote = char
        elif char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0:
                return source[open_paren + 1 : index], index + 1
        index += 1
    return source[open_paren + 1 :], len(source)


def _string_field(source: str, field: str) -> str | None:
    match = re.search(rf"(?:[\"']?{re.escape(field)}[\"']?)\s*:\s*{JS_STRING_TOKEN}", source, re.DOTALL)
    return decode_js_string(match.group(1)) if match else None


def decode_mapping(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {"raw": value}
        return parsed if isinstance(parsed, dict) else {"raw": value}
    return {}


def _js_code_positions(source: str) -> list[bool]:
    """Exclude literal/comment bytes from the optional source index.

    This is not evaluation: a call in an unexecuted branch is still syntax.
    Template interpolation is deliberately not projected; raw input survives.
    """
    code = [True] * len(source)
    index = 0
    while index < len(source):
        start = index
        if source.startswith("//", index):
            end = source.find("\n", index)
            index = len(source) if end < 0 else end
        elif source.startswith("/*", index):
            end = source.find("*/", index + 2)
            index = len(source) if end < 0 else end + 2
        elif source[index] in ("'", '"', "`"):
            quote = source[index]
            index += 1
            while index < len(source):
                if source[index] == "\\":
                    index += 2
                elif source[index] == quote:
                    index += 1
                    break
                else:
                    index += 1
        else:
            index += 1
            continue
        for offset in range(start, min(index, len(source))):
            code[offset] = False
    return code


def extract_codex_inner_actions(source: str) -> list[dict[str, Any]]:
    """Conservatively project tools.* calls from a functions.exec program.

    The raw program remains in the turn artifact regardless of whether this
    classifier recognizes every shape. This projection is therefore useful
    indexing, never the sole evidence for an unsupported call.
    """
    code = _js_code_positions(source)
    assignments: dict[str, str] = {}
    for match in re.finditer(rf"\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*{JS_STRING_TOKEN}\s*;", source, re.DOTALL):
        decoded = decode_js_string(match.group(2))
        if decoded is not None:
            assignments[match.group(1)] = decoded

    actions: list[dict[str, Any]] = []
    cursor = 0
    call_re = re.compile(r"\btools\.([A-Za-z_$][\w$]*)\s*\(")
    while True:
        call_match = call_re.search(source, cursor)
        if not call_match:
            break
        if not code[call_match.start()]:
            cursor = call_match.end()
            continue
        tool = call_match.group(1)
        args, cursor = _balanced_call_argument(source, call_match.end() - 1)
        action: dict[str, Any] = {"tool": tool, "observation_boundary": "source_syntax", "execution": "not_observed"}
        if tool == "exec_command":
            command = _string_field(args, "cmd") or _string_field(args, "command")
            if command:
                action["command"] = command
            workdir = _string_field(args, "workdir")
            if workdir:
                action["workdir"] = workdir
        elif tool == "apply_patch":
            token = args.strip()
            patch = assignments.get(token)
            if patch is None and re.fullmatch(JS_STRING_TOKEN, token, re.DOTALL):
                patch = decode_js_string(token)
            if patch is not None:
                action["files"] = patch_paths(patch)
                action["patch_preview"] = _truncate(patch, 3000)
                action["patch_length"] = len(patch)
        elif tool == "view_image":
            path = _string_field(args, "path")
            if path:
                action["path"] = path
        else:
            action["args_preview"] = _truncate(args.strip(), 3000)
        actions.append(action)

    return actions


def _truncate(text: str | None, limit: int) -> str:
    value = text or ""
    if len(value) <= limit:
        return value
    return value[:limit] + "..."


def codex_output_is_error(raw: str, decoded: str) -> bool:
    status = re.search(r"Process exited with code (\d+)", raw)
    if status and status[1] != "0":
        return True
    lowered = (decoded or raw).lstrip().lower()
    if lowered.startswith("script failed") or lowered.startswith("tool failed"):
        return True
    try:
        payload = json.loads(raw)
    except Exception:
        return False
    items = payload if isinstance(payload, list) else [payload]
    return any(
        isinstance(item, dict)
        and (item.get("is_error") is True or item.get("success") is False)
        for item in items
    )


def _matches_codex(row: dict[str, Any]) -> bool:
    return row.get("type") in {"turn_context", "response_item"}


def normalize_codex_row(obj: dict[str, Any], state: dict[str, Any]) -> list[dict[str, Any]]:
    ts = parse_timestamp(obj.get("timestamp"))
    payload = obj.get("payload")
    if not isinstance(payload, dict):
        return []
    if obj.get("type") == "turn_context":
        state["codex_turn_seen"] = True
        return [{"ev": "turn_boundary", "turn_id": payload.get("turn_id"), "ts": ts}]
    if obj.get("type") != "response_item":
        return []

    item_type = payload.get("type")
    if item_type == "message":
        role = payload.get("role")
        if role not in ("user", "assistant") or payload.get("channel") == "analysis":
            return []
        content = payload.get("content")
        if not isinstance(content, list):
            return []
        metadata = payload.get("internal_chat_message_metadata_passthrough")
        kinds = metadata.get("content_item_kinds") if isinstance(metadata, dict) else None
        if role == "user" and isinstance(kinds, list):
            content = [block for index, block in enumerate(content)
                       if index < len(kinds) and isinstance(kinds[index], str)
                       and kinds[index].startswith("user.")]
        texts = [
            item.get("text", "")
            for item in content
            if isinstance(item, dict)
            and item.get("type") in ("input_text", "output_text", "text")
            and isinstance(item.get("text"), str)
        ]
        # Codex injects the repository operating context as a user-role row.
        # It is instruction material, not a human turn.
        if role == "user" and texts and texts[0].startswith(AGENTS_MD_PREFIX):
            return []
        event_kind = "user_text" if role == "user" else "assistant_text"
        return [{"ev": event_kind, "text": text, "ts": ts} for text in texts if text.strip()]

    if item_type in ("custom_tool_call", "function_call"):
        call_id = payload.get("call_id") or payload.get("id", "")
        state["codex_pending_tool_id"] = call_id
        name = payload.get("name", "")
        args = decode_mapping(payload.get("arguments", payload.get("input")))
        if name in ("exec_command", "functions.exec_command", "shell_command"):
            name = "Bash"
            args = {**args, "command": args.get("cmd", args.get("command", ""))}
        return [{
            "ev": "tool_use",
            "name": name,
            "id": call_id,
            "input": args,
            "ts": ts,
        }]
    if item_type in ("custom_tool_call_output", "function_call_output"):
        output = payload.get("output", "")
        if not isinstance(output, str):
            output = json.dumps(output, sort_keys=True, ensure_ascii=False)
        decoded = decode_structured_text_payload(output)
        call_id = payload.get("call_id") or payload.get("id", "")
        if state.get("codex_pending_tool_id") == call_id:
            state.pop("codex_pending_tool_id", None)
        return [{
            "ev": "tool_result",
            "id": call_id,
            "content": output,
            "is_error": codex_output_is_error(output, decoded),
            "ts": ts,
        }]
    return []


from harness_common import HarnessModule  # noqa: E402

MODULE = HarnessModule(
    name="codex",
    adapters=(
        TranscriptRowAdapter("codex", _matches_codex, normalize_codex_row),
    ),
)
