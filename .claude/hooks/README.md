<!--
# CAWS-MANAGED-HOOK
# hook_pack: claude-code
# hook_pack_version: 23
# caws_min_major: 11
# lineage_refs: 8,11,16,17,19,22,23,24,27
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
-->

# CAWS Claude Code Hook Pack — Inventory

Human-facing inventory of the v11 Claude Code hook pack. For the **agent
doctrine** (managed-file rules, spec-authoring traps, v10/v11 state model,
`settings.json` wiring) see [`CLAUDE.md`](./CLAUDE.md) in this directory —
that machine-local file describes installed doctrine; this tracked README is an inventory. Effective native registration, `caws hooks list`, and the executable guard implementation establish the running behavior; this inventory does not prove activation.

Repository owners can grow these CAWS-managed templates. Executable guards remain protected against direct agent mutation through both file and Bash channels; editable-template headers do not grant an exception. Use supported CAWS CLI installation/update paths. Markdown inventory edits are admitted.

These are CAWS-managed files — a **starting point, not an end state**. CAWS owns
the WHY/WHAT (why each guard exists, what it enforces); your repo owns the HOW
(thresholds, env tuning, repo-specific checks). **Editing these hooks to grow
your governance is expected and welcome.** The one edit that is out of bounds is
editing a hook to *bypass or weaken a guard* to dodge a block — that crosses
into the WHY/WHAT CAWS owns. Your grown edits are preserved: as long as a hook
keeps its `CAWS-MANAGED-HOOK` header, `caws init` classifies it as drift and
**refuses to overwrite it** — re-run with `--adopt` to keep yours, `--overwrite`
to preview the replacement diff (nothing is written), or `--overwrite --force` to
pull the upstream baseline. (Editing a marked hook does not make
it unmanaged; only deleting the header does.) See [`CLAUDE.md`](./CLAUDE.md)
§ *This pack is a starting point* for the full stance.

## How the pack runs

Claude Code reads `.claude/settings.json` at session start and invokes five
dispatchers under `caws_dispatch/`. Each reads stdin once via
`lib/parse-input.sh`, then fans out to a registered handler list via
`lib/run-handlers.sh`.

| Dispatcher | Claude Code event | Matcher | Timeout |
|---|---|---|---|
| `caws_dispatch/pre_tool_use.sh` | `PreToolUse` | Bash, Read, Write, Edit, Glob, Grep, NotebookEdit | 45 s |
| `caws_dispatch/post_tool_use.sh` | `PostToolUse` | Write, Edit, Bash, ExitPlanMode | 60 s |
| `caws_dispatch/session_start.sh` | `SessionStart` | — | 30 s |
| `caws_dispatch/stop.sh` | `Stop` | — | 30 s |
| `caws_dispatch/session_end.sh` | `SessionEnd` | — | 10 s |

`session-log.sh` is additionally wired on `PreCompact` so transcripts survive
context compaction.

**Exit-code contract** (per handler, aggregated by the dispatcher): `2` =
hard block (short-circuits remaining handlers, tool call refused); `1` =
non-blocking warning (message shown, dispatcher continues, returns the max
non-2 code); `0` = pass. The dispatcher itself fails **open** — if it errors
before any handler runs, it exits 0 rather than turning its own bug into a
block.

## PreToolUse handlers (in dispatch order)

Handlers self-filter on `$HOOK_TOOL_NAME`; a non-matching tool is a cheap exit 0.

