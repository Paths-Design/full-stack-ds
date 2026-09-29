#!/usr/bin/env python3
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 1,17
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
"""
Command safety classifier for CAWS PreToolUse hooks (surface-neutral).

Segments shell commands, parses them individually, and classifies each
as allow / confirm / deny based on tiered policy.

Output: JSON object with keys:
  decision: "allow" | "ask" | "deny"
  reason:   human-readable explanation (empty string for allow)

Usage:
  echo "$COMMAND" | python3 classify_command.py [--repo-root DIR] [--home DIR]
"""

from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Paths that are safe targets for recursive deletion (relative to repo root).
# After normalization, if the resolved path starts with one of these, allow.
SAFE_DELETE_PREFIXES: list[str] = [
    "target/",
    "tmp/",
    ".pytest_cache/",
    "node_modules/",
    "__pycache__/",
]

# Absolute system scratch roots that are safe targets for recursive deletion
# regardless of repo. Agents routinely create-and-tear-down fixtures under the
# OS temp dir (e.g. `mktemp -d`, or `/tmp/<scratch>`), and latching that flow
# as "catastrophic delete" is the over-trigger that DANGER-LATCH-UX-001 fixes.
# A recursive delete whose resolved path is STRICTLY BELOW one of these roots
# (not the root itself) is admitted; deletes of the temp root itself, or of
# repo/home/filesystem paths, remain governed (see the hard-block checks in
# classify_rm_target, which run first). $TMPDIR (macOS: /var/folders/.../T)
# is added at runtime. Realpath-normalized so /tmp -> /private/tmp on macOS
# both match.
SYSTEM_TMP_PREFIXES: list[str] = [
    "/tmp/",
    "/private/tmp/",
    "/private/var/folders/",
    "/var/folders/",
]

# Pipeline-aware deny patterns: matched against the FULL raw command string
# BEFORE segmentation.  These detect cross-pipeline dangers like curl|sh and
# fork bombs whose syntax spans segment boundaries.
#
# IMPORTANT: these patterns are matched against `executable_surface`, which
# has had quoted regions (single + double quotes) replaced with spaces by
# strip_quoted_regions. That is what gives us quote-safety — a literal
# `tail x | sh` inside a quoted string is replaced with whitespace before
# the regex runs, so it does not trigger.
DENY_PIPELINE_PATTERNS: list[tuple[str, str]] = [
    # Pipe-to-shell (network exfiltration) — historical curl/wget pattern,
    # kept for diagnostic-reason specificity. The generic rule below also
    # catches these; this pattern fires first to give a clearer reason.
    (r"\b(curl|wget)\b[^|]*\|\s*(ba)?sh\b", "pipe-to-shell execution"),
    # Generic pipe-to-shell — any command piped into bash/sh execution.
    # Catches `tail x | sh`, `cat script | bash`, `head install.sh | sh`,
    # etc. The leading `[^|]` (non-pipe, non-empty char before the pipe)
    # ensures we do not false-match `||` (logical OR). The trailing `\b`
    # ensures we do not match `bash-completion` or similar word-extended
    # forms. Quote-safety is provided by strip_quoted_regions upstream.
    #
    # NOTE: this pattern matches the pipe-to-LOCAL-SCRIPT form too (`| bash
    # run.sh`); that form is carved back to allow by is_pipe_into_local_script()
    # at the application site (CAWS-CLASSIFY-PIPE-TO-LOCAL-SCRIPT-CARVEOUT-001),
    # NOT here — keeping the regex simple and the carve-out logic testable.
    (r"[^|]\|\s*(ba)?sh\b", "generic pipe-to-shell execution — pipe target is a shell interpreter"),
    # Fork bombs — special syntax that segmentation mangles
    (r":\(\)\s*\{.*:\|:.*\}\s*;\s*:", "fork bomb"),
    (r"\bwhile\s+true\b.*\bfork\b", "fork loop"),
]

# The exact `desc` of the generic pipe-to-shell rule above. The application site
# uses this sentinel to apply the pipe-to-local-script carve-out only to the
# GENERIC rule, never to the curl/wget rule (whose remote-fetch danger is real
# regardless of whether a script file is named).
GENERIC_PIPE_TO_SHELL_DESC = (
    "generic pipe-to-shell execution — pipe target is a shell interpreter"
)

# Matches `| bash` / `| sh` occurrences and captures the run of characters up to
# (but not consuming) the next pipe/separator, so a CHAINED second interpreter
# (`| bash run.sh | sh`) is still seen as its own occurrence. Used by
# is_pipe_into_local_script to inspect EVERY pipe-to-shell in the surface.
#   * `(?<!\|)\|(?!\|)` matches a SINGLE pipe (a real pipeline), never `||`
#     (logical OR), using look-around so no surrounding char is consumed — this
#     lets two adjacent occurrences both match.
#   * `(?=[|&;\n]|$)` leaves the boundary char for the next match.
_PIPE_TO_SHELL_OCCURRENCE = re.compile(r"(?<!\|)\|(?!\|)\s*(?:ba)?sh\b([^|&;\n]*?)(?=[|&;\n]|$)")


def is_pipe_into_local_script(executable_surface: str) -> bool:
    """Pipe-to-LOCAL-SCRIPT carve-out (CAWS-CLASSIFY-PIPE-TO-LOCAL-SCRIPT-CARVEOUT-001).

    Return True iff EVERY `| bash` / `| sh` occurrence in the (quote-stripped)
    surface pipes into a NAMED, inspectable script-FILE argument — e.g.
    `printf json | bash hook.sh`, `cat x | sh ./run.sh`. Such a command runs the
    inspectable file, not the piped bytes, so it is safe-by-inspection and the
    generic pipe-to-shell deny is carved back to allow.

    Returns False (deny stands) if ANY occurrence is a BARE interpreter or one
    whose first argument is NOT a plain script file, specifically:
      * bare `| bash` / `| sh` (no argument)            -> reads piped bytes
      * a flag first (`-s`, `-`, `-c`, `-e`, ...)         -> reads stdin/inline
      * a redirect first (`2>&1`, `>out`, `< in`, `1>&2`) -> still bare
    Requiring ALL occurrences to be the script form means a mixed pipeline like
    `cat x | bash run.sh | sh` still denies (the second `| sh` is bare).
    A trailing danger after an allowed form (`| bash run.sh; rm -rf /`) is NOT
    this function's concern — it is caught by per-segment classification, which
    runs independently of the pipeline rule.
    """
    occurrences = _PIPE_TO_SHELL_OCCURRENCE.findall(executable_surface)
    if not occurrences:
        return False
    for tail in occurrences:
        first = tail.strip().split(maxsplit=1)
        if not first:
            return False  # bare `| bash` — reads the piped bytes
        token = first[0]
        if token.startswith("-"):
            return False  # a flag (-s/-/-c) — script comes from stdin/inline
        # A redirect operator (optionally fd-prefixed: 2>&1, 1>file) is not a
        # script-file argument; the interpreter is still bare with redirected fds.
        if re.match(r"^\d*[<>]", token):
            return False
        # Otherwise `token` is a named script-file path — safe-by-inspection.
    return True

# Segment-level regex patterns that are always hard-blocked.
# These are matched against individual parsed command segments, NOT the raw
# command string.  Quoted literals in other segments will not trigger them.
DENY_SEGMENT_PATTERNS: list[tuple[str, str]] = [
    # System destruction
    (r"\bdd\b.*\bif=/dev/(zero|random)\b", "dd with destructive input"),
    (r"\bmkfs\.", "filesystem format"),
    (r"\bfdisk\b", "disk partitioning"),
    (r">\s*/dev/sd", "raw device write"),
    # Permission escalation
    (r"\bchmod\b.*\+s\b", "setuid/setgid bit"),
    (r"\bchmod\b.*\b777\b", "chmod 777"),
    # System control
    (r"\b(shutdown|reboot)\b", "system shutdown/reboot"),
    (r"\binit\s+[06]\b", "system runlevel change"),
    # CAWS-DANGER-LATCH-CATASTROPHIC-ONLY-001: catastrophic git/shell ops
    # promoted here from CONFIRM (ask) so they HARD-BLOCK. These are the
    # irreversible / history-rewriting / credential-exposing operations
    # (force-push to origin, history rewrite, deleted-tag push) that are
    # treated as deny-class. Previously they were "ask" and relied on the
    # warn-then-latch path for enforcement; now that ask-class is allowed
    # without latching, they must be deny to stay enforced.
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard"),
    (r"\bgit\s+push\s+(-f\b|--force\b|--force-with-lease\b)", "git force push"),
    (r"\bgit\s+clean\s+-[a-zA-Z]*f", "git clean with force"),
    (r"\bgit\s+checkout\s+\.\s*$", "git checkout . (discard all changes)"),
    (r"\bgit\s+restore\s+\.\s*$", "git restore . (discard all changes)"),
    (r"^sudo\s+(?!npm|yarn|pnpm|brew|apt-get|apt|dnf|yum)", "sudo command"),
    # CLASSIFY-CREDENTIAL-PUBLIC-FILE-EXCLUSION-001: credential reads stay
    # catastrophic/latch-arming — the content enters the model context and is
    # transmitted to the provider, so the disclosure is irreversible — but the
    # selector must not match files that are public BY CONSTRUCTION, where no
    # disclosure is possible. A committed template (`.env.example` and friends)
    # is exactly the artifact an agent should read to learn which variables the
    # project expects; denying it hard-blocked a security-hardening task, armed
    # the latch, and killed the session over a file with four EMPTY values.
    # `*.pub` likewise: a public key exists to be distributed.
    # The lookahead is on the FILE selector only, so naming a template
    # alongside a real credential still denies.
    (r"\bcat\b.*(\.env(?!\.(example|sample|template|dist|defaults)\b)|\.ssh/(?![^\s]*\.pub\b)|\.aws/)", "credential file read"),
    (r"\bcat\b.*/etc/(passwd|shadow)\b", "system credential read"),
    (r"\bcat\b.*(id_rsa(?!\.pub\b)|credentials)\b", "credential file read"),
    # CLASSIFY-CREDENTIAL-READ-VERB-COVERAGE-001: a credential read is
    # catastrophic wherever it happens, not only through `cat`. `head .env` and
    # `cp .env /tmp/x` disclose exactly as `cat .env` does — the second while
    # also depositing the secret where a later command can read it.
    #
    # ANCHORED TO COMMAND POSITION on purpose, unlike the `cat` alternatives
    # above. head/tail/less/more/od/strings are ordinary English words, and an
    # unanchored alternation would match unquoted prose — `git commit -m add
    # more .env handling` would hard-deny and arm the latch. Quoted content is
    # already stripped before these patterns run, so anchoring closes the
    # remaining residue. Anchoring can only ADD coverage: every command these
    # match is admitted today.
    #
    # PATTERN-TAKING TOOLS ARE DELIBERATELY ABSENT. `grep`, `rg`, `sed` and
    # `awk` accept the credential name as a PATTERN, not a path — and
    # `git ls-files | grep -E "\.env"` is the security check whose
    # false-positive hard-deny armed the latch and killed a session. Admitting
    # them here would reintroduce exactly that incident.
    (r"(^|[|;&(])\s*(head|tail|less|more|base64|xxd|od|strings|cp)\b.*(\.env(?!\.(example|sample|template|dist|defaults)\b)|\.ssh/(?![^\s]*\.pub\b)|\.aws/|id_rsa(?!\.pub\b)|credentials\b)", "credential file read"),
    (r"(^|[|;&(])\s*(head|tail|less|more|base64|xxd|od|strings|cp)\b.*/etc/(passwd|shadow)\b", "system credential read"),
    # CAWS spec/policy/waiver protection (RC defect #8).
    # Naked rm/mv on .caws/specs/, .caws/policy.yaml, or .caws/waivers/ bypasses
    # the audit trail. Use `caws specs close|archive`, `caws waiver revoke`,
    # or edit policy.yaml in place via Edit (not Bash) instead.
    (r"\b(rm|mv)\b[^\n]*\.caws/specs/[^\s'\"]*\.ya?ml\b",
     "naked rm/mv on .caws/specs/*.yaml — use `caws specs close|archive <id>`"),
    (r"\b(rm|mv)\b[^\n]*\.caws/policy\.ya?ml\b",
     "naked rm/mv on .caws/policy.yaml — policy is governed; use Edit and a CAWS waiver"),
    (r"\b(rm|mv)\b[^\n]*\.caws/waivers/[^\s'\"]*\.ya?ml\b",
     "naked rm/mv on .caws/waivers/*.yaml — use `caws waiver revoke <id>`"),
]

# Segment-level deny patterns that must see the RAW segment (argument values).
#
# CLASSIFY-OWNER-IMPERSONATION-DENY-001 (failure-lineage Entry 40, doctrine
# documented but previously unimplemented). An approver/revoker field on a
# bounded exception exists so a HUMAN owns the bypass; an agent that self-grants
# and writes the machine owner's identity into that field removes the only thing
# the field is for, and the claim is durable — it lands in git and every later
# reader takes it for a real human decision. Nothing else catches this: the path
# guards fire on rm/mv of the waiver file, and no guard reads the SEMANTICS of
# an identity value.
#
# These read ARGUMENT VALUES, which are quoted in real invocations, so they must
# run against `segment`, NOT the quote-stripped `segment_surface` — the quoting
# is exactly what makes this class invisible to surface-level checks.
#
# The identity alternation is built per call by _owner_identity_alternation():
# the generic "user" token, additive CAWS_OWNER_IDENTITIES values, and the
# home-directory basename (the human who owns this machine). Keying on an
# ADJACENT attribution token rather than the handle alone keeps read-only
# auditing (grep for the key, cat a waiver, git log) admissible; only the act of
# ATTRIBUTING authorization trips. Known false positive: writing a literal
# approver-key-plus-handle string in a grep or a commit message — grep the key
# alone instead.
DENY_RAW_SEGMENT_PATTERNS: list[tuple[str, str]] = [
    (
        r"(?i)--(approved-by|revoked-by|approver|granted-by|authorized-by)"
        r"[=\s]+['\"]?[^\s'\"]*?@?(?:{OWNER})\b",
        "agent signing the machine owner's identity into an authorization flag — "
        "an approver field means a HUMAN owned the bypass; pass your agent "
        "session id (claude-agent:<session-id>), or ask the owner to grant it",
    ),
    (
        r"(?i)\b(approved_by|revoked_by|approver|authorized_by|granted_by)"
        r"\s*:\s*['\"]?[^\s'\"]*?@?(?:{OWNER})\b",
        "agent writing the machine owner's identity into an authorization field — "
        "an approver field means a HUMAN owned the bypass; write your agent "
        "session id (claude-agent:<session-id>), or ask the owner to grant it",
    ),
]


def _owner_identity_alternation(home: Path | None) -> str:
    """Regex alternation of spellings meaning 'the human who owns this machine'.

    Deliberately generic rather than owner-hardcoded: the generic "user" token,
    any CAWS_OWNER_IDENTITIES values (comma/space separated, additive so a
    configured alias never weakens the defaults), and the home-directory
    basename. Pure and offline: no subprocess, no git, no filesystem read.
    """
    tokens = ["user"]
    for token in re.split(r"[,\s]+", os.environ.get("CAWS_OWNER_IDENTITIES", "")):
        if token and token not in tokens:
            tokens.append(token)
    if home is not None:
        base = Path(home).name
        if base and base not in tokens:
            tokens.append(base)
    return "|".join(re.escape(token) for token in tokens)


