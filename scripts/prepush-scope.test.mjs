/**
 * PREPUSH-SCOPED-GATE-01 A1 — contract test for the pre-push diff classifier.
 * Pure (no deps); run with: node --test scripts/prepush-scope.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify } from "./prepush-scope.mjs";

const on = (r, ...k) => k.every((key) => r[key] === true);
const off = (r, ...k) => k.every((key) => r[key] === false);

test("docs-only push: docs-claims only — no token/generate/rail/lint/typecheck/tests", () => {
  const r = classify(["docs/foo.md", "docs/component-audit/README.md"]);
  assert.equal(r.RUN_DOCS_CLAIMS, true);
  assert.ok(
    off(r, "RUN_TOKEN_BUILD", "RUN_TOKEN_GATES", "RUN_GENERATE_CHECK", "RUN_RAIL", "RUN_LINT", "RUN_TYPECHECK", "RUN_TESTS"),
  );
});

test("spec-only (.caws/*.yaml) push: nothing runs", () => {
  const r = classify([".caws/specs/FOO-01.yaml"]);
  assert.ok(
    off(r, "RUN_TOKEN_BUILD", "RUN_TOKEN_GATES", "RUN_GENERATE_CHECK", "RUN_RAIL", "RUN_LINT", "RUN_TYPECHECK", "RUN_TESTS", "RUN_DOCS_CLAIMS"),
  );
});

test("scripts-only (.mjs) push: lint only — loose .mjs isn't typechecked/tested", () => {
  const r = classify(["scripts/component-audit/audit.mjs"]);
  assert.equal(r.RUN_LINT, true);
  assert.ok(off(r, "RUN_TYPECHECK", "RUN_TESTS", "RUN_RAIL", "RUN_TOKEN_GATES", "RUN_GENERATE_CHECK"));
});

test("token source change: token build + gates + generate:check + rail", () => {
  const r = classify(["packages/ds-tokens/src/core/color.json"]);
  assert.ok(on(r, "RUN_TOKEN_BUILD", "RUN_TOKEN_GATES", "RUN_GENERATE_CHECK", "RUN_RAIL"));
});

test("contract change (.json, no .ts): generate:check + rail + tests + docs-claims, no token gates", () => {
  const r = classify(["packages/ds-contracts/components/Button/Button.styles.json"]);
  assert.ok(on(r, "RUN_GENERATE_CHECK", "RUN_RAIL", "RUN_TESTS", "RUN_DOCS_CLAIMS", "RUN_TOKEN_BUILD"));
  assert.equal(r.RUN_TOKEN_GATES, false); // no ds-tokens source changed
});

test("codegen source (.ts): lint + typecheck + tests + generate:check + rail", () => {
  const r = classify(["packages/ds-codegen/src/ir.ts"]);
  assert.ok(on(r, "RUN_LINT", "RUN_TYPECHECK", "RUN_TESTS", "RUN_GENERATE_CHECK", "RUN_RAIL"));
});

test("showcase src (.tsx): lint + typecheck + tests, no rail/generate/token-gates", () => {
  const r = classify(["src/views/TokensView.tsx"]);
  assert.ok(on(r, "RUN_LINT", "RUN_TYPECHECK", "RUN_TESTS"));
  assert.ok(off(r, "RUN_RAIL", "RUN_GENERATE_CHECK", "RUN_TOKEN_GATES"));
});

test("GPUI Rust source changes reach generation and committed-byte drift gates", () => {
  const flags = classify(["packages/ds-gpui/src/components/Switch/Switch.rs"]);
  assert.equal(flags.RUN_RAIL, true);
  assert.equal(flags.RUN_GENERATE_CHECK, true);
});

test("generated framework change (.tsx): rail + generate:check + tests + typecheck + lint", () => {
  const r = classify(["packages/ds-react/src/components/Table/Table.tsx"]);
  assert.ok(on(r, "RUN_RAIL", "RUN_GENERATE_CHECK", "RUN_TESTS", "RUN_TYPECHECK", "RUN_LINT"));
});

test("--full / indeterminate range: every group runs", () => {
  const r = classify([], { full: true });
  assert.ok(
    on(
      r,
      "RUN_TOKEN_BUILD",
      "RUN_TOKEN_GATES",
      "RUN_GENERATE_CHECK",
      "RUN_DOCS_CLAIMS",
      "RUN_LINT",
      "RUN_TYPECHECK",
      "RUN_TESTS",
      "RUN_RAIL",
      "RUN_BEHAVIOR_AUDIT",
      "RUN_A11Y_AUDIT",
      "RUN_SWIFTUI_SEMANTIC_DEFAULTS",
      "RUN_RAIL_TOOLCHAIN_COUPLING",
    ),
  );
});

test("empty range (no files): nothing runs", () => {
  const r = classify([]);
  assert.ok(
    off(
      r,
      "RUN_TOKEN_BUILD",
      "RUN_TOKEN_GATES",
      "RUN_GENERATE_CHECK",
      "RUN_DOCS_CLAIMS",
      "RUN_LINT",
      "RUN_TYPECHECK",
      "RUN_TESTS",
      "RUN_RAIL",
      "RUN_BEHAVIOR_AUDIT",
      "RUN_A11Y_AUDIT",
      "RUN_SWIFTUI_SEMANTIC_DEFAULTS",
      "RUN_RAIL_TOOLCHAIN_COUPLING",
    ),
  );
});

test("mixed docs + contract: union (rail + generate + docs-claims + tests)", () => {
  const r = classify(["docs/x.md", "packages/ds-contracts/components/Card/Card.contract.json"]);
  assert.ok(on(r, "RUN_DOCS_CLAIMS", "RUN_GENERATE_CHECK", "RUN_RAIL", "RUN_TESTS"));
});

// --- iconography committed-output drift ------------------------------------
// The emission ledger attests the freshly generated edge set, but its own
// check rebuilds before comparing that edge set. It cannot by itself prove the
// committed package-root index files equal those fresh bytes. Both automation
// surfaces therefore owe the byte-diff check before ledger attestation.

test("an iconography change runs its dedicated gate group", () => {
  assert.equal(
    classify(["packages/ds-iconography/icons/Add/Add.icon.json"])
      .RUN_ICONOGRAPHY,
    true,
  );
});

test("CI and pre-push both check committed icon exports before the ledger", () => {
  for (const [surface, url] of [
    ["CI", new URL("../.github/workflows/ci.yml", import.meta.url)],
    ["pre-push", new URL("../.githooks/pre-push", import.meta.url)],
  ]) {
    const source = readFileSync(url, "utf8");
    const buildCheck = source.indexOf("pnpm run iconography:build:check");
    const ledgerCheck = source.indexOf("pnpm run iconography:ledger:check");
    assert.notEqual(buildCheck, -1, `${surface} omits committed-export drift`);
    assert.notEqual(ledgerCheck, -1, `${surface} omits ledger drift`);
    assert.ok(buildCheck < ledgerCheck, `${surface} must byte-check before attesting`);
  }
});

// --- native authority checks ------------------------------------------------
// CI already runs the Swift defaults drift check. The scoped local hook must
// run it for every input capable of changing the generated defaults table or
// the component refs that select its rows.

test("every Swift semantic-defaults input runs its local drift check", () => {
  for (const path of [
    "packages/ds-contracts/components/Card/Card.tokens.json",
    "packages/ds-codegen/src/frameworks/swift/swiftui/component-source.ts",
    "packages/ds-tokens/src/color/semantic/background.tokens.json",
    "packages/ds-swiftui/Sources/DsSwiftUI/Components/Card/CardTokens.swift",
    "packages/ds-swiftui/Sources/DsSwiftUI/Tokens/FsdsTheme.swift",
    "scripts/generate-swiftui-semantic-defaults.mjs",
  ]) {
    assert.equal(
      classify([path]).RUN_SWIFTUI_SEMANTIC_DEFAULTS,
      true,
      `${path} must run the Swift semantic-defaults drift check`,
    );
  }
  assert.equal(
    classify(["docs/architecture/tokens-architecture.md"])
      .RUN_SWIFTUI_SEMANTIC_DEFAULTS,
    false,
  );
});

test("every rail-toolchain coupling authority runs the coupling check", () => {
  for (const path of [
    "packages/ds-codegen/src/validation/admission-descriptor.ts",
    "packages/ds-codegen/src/validation/frameworks/react.ts",
    "packages/ds-compose-smoke/compile-lane.json",
    "packages/ds-swift-smoke/compile-lane.json",
    "scripts/run-native-compile-lane.mjs",
    "scripts/rail-toolchain-coupling-audit.mjs",
    "scripts/prepush-scope.mjs",
    "scripts/prepush-scope.test.mjs",
    ".github/workflows/ci.yml",
    ".githooks/pre-push",
    "fsds.targets.json",
    "package.json",
  ]) {
    assert.equal(
      classify([path]).RUN_RAIL_TOOLCHAIN_COUPLING,
      true,
      `${path} must run the rail-toolchain coupling check`,
    );
  }
  assert.equal(
    classify(["docs/specifications/admission-rail.md"])
      .RUN_RAIL_TOOLCHAIN_COUPLING,
    false,
  );
});

test("CI and pre-push execute the classifier contract and both authority checks", () => {
  for (const [surface, url] of [
    ["CI", new URL("../.github/workflows/ci.yml", import.meta.url)],
    ["pre-push", new URL("../.githooks/pre-push", import.meta.url)],
  ]) {
    const source = readFileSync(url, "utf8");
    assert.match(
      source,
      /node --test scripts\/prepush-scope\.test\.mjs/,
      `${surface} does not execute the classifier contract`,
    );
    assert.match(
      source,
      /node scripts\/rail-toolchain-coupling-audit\.mjs --check/,
      `${surface} does not execute the coupling check`,
    );
    assert.match(
      source,
      /pnpm run swiftui:semantic-defaults:check/,
      `${surface} does not execute the Swift defaults drift check`,
    );
  }
});

// --- contract-oracle catalog integrity --------------------------------------
// The local hook runs only the cheap pointer/one-leaf self-check. Full mutant
// execution is a scheduled/manual CI lane because it runs the complete rail
// once for the baseline and again for every curated contract mutation.

test("a contract change runs the contract-oracle catalog self-check", () => {
  assert.equal(
    classify(["packages/ds-contracts/components/Dialog/Dialog.contract.json"])
      .RUN_CONTRACT_ORACLE_SELFCHECK,
    true,
  );
});

test("editing the mutation tool runs its catalog self-check", () => {
  assert.equal(
    classify(["scripts/contract-oracle-mutation/catalog.mjs"])
      .RUN_CONTRACT_ORACLE_SELFCHECK,
    true,
  );
});

test("editing package scripts runs the contract-oracle catalog self-check", () => {
  assert.equal(classify(["package.json"]).RUN_CONTRACT_ORACLE_SELFCHECK, true);
});

test("docs-only and empty ranges skip the contract-oracle catalog self-check", () => {
  assert.equal(classify(["docs/x.md"]).RUN_CONTRACT_ORACLE_SELFCHECK, false);
  assert.equal(classify([]).RUN_CONTRACT_ORACLE_SELFCHECK, false);
});

test("a full pre-push run includes the contract-oracle catalog self-check", () => {
  assert.equal(
    classify([], { full: true }).RUN_CONTRACT_ORACLE_SELFCHECK,
    true,
  );
});

// --- styling-realization ledgers (RAIL-STYLING-REALIZATION-LEDGERS-01) -------
// The ledgers classify contracts against committed generated React output, so
// each of those inputs must trigger them; unrelated pushes must not.

test("a contract change runs the styling-realization ledgers", () => {
  const r = classify(["packages/ds-contracts/components/Chip/Chip.styles.json"]);
  assert.equal(r.RUN_STYLING_AUDITS, true);
});

test("a generated ds-react change runs the styling-realization ledgers", () => {
  // A regenerated <C>.css can move a slot from consumed to dead without any
  // contract edit — the classified bytes changed, so the verdict can too.
  const r = classify(["packages/ds-react/src/components/Chip/Chip.css"]);
  assert.equal(r.RUN_STYLING_AUDITS, true);
});

test("editing the state-suppression rail runs the styling-realization ledgers", () => {
  assert.equal(
    classify(["scripts/state-suppression-audit/audit.mjs"]).RUN_STYLING_AUDITS,
    true,
  );
});

test("editing an audit or the shared ratchet runs the styling-realization ledgers", () => {
  assert.equal(classify(["scripts/dead-slot-audit/audit.mjs"]).RUN_STYLING_AUDITS, true);
  assert.equal(classify(["scripts/pseudo-state-audit/audit.mjs"]).RUN_STYLING_AUDITS, true);
  assert.equal(classify(["scripts/lib/ledger-ratchet.mjs"]).RUN_STYLING_AUDITS, true);
});

test("a docs-only push does NOT run the styling-realization ledgers", () => {
  assert.equal(classify(["docs/x.md"]).RUN_STYLING_AUDITS, false);
});

test("an unrelated package change does NOT run the styling-realization ledgers", () => {
  // ds-vue is not the reference framework the audits classify against.
  assert.equal(
    classify(["packages/ds-vue/src/components/Chip/Chip.vue"]).RUN_STYLING_AUDITS,
    false,
  );
});

// --- token-reference resolvability (RAIL-TOKEN-REFERENCE-RESOLVABILITY-01) ---
// This audit's verdict is a diff between two name spaces, so both sides are
// inputs. These pin that BOTH sides trigger it — a rail wired to only one side
// of a diff goes quietly blind whenever the other side moves.

test("changing generated React CSS runs the token-resolvability ledger", () => {
  assert.equal(
    classify(["packages/ds-react/src/components/Button/Button.tokens.css"])
      .RUN_TOKEN_RESOLVABILITY,
    true,
  );
});

test("changing a token source runs the token-resolvability ledger", () => {
  // Renaming a token is exactly how a previously-resolving reference goes
  // dangling, so ds-tokens must trigger it even though the finding surfaces in
  // ds-react.
  assert.equal(
    classify(["packages/ds-tokens/src/color/semantic/foreground.tokens.json"])
      .RUN_TOKEN_RESOLVABILITY,
    true,
  );
});

test("editing the resolvability audit runs it, and builds the graph it needs", () => {
  // A scripts-only change is outside genGroup, so without the explicit
  // `|| resolvability` on RUN_TOKEN_BUILD the audit would run against a missing
  // composed graph — failing for the wrong reason.
  const flags = classify(["scripts/token-resolvability-audit/audit.mjs"]);
  assert.equal(flags.RUN_TOKEN_RESOLVABILITY, true);
  assert.equal(flags.RUN_TOKEN_BUILD, true);
});

test("a docs-only push does NOT run the token-resolvability ledger", () => {
  assert.equal(classify(["docs/x.md"]).RUN_TOKEN_RESOLVABILITY, false);
});

// --- custom-region occupancy (RAIL-CUSTOM-REGION-GATE-01) --------------------
// The audit's inputs are the six EMITTED trees and its own scripts. These pin
// the boundary in both directions, because the failure mode this rail exists to
// catch — a hand edit inside a generated artifact — is precisely a change that
// no OTHER flag group would fire on if the scoping were wrong.

test("editing a generated web artifact runs the custom-region ledger", () => {
  assert.equal(
    classify(["packages/ds-vue/src/components/Blockquote/Blockquote.css"]).RUN_CUSTOM_REGIONS,
    true,
  );
});

test("editing a generated react-native artifact runs the custom-region ledger", () => {
  // The audit scans all six emitted trees, not just the five web families, so
  // an RN-only push must fire it — unlike the behavior rail, which is web-only.
  assert.equal(
    classify(["packages/ds-react-native/src/components/Card/Card.tsx"]).RUN_CUSTOM_REGIONS,
    true,
  );
});

test("editing preserve.ts runs the custom-region ledger", () => {
  // preserve.ts owns the marker grammar the audit mirrors; a change there can
  // move every verdict at once, which is the worst kind of silent drift.
  assert.equal(
    classify(["packages/ds-codegen/src/preserve.ts"]).RUN_CUSTOM_REGIONS,
    true,
  );
});

test("editing the custom-region audit runs it", () => {
  assert.equal(
    classify(["scripts/custom-region-audit/known-authored-regions.json"]).RUN_CUSTOM_REGIONS,
    true,
  );
});

test("a contract-only push does NOT run the custom-region ledger", () => {
  // Deliberate: a contract edit alone cannot occupy a region — only a write
  // into a generated file can. The regenerated bytes that follow land in the
  // emitted trees, and THOSE fire the group.
  assert.equal(
    classify(["packages/ds-contracts/components/Card/Card.contract.json"]).RUN_CUSTOM_REGIONS,
    false,
  );
});

test("a docs-only push does NOT run the custom-region ledger", () => {
  assert.equal(classify(["docs/x.md"]).RUN_CUSTOM_REGIONS, false);
});

// --- motion-realization (RAIL-REDUCED-MOTION-01) -----------------------------
// Four input surfaces, and each one can move a verdict on its own. The
// ds-codegen case matters most: the reduced-motion block is DERIVED, so an
// emitter change can strip it from every component at once — the one failure
// mode where a silent rail would be worst.

test("changing a contract runs the motion rail", () => {
  assert.equal(
    classify(["packages/ds-contracts/components/Dialog/Dialog.contract.json"]).RUN_MOTION_AUDIT,
    true,
  );
});

test("changing codegen runs the motion rail", () => {
  assert.equal(classify(["packages/ds-codegen/src/css.ts"]).RUN_MOTION_AUDIT, true);
});

test("renaming a motion token runs the motion rail", () => {
  // Exactly how a resolving duration reference goes dangling.
  assert.equal(
    classify(["packages/ds-tokens/src/motion/core/easing.tokens.json"]).RUN_MOTION_AUDIT,
    true,
  );
});

test("the motion rail builds the token graph it compares against", () => {
  // Without this the resolvability class reads every reference as dangling —
  // failing loudly, but for the wrong reason.
  const flags = classify(["scripts/motion-realization-audit/audit.mjs"]);
  assert.equal(flags.RUN_MOTION_AUDIT, true);
  assert.equal(flags.RUN_TOKEN_BUILD, true);
});

test("a docs-only push does NOT run the motion rail", () => {
  assert.equal(classify(["docs/x.md"]).RUN_MOTION_AUDIT, false);
});

// --- analytical derived artifacts (REL-FIELD-ALGEBRA-02) ---------------------
// Two projections, one authority each: JSON Schemas from the zod model, the
// showcase dump from fixtures.jsonl. Every input surface and every emitted
// surface can move a verdict on its own.

test("changing the zod model or its emitter runs the analytical checks", () => {
  assert.equal(classify(["packages/ds-codegen/src/analytical/relation-model.ts"]).RUN_ANALYTICAL_CHECKS, true);
  assert.equal(classify(["packages/ds-codegen/src/analytical/emit-schemas.ts"]).RUN_ANALYTICAL_CHECKS, true);
});

test("hand-editing an emitted schema or the fixture corpus runs the analytical checks", () => {
  assert.equal(classify(["packages/ds-contracts/relation.contract.schema.json"]).RUN_ANALYTICAL_CHECKS, true);
  assert.equal(classify(["packages/ds-contracts/analytical-fixtures/fixtures.jsonl"]).RUN_ANALYTICAL_CHECKS, true);
});

test("touching the showcase dump or the sync script runs the analytical checks", () => {
  assert.equal(classify(["src/data/analytical-fixtures/fixtures.ts"]).RUN_ANALYTICAL_CHECKS, true);
  assert.equal(classify(["scripts/sync-analytical-fixtures.mjs"]).RUN_ANALYTICAL_CHECKS, true);
});

test("a component contract or docs-only push does NOT run the analytical checks", () => {
  assert.equal(classify(["packages/ds-contracts/components/Dialog/Dialog.contract.json"]).RUN_ANALYTICAL_CHECKS, false);
  assert.equal(classify(["docs/x.md"]).RUN_ANALYTICAL_CHECKS, false);
});

test("the custom-region ledger needs no token build", () => {
  // It reads committed source only. If this ever flips true, the audit has
  // grown a dependency on generated token state it does not actually use.
  const flags = classify(["scripts/custom-region-audit/audit.mjs"]);
  assert.equal(flags.RUN_CUSTOM_REGIONS, true);
  assert.equal(flags.RUN_TOKEN_BUILD, false);
});

// --- behavior/a11y realization audits (PREPUSH-LOCKSTEP-01) ------------------
// ci.yml's gate job runs audit:behavior-realization + audit:a11y-realization;
// the hook must run them on the SAME input surfaces, or a push gets its
// verdict only from CI, after the fact. Behavior classifies the five WEB
// trees (its FRAMEWORKS list excludes react-native) and imports the compiled
// codegen IR; a11y iterates the AdmissionDescriptor registry — all six admitted
// families INCLUDING react-native — and keeps its known-gaps ledger in its own
// directory.

test("a contract change runs both realization audits", () => {
  const r = classify(["packages/ds-contracts/components/Chip/Chip.contract.json"]);
  assert.equal(r.RUN_BEHAVIOR_AUDIT, true);
  assert.equal(r.RUN_A11Y_AUDIT, true);
});

test("a codegen change runs both realization audits (IR + registry inputs)", () => {
  // The behavior audit imports the compiled IR; the a11y audit imports the
  // compiled AdmissionDescriptor registry. Both live in ds-codegen.
  const r = classify(["packages/ds-codegen/src/validation/admission-descriptor.ts"]);
  assert.equal(r.RUN_BEHAVIOR_AUDIT, true);
  assert.equal(r.RUN_A11Y_AUDIT, true);
});

test("a generated web tree change runs both realization audits", () => {
  const r = classify(["packages/ds-vue/src/components/Chip/Chip.vue"]);
  assert.equal(r.RUN_BEHAVIOR_AUDIT, true);
  assert.equal(r.RUN_A11Y_AUDIT, true);
});

test("a react-native change runs the a11y audit but NOT the behavior audit", () => {
  // The behavior audit's FRAMEWORKS list is the five web trees only; the a11y
  // audit iterates the full AdmissionDescriptor registry, which admits
  // react-native. A rail wired to the wrong family surface either over-fires
  // or goes quietly blind — this pins the asymmetry on both sides.
  const r = classify(["packages/ds-react-native/src/components/Chip/Chip.tsx"]);
  assert.equal(r.RUN_A11Y_AUDIT, true);
  assert.equal(r.RUN_BEHAVIOR_AUDIT, false);
});

test("editing a realization audit runs it (and only it)", () => {
  const b = classify(["scripts/behavior-realization-audit/realization.test.mjs"]);
  assert.equal(b.RUN_BEHAVIOR_AUDIT, true);
  assert.equal(b.RUN_A11Y_AUDIT, false);
  const a = classify(["scripts/a11y-realization-audit/selfcheck.mjs"]);
  assert.equal(a.RUN_A11Y_AUDIT, true);
  assert.equal(a.RUN_BEHAVIOR_AUDIT, false);
});

test("editing the a11y known-gaps ledger runs the a11y audit", () => {
  // Adding or removing a ledger entry moves the verdict even when no contract
  // or generated byte changes.
  assert.equal(
    classify(["scripts/a11y-realization-audit/known-gaps.json"]).RUN_A11Y_AUDIT,
    true,
  );
});

test("a tokens-only push runs NEITHER realization audit", () => {
  // Tokens move no interactivity and no ARIA bytes (styling-audit precedent:
  // ds-tokens is not an input there either). The rail still runs via genGroup,
  // and any regenerated bytes that DO matter arrive as generated-tree changes.
  const r = classify(["packages/ds-tokens/src/core/color.json"]);
  assert.equal(r.RUN_BEHAVIOR_AUDIT, false);
  assert.equal(r.RUN_A11Y_AUDIT, false);
});

test("a docs-only push does NOT run the realization audits", () => {
  const r = classify(["docs/x.md"]);
  assert.equal(r.RUN_BEHAVIOR_AUDIT, false);
  assert.equal(r.RUN_A11Y_AUDIT, false);
});