| Handler | Self-filters to | What it does |
|---|---|---|
| `agent-heartbeat.sh` | all | Heartbeats the session lease; surfaces parallel-agent presence via `additionalContext` when more than one agent is active. Never blocks. |
| `cwd-guard.sh` | all | Blocks (exit 2) when the working directory no longer exists on disk (e.g. a worktree was deleted while the session was inside it), with a recovery hint. |
| `block-dangerous.sh` + `classify_command.py` | Bash | Classifies catastrophic git ops, tokenized-argv bypasses, pipe-to-shell, and the protected-guard self-mod set; arms a per-session **danger latch** that blocks all subsequent Bash until a human runs `reset-danger-latch.sh`. |
| `worktree-guard.sh` | Bash | When worktrees are active: blocks amend/stash/reset/force-push, canonical-checkout mutating git, `git sparse-checkout` (any subcommand — points to `caws worktree repair-sparse`), and the path-restore family (`git restore <path>`, `git checkout -- <path>`, `git clean`). |
| `scope-guard.sh` | Write, Edit, Bash | Blocks edits outside the bound spec's `scope.in`; in union mode (no binding) checks all active specs. Applies progressive strikes via the `guard-strikes.sh` library. |
| `worktree-write-guard.sh` | Write, Edit | Blocks base-branch writes when worktrees are active; refuses `<worktree>/.caws/specs/*` writes (canonical authority); routes `.caws/worktrees/<name>/*` payload writes through `lib/worktree-claim-oracle.cjs` so a foreign session's write hard-blocks. |
| `bash-write-guard.sh` | Bash | Extracts mutation targets (redirection, `tee`, `sed -i`, `perl -pi`, `truncate`, `touch`, `rm`, `mv`, `cp`, `dd of=`, git path-restore) and routes each through the same `worktree-claim-oracle.cjs` — a Bash mutation of a foreign worktree's payload blocks at the same boundary as a foreign Write/Edit. |
| `worktree-pin-guard.sh` | Bash | **OPT-IN** (Entry 41): pins a session whose project root is inside `.caws/worktrees/<name>` to that worktree — refuses commands whose working directory resolves outside it, blocks `git -C` / leading-`cd` git redirects to the canonical checkout or another worktree, and RELEASES the pin with an advisory when the pinned directory no longer exists (merge/destroy deleted it), so a session that merges its own worktree is never bricked. `caws worktree merge`/`destroy`/`create`/`ensure` stay reachable as the sanctioned exit/re-point verbs. |
| `protected-paths.sh` | Write, Edit, Bash | Blocks direct mutation of executable/shared hook artifacts under `.caws/hooks/`, vendor hook directories, protected machine-runtime paths, and strike-state files (exit 2). Markdown documentation under hook directories is admitted; unrecognized extensions remain protected. Repository ownership does not authorize direct agent edits; use supported CAWS CLI update paths. |
| `scan-secrets.sh` | Write, Edit, Bash | Advisory (exit 0): warns via `additionalContext` when a target path matches common secret-bearing patterns (`.env*`, `*.pem`, `*.key`, SSH/cloud config dirs). Does not block. |
| `quiet-merge.sh` | Bash | Must run **last** — emits `updatedInput`. Rewrites `caws worktree merge`/`destroy` to `cd <repo-root> && <cmd> 2>/dev/null | tail -3` so the CWD survives the directory being destroyed mid-command, and trims verbose output. |

## PostToolUse handlers

| Handler | Self-filters to | What it does |
|---|---|---|
| `naming-check.sh` | Write (new files) | Advisory (exit 0): flags shadow-file naming — banned modifier suffixes (`-new`, `-enhanced`, `-v2`, `-final`, `-copy`, …), version suffixes, date stamps. Test files with canonical extensions are exempted. |
| `god-object-check.sh` | Write, Edit | Advisory (exit 0): flags a file whose SLOC exceeds `CAWS_GOD_OBJECT_LOC` (default 2000). |
| `shortcut-language-check.sh` | Write, Edit | Progressive (warn→ask→block via the `guard-strikes.sh` library): flags TODO/FIXME/XXX/placeholder/"not implemented" stub language in non-test source. |
| `duplicate-export-check.sh` | Write (new JS/TS) | Advisory (exit 0): flags an exported symbol whose exact name already exists in the enclosing package's src tree (generic-name allowlist). |
| `loc-delta-check.sh` | Edit | Advisory (exit 0): flags an added-line delta over `CAWS_LOC_DELTA_WARN_THRESHOLD` (default 300) from the new/old payload diff. |
| `plan-transcript-snapshot.sh` | ExitPlanMode | Snapshots the conversation transcript next to the plan when a plan is presented; companion to `plan-transcript-finalize.sh`. |

`quality-check.sh` and `validate-spec.sh` exist in the pack but are **commented
out** of the PostToolUse handler list (opt-in), and `worktree-pin-guard.sh` is
**commented out** of the PreToolUse handler list (opt-in — a session-level
worktree pin is a repo policy choice; see failure-lineage Entry 41). Wire them
in `dispatch/post_tool_use.sh` / `dispatch/pre_tool_use.sh` if you want them.

## SessionStart / Stop / SessionEnd handlers

