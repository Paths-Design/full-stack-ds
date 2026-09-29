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
# Shared CAWS state-resolution helpers for CAWS hooks.
#
# Source this file from any hook that needs to:
#   - Resolve the canonical (main) repo's .caws/ directory from a worktree
#     or main-repo cwd
#   - Extract the worktree name from a .caws/worktrees/<name>/ path
#   - Inline a v10/v11 dual-shape registry reader into a node -e block
#
# Why this lives in lib/ instead of being inlined per-hook:
#   The v11 cutover (CAWS-1117-V11-HOOK-DRIFT-MERGE-01) surfaced a class of
#   bugs where hooks read .caws/worktrees.json under v10 envelope shape
#   {worktrees: {<name>: {...}}}  while the registry had already been
#   migrated to v11 flat-map shape {<name>: {...}} by
#   CAWS-1117-WORKTREE-REGISTRY-CLEAN-01. Six callsites across four hooks
#   silently returned [] against the new shape, and the doc-cull worktree
#   sibling agent (turn-027) hit strike 3/3 because scope-guard.sh ALSO had
#   a separate v10-only reader at line 300 that this slice missed initially.
#
#   Factoring the readers here makes the v10/v11 dual-shape contract a
#   single point of change. Future schema bumps (v11→v12) land in one
#   place instead of N callsites across N hooks.
#
# Bash functions exported:
#   resolve_canonical_dir <start-dir>
#       Walks `git rev-parse --git-common-dir` from <start-dir> upward to
#       find the main repo root (the one containing .caws/). Returns the
#       canonical dir on stdout. Falls back to <start-dir> if git is
#       unavailable, the dir is not in a git repo, or no .caws/ is found
#       at the canonical location. Exit code is always 0 (advisory).
#
#   extract_worktree_name <dir>
#       If <dir> matches the pattern .../.caws/worktrees/<name>($|/),
#       prints <name> on stdout and returns 0. Otherwise prints nothing
#       and returns 1.
#
#   _realpath <path>
#       Best-effort realpath (python3-backed, falls back to the input).
#       Resolves the existing prefix even when the leaf does not exist.
#
#   caws_current_branch [dir]
#       Prints the current branch of the checkout at [dir] (default cwd),
#       or "unknown" if git is unavailable.
#
#   sanitize_session <session-id>
#       Normalize a session id into a filesystem-safe token for state
#       sentinel filenames. Used by the danger-latch writer and clearer so
#       their filenames always match.
#
#   is_canonical_checkout [dir]
#       Returns 0 if [dir] is the canonical (main) checkout (git-dir ==
#       git-common-dir), 1 if it is a linked worktree or git is absent.
#
#   caws_compose_risk <root> <branch> <rel-path> [--verbose]
#       WORKTREE-GUARD-RISK-SURFACE-001. Compose the composite risk signal
#       (target-dir existence + active bound specs + active-agent count +
#       lease staleness) that the SessionStart briefing and the per-write
#       guard ask both surface, so they never disagree. Default: one compact
#       line `risk[dir:… active-specs:N(…) agents:N+Mstale]`. --verbose: a
#       multi-line briefing. Always exit 0 (advisory).
#
# Node-helper string constants:
#   CAWS_NODE_ENTRIES_OF
#       A JS function declaration string. Inline it into a node -e block
#       to get an entriesOf(reg) helper that returns Object.values()
#       against both v10 envelope and v11 flat-map shapes. Usage:
#           node -e "
#               $CAWS_NODE_ENTRIES_OF
#               var reg = JSON.parse(...);
#               var entries = entriesOf(reg);
#               ...
#           "
#       The helper synthesizes entry.name from the outer key when
#       absent (a v11 flat-map quirk) so downstream code can treat
#       entries uniformly.
#
#   CAWS_NODE_LIFECYCLE
#       A JS function declaration string for lifecycle(spec). Reads
#       v11 spec.lifecycle_state first, falls back to v10 spec.status.
#       Returns undefined when neither is present.
#
#   CAWS_NODE_GLOB_TO_SCOPE_REGEXP
#       A JS function declaration string for globToRegExp(pattern). The
#       single canonical "does this path match a scope.in/scope.out glob"
#       algorithm. Metachar-escaped, `**`->`.+` (cross-segment),
#       `*`->`[^/]*` (single-segment, does NOT cross '/'), `?`->`.`,
#       anchored ^...$. scope-guard.sh and worktree-write-guard.sh BOTH
#       inline this so they can never disagree on a scope decision
#       (HOOK-LIB-CONSOLIDATION-001 T1a). Usage:
#           node -e "
#               $CAWS_NODE_GLOB_TO_SCOPE_REGEXP
#               if (globToRegExp(pattern).test(relPath)) { ... }
#           "
#
#   IMPORTANT escaping note: these constants are single-quoted bash
#   strings, so the JS source is LITERAL (single backslashes, bare $).
#   When inlining into a double-quoted `node -e "..."` block, bash will
#   NOT re-process them (they arrive via $VAR expansion, not re-parsing),
#   so the literal JS reaches node intact. Do not double-escape here.

