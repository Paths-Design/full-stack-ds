import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createUnityEmitter, unityLowering } from "./factory.js";
import { createDefaultRegistry } from "../../registry.js";
import { classifyContract, loadContractWithSidecars } from "./boundary.js";
import { rootPublicMembers } from "./walker.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");
function fixture(name: string) {
  return JSON.parse(fs.readFileSync(path.join(contractsRoot, `components/${name}/${name}.contract.json`), "utf8")) as ComponentContract;
}
const emit = (contract: ComponentContract) => createUnityEmitter().emitComponent(buildComponentIR(contract), { componentsRoot: "", contractsRoot })[0]!.contents;

describe("Unity capability lowering", () => {
  it.each([
    ["Switch", "BooleanControl"], ["Accordion", "ItemGroup"], ["Tabs", "ItemGroup"], ["Popover", "AnchoredSurface"],
  ])("%s survives identity substitution with the same attached behavior", (name, expected) => {
    const contract = fixture(name);
    contract.name = "UnrelatedFixture";
    const ir = buildComponentIR(contract);
    expect(unityLowering(ir).behavior).toBe(expected);
    const source = emit(contract);
    // The behavior is attached to a generated VisualElement, never inherited.
    expect(source).toMatch(/partial class UnrelatedFixture : VisualElement[,\n]/);
    expect(source).toContain(` = ${expected}.Attach(this, `);
    expect(source).not.toMatch(/: (?:BooleanControl|ItemGroup|AnchoredSurface)\b/);
  });
  it("refuses unsupported static and modal surfaces instead of emitting inert controls", () => {
    expect(() => emit(fixture("Text"))).toThrow("UNITY_UNSUPPORTED_INTERACTION");
    expect(() => emit(fixture("Dialog"))).toThrow("UNITY_UNSUPPORTED_SURFACE");
  });
  it("carries channel and anatomy names rather than assuming checked/input", () => {
    const ir = buildComponentIR(fixture("Switch"));
    ir.formControl!.channel = { ...ir.formControl!.channel, name: "armed", valueProp: "armed", changeHandlerProp: "onArmed" };
    // Rename the control part consistently in the fact and the rendered tree.
    ir.formControl!.part = { ...ir.formControl!.part, name: "actuator" };
    const visit = (node: NonNullable<typeof ir.dom>): void => { if (node.part === "input") node.part = "actuator"; node.children.forEach(visit); };
    visit(ir.dom!);
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain('ChannelName = "armed"');
    expect(source).toContain('ChangeHandler = "onArmed"');
    expect(source).toContain("[UxmlAttribute] public bool Armed { get => Control.Value; set => Control.Value = value; }");
    expect(source).toContain("public Button Actuator { get; } = new Button();");
    expect(source).toContain('Actuator.AddToClassList("switch__actuator");');
    expect(source).toContain('Control = BooleanControl.Attach(this, control: Actuator, stateClass: "is-checked", labelHost: this);');
    expect(source).not.toMatch(/\bInput\b|"checked"\.|onChange/);
  });
  it("declared default changes reach Unity construction", () => {
    const ir = buildComponentIR(fixture("Tabs"));
    ir.styledProps.find(p => p.name === "loop")!.defaultExpr = "false";
    ir.styledProps.find(p => p.name === "orientation")!.defaultExpr = '"vertical"';
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain('Orientation = "vertical";');
    expect(source).not.toContain('Orientation = "horizontal";');
    expect(source).toContain('Loop = false;');
    expect(source).not.toContain('Loop = true;');
  });
  it("undeclared dismissal capabilities do not get enabled", () => {
    const contract = fixture("Popover");
    contract.surface!.dismissal = ["escape"];
    const source = emit(contract);
    expect(source).toContain("CloseOnEscape = true;");
    expect(source).not.toContain("CloseOnBlur = true;");
    expect(source).not.toContain("CloseOnOutsideClick = true;");
  });
  it("typed default-size geometry reaches the emitted part", () => {
    const ir = buildComponentIR(fixture("Switch"));
    const fact = (name: string, rawValue: string) => ({ name, cssVar: "--irrelevant", category: "size", layer: "semantic" as const, source: "tokens-sidecar" as const, rawValue, isLiteral: true });
    ir.tokenFacts = [fact("switch.size.md.track.width", "61px"), fact("switch.size.lg.track.width", "99px"), fact("switch.size.md.thumb.size", "13px")];
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("Track.style.width = 61f;");
    // Only the declared default value of the axis applies; `size` sets both axes.
    expect(source).not.toContain("99f");
    expect(source).toContain("Thumb.style.width = 13f;\n            Thumb.style.height = 13f;");
  });
  it("refuses facts the selected runtime base would contradict instead of ignoring them", () => {
    // ItemGroup always runs arrow navigation: a non-roving strategy is not realised.
    const tabs = fixture("Tabs");
    tabs.focus = { ...tabs.focus, strategy: "none" } as typeof tabs.focus;
    expect(() => unityLowering(buildComponentIR(tabs))).toThrow('UNITY_UNSUPPORTED_FOCUS: Tabs declares focus.strategy "none", which ItemGroup does not realise');
    // BooleanControl defers to native Button focus: roving is not realised.
    const sw = fixture("Switch");
    sw.focus = { ...sw.focus, strategy: "roving" } as typeof sw.focus;
    expect(() => unityLowering(buildComponentIR(sw))).toThrow("UNITY_UNSUPPORTED_FOCUS: Switch");
    // Only AnchoredSurface reparents content; an item group that enables a portal is refused.
    const portaled = fixture("Tabs");
    portaled.portal = { enabled: true } as typeof portaled.portal;
    expect(() => unityLowering(buildComponentIR(portaled))).toThrow("UNITY_UNSUPPORTED_PORTAL: Tabs");
    // AnchoredSurface always reparents: a surface whose portal is disabled is refused.
    const inline = fixture("Popover");
    inline.portal = { ...inline.portal, enabled: false } as typeof inline.portal;
    expect(() => unityLowering(buildComponentIR(inline))).toThrow("UNITY_UNSUPPORTED_SURFACE: Popover declares portal/presence/content facts");
    // ItemGroup hides inactive content (detaching only under UnmountInactive); an
    // unconditional unmount presence is refused rather than approximated.
    const unmount = fixture("Accordion");
    unmount.interaction = { ...unmount.interaction!, presence: "unmount" };
    expect(() => unityLowering(buildComponentIR(unmount))).toThrow('UNITY_UNSUPPORTED_INTERACTION: Accordion declares presence "unmount"');
  });
  it("refuses a lowered family the emitted control does not realise", () => {
    const emitter = createUnityEmitter();
    // `orientation` is a lowered ItemGroup option family, but BooleanControl emits no Orientation.
    const sw = fixture("Switch");
    sw.props!.designed!.members!.push({ name: "orientation", propType: { kind: "string" }, default: "horizontal" });
    expect(() => emitter.admitContract!(sw, { admitted: true })).toThrow("UNITY_BOUNDARY_UNREALIZED: Switch on BooleanControl does not realise prop orientation (rule prop-item-group-options claims emitted-property)");
    // A second channel is not the one the dispatcher selects.
    const tabs = fixture("Tabs");
    tabs.channels = { ...tabs.channels, extra: { value: "extra", defaultValue: "defaultExtra", onChange: "onExtraChange", valueType: "string", description: "probe" } };
    tabs.props!.styled!.members!.push({ name: "extra", propType: { kind: "string" } }, { name: "defaultExtra", propType: { kind: "string" } }, { name: "onExtraChange", propType: { kind: "string" } });
    expect(() => emitter.admitContract!(tabs, { admitted: true })).toThrow(/UNITY_BOUNDARY_UNREALIZED: Tabs on ItemGroup does not realise .*channel extra \(rule channels claims selected-channel\)/);
    // An event not emitted through the selected channel's change prop has no C# surface.
    const events = fixture("Tabs");
    events.events = { ...events.events, probe: { description: "probe", emittedVia: ["onSomethingElse"] } } as typeof events.events;
    expect(() => emitter.admitContract!(events, { admitted: true })).toThrow(/UNITY_BOUNDARY_UNREALIZED: Tabs on ItemGroup does not realise event probe \(rule events claims channel-change-event\)/);
    // The explicit-request path is held to the same realisation standard.
    expect(() => emitter.admitContract!(sw, { admitted: false })).toThrow("UNITY_BOUNDARY_UNREALIZED");
  });
  it("gates generation on the support boundary before lowering", () => {
    const emitter = createUnityEmitter();
    for (const name of ["Switch", "Accordion", "Popover", "Tabs"]) {
      expect(() => emitter.admitContract!(fixture(name), { admitted: true })).not.toThrow();
    }
    const unclassified = fixture("Switch") as ComponentContract & { futureBlock?: unknown };
    unclassified.futureBlock = { enabled: true };
    expect(() => emitter.admitContract!(unclassified, { admitted: false })).toThrow("UNITY_BOUNDARY_UNCLASSIFIED: Switch: contract:/futureBlock/enabled");
    const unadjudicated = fixture("Switch");
    unadjudicated.props!.designed!.members!.push({ name: "futureBehavior", propType: { kind: "boolean" } });
    expect(() => emitter.admitContract!(unadjudicated, { admitted: true })).toThrow("UNITY_BOUNDARY_UNADJUDICATED");
    expect(() => emitter.admitContract!(unadjudicated, { admitted: false })).not.toThrow();
  });
  it("registers the four-component pilot without claiming TypeScript rail admission", () => {
    const registry = createDefaultRegistry({ workspaceRoot: root, contractsRoot });
    expect(registry.available()).toContain("unity");
    const unity = registry.get("unity");
    expect(unity.admittedComponents).toEqual(["Switch", "Accordion", "Popover", "Tabs"]);
    expect(unity.railFrameworkId).toBeUndefined();
    expect(unity.componentsRoot).toBe(path.join(root, "packages/ds-unity/Runtime/Components"));
  });
});

