#!/usr/bin/env node
/*
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 4,8,13,20,32
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.

 * worktree-claim-oracle.cjs  (WORKTREE-ISOLATION-HARDENING-001)
 *
 * THE shared ownership oracle. Invoked by BOTH worktree-write-guard.sh
 * (Write/Edit) and bash-write-guard.sh (Bash mutation target). Given a
 * candidate path + the operating session, it decides whether the mutation
 * is admissible under worktree ownership.
 *
 * WHY A STANDALONE .js FILE (not an inline node -e heredoc): the inline
 * node blocks in scope-guard.sh / worktree-write-guard.sh are bash
 * double-quoted strings; a backtick or double-quote in a JS comment
 * corrupts the script (set -e silent exit 1; bash -n does not catch it).
 * A real .js file is node --check-able and fixture-testable, so the
 * ownership logic lives here once and both guards shell out to it.
 *
 * WHY PLAIN JS (no TypeScript, no imports beyond node builtins + js-yaml):
 * the installed hook pack must not depend on TypeScript build artifacts or
 * repo-local package resolution. The CLI side keeps its TypeScript
 * admitsOwner/resolveSessionCandidates; this helper and that code are kept
 * in agreement by GOLDEN FIXTURES, not by code sharing (contract
 * worktree-claim-oracle-shared-answer-v1).
 *
 * INPUTS (env vars, mirroring the existing PROJECT_DIR/CURRENT_BRANCH/
 * REL_PATH node -e convention):
 *   CAWS_ORACLE_PROJECT_DIR  canonical repo root (realpath-normalized)
 *   CAWS_ORACLE_CURRENT_BRANCH  current git branch at the base checkout
 *   CAWS_ORACLE_REL_PATH  candidate path. May be canonical-absolute, a
 *                         .caws/worktrees/<name>/<rest> path, or already
 *                         repo-relative; this helper normalizes all three.
 *   CAWS_ORACLE_SESSION_ID  operating session id (HOOK_SESSION_ID). Compared
 *                           by DIRECT STRING MATCH to the worktree owner.
 *
 * OUTPUT (single line to stdout): "<outcome>:<detail>" where outcome is one
 * of the CLOSED set:
 *   pass                  no claim / owner == operating session / read-only
 *   block_claimed         canonical-root write to a claimed scope.in path
 *                         (session-INDEPENDENT; preserves the pre-existing
 *                         worktree-write-guard behavior)
 *   block_foreign_worktree  a write into .caws/worktrees/<name>/<rest> whose
 *                           owner does NOT match the operating session
 *   ask_uncertain         a claimed path is involved but the decision is not
 *                         a clean allow/block (caller decides ask vs warn)
 *   error_fail_closed     could not read/parse authority; FAIL CLOSED
 *
 * Exit code is always 0 (the caller reads stdout); the oracle never turns
 * its own internal error into a tool-call block on its own — it emits
 * error_fail_closed and lets the calling guard decide. (The guards treat
 * error_fail_closed conservatively: ask, never silent-allow.)
 */

'use strict';

var fs = require('fs');
var path = require('path');

function emit(outcome, detail) {
  process.stdout.write(outcome + ':' + (detail || '') + '\n');
  process.exit(0);
}

// js-yaml is required LAZILY (loadYaml below), NOT at module top. The
// worktree-payload ownership decision (block_foreign_worktree / owner-self)
// reads ONLY worktrees.json (plain JSON) + the owner.session_id field — it
// needs no YAML parser. Only the canonical-root scope.in claim check reads
// spec YAML. Deferring the require means a foreign-worktree write still blocks
// correctly even in an installed .caws/hooks/lib/ where js-yaml is not
// resolvable (the common case the maintainer flagged) — yaml absence only
// degrades the canonical-claim check, not the payload-ownership check.
var _yaml = null;
var _yamlTried = false;
function loadYaml() {
  if (_yamlTried) return _yaml;
  _yamlTried = true;
  try {
    _yaml = require('js-yaml');
  } catch (_) {
    _yaml = null;
  }
  return _yaml;
}

