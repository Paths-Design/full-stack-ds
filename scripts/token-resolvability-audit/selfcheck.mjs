/**
 * Falsification probe for the token-resolvability rail
 * (RAIL-TOKEN-REFERENCE-RESOLVABILITY-01).
 *
 * This rail replaced a blocking gate. That raises the bar on proving it can
 * fail: a replacement that is merely quieter than what it displaced is a
 * weakened guard wearing a new name. So each check below pins one way the rail
 * must fire, and — equally — one way it must stay silent, because a rail that
 * reported every reference would be as useless as one that reported none.
 *
 * The value-comparison checks matter most. An earlier revision of this audit
 * compared a token's AUTHORED value against a component's fallback literal
 * without resolving the alias chain, and so reported 20 of 23 findings as
 * "changes value" when they were byte-identical after resolution — a false
 * positive manufactured entirely by the oracle. `resolveChain` exists because
 * of that, and these checks exist so it cannot silently regress.
 *
 * Standalone Node, matching the sibling audits' probes.
 */
import assert from "node:assert/strict";

import {
  auditCssReferences,
  auditUnitySheet,
  buildGraph,
  declaredNames,
  declaredValue,
  kebabCandidate,
  normalizeValue,
  readReferences,
  resolveChain,
  runtimeSetNames,
  unityAllowlist,
  unitySections,
  unresolvableId,
} from "./audit.mjs";

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}

console.log("token-resolvability rail falsification probe");

// --- the two primitives the verdict rests on -------------------------------

check("declaredNames reads a custom property from the left of a colon", () => {
  assert.deepEqual([...declaredNames(".a { --fsds-x: 1px; color: red; }")], ["--fsds-x"]);
});

check("declaredNames does not mistake a READ for a declaration", () => {
  // The whole rail turns on this distinction: `var(--fsds-x)` on the right of a
  // colon is a consumer, not a declaration. Conflating them would make every
  // broken reference declare itself and the rail would report nothing, ever.
  assert.deepEqual([...declaredNames(".a { color: var(--fsds-x, red); }")], []);
});

check("readReferences captures the name and the silently-rendered fallback", () => {
  assert.deepEqual(readReferences(".a { color: var(--fsds-x, #fff); }"), [
    { name: "--fsds-x", fallback: "#fff" },
  ]);
});

check("readReferences records a null fallback when there is none", () => {
  assert.deepEqual(readReferences(".a { color: var(--fsds-x); }"), [
    { name: "--fsds-x", fallback: null },
  ]);
});

check("global CSS reads are audited against declarations from the same graph", () => {
  const css = `
:root { --fsds-core-spacing-density-compact-sm: 8px; }
[data-density="compact"] {
  --fsds-semantic-spacing-gap-stack:
    var(--fsds-core-spacing-density-compact-sm);
}`;
  assert.deepEqual(
    auditCssReferences("global:tokens.css", css, declaredNames(css), buildGraph(css)),
    [],
  );
});

check("an undeclared global CSS read becomes a named finding", () => {
  const css = `
[data-density="compact"] {
  --fsds-semantic-spacing-gap-stack:
    var(--fsds-spacing-density-compact-sm, 8px);
}`;
  const findings = auditCssReferences(
    "global:tokens.css",
    css,
    declaredNames(css),
    buildGraph(css),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].component, "global:tokens.css");
  assert.equal(findings[0].name, "--fsds-spacing-density-compact-sm");
  assert.equal(findings[0].fallback, "8px");
});

