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
# Shared hook input parser for CAWS hooks.
# Shared, provenance-only session-envelope writer. Cache failure cannot admit
# or refuse a tool call. Directory-relative I/O refuses symlink redirection;
# exclusive temporary files and atomic rename preserve complete JSON readers.

_caws_write_session_envelope() {
  local default_surface="${1:-claude-code}"
  local sid="${HOOK_SESSION_ID:-}" cwd="${HOOK_CWD:-$PWD}" common repo_root
  [[ -n "$sid" && "$sid" != unknown ]] || return 0
  common=$(cd "$cwd" 2>/dev/null && git rev-parse --git-common-dir 2>/dev/null) || return 0
  case "$common" in /*) ;; *) common="$cwd/$common" ;; esac
  repo_root=$(cd "$common/.." 2>/dev/null && pwd -P) || return 0
  [[ -d "$repo_root/.caws" ]] || return 0
  python3 - "$repo_root" "$sid" "${HOOK_EVENT_NAME:-unknown}" "${CAWS_PLATFORM_FLAG:-$default_surface}" <<'PY'
import datetime
import json
import os
import re
import sys
import uuid

root, sid, event, platform = sys.argv[1:]
fds = []
directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW

def directory(parent, name):
    try:
        os.mkdir(name, mode=0o700, dir_fd=parent)
    except FileExistsError:
        pass
    fd = os.open(name, directory_flags, dir_fd=parent)
    fds.append(fd)
    return fd

def atomic_json(parent, name, value):
    # The temp name must never begin with two dots: '..'-prefixed names are
    # flagged as traversal-looking by path sanitizers / sandbox proxies and
    # denied outright, which fail-opens every capture.
    temporary = 'tmp-' + name + '.' + uuid.uuid4().hex
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                 0o600, dir_fd=parent)
    try:
        with os.fdopen(fd, 'w') as output:
            json.dump(value, output)
            output.write('\n')
        os.replace(temporary, name, src_dir_fd=parent, dst_dir_fd=parent)
    finally:
        try:
            os.unlink(temporary, dir_fd=parent)
        except FileNotFoundError:
            pass

try:
    if not re.fullmatch(r'[A-Za-z0-9_.@:-]+', sid) or sid in {'.', '..'}:
        raise ValueError('unsafe session identity')
    root_fd = os.open(root, directory_flags)
    fds.append(root_fd)
    # .caws already exists; never create governance as a logging side effect.
    caws_fd = os.open('.caws', directory_flags, dir_fd=root_fd)
    fds.append(caws_fd)
    sessions_fd = directory(caws_fd, 'sessions')
    session_fd = directory(sessions_fd, sid)
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    created = now
    try:
        fd = os.open('.session-envelope.json', os.O_RDONLY | os.O_NOFOLLOW, dir_fd=session_fd)
        with os.fdopen(fd) as old:
            existing = json.load(old)
        if isinstance(existing, dict) and existing.get('session_id') == sid:
            value = existing.get('created_at')
            if isinstance(value, str) and value:
                created = value
    except (FileNotFoundError, ValueError):
        pass
    atomic_json(session_fd, '.session-envelope.json', {
        'session_id': sid, 'repo_root': root, 'created_at': created,
        'last_seen_at': now, 'hook_event': event, 'platform': platform})
    atomic_json(sessions_fd, '.caller-session.json', {
        'session_id': sid, 'repo_root': root, 'last_seen_at': now})
except (OSError, ValueError) as error:
    print('[caws session cache] capture skipped: ' + str(error), file=sys.stderr)
finally:
    for fd in reversed(fds):
        os.close(fd)
PY
  return 0
}

_write_durable_session_envelope() {
  _caws_write_session_envelope claude-code
}