# Guard against double-sourcing.
if [[ -n "${_CAWS_STATE_SH_LOADED:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi
_CAWS_STATE_SH_LOADED=1

resolve_canonical_dir() {
  local start="${1:-}"
  if [[ -z "$start" ]]; then
    return 0
  fi
  if ! command -v git >/dev/null 2>&1; then
    printf '%s\n' "$start"
    return 0
  fi
  local common_dir
  common_dir=$(cd "$start" 2>/dev/null && git rev-parse --git-common-dir 2>/dev/null || echo "")
  if [[ -z "$common_dir" ]] || [[ "$common_dir" == ".git" ]]; then
    printf '%s\n' "$start"
    return 0
  fi
  local candidate
  candidate=$(cd "$start" && cd "$common_dir/.." 2>/dev/null && pwd || echo "")
  if [[ -n "$candidate" ]] && [[ -d "$candidate/.caws" ]]; then
    printf '%s\n' "$candidate"
    return 0
  fi
  printf '%s\n' "$start"
}

# caws_canonical_state_dir <start-dir> <vendor-dir>
#   Resolve the CANONICAL hook-state directory: walk git-common-dir from
#   <start-dir> to the canonical (main) checkout root, then return
#   <canonical-root>/<vendor-dir>/hooks/state. This is the shared landing spot
#   for the canonical-root walk that lib/reprieve.sh previously inlined and
#   that reset-danger-latch.sh needs so its search anchors at the same root the
#   latch writer (block-dangerous.sh, CAWS_PROJECT_DIR git-root-normalized by
#   HOOK-PROJECT-DIR-ROOT-NOT-CWD-01) writes to.
#
#   Semantics intentionally match lib/reprieve.sh's caws_reprieve_state_dir walk
#   (the battle-tested one), NOT resolve_canonical_dir's stricter variant:
#     - no .caws/ existence requirement at the candidate;
#     - a relative common-dir (".git" in the canonical checkout itself) is
#       resolved to absolute before the parent is taken, via pwd -P;
#     - fail-open: on git-absent / not-a-repo / walk failure, return
#       <start-dir>/<vendor-dir>/hooks/state (never empty, never block).
#
#   CAWS-LATCH-CANONICAL-STATE-DIR-001. The guard-strike subsystem is
#   deliberately NOT migrated onto this helper -- its out-of-tree placement is an
#   intentional safety invariant (CAWS-GUARD-STRIKE-FILE-OUT-OF-TREE-001).
caws_canonical_state_dir() {
  local start="${1:-.}"
  local vendor_dir="${2:-${CAWS_VENDOR_DIR:-.claude}}"
  local project_dir="$start"
  if command -v git >/dev/null 2>&1; then
    local common
    common="$(cd "$start" 2>/dev/null && git rev-parse --git-common-dir 2>/dev/null)" || common=""
    if [[ -n "$common" ]]; then
      case "$common" in
        /*) : ;;
        *)  common="$start/$common" ;;
      esac
      local canon_root
      canon_root="$(cd "$common/.." 2>/dev/null && pwd -P)" || canon_root=""
      if [[ -n "$canon_root" ]]; then
        project_dir="$canon_root"
      fi
    fi
  fi
  printf '%s/%s/hooks/state
' "$project_dir" "$vendor_dir"
}

extract_worktree_name() {
  local dir="${1:-}"
  if [[ "$dir" =~ ^(.*\/\.caws\/worktrees\/([^/]+))($|/) ]]; then
    printf '%s\n' "${BASH_REMATCH[2]}"
    return 0
  fi
  return 1
}

# _realpath <path>
#   Best-effort realpath. macOS lacks `readlink -f` by default; python3 is
#   available on every supported runner (CI matrix verified). Falls back to
#   the original path if realpath cannot resolve. os.path.realpath resolves
#   the existing prefix even when the leaf does not exist (Write-tool case),
#   which is required for prefix-match allowlist arms to survive the macOS
#   /tmp -> /private/tmp symlink. Promoted from worktree-write-guard
#   (HOOK-LIB-CONSOLIDATION-001 T2a) so other hooks normalize identically.
_realpath() {
  local p="${1:-}"
  if [[ -z "$p" ]]; then
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import os, sys; print(os.path.realpath(sys.argv[1]))" "$p" 2>/dev/null || printf '%s\n' "$p"
  else
    printf '%s\n' "$p"
  fi
}

# caws_current_branch [dir]
#   Print the current branch name of the git checkout at [dir] (default
#   cwd), or "unknown" if git is unavailable / not a repo. Single source
#   for the `git rev-parse --abbrev-ref HEAD || unknown` idiom duplicated
#   across worktree-guard, worktree-write-guard, session-caws-status,
#   session-log (HOOK-LIB-CONSOLIDATION-001 T2b).
caws_current_branch() {
  local dir="${1:-.}"
  ( cd "$dir" 2>/dev/null && git rev-parse --abbrev-ref HEAD 2>/dev/null ) || echo "unknown"
}

# sanitize_session <session-id>
#   Normalize a session id into a filesystem-safe token for use in state
#   sentinel filenames (e.g. danger-latch-<token>.json). The danger-latch
#   WRITER (block-dangerous.sh) and CLEARER (reset-danger-latch.sh) MUST
#   use the identical transform or the clear path computes a different
#   filename than the write path and silently fails to clear the real
#   sentinel (DANGER-LATCH-UX-001). One canonical copy here guarantees
#   they agree.
sanitize_session() {
  printf '%s' "${1:-}" | tr -c 'A-Za-z0-9._-' '_'
}

# is_canonical_checkout [dir]
#   Return 0 if [dir] (default cwd) is the canonical (main) checkout — i.e.
#   git-dir == git-common-dir — and 1 if it is a linked worktree or git is
#   unavailable. Equality is structural (both sides realpath-normalized),
#   not textual. Promoted from worktree-guard's CANONICAL-CHECKOUT guard
#   (HOOK-LIB-CONSOLIDATION-001 T2a). A non-zero return for "git absent"
#   is intentional: callers gate canonical-only blocking behind a positive
#   answer, so "can't tell" must not assert canonical.
is_canonical_checkout() {
  local dir="${1:-.}"
  command -v git >/dev/null 2>&1 || return 1
  [[ -d "$dir" ]] || return 1
  local gd gc gda gca
  gd=$(cd "$dir" 2>/dev/null && git rev-parse --git-dir 2>/dev/null | head -1) || return 1
  gc=$(cd "$dir" 2>/dev/null && git rev-parse --git-common-dir 2>/dev/null | head -1) || return 1
  [[ -n "$gd" ]] && [[ -n "$gc" ]] || return 1
  gda=$(cd "$dir" 2>/dev/null && cd "$gd" 2>/dev/null && pwd || echo "$gd")
  gca=$(cd "$dir" 2>/dev/null && cd "$gc" 2>/dev/null && pwd || echo "$gc")
  [[ "$gda" == "$gca" ]]
}

# caws_compose_risk <canonical-root> <current-branch> <rel-path> [--verbose]
#   WORKTREE-GUARD-RISK-SURFACE-001: compose the composite risk signal that
#   both the SessionStart briefing (full) and worktree-write-guard.sh
#   (per-write, short) surface, so they never disagree. Four signals:
#     (1) target file's directory existence (is the edit landing somewhere real)
#     (2) active bound specs claiming live worktrees (count + ids)
#     (3) active-agent count (from `caws agents list --json` counts.active)
#     (4) lease freshness (stale count vs the stale TTL)
#   Default output: a single compact line. With --verbose: a multi-line
#   briefing (used at SessionStart). Always exit 0 (advisory); degrades to a
#   minimal line if node/caws are unavailable.
caws_compose_risk() {
  local root="${1:-.}"
  local branch="${2:-}"
  local rel="${3:-}"
  local mode="${4:-}"
  command -v node >/dev/null 2>&1 || { printf 'risk: signal unavailable (node missing)\n'; return 0; }

  # Signal 3+4: agent/lease counts. `caws agents list --json` yields
  # counts:{active,stale,...} + stale_ttl_ms. Best-effort; empty on failure.
  local agents_json=""
  if command -v caws >/dev/null 2>&1; then
    agents_json=$(cd "$root" 2>/dev/null && caws agents list --json 2>/dev/null || echo "")
  fi

  CAWS_RISK_ROOT="$root" CAWS_RISK_BRANCH="$branch" CAWS_RISK_REL="$rel" \
  CAWS_RISK_MODE="$mode" CAWS_RISK_AGENTS="$agents_json" node -e "
    $CAWS_NODE_ENTRIES_OF
    $CAWS_NODE_ENTRY_SPEC_ID
    $CAWS_NODE_LIFECYCLE
    var fs = require('fs');
    var path = require('path');
    var root = process.env.CAWS_RISK_ROOT;
    var branch = process.env.CAWS_RISK_BRANCH;
    var rel = process.env.CAWS_RISK_REL || '';
    var verbose = process.env.CAWS_RISK_MODE === '--verbose';

    // (1) target dir existence
    var dirExists = null;
    if (rel) {
      var abs = path.isAbsolute(rel) ? rel : path.join(root, rel);
      var dir = path.dirname(abs);
      try { dirExists = fs.existsSync(dir); } catch (_) { dirExists = null; }
    }

    // (2) active bound specs claiming live (dir-present) worktrees
    var activeSpecs = [];
    try {
      var reg = JSON.parse(fs.readFileSync(path.join(root, '.caws', 'worktrees.json'), 'utf8'));
      var live = entriesOf(reg).filter(function(w) {
        if (w.status === 'destroyed' || w.status === 'missing') return false;
        if (branch && w.baseBranch && w.baseBranch !== branch) return false;
        var wtPath = (typeof w.path === 'string' && w.path)
          ? w.path
          : path.join(root, '.caws', 'worktrees', String(w.name || ''));
        return fs.existsSync(wtPath);
      });
      for (var i = 0; i < live.length; i++) {
        var sid = entrySpecId(live[i]);
        if (!sid) continue;
        var sp = path.join(root, '.caws', 'specs', sid + '.yaml');
        if (!fs.existsSync(sp)) sp = path.join(root, '.caws', 'specs', sid + '.yml');
        if (!fs.existsSync(sp)) continue;
        // Cheap lifecycle read without a YAML parser dependency: scan the
        // lifecycle_state / status line. (Hooks may lack js-yaml.)
        var txt = fs.readFileSync(sp, 'utf8');
        var m = txt.match(/^\s*lifecycle_state:\s*([A-Za-z]+)/m) || txt.match(/^\s*status:\s*([A-Za-z]+)/m);
        if (m && m[1] === 'active') activeSpecs.push(sid);
      }
    } catch (_) { /* registry absent → no active specs */ }

    // (3)+(4) agent/lease counts
    var agentsActive = null, agentsStale = null;
    try {
      var aj = JSON.parse(process.env.CAWS_RISK_AGENTS || 'null');
      if (aj && aj.counts) { agentsActive = aj.counts.active; agentsStale = aj.counts.stale; }
      else if (aj && typeof aj.active === 'number') { agentsActive = aj.active; }
    } catch (_) { /* leave null */ }

    function fmtDir() {
      if (dirExists === true) return 'dir:exists';
      if (dirExists === false) return 'dir:MISSING';
      return 'dir:?';
    }
    var specPart = activeSpecs.length
      ? 'active-specs:' + activeSpecs.length + '(' + activeSpecs.join(',') + ')'
      : 'active-specs:0';
    var agentPart = (agentsActive == null)
      ? 'agents:?'
      : 'agents:' + agentsActive + (agentsStale ? ('+' + agentsStale + 'stale') : '');

    if (!verbose) {
      console.log('risk[' + fmtDir() + ' ' + specPart + ' ' + agentPart + ']');
    } else {
      console.log('  Composite risk signal (WORKTREE-GUARD-RISK-SURFACE-001):');
      console.log('    - target dir:    ' + fmtDir().replace('dir:', ''));
      console.log('    - active specs:  ' + (activeSpecs.length ? activeSpecs.join(', ') : '(none claiming a live worktree)'));
      console.log('    - active agents: ' + (agentsActive == null ? 'unknown' : agentsActive)
        + (agentsStale ? (' (' + agentsStale + ' stale — consider: caws agents prune --dead)') : ''));
    }
  " 2>/dev/null || printf 'risk: signal unavailable\n'
}

# Shared node-helper strings. These are JS function declarations that
# any hook can inline into a node -e block to get dual-shape readers.
#
# Maintenance contract: when the v11 registry shape or spec lifecycle
# field set changes, update THIS file. All hooks that source it will
# pick up the change.

# entriesOf(reg) — registry entries from either v10 envelope or v11
# flat-map shape. Returns Array<{name, ...entry}> with synthesized
# .name from the outer key where the entry lacks one.
export CAWS_NODE_ENTRIES_OF='function entriesOf(r) {
  if (!r || typeof r !== "object") return [];
  // v10 envelope: { version, worktrees: { <name>: {...} } }
  if (r.worktrees && typeof r.worktrees === "object") {
    var src = r.worktrees;
    var out0 = [];
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) {
      var v = src[k];
      if (v && typeof v === "object") {
        if (!v.name) v = Object.assign({}, v, { name: k });
        out0.push(v);
      }
    }
    return out0;
  }
  // v11 flat-map: { <name>: {...} } at top level. Admit entry-shaped
  // values and ignore stray top-level metadata (e.g. a future "version"
  // sibling). The discriminator MUST match entryByName below: caws-cli
  // 11.1.7+ worktree-create persists { branch, baseBranch, path, spec_id }
  // and does NOT emit a status field (see worktrees-writer.ts
  // augmentRegistryEntry — status is synthesized at render time, never
  // persisted). A status-only gate here returned [] for every
  // CLI-created registry, silently disabling active-worktree detection
  // in every hook on this contract (HOOK-LIB-CONSOLIDATION-001 T1b;
  // same defect class as CAWS-1117-ENTRY-BY-NAME-V11-SHAPE-01, which
  // fixed entryByName but missed entriesOf). Admit any object carrying
  // at least one v11/v10 marker field.
  var out = [];
  for (var k2 in r) if (Object.prototype.hasOwnProperty.call(r, k2)) {
    var v2 = r[k2];
    if (v2 && typeof v2 === "object" && !Array.isArray(v2) && (
      typeof v2.status === "string" ||
      typeof v2.spec_id === "string" ||
      typeof v2.specId === "string" ||
      typeof v2.path === "string" ||
      typeof v2.branch === "string" ||
      typeof v2.name === "string"
    )) {
      if (!v2.name) v2 = Object.assign({}, v2, { name: k2 });
      out.push(v2);
    }
  }
  return out;
}'