check("an optional design override preserves scrutiny of nested fallback references", () => {
  const optional = new Set(['--fsds-card-design-root-background-fill']);
  const audit = css => auditCssReferences('Card', css, new Set(), new Map(), new Set(), new Set(), optional);
  assert.deepEqual(audit('color: var(--fsds-card-design-root-background-fill, #fff)'), []);
  assert.equal(audit('color: var(--fsds-card-design-root-background-fill)')[0].name, '--fsds-card-design-root-background-fill');
  const nested = audit('color: var(--fsds-card-design-root-background-fill, var(--fsds-semantic-typo, rgb(0, 0, 0)))');
  assert.deepEqual(nested.map(row => row.name), ['--fsds-semantic-typo']);
  assert.equal(nested[0].fallback, 'rgb(0, 0, 0)');
  assert.equal(audit('color: var(--fsds-card-design-root-typo, #fff)')[0].name, '--fsds-card-design-root-typo');
});

// --- the casing seam this rail was built to surface ------------------------

check("kebabCandidate names the declared spelling of a camelCase miss", () => {
  const declared = new Set(["--fsds-semantic-shape-control-border-default-width"]);
  assert.equal(
    kebabCandidate("--fsds-semantic-shape-control-border-defaultWidth", declared),
    "--fsds-semantic-shape-control-border-default-width",
  );
});

check("kebabCandidate returns null when kebab-casing does not explain the miss", () => {
  // A name that is already kebab and still undeclared has some other cause and
  // must not be reported as a casing seam — the two need different fixes.
  assert.equal(kebabCandidate("--fsds-totally-invented", new Set(["--fsds-real"])), null);
});

// --- value comparison: the check that must resolve, not compare text --------

const GRAPH = buildGraph(`
:root {
  --fsds-core-spacing-size-04: 8px;
  --fsds-semantic-gap: var(--fsds-core-spacing-size-04);
  --fsds-semantic-alias-of-alias: var(--fsds-semantic-gap);
  --fsds-cycle-a: var(--fsds-cycle-b);
  --fsds-cycle-b: var(--fsds-cycle-a);
  --fsds-color: #111111;
}
[data-theme="dark"] {
  --fsds-color: #eeeeee;
}
`);

check("resolveChain follows an alias to its literal", () => {
  assert.equal(resolveChain(GRAPH, "--fsds-semantic-gap"), "8px");
});

check("resolveChain follows a multi-hop alias chain", () => {
  assert.equal(resolveChain(GRAPH, "--fsds-semantic-alias-of-alias"), "8px");
});

check("resolveChain reports no value for a theme-varying name rather than picking one", () => {
  // This is the honest-ambiguity case. --fsds-color is #111 in light and #eee
  // in dark; there is no single value to compare a fallback against. Returning
  // either would manufacture a confident verdict from an ambiguous graph, and
  // would wrongly bless repairing a binding that currently pins one theme.
  assert.equal(resolveChain(GRAPH, "--fsds-color"), null);
  assert.equal(declaredValue(GRAPH, "--fsds-color").ambiguous, 2);
});

check("resolveChain terminates on a cycle instead of recursing forever", () => {
  assert.equal(resolveChain(GRAPH, "--fsds-cycle-a"), null);
});

check("resolveChain reports no value for a name the graph never declares", () => {
  assert.equal(resolveChain(GRAPH, "--fsds-absent"), null);
});

check("normalizeValue equates values that differ only in case or whitespace", () => {
  assert.equal(normalizeValue("  #FAFAFA "), normalizeValue("#fafafa"));
});

check("normalizeValue does NOT equate genuinely different values", () => {
  assert.notEqual(normalizeValue("8px"), normalizeValue("12px"));
});

// --- the runtime-var exemption, which must stay derived --------------------

check("runtimeSetNames finds a custom property set from JS as an inline style", () => {
  const source = `<span style={{ "--fsds-progress-fill-width": value } as CSSProperties} />`;
  assert.deepEqual([...runtimeSetNames(source)], ["--fsds-progress-fill-width"]);
});

check("runtimeSetNames exempts nothing when the JS that set it is gone", () => {
  // The exemption is derived from the component's own source precisely so that
  // deleting the JS re-arms the rail. A hardcoded allowlist would keep
  // exempting the var forever — the same rot this rail exists to catch.
  assert.deepEqual([...runtimeSetNames("<span />")], []);
});

