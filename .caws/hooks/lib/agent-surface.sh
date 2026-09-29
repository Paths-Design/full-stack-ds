#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: (new in shared-core-001)
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# Surface resolver — derives harness-specific values from CAWS_AGENT_SURFACE.
#
# WHY THIS EXISTS. The shared core must not branch on a hardcoded harness name
# or read a harness-specific env var directly (architecture invariant from
# docs/architecture/hook-pack-shared-core.md §"Dependency-injection environment
# contract"). All harness specifics reach shared scripts through an injected
# environment set by the vendor wiring at hook-invocation time.
#
# This file is the single point that maps the injected CAWS_AGENT_SURFACE into
# the derived values every shared hook needs:
#
#   CAWS_VENDOR_DIR     — the harness's dot-directory name (e.g. ".claude",
#                         ".codex"). No trailing slash.
#   CAWS_LOG_DIR        — absolute path to the harness's log directory
#                         ($CAWS_PROJECT_DIR/<vendor>/logs). Requires
#                         CAWS_PROJECT_DIR to be non-empty; otherwise empty.
#   CAWS_PLATFORM_FLAG  — the value to pass as --platform to any CAWS CLI
#                         invocations that accept it (e.g. "claude-code",
#                         "codex").
#   CAWS_PERMISSION_VOCAB — "ask" when the harness supports a PreToolUse "ask"
#                         decision (Claude Code), "deny" when it does not
#                         (Codex maps ask->deny). Used by emit.sh to select
#                         the correct permission-decision vocabulary.
#   CAWS_SUPPORTS_UPDATED_INPUT — "1" when the harness honors the PreToolUse
#                         updatedInput contract (quiet-merge.sh rewrites the
#                         command), "0" when it does not (kimi-code: no
#                         documented updatedInput contract; qwen-code:
#                         documented but not enforced in 0.21.x — quiet-merge
#                         passes the command through unrewritten).
#   CAWS_INSTRUCTION_FILES — space-separated root instruction filenames the
#                         harness reads at the repo root (e.g. "CLAUDE.md" for
#                         claude-code, "AGENTS.override.md AGENTS.md" for codex,
#                         and "AGENTS.md" for opencode/zcode).
#                         Used by worktree-write-guard.sh's allowlist so a
#                         session editing its harness's doctrine file does not
#                         trip the base-branch write guard. The unknown-surface
#                         fallback lists BOTH common files (fail-safe for
#                         multi-surface repos).
#
# PROJECT ROOT RESOLUTION (back-compat fallback chain):
#   CAWS_PROJECT_DIR is the canonical env var injected by the vendor wiring.
#   If it is not set (not-yet-migrated wiring), this resolver falls back to:
#     1. CLAUDE_PROJECT_DIR  (legacy Claude Code wiring)
#     2. CODEX_PROJECT_DIR   (legacy Codex wiring)
#     3. .  (cwd — last resort)
#   The resolved value is re-exported as CAWS_PROJECT_DIR so all downstream
#   scripts can use the single canonical name.
#
#   HOOK-PROJECT-DIR-ROOT-NOT-CWD-01: a vendor *_PROJECT_DIR may be the
#   session's CWD rather than the repo root (zcode sets CLAUDE_PROJECT_DIR to
#   the session cwd, which is often a package-bearing subdirectory). A
#   subdirectory value would fragment every CAWS_PROJECT_DIR-derived path
#   (CAWS_LOG_DIR, the heartbeat lease cache, the audit log) into a stray
#   <subdir>/.caws or <subdir>/.zcode. So each candidate is NORMALIZED to its
#   git repo root via `git rev-parse --show-toplevel` before adoption — the
#   same invariant the codex dispatcher already binds (hook-install.ts
#   codexCommand: CAWS_PROJECT_DIR=$REPO_ROOT). This is a no-op when the
#   candidate is already the root (Claude Code, Codex). On git-absent or
#   not-a-repo, the raw candidate is kept (fail-open — never downgrade a real
#   vendor signal to "."); the bare "." fallback is reached ONLY when no
#   vendor *_PROJECT_DIR is set at all.
#
# SURFACES:
#   claude-code  — Claude Code (Anthropic CLI). Default when CAWS_AGENT_SURFACE
#                  is unset, preserving back-compat for any existing wiring that
#                  does not yet inject the surface identity.
#   codex        — OpenAI Codex CLI.
#   zcode        — ZCode CLI. Strict-JSON hook output contract; the vendor
#                  wiring installs a bridge wrapper (caws-bridge.sh) that
#                  re-wraps non-JSON shared-dispatcher output as valid
#                  additionalContext envelopes. Supports PreToolUse ask.
#   kimi-code    — Kimi Code CLI. Hooks live ONLY in the user-level
#                  $KIMI_CODE_HOME/config.toml (no project-level config), so
#                  the wiring is a repo-conditional shim (caws-kimi-hook.sh)
#                  that resolves the git root at invocation time (codex
#                  precedent) and no-ops outside CAWS repos. Deny-only PreToolUse
#                  vocab (verified live: "ask" does not block); block reasons
#                  go to stderr with exit 2.
#   qwen-code    — Qwen Code CLI. Hooks live in the repo-local
#                  .qwen/settings.json, but Qwen exports no env var that
#                  reliably names the repo root (QWEN_CODE_PROJECT_DIR is the
#                  per-project state dir under ~/.qwen/projects/<slug>, probed
#                  live on 0.21.4), so the wiring is a repo-conditional shim
#                  (caws-qwen-hook.sh) that resolves the git root at
#                  invocation time (codex/kimi precedent) and no-ops outside
#                  CAWS repos. Full allow/deny/ask PreToolUse vocab (ask
#                  prompts interactively and degrades to deny in
#                  headless/background); updatedInput is documented but NOT
#                  enforced in 0.21.x, so quiet-merge passes the command
#                  through unrewritten.
#   (future)     — cursor, windsurf, vscode, idea, ... Add a case arm below.
#
# IDEMPOTENT: safe to source multiple times.
#
# FAIL-OPEN: unknown surface falls through to the claude-code defaults so a
# misconfigured wiring does not become a hard block.

