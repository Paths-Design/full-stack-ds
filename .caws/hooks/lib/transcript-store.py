#!/usr/bin/env python3
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
"""Read an OpenCode/ZCode session in one SQLite snapshot; publish JSONL atomically.

No schema migration, source write, session fallback, or mtime cache. Empty
sessions replace the projection with empty bytes, so old contents cannot be
misreported as a new hit. The receipt names source rows and projected bytes.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys
import uuid

from harness_opencode import INPUT_MAPPERS, TOOL_NAME_MAP


def timestamp(value):
    if not isinstance(value, (int, float)):
        return None
    return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat()


def reconstruct(database, session, surface):
    connection = sqlite3.connect(Path(database).resolve().as_uri() + '?mode=ro', uri=True, timeout=1)
    connection.row_factory = sqlite3.Row
    rows = []
    events = []
    try:
        connection.execute('PRAGMA query_only=ON')
        connection.execute('BEGIN')
        records = connection.execute('''
          SELECT m.id AS message_id, m.data AS message_data,
                 p.id AS part_id, p.data AS part_data, p.time_created AS part_time
          FROM message m JOIN part p ON p.message_id=m.id
          WHERE m.session_id=? ORDER BY m.time_created,m.id,p.id
        ''', (session,))
        user_message = None
        for row in records:
            message = json.loads(row['message_data'])
            part = json.loads(row['part_data'])
            if not isinstance(message, dict) or not isinstance(part, dict):
                raise ValueError('message and part data must be objects')
            rows.append({'message_id': row['message_id'], 'part_id': row['part_id']})
            ts = timestamp(row['part_time'])
            role, kind = message.get('role'), part.get('type')
            if kind == 'text' and role in ('user', 'assistant'):
                text = part.get('text')
                if not isinstance(text, str):
                    raise ValueError('text part is not a string')
                if role == 'user' and user_message == row['message_id']:
                    events[-1]['message']['content'][0]['text'] += '\n\n' + text
                else:
                    events.append({'type': role, 'timestamp': ts,
                                   'message': {'content': [{'type': 'text', 'text': text}]}})
                user_message = row['message_id'] if role == 'user' else None
            elif kind == 'tool':
                user_message = None
                state = part.get('state')
                if not isinstance(state, dict):
                    raise ValueError('tool state is not an object')
                name, call_id = part.get('tool', ''), part.get('callID', '')
                args = state.get('input', {})
                if not isinstance(args, dict):
                    raise ValueError('tool input is not an object')
                if surface == 'opencode':
                    args = INPUT_MAPPERS.get(name, lambda item: item)(args)
                    name = TOOL_NAME_MAP.get(name, name)
                events.append({'type': 'assistant', 'timestamp': ts, 'message': {'content': [
                    {'type': 'tool_use', 'name': name, 'id': call_id, 'input': args}]}})
                if state.get('status') in ('completed', 'error'):
                    events.append({'type': 'user', 'timestamp': ts, 'message': {'content': [
                        {'type': 'tool_result', 'tool_use_id': call_id,
                         'is_error': state['status'] == 'error', 'content': state.get('output', '')}]}})
            # Internal reasoning and bookkeeping do not become visible prose.
        return events, rows
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--surface', choices=['opencode', 'zcode'], required=True)
    parser.add_argument('--database', type=Path, required=True)
    parser.add_argument('--session', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    receipt = {'schema': 'caws.transcript_projection.v1', 'surface': args.surface,
               'database': str(args.database), 'session_id': args.session,
               'output': str(args.output), 'source_mode': 'sqlite_read_transaction', 'authority': 'none'}
    try:
        events, rows = reconstruct(args.database, args.session, args.surface)
        data = ''.join(json.dumps(event, ensure_ascii=False) + '\n' for event in events).encode()
        fd = os.open(args.output.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        temporary = args.output.name + '.tmp.' + uuid.uuid4().hex
        try:
            file_fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=fd)
            with os.fdopen(file_fd, 'wb') as target:
                target.write(data)
            os.replace(temporary, args.output.name, src_dir_fd=fd, dst_dir_fd=fd)
        finally:
            try:
                os.unlink(temporary, dir_fd=fd)
            except FileNotFoundError:
                pass
            os.close(fd)
        receipt.update(status='projected' if events else 'empty', source_rows=rows,
                       events=len(events), sha256=hashlib.sha256(data).hexdigest())
        print(json.dumps(receipt))
        return 0
    except (OSError, sqlite3.Error, ValueError) as error:
        receipt.update(status='error', error=f'{type(error).__name__}: {error}')
        print(json.dumps(receipt))
        print(json.dumps(receipt), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