// ---------------------------------------------------------------------------
// Synthetic contracts that exist nowhere in the corpus. Their part, channel,
// prop and class names share nothing with the allowlisted four, so any output
// that matches here is derived from the walker rules, not a corpus adapter.
// ---------------------------------------------------------------------------

/** Keyed selection over a dom tree: compound rail/notch/well, a rendered sibling
 * after a compound node, a literal-content text leaf, a nested sole-child
 * insertion point, and a variant axis (tone) no styling fact or knob binds. */
const dial = (): ComponentContract => ({
  name: "Dial", cssPrefix: "dial", layer: "composite", category: "navigation", description: "Synthetic keyed selection fixture.",
  anatomy: {
    parts: ["frame", "rail", "notch", "glint", "caption", "well", "wellBody"],
    details: {
      frame: { tag: "div", role: "root" },
      rail: { tag: "div", role: "group", subcomponent: true },
      notch: { tag: "button", role: "trigger", interactive: true, multiple: true, subcomponent: true },
      glint: { tag: "span", role: "decoration" },
      caption: { tag: "span", role: "label" },
      well: { tag: "div", role: "region", multiple: true, subcomponent: true },
      wellBody: { tag: "div", role: "decoration" },
    },
    dom: {
      tag: "div", part: "frame", children: [
        { tag: "span", part: "caption", content: "literal:Pick one" },
        { tag: "div", part: "rail", children: [{ tag: "button", part: "notch", attrs: { type: "button" }, bindings: { "aria-pressed": "channel:pick.value" } }, { tag: "span", part: "glint" }] },
        { tag: "div", part: "well", children: [{ tag: "div", part: "wellBody", children: [{ tag: "children" }] }] },
      ],
    },
  },
  channels: { pick: { value: "picked", defaultValue: "defaultPicked", onChange: "onPick", valueType: "string", description: "Picked notch." } },
  interaction: { channel: "pick", content: "well", presence: "hidden", triggers: [{ part: "notch", operation: "select" }] },
  focus: { strategy: "manual", orientation: "vertical", wrap: false },
  props: {
    styled: {
      members: [
        { name: "picked", type: "string" },
        { name: "defaultPicked", type: "string" },
        { name: "onPick", type: "(value: string) => void" },
        { name: "tone", type: "DialTone", default: "calm" },
        { name: "appearance", type: "DialAppearance", default: "flat" },
        { name: "loop", type: "boolean", default: false },
      ],
    },
  },
  types: { DialTone: { kind: "union", values: ["calm", "loud"] }, DialAppearance: { kind: "union", values: ["flat", "raised"] } },
  variants: { tone: ["calm", "loud"], appearance: ["flat", "raised"] },
  states: { dimensions: { choice: { category: "selection", values: ["idle", "chosen"], initial: "idle" } } },
}) as unknown as ComponentContract;