# Segment-level regex patterns that require user confirmation (ask).
#
# CAWS-DANGER-LATCH-CATASTROPHIC-ONLY-001: ask-class commands are now ALLOWED
# without latching (see block-dangerous.sh `ask` arm). What remains here is the
# RECOVERABLE / non-catastrophic set — history-rewriting-but-reversible git
# ops and environment sprawl. The catastrophic members (force-push,
# reset --hard, clean -f, checkout./restore. discard, chmod 777, sudo,
# credential reads) were PROMOTED to DENY_SEGMENT_PATTERNS so they still
# hard-block. Anything left in this list is flagged with a non-blocking
# advisory and allowed to run.
CONFIRM_SEGMENT_PATTERNS: list[tuple[str, str]] = [
    # Git history replay — recoverable (reflog), not catastrophic.
    (r"\bgit\s+rebase\b", "git rebase (rewrites branch history)"),
    (r"\bgit\s+cherry-pick\b", "git cherry-pick (replays commits across branches)"),
    # History manipulation (shell history clear — recoverable annoyance).
    (r"\bhistory\s+-c\b", "history clear"),
    # venv creation (sprawl prevention — advisory only).
    (r"\bpython3?\s+-m\s+venv\b", "virtual environment creation"),
    (r"\bvirtualenv\s", "virtual environment creation"),
    (r"\bconda\s+create\b", "conda environment creation"),
]

GIT_GLOBAL_OPTIONS_WITH_VALUE: set[str] = {
    "-C",
    "-c",
    "--git-dir",
    "--work-tree",
    "--namespace",
    "--exec-path",
}

GIT_GLOBAL_OPTIONS_NO_VALUE: set[str] = {
    "--bare",
    "--no-pager",
    "--paginate",
    "--no-replace-objects",
    "--literal-pathspecs",
    "--glob-pathspecs",
    "--noglob-pathspecs",
    "--icase-pathspecs",
}

COMMAND_WRAPPERS: set[str] = {
    "builtin",
    "command",
    "nohup",
}

SHELL_C_WRAPPERS: set[str] = {
    "bash",
    "dash",
    "sh",
    "zsh",
}


# ---------------------------------------------------------------------------
# DANGER-LATCH-CALIBRATION-001 — explicit allow-list of read-only surface
# ---------------------------------------------------------------------------
# Hybrid fail-closed semantics: for `git`, `gh`, and `npm` (the three
# governed command families), a subcommand NOT on the allow-list and NOT
# matched by any deny/confirm pattern resolves to "ask". Other commands
# keep the existing classifier default. The allow-list itself is
# command+subcommand specific — `gh pr view` is admitted, `gh pr merge`
# is not (it falls through to ask). See spec invariant for the full
# canonical surface.
#
# IMPORTANT: editing this allow-list weakens or expands the agent-
# boundary guard. Add a name only after confirming it is observational
# (no filesystem mutation, no network write, no privileged operation,
# no irreversible state change to GitHub / npm / git).

# Top-level simple commands that are read-only file inspection or search.
# Matched by exact basename of the segment's first executable token.
# These do NOT have subcommands worth tracking; presence of the name is
# enough.
ALLOWED_SIMPLE_COMMANDS: set[str] = {
    # File inspection
    "tail", "head", "cat", "less", "more", "wc", "stat", "file",
    "du", "df", "ls", "tree",
    # Search
    "grep", "rg",
    # `find` is NOT in this set because of -delete/-exec/-execdir/-fprint/-ok;
    # classify_allow_list handles find specifically.
}

# Allowed git subcommands.
#
# Two classes live here:
#   - Read-only inspection: status, log, diff, show, branch, tag, remote,
#     config, rev-parse, ls-files, blame (gated to read-only forms in
#     classify_allow_list).
#   - Everyday-workflow writes that have never been a loss or attribution
#     risk: "add" and "commit". These mutate the index / create a new commit
#     object but do not rewrite history, discard working-tree state, or touch
#     a remote. Their dangerous variants ("commit" with --amend) are
#     special-cased to "ask" in classify_allow_list, and worktree-guard.sh
#     independently governs commit-on-main / inherited-dirty-state
#     coordination. Branch-creating
#     "checkout -b" / "switch -c" are admitted by their own special-cases;
#     bare "checkout <path>" / "checkout ." stay denied by
#     CONFIRM_SEGMENT_PATTERNS because they discard changes.
#
# Why widen: the prior read-only-only calibration swept plain "git add" /
# "git commit" into "unknown git subcommand -> ask", and an "ask" engages
# the sticky session latch. That trapped agents on the CAWS-documented
# happy path (commit the spec on main, then create the worktree): the
# first commit of real work latched the session and hard-blocked every
# subsequent Bash call. The latch must fire on panic/bypass patterns
# (flag-split git-bootstrap, force-push, rm -rf), not on calm everyday
# commits. The latch -- not the allow-list -- is the deep control: the
# allow-list keeps the happy path calm, the latch catches the bypass.
ALLOWED_GIT_SUBCOMMANDS: set[str] = {
    "status", "log", "diff", "show", "branch", "tag",
    "remote", "config", "rev-parse", "ls-files", "blame",
    "add",
    # DANGER-LATCH-APPROVAL-AND-FEEDBACK-001: read-only plumbing verbs that
    # compute/inspect against the object database and refs WITHOUT mutating
    # any ref, working tree, or index. They were previously classified
    # "unknown git subcommand -> ask", which BOTH blocked them AND armed the
    # session latch — defeating the read-only-survival guarantee for exactly
    # the "inspect before you mutate" commands an agent should be encouraged
    # to run (observed: `git merge-tree --write-tree` and `git check-ignore`
    # each armed the latch mid-slice while only INSPECTING state).
    #   - merge-tree: `--write-tree` writes only loose objects + prints a tree
    #     sha; touches no ref/index/worktree. Plain merge-tree is a pure read.
    #   - cat-file:   pure object-db read (-p / -t / -s / --batch).
    #   - rev-list:   pure ref/commit-graph read.
    #   - check-ignore: pure gitignore-rule inspection (reads .gitignore +
    #     index; writes nothing).
    # Narrow by design: mutating plumbing (update-ref, commit-tree, a bare
    # write-tree index write, hash-object -w as an index mutation) is NOT
    # admitted and still falls through to the governed-family "ask".
    "merge-tree", "cat-file", "rev-list", "check-ignore",
}

# Allowed gh top-level groups + subcommands. Format: "group action".
# Example: "pr view" means `gh pr view ...` is admitted.
# `gh api` is handled specifically by gh_api_method() because its
# admit decision depends on -X verb, not subcommand structure.
ALLOWED_GH_ACTIONS: set[str] = {
    "pr view", "pr status", "pr list", "pr checks", "pr diff",
    "run view", "run list",
    "issue view", "issue list",
    "repo view",
    "release view", "release list",
    # `gh api` admitted only when -X is absent or -X is GET (separate logic)
}

# Mutating gh actions that the allow-list explicitly REJECTS (returns ask).
# These exist because `gh` as a top-level command is not whitelisted; only
# named read-only subcommands are. But for clarity (and to surface a
# specific reason in diagnostics), we name the mutating ones explicitly.
# Note: appearance here does NOT make the command a hard deny — only ask.
GH_MUTATING_ACTIONS: set[str] = {
    "pr merge", "pr edit", "pr close", "pr reopen", "pr ready",
    "pr comment", "pr review",
    "run rerun", "run cancel",
    "workflow run", "workflow enable", "workflow disable",
    "release create", "release edit", "release delete",
    "issue create", "issue edit", "issue close",
}

# Allowed npm subcommands (read-only).
ALLOWED_NPM_SUBCOMMANDS: set[str] = {
    "view", "whoami", "config", "ls", "outdated", "explain",
    # `npm pack --dry-run` is admitted; bare `npm pack` is not (handled separately)
}

# Top-level command names that participate in HYBRID FAIL-CLOSED semantics.
# For commands in this set, an unknown subcommand (one not on the
# allow-list and not matched by any deny/confirm pattern) resolves to
# "ask", not the default "allow". Outside this set, the classifier's
# global default applies.
GOVERNED_FAMILIES: set[str] = {"git", "gh", "npm"}


# ===========================================================================
# CAPABILITY ENGINE — Slice 0 scaffolding (HOOK-CAPABILITY-ENGINE-000)
# ---------------------------------------------------------------------------
# This block adds the capability-classification scaffolding: a typed
# CommandFact, the abstract facet model, the facet->decision lattice, a
# shared recursion budget, and the user-extensible adapter sidecar loader.
#
# ZERO RUNTIME DECISION CHANGE IN SLICE 0: the capability pass
# (classify_capability_pass) is a stub that always returns None, so every
# command receives the identical decision it did before this block existed.
# The facet model + lattice are DATA here; Slices 2-3 activate them.
#
# Doctrine: docs/architecture/command-capability-taxonomy.md is the governed
# source of truth. The lattice reads ABSTRACT FACETS, never concrete tool
# tokens. Concrete labels are trace/debug only.
# ===========================================================================

# Shared recursion budget. One budget bounds total re-entry depth across
# segmentation, nested-shell unwrap, command substitution, and (future)
# opaque-exec recursion. Exhaustion yields a conservative "ask", never an
# unbounded recursion / stack overflow in the hook.
MAX_RECURSION_DEPTH: int = 8

# Closed facet enums (mirror of command-adapters.schema.json + the doctrine
# doc). The lattice is defined over these abstract values only.
FACET_KINDS: set[str] = {
    "READ", "MUTATE", "DESTROY", "EXEC", "PRIV_ESC", "SECRETS_READ", "NONE",
}
FACET_DOMAINS: set[str] = {
    "local", "remote_orchestrator", "cloud", "container", "iac", "http",
    "process", "filesystem", "unknown",
}
FACET_SCOPES: set[str] = {"narrow", "broad", "prod", "unknown"}
FACET_REVERSIBILITY: set[str] = {"reversible", "partial", "irreversible", "unknown"}
FACET_OPACITY: set[str] = {"literal", "opaque", "none"}
FACET_BLAST: set[str] = {"single", "multi", "host", "cluster", "unknown"}

# Mutation-amplifier flags. These raise scope/reversibility, but ONLY in the
# presence of a mutation/destroy kind — a bare amplifier on a READ does not
# escalate (avoids the routine-dev-loop overblock the regex proposal caused).
MUTATION_AMPLIFIER_FLAGS: set[str] = {
    "--force", "-f", "--recursive", "-r", "-R", "--all", "--auto-approve",
    "-y", "--yes", "--prune", "--delete", "--destroy", "--volumes",
}

# Scope indicators that raise scope to broad/prod.
BROAD_SCOPE_INDICATORS: set[str] = {"--all", "-A", "--all-namespaces"}
PROD_SCOPE_INDICATORS: set[str] = {"prod", "production", "staging", "live"}

# Exec-family executables whose argument is further code to run. For these,
# build_command_fact records a structural payload + opacity fact (literal vs
# opaque expansion). Slice 1 only POPULATES these facts (shadow); Slice 2/3
# wire the opaque-exec recursion that acts on them.
OPAQUE_EXEC_EXECUTABLES: set[str] = {
    "sh", "bash", "zsh", "dash", "eval", "exec", "xargs",
    "python", "python3", "node", "ruby", "perl",
}

