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
"""Claude Code harness adapter: normalize Claude-native transcript rows.

Claude Code emits JSONL rows of shape {"type": "user"|"assistant"|"attachment",
"message": {...}, "timestamp": ...}. This module owns the translation from
that shape to canonical renderer events.

The same row shape is also what lib/opencode-transcript.py and
lib/zcode-transcript.py emit after reconstructing from their SQLite stores, so
this adapter is the workhorse for three surfaces (claude-code natively, plus
opencode and zcode via their reconstruct scripts). opencode-specific and
zcode-specific noise is owned by their respective modules; this module owns
only claude-code's own injected noise.

Behavior moved verbatim from session_log_renderer.py (v17 of the hook pack).
"""

from __future__ import annotations

import re
from typing import Any

from harness_common import (
    TranscriptRowAdapter,
    parse_hook_stdout,
    parse_timestamp,
)

# User-role rows Claude Code injects that are not human turns: slash-command
# echoes, local-command wrappers, session-continuation banners, and hook-block
# echoes. Left unfiltered these open phantom turns (an empty turn-NNN.json)
# that persist into the session log. The renderer concatenates these with
# contributions from other harness modules to form the full noise filter.
NOISE_PREFIXES: tuple[str, ...] = (
    "<local-command",
    "<command-name",
    "<command-message",
    "<local-command-stdout",
    "<local-command-caveat",
    "This session is being continued",
    # Slash-command body + hook-block echoes. A hook-intercepted command
    # (/copy-turn, /replay-last, /reorient) is delivered as a user-role event
    # in three shapes — a <command-message>/<command-name> wrapper (covered
    # above), the skill body text, and the block reason echoed back as
    # "Operation stopped by hook:". None of these are agent work.
    #
    # The /copy-turn command body is matched by its sentinel first line
    # ("<!-- copy-turn:" — version-agnostic on purpose), not by its prose:
    # the prose prefix below it broke silently when the body was reworded
    # (2026-08-18, the v2 async-fallback rewrite). The prose prefix stays for
    # transcripts written before the sentinel existed.
    "<!-- copy-turn:",
    "This slash command's behavior is handled entirely by",
    "Operation stopped by hook:",
)


def extract_text_from_content_blocks(content: Any) -> str:
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""

    blocks = []
    for item in content:
        if not isinstance(item, dict):
            continue
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            blocks.append(text)
            continue
        if item.get("type") == "json":
            value = item.get("json")
            if value is not None:
                import json

                blocks.append(json.dumps(value, ensure_ascii=False))
    return "\n\n".join(blocks)


def extract_tool_result_content(entry: dict[str, Any]) -> str:
    tool_use_result = entry.get("tool_use_result")
    if isinstance(tool_use_result, dict):
        file_payload = tool_use_result.get("file")
        if isinstance(file_payload, dict):
            content = file_payload.get("content")
            if isinstance(content, str) and content.strip():
                return content
        text = tool_use_result.get("text")
        if isinstance(text, str) and text.strip():
            return text
    item_content = extract_text_from_content_blocks(entry.get("content"))
    if item_content.strip():
        return item_content
    return entry.get("content", "") or ""


# !-command shell activity. When the user runs `! <cmd>` in a session, the
# harness records TWO user-role rows: <bash-input>cmd</bash-input>, then
# <bash-stdout>…</bash-stdout><bash-stderr>…</bash-stderr>. These are user
# actions, not prompts — filtered as turn-openers but CAPTURED as user_shell
# events (a `! git push` after the last turn is often the record of the work
# shipping; discarding it like <local-command-stdout> would erase it).
# The harness entity-escapes inside these tags (observed: `main -&gt; main`
# for `main -> main`), so captured text is html-unescaped. Accepted risk: a
# command whose real output contains a literal `&gt;` is over-unescaped.
_BASH_INPUT_RE = re.compile(r"<bash-input>(.*?)</bash-input>", re.DOTALL)
_BASH_STDOUT_RE = re.compile(r"<bash-stdout>(.*?)</bash-stdout>", re.DOTALL)
_BASH_STDERR_RE = re.compile(r"<bash-stderr>(.*?)</bash-stderr>", re.DOTALL)


def _shell_event(text: str, ts: str | None) -> dict[str, Any] | None:
    import html

    if text.startswith("<bash-input>"):
        match = _BASH_INPUT_RE.search(text)
        return {
            "ev": "user_shell",
            "command": html.unescape(match.group(1)) if match else text,
            "ts": ts,
        }
    if text.startswith("<bash-stdout>") or text.startswith("<bash-stderr>"):
        stdout = _BASH_STDOUT_RE.search(text)
        stderr = _BASH_STDERR_RE.search(text)
        return {
            "ev": "user_shell",
            "stdout": html.unescape(stdout.group(1)) if stdout else "",
            "stderr": html.unescape(stderr.group(1)) if stderr else "",
            "ts": ts,
        }
    return None


# Older harness versions delivered interjection prompts wrapped in
# <user>…</user>; the current shape is bare text. Normalize so consumers see
# one format (SESSION-LOG-REMOTE-DEBRIEF-001 A5).
_USER_WRAP_RE = re.compile(r"\A\s*<user>(.*)</user>\s*\Z", re.DOTALL)


def _normalize_interjection(text: str) -> str:
    match = _USER_WRAP_RE.match(text)
    return (match.group(1) if match else text).strip()


def _matches_claude(row: dict[str, Any]) -> bool:
    return row.get("type") in {"user", "assistant", "attachment"}


