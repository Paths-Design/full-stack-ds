#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 41
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
# Worktree Isolation Pin Guard (Entry 41, CAWS-DEFECT-WORKTREE-ISOLATION-PIN-
# RELEASE-01). A session whose project root lives inside .caws/worktrees/<name>
# is PINNED to that worktree: its commands must run there. Unlike the
# consumer-grown static pin that bricked sessions after they merged their own
# worktree, this pin has all three affordances:
#
#   RELEASE  — when the pinned directory no longer exists (merge/destroy
#              deleted it), the pin releases for the rest of the session with
#              a loud advisory. The bricked-session class (every later Bash
#              call refused, including pwd and `caws worktree create`, because
#              the remediation directory is gone) is impossible.
#   RE-POINT — `caws worktree create|ensure` is admitted even from an outside
#              working directory, so the next lane can be born.
#   EXIT     — `caws worktree merge|destroy` is admitted (quiet-merge.sh
#              reroots those commands to the repo root for CWD safety), which
#              is the sanctioned way the pin ends.
#
# The pin is DERIVED statelessly from CAWS_PROJECT_DIR on every call — no
# state file, no latch, no strike ramp — so it cannot outlive the directory
# it names. A pinned session's git operations must target its own worktree:
# `git -C <dir>` redirects and leading `cd <dir> && ... git ...` chains are
# refused when <dir> resolves to the canonical checkout or another worktree;
# git ops redirected to scratch dirs outside the repository stay permitted.
#
# OPT-IN: this guard installs with the shared pack but is NOT wired into the
# default dispatcher HANDLERS (it is a broad session-level cwd enforcement;
# the pack's default-wired guards are narrow). Enable by adding
# worktree-pin-guard.sh to the HANDLERS array in dispatch/pre_tool_use.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
# Fail SOFT but LOUD: this is an opt-in isolation guard, not a load-bearing
# enforcement core. A missing parse-input.sh (or a malformed payload) must
# never turn a broken env into a hard block of every Bash call.
if ! { [[ -f "$SCRIPT_DIR/lib/parse-input.sh" ]] && source "$SCRIPT_DIR/lib/parse-input.sh"; }; then
  echo "[worktree-pin-guard] CAWS hook infrastructure incomplete: lib/parse-input.sh is missing or did not load — worktree-pin isolation is skipped for this call. Restore the shared hook libs with: caws init --adopt" >&2
  exit 0
fi
# shellcheck source=lib/agent-surface.sh
[[ -f "$SCRIPT_DIR/lib/agent-surface.sh" ]] && source "$SCRIPT_DIR/lib/agent-surface.sh"
parse_hook_input || exit 0

TOOL_NAME="$HOOK_TOOL_NAME"
COMMAND="$HOOK_COMMAND"

# Self-filter: Bash only.
if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
  exit 0
fi

# --- pin derivation ---------------------------------------------------------
# The vendor wiring injects CAWS_PROJECT_DIR as the SESSION project root (the
# worktree for a session started there). A path containing the
# /.caws/worktrees/<name> segment means the session is pinned to <name>.
# No git resolution is needed: the pin is a pure path-segment fact, and it
# must stay derivable even after the directory is gone (the release check
# below depends on that).
SESSION_ROOT="${CAWS_PROJECT_DIR:-}"
if [[ -z "$SESSION_ROOT" || "$SESSION_ROOT" == "." ]]; then
  exit 0
fi

case "$SESSION_ROOT" in
  *"/.caws/worktrees/"*) ;;
  *) exit 0 ;;   # not inside a worktree -> not pinned
esac

CANONICAL="${SESSION_ROOT%%/.caws/worktrees/*}"
PIN_NAME="${SESSION_ROOT#*/.caws/worktrees/}"
PIN_NAME="${PIN_NAME%%/*}"
PIN_DIR="$CANONICAL/.caws/worktrees/$PIN_NAME"

if [[ -z "$PIN_NAME" || -z "$CANONICAL" ]]; then
  exit 0
fi

# --- release affordance (the bricked-session fix) ---------------------------
# The pinned directory no longer exists: the isolation boundary is gone. Keep
# refusing and the session can never satisfy the guard again — the exact
# defect. Release loudly instead, once per call.
if [[ ! -d "$PIN_DIR" ]]; then
  echo "[worktree-pin-guard] worktree '$PIN_NAME' no longer exists: RELEASING this session's isolation pin." >&2
  echo "  Pinned to $PIN_DIR, which was merged or destroyed, so the isolation boundary is gone." >&2
  echo "  Continue from wherever the harness lands. To re-point, create a fresh lane:" >&2
  echo "    caws worktree create <name> --spec <id>   (then start the next slice's session inside it)" >&2
  exit 0
