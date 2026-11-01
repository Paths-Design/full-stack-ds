/**
 * Falsification probe for the state-suppression rail (RAIL-STATE-SUPPRESSION-01).
 *
 * The rail's whole value is that it fires on a real class of defect every other
 * gate is blind to, so the first thing to prove is that it CAN fire — and, just
 * as important, that each suppression mechanism actually silences it. A rail
 * that reported everything would be as useless as one that reported nothing.
 *
 * Standalone Node, matching the sibling audits' probes.
 */
import assert from "node:assert/strict";

import { auditComponentCss, guardsAgainstDisabled, propertiesUnder, suppressionLeakId } from "./audit.mjs";

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

console.log("state-suppression rail falsification probe");

// --- propertiesUnder: the primitive the whole verdict rests on --------------
const BUTTON_SHAPED = `
.button {
  color: var(--x);
  &:hover {
    background-color: var(--a);
    border-color: var(--b);
  }
  &:disabled {
    background-color: var(--c);
    color: var(--d);
  }
}`;

check("reads the properties declared under an interaction pseudo", () => {
  const props = propertiesUnder(BUTTON_SHAPED, ":hover");
  assert.deepEqual([...props].sort(), ["background-color", "border-color"]);
});

check("reads the properties declared under the suppressing state", () => {
  const props = propertiesUnder(BUTTON_SHAPED, ":disabled");
  assert.deepEqual([...props].sort(), ["background-color", "color"]);
});

check("the Button leak is visible in the primitive: hover sets a property disabled never resets", () => {
  // This is the defect in prose: :hover sets border-color, :disabled does not,
  // so nothing wins the border back at equal specificity.
  const hover = propertiesUnder(BUTTON_SHAPED, ":hover");
  const disabled = propertiesUnder(BUTTON_SHAPED, ":disabled");
  const leaked = [...hover].filter((p) => !disabled.has(p));
  assert.deepEqual(leaked, ["border-color"]);
});

check("a nested block inside the state block does not truncate the scan", () => {
  // Brace-matching, not first-`}` slicing: a media query or :has() inside the
  // block would otherwise hide every declaration after it.
  const css = `
.x {
  &:hover {
    color: red;
    @media (min-width: 10px) { outline: 1px; }
    border-color: blue;
  }
}`;
  const props = propertiesUnder(css, ":hover");
  assert.ok(props.has("color"), "declaration before the nested block");
  assert.ok(props.has("border-color"), "declaration AFTER the nested block must still be seen");
});

check("a property only inside a nested block is not attributed to the outer block", () => {
  const css = `.x { &:hover { @media screen { outline-color: red; } } }`;
  const props = propertiesUnder(css, ":hover");
  assert.ok(!props.has("outline-color"), "nested declarations belong to the nested block");
});

check("no interaction block yields no properties, not a crash", () => {
  assert.equal(propertiesUnder(".x { color: red; }", ":hover").size, 0);
});

// --- the guard silences the rail -------------------------------------------
check("a :not(:disabled) guard is recognised", () => {
  assert.equal(guardsAgainstDisabled(".x:not(:disabled):hover { color: red; }"), true);
});

check("an [aria-disabled] guard is recognised", () => {
  assert.equal(guardsAgainstDisabled('.x:not([aria-disabled="true"]):hover { color: red; }'), true);
});

check("an unguarded sheet is NOT reported as guarded", () => {
  // Control: if this returned true the rail would silently pass everything.
  assert.equal(guardsAgainstDisabled(".x:hover { color: red; }"), false);
});

// --- ledger identity -------------------------------------------------------
check("leak identity is component + pseudo + property", () => {
  const id = suppressionLeakId({ component: "Button", pseudo: ":hover", property: "border-color" });
  assert.equal(id, "Button :hover border-color");
});

check("two properties leaking under the same pseudo are distinct ledger entries", () => {
  // Otherwise fixing one would mark the other stale and the ratchet would lie.
  const a = suppressionLeakId({ component: "Links", pseudo: ":hover", property: "color" });
  const b = suppressionLeakId({ component: "Links", pseudo: ":hover", property: "outline-color" });
  assert.notEqual(a, b);
});