// ---------------------------------------------------------------------------
// Canonical helpers — byte-equivalent to the shared CAWS_NODE_* definitions in
// lib/caws-state.sh (entriesOf / entrySpecId / lifecycle / globToRegExp). They
// are duplicated here as real JS so this file is self-contained and node
// --check-able; the glob algorithm MUST stay identical to caws-state.sh so the
// oracle and the inline guard return the same answer (no glob divergence).
// ---------------------------------------------------------------------------

function entriesOf(r) {
  if (!r || typeof r !== 'object') return [];
  if (r.worktrees && typeof r.worktrees === 'object') {
    var src = r.worktrees;
    var out0 = [];
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) {
      var v = src[k];
      if (v && typeof v === 'object') {
        if (!v.name) v = Object.assign({}, v, { name: k });
        out0.push(v);
      }
    }
    return out0;
  }
  var out = [];
  for (var k2 in r) if (Object.prototype.hasOwnProperty.call(r, k2)) {
    var v2 = r[k2];
    if (v2 && typeof v2 === 'object' && !Array.isArray(v2) && (
      typeof v2.status === 'string' ||
      typeof v2.spec_id === 'string' ||
      typeof v2.specId === 'string' ||
      typeof v2.path === 'string' ||
      typeof v2.branch === 'string' ||
      typeof v2.name === 'string'
    )) {
      if (!v2.name) v2 = Object.assign({}, v2, { name: k2 });
      out.push(v2);
    }
  }
  return out;
}

function entrySpecId(entry) {
  if (!entry || typeof entry !== 'object') return null;
  return entry.spec_id || entry.specId || null;
}

function lifecycle(s) {
  if (!s || typeof s !== 'object') return undefined;
  return s.lifecycle_state || s.status;
}

function globToRegExp(pattern) {
  // ** -> .+ (cross-segment); * -> [^/]* (single-segment); ? -> . ; anchored.
  //
  // CLAIM-ORACLE-DIRECTORY-CONTAINMENT-001 (ported from consumer hardening
  // STERLING-CLAIM-ORACLE-DIRECTORY-CONTAINMENT-01): a scope entry denotes a
  // path AND everything beneath it. Previously this anchored '^...$' with no
  // containment suffix, so the common directory-shaped entry 'pkg/dir/'
  // compiled to /^pkg\/dir\/$/ and matched ONLY that literal string — a real
  // file under it ('pkg/dir/file.py') returned pass:unclaimed and every
  // file-level mutation inside an actively-claimed directory was admitted.
  // Directory entries carry no glob, so nothing expanded and the exactness was
  // invisible. Trailing slashes are stripped first so 'dir/' and 'dir' agree.
  //
  // The '(?:/.*)?' suffix requires a '/' boundary: 'pkg/dir' matches
  // 'pkg/dir' and 'pkg/dir/x', but NOT 'pkg/directory'. An exact file entry
  // keeps matching that file (a suffix under a file path cannot exist), so
  // file-shaped scope.in entries are unaffected.
  var p = String(pattern).replace(/\/+$/, '');
  // An empty pattern would otherwise compile to a regex matching the empty
  // path; derive no claim from it rather than claiming anything.
  if (p === '') return /(?!)/;
  var escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  var body = escaped.replace(/\*\*/g, '.+').replace(/\*/g, '[^/]*').replace(/\?/g, '.');
  return new RegExp('^' + body + '(?:/.*)?$');
}

