#!/usr/bin/env node
/**
 * Self-check for the a11y-realization classifier (runs before audit.mjs in
 * the npm script, mirroring the behavior rail's realization.test.mjs).
 *
 * Pins the classifier's load-bearing behaviors with inline fixtures so a
 * classifier regression fails HERE, with a named assertion, before the audit
 * produces a misleading matrix. Each assertion states the behavior pinned.
 */
import {
  atomicKeys,
  classify,
  declaredStateAttributes,
  deriveObligations,
  gapId,
  handlesKey,
  relationshipTokens,
  resolveRegisteredFamilies,
  rovingReachable,
  unroledComposeActivations,
} from "./audit.mjs";

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.error(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`);
  }
}

// -- key parsing --------------------------------------------------------------
// "Enter|Space" is two atomic keys; Shift+Tab collapses to Tab (the trap owns both).
check("atomicKeys splits alternatives", atomicKeys("Enter|Space"), ["Enter", "Space"]);
check("atomicKeys folds Shift+Tab", atomicKeys("Shift+Tab"), ["Tab"]);

// -- obligation derivation ----------------------------------------------------
const derived = deriveObligations([
  {
    name: "Fixture",
    contract: {
      relationships: [
        { from: "label", to: "control", attribute: "for" },
        { from: "label", to: "control", attribute: "for" }, // duplicate — deduped
      ],
      a11y: { keyboard: [{ key: "ArrowDown" }] },
      focus: { strategy: "roving" },
    },
  },
]);
check(
  "derives relationship+keyboard+focus, deduped",
  derived,
  [
    {
      component: "Fixture",
      class: "relationship",
      key: "for",
      from: "label",
      to: "control",
      cssPrefix: "fixture",
    },
    { component: "Fixture", class: "keyboard", key: "ArrowDown", roving: { entryKeys: [] } },
    { component: "Fixture", class: "focus", key: "roving", roving: { entryKeys: [] } },
  ],
);
// A `behavior: "open"` keyboard entry names the roving composite's entry keys.
check(
  "an open-behavior keyboard entry declares the roving entry keys",
  deriveObligations([{ name: "Menu", contract: {
    a11y: { keyboard: [{ key: "ArrowDown", when: "trigger", behavior: "open" }] },
    focus: { strategy: "roving" },
  } }]).find((o) => o.class === "focus").roving,
  { entryKeys: ["ArrowDown"] },
);
// State attributes come from state dimensions and dom attrs/bindings, once each.
check(
  "state attributes derive from states and dom, deduped",
  declaredStateAttributes({
    states: { dimensions: { selection: { a11y: { attribute: "aria-selected" } } } },
    anatomy: { dom: { tag: "div", bindings: { "aria-selected": "channel:v.value" }, children: [
      { tag: "button", bindings: { "aria-expanded": "channel:open.value" } },
    ] } },
  }),
  [{ attribute: "aria-selected" }, { attribute: "aria-expanded" }],
);
// A dom constant the contract never declares as varying state is declaredStatic.
check(
  "a dom-only constant state attribute is declared static",
  declaredStateAttributes({
    anatomy: { dom: { tag: "ul", children: [{ tag: "li", attrs: { role: "option", "aria-selected": "true" } }] } },
  }),
  [{ attribute: "aria-selected", declaredStatic: true, declaredValue: "true" }],
);
// A contract suppression carries its reason onto the obligation.
check(
  "a contract obligation suppression is carried with its reason",
  declaredStateAttributes({
    states: { dimensions: { selection: { a11y: { attribute: "aria-selected" } } } },
    a11y: { obligations: { suppress: [{ role: "option", attr: "aria-selected", reason: "cursor, not selection" }] } },
  }),
  [{ attribute: "aria-selected", suppressed: "cursor, not selection" }],
);
check(
  "an interactive anatomy part derives an interactive-role obligation",
  deriveObligations([{ name: "Toggle", contract: {
    anatomy: { details: { trigger: { interactive: true } } },
  } }]),
  [{ component: "Toggle", class: "interactive-role", key: "activation" }],
);

// -- relationship surfaces ----------------------------------------------------
// web-dom: `for` has framework spellings; other attrs match their own name.
check(
  "web-dom for tokens include htmlFor",
  relationshipTokens("web-dom", "for").includes("htmlFor"),
  true,
);
check(
  "web-dom default token is the attribute",
  relationshipTokens("web-dom", "aria-labelledby"),
  ["aria-labelledby"],
);
// native-mobile: labelledby maps to the RN prop; describedby has NO surface.
check(
  "native-mobile labelledby maps to accessibilityLabelledBy",
  relationshipTokens("native-mobile", "aria-labelledby").includes("accessibilityLabelledBy"),
  true,
);
check("native-mobile describedby excluded", relationshipTokens("native-mobile", "aria-describedby"), null);

// -- classification -----------------------------------------------------------
const rel = {
  component: "X",
  class: "relationship",
  key: "aria-labelledby",
  from: "dialog",
  to: "title",
  cssPrefix: "x",
};
check(
  "relationship realized only when the owned attribute points at the owned target id",
  classify(
    rel,
    "web-dom",
    '<section class="x__dialog" aria-labelledby="x-title"><h2 class="x__title" id="x-title">',
    new Set(),
  ).verdict,
  "realized",
);
check(
  "relationship unrealized when attribute absent",
  classify(
    rel,
    "web-dom",
    '<section class="x__dialog"><h2 class="x__title" id="x-title">',
    new Set(),
  ).verdict,
  "unrealized",
);
check(
  "relationship unrealized when the attribute exists on the wrong part",
  classify(
    rel,
    "web-dom",
    '<div class="x__root" aria-labelledby="x-title"><section class="x__dialog"><h2 class="x__title" id="x-title">',
    new Set(),
  ).verdict,
  "unrealized",
);
check(
  "relationship unrealized when the target id is missing",
  classify(
    rel,
    "web-dom",
    '<section class="x__dialog" aria-labelledby="x-title"><h2 class="x__title">',
    new Set(),
  ).verdict,
  "unrealized",
);
check(
  "relationship unrealized when the IDREF points at a different live id",
  classify(
    rel,
    "web-dom",
    '<section class="x__dialog" aria-labelledby="x-icon"><span class="x__icon" id="x-icon"><h2 class="x__title" id="x-title">',
    new Set(),
  ).verdict,
  "unrealized",
);
// Cross-primitive scan (FEAT-A11Y-RELATIONSHIP-STRAGGLERS-01): a relationship
// attribute wired in a directly-imported same-package primitive counts as
// realized (Svelte anchored-surface sets aria-controls/-expanded/-describedby
// in the primitive, not inline in the component).
check(
  "relationship realized via a directly-imported primitive body",
  classify(
    {
      component: "X",
      class: "relationship",
      key: "aria-controls",
      from: "trigger",
      to: "panel",
      cssPrefix: "x",
    },
    "web-dom",
    {
      own: '<button class="x__trigger"><section class="x__panel" id={panelId}>',
      relationship:
        '<button class="x__trigger"><section class="x__panel" id={panelId}>ariaProps["aria-controls"] = panelId',
    },
    new Set(),
  ).verdict,
  "realized",
);
// Compound emitters often place parts in separate files/classes and reflect
// attributes onto a custom-element host. The file/symbol boundary is the
// carrier in that case; a sibling class containing the same token must not
// satisfy the obligation.
const compoundBundle = {
  own: [
    'export class XTriggerElement { apply() { this.setAttribute("aria-labelledby", this.ctx.titleId); } }',
    'export class XTitleElement { apply() { this.setAttribute("id", this.ctx.titleId); } }',
  ].join("\n"),
  ownFiles: [
    {
      path: "/fixture/X.ts",
      source: [
        'export class XTriggerElement { apply() { this.setAttribute("aria-labelledby", this.ctx.titleId); } }',
        'export class XTitleElement { apply() { this.setAttribute("id", this.ctx.titleId); } }',
      ].join("\n"),
    },
  ],
};
compoundBundle.relationship = compoundBundle.own;
check(
  "programmatic compound host binding is owned by its part symbol",
  classify(
    { ...rel, from: "trigger" },
    "web-dom",
    compoundBundle,
    new Set(),
  ).verdict,
  "realized",
);
check(
  "programmatic binding on a sibling part cannot satisfy the declared carrier",
  classify(
    { ...rel, from: "root" },
    "web-dom",
    compoundBundle,
    new Set(),
  ).verdict,
  "unrealized",
);
check(
  "dynamic IDREF cannot claim the wrong endpoint merely because another part owns the id",
  classify(
    {
      component: "X",
      class: "relationship",
      key: "aria-labelledby",
      from: "trigger",
      to: "root",
      cssPrefix: "x",
    },
    "web-dom",
    compoundBundle,
    new Set(),
  ).verdict,
  "unrealized",
);
const angularGetterFixture = `<section class="x__dialog" [attr.aria-labelledby]="modalAriaLabelledby">
  <h2 class="x__title" [attr.id]="instanceId + '-title'">
</section>
get modalAriaLabelledby(): string {
  return this.instanceId + '-title';
}
get modalAriaDescribedby(): string {
  return this.instanceId + '-body';
}`;
check(
  "Angular carrier binding follows its exact IDREF getter",
  classify(rel, "web-dom", angularGetterFixture, new Set()).verdict,
  "realized",
);
check(
  "Angular carrier binding cannot borrow a target token from a sibling getter",
  classify(
    rel,
    "web-dom",
    angularGetterFixture.replace(
      '[attr.aria-labelledby]="modalAriaLabelledby"',
      '[attr.aria-labelledby]="modalAriaDescribedby"',
    ),
    new Set(),
  ).verdict,
  "unrealized",
);
const angularDecoratorBundle = {
  own: [
    "@Component({",
    '  template: `<div class="x" [attr.aria-labelledby]="instanceId + \'-title\'">',
    '    <h2 class="x__title" [attr.id]="instanceId + \'-title\'"></h2>',
    "  </div>`,",
    "})",
    "export class XComponent {}",
    "",
    "@Component({",
    '  template: `<span class="x__other" aria-labelledby="wrong"></span>`,',
    "})",
    "export class XOtherComponent {}",
  ].join("\n"),
  ownFiles: [],
};
angularDecoratorBundle.relationship = angularDecoratorBundle.own;
check(
  "Angular root carrier includes its own component decorator template",
  classify(
    { ...rel, from: "root", cssPrefix: "x" },
    "web-dom",
    angularDecoratorBundle,
    new Set(),
  ).verdict,
  "realized",
);
// Falsification: remove the primitive wiring and it reads unrealized again —
// the scan is not a blanket pass for anything that imports a primitive.
check(
  "relationship unrealized when neither own nor primitive carries the token",
  classify(
    {
      component: "X",
      class: "relationship",
      key: "aria-controls",
      from: "trigger",
      to: "panel",
      cssPrefix: "x",
    },
    "web-dom",
    {
      own: '<button class="x__trigger">',
      relationship: '<button class="x__trigger">/* no idref wiring */',
    },
    new Set(),
  ).verdict,
  "unrealized",
);
// The primitive-extended body must NOT leak into keyboard/focus: a shared
// roving/trap primitive's keydown tokens are visible ONLY through `own`, never
// through the relationship-scoped extension — otherwise every importer would
// falsely realize composite-keyboard obligations.
check(
  "keyboard NOT realized by a token present only in the primitive extension",
  classify(
    { component: "X", class: "keyboard", key: "ArrowDown" },
    "web-dom",
    { own: "<div>", relationship: "<div>onKeyDown={h}" },
    new Set(),
  ).verdict,
  "unrealized",
);
check(
  "native-mobile keyboard obligations are excluded, not unrealized",
  classify({ component: "X", class: "keyboard", key: "Enter" }, "native-mobile", "", new Set())
    .verdict,
  "excluded",
);

