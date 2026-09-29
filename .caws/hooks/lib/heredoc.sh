#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 35,38
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
# heredoc.sh — neutralize heredoc BODIES before a guard reads command text.
#
# CAWS-GUARD-HEREDOC-BODY-READ-AS-COMMAND-01.
#
# Ported into the canonical pack from sterling's .caws/hooks/lib/heredoc.sh
# (GUARD-HEREDOC-BODY-READ-AS-COMMAND-001). The body below is kept byte-faithful
# to the sterling original so the two copies can be compared rather than
# re-derived. Canonical reaches this defect through the shell target extractor
# in bash-write-guard.sh; the Python classifier already carries its own
# `in_heredoc` state machine and is unaffected.
#
# Entry 35 records the extractor's narrowness ("a here-doc heredoc that writes a
# claimed path is not recognized"); this file closes the OTHER face of that
# narrowness — the extractor recognizing a body that is not a command at all.
#
# The PreToolUse guards adjudicate the literal text of a Bash command. A
# heredoc body is not command text — it is a payload the command carries — but
# it arrives inside the same string, so every verb matcher reads it as if it
# were a command. Observed live: writing a memory file whose CONTENT documented
# that force-pushing is forbidden was itself refused as a force push, and a
# test corpus containing `caws worktree create x --scope y` was refused as a
# sparse-checkout attempt. In both the command mutated a file and ran no git.
#
# WHY A SAFELIST, NOT A DENYLIST. The naive fix — blank every heredoc body —
# opens a real bypass, because a heredoc fed to an interpreter IS code:
#
#     bash <<'EOF'
#     git push --force
#     EOF
#
# Blanking that hides a genuine force push from every guard. So this blanks a
# body only when the introducing line's command is one this file KNOWS writes
# the payload to a file or to stdout (`cat`, `tee`). Anything else — a shell, an
# interpreter, an unrecognized command, a form this parser cannot read — keeps
# its body fully visible and is adjudicated exactly as it is today.
#
# The residue is therefore a FALSE POSITIVE (a file-writing heredoc through some
# command other than cat/tee still has its body scanned), never a hole. Widen
# CAWS_HEREDOC_FILE_SINKS only for a command that provably cannot execute its
# payload.

# Commands whose heredoc payload is written out, never executed.
CAWS_HEREDOC_FILE_SINKS="${CAWS_HEREDOC_FILE_SINKS:-cat tee}"

# Echo $1 with every safelisted heredoc BODY replaced by blank lines.
# Line count and the delimiter lines are preserved so a caller reporting a
# position still points at the right place.
caws_blank_heredoc_bodies() {
  local input="$1"
  local line rest delim="" stripped
  local in_body=0 allow_indent=0 sink

  # No heredoc at all: return the input untouched rather than round-tripping it
  # through the loop, which would normalize trailing newlines.
  if [[ "$input" != *"<<"* ]]; then
    printf '%s' "$input"
    return 0
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$in_body" == "1" ]]; then
      stripped="$line"
      # `<<-DELIM` permits the terminator to be indented with tabs.
      if [[ "$allow_indent" == "1" ]]; then
        stripped="${stripped#"${stripped%%[![:space:]]*}"}"
      fi
      if [[ "$stripped" == "$delim" ]]; then
        in_body=0
        delim=""
        allow_indent=0
        printf '%s\n' "$line"
      else
        printf '\n'
      fi
      continue
    fi

    printf '%s\n' "$line"

    [[ "$line" != *"<<"* ]] && continue

    # Only a safelisted sink may have its payload treated as data.
    sink=0
    for _cmd in $CAWS_HEREDOC_FILE_SINKS; do
      # Command position: start of line, or immediately after a pipe/semicolon/
      # and-or. Deliberately NOT a bare substring match — `bash -c "cat x"` must
      # not read as a `cat` invocation.
      if [[ "$line" =~ (^|[\|\;\&])[[:space:]]*${_cmd}([[:space:]]|$) ]]; then
        sink=1
        break
      fi
    done
    [[ "$sink" == "0" ]] && continue

    rest="${line#*<<}"
    # `<<<` is a here-STRING: one line, no body, nothing to blank.
    [[ "$rest" == "<"* ]] && continue

    allow_indent=0
    if [[ "$rest" == "-"* ]]; then
      allow_indent=1
      rest="${rest#-}"
    fi
    rest="${rest#"${rest%%[![:space:]]*}"}"
    # The delimiter ends at whitespace or at a following redirect.
    delim="${rest%%[[:space:]]*}"
    delim="${delim%%>*}"
    delim="${delim%\"}"; delim="${delim#\"}"
    delim="${delim%\'}"; delim="${delim#\'}"

    # An unparseable delimiter means we do not know where the body ends, so we
    # must not guess: leave the rest of the command visible.
    [[ -z "$delim" ]] && continue

    in_body=1
  done <<< "$input"
}