if [[ -n "${_CAWS_AGENT_SURFACE_SH_LOADED:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi
_CAWS_AGENT_SURFACE_SH_LOADED=1

# ---------------------------------------------------------------------------
# 1. Resolve CAWS_PROJECT_DIR with the back-compat fallback chain.
#
#    HOOK-PROJECT-DIR-ROOT-NOT-CWD-01: normalize each vendor *_PROJECT_DIR
#    candidate to its git repo root before adopting it, because some harnesses
#    (zcode) inject the session CWD there, and a CWD that is a package-bearing
#    subdirectory would fragment all CAWS_PROJECT_DIR-derived paths into a
#    stray <subdir>/.caws / <subdir>/.zcode. `git rev-parse --show-toplevel`
#    is cwd-independent and idempotent (a no-op when the candidate is already
#    the root, so Claude Code / Codex are unaffected). On git-absent or a
#    candidate that is not inside a repo, keep the raw candidate (fail-open —
#    it is still the best available signal, and never silently downgrade a real
#    vendor value to "."). The bare "." fallback is reached ONLY when no
#    vendor *_PROJECT_DIR is set at all.
# ---------------------------------------------------------------------------
# Resolve a candidate directory to its git repo root, cwd-independent. Prints
# the root on success, nothing on failure (not a repo / git missing). Never
# exits non-zero: callers treat empty output as "no root available".
_caws_to_git_root() {
  local d="${1:-}"
  [[ -z "$d" ]] && return 0
  command -v git >/dev/null 2>&1 || return 0
  local root
  root="$(cd "$d" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$root" ]] && printf '%s\n' "$root"
  return 0
}

if [[ -z "${CAWS_PROJECT_DIR:-}" ]]; then
  # A registry vendor name is not a project root. Complete root resolution
  # regardless of which libraries the caller has already sourced.
  _CAWS_VENDOR_DIR_CANDIDATE=""
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
    _CAWS_VENDOR_DIR_CANDIDATE="$CLAUDE_PROJECT_DIR"
  elif [[ -n "${CODEX_PROJECT_DIR:-}" ]]; then
    _CAWS_VENDOR_DIR_CANDIDATE="$CODEX_PROJECT_DIR"
  fi

  if [[ -n "$_CAWS_VENDOR_DIR_CANDIDATE" ]]; then
    # Normalize the candidate to its git repo root (HOOK-PROJECT-DIR-ROOT-
    # NOT-CWD-01). On failure keep the raw candidate — fail-open.
    _CAWS_NORMALIZED_ROOT="$(_caws_to_git_root "$_CAWS_VENDOR_DIR_CANDIDATE")"
    if [[ -n "$_CAWS_NORMALIZED_ROOT" ]]; then
      CAWS_PROJECT_DIR="$_CAWS_NORMALIZED_ROOT"
    else
      CAWS_PROJECT_DIR="$_CAWS_VENDOR_DIR_CANDIDATE"
    fi
  else
    CAWS_PROJECT_DIR="."
  fi

  unset _CAWS_VENDOR_DIR_CANDIDATE _CAWS_NORMALIZED_ROOT
