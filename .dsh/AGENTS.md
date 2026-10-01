<!--
# CAWS-MANAGED-HOOK
# hook_pack: dsh
# hook_pack_version: 3
# caws_min_major: 11
# lineage_refs: 1,4,6,8,11,12,13,16,17,19,22,23,24,25,26,27,28,29,30,31
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

# CAWS DeepSeek Harness Hook Pack

This directory is the **DeepSeek Harness (DSH) vendor adapter** for the CAWS hook
pack. It contains only this surface doc. All shared hook logic lives in the CAWS
shared core, installed at `.caws/hooks/` in the consumer repo.

DSH differs from the claude-code/codex/opencode adapters in **where the shim
lives**. claude-code and codex fire hooks by invoking an external bash command
named in a config file; opencode interposes via a repo-local, auto-discovered TS
plugin. DSH's interposition is a **harness-loaded plugin** (`hookMechanism:
harness-plugin` for `dsh` in `packages/caws-cli/surfaces/registry.json`, the
single source of truth for per-surface facts), loaded from the **DSH profile's
bundle list** — not from a repo-local file and not from a settings key. So this
pack installs no shim: it installs the shared core (via the `shared` pack) plus
this doctrine file.

The CAWS reference adapter is the `@caws/dsh-bundle` bundle (repo
`caws-dsh-bundle`), which composes three plugins: `caws-hooks` (policy
dispatch), `caws-session-log` (turn-log fold), and `caws-agents-lifecycle`
(CLI-mediated leases). Read that name as the reference bundle, never as the
wiring test — the authoritative question is what the live profile loads, which
the check under [Activation](#activation) answers.

## Layout

```
.caws/hooks/            # shared core — event dispatchers + all guard/check hooks
  dispatch/             # pre_tool_use.sh, post_tool_use.sh, session_start.sh, stop.sh, pre_compact.sh
  lib/                  # parse-input.sh, run-handlers.sh, emit.sh, agent-surface.sh, ...
  <shared hooks>.sh     # scope-guard, block-dangerous, worktree-guard, god-object-check, ...

.dsh/                   # DSH adapter (this directory when installed)
  AGENTS.md             # this file
```

The plugin contains **zero CAWS guard logic**. It is a translator: it maps
DSH's interception points onto the shared bash dispatchers and converts a
dispatcher block decision into DSH's typed tool decisions. Every guard runs from
the shared core unchanged.

## How the plugin works

| DSH interception point        | Routes to                               | Effect |
| ----------------------------- | --------------------------------------- | ------ |
| `tools/pre-execute`           | `.caws/hooks/dispatch/pre_tool_use.sh`  | Runs the guard chain. block/deny → `PreToolDecision.deny`; ask → `PreToolDecision.ask` (resolved through the DSH approval seam); `additionalContext` → queued into the batch. |
| `tools/post-execute`          | `.caws/hooks/dispatch/post_tool_use.sh` | Audit + advisory quality checks; block → `PostToolDecision.block` with feedback. |
| `agent/session-start`         | `.caws/hooks/dispatch/session_start.sh` | Lease registration / session log open. Detached, best-effort. |
| `agent/turn-stopping`         | `.caws/hooks/dispatch/stop.sh`          | Session log finalize / lease stop; a blocking stop-worktree check steers another step. |

Tool-name normalization: DSH uses lowercase tool names (`bash`/`write`/`edit`/
`read`/`grep`/`glob`); the plugin maps these to the CAWS dispatcher vocabulary
(`Bash`/`Write`/`Edit`, …) that the shared guards were written against.

Path resolution: the plugin resolves the repo root at **runtime** by walking up
from the session cwd to the nearest `.caws/`, then sets `CAWS_AGENT_SURFACE=dsh`
and `CAWS_PROJECT_DIR=<root>` on every dispatcher invocation. There is no
install-time token substitution.

## Blocking semantics

DSH supports allow/ask/deny on `tools/pre-execute` via the typed
`PreToolDecision` and the approval seam, so this surface uses the **ask**
permission vocab: a CAWS `ask` becomes a real confirmation prompt (rejection
degrades to a normalized denial), not a silent allow.

## Fail posture

If `.caws/hooks/dispatch/` is absent (CAWS not installed for this repo), the
plugin no-ops — it allows every tool rather than blocking all work over a
missing install. Run `caws init --agent-surface dsh` to install the shared core.
Once the dispatchers exist, their own posture takes over: transient payload
errors fail open (exit 0), a missing core lib fails loud-and-safe (exit 2 →
block).

## Activation

DSH loads plugins at **profile start**. Installing this pack mid-session does NOT
activate the plugin until the profile is reloaded. Activation is a property of
the profile, and the profile is where to check it — a settings key is not part
of this surface's wiring, so `~/.dsh/settings.yaml` says nothing either way
about whether the guard chain is live.

A profile's tree is composed in layers, and the layers are not interchangeable:
**each bundle in the profile's `dsh.profile.bundles` contributes its own patch**
(declared as `dsh.bundle.patch` in that bundle's `package.json`), then the
profile's own `cordis.patch.yml`, then any `--patch` overlays. The CAWS plugin
ids arrive in the **bundle's** patch — the profile's own layer is additional and
is empty on a stock profile, so reading it alone answers nothing.

Resolve the composed tree rather than assuming which layer carries what:

```sh
# 1. which bundles the profile composes (`dsh.profile.bundles`)
python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['dsh']['profile']['bundles'])" \
  ~/.dsh/profiles/<name>/package.json
# 2. the reference bundle's own patch — the layer carrying the CAWS plugin ids
#    (the bundle declares it as `dsh.bundle.patch` in its package.json)
cat ~/.dsh/profiles/node_modules/@caws/dsh-bundle/cordis.patch.yml
# 3. the profile's own layer, which is additional and may be empty
cat ~/.dsh/profiles/<name>/cordis.patch.yml
```

The CAWS planes are active when the composed tree carries the three plugin ids
`caws-hooks`, `caws-session-log`, and `caws-agents-lifecycle`, and a session in a
`.caws/` repo sees live guard output (a `CAWS hook context` injection on a
governed tool call, or a guard refusal). Add the reference adapter to a profile
with:

```sh
dsh plugin --profile <name> add @caws/dsh-bundle
```

Then restart the profile. After `caws init --agent-surface dsh`, the shared core
is installed; the plugin only takes effect once the profile loads it.

## Managed file headers

Every managed file in this pack carries a `CAWS-MANAGED-HOOK` header. The header
is what `caws init` uses to distinguish managed files (safe to update under a
documented policy) from local user files (refused without explicit `--adopt` or
`--overwrite`).
