#!/usr/bin/env python3
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: (new — CAWS-HOOKS-GUARD-CONFIG-TIER2-01)
# edit_stance: YOURS TO EDIT. This is a starting hook lib, not a locked one —
#   shape it to your repo. The CAWS-MANAGED-HOOK marker above is only how
#   caws init finds libs it can offer updates for; it is NOT a keep-out sign.
"""Tier-2 guard configuration loader: the ONE parse per dispatch.

Emits `NAME=VALUE` lines on stdout for `lib/guard-config.sh` to export. Every
adopting guard then reads plain environment variables with `${!name}`
indirection and spawns nothing — bash 3.2 has no associative arrays, so
indirection is the only portable table, and macOS ships 3.2.

WHY ONE PARSE. A python3 spawn costs ~31ms on an M-series mac. The
`pre_tool_use` chain already carries a double-digit number of them, so one
more is in the noise; four adopting guards each parsing for themselves would
add ~124ms to every single tool call, which is not. That measurement is the
whole reason this file exists instead of a helper each guard calls.

FAIL-CLOSED IS CHEAP HERE. Every key is append-only, so applying ZERO entries
is always the STRICTER outcome. A malformed document therefore degrades toward
refusal, never toward permission, and this program can afford to be absolute
about it: one bad entry and nothing at all is emitted. `CAWS_GUARD_CONFIG_STATUS`
still reports `invalid` so the state is observable rather than silent, and
`caws doctor` names the offending key at error severity.

The validation below MIRRORS `src/init/repo-hook-policy.ts`. Two planes read
this document — the TypeScript CLI and this runtime — and they must not drift
into two different answers about the same file.
"""

import json
import os
import re
import sys

POLICY_RELPATH = os.path.join('.caws', 'hooks', 'hook-policy.json')
YAML_POLICY_RELPATH = os.path.join('.caws', 'policy.yaml')

# Mirrors GUARD_CONFIG_SURFACE. A closed set: an unrecognized guard name is
# refused rather than ignored, because a silently inert setting is
# indistinguishable from one that worked.
GUARD_SURFACE = {
    'write-allowlist.sh': {'prefixes': True, 'thresholds': {}},
    'scope-guard.sh': {'prefixes': True, 'thresholds': {}},
    'god-object-check.sh': {
        'prefixes': False,
        'thresholds': {'loc': (100, 100000), 'delta': (10, 100000)},
    },
    'loc-delta-check.sh': {'prefixes': False, 'thresholds': {'delta': (10, 100000)}},
}

# Mirrors GUARD_DECISION_KEYS (R2).
DECISION_KEYS = frozenset(
    [
        'decision',
        'allow',
        'deny',
        'ask',
        'policy',
        'outcome',
        'severity',
        'override',
        'enforcement',
        'exit_code',
        'verdict',
    ]
)

# Mirrors GUARD_RESERVED_PREFIXES (R3).
RESERVED_PREFIXES = (
    '.caws',
    '.git',
    '.github/workflows',
    '.claude',
    '.codex',
    '.qwen',
    '.zcode',
    '.opencode',
    '.kimi',
)

MAX_PREFIX_ENTRIES = 64
MAX_PREFIX_LENGTH = 200
MIN_REASON = 12

_MANGLE_RE = re.compile(r'[^A-Za-z0-9]')


def mangle(name):
    """`scope-guard.sh` -> `SCOPE_GUARD_SH`. Must match guard-config.sh."""
    return _MANGLE_RE.sub('_', name).upper()


def has_decision_key(value):
    """R2, recursively. The keys sit BELOW the guard name, so depth matters."""
    if isinstance(value, list):
        return any(has_decision_key(item) for item in value)
    if not isinstance(value, dict):
        return False
    for key, child in value.items():
        if isinstance(key, str) and key.lower() in DECISION_KEYS:
            return True
        if has_decision_key(child):
            return True
    return False