fi

emit_block() {
  local why="$1"
  echo "[worktree-pin-guard] BLOCKED: $why" >&2
  echo "  This session is isolated in the worktree $PIN_DIR." >&2
  echo "  A worktree-isolated session's commands must run inside its worktree." >&2
  echo "  Re-run the command from $PIN_DIR." >&2
  echo "  Sanctioned exits: caws worktree merge|destroy <name> (end the isolation); caws worktree create|ensure (start a fresh lane)." >&2
  echo "  Do NOT edit ${CAWS_HOOKS_DIR:-.caws/hooks}/ or guard state to bypass this." >&2
  exit 2
}

# classify <abs-dir>: own | shared-checkout | other-worktree | outside-repo
classify_dir() {
  local d="$1"
  local rel
  if [[ "$d" == "$CANONICAL" || "$d" == "$CANONICAL"/* ]]; then
    rel="${d#"$CANONICAL"/}"
    if [[ "$rel" == ".caws/worktrees/"* ]]; then
      local other="${rel#.caws/worktrees/}"
      other="${other%%/*}"
      if [[ "$other" == "$PIN_NAME" ]]; then
        printf 'own\n'
      else
        printf 'other-worktree\n'
      fi
    else
      printf 'shared-checkout\n'
    fi
  else
    printf 'outside-repo\n'
  fi
}

abspath_of() {
  local p="$1"
  case "$p" in
    /*) printf '%s\n' "$p" ;;
    *)  printf '%s/%s\n' "${HOOK_CWD:-$PIN_DIR}" "$p" ;;
  esac
}

# --- cwd containment --------------------------------------------------------
CWD="${HOOK_CWD:-$SESSION_ROOT}"

if [[ "$CWD" != "$PIN_DIR" && "$CWD" != "$PIN_DIR"/* ]]; then
  # Effective working directory resolves outside the pinned worktree. The
  # sanctioned lifecycle verbs stay reachable; everything else is refused.
  if echo "$COMMAND" | grep -qE 'caws[[:space:]]+worktree[[:space:]]+(merge|destroy|create|ensure)\b'; then
    exit 0
  fi
  emit_block "this command's working directory resolves outside the pinned worktree ($CWD)."
fi

# --- git-redirect containment (cwd inside the pin) --------------------------
# `git -C <dir>` anywhere in the command, and a leading `cd <dir>` followed by
# a git invocation, must not redirect git to the canonical checkout or to
# another worktree. Scratch dirs outside the repository are permitted.
_has_git_token() {
  echo "$COMMAND" | grep -qE '(^|[[:space:];&|])git([[:space:]]|$)'
}

if _has_git_token; then
  # First `git` token onward: extract every `-C <dir>` / `-C<dir>` argument.
  _after_git="$(echo "$COMMAND" | grep -oE '(^|[[:space:];&|])git([[:space:]]|$).*' | head -1 | sed -E 's/^[[:space:];&|]*git[[:space:]]*//' || true)"
  if [[ -n "$_after_git" ]]; then
    while IFS= read -r cdir; do
      [[ -z "$cdir" ]] && continue
      case "$(classify_dir "$(abspath_of "$cdir")")" in
        shared-checkout|other-worktree)
          emit_block "git -C redirects this git operation to '$cdir', outside the pinned worktree." ;;
      esac
    done < <(echo "$_after_git" | grep -oE -- '-C[[:space:]]*[^[:space:]]+' | sed -E 's/^-C[[:space:]]*//' || true)
  fi

  # Leading `cd <dir>` chains: block when the FIRST cd target lands in the
  # canonical checkout or another worktree and a git token follows.
  if echo "$COMMAND" | grep -qE '(^|[[:space:];&|])cd[[:space:]]+[^[:space:];&|]+'; then
    _first_cd="$(echo "$COMMAND" | grep -oE '(^|[[:space:];&|])cd[[:space:]]+[^[:space:];&|]+' | head -1 | sed -E 's/^[[:space:];&|]*cd[[:space:]]+//' || true)"
    if [[ -n "$_first_cd" ]]; then
      case "$(classify_dir "$(abspath_of "$_first_cd")")" in
        shared-checkout|other-worktree)
          emit_block "cd '$_first_cd' moves the git operation outside the pinned worktree." ;;
      esac
    fi
  fi
fi

exit 0
