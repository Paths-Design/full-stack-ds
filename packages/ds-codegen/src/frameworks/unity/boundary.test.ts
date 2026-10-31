import path from "node:path";
import { describe, expect, it } from "vitest";
import { listComponentContracts } from "../../contracts-fs.js";
import { buildComponentIR } from "../../ir.js";
import { HANDLERS, fontStyle, tokenScalar } from "./uss.js";
import {
  admitContract,
  auditBoundary,
  classifyContract,
  classifyLeaf,
  keyedLeaves,
  loadBoundary,
  loadContractWithSidecars,
  patternMatches,
  propRoles,
  unityAllowlist,
  validateBoundary,
  type Boundary,
  type ClassifiedLeaf,
  type ContractWithSidecars,
  type Leaf,
} from "./boundary.js";

const root = path.resolve(__dirname, "../../../../..");
const load = (name: string): ContractWithSidecars => loadContractWithSidecars(root, name);
const rule = (overrides: Record<string, unknown>) => ({ id: "r", match: ["contract:/x"], disposition: "refused", reason: "why", ...overrides });
const boundaryOf = (rules: Record<string, unknown>[]): Boundary => validateBoundary({ schema: "unity-support-boundary.v1", rules });
// Corpus-wide cases load, build the IR for and classify every contract (about
// 1s alone); under the root suite's parallel load they overran vitest's 5s
// default. The budget covers that work; it relaxes no assertion.
const CORPUS_TIMEOUT_MS = 20_000;