def invalid_prefix(prefix):
    """R3. Returns a reason or None. Mirrors invalidPrefix in the TS validator."""
    if not isinstance(prefix, str) or prefix == '':
        return 'prefix must be a non-empty string'
    if len(prefix) > MAX_PREFIX_LENGTH:
        return 'prefix too long'
    # The absolute ban is load-bearing: scope-guard.sh honors absolute
    # allow-prefixes BEFORE foreign-repo containment, so an absolute entry
    # would be a cross-repo containment hole.
    if prefix.startswith('/') or re.match(r'^[A-Za-z]:[\\/]', prefix):
        return 'prefix must be repo-relative'
    if '..' in prefix.split('/'):
        return 'prefix may not traverse with ..'
    if re.search(r'[*?\[\]]', prefix):
        return 'prefix may not contain glob metacharacters'
    if re.search(r'\s', prefix):
        return 'prefix may not contain whitespace'
    if '=' in prefix:
        return 'prefix may not contain ='
    if not prefix.endswith('/'):
        return 'prefix must end with /'
    head = prefix.rstrip('/')
    for reserved in RESERVED_PREFIXES:
        if head == reserved or head.startswith(reserved + '/'):
            return '%s is reserved' % reserved
    return None


def parse_guards(raw):
    """Validate the whole guards block. Returns (config, error).

    All-or-nothing: one bad entry yields ({}, reason). Applying the admissible
    subset would leave the repo running a configuration nobody authored.
    """
    if raw is None:
        return {}, None
    if not isinstance(raw, dict):
        return {}, 'guards must be an object'
    if has_decision_key(raw):
        return {}, 'guards may carry data only; a key names a decision'

    config = {}
    for guard_name, guard_raw in raw.items():
        schema = GUARD_SURFACE.get(guard_name)
        if schema is None:
            return {}, '%s is not a configurable guard' % guard_name
        if not isinstance(guard_raw, dict):
            return {}, '%s must be an object' % guard_name

        admitted = set()
        if schema['prefixes']:
            admitted.add('additional_allow_prefixes')
        if schema['thresholds']:
            admitted.add('thresholds')
        if set(guard_raw.keys()) - admitted:
            return {}, '%s admits only %s' % (guard_name, ', '.join(sorted(admitted)) or '(nothing)')

        prefixes = []
        raw_prefixes = guard_raw.get('additional_allow_prefixes')
        if raw_prefixes is not None:
            if not isinstance(raw_prefixes, list):
                return {}, '%s.additional_allow_prefixes must be an array' % guard_name
            if len(raw_prefixes) > MAX_PREFIX_ENTRIES:
                return {}, '%s.additional_allow_prefixes has too many entries' % guard_name
            seen = set()
            for entry in raw_prefixes:
                if not isinstance(entry, dict) or set(entry.keys()) != {'prefix', 'reason'}:
                    return {}, '%s: entry must have exactly prefix and reason' % guard_name
                bad = invalid_prefix(entry['prefix'])
                if bad is not None:
                    return {}, '%s: %s' % (guard_name, bad)
                if entry['prefix'] in seen:
                    return {}, '%s: duplicate prefix %s' % (guard_name, entry['prefix'])
                seen.add(entry['prefix'])
                reason = entry['reason']
                if not isinstance(reason, str) or len(reason.strip()) < MIN_REASON:
                    return {}, '%s: reason must be at least %d characters' % (guard_name, MIN_REASON)
                prefixes.append(entry['prefix'])

        thresholds = {}
        raw_thresholds = guard_raw.get('thresholds')
        if raw_thresholds is not None:
            if not isinstance(raw_thresholds, dict):
                return {}, '%s.thresholds must be an object' % guard_name
            for name, value in raw_thresholds.items():
                clamp = schema['thresholds'].get(name)
                if clamp is None:
                    return {}, '%s.thresholds.%s is not read by this guard' % (guard_name, name)
                # bool is a subclass of int in python; True must not pass here.
                if isinstance(value, bool) or not isinstance(value, int):
                    return {}, '%s.thresholds.%s must be an integer' % (guard_name, name)
                if value < clamp[0] or value > clamp[1]:
                    return {}, '%s.thresholds.%s outside [%d, %d]' % (
                        guard_name,
                        name,
                        clamp[0],
                        clamp[1],
                    )
                thresholds[name] = value

        config[guard_name] = {'prefixes': prefixes, 'thresholds': thresholds}

    return config, None


