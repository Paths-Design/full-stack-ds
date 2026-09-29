#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,23
# edit_stance: YOURS TO EDIT. This is a starting hook lib, not a locked one —
#   shape it to your repo. The CAWS-MANAGED-HOOK marker above is only how
#   caws init finds libs it can offer updates for; it is NOT a keep-out sign.
#
# CAWS compiled local chain (shared lib).
# CAWS-REPO-HOOK-POLICY-PROJECT-WIRED-01.
#
# Project-wired surfaces (qwen-code, kimi-code, opencode, zcode, dsh) exec
# .caws/hooks/dispatch/<event>.sh directly, and that dispatcher carries a
# literal HANDLERS=(...) bash array baked in at init time. Machine-routed
# surfaces resolve their chain through the launcher and can read a repo policy;
# these surfaces could not, so a repo's committed hook-policy.json would have
# silently governed two harnesses and not the other five.
#
# This lib closes that gap by reading a COMPILED SIDECAR — written by
# `caws hooks compile`, committed, and regenerated from hook-policy.json:
#
#   dispatch/<event>.chain
#     # caws hook chain v1 surface=<s> event=<e> policy-sha256=<hex> pack=<n>
#     scope-guard.sh<TAB>.caws/hooks/ext/scope-guard.local.sh
#     rg-replace-guard.sh
#
# WHY A SIDECAR AND NOT A REGENERATED ARRAY: rewriting the HANDLERS array in
# the dispatcher would leave that managed pack file permanently in
# `managed_drift`, so `caws init` would refuse every future upstream dispatcher
# fix — and it would feed the same doctor inversion (local growth explaining
# away real lag) this whole design exists to remove.
#
# WHY IT IS NEVER SOURCED: the sidecar is generated data, and sourcing it would
# make the guard plane arbitrarily programmable from a committed artifact — a
# file that the compile step, not a human, last wrote. It is parsed with shell
# builtins only: no eval, no source, no subprocess.
#
# FAIL POSTURE, and it is deliberately asymmetric:
#   - ABSENT sidecar  -> return 1, caller keeps the stock array. One stat. A
#                        repo that never opts in pays nothing and changes
#                        nothing.
#   - MALFORMED line  -> block + exit 2. A sidecar that cannot be trusted must
#                        not degrade to a partial chain: dropping the line you
#                        could not parse is how a guard silently stops running.
#
# bash 3.2 (macOS /bin/bash) has no associative arrays, so overrides are
# published as individually-named variables read back through ${!name}
# indirection — see caws_local_chain_override.

# caws_local_chain <event>
#   On success sets CAWS_LOCAL_CHAIN (array, in execution order) and one
#   CAWS_LOCAL_OVERRIDE_<mangled> variable per override, then returns 0.
#   Returns 1 when no sidecar exists (caller keeps its stock array).
#   Exits 2 on a malformed sidecar.
caws_local_chain() {
  local event="$1"
  local dispatch_dir="${CAWS_HOOKS_DIR:-${HOOKS_DIR:-.caws/hooks}}/dispatch"
  local chain_file="$dispatch_dir/$event.chain"

  # The entire absent-file cost.
  [[ -f "$chain_file" ]] || return 1

  CAWS_LOCAL_CHAIN=()
  local line entry target key mangled saw_header=0 line_no=0

  # `read` without -r is wrong here (it would eat backslashes); IFS is cleared
  # so leading/trailing whitespace survives into the validation below rather
  # than being silently trimmed into validity.
  while IFS= read -r line || [[ -n "$line" ]]; do
    line_no=$((line_no + 1))
    case "$line" in
      '')
        continue
        ;;
      '# caws hook chain v1 '*)
        saw_header=1
        continue
        ;;
      '#'*)
        # A comment that is not the version header. Refused rather than
        # skipped: the file is machine-generated, so an unexpected comment
        # means this is not the artifact the compiler wrote.
        _caws_local_chain_refuse "$chain_file" "$line_no" \
          "unexpected comment; only the 'caws hook chain v1' header is allowed"
        ;;
    esac

    # Split on the single TAB separator. No `cut`, no subshell.
    entry="${line%%$'\t'*}"
    if [[ "$line" == *$'\t'* ]]; then
      target="${line#*$'\t'}"
    else
      target=""
    fi

    # The handler entry: a .sh basename plus optional simple arguments. The
    # same grammar the launcher admits, so the two planes cannot disagree
    # about what a legal chain entry is.
    if [[ ! "$entry" =~ ^[A-Za-z0-9_.-]+\.sh( [A-Za-z0-9_.:/-]+)*$ ]]; then
      _caws_local_chain_refuse "$chain_file" "$line_no" \
        "malformed handler entry: $entry"
    fi

    if [[ -n "$target" ]]; then
      # Containment. An absolute or traversing target would let a committed
      # file point the guard plane at anything on the filesystem, which is the
      # one thing a repo-authored artifact must never be able to do.
      case "$target" in
        /*)
          _caws_local_chain_refuse "$chain_file" "$line_no" \
            "override target must be repo-relative, not absolute: $target" ;;
        *../*|*/..|..)
          _caws_local_chain_refuse "$chain_file" "$line_no" \
            "override target may not traverse with ..: $target" ;;
        *'*'*|*'?'*|*'['*)
          _caws_local_chain_refuse "$chain_file" "$line_no" \
            "override target may not contain glob metacharacters: $target" ;;
      esac
      mangled="${entry%% *}"
      mangled="${mangled//[^A-Za-z0-9]/_}"
      key="CAWS_LOCAL_OVERRIDE_${mangled}"
      # Indirect ASSIGNMENT via printf -v: the bash 3.2 way to write a
      # dynamically named variable without eval.
      printf -v "$key" '%s' "${CAWS_PROJECT_DIR:-.}/$target"
      export "${key?}"
    fi

    CAWS_LOCAL_CHAIN+=("$entry")
  done < "$chain_file"

  if (( saw_header == 0 )); then
    _caws_local_chain_refuse "$chain_file" 0 \
      "missing the 'caws hook chain v1' header; refusing to treat an unrecognized file as a chain"
  fi

  # An empty chain is legal ONLY as an explicit statement, and the header is
  # what makes it explicit. Returning 0 here hands the caller a deliberate
  # empty chain rather than falling back to stock.
  return 0
}

# caws_local_chain_override <handler-basename>
#   Echoes the resolved override path for a handler, or nothing.
#   Reads through ${!name} indirection because bash 3.2 has no associative
#   arrays; keep this the ONLY reader so the mangling rule lives in one place.
caws_local_chain_override() {
  local mangled="${1%% *}"
  mangled="${mangled//[^A-Za-z0-9]/_}"
  local key="CAWS_LOCAL_OVERRIDE_${mangled}"
  printf '%s' "${!key:-}"
}

_caws_local_chain_refuse() {
  local file="$1" line_no="$2" reason="$3"
  local where="$file"
  (( line_no > 0 )) && where="$file:$line_no"
  echo "[local-chain] CAWS compiled hook chain is invalid at $where: $reason" >&2
  echo "[local-chain] Refusing to run a partial guard chain. Recompile from the committed policy: caws hooks compile" >&2
  printf '{"decision":"block","reason":"CAWS compiled hook chain is invalid at %s: %s. Refusing to run a partial guard chain — regenerate it with: caws hooks compile"}\n' \
    "$where" "$reason"
  exit 2
}