/** Boolean control on a div root: a children hole with siblings, a named slot,
 * and a disabled prop that is not called `disabled`. */
const lamp = (): ComponentContract => ({
  name: "Lamp", cssPrefix: "lamp", layer: "primitive", category: "action", description: "Synthetic boolean control fixture.",
  anatomy: {
    parts: ["shell", "actuator", "lead", "tail"],
    details: {
      shell: { tag: "div", role: "root" },
      actuator: { tag: "button", role: "trigger", interactive: true, focusable: true },
      tail: { tag: "span", role: "decoration" },
    },
    dom: {
      tag: "div", part: "shell", children: [
        { tag: "button", part: "actuator", bindings: { "aria-pressed": "channel:lit.value", disabled: "prop:off" } },
        { tag: "slot", name: "lead" },
        { tag: "children" },
        { tag: "span", part: "tail" },
      ],
    },
  },
  channels: { lit: { value: "lit", defaultValue: "defaultLit", onChange: "onLit", valueType: "boolean", description: "Whether the lamp is lit." } },
  formControl: { part: "actuator", channel: "lit", valueModel: "boolean", commit: "change" },
  focus: { strategy: "auto" },
  props: {
    designed: {
      members: [
        { name: "lit", propType: { kind: "boolean" }, description: "Lit." },
        { name: "defaultLit", propType: { kind: "boolean" }, description: "Initial." },
        { name: "onLit", propType: { kind: "callback", params: [{ name: "lit", type: { kind: "boolean" } }], returns: { kind: "void" } }, description: "Change." },
        { name: "off", propType: { kind: "boolean" }, description: "Disables the lamp." },
      ],
    },
  },
  states: { dimensions: { glow: { category: "visibility", effect: "channel", values: ["dark", "lit"], initial: "dark" } } },
}) as unknown as ComponentContract;

/** Parts-only anchored surface: Popover's facts with every part renamed, plus
 * a non-compound decoration part. */
