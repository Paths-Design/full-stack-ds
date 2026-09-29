#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 4,8,13,20,32
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
# CAWS Bash Write-Target Guard (shared, WORKTREE-ISOLATION-HARDENING-001 Fix 3).
# Self-filters on Bash, extracts write targets for a narrow set of mutation
# forms, routes each through lib/worktree-claim-oracle.cjs — same oracle as
# worktree-write-guard.sh so a Bash mutation and a Write/Edit get the same
# owner-vs-session answer.
#
# Recognized mutation forms:
#   redirection      > FILE   >> FILE
#   tee              tee FILE   tee -a FILE
#   in-place editors sed -i ... FILE   perl -pi ... FILE
#   truncate/touch   truncate ... FILE   touch FILE
#   remove/move/copy rm FILE   mv SRC DST   cp SRC DST   dd of=FILE
#   git path-restore git restore FILE   git checkout -- FILE
#                    git reset -- FILE   git clean
#   interpreter      python / node: write targets appearing as path literals in
#                    inline -c/-e code, heredoc bodies, or the content of a
#                    script file named on the command line (write-verb +
#                    path-literal co-occurrence —
#                    CAWS-BASH-GUARD-INTERPRETER-WRITE-01). These reach the
#                    cross-repository check only; they never enter the
#                    worktree-claim oracle, because a literal is evidence of a
#                    target, not proof of one.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/caws-state.sh
# caws-state.sh provides the Bash-mutation-target machinery this guard needs to
# route a write through the worktree-claim oracle. A fatal `source <missing>`
# under `set -euo pipefail` is not caught by `|| exit 0`, and `|| exit 0` would
# SILENTLY ADMIT the mutation (fail-open). Fail CLOSED if it cannot load
# (CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001).
if ! { [[ -f "$SCRIPT_DIR/lib/caws-state.sh" ]] && source "$SCRIPT_DIR/lib/caws-state.sh"; }; then
  echo "[bash-write-guard] CAWS hook infrastructure incomplete: lib/caws-state.sh is missing or did not load — cannot evaluate Bash-mutation ownership. Failing CLOSED. Restore the shared hook libs with: caws init adapters install" >&2
  printf '{"decision":"block","reason":"CAWS bash-write-guard: cannot load lib/caws-state.sh, so Bash-mutation worktree isolation cannot be evaluated. Failing closed. Restore the hook pack: caws init adapters install"}\n'
  exit 2
fi
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_PROJECT_DIR and caws_source_lib — load-bearing. Guard the source
# (a fatal `source <missing>` is not caught by `|| true` under set -e) and fail
# CLOSED if absent.
if [[ -f "$SCRIPT_DIR/lib/agent-surface.sh" ]]; then
  source "$SCRIPT_DIR/lib/agent-surface.sh"
else
  echo "[bash-write-guard] CAWS hook infrastructure incomplete: lib/agent-surface.sh is missing. Failing CLOSED. Restore the shared hook libs with: caws init adapters install" >&2
  printf '{"decision":"block","reason":"CAWS bash-write-guard: cannot load lib/agent-surface.sh. Failing closed. Restore the hook pack: caws init adapters install"}\n'
  exit 2
fi
# shellcheck source=lib/emit.sh
# Use caws_source_lib so a vendor override is preferred over the shared default.
caws_source_lib emit.sh 2>/dev/null || true
if [[ -f "$SCRIPT_DIR/lib/ask-capability.sh" ]]; then
  source "$SCRIPT_DIR/lib/ask-capability.sh"
else
  echo "[CAWS guard] Missing lib/ask-capability.sh; cannot establish a human approval boundary." >&2
  exit 2