const namedContract = (names = ["pointer"]) => ({
  name: "X", cssPrefix: "x", anatomy: { dom: { tag: "a" } },
  states: { dimensions: {
    pointer: { category: "interaction", values: ["rest", "hover", "visited"], initial: "rest" },
    focus: { category: "interaction", values: ["blur", "focus"], initial: "blur" },
    availability: { category: "availability", values: ["enabled", "disabled"], initial: "enabled", suppresses: { names } },
  } },
});
const leaked = (css, contract = namedContract()) => auditComponentCss("X", contract, css).leaks.map((row) => `${row.pseudo} ${row.property}`);

check("guarded rules still expose their properties to the primitive", () => {
  assert.deepEqual([...propertiesUnder('.x:hover:not([aria-disabled="true"]) { color: red; }', ":hover")], ["color"]);
});
check("a guarded hover does not hide an unguarded visited rule", () => {
  assert.deepEqual(leaked('.x:hover:not([aria-disabled="true"]) { color: red; } .x:visited { color: blue; }'), [":visited color"]);
});
check("an unrelated guard cannot hide a leak or bless another selector-list branch", () => {
  assert.deepEqual(leaked('.other:not([aria-disabled="true"]) { color: red; } .x:hover, .x:visited:not([aria-disabled="true"]) { color: blue; }'), [":hover color"]);
});
check("names-only pointer suppression imposes no focus obligation", () => {
  assert.deepEqual(leaked('.x:hover:not([aria-disabled="true"]) { color: red; } .x:visited:not([aria-disabled="true"]) { color: blue; } .x:focus-visible { outline-color: black; }'), []);
});
check("focus-only suppression imposes no pointer obligation", () => {
  assert.deepEqual(leaked('.x:hover { color: red; } .x:visited { color: blue; } .x:focus-visible { outline-color: black; }', namedContract(["focus"])), [":focus-visible outline-color"]);
});
check("only an exact root source reset can win back an unguarded root rule", () => {
  assert.deepEqual(leaked('.x:hover { color: red; } .x[aria-disabled="true"] { color: grey; }'), []);
  assert.deepEqual(leaked('.x:hover { color: red; } .x__part[aria-disabled="true"] { color: grey; }'), [":hover color"]);
  assert.deepEqual(leaked('.x:hover { color: red; } .other[aria-disabled="true"] { color: grey; }'), [":hover color"]);
  assert.deepEqual(leaked('.x[aria-disabled="true"] { color: grey; } .x:hover { color: red; }'), [":hover color"]);
});
check("partial resets and guards preserve the exact remaining obligations", () => {
  assert.deepEqual(leaked('.x { &:hover { color: red; border-color: blue; } &[aria-disabled="true"] { color: grey; } &:visited { color: purple; } }'), [":hover border-color", ":visited color"]);
});
check("a guard on an ancestor cannot protect the interaction subject", () => {
  assert.deepEqual(leaked('.x:not([aria-disabled="true"]) .x__part:hover { color: red; }'), [":hover color"]);
});
check("category suppression remains effective without target dimension fixtures", () => {
  const contract = namedContract();
  contract.states.dimensions = { availability: { ...contract.states.dimensions.availability, suppresses: { categories: ["interaction"] } } };
  assert.deepEqual(leaked('.x:hover { color: red; } .x:focus-visible { outline-color: black; }', contract), [":hover color", ":focus-visible outline-color"]);
});
check("unknown names fail instead of silently discarding an obligation", () => {
  assert.throws(() => leaked('.x:hover { color: red; }', namedContract(["missing"])), /STATE_SUPPRESSION_UNKNOWN_DIMENSION/);
});
check("native input suppression requires the exact source binding and state carrier", () => {
  const contract = namedContract();
  contract.anatomy.dom = { tag: "div", part: "root", children: [{ tag: "input", part: "field", bindings: { disabled: "prop:disabled" } }] };
  const css = '.x__field:hover:not(:disabled) { color: red; } .x:has(.x__field:focus-visible) .x__indicator { outline-color: red; }';
  contract.states.dimensions.availability.suppresses = { categories: ["interaction"] };
  assert.deepEqual(leaked(css, contract), []);
  assert.equal(auditComponentCss("X", contract, css).nativeExclusions[0].reason, "native-disabled-source-cannot-match");
  contract.anatomy.dom.children[0].bindings.disabled = "prop:otherDisabled";
  assert.deepEqual(leaked(css, contract), [":hover color", ":focus-visible outline-color"]);
});
check("category and name obligations form a union without suppressing other dimensions", () => {
  const contract = namedContract();
  contract.states.dimensions.selection = { category: "selection", values: ["unchecked", "checked"], initial: "unchecked" };
  contract.states.dimensions.availability.suppresses.categories = ["selection"];
  assert.deepEqual(leaked('.x:hover { color: red; } .x:checked { border-color: blue; } .x:focus-visible { outline-color: black; }', contract), [":hover color", ":checked border-color"]);
});