function flyout(): ComponentContract {
  const c = structuredClone(fixture("Popover")) as unknown as Record<string, any>;
  const renamed: Record<string, string> = { trigger: "opener", content: "sheet" };
  c.name = "Flyout"; c.cssPrefix = "flyout";
  c.anatomy.parts = ["root", "opener", "sheet", "tip"];
  c.anatomy.details = { root: c.anatomy.details.root, opener: { ...c.anatomy.details.trigger, subcomponent: true }, sheet: { ...c.anatomy.details.content, subcomponent: true }, tip: { role: "decoration", description: "Synthetic decoration." } };
  c.surface.anchor.part = "opener"; c.surface.content.part = "sheet";
  c.interaction.content = "sheet";
  c.interaction.triggers = c.interaction.triggers.map((t: { part: string }) => ({ ...t, part: renamed[t.part] ?? t.part }));
  c.relationships = c.relationships.map((r: { from: string; to: string }) => ({ ...r, from: renamed[r.from] ?? r.from, to: renamed[r.to] ?? r.to }));
  for (const k of c.a11y?.keyboard ?? []) if (k.when && renamed[k.when]) k.when = renamed[k.when];
  c.slots = { root: c.slots.root, opener: c.slots.trigger, sheet: c.slots.content };
  return c as unknown as ComponentContract;
}

/** The constructor body of one generated class, for exact-order assertions. */
function ctor(source: string, cls: string): string {
  const start = source.indexOf(`        public ${cls}()\n        {\n`);
  expect(start, `constructor of ${cls}`).toBeGreaterThan(-1);
  const body = source.slice(start).split("\n        {\n")[1]!;
  return body.slice(0, body.indexOf("\n        }"));
}
const lines = (...l: string[]) => l.map(x => `            ${x}`).join("\n");
/** One generated class, from its declaration to the next `[UxmlElement]`. */
function classBody(source: string, cls: string): string {
  const start = source.indexOf(`    public partial class ${cls} :`);
  expect(start, `class ${cls}`).toBeGreaterThan(-1);
  const next = source.indexOf("[UxmlElement]", start);
  return source.slice(start, next < 0 ? undefined : next);
}
const TONE_PROPERTY = '[UxmlAttribute] public string Tone { get => Variants.Get(this, "dial", "calm", "loud"); set { Variants.Set(this, "dial", value, "calm", "loud"); } }';