fi
unset -f _caws_to_git_root
export CAWS_PROJECT_DIR

# ---------------------------------------------------------------------------
# 2. Default CAWS_AGENT_SURFACE when unset (back-compat: old wiring did not
#    inject this variable; default to claude-code to preserve behavior).
# ---------------------------------------------------------------------------
: "${CAWS_AGENT_SURFACE:=claude-code}"
export CAWS_AGENT_SURFACE

# ---------------------------------------------------------------------------
# 3. Derive per-surface values.
# ---------------------------------------------------------------------------
# Capture an explicitly preset CAWS_AGENT_PROCESS_NAMES BEFORE the case arms
# overwrite it (see the preserve block after the case).
_CAWS_AGENT_PROCESS_NAMES_PRESET="${CAWS_AGENT_PROCESS_NAMES:-}"
case "$CAWS_AGENT_SURFACE" in
  claude-code)
    CAWS_VENDOR_DIR=".claude"
    CAWS_PLATFORM_FLAG="claude-code"
    CAWS_PERMISSION_VOCAB="ask"
    CAWS_INSTRUCTION_FILES="CLAUDE.md"
    CAWS_AGENT_PROCESS_NAMES="claude"
    ;;
  codex)
    CAWS_VENDOR_DIR=".codex"
    CAWS_PLATFORM_FLAG="codex"
    # Codex has no PreToolUse "ask" decision; map ask -> deny.
    CAWS_PERMISSION_VOCAB="deny"
    CAWS_INSTRUCTION_FILES="AGENTS.override.md AGENTS.md"
    CAWS_AGENT_PROCESS_NAMES="codex"
    ;;
  cursor)
    CAWS_VENDOR_DIR=".cursor"
    CAWS_PLATFORM_FLAG="cursor"
    CAWS_PERMISSION_VOCAB="ask"
    CAWS_INSTRUCTION_FILES="AGENTS.md"
    CAWS_AGENT_PROCESS_NAMES="cursor"
    ;;
  windsurf)
    CAWS_VENDOR_DIR=".windsurf"
    CAWS_PLATFORM_FLAG="windsurf"
    CAWS_PERMISSION_VOCAB="ask"
    CAWS_INSTRUCTION_FILES="AGENTS.md"
    CAWS_AGENT_PROCESS_NAMES="windsurf"
    ;;
  opencode)
    CAWS_VENDOR_DIR=".opencode"
    CAWS_PLATFORM_FLAG="opencode"
    # opencode has no PreToolUse "ask" — its only block primitive is throw
    # inside tool.execute.before (see .opencode/plugins/caws.ts). Map ask ->
    # deny, matching the codex adapter precedent.
    CAWS_PERMISSION_VOCAB="deny"
    CAWS_INSTRUCTION_FILES="AGENTS.md"
    CAWS_AGENT_PROCESS_NAMES="opencode"
    ;;
  zcode)
    CAWS_VENDOR_DIR=".zcode"
    CAWS_PLATFORM_FLAG="zcode"
    # ZCode supports allow/ask/deny for PreToolUse — same as Claude Code.
    CAWS_PERMISSION_VOCAB="ask"
    CAWS_INSTRUCTION_FILES="AGENTS.md"
    # CAWS-AGENT-PID-SESSION-CORRELATION-001: the agent process basename(s)
    # whose PID identifies this session in the process tree. ZCode's agent
    # runs as `zcode-cli` (a child of `zcode-host-local-N`, itself a child of
    # the ZCode app); the host is also listed so the PID-walk can stop at the
    # per-session agent even if the cli process is briefly absent during a
    # tool-spawn race. Used by resolveAgentPid (lib/agent-pid.sh) to key the
    # agent-pid-<pid>.json correlation record — the canonical-checkout
    # identity bridge for harnesses that export no session-id env var.
    CAWS_AGENT_PROCESS_NAMES="zcode-cli zcode-host-local-1 zcode-host-local-2 zcode-host-local-3"
    ;;
  kimi-code)
    CAWS_VENDOR_DIR=".kimi-code"
    CAWS_PLATFORM_FLAG="kimi-code"
    # Kimi has no PreToolUse "ask" decision that blocks (verified live on
    # 0.31.1: ask degrades to allow); map ask -> deny, matching the codex
    # adapter precedent.
    CAWS_PERMISSION_VOCAB="deny"
    CAWS_INSTRUCTION_FILES="AGENTS.md"
    # No documented updatedInput contract — quiet-merge passes the command
    # through unrewritten on this surface.
    CAWS_SUPPORTS_UPDATED_INPUT="0"
    CAWS_AGENT_PROCESS_NAMES="kimi-code kimi"
    ;;
  qwen-code)
    CAWS_VENDOR_DIR=".qwen"
    CAWS_PLATFORM_FLAG="qwen-code"
    # Qwen Code supports allow/deny/ask natively (verified live on 0.21.4):
    # interactive sessions prompt on ask; headless/background contexts
    # degrade ask -> deny automatically. Same vocab as Claude Code.
    CAWS_PERMISSION_VOCAB="ask"
    CAWS_INSTRUCTION_FILES="QWEN.md"
    # updatedInput is documented but NOT enforced in 0.21.x (probed
    # 2026-08-03, tmp/qwen-hook-probe-findings.md) — quiet-merge passes the
    # command through unrewritten on this surface.
    CAWS_AGENT_PROCESS_NAMES="qwen qwen-code"
    CAWS_SUPPORTS_UPDATED_INPUT="0"
    ;;
  dsh)
    CAWS_VENDOR_DIR=".dsh"
    CAWS_PLATFORM_FLAG="dsh"
    # DSH supports allow/ask/deny on tools/pre-execute via the typed
    # PreToolDecision + the approval seam (ask prompts through ctx.approval).
    CAWS_PERMISSION_VOCAB="ask"
    CAWS_INSTRUCTION_FILES="AGENTS.md"
    CAWS_AGENT_PROCESS_NAMES="dsh"
    ;;
  *)
    # Unknown surface — fall through to claude-code defaults so a
    # misconfigured wiring does not become a hard block. Emit a warning to
    # stderr so the operator can investigate, but do NOT exit non-zero.
    # CAWS_INSTRUCTION_FILES lists BOTH common root doctrine files so a
    # multi-surface repo with an unrecognized surface still allowlists its
    # instruction file(s) in the worktree-write-guard.
    printf '[agent-surface.sh] WARNING: unknown CAWS_AGENT_SURFACE=%s; defaulting to claude-code values\n' \
      "$CAWS_AGENT_SURFACE" >&2
    CAWS_VENDOR_DIR=".claude"
    CAWS_PLATFORM_FLAG="claude-code"
    CAWS_PERMISSION_VOCAB="ask"
    CAWS_INSTRUCTION_FILES="CLAUDE.md AGENTS.md"
    # Unknown surface: no process names -> the agent-PID tier fail-opens
    # (returns no identity), falling through to the existing chain. This is
    # the deliberate safe default for an unrecognized harness.
    CAWS_AGENT_PROCESS_NAMES=""
    ;;