| Handler | Event | What it does |
|---|---|---|
| `session-caws-status.sh` | SessionStart | Surfaces inherited dirty-state collision, foreign-claim soft-block, and CLI/pack version skew. Warnings only. |
| `agent-register.sh` | SessionStart | Registers the session into the `.caws/leases/` liveness substrate via `caws agents register`. Non-blocking. |
| `agent-stop.sh` | Stop | Marks the lease stopped on clean exit via `caws agents stop`. Best-effort — a crashed session never reaches Stop; heartbeat TTL is the primary liveness signal. |
| `plan-transcript-finalize.sh` | Stop | Overwrites each pending plan snapshot with the final turn-end transcript. |
| `session-log.sh` | SessionEnd | Seals `.meta.json` with `ended: {reason, ts}` and the session's aggregate token usage. |

`audit.sh` runs on both PreToolUse and PostToolUse, appending a per-tool-call
audit entry. `session-log.sh` runs on PostToolUse and `PreCompact`, writing the
per-turn narrative and structured transcripts via `session_log_renderer.py`.

## Session-log diagnostic signals

The renderer records three signals that describe *how* a turn ran, on top of
what it did. They are diagnostic, not governance — nothing gates on them:

| Field | Where | Meaning |
|---|---|---|
| `usage` | turn + `.meta.json` | Per-turn `{requests, input, cache_read, cache_write, output, models}`, one entry per API response, deduplicated by `(message_id, request_id)` across the whole session. Summed into `.meta.json` at SessionEnd. |
| `rewound_from` / `rewind_kind` | turn | The earlier turn number this prompt replaced, and whether the retry was a `same_prompt` or an `edited_prompt`. The superseded turn's `status` becomes `rewound`. |
| `ended_by` | turn | Splits a user interrupt into `user_interrupt_tool` (stopped a tool call) vs `user_interrupt_generation` (stopped the reply). |

Absent is meaningful: a harness that reports no usage renders **no** `usage`
key rather than a zero-filled one, so "not measured" stays distinguishable from
"measured zero".

These live in `.caws/sessions/` because raw harness transcripts are not durable
— Claude Code's `cleanupPeriodDays` purges them on its own schedule, and a purge
takes the only record of a session's cost and steering history with it.

## Shared libraries (`lib/`) — sourced, not wired

These are **not** handlers in any dispatcher list. Other hooks `source` them.

| Library | Sourced by | Provides |
|---|---|---|
| `lib/parse-input.sh` | every handler / dispatcher | parses the tool-call JSON into `HOOK_*` env vars |
| `lib/run-handlers.sh` | the five dispatchers | the handler fan-out loop + exit-code aggregation |
| `lib/caws-state.sh` | state-reading hooks | v10/v11 dual-shape registry + canonical-root resolution |
| `lib/emit.sh` | hooks that emit envelopes | the three Claude Code hook-output envelope shapes |
| `lib/guard-message.sh` | the write/exec guards | stable, greppable guard-identity + remediation strings |
| `lib/worktree-claim-oracle.cjs` | `worktree-write-guard.sh`, `bash-write-guard.sh` | the single owner-vs-session ownership answer (`.cjs` so it loads as CommonJS under `"type":"module"`) |

`guard-strikes.sh` is likewise a **sourced library** (used by `scope-guard.sh`
and `shortcut-language-check.sh`), not a standalone handler — it implements the
strike-1-warn → strike-3-block progression and writes per-checkout strike state.

## Human-run escape hatches (not hooks)

These are invoked by a human at the terminal, never by the agent:

| Script | Purpose |
|---|---|
| `reset-strikes.sh` | Reset accumulated guard strikes: `--current` / `--session <uuid>` / `--worktree <name>` / `--all --confirm`. Resets are logged. |
| `reset-danger-latch.sh` | Clear the danger latch armed by `block-dangerous.sh`. |

## If a hook blocks you

1. Read the block message — it names the guard and the remediation.
2. Do not bypass by deleting/editing hook files or using `--no-verify`.
3. If the scope is wrong, widen it with `caws specs amend-scope <id> --add <path>`.
4. If strikes are stale after a legitimate scope fix, ask the user to run the
   `bash .caws/hooks/reset-strikes.sh --session <id>` command the guard printed.
   The reset scripts live in `.caws/hooks/` (shared across surfaces), not in the
   vendor dir — `.claude/` holds this adapter's settings and logs, not scripts.
5. See [`CLAUDE.md`](./CLAUDE.md) for the full doctrine.