// --- identity ---------------------------------------------------------------

check("a finding is identified by component and name together", () => {
  // Per-component, not per-name: the same broken reference in two components is
  // two repairs to verify, and collapsing them would let one component's fix
  // mark the other's as burned.
  assert.equal(unresolvableId({ component: "Button", name: "--fsds-x" }), "Button --fsds-x");
});

// --- the unity surface (UNITY-STYLING-PROJECTION-01, S8) --------------------

// The shape uss.ts generates: a token section, then one section per component
// opened by a `/* <Name> (.<prefix>) */` comment.
const UNITY_SHEET = `/* @generated:start unity-uss */
/* Token graph, light (resolved.tokens.json) */
.fsds-theme {
    --fsds-semantic-gap: 8px;
    --fsds-semantic-alias: var(--fsds-semantic-missing, 4px);
}

/* Lamp (.lamp) */
.lamp {
    --fsds-lamp-pad: var(--fsds-semantic-gap, 8px);
}

.lamp__tail {
    padding: var(--fsds-lamp-pad, 8px);
    margin: var(--fsds-dial-pad, 2px);
}

/* Dial (.dial) */
.dial {
    --fsds-dial-pad: 3px;
    padding: var(--fsds-dial-pad, 3px);
    width: var(--fsds-semantic-gap, 8px);
}
`;

check("unitySections splits the token section from each component section at its opening comment", () => {
  const { theme, components } = unitySections(UNITY_SHEET);
  assert.deepEqual([...declaredNames(theme)], ["--fsds-semantic-gap", "--fsds-semantic-alias"]);
  assert.deepEqual(components.map((c) => [c.component, c.prefix]), [["Lamp", "lamp"], ["Dial", "dial"]]);
  assert.ok(components[0].css.includes(".lamp__tail") && !components[0].css.includes(".dial {"));
});

check("unity reads resolve against the token section plus the reading component's own section only", () => {
  const rows = auditUnitySheet(UNITY_SHEET, ["Lamp", "Dial"]);
  // Lamp reads Dial's slot. A Lamp inherits it only when nested inside a Dial,
  // which the sheet cannot promise, so the read renders its fallback wherever a
  // Lamp stands alone. The token section's own read of an undeclared graph name
  // is a finding too.
  assert.deepEqual(rows.map((r) => [r.target, r.component, r.name, r.fallback]), [
    ["unity", "unity:(theme)", "--fsds-semantic-missing", "4px"],
    ["unity", "unity:Lamp", "--fsds-dial-pad", "2px"],
  ]);
  assert.equal(unresolvableId(rows[1]), "unity:Lamp --fsds-dial-pad");
});

check("a fully declared unity sheet yields no findings", () => {
  const clean = UNITY_SHEET.replace("var(--fsds-semantic-missing, 4px)", "4px").replace("var(--fsds-dial-pad, 2px)", "var(--fsds-lamp-pad, 2px)");
  assert.deepEqual(auditUnitySheet(clean, ["Lamp", "Dial"]), []);
});

check("a unity sheet that disagrees with the allowlist fails loudly instead of auditing another set", () => {
  assert.throws(() => auditUnitySheet(UNITY_SHEET, ["Lamp", "Dial", "Knob"]), /missing: Knob/);
  assert.throws(() => auditUnitySheet(UNITY_SHEET, ["Lamp"]), /not allowlisted: Dial/);
});

check("the unity allowlist comes from the target registry, and an absent unity target means no unity census", () => {
  assert.deepEqual(unityAllowlist({ targets: [{ id: "unity", components: ["Lamp"] }] }), ["Lamp"]);
  assert.deepEqual(unityAllowlist({ targets: [{ id: "react" }] }), []);
});

console.log(
  failures === 0
    ? "token-resolvability probe: all checks passed"
    : `token-resolvability probe: ${failures} FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
