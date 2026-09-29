#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,11,12,16
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
#
# CAWS Scope Guard Hook (v11-shape).
# Validates file edits against scope boundaries from per-feature specs under .caws/specs/.
#
# Lifecycle resolution (v11-shape, with v10 fallback):
#   lifecycle_state first, status second.
#   Terminal (not enforced): closed, archived, completed.
#   active: participates in union enforcement.
#   draft: does NOT participate in union-wide blocking unless authoritative/bound.
#   Both fields missing: treat as active (legacy compatibility).
#
# Worktree registry shape compatibility:
#   v11 direct-key: { "<name>": { ... } }
#   v10 nested:     { "worktrees": { "<name>": { ... } } }
#   Bound id key:   specId (v10) OR spec_id (v11) — both accepted.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=guard-strikes.sh
source "$SCRIPT_DIR/guard-strikes.sh"
# shellcheck source=lib/guard-message.sh
# Provides guard_identity / guard_amend_scope_hint / guard_not_harness_note —
# the shared legibility helpers (HOOK-GUARD-LEGIBILITY-001) so a scope refusal
# names itself ("CAWS scope-guard") and prints a literal copy-pasteable
# amend-scope remediation, instead of reading as a generic harness prompt.
# Guard with a file-existence test: under `set -euo pipefail`, `source <missing>`
# is a fatal builtin error a trailing `|| true` does NOT catch.
[[ -f "$SCRIPT_DIR/lib/guard-message.sh" ]] && source "$SCRIPT_DIR/lib/guard-message.sh"
# shellcheck source=lib/caws-state.sh
# Provides $CAWS_NODE_GLOB_TO_SCOPE_REGEXP — the single canonical scope-glob
# matcher shared with worktree-write-guard so the two guards can never
# disagree on a (path, pattern) scope decision (HOOK-LIB-CONSOLIDATION-001 T1a).
# Guard the source: a fatal `source <missing>` under `set -euo pipefail` is NOT
# caught by `|| true` (CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001). caws-state.sh is
# optional here (scope-guard delegates the decision to `caws scope check`), so a
# missing file is non-fatal — but the source must not abort the guard.
[[ -f "$SCRIPT_DIR/lib/caws-state.sh" ]] && source "$SCRIPT_DIR/lib/caws-state.sh"
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_PROJECT_DIR, CAWS_VENDOR_DIR for path resolution — load-bearing.
# Fail CLOSED (refuse the edit) if absent: a scope guard that cannot resolve the
# project/vendor paths must not silently admit an out-of-scope write.
if [[ -f "$SCRIPT_DIR/lib/agent-surface.sh" ]]; then
  source "$SCRIPT_DIR/lib/agent-surface.sh"
else
  echo "[scope-guard] CAWS hook infrastructure incomplete: lib/agent-surface.sh is missing — cannot resolve scope authority. Failing CLOSED (refusing the edit). Restore the shared hook libs with: caws init --adopt" >&2
  printf '{"decision":"block","reason":"CAWS scope-guard: cannot load lib/agent-surface.sh, so scope cannot be evaluated. Failing closed. Restore the hook pack: caws init --adopt"}\n'
  exit 2
fi
# shellcheck source=lib/guard-config.sh
# Provides caws_guard_prefixes / caws_guard_zones — the repo's tier-2 guard
# configuration, already parsed once for the whole chain by run-handlers.sh.
# Sourcing here is what makes the ACCESSORS available in this process (the
# parse's results arrive as exported env, but shell functions do not cross an
# exec); caws_guard_config_load then returns immediately because the status
# variable is already set, or parses for real when this guard runs standalone.
#
# A missing lib is NOT fail-closed here, unlike agent-surface.sh above: every
# key this lib carries is APPEND-ONLY, so its absence means a SHORTER allow
# list — strictly the stricter verdict. It refuses more, never less. The
# diagnostic below makes the degradation loud rather than silent.
[[ -f "$SCRIPT_DIR/lib/guard-config.sh" ]] && source "$SCRIPT_DIR/lib/guard-config.sh"
if declare -F caws_guard_config_load >/dev/null 2>&1; then
  caws_guard_config_load "${CAWS_PROJECT_DIR:-.}" || true
fi
parse_hook_input

