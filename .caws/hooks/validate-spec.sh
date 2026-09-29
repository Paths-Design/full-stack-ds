#!/bin/bash
# CAWS-MANAGED-HOOK
# hook_pack: shared
# hook_pack_version: 88
# caws_min_major: 11
# lineage_refs: 8,13
# edit_stance: YOURS TO EDIT. This is a starting hook, not a locked one — shape it
#   to your repo: tune thresholds, add checks, remove what does not fit. Your edits
#   are preserved: caws init treats a changed hook as intended growth and will not
#   clobber it — it shows a diff and asks (--adopt keeps yours; --overwrite --force
#   takes the upstream template). The CAWS-MANAGED-HOOK marker above is only how caws
#   init finds hooks it can offer updates for; it is NOT a keep-out sign. CAWS owns the
#   failure-class invariant (the why/what a guard protects); you own the how. The one
#   edit to avoid: gutting a guard to dodge a block instead of fixing the cause. Grow
#   everything else freely.
# CAWS Spec Validation Hook
# Validates a .caws/specs/*.yaml file when it's edited. OPT-IN: not wired into
# the default post_tool_use HANDLERS array.
#
# CAWS-SPECS-VALIDATE-FILE-CMD-001 (Half B): validation is delegated to the
# canonical `caws specs validate <file>` command (parse->shape->semantics via
# the kernel, using the CLI's OWN bundled js-yaml). The hook no longer embeds a
# `node -e require('js-yaml')` block — that assumed the consumer is a Node
# project with js-yaml resolvable from the hook's exec context, which is false
# for non-Node consumers (Sterling etc.) and caused the
# CAWS-VALIDATE-SPEC-JSYAML-CONFLATION-001 "YAML syntax error: Cannot find
# module 'js-yaml'" misreport on every spec edit. Validation now lives in CAWS
# tooling, language-agnostically. The prior V2 `test_nodeids` advisory block was
# also dropped: it read v10 `status`/`acceptance_criteria` fields (v11 is
# `lifecycle_state`/`acceptance`), so it never fired on a v11 spec, and it
# depended on the same embedded js-yaml.
# @author @darianrosebrook

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/parse-input.sh
source "$SCRIPT_DIR/lib/parse-input.sh"
# shellcheck source=lib/agent-surface.sh
source "$SCRIPT_DIR/lib/agent-surface.sh" 2>/dev/null || true
# shellcheck source=lib/emit.sh
# Canonical envelope emitters (HOOK-LIB-CONSOLIDATION-001 T3a).
# caws_source_lib prefers vendor override, falls back to shared default.
caws_source_lib emit.sh 2>/dev/null || true
parse_hook_input

FILE_PATH="$HOOK_FILE_PATH"

# Thin adapter over the canonical lib/emit.sh PostToolUse additionalContext
# primitive. Was a bespoke python3 json.dumps copy (HOOK-LIB-CONSOLIDATION-001
# T3a) — the emitted JSON is byte-identical (verified).
emit_post_context() { emit_additional_context "$1" "PostToolUse"; }

# Only validate CAWS YAML files
if [[ "$FILE_PATH" != *".caws/"* ]] || ([[ "$FILE_PATH" != *.yaml ]] && [[ "$FILE_PATH" != *.yml ]]); then
  exit 0
fi

# Delegate validation to the canonical CLI command. `caws specs validate <file>`
# is path-shaped (takes a file path, not a spec id), runs the kernel
# parse->shape->semantics pipeline with the CLI's own bundled parser, and exits
# 0 valid / non-zero invalid|unreadable. This works for ANY consumer regardless
# of language — the hook carries no parser dependency of its own.
#
# Resolve the binary via CAWS_BIN (override hook) defaulting to `caws` on PATH.
# If it is not resolvable, exit 0 silently — same posture as agent-heartbeat.sh.
# We do NOT emit an advisory on every edit when the validator is absent: that is
# exactly the per-edit noise CAWS-VALIDATE-SPEC-JSYAML-CONFLATION-001 removed.
CAWS_BIN="${CAWS_BIN:-caws}"
if ! command -v "$CAWS_BIN" >/dev/null 2>&1; then
  exit 0
fi

if ! VALIDATE_OUT=$("$CAWS_BIN" specs validate "$FILE_PATH" 2>&1); then
  emit_post_context "Spec validation failed for ${FILE_PATH}:

${VALIDATE_OUT}

Fix the spec before relying on it. Validate locally with: ${CAWS_BIN} specs validate ${FILE_PATH}"
fi

exit 0