const kbEnterSpace = { component: "X", class: "keyboard", key: "Enter|Space" };
check(
  "Enter|Space realized natively on a contract button",
  classify(kbEnterSpace, "web-dom", "", new Set(["button"])).verdict,
  "realized",
);
check(
  "Enter|Space realized natively via native element in emitted source",
  classify(kbEnterSpace, "web-dom", "<button type=\"button\">", new Set()).verdict,
  "realized",
);
// A native button does not supply arrow navigation.
const choiceContract = {
  compositeControl: { part: "choice", channel: "selected", interactionModel: "collection-selection", commit: "change" },
  channels: { selected: { valueType: "string" } },
  props: { designed: { members: [{ name: "group", required: true }] } },
  anatomy: { dom: { tag: "fieldset", children: [{
    tag: "label", iterate: { kind: "array" }, children: [{
      tag: "input", part: "choice", attrs: { type: "radio" }, bindings: { name: "prop:group" },
    }],
  }] } },
  a11y: { keyboard: [{ key: "ArrowLeft|ArrowRight|ArrowUp|ArrowDown" }] },
};
const choiceObligation = contract => deriveObligations([{ name: "ChoiceSet", contract }])[0];
const radioObligation = choiceObligation(choiceContract);
for (const [family, binding] of [
  ["react", "name={group}"],
  ["vue", ':name="props.group"'],
  ["svelte", "name={group}"],
  ["lit", "name=${ifDefined(this.group)}"],
  ["angular", '[name]="group"'],
]) {
  check(`${family}: native radio carrier owns arrow keys`,
    classify(radioObligation, "web-dom", `<input class="choice-set__choice" type="radio" ${binding}>`, new Set()).via,
    "native radio carrier");
}
for (const [reason, source] of [
  ["role without native input", '<div class="choice-set__choice" role="radio" name={group}>'],
  ["wrong native type", '<input class="choice-set__choice" type="checkbox" name={group}>'],
  ["missing group name", '<input class="choice-set__choice" type="radio">'],
  ["per-item group name", '<input class="choice-set__choice" type="radio" name={item.group}>'],
  ["another carrier", '<input class="unrelated__choice" type="radio" name={group}>'],
  ["sibling name", '<input class="choice-set__choice" type="radio"><div name={group}>'],
]) {
  check(`${reason} cannot satisfy native radio arrows`,
    classify(radioObligation, "web-dom", source, new Set(["input"])).verdict,
    "unrealized");
}
for (const [reason, mutate] of [
  ["optional group", contract => { contract.props.designed.members[0].required = false; }],
  ["unrepeated input", contract => { delete contract.anatomy.dom.children[0].iterate; }],
  ["per-item group", contract => { contract.anatomy.dom.children[0].children[0].bindings.name = "iter:item.group"; }],
]) {
  const contract = structuredClone(choiceContract);
  mutate(contract);
  check(`${reason} does not derive a native radio carrier`, choiceObligation(contract).nativeRadio, undefined);
}
check(
  "ArrowDown NOT satisfied by native button",
  classify({ component: "X", class: "keyboard", key: "ArrowDown" }, "web-dom", "<button>", new Set(["button"]))
    .verdict,
  "unrealized",
);
check(
  "ArrowDown realized by a keydown handler that compares it",
  classify({ component: "X", class: "keyboard", key: "ArrowDown" }, "web-dom",
    'onKeyDown={h} if (e.key === "ArrowDown") next();', new Set()).verdict,
  "realized",
);
check(
  "a keydown handler that never names PageUp does not realize PageUp",
  classify({ component: "X", class: "keyboard", key: "PageUp" }, "web-dom",
    'onKeyDown={h} if (e.key === "ArrowDown") next();', new Set()).verdict,
  "unrealized",
);
check(
  "every atomic key of an alternative must be handled",
  classify({ component: "X", class: "keyboard", key: "Home|End" }, "web-dom",
    'onKeyDown={h} if (event.key === "Home") first();', new Set()).verdict,
  "unrealized",
);
// Key spellings: Space is " " on KeyboardEvent.key, "Space" on .code.
check("Space realized by key === \" \"", handlesKey('if (e.key === " ") select();', "Space"), true);
check("Space realized by code === \"Space\"", handlesKey('if (e.code === "Space") select();', "Space"), true);
check("key === \"Space\" never matches the space bar", handlesKey('if (e.key === "Space") select();', "Space"), false);
check("a class-name join is not a Space comparison", handlesKey('[a, b].join(" ")', "Space"), false);
check("a switch arm names the key", handlesKey('switch (e.key) { case "End": last(); }', "End"), true);
check("a guard comparison names the key", handlesKey('if (key !== "End") return; last();', "End"), true);
// A primitive's key comparison counts only inside the function the component
// binds as its keydown handler.
const pagingPrimitive = [
  "export function createPagedSet() {",
  "  return {",
  "    commitOnEnter(event: { key: string; preventDefault(): void }) {",
  '      if (event.key === "Enter") { event.preventDefault(); commit(); }',
  '      if (event.key === "Escape") { event.preventDefault(); cancel(); }',
  "    },",
  "  };",
  "}",
].join("\n");
check(
  "a primitive's bound handler comparing Escape realizes it",
  classify({ component: "X", class: "keyboard", key: "Escape" }, "web-dom",
    { own: "onKeyDown={pagedSet.commitOnEnter}", relationship: `onKeyDown={pagedSet.commitOnEnter}\n${pagingPrimitive}` },
    new Set()).via,
  "primitive handler",
);
check(
  "a primitive comparing a key realizes nothing when the component binds an unrelated handler",
  classify({ component: "X", class: "keyboard", key: "Escape" }, "web-dom",
    { own: "onKeyDown={() => {}}", relationship: `onKeyDown={() => {}}\n${pagingPrimitive}` },
    new Set()).verdict,
  "unrealized",
);
check(
  "a primitive comparing a key realizes nothing without the component's handler",
  classify({ component: "X", class: "keyboard", key: "PageDown" }, "web-dom",
    { own: "<div>", relationship: '<div> onKeyDown={h} if (e.key === "PageDown") page();' },
    new Set()).verdict,
  "unrealized",
);
// Roving composites: native activation needs a reachable item.
const rovingKey = { component: "X", class: "keyboard", key: "Enter|Space", roving: { entryKeys: [] } };
check(
  "native Enter/Space on untabbable roving items is unrealized",
  classify(rovingKey, "web-dom", '<button tabIndex={-1}> onKeyDown={h}', new Set(["button"])).verdict,
  "unrealized",
);
check(
  "native Enter/Space on a roving composite with a computed tab stop is realized",
  classify(rovingKey, "web-dom", '<button tabIndex={i === active ? 0 : -1}>', new Set(["button"])).verdict,
  "realized",
);
const emittedEntry = '<button tabIndex={-1}> onKeyDown={h} if (event.key === "ArrowDown") { open(); panel.querySelector("[role=option]")?.focus(); }';
check(
  "native Enter/Space on a roving composite with an emitted entry action is realized",
  classify({ ...rovingKey, roving: { entryKeys: ["ArrowDown"] } }, "web-dom", emittedEntry, new Set(["button"])).verdict,
  "realized",
);
// A key primitive carries only the key it compares, and only where it runs.
const escapeKey = { component: "X", class: "keyboard", key: "Escape" };
const tabKey = { component: "X", class: "keyboard", key: "Shift+Tab" };
check(
  "a running dismissal whose onDismiss closes something carries Escape",
  classify(escapeKey, "web-dom", "useDismissal({\n  open: () => open.value,\n  onDismiss: () => setOpen(false),\n});", new Set()),
  { verdict: "realized", via: "primitive" },
);
check(
  "an imported dismissal that never runs does not carry Escape",
  classify(escapeKey, "web-dom", 'import { useDismissal } from "../../primitives/index.js";', new Set()).verdict,
  "unrealized",
);
check(
  "a dismissal running with onDismiss: () => void 0 hears Escape and closes nothing",
  classify(escapeKey, "web-dom", "useDismissal({\n  open: () => true,\n  onDismiss: () => void 0,\n});", new Set()).verdict,
  "unrealized",
);
check(
  "a dismissal running with onDismiss: () => { void 0; } hears Escape and closes nothing",
  classify(escapeKey, "web-dom", "new DismissalController(host, {\n  open: () => true,\n  onDismiss: () => { void 0; },\n});", new Set()).verdict,
  "unrealized",
);
check(
  "a running anchor toggle carries Escape",
  classify(escapeKey, "web-dom", "this.anchorToggle = new AnchorToggleController(\n  this,", new Set()).verdict,
  "realized",
);
check(
  "an anchored-surface controller named only in a comment does not carry Escape",
  classify(escapeKey, "web-dom", "// installed by the substrate's AnchoredSurfaceController on the trigger", new Set()).verdict,
  "unrealized",
);
check(
  "a focus trap does not carry Escape",
  classify(escapeKey, "web-dom", "useFocusTrap(panelRef, {\n  active: () => open.value,\n});", new Set()).verdict,
  "unrealized",
);
check(
  "a running focus trap carries Shift+Tab",
  classify(tabKey, "web-dom", "createFocusTrap(panelRef, { active: blocking });", new Set()),
  { verdict: "realized", via: "primitive" },
);
check(
  "a dismissal does not carry Tab",
  classify(tabKey, "web-dom", "useDismissal({\n  onDismiss: () => setOpen(false),\n});", new Set()).verdict,
  "unrealized",
);
check(
  "a dismissal whose onDismiss is an empty body across lines closes nothing",
  classify(escapeKey, "web-dom", "useDismissal({\n  open: () => true,\n  onDismiss: () => {\n  },\n});", new Set()).verdict,
  "unrealized",
);
check(
  "a dismissal whose onDismiss body spans lines and closes something carries Escape",
  classify(escapeKey, "web-dom", "useDismissal({\n  onDismiss: () => {\n    setOpen(false);\n  },\n});", new Set()).verdict,
  "realized",
);
check(
  "a dismissal whose onDismiss only returns closes nothing",
  [
    classify(escapeKey, "web-dom", "useDismissal({ open: () => true, onDismiss: () => { return; } });", new Set()).verdict,
    classify(escapeKey, "web-dom", "useDismissal({ open: () => true, onDismiss: () => { return undefined; } });", new Set()).verdict,
  ],
  ["unrealized", "unrealized"],
);
check(
  "a named onDismiss is credited without reading the function it names (the audit resolves no identifiers)",
  classify(escapeKey, "web-dom", "const ignore = () => {};\nuseDismissal({ open: () => true, onDismiss: ignore });", new Set()).verdict,
  "realized",
);
check(
  "an onDismiss outside the dismissal call does not lend it a live callback",
  classify(escapeKey, "web-dom", "const menu = { onDismiss: close };\nuseDismissal({\n  open: () => true,\n  onDismiss: () => void 0,\n});", new Set()).verdict,
  "unrealized",
);
check(
  "a call-shaped focus trap in a line comment runs nothing",
  [
    classify({ component: "X", class: "focus", key: "trap" }, "web-dom", 'import { useFocusTrap } from "../../primitives/hooks";\n// useFocusTrap(panelRef)', new Set()).verdict,
    classify(tabKey, "web-dom", 'import { useFocusTrap } from "../../primitives/hooks";\n// useFocusTrap(panelRef)', new Set()).verdict,
  ],
  ["unrealized", "unrealized"],
);
check(
  "a call-shaped anchor toggle in a block comment carries no Escape",
  classify(escapeKey, "web-dom", "/* new AnchorToggleController(host, {}) */", new Set()).verdict,
  "unrealized",
);

