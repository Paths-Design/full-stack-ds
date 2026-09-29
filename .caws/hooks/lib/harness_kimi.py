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
"""Kimi wire normalization, preserving the existing CAWS surface contract."""
import json
from typing import Any
from harness_common import HarnessModule, TranscriptRowAdapter, parse_timestamp

def _is_kimi_row(obj: dict[str, Any]) -> bool:
    # Every kimi wire row stamps `time` (epoch ms); claude and qwen rows stamp
    # `timestamp` and never carry `time`. A numeric `time` plus a string
    # `type` is unique to kimi across the three shapes. (The kimi `metadata`
    # header row has no `time` and falls through to the claude branches,
    # which ignore its unmatched type.)
    return isinstance(obj.get("time"), (int, float)) and obj.get("type") in {"turn.prompt", "context.append_loop_event"}


def _parse_kimi_row(obj: dict[str, Any], _ts: str | None) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    # kimi `time` is epoch MILLISECONDS (wire protocol 1.4); parse_timestamp's
    # numeric branch expects seconds, so convert here rather than per-event.
    raw_time = obj.get("time")
    ts = parse_timestamp(raw_time / 1000) if isinstance(raw_time, (int, float)) else None
    kind = obj.get("type")

    if kind == "turn.prompt":
        # Human turn input: {input: [{type: "text", text}], origin: {kind}}.
        for block in obj.get("input") or []:
            if not isinstance(block, dict):
                continue
            text = block.get("text")
            if isinstance(text, str) and text.strip():
                events.append({"ev": "user_text", "text": text, "ts": ts})
        return events

    if kind != "context.append_loop_event":
        # context.append_message duplicates turn.prompt for user messages
        # (same text, one row later) — claiming it would open each turn
        # twice. Everything else (llm.request, usage.record, config.update,
        # tools.update_store, plan_mode.*, compaction rows) is harness
        # telemetry, not agent work.
        return events

    event = obj.get("event")
    if not isinstance(event, dict):
        return events
    sub = event.get("type")

    if sub == "content.part":
        part = event.get("part")
        if not isinstance(part, dict):
            return events
        # {type: "text", text} is model output; {type: "think", think} is
        # reasoning. Both become assistant_text (the timeline's reasoning
        # kind) — kimi's think parts are this surface's reasoning trace.
        part_type = part.get("type")
        text = part.get("text") if part_type == "text" else part.get("think") if part_type == "think" else None
        if isinstance(text, str) and text.strip():
            events.append({"ev": "assistant_text", "text": text, "ts": ts})

    elif sub == "tool.call":
        args = event.get("args")
        tool_input = dict(args) if isinstance(args, dict) else {}
        if "file_path" not in tool_input and isinstance(tool_input.get("path"), str):
            tool_input["file_path"] = tool_input["path"]
        events.append(
            {
                "ev": "tool_use",
                "name": event.get("name", ""),
                "id": event.get("toolCallId", ""),
                "input": tool_input,
                "ts": ts,
            }
        )

    elif sub == "tool.result":
        result = event.get("result")
        if not isinstance(result, dict):
            result = {}
        output = result.get("output", "")
        if not isinstance(output, str):
            output = json.dumps(output, ensure_ascii=False)
        events.append(
            {
                "ev": "tool_result",
                "id": event.get("toolCallId", ""),
                "content": output,
                "is_error": bool(result.get("isError")),
                "ts": ts,
            }
        )

    # step.begin / step.end carry usage and latency telemetry, not content.
    return events



MODULE = HarnessModule(name="kimi-code", adapters=(
    TranscriptRowAdapter("kimi-code", _is_kimi_row, _parse_kimi_row),))