fi
[[ -f "$SCRIPT_DIR/lib/guard-message.sh" ]] && source "$SCRIPT_DIR/lib/guard-message.sh"
# shellcheck source=lib/session-id.sh
# CAWS-SESSION-RESOLVER-GUARD-DIVERGENCE-001 (A1/A2): resolve the operating
# session id through the SAME env-var precedence the TS resolver uses, not only
# HOOK_SESSION_ID (which does not propagate into agent-Bash). Best-effort source
# — a missing helper degrades to the legacy HOOK_SESSION_ID-only path, never a
# hard block.
[[ -f "$SCRIPT_DIR/lib/session-id.sh" ]] && source "$SCRIPT_DIR/lib/session-id.sh"
# shellcheck source=lib/write-allowlist.sh
# CAWS-GUARD-ALLOWLIST-SYNC-001: the shared unconditional-allow path set. A
# Bash mutation of an allowlisted path (docs/*, .caws/* minus payload, .tmp/*,
# .github/*, vendor dir, instruction files, agent-home dir) must get the SAME
# allow verdict as a Write/Edit of that path — this guard consults the SAME
# helper worktree-write-guard uses, so the two guards cannot diverge by tool.
# Best-effort source: a missing helper degrades to oracle-everything (the
# pre-fix behavior), never a hard block.
[[ -f "$SCRIPT_DIR/lib/write-allowlist.sh" ]] && source "$SCRIPT_DIR/lib/write-allowlist.sh"
parse_hook_input

# CAWS_ORACLE_SESSION_ID: the fully-resolved operating identity. Falls back to
# HOOK_SESSION_ID when the helper is absent (back-compat). This is what the
# oracle compares against the worktree's stamped owner — matching the resolver
# chain the stamper used, so owner-self recognition works across all harnesses.
if declare -F resolve_caws_session_id_with_payload >/dev/null 2>&1; then
  CAWS_ORACLE_SESSION_ID="$(resolve_caws_session_id_with_payload "${HOOK_SESSION_ID:-}")"
else
  CAWS_ORACLE_SESSION_ID="${HOOK_SESSION_ID:-}"
fi
export CAWS_ORACLE_SESSION_ID

caws_source_lib heredoc.sh 2>/dev/null || true

TOOL_NAME="$HOOK_TOOL_NAME"
COMMAND="$HOOK_COMMAND"

# Self-filter: Bash only.
if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
  exit 0
fi

CAWS_CLAIM_ORACLE="$SCRIPT_DIR/lib/worktree-claim-oracle.cjs"
[[ -f "$CAWS_CLAIM_ORACLE" ]] || exit 0
command -v node >/dev/null 2>&1 || exit 0

# Resolve canonical root.
if command -v resolve_canonical_dir >/dev/null 2>&1; then
  PROJECT_DIR="$(resolve_canonical_dir "${CAWS_PROJECT_DIR:-.}")"
else
  PROJECT_DIR="${CAWS_PROJECT_DIR:-.}"
fi
# Compare the same physical identity used by abspath for mutation targets.
# A logical alias such as /tmp or a symlinked project root is still this repo.
PROJECT_DIR="$(_realpath "$PROJECT_DIR")"

[[ -f "$PROJECT_DIR/.caws/worktrees.json" ]] || exit 0

AGENT_CWD="${HOOK_CWD:-${CAWS_PROJECT_DIR:-.}}"

# CAWS-BASH-GUARD-BOUNDARY-DIVERGENCE-01: the cross-repository boundary.
#
# scope-guard hard-blocks a Write/Edit whose target is in a different repository
# and tells the reader that routing around it through Bash "hits the same
# boundary". It did not: every verdict below this point comes from the
# worktree-claim oracle, whose vocabulary (pass / block_foreign_worktree /
# block_claimed / ask_uncertain / ...) has no cross-repo member at all. A
# `sed -i` into a sibling repo was adjudicated for worktree claims in THIS repo,
# found none, and was permitted.
#
# The boundary enforced here is deliberately NARROWER than scope-guard's, and
# the difference is not an oversight. scope-guard refuses any absolute target
# outside the project; applying that to Bash would refuse ordinary scratch
# (`cat > /tmp/patch.py`), which is normal and safe. The harm scope-guard
# actually names is mutating "files (especially executables) outside its
# governing repo" — so the predicate here is "inside a DIFFERENT git
# repository", which /tmp is not.
# CAWS-GUARD-REMEDIATION-CROSS-REPO-CONSISTENCY-01 moved the predicate itself
# into lib/bash-mutation-targets.sh (caws_foreign_repo_root) because
# block-dangerous needs the SAME answer: its opaque-exec remediation used to
# offer "write the probe to a script file and run it by path" even when the
# payload's write target was in another repository — a route this guard
# refuses. One guard recommending what another refuses is how an agent gets
# walked out of the repo, so the two now read one implementation.
foreign_repo_root() {
  caws_foreign_repo_root "$1" "$PROJECT_DIR"
}