esac

# Every live agent process name any surface arm above can resolve to. The
# test-harness attestation (3a) filters against this set, so a process serving
# a real session can never become a kill target under test. Adding a surface
# arm without extending this list silently re-opens
# CAWS-DEFECT-BATS-TRAP-KILLS-LIVE-AGENT-01; tests/hooks/bats/agent-surface.bats
# enumerates the arms and fails closed when one is missing here.
CAWS_AGENT_LIVE_PROCESS_NAMES="claude codex cursor windsurf opencode dsh \
zcode-cli zcode-host-local-1 zcode-host-local-2 zcode-host-local-3 \
kimi-code kimi qwen qwen-code"

# ---------------------------------------------------------------------------
# 3a. CAWS-DEFECT-BATS-TRAP-KILLS-LIVE-AGENT-01: test-harness attestation.
#
# The guards are executed two ways. Under a real harness the hook env is
# harness-owned and the guard's ancestors are the session's own processes —
# which is exactly what makes the identity-verified SIGTERM sound. Under the
# bats suite the guard is exec'd as a CHILD OF THE AGENT'S OWN BASH TOOL, so
# both of those premises invert: the env is agent-reachable, and walking the
# ancestry finds the live `claude` process running the tests. A latch armed in
# one test plus a denied attempt in the next then escalates to a real SIGTERM
# against the developer's session. Temp-dir isolation does not cover this: it
# scopes where the sentinel FILE lands, not whose PID the walk resolves.
#
# The attestation is a marker inside the resolved project's .caws/hooks/. That
# location is the gate, not the filename: protected-paths.sh refuses agent
# Write/Edit under .caws/hooks/, and `caws init` never emits this file — so an
# agent cannot mint the attestation in a governed repo, while a mktemp fixture
# creates it freely. It grants exactly one thing (do not aim the kill at a live
# agent), never a block, strike or latch bypass.
# ---------------------------------------------------------------------------
_CAWS_TEST_HARNESS=0
if [[ -n "${CAWS_PROJECT_DIR:-}" && "$CAWS_PROJECT_DIR" != "." &&
      -f "$CAWS_PROJECT_DIR/.caws/hooks/.test-harness" ]]; then
  _CAWS_TEST_HARNESS=1