// focus strategies
check(
  "trap realized by a running focus-trap primitive",
  classify({ component: "X", class: "focus", key: "trap" }, "web-dom", "useFocusTrap(panelRef, {", new Set()).verdict,
  "realized",
);
// A binding whose `when` names a part is scoped to that part and the parts
// inside it, and takes native credit only from what the emitted source
// renders there.
const scopedContract = {
  anatomy: {
    dom: {
      part: "root", tag: "div",
      children: [
        { part: "list", tag: "div", children: [{ part: "tab", tag: "button" }] },
        { part: "panel", tag: "div" },
      ],
    },
  },
  a11y: {
    keyboard: [
      { key: "Tab", when: "list" },
      { key: "Escape", when: "open" },
      { key: "Enter", when: "panel" },
      { key: "Enter", when: "tab" },
    ],
  },
};
const scopedKeys = deriveObligations([{ name: "Scoped", contract: scopedContract }]).filter((ob) => ob.class === "keyboard");
check(
  "a `when` naming a part scopes the obligation to the part and its inner parts; a state `when` does not",
  scopedKeys.map((ob) => [ob.key, ob.part ?? null, ob.subtreeParts ?? null]),
  [["Tab", "list", ["list", "tab"]], ["Escape", null, null], ["Enter", "panel", ["panel"]], ["Enter", "tab", ["tab"]]],
);
check(
  "one key on two parts stays two obligations, in either declaration order",
  deriveObligations([{ name: "Scoped", contract: { ...scopedContract, a11y: { keyboard: [...scopedContract.a11y.keyboard].reverse() } } }])
    .filter((ob) => ob.class === "keyboard" && ob.key === "Enter")
    .map((ob) => ob.part),
  ["tab", "panel"],
);
check(
  "one key on two parts has two ledger identities",
  gapId({ component: "Scoped", family: "react", class: "keyboard", key: "Enter", part: "tab" }) ===
    gapId({ component: "Scoped", family: "react", class: "keyboard", key: "Enter", part: "panel" }),
  false,
);
const scoped = (key, part, subtreeParts = [part]) => ({ component: "Scoped", class: "keyboard", key, part, cssPrefix: "scoped", subtreeParts });
check(
  "a part-scoped binding is native when the part's emitted carrier is a native element",
  classify(scoped("Enter", "tab"), "web-dom", '<button class="scoped__tab" onClick={go}>', new Set()),
  { verdict: "realized", via: "native" },
);
check(
  "a part the contract declares a button but the emitted source renders as a div is not native",
  classify(scoped("Enter", "tab"), "web-dom", '<div class="scoped__tab" onClick={go}>', new Set(["button"])).verdict,
  "unrealized",
);
check(
  "a native element on another part does not lend native credit",
  classify(scoped("Enter", "panel"), "web-dom", '<div class="scoped__panel"><button class="scoped__close" onClick={go}>', new Set(["button"])).verdict,
  "unrealized",
);
check(
  "focus in a part reaches its inner parts (a tab list holds focus on its tabs)",
  classify(scoped("Tab", "list", ["list", "tab"]), "web-dom", '<div class="scoped__list"><button class="scoped__tab">', new Set()),
  { verdict: "realized", via: "native" },
);
check(
  "the InteractionHost primitive renders a button unless its literal `as` says otherwise",
  [
    'export function ScopedTab() {\n  return <InteractionHost className={classNames} onActivate={go}>{children}</InteractionHost>;\n}',
    'export function ScopedTab() {\n  return <InteractionHost as="button" className={classNames}>{children}</InteractionHost>;\n}',
    'export function ScopedTab() {\n  return <InteractionHost as="div" className={classNames}>{children}</InteractionHost>;\n}',
    'export function ScopedTab() {\n  return <InteractionHost as={tag} className={classNames}>{children}</InteractionHost>;\n}',
  ].map((src) => classify(scoped("Enter", "tab"), "web-dom", src, new Set()).verdict),
  ["realized", "realized", "unrealized", "unrealized"],
);
check(
  "an InteractionHost that adopts its child as the host is not known to be native; a forwarded asChild keeps the default button",
  [
    "export function ScopedTab() {\n  return <InteractionHost asChild><div /></InteractionHost>;\n}",
    "export function ScopedTab() {\n  return <InteractionHost asChild={true}><div /></InteractionHost>;\n}",
    "export function ScopedTab() {\n  return <InteractionHost {...hostProps} asChild={asChild} role=\"tab\">{children}</InteractionHost>;\n}",
  ].map((src) => classify(scoped("Enter", "tab"), "web-dom", src, new Set()).verdict),
  ["unrealized", "unrealized", "realized"],
);
const tabHost = 'export class ScopedTabElement extends LitElement {\n  updated() {\n    this.setAttribute("tabindex", this.active ? "0" : "-1");\n  }\n}';
check(
  "Tab moves on natively from a focusable custom-element host; Enter needs a native element or a handler",
  [
    classify(scoped("Tab", "list", ["list", "tab"]), "web-dom", tabHost, new Set()).verdict,
    classify(scoped("Enter", "tab"), "web-dom", tabHost, new Set()).verdict,
  ],
  ["realized", "unrealized"],
);
check(
  "a carrier is focusable only where it writes a tabindex, not where the word appears",
  [
    "export class ScopedTabElement extends LitElement {\n  /* tabindex */\n}",
    "export class ScopedTabElement extends LitElement {\n  render() { const tabindex = 0; return html`<span></span>`; }\n}",
    '<div class="scoped__list" role="tablist" tabindex="-1">',
    "export class ScopedTabElement extends LitElement {\n  updated() { this.tabIndex = this.active ? 0 : -1; }\n}",
  ].map((src) => classify(scoped("Tab", "list", ["list", "tab"]), "web-dom", src, new Set()).verdict),
  ["unrealized", "unrealized", "realized", "realized"],
);
check(
  "an unscoped binding keeps native credit from a native element in the emitted source",
  classify({ component: "Scoped", class: "keyboard", key: "Enter" }, "web-dom", "<button onClick={go}>", new Set(["div"])).verdict,
  "realized",
);

