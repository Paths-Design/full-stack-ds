#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 19
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
# SessionStart handler — registers the current session with the CAWS agent
# registry (MULTI-AGENT-ACTIVITY-REGISTRY-001), then (v45+,
# PRESENCE-DECISION-POINT-INJECTION-001) emits an advisory when the session
# starts UNBOUND in a repo with active specs: names the no-authority state,
# the active spec ids, and the exact `caws worktree ensure <name> --spec <id>`
# command (v46, WORKTREE-ENSURE-AFFORDANCE-001 — ensure is the idempotent
# create-or-admit form), composed from the existing read-only `caws scope
# show --json` no-authority remediation.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh" 2>/dev/null || exit 0
# shellcheck source=lib/agent-surface.sh
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true
# shellcheck source=lib/emit.sh
# Needed for emit_additional_context (unbound advisory below). Vendor override
# preferred over the shared default when present.
caws_source_lib emit.sh 2>/dev/null || true
parse_hook_input || exit 0

if [[ -z "${HOOK_SESSION_ID:-}" || "$HOOK_SESSION_ID" == "unknown" ]]; then
  exit 0
fi

CAWS_BIN="${CAWS_BIN:-caws}"

# ── Quarantine read (DANGER-LATCH-QUARANTINE-TRAP-001) ──────────────────────
# A session id whose danger-latch sentinel still exists is QUARANTINED: a
# restart under the same id re-enters the trap (the guard re-engages on the
# first non-read-only Bash attempt). Report that AT SESSION START so the
# session learns its status before burning a command — never block, never
# kill here (a kill at start would loop with any auto-restarting harness).
# FAIL-OPEN: any error in this read emits nothing and never blocks. Runs
# BEFORE the CLI check below: quarantine visibility must not depend on the
# caws binary being on PATH.
if [[ -f "$SCRIPT_DIR/lib/caws-state.sh" ]]; then
  # shellcheck source=lib/caws-state.sh
  source "$SCRIPT_DIR/lib/caws-state.sh" 2>/dev/null || true
fi
if command -v sanitize_session >/dev/null 2>&1; then
  _QUARANTINE_SENTINEL="${CAWS_PROJECT_DIR:-.}/${CAWS_VENDOR_DIR:-.claude}/hooks/state/danger-latch-$(sanitize_session "$HOOK_SESSION_ID").json"
  if [[ -f "$_QUARANTINE_SENTINEL" ]]; then
    emit_additional_context "CAWS QUARANTINE: this session id is TRAPPED — a danger-latch sentinel exists at $_QUARANTINE_SENTINEL. Only fixed read-only commands and the reset invocation run; every other Bash attempt is blocked, recorded as a strike, and (on kill-enabled surfaces) the first such attempt terminates this session's process. Do not attempt further non-read-only commands and do not enlist another agent. Ask the USER to run, from their own shell, the reset command the block message prints with --session $HOOK_SESSION_ID --reason '<why this is safe>'." 2>/dev/null || true
  fi
fi