describe("Unity support boundary", () => {
  it("classifies every leaf of the live corpus and its sidecars with no dead rules", () => {
    const audit = auditBoundary(root);
    // The audit is the P1 exit condition: zero unclassified, no allowlisted
    // component resting on a catch-all, and every rule still matching a live leaf.
    expect(audit.violations).toEqual([]);
    expect(audit.counts.unclassified).toBe(0);
    expect(audit.unadjudicated).toEqual([]);
    expect(audit.deadRules).toEqual([]);
    for (const disposition of ["lowered", "pending", "refused"] as const) expect(audit.counts[disposition]).toBeGreaterThan(0);
    // Pending debt is attributed to a phase, never floating.
    expect(Object.values(audit.perPhase).reduce((a, b) => a + b, 0)).toBe(audit.counts.pending);
    // P2 (the anatomy walker) is discharged: no leaf anywhere waits on it.
    expect(audit.perPhase.P2).toBeUndefined();
    expect(loadBoundary().rules.filter(r => r.phase === "P2")).toEqual([]);
    // P3 (the styling projection) is used only by the two admitted boolean
    // controls' withheld size axis: their contracts carry no size style rules.
    expect(audit.perPhase.P3).toBeGreaterThan(0);
    expect(loadBoundary().rules.filter(r => r.phase === "P3").map(r => r.id)).toEqual(["prop-size-boolean-unstyled"]);
  }, CORPUS_TIMEOUT_MS);

  it("resolves every anatomy node kind of the allowlist to exactly one walker lowering or an explicit pending/refused rule", () => {
    const of = (name: string, keyed: string) => {
      const leaf = classifyContract(load(name)).find(l => l.keyed === keyed);
      return leaf && { rule: leaf.rule, disposition: leaf.disposition };
    };
    const trigger = "/anatomy/dom/children/item/children/header/children/trigger";
    // Element nodes, part identity and tags are lowered by the walker.
    expect(of("Switch", "/anatomy/dom/part")).toEqual({ rule: "anatomy-elements", disposition: "lowered" });
    expect(of("Switch", "/anatomy/dom/children/track/children/thumb/tag")).toEqual({ rule: "anatomy-tags", disposition: "lowered" });
    expect(of("Tabs", "/anatomy/parts/3")).toEqual({ rule: "anatomy-parts", disposition: "lowered" });
    // The children insertion point is a tag the walker lowers (contentContainer / host).
    expect(of("Switch", "/anatomy/dom/children/2/tag")).toEqual({ rule: "anatomy-tags", disposition: "lowered" });
    // Selected-channel bindings on trigger parts are realised by the behavior's state class.
    expect(of("Switch", "/anatomy/dom/children/input/bindings/checked")).toEqual({ rule: "anatomy-channel-binding", disposition: "lowered" });
    expect(of("Accordion", `${trigger}/bindings/aria-expanded`)).toEqual({ rule: "anatomy-channel-binding", disposition: "lowered" });
    expect(of("Tabs", "/anatomy/dom/children/list/children/tab/bindings/aria-selected")).toEqual({ rule: "anatomy-channel-binding", disposition: "lowered" });
    // disabled=prop:* is the root Disabled; name/value form bindings are refused.
    expect(of("Switch", "/anatomy/dom/children/input/bindings/disabled")).toEqual({ rule: "anatomy-disabled-binding", disposition: "lowered" });
    expect(of("Switch", "/anatomy/dom/children/input/bindings/name")).toEqual({ rule: "anatomy-form-binding", disposition: "refused" });
    expect(of("Switch", "/anatomy/dom/children/input/bindings/value")).toEqual({ rule: "anatomy-form-binding", disposition: "refused" });
    // Static role / aria-* / type attributes are refused.
    expect(of("Switch", "/anatomy/dom/children/input/attrs/role")).toEqual({ rule: "anatomy-static-attrs-refused", disposition: "refused" });
    expect(of("Switch", "/anatomy/dom/children/input/attrs/type")).toEqual({ rule: "anatomy-static-attrs-refused", disposition: "refused" });
    expect(of("Tabs", "/anatomy/dom/children/list/children/indicator/attrs/aria-hidden")).toEqual({ rule: "anatomy-static-attrs-refused", disposition: "refused" });
    // Static references to admitted components forward their props and part identity.
    expect(of("Accordion", `${trigger}/children/ref:chevron/part`)).toEqual({ rule: "anatomy-component-ref-identity", disposition: "lowered" });
    expect(of("Accordion", `${trigger}/children/ref:chevron/componentRef`)).toEqual({ rule: "anatomy-component-ref", disposition: "lowered" });
    expect(of("Accordion", `${trigger}/children/ref:chevron/attrs/name`)).toEqual({ rule: "anatomy-component-ref", disposition: "lowered" });
    // Slot anchors are part identity.
    expect(of("Popover", "/slots/content/selector")).toEqual({ rule: "slots", disposition: "lowered" });
    // Kinds the allowlist does not use classify by pointer shape alone.
    const shape = (keyed: string, value: unknown) => {
      const leaf = classifyLeaf({ source: "contract", pointer: keyed, keyed, value });
      return { rule: leaf.rule, disposition: leaf.disposition, phase: loadBoundary().rules.find(r => r.id === leaf.rule)?.phase };
    };
    expect(shape("/anatomy/dom/children/x/children/y/name", "label")).toEqual({ rule: "anatomy-named-slot", disposition: "lowered", phase: undefined });
    expect(shape("/anatomy/dom/children/x/if", "icon")).toEqual({ rule: "anatomy-guards", disposition: "pending", phase: "P4" });
    expect(shape("/anatomy/dom/children/x/iterate/source", "prop:items")).toEqual({ rule: "anatomy-iteration", disposition: "pending", phase: "P4" });
    expect(shape("/anatomy/dom/children/x/cssVariableBindings/--fsds-x-y", "prop:y")).toEqual({ rule: "anatomy-css-var-bindings", disposition: "pending", phase: "P4" });
    expect(shape("/anatomy/dom/children/x/iconGlyph/nameFrom", "prop:icon")).toEqual({ rule: "anatomy-icon-glyph", disposition: "lowered", phase: undefined });
    expect(shape("/anatomy/dom/children/x/content", "prop:label")).toEqual({ rule: "anatomy-content", disposition: "pending", phase: "P4" });
    // A part named like a dom field is still a part: `content` the part is not `content` the binding.
    expect(shape("/anatomy/dom/children/item/children/content/tag", "div")).toEqual({ rule: "anatomy-tags", disposition: "lowered", phase: undefined });
    // A channel binding is lowered only for the `.value` field shape; other channel fields fall through.
    expect(shape("/anatomy/dom/children/x/bindings/aria-expanded", "channel:open.onChange")).toEqual({ rule: "anatomy-aria-binding", disposition: "refused", phase: undefined });
    // The generic anatomy-bindings catch-all is retired: every allowlisted binding
    // family now carries its own rule, so an unknown shape stays unclassified.
    expect(shape("/anatomy/dom/children/x/bindings/href", "channel:open.onChange")).toEqual({ rule: null, disposition: "unclassified", phase: undefined });
  });

  it("admits every allowlisted component and refuses nothing it carries today", () => {
    for (const name of unityAllowlist(root)) {
      const classified = admitContract(load(name), { admitted: true });
      expect(classified.some(l => l.disposition === "unclassified" || l.catchAll)).toBe(false);
    }
  }, CORPUS_TIMEOUT_MS);

  it("derives prop roles from the contract's own channels and form blocks, not from prop names", () => {
    const sw = propRoles(load("Switch"));
    expect(sw.get("checked")).toBe("channel-value");
    expect(sw.get("defaultChecked")).toBe("channel-default");
    expect(sw.get("onChange")).toBe("channel-change");
    // Switch participates in forms, so its bare name/value props are form fields.
    expect(sw.get("name")).toBe("form-field");
    expect(sw.get("value")).toBe("form-field");
    expect(sw.has("disabled")).toBe(false);
    // Tabs' `value` is its selection channel, not a form field.
    expect(propRoles(load("Tabs")).get("value")).toBe("channel-value");
    // Avatar's `name` is a plain prop: no form block, no channel.
    expect(propRoles(load("Avatar")).has("name")).toBe(false);
    expect(propRoles(load("Icon")).get("name")).toBe("glyph-name");
    const avatarName = classifyContract(load("Avatar")).find(l => l.keyed === "/props/designed/members/plain:name/name");
    expect(avatarName?.rule).toBe("prop-avatar-priority-refused");
    const switchName = classifyContract(load("Switch")).find(l => l.keyed === "/props/designed/members/form-field:name/name");
    expect(switchName).toMatchObject({ rule: "prop-form-field", disposition: "refused" });
  });

  it("keys array elements by identity while keeping RFC 6901 pointers", () => {
    const leaves = keyedLeaves({ parts: [{ name: "a/b", x: 1 }], dom: [{ part: "root", tag: "div" }], flags: [true], empty: {}, none: null }, "contract");
    expect(leaves.map(l => [l.pointer, l.keyed, l.value])).toEqual([
      ["/parts/0/name", "/parts/a~1b/name", "a/b"],
      ["/parts/0/x", "/parts/a~1b/x", 1],
      ["/dom/0/part", "/dom/root/part", "root"],
      ["/dom/0/tag", "/dom/root/tag", "div"],
      ["/flags/0", "/flags/0", true],
      ["/empty", "/empty", {}],
      ["/none", "/none", null],
    ]);
    // Anatomy nodes that render another component are keyed ref:<part> (or ref:<index>).
    expect(keyedLeaves({ children: [{ componentRef: "fsds.Icon", part: "chevron", attrs: { name: "x" } }, { componentRef: "fsds.Icon", name: "slotty" }] }, "contract").map(l => l.keyed))
      .toEqual(["/children/ref:chevron/componentRef", "/children/ref:chevron/part", "/children/ref:chevron/attrs/name", "/children/ref:1/componentRef", "/children/ref:1/name"]);
    // Prop members take the derived role prefix; other named arrays do not.
    const roles = new Map([["checked", "channel-value"]]);
    expect(keyedLeaves({ props: { designed: { members: [{ name: "checked", type: "boolean" }, { name: "other", type: "string" }] } } }, "contract", roles).map(l => l.keyed))
      .toEqual(["/props/designed/members/channel-value:checked/name", "/props/designed/members/channel-value:checked/type", "/props/designed/members/plain:other/name", "/props/designed/members/plain:other/type"]);
  });

  it.each([
    ["contract:/a11y/**", "/a11y/keyboard/0/key", true],
    ["contract:/a11y/**", "/a11y", true],
    ["contract:/a11y/**", "/a11yx", false],
    ["contract:/props/*/members/channel-value:*/**", "/props/designed/members/channel-value:checked/default", true],
    ["contract:/props/*/members/channel-value:*/**", "/props/designed/members/plain:checked/default", false],
    ["tokens:/*.size.md.track.width/fallback", "/switch.size.md.track.width/fallback", true],
    ["tokens:/*.size.md.track.width/fallback", "/switch.size.md.track.width/layer", false],
    ["styles:/**", "/root/color/design", true],
    ["contract:/a/**/z", "/a/z", true],
    ["contract:/a/**/z", "/a/x/y/z", true],
    ["contract:/a/**/z", "/a/x/z/extra", false],
    ["contract:/a/**/x/**/z", "/a/x/y/x/z", true],
    ["contract:/a/*/z", "/a/x/y/z", false],
    ["tokens:/*.size.md[0]+/fallback", "/switch.size.md[0]+/fallback", true],
    ["tokens:/*.size.md[0]+/fallback", "/switch.size.md0/fallback", false],
  ])("pattern %s against %s → %s", (pattern, keyed, expected) => {
    const source = pattern.split(":")[0] as "contract" | "tokens" | "styles";
    expect(patternMatches(pattern, { source, keyed })).toBe(expected);
  });

  it("does not let a pattern cross sources", () => {
    expect(patternMatches("contract:/root/**", { source: "styles", keyed: "/root/color" })).toBe(false);
  });

  it("first matching rule wins and valueIn filters by scalar value", () => {
    const boundary = boundaryOf([
      rule({ id: "bool", match: ["contract:/formControl/valueModel"], valueIn: ["boolean"], disposition: "lowered", via: "BooleanControl", reason: undefined }),
      rule({ id: "rest", match: ["contract:/formControl/**"], disposition: "pending", phase: "P4", catchAll: true }),
    ]);
    const leaf = { source: "contract" as const, pointer: "/formControl/valueModel", keyed: "/formControl/valueModel", value: "boolean" };
    expect(classifyLeaf(leaf, boundary)).toMatchObject({ rule: "bool", disposition: "lowered", catchAll: false });
    expect(classifyLeaf({ ...leaf, value: "string" }, boundary)).toMatchObject({ rule: "rest", disposition: "pending", catchAll: true });
    // Live boundary: a non-boolean value model on an allowlisted component is unadjudicated, not silently pending.
    const contract = load("Switch");
    contract.formControl!.valueModel = "string" as never;
    expect(() => admitContract(contract, { admitted: true })).toThrow(/UNITY_BOUNDARY_UNCLASSIFIED: Switch: contract:\/formControl\/valueModel/);
  });

  it("valuePattern filters string leaves by regular expression and never matches non-strings", () => {
    const boundary = boundaryOf([
      rule({ id: "chan", match: ["contract:/b/*"], valuePattern: "^channel:[a-z]+\\.value$", disposition: "lowered", via: "state class", reason: undefined }),
      rule({ id: "rest", match: ["contract:/b/*"], disposition: "pending", phase: "P4" }),
    ]);
    const leaf = (value: unknown) => classifyLeaf({ source: "contract", pointer: "/b/x", keyed: "/b/x", value }, boundary).rule;
    expect(leaf("channel:open.value")).toBe("chan");
    expect(leaf("channel:open.onChange")).toBe("rest");
    expect(leaf("xchannel:open.value")).toBe("rest");
    expect(leaf(true)).toBe("rest");
  });

  it("rechecks values, sources and edited rules after warming matcher syntax", () => {
    const boundary = boundaryOf([
      rule({ id: "first", match: ["contract:/x/**"], valuePattern: "^yes$" }),
      rule({ id: "fallback", match: ["contract:/**"] }),
    ]);
    const leaf = { source: "contract" as const, pointer: "/x/y", keyed: "/x/y", value: "yes" };
    expect(classifyLeaf(leaf, boundary).rule).toBe("first");
    expect(classifyLeaf({ ...leaf, value: "no" }, boundary).rule).toBe("fallback");
    expect(classifyLeaf({ ...leaf, source: "styles" }, boundary).rule).toBeNull();
    boundary.rules[0]!.valuePattern = "^no$";
    expect(classifyLeaf(leaf, boundary).rule).toBe("fallback");
    expect(classifyLeaf({ ...leaf, value: "no" }, boundary).rule).toBe("first");
    boundary.rules.reverse();
    expect(classifyLeaf({ ...leaf, value: "no" }, boundary).rule).toBe("fallback");
  });

  it("an unclassified leaf fails generation for any component, allowlisted or not", () => {
    const contract = load("Switch") as ContractWithSidecars & { futureBlock?: unknown };
    contract.futureBlock = { enabled: true };
    expect(() => admitContract(contract, { admitted: false })).toThrow(/^UNITY_BOUNDARY_UNCLASSIFIED: Switch: contract:\/futureBlock\/enabled$/);
    expect(() => admitContract(contract, { admitted: true })).toThrow("UNITY_BOUNDARY_UNCLASSIFIED");
  });

  it("an allowlisted component may not rely on a catch-all; an explicit request may", () => {
    const contract = load("Switch");
    contract.props!.designed!.members!.push({ name: "futureBehavior", propType: { kind: "boolean" }, default: false });
    expect(() => admitContract(contract, { admitted: true })).toThrow(/UNITY_BOUNDARY_UNADJUDICATED: Switch .*plain:futureBehavior\/name \(rule props-unadjudicated\)/);
    const classified = admitContract(contract, { admitted: false });
    expect(classified.filter(l => l.keyed.includes("plain:futureBehavior")).every(l => l.rule === "props-unadjudicated" && l.catchAll)).toBe(true);
  });

  it("the committed boundary validates and loads once", () => {
    expect(loadBoundary()).toBe(loadBoundary());
    expect(loadBoundary().rules.length).toBeGreaterThan(10);
  });

  it.each([
    ["lowered rule without via", rule({ disposition: "lowered", reason: undefined }), /lowered rules name their mechanism/],
    ["lowered catch-all", rule({ disposition: "lowered", via: "x", catchAll: true }), /cannot be a catch-all/],
    ["pending without phase", rule({ disposition: "pending" }), /pending rules name a phase/],
    ["pending with unknown phase", rule({ disposition: "pending", phase: "P9" }), /pending rules name a phase/],
    ["refused without reason", rule({ reason: "" }), /refused rules carry a reason/],
    ["refused catch-all", rule({ catchAll: true }), /cannot be a catch-all/],
    ["bad disposition", rule({ disposition: "maybe" }), /disposition must be/],
    ["bad id", rule({ id: "Bad_Id" }), /kebab-case/],
    ["missing source prefix", rule({ match: ["/a11y/**"] }), /needs a contract:\/tokens:\/styles: prefix/],
    ["empty match", rule({ match: [] }), /non-empty string array/],
    ["empty valueIn", rule({ valueIn: [] }), /valueIn must be a non-empty array/],
    ["realizes on a pending rule", rule({ disposition: "pending", phase: "P4", realizes: "emitted-property" }), /only lowered rules declare realizes/],
    ["unknown realization", rule({ disposition: "lowered", via: "x", realizes: "magic" }), /realizes must be one of/],
    ["empty valuePattern", rule({ valuePattern: "" }), /valuePattern must be a non-empty regular expression/],
    ["invalid valuePattern", rule({ valuePattern: "(" }), /valuePattern "\(" is not a valid regular expression/],
    ["declaration on a contract pattern", rule({ declaration: { valuePattern: "x" } }), /declaration conditions apply to tokens: and styles: patterns only/],
    ["declaration that is not an object", rule({ match: ["styles:/**"], declaration: [] }), /declaration must be an object/],
    ["empty declaration", rule({ match: ["styles:/**"], declaration: {} }), /declaration takes valuePattern, nativeGrammar and keyPattern/],
    ["unknown declaration condition", rule({ match: ["styles:/**"], declaration: { nested: {} } }), /declaration takes valuePattern, nativeGrammar and keyPattern/],
    ["invalid declaration.valuePattern", rule({ match: ["styles:/**"], declaration: { valuePattern: "(" } }), /declaration.valuePattern "\(" is not a valid regular expression/],
    ["invalid declaration.keyPattern", rule({ match: ["styles:/**"], declaration: { keyPattern: "(" } }), /declaration.keyPattern "\(" is not a valid regular expression/],
    ["nativeGrammar on a tokens pattern", rule({ match: ["tokens:/**"], declaration: { nativeGrammar: false } }), /nativeGrammar applies to styles: patterns only/],
    ["keyPattern on a tokens pattern", rule({ match: ["tokens:/**"], declaration: { keyPattern: "x" } }), /keyPattern applies to styles: patterns only/],
    ["non-boolean nativeGrammar", rule({ match: ["styles:/**"], declaration: { nativeGrammar: "no" } }), /nativeGrammar must be a boolean/],
  ])("rejects a malformed boundary: %s", (_label, bad, message) => {
    expect(() => boundaryOf([bad])).toThrow(message);
  });

  it("rejects duplicate rule ids and unknown schema ids", () => {
    expect(() => boundaryOf([rule({ id: "dup" }), rule({ id: "dup" })])).toThrow(/duplicate id/);
    expect(() => validateBoundary({ schema: "something-else", rules: [] })).toThrow(/UNITY_BOUNDARY_INVALID/);
  });
});