fi
export CAWS_TEST_HARNESS="$_CAWS_TEST_HARNESS"

# Preserve an explicitly preset CAWS_AGENT_PROCESS_NAMES over the surface
# default (DANGER-LATCH-QUARANTINE-TRAP-001): operators steer ancestor-identity
# resolution this way. Under a real harness the hook env is harness-owned (an
# agent's Bash-tool env cannot reach it), so this is an operator control, not
# an agent-controllable kill-steer.
if [[ -n "${_CAWS_AGENT_PROCESS_NAMES_PRESET:-}" ]]; then
  CAWS_AGENT_PROCESS_NAMES="$_CAWS_AGENT_PROCESS_NAMES_PRESET"
fi

# Under the attestation, no live agent-surface name may remain a kill target.
# A test may aim the trap only at a sacrificial process it spawned itself;
# trap_resolve_agent_identity treats an empty list as "identity unresolvable,
# hold the kill".
#
# The two arms differ only in loudness, and deliberately. Clearing the SURFACE
# DEFAULT is the ordinary attested case, so it is silent: guards emit their
# decision envelope on stdout while bats merges stderr into the same capture,
# and a chatty lib here corrupts every JSON assertion in the suite. Dropping a
# name an explicit PRESET supplied is a caller being overruled, so it says so.
if [[ "$_CAWS_TEST_HARNESS" == "1" ]]; then
  if [[ -z "${_CAWS_AGENT_PROCESS_NAMES_PRESET:-}" ]]; then
    CAWS_AGENT_PROCESS_NAMES=""
  elif [[ -n "${CAWS_AGENT_PROCESS_NAMES:-}" ]]; then
    _CAWS_SAFE_NAMES=""
    for _caws_name in $CAWS_AGENT_PROCESS_NAMES; do
      case " $CAWS_AGENT_LIVE_PROCESS_NAMES " in
        *" $_caws_name "*)
          printf '[agent-surface.sh] test harness: refusing live agent process name as trap target: %s\n' \
            "$_caws_name" >&2
          ;;
        *) _CAWS_SAFE_NAMES="${_CAWS_SAFE_NAMES:+$_CAWS_SAFE_NAMES }$_caws_name" ;;
      esac
    done
    CAWS_AGENT_PROCESS_NAMES="$_CAWS_SAFE_NAMES"
    unset _CAWS_SAFE_NAMES _caws_name
  fi
fi
export CAWS_AGENT_PROCESS_NAMES CAWS_AGENT_LIVE_PROCESS_NAMES

# ---------------------------------------------------------------------------
# 3b. DANGER-LATCH-QUARANTINE-TRAP-001: per-surface kill-escalation enablement.
#
# When a quarantined session makes a further non-read-only attempt, the trap
# may terminate the session's agent process (SIGTERM) — but ONLY on surfaces
# where one process == one session. Hosts where a single server process serves
# many sessions/threads (DSH server, Cursor/Windsurf IDE hosts, opencode
# server) must NOT kill: the PID names the shared host, not the offender.
# An operator can force either way by presetting CAWS_TRAP_KILL in the env
# (the `:-` default form keeps a preset env value authoritative).
# ---------------------------------------------------------------------------
case "$CAWS_AGENT_SURFACE" in
  claude-code|codex|zcode|kimi-code|qwen-code) _CAWS_TRAP_KILL_DEFAULT=1 ;;
  *) _CAWS_TRAP_KILL_DEFAULT=0 ;;
