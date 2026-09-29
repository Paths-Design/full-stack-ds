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
"""DeepSeek Harness (DSH) adapter: normalize DSH-native session rows.

DSH persists sessions as zstd-compressed JSONL of events shaped
{"type": "...", "seq": N, "time": <epoch-ms>, "data": {...}, "surfaceOp"?}.
This module owns the translation from those rows to canonical renderer events.

DSH is streaming-first: it also emits assistant/chunk / text-chunks /
reasoning-chunks / tool-call-chunks rows carrying partial content. Those are
sub-events of assistant/message and tool/call, so this adapter skips them — the
complete message/tool events are authoritative.
"""

from __future__ import annotations

import json
from typing import Any

from harness_common import (
    HarnessModule,
    TranscriptRowAdapter,
    parse_timestamp,
)

# DSH rows this adapter owns. Everything else (chunks, agent/*, request/*,
# goal/change, todo/write, sandbox/*, permission/*, ...) is ignored.
DSH_EVENT_TYPES = frozenset({
    "turn/start",
    "user/message",
    "assistant/message",
    "tool/call",
    "tool/result",
})


def _matches_dsh(row: dict[str, Any]) -> bool:
    return row.get("type") in DSH_EVENT_TYPES


def _ts_ms(obj: dict[str, Any]) -> str | None:
    # DSH records wall-clock time in epoch milliseconds; harness_common's
    # parse_timestamp interprets a numeric value as epoch SECONDS.
    raw = obj.get("time")
    if isinstance(raw, (int, float)):
        return parse_timestamp(raw / 1000.0)
    return parse_timestamp(raw)


def _text_blocks(blocks: Any, want: set[str]) -> list[str]:
    if not isinstance(blocks, list):
        return []
    out: list[str] = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        if b.get("type") not in want:
            continue
        text = b.get("text")
        if isinstance(text, str) and text.strip():
            out.append(text)
    return out


def normalize_dsh_row(obj: dict[str, Any], _state: dict[str, Any]) -> list[dict[str, Any]]:
    ts = _ts_ms(obj)
    data = obj.get("data")
    if not isinstance(data, dict):
        return []
    kind = obj.get("type")

    if kind == "turn/start":
        return [{"ev": "turn_boundary", "turn_id": data.get("turn"), "ts": ts}]

    if kind == "user/message":
        source = data.get("source")
        if not isinstance(source, dict) or source.get("kind") != "user":
            # Injected instructions (agent-instructions / skill-catalog), goal
            # state, system-prompt and plugin context are instruction material,
            # not human turns.
            return []
        return [
            {"ev": "user_text", "text": text, "ts": ts}
            for text in _text_blocks(data.get("content"), {"text"})
        ]

    if kind == "assistant/message":
        message = data.get("message")
        if not isinstance(message, dict):
            return []
        # Emit visible text only; reasoning and tool-call blocks are covered by
        # tool/call events (and reasoning is model-internal).
        return [
            {"ev": "assistant_text", "text": text, "ts": ts}
            for text in _text_blocks(message.get("content"), {"text"})
        ]

    if kind == "tool/call":
        args = data.get("arguments")
        if isinstance(args, str):
            try:
                args = json.loads(args)
            except json.JSONDecodeError:
                args = {"raw": args}
        if not isinstance(args, dict):
            args = {}
        return [{
            "ev": "tool_use",
            "name": data.get("name", ""),
            "id": data.get("callId", ""),
            "input": args,
            "ts": ts,
        }]

    if kind == "tool/result":
        message = data.get("message")
        if not isinstance(message, dict):
            return []
        events: list[dict[str, Any]] = []
        for block in message.get("content", []):
            if not isinstance(block, dict) or block.get("type") != "tool-result":
                continue
            text = "\n\n".join(_text_blocks(block.get("content"), {"text"}))
            events.append({
                "ev": "tool_result",
                "id": block.get("toolCallId", ""),
                "content": text,
                "is_error": block.get("isError", False),
                "ts": ts,
            })
        return events

    return []


MODULE = HarnessModule(
    name="dsh",
    adapters=(
        TranscriptRowAdapter("dsh", _matches_dsh, normalize_dsh_row),
    ),
)