def read_non_governed_zones(project_dir):
    """`policy.non_governed_zones`, with the EXACT normalization scope-guard.sh applied.

    The key keeps its kernel meaning and its semantics; only the transport
    moves here, so that one parse serves both sources. Quote-stripping, the
    `/**` and `/*` suffix trim and the trailing-slash coercion are reproduced
    verbatim from the awk+bash block this replaces — a transport swap that
    also changed normalization would be a silent scope change.
    """
    path = os.path.join(project_dir, YAML_POLICY_RELPATH)
    zones = []
    try:
        with open(path, 'r') as handle:
            lines = handle.read().split('\n')
    except (IOError, OSError):
        return zones

    in_zones = False
    for line in lines:
        if re.match(r'^non_governed_zones:[ \t]*$', line):
            in_zones = True
            continue
        if in_zones and re.match(r'^[^ \t#-]', line):
            in_zones = False
        if not in_zones:
            continue
        match = re.match(r'^[ \t]+-[ \t]+(.*)$', line)
        if match is None:
            continue
        zone = re.sub(r'[ \t]+#.*$', '', match.group(1))
        if zone == '':
            continue
        for quote in ('"', "'"):
            if zone.endswith(quote):
                zone = zone[:-1]
            if zone.startswith(quote):
                zone = zone[1:]
        if zone.endswith('/**'):
            zone = zone[:-3]
        elif zone.endswith('/*'):
            zone = zone[:-2]
        if zone == '':
            continue
        if not zone.endswith('/'):
            zone = zone + '/'
        zones.append(zone)
    return zones


def emit(name, value):
    # A newline in a value would forge a second assignment line downstream.
    # Nothing that reaches here can contain one, so this is a tripwire rather
    # than a filter: if it ever fires, the emitter and the grammar disagree.
    if '\n' in str(value):
        return
    sys.stdout.write('%s=%s\n' % (name, value))


def main(argv):
    project_dir = argv[1] if len(argv) > 1 else os.environ.get('CAWS_PROJECT_DIR', '.')

    # Zones come from policy.yaml and are INDEPENDENT of hook-policy.json: a
    # repo that never adopted the hook policy still has its non-governed zones
    # honored, exactly as before this loader existed.
    zones = read_non_governed_zones(project_dir)
    emit('CAWS_GUARD_ZONE_COUNT', len(zones))
    for index, zone in enumerate(zones):
        emit('CAWS_GUARD_ZONE_%d' % index, zone)

    policy_path = os.path.join(project_dir, POLICY_RELPATH)
    try:
        with open(policy_path, 'r') as handle:
            text = handle.read()
    except (IOError, OSError):
        emit('CAWS_GUARD_CONFIG_STATUS', 'absent')
        return 0

    try:
        document = json.loads(text)
    except ValueError:
        emit('CAWS_GUARD_CONFIG_STATUS', 'invalid')
        return 0
    if not isinstance(document, dict):
        emit('CAWS_GUARD_CONFIG_STATUS', 'invalid')
        return 0

    config, error = parse_guards(document.get('guards'))
    if error is not None:
        emit('CAWS_GUARD_CONFIG_STATUS', 'invalid')
        return 0

    emit('CAWS_GUARD_CONFIG_STATUS', 'ok')
    for guard_name, entry in config.items():
        key = mangle(guard_name)
        emit('CAWS_GUARD_PREFIX_COUNT_%s' % key, len(entry['prefixes']))
        for index, prefix in enumerate(entry['prefixes']):
            emit('CAWS_GUARD_PREFIX_%s_%d' % (key, index), prefix)
        for name, value in entry['thresholds'].items():
            emit('CAWS_GUARD_THRESHOLD_%s_%s' % (key, mangle(name)), value)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
