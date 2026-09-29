#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: (new — CAWS-HOOKS-GUARD-CONFIG-TIER2-01)
# edit_stance: YOURS TO EDIT. This is a starting hook lib, not a locked one —
#   shape it to your repo. The CAWS-MANAGED-HOOK marker above is only how
#   caws init finds libs it can offer updates for; it is NOT a keep-out sign.
#
# Tier-2 guard configuration: the ACCESSOR half.
#
# `lib/guard-config.py` parses `.caws/hooks/hook-policy.json` and
# `.caws/policy.yaml` exactly once per dispatch and prints `NAME=VALUE` lines.
# This file exports them and hands adopting guards plain-bash readers that
# spawn NOTHING. Four guards each shelling out would add ~124ms to every tool
# call against a measured ~31ms per python3 start; one shared parse does not.
#
# bash 3.2 (what macOS ships) has NO associative arrays, so the table is
# carried as individually-named variables read back through `${!name}`
# indirection. That is not a style choice — it is the only portable table.
#
# FAIL-SOFT IS BANNED HERE, FAIL-SHIPPED IS NOT. A guard that cannot load its
# config must keep enforcing its SHIPPED table; it must never conclude
# "no config, therefore allow". Because every key is append-only, falling back
# to the shipped table is strictly the stricter behavior, so the degraded path
# and the safe path are the same path.

# Idempotent source: safe to source multiple times.
if [[ -n "${_CAWS_GUARD_CONFIG_SH_SOURCED:-}" ]]; then
  return 0 2>/dev/null || true
fi
_CAWS_GUARD_CONFIG_SH_SOURCED=1

# The parser is this file's SIBLING, so resolve it from this file's own
# location. HOOKS_DIR is set by run-handlers.sh and is therefore present only
# when a guard runs inside the chain; a guard invoked directly — by bats, by a
# harness that calls one hook, by a human debugging — would otherwise resolve
# "${HOOKS_DIR:-}/lib/guard-config.py" to "/lib/guard-config.py", find nothing,
# and report `unavailable` while the document sat right there. That failure is
# invisible in the chain and total outside it, which is the worst combination:
# it looks fine wherever anyone would notice.
_CAWS_GUARD_CONFIG_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

_CAWS_GUARD_LOWER='abcdefghijklmnopqrstuvwxyz'
_CAWS_GUARD_UPPER='ABCDEFGHIJKLMNOPQRSTUVWXYZ'

# `scope-guard.sh` -> `SCOPE_GUARD_SH`. MUST match mangle() in guard-config.py;
# a divergence here is silent (every lookup misses and every guard quietly
# reverts to its shipped table), so the bats parity arm asserts both agree.
#
# Uppercasing is done by index lookup rather than `tr` because this runs on
# every accessor call: `${var^^}` is bash 4 and macOS ships 3.2, and a `tr`
# subshell here would reintroduce per-call spawns — the exact cost the single
# parse exists to avoid.
caws_guard_mangle() {
  local raw="$1"
  local out=""
  local i ch head
  for ((i = 0; i < ${#raw}; i++)); do
    ch="${raw:i:1}"
    case "$ch" in
      [a-z])
        head="${_CAWS_GUARD_LOWER%%"$ch"*}"
        out="${out}${_CAWS_GUARD_UPPER:${#head}:1}"
        ;;
      [A-Z0-9]) out="${out}${ch}" ;;
      *) out="${out}_" ;;
    esac
  done
  printf '%s' "$out"
}

# caws_guard_config_load [project_dir]
#
# Populates the environment once. Returns 0 always: a guard must never fail to
# run because its optional configuration could not be read.
caws_guard_config_load() {
  [[ -n "${CAWS_GUARD_CONFIG_STATUS:-}" ]] && return 0

  local project_dir="${1:-${CAWS_PROJECT_DIR:-.}}"
  local script="${CAWS_GUARD_CONFIG_PY:-}"
  if [[ -z "$script" ]]; then
    script="${_CAWS_GUARD_CONFIG_LIB_DIR:-${HOOKS_DIR:-.}/lib}/guard-config.py"
  fi

  if [[ ! -f "$script" ]] || ! command -v python3 >/dev/null 2>&1; then
    # Unparsed, not "empty": the distinction matters because `unparsed` must
    # not be reported to a caller as a verified-absent configuration.
    export CAWS_GUARD_CONFIG_STATUS="unavailable"
    export CAWS_GUARD_ZONE_COUNT=0
    return 0
  fi

  local line name value
  while IFS= read -r line; do
    name="${line%%=*}"
    value="${line#*=}"
    # Only our own namespace is exported, so a compromised or corrupted parse
    # cannot inject PATH, HOME or any other variable into the guard chain.
    case "$name" in
      CAWS_GUARD_[A-Z0-9_]*) ;;
      *) continue ;;
    esac
    export "$name=$value"
  done < <(python3 "$script" "$project_dir" 2>/dev/null)

  [[ -n "${CAWS_GUARD_CONFIG_STATUS:-}" ]] || export CAWS_GUARD_CONFIG_STATUS="unavailable"
  [[ -n "${CAWS_GUARD_ZONE_COUNT:-}" ]] || export CAWS_GUARD_ZONE_COUNT=0
  return 0
}

# caws_guard_prefixes <guard-basename>
#
# Prints the repo-declared additional allow prefixes, one per line. Prints
# nothing when there are none, when the document was invalid, or when the
# config could not be loaded — all three mean "apply the shipped table".
caws_guard_prefixes() {
  local key count index var
  key="$(caws_guard_mangle "$1")"
  var="CAWS_GUARD_PREFIX_COUNT_${key}"
  count="${!var:-0}"
  case "$count" in
    '' | *[!0-9]*) return 0 ;;
  esac
  for ((index = 0; index < count; index++)); do
    var="CAWS_GUARD_PREFIX_${key}_${index}"
    [[ -n "${!var:-}" ]] && printf '%s\n' "${!var}"
  done
  return 0
}

# caws_guard_zones
#
# Prints `policy.non_governed_zones`, already normalized by the loader with the
# same quote-strip / `/**` trim / trailing-slash rules the inline awk block
# applied. One line per zone, so a zone containing a space survives intact.
caws_guard_zones() {
  local count index var
  count="${CAWS_GUARD_ZONE_COUNT:-0}"
  case "$count" in
    '' | *[!0-9]*) return 0 ;;
  esac
  for ((index = 0; index < count; index++)); do
    var="CAWS_GUARD_ZONE_${index}"
    [[ -n "${!var:-}" ]] && printf '%s\n' "${!var}"
  done
  return 0
}

# caws_guard_threshold <guard-basename> <threshold-name> <shipped-default>
#
# Precedence is ENV > CONFIG > SHIPPED DEFAULT, deliberately in that order: an
# existing `.claude/settings.json` env block must keep working untouched after
# this lands, and a per-session override is a narrower, more current statement
# of intent than a committed file.
caws_guard_threshold() {
  local guard="$1" name="$2" fallback="$3"
  local key var value
  key="$(caws_guard_mangle "$guard")"
  var="CAWS_GUARD_THRESHOLD_${key}_$(caws_guard_mangle "$name")"
  value="${!var:-}"
  case "$value" in
    '' | *[!0-9]*) printf '%s' "$fallback" ;;
    *) printf '%s' "$value" ;;
  esac
}