/** One sidecar declaration of the corpus and the leaves it classifies into. */
interface Declaration { component: string; source: "tokens" | "styles"; key: string; property: string; value?: string; leaves: ClassifiedLeaf[] }
let corpus: { declarations: Declaration[]; refusedKeys: Map<string, Set<string>> } | undefined;
/** Every tokens/styles declaration of the live corpus, grouped from its classified leaves, plus each component's IR-refused styles keys. */
function corpusDeclarations(): NonNullable<typeof corpus> {
  if (corpus) return corpus;
  const declarations: Declaration[] = [];
  const refusedKeys = new Map<string, Set<string>>();
  for (const entry of listComponentContracts(path.join(root, "packages/ds-contracts"))) {
    const contract = load(entry.name);
    refusedKeys.set(entry.name, new Set((buildComponentIR(contract).nativeStyleRules?.unsupported ?? []).map(u => u.sourceKey)));
    const byDeclaration = new Map<string, Declaration>();
    for (const leaf of classifyContract(contract)) {
      if (leaf.source === "contract") continue;
      const [key = "", property = ""] = leaf.pointer.slice(1).split("/").map(s => s.replace(/~1/g, "/").replace(/~0/g, "~"));
      const id = leaf.source === "tokens" ? `tokens|${key}` : `styles|${key}|${property}`;
      if (!byDeclaration.has(id)) byDeclaration.set(id, { component: entry.name, source: leaf.source, key, property: leaf.source === "tokens" ? "" : property, value: leaf.declaration?.value, leaves: [] });
      byDeclaration.get(id)!.leaves.push(leaf);
    }
    declarations.push(...byDeclaration.values());
  }
  corpus = { declarations, refusedKeys };
  return corpus;
}
const ruleOf = (d: Declaration): string | null => d.leaves[0]!.rule;
const named = (d: Declaration): string => `${d.component} ${d.key}${d.property ? ` ${d.property}` : ""} = ${JSON.stringify(d.value)}`;