# ---------------------------------------------------------------------------
# Built-in default adapters (the corpus-surfaced first adapters).
# Maps an executable to subcommand-prefix -> base facet assignment. The BASE
# facet carries the HONEST reversibility per the architecture doc's stated
# lattice (docs/architecture/command-capability-taxonomy.md + surgery-ward
# terminal-use.commandfact-architecture.md lines 96-126,163-170). Amplifier
# flags (derive_facets) then TIGHTEN reversibility/scope — they never fire on
# their own. Concrete `trace` labels are debug-only; the lattice reads facets.
#
# Calibration notes (architecture-doc-grounded, NOT corpus-label-fitted):
#   kill -9 / kill <pid> -> PROC kind=DESTROY reversibility=partial (ask-class:
#     a process can be restarted; line 168 "kill -9 ... ask-class").
#   pkill/killall -> broad blast (pattern kill), still partial -> ask.
#   cloud rm/delete -> partial -> ask; --recursive amplifier -> deny (line 115).
#   docker system prune -> partial -> ask; --volumes amplifier -> deny (line 107).
#   shred -> irreversible -> deny (line 122,170). truncate -s 0 -> irreversible
#     -> deny (doc lines 122,170 classify it deny-class; the CSV said ask — a
#     documented CSV-vs-doc adjudication, lattice/doc wins).
#   terraform destroy -> irreversible -> deny; apply -> partial -> ask.
#   kubectl delete <pod> -> partial -> ask; delete ns/secret/pv/--all/prod ->
#     handled by amplifier/scope -> deny.
#   curl -> HTTP_MUTATE handled separately (method from -X/-d), partial -> ask.
# Each row: (subcommand-prefix tuple) -> {kind,domain,reversibility,blast,trace}.
# () is the catch-all for the executable when no subcommand prefix matches.
DEFAULT_ADAPTERS: dict[str, list[tuple[tuple[str, ...], dict]]] = {
    "kubectl": [
        (("delete",), {"kind": "DESTROY", "domain": "remote_orchestrator",
                       "reversibility": "partial", "blast": "single", "trace": "K8S_DELETE"}),
        # Cluster-scoped resource deletes cascade and are not pod-recreatable:
        # namespace/crd/pv/pvc/secret => cluster blast + irreversible => deny
        # (doc: "delete namespace|crd|pv|secret -> deny K8S_DELETE_BROAD").
        # Longest-prefix match wins over the bare ("delete",) row above.
        (("delete", "namespace"), {"kind": "DESTROY", "domain": "remote_orchestrator",
                                   "reversibility": "irreversible", "blast": "cluster", "trace": "K8S_DELETE_BROAD"}),
        (("delete", "ns"), {"kind": "DESTROY", "domain": "remote_orchestrator",
                            "reversibility": "irreversible", "blast": "cluster", "trace": "K8S_DELETE_BROAD"}),
        (("delete", "crd"), {"kind": "DESTROY", "domain": "remote_orchestrator",
                             "reversibility": "irreversible", "blast": "cluster", "trace": "K8S_DELETE_BROAD"}),
        (("delete", "pv"), {"kind": "DESTROY", "domain": "remote_orchestrator",
                            "reversibility": "irreversible", "blast": "cluster", "trace": "K8S_DELETE_BROAD"}),
        (("delete", "pvc"), {"kind": "DESTROY", "domain": "remote_orchestrator",
                             "reversibility": "irreversible", "blast": "cluster", "trace": "K8S_DELETE_BROAD"}),
        (("delete", "secret"), {"kind": "DESTROY", "domain": "remote_orchestrator",
                                "reversibility": "irreversible", "blast": "cluster", "trace": "K8S_DELETE_BROAD"}),
        (("apply",), {"kind": "MUTATE", "domain": "remote_orchestrator",
                      "reversibility": "partial", "blast": "single", "trace": "K8S_MUTATE"}),
        (("scale",), {"kind": "MUTATE", "domain": "remote_orchestrator",
                      "reversibility": "partial", "blast": "single", "trace": "K8S_MUTATE"}),
        (("patch",), {"kind": "MUTATE", "domain": "remote_orchestrator",
                      "reversibility": "partial", "blast": "single", "trace": "K8S_MUTATE"}),
        # HOOK-CAPABILITY-ENGINE-003: exec-into-pod runs an arbitrary payload
        # inside the container (doc trace K8S_EXEC) — ask-class.
        (("exec",), {"kind": "MUTATE", "domain": "remote_orchestrator",
                     "reversibility": "partial", "blast": "single", "trace": "K8S_EXEC"}),
    ],
    "helm": [
        (("uninstall",), {"kind": "DESTROY", "domain": "remote_orchestrator",
                          "reversibility": "partial", "blast": "multi", "trace": "K8S_DELETE"}),
        (("delete",), {"kind": "DESTROY", "domain": "remote_orchestrator",
                       "reversibility": "partial", "blast": "multi", "trace": "K8S_DELETE"}),
        # HOOK-CAPABILITY-ENGINE-003: terminal-use corpus surfaced the mutating
        # bring-up verbs of already-governed families as silent allows (the
        # adapter table only covered their destroy verbs). install/upgrade/
        # rollback deploy or rewrite cluster releases -> MUTATE (ask-class).
        (("install",), {"kind": "MUTATE", "domain": "remote_orchestrator",
                        "reversibility": "partial", "blast": "multi", "trace": "K8S_MUTATE"}),
        (("upgrade",), {"kind": "MUTATE", "domain": "remote_orchestrator",
                        "reversibility": "partial", "blast": "multi", "trace": "K8S_MUTATE"}),
        (("rollback",), {"kind": "MUTATE", "domain": "remote_orchestrator",
                         "reversibility": "partial", "blast": "multi", "trace": "K8S_MUTATE"}),
    ],
    "docker": [
        (("system", "prune"), {"kind": "DESTROY", "domain": "container",
                               "reversibility": "partial", "blast": "multi", "trace": "CONTAINER_PRUNE"}),
        (("volume", "prune"), {"kind": "DESTROY", "domain": "container",
                               "reversibility": "irreversible", "blast": "multi", "trace": "CONTAINER_PRUNE"}),
        (("volume", "rm"), {"kind": "DESTROY", "domain": "container",
                            "reversibility": "irreversible", "blast": "single", "trace": "CONTAINER_VOLUME_RM"}),
        (("image", "prune"), {"kind": "DESTROY", "domain": "container",
                              "reversibility": "partial", "blast": "multi", "trace": "CONTAINER_PRUNE"}),
        # HOOK-CAPABILITY-ENGINE-003 corpus closure: container bring-up/teardown.
        (("run",), {"kind": "MUTATE", "domain": "container",
                    "reversibility": "reversible", "blast": "single", "trace": "CONTAINER_RUN"}),
        (("rm",), {"kind": "DESTROY", "domain": "container",
                   "reversibility": "partial", "blast": "single", "trace": "CONTAINER_RM"}),
        (("rmi",), {"kind": "DESTROY", "domain": "container",
                    "reversibility": "partial", "blast": "single", "trace": "CONTAINER_RM"}),
        (("compose", "up"), {"kind": "MUTATE", "domain": "container",
                             "reversibility": "reversible", "blast": "multi", "trace": "CONTAINER_RUN"}),
        (("compose", "down"), {"kind": "DESTROY", "domain": "container",
                               "reversibility": "partial", "blast": "multi", "trace": "CONTAINER_RM"}),
    ],
    "docker-compose": [
        (("up",), {"kind": "MUTATE", "domain": "container",
                   "reversibility": "reversible", "blast": "multi", "trace": "CONTAINER_RUN"}),
        (("down",), {"kind": "DESTROY", "domain": "container",
                     "reversibility": "partial", "blast": "multi", "trace": "CONTAINER_RM"}),
    ],
    "podman": [
        (("run",), {"kind": "MUTATE", "domain": "container",
                    "reversibility": "reversible", "blast": "single", "trace": "CONTAINER_RUN"}),
        (("rm",), {"kind": "DESTROY", "domain": "container",
                   "reversibility": "partial", "blast": "single", "trace": "CONTAINER_RM"}),
    ],
    "kind": [
        (("create",), {"kind": "MUTATE", "domain": "remote_orchestrator",
                       "reversibility": "reversible", "blast": "single", "trace": "K8S_MUTATE"}),
        (("delete",), {"kind": "DESTROY", "domain": "remote_orchestrator",
                       "reversibility": "partial", "blast": "single", "trace": "K8S_DELETE"}),
    ],
    "minikube": [
        (("start",), {"kind": "MUTATE", "domain": "container",
                      "reversibility": "reversible", "blast": "single", "trace": "CONTAINER_RUN"}),
        (("delete",), {"kind": "DESTROY", "domain": "container",
                       "reversibility": "partial", "blast": "single", "trace": "CONTAINER_RM"}),
    ],
    "ansible-playbook": [
        # An ansible playbook applies arbitrary remote state. () catch-all:
        # every invocation is at least MUTATE over potentially many hosts.
        ((), {"kind": "MUTATE", "domain": "remote_orchestrator",
              "reversibility": "partial", "blast": "multi", "trace": "ANSIBLE_APPLY"}),
    ],
    # HOOK-CAPABILITY-ENGINE-003: privilege/kernel/identity surface the corpus
    # found silently allowed. doas is sudo-equivalent -> PRIV_ESC (lattice
    # denies, same posture as the sudo regex). Kernel-module and namespace ops
    # mutate host state -> ask-class. ssh-copy-id writes a credential to a
    # remote host -> ask-class.
    "doas": [
        ((), {"kind": "PRIV_ESC", "domain": "local",
              "reversibility": "unknown", "blast": "host", "trace": "PRIV_ESC"}),
    ],
    "modprobe": [
        ((), {"kind": "MUTATE", "domain": "local",
              "reversibility": "partial", "blast": "host", "trace": "KERNEL_MODULE"}),
    ],
    "insmod": [
        ((), {"kind": "MUTATE", "domain": "local",
              "reversibility": "partial", "blast": "host", "trace": "KERNEL_MODULE"}),
    ],
    "rmmod": [
        ((), {"kind": "MUTATE", "domain": "local",
              "reversibility": "partial", "blast": "host", "trace": "KERNEL_MODULE"}),
    ],
    "chroot": [
        ((), {"kind": "MUTATE", "domain": "process",
              "reversibility": "partial", "blast": "host", "trace": "NS_ENTER"}),
    ],
    "unshare": [
        ((), {"kind": "MUTATE", "domain": "process",
              "reversibility": "partial", "blast": "host", "trace": "NS_ENTER"}),
    ],
    "nsenter": [
        ((), {"kind": "MUTATE", "domain": "process",
              "reversibility": "partial", "blast": "host", "trace": "NS_ENTER"}),
    ],
    "ssh-copy-id": [
        ((), {"kind": "MUTATE", "domain": "remote_orchestrator",
              "reversibility": "partial", "blast": "single", "trace": "REMOTE_CRED_WRITE"}),
    ],
    "dd": [
        # Plain file-to-file dd is a recoverable write (ask-class). dd onto a
        # block device is covered by the existing deny patterns.
        ((), {"kind": "MUTATE", "domain": "filesystem",
              "reversibility": "partial", "blast": "single", "trace": "FS_DD"}),
    ],
    "terraform": [
        (("destroy",), {"kind": "DESTROY", "domain": "iac",
                        "reversibility": "irreversible", "blast": "multi", "trace": "IAC_DESTROY"}),
        (("apply",), {"kind": "MUTATE", "domain": "iac",
                      "reversibility": "partial", "blast": "multi", "trace": "IAC_APPLY"}),
    ],
    "pulumi": [
        (("destroy",), {"kind": "DESTROY", "domain": "iac",
                        "reversibility": "irreversible", "blast": "multi", "trace": "IAC_DESTROY"}),
        (("up",), {"kind": "MUTATE", "domain": "iac",
                   "reversibility": "partial", "blast": "multi", "trace": "IAC_APPLY"}),
    ],
    # cloud CLIs: a delete/rm verb in the subcommand path -> DESTROY (partial;
    # --recursive amplifier tightens to deny). Catch-all matched via verb scan
    # in derive_facets (any positional in DESTROY_VERBS) so az vm delete,
    # aws s3 rm, gcloud ... delete all resolve without enumerating every service.
    "shred": [
        ((), {"kind": "DESTROY", "domain": "filesystem",
              "reversibility": "irreversible", "blast": "single", "trace": "FS_SHRED"}),
    ],
    "truncate": [
        # truncate -s 0 zeroes a file's contents but the inode/path survive and
        # the file is rewritable. Doc lines 122/170: "ask/deny outside scratch."
        # Base = partial (ask); the deny-OUTSIDE-scratch refinement needs scratch
        # vs non-scratch path detection, which is Slice 3. Until then, ask-class
        # matches both the corpus (expected ask) and the conservative-but-not-
        # catastrophic posture. shred (true unrecoverable wipe) stays irreversible.
        ((), {"kind": "DESTROY", "domain": "filesystem",
              "reversibility": "partial", "blast": "single", "trace": "FS_ZERO_FILE"}),
    ],
    "chown": [
        ((), {"kind": "MUTATE", "domain": "filesystem",
              "reversibility": "partial", "blast": "single", "trace": "FS_CHOWN_R"}),
    ],
    "kill": [
        ((), {"kind": "DESTROY", "domain": "process",
              "reversibility": "partial", "blast": "single", "trace": "PROC_KILL"}),
    ],
    "pkill": [
        ((), {"kind": "DESTROY", "domain": "process",
              "reversibility": "partial", "blast": "multi", "trace": "PROC_KILL_BROAD"}),
    ],
    "killall": [
        ((), {"kind": "DESTROY", "domain": "process",
              "reversibility": "partial", "blast": "multi", "trace": "PROC_KILL_BROAD"}),
    ],
}

# Cloud CLIs: facets derived by a destroy/mutate VERB scan rather than a fixed
# subcommand table (services are open-ended). A delete/destroy/terminate/rm verb
# anywhere in the positionals -> DESTROY; create/update -> MUTATE.
CLOUD_CLIS: set[str] = {"aws", "az", "gcloud", "doctl"}
DESTROY_VERBS: set[str] = {"delete", "destroy", "terminate", "rm", "rb", "remove"}
MUTATE_VERBS: set[str] = {"create", "update", "put", "set", "modify", "patch", "apply"}


@dataclass
class CommandFact:
    """Typed facts about one command segment.

    Abstract facets (kind/domain/scope/reversibility/opacity/blast_radius)
    are what the policy lattice reads. The concrete `trace_label` is for
    debug output only and is never consulted by a decision branch.
    """

    executable: str = ""
    executable_path: str = ""
    argv: list[str] = field(default_factory=list)
    wrappers: list[str] = field(default_factory=list)
    subcommand_path: list[str] = field(default_factory=list)
    flags: set[str] = field(default_factory=set)
    targets: list[str] = field(default_factory=list)
    payload: str = ""
    parse_confidence: str = "high"  # high | partial | low
    # abstract facets
    kind: str = "NONE"
    domain: str = "unknown"
    scope: str = "narrow"
    reversibility: str = "unknown"
    opacity: str = "none"
    blast_radius: str = "single"
    trace_label: str = ""  # non-authoritative

    def facets(self) -> dict[str, str]:
        return {
            "kind": self.kind,
            "domain": self.domain,
            "scope": self.scope,
            "reversibility": self.reversibility,
            "opacity": self.opacity,
            "blast_radius": self.blast_radius,
        }


# Facet -> decision lattice. GOVERNED CORE: this table is authoritative and
# reads abstract facets only. Slice 0 ships it as data; classify_capability_pass
# is a stub, so this governs nothing yet (Slices 2-3 activate it).
def lattice_decision(fact: CommandFact) -> tuple[str, str] | None:
    """Map abstract facets -> (decision, reason), or None for no opinion.

    Evaluated top-down, first match wins. Not called by the Slice 0 stub.
    """
    k, scope, rev, blast = fact.kind, fact.scope, fact.reversibility, fact.blast_radius
    label = fact.trace_label or k
    if k == "PRIV_ESC":
        return "deny", f"privilege escalation ({label})"
    if k == "SECRETS_READ":
        return "deny", f"secret/credential read ({label})"
    if k == "DESTROY" and rev == "irreversible":
        return "deny", f"irreversible destruction ({label})"
    # Broad/prod DESTROY denies on prod/broad SCOPE or CLUSTER blast only. A
    # merely `multi`/`host` blast with reversible/partial effect (docker prune,
    # pkill/killall, helm uninstall) is ask-class per the architecture doc's
    # lattice (deny = irreversible | prod-scope | governance-bypass; broad blast
    # alone is NOT a deny trigger). The irreversibility AMPLIFIER (--volumes,
    # --force, --recursive) tightens reversibility -> the rule above fires.
    if k == "DESTROY" and (scope in {"prod", "broad"} or blast == "cluster"):
        return "deny", f"broad/prod destruction ({label})"
    if k == "EXEC" and fact.opacity == "opaque":
        return "ask", f"opaque execution — cannot prove payload ({label})"
    if k == "DESTROY":
        return "ask", f"destructive operation ({label})"
    if k == "MUTATE" and scope in {"prod", "broad"}:
        return "deny", f"broad/prod mutation ({label})"
    if k == "MUTATE":
        return "ask", f"state mutation ({label})"
    return None  # READ / NONE -> no escalation


def load_command_adapters(repo_root: Path) -> dict:
    """Load the user-extensible adapter sidecar, FAIL CLOSED.

    Reads `.caws/command-adapters.json` (JSON — PyYAML is unavailable in the
    hook runtime). Return semantics distinguish ABSENT from MALFORMED so the
    active pass can fail closed:
      - sidecar ABSENT (or the file is unreadable as a filesystem error): {} —
        no user adapters, built-ins only (legitimate, not an error).
      - sidecar PRESENT but malformed / version-mismatched / over-authority
        (a decision/policy key, an unknown facet value/kind): {"__error__": <reason>}
        — the pass surfaces a diagnostic ask for any command the built-ins do
        not already classify, rather than silently degrading to built-ins-only.

    Authority boundary (mirrors command-adapters.schema.json):
      - rows map tool + subcommand-path -> abstract facet assignment only
      - no decision/allow/deny/policy key may appear
      - facet values must come from the closed enums above
    """
    path = repo_root / ".caws" / "command-adapters.json"
    if not path.is_file():
        return {}  # ABSENT -> built-ins only (legitimate)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except OSError:
        return {}  # unreadable as a filesystem error -> treat as absent
    except ValueError as e:
        return {"__error__": f"invalid JSON: {e}"}  # PRESENT but unparseable -> fail closed
    if not isinstance(raw, dict) or raw.get("version") != 1:
        return {"__error__": "missing or unsupported version (expected 1)"}
    adapters = raw.get("adapters")
    if not isinstance(adapters, dict):
        return {"__error__": "adapters must be an object"}
    clean: dict = {}
    for tool, spec in adapters.items():
        if not isinstance(spec, dict):
            return {"__error__": f"adapter '{tool}' must be an object"}
        rows = spec.get("subcommands")
        if not isinstance(rows, list):
            return {"__error__": f"adapter '{tool}'.subcommands must be a list"}
        validated_rows = []
        for row in rows:
            if not isinstance(row, dict) or set(row) - {"path", "facets"}:
                return {"__error__": f"adapter '{tool}' row has unexpected keys"}
            facets = row.get("facets")
            path_tokens = row.get("path")
            if not isinstance(facets, dict) or not isinstance(path_tokens, list):
                return {"__error__": f"adapter '{tool}' row path/facets malformed"}
            # AUTHORITY BOUNDARY: no decision/policy key, valid facet values only.
            if {"decision", "allow", "deny", "ask", "policy", "outcome", "severity", "override"} & set(facets):
                return {"__error__": f"adapter '{tool}' facets attempt a policy override (forbidden)"}
            if facets.get("kind") not in FACET_KINDS:
                return {"__error__": f"adapter '{tool}' facets.kind is not a valid capability kind"}
            if "domain" in facets and facets["domain"] not in FACET_DOMAINS:
                return {"__error__": f"adapter '{tool}' facets.domain invalid"}
            if "reversibility" in facets and facets["reversibility"] not in FACET_REVERSIBILITY:
                return {"__error__": f"adapter '{tool}' facets.reversibility invalid"}
            if "blast_radius" in facets and facets["blast_radius"] not in FACET_BLAST:
                return {"__error__": f"adapter '{tool}' facets.blast_radius invalid"}
            validated_rows.append(row)
        unknown = spec.get("unknown_subcommand", "no_escalation")
        if unknown not in {"no_escalation", "intent_fallback"}:
            return {"__error__": f"adapter '{tool}'.unknown_subcommand invalid"}
        clean[tool] = {
            "subcommands": validated_rows,
            "resource_aliases": spec.get("resource_aliases", {}),
            "unknown_subcommand": unknown,
        }
    return clean


# ---------------------------------------------------------------------------
# Command segmentation
# ---------------------------------------------------------------------------

