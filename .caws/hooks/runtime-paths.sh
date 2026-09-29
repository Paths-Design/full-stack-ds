#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,16
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# Shared runtime bootstrap for CAWS hook scripts.
# Ensures common developer-installed binaries remain available when hooks run
# under a reduced PATH that does not load interactive shell init.
#
# Growing this hook for your repo's runtime is welcome (that is the point — see
# the edit_stance header). What is NOT: patching PATH handling here as an
# unblock SHORTCUT when a hook failed. That weakens the guard instead of fixing
# the cause. Fix the real issue in the worktree/spec setup first; change the
# hook runtime deliberately, not to dodge a block.

ensure_hook_runtime_path() {
  if command -v node >/dev/null 2>&1; then
    return 0
  fi

  local latest_node_bin=""

  # CAWS-HOOKPACK-HOME-UNSET-ROOT-AUTHORITY-ALIAS-001: no HOME means nowhere
  # to look for an nvm install, not a namespace at "/.nvm/versions/node".
  if [[ -n "${HOME:-}" ]] && [[ -d "${HOME}/.nvm/versions/node" ]]; then
    latest_node_bin=$(
      find "${HOME}/.nvm/versions/node" -maxdepth 4 -type f -name node 2>/dev/null \
        | sed 's#/node$##' \
        | sort -V \
        | tail -n 1
    )
  fi

  if [[ -n "$latest_node_bin" ]] && [[ -d "$latest_node_bin" ]]; then
    PATH="$latest_node_bin:$PATH"
  fi

  for candidate in /opt/homebrew/bin /usr/local/bin /usr/bin /bin; do
    if [[ -d "$candidate" ]] && [[ ":$PATH:" != *":$candidate:"* ]]; then
      PATH="$candidate:$PATH"
    fi
  done

  export PATH
}

read_hook_input_json() {
  python3 -c '
import json
import sys

def emit_empty() -> None:
    sys.stdout.write("{}")

try:
    raw = sys.stdin.buffer.read()
    if not raw:
        emit_empty()
        raise SystemExit(0)

    def strip_disallowed_controls(text: str) -> str:
        return "".join(
            ch
            for ch in text
            if ch in ("\t", "\n", "\r") or ord(ch) >= 0x20
        )

    text = raw.decode("utf-8", "surrogateescape")
    sanitized = strip_disallowed_controls(text.replace("\x00", ""))

    parse_errors = []
    for candidate in (text, sanitized):
        try:
            payload = json.loads(candidate, strict=False)
        except Exception as exc:
            parse_errors.append(str(exc).splitlines()[0])
            continue
        sys.stdout.write(json.dumps(payload))
        raise SystemExit(0)

    # Never echo malformed raw input back to jq callers. Hook scripts should
    # fail open on unreadable input rather than turning parse noise into
    # blocking PreToolUse/PostToolUse errors. The fail-open is now observable:
    # agents see that the hook parser, not the guarded command, was the problem.
    reason = parse_errors[0] if parse_errors else "unknown parse error"
    sys.stderr.write(
        "[CAWS hook parse] malformed hook input JSON; failing open with an "
        "empty payload. Expected vendor hook payload JSON on stdin. "
        f"Parser: {reason}\\n"
    )
    emit_empty()
except SystemExit:
    raise
except Exception as exc:
    sys.stderr.write(
        "[CAWS hook parse] hook input parser failed internally; failing open "
        f"with an empty payload. Parser: {str(exc).splitlines()[0]}\\n"
    )
    emit_empty()
'
}

ensure_hook_runtime_path
