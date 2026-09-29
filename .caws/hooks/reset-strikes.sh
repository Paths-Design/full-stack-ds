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
# reset-strikes.sh — manual reset for CAWS guard strike counters.
#
# Strikes are per-(session, guard) counters that accumulate when an agent edits
# files outside its declared CAWS scope (see guard-strikes.sh). They never
# auto-decrement, so once an agent's scope.in is legitimately corrected, strikes
# from before the correction can permanently corner the session at strike 3+
# (hard block). This tool is the user-in-the-loop escape hatch: review state,
# decide strikes are stale, reset them. Every reset is logged to
# ${CAWS_VENDOR_DIR}/logs/strike-resets.log for audit.
#
# @author reset-strikes (Sterling / CAWS)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/agent-surface.sh
# Provides CAWS_VENDOR_DIR for log and search paths.
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true

PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_DIR/${CAWS_VENDOR_DIR}/logs/strike-resets.log"

MODE="list"
SESSION=""
GUARD=""
WORKTREE=""
OLDER_THAN_DAYS=7
DRY_RUN=0
CONFIRM=0

usage() {
  cat <<EOF
reset-strikes.sh — inspect and reset CAWS guard strike counters.

Default (no args): list current strike state across all sessions/worktrees.

Modes (mutually exclusive):
  --session <uuid>       Reset strikes for one session
  --worktree <name>      Reset strikes stored inside one worktree's tmp/
  --current              Reset the most-recently-modified strike file
  --all                  Reset every strike file (requires --confirm)
  --stale                Delete strike files older than N days (see --older-than)

Modifiers:
  --guard <name>         Restrict reset to one guard key (e.g. scope_guard)
                         Used with --session / --worktree / --current.
  --older-than <days>    For --stale. Default: 7.
  --dry-run              Print what would change; don't modify files.
  --confirm              Required for --all.
  -h, --help             Show this help.

Examples:
  $(basename "$0")                                  # list state only
  $(basename "$0") --current                        # reset most-recent session
  $(basename "$0") --session abc --guard scope_guard
  $(basename "$0") --stale --older-than 14 --dry-run
  $(basename "$0") --all --confirm

Log of resets: $LOG_FILE
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --session)    MODE="session";  SESSION="$2"; shift 2 ;;
    --worktree)   MODE="worktree"; WORKTREE="$2"; shift 2 ;;
    --current)    MODE="current"; shift ;;
    --all)        MODE="all"; shift ;;
    --stale)      MODE="stale"; shift ;;
    --guard)      GUARD="$2"; shift 2 ;;
    --older-than) OLDER_THAN_DAYS="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=1; shift ;;
    --confirm)    CONFIRM=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage >&2; exit 1 ;;
  esac
done

mkdir -p "$(dirname "$LOG_FILE")"

# Collect strike state (CAWS-DESIGN-GLOBAL-IDENTITY-HOME-001 A6):
#   - the SESSION-GLOBAL store (~/.caws/state/sessions/<sid>/strikes.json) is
#     the live source — resets target it;
#   - legacy repo-local files (vendor logs, worktree gitdirs, pre-relocation
#     in-tree) are collected READ-ONLY for listing continuity; guard-strikes
#     never writes them again.
collect_strike_files() {
  {
    find "${HOME:-/tmp}/.caws/state/sessions" -maxdepth 2 -name 'strikes.json' 2>/dev/null || true
    find "$PROJECT_DIR/${CAWS_VENDOR_DIR}/logs" -maxdepth 1 -name 'guard-strikes-*.json' 2>/dev/null || true
    find "$PROJECT_DIR/.git/worktrees" -maxdepth 3 -name 'guard-strikes-*.json' 2>/dev/null || true
    find "$PROJECT_DIR/.caws/worktrees" -maxdepth 3 -name 'guard-strikes-*.json' 2>/dev/null || true
  } | sort -u
}

# macOS and Linux disagree on stat flags. Try BSD first, fall back to GNU.
file_mtime() {
  stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$1" 2>/dev/null \
    || stat -c '%y' "$1" 2>/dev/null | cut -d'.' -f1 \
    || echo "unknown"
}

# The two strike-file shapes encode the session id in different places:
#   live   $HOME/.caws/state/sessions/<sid>/strikes.json   -> the DIRECTORY
#   legacy <repo>/<vendor>/logs/guard-strikes-<sid>.json   -> the FILENAME
# Parsing the filename alone yields the literal "strikes" for every live file,
# which both mislabelled the listing and made --session unable to match the
# store this script calls the live source.
sid_for_file() {
  local f="$1" base
  base=$(basename "$f")
  if [[ "$base" == "strikes.json" ]]; then
    basename "$(dirname "$f")"
  else
    printf '%s' "$base" | sed 's/^guard-strikes-//; s/\.json$//'
  fi
}

# Every session id that currently has strike state, newline-separated.
known_sessions() {
  local f
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    sid_for_file "$f"
  done <<< "$(collect_strike_files)" | sort -u
}

describe_file() {
  local f="$1"
  local mtime sid content
  mtime=$(file_mtime "$f")
  sid=$(sid_for_file "$f")
  content=$(cat "$f" 2>/dev/null || echo '{}')
  printf '  %s  session=%s\n    strikes=%s\n    path=%s\n\n' \
    "$mtime" "$sid" "$content" "$f"
}