def segment_command(raw: str) -> list[str]:
    """Split a shell command string on &&, ||, ;, | operators.

    Respects quoted strings so that e.g. git commit -m "rm -rf /" does not
    split inside the quotes.  Returns individual command segments with
    leading/trailing whitespace stripped.

    This is intentionally conservative: if we cannot parse, we return
    the entire string as one segment so it still gets classified.
    """
    segments: list[str] = []
    current: list[str] = []
    i = 0
    in_single = False
    in_double = False
    in_heredoc: str | None = None
    heredoc_marker: str = ""

    while i < len(raw):
        ch = raw[i]

        # ---- heredoc detection ----
        # Look for <<EOF or <<'EOF' or <<"EOF" at segment level
        if not in_single and not in_double and in_heredoc is None:
            if raw[i:i+2] == "<<":
                # Extract the delimiter
                j = i + 2
                while j < len(raw) and raw[j] in (' ', '\t'):
                    j += 1
                # Strip optional quotes around delimiter
                quote_char = None
                if j < len(raw) and raw[j] in ("'", '"'):
                    quote_char = raw[j]
                    j += 1
                k = j
                while k < len(raw) and raw[k] not in (' ', '\t', '\n', "'", '"', ')'):
                    k += 1
                if k > j:
                    heredoc_marker = raw[j:k]
                    in_heredoc = heredoc_marker
                    # Skip to end of this line
                    nl = raw.find('\n', i)
                    if nl >= 0:
                        current.append(raw[i:nl+1])
                        i = nl + 1
                    else:
                        current.append(raw[i:])
                        i = len(raw)
                    continue

        # ---- inside heredoc: scan for closing marker ----
        if in_heredoc is not None:
            nl = raw.find('\n', i)
            if nl < 0:
                # No newline found, rest is heredoc content
                current.append(raw[i:])
                i = len(raw)
                continue
            line = raw[i:nl]
            current.append(raw[i:nl+1])
            i = nl + 1
            if line.strip() == in_heredoc:
                in_heredoc = None
            continue

        # ---- quoting ----
        if ch == '\\' and not in_single:
            current.append(raw[i:i+2])
            i += 2
            continue
        if ch == "'" and not in_double:
            in_single = not in_single
            current.append(ch)
            i += 1
            continue
        if ch == '"' and not in_single:
            in_double = not in_double
            current.append(ch)
            i += 1
            continue

        # ---- segment separators (only outside quotes) ----
        if not in_single and not in_double:
            # && or ||
            if raw[i:i+2] in ('&&', '||'):
                seg = ''.join(current).strip()
                if seg:
                    segments.append(seg)
                current = []
                i += 2
                continue
            # ; (but not ;;)
            if ch == ';' and (i + 1 >= len(raw) or raw[i+1] != ';'):
                seg = ''.join(current).strip()
                if seg:
                    segments.append(seg)
                current = []
                i += 1
                continue
            # newline — a bash statement separator equivalent to ';'. Each line
            # of a multi-line block is its own command, so splitting here keeps
            # `rm -rf /tmp/x` on one line from absorbing the next line's tokens
            # as phantom delete targets (CAWS-CLASSIFY-NEWLINE-SEGMENT-001). A
            # line-continuation backslash before the newline was already consumed
            # by the '\\' branch above (the '\n' is glued onto that token and
            # never reaches here), so this only fires on real separators. Heredoc
            # bodies are handled by the in_heredoc state machine above and never
            # reach this branch.
            if ch == '\n':
                seg = ''.join(current).strip()
                if seg:
                    segments.append(seg)
                current = []
                i += 1
                continue
            # | (but not ||, already handled above)
            if ch == '|':
                seg = ''.join(current).strip()
                if seg:
                    segments.append(seg)
                current = []
                i += 1
                continue

        current.append(ch)
        i += 1

    seg = ''.join(current).strip()
    if seg:
        segments.append(seg)

    return segments if segments else [raw.strip()]


def strip_quotes(s: str) -> str:
    """Remove surrounding quotes from a shell token."""
    if len(s) >= 2:
        if (s[0] == '"' and s[-1] == '"') or (s[0] == "'" and s[-1] == "'"):
            return s[1:-1]
    return s


def command_basename(token: str) -> str:
    """Return the executable basename for a command token."""
    return Path(token).name


def is_assignment_token(token: str) -> bool:
    """Return true for shell-style NAME=value assignment tokens."""
    return re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", token) is not None


def skip_env_prefix(tokens: Sequence[str], index: int) -> tuple[int, list[str] | None]:
    """Skip env options and assignments after an env wrapper."""
    i = index
    while i < len(tokens):
        tok = tokens[i]
        if tok == "--":
            return i + 1, None
        if is_assignment_token(tok):
            i += 1
            continue
        if tok in ("-i", "-0", "--ignore-environment", "--null"):
            i += 1
            continue
        if tok in ("-u", "--unset", "-C", "--chdir", "-S", "--split-string"):
            if tok in ("-S", "--split-string") and i + 1 < len(tokens):
                return i, [" ".join(tokens[i + 1:])]
            i += 2
            continue
        if tok.startswith("--split-string="):
            nested = tok.split("=", 1)[1]
            if i + 1 < len(tokens):
                nested = " ".join([nested, *tokens[i + 1:]])
            return i, [nested]
        if tok.startswith("--unset=") or tok.startswith("--chdir=") or tok.startswith("--split-string="):
            i += 1
            continue
        return i, None
    return i, None


def normalize_command_tokens(tokens: Sequence[str]) -> tuple[int, list[str] | None]:
    """Strip variable assignments and simple command wrappers.

    Returns the index of the real command. If the command is a shell -c wrapper,
    returns a nested command string list so the caller can classify it
    recursively.
    """
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        base = command_basename(tok)

        if is_assignment_token(tok):
            i += 1
            continue

        if base == "env":
            i, nested = skip_env_prefix(tokens, i + 1)
            if nested is not None:
                return i, nested
            continue

        if base == "time":
            i += 1
            while i < len(tokens) and tokens[i].startswith("-"):
                if tokens[i] in ("-f", "-o"):
                    i += 2
                else:
                    i += 1
            continue

        if base in COMMAND_WRAPPERS:
            i += 1
            continue

        if base in SHELL_C_WRAPPERS:
            j = i + 1
            while j < len(tokens):
                arg = tokens[j]
                if arg == "--":
                    j += 1
                    continue
                if arg.startswith("-") and "c" in arg[1:]:
                    if j + 1 < len(tokens):
                        return i, [tokens[j + 1]]
                    return i, [""]
                if not arg.startswith("-"):
                    break
                j += 1

        return i, None

    return i, None


def _locate_git_subcommand(tokens: list[str]) -> tuple[int, int] | None:
    """Locate a git invocation inside pre-split tokens.

    Returns (start, sub_idx): tokens[start] is the git executable (after
    wrappers such as env/command/nohup/time) and tokens[sub_idx] is its
    subcommand (after global options). None when the tokens are not a git
    invocation or the subcommand cannot be identified.

    Single-sources the walk for detect_git_subcommand and
    classify_commit_deletions so the two can never disagree about which
    token is the subcommand — a second implementation of these semantics
    is a trap (CAWS-GUARD-COMMIT-DELETES-UNNAMED-001).
    """
    if not tokens:
        return None

    start, nested = normalize_command_tokens(tokens)
    if nested is not None:
        return None
    if start >= len(tokens) or command_basename(tokens[start]) != "git":
        return None

    i = start + 1
    while i < len(tokens):
        tok = tokens[i]
        if tok == "--":
            i += 1
            break
        if tok in GIT_GLOBAL_OPTIONS_WITH_VALUE:
            i += 2
            continue
        if any(tok.startswith(f"{opt}=") for opt in GIT_GLOBAL_OPTIONS_WITH_VALUE if opt.startswith("--")):
            i += 1
            continue
        if tok in GIT_GLOBAL_OPTIONS_NO_VALUE:
            i += 1
            continue
        if tok.startswith("-"):
            # Unknown global option. If it has an inline value, skip it;
            # otherwise stop so we do not accidentally skip a subcommand.
            if "=" in tok:
                i += 1
                continue
            return None
        return (start, i)

    if i < len(tokens) and not tokens[i].startswith("-"):
        return (start, i)
    return None


def detect_git_subcommand(segment: str) -> str | None:
    """Detect the semantic Git subcommand for one executable segment.

    This recognizes wrappers such as env/command/nohup/time, absolute Git
    executable paths, and Git global options before the real subcommand.
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return None

    loc = _locate_git_subcommand(tokens)
    if loc is None:
        return None
    return tokens[loc[1]]


def git_alias_value_invokes_init(value: str) -> bool:
    """Return true when a `git -c alias.*=...` value routes to init."""
    stripped = value.strip()
    if not stripped:
        return False
    if stripped == "init" or stripped.startswith("init "):
        return True
    if stripped.startswith("!"):
        nested = stripped[1:].strip()
        return detect_git_subcommand(nested) == "init" or nested == "init" or nested.startswith("init ")
    return False


def has_git_init_alias_config(segment: str) -> bool:
    """Detect inline Git alias definitions that route an alias to init."""
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return False

    if not tokens:
        return False

    start, nested = normalize_command_tokens(tokens)
    if nested is not None or start >= len(tokens) or command_basename(tokens[start]) != "git":
        return False

    i = start + 1
    while i < len(tokens):
        tok = tokens[i]
        config_value = None
        if tok == "-c" and i + 1 < len(tokens):
            config_value = tokens[i + 1]
            i += 2
        elif tok.startswith("-c") and len(tok) > 2:
            config_value = tok[2:]
            i += 1
        else:
            i += 1

        if not config_value or "=" not in config_value:
            continue
        key, value = config_value.split("=", 1)
        if key.startswith("alias.") and git_alias_value_invokes_init(value):
            return True

    return False


def classify_nested_shell(
    segment: str, repo_root: Path, home: Path, cwd: Path, caws_worktree: bool,
    *, _depth: int = 0, _adapters: dict | None = None,
) -> tuple[str, str, str, str] | None:
    """Recursively classify sh/bash/zsh -c strings.

    Threads the shared recursion budget (`_depth`) and the cached adapter
    sidecar (`_adapters`) into the recursive classify_command call so nested
    shells share one budget with substitution + opaque-exec recursion.

    Returns the inner classify_command's (decision, reason, source, enforcement)
    so the enforcement class of a nested capability ask propagates outward
    (HOOK-ASK-ENFORCEMENT-001 A5).
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return None

    _, nested = normalize_command_tokens(tokens)
    if not nested:
        return None

    return classify_command(
        nested[0], repo_root, home, cwd, caws_worktree,
        _depth=_depth + 1, _adapters=_adapters,
    )


_SPEC_PATH_RE = re.compile(r"^\.caws/specs/[^/]+\.(?:yaml|yml)$")


def cherry_pick_touches_only_specs(segment: str, repo_root: Path | None) -> bool:
    """Return True ONLY when a `git cherry-pick <sha>...` provably touches
    nothing but `.caws/specs/*.yaml` files (the protocol-sanctioned scope-
    amendment / spec-lifecycle sync — CAWS-SCOPE-AMEND-COMMAND-001).

    Fail-closed: any uncertainty returns False so the caller keeps the
    existing danger-latch behavior. We return False when:
      - repo_root is unknown / not a dir;
      - the segment carries flags (--continue/--abort/-n/etc.) or no sha;
      - any sha cannot be resolved, has no files, or touches a non-spec path;
      - git is unavailable or any git invocation fails/times out.

    Note: the PREFERRED path is `caws specs amend-scope`, which removes the
    cherry-pick entirely. This carve-out only narrows the latch for the
    transition / fallback case; it never widens it.
    """
    if repo_root is None or not repo_root.is_dir():
        return False
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return False
    # Find the cherry-pick subcommand index, then collect trailing args.
    try:
        cp_idx = tokens.index("cherry-pick")
    except ValueError:
        return False
    args = tokens[cp_idx + 1 :]
    # Any flag/option disqualifies the cheap proof (e.g. --continue, --abort,
    # -n, -x, --strategy, ranges with ..). Require plain sha/ref tokens only.
    shas = []
    for a in args:
        if a.startswith("-"):
            return False
        if ".." in a:  # commit ranges are out of scope for the carve-out
            return False
        shas.append(a)
    if not shas:
        return False
    for sha in shas:
        try:
            proc = subprocess.run(
                ["git", "show", "--name-only", "--format=", sha],
                cwd=str(repo_root),
                capture_output=True,
                text=True,
                timeout=5,
            )
        except (OSError, subprocess.SubprocessError):
            return False
        if proc.returncode != 0:
            return False
        files = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
        if not files:
            return False  # empty/merge commit → cannot prove; fail closed
        if not all(_SPEC_PATH_RE.match(f) for f in files):
            return False
    return True


# ---------------------------------------------------------------------------
# CAWS-GUARD-COMMIT-DELETES-UNNAMED-001 — bare-commit staged-deletions guard
# ---------------------------------------------------------------------------

# Env assignments that redirect which repository/index a git command operates
# on. When one prefixes a commit, the cwd-based staged-state inspection below
# would read the WRONG index — so the guard fails closed instead of guessing.
_GIT_ENV_REDIRECT_PREFIXES = ("GIT_DIR=", "GIT_WORK_TREE=", "GIT_INDEX_FILE=")

# `git commit` short options that consume a value. In a bundled short-flag
# token the first value-taking char swallows the rest of the token, so chars
# after it are its value, not flags: `-am` is `-a -m <next>`, but `-ma` is
# `-m a` (a message that says "a"), NOT `-m -a`.
_COMMIT_SHORT_OPTS_WITH_VALUE = "mFCctS"


def _commit_stages_all(commit_args: list[str]) -> bool:
    """True when a `git commit` carries -a/--all (auto-stage tracked changes)."""
    for tok in commit_args:
        if tok in ("-a", "--all"):
            return True
        if tok.startswith("-") and not tok.startswith("--") and len(tok) > 1:
            for ch in tok[1:]:
                if ch == "a":
                    return True
                if ch in _COMMIT_SHORT_OPTS_WITH_VALUE:
                    break
    return False


