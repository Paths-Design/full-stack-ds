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
"""opencode harness surface: tool/input maps, noise prefixes, and contract.

opencode keeps no flat-file transcript — history lives in
~/.local/share/opencode/opencode.db (message + part tables). lib/opencode-
transcript.py reconstructs a Claude-Code-shaped .jsonl from that DB, and
the claude adapter (harness_claude.py) consumes those rows. So opencode has
NO row-matcher adapter of its own in the renderer's adapter chain today.

This module still owns the opencode surface's contribution to the pipeline:

  - TOOL_NAME_MAP and INPUT_MAPPERS: the "how to translate opencode tool
    calls into Claude-Code tool vocabulary" knowledge. lib/opencode-
    transcript.py imports these instead of defining them locally, so the
    opencode surface owns its own translation contract in one place.

  - NOISE_PREFIXES: user-role rows opencode injects that are not human turns
    (tool-execution echoes, context-authority banners, system-reminder
    blocks). Left unfiltered these open phantom turns.

If opencode ever gains a native row shape that reaches the renderer directly
(without going through the reconstruct script), an adapter is added to the
MODULE.adapters tuple here, and the reconstruct script's output is adjusted
or retired accordingly. Until then, adapters is intentionally empty.
"""

from __future__ import annotations

from typing import Any

from harness_common import HarnessModule

# opencode tool name -> Claude Code tool name. Only mapped tools get
# structured handling in the renderer's accumulate_turns(); unmapped tools
# (e.g. opencode's "question") still render as a generic timeline entry under
# their original name, so omission here is not silent data loss.
TOOL_NAME_MAP = {
    "read": "Read",
    "write": "Write",
    "edit": "Edit",
    "bash": "Bash",
    "grep": "Grep",
    "glob": "Glob",
    "task": "Agent",
    "skill": "Skill",
    "todowrite": "TodoWrite",
}


# opencode tool -> function that maps state.input into Claude Code's expected
# tool_use.input field names.
def _map_edit_input(inp: dict[str, Any]) -> dict[str, Any]:
    return {
        "file_path": inp.get("filePath", ""),
        "old_string": inp.get("oldString", ""),
        "new_string": inp.get("newString", ""),
    }


def _map_write_input(inp: dict[str, Any]) -> dict[str, Any]:
    return {"file_path": inp.get("filePath", ""), "content": inp.get("content", "")}


def _map_read_input(inp: dict[str, Any]) -> dict[str, Any]:
    return {"file_path": inp.get("filePath", "")}


def _map_bash_input(inp: dict[str, Any]) -> dict[str, Any]:
    return {"command": inp.get("command", ""), "description": inp.get("description", "")}


def _map_search_input(inp: dict[str, Any]) -> dict[str, Any]:
    return {"pattern": inp.get("pattern", ""), "path": inp.get("path", "")}


def _map_task_input(inp: dict[str, Any]) -> dict[str, Any]:
    return {
        "prompt": inp.get("prompt", ""),
        "subagent_type": inp.get("subagent_type", ""),
        "description": inp.get("description", ""),
    }


def _map_skill_input(inp: dict[str, Any]) -> dict[str, Any]:
    return {"skill": inp.get("name", ""), "args": inp.get("args", "")}


INPUT_MAPPERS = {
    "edit": _map_edit_input,
    "write": _map_write_input,
    "read": _map_read_input,
    "bash": _map_bash_input,
    "grep": _map_search_input,
    "glob": _map_search_input,
    "task": _map_task_input,
    "skill": _map_skill_input,
}


# opencode persists harness reminders, tool-execution echoes, and injected
# context banners as role=user rows in its session DB; unfiltered they open
# phantom turns exactly like claude-code's slash-command echoes. Every prefix
# here is verified present in a real store (~/.local/share/opencode) — not a
# speculative guess. The renderer concatenates these with other harness
# modules' noise_prefixes.
NOISE_PREFIXES: tuple[str, ...] = (
    "The following tool was executed by the user",  # opencode tool echo
    "[Sterling context-authority",  # opencode context-authority injection banner
    "<system-reminder>",  # opencode-injected reminder block
)


MODULE = HarnessModule(
    name="opencode",
    # Intentionally empty: lib/opencode-transcript.py emits Claude-shaped rows
    # consumed by the claude adapter. See module docstring.
    adapters=(),
    noise_prefixes=NOISE_PREFIXES,
)