check(
  "trap not realized by a focus-trap import alone",
  classify({ component: "X", class: "focus", key: "trap" }, "web-dom", 'import { useFocusTrap } from "../../primitives/hooks";', new Set()).verdict,
  "unrealized",
);
check(
  "roving demands explicit key handling (never native)",
  classify({ component: "X", class: "focus", key: "roving" }, "web-dom", "<button>", new Set(["button"]))
    .verdict,
  "unrealized",
);
const rovingFocus = { component: "X", class: "focus", key: "roving", roving: { entryKeys: [] } };
check(
  "roving with a handler but only literal tabindex has no way in",
  classify(rovingFocus, "web-dom", 'onKeyDown={h} <button tabIndex={-1}>', new Set()).verdict,
  "unrealized",
);
check(
  "roving with an emitted entry action is reachable",
  classify({ ...rovingFocus, roving: { entryKeys: ["ArrowDown"] } }, "web-dom", emittedEntry, new Set()).verdict,
  "realized",
);
check(
  "a declared entry action whose key is never compared is not a way in",
  classify({ ...rovingFocus, roving: { entryKeys: ["ArrowDown"] } }, "web-dom",
    'onKeyDown={h} <button tabIndex={-1}> panel.querySelector("[role=option]")?.focus();', new Set()).verdict,
  "unrealized",
);
check(
  "a declared entry action that never moves focus is not a way in",
  classify({ ...rovingFocus, roving: { entryKeys: ["ArrowDown"] } }, "web-dom",
    'onKeyDown={h} <button tabIndex={-1}> if (event.key === "ArrowDown") open();', new Set()).verdict,
  "unrealized",
);
for (const [family, source] of [
  ["react", "tabIndex={isActive ? 0 : -1}"],
  ["svelte", "tabindex={isActive ? 0 : -1}"],
  ["vue", ':tabindex="isActive ? 0 : -1"'],
  ["angular", '[attr.tabindex]="isActive() ? 0 : -1"'],
  ["lit", 'this.setAttribute("tabindex", isActive ? "0" : "-1")'],
]) {
  check(`${family}: a computed tabindex is a roving tab stop`, rovingReachable(source, { entryKeys: [] }), true);
}
for (const [family, source] of [
  ["react", "tabIndex={-1}"],
  ["vue", ':tabindex="0"'],
  ["angular", '[attr.tabindex]="0"'],
  ["lit", 'this.setAttribute("tabindex", "0")'],
]) {
  check(`${family}: a literal tabindex is not a roving tab stop`, rovingReachable(source, { entryKeys: [] }), false);
}

