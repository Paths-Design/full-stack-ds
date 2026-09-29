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
"""ZCode harness adapter: normalize ZCode model_io transcript rows.

This adapter handles ZCode's native {"type": "model_io", "response": {...}}
shape — the format written to ZCode's per-hook-fire temp files
($TMPDIR/zcode-claude-hook-*/transcript.jsonl) and rollout tails. The
durable ZCode store (SQLite) is reconstructed into Claude-shaped rows by
lib/zcode-transcript.py and consumed by the claude adapter; this adapter
exists for the raw model_io path that can reach the renderer directly via
$TRANSCRIPT_PATH.

Behavior moved verbatim from session_log_renderer.py (v17 of the hook pack).
"""

from __future__ import annotations

from typing import Any

from harness_common import TranscriptRowAdapter, parse_timestamp

# ZCode injects a harness reminder as a user-role row when the TodoWrite tool
# hasn't been fired recently. It is not a human turn; left unfiltered it opens
# phantom turns. The renderer concatenates this with other harness modules'
# noise_prefixes.
NOISE_PREFIXES: tuple[str, ...] = (
    "The TodoWrite tool hasn't been used recently",
)


def append_zcode_model_io_events(
    events: list[dict[str, Any]], obj: dict[str, Any], last_turn_id: str | None
) -> str | None:
    turn_id = obj.get("turnId")
    if not isinstance(turn_id, str) or not turn_id:
        turn_id = None

    started_ts = parse_timestamp(obj.get("startedAt") or obj.get("timestamp"))
    completed_ts = parse_timestamp(obj.get("completedAt") or obj.get("timestamp") or obj.get("startedAt"))

    if turn_id and turn_id != last_turn_id:
        events.append({"ev": "turn_boundary", "turn_id": turn_id, "ts": started_ts})
        last_turn_id = turn_id

    response = obj.get("response")
    if not isinstance(response, dict):
        return last_turn_id

    text = response.get("text")
    if isinstance(text, str) and text.strip():
        events.append({"ev": "assistant_text", "text": text, "ts": completed_ts})

    tool_calls = response.get("toolCalls")
    if isinstance(tool_calls, list):
        for item in tool_calls:
            if not isinstance(item, dict):
                continue
            tool_input = item.get("input")
            events.append(
                {
                    "ev": "tool_use",
                    "name": item.get("name", ""),
                    "id": item.get("id", ""),
                    "input": tool_input if isinstance(tool_input, dict) else {},
                    "ts": completed_ts,
                }
            )

    return last_turn_id


def _matches_zcode(row: dict[str, Any]) -> bool:
    return row.get("type") == "model_io"


def normalize_zcode_row(obj: dict[str, Any], state: dict[str, Any]) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    state["zcode_turn_id"] = append_zcode_model_io_events(
        events, obj, state.get("zcode_turn_id")
    )
    return events


from harness_common import HarnessModule  # noqa: E402

MODULE = HarnessModule(
    name="zcode",
    adapters=(
        TranscriptRowAdapter("zcode", _matches_zcode, normalize_zcode_row),
    ),
    noise_prefixes=NOISE_PREFIXES,
)
