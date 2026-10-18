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
  handlesKey,
  relationshipTokens,
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
    { component: "Fixture", class: "keyboard", key: "ArrowDown", roving: { entryAction: false } },
    { component: "Fixture", class: "focus", key: "roving", roving: { entryAction: false } },
  ],
);
// A `behavior: "open"` keyboard entry is the roving composite's way in.
check(
  "an open-behavior keyboard entry declares a roving entry action",
  deriveObligations([{ name: "Menu", contract: {
    a11y: { keyboard: [{ key: "ArrowDown", when: "trigger", behavior: "open" }] },
    focus: { strategy: "roving" },
  } }]).find((o) => o.class === "focus").roving,
  { entryAction: true },
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
  [{ attribute: "aria-selected", declaredStatic: true }],
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
// A primitive's key tokens count only when the component binds the handler.
check(
  "a primitive comparing Escape realizes it when the component binds keydown",
  classify({ component: "X", class: "keyboard", key: "Escape" }, "web-dom",
    { own: "onKeyDown={paged.commitOnEnter}", relationship: 'onKeyDown={paged.commitOnEnter} if (event.key === "Escape") cancel();' },
    new Set()).via,
  "primitive handler",
);
check(
  "a primitive comparing a key realizes nothing without the component's handler",
  classify({ component: "X", class: "keyboard", key: "PageDown" }, "web-dom",
    { own: "<div>", relationship: '<div> onKeyDown={h} if (e.key === "PageDown") page();' },
    new Set()).verdict,
  "unrealized",
);
// Roving composites: native activation needs a reachable item.
const rovingKey = { component: "X", class: "keyboard", key: "Enter|Space", roving: { entryAction: false } };
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
check(
  "native Enter/Space on a roving composite with an entry action is realized",
  classify({ ...rovingKey, roving: { entryAction: true } }, "web-dom", '<button tabIndex={-1}>', new Set(["button"])).verdict,
  "realized",
);
check(
  "Escape realized by dismissal primitive import",
  classify({ component: "X", class: "keyboard", key: "Escape" }, "web-dom", "import { useDismissal }", new Set())
    .verdict,
  "realized",
);
check(
  "Escape NOT realized by focus-trap alone... unless trap present counts only for Tab",
  classify({ component: "X", class: "keyboard", key: "Escape" }, "web-dom", "plain source", new Set())
    .verdict,
  "unrealized",
);

// focus strategies
check(
  "trap realized by focus-trap primitive",
  classify({ component: "X", class: "focus", key: "trap" }, "web-dom", "useFocusTrap(", new Set()).verdict,
  "realized",
);
check(
  "roving demands explicit key handling (never native)",
  classify({ component: "X", class: "focus", key: "roving" }, "web-dom", "<button>", new Set(["button"]))
    .verdict,
  "unrealized",
);
const rovingFocus = { component: "X", class: "focus", key: "roving", roving: { entryAction: false } };
check(
  "roving with a handler but only literal tabindex has no way in",
  classify(rovingFocus, "web-dom", 'onKeyDown={h} <button tabIndex={-1}>', new Set()).verdict,
  "unrealized",
);
check(
  "roving with a declared entry action is reachable",
  classify({ ...rovingFocus, roving: { entryAction: true } }, "web-dom", 'onKeyDown={h} <button tabIndex={-1}>', new Set()).verdict,
  "realized",
);
for (const [family, source] of [
  ["react", "tabIndex={isActive ? 0 : -1}"],
  ["svelte", "tabindex={isActive ? 0 : -1}"],
  ["vue", ':tabindex="isActive ? 0 : -1"'],
  ["angular", '[attr.tabindex]="isActive() ? 0 : -1"'],
  ["lit", 'this.setAttribute("tabindex", isActive ? "0" : "-1")'],
]) {
  check(`${family}: a computed tabindex is a roving tab stop`, rovingReachable(source, { entryAction: false }), true);
}
for (const [family, source] of [
  ["react", "tabIndex={-1}"],
  ["vue", ':tabindex="0"'],
  ["angular", '[attr.tabindex]="0"'],
  ["lit", 'this.setAttribute("tabindex", "0")'],
]) {
  check(`${family}: a literal tabindex is not a roving tab stop`, rovingReachable(source, { entryAction: false }), false);
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
check("a contract-declared constant is realized by emitting it",
  classify({ ...selectedState, declaredStatic: true }, "web-dom", '<li aria-selected="true">', new Set()).via,
  "static as declared");
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

if (failures > 0) {
  console.error(`\n[a11y-rail selfcheck] ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("[a11y-rail selfcheck] all classifier assertions pass");