// -- state attributes ---------------------------------------------------------
const selectedState = { component: "X", class: "state-attribute", key: "aria-selected" };
for (const [family, source] of [
  ["react", "aria-selected={isActive}"],
  ["vue", ' :aria-selected="isActive"'],
  ["angular", '[attr.aria-selected]="isActive()"'],
  ["lit", "aria-selected=${this.active}"],
  ["programmatic", 'el.setAttribute("aria-selected", isActive ? "true" : "false")'],
  ["prop getter", '{ "aria-selected": ctx.active }'],
]) {
  check(`${family}: a bound aria-selected is realized`,
    classify(selectedState, "web-dom", source, new Set()).verdict, "realized");
}
check("a static aria-selected literal does not track state",
  classify(selectedState, "web-dom", '<li aria-selected="true">', new Set()).reason,
  "aria-selected is a static literal");
check("a static setAttribute value does not track state",
  classify(selectedState, "web-dom", 'el.setAttribute("aria-selected", "true")', new Set()).verdict,
  "unrealized");
check("a CSS attribute selector is not a binding",
  classify(selectedState, "web-dom", '.cal__cell[aria-selected="true"] { color: red }', new Set()).reason,
  "aria-selected is never bound");
for (const [family, source] of [
  ["react", "aria-selected={true}"],
  ["vue", ' :aria-selected="true"'],
  ["angular", '[attr.aria-selected]="true"'],
  ["lit", "aria-selected=${true}"],
]) {
  check(`${family}: a constant inside binding syntax does not track state`,
    classify(selectedState, "web-dom", source, new Set()).reason,
    "aria-selected is a static literal");
}
check("a contract-declared constant is realized by emitting it",
  classify({ ...selectedState, declaredStatic: true, declaredValue: "true" }, "web-dom", '<li aria-selected="true">', new Set()).via,
  "static as declared");