def classify_commit_deletions(segment: str, cwd: Path | None) -> tuple[str, str] | None:
    """Ask before a bare `git commit` that would sweep staged deletions.

    The old premise — "plain commit creates a new commit object; not
    destructive" — is false. A commit with no pathspec commits the ENTIRE
    index, and an index carrying stale or foreign state (a failed
    `git revert -n`, a cross-worktree sweep, a sibling session's staged
    work) deletes tracked content under an unrelated commit message. Two
    real sweeps (2656 and 178 deleted lines) shipped through that premise.

    Fires ONLY for forms the allow-list would otherwise admit:
      - `--amend` is excluded here (already governed — it falls through to
        the governed-family amend ask);
      - `--dry-run` mutates nothing;
      - an explicit pathspec after `--` is admitted: naming the paths IS
        the author asserting intent — the same discipline CAWS's own
        autoCommit uses, and exactly the remediation this guard prescribes.

    For a bare commit the guard inspects the staged set (`git diff --cached
    --diff-filter=D`) in the classification cwd, honoring `-C`; with
    `-a`/`--all` it inspects tracked deletions against HEAD instead,
    because -a stages working-tree deletions at commit time. Deletions →
    ask, naming the count and the path-scoped remediation. Unreadable
    staged state (not a repo, git failure/timeout, or a redirected
    GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE/--git-dir/--work-tree) → ask,
    fail closed: a commit whose effect cannot be seen is not auto-admitted.

    The inspection runs at classify time, BEFORE the command executes: the
    hazard this guards — stale/foreign index state — exists before the
    commit is issued, by definition. Content the author stages in a sibling
    segment of the same compound command is their own work and out of scope.
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return None
    loc = _locate_git_subcommand(tokens)
    if loc is None:
        return None
    start, sub_idx = loc
    if tokens[sub_idx] != "commit":
        return None
    commit_args = tokens[sub_idx + 1:]
    if any(t == "--amend" or t.startswith("--amend=") for t in commit_args):
        return None  # governed elsewhere: falls through to the amend ask
    if "--dry-run" in commit_args:
        return None
    if "--" in commit_args and commit_args.index("--") < len(commit_args) - 1:
        return None  # explicitly path-scoped: the author named their paths
    # CAWS-DESIGN-GLOBAL-IDENTITY-HOME-001 A6: a LEADING positional token is a
    # pathspec too — `git commit <path> -m <msg>` is path-scoped exactly like
    # the trailing `-- <path>` form. The first token starting with '-' ends
    # the positional region; any positional token before it means the author
    # named their paths (git validates them; a bad path fails loudly in git,
    # not here).
    first_flag = next((i for i, t in enumerate(commit_args) if t.startswith('-')), len(commit_args))
    if first_flag > 0:
        return None  # leading pathspec(s) present: path-scoped commit

    remediation = (
        "inspect the staged set first (git status; git diff --cached --stat), "
        "then commit with the paths named explicitly: git commit -m <msg> -- <paths>"
    )

    def fail_closed(detail: str) -> tuple[str, str]:
        return (
            "ask",
            "bare git commit (no pathspec) commits the ENTIRE index, and the "
            f"staged state could not be verified ({detail}) — not auto-admitting; "
            + remediation,
        )

    if cwd is None:
        return fail_closed("no working directory available")
    if any(t.startswith(_GIT_ENV_REDIRECT_PREFIXES) for t in tokens[:start]) or any(
        t in ("--git-dir", "--work-tree") or t.startswith(("--git-dir=", "--work-tree="))
        for t in tokens[start + 1 : sub_idx]
    ):
        return fail_closed("the invocation redirects the git dir/work-tree/index")

    # Honor `git -C <dir>`: successive values compose the way git composes
    # them (a relative value appends; an absolute one replaces).
    check_dir = Path(cwd)
    i = start + 1
    while i < sub_idx:
        if tokens[i] == "-C" and i + 1 < sub_idx:
            check_dir = check_dir / tokens[i + 1]
            i += 2
            continue
        i += 1

    diff_args = ["diff", "--cached", "--diff-filter=D", "--name-only", "-z"]
    if _commit_stages_all(commit_args):
        # -a stages tracked working-tree deletions at commit time; diffing
        # against HEAD sees both those and already-staged deletions.
        diff_args = ["diff", "--diff-filter=D", "--name-only", "-z", "HEAD"]
    try:
        proc = subprocess.run(
            ["git", "-c", "core.quotePath=false", *diff_args],
            cwd=str(check_dir),
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return fail_closed("git did not answer")
    if proc.returncode != 0:
        return fail_closed("not a git repository here, or git failed")
    deleted = [p for p in proc.stdout.split("\0") if p]
    if not deleted:
        return None  # additions/modifications only — ordinary work, admitted
    shown = ", ".join(deleted[:3]) + (", …" if len(deleted) > 3 else "")
    return (
        "ask",
        "bare git commit (no pathspec) would commit the ENTIRE index, which "
        f"currently stages {len(deleted)} deletion(s) of tracked files ({shown}) — "
        "a stale or foreign index sweeps content you did not intend under your "
        "message; " + remediation,
    )


def classify_git_semantics(
    segment: str,
    caws_worktree: bool,
    repo_root: Path | None = None,
) -> tuple[str, str] | None:
    """Classify Git operations by executable/subcommand semantics.

    When `caws_worktree` is true (a trusted git-init context exists) and
    the segment is a git-init variant, the trusted token is consumed
    here. If consumption fails (the token was removed by a concurrent
    classifier run, or another git-init segment in the same command
    already consumed it), the segment falls back to `ask` so the human
    review boundary still engages.
    """
    is_init_alias = has_git_init_alias_config(segment)
    subcommand = detect_git_subcommand(segment) if not is_init_alias else None

    if is_init_alias:
        if caws_worktree and repo_root is not None and consume_trusted_git_init_context(repo_root):
            return "allow", ""
        return "ask", "git alias routes to init and requires human approval"

    if subcommand is None:
        return None

    if subcommand == "init":
        if caws_worktree and repo_root is not None and consume_trusted_git_init_context(repo_root):
            return "allow", ""
        return "ask", "git init requires human approval; do not retry by wrapping, reordering, aliasing, or indirect invocation"

    if subcommand == "rebase":
        return "ask", "git rebase rewrites branch history"

    if subcommand == "cherry-pick":
        # CAWS-SCOPE-AMEND-COMMAND-001 carve-out: a cherry-pick that provably
        # touches ONLY .caws/specs/*.yaml is the protocol-sanctioned scope-
        # amendment / spec-lifecycle sync. Admit it so it does not engage the
        # sticky session-wide danger latch. PREFER `caws specs amend-scope`,
        # which avoids the cherry-pick entirely. Fail-closed: any other
        # cherry-pick (source files, ranges, flags, unresolvable sha, git
        # error) keeps the existing ask+latch.
        if cherry_pick_touches_only_specs(segment, repo_root):
            return "allow", ""
        return "ask", "git cherry-pick replays commits across branches"

    return None


# ---------------------------------------------------------------------------
# DANGER-LATCH-CALIBRATION-001 — gh / npm subcommand detection
# ---------------------------------------------------------------------------

def detect_gh_subcommand(segment: str) -> tuple[str, str] | None:
    """Detect the (group, action) for a `gh` segment.

    Returns a tuple like ("pr", "view") for `gh pr view 5`, or
    ("api", "") for `gh api /repos/foo/bar`. Returns None if the
    segment is not a gh invocation. Handles env/time/nohup wrappers
    via normalize_command_tokens.

    Subcommand-with-no-action (e.g., bare `gh pr`) returns
    (group, "") so the caller can distinguish "no allow-list match"
    from "not a gh command at all."
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return None

    if not tokens:
        return None

    start, nested = normalize_command_tokens(tokens)
    if nested is not None:
        return None
    if start >= len(tokens) or command_basename(tokens[start]) != "gh":
        return None

    # First non-flag token after `gh` is the group (pr, run, issue, repo, api, ...)
    i = start + 1
    group = ""
    while i < len(tokens):
        tok = tokens[i]
        if tok.startswith("-"):
            i += 1
            continue
        group = tok
        i += 1
        break

    if not group:
        return None

    # Second non-flag token is the action (view, list, merge, ...)
    # For `gh api` there is no action — the next token is the path.
    if group == "api":
        return ("api", "")

    action = ""
    while i < len(tokens):
        tok = tokens[i]
        if tok.startswith("-"):
            i += 1
            continue
        action = tok
        break

    return (group, action)


def gh_api_method(segment: str) -> str:
    """Return the HTTP method for a `gh api` segment.

    Defaults to "GET" when no -X flag is present. Recognizes both
    `-X POST` and `--method POST` / `-XPOST` forms.
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return "GET"

    for i, tok in enumerate(tokens):
        if tok in ("-X", "--method") and i + 1 < len(tokens):
            return tokens[i + 1].upper()
        if tok.startswith("-X") and len(tok) > 2:
            # Concatenated form like -XPOST
            return tok[2:].upper()
        if tok.startswith("--method="):
            return tok.split("=", 1)[1].upper()
    return "GET"


def detect_npm_subcommand(segment: str) -> str | None:
    """Return the subcommand for an `npm` segment, or None if not npm.

    Handles env/time/nohup wrappers via normalize_command_tokens.
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return None

    if not tokens:
        return None

    start, nested = normalize_command_tokens(tokens)
    if nested is not None:
        return None
    if start >= len(tokens) or command_basename(tokens[start]) != "npm":
        return None

    i = start + 1
    while i < len(tokens):
        tok = tokens[i]
        if tok.startswith("-"):
            i += 1
            continue
        return tok
    return None


def npm_pack_is_dry_run(segment: str) -> bool:
    """Return true if `npm pack` invocation has --dry-run."""
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return False
    return "--dry-run" in tokens


# ---------------------------------------------------------------------------
# DANGER-LATCH-CALIBRATION-001 — allow-list classifier
# ---------------------------------------------------------------------------

def classify_allow_list(segment: str) -> tuple[str, str] | None:
    """Return ("allow", "") if the segment is on the documented allow-list.

    The allow-list is consulted AFTER deny/confirm patterns. A segment
    that matches a deny or confirm pattern WILL escalate the overall
    decision; this function is only what the segment contributes when
    no other rule fires.

    Returns None when the segment does not match the allow-list. The
    caller (classify_command) then falls through to either:
      (a) the existing classifier default (allow) for non-governed
          commands, or
      (b) hybrid fail-closed "ask" via
          classify_governed_family_default for git/gh/npm.
    """
    # First, the simple-command allow-list — match by extracted command word.
    cmd = extract_command_word(segment)
    if not cmd:
        return None

    # Strip path components so /usr/bin/tail matches `tail`.
    cmd_base = command_basename(cmd)

    # `find` is allowed ONLY without mutating action flags. The
    # classify_find_delete function returns ("ask", ...) when find has
    # any of -delete/-exec/-execdir/-fprint/-ok. The allow-list admits
    # find here only when classify_find_delete would return None (i.e.,
    # the find is observational).
    if cmd_base == "find":
        if classify_find_delete(segment) is None:
            return ("allow", "")
        return None

    if cmd_base in ALLOWED_SIMPLE_COMMANDS:
        return ("allow", "")

    # Read-only git subcommands.
    if cmd_base == "git":
        sub = detect_git_subcommand(segment)
        if sub is None:
            # Bare `git` with no subcommand — not allow-list eligible.
            return None
        # Special-case `git tag --list` / `git tag -l` — list only,
        # not mutating (`git tag -d` is a delete).
        if sub == "tag":
            try:
                tokens = shlex.split(segment)
            except ValueError:
                return None
            # Admit only when --list or -l is present and no -d/-D/-m.
            mutating = any(t in ("-d", "-D", "-m", "-a", "-s", "-f") for t in tokens)
            listing = any(t in ("--list", "-l") for t in tokens)
            if listing and not mutating:
                return ("allow", "")
            return None
        # Special-case `git branch` — read-only when no -d/-D/-m flags.
        if sub == "branch":
            try:
                tokens = shlex.split(segment)
            except ValueError:
                return None
            mutating = any(
                t in ("-d", "-D", "-m", "-M", "--delete", "--move") for t in tokens
            )
            if not mutating:
                return ("allow", "")
            return None
        # Special-case `git config --get` — read-only get; bare `git config`
        # or `git config key value` is mutating.
        if sub == "config":
            try:
                tokens = shlex.split(segment)
            except ValueError:
                return None
            if any(t in ("--get", "--get-all", "--get-regexp", "--list", "-l") for t in tokens):
                return ("allow", "")
            return None
        # Special-case `git rm` — admit ONLY the non-destructive forms
        # (CAWS-CLASSIFY-GIT-RM-CACHED-001, friction-probe Event 7).
        # `git rm --cached <path>` removes from the index only; the working-tree
        # file is untouched. `git rm -n` / `git rm --dry-run` mutates nothing.
        # Both are routine cleanups (untrack a wrongly-committed runtime file)
        # that were previously swept into the governed-family fail-closed
        # default → "ask", arming the sticky session danger latch on a safe op.
        # WORKING-TREE-DESTRUCTIVE forms (plain `git rm <path>`, `-r`, `-rf`)
        # return None so they fall through to "ask" and stay governed — the
        # allow-list is suppress-only and cannot itself escalate.
        if sub == "rm":
            try:
                tokens = shlex.split(segment)
            except ValueError:
                return None
            index_only = any(t == "--cached" for t in tokens)
            dry_run = any(t in ("-n", "--dry-run") for t in tokens)
            if index_only or dry_run:
                return ("allow", "")
            return None
        # Special-case `git commit` — admit plain commit at THIS tier (the
        # allow-list is suppress-only). NOTE the premise "a plain commit is
        # not destructive" is FALSE: with no pathspec it commits the ENTIRE
        # index, and a stale/foreign index deletes tracked content under an
        # unrelated message. That case is escalated by the paired
        # classify_commit_deletions pipeline stage
        # (CAWS-GUARD-COMMIT-DELETES-UNNAMED-001), which outranks this admit.
        # REJECT --amend, which rewrites the last commit (history-rewrite +
        # attribution-loss risk). --amend falls through to "ask" and is
        # additionally blocked by worktree-guard.sh while worktrees are
        # active.
        if sub == "commit":
            try:
                tokens = shlex.split(segment)
            except ValueError:
                return None
            # `--amend` rewrites the last commit (history-rewrite +
            # attribution-loss risk). Return None so it falls through to the
            # governed-family default → "ask"; the allow-list is suppress-
            # only and cannot itself escalate.
            if any(t == "--amend" or t.startswith("--amend=") for t in tokens):
                return None
            return ("allow", "")
        # Special-case `git checkout` — admit ONLY the branch-creating form
        # (-b / -B). Bare `git checkout <path>` and `git checkout .` discard
        # working-tree changes and are governed by CONFIRM_SEGMENT_PATTERNS;
        # `git checkout <branch>` is left to the existing tier (it can
        # silently abandon uncommitted work in some states). Only branch
        # creation is unambiguously safe.
        if sub == "checkout":
            try:
                tokens = shlex.split(segment)
            except ValueError:
                return None
            if any(t in ("-b", "-B") for t in tokens):
                return ("allow", "")
            return None
        # Special-case `git switch` — admit the branch-creating form
        # (-c / -C). Plain `git switch <branch>` refuses to move when the
        # working tree has conflicting local changes (unlike checkout), so
        # it is also admitted; REJECT the force/discard forms
        # (-f / --force / --discard-changes), which throw away local state
        # and fall through to "ask".
        if sub == "switch":
            try:
                tokens = shlex.split(segment)
            except ValueError:
                return None
            if any(t in ("-f", "--force", "--discard-changes") for t in tokens):
                return None
            return ("allow", "")
        # Special-case `git worktree` — admit the read-only forms only.
        # `git worktree list` and bare `git worktree` (prints usage) are
        # read-only inspection. The MUTATING subcommands — add, remove,
        # prune, move, repair, lock, unlock — change worktree/branch state
        # and fall through to "ask"; several are additionally governed by
        # worktree-guard.sh while worktrees are active. Mirrors the
        # branch/config read-only-form pattern.
        # (WORKTREE-LIST-CALIBRATION-001)
        if sub == "worktree":
            try:
                tokens = shlex.split(segment)
            except ValueError:
                return None
            # tokens: ["git", "worktree", <subcommand?>, ...]. Find the
            # worktree subcommand (first token after "worktree").
            wt_sub = ""
            for i, t in enumerate(tokens):
                if t == "worktree" and i + 1 < len(tokens):
                    wt_sub = tokens[i + 1]
                    break
            # Bare `git worktree` (no subcommand) prints usage — read-only.
            # `git worktree list` is read-only. `git worktree prune --dry-run`
            # (or `-n`) only REPORTS what would be pruned and changes no state,
            # so it is read-only too — admitting it closes a danger-latch false
            # positive where a first-timer's orientation `prune --dry-run`
            # (exit 0, no mutation) latched the whole session
            # (CAWS-CLASSIFY-WORKTREE-PRUNE-AND-RM-REDIRECT-001 A1). Bare
            # `git worktree prune` (no dry-run) DELETES worktree admin files, so
            # it stays "ask"; likewise add/remove/move/repair/lock/unlock.
            if wt_sub in ("", "list"):
                return ("allow", "")
            if wt_sub == "prune" and ("--dry-run" in tokens or "-n" in tokens):
                return ("allow", "")
            return None
        if sub in ALLOWED_GIT_SUBCOMMANDS:
            return ("allow", "")
        return None

    # Read-only gh subcommands.
    if cmd_base == "gh":
        result = detect_gh_subcommand(segment)
        if result is None:
            return None
        group, action = result
        # `gh api` is admit-only when method is GET.
        if group == "api":
            if gh_api_method(segment) == "GET":
                return ("allow", "")
            return None
        key = f"{group} {action}".strip()
        if key in ALLOWED_GH_ACTIONS:
            return ("allow", "")
        return None

    # Read-only npm subcommands.
    if cmd_base == "npm":
        sub = detect_npm_subcommand(segment)
        if sub is None:
            return None
        if sub == "pack":
            if npm_pack_is_dry_run(segment):
                return ("allow", "")
            return None
        if sub in ALLOWED_NPM_SUBCOMMANDS:
            return ("allow", "")
        return None

    return None


