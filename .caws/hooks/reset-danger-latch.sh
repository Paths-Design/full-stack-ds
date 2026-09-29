#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 17
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# Human-authorized reset for the dangerous-command latch written by
# block-dangerous.sh. Clears latch sentinel(s) under
# ${CAWS_VENDOR_DIR}/hooks/state/ and records each reset (with a mandatory
# reason) to ${CAWS_VENDOR_DIR}/logs/danger-latch-resets.log.

set -euo pipefail

# --- Resolve project + state locations -------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_VENDOR_DIR. NOTE: it also sets CAWS_PROJECT_DIR, sometimes to the
# RELATIVE fallback "." — see below for why that value is deliberately ignored.
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true

# CAWS-RESET-LATCH-CWD-DEPENDENT-LOOKUP-001: derive the project root from this
# script's own location, NOT from the inherited CAWS_PROJECT_DIR.
#
# agent-surface.sh sets CAWS_PROJECT_DIR="." when it cannot resolve an absolute
# root. A `${CAWS_PROJECT_DIR:-<absolute fallback>}` expansion does NOT rescue
# that: "." is non-empty, so `:-` never fires and STATE_DIR becomes the RELATIVE
# "./${CAWS_VENDOR_DIR}/hooks/state" — silently resolved against whatever cwd the
# human happens to be in. Running the reset from a sibling repo then searched the
# wrong tree and reported "nothing to clear" while the latch was still armed,
# leaving the session hard-blocked with no working recovery path.
#
# reset-strikes.sh has always computed its root this way and is immune; this
# matches it. The state dir is a property of where the hooks are INSTALLED, never
# of where the operator is standing.
if [[ "${CAWS_MACHINE_RUNTIME:-}" == "1" ]]; then
  # A snapshot's install directory is machine state, never the governed repo.
  # Human recovery must name the project; never infer it from the snapshot.
  if [[ "${CAWS_PROJECT_DIR:-}" != /* ]]; then
    echo 'reset-danger-latch.sh: machine recovery requires absolute CAWS_PROJECT_DIR' >&2
    exit 2
  fi
  RECOVERY_WORKTREE_DIR="$(env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR -u GIT_INDEX_FILE git -C "$CAWS_PROJECT_DIR" rev-parse --show-toplevel)"
  _common_dir="$(env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR -u GIT_INDEX_FILE git -C "$CAWS_PROJECT_DIR" rev-parse --path-format=absolute --git-common-dir)"
  PROJECT_DIR="$(dirname "$_common_dir")"
  export CAWS_PROJECT_DIR="$PROJECT_DIR"
else
  PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
  RECOVERY_WORKTREE_DIR="$PROJECT_DIR"
fi
STATE_DIR="$PROJECT_DIR/${CAWS_VENDOR_DIR}/hooks/state"
LOG_FILE="$PROJECT_DIR/${CAWS_VENDOR_DIR}/logs/danger-latch-resets.log"

# DANGER-LATCH-QUARANTINE-TRAP-001: fail closed on the env-stripped snapshot
# invocation. A machine snapshot lives under <home>/lib/runtimes/<digest> (and
# carries a manifest.json sibling — project-local packs carry one too, so the
# PATH SHAPE is the discriminator, manifest the belt); invoked WITHOUT the env
# prefix the script takes the non-machine branch above, derives PROJECT_DIR
# from the SNAPSHOT location (~/.caws/lib — machine state, never a project),
# searches zero vendor state dirs, and (pre-fix) exited 0 "No danger latches
# found" while the trap stayed armed — success-by-absence on the only human
# release path, witnessed live in a consumer repo. Detect the snapshot context
# structurally and refuse loudly with the corrected command.
if [[ "${CAWS_MACHINE_RUNTIME:-}" != "1" && "$SCRIPT_DIR" == */lib/runtimes/* && -f "$SCRIPT_DIR/manifest.json" ]]; then
  echo 'reset-danger-latch.sh: this is a machine-runtime snapshot and CAWS_MACHINE_RUNTIME is not set.' >&2
  echo '  A snapshot cannot infer the governed project from its own location; without the env prefix' >&2
  echo '  this reset searches machine state and can only report success-by-absence. Re-run with:' >&2
  echo "  env CAWS_MACHINE_RUNTIME=1 CAWS_PROJECT_DIR=<absolute-project-root> CAWS_AGENT_SURFACE=${CAWS_AGENT_SURFACE:-claude-code} bash '$SCRIPT_DIR/reset-danger-latch.sh' --session <id> --reason '<why this is safe>'" >&2
  exit 2
fi

# CAWS-RESET-LATCH-MULTIVENDOR-001: the danger latch is written by
# block-dangerous.sh under the WRITER's vendor dir (the active harness bridge
# sets CAWS_AGENT_SURFACE, e.g. zcode -> .zcode/hooks/state/). This reset is
# usually run by a HUMAN from a plain shell with no CAWS_AGENT_SURFACE set, so
# agent-surface.sh defaults it to claude-code -> .claude. STATE_DIR above is
# therefore the CLEARER's dir, which in a multi-surface repo is NOT where the
# latch lives — the reset would report "nothing to clear" while the latch stays
# armed, wedging the agent with no recovery. Enumerate EVERY present vendor
# state dir and search the union; STATE_DIR stays as the primary/default.
#
# The known surface set mirrors agent-surface.sh's case arms. The resolved
# CAWS_VENDOR_DIR is always included (even if its dir does not exist yet) so a
# keyed candidate is still computed for it.
_caws_known_vendor_dirs=(.claude .codex .cursor .windsurf .opencode .zcode)
_caws_canonical_root() {
  # CAWS-LATCH-CANONICAL-STATE-DIR-001: resolve the canonical repo root (the
  # one block-dangerous.sh writes latches under, since its CAWS_PROJECT_DIR is
  # git-root-normalized) rather than the install root (SCRIPT_DIR/../..). The
  # two diverge when this reset runs from a linked worktree, leaving a latch
  # written at the canonical root unreachable. Delegates to the shared
  # caws_canonical_state_dir walk (lib/caws-state.sh) and strips the trailing
  # <vendor>/hooks/state to recover the root. Falls back to the install root
  # when the helper is unavailable or git is absent.
  if declare -F caws_canonical_state_dir >/dev/null 2>&1; then
    local hinted
    # CAWS-RESET-LATCH-CWD-DEPENDENT-LOOKUP-001 (recurrence,
    # CAWS-DEFECT-RED-SUITE-TRIAGE-01): agent-surface.sh sets
    # CAWS_PROJECT_DIR="." when it cannot resolve an absolute root, and "." is
    # non-empty so `${CAWS_PROJECT_DIR:-$PROJECT_DIR}` never falls back — the
    # helper then fail-opens to the RELATIVE "./<vendor>/hooks/state", the
    # search root becomes ".", and the reset searches whatever cwd the human
    # is standing in. Treat "." (and empty) as unset: anchor at PROJECT_DIR
    # (derived from this script's own install location above), which is
    # absolute and git-walks to the canonical root on its own.
    local start="${CAWS_PROJECT_DIR:-}"
    [[ -z "$start" || "$start" == "." ]] && start="$PROJECT_DIR"
    hinted="$(caws_canonical_state_dir "$start" "${CAWS_VENDOR_DIR:-.claude}")"
    # caws_canonical_state_dir returns <root>/<vendor>/hooks/state; recover the
    # root by chopping the trailing /<vendor>/hooks/state (two levels: the
    # vendor dir + hooks/state).
    local root="${hinted%/hooks/state}"
    root="${root%/*}"
    [[ -n "$root" ]] && { printf '%s\n' "$root"; return 0; }
  fi
  printf '%s\n' "$PROJECT_DIR"
}

_caws_all_vendor_state_dirs() {
  local out=()
  local vd dir seen prev
  # Search the canonical repository AND the named worktree. Existing latch
  # writers use the hook's project root; changing that landing spot would
  # make an already armed worktree latch invisible after a runtime update.
  # Both roots are derived from the selected project, never the human's cwd.
  local search_root canonical_root
  canonical_root="$(_caws_canonical_root)"
  for search_root in "$canonical_root" "$RECOVERY_WORKTREE_DIR"; do
    for vd in "${CAWS_VENDOR_DIR:-.claude}" "${_caws_known_vendor_dirs[@]}"; do
      dir="$search_root/$vd/hooks/state"
      # Dedup roots and vendor dirs (empty-array-safe under set -u).
      seen=0
      for prev in ${out[@]+"${out[@]}"}; do [[ "$prev" == "$dir" || "$prev" -ef "$dir" ]] && { seen=1; break; }; done
      [[ "$seen" == 1 ]] && continue
      [[ -d "$dir" ]] && out+=("$dir")
    done
  done
  # Empty-array-safe under set -u: prints nothing when no vendor state dirs exist.
  printf '%s\n' ${out[@]+"${out[@]}"}
}

usage() {
  cat >&2 <<USAGE
Usage: reset-danger-latch.sh (--current | --all | --session <id>) --reason "<why this is safe>"

Clears the dangerous-command latch(es) written by block-dangerous.sh so that
Bash tool calls may resume. A reason is mandatory and is recorded to the
audit log at:
  $LOG_FILE

Modes (exactly one required):
  --current            Clear the latch for the current session
                       (resolved from CAWS_SESSION_ID / CLAUDE_SESSION_ID / HOOK_SESSION_ID).
  --all                Clear every latch in this project.
  --session <id>       Clear the latch for a specific session id.

Required:
  --reason "<text>"    Human-supplied justification, recorded to the log.
USAGE
}

# --- Parse arguments --------------------------------------------------------
MODE=""
SESSION_ARG=""
REASON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --current)  MODE="current"; shift ;;
    --all)      MODE="all"; shift ;;
    --session)  MODE="session"; SESSION_ARG="${2:-}"; shift 2 ;;
    --reason)   REASON="${2:-}"; shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    *)          echo "reset-danger-latch.sh: unknown argument: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "reset-danger-latch.sh: one of --current, --all, or --session <id> is required." >&2
  usage
  exit 2
fi

if [[ -z "$REASON" ]]; then
  echo "reset-danger-latch.sh: --reason \"<why this is safe>\" is required." >&2
  echo "The latch is a human-review boundary; clearing it must be justified and is logged." >&2
  exit 2
fi

if [[ "$MODE" == "session" && -z "$SESSION_ARG" ]]; then
  echo "reset-danger-latch.sh: --session requires a session id." >&2
  exit 2
fi

# sanitize_session comes from lib/caws-state.sh so the clearer's filename
# transform is byte-identical to block-dangerous.sh's writer transform
# (DANGER-LATCH-UX-001). If the lib is somehow absent, fall back to a local
# copy of the identical transform rather than failing the reset.
if ! source "$SCRIPT_DIR/lib/caws-state.sh" 2>/dev/null || ! command -v sanitize_session >/dev/null 2>&1; then
  sanitize_session() {
    printf '%s' "${1:-}" | tr -c 'A-Za-z0-9._-' '_'
  }
fi

# shellcheck source=lib/session-id.sh
# CAWS-SESSION-RESOLVER-GUARD-DIVERGENCE-001 (A6): resolve the session id via
# the SAME precedence the resolver + guards use, so the latch filename the
# reset targets matches the filename block-dangerous.sh keyed. Best-effort
# source — a missing helper falls back to the inline chain at the call site.
[[ -f "$SCRIPT_DIR/lib/session-id.sh" ]] && source "$SCRIPT_DIR/lib/session-id.sh" 2>/dev/null || true

# --- Resolve the set of latch files to clear --------------------------------
declare -a LATCH_FILES=()
# DANGER-LATCH-APPROVAL-AND-FEEDBACK-001: the reset ALSO clears the per-session
# WARN MARKER so a post-reset session starts with a fresh first-strike grace.
# A warn marker with no latch is per-session advisory state, not authority — it
# is cleared too (so clearing the grace is never a no-op when only a warn
# exists). Populated alongside LATCH_FILES per mode.
declare -a WARN_FILES=()

case "$MODE" in
  current)
    # CAWS-SESSION-RESOLVER-GUARD-DIVERGENCE-001 (A6): use the shared helper so
    # this resolves the SAME session id block-dangerous.sh used to KEY the latch
    # (previously this used a 3-source inline chain while block-dangerous used a
    # 4-source jq chain — they could disagree, so the reset targeted the wrong
    # filename). Falls back to the legacy inline chain if the helper is absent.
    if declare -F resolve_caws_session_id >/dev/null 2>&1; then
      SESSION_ID="$(resolve_caws_session_id)"
    else
      SESSION_ID="${CAWS_SESSION_ID:-${CLAUDE_SESSION_ID:-${HOOK_SESSION_ID:-unknown}}}"
    fi
    # CAWS-RESET-LATCH-MULTIVENDOR-001: the latch was written under the WRITER's
    # vendor dir, which may differ from the clearer's. If SESSION_ID resolved to
    # a real id (not "unknown"), search the keyed filename across EVERY present
    # vendor state dir. If it resolved to "unknown" (human shell, no harness
    # env) or no keyed file is found, fall back to the one-latch search below —
    # now also spanning every vendor dir.
    declare -a _keyed=()
    if [[ "$SESSION_ID" != "unknown" ]]; then
      while IFS= read -r _vdir; do
        [[ -z "$_vdir" ]] && continue
        _kc="$_vdir/danger-latch-$(sanitize_session "$SESSION_ID").json"
        # Warn sibling for this session in every vendor dir (cleared even if no
        # latch exists, matching the original semantics).
        WARN_FILES+=("$_vdir/danger-warn-$(sanitize_session "$SESSION_ID").json")
        [[ -f "$_kc" ]] && _keyed+=("$_kc")
      done < <(_caws_all_vendor_state_dirs)
    fi
    if [[ "${#_keyed[@]}" -ge 1 ]]; then
      for f in "${_keyed[@]}"; do LATCH_FILES+=("$f"); done
    else
      # DANGER-LATCH-UX-001 (+ MULTIVENDOR): --current is usually run by a HUMAN
      # from a shell with no session id in its env, so SESSION_ID resolves to
      # "unknown" (or the keyed file lives under a different vendor dir). When
      # no keyed candidate is found but EXACTLY ONE latch sentinel exists across
      # ALL vendor dirs, clear that one. With 0 or 2+, fall through to guidance.
      declare -a _found=()
      while IFS= read -r _vdir; do
        [[ -z "$_vdir" ]] && continue
        while IFS= read -r f; do
          [[ -n "$f" ]] && _found+=("$f")
        done < <(find "$_vdir" -maxdepth 1 -type f -name 'danger-latch-*.json' 2>/dev/null)
      done < <(_caws_all_vendor_state_dirs)
      if [[ "${#_found[@]}" -eq 1 ]]; then
        echo "reset-danger-latch.sh: no latch for resolved session '$SESSION_ID'," >&2
        echo "  but exactly one latch exists — clearing it: ${_found[0]}" >&2
        LATCH_FILES+=("${_found[0]}")
        # Clear that latch's warn sibling too (danger-latch-X -> danger-warn-X).
        WARN_FILES+=("${_found[0]/danger-latch-/danger-warn-}")
      else
        # Record a candidate so the not-found branch reports something; if 2+
        # latches exist across vendors, the guidance tells the human to use
        # --session/--all.
        LATCH_FILES+=("$STATE_DIR/danger-latch-$(sanitize_session "$SESSION_ID").json")
        if [[ "${#_found[@]}" -gt 1 ]]; then
          echo "reset-danger-latch.sh: ${#_found[@]} latches exist across vendor dirs and --current cannot" >&2
          echo "  disambiguate (no session id in this shell). Use --all, or --session <id>" >&2
          echo "  with the id from the block message. Latches:" >&2
          for f in "${_found[@]}"; do echo "    - $f" >&2; done
          # Refusal: nothing cleared, operator must disambiguate. Exit non-zero
          # so a script/human can tell "no latch cleared" from a clean reset.
          exit 1
        fi
      fi
    fi
    ;;
  session)
    # CAWS-RESET-LATCH-MULTIVENDOR-001: the latch was written under the
    # WRITER's vendor dir, which may differ from the clearer's. Search the keyed
    # filename across every present vendor state dir.
    while IFS= read -r _vdir; do
      [[ -n "$_vdir" ]] && LATCH_FILES+=("$_vdir/danger-latch-$(sanitize_session "$SESSION_ARG").json")
      [[ -n "$_vdir" ]] && WARN_FILES+=("$_vdir/danger-warn-$(sanitize_session "$SESSION_ARG").json")
    done < <(_caws_all_vendor_state_dirs)
    ;;
  all)
    # CAWS-RESET-LATCH-MULTIVENDOR-001: --all must clear EVERY latch in the
    # project across ALL vendor dirs (each harness writes its own). Sweeping
    # only STATE_DIR silently left latches armed in other vendor dirs while
    # reporting success.
    while IFS= read -r _vdir; do
      [[ -z "$_vdir" ]] && continue
      while IFS= read -r f; do
        [[ -n "$f" ]] && LATCH_FILES+=("$f")
      done < <(find "$_vdir" -maxdepth 1 -type f -name 'danger-latch-*.json' 2>/dev/null)
      while IFS= read -r f; do
        [[ -n "$f" ]] && WARN_FILES+=("$f")
      done < <(find "$_vdir" -maxdepth 1 -type f -name 'danger-warn-*.json' 2>/dev/null)
    done < <(_caws_all_vendor_state_dirs)
    ;;
esac

if [[ "${#LATCH_FILES[@]}" -eq 0 && "${#WARN_FILES[@]}" -eq 0 ]]; then
  # NOTE: _caws_all_vendor_state_dirs emits a single BLANK line when it finds
  # no dirs (printf '%s\n' with zero args still processes the format once) —
  # count only non-blank lines.
  _n_dirs=0
  while IFS= read -r _vdir; do
    if [[ -n "$_vdir" ]]; then _n_dirs=$((_n_dirs + 1)); fi
  done < <(_caws_all_vendor_state_dirs)
  if (( _n_dirs == 0 )); then
    # DANGER-LATCH-QUARANTINE-TRAP-001: "searched zero dirs" is never success.
    # A reset that located nothing to search cannot adjudicate anything; the
    # trap (and, with escalation enabled, the kill path behind it) stays armed
    # behind a green exit. Fail loudly and name the likely cause.
    echo 'reset-danger-latch.sh: located ZERO vendor state dirs to search.' >&2
    echo '  This reset cannot clear anything and will not report success-by-absence.' >&2
    echo '  Likely cause: the project root did not resolve (snapshot without env prefix, or a non-repo cwd).' >&2
    echo "  Re-run with: env CAWS_PROJECT_DIR=<absolute-project-root> bash '$SCRIPT_DIR/reset-danger-latch.sh' --session <id> --reason '<why this is safe>'" >&2
    exit 2
  fi
  _searched=""
  while IFS= read -r _vdir; do _searched="${_searched} $_vdir"; done < <(_caws_all_vendor_state_dirs)
  echo "No danger latches found to clear (searched vendor state dirs:${_searched})."
  exit 0
fi

# --- Clear latches + append audit records -----------------------------------
mkdir -p "$(dirname "$LOG_FILE")"
RESET_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
CLEARED=0
MISSING=0
WARNS_CLEARED=0

# Guard the array expansion: under `set -u`, "${arr[@]}" on an EMPTY array
# is an unbound-variable error in older bash. An --all reset that finds only
# warn markers (no latches) leaves LATCH_FILES empty — skip the loop then.
for LATCH in ${LATCH_FILES[@]+"${LATCH_FILES[@]}"}; do
  if [[ ! -f "$LATCH" ]]; then
    MISSING=$((MISSING + 1))
    continue
  fi

  ORIGINAL="$(cat "$LATCH" 2>/dev/null || printf '{}')"

  if command -v jq >/dev/null 2>&1; then
    jq -c -n \
      --arg ts "$RESET_TS" \
      --arg latch "$LATCH" \
      --arg mode "$MODE" \
      --arg reason "$REASON" \
      --argjson original "$ORIGINAL" \
      '{ts: $ts, action: "reset", mode: $mode, latch_file: $latch, reason: $reason, cleared_latch: $original}' \
      >> "$LOG_FILE"
  else
    printf '{"ts":"%s","action":"reset","mode":"%s","latch_file":"%s","reason":%s}\n' \
      "$RESET_TS" "$MODE" "$LATCH" "$(printf '%s' "$REASON" | sed 's/\\/\\\\/g; s/"/\\"/g; s/^/"/; s/$/"/')" \
      >> "$LOG_FILE"
  fi

  rm -f "$LATCH"
  CLEARED=$((CLEARED + 1))
  echo "Cleared danger latch: $LATCH"
done

# DANGER-LATCH-APPROVAL-AND-FEEDBACK-001: clear the warn markers too, so the
# next flagged ask in a post-reset session gets a fresh first-strike warning.
for WARN in ${WARN_FILES[@]+"${WARN_FILES[@]}"}; do
  if [[ -f "$WARN" ]]; then
    rm -f "$WARN"
    WARNS_CLEARED=$((WARNS_CLEARED + 1))
  fi
done

if [[ "$MODE" != "all" && "$CLEARED" -eq 0 && "$WARNS_CLEARED" -eq 0 && "$MISSING" -gt 0 ]]; then
  # CAWS-RESET-LATCH-CWD-DEPENDENT-LOOKUP-001 (A3) + MULTIVENDOR: name the
  # directories that were actually searched. "nothing to clear" alone is
  # indistinguishable from a completed reset, so an operator who searched the
  # WRONG tree reads a still-armed latch as a successful one and stays
  # hard-blocked with no signal. The absolute paths are the evidence that makes
  # the two cases tellable apart. Post-MULTIVENDOR this lists EVERY vendor state
  # dir searched, so an operator can see whether the writer's surface (e.g.
  # .zcode/) was among them.
  _searched2=""
  while IFS= read -r _vdir; do _searched2="${_searched2} $_vdir"; done < <(_caws_all_vendor_state_dirs)
  echo "No active latch or warn marker for the requested session (searched vendor state dirs:${_searched2})."
  exit 0
fi

echo "Reset $CLEARED danger latch(es) and $WARNS_CLEARED warn marker(s). Reason recorded to $LOG_FILE"
echo "Bash tool calls may now resume in this session (first-strike warning grace reset)."