check("emitting the opposite of a contract-declared constant is unrealized",
  classify({ ...selectedState, declaredStatic: true, declaredValue: "true" }, "web-dom", '<li aria-selected="false">', new Set()).verdict,
  "unrealized");
check("react-native emitting the opposite of a declared constant is unrealized",
  classify({ ...selectedState, declaredStatic: true, declaredValue: "true" }, "native-mobile",
    "accessibilityState={{ selected: false }}", new Set()).verdict,
  "unrealized");
check("a contract suppression is an explicit exclusion",
  classify({ ...selectedState, suppressed: "cursor" }, "web-dom", "", new Set()).verdict,
  "excluded");
check("a bound native checked carries aria-checked on an input",
  classify({ component: "X", class: "state-attribute", key: "aria-checked" }, "web-dom",
    "<input type=\"checkbox\" checked={value} />", new Set(["input"])).via,
  "native input");
check("a state attribute set by an imported primitive is realized",
  classify({ component: "X", class: "state-attribute", key: "aria-expanded" }, "web-dom",
    { own: "<button>", relationship: '<button> anchor.setAttribute("aria-expanded", isOpen ? "true" : "false")' },
    new Set()).verdict,
  "realized");
check("react-native accessibilityState tracking state is realized",
  classify(selectedState, "native-mobile", "accessibilityState={{ selected: isActive }}", new Set()).verdict,
  "realized");
