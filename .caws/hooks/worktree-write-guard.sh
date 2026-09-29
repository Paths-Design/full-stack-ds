#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 4,8,13
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
# CAWS Worktree Write Guard (shared).
#
# Two responsibilities:
#
#   1. Canonical-spec-materialization refusal
#      (WORKTREE-SPEC-CANONICAL-ACCESS-GUARD-001 A1/A2).
#      From inside a linked worktree, refuse Read/Write/Edit tool calls
#      whose file_path resolves under <linked-worktree>/.caws/specs/*.
#
#   2. Base-branch write enforcement (fail-open for v11.1; uses the
#      worktrees registry and ownership oracle for .caws/worktrees/* payload).
#
# NOTE on CAWS_VENDOR_DIR allowlist arm:
#   The always-allowed arm for the agent-state directory uses
#   "${HOME:-}/${CAWS_VENDOR_DIR}/" (e.g. ~/.claude/ for claude-code).
#   bash case patterns CANNOT expand shell variables, so this arm is
#   written as a conditional expression using [[ == ]] with CAWS_VENDOR_DIR.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
parse_hook_input
# shellcheck source=lib/caws-state.sh
# caws-state.sh provides _realpath + the canonical scope-glob matcher — without
# them this guard CANNOT decide whether a write crosses a worktree claim.
# Sourcing a missing file under `set -euo pipefail` is fatal and `|| exit 0`
# would SILENTLY ADMIT the write (fail-open). A write guard that cannot load its
# decision machinery must fail CLOSED, not admit (CAWS-HOOK-SOURCE-GUARD-FAIL-SOFT-001).
if [[ -f "$SCRIPT_DIR/lib/caws-state.sh" ]] && source "$SCRIPT_DIR/lib/caws-state.sh" && command -v _realpath >/dev/null 2>&1; then
  :
else
  echo "[worktree-write-guard] CAWS hook infrastructure incomplete: lib/caws-state.sh is missing or did not load — cannot evaluate worktree-claim isolation. Failing CLOSED (refusing the write). Restore the shared hook libs with: caws init adapters install" >&2
  printf '{"decision":"block","reason":"CAWS worktree-write-guard: cannot load lib/caws-state.sh, so cross-worktree write isolation cannot be evaluated. Failing closed. Restore the hook pack: caws init adapters install"}\n'
  exit 2
fi
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_PROJECT_DIR, CAWS_VENDOR_DIR, and caws_source_lib — load-bearing.
# Must come before caws_source_lib calls. Guard the source (a fatal `source
# <missing>` is not caught by `|| true` under set -e) and fail CLOSED if absent.
if [[ -f "$SCRIPT_DIR/lib/agent-surface.sh" ]]; then
  source "$SCRIPT_DIR/lib/agent-surface.sh"
else
  echo "[worktree-write-guard] CAWS hook infrastructure incomplete: lib/agent-surface.sh is missing. Failing CLOSED (refusing the write). Restore the shared hook libs with: caws init adapters install" >&2
  printf '{"decision":"block","reason":"CAWS worktree-write-guard: cannot load lib/agent-surface.sh. Failing closed. Restore the hook pack: caws init adapters install"}\n'
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
# shellcheck source=lib/guard-message.sh
[[ -f "$SCRIPT_DIR/lib/guard-message.sh" ]] && source "$SCRIPT_DIR/lib/guard-message.sh"
# shellcheck source=lib/session-id.sh
# CAWS-SESSION-RESOLVER-GUARD-DIVERGENCE-001 (A1/A2): resolve the operating
# session id through the SAME env-var precedence the TS resolver uses, not only
# HOOK_SESSION_ID (which does not propagate into agent-Bash). Best-effort source
# — a missing helper degrades to the legacy HOOK_SESSION_ID-only path, never a
# hard block.
[[ -f "$SCRIPT_DIR/lib/session-id.sh" ]] && source "$SCRIPT_DIR/lib/session-id.sh"

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

# WORKTREE-ISOLATION-HARDENING-001 (Fix 1+2): the shared ownership oracle.
CAWS_CLAIM_ORACLE="$SCRIPT_DIR/lib/worktree-claim-oracle.cjs"

TOOL_NAME="$HOOK_TOOL_NAME"
FILE_PATH="$HOOK_FILE_PATH"

