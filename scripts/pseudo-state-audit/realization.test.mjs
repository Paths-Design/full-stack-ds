#!/usr/bin/env node
/**
 * PSEUDO-STATE-STYLING-RAIL-01 — locked discriminator test (A5).
 *
 * Pins the audit's classification against known-true facts so the rail cannot
 * silently drift: known-REALIZED obligations, the canary GAP, and the
 * false-positive controls. Standalone Node runner (mirrors
 * scripts/variant-style-audit/realization.test.mjs) — not a vitest suite, so it
 * is exempt from the root vitest include and run directly:
 *
 *   node scripts/pseudo-state-audit/realization.test.mjs
 *
 * Exit 0 on all-pass, 1 on any failure.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, ALL_COMPONENTS } from "./audit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const readGen = (p) => readFileSync(resolve(REPO, p), "utf8");

let pass = 0;
let fail = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
    pass++;
  } catch (e) {
    console.error(`  XX  ${name}: ${e.message}`);
    fail++;
  }
};

/** Status of a single state value within a component's classification. */
const statusOf = (component, dim, value) => {
  const c = classify(component);
  const d = c.dims.find((x) => x.dim === dim);
  const v = d?.values.find((x) => x.value === value);
  return v?.status;
};
const promptStatus = (component) => classify(component).promptObligation?.status;

console.log("Known-REALIZED — derivable pseudo-class states on Button:");
check("named suppression classifies only its target dimension, and category/name targets form a union", () => {
  const contract = { name: "Probe", cssPrefix: "probe", states: { dimensions: {
    pointer: { category: "interaction", values: ["rest", "hover"], initial: "rest" },
    focus: { category: "interaction", values: ["blur", "focus"], initial: "blur" },
    availability: { category: "availability", values: ["enabled", "disabled"], initial: "enabled", suppresses: { names: ["pointer"] } },
  } } };
  const fixture = { contract, css: ".probe { color: red; }", tokensCss: "", styles: { active: {} } };
  const status = (name) => classify("Probe", fixture).dims.find((row) => row.dim === name).values[1].status;
  assert.equal(status("pointer"), "behavioral");
  assert.equal(status("focus"), "gap");
  contract.states.dimensions.availability.suppresses.categories = ["interaction"];
  assert.equal(status("focus"), "behavioral");
  contract.states.dimensions.availability.suppresses.names = ["missing"];
  assert.throws(() => classify("Probe", fixture), /STATE_SUPPRESSION_UNKNOWN_DIMENSION/);
});
for (const [dim, value] of [
  ["pointer", "hover"],
  ["focus", "focus"],
  ["availability", "disabled"],
]) {
  check(`Button.${dim}=${value} is realized (derivable pseudo-class)`, () => {
    assert.equal(statusOf("Button", dim, value), "realized");
  });
}

check("Button realizes :hover / :focus-visible / :disabled in its generated CSS", () => {
  const css = readGen("packages/ds-react/src/components/Button/Button.css");
  for (const sel of [":hover", ":focus-visible", ":disabled"]) {
    assert.ok(css.includes(sel), `Button.css missing ${sel}`);
  }
});

console.log("\nKnown-REALIZED — input-backed states on Checkbox via :has(.prefix__input:state):");
for (const value of ["checked", "disabled"]) {
  check(`Checkbox.selection/availability=${value} is realized (via :has input wrapper)`, () => {
    const dim = value === "checked" ? "selection" : "availability";
    assert.equal(statusOf("Checkbox", dim, value), "realized");
  });
}

check("Checkbox realizes checked/disabled via :has(.checkbox__input:<state>)", () => {
  const both =
    readGen("packages/ds-react/src/components/Checkbox/Checkbox.css") +
    "\n" +
    readGen("packages/ds-react/src/components/Checkbox/Checkbox.tokens.css");
  assert.ok(/:has\(\.checkbox__input:checked\)/.test(both), "missing :has(.checkbox__input:checked)");
  assert.ok(/:has\(\.checkbox__input:disabled\)/.test(both), "missing :has(.checkbox__input:disabled)");
});

console.log("\nKnown-GAP — the empty-field input prompt pseudo is never emitted:");
for (const component of ["Input", "TextField"]) {
  check(`${component} empty-prompt obligation is a GAP (:placeholder-shown never emitted)`, () => {
    assert.equal(promptStatus(component), "gap");
  });
}

check(":placeholder-shown is genuinely absent from Input.css (::placeholder does NOT count)", () => {
  const css = readGen("packages/ds-react/src/components/Input/Input.css");
  assert.ok(/::placeholder/.test(css), "expected ::placeholder text styling to exist");
  assert.ok(!/:placeholder-shown/.test(css), "did not expect :placeholder-shown (the empty-state selector)");
});

console.log("\nFalse-positive controls — must NOT be flagged as gaps:");

check("an initial/base value (Button.pointer=default) is classified 'base', not a gap", () => {
  assert.equal(statusOf("Button", "pointer", "default"), "base");
});

check("a focus.strategy=none root (Field) does not flag its focus state as a gap", () => {
  const c = classify("Field");
  assert.equal(c.focusStrategyNone, true, "Field should declare focus.strategy=none");
  assert.equal(statusOf("Field", "focus", "focus"), "behavioral");
});

check("a channel-driven motion state (Popover.transition=entering) is behavioral, not a gap", () => {
  // Popover.transition is effect:channel (motion) — entering/leaving are
  // JS-driven, so they are behavioral even though non-initial with no selector.
  assert.equal(statusOf("Popover", "transition", "entering"), "behavioral");
});

check("a state realized via a native HTML attribute (Details.disclosure=open → [open]) is REALIZED", () => {
  // The native `<details open>` attribute selector `[open]` is a valid
  // realization form — it must count as realized, not be missed and flagged.
  assert.equal(statusOf("Details", "disclosure", "open"), "realized");
  const css = readGen("packages/ds-react/src/components/Details/Details.css");
  assert.ok(/\[open\]/.test(css), "expected Details.css to realize open via [open]");
});

check("a no-interaction-styling component (Avatar) does not flag its focus state as a gap", () => {
  // Avatar authors zero interaction-state CSS, so its declared focus dimension
  // is boilerplate, not a styling obligation.
  assert.equal(statusOf("Avatar", "focus", "focus"), "behavioral");
});

console.log("\nKnown-GAP — a genuinely unrealized obligation IS flagged:");
check("Chip.availability=disabled is a real GAP (no :disabled/[disabled]/--disabled)", () => {
  assert.equal(statusOf("Chip", "availability", "disabled"), "gap");
  const both =
    readGen("packages/ds-react/src/components/Chip/Chip.css") +
    "\n" +
    readGen("packages/ds-react/src/components/Chip/Chip.tokens.css");
  assert.ok(!/:disabled|\[disabled\]|--disabled/.test(both), "expected no disabled realization in Chip CSS");
});

check("audit discovers the contract corpus (floor: 47 components at authoring time)", () => {
  // A broken discovery path returns zero or a handful of components; corpus
  // GROWTH must not fail this rail, so this is a floor, not an exact count.
  const n = ALL_COMPONENTS().length;
  assert.ok(n >= 47, `expected at least 47 components, found ${n}`);
});

console.log(`\nlocked test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