esac
# Under the test-harness attestation the DEFAULT flips off, so a test that
# never mentions the trap cannot fire one. A test that is specifically
# exercising escalation still presets CAWS_TRAP_KILL=1 and is still bounded by
# the live-name filter in 3a — the two controls are independent on purpose.
if [[ "$_CAWS_TEST_HARNESS" == "1" ]]; then
  _CAWS_TRAP_KILL_DEFAULT=0
fi
: "${CAWS_TRAP_KILL:=$_CAWS_TRAP_KILL_DEFAULT}"
export CAWS_TRAP_KILL

# ---------------------------------------------------------------------------
# 4. Derive CAWS_LOG_DIR from the resolved project dir and vendor dir.
# ---------------------------------------------------------------------------
if [[ -n "${CAWS_PROJECT_DIR:-}" && "${CAWS_PROJECT_DIR}" != "." ]]; then
  CAWS_LOG_DIR="${CAWS_PROJECT_DIR}/${CAWS_VENDOR_DIR}/logs"
  if [[ "${CAWS_SYSTEM_RUNTIME:-0}" == "1" && -n "${CAWS_MACHINE_LOG_DIR:-}" ]]; then
    CAWS_LOG_DIR="$CAWS_MACHINE_LOG_DIR"
  fi
else
  # Project dir is "." (relative fallback) or empty — use a relative path.
  # Individual hooks that need an absolute log dir must resolve cwd themselves.
  CAWS_LOG_DIR="${CAWS_VENDOR_DIR}/logs"
fi

# Default updatedInput support ON for every surface that has been emitting it
# (all surfaces predating this flag); the kimi-code arm above opts out.
: "${CAWS_SUPPORTS_UPDATED_INPUT:=1}"

# ---------------------------------------------------------------------------
# 4b. Derive CAWS_HOOKS_DIR — where the hook SCRIPTS live.
#
# This is NOT the vendor dir. Logs are vendor-scoped (.claude/logs,
# .codex/logs, ...) because each harness writes its own; the hook scripts are
# shared and live in the CAWS-vendored tree (.caws/hooks/) for EVERY surface.
#
# Remediation text that tells a human to run reset-strikes.sh /
# reset-danger-latch.sh must interpolate THIS, not CAWS_VENDOR_DIR — a guard
# that names a path which does not resolve turns a correct refusal into an
# unrecoverable block, because the agent is (by design) barred from clearing
# its own strike/latch state and can only hand the command to a human.
#
# A candidate only wins if it actually CONTAINS the reset scripts. Deriving the
# path from this file's location alone is not enough: under `caws init` the
# shared templates are read from a package directory that is NOT the installed
# hooks tree, so a self-relative guess yields a real-looking path with no
# scripts in it — the same "names a path that does not resolve" failure this
# variable exists to prevent, just harder to spot. Validate, then fall back.
#
# BASH_SOURCE is referenced defensively: this lib is sourced by hooks that run
# under `set -u`, where a bare ${BASH_SOURCE[0]} is a fatal unbound reference
# in some invocation shapes.
# ---------------------------------------------------------------------------
if [[ -z "${CAWS_HOOKS_DIR:-}" ]]; then
  _caws_hooks_candidates=()

  _caws_self="${BASH_SOURCE[0]:-}"
  if [[ -n "$_caws_self" ]]; then
    _caws_lib_dir="$(cd "$(dirname "$_caws_self")" 2>/dev/null && pwd)"
    [[ -n "$_caws_lib_dir" ]] && _caws_hooks_candidates+=("$(dirname "$_caws_lib_dir")")
  fi

  if [[ -n "${CAWS_PROJECT_DIR:-}" && "${CAWS_PROJECT_DIR}" != "." ]]; then
    _caws_hooks_candidates+=("${CAWS_PROJECT_DIR}/.caws/hooks")
  fi
  _caws_hooks_candidates+=(".caws/hooks")

  for _caws_cand in "${_caws_hooks_candidates[@]}"; do
    if [[ -f "${_caws_cand}/reset-strikes.sh" ]]; then
      CAWS_HOOKS_DIR="$_caws_cand"
      break
    fi
  done

  # Nothing validated — name the canonical location rather than a wrong guess.
  if [[ -z "${CAWS_HOOKS_DIR:-}" ]]; then
    if [[ -n "${CAWS_PROJECT_DIR:-}" && "${CAWS_PROJECT_DIR}" != "." ]]; then
      CAWS_HOOKS_DIR="${CAWS_PROJECT_DIR}/.caws/hooks"
    else
      CAWS_HOOKS_DIR=".caws/hooks"
    fi
  fi

  unset _caws_hooks_candidates _caws_self _caws_lib_dir _caws_cand