case "$TOOL_NAME" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

WORKTREE_ROOT="${CAWS_PROJECT_DIR:-.}"
WORKTREE_ROOT="$(cd "$WORKTREE_ROOT" 2>/dev/null && pwd -P || printf '%s\n' "$WORKTREE_ROOT")"

# Linked-worktree detection via git as primary signal.
IS_LINKED_WORKTREE=0
CANONICAL_ROOT=""
if command -v git >/dev/null 2>&1; then
  GIT_COMMON_DIR_RAW="$(cd "$WORKTREE_ROOT" 2>/dev/null && git rev-parse --git-common-dir 2>/dev/null || printf '')"
  GIT_DIR_RAW="$(cd "$WORKTREE_ROOT" 2>/dev/null && git rev-parse --git-dir 2>/dev/null || printf '')"
  if [[ -n "$GIT_COMMON_DIR_RAW" ]] && [[ -n "$GIT_DIR_RAW" ]]; then
    case "$GIT_COMMON_DIR_RAW" in
      /*) GIT_COMMON_DIR_ABS="$GIT_COMMON_DIR_RAW" ;;
      *)  GIT_COMMON_DIR_ABS="$WORKTREE_ROOT/$GIT_COMMON_DIR_RAW" ;;
    esac
    case "$GIT_DIR_RAW" in
      /*) GIT_DIR_ABS="$GIT_DIR_RAW" ;;
      *)  GIT_DIR_ABS="$WORKTREE_ROOT/$GIT_DIR_RAW" ;;
    esac
    GIT_COMMON_DIR="$(_realpath "$GIT_COMMON_DIR_ABS")"
    GIT_DIR="$(_realpath "$GIT_DIR_ABS")"
    if [[ -n "$GIT_COMMON_DIR" ]] && [[ "$GIT_COMMON_DIR" != "$GIT_DIR" ]]; then
      IS_LINKED_WORKTREE=1
      CANONICAL_CANDIDATE="$(_realpath "$GIT_COMMON_DIR/..")"
      if [[ -n "$CANONICAL_CANDIDATE" ]] && [[ -d "$CANONICAL_CANDIDATE/.caws" ]]; then
        CANONICAL_ROOT="$CANONICAL_CANDIDATE"
      fi
    fi
  fi
fi

# Canonical-spec-materialization refusal (I1: BEFORE the allowlist).
if [[ "$IS_LINKED_WORKTREE" == "1" ]] && [[ -n "$FILE_PATH" ]]; then
  SPEC_ROOT="$WORKTREE_ROOT/.caws/specs"
  case "$FILE_PATH" in
    /*) FILE_PATH_ABS="$FILE_PATH" ;;
    *)  FILE_PATH_ABS="$WORKTREE_ROOT/$FILE_PATH" ;;
  esac
  FILE_PATH_ABS="$(_realpath "$FILE_PATH_ABS")"
  case "$FILE_PATH_ABS" in
    "$SPEC_ROOT"/*|"$SPEC_ROOT")
      echo "[worktree-write-guard.sh] BLOCKED: $FILE_PATH" >&2
      echo "[worktree-write-guard.sh] Refusing $TOOL_NAME against a linked-worktree .caws/specs/ path." >&2
      echo "[worktree-write-guard.sh]" >&2
      echo "[worktree-write-guard.sh] Linked worktrees must not use worktree-local .caws/specs/ files as authority." >&2
      echo "[worktree-write-guard.sh] That path would be a private materialized copy, not canonical spec authority." >&2
      echo "[worktree-write-guard.sh] CAWS resolves spec reads through the canonical control plane regardless of cwd." >&2
      echo "[worktree-write-guard.sh]" >&2
      echo "[worktree-write-guard.sh] To read a spec from any cwd (including this worktree), use:" >&2
      echo "[worktree-write-guard.sh]   caws specs show <id>" >&2
      echo "[worktree-write-guard.sh]" >&2
      echo "[worktree-write-guard.sh] To check scope from any cwd, use:" >&2
      echo "[worktree-write-guard.sh]   caws scope show <path>" >&2
      echo "[worktree-write-guard.sh]   caws scope check <path>" >&2
      echo "[worktree-write-guard.sh]" >&2
      echo "[worktree-write-guard.sh] If sparse-checkout was disabled in this worktree and you need to restore" >&2
      echo "[worktree-write-guard.sh] the canonical-only invariant, run from the canonical checkout:" >&2
      echo "[worktree-write-guard.sh]   caws worktree repair-sparse <name>" >&2
      exit 2
      ;;
  esac
fi

PROJECT_DIR="$WORKTREE_ROOT"
if [[ -n "$CANONICAL_ROOT" ]]; then
  PROJECT_DIR="$CANONICAL_ROOT"
fi

# Always-allowed paths bypass enforcement.
# CAWS-GUARD-ALLOWLIST-SYNC-001: the unconditional-allow path set lives in the
# shared lib/write-allowlist.sh so worktree-write-guard and bash-write-guard
# return the SAME allow verdict for the SAME path. The one arm that MUST stay
# inline is .caws/worktrees/* PAYLOAD — that is ownership-adjudicated (routed
# through the oracle), not unconditionally allowed, and it must run BEFORE the
# allowlist so a payload path is not swept up by the .caws/* allow arm.
if [[ -n "$FILE_PATH" ]]; then
  case "$FILE_PATH" in
    /*) FILE_PATH_FOR_ALLOWLIST="$(_realpath "$FILE_PATH")" ;;
    *)  FILE_PATH_FOR_ALLOWLIST="$FILE_PATH" ;;
  esac

  # WORKTREE-ISOLATION-HARDENING-001 (Fix 1+2): .caws/worktrees/<name>/<rest>
  # is worktree PAYLOAD — route through ownership oracle FIRST. This arm is
  # intentionally NOT in the shared allowlist (payload is ownership-checked,
  # never unconditionally allowed) and must precede the allowlist delegation
  # so it wins over the .caws/* allow arm.
  case "$FILE_PATH_FOR_ALLOWLIST" in
    "$PROJECT_DIR"/.caws/worktrees/*|.caws/worktrees/*)
      if [[ -f "$CAWS_CLAIM_ORACLE" ]] && command -v node >/dev/null 2>&1; then
        _ORACLE_OUT="$(CAWS_ORACLE_PROJECT_DIR="$PROJECT_DIR" \
          CAWS_ORACLE_CURRENT_BRANCH="" \
          CAWS_ORACLE_REL_PATH="$FILE_PATH_FOR_ALLOWLIST" \
          CAWS_ORACLE_SESSION_ID="$CAWS_ORACLE_SESSION_ID" \
          node "$CAWS_CLAIM_ORACLE" 2>&1 || true)"
        _ORACLE_FIRST="${_ORACLE_OUT%%$'\n'*}"
        case "${_ORACLE_FIRST%%:*}" in
          pass|block_foreign_worktree|block_claimed|ask_uncertain|error_fail_closed|degraded_no_yaml)
            _ORACLE_OUT="$_ORACLE_FIRST" ;;
          *)
            _ORACLE_REASON="$(printf '%s' "$_ORACLE_FIRST" | cut -c1-200)"
            _ORACLE_OUT="error_fail_closed:oracle-spawn (${_ORACLE_REASON:-no output})" ;;
        esac
        _ORACLE_OUTCOME="${_ORACLE_OUT%%:*}"
        _ORACLE_DETAIL="${_ORACLE_OUT#*:}"
        case "$_ORACLE_OUTCOME" in
          pass)
            exit 0 ;;
          degraded_no_yaml)
            # Toolchain fault on the canonical-claim check (js-yaml unresolvable).
            # For a worktree-PAYLOAD path this verdict should not normally arise
            # (the yaml-free foreign-payload block decides payload paths first),
            # but if it does, the isolation-critical block already ran — degrade
            # to allow with a single advisory rather than prompting on every edit.
            _WG_ID="CAWS worktree-write-guard"
            command -v guard_identity >/dev/null 2>&1 && _WG_ID="$(guard_identity worktree-write-guard)"
            echo "[$_WG_ID] advisory: the cross-worktree scope.in claim check was SKIPPED (js-yaml unresolvable in the hook pack — a toolchain fault, not an ownership conflict). The foreign-worktree-payload block still ran. Install js-yaml to restore the canonical-claim check." >&2
            exit 0 ;;
          block_foreign_worktree)
            _WG_ID="CAWS worktree-write-guard"
            command -v guard_identity >/dev/null 2>&1 && _WG_ID="$(guard_identity worktree-write-guard)"
            _OWN_WT="$(printf '%s' "$_ORACLE_DETAIL" | cut -d: -f1)"
            echo "[$_WG_ID] BLOCKED: this is a write into worktree '$_OWN_WT''s payload (.caws/worktrees/$_OWN_WT/...), which is owned by a DIFFERENT session." >&2
            echo "  A worktree's files are owned by the session that created/claimed it; another session must not mutate them directly." >&2
            echo "  This is a CAWS governance decision." >&2
            echo "  To work in worktree '$_OWN_WT', your SESSION must be rooted there, not writing into its path from a foreign session. 'caws claim' has NO worktree-name argument — it reads the current directory, so cd first: cd .caws/worktrees/$_OWN_WT && caws claim --takeover" >&2
            echo "  Do NOT edit ${CAWS_HOOKS_DIR:-.caws/hooks}/ or guard state to bypass this." >&2
            exit 2 ;;
          block_claimed)
            _WG_ID="CAWS worktree-write-guard"
            command -v guard_identity >/dev/null 2>&1 && _WG_ID="$(guard_identity worktree-write-guard)"
            echo "[$_WG_ID] BLOCKED: '$FILE_PATH_FOR_ALLOWLIST' is claimed by an active worktree's scope.in." >&2
            IFS=',' read -ra _CLAIM_PAIRS <<< "$_ORACLE_DETAIL"
            _CLAIMANT_COUNT=${#_CLAIM_PAIRS[@]}
            for _pair in "${_CLAIM_PAIRS[@]}"; do
              [[ -z "$_pair" ]] && continue
              _cw="${_pair%%:*}"
              _cp="${_pair#*:}"
              echo "  claimed:$_cw:$_cp — worktree '$_cw' via scope.in '$_cp'" >&2
            done
            [[ "$_CLAIMANT_COUNT" -gt 1 ]] && echo "  $_CLAIMANT_COUNT worktrees claim this path; route the edit through whichever single worktree should own it." >&2
            echo "  This is a CAWS governance decision." >&2
            exit 2 ;;
          ask_uncertain|error_fail_closed)
            _WG_ID="CAWS worktree-write-guard"
            command -v guard_identity >/dev/null 2>&1 && _WG_ID="$(guard_identity worktree-write-guard)"
            _WP_REASON="[$_WG_ID] This write targets worktree payload (.caws/worktrees/...) and ownership could not be confirmed ($_ORACLE_OUT). Approve only if you are the owning session; otherwise route the edit through the owning worktree's session."
            if caws_guard_cannot_ask; then
              echo "$_WP_REASON" >&2
              echo "  (approval unavailable or automatically satisfied (mode=${HOOK_PERMISSION_MODE:-default}); blocked)" >&2
              exit 2
            fi
            emit_ask "$_WP_REASON"
            exit 0 ;;
        esac
      fi
      echo "[worktree-write-guard] ownership oracle unavailable for worktree payload; blocked" >&2
      exit 2 ;;
  esac

  # Shared unconditional allowlist (lib/write-allowlist.sh). Returns 0 if the
  # path is unconditionally allowed (docs/*, .caws/* minus payload, .tmp/*,
  # .github/*, vendor dir, instruction files, agent-home dir). Payload already
  # returned above.
  #
  # CAWS-GUARD-SCOPE-PRIORITY-001: the allowlist NO LONGER exits unconditionally.
  # A scope.in claim overrides the allowlist — a path claimed by an active
  # worktree is owned, not unconditionally allowed. So we record the allowlist
  # verdict as a flag and let the path fall through to the scope-contention
  # check in the base-branch section. There, a CLAIMED allowlisted path blocks
  # (scope.in wins); a CLEAR or UNDETERMINED allowlisted path exits 0 (the
  # allowlist permits when unclaimed, and a toolchain fault must not block).
  # The early exits below (no worktrees.json, no node, inside worktree,
  # registered worktree, WT_COUNT 0) all exit 0, so an allowlisted path is
  # still allowed in those contexts — scope.in only overrides on the base
  # branch where cross-worktree contention is the concern.
  # shellcheck source=lib/write-allowlist.sh
  [[ -f "$SCRIPT_DIR/lib/write-allowlist.sh" ]] && source "$SCRIPT_DIR/lib/write-allowlist.sh"
  if declare -F caws_is_write_allowlisted >/dev/null 2>&1; then
    if caws_is_write_allowlisted "$FILE_PATH_FOR_ALLOWLIST" "$PROJECT_DIR"; then
      _PATH_ALLOWLISTED=1
    fi
  fi
fi

# --- Base-branch write enforcement -----------------------------------------
if [[ ! -f "$PROJECT_DIR/.caws/worktrees.json" ]]; then
  exit 0
fi
if ! command -v node >/dev/null 2>&1; then
  exit 0
fi

AGENT_DIR="${HOOK_CWD:-${CAWS_PROJECT_DIR:-.}}"
AGENT_DIR="$(_realpath "$AGENT_DIR")"
CURRENT_BRANCH=$(caws_current_branch "$AGENT_DIR")  # HOOK-LIB-CONSOLIDATION-001 T2b
WORKTREE_BASE="$PROJECT_DIR/.caws/worktrees"

if [[ -n "$AGENT_DIR" ]] && [[ "$AGENT_DIR" == "$WORKTREE_BASE"/* ]]; then
  # Being in a worktree does not authorize edits to a different canonical claim.
  case "$FILE_PATH" in /*) _CANON_TARGET="$(_realpath "$FILE_PATH")" ;;
    *) _CANON_TARGET="$(_realpath "$AGENT_DIR/$FILE_PATH")" ;; esac
  case "$_CANON_TARGET" in "$WORKTREE_BASE"/*) exit 0 ;; esac
  case "$_CANON_TARGET" in
    "$PROJECT_DIR"/*)
      _OWN_WT="${AGENT_DIR#"$WORKTREE_BASE"/}"; _OWN_WT="${_OWN_WT%%/*}"
      _SELF="$(CAWS_ORACLE_PROJECT_DIR="$PROJECT_DIR" CAWS_ORACLE_CURRENT_BRANCH="" \
        CAWS_ORACLE_REL_PATH="$WORKTREE_BASE/$_OWN_WT/.ownership-probe" \
        node "$CAWS_CLAIM_ORACLE" 2>&1 || true)"
      _CLAIMS="$(CAWS_ORACLE_PROJECT_DIR="$PROJECT_DIR" CAWS_ORACLE_CURRENT_BRANCH="" \
        CAWS_ORACLE_REL_PATH="$_CANON_TARGET" node "$CAWS_CLAIM_ORACLE" 2>&1 || true)"
      case "$_CLAIMS" in
        pass:*) exit 0 ;;
        block_claimed:*)
          IFS=',' read -ra _PAIRS <<< "${_CLAIMS#*:}"
          for _PAIR in "${_PAIRS[@]}"; do
            if [[ "${_PAIR%%:*}" != "$_OWN_WT" || "$_SELF" != "pass:owner-self:$_OWN_WT" ]]; then
              echo "[worktree-write-guard] BLOCKED canonical path '$_CANON_TARGET': claimed:$_PAIR. Worktree cwd does not confer this claim." >&2
              exit 2
            fi
          done
          exit 0 ;;
        degraded_no_yaml:*)
          echo "[worktree-write-guard] advisory: canonical scope claim check SKIPPED (js-yaml unavailable)." >&2
          exit 0 ;;
        *)
          _WHY="[worktree-write-guard] canonical ownership could not be established: $_CLAIMS"
          if caws_guard_cannot_ask; then echo "$_WHY" >&2; exit 2; fi
          emit_ask "$_WHY"; exit 0 ;;
      esac ;;
  esac
  exit 0
fi

IS_REGISTERED_WORKTREE=$(node -e "
  $CAWS_NODE_ENTRIES_OF
  try {
    var reg = JSON.parse(require('fs').readFileSync('$PROJECT_DIR/.caws/worktrees.json', 'utf8'));
    var current = '$CURRENT_BRANCH';
    var found = entriesOf(reg).some(function(w) {
      return w.branch === current && w.status !== 'destroyed' && w.status !== 'missing';
    });
    console.log(found ? '1' : '0');
  } catch(e) { console.log('0'); }
" 2>/dev/null || echo "0")

if [[ "$IS_REGISTERED_WORKTREE" == "1" ]]; then
  exit 0
fi

WT_INFO=$(node -e "
  $CAWS_NODE_ENTRIES_OF
  var fs = require('fs');
  var path = require('path');
  try {
    var projectDir = '$PROJECT_DIR';
    var reg = JSON.parse(fs.readFileSync(projectDir + '/.caws/worktrees.json', 'utf8'));
    var active = entriesOf(reg).filter(function(w) {
      if (w.status === 'destroyed' || w.status === 'missing') return false;
      if (w.baseBranch !== '$CURRENT_BRANCH') return false;
      var wtPath = (typeof w.path === 'string' && w.path)
        ? w.path
        : path.join(projectDir, '.caws', 'worktrees', String(w.name || ''));
      return fs.existsSync(wtPath);
    });
    console.log(active.length + ':' + active.map(function(w) { return w.name; }).join(', '));
  } catch(e) { console.log('0:'); }
" 2>/dev/null || echo "0:")

WT_COUNT=$(echo "$WT_INFO" | cut -d: -f1)
WT_NAMES=$(echo "$WT_INFO" | cut -d: -f2)

if [[ "$WT_COUNT" -lt 1 ]] 2>/dev/null && command -v git >/dev/null 2>&1; then
  GIT_WT_INFO=$(git -C "$PROJECT_DIR" worktree list --porcelain 2>/dev/null | awk -v current="$PROJECT_DIR" '
    BEGIN {
      count = 0;
      names = "";
      path = "";
    }
    /^worktree / {
      path = substr($0, 10);
      next;
    }
    /^branch / {
      if (path != "" && path != current) {
        count++;
        name = path;
        sub(/^.*\//, "", name);
        names = names (names ? ", " : "") name;
      }
      path = "";
      next;
    }
    END {
      if (path != "" && path != current) {
        count++;
        name = path;
        sub(/^.*\//, "", name);
        names = names (names ? ", " : "") name;
      }
      printf "%d:%s\n", count, names;
    }
  ')

  WT_COUNT=$(echo "$GIT_WT_INFO" | cut -d: -f1)
  WT_NAMES=$(echo "$GIT_WT_INFO" | cut -d: -f2-)
fi

# Zero worktrees → nothing to isolate → allow.
if [[ "$WT_COUNT" -lt 1 ]] 2>/dev/null; then
  exit 0
fi

if [[ -n "$FILE_PATH" ]] && [[ "$WT_COUNT" -gt 0 ]] 2>/dev/null; then
  REL_PATH="${FILE_PATH_FOR_ALLOWLIST:-$FILE_PATH}"
  if [[ "$REL_PATH" == "$PROJECT_DIR"/* ]]; then
    REL_PATH="${REL_PATH#$PROJECT_DIR/}"
  fi

  # CAWS-SCOPE-CONTENTION-CMD-001: the cross-worktree scope-claim check is the
  # kernel's `caws scope contention` (which reads the canonical store — NO
  # js-yaml, NO inline spec re-parse). We map its stable JSON contract onto the
  # legacy SPEC_CONTENTION_CHECK token format the downstream `case` blocks
  # consume (claimed:<wt>:<pattern>,... | clear | unknown:<reason>), so the
  # refusal/advisory behavior below is unchanged.
  SPEC_CONTENTION_CHECK="unknown:caws-unavailable"
  if command -v caws >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
    _CONTENTION_JSON="$(caws scope contention "$REL_PATH" --json 2>/dev/null)"
    if [[ -n "$_CONTENTION_JSON" ]] && printf '%s' "$_CONTENTION_JSON" | jq -e . >/dev/null 2>&1; then
      _CONTENTION_STATUS="$(printf '%s' "$_CONTENTION_JSON" | jq -r '.status // "unknown"')"
      case "$_CONTENTION_STATUS" in
        claimed)
          # Rebuild claimed:<wt>:<pattern>,<wt>:<pattern>,...
          _CLAIM_TOKENS="$(printf '%s' "$_CONTENTION_JSON" \
            | jq -r '.claimants | map(.worktreeName + ":" + .matchedPattern) | join(",")')"
          SPEC_CONTENTION_CHECK="claimed:${_CLAIM_TOKENS}"
          ;;
        clear)
          SPEC_CONTENTION_CHECK="clear"
          ;;
        undetermined)
          _CONTENTION_REASON="$(printf '%s' "$_CONTENTION_JSON" | jq -r '.reason // "undetermined"')"
          SPEC_CONTENTION_CHECK="unknown:${_CONTENTION_REASON}"
          ;;
        *)
          SPEC_CONTENTION_CHECK="unknown:${_CONTENTION_STATUS}"
          ;;
      esac
    fi
  fi
fi

# CAWS-GUARD-SCOPE-PRIORITY-001: an allowlisted path is permitted ONLY when no
# worktree's scope.in claims it. If the scope-contention check above reported
# the path as CLAIMED, the allowlist defers — scope.in is authoritative, so a
# claimed docs/** or .caws/** path blocks here exactly like a claimed src/**
# path would. If contention is CLEAR (no claim) or UNKNOWN (toolchain fault),
# the allowlist admits (coordination edits still work; a fault must not block).
# Non-allowlisted paths fall through to the risk-prompt logic below.
if [[ "${_PATH_ALLOWLISTED:-0}" == "1" ]]; then
  case "${SPEC_CONTENTION_CHECK:-unknown:scope-check-skipped}" in
    claimed:*)
      # scope.in wins — fall through to the claimed:* block below which blocks
      # with the worktree/pattern detail. Do NOT exit 0 here.
      ;;
    *)
      # clear, unknown:* (toolchain fault), or scope-check-skipped (WT_COUNT==0
      # path that bypassed the scope section). Allow via the allowlist.
      exit 0
      ;;
  esac
fi

if [[ -z "${REL_PATH:-}" ]]; then
  REL_PATH="${FILE_PATH_FOR_ALLOWLIST:-$FILE_PATH}"
  if [[ -n "$REL_PATH" ]] && [[ "$REL_PATH" == "$PROJECT_DIR"/* ]]; then
    REL_PATH="${REL_PATH#$PROJECT_DIR/}"
  fi
fi

MERGE_HEAD_PATH=$(cd "$AGENT_DIR" && git rev-parse --git-dir 2>/dev/null || echo ".git")
if [[ -f "$MERGE_HEAD_PATH/MERGE_HEAD" ]]; then
  exit 0
fi

_guard_throttled_risk() {
  command -v caws_compose_risk >/dev/null 2>&1 || return 0
  local ttl="${CAWS_RISK_THROTTLE_SECS:-30}"
  local cache_dir="$PROJECT_DIR/.caws/cache"
  local safe_branch
  safe_branch="$(printf '%s' "${CURRENT_BRANCH:-_}" | tr -c 'A-Za-z0-9._-' '_')"
  local cache_file="$cache_dir/risk-$safe_branch.txt"
  if [[ "$ttl" != "0" ]] && [[ -f "$cache_file" ]]; then
    local now mtime age
    now=$(date +%s 2>/dev/null || echo 0)
    mtime=$(stat -f %m "$cache_file" 2>/dev/null || stat -c %Y "$cache_file" 2>/dev/null || echo 0)
    age=$(( now - mtime ))
    if [[ "$age" -ge 0 ]] && [[ "$age" -lt "$ttl" ]]; then
      cat "$cache_file" 2>/dev/null
      return 0
    fi
  fi
  local line
  line="$(caws_compose_risk "$PROJECT_DIR" "$CURRENT_BRANCH" "$REL_PATH" 2>/dev/null || echo "")"
  if [[ -n "$line" ]] && [[ "$ttl" != "0" ]]; then
    mkdir -p "$cache_dir" 2>/dev/null || true
    printf '%s\n' "$line" > "$cache_file" 2>/dev/null || true
  fi
  printf '%s' "$line"
}

_guard_risk_reason() {
  local head="$1"
  local body=""
  if [[ "$WT_COUNT" -eq 0 ]] 2>/dev/null; then
    body="No active worktree is present for branch '$CURRENT_BRANCH'. Worktrees are preferred for isolated feature work; repo-coordination paths (.caws/, docs/) are already allowlisted above."
  else
    body="$WT_COUNT active worktree(s) on '$CURRENT_BRANCH': ${WT_NAMES:-<unnamed>}."
    case "${SPEC_CONTENTION_CHECK:-}" in
      clear)      body="$body No active worktree's scope.in claims this file." ;;
      unknown:*)  body="$body Scope contention undetermined (${SPEC_CONTENTION_CHECK}); a bound spec may be missing its id, file, or scope." ;;
    esac
  fi
  local risk
  risk="$(_guard_throttled_risk)"
  if [[ -n "$risk" ]]; then
    body="$body $risk"
  fi
  local redirect="make this edit from a session rooted in the owning worktree (caws worktree list) — or create one (caws worktree create <name>)"
  if [[ "$WT_COUNT" -eq 1 ]] 2>/dev/null; then
    local _wt="${WT_NAMES%%[, ]*}"
    if [[ -n "$_wt" ]] && [[ "$_wt" != "<unnamed>" ]]; then
      redirect="make this edit from a session rooted in worktree '$_wt' (cd .caws/worktrees/$_wt and operate from there — a one-off Bash cd does NOT move your Edit/Write tool context). It is the active worktree for branch '$CURRENT_BRANCH'"
    fi
  fi
  printf '%s %s Approve to edit on the base branch, or %s.' "$head" "$body" "$redirect"
}

_guard_no_ask() { caws_guard_cannot_ask; }

case "${SPEC_CONTENTION_CHECK:-}" in
  claimed:*)
    _WG_ID="CAWS worktree-write-guard"
    command -v guard_identity >/dev/null 2>&1 && _WG_ID="$(guard_identity worktree-write-guard)"
    echo "[$_WG_ID] BLOCKED: '$REL_PATH' is claimed by an active worktree's scope.in." >&2
    _CLAIM_LIST="${SPEC_CONTENTION_CHECK#claimed:}"
    IFS=',' read -ra _CLAIM_PAIRS <<< "$_CLAIM_LIST"
    _CLAIM_COUNT=${#_CLAIM_PAIRS[@]}
    echo "  (format: claimed:<worktree-name>:<matching-pattern>)" >&2
    for _pair in "${_CLAIM_PAIRS[@]}"; do
      [[ -z "$_pair" ]] && continue
      echo "  claimed:$_pair" >&2
    done
    echo "  This is a CAWS governance decision." >&2
    _CLAIM_WT="$(printf '%s' "$_CLAIM_LIST" | cut -d, -f1 | cut -d: -f1)"
    if [[ "$_CLAIM_COUNT" -gt 1 ]]; then
      echo "This path is claimed via scope.in by $_CLAIM_COUNT active worktrees (listed above)." >&2
      echo "  Route the edit through whichever single worktree should own it; your SESSION must be rooted in that worktree (a one-off Bash cd does NOT move your Edit/Write tool context)." >&2
    elif [[ -n "$_CLAIM_WT" ]]; then
      echo "To make this edit, your SESSION must be operating in the owning worktree '$_CLAIM_WT'." >&2
      echo "  cd .caws/worktrees/$_CLAIM_WT and operate from there — a one-off Bash cd does NOT move your Edit/Write tool context; the session itself must be rooted in the worktree." >&2
    else
      echo "To make this edit, your SESSION must be operating in the owning worktree (caws worktree list)." >&2
    fi
    echo "Do NOT edit ${CAWS_HOOKS_DIR:-.caws/hooks}/ or guard state to bypass this." >&2
    exit 2
    ;;
esac

_WG_ASK_ID="CAWS worktree-write-guard"
command -v guard_identity >/dev/null 2>&1 && _WG_ASK_ID="$(guard_identity worktree-write-guard)"
_RISK_REASON="$(_guard_risk_reason "$_WG_ASK_ID: base-branch write on '$CURRENT_BRANCH'.")"

if _guard_no_ask; then
  echo "[worktree-write-guard.sh] BLOCKED: $_RISK_REASON" >&2
  echo "" >&2
  echo "(ask-incapable harness: mode=${HOOK_PERMISSION_MODE:-default}, CAWS_GUARD_NO_ASK=${CAWS_GUARD_NO_ASK:-0}, or emit_ask unavailable — falling back to a hard block so the write is not silently allowed.)" >&2
  echo "Do NOT edit ${CAWS_HOOKS_DIR:-.caws/hooks}/ or guard state to bypass this. Ask the user if a base-branch edit is genuinely needed." >&2
  exit 2
fi

emit_ask "$_RISK_REASON"
exit 0