log_reset() {
  local action="$1" target="$2" before="$3"
  # Flatten the JSON payload to one line so the log stays greppable.
  local before_flat
  before_flat=$(printf '%s' "$before" | jq -c . 2>/dev/null || printf '%s' "$before" | tr -d '\n')
  printf '%s  action=%s  guard=%s  dry_run=%s  before=%s  target=%s\n' \
    "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$action" "${GUARD:-*}" "$DRY_RUN" "$before_flat" "$target" \
    >> "$LOG_FILE"
}

reset_file() {
  local f="$1"
  [[ -z "$f" ]] && return 0
  [[ ! -f "$f" ]] && { echo "skip (not a file): $f" >&2; return 0; }

  local before
  before=$(cat "$f" 2>/dev/null || echo '{}')

  if [[ -z "$GUARD" ]]; then
    if [[ "$DRY_RUN" == 1 ]]; then
      echo "[dry-run] would delete $f (was: $before)"
      log_reset "dry-run-delete" "$f" "$before"
    else
      rm -f "$f"
      log_reset "delete" "$f" "$before"
      echo "deleted: $f"
    fi
  else
    if [[ "$DRY_RUN" == 1 ]]; then
      echo "[dry-run] would clear guard '$GUARD' in $f (was: $before)"
      log_reset "dry-run-clear" "$f" "$before"
    else
      jq --arg g "$GUARD" 'del(.[$g])' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
      # If no guard keys remain, remove the file entirely.
      if [[ "$(jq 'length' "$f" 2>/dev/null || echo 1)" == "0" ]]; then
        rm -f "$f"
        echo "cleared guard '$GUARD' and removed empty file: $f"
      else
        echo "cleared guard '$GUARD' in: $f"
      fi
      log_reset "clear-guard" "$f" "$before"
    fi
  fi
}

case "$MODE" in
  list)
    files=$(collect_strike_files)
    if [[ -z "$files" ]]; then
      echo "No strike files found."
      exit 0
    fi
    echo "Current strike state:"
    echo
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      describe_file "$f"
    done <<< "$files"
    echo "To reset: use --current, --session <uuid>, --worktree <name>, --stale, or --all --confirm."
    ;;

  current)
    files=$(collect_strike_files)
    # Most-recently-modified first. Handles spaces in paths defensively.
    target=""
    latest=0
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      mt=$(stat -f '%m' "$f" 2>/dev/null || stat -c '%Y' "$f" 2>/dev/null || echo 0)
      if (( mt > latest )); then
        latest=$mt
        target="$f"
      fi
    done <<< "$files"
    [[ -z "$target" ]] && { echo "No strike files found." >&2; exit 1; }
    echo "Most-recently-modified: $target"
    reset_file "$target"
    ;;

  session)
    [[ -z "$SESSION" ]] && { echo "--session requires a uuid" >&2; exit 1; }
    # Match on the DERIVED session id, not on a filename pattern — the live
    # session-global store carries the sid in its parent directory and can
    # never match a guard-strikes-<sid>.json glob.
    matches=""
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      if [[ "$(sid_for_file "$f")" == "$SESSION" ]]; then
        matches+="$f"$'\n'
      fi
    done <<< "$(collect_strike_files)"
    matches="${matches%$'\n'}"
    if [[ -z "$matches" ]]; then
      echo "No strike file found for session: $SESSION" >&2
      # A refusal that does not say what IS available leaves the operator
      # guessing at a uuid — the failure mode this whole script exists to end.
      known=$(known_sessions)
      if [[ -n "$known" ]]; then
        echo "Sessions with strike state:" >&2
        while IFS= read -r s; do [[ -n "$s" ]] && echo "  $s" >&2; done <<< "$known"
        echo "Or use --current to reset the most-recently-modified file." >&2
      else
        echo "No strike files exist in this project or under \${HOME}/.caws/state/sessions." >&2
      fi
      exit 1
    fi
    while IFS= read -r f; do reset_file "$f"; done <<< "$matches"
    ;;

  worktree)
    [[ -z "$WORKTREE" ]] && { echo "--worktree requires a name" >&2; exit 1; }
    wt_dir="$PROJECT_DIR/.caws/worktrees/$WORKTREE/tmp"
    if [[ ! -d "$wt_dir" ]]; then
      echo "Worktree tmp dir not found: $wt_dir" >&2
      exit 1
    fi
    matches=$(find "$wt_dir" -maxdepth 1 -name 'guard-strikes-*.json' 2>/dev/null || true)
    [[ -z "$matches" ]] && { echo "No strike files in worktree: $WORKTREE" >&2; exit 1; }
    while IFS= read -r f; do reset_file "$f"; done <<< "$matches"
    ;;

  all)
    if [[ "$CONFIRM" != 1 ]]; then
      echo "--all requires --confirm (safety interlock)." >&2
      exit 1
    fi
    files=$(collect_strike_files)
    [[ -z "$files" ]] && { echo "No strike files found."; exit 0; }
    while IFS= read -r f; do reset_file "$f"; done <<< "$files"
    ;;

  stale)
    files=$(find \
              "$PROJECT_DIR/${CAWS_VENDOR_DIR}/logs" \
              "$PROJECT_DIR/.caws/worktrees" \
              -name 'guard-strikes-*.json' -mtime "+$OLDER_THAN_DAYS" 2>/dev/null || true)
    if [[ -z "$files" ]]; then
      echo "No strike files older than $OLDER_THAN_DAYS days."
      exit 0
    fi
    echo "Pruning strike files older than $OLDER_THAN_DAYS days:"
    while IFS= read -r f; do reset_file "$f"; done <<< "$files"
    ;;
esac