describe("Unity anatomy walker on synthetic contracts", () => {
  it("lowers a keyed selection tree by rule: compound classes, identity, insertion point, behavior and vocabulary props", () => {
    const contract = dial();
    // The full admission gate (boundary + realisation) holds for a non-corpus contract.
    expect(() => createUnityEmitter().admitContract!(contract, { admitted: false })).not.toThrow();
    const ir = buildComponentIR(contract);
    expect(unityLowering(ir)).toMatchObject({ behavior: "ItemGroup", trigger: { name: "notch" }, content: { name: "well" }, operation: "select", multiple: false, stateClass: "is-chosen", focus: { strategy: "manual", orientation: "vertical", wrap: false } });
    const source = emit(contract);
    // R1: one root class plus one class per compound part, in ir.compoundParts order.
    expect([...source.matchAll(/public partial class (\w+) : ([\w, <>]+)\n/g)].map(m => `${m[1]} : ${m[2]}`))
      .toEqual(["Dial : VisualElement", "DialRail : VisualElement", "DialNotch : Button, IKeyedPart", "DialWell : VisualElement, IKeyedPart"]);
    // R2 + R5: the literal-content text leaf is a Label carrying its text; compound
    // parts emit nothing inline (R4), so the root renders only the caption.
    expect(source).toContain("        public Label Caption { get; } = new Label();\n");
    expect(ctor(source, "Dial")).toBe(lines(
      'name = "frame";',
      'AddToClassList("dial");',
      'Caption.name = "caption";',
      'Caption.AddToClassList("dial__caption");',
      'Caption.text = "Pick one";',
      "hierarchy.Add(Caption);",
      'Group = ItemGroup.Attach(this, triggerClass: "dial__notch", contentClass: "dial__well", operation: "select", stateClass: "is-chosen", multiple: false, focus: "manual", orientation: "vertical", wrap: false);',
      'Tone = "calm";',
      'Appearance = "flat";',
      "Loop = false;",
    ));
    // R4: the rail renders its non-compound child but not the nested compound notch,
    // whose composed position (before the glint) is the rail's contentContainer.
    expect(ctor(source, "DialRail")).toBe(lines(
      'name = "rail";', 'AddToClassList("dial__rail");',
      'children.name = "children";', 'children.AddToClassList("dial__children");', "hierarchy.Add(children);",
      'Glint.name = "glint";', 'Glint.AddToClassList("dial__glint");', "hierarchy.Add(Glint);",
    ));
    expect(classBody(source, "DialRail")).toContain("        public override VisualElement contentContainer => children;\n");
    // R3: a hole that is the sole child of a nested element makes that element the contentContainer.
    expect(classBody(source, "DialWell")).toContain("        public override VisualElement contentContainer => WellBody;\n");
    expect(source.match(/contentContainer/g)).toHaveLength(2);
    // R4: pairing key on the trigger and content parts, Disabled on the trigger only.
    expect(source).toContain("    public partial class DialNotch : Button, IKeyedPart\n    {\n        [UxmlAttribute] public string Value { get; set; }\n        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }\n");
    expect(source).toContain("    public partial class DialWell : VisualElement, IKeyedPart\n    {\n        public VisualElement WellBody { get; } = new VisualElement();\n        public override VisualElement contentContainer => WellBody;\n        [UxmlAttribute] public string Value { get; set; }\n        public DialWell()");
    // R8: the string channel API is named by the channel's own value prop.
    expect(source).toContain("[UxmlAttribute] public string Picked { get => Group.Value; set => Group.Value = value; }");
    expect(source).toContain('public const string ChannelName = "pick";');
    // R6: a vocabulary axis is a class-recipe modifier; a vocabulary boolean drives its knob;
    // an axis no styling fact binds (tone) is a class-only modifier.
    expect(source).toContain('[UxmlAttribute] public string Appearance { get => Variants.Get(this, "dial", "flat", "raised"); set { Variants.Set(this, "dial", value, "flat", "raised"); } }');
    expect(source).toContain(TONE_PROPERTY);
    expect(source).toContain("[UxmlAttribute] public bool Loop { get => Group.Loop; set => Group.Loop = value; }");
    expect(rootPublicMembers(source, "Dial")).toEqual(new Set(["Picked", "Controlled", "Tone", "Appearance", "Loop"]));
  });

  it("emits a variant axis no styling fact binds as a class-only modifier and leaves a styling-bound axis to P3", () => {
    const variant = (axis: string) => (ir: ReturnType<typeof buildComponentIR>) =>
      !!ir.nativeStyleRules?.rules.some(r => r.predicates.some(p => p.kind === "variant" && p.axis === axis));
    // Unbound: no token fact or style rule names tone, and no behavior knob drives it.
    expect(variant("tone")(buildComponentIR(dial()))).toBe(false);
    expect(emit(dial())).toContain(TONE_PROPERTY);
    // Token-bound: a `<cssPrefix>.<axis>.<value>.…` fact for a declared value of the axis.
    const tokenBound = dial() as unknown as Record<string, any>;
    tokenBound.tokens = { "dial.tone.loud.rail.width": { literal: "4px" } };
    expect(emit(tokenBound as unknown as ComponentContract)).not.toMatch(/Tone|calm|loud/);
    // A fact whose value segment is not a declared value of the axis does not bind it.
    const offValue = dial() as unknown as Record<string, any>;
    offValue.tokens = { "dial.tone.shrill.rail.width": { literal: "4px" } };
    expect(emit(offValue as unknown as ComponentContract)).toContain(TONE_PROPERTY);
    // Rule-bound: a native style rule predicated on the axis.
    const ruleBound = dial() as unknown as Record<string, any>;
    ruleBound.styles = { "--loud": { "border-width": { resolvesTo: "dial.border.width", fallback: "2px" } } };
    expect(variant("tone")(buildComponentIR(ruleBound as unknown as ComponentContract))).toBe(true);
    expect(emit(ruleBound as unknown as ComponentContract)).not.toMatch(/Tone|calm|loud/);
    // A vocabulary axis drives the attached behavior and is emitted even when styling binds it.
    const vocabularyBound = dial() as unknown as Record<string, any>;
    vocabularyBound.styles = { "--raised": { "border-width": { resolvesTo: "dial.border.width", fallback: "2px" } } };
    expect(variant("appearance")(buildComponentIR(vocabularyBound as unknown as ComponentContract))).toBe(true);
    expect(emit(vocabularyBound as unknown as ComponentContract)).toContain('[UxmlAttribute] public string Appearance { get => Variants.Get(this, "dial", "flat", "raised");');
  });

  it("keeps consumer-composed compound content in document order beside rendered siblings", () => {
    const railCtor = (contract: Record<string, any>) => ctor(emit(contract as unknown as ComponentContract), "DialRail");
    const glint = ['Glint.name = "glint";', 'Glint.AddToClassList("dial__glint");', "hierarchy.Add(Glint);"];
    const host = ['children.name = "children";', 'children.AddToClassList("dial__children");', "hierarchy.Add(children);"];
    const identity = ['name = "rail";', 'AddToClassList("dial__rail");'];
    // A rendered sibling follows the first compound node: a children host takes that position.
    expect(railCtor(dial() as unknown as Record<string, any>)).toBe(lines(...identity, ...host, ...glint));
    // Every rendered sibling precedes the compound nodes: the default contentContainer
    // (appended after the generated children) already keeps document order.
    const after = dial() as unknown as Record<string, any>;
    after.anatomy.dom.children[1].children.reverse();
    expect(railCtor(after)).toBe(lines(...identity, ...glint));
    expect(classBody(emit(after as unknown as ComponentContract), "DialRail")).not.toContain("contentContainer");
    // Compound nodes are the only children: nothing is generated for them.
    const only = dial() as unknown as Record<string, any>;
    only.anatomy.dom.children[1].children = [only.anatomy.dom.children[1].children[0]];
    expect(railCtor(only)).toBe(lines(...identity));
    expect(classBody(emit(only as unknown as ComponentContract), "DialRail")).not.toContain("contentContainer");
    // A composed-content position and an explicit hole in one class are two insertion points.
    const both = dial() as unknown as Record<string, any>;
    both.anatomy.dom.children[1].children.push({ tag: "children" });
    expect(() => emit(both as unknown as ComponentContract)).toThrow("UNITY_UNSUPPORTED_ANATOMY: Dial DialRail declares more than one children insertion point");
  });

  it("lowers a boolean control with a children hole beside siblings and a named slot, in document order", () => {
    const contract = lamp();
    expect(() => createUnityEmitter().admitContract!(contract, { admitted: false })).not.toThrow();
    const source = emit(contract);
    expect(source).toContain("    public partial class Lamp : VisualElement, INotifyValueChanged<bool>\n");
    // R2/R3: part properties first, then the private children host that is the contentContainer.
    expect(source).toContain([
      "        public Button Actuator { get; } = new Button();",
      "        public VisualElement LeadSlot { get; } = new VisualElement();",
      "        public VisualElement Tail { get; } = new VisualElement();",
      "        private readonly VisualElement children = new VisualElement();",
      "        public override VisualElement contentContainer => children;",
      "        public BooleanControl Control { get; }",
      "        public Button Trigger => Actuator;",
      "        [UxmlAttribute] public bool Lit { get => Control.Value; set => Control.Value = value; }",
    ].join("\n"));
    // R6: the disabled prop is whatever the control part's disabled binding names.
    expect(source).toContain("[UxmlAttribute] public bool Off { get => !enabledSelf; set => SetEnabled(!value); }");
    // Document order is preserved; a div root is no label host (R7).
    expect(ctor(source, "Lamp")).toBe(lines(
      'name = "shell";',
      'AddToClassList("lamp");',
      'Actuator.name = "actuator";',
      'Actuator.AddToClassList("lamp__actuator");',
      "hierarchy.Add(Actuator);",
      'LeadSlot.name = "lead";',
      'LeadSlot.AddToClassList("lamp__lead");',
      "hierarchy.Add(LeadSlot);",
      'children.name = "children";',
      'children.AddToClassList("lamp__children");',
      "hierarchy.Add(children);",
      'Tail.name = "tail";',
      'Tail.AddToClassList("lamp__tail");',
      "hierarchy.Add(Tail);",
      'Control = BooleanControl.Attach(this, control: Actuator, stateClass: "is-lit", labelHost: null);',
    ));
  });

  it("synthesizes a parts-only tree from ir.parts: root-only part is the class, other parts are children or compound classes", () => {
    const contract = flyout();
    expect(() => createUnityEmitter().admitContract!(contract, { admitted: false })).not.toThrow();
    const source = emit(contract);
    expect([...source.matchAll(/public partial class (\w+) : ([\w, <>]+)\n/g)].map(m => `${m[1]} : ${m[2]}`))
      .toEqual(["Flyout : VisualElement, INotifyValueChanged<bool>", "FlyoutOpener : Button", "FlyoutSheet : ScrollView"]);
    expect(ctor(source, "Flyout")).toBe(lines(
      'name = "root";',
      'AddToClassList("flyout");',
      'Tip.name = "tip";',
      'Tip.AddToClassList("flyout__tip");',
      "hierarchy.Add(Tip);",
      'Surface = AnchoredSurface.Attach(this, triggerClass: "flyout__opener", contentClass: "flyout__sheet", stateClass: "is-open");',
      "CloseOnEscape = true;",
      "CloseOnOutsideClick = true;",
      "CloseOnBlur = true;",
    ));
    // No pairing key without an item group; the anchor still carries Disabled (R4).
    expect(source).not.toContain("IKeyedPart");
    expect(source).toContain("    public partial class FlyoutOpener : Button\n    {\n        [UxmlAttribute] public bool Disabled");
    expect(ctor(source, "FlyoutSheet")).toBe(lines('name = "sheet";', 'AddToClassList("flyout__sheet");'));
  });

  it("realises the IR-synthesized presence guard on an unmount content part through the behavior and refuses any other guard", () => {
    const withDom = (guard?: (sheet: Record<string, unknown>) => void) => {
      const c = flyout() as unknown as Record<string, any>;
      const sheet: Record<string, unknown> = { tag: "div", part: "sheet", children: [{ tag: "children" }] };
      guard?.(sheet);
      c.anatomy.dom = { tag: "div", part: "root", children: [{ tag: "button", part: "opener" }, sheet] };
      return c as unknown as ComponentContract;
    };
    // buildInteractionIR sets sheet.ifProp = open (presence unmount); the surface behavior owns it.
    const source = emit(withDom());
    expect(ctor(source, "FlyoutSheet")).toBe(lines('name = "sheet";', 'AddToClassList("flyout__sheet");'));
    expect(buildComponentIR(withDom()).dom!.children[1]!.ifProp).toBe("open");
    // Any other guard is pending P4 and refused rather than rendered unconditionally.
    const tipGuard = flyout() as unknown as Record<string, any>;
    tipGuard.anatomy.dom = { tag: "div", part: "root", children: [{ tag: "button", part: "opener" }, { tag: "div", part: "sheet" }, { tag: "span", part: "tip", if: "disabled" }] };
    expect(() => emit(tipGuard as unknown as ComponentContract)).toThrow("UNITY_UNSUPPORTED_ANATOMY: Flyout part tip declares a conditional guard (pending P4)");
  });
});