# entryByName(reg, name) — single entry lookup from either shape. Returns
# the entry object or null. Use this when you know the name in advance
# (e.g. scope-guard resolving the authoritative spec for a specific
# worktree) rather than iterating all entries.
export CAWS_NODE_ENTRY_BY_NAME='function entryByName(r, name) {
  if (!r || typeof r !== "object" || !name) return null;
  if (r.worktrees && typeof r.worktrees === "object") {
    return r.worktrees[name] || null;
  }
  var v = r[name];
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  // Per CAWS-1117-ENTRY-BY-NAME-V11-SHAPE-01: previous discriminator
  // rejected v11-CLI-created entries because caws-cli 11.1.7
  // worktree-create no longer emits status. Admit any object that
  // carries at least one v11/v10 marker field.
  if (typeof v.status === "string") return v;
  if (typeof v.spec_id === "string") return v;
  if (typeof v.specId === "string") return v;
  if (typeof v.path === "string") return v;
  if (typeof v.branch === "string") return v;
  if (typeof v.name === "string") return v;
  return null;
}'

# entrySpecId(entry) — extract the bound spec id from a registry entry,
# accepting both v11 spec_id and v10 specId. Returns the id string or null.
export CAWS_NODE_ENTRY_SPEC_ID='function entrySpecId(entry) {
  if (!entry || typeof entry !== "object") return null;
  return entry.spec_id || entry.specId || null;
}'