def _row_lineage(obj: dict[str, Any]) -> dict[str, Any]:
    """Carry a row's identity and its parent's onto the canonical event.

    The renderer needs both to detect a rewind: a re-typed prompt re-parents
    onto the record that closed the earlier turn (observed: a
    `system/turn_duration` row), so two turn-opening prompts sharing a
    parent_uuid are the same conversational slot occupied twice.

    A null/absent parentUuid is NOT lineage — it is the transcript's root, and
    every resumed session can carry several of them. Emitting it would make
    every root-parented prompt collide with every other, so it is dropped here
    rather than filtered downstream.
    """
    lineage: dict[str, Any] = {}
    uuid_value = obj.get("uuid")
    parent_value = obj.get("parentUuid")
    if isinstance(uuid_value, str) and uuid_value:
        lineage["uuid"] = uuid_value
    if isinstance(parent_value, str) and parent_value:
        lineage["parent_uuid"] = parent_value
    return lineage


def _token_count(value: Any) -> int:
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else 0


def _api_request_event(
    obj: dict[str, Any], message: dict[str, Any], ts: str | None
) -> dict[str, Any] | None:
    """One event per API response, carrying that response's usage.

    Claude Code writes ONE transcript row per assistant content block, and
    every row of a multi-block reply repeats the same `message.usage`
    verbatim (verified: zero rows sharing (message.id, requestId) carried a
    differing token tuple across a 1,124-row transcript). So usage is
    deduplicated downstream on that key and taken once — summing the rows
    would roughly double every count.

    A row with no `message.usage` yields no event at all, so a harness that
    records no usage renders the block absent rather than zero-filled.
    """
    usage = message.get("usage")
    message_id = message.get("id")
    if not isinstance(usage, dict) or not isinstance(message_id, str) or not message_id:
        return None
    request_id = obj.get("requestId")
    model = message.get("model")
    return {
        "ev": "api_request",
        "message_id": message_id,
        "request_id": request_id if isinstance(request_id, str) and request_id else None,
        "model": model if isinstance(model, str) and model else None,
        "usage": {
            "input": _token_count(usage.get("input_tokens")),
            "cache_read": _token_count(usage.get("cache_read_input_tokens")),
            "cache_write": _token_count(usage.get("cache_creation_input_tokens")),
            "output": _token_count(usage.get("output_tokens")),
        },
        "ts": ts,
    }


def normalize_claude_row(obj: dict[str, Any], _state: dict[str, Any]) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    ts = parse_timestamp(obj.get("timestamp"))
    kind = obj.get("type")
    if kind == "user":
        content = obj.get("message", {}).get("content")
        lineage = _row_lineage(obj)
        if isinstance(content, str):
            shell = _shell_event(content, ts)
            events.append(
                shell if shell else {"ev": "user_text", "text": content, "ts": ts, **lineage}
            )
        elif isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                if item.get("type") == "tool_result":
                    events.append({
                        "ev": "tool_result",
                        "id": item.get("tool_use_id", ""),
                        "content": extract_tool_result_content(item),
                        "tool_use_result": item.get("tool_use_result"),
                        "is_error": item.get("is_error", False),
                        "ts": ts,
                    })
                elif item.get("type") == "text":
                    text = item.get("text", "")
                    shell = _shell_event(text, ts)
                    events.append(
                        shell if shell else {"ev": "user_text", "text": text, "ts": ts, **lineage}
                    )
    elif kind == "assistant":
        message = obj.get("message")
        message = message if isinstance(message, dict) else {}
        api_request = _api_request_event(obj, message, ts)
        if api_request is not None:
            events.append(api_request)
        content = message.get("content", [])
        if isinstance(content, list):
            for item in content:
                if not isinstance(item, dict):
                    continue
                if item.get("type") == "text":
                    events.append({"ev": "assistant_text", "text": item.get("text", ""), "ts": ts})
                elif item.get("type") == "tool_use":
                    events.append({
                        "ev": "tool_use",
                        "name": item.get("name", ""),
                        "id": item.get("id", ""),
                        "input": item.get("input", {}) if isinstance(item.get("input"), dict) else {},
                        "ts": ts,
                    })
    elif kind == "attachment":
        attachment = obj.get("attachment")
        if isinstance(attachment, str):
            if "'queued_command'" in attachment and "'human'" in attachment:
                match = re.search(r"'prompt':\s*'(.*?)',\s*'commandMode'", attachment, re.DOTALL)
                if match:
                    events.append({
                        "ev": "interjection",
                        "text": _normalize_interjection(match.group(1)),
                        "ts": ts,
                    })
        elif isinstance(attachment, dict) and attachment.get("type") == "queued_command":
            origin = attachment.get("origin")
            if isinstance(origin, dict) and origin.get("kind") == "human":
                raw_prompt = attachment.get("prompt", "")
                prompt = raw_prompt if isinstance(raw_prompt, str) else extract_text_from_content_blocks(raw_prompt)
                if prompt and prompt.strip():
                    events.append({
                        "ev": "interjection",
                        "text": _normalize_interjection(prompt),
                        "ts": ts,
                    })
        elif isinstance(attachment, dict) and attachment.get("type") == "hook_success":
            hook_context = parse_hook_stdout(attachment.get("stdout"))
            if hook_context is not None:
                hook_context.update({
                    "ev": "hook_context",
                    "hook_name": attachment.get("hookName"),
                    "hook_event": hook_context.get("hook_event") or attachment.get("hookEvent"),
                    "tool_use_id": attachment.get("toolUseID"),
                    "exit_code": attachment.get("exitCode"),
                    "duration_ms": attachment.get("durationMs"),
                    "ts": ts,
                })
                events.append(hook_context)
    return events


from harness_common import HarnessModule  # noqa: E402

MODULE = HarnessModule(
    name="claude",
    adapters=(
        TranscriptRowAdapter("claude", _matches_claude, normalize_claude_row),
    ),
    noise_prefixes=NOISE_PREFIXES,
)