// owner session id of a registry entry, or null.
function ownerSessionId(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.owner && typeof entry.owner === 'object' &&
      typeof entry.owner.session_id === 'string') {
    return entry.owner.session_id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Path normalization. Produces:
//   { kind: 'worktree', worktreeName, logical }  — the path is physically
//       inside .caws/worktrees/<name>/<rest>; logical = <rest>.
//   { kind: 'canonical', logical }               — a repo-root-relative path.
// All inputs (absolute under projectDir, .caws/worktrees/... , or already
// relative) collapse to a repo-relative form first.
// ---------------------------------------------------------------------------

function toRepoRelative(projectDir, candidate) {
  var p = String(candidate || '');
  // Strip an absolute projectDir prefix if present.
  if (projectDir && p.indexOf(projectDir + path.sep) === 0) {
    p = p.slice(projectDir.length + 1);
  } else if (projectDir && p === projectDir) {
    p = '';
  }
  // Normalize separators / leading "./".
  p = p.replace(/^\.\//, '');
  return p;
}

function classifyPath(projectDir, candidate) {
  var rel = toRepoRelative(projectDir, candidate);
  // .caws/worktrees/<name>/<rest>  — worktree payload.
  var m = rel.match(/^\.caws\/worktrees\/([^/]+)\/(.+)$/);
  if (m) {
    return { kind: 'worktree', worktreeName: m[1], logical: m[2], rel: rel };
  }
  return { kind: 'canonical', logical: rel, rel: rel };
}

// ---------------------------------------------------------------------------
// Claim resolution. Returns ALL active-bound worktrees whose scope.in matches
// the logical path (CLASH-GUARD-CLAIMANT-LABELING-001 — a contested path may be
// claimed by more than one spec; the block must name every owner, not just the
// first match). scope.in ONLY (never scope.out, never scope.support —
// WORKTREE-SUPPORT-SCOPE-001). Only active-bound specs on the current branch
// confer a claim. The DECISION is unchanged (any claimant => block); only the
// reported claimant set widens from first-match to all-matches.
// ---------------------------------------------------------------------------

function loadSpecScopeIn(projectDir, specId) {
  var yaml = loadYaml();
  if (!yaml) return { noYaml: true };
  var specPath = path.join(projectDir, '.caws', 'specs', specId + '.yaml');
  if (!fs.existsSync(specPath)) {
    specPath = path.join(projectDir, '.caws', 'specs', specId + '.yml');
  }
  if (!fs.existsSync(specPath)) return { missing: true };
  var spec = yaml.load(fs.readFileSync(specPath, 'utf8')) || {};
  if (lifecycle(spec) !== 'active') return { notActive: true };
  var scope = spec.scope || {};
  var patterns = Array.isArray(scope.in) ? scope.in : [];
  return { patterns: patterns };
}

// Returns { noYaml: true } if any candidate spec's YAML is unreadable (fail
// closed, same posture as before), else { claimants: [{ wt, pattern }, ...] }
// listing every active-bound worktree that claims logicalPath via scope.in.
// An empty claimants array means "no claim" (the caller treats it as pass).
function findClaimants(projectDir, currentBranch, logicalPath, worktrees) {
  var claimants = [];
  for (var wi = 0; wi < worktrees.length; wi++) {
    var wt = worktrees[wi];
    if (wt.status === 'destroyed' || wt.status === 'missing') continue;
    if (wt.baseBranch !== undefined && currentBranch !== undefined &&
        currentBranch !== '' && wt.baseBranch !== currentBranch) {
      continue;
    }
    var specId = entrySpecId(wt);
    if (!specId) continue;
    var scope = loadSpecScopeIn(projectDir, specId);
    // yaml absent: cannot read scope.in to prove/deny a canonical claim. The
    // caller fails closed (ask) rather than silently passing.
    if (scope.noYaml) return { noYaml: true };
    if (scope.missing || scope.notActive) continue;
    if (!scope.patterns || scope.patterns.length === 0) continue;
    for (var pi = 0; pi < scope.patterns.length; pi++) {
      if (globToRegExp(scope.patterns[pi]).test(logicalPath)) {
        // First matching pattern per worktree; a worktree is named once even
        // if several of its scope.in patterns would match.
        claimants.push({ wt: wt, pattern: scope.patterns[pi] });
        break;
      }
    }
  }
  return { claimants: claimants };
}

// ---------------------------------------------------------------------------
// Main decision.
// ---------------------------------------------------------------------------

function main() {
  var projectDir = process.env.CAWS_ORACLE_PROJECT_DIR || '';
  var currentBranch = process.env.CAWS_ORACLE_CURRENT_BRANCH;
  var candidate = process.env.CAWS_ORACLE_REL_PATH || '';
  var sessionId = process.env.CAWS_ORACLE_SESSION_ID || '';

  if (!projectDir || !candidate) {
    emit('error_fail_closed', 'missing-input');
  }

  var registryPath = path.join(projectDir, '.caws', 'worktrees.json');
  var registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (e) {
    // No registry / unreadable -> no active worktrees to enforce. This is the
    // genuinely-unguarded base state, not an authority read failure that
    // should block; the calling guard already fail-opens when the registry
    // is absent. Treat as pass.
    emit('pass', 'no-registry');
  }

  var worktrees;
  try {
    worktrees = entriesOf(registry).filter(function (w) {
      if (w.status === 'destroyed' || w.status === 'missing') return false;
      var wtPath = (typeof w.path === 'string' && w.path)
        ? w.path
        : path.join(projectDir, '.caws', 'worktrees', String(w.name || ''));
      // WORKTREE-GUARD-RISK-SURFACE-001: a dir-gone (ghost) entry never
      // participates in the authority decision.
      return fs.existsSync(wtPath);
    });
  } catch (e) {
    emit('error_fail_closed', 'registry-parse:' + e.message);
  }

  if (worktrees.length === 0) {
    emit('pass', 'no-active-worktrees');
  }

  var cls;
  try {
    cls = classifyPath(projectDir, candidate);
  } catch (e) {
    emit('error_fail_closed', 'classify:' + e.message);
  }

  if (cls.kind === 'worktree') {
    // Direct write into .caws/worktrees/<name>/<rest>. This is worktree
    // PAYLOAD — owner-vs-operating-session decides. Find the named entry.
    var named = null;
    for (var i = 0; i < worktrees.length; i++) {
      if (String(worktrees[i].name) === cls.worktreeName) { named = worktrees[i]; break; }
    }
    if (named === null) {
      // The path looks like worktree payload but no live registry entry owns
      // it (ghost dir, or a worktree not in the registry). Uncertain — ask.
      emit('ask_uncertain', 'worktree-payload-no-entry:' + cls.worktreeName);
    }
    var owner = ownerSessionId(named);
    if (owner === null) {
      // Payload path under a registered worktree with no owner stamped.
      // Cannot prove same-session; fail closed to ask.
      emit('ask_uncertain', 'worktree-payload-no-owner:' + cls.worktreeName);
    }
    if (sessionId && owner === sessionId) {
      emit('pass', 'owner-self:' + cls.worktreeName);
    }
    emit('block_foreign_worktree', cls.worktreeName + ':' + owner);
  }

  // Canonical-root path. Session-INDEPENDENT claim check (preserve existing
  // worktree-write-guard behavior): if any active-bound worktree claims the
  // logical path via scope.in, this is a claimed write at the canonical root
  // and must block regardless of which session is operating.
  var claim = findClaimants(projectDir, currentBranch, cls.logical, worktrees);
  if (claim.noYaml) {
    // The canonical cross-worktree claim check needs spec YAML, and js-yaml is
    // unresolvable here. This is a TOOLCHAIN FAULT, not a danger signal — and
    // crucially we are PAST the worktree-payload ownership check above (lines
    // ~305-324), which is yaml-free and already hard-blocked a foreign-payload
    // write. So at this point the path is a canonical (non-payload) path whose
    // ONLY remaining check — "does another active worktree's scope.in claim
    // this path?" — cannot run. We DEGRADE rather than fail closed: emit a
    // distinct `degraded_no_yaml` verdict that the guards map to allow-with-
    // advisory (the cross-worktree claim check was skipped), NOT ask-on-every-
    // mutation. Failing closed here (the old behavior) turned every canonical
    // mutation into an approval prompt whenever js-yaml was absent — the #1
    // friction the maintainer flagged (CAWS-HOOKPACK-ORACLE-JSYAML-DEGRADE-001).
    // The isolation-critical block (foreign worktree payload) is unaffected: it
    // ran earlier and is yaml-free.
    emit('degraded_no_yaml', 'no-js-yaml');
  }
  if (claim.claimants.length > 0) {
    // block_claimed detail is a COMMA-separated list of `name:pattern` pairs —
    // one per claiming worktree (CLASH-GUARD-CLAIMANT-LABELING-001). Comma is
    // safe: worktree names and scope.in patterns do not contain it. A single
    // claimant yields exactly `name:pattern` (no comma), byte-identical to the
    // pre-change single-claimant detail so the guards' lead-name parse is
    // unchanged for that common case.
    var detail = claim.claimants.map(function (c) {
      return (c.wt.name || entrySpecId(c.wt)) + ':' + c.pattern;
    }).join(',');
    emit('block_claimed', detail);
  }

  emit('pass', 'unclaimed');
}

try {
  main();
} catch (e) {
  emit('error_fail_closed', 'uncaught:' + (e && e.message ? e.message : 'unknown'));
}