fi

export CAWS_VENDOR_DIR CAWS_PLATFORM_FLAG CAWS_PERMISSION_VOCAB CAWS_INSTRUCTION_FILES CAWS_LOG_DIR CAWS_HOOKS_DIR CAWS_SUPPORTS_UPDATED_INPUT

# ---------------------------------------------------------------------------
# 5. caws_source_lib <basename>
#
# Resolve and source a lib file with vendor-override-first priority:
#
#   1. Vendor override: ${CAWS_PROJECT_DIR}/${CAWS_VENDOR_DIR}/hooks/lib/<basename>
#      This is where a per-vendor adapter places overriding lib files (e.g.
#      codex/hooks/lib/emit.sh). The adapter is installed by `caws init` into
#      the consumer's vendor dir; shared scripts source from here first.
#
#   2. Shared fallback: ${CAWS_SHARED_LIB_DIR}/<basename>
#      CAWS_SHARED_LIB_DIR must be exported by the dispatcher (or any script
#      that needs lib resolution) BEFORE sourcing this file, or set to the
#      invoking script's own lib/ directory. Dispatchers set it as:
#        CAWS_SHARED_LIB_DIR="$HOOKS_DIR/lib"   (HOOKS_DIR = .caws/hooks)
#      Individual guard hooks (invoked via run_handlers) inherit
#      CAWS_SHARED_LIB_DIR from the dispatcher's environment; if it is not
#      set they fall back to resolving it from BASH_SOURCE[0].
#
# Semantics:
#   - Sources the first candidate that exists as a regular file.
#   - Returns 0 on success, non-zero if neither candidate exists.
#   - Fail-open by design: callers should append `|| true` or `|| exit 0`
#     as appropriate; this function does NOT exit non-zero fatally.
#
# IDEMPOTENT: guard files (.sh) typically carry their own
# double-source guard (e.g. `_CAWS_EMIT_SH_LOADED`), so repeat
# calls are cheap.
# ---------------------------------------------------------------------------
caws_source_lib() {
  local basename="${1:-}"
  [[ -z "$basename" ]] && return 1

  # An adopted project declares intentional local overrides explicitly. Old
  # vendored adapter copies are not allowed to shadow the machine runtime.
  # This branch is entered only by the machine launcher; legacy dispatch keeps
  # its existing resolution order below.
  if [[ "${CAWS_MACHINE_RUNTIME:-}" == 1 ]]; then
    local _machine_local
    _machine_local="$(python3 -c 'import json,os,sys; p=json.loads(os.environ.get("CAWS_MACHINE_LIBRARIES", "{}")); print(p.get(sys.argv[1], ""))' "$basename")" || return 1
    if [[ -n "$_machine_local" ]]; then
      source "${CAWS_MACHINE_POLICY_ROOT}/${_machine_local}"
      return $?
    fi
    # CAWS-HOOKPACK-HOME-UNSET-ROOT-AUTHORITY-ALIAS-001: only probe the
    # machine-user override when a real home is known. With both CAWS_HOME
    # and HOME absent, defaulting to "" would resolve this to
    # /surfaces/.../lib/<basename> at the filesystem root and, if a file
    # happened to exist there, SOURCE it as a trusted override -- an absent
    # home must mean this tier is unavailable, not rooted at "/".
    local _machine_home=""
    if [[ -n "${CAWS_HOME:-}" ]]; then
      _machine_home="$CAWS_HOME"
    elif [[ -n "${HOME:-}" ]]; then
      _machine_home="${HOME}/.caws"
    fi
    if [[ -n "$_machine_home" ]]; then
      local _machine_user="${_machine_home}/surfaces/${CAWS_AGENT_SURFACE}/lib/${basename}"
      if [[ -f "$_machine_user" ]]; then
        source "$_machine_user"
        return $?
      fi
    fi
    if [[ -f "${CAWS_MACHINE_ADAPTER_LIB_DIR}/${basename}" ]]; then
      source "${CAWS_MACHINE_ADAPTER_LIB_DIR}/${basename}"
      return $?
    fi
    source "${CAWS_SHARED_LIB_DIR}/${basename}"
    return $?
  fi

  # Determine shared lib dir: prefer the exported env var, fall back to
  # locating it relative to this file (lib/ sibling).
  local _shared_lib
  if [[ -n "${CAWS_SHARED_LIB_DIR:-}" ]]; then
    _shared_lib="$CAWS_SHARED_LIB_DIR"
  else
    _shared_lib="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)"
  fi

  # 1. Vendor override candidate
  local _vendor_override=""
  if [[ -n "${CAWS_PROJECT_DIR:-}" && -n "${CAWS_VENDOR_DIR:-}" ]]; then
    _vendor_override="${CAWS_PROJECT_DIR}/${CAWS_VENDOR_DIR}/hooks/lib/${basename}"
  fi

  if [[ -n "$_vendor_override" && -f "$_vendor_override" ]]; then
    # shellcheck disable=SC1090
    source "$_vendor_override"
    return $?
  fi

  # 1.5. USER tier (CAWS-DESIGN-GLOBAL-IDENTITY-HOME-001 A3): the machine
  # owner's per-harness override in the global home. Inert by default —
  # absent until the owner creates it; removing the file restores the
  # true-to-caws shared fallback. Repo overrides keep winning over it.
  if [[ -n "${CAWS_AGENT_SURFACE:-}" && -n "${HOME:-}" ]]; then
    local _user_override="${HOME}/.caws/surfaces/${CAWS_AGENT_SURFACE}/lib/${basename}"
    if [[ -f "$_user_override" ]]; then
      # shellcheck disable=SC1090
      source "$_user_override"
      return $?
    fi
  fi

  # 2. Shared fallback
  local _shared_candidate="${_shared_lib}/${basename}"
  if [[ -f "$_shared_candidate" ]]; then
    # shellcheck disable=SC1090
    source "$_shared_candidate"
    return $?
  fi

  return 1
}