# lifecycle(spec) — read v11 spec.lifecycle_state first, fall back to v10
# spec.status. Returns the lifecycle string or undefined. Use with a
# TERMINAL set like { closed: 1, archived: 1, completed: 1 } to filter
# out finished specs from active-set walks.
export CAWS_NODE_LIFECYCLE='function lifecycle(s) {
  if (!s || typeof s !== "object") return undefined;
  return s.lifecycle_state || s.status;
}'

# globToRegExp(pattern) — the single canonical scope-glob matcher. Adopted
# from worktree-write-guard's algorithm (the correct one): metachars are
# escaped so literal path chars like "." are not regex operators; then
# glob wildcards expand with ** distinct from * and the whole thing is
# anchored so a pattern must match the WHOLE relative path, not a
# substring. scope-guard.sh previously used a weaker `*`->`.*` UNANCHORED
# variant that crossed "/" boundaries and matched substrings, so the two
# guards could return opposite answers for the same (path, pattern) pair
# (HOOK-LIB-CONSOLIDATION-001 T1a). They now share this one.
#
# This is written as LITERAL JS (single backslashes, bare $) because it is
# a single-quoted bash string. It is byte-for-byte the JS that node sees
# when worktree-write-guard inlined it via a double-quoted `node -e`.
export CAWS_NODE_GLOB_TO_SCOPE_REGEXP='function globToRegExp(pattern) {
  // Escape regex metachars (except *, ?) so literal path chars like "."
  // are not treated as regex operators. Then expand glob wildcards:
  //   **  -> .+       (cross-segment, matches nested dirs)
  //   *   -> [^/]*    (single-segment, does NOT cross "/")
  //   ?   -> .        (any single char)
  // CLAIM-ORACLE-DIRECTORY-CONTAINMENT-001: a scope entry denotes a path AND
  // everything beneath it. Trailing slashes are stripped so "dir/" and "dir"
  // agree; the result is anchored with a containment suffix that requires a
  // "/" boundary ("dir" matches "dir/x" but never "directory"); and an entry
  // that is empty after stripping compiles to a never-matching pattern rather
  // than claiming or excluding everything. This string and the copy in
  // worktree-claim-oracle.cjs MUST answer identically (parity is tested).
  var p = String(pattern).replace(/\/+$/, "");
  if (p === "") return /(?!)/;
  var escaped = p.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  var body = escaped.replace(/\*\*/g, ".+").replace(/\*/g, "[^/]*").replace(/\?/g, ".");
  return new RegExp("^" + body + "(?:/.*)?$");
}'