# --- target extraction (NARROW) --------------------------------------------
# Moved to lib/bash-mutation-targets.sh so casr-context.sh can consume the same
# recognizer without sourcing this guard (which parses input, resolves session
# state and then invokes the ownership oracle). The guard keeps its own
# fail-CLOSED posture on a missing lib; CASR keeps its fail-open posture. The
# consumer loop below is unchanged, so candidate sequences are identical.
# Governance: CASR-CONTEXT-DELIVERED-BY-TOOL-NAME-NOT-WRITE-TARGET-01.
if [[ -r "$SCRIPT_DIR/lib/bash-mutation-targets.sh" ]]; then
  # shellcheck source=lib/bash-mutation-targets.sh
  source "$SCRIPT_DIR/lib/bash-mutation-targets.sh"
fi
if ! declare -F caws_bash_mutation_candidates >/dev/null 2>&1; then
  echo "[bash-write-guard] CAWS hook infrastructure incomplete: lib/bash-mutation-targets.sh is missing or did not load — cannot extract Bash mutation targets. Failing CLOSED. Restore the shared hook libs with: caws init adapters install" >&2
  printf '{"decision":"block","reason":"CAWS bash-write-guard: cannot load lib/bash-mutation-targets.sh, so Bash-mutation targets cannot be extracted. Failing closed. Restore the hook pack: caws init adapters install"}\n'
  exit 2
fi
# A lib PRESENT but older than this guard is the more dangerous shape: the
# entry point above resolves, the guard runs, and the cross-repo arm silently
# adjudicates nothing — a fail-OPEN that no output reports. Each function this
# guard depends on is therefore checked by name, not inferred from one.
for _fn in caws_foreign_repo_root caws_bash_interpreter_write_literals; do
  if ! declare -F "$_fn" >/dev/null 2>&1; then
    echo "[bash-write-guard] CAWS hook infrastructure incomplete: lib/bash-mutation-targets.sh loaded but does not provide $_fn — the cross-repository arm cannot run. Failing CLOSED. Update the shared hook libs with: caws init adapters install" >&2
    printf '{"decision":"block","reason":"CAWS bash-write-guard: lib/bash-mutation-targets.sh is present but stale (missing %s), so the cross-repository boundary cannot be adjudicated. Failing closed. Update the hook pack: caws init adapters install"}\n' "$_fn"
    exit 2
  fi
done

extract_targets() {
  # Two channels, both consumed, because an ownership gate wants every path a
  # command might touch:
  #   file operands -> unchanged, the sequence this guard has always seen.
  #   broad roots   -> `git clean` rooted at AGENT_CWD, adjudicated exactly as
  #                    before this split. A prefix test is what "might this
  #                    touch a claimed path?" wants, so the conservative root is
  #                    the right answer HERE even though CASR declines it.
  # The shared library reads no ambient state; this call site is the only place
  # AGENT_CWD enters extraction, so the guard's posture stays the guard's own
  # decision rather than a hidden property of the library.
  caws_bash_mutation_candidates "$1"
  if declare -F caws_bash_broad_mutations >/dev/null 2>&1; then
    caws_bash_broad_mutations "$1" "$AGENT_CWD" | cut -f2
  fi
}