# ---------------------------------------------------------------------------
# 6. caws_run_cli <args...>
#
# CAWS-HOOKS-CLI-CWD-LEAK-001. Invoke the CAWS CLI binary ($CAWS_BIN, default
# "caws") from CAWS_PROJECT_DIR rather than the hook process's inherited
# ambient cwd. CAWS_PROJECT_DIR is the canonical "which repo" signal every
# shared hook already resolves (§1 above); the CLI itself has NO knowledge of
# it — command implementations resolve their repo root from process.cwd()
# (see e.g. setupIO in src/shell/commands/agents.ts), not from this env var.
# A hook that shells out to the CLI without first `cd`-ing into
# CAWS_PROJECT_DIR silently resolves against whatever directory the process
# happened to inherit.
#
# This is invisible in ordinary harness usage (the hook process's PWD
# naturally sits inside the repo the harness is driving), but surfaces hard
# the moment CAWS_PROJECT_DIR points somewhere the inherited cwd does not —
# which is exactly what an isolated test fixture does (bats' `run env
# CAWS_PROJECT_DIR=<tmp-repo> bash <hook>.sh` pattern, cwd left at the bats
# runner's real location): agent-heartbeat.sh's `agents heartbeat` and
# `message poll` calls, agent-register.sh's `agents register`, and
# agent-stop.sh's `agents stop` all landed real leases/session records in
# whatever repo the test process actually sat in, not the fixture.
#
# Prints the CLI's stdout, returns its exit code. A missing/unusable
# CAWS_PROJECT_DIR (unset, ".", or not a directory) falls open to the plain
# invocation — this must never turn a working hook into a broken one.
# ---------------------------------------------------------------------------
caws_run_cli() {
  local _bin="${CAWS_BIN:-caws}"
  if [[ -n "${CAWS_PROJECT_DIR:-}" && "${CAWS_PROJECT_DIR}" != "." && -d "${CAWS_PROJECT_DIR}" ]]; then
    ( cd "${CAWS_PROJECT_DIR}" && "$_bin" "$@" )
  else
    "$_bin" "$@"
  fi
}