check("react-native constant accessibilityState does not track state",
  classify(selectedState, "native-mobile", "accessibilityState={{ selected: true }}", new Set()).verdict,
  "unrealized");
check("react-native has no aria-current surface",
  classify({ component: "X", class: "state-attribute", key: "aria-current" }, "native-mobile", "", new Set()).verdict,
  "excluded");
check("swiftui conditional isSelected trait is realized",
  classify(selectedState, "native-declarative", ".accessibilityAddTraits(i == page ? [.isSelected] : [])", new Set(), "swiftui").verdict,
  "realized");
check("swiftui isSelected method call is not a trait",
  classify(selectedState, "native-declarative", "if selection.isSelected(option.value) {", new Set(), "swiftui").verdict,
  "unrealized");
check("compose selected semantics argument is realized",
  classify(selectedState, "native-declarative", "Modifier.selectable(selected = selected, role = Role.Tab)", new Set(), "jetpack-compose").verdict,
  "realized");
check("compose val declaration and English stateDescription are not selected semantics",
  classify(selectedState, "native-declarative",
    'val selected = state.value == key\n.semantics { stateDescription = if (selected) "selected" else "not selected" }',
    new Set(), "jetpack-compose").verdict,
  "unrealized");
check("compose delegated control semantics count for the component",
  classify({ component: "X", class: "state-attribute", key: "aria-checked" }, "native-declarative",
    { own: "FsdsCheckbox(checked)", relationship: "FsdsCheckbox(checked)", delegated: "FsdsCheckbox(checked) Modifier.toggleable(value = checked, role = Role.Checkbox)" },
    new Set(), "jetpack-compose").verdict,
  "realized");
// aria-current beside a dynamic aria-selected (a date grid's today among its
// selected days) needs its own state value: the selection surface realizes
// aria-selected and must not announce the current item as selected.
const currentBesideSelection = { component: "X", class: "state-attribute", key: "aria-current", besideSelection: true };
check("swiftui: the isSelected trait does not carry aria-current beside a selection",
  classify(currentBesideSelection, "native-declarative", ".accessibilityAddTraits(day.isSelected ? [.isSelected] : [])", new Set(), "swiftui").verdict,
  "unrealized");
check("swiftui: a dynamic accessibilityValue carries aria-current beside a selection",
  classify(currentBesideSelection, "native-declarative", ".accessibilityValue(current)", new Set(), "swiftui").verdict,
  "realized");