def classify_governed_family_default(segment: str) -> tuple[str, str] | None:
    """Hybrid fail-closed for git/gh/npm — unknown subcommand → ask.

    Only fires when:
      - the segment's command is in GOVERNED_FAMILIES, OR is a
        hyphenated PATH-spoof variant (e.g. `gh-pr-view-fake-script`,
        `git-foo`, `npm-something`) that could be mistaken for a
        governed-family command,
      - no deny/confirm pattern matched,
      - no allow-list match.
    Returns ("ask", reason) in that case, None otherwise.

    Callers should invoke this AFTER deny/confirm/allow-list checks
    have all returned no opinion. The function's job is the third
    tier of decision-making for governed families.

    The hyphenated-variant check enforces the spec's anchoring
    invariant: `gh-pr-view-fake-script` does not match the `gh pr view`
    allow-list, and because it shadows a governed family name, it
    deserves the same ask-by-default treatment a real `gh` invocation
    would get for an unknown subcommand.
    """
    cmd = extract_command_word(segment)
    if not cmd:
        return None
    cmd_base = command_basename(cmd)

    # PATH-spoof variants — gh-foo, git-foo, npm-foo. Treated as a
    # suspicious hyphenated impersonation of a governed family, not
    # as an unknown command. The reason names the spoof explicitly.
    for family in GOVERNED_FAMILIES:
        if cmd_base.startswith(f"{family}-"):
            return (
                "ask",
                f"hyphenated command `{cmd_base}` shadows governed family "
                f"`{family}` — not on the allow-list; ask before invoking "
                "to confirm this is not a PATH-spoof of `{family}`",
            )

    if cmd_base not in GOVERNED_FAMILIES:
        return None

    # Surface a useful reason naming the family and subcommand if we
    # can identify one.
    if cmd_base == "gh":
        result = detect_gh_subcommand(segment)
        if result is not None:
            group, action = result
            return (
                "ask",
                f"unknown gh subcommand: {group} {action}".rstrip()
                + " — not on the documented read-only allow-list; "
                "ask before invoking",
            )
        return ("ask", "unknown gh invocation — ask before invoking")

    if cmd_base == "git":
        sub = detect_git_subcommand(segment)
        if sub is not None:
            # Name the specific rejected variant when the subcommand itself
            # is an admitted everyday-workflow write but this invocation
            # used a dangerous flag (the allow-list special-case returned
            # None for it). Keeps the "ask" reason accurate instead of
            # mislabeling a known subcommand as "unknown".
            if sub == "commit":
                return (
                    "ask",
                    "git commit --amend rewrites the last commit — a "
                    "history-rewrite and attribution-loss risk; ask before invoking",
                )
            if sub == "switch":
                return (
                    "ask",
                    "git switch with --force/--discard-changes throws away "
                    "local changes; ask before invoking",
                )
            if sub == "checkout":
                return (
                    "ask",
                    "git checkout to an existing branch/path can discard "
                    "uncommitted work; only `checkout -b` is auto-admitted; "
                    "ask before invoking",
                )
            return (
                "ask",
                f"unknown git subcommand: {sub} — not on the documented "
                "read-only allow-list; ask before invoking",
            )
        return ("ask", "unknown git invocation — ask before invoking")

    if cmd_base == "npm":
        sub = detect_npm_subcommand(segment)
        if sub is not None:
            return (
                "ask",
                f"unknown npm subcommand: {sub} — not on the documented "
                "read-only allow-list; ask before invoking",
            )
        return ("ask", "unknown npm invocation — ask before invoking")

    return None


def _trusted_git_init_token_path(repo_root: Path) -> Path | None:
    """Return the trusted git-init allow-token path if the env signals it.

    Validation only — does not check disk presence and does not consume.
    """
    if os.environ.get("CAWS_TRUSTED_WORKTREE_CREATE_CONTEXT", "0") != "1":
        return None
    nonce = os.environ.get("CAWS_TRUSTED_HOOK_NONCE", "")
    if not re.match(r"^[A-Za-z0-9._-]{8,128}$", nonce):
        return None
    vendor_dir = os.environ.get("CAWS_VENDOR_DIR", ".claude")
    return repo_root / vendor_dir / "hooks" / "state" / f"allow-git-init-{nonce}"


def has_trusted_git_init_context(repo_root: Path) -> bool:
    """Return true when dispatch created a one-shot git-init allow token."""
    token = _trusted_git_init_token_path(repo_root)
    return token is not None and token.is_file()


def consume_trusted_git_init_context(repo_root: Path) -> bool:
    """Atomically consume the trusted git-init allow token.

    Returns true if a valid token existed and was removed. The token is
    one-shot: a subsequent git-init in the same dispatch will be subject
    to normal classification (which means `ask`). Dispatch must mint a
    fresh nonce + token for each authorized lifecycle operation.
    """
    token = _trusted_git_init_token_path(repo_root)
    if token is None or not token.is_file():
        return False
    try:
        token.unlink()
    except OSError:
        return False
    return True


def extract_command_word(segment: str) -> str:
    """Extract the first command word from a segment.

    Strips leading variable assignments (FOO=bar), env prefixes,
    and common wrappers like 'time'.
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        # Malformed quoting — return raw first word
        return segment.split()[0] if segment.split() else ""

    for tok in tokens:
        # Skip variable assignments
        if '=' in tok and not tok.startswith('-'):
            continue
        # Skip common prefixes
        if tok in ('env', 'time', 'nice', 'nohup', 'command', 'builtin'):
            continue
        return tok
    return ""


# ---------------------------------------------------------------------------
# rm classifier
# ---------------------------------------------------------------------------

def is_recursive_rm(segment: str) -> tuple[bool, list[str]]:
    """Check if a segment is an rm command with recursive flags.

    Returns (is_recursive, [target_paths]).
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        # Cannot parse — be conservative
        if re.search(r'\brm\b', segment) and re.search(r'-[a-zA-Z]*r', segment):
            return True, []
        return False, []

    if not tokens:
        return False, []

    # Find the rm command (skip env/time prefixes)
    rm_idx = -1
    for idx, tok in enumerate(tokens):
        if tok in ('env', 'time', 'nice', 'nohup', 'command', 'builtin'):
            continue
        if '=' in tok and not tok.startswith('-'):
            continue
        if tok == 'rm':
            rm_idx = idx
        break

    if rm_idx < 0:
        return False, []

    # Shell redirect operators are NOT delete targets. Before this fix the
    # loop appended tokens like `2>&1` or `out.log` (after `>`) to `targets`,
    # so `rm -rf <dir> 2>&1` produced the reason "recursive delete: 2>&1" —
    # fingering the redirect instead of the deleted path
    # (CAWS-CLASSIFY-WORKTREE-PRUNE-AND-RM-REDIRECT-001 A2/A3). Redirect
    # operators bind a file descriptor to a target; neither the operator nor
    # (for a bare `>`/`>>`/`2>`/`1>`) its following operand is a delete target.
    # fd-combining/standalone forms (`2>&1`, `>&2`, `1>&2`, `&>`) carry their
    # own target, so only the operator token is skipped.
    _REDIRECT_STANDALONE = {'2>&1', '>&2', '1>&2', '&>', '&>>'}
    _REDIRECT_TAKES_OPERAND = ('>', '>>', '2>', '1>', '2>>', '1>>', '<', '<<')

    def _is_redirect_with_operand(t: str) -> bool:
        # A redirect operator with the file glued on (e.g. `>out.log`,
        # `2>err`) OR a bare operator whose operand is the next token.
        return any(
            t == op or (t.startswith(op) and len(t) > len(op))
            for op in _REDIRECT_TAKES_OPERAND
        )

    # Check for recursive flag
    is_recursive = False
    targets: list[str] = []
    i = rm_idx + 1
    while i < len(tokens):
        tok = tokens[i]
        if tok == '--':
            # Everything after -- is literal filenames (POSIX); no redirects.
            targets.extend(tokens[i+1:])
            break
        if tok in _REDIRECT_STANDALONE:
            # fd-combining redirect (e.g. 2>&1) — not a target, no operand.
            pass
        elif _is_redirect_with_operand(tok):
            # A bare operator (`>`, `2>`, …) consumes the NEXT token as its
            # file operand, which is also not a delete target.
            if tok in _REDIRECT_TAKES_OPERAND:
                i += 1  # skip the operand token too
            # else: operator+file glued in one token — nothing extra to skip.
        elif tok.startswith('-') and not tok.startswith('--'):
            if 'r' in tok or 'R' in tok:
                is_recursive = True
        elif tok.startswith('--'):
            if tok == '--recursive':
                is_recursive = True
            # Other long options: skip
        else:
            targets.append(tok)
        i += 1

    return is_recursive, targets


def classify_rm_target(
    target: str,
    repo_root: Path,
    home: Path,
    cwd: Path,
) -> tuple[str, str]:
    """Classify a single rm target path.

    Returns ("deny"|"ask"|"allow", reason).
    """
    # Resolve the target to an absolute path
    raw = target.strip()
    if not raw:
        return "deny", "empty target on recursive delete"

    # Handle glob-like patterns conservatively
    if any(c in raw for c in ('*', '?', '[', ']')):
        # Check if it is /* or ~/* which are catastrophic
        stripped = raw.rstrip('/')
        if stripped in ('/*', '~/*', './*'):
            return "deny", f"glob expansion at dangerous root: {raw}"
        # Other globs: confirm
        return "ask", f"recursive delete with glob pattern: {raw}"

    # Resolve path
    try:
        if raw.startswith('~'):
            resolved = (home / raw[2:]).resolve(strict=False) if len(raw) > 1 else home
        elif raw.startswith('/'):
            resolved = Path(raw).resolve(strict=False)
        else:
            resolved = (cwd / raw).resolve(strict=False)
    except (ValueError, OSError):
        return "ask", f"cannot resolve path: {raw}"

    resolved_str = str(resolved)
    repo_str = str(repo_root)
    home_str = str(home)

    # Hard-block: root, home, repo root
    if resolved_str == '/':
        return "deny", f"recursive delete targets filesystem root"
    if resolved_str == home_str:
        return "deny", f"recursive delete targets home directory"
    if resolved_str == repo_str:
        return "deny", f"recursive delete targets repository root"

    # Check if resolved path is a parent of repo or home (even worse)
    if repo_str.startswith(resolved_str + '/'):
        return "deny", f"recursive delete targets ancestor of repository: {raw}"
    if home_str.startswith(resolved_str + '/'):
        return "deny", f"recursive delete targets ancestor of home directory: {raw}"

    # Allow: known safe prefixes (relative to repo root)
    try:
        rel = resolved.relative_to(repo_root)
        rel_str = str(rel) + '/'
        for prefix in SAFE_DELETE_PREFIXES:
            if rel_str.startswith(prefix):
                return "allow", ""
    except ValueError:
        pass  # Not inside repo root

    # Allow: absolute system scratch roots (/tmp, $TMPDIR, macOS /var/folders).
    # Strictly BELOW the root only — deleting the temp root itself stays "ask".
    # The hard-block checks above (/, home, repo, ancestors) already ran, so
    # this cannot admit anything catastrophic (DANGER-LATCH-UX-001).
    tmp_roots = list(SYSTEM_TMP_PREFIXES)
    tmpdir_env = os.environ.get("TMPDIR")
    if tmpdir_env:
        try:
            tmpdir_real = str(Path(tmpdir_env).resolve(strict=False)).rstrip("/") + "/"
            tmp_roots.append(tmpdir_real)
        except (ValueError, OSError):
            pass
    for tmp_root in tmp_roots:
        # Strictly below the root: resolved must start with "<root>/..." and
        # not equal the root itself (rstrip the trailing slash to compare).
        if resolved_str.startswith(tmp_root) and resolved_str.rstrip("/") != tmp_root.rstrip("/"):
            return "allow", ""

    # Default: confirm
    return "ask", f"recursive delete: {raw}"


def classify_find_delete(segment: str) -> tuple[str, str] | None:
    """Check if segment is a find command with a mutating action flag.

    Mutating action flags: -delete, -exec, -execdir, -fprint*, -ok.
    Returns classification tuple or None if find has no mutating action.

    The allow-list (see classify_allow_list) admits `find` ONLY when none
    of these flags are present. This classifier returns "ask" for find
    invocations that DO carry a mutating action — the allow-list will
    not match them, and they fall through to this check.
    """
    try:
        tokens = shlex.split(segment)
    except ValueError:
        return None

    cmd = extract_command_word(segment)
    if cmd != 'find':
        return None

    has_delete = '-delete' in tokens
    has_exec = False
    has_execdir = False
    has_fprint = False
    has_ok = False
    for i, tok in enumerate(tokens):
        if tok == '-exec':
            has_exec = True
        elif tok == '-execdir':
            has_execdir = True
        elif tok in ('-ok', '-okdir'):
            has_ok = True
        elif tok in ('-fprint', '-fprint0', '-fprintf'):
            has_fprint = True

    if not (has_delete or has_exec or has_execdir or has_fprint or has_ok):
        return None

    return "ask", f"find with mutating action flag (-delete/-exec/-execdir/-fprint/-ok)"


def extract_command_substitutions(raw: str) -> list[str]:
    """Return the bodies of every $(...) and `...` substitution in raw.

    Bash executes command substitutions even when they appear inside double
    quotes; only single-quoted regions suppress them. Callers should pass
    each body back through the classifier so a nested `$(rm -rf /)` or
    `$(git reset --hard)` is not treated as inert text.

    Single-quoted regions, escaped `\\$` and `\\``, and heredoc bodies are
    skipped. Nested `$(...)` is supported by balancing parentheses.
    """
    bodies: list[str] = []
    i = 0
    in_single = False
    in_heredoc: str | None = None

    while i < len(raw):
        ch = raw[i]

        # Heredoc tracking: bodies are inert as far as substitutions go
        # (heredoc expansion is its own surface; classify_command will see
        # the raw text and apply the same rules).
        if in_heredoc is not None:
            nl = raw.find('\n', i)
            if nl < 0:
                break
            line = raw[i:nl]
            i = nl + 1
            if line.strip() == in_heredoc:
                in_heredoc = None
            continue

        if not in_single and raw[i:i+2] == "<<":
            j = i + 2
            while j < len(raw) and raw[j] in (' ', '\t'):
                j += 1
            if j < len(raw) and raw[j] in ("'", '"'):
                j += 1
            k = j
            while k < len(raw) and raw[k] not in (' ', '\t', '\n', "'", '"', ')'):
                k += 1
            if k > j:
                in_heredoc = raw[j:k]
                nl = raw.find('\n', i)
                i = nl + 1 if nl >= 0 else len(raw)
                continue

        # Escape: `\$`, `\``, and `\\` suppress substitution recognition.
        if ch == '\\' and i + 1 < len(raw):
            i += 2
            continue

        # Single quotes suppress everything inside; toggle and skip.
        if ch == "'":
            in_single = not in_single
            i += 1
            continue

        if in_single:
            i += 1
            continue

        # $(...) substitution — find the matching close paren, respecting
        # nesting and quoted regions inside the body.
        if ch == '$' and i + 1 < len(raw) and raw[i+1] == '(':
            depth = 1
            j = i + 2
            inner_single = False
            inner_double = False
            while j < len(raw) and depth > 0:
                c = raw[j]
                if c == '\\' and j + 1 < len(raw):
                    j += 2
                    continue
                if not inner_double and c == "'":
                    inner_single = not inner_single
                elif not inner_single and c == '"':
                    inner_double = not inner_double
                elif not inner_single and not inner_double:
                    if c == '(':
                        depth += 1
                    elif c == ')':
                        depth -= 1
                        if depth == 0:
                            bodies.append(raw[i+2:j])
                            j += 1
                            break
                j += 1
            i = j
            continue

        # Backtick substitution. Bash does not support nesting inside the
        # same backtick pair (you need `\``), so a simple scan to the next
        # unescaped backtick is sufficient.
        if ch == '`':
            j = i + 1
            while j < len(raw):
                c = raw[j]
                if c == '\\' and j + 1 < len(raw):
                    j += 2
                    continue
                if c == '`':
                    bodies.append(raw[i+1:j])
                    j += 1
                    break
                j += 1
            i = j
            continue

        i += 1

    return bodies