describe("Unity support boundary: sidecar declaration conditions", () => {
  it("matches a declaration condition on every leaf of the declaration, not on the leaf's own value", () => {
    const boundary = boundaryOf([
      { id: "white", match: ["styles:/**"], declaration: { valuePattern: "^#fff$" }, disposition: "refused", reason: "why" },
      { id: "refused-key", match: ["styles:/**"], declaration: { nativeGrammar: false }, disposition: "pending", phase: "P4", reason: "why" },
      { id: "rest", match: ["styles:/**", "contract:/**"], disposition: "lowered", via: "x" },
    ]);
    const leaf = (pointer: string, value: unknown, declaration?: Leaf["declaration"]): Leaf => ({ source: "styles", pointer, keyed: pointer, value, ...(declaration ? { declaration } : {}) });
    const white = { key: "root", value: "#fff", nativeGrammar: true };
    // The resolvesTo and design leaves carry no colour, yet belong to the #fff declaration.
    expect(classifyLeaf(leaf("/root/color/resolvesTo", "semantic.ink", white), boundary).rule).toBe("white");
    expect(classifyLeaf(leaf("/root/color/design/slot", "x.design.color", white), boundary).rule).toBe("white");
    expect(classifyLeaf(leaf("/root/color/fallback", "#fff", { ...white, value: "#000" }), boundary).rule).toBe("rest");
    // A leaf without a declaration (no sidecar context) never meets a declaration condition.
    expect(classifyLeaf(leaf("/root/color/fallback", "#fff"), boundary).rule).toBe("rest");
    expect(classifyLeaf(leaf("/tab--active/color/fallback", "#000", { key: "tab--active", value: "#000", nativeGrammar: false }), boundary).rule).toBe("refused-key");
  });

  it("classifies every leaf of one corpus declaration under one rule", () => {
    const split = corpusDeclarations().declarations.filter(d => new Set(d.leaves.map(l => l.rule)).size !== 1).map(named);
    expect(split).toEqual([]);
  }, CORPUS_TIMEOUT_MS);

  it("refuses exactly the token values the projection cannot define as one USS scalar", () => {
    const tokens = corpusDeclarations().declarations.filter(d => d.source === "tokens");
    expect(tokens.length).toBeGreaterThan(500);
    const disagree = tokens.filter(d => (ruleOf(d) === "tokens-non-scalar") !== (d.value !== undefined && tokenScalar(d.value) === undefined)).map(named);
    expect(disagree).toEqual([]);
    expect(tokens.filter(d => ruleOf(d) === "tokens-non-scalar").length).toBeGreaterThan(0);
  }, CORPUS_TIMEOUT_MS);

  it("refuses exactly the declared weights -unity-font-style has no keyword for", () => {
    const weights = corpusDeclarations().declarations.filter(d => d.source === "styles" && d.property === "font-weight");
    const disagree = weights.filter(d => (ruleOf(d) === "styles-font-weight-unmapped") !== (fontStyle(d.value ?? "") === undefined)).map(named);
    expect(disagree).toEqual([]);
    // Both sides occur: 500 is refused, 400/600/700 are lowered.
    expect([...new Set(weights.map(d => ruleOf(d)))]).toEqual(expect.arrayContaining(["styles-font-weight-unmapped", "styles"]));
  }, CORPUS_TIMEOUT_MS);

  it("refuses exactly the transitions the USS handler realises only in part", () => {
    const partial = (value: string) => {
      const outcome = HANDLERS.transition!({ value, wrap: f => f, focus: false, siblings: new Map() });
      return "reason" in outcome || ("set" in outcome && (outcome.ledger?.length ?? 0) > 0);
    };
    const transitions = corpusDeclarations().declarations.filter(d => d.source === "styles" && d.property === "transition");
    expect(transitions.length).toBeGreaterThan(0);
    expect(transitions.filter(d => (ruleOf(d) === "styles-transition-unrealised") !== partial(d.value ?? "")).map(named)).toEqual([]);
    // Every corpus transition is partial, so the lowered side is pinned on
    // values outside it: the rule must not refuse what the handler realises.
    const values = ["opacity 120ms ease", "opacity 120ms ease-in-out, translate 80ms linear", "opacity var(--fsds-x-duration, 120ms) ease",
      "transform 200ms ease", "opacity 120ms cubic-bezier(0.4, 0, 0.2, 1)", "background-color var(--fsds-x-duration) var(--fsds-x-easing)", "opacity 120ms steps(4)"];
    const boundary = loadBoundary();
    const classified = values.map(value => {
      const declaration = { key: "root", value, nativeGrammar: true };
      return [value, classifyLeaf({ source: "styles", pointer: "/root/transition/literal", keyed: "/root/transition/literal", value, declaration }, boundary).rule, partial(value)] as const;
    });
    expect(classified.filter(([, ruleId, isPartial]) => (ruleId === "styles-transition-unrealised") !== isPartial)).toEqual([]);
    expect(new Set(classified.map(([, ruleId]) => ruleId))).toEqual(new Set(["styles-transition-unrealised", "styles"]));
  }, CORPUS_TIMEOUT_MS);

  it("refuses calc() only where the property table does not realise the declaration", () => {
    const calc = corpusDeclarations().declarations.filter(d => ruleOf(d) === "styles-calc");
    expect(calc.length).toBeGreaterThan(0);
    const realised = calc.filter(d => {
      const handler = Object.prototype.hasOwnProperty.call(HANDLERS, d.property) ? HANDLERS[d.property] : undefined;
      if (!handler) return false;
      const outcome = handler({ value: d.value ?? "", wrap: f => f, focus: /focus/.test(d.key), siblings: new Map() });
      return !("reason" in outcome);
    }).map(named);
    expect(realised).toEqual([]);
  }, CORPUS_TIMEOUT_MS);

  it("holds every styles key the IR's native grammar refuses out of the lowered dispositions, and no other key under the grammar rule", () => {
    const { declarations, refusedKeys } = corpusDeclarations();
    const styles = declarations.filter(d => d.source === "styles");
    const refused = styles.filter(d => refusedKeys.get(d.component)!.has(d.key));
    expect(new Set(refused.map(d => `${d.component} ${d.key}`)).size).toBe([...refusedKeys.values()].reduce((n, keys) => n + keys.size, 0));
    expect(refused.filter(d => d.leaves.some(l => l.disposition === "lowered")).map(named)).toEqual([]);
    expect(styles.filter(d => !refusedKeys.get(d.component)!.has(d.key) && ruleOf(d) === "styles-outside-native-grammar").map(named)).toEqual([]);
    // The keys the projection ledgers as uss-selector wait on P4 behind the IR-facts spec.
    const of = (component: string, key: string) => [...new Set(styles.filter(d => d.component === component && d.key === key).map(d => `${d.leaves[0]!.disposition}:${ruleOf(d)}`))];
    expect(of("Tabs", "tab--active")).toEqual(["pending:styles-outside-native-grammar"]);
    expect(of("Accordion", '.accordion__trigger[aria-expanded="true"] .accordion__chevron')).toEqual(["pending:styles-outside-native-grammar"]);
  }, CORPUS_TIMEOUT_MS);
});