describe("Unity walker dispositions for non-lowered node kinds (R5)", () => {
  it("renders a componentRef node as an identity-only placeholder and leaves its realization to the pending boundary rule", () => {
    const source = emit(fixture("Accordion"));
    expect(source).toContain("        public VisualElement Chevron { get; } = new VisualElement();\n");
    expect(source.split("\n").filter(l => l.includes("Chevron"))).toEqual([
      "        public VisualElement Chevron { get; } = new VisualElement();",
      '            Chevron.name = "chevron";',
      '            Chevron.AddToClassList("accordion__chevron");',
      "            hierarchy.Add(Chevron);",
    ]);
    // Nothing of the referenced component (Icon, its name/size attrs) reaches the output.
    expect(source).not.toMatch(/Icon|chevron-down|"sm"/);
    const leaves = classifyContract(loadContractWithSidecars(root, "Accordion")).filter(l => l.keyed.includes("/ref:chevron/"));
    expect(new Set(leaves.map(l => `${l.rule}:${l.disposition}`))).toEqual(new Set(["anatomy-component-ref-identity:lowered", "anatomy-component-ref:pending"]));
  });

  it("emits nothing for refused static attrs and form bindings, which the boundary refuses", () => {
    // With its sidecars, as the CLI merges them: `size` is then styling-bound and not emitted.
    const source = emit(loadContractWithSidecars(root, "Switch") as unknown as ComponentContract);
    expect(source).not.toMatch(/checkbox|aria-|\brole\b|"button"/);
    // No Name / Value: the form-serialization props are refused, not emitted.
    expect([...rootPublicMembers(source, "Switch")].sort()).toEqual(["Checked", "Controlled", "Disabled", "value"]);
    const refused = classifyContract(loadContractWithSidecars(root, "Switch")).filter(l => l.keyed.startsWith("/anatomy/dom/children/input/") && l.disposition === "refused").map(l => `${l.keyed}=${l.rule}`);
    expect(refused).toEqual([
      "/anatomy/dom/children/input/attrs/type=anatomy-static-attrs-refused",
      "/anatomy/dom/children/input/attrs/role=anatomy-static-attrs-refused",
      "/anatomy/dom/children/input/bindings/name=anatomy-form-binding",
      "/anatomy/dom/children/input/bindings/value=anatomy-form-binding",
    ]);
  });

  it("refuses iteration, a second insertion point and literal content on a non-text element instead of approximating them", () => {
    const iterated = lamp() as unknown as Record<string, any>;
    iterated.props.designed.members.push({ name: "count", propType: { kind: "number" }, description: "Count." });
    iterated.anatomy.dom.children[3].iterate = { source: "prop:count", kind: "count" };
    expect(() => emit(iterated as unknown as ComponentContract)).toThrow("UNITY_UNSUPPORTED_ANATOMY: Lamp part tail declares iteration (pending P4)");
    const twoHoles = lamp() as unknown as Record<string, any>;
    twoHoles.anatomy.dom.children[3] = { tag: "span", part: "tail", children: [{ tag: "children" }] };
    expect(() => emit(twoHoles as unknown as ComponentContract)).toThrow("UNITY_UNSUPPORTED_ANATOMY: Lamp Lamp declares more than one children insertion point");
    const literal = lamp() as unknown as Record<string, any>;
    literal.anatomy.details.tail = { role: "decoration" };
    literal.anatomy.dom.children[3] = { tag: "div", part: "tail", content: "literal:Hi" };
    expect(() => emit(literal as unknown as ComponentContract)).toThrow("UNITY_UNSUPPORTED_ANATOMY: Lamp <div> carries literal content but lowers to no text element");
    // A literal on a button lowers to Button.text.
    literal.anatomy.dom.children[3] = { tag: "button", part: "tail", content: "literal:Hi" };
    expect(emit(literal as unknown as ComponentContract)).toContain('            Tail.text = "Hi";\n');
  });

  it("refuses generated members that would collide with the behavior API", () => {
    const collides = lamp() as unknown as Record<string, any>;
    collides.anatomy.parts[3] = "control";
    collides.anatomy.details = { ...collides.anatomy.details, control: collides.anatomy.details.tail };
    delete collides.anatomy.details.tail;
    collides.anatomy.dom.children[3].part = "control";
    expect(() => emit(collides as unknown as ComponentContract)).toThrow("UNITY_IDENTIFIER_COLLISION: Lamp Lamp declares Control twice");
  });
});