def strip_quoted_regions(raw: str) -> str:
    """Remove content inside single/double quotes and heredocs.

    Returns only the executable shell surface — quoted literals, heredoc
    bodies, and $(...) subshell content embedded in quotes are replaced
    with whitespace so that regex patterns only match actual commands.

    Note: command substitutions inside double quotes execute in Bash. This
    helper still blanks them so the surrounding command's literal pattern
    matching is not confused; callers handle substitutions separately via
    extract_command_substitutions().
    """
    result: list[str] = []
    i = 0
    in_single = False
    in_double = False
    in_heredoc: str | None = None

    while i < len(raw):
        ch = raw[i]

        # Heredoc detection (outside quotes)
        if not in_single and not in_double and in_heredoc is None:
            if raw[i:i+2] == "<<":
                j = i + 2
                while j < len(raw) and raw[j] in (' ', '\t'):
                    j += 1
                if j < len(raw) and raw[j] in ("'", '"'):
                    j += 1
                k = j
                while k < len(raw) and raw[k] not in (' ', '\t', '\n', "'", '"', ')'):
                    k += 1
                if k > j:
                    in_heredoc = raw[j:k]
                    # Keep the << marker but skip to end of line
                    result.append(raw[i:i+2])
                    nl = raw.find('\n', i)
                    if nl >= 0:
                        i = nl + 1
                    else:
                        i = len(raw)
                    continue

        # Inside heredoc: skip until closing marker
        if in_heredoc is not None:
            nl = raw.find('\n', i)
            if nl < 0:
                i = len(raw)
                continue
            line = raw[i:nl]
            i = nl + 1
            if line.strip() == in_heredoc:
                in_heredoc = None
            else:
                result.append(' ')  # placeholder
            continue

        # Escape handling
        if ch == '\\' and not in_single:
            result.append(' ')
            i += 2
            continue

        # Quote tracking
        if ch == "'" and not in_double:
            if in_single:
                in_single = False
            else:
                in_single = True
            i += 1
            continue
        if ch == '"' and not in_single:
            if in_double:
                in_double = False
            else:
                in_double = True
            i += 1
            continue

        # Inside quotes: replace with space
        if in_single or in_double:
            result.append(' ')
            i += 1
            continue

        result.append(ch)
        i += 1

    return ''.join(result)


# ---------------------------------------------------------------------------
# Main classifier
# ---------------------------------------------------------------------------

def build_command_fact(segment: str, adapters: dict | None = None) -> CommandFact:
    """Parse one command segment into a typed CommandFact.

    Slice 0 populates the structural fields (executable, basename-resolved,
    wrappers peeled, flags, targets) so the fact builder is demonstrably live
    (CAWS_CLASSIFY_FACTS_DUMP). Facet ASSIGNMENT from adapters + engine rules
    is deliberately minimal here (kind stays NONE unless a wrapper marks
    PRIV_ESC) — full facet derivation is Slice 2 work. Never raises; on a
    parse failure it returns a low-confidence fact.
    """
    fact = CommandFact()
    try:
        tokens = shlex.split(segment, comments=False, posix=True)
    except ValueError:
        fact.parse_confidence = "low"
        return fact
    if not tokens:
        fact.parse_confidence = "low"
        return fact

    # Peel env assignments + known wrappers, recording them. Reuses the
    # existing normalization intent without rebuilding tokenization.
    i = 0
    wrappers: list[str] = []
    while i < len(tokens):
        tok = tokens[i]
        if "=" in tok and not tok.startswith("-") and re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", tok):
            wrappers.append(tok)
            i += 1
            continue
        base = command_basename(tok)
        if base in {"env", "command", "nohup", "builtin", "time", "sudo", "doas"}:
            wrappers.append(base)
            i += 1
            # skip env/time option flags conservatively
            while i < len(tokens) and tokens[i].startswith("-"):
                i += 1
            continue
        break

    if i >= len(tokens):
        fact.wrappers = wrappers
        fact.parse_confidence = "partial"
        return fact

    fact.wrappers = wrappers
    fact.executable_path = tokens[i]
    fact.executable = command_basename(tokens[i])
    fact.argv = tokens[i + 1:]
    fact.flags = {t for t in fact.argv if t.startswith("-")}
    positional = [t for t in fact.argv if not t.startswith("-")]
    fact.subcommand_path = positional[:2]
    fact.targets = positional

    # Engine rule (always-on, tool-agnostic): sudo/su/doas => privilege escalation.
    if "sudo" in wrappers or "doas" in wrappers or fact.executable in {"su", "sudo", "doas"}:
        fact.kind = "PRIV_ESC"
        fact.domain = "local"
        fact.trace_label = "PRIV_ESC"

    # Scope inference from flags/targets (data for the lattice; not acted on in Slice 0).
    if BROAD_SCOPE_INDICATORS & fact.flags:
        fact.scope = "broad"
    if any(p in PROD_SCOPE_INDICATORS for p in positional):
        fact.scope = "prod"

    # Opaque-exec STRUCTURAL fact (shadow-only — Slice 1). For exec-family
    # executables, record the payload and whether it is a literal we could
    # recurse-classify or an opaque expansion we cannot inspect. This populates
    # CommandFact.payload/opacity so Slice 2's opaque-exec recursion has its
    # inputs; it assigns NO kind and drives NO decision here (zero change).
    if fact.executable in OPAQUE_EXEC_EXECUTABLES:
        # the payload is the first positional after the executable (e.g. the
        # string after `eval`, or the `-c`/`-e` argument for sh/python/node).
        payload = ""
        if fact.executable in {"sh", "bash", "zsh", "dash"}:
            # take the token following a -c flag, if present
            for idx, tok in enumerate(fact.argv):
                if tok == "-c" and idx + 1 < len(fact.argv):
                    payload = fact.argv[idx + 1]
                    break
        elif fact.executable in {"python", "python3", "node", "ruby", "perl"}:
            for idx, tok in enumerate(fact.argv):
                if tok in {"-c", "-e"} and idx + 1 < len(fact.argv):
                    payload = fact.argv[idx + 1]
                    break
        else:  # eval / exec / xargs — payload is the joined positional remainder
            payload = " ".join(positional)
        fact.payload = payload
        if not payload:
            fact.opacity = "none"
        elif re.search(r"\$\(|\$\{|\$[A-Za-z_]|`", payload):
            fact.opacity = "opaque"   # $VAR / $(...) / ${...} / backtick — cannot inspect
        else:
            fact.opacity = "literal"  # recurse-classifiable in Slice 2

    # Tool-adapter facet derivation (Slice 2). Skips exec-family (routed via
    # opacity above) and PRIV_ESC (already set). Mutates fact.kind/domain/
    # reversibility/blast_radius/trace_label, then applies amplifier tightening.
    if fact.kind == "NONE" and fact.executable not in OPAQUE_EXEC_EXECUTABLES:
        derive_facets(fact, adapters)
    return fact


def derive_facets(fact: "CommandFact", adapters: dict | None) -> None:
    """Assign abstract facets from the built-in default adapters ∪ user sidecar,
    then apply amplifier-flag / scope tightening. The lattice reads the result.

    The concrete trace label is recorded for debug only. Amplifier flags
    (--recursive/--volumes/--force/--all/--delete/--destroy/--prune/-y/...) and
    prod/broad scope TIGHTEN reversibility/scope, but ONLY once a mutation/destroy
    kind is present — a bare amplifier on a READ never escalates.
    """
    exe = fact.executable
    base: dict | None = None

    # 1. curl/http: method from -X/--request, or inferred from -d/--data*.
    if exe in {"curl", "http", "wget"}:
        method = ""
        for idx, tok in enumerate(fact.argv):
            if tok in {"-X", "--request"} and idx + 1 < len(fact.argv):
                method = fact.argv[idx + 1].upper()
                break
            if tok.startswith("-X") and len(tok) > 2:
                method = tok[2:].upper()
                break
        has_data = any(t in {"-d", "--data"} or t.startswith(("--data", "-d")) for t in fact.flags)
        if method in {"POST", "PUT", "PATCH", "DELETE"} or (not method and has_data):
            base = {"kind": "MUTATE", "domain": "http", "reversibility": "unknown",
                    "blast": "single", "trace": "HTTP_MUTATE"}

    # 2. cloud CLIs: verb scan over positionals (open-ended services).
    #    HOOK-CAPABILITY-ENGINE-003: compare the first hyphen-segment of each
    #    positional too — service CLIs hyphenate verbs (aws s3api put-object,
    #    delete-bucket, create-stack), which the exact-token scan missed.
    if base is None and exe in CLOUD_CLIS:
        positional = fact.targets
        verb_heads = {v.split("-", 1)[0] for v in positional}
        if any(v in DESTROY_VERBS for v in positional) or verb_heads & DESTROY_VERBS:
            base = {"kind": "DESTROY", "domain": "cloud", "reversibility": "partial",
                    "blast": "single", "trace": "CLOUD_DELETE"}
        elif any(v in MUTATE_VERBS for v in positional) or verb_heads & MUTATE_VERBS:
            base = {"kind": "MUTATE", "domain": "cloud", "reversibility": "partial",
                    "blast": "single", "trace": "CLOUD_MUTATE"}

    # 2.5 calibrations ahead of the adapter table (HOOK-CAPABILITY-ENGINE-003).
    #     NOTE: `kill <numeric-pid>` is NOT carved out to allow. The
    #     terminal-use.deduped corpus rates it intended-allow, but the
    #     load-bearing 80-FN falsification set (HOOK-CAPABILITY-ENGINE-002,
    #     PROC_FORCE_KILL rows) is the safety FLOOR and treats `kill -9 <pid>`
    #     as a must-not-silent-allow. The floor wins: a forced kill stays
    #     ask-class (DESTROY adapter row below). The field FPs that motivated a
    #     carve-out latched under the OLD immediate-latch regime; under
    #     HOOK-ASK-ENFORCEMENT-001 a kill is confirm (single-command), and the
    #     warn-first grace lets a first kill warn rather than freeze. This is a
    #     documented corpus-vs-floor adjudication — the floor is authoritative.
    #     sysctl only mutates with -w / a key=value assignment; bare queries read.
    if base is None and exe == "sysctl":
        if "-w" in fact.flags or any("=" in t for t in fact.targets):
            base = {"kind": "MUTATE", "domain": "local", "reversibility": "partial",
                    "blast": "host", "trace": "KERNEL_MUTATE"}
    #     ansible-playbook with a read-only flag (--version/--help/--check/
    #     --syntax-check/--list-*) does not apply state; only a real run does.
    #     Suppress the () MUTATE catch-all for those (corpus FP: --version).
    _ANSIBLE_READ_FLAGS = {"--version", "--help", "-h", "--check", "-C",
                           "--syntax-check", "--list-tasks", "--list-hosts", "--list-tags"}
    if exe == "ansible-playbook" and (fact.flags & _ANSIBLE_READ_FLAGS):
        return

    # 3. built-in subcommand-prefix table (longest matching prefix wins; () catch-all).
    if base is None and exe in DEFAULT_ADAPTERS:
        best: tuple[tuple[str, ...], dict] | None = None
        for prefix, facets in DEFAULT_ADAPTERS[exe]:
            n = len(prefix)
            if tuple(fact.subcommand_path[:n]) == prefix and (best is None or n > len(best[0])):
                best = (prefix, facets)
        if best is not None:
            base = best[1]

    # 4. user sidecar (alias->facet rows). adapters maps exe -> {subcommands:[{path,facets}], ...}.
    #    Built-ins take precedence is NOT required; sidecar only ADDS tools the defaults miss.
    if base is None and adapters and exe in adapters:
        spec = adapters[exe]
        aliases = spec.get("resource_aliases", {})
        sp = [aliases.get(t, t) for t in fact.subcommand_path]
        best_s: tuple[int, dict] | None = None
        for row in spec.get("subcommands", []):
            prefix = tuple(row["path"])
            n = len(prefix)
            # support '*' single-token wildcard at the tail
            match = all(prefix[k] in ("*", sp[k]) for k in range(n)) if len(sp) >= n else False
            if match and (best_s is None or n > best_s[0]):
                f = row["facets"]
                best_s = (n, {"kind": f["kind"], "domain": f.get("domain", "unknown"),
                              "reversibility": f.get("reversibility", "unknown"),
                              "blast": f.get("blast_radius", "single"),
                              "trace": f.get("trace_label", "")})
        if best_s is not None:
            base = best_s[1]

    if base is None:
        return  # no adapter matched -> kind stays NONE -> lattice gives no opinion

    fact.kind = base["kind"]
    fact.domain = base["domain"]
    fact.reversibility = base["reversibility"]
    fact.blast_radius = base["blast"]
    fact.trace_label = base["trace"]

    # Amplifier tightening — only with a mutation/destroy kind present.
    if fact.kind in {"MUTATE", "DESTROY"}:
        # A destroy-INTENT flag promotes a mutation to a destruction. `terraform
        # apply -destroy` (and `apply --destroy`) is destruction, not mutation —
        # doc: "destroy / apply -destroy -> deny". The flag changes the KIND, not
        # just reversibility, so this must run before the reversibility tightening.
        destroy_intent = {"--destroy", "-destroy"} & fact.flags
        if fact.kind == "MUTATE" and destroy_intent:
            fact.kind = "DESTROY"
            fact.reversibility = "irreversible"
            fact.trace_label = (fact.trace_label or "") + "_DESTROY" if fact.trace_label else "DESTROY"
        amp = MUTATION_AMPLIFIER_FLAGS & fact.flags
        if amp:
            # Irreversibility amplifiers push reversibility down a notch — but
            # only the UNAMBIGUOUS long forms the architecture doc names
            # (--force/--recursive/--volumes/--prune/--delete/--destroy). Bare
            # short flags (-f/-r/-R) are NOT included: -f is --full-cmdline for
            # pkill, --follow for logs, --file elsewhere — treating it as a
            # universal force flag manufactured false denies (pkill -f -> deny).
            # The amplifier must never manufacture a deny from an ambiguous flag.
            irreversibility_amp = {"--recursive", "--volumes", "--prune",
                                   "--delete", "--destroy", "--force"} & amp
            # Domain guard: --force removes recovery for filesystem/container/
            # cloud/iac destruction and for kubectl pod force-delete (skips
            # graceful termination = data loss; doc names it a deny trigger). It
            # does NOT deepen irreversibility for the PROCESS domain (kill
            # reversibility is intrinsic to the signal, not the flag) nor for
            # helm uninstall (a single release removal; --force only ignores
            # hook/resource errors — doc + corpus keep helm uninstall ask-class).
            force_exempt = (fact.domain == "process") or (fact.executable == "helm")
            if irreversibility_amp and not force_exempt:
                fact.reversibility = "irreversible"
            # --all/-A raise scope to broad, but must NOT downgrade an already
            # prod scope (prod is the more severe/specific scope set from a
            # `production`/`staging`/`live` token in build_command_fact). Both
            # deny under the lattice, but the FACET must stay prod for honest
            # attribution (kubectl delete pods --all -n production is prod-scoped,
            # not merely broad).
            if ({"--all", "-A"} & amp) and fact.scope != "prod":
                fact.scope = "broad"
        # prod/broad scope already set on fact.scope by build_command_fact.