check("an unavailable media reset cannot discharge an unconditional hover obligation", () => {
  assert.deepEqual(leaked('.x:hover { color: red; } @media (min-width:99999px) { .x[aria-disabled="true"] { color: grey; } }'), [":hover color"]);
});
check("supports and nested conditional resets cannot discharge broader source rules", () => {
  assert.deepEqual(leaked('.x:hover { color: red; } @supports (made-up: value) { .x[aria-disabled="true"] { color: grey; } }'), [":hover color"]);
  assert.deepEqual(leaked('@media screen { .x:hover { color: red; } @supports (made-up: value) { .x[aria-disabled="true"] { color: grey; } } }'), [":hover color"]);
  assert.deepEqual(leaked('.x { &:hover { color: red; } @media (min-width:99999px) { &[aria-disabled="true"] { color: grey; } } }'), [":hover color"]);
});
check("same conditional contexts and later unconditional resets remain valid controls", () => {
  assert.deepEqual(leaked('@media screen { .x:hover { color: red; } .x[aria-disabled="true"] { color: grey; } }'), []);
  assert.deepEqual(leaked('.x { @media screen { &:hover { color: red; } &[aria-disabled="true"] { color: grey; } } }'), []);
  assert.deepEqual(leaked('@supports (display:grid) { @media screen { .x:hover { color: red; } } .x[aria-disabled="true"] { color: grey; } }'), []);
  assert.deepEqual(leaked('@media screen { .x:hover { color: red; } } .x[aria-disabled="true"] { color: grey; }'), []);
});
check("cascade layers cannot be treated as later equal-specificity rules", () => {
  assert.deepEqual(leaked('.x:hover { color: red; } @layer lower { .x[aria-disabled="true"] { color: grey; } }'), [":hover color"]);
  assert.deepEqual(leaked('@layer first { .x:hover { color: red; } } @layer second { .x[aria-disabled="true"] { color: grey; } }'), [":hover color"]);
  assert.deepEqual(leaked('@layer same { .x:hover { color: red; } } @layer same { .x[aria-disabled="true"] { color: grey; } }'), []);
  assert.deepEqual(leaked('@layer { .x:hover { color: red; } } @layer { .x[aria-disabled="true"] { color: grey; } }'), [":hover color"]);
});
check("declaration priority is part of reset proof", () => {
  assert.deepEqual(leaked('.x:hover { color: red !important; } .x[aria-disabled="true"] { color: grey; }'), [":hover color"]);
  assert.deepEqual(leaked('.x:hover { color: red !important; color: blue; } .x[aria-disabled="true"] { color: grey; }'), [":hover color"]);
  assert.deepEqual(leaked('.x:hover { color: red !important; } .x[aria-disabled="true"] { color: grey !important; }'), []);
  assert.deepEqual(leaked('.x:hover { color: red; } .x[aria-disabled="true"] { color: grey !important; color: blue; }'), []);
});
check("quoted CSS punctuation cannot manufacture or hide reset declarations", () => {
  assert.deepEqual(leaked('.x:hover { color: red; } .x[aria-disabled="true"] { content: "; color: grey;"; }'), [":hover color"]);
  assert.deepEqual(leaked('.x:hover { color: red; } .x[aria-disabled="true"] { content: "}"; color: grey; }'), []);
  assert.deepEqual([...propertiesUnder('.x:hover { content: "{ fake-property: value; }"; color: red; }', ":hover")].sort(), ["color", "content"]);
});
check("unsupported nesting specificity and scope ancestry cannot supply reset proof", () => {
  assert.deepEqual(leaked('.x, #other { &:hover { color: red; } } .x[aria-disabled="true"] { color: grey; }'), [":hover color"]);
  assert.deepEqual(leaked('.x, #other { @media screen { &:hover { color: red; } } } .x[aria-disabled="true"] { color: grey; }'), [":hover color"]);
  assert.deepEqual(leaked('.x:hover { color: red; } @scope (.host) { .x[aria-disabled="true"] { color: grey; } }'), [":hover color"]);
});

if (failures > 0) {
  console.error(`\nstate-suppression probe FAILED (${failures})`);
  process.exit(1);
}
console.log("state-suppression probe PASS");