describe("Unity behavior selection refusals", () => {
  it("refuses facts the selected behavior cannot project", () => {
    // No channel-effect or selection state dimension: no state class to toggle.
    const stateless = lamp() as unknown as Record<string, any>;
    stateless.states = { dimensions: { glow: { category: "visibility", effect: "restyle", values: ["dark", "lit"], initial: "dark" } } };
    expect(() => unityLowering(buildComponentIR(stateless as unknown as ComponentContract))).toThrow("UNITY_UNSUPPORTED_STATE: Lamp");
    // Item-group focus without an orientation has no arrow-key mapping.
    const unoriented = dial() as unknown as Record<string, any>;
    delete unoriented.focus.orientation;
    expect(() => unityLowering(buildComponentIR(unoriented as unknown as ComponentContract))).toThrow("UNITY_UNSUPPORTED_FOCUS: Dial declares manual focus without an orientation");
    // A boolean control whose control part is a compound sub-element cannot be attached at construction.
    // (Without the hole: the compound actuator's composed position is then the one insertion point.)
    const compoundControl = lamp() as unknown as Record<string, any>;
    compoundControl.anatomy.details.actuator.subcomponent = true;
    compoundControl.anatomy.dom.children.splice(2, 1);
    expect(() => emit(compoundControl as unknown as ComponentContract)).toThrow("UNITY_UNSUPPORTED_ANATOMY: Lamp renders its form-control part actuator outside the root class");
  });

  it("refuses a dismissal trigger the anchored surface has no knob for", () => {
    const ir = buildComponentIR(fixture("Popover"));
    ir.behavior.normalizedDismissalTriggers = [...ir.behavior.normalizedDismissalTriggers, { event: "routeChange", defaultEnabled: true }];
    expect(() => unityLowering(ir)).toThrow('UNITY_UNSUPPORTED_SURFACE: Popover declares dismissal trigger "routeChange"');
  });

  it("refuses a variant axis whose class-recipe modifier is prefixed for disambiguation", () => {
    const ir = buildComponentIR(fixture("Tabs"));
    ir.classRecipe.valueModifiers = ir.classRecipe.valueModifiers.map(m => m.propName === "appearance" ? { ...m, valuePrefix: "appearance-" } : m);
    expect(() => createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })).toThrow('UNITY_UNSUPPORTED_VARIANT: Tabs.appearance shares values with another axis (class-recipe prefix "appearance-")');
  });

  it("refuses anatomy bindings the attached behavior does not realise", () => {
    const emitter = createUnityEmitter();
    // A selected-channel binding off the trigger part has no state-class realisation.
    const offTrigger = fixture("Switch") as unknown as Record<string, any>;
    offTrigger.anatomy.dom.children[1].bindings = { "aria-checked": "channel:checked.value" };
    expect(() => emitter.admitContract!(offTrigger as unknown as ComponentContract, { admitted: true }))
      .toThrow("UNITY_BOUNDARY_UNREALIZED: Switch on BooleanControl does not realise binding /anatomy/dom/children/track/bindings/aria-checked (rule anatomy-channel-binding claims selected-channel-binding)");
    // A binding to a channel the dispatcher did not select is unrealised too.
    const foreign = lamp() as unknown as Record<string, any>;
    foreign.anatomy.dom.children[0].bindings["aria-pressed"] = "channel:glow.value";
    foreign.channels.glow = { value: "glowing", onChange: "onGlow", valueType: "boolean", description: "Second channel." };
    foreign.props.designed.members.push({ name: "glowing", propType: { kind: "boolean" }, description: "x" }, { name: "onGlow", propType: { kind: "callback", params: [], returns: { kind: "void" } }, description: "x" });
    expect(() => emitter.admitContract!(foreign as unknown as ComponentContract, { admitted: false }))
      .toThrow(/UNITY_BOUNDARY_UNREALIZED: Lamp on BooleanControl does not realise .*binding \/anatomy\/dom\/children\/actuator\/bindings\/aria-pressed \(rule anatomy-channel-binding claims selected-channel-binding\)/);
    // A disabled binding off the trigger part names no property the root emits for it.
    const disabledOff = fixture("Switch") as unknown as Record<string, any>;
    disabledOff.anatomy.dom.children[1].bindings = { disabled: "prop:disabled" };
    expect(() => emitter.admitContract!(disabledOff as unknown as ComponentContract, { admitted: true }))
      .toThrow("UNITY_BOUNDARY_UNREALIZED: Switch on BooleanControl does not realise binding /anatomy/dom/children/track/bindings/disabled (rule anatomy-disabled-binding claims bound-prop-property)");
  });
});