def classify_capability_pass(
    segment: str,
    repo_root: Path,
    home: Path,
    cwd: Path,
    adapters: dict | None = None,
    already_decided: bool = False,
    _depth: int = 0,
    fact: "CommandFact | None" = None,
) -> tuple[str, str] | None:
    """Capability-based classification of one segment (Slice 2, active).

    Returns (decision, reason) from the abstract facet lattice, or None when the
    capability layer has no opinion (kind NONE -> the segment falls through to
    the existing classifiers). The decision is derived from FACETS only; the
    concrete trace label appears in the reason for auditability but does not
    drive the branch.

    Fail-closed: a malformed user adapter sidecar (error state) yields a
    diagnostic ask rather than silently degrading to built-ins-only.
    """
    # Sidecar fail-closed THROUGH the active pass. A malformed/over-authority
    # .caws/command-adapters.json surfaces an error state. We do NOT silently
    # degrade to built-ins-only: we classify with built-ins (so built-in-covered
    # dangerous commands still get their correct decision), and for any command
    # the built-ins would leave at NONE (a potential user-adapter target -> would
    # otherwise be a silent allow) we surface a diagnostic ask.
    sidecar_error = adapters.get("__error__") if isinstance(adapters, dict) else None
    effective_adapters = None if sidecar_error else adapters

    if fact is None:
        fact = build_command_fact(segment, effective_adapters)

    if sidecar_error and fact.kind == "NONE" and fact.executable not in OPAQUE_EXEC_EXECUTABLES:
        return "ask", f"command-adapters sidecar invalid (fail-closed): {sidecar_error}"

    # Opaque-exec routing: exec-family executables are classified by payload
    # opacity, NOT adapter lookup. (Slice 2 wires the literal-recurse path here;
    # the deep-escaped nested-shell gap remains a Slice-3 known_gap.)
    if fact.executable in OPAQUE_EXEC_EXECUTABLES:
        if fact.opacity == "opaque":
            return "ask", f"opaque execution — cannot prove payload ({fact.executable})"
        if fact.opacity == "literal" and fact.payload:
            sub = classify_command(
                fact.payload, repo_root, home, cwd,
                _depth=_depth + 1, _adapters=adapters,
            )
            if sub[0] != "allow":
                return sub[0], f"{fact.executable} literal payload: {sub[1]}"
        return None  # benign literal / empty payload -> no opinion

    return lattice_decision(fact)


def classify_command(
    raw_command: str,
    repo_root: Path,
    home: Path,
    cwd: Path,
    caws_worktree: bool = False,
    *,
    _depth: int = 0,
    _adapters: dict | None = None,
) -> tuple[str, str, str, str]:
    """Classify a full command string.

    Returns the most restrictive (decision, reason, source, enforcement) across
    all segments. Priority: deny > ask > allow.

    HOOK-ASK-ENFORCEMENT-001 — enforcement provenance, NOT a flipped ask. Two
    additive fields ride alongside the unchanged decision/reason:
      source      — diagnostic provenance of the WINNING decision: capability |
                    legacy_family | regex | rm_classifier | find_delete |
                    commit_deletions | classifier_error | sidecar_error | unknown.
      enforcement — the wrapper contract block-dangerous.sh branches on:
                    pass | advisory | confirm | block.
    enforcement is DERIVED from (decision, source) by derive_enforcement(): deny
    -> block; allow -> pass; a CAPABILITY-derived ask (facet lattice / opaque-exec,
    carrying structured semantic evidence) or a classifier_error/budget ask ->
    confirm (current-command human approval at the hook boundary); a
    commit_deletions ask carries EXPLICIT confirm enforcement (block-dangerous.sh
    refuses the command with remediation but never arms the latch); every other
    ask (legacy governed-family default, CONFIRM regex, rm/find) -> advisory,
    preserving CAWS-DANGER-LATCH-CATASTROPHIC-ONLY-001. Bare `ask -> block` is
    explicitly rejected.

    `_depth` threads the shared recursion budget through every re-entry path
    (substitution, nested-shell, opaque-exec). At the budget the classifier
    returns a conservative "ask" rather than recursing further.
    `_adapters` caches the loaded sidecar across recursive calls.
    """
    if _depth > MAX_RECURSION_DEPTH:
        # Budget-exceeded ask is a CAPABILITY-derived "cannot prove this is safe"
        # verdict (the engine could not finish analyzing a nested payload) ->
        # confirm enforcement (fail-closed), same class as opaque-exec.
        return ("ask", "recursion budget exceeded — cannot fully analyze nested command",
                "classifier_error", "confirm")
    worst_decision = "allow"
    worst_reason = ""
    worst_source = "unknown"
    worst_enforcement = "pass"

    # Load the user adapter sidecar once and thread it through recursion.
    adapters = _adapters if _adapters is not None else load_command_adapters(repo_root)

    def derive_enforcement(decision: str, source: str, enforcement: str | None) -> str:
        # Explicit enforcement (propagated from a recursed inner result) wins.
        if enforcement is not None:
            return enforcement
        if decision == "deny":
            return "block"
        if decision == "allow":
            return "pass"
        # ask: capability-derived and fail-closed asks confirm; everything else
        # (legacy_family / regex / rm_classifier / find_delete / unknown) is advisory.
        if source in {"capability", "classifier_error", "sidecar_error"}:
            return "confirm"
        return "advisory"

    def escalate(decision: str, reason: str, source: str = "unknown",
                 enforcement: str | None = None) -> None:
        nonlocal worst_decision, worst_reason, worst_source, worst_enforcement
        priority = {"allow": 0, "ask": 1, "deny": 2}
        if priority.get(decision, 0) > priority.get(worst_decision, 0):
            worst_decision = decision
            worst_reason = reason
            worst_source = source
            worst_enforcement = derive_enforcement(decision, source, enforcement)

    # --- Pipeline-aware deny patterns ---
    # Strip quoted regions so patterns only match executable shell surface.
    # This prevents commit messages, echo arguments, etc. from triggering.
    executable_surface = strip_quoted_regions(raw_command)
    for pattern, desc in DENY_PIPELINE_PATTERNS:
        if re.search(pattern, executable_surface, re.IGNORECASE):
            # Pipe-to-LOCAL-SCRIPT carve-out: the GENERIC pipe-to-shell rule is
            # suppressed when every `| bash`/`| sh` pipes into a named script
            # file (safe-by-inspection). The curl/wget rule is never carved out.
            if desc == GENERIC_PIPE_TO_SHELL_DESC and is_pipe_into_local_script(
                executable_surface
            ):
                continue
            escalate("deny", desc, "regex")

    # --- Recursively classify command substitutions ---
    # Bash executes `$(...)` and backtick substitutions even inside double
    # quotes; single-quoted bodies are skipped by extract_command_substitutions.
    # Each extracted body is classified as if it were an independent command.
    for body in extract_command_substitutions(raw_command):
        if not body.strip():
            continue
        sub_decision, sub_reason, sub_source, sub_enforcement = classify_command(
            body, repo_root, home, cwd, caws_worktree,
            _depth=_depth + 1, _adapters=adapters,
        )
        if sub_decision != "allow":
            # Propagate the inner source + enforcement: a capability ask inside
            # $(...) stays source=capability/enforcement=confirm when surfaced
            # on the outer command (A5).
            escalate(sub_decision, f"command substitution: {sub_reason}",
                     sub_source, sub_enforcement)

    segments = segment_command(raw_command)

    for segment in segments:
        nested_result = classify_nested_shell(
            segment, repo_root, home, cwd, caws_worktree, _depth=_depth + 1, _adapters=adapters,
        )
        if nested_result:
            # classify_nested_shell returns the inner (decision, reason, source,
            # enforcement) so a nested capability ask (sh -c "kubectl delete pod")
            # surfaces source=capability/enforcement=confirm outward (A5).
            escalate(*nested_result)
            continue

        git_result = classify_git_semantics(segment, caws_worktree, repo_root)
        # An explicit ("allow", _) from git semantics is an AUTHORITATIVE admit
        # for this git segment (e.g. the CAWS-SCOPE-AMEND-COMMAND-001 spec-only
        # cherry-pick carve-out, or a trusted git-init). It must suppress the
        # CONFIRM regex patterns below that would otherwise re-escalate the same
        # segment to "ask" (the line-level `git cherry-pick` / `git init`
        # patterns). escalate() only raises severity, so without this skip the
        # carve-out's allow would be overridden.
        git_segment_allowed = bool(git_result and git_result[0] == "allow")
        if git_result:
            # git semantics is a legacy detector: a git ask (cherry-pick, reset
            # carve-out edge) is uncertainty, not graded capability risk ->
            # advisory; a git deny (force-push, hard reset) still derives to block.
            escalate(git_result[0], git_result[1], "legacy_family")

        # Strip quoted regions for pattern matching so that e.g.
        # echo "git reset --hard" does not trigger the git pattern.
        # The original segment is still used for rm/find parsing
        # (shlex.split handles quotes correctly for argument extraction).
        segment_surface = strip_quoted_regions(segment)

        # --- Hard-block patterns (segment-level) ---
        for pattern, desc in DENY_SEGMENT_PATTERNS:
            if re.search(pattern, segment_surface, re.IGNORECASE):
                escalate("deny", desc, "regex")

        # --- Hard-block patterns over RAW argument values (Entry 40) ---
        # CLASSIFY-OWNER-IMPERSONATION-DENY-001: authorization values are quoted
        # in real invocations, so these must see `segment`, not the stripped
        # surface. Owner spellings come from the home basename plus the
        # additive CAWS_OWNER_IDENTITIES configuration.
        _owner_alt = _owner_identity_alternation(home)
        for pattern, desc in DENY_RAW_SEGMENT_PATTERNS:
            if re.search(pattern.replace("{OWNER}", _owner_alt), segment, re.IGNORECASE):
                escalate("deny", desc, "regex")

        # --- Confirm patterns (segment-level) ---
        for pattern, desc in CONFIRM_SEGMENT_PATTERNS:
            if re.search(pattern, segment_surface, re.IGNORECASE):
                # Special case: git init in worktree context is allowed
                if "git init" in desc and caws_worktree:
                    continue
                # An authoritative git-semantics allow for this segment
                # (carve-out / trusted init) suppresses the confirm pattern
                # that would re-flag the very same git op.
                if git_segment_allowed:
                    continue
                # CONFIRM regex (git rebase/cherry-pick/amend, git init) is a
                # legacy uncertainty ask -> advisory (CATASTROPHIC-ONLY-001).
                escalate("ask", desc, "regex")

        # --- rm classifier ---
        is_recursive, targets = is_recursive_rm(segment)
        if is_recursive:
            if not targets:
                # Cannot determine targets — be conservative
                escalate("ask", "recursive delete with unparseable targets", "rm_classifier")
            else:
                for target in targets:
                    decision, reason = classify_rm_target(
                        target, repo_root, home, cwd,
                    )
                    escalate(decision, reason, "rm_classifier")

        # --- find -delete classifier ---
        find_result = classify_find_delete(segment)
        if find_result:
            escalate(find_result[0], find_result[1], "find_delete")

        # --- bare-commit staged-deletions classifier ---
        # (CAWS-GUARD-COMMIT-DELETES-UNNAMED-001) A bare `git commit` sweeps
        # the ENTIRE index; when the index stages deletions of tracked files
        # (stale/foreign state), that is destructive. Enforcement is explicit
        # confirm-class: block-dangerous.sh refuses THIS command with the
        # path-scoped remediation but never arms the session latch — the fix
        # (name the intended paths after `--`) is entirely in the agent's
        # own hands. This ask outranks the allow-list admit below because
        # escalate() keeps the most restrictive decision.
        commit_result = classify_commit_deletions(segment, cwd)
        if commit_result:
            escalate(commit_result[0], commit_result[1], "commit_deletions", "confirm")

        # --- DANGER-LATCH-CALIBRATION-001 ---
        # Hybrid fail-closed for governed families (git/gh/npm).
        # Run the allow-list AFTER all deny/confirm/rm/find checks have
        # had a chance to escalate. The allow-list itself never escalates
        # (allow is the lowest tier). It exists to:
        #   (a) tell the governed-family default below to leave this
        #       segment alone (do not escalate to ask),
        #   (b) be auditable as an explicit admit decision in future
        #       diagnostics.
        # If the segment is on the allow-list, skip the hybrid default
        # check. If it is NOT on the allow-list AND the segment is a
        # governed-family command, escalate to "ask".
        allow_result = classify_allow_list(segment)

        # --- Capability pass (HOOK-CAPABILITY-ENGINE) ---
        # Slice 0: build the fact (so the fact builder is live + dumpable) and
        # call the capability pass, which is a STUB returning None. No decision
        # change. Slices 2-3 make this pass emit lattice decisions. Gated on the
        # same condition as the governed-family default so git/gh/npm — handled
        # by their own stack — are untouched.
        if allow_result is None and not git_segment_allowed:
            # A malformed sidecar surfaces {"__error__": ...}; build facts with
            # built-ins only (the pass handles the fail-closed ask separately).
            _eff_adapters = None if (isinstance(adapters, dict) and adapters.get("__error__")) else adapters
            fact = build_command_fact(segment, _eff_adapters)
            if os.environ.get("CAWS_CLASSIFY_FACTS_DUMP") == "1":
                # Shadow-mode diagnostics go to STDERR only; the stdout
                # {"decision","reason"} contract is unchanged.
                sys.stderr.write(json.dumps({
                    "caws_command_fact": {
                        "segment": segment,
                        "executable": fact.executable,
                        "wrappers": fact.wrappers,
                        "subcommand_path": fact.subcommand_path,
                        "flags": sorted(fact.flags),
                        "targets": fact.targets,
                        "payload": fact.payload,
                        "facets": fact.facets(),
                        "trace_label": fact.trace_label,
                        "parse_confidence": fact.parse_confidence,
                    },
                }) + "\n")
            cap_result = classify_capability_pass(
                segment, repo_root, home, cwd,
                adapters=adapters,
                already_decided=(worst_decision != "allow"),
                _depth=_depth + 1,
                fact=fact,
            )
            if cap_result is not None:
                # The capability pass is the SOLE source of confirm-class asks:
                # any ask/deny it returns is facet-derived (lattice / opaque-exec /
                # sidecar-fail-closed), so a capability ask routes to current-
                # command human confirmation at the hook boundary (A1). A capability
                # deny still derives to block. source=capability.
                escalate(cap_result[0], cap_result[1], "capability")

        if allow_result is None and not git_segment_allowed:
            # git_segment_allowed: an authoritative git-semantics allow for this
            # segment (CAWS-SCOPE-AMEND-COMMAND-001 spec-only cherry-pick
            # carve-out, or trusted init) must also suppress the
            # governed-family "unknown git subcommand" default — otherwise that
            # detector independently re-escalates the same git op to "ask".
            family_result = classify_governed_family_default(segment)
            if family_result is not None:
                # governed-family default ask (unknown git/gh/npm subcommand) is
                # LEGACY uncertainty -> advisory, preserving CATASTROPHIC-ONLY-001 (A2).
                escalate(family_result[0], family_result[1], "legacy_family")

    return worst_decision, worst_reason, worst_source, worst_enforcement


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Classify shell command safety")
    parser.add_argument("--repo-root", default=os.environ.get("CAWS_PROJECT_DIR") or os.environ.get("CLAUDE_PROJECT_DIR") or os.environ.get("CODEX_PROJECT_DIR", "."))
    parser.add_argument("--home", default=str(Path.home()))
    parser.add_argument("--cwd", default=os.getcwd())
    args = parser.parse_args()

    raw_command = sys.stdin.read()

    repo_root = Path(args.repo_root).resolve(strict=False)
    home = Path(args.home).resolve(strict=False)
    cwd = Path(args.cwd).resolve(strict=False)
    caws_worktree = has_trusted_git_init_context(repo_root)

    decision, reason, source, enforcement = classify_command(
        raw_command, repo_root, home, cwd, caws_worktree,
    )

    # ADDITIVE contract (HOOK-ASK-ENFORCEMENT-001): decision + reason are
    # unchanged; source (diagnostic provenance) + enforcement (the wrapper
    # contract block-dangerous.sh branches on) are added. A jq consumer reading
    # only .decision/.reason is unaffected; both new fields are ALWAYS present
    # for a stable contract.
    json.dump(
        {"decision": decision, "reason": reason,
         "source": source, "enforcement": enforcement},
        sys.stdout,
    )


if __name__ == "__main__":
    main()