check("swiftui: a literal accessibilityValue does not track the current item",
  classify(currentBesideSelection, "native-declarative", '.accessibilityValue("Today")', new Set(), "swiftui").verdict,
  "unrealized");
check("compose: selected semantics do not carry aria-current beside a selection",
  classify(currentBesideSelection, "native-declarative", ".selectable(selected = day.selected, role = Role.Button)", new Set(), "jetpack-compose").verdict,
  "unrealized");
check("compose: a stateDescription carries aria-current beside a selection",
  classify(currentBesideSelection, "native-declarative", ".semantics { stateDescription = currentName }", new Set(), "jetpack-compose").verdict,
  "realized");
check("aria-current alone keeps the selected-state surface (a current page is selected)",
  classify({ component: "X", class: "state-attribute", key: "aria-current" }, "native-declarative",
    ".accessibilityAddTraits(isCurrent ? [.isSelected] : [])", new Set(), "swiftui").verdict,
  "realized");
check("aria-current is derived beside a dynamic aria-selected only",
  deriveObligations([
    { name: "Grid", contract: { anatomy: { dom: { tag: "td", bindings: { "aria-selected": "iter:item.selected", "aria-current": "iter:item.current" } } } } },
    { name: "Pager", contract: { anatomy: { dom: { tag: "a", bindings: { "aria-current": "prop:current" } } } } },
  ]).filter((o) => o.class === "state-attribute" && o.key === "aria-current").map((o) => [o.component, o.besideSelection === true]),
  [["Grid", true], ["Pager", false]]);
check("declarative native keyboard obligations are excluded",
  classify({ component: "X", class: "keyboard", key: "Enter" }, "native-declarative", "", new Set(), "swiftui").verdict,
  "excluded");

// -- interactive roles --------------------------------------------------------
const activation = { component: "X", class: "interactive-role", key: "activation" };
check("compose clickable without a role is unrealized",
  unroledComposeActivations("Column(modifier.clickable { onSelect() })"), ["clickable"]);
check("compose clickable with enabled but no role is unrealized",
  unroledComposeActivations("Modifier.clickable(enabled = enabled) { open() }"), ["clickable"]);
check("compose selectable with a role is realized",
  unroledComposeActivations("Modifier.selectable(selected = s, role = Role.Tab, onClick = { pick() })"), []);
check("compose import lines are not activation sites",
  unroledComposeActivations("import androidx.compose.foundation.clickable\n"), []);
check("a compose wrapper delegating to an unroled control is unrealized",
  classify(activation, "native-declarative",
    { own: "FsdsCheckbox(checked)", relationship: "FsdsCheckbox(checked)", delegated: "FsdsCheckbox(checked) Modifier.toggleable(value = checked, onValueChange = set)" },
    new Set(), "jetpack-compose").verdict,
  "unrealized");
check("a compose wrapper delegating to a roled control is realized",
  classify(activation, "native-declarative",
    { own: "FsdsCheckbox(checked)", relationship: "FsdsCheckbox(checked)", delegated: "FsdsCheckbox(checked) Modifier.toggleable(value = checked, role = Role.Checkbox, onValueChange = set)" },
    new Set(), "jetpack-compose").verdict,
  "realized");
check("react-native pressable without accessibilityRole is unrealized",
  classify(activation, "native-mobile", "<Pressable onPress={go}>", new Set()).verdict, "unrealized");
check("react-native pressable with accessibilityRole is realized",
  classify(activation, "native-mobile", '<Pressable accessibilityRole="button" onPress={go}>', new Set()).verdict, "realized");
check("react-native backdrop hidden from assistive tech needs no role",
  classify(activation, "native-mobile", "<Pressable accessible={false} onPress={close}>", new Set()).verdict, "realized");
check("swiftui onTapGesture without the button trait is unrealized",
  classify(activation, "native-declarative", "Text(label).onTapGesture { go() }", new Set(), "swiftui").verdict, "unrealized");
check("web interactive roles are an explicit exclusion",
  classify(activation, "web-dom", "<div>", new Set()).verdict, "excluded");

// -- registered families ------------------------------------------------------
const packs = {
  swiftui: { target: { family: "native-view" }, outputs: { componentsRoot: "Sources/C" }, admission: { commands: [{ scope: { packageRoot: "packages/ds-swiftui/" } }] } },
  gpui: { target: { family: "native-view" }, outputs: { componentsRoot: "src/components" }, admission: { commands: [{ scope: { packageRoot: "packages/ds-gpui/" } }] } },
  figma: { target: { family: "design-tool" }, outputs: { componentsRoot: "src" } },
};
const resolved = resolveRegisteredFamilies(
  [
    { id: "react", source: { kind: "builtin" } },
    { id: "swiftui", source: { kind: "builtin" } },
    { id: "gpui", source: { kind: "builtin" } },
    { id: "figma", source: { kind: "builtin" } },
    { id: "acme-native", source: { kind: "local", manifest: "./packs/acme.json" } },
  ],
  packs,
  new Set(["react"]),
);
check("a surface-table native-view target is classified",
  resolved.families.map((f) => [f.id, f.kind, f.outputTreeRelPath]),
  [["swiftui", "native-declarative", "packages/ds-swiftui/Sources/C"]]);
check("every other registration is a named exclusion, none dropped",
  resolved.excludedFamilies.map((f) => f.id), ["gpui", "figma", "acme-native"]);

if (failures > 0) {
  console.error(`\n[a11y-rail selfcheck] ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("[a11y-rail selfcheck] all classifier assertions pass");