# Back-compat aliases kept to minimize diff in the scope-resolution logic below.
FILE_PATH="$HOOK_FILE_PATH"
TOOL_NAME="$HOOK_TOOL_NAME"
SESSION_ID="$HOOK_SESSION_ID"

# Only check Write/Edit operations
if [[ "$TOOL_NAME" != "Write" ]] && [[ "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

emit_scope_progression() {
  local detail="$1"
  # Optional 2nd arg: the bound spec id (authoritative mode). When known, the
  # message prints the literal copy-pasteable widening command for THAT spec;
  # otherwise it falls back to a placeholdered form.
  local spec_id="${2:-}"

  local _id _hint _note _reprieve
  if command -v guard_identity >/dev/null 2>&1; then
    _id="$(guard_identity scope-guard)"
    _hint="$(guard_amend_scope_hint "$spec_id" "$REL_PATH")"
    _note="$(guard_not_harness_note)"
  else
    _id="CAWS scope-guard"
    _hint="caws specs amend-scope ${spec_id:-<spec-id>} --add $REL_PATH"
    _note="This is a CAWS governance decision, not a harness prompt."
  fi
  if command -v guard_reprieve_hint >/dev/null 2>&1; then
    _reprieve="$(guard_reprieve_hint scope-guard.sh)"
  else
    _reprieve='Session-scoped escape for THIS guard (one session, expires): caws reprieve grant --current --handlers scope-guard.sh --reason "<why>" --approved-by "<approver>" --expires-at "<iso-ts>". Not to be confused with caws waiver create, which exempts GATE violations at policy-run time and never lifts a hook guard.'
  fi

  local widen="If this path SHOULD be in scope, widen the bound spec: $_hint"

  # Remediation must be conditional on the ACTUAL cause, not a fixed menu.
  #
  # When no spec id was passed, the caller is in union mode — no spec is bound
  # to this checkout. The path may already be in a spec's scope.in and the edit
  # STILL refuses, because scope fit is not write authority. Telling that agent
  # to `amend-scope` sends it to widen a scope that needed no widening; it burns
  # a turn and teaches a wrong model of the system. The correct first move is to
  # create or enter the bound worktree.
  local fix_options
  if [[ -z "$spec_id" ]]; then
    fix_options="Fix options: (1) create or enter the worktree bound to the spec that owns this path — no spec is bound to THIS checkout, so scope is being checked in union mode over every active spec, and a path already listed in its spec's scope.in still refuses here (path fit is not write authority); list candidates with 'caws specs list --status active' and enter via 'cd .caws/worktrees/<name>' or create with 'caws worktree create <name> --spec <id>', (2) edit a file already in scope, (3) ask the user."
  else
    fix_options="Fix options: (1) edit a file already in scope, (2) $widen, (3) ask the user."
  fi

  # Print the resolved session id rather than a '<uuid>' placeholder: the guard
  # already knows it (it just keyed the strike file by it), and the human being
  # handed this command has no other obvious way to look it up.
  local _reset_cmd="bash ${CAWS_HOOKS_DIR:-.caws/hooks}/reset-strikes.sh"
  if [[ -n "$SESSION_ID" ]]; then
    _reset_cmd="$_reset_cmd --session $SESSION_ID"
  else
    _reset_cmd="$_reset_cmd --current"
  fi

  local hard_block_guidance="If prior strikes from earlier edits are cornering this session and the scope is now correct, ask the user to run: $_reset_cmd to clear stale strike state. Verify the worktree binding: the spec must declare 'worktree: <name>' and .caws/worktrees.json must map that same worktree name to the correct 'spec_id'. Repair a one-sided binding with 'caws worktree bind <name> --spec <id>'. Do not edit ${CAWS_HOOKS_DIR:-.caws/hooks}/, ${CAWS_LOG_DIR:-${CAWS_VENDOR_DIR}/logs}/guard-strikes-*.json, or other guard state to bypass this check."

  guard_enforce_progressive_strikes \
    "$SESSION_ID" \
    "scope_guard" \
    "$WORK_DIR" \
    "$_id strike 1 of 3 for '$REL_PATH'. $_note This edit proceeds, but a second out-of-scope edit will require user approval. $detail $widen" \
    "$_id strike 2 of 3 for '$REL_PATH'. $_note Blocked — asking the user for approval. $detail $fix_options $_reprieve" \
    "$_id strike 3 of 3 for '$REL_PATH'. $_note Hard-blocked until scope is corrected. $detail $fix_options $hard_block_guidance $_reprieve"
}

resolve_worktree_root() {
  local candidate="${1:-}"

  if [[ -n "$candidate" ]] && [[ "$candidate" =~ ^(.*\/\.caws\/worktrees\/[^/]+)($|/) ]]; then
    printf '%s\n' "${BASH_REMATCH[1]}"
    return 0
  fi

  return 1
}

# Always-allowed paths bypass scope checks entirely.
ALLOW_PREFIXES=(
  ".caws/"
  "${CAWS_VENDOR_DIR}/"
  "docs/"
  "tests/"
  "scripts/"
  "tmp/"
  ".archive/"
)
# CAWS-HOOKPACK-HOME-UNSET-ROOT-AUTHORITY-ALIAS-001: only add the home-tier
# exemption when HOME is actually known. An unset HOME defaulted to "" would
# make this entry "/${CAWS_VENDOR_DIR}/" -- an ABSOLUTE prefix -- which the
# foreign-repo containment check below (an absolute allow-prefix bypasses it
# entirely) would then treat as a global exemption for any absolute path
# under that vendor dir in ANY repository. Absent HOME means no home-tier
# authority exists, not a authority rooted at "/".
if [[ -n "${HOME:-}" ]]; then
  ALLOW_PREFIXES+=("${HOME}/${CAWS_VENDOR_DIR}/")
fi

# Policy-declared non-governed zones (CAWSFIX-26 / ledger D9).
#
# The KEY and its meaning are unchanged — `policy.non_governed_zones` still
# names paths outside CAWS scope governance entirely. Only the TRANSPORT moved:
# the inline awk that used to live here now runs inside lib/guard-config.py, so
# one parse per dispatch serves this guard and every other adopter instead of
# each re-reading policy.yaml. The normalization (quote strip, /** and /* trim,
# trailing-slash coercion) is reproduced there verbatim; the parity bats arm
# pins that, because a transport swap that also changed normalization would be
# a silent scope change.
POLICY_FILE="${CAWS_PROJECT_DIR:-.}/.caws/policy.yaml"
if declare -F caws_guard_zones >/dev/null 2>&1; then
  while IFS= read -r raw_zone; do
    [[ -z "$raw_zone" ]] && continue
    ALLOW_PREFIXES+=("$raw_zone")
  done < <(caws_guard_zones)
elif [[ -f "$POLICY_FILE" ]]; then
  # The loader is absent but the repo DOES declare zones, so this guard is
  # about to govern paths the repo declared ungoverned. Say so: unhonored
  # zones refuse MORE than intended, which is safe but looks like a scope bug
  # to whoever hits it, and a silent stricter-than-declared guard is how a
  # team ends up forking the guard to "fix" it.
  echo "[scope-guard] lib/guard-config.sh is missing, so .caws/policy.yaml non_governed_zones are NOT honored this run — declared non-governed paths will be scope-checked. Restore the shared hook libs: caws init --adopt" >&2
fi

# Repo-declared additional allow prefixes (tier-2 guard config).
#
# Append-only by construction: this can only ADD prefixes, so no shipped entry
# (".caws/", the vendor dir, docs/) can be removed or reordered by a repo.
# Every entry is validated repo-relative before it reaches here, which is
# load-bearing rather than cosmetic — the foreign-repo containment block below
# honors ABSOLUTE allow-prefixes ahead of the block, so an absolute entry here
# would be a cross-repo write hole. A repo-relative entry cannot reach that loop.
if declare -F caws_guard_prefixes >/dev/null 2>&1; then
  while IFS= read -r _cfg_prefix; do
    [[ -z "$_cfg_prefix" ]] && continue
    ALLOW_PREFIXES+=("$_cfg_prefix")
  done < <(caws_guard_prefixes scope-guard.sh)
fi

WORK_DIR="${HOOK_CWD:-${CAWS_PROJECT_DIR:-.}}"
PROJECT_DIR="${CAWS_PROJECT_DIR:-.}"
PROJECT_DIR="$(cd "$PROJECT_DIR" 2>/dev/null && pwd || printf '%s\n' "$PROJECT_DIR")"

# CAWS-DEFECT-SCOPE-GUARD-FILE-PATH-NOT-NORMALIZED-01: normalize FILE_PATH the
# same way PROJECT_DIR just was, BEFORE any containment comparison.
#
# The containment test below is a string prefix match. PROJECT_DIR is
# `cd && pwd`-physical; FILE_PATH arrived from the envelope verbatim. So an
# absolute path INSIDE the governed project that merely spelled itself
# differently — a doubled separator from a TMPDIR ending in '/', a './', a
# '..' that resolves back inside, a /var vs /private/var symlink — failed the
# prefix test and took the foreign hard block: exit 2, "There is no in-band
# override", for a file in the agent's own repo. That is the worst shape of
# false refusal, because the message explicitly tells the agent not to route
# around it and offers no legitimate next step.
#
# owned_worktree_root() below already states this rule — "compare like with
# like" — and applies it to the worktree-root candidate. It was never applied
# to FILE_PATH itself.
#
# Two constraints shape the implementation:
#
#  1. **It must not require the target to exist.** Write CREATES the file, and
#     may create its parent. So the PARENT is resolved physically where it
#     exists, and the basename is re-appended untouched; a missing parent falls
#     back to a purely lexical pass.
#  2. **It may only NARROW the foreign set.** Physical resolution is what makes
#     that true: a symlink inside the project that points outside resolves to
#     its outside target and stays foreign, and a '..' that escapes resolves
#     outside and stays foreign. Collapsing separators textually without
#     resolving would have been the unsafe shortcut.
_caws_lexical_path() {
  local input="$1" seg joined=""
  local -a parts=() out=()
  local OLD_IFS="$IFS"
  IFS='/'
  # shellcheck disable=SC2206 # deliberate word-split on '/' to walk segments
  parts=($input)
  IFS="$OLD_IFS"
  for seg in "${parts[@]}"; do
    case "$seg" in
      '' | '.') continue ;;
      '..')
        # bash 3.2 (macOS) has no negative array slicing that is safe at
        # length 0, so the guard is explicit rather than arithmetic.
        if [[ ${#out[@]} -gt 0 ]]; then
          out=("${out[@]:0:$((${#out[@]} - 1))}")
        fi
        ;;
      *) out+=("$seg") ;;
    esac
  done
  for seg in "${out[@]}"; do joined="$joined/$seg"; done
  printf '%s\n' "${joined:-/}"
}

_caws_normalize_target() {
  local p="$1" dir base resolved
  [[ -n "$p" ]] || { printf '%s\n' "$p"; return 0; }
  # A relative target resolves against the cwd the tool call ran in, which is
  # the same base the kernel uses.
  [[ "$p" == /* ]] || p="${HOOK_CWD:-$PROJECT_DIR}/$p"
  dir="${p%/*}"
  base="${p##*/}"
  [[ -n "$dir" ]] || dir="/"
  if resolved="$(cd "$dir" 2>/dev/null && pwd)"; then
    dir="$resolved"
  else
    dir="$(_caws_lexical_path "$dir")"
  fi
  if [[ "$dir" == "/" ]]; then
    printf '/%s\n' "$base"
  else
    printf '%s/%s\n' "$dir" "$base"
  fi
}

FILE_PATH="$(_caws_normalize_target "$FILE_PATH")"

PROJECT_WORKTREE_ROOT="$(resolve_worktree_root "$PROJECT_DIR" || true)"

# CAWS-DEFECT-SCOPE-GUARD-FOREIGN-WORKTREE-CONTAINMENT-BYPASS-01: the repository
# this session governs is the canonical checkout — also when the session is
# rooted inside one of that checkout's linked worktrees.
SESSION_REPO_ROOT="$PROJECT_DIR"
if [[ -n "$PROJECT_WORKTREE_ROOT" ]]; then
  SESSION_REPO_ROOT="${PROJECT_WORKTREE_ROOT%/.caws/worktrees/*}"
fi

# A worktree root inferred from the target path or the hook cwd confers
# WORK_DIR ONLY when it is a linked worktree of the repository this session
# governs. resolve_worktree_root is a path-shape match (`/.caws/worktrees/<name>`
# in ANY repository), so without this ownership check a write into a sibling
# repository's worktree adopted that foreign worktree as WORK_DIR: the path went
# worktree-relative, FOREIGN_REPO never tripped, and the guard ran THIS repo's
# union scope evaluation against the OTHER repo's file — two cross-repo writes
# landed on the strike ramp, the strike-3 remediation told the agent to create a
# worktree it had already created in the right repo, and strike state was
# written into the foreign repo's gitdir. A worktree of another repository is a
# foreign write and takes the containment block below on the first attempt.
owned_worktree_root() {
  local root="${1:-}"
  [[ -n "$root" ]] || return 0
  # Compare like with like: PROJECT_DIR above is `cd && pwd`-normalized, so
  # normalize the candidate the same way (falling back to the raw string when
  # the directory does not exist) rather than string-matching a raw path.
  root="$(cd "$root" 2>/dev/null && pwd || printf '%s\n' "$root")"
  if [[ "$root" == "$SESSION_REPO_ROOT/.caws/worktrees/"* ]]; then
    printf '%s\n' "$root"
  fi
  return 0
}
FILE_WORKTREE_ROOT="$(owned_worktree_root "$(resolve_worktree_root "$FILE_PATH" || true)")"
CWD_WORKTREE_ROOT="$(owned_worktree_root "$(resolve_worktree_root "$HOOK_CWD" || true)")"

if [[ -n "$FILE_WORKTREE_ROOT" ]]; then
  WORK_DIR="$FILE_WORKTREE_ROOT"
elif [[ -n "$CWD_WORKTREE_ROOT" ]]; then
  WORK_DIR="$CWD_WORKTREE_ROOT"
elif [[ -n "$PROJECT_WORKTREE_ROOT" ]]; then
  WORK_DIR="$PROJECT_WORKTREE_ROOT"
fi

WORK_DIR="$(cd "$WORK_DIR" 2>/dev/null && pwd || printf '%s\n' "$WORK_DIR")"
WORKTREE_NAME=""
if [[ "$WORK_DIR" =~ \/\.caws\/worktrees\/([^/]+)$ ]]; then
  WORKTREE_NAME="${BASH_REMATCH[1]}"
fi

# CAWS-LITE-MODE-RETIREMENT-001: lite mode (scope.json without specs/)
# was removed in pack v8. v11 projects only have .caws/specs/; lite-mode
# .caws/scope.json is a v10 artifact. Consumers with a legacy
# .caws/scope.json get a doctor finding (not a hook branch).
if [[ -d "$WORK_DIR/.caws/specs" ]]; then
  SPECS_BASE="$WORK_DIR"
else
  SPECS_BASE="$PROJECT_DIR"
fi

# No specs directory means no v11 governance to enforce.
if [[ ! -d "$SPECS_BASE/.caws/specs" ]]; then
  exit 0
fi

FOREIGN_REPO=0
if [[ "$FILE_PATH" == "$WORK_DIR"/* ]]; then
  REL_PATH="${FILE_PATH#$WORK_DIR/}"
elif [[ "$FILE_PATH" == "$PROJECT_DIR"/* ]]; then
  REL_PATH="${FILE_PATH#$PROJECT_DIR/}"
elif [[ "$FILE_PATH" == /* ]]; then
  # SCOPE-GUARD-FOREIGN-REPO-CONTAINMENT-001: an ABSOLUTE path under neither
  # this session's WORK_DIR nor PROJECT_DIR belongs to a DIFFERENT repository.
  REL_PATH="$FILE_PATH"
  FOREIGN_REPO=1
else
  REL_PATH="$FILE_PATH"
fi

# SCOPE-GUARD-FOREIGN-REPO-CONTAINMENT-001: hard-block a Write/Edit to a file in
# a DIFFERENT repository, immediately — before the kernel scope-check and the
# 3-strike ramp. Honor absolute allow-prefixes here, before the foreign block,
# so harness-state writes pass.
if [[ "$FOREIGN_REPO" == "1" ]]; then
  for _prefix in "${ALLOW_PREFIXES[@]}"; do
    [[ "$_prefix" == /* ]] || continue
    if [[ "$FILE_PATH" == "${_prefix}"* ]]; then
      exit 0
    fi
  done
  _id="CAWS scope-guard"
  command -v guard_identity >/dev/null 2>&1 && _id="$(guard_identity scope-guard)"
  _note="This is a CAWS governance decision, not a harness prompt."
  command -v guard_not_harness_note >/dev/null 2>&1 && _note="$(guard_not_harness_note)"
  # When the target sits inside another repository's linked worktree, say so:
  # the agent that hits this typically CREATED that worktree (via the other
  # repo's caws) and reads the block as a scope error to widen, not a
  # repository boundary.
  _foreign_wt_root="$(resolve_worktree_root "$FILE_PATH" || true)"
  _foreign_note=""
  if [[ -n "$_foreign_wt_root" ]]; then
    _foreign_note=" The target is inside a linked worktree of ${_foreign_wt_root%/.caws/worktrees/*}; the session rooted in THAT repository holds write authority there, even if this session created or owns the worktree."
  fi
  emit_block "$_id: BLOCKED — '$FILE_PATH' is in a DIFFERENT repository than this session's project ($PROJECT_DIR).${_foreign_note} $_note This guard governs edits within the current repo; a session may READ sibling repos freely but must NOT WRITE into another repo from here, so it cannot silently mutate files (especially executables) outside its governing repo. There is no in-band override. To make this change: write an explicit HANDOFF for an agent rooted in that repo — state WHAT to change, WHY, and HOW (the exact edit), then have that repo's own session (or the user) apply it. Do NOT route around this via Bash. bash-write-guard adjudicates the same cross-repository boundary for a target NAMED on the command line (sed -i, cp, mv, rm, tee, a redirect, git path-restore) and for a target appearing as a PATH LITERAL in inline -c/-e code, a heredoc body, or the content of a script file you run — each of those refuses exactly as this did. One residual is honestly outside any command-text guard: a target COMPUTED at runtime (built from shell variables, read from a config file, or piped in via 'python3 -') is invisible to it. That is a residual gap, not an admitted route — using it is the same governance violation as editing the file directly, and it is the one form the runtime cannot stop you from committing."
  exit 2
fi

# Root files use the same kernel scope decision as nested files.
for prefix in "${ALLOW_PREFIXES[@]}"; do
  if [[ "$FILE_PATH" == "${prefix}"* ]] || [[ "$REL_PATH" == "${prefix}"* ]]; then
    exit 0
  fi
done

# CAWS-SCOPE-SHOW-JSON-CONTRACT-001: the scope DECISION and its DIAGNOSTIC both
# come from the kernel via the `caws` CLI. The hook no longer re-parses specs.
#
#   1. `caws scope check` gives the admit/refuse decision (exit 0/1) — the
#      kernel-authoritative ADMIT short-circuits the strike counter entirely.
#   2. On refuse, `caws scope show --json` renders the stable diagnostic
#      contract (decision / rule / mode / boundSpecId / matchedPattern /
#      bindingState / ambiguousClaimants). The hook parses that with jq and maps
#      it onto the progressive-strike refusal — it does NOT reconstruct the
#      kernel's scope evaluation with its own js-yaml require.
#
# This is the "caws governs caws artifacts" boundary: one evaluator (the
# kernel), consulted by every consumer's thin hook, instead of an inline
# parallel evaluator that drifts and depends on a hook-resolvable js-yaml.
# Fail closed on an ENVIRONMENT fault (no CLI / no jq / unparseable diagnostic)
# with a direct hard block, NOT the progressive-strike ramp: a missing toolchain
# is not a scope strike, and emit_block does not depend on strike-file state.
_scope_env_block() {
  local msg="$1"
  local _id="CAWS scope-guard"
  command -v guard_identity >/dev/null 2>&1 && _id="$(guard_identity scope-guard)"
  # Fail-closed infra blocks still name the session-scoped escape: a session
  # wedged by missing infrastructure needs the same sanctioned off-ramp as a
  # scope refusal, or it starts inventing one.
  local _reprieve='Session-scoped escape for THIS guard (one session, expires): caws reprieve grant --current --handlers scope-guard.sh --reason "<why>" --approved-by "<approver>" --expires-at "<iso-ts>".'
  command -v guard_reprieve_hint >/dev/null 2>&1 && _reprieve="$(guard_reprieve_hint scope-guard.sh)"
  if command -v emit_block >/dev/null 2>&1; then
    emit_block "$_id: $msg $_reprieve"
  else
    printf '%s\n' "$_id: $msg $_reprieve" >&2
  fi
}

if ! command -v caws >/dev/null 2>&1; then
  # Fail closed: without the CLI we cannot evaluate scope. Refuse rather than
  # silently admit, and do NOT resurrect an inline parser.
  _scope_env_block "cannot evaluate scope — the \`caws\` CLI is not on PATH. Scope.in/scope.out cannot be enforced, so the edit is refused rather than silently admitted. Install/restore the caws CLI and retry."
  exit 0
fi

# The target lane supplies scope authority even when the harness cwd is canonical.
if (cd "$WORK_DIR" && caws scope check "$REL_PATH") >/dev/null 2>&1; then
  # Kernel-authoritative ADMIT. Skip strike counter entirely.
  exit 0
fi

# Refused (or no-authority). Pull the structured diagnostic from the kernel.
# Fail closed on a failed invocation as well as an unreadable diagnostic.
if ! SCOPE_JSON="$(cd "$WORK_DIR" && caws scope show "$REL_PATH" --json 2>/dev/null)" \
   || [[ -z "$SCOPE_JSON" ]] || ! command -v jq >/dev/null 2>&1 \
   || ! printf '%s' "$SCOPE_JSON" | jq -e . >/dev/null 2>&1; then
  _scope_env_block "refused '$REL_PATH' but could not render the structured diagnostic (\`caws scope show --json\` unavailable or unparseable). The edit is refused rather than silently admitted. Diagnose: caws scope show $REL_PATH."
  exit 0
fi

_jq() { printf '%s' "$SCOPE_JSON" | jq -r "$1 // empty" 2>/dev/null; }
SC_DECISION="$(_jq '.decision')"
SC_RULE="$(_jq '.rule')"
SC_MODE="$(_jq '.mode')"
SC_BOUND_SPEC="$(_jq '.boundSpecId')"
SC_PATTERN="$(_jq '.matchedPattern')"
SC_BINDING="$(_jq '.bindingState')"
SC_CLAIMANTS="$(printf '%s' "$SCOPE_JSON" | jq -r '(.ambiguousClaimants // []) | join(", ")' 2>/dev/null)"

# A one_sided binding means the worktree's bound spec is missing/malformed (it
# did not load). Scope cannot be enforced authoritatively, so refuse rather than
# fall back to weaker union-mode checks (preserves the prior malformed-bound-spec
# refusal — the kernel now surfaces it as one_sided/no_authority).
if [[ "$SC_BINDING" == "one_sided" ]]; then
  emit_scope_progression "Your worktree's bound spec did not load (missing or invalid YAML), so scope cannot be enforced authoritatively and the edit is refused rather than falling back to weaker union-mode checks. Fix the bound spec, then retry. Diagnose: caws scope show $REL_PATH."
  exit 0
fi

# More than one active spec claims this path: ambiguous authority. Surface the
# claimants (the kernel already refuses to guess).
if [[ -n "$SC_CLAIMANTS" ]]; then
  emit_scope_progression "Ambiguous scope authority for '$REL_PATH': multiple active specs claim it ($SC_CLAIMANTS). CAWS will not guess which governs — narrow one spec's scope.in or route the edit through the single owning worktree. Diagnose: caws scope show $REL_PATH."
  exit 0
fi

# A reject whose matched rule is a scope.out pattern is "marked out-of-scope";
# any other reject/no_authority is "not in the defined scope". The kernel's
# stable `rule` id carries the distinction (…scope_out vs …not in scope.in).
if [[ "$SC_DECISION" == "reject" && "$SC_RULE" == *scope_out* ]]; then
  if [[ "$SC_MODE" == "union" ]]; then
    emit_scope_progression "This file is marked out-of-scope by pattern '${SC_PATTERN:-<unknown>}'. Mode: union (no authoritative spec bound). An unrelated spec may be blocking this edit. Diagnose: caws scope show $REL_PATH."
  else
    emit_scope_progression "This file is marked out-of-scope by pattern '${SC_PATTERN:-<unknown>}' in spec '${SC_BOUND_SPEC:-<unknown>}'. Mode: authoritative (checking only your bound spec)."
  fi
  exit 0
fi

# Default refusal: not in any admitting scope.
if [[ "$SC_MODE" == "union" ]]; then
  emit_scope_progression "This file is not in the defined scope of any active spec. Mode: union (no authoritative spec bound). Diagnose: caws scope show $REL_PATH."
else
  emit_scope_progression "This file is not in the defined scope of your bound spec '${SC_BOUND_SPEC:-<unknown>}'. Mode: authoritative." "$SC_BOUND_SPEC"
fi
exit 0
