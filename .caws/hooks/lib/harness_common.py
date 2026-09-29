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
"""Shared types and helpers for per-harness transcript adapters.

Each harness (codex, claude-code, zcode, opencode) owns a sibling module
`harness_<name>.py` that exports a `MODULE: HarnessModule` describing how its
native transcript rows normalize to canonical events, plus what user-text
noise its surface injects.

This module holds the pieces used by 2+ harness modules or by the renderer
core (session_log_renderer.py). Harness-specific helpers belong in their own
modules, not here.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable


@dataclass(frozen=True)
class TranscriptRowAdapter:
    """Translate one harness-native transcript row into canonical events.

    The renderer applies each adapter in order; the first whose `matches`
    returns True owns the row. Canonical events are plain dicts with an `ev`
    discriminator ("user_text", "assistant_text", "tool_use", "tool_result",
    "turn_boundary", "hook_context", "audit_action"). The renderer's
    accumulate_turns() consumes those events harness-agnostically.
    """

    name: str
    matches: Callable[[dict[str, Any]], bool]
    normalize: Callable[[dict[str, Any], dict[str, Any]], list[dict[str, Any]]]


@dataclass(frozen=True)
class HarnessModule:
    """A harness's contribution to the rendering pipeline.

    Each harness owns:
    - how its native transcript rows normalize to canonical events (adapters)
    - what user-text noise prefixes its surface injects (noise_prefixes)

    The renderer assembles these contributions and applies them uniformly.
    A harness with no row-matcher of its own (e.g. opencode, whose reconstruct
    script lib/opencode-transcript.py emits Claude-shaped rows consumed by the
    claude adapter) contributes an empty adapters tuple but still owns its
    noise_prefixes and any surface-specific configuration consumed by its
    reconstruct script.
    """

    name: str
    adapters: tuple[TranscriptRowAdapter, ...] = ()
    noise_prefixes: tuple[str, ...] = ()


# Tool-execution echoes name the tool inline ("Called the Read tool with the
# following input: {...}"), so a fixed prefix cannot match them without also
# catching a human sentence that happens to start "Called the ...". Match the
# full injected shape instead. Verified in both zcode and opencode stores.
TOOL_ECHO_PATTERN = re.compile(r"^Called the \S+ tool with the following input:")


def parse_timestamp(ts: Any) -> str | None:
    if not ts:
        return None
    if isinstance(ts, str):
        return ts
    if isinstance(ts, (int, float)):
        try:
            return datetime.utcfromtimestamp(ts).strftime("%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            return str(ts)
    return str(ts)


def decode_structured_text_payload(raw: str | None) -> str:
    if not isinstance(raw, str):
        return raw or ""
    payload = raw.strip()
    if not payload or payload[0] not in "[{":
        return raw
    try:
        parsed = json.loads(payload)
    except Exception:
        return raw
    items = parsed if isinstance(parsed, list) else [parsed]
    blocks = []
    for item in items:
        if isinstance(item, dict):
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                blocks.append(text)
    return "\n\n".join(blocks) if blocks else raw


def parse_context_authority_block(text: str) -> dict[str, Any] | None:
    lines = [line.rstrip() for line in text.splitlines()]
    if not lines or not lines[0].startswith("context-authority:"):
        return None

    parsed: dict[str, Any] = {
        "target": lines[0].split(":", 1)[1].strip(),
        "sections": {},
    }
    current_section: str | None = None

    for line in lines[1:]:
        stripped = line.strip()
        if not stripped:
            continue

        if not line.startswith((" ", "\t")) and ":" in stripped:
            key, value = stripped.split(":", 1)
            key = key.strip().replace("-", "_")
            value = value.strip()
            current_section = None

            if key == "attachment":
                parsed["attachment"] = value
                continue

            if value:
                parsed["sections"][key] = [] if value == "(none)" else [value]
                continue

            parsed["sections"].setdefault(key, [])
            current_section = key
            continue

        if current_section:
            if stripped.startswith("- "):
                parsed["sections"][current_section].append(stripped[2:].strip())
            else:
                parsed["sections"][current_section].append(stripped)

    return parsed


def parse_hook_stdout(stdout: str | None) -> dict[str, Any] | None:
    if not isinstance(stdout, str) or not stdout.strip():
        return None

    try:
        payload = json.loads(stdout)
    except json.JSONDecodeError:
        return None

    if not isinstance(payload, dict):
        return None

    hook_output = payload.get("hookSpecificOutput")
    if not isinstance(hook_output, dict):
        return None

    additional_context = hook_output.get("additionalContext")
    if not isinstance(additional_context, str) or not additional_context.strip():
        return None

    parsed: dict[str, Any] = {
        "hook_event": hook_output.get("hookEventName"),
        "additional_context": additional_context,
    }

    context_authority = parse_context_authority_block(additional_context)
    if context_authority is not None:
        parsed["kind"] = "context_authority"
        parsed["context_authority"] = context_authority
    else:
        parsed["kind"] = "additional_context"

    return parsed


def patch_paths(patch: str) -> list[str]:
    """Extract file paths from a Codex/Git apply-patch block.

    Used by the codex adapter (inner action extraction) and by the renderer
    core (audit_action handling of apply_patch tool inputs).
    """
    paths: list[str] = []
    for match in re.finditer(r"^\*\*\* (?:Add|Update|Delete) File:\s*(.+?)\s*$", patch, re.MULTILINE):
        path = match.group(1).strip()
        if path and path not in paths:
            paths.append(path)
    return paths