abspath() {
  local p="$1"
  case "$p" in
    /*) _realpath "$p" ;;
    *)  _realpath "$AGENT_CWD/$p" ;;
  esac
}

# --- interpreter write-target scan (NARROW) ----------------------------------
# CAWS-BASH-GUARD-INTERPRETER-WRITE-01: a mutation performed INSIDE an
# interpreter names no write target on the shell command line, so the
# recognizer above extracts nothing and the guard adjudicates an empty
# candidate set. Writing the scratch script is permitted by design (see the
# /tmp rationale on caws_foreign_repo_root); running it was never adjudicated
# at all. That pair is a complete cross-repo write channel, and it is the one
# session 1aa3f0bd used: `cat > /tmp/apply-fix.mjs` carrying a sibling-repo
# path, then `node /tmp/apply-fix.mjs`, both exit 0.
#
# The scan closes the detectable half: write targets that appear as PATH
# LITERALS inside the interpreter's payload. It lives in
# lib/bash-mutation-targets.sh (caws_bash_interpreter_write_literals, with the
# co-occurrence rationale) so block-dangerous reads the SAME answer when it
# chooses which remediation to print
# (CAWS-GUARD-REMEDIATION-CROSS-REPO-CONSISTENCY-01). The wrapper below adds
# only the sentinel the decide loop dispatches on.
#
# Interpreter candidates are adjudicated at the CROSS-REPOSITORY boundary ONLY
# and never enter the worktree-claim oracle. A literal in a script body is
# evidence that the script may write there, not proof that it will; feeding
# that to the ownership oracle would turn any in-project path merely MENTIONED
# in a script into a claim conflict. The spec's invariant is that existing
# behavior is unchanged everywhere else, so the high-confidence predicate is
# the only one that acts on this weaker evidence.
#
# What it cannot see: a target COMPUTED at runtime — concatenated from shell
# variables, read out of a config file, or piped in via `python3 -`. That is a
# real residual, named honestly in scope-guard's refusal rather than papered
# over, and it is never an admitted route.
scan_interpreter_targets() {
  local frag
  while IFS= read -r frag; do
    [[ -z "$frag" ]] && continue
    printf '__INTERP__%s\n' "$frag"
  done < <(caws_bash_interpreter_write_literals "$1" "$AGENT_CWD")
}

# --- decide -----------------------------------------------------------------
WORST="pass"
WORST_DETAIL=""
WORST_KIND=""

escalate() {
  local rank_new rank_cur
  case "$1" in pass) rank_new=0 ;; ask) rank_new=1 ;; block) rank_new=2 ;; esac
  case "$WORST" in pass) rank_cur=0 ;; ask) rank_cur=1 ;; block) rank_cur=2 ;; esac
  if [[ "$rank_new" -gt "$rank_cur" ]]; then
    WORST="$1"; WORST_DETAIL="$2"; WORST_KIND="$3"
  fi
}

while IFS= read -r cand; do
  [[ -z "$cand" ]] && continue
  # CAWS-BASH-GUARD-INTERPRETER-WRITE-01: candidates from the interpreter scan
  # carry a sentinel prefix. They are weaker evidence than a named operand — a
  # path literal in a script body, not a target the shell will definitely write
  # — so they are adjudicated at the cross-repository boundary only and are
  # dropped before the allowlist and the claim oracle.
  _INTERP=0
  case "$cand" in
    __INTERP__*) _INTERP=1; cand="${cand#__INTERP__}" ;;
  esac
  # Candidates arrive byte-faithful. The recognizer's lexer consumes syntactic
  # quote delimiters as it scans and never introduces a sentinel, so a quoted
  # operand already reads as the path it names and `rm "harness/wire/some
  # file.py"` arrives as one operand containing its space. The sentinel
  # restoration and quote stripping that stood here undid damage the old
  # tokenizer did and were removed with it.
  abs="$(abspath "$cand")"
  # CAWS-GUARD-ALLOWLIST-SYNC-001 + CAWS-GUARD-SCOPE-PRIORITY-001: record
  # whether this target is on the unconditional allowlist (docs/*, .caws/*
  # minus payload, .tmp/*, .github/*, vendor dir, instruction files,
  # agent-home dir). The oracle STILL runs — a scope.in CLAIM overrides the
  # allowlist, so a claimed docs/** path must block (block_claimed) just like
  # a claimed src/** path. But for an allowlisted path, only a CLAIM/ownership
  # block escalates; pass/degraded/ask/error do NOT (an unclaimed allowlisted
  # path is permitted, and a toolchain fault must not block it). Payload paths
  # (.caws/worktrees/*) are excluded by the helper and always escalate normally.
  # Cross-repo is adjudicated BEFORE the allowlist and the claim oracle: the
  # allowlist names paths relative to THIS project, so applying it to a sibling
  # repo's tree would admit its docs/, tests/ and .caws/ wholesale.
  # An interpreter literal may be composed relative to $HOME rather than the
  # agent cwd — `Path.home() / "Desktop/Projects/<sibling>/..."` was the shape
  # in the field — so a non-absolute interpreter candidate is resolved against
  # BOTH roots and blocks if EITHER resolution lands in a different repository.
  _FOREIGN_REPO=""
  if [[ "$_INTERP" == "1" ]]; then
    _RES_CANDS=("$abs")
    case "$cand" in
      /*) ;;
      ~*) _RES_CANDS+=("${HOME:-/nonexistent-home}/${cand#\~}") ;;
      *)  _RES_CANDS+=("${HOME:-/nonexistent-home}/$cand") ;;
    esac
    for _res in "${_RES_CANDS[@]}"; do
      _FR="$(foreign_repo_root "$_res")"
      [[ -n "$_FR" ]] && _FOREIGN_REPO="$_FR"
    done
  else
    _FOREIGN_REPO="$(foreign_repo_root "$abs")"
  fi
  if [[ -n "$_FOREIGN_REPO" ]]; then
    escalate block "$_FOREIGN_REPO" "block_foreign_repo"
    continue
  fi
  # Interpreter candidates stop here: the ownership oracle answers a question
  # ("does an active worktree claim this path?") that a mere literal cannot
  # support, and running it would make any in-project path named in a script
  # a claim conflict.
  [[ "$_INTERP" == "1" ]] && continue

  _CAND_ALLOWLISTED=0
  if declare -F caws_is_write_allowlisted >/dev/null 2>&1; then
    if caws_is_write_allowlisted "$abs" "$PROJECT_DIR"; then
      _CAND_ALLOWLISTED=1
    fi
  fi
  out="$(CAWS_ORACLE_PROJECT_DIR="$PROJECT_DIR" \
    CAWS_ORACLE_CURRENT_BRANCH="" \
    CAWS_ORACLE_REL_PATH="$abs" \
    CAWS_ORACLE_SESSION_ID="$CAWS_ORACLE_SESSION_ID" \
    node "$CAWS_CLAIM_ORACLE" 2>&1 || true)"
  _first="${out%%$'\n'*}"
  case "${_first%%:*}" in
    pass|block_foreign_worktree|block_claimed|ask_uncertain|error_fail_closed|degraded_no_yaml)
      out="$_first" ;;
    *)
      _reason="$(printf '%s' "$_first" | cut -c1-200)"
      out="error_fail_closed:oracle-spawn (${_reason:-no output})" ;;
  esac
  outcome="${out%%:*}"
  detail="${out#*:}"
  case "$outcome" in
    pass) ;;
    # degraded_no_yaml is a TOOLCHAIN FAULT, not an ownership signal: the oracle
    # got PAST the yaml-free foreign-payload block and only the cross-worktree
    # canonical-claim check could not run (js-yaml unresolvable). Do NOT escalate
    # (it would turn every canonical mutation into an approval prompt when js-yaml
    # is absent). Record it for a single post-loop advisory; the mutation flows.
    degraded_no_yaml) _DEGRADED_NO_YAML=1 ;;
    block_foreign_worktree|block_claimed) escalate block "$detail" "$outcome" ;;
    ask_uncertain|error_fail_closed)
      # CAWS-GUARD-SCOPE-PRIORITY-001: an allowlisted path defers to the
      # allowlist on non-claim verdicts — a toolchain fault or uncertain
      # ownership must not block a docs/** or .caws/** coordination edit.
      # Only a positive claim (block_claimed/block_foreign_worktree, handled
      # above) overrides the allowlist. Non-allowlisted paths escalate normally.
      if [[ "$_CAND_ALLOWLISTED" == "1" ]]; then
        :
      else
        escalate ask "$detail" "$outcome"
      fi
      ;;
  esac
done < <(extract_targets "$COMMAND"; scan_interpreter_targets "$COMMAND")

# --- DYNAMIC operands -------------------------------------------------------
# A dynamic operand (rm core/*.py) names a file-scoped mutation whose target
# POPULATION is only known at execution time. The recognizer deliberately does
# not expand it, so the guard cannot ask the ownership oracle about the actual
# files. It must still take a position, and the conservative one is derived
# rather than invented:
#
#   1. If the pattern's STATIC PREFIX lies inside a foreign worktree, the
#      existing ownership mechanism yields a positive verdict on evidence the
#      guard already trusts -> BLOCK.
#   2. ABSENCE OF A WORKTREE CLAIM IS NOT A CONFINEMENT PROOF. The former rule
#      "no active worktrees -> ALLOW" is withdrawn as unsound under the
#      broadened DYNAMIC type. This guard adjudicates block_foreign_repo BEFORE
#      the claim oracle and independently of worktree state, so an unresolved
#      `$TARGET` or `$(choose_path)` could resolve into a SIBLING REPOSITORY
#      while zero worktrees are active. An empty registry proves only that no
#      WORKTREE claim exists. Allow requires proof that every possible
#      resolution is confined; only a prefix the producer proved lexically can
#      supply it.
#   3. Otherwise -> ASK. Crucially, a `pass` on the static prefix is NOT a pass
#      here. `pass:unclaimed` on `core` means only that `core` itself carries no
#      claim; measured 2026-09-11, the oracle's canonical branch tests
#      globToRegExp(claim).test(candidate), so a file-specific claim on
#      core/a.py cannot match the candidate `core` and would be silently
#      dropped. Letting prefix-pass become a final pass is exactly the leak this
#      policy exists to prevent.
#
# This is a disposition over UNCERTAINTY, not a pattern-overlap oracle; building
# one is out of scope for this slice.
# The static prefix is NO LONGER computed here. The producer derives it from
# preserved lexical structure and ships it in the DYNAMIC record with an explicit
# basis. Recomputing it guard-side would restore two independent interpreters on
# opposite sides of the shared boundary -- the exact defect this lane removes --
# and the guard's copy could not see quoting the lexer already resolved.

_caws_active_worktrees_exist() {
  local reg="$PROJECT_DIR/.caws/worktrees.json"
  [[ -r "$reg" ]] || return 1
  grep -q '"path"' "$reg" 2>/dev/null
}

if declare -F caws_bash_dynamic_mutations >/dev/null 2>&1; then
  # HERE-STRING, not `< <(...)`: a process substitution runs the loop body in a
  # SUBSHELL, so `escalate`'s assignment to WORST would be discarded and every
  # dynamic verdict would compute correctly and then vanish.
  while IFS="$(printf '\t')" read -r _pat _reskind _prefix _basis _dynbase; do
    [[ -z "$_pat" ]] && continue
    # CONSUME the producer's prefix; never re-derive it.
    if [[ "$_basis" != "lexically_proven" || -z "$_prefix" ]]; then
      # No provable confinement: the target could resolve anywhere, including
      # into a sibling repository that the claim oracle never examines.
      escalate ask "$_pat (${_reskind:-runtime}-resolved; no lexically proven prefix, so no region is proven admissible)" "ask_dynamic_unconfined"
      continue
    fi
    _pabs="$(abspath "$_prefix")"
    _dout="$(CAWS_ORACLE_PROJECT_DIR="$PROJECT_DIR" \
      CAWS_ORACLE_CURRENT_BRANCH="" \
      CAWS_ORACLE_REL_PATH="$_pabs" \
      CAWS_ORACLE_SESSION_ID="$CAWS_ORACLE_SESSION_ID" \
      node "$CAWS_CLAIM_ORACLE" 2>&1 || true)"
    _dfirst="${_dout%%$'\n'*}"
    case "${_dfirst%%:*}" in
      block_foreign_worktree|block_claimed)
        # Positive ownership verdict on the static prefix: evidence the guard
        # already acts on, independent of how the pattern expands.
        escalate block "$_pat (dynamic operand under ${_dfirst#*:})" "block_dynamic_foreign" ;;
      *)
        # A pass on the PREFIX is not a pass on the population: the oracle's
        # canonical branch tests globToRegExp(claim).test(candidate), so a
        # file-specific claim on core/a.py cannot match the candidate `core`.
        # Ask regardless of whether the registry currently holds any worktree --
        # emptiness is not a confinement proof.
        escalate ask "$_pat (${_reskind:-runtime}-resolved population under $_prefix; prefix verdict ${_dfirst%%:*} proves nothing about descendant claims)" "ask_dynamic_unresolved"
        ;;
    esac
  done <<< "$(caws_bash_dynamic_mutations "$COMMAND" "$AGENT_CWD")"
fi

# --- UNREPRESENTABLE targets -----------------------------------------------
# An operand the record carrier cannot transport (embedded newline/tab). Measured
# 2026-09-11: such a path splits into fragments, NEITHER of which matches a
# file-specific canonical claim, so the write is permitted -- an ownership
# BYPASS, not over-recognition. The guard never sees the bytes here (that is what
# "unrepresentable" means); it acts on the COUNT, which is enough to refuse.
if declare -F caws_bash_unrepresentable_count >/dev/null 2>&1; then
  _UNREPR_N="$(caws_bash_unrepresentable_count "$COMMAND" 2>/dev/null || echo 0)"
  if [[ "${_UNREPR_N:-0}" =~ ^[0-9]+$ && "${_UNREPR_N:-0}" -gt 0 ]]; then
    escalate ask "$_UNREPR_N operand(s) contain a newline or tab, which this recognizer's record carrier cannot transport faithfully; ownership cannot be adjudicated on a split target" "ask_unrepresentable_target"
  fi
fi

# --- UNSUPPORTED executable nesting ----------------------------------------
# Process substitution executes mutation-capable nested shell code this slice
# does not parse. Measured 2026-09-11: `cat <(echo x > CLAIMED)` returned ec=0
# where the plain form blocked. Silence here is indistinguishable from "no
# mutation", so presence alone must take a conservative posture.
if declare -F caws_bash_unsupported_nesting >/dev/null 2>&1; then
  while IFS= read -r _nest; do
    [[ -z "$_nest" ]] && continue
    escalate ask "unsupported shell context '$_nest'; mutation coordinates or nested execution could not be established" "ask_unsupported_nesting"
  done <<< "$(caws_bash_unsupported_nesting "$COMMAND" 2>/dev/null)"
fi

_BG_ID="CAWS bash-write-guard"
command -v guard_identity >/dev/null 2>&1 && _BG_ID="$(guard_identity bash-write-guard)"

case "$WORST" in
  block)
    if [[ "$WORST_KIND" == "block_foreign_repo" ]]; then
      echo "[$_BG_ID] BLOCKED: this Bash command mutates a file inside a DIFFERENT repository ($WORST_DETAIL), not this session's project ($PROJECT_DIR)." >&2
      echo "  A session may READ sibling repos freely but must not WRITE into one from here — the same boundary scope-guard applies to Write/Edit." >&2
      echo "  This is a CAWS governance decision. There is no in-band override." >&2
      echo "  To make the change: write an explicit HANDOFF for an agent rooted in that repo — WHAT to change, WHY, and the exact edit — and have that repo's own session apply it." >&2
      echo "  Do NOT edit ${CAWS_HOOKS_DIR:-.caws/hooks}/ or guard state to bypass this." >&2
      exit 2
    fi
    if [[ "$WORST_KIND" == "block_foreign_worktree" ]]; then
      _OWN_WT="$(printf '%s' "$WORST_DETAIL" | cut -d: -f1)"
      echo "[$_BG_ID] BLOCKED: this Bash command mutates worktree '$_OWN_WT''s payload (.caws/worktrees/$_OWN_WT/...), owned by a DIFFERENT session." >&2
      echo "  A Bash mutation of another session's worktree files is the same isolation breach as a foreign Write/Edit — it is blocked at the same boundary." >&2
      echo "  This is a CAWS governance decision." >&2
      echo "  To work in worktree '$_OWN_WT', operate from a SESSION rooted there. 'caws claim' has NO worktree-name argument — it reads the current directory, so cd first: cd .caws/worktrees/$_OWN_WT && caws claim --takeover" >&2
    else
      IFS=',' read -ra _CLAIM_PAIRS <<< "$WORST_DETAIL"
      _LEAD_WT="${_CLAIM_PAIRS[0]%%:*}"
      _LEAD_PAT="${_CLAIM_PAIRS[0]#*:}"
      echo "[$_BG_ID] BLOCKED: this Bash command mutates '$_LEAD_WT:$_LEAD_PAT', claimed by an active worktree's scope.in." >&2
      _CLAIMANT_COUNT=${#_CLAIM_PAIRS[@]}
      if [[ "$_CLAIMANT_COUNT" -gt 1 ]]; then
        echo "  This path is claimed via scope.in by $_CLAIMANT_COUNT active worktrees:" >&2
        for _pair in "${_CLAIM_PAIRS[@]}"; do
          [[ -z "$_pair" ]] && continue
          _cw="${_pair%%:*}"
          _cp="${_pair#*:}"
          echo "    - worktree '$_cw' via scope.in '$_cp'" >&2
        done
        echo "  Route the edit through whichever single worktree should own it." >&2
      fi
      echo "  This is a CAWS governance decision." >&2
    fi
    echo "  Do NOT edit ${CAWS_HOOKS_DIR:-.caws/hooks}/ or guard state to bypass this." >&2
    exit 2 ;;
  ask)
    case "$WORST_KIND" in
      error_fail_closed)
        # A toolchain fault (oracle spawn failure, registry parse error, etc.) —
        # NOT an ownership conflict. Name it as such so the user is not misled
        # into thinking this path is worktree-claimed.
        _REASON="[$_BG_ID] Worktree-ownership could not be verified for this Bash mutation due to a TOOLCHAIN FAULT ($WORST_DETAIL), not a known ownership conflict. Approve if the target is safe to mutate from this session." ;;
      ask_unrepresentable_target)
        # NOT an ownership conflict and NOT a claimed path: the recognizer could
        # not TRANSPORT the operand, so no ownership question was ever put. Kept
        # distinct because collapsing it into the generic claim wording would
        # describe a conflict that was never adjudicated.
        _REASON="[$_BG_ID] ask_unrepresentable_target: $WORST_DETAIL. This is a CARRIER limit, not a known ownership conflict — the target was never adjudicated. Approve only if you know the target is yours to mutate." ;;
      ask_unsupported_nesting)
        _REASON="[$_BG_ID] ask_unsupported_nesting: $WORST_DETAIL. The nested command is outside this recognizer's parser envelope, so any write it performs was never adjudicated. Approve only if you know what the nested command writes." ;;
      ask_dynamic_unconfined|ask_dynamic_unresolved)
        _REASON="[$_BG_ID] $WORST_KIND: $WORST_DETAIL. The target is resolved at EXECUTION time, so ownership cannot be decided from the command text. Approve only if every path it can resolve to is yours to mutate." ;;
      *)
        _REASON="[$_BG_ID] This Bash command targets a worktree-claimed or worktree-payload path and ownership could not be confirmed ($WORST_KIND:$WORST_DETAIL). Approve only if you own the target worktree; otherwise route the mutation through the owning worktree's session." ;;
    esac
    if caws_guard_cannot_ask; then
      echo "$_REASON" >&2
      echo "  (approval unavailable or automatically satisfied (mode=${HOOK_PERMISSION_MODE:-default}); blocked)" >&2
      exit 2
    fi
    emit_ask "$_REASON"
    exit 0 ;;
  *)
    # No claim/ownership escalation. If the cross-worktree canonical-claim check
    # degraded (js-yaml unresolvable), surface a single advisory so the skipped
    # check is visible — but the mutation is allowed (toolchain fault, not an
    # ownership conflict; the foreign-payload block already ran yaml-free).
    if [[ "${_DEGRADED_NO_YAML:-0}" == "1" ]]; then
      echo "[$_BG_ID] advisory: the cross-worktree scope.in claim check was SKIPPED for this mutation because js-yaml is unresolvable in the hook pack (toolchain fault, not an ownership conflict). The foreign-worktree-payload block still ran. Install js-yaml in the hook pack to restore the canonical-claim check." >&2
    fi
    exit 0 ;;
esac