# ── Pack-drift advisory (HOOKPACK-STALENESS-VISIBILITY-001) ─────────────────
# Project-local hook files SHADOW the machine runtime snapshot: a guard fix
# shipped into the runtime never reaches a repo that carries its own copy of the
# stock handler until someone ports it — and nothing says so. Compare the
# installed stock files against the pinned runtime snapshot and name the
# differing ones.
#
# Why normalized CONTENT and not the manifest hashes: `caws init` stamps the
# project copy's header with the installing CLI's pack version
# (`hook_pack_version: 67`) while the runtime snapshot keeps the template's
# literal (`hook_pack_version: 1`). EVERY installed stock file therefore differs
# from its manifest hash by that one line, so a hash comparison reports the
# whole pack as drift on a clean install and is worth nothing. The version stamp
# is the only install-time rewrite (measured exhaustively: 50/50 present stock
# files differ by that line and nothing else), and it is neutralized on BOTH
# sides with the normalizer the CLI itself uses for the same comparison in
# src/init/system-runtime.ts. The stamp appears in two header syntaxes — the
# comment form (`hook_pack_version: N`) and the JSON-description form that JSON
# templates must use because JSON has no comments (`hook_pack_version=N`) — so
# the normalizer must match both, or every JSON managed file reports as drift on
# a clean install. A genuine repo-local edit survives it and is reported.
#
# READ-ONLY + FAIL-OPEN: reads the runtime pointer, its manifest and the
# installed files, emits at most one bounded context line, and emits NOTHING
# (never blocks) when the pointer, manifest, node, or any file is unavailable.
# A customized project file is REPORTED, never overwritten, reverted or refused;
# the message routes to `caws init --plan` / `init diff` (review) and
# `caws init port` (sanctioned port). Runs BEFORE the CLI check below because it
# does not depend on the caws binary.
if [[ "${CAWS_PACK_STALENESS_CHECK:-1}" != "0" ]] && command -v node >/dev/null 2>&1; then
  _PACK_DRIFT_CTX="$(
    CAWS_PACK_DRIFT_HOME="${CAWS_HOME:-${HOME:-}/.caws}" \
    CAWS_PACK_DRIFT_HOOKS_DIR="$SCRIPT_DIR" \
    node -e '
      const fs = require("fs");
      const path = require("path");
      const crypto = require("crypto");
      const HEX = /^[a-f0-9]{64}$/;
      const home = process.env.CAWS_PACK_DRIFT_HOME || "";
      const hooks = process.env.CAWS_PACK_DRIFT_HOOKS_DIR || "";
      if (!home || !hooks) process.exit(0);
      const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
      const normalize = (text) =>
        text.replace(/hook_pack_version\s*[:=]\s*\d+/g, "hook_pack_version: N");
      let pointer;
      try {
        pointer = JSON.parse(fs.readFileSync(path.join(home, "state/adapter-runtime.json"), "utf8"));
      } catch { process.exit(0); }
      if (!pointer || !HEX.test(pointer.digest || "")) process.exit(0);
      const snapshot = path.join(home, "lib/runtimes", pointer.digest);
      let raw;
      try { raw = fs.readFileSync(path.join(snapshot, "manifest.json"), "utf8"); } catch { process.exit(0); }
      if (sha(raw) !== pointer.digest) process.exit(0);
      let manifest;
      try { manifest = JSON.parse(raw); } catch { process.exit(0); }
      if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) process.exit(0);
      const drift = [];
      for (const relative of Object.keys(manifest)) {
        if (relative.split("/").includes("..")) continue;
        let installed;
        try { installed = fs.readFileSync(path.join(hooks, relative)); } catch { continue; }
        let pinned;
        try { pinned = fs.readFileSync(path.join(snapshot, relative)); } catch { continue; }
        if (installed.equals(pinned)) continue;
        if (installed.includes(0) || pinned.includes(0)) { drift.push(relative); continue; }
        if (normalize(installed.toString("utf8")) !== normalize(pinned.toString("utf8")))
          drift.push(relative);
      }
      if (drift.length === 0) process.exit(0);
      const MAX = 5;
      const shown = drift.slice(0, MAX).join(", ");
      const extra = drift.length > MAX ? " (+" + (drift.length - MAX) + " more)" : "";
      process.stdout.write(
        "CAWS pack drift: " + drift.length + " installed stock hook file(s) differ from the pinned machine runtime — " +
        shown + extra + ".\n" +
        "These project-local copies shadow the runtime, so runtime fixes do not reach this repo until ported.\n" +
        "Review: caws init --plan (or caws init diff). Port deliberately: caws init port.\n" +
        "Advisory only — nothing was modified. Silence with CAWS_PACK_STALENESS_CHECK=0."
      );
    ' 2>/dev/null
  )" || _PACK_DRIFT_CTX=""

  if [[ -n "$_PACK_DRIFT_CTX" ]] && command -v emit_additional_context >/dev/null 2>&1; then
    emit_additional_context "$_PACK_DRIFT_CTX" 2>/dev/null || true
  fi
fi

if ! command -v "$CAWS_BIN" >/dev/null 2>&1; then
  exit 0
fi

caws_run_cli agents register \
  --session-id "$HOOK_SESSION_ID" \
  --platform "$CAWS_PLATFORM_FLAG" \
  2>/dev/null || true

# ── Unbound-session advisory (PRESENCE-DECISION-POINT-INJECTION-001) ────────
# Entry 12/16/36/37 class: a session that starts unbound in a repo with active
# specs has no write authority, and nothing says so until the first refusal —
# by then the agent has already authored work in the wrong place. Compose the
# EXISTING read-only `caws scope show --json` surface (its no-authority
# remediation carries authorityCandidates with the active spec ids) into
# SessionStart context naming the exact `caws worktree create` command.
#
# FAIL-CLOSED-NON-BLOCKING: advisory only. Any failure — CLI absent (already
# exited above), CLI error, malformed JSON, bound checkout (decision !=
# no_authority), no active specs — emits nothing and never blocks the session.
_SCOPE_QUERY="${HOOK_CWD:-$PWD}"
_UNBOUND_CTX="$(
  caws_run_cli scope show "$_SCOPE_QUERY" --json 2>/dev/null | node -e '
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { raw += c; });
    process.stdin.on("end", () => {
      let parsed;
      try { parsed = JSON.parse(raw); } catch { process.exit(0); }
      if (!parsed || parsed.decision !== "no_authority") process.exit(0);
      const cands = Array.isArray(parsed.authorityCandidates)
        ? parsed.authorityCandidates.filter((c) => c && typeof c.specId === "string")
        : [];
      if (cands.length === 0) process.exit(0);
      const MAX = 3;
      const shown = cands.slice(0, MAX).map((c) => c.specId);
      const extra = cands.length > MAX
        ? "\n  ... and " + (cands.length - MAX) + " more — caws specs list --status active"
        : "";
      const first = cands[0].specId;
      const ctx =
        "CAWS: this session has NO write authority here (unbound — this checkout is not a spec-bound worktree; the kernel will refuse every governed edit).\n" +
        "Active spec(s) in this repo:\n" +
        "  " + shown.join("\n  ") + extra + "\n" +
        "Create your isolated lane before editing (replace <name>) — idempotent: an existing untouched lane admits:\n" +
        "  caws worktree ensure <name> --spec " + first + "\n" +
        "Read-only checks first if unsure: caws scope show <path> --spec " + first + " ; caws agents list ; caws status\n" +
        "Advisory only — authority is conferred by the worktree binding, not by this message.";
      process.stdout.write(ctx);
    });
  ' 2>/dev/null
)" || _UNBOUND_CTX=""

if [[ -n "$_UNBOUND_CTX" ]]; then
  emit_additional_context "$_UNBOUND_CTX" 2>/dev/null || true
fi

exit 0
