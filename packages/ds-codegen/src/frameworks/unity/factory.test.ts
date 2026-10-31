import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createUnityEmitter, unityLowering } from "./factory.js";
import { createDefaultRegistry } from "../../registry.js";
import { classifyContract, loadBoundary, loadContractWithSidecars } from "./boundary.js";
import { rootPublicMembers } from "./walker.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");
function fixture(name: string) {
  return JSON.parse(fs.readFileSync(path.join(contractsRoot, `components/${name}/${name}.contract.json`), "utf8")) as ComponentContract;
}
const completeFixture = (name: string) => loadContractWithSidecars(root, name) as ComponentContract;
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
  it("routes channel-free content and rule leaves through a passive host while refusing modal surfaces", () => {
    expect(unityLowering(buildComponentIR(fixture("Text"))).behavior).toBe("Passive");
    expect(unityLowering(buildComponentIR(fixture("Divider"))).behavior).toBe("Passive");
    for (const name of ["Text", "Divider", "Icon"]) expect(emit(fixture(name))).toContain("Theme.AddStyleSheet(this);");
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
    expect(source).toContain("public UnityEngine.UIElements.Button Actuator { get; } = new UnityEngine.UIElements.Button();");
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
  it("leaves size geometry to the USS projection: no inline style, a Size modifier backed by USS carriers", () => {
    // With its sidecars, as the CLI merges them: the styles sidecar carries the size rules.
    const withSidecars = () => buildComponentIR(loadContractWithSidecars(root, "Switch") as unknown as ComponentContract);
    const ir = withSidecars();
    const fact = (name: string, rawValue: string) => ({ name, cssVar: "--irrelevant", category: "size", layer: "semantic" as const, source: "tokens-sidecar" as const, rawValue, isLiteral: true });
    // Token facts alone no longer reach the constructor (the P2 R10 inline geometry is gone).
    ir.tokenFacts = [fact("switch.size.md.track.width", "61px"), fact("switch.size.md.thumb.size", "13px")];
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).not.toMatch(/style\.(width|height)/);
    // The size axis has variant-predicated native style rules, so it is emitted
    // as the class-recipe modifier the generated sheet keys, defaulting to md.
    expect(source).toContain('[UxmlAttribute] public string Size { get => Variants.Get(this, "switch", "sm", "md", "lg"); set { Variants.Set(this, "switch", value, "sm", "md", "lg"); } }');
    expect(source).toContain('            Size = "md";\n');
    // Without any variant-predicated rule on the axis there is no carrier and no attribute.
    const bare = withSidecars();
    bare.nativeStyleRules = { rules: bare.nativeStyleRules!.rules.filter(rule => !rule.predicates.some(p => p.kind === "variant")), unsupported: [] };
    expect(createUnityEmitter().emitComponent(bare, { componentsRoot: "", contractsRoot })[0]!.contents).not.toContain("Size");
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
    const sw = completeFixture("Switch");
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
    for (const name of ["Switch", "Accordion", "Popover", "Tabs", "Text", "Divider"]) {
      expect(() => emitter.admitContract!(completeFixture(name), { admitted: true })).not.toThrow();
    }
    const unclassified = fixture("Switch") as ComponentContract & { futureBlock?: unknown };
    unclassified.futureBlock = { enabled: true };
    expect(() => emitter.admitContract!(unclassified, { admitted: false })).toThrow("UNITY_BOUNDARY_UNCLASSIFIED: Switch: contract:/futureBlock/enabled");
    const unadjudicated = completeFixture("Switch");
    unadjudicated.props!.designed!.members!.push({ name: "futureBehavior", propType: { kind: "boolean" } });
    expect(() => emitter.admitContract!(unadjudicated, { admitted: true })).toThrow("UNITY_BOUNDARY_UNADJUDICATED");
    expect(() => emitter.admitContract!(unadjudicated, { admitted: false })).not.toThrow();
  });
  it("registers passive and interactive controls without claiming TypeScript rail admission", () => {
    const registry = createDefaultRegistry({ workspaceRoot: root, contractsRoot });
    expect(registry.available()).toContain("unity");
    const unity = registry.get("unity");
    expect(unity.admittedComponents).toEqual(["Switch", "Accordion", "Popover", "Tabs", "Text", "Divider", "Icon", "Button", "Checkbox", "ToggleSwitch", "Blockquote", "Stat", "ProfileFlag", "Badge", "List", "Alert", "AlertNotice", "Label", "Breadcrumbs", "Tooltip", "Status", "Card", "NavList", "Skeleton", "Table", "CodeBlock", "Details", "Progress", "Chip", "CodeSnippet"]);
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
 * insertion point, and a variant axis (tone) no behavior knob or styling fact binds. */
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

describe("Unity anatomy walker on synthetic contracts", () => {
  it("lowers a keyed selection tree by rule: compound classes, identity, insertion point, behavior and vocabulary props", () => {
    const contract = dial();
    // The full admission gate (boundary + realisation) holds for a non-corpus contract.
    expect(() => createUnityEmitter().admitContract!(contract, { admitted: false })).not.toThrow();
    const ir = buildComponentIR(contract);
    expect(unityLowering(ir)).toMatchObject({ behavior: "ItemGroup", trigger: { name: "notch" }, content: { name: "well" }, operation: "select", multiple: false, stateClass: "is-chosen", focus: { strategy: "manual", orientation: "vertical", wrap: false } });
    const source = emit(contract);
    // R1: one root class plus one class per compound part, in ir.compoundParts order.
    expect([...source.matchAll(/public partial class (\w+) : ([\w, .<>]+)\n/g)].map(m => `${m[1]} : ${m[2]}`))
      .toEqual(["Dial : VisualElement", "DialRail : VisualElement", "DialNotch : UnityEngine.UIElements.Button, IKeyedPart", "DialWell : VisualElement, IKeyedPart"]);
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
    expect(source).toContain("    public partial class DialNotch : UnityEngine.UIElements.Button, IKeyedPart\n    {\n        [UxmlAttribute] public string Value { get; set; }\n        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }\n");
    expect(source).toContain("    public partial class DialWell : VisualElement, IKeyedPart\n    {\n        public VisualElement WellBody { get; } = new VisualElement();\n        public override VisualElement contentContainer => WellBody;\n        [UxmlAttribute] public string Value { get; set; }\n        public DialWell()");
    // R8: the string channel API is named by the channel's own value prop.
    expect(source).toContain("[UxmlAttribute] public string Picked { get => Group.Value; set => Group.Value = value; }");
    expect(source).toContain('public const string ChannelName = "pick";');
    // R6: a vocabulary axis is a class-recipe modifier; a vocabulary boolean drives its knob;
    // an axis no behavior consumes (tone) is a styling axis and is not emitted.
    expect(source).toContain('[UxmlAttribute] public string Appearance { get => Variants.Get(this, "dial", "flat", "raised"); set { Variants.Set(this, "dial", value, "flat", "raised"); } }');
    expect(source).toContain("[UxmlAttribute] public bool Loop { get => Group.Loop; set => Group.Loop = value; }");
    expect(rootPublicMembers(source, "Dial")).toEqual(new Set(["Picked", "Controlled", "Appearance", "Loop"]));
    expect(source).not.toMatch(/Tone|calm|loud/);
  });

  it("emits a variant axis only when the attached behavior consumes it; every other axis waits for P3", () => {
    // Outside the vocabulary and placement, and with no token fact or style rule
    // naming it, tone is still a styling axis: withheld, not a class-only modifier.
    const ir = buildComponentIR(dial());
    expect(ir.variants.tone).toEqual(["calm", "loud"]);
    expect(ir.tokenFacts.filter(f => f.name.split(".")[1] === "tone")).toEqual([]);
    expect(ir.nativeStyleRules?.rules.filter(r => r.predicates.some(p => p.kind === "variant" && p.axis === "tone"))).toEqual([]);
    const dialSource = emit(dial());
    expect(dialSource).not.toMatch(/Tone|calm|loud/);
    // A vocabulary axis emits when ItemGroup is attached.
    expect(dialSource).toContain('[UxmlAttribute] public string Appearance { get => Variants.Get(this, "dial", "flat", "raised"); set { Variants.Set(this, "dial", value, "flat", "raised"); } }');
    // The same vocabulary name on a behavior with no such knob is a styling axis.
    const oriented = lamp() as unknown as Record<string, any>;
    oriented.props.designed.members.push({ name: "orientation", propType: { kind: "ref", to: "LampOrientation" }, default: "row", description: "Layout axis." });
    oriented.types = { LampOrientation: { kind: "union", values: ["row", "column"] } };
    oriented.variants = { orientation: ["row", "column"] };
    const orientedIr = buildComponentIR(oriented as unknown as ComponentContract);
    expect(orientedIr.variants.orientation).toEqual(["row", "column"]);
    expect(orientedIr.styledProps.map(p => p.name)).toContain("orientation");
    expect(emit(oriented as unknown as ComponentContract)).not.toMatch(/Orientation|"row"|"column"/);
    // The surface placement prop emits and drives the attached surface.
    expect(emit(flyout())).toContain('[UxmlAttribute] public string Placement { get => Variants.Get(this, "flyout", "top", "bottom", "left", "right", "auto"); set { Variants.Set(this, "flyout", value, "top", "bottom", "left", "right", "auto"); Surface.Placement = value; } }');
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

  it("refuses compound parts interleaved around a rendered sibling, which one composed position cannot order", () => {
    // [notch, glint, stop]: composed notch and stop cannot both keep their side of the glint.
    const interleaved = dial() as unknown as Record<string, any>;
    interleaved.anatomy.parts.push("stop");
    interleaved.anatomy.details.stop = { tag: "span", role: "decoration", subcomponent: true };
    interleaved.anatomy.dom.children[1].children.push({ tag: "span", part: "stop" });
    expect(buildComponentIR(interleaved as unknown as ComponentContract).compoundParts.map(p => p.name)).toContain("stop");
    expect(() => emit(interleaved as unknown as ComponentContract)).toThrow("UNITY_UNSUPPORTED_ANATOMY: Dial DialRail interleaves compound parts around a rendered sibling (pending P4)");
    // Compound parts adjacent on one side of the sibling keep a single composed position.
    const adjacent = dial() as unknown as Record<string, any>;
    adjacent.anatomy.parts.push("stop");
    adjacent.anatomy.details.stop = { tag: "span", role: "decoration", subcomponent: true };
    adjacent.anatomy.dom.children[1].children.splice(1, 0, { tag: "span", part: "stop" });
    expect(ctor(emit(adjacent as unknown as ComponentContract), "DialRail")).toBe(lines(
      'name = "rail";', 'AddToClassList("dial__rail");',
      'children.name = "children";', 'children.AddToClassList("dial__children");', "hierarchy.Add(children);",
      'Glint.name = "glint";', 'Glint.AddToClassList("dial__glint");', "hierarchy.Add(Glint);",
    ));
  });

  it("lowers a boolean control with a children hole beside siblings and a named slot, in document order", () => {
    const contract = lamp();
    expect(() => createUnityEmitter().admitContract!(contract, { admitted: false })).not.toThrow();
    const source = emit(contract);
    expect(source).toContain("    public partial class Lamp : VisualElement, INotifyValueChanged<bool>\n");
    // R2/R3: part properties first, then the private children host that is the contentContainer.
    expect(source).toContain([
      "        public UnityEngine.UIElements.Button Actuator { get; } = new UnityEngine.UIElements.Button();",
      "        public VisualElement LeadSlot { get; } = new VisualElement();",
      "        public VisualElement Tail { get; } = new VisualElement();",
      "        private readonly VisualElement children = new VisualElement();",
      "        public override VisualElement contentContainer => children;",
      "        public BooleanControl Control { get; }",
      "        public UnityEngine.UIElements.Button Trigger => Actuator;",
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
    expect([...source.matchAll(/public partial class (\w+) : ([\w, .<>]+)\n/g)].map(m => `${m[1]} : ${m[2]}`))
      .toEqual(["Flyout : VisualElement, INotifyValueChanged<bool>", "FlyoutOpener : UnityEngine.UIElements.Button", "FlyoutSheet : ScrollView"]);
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
    expect(source).toContain("    public partial class FlyoutOpener : UnityEngine.UIElements.Button\n    {\n        [UxmlAttribute] public bool Disabled");
    expect(ctor(source, "FlyoutSheet")).toBe(lines('name = "sheet";', 'AddToClassList("flyout__sheet");'));
  });

  it("selects the parts-only class root by its declared root role, not by a root-only part name", () => {
    const framed = flyout() as unknown as Record<string, any>;
    framed.anatomy.parts[0] = "frame";
    framed.anatomy.details = { frame: { ...framed.anatomy.details.root, role: "root" }, ...framed.anatomy.details };
    delete framed.anatomy.details.root;
    framed.slots = { frame: framed.slots.root, opener: framed.slots.opener, sheet: framed.slots.sheet };
    const ir = buildComponentIR(framed as unknown as ComponentContract);
    // The name list does not know `frame`; only the role fact names it the root.
    expect(ir.parts.find(p => p.name === "frame")).toMatchObject({ isRootOnly: false, details: { role: "root" } });
    const source = emit(framed as unknown as ComponentContract);
    expect(ctor(source, "Flyout")).toBe(lines(
      'name = "frame";',
      'AddToClassList("flyout");',
      'Tip.name = "tip";',
      'Tip.AddToClassList("flyout__tip");',
      "hierarchy.Add(Tip);",
      'Surface = AnchoredSurface.Attach(this, triggerClass: "flyout__opener", contentClass: "flyout__sheet", stateClass: "is-open");',
      "CloseOnEscape = true;",
      "CloseOnOutsideClick = true;",
      "CloseOnBlur = true;",
    ));
    expect(source).not.toMatch(/\bFrame\b/);
  });

  it("attaches gap to the gapped class itself, a ScrollView content class included", () => {
    const gap = (px: string) => ({ gap: { literal: px, platforms: ["web"] } });
    const gapped = flyout() as unknown as Record<string, any>;
    gapped.styles = { root: gap("4px"), sheet: gap("8px") };
    const source = emit(gapped as unknown as ComponentContract);
    // The interactive surface content lowers to a ScrollView. Its --fsds-gap is
    // resolved on the ScrollView (a contentContainer does not inherit the custom
    // property into its ICustomStyle), and the runtime Gap helper spaces a
    // ScrollView's contentContainer: the emitter attaches to the class itself.
    expect(classBody(source, "FlyoutSheet")).toContain("public partial class FlyoutSheet : ScrollView");
    expect(ctor(source, "FlyoutSheet")).toBe(lines('name = "sheet";', 'AddToClassList("flyout__sheet");', "Gap.Attach(this);"));
    expect(source).not.toContain("Gap.Attach(contentContainer)");
    expect(ctor(source, "Flyout").split("\n").filter(l => l.includes("Gap.Attach"))).toEqual(["            Gap.Attach(this);"]);
    // No gap fact, no attachment.
    expect(emit(flyout())).not.toContain("Gap.Attach");
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
  it("renders an admitted componentRef with static props and part identity", () => {
    const source = emit(fixture("Accordion"));
    expect(source).toContain("        public Icon Chevron { get; } = new Icon();\n");
    expect(source.split("\n").filter(l => l.includes("Chevron"))).toEqual([
      "        public Icon Chevron { get; } = new Icon();",
      '            Chevron.name = "chevron";',
      '            Chevron.AddToClassList("accordion__chevron");',
      '            Chevron.Name = "chevron-down";',
      '            Chevron.Size = "sm";',
      "            hierarchy.Add(Chevron);",
    ]);
    const renamed = fixture("Accordion");
    renamed.name = "SyntheticGroup";
    const renamedSource = emit(renamed);
    expect(renamedSource).toContain("partial class SyntheticGroup : VisualElement");
    expect(renamedSource).toContain("public Icon Chevron { get; } = new Icon();");
    expect(renamedSource).toContain('Chevron.Name = "chevron-down";');
    const leaves = classifyContract(loadContractWithSidecars(root, "Accordion")).filter(l => l.keyed.includes("/ref:chevron/"));
    expect(new Set(leaves.map(l => `${l.rule}:${l.disposition}`))).toEqual(new Set(["anatomy-component-ref-identity:lowered", "anatomy-component-ref:lowered"]));
  });

  it("refuses admitted references whose target has no Unity glyph mount capability", () => {
    const source = fixture("Accordion");
    const anatomy = source.anatomy as { details: Record<string, { componentRef: string }>; dom: { children: any[] } };
    const ref = anatomy.dom.children[0].children[0].children[0].children[1];
    ref.componentRef = "fsds.Switch";
    ref.attrs = { size: "sm" };
    anatomy.details.chevron.componentRef = "fsds.Switch";
    const target = fixture("Switch");
    const ir = buildComponentIR(source, { allContracts: new Map([[source.name, source], [target.name, target]]) });
    expect(() => createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot }))
      .toThrow("has no admitted glyph mount capability");
  });

  it("emits nothing for refused static attrs and form bindings, which the boundary refuses", () => {
    // With its sidecars, as the CLI merges them.
    const source = emit(loadContractWithSidecars(root, "Switch") as unknown as ComponentContract);
    expect(source).not.toMatch(/checkbox|aria-|\brole\b|"button"/);
    // No Name / Value: the form-serialization props are refused, not emitted.
    expect([...rootPublicMembers(source, "Switch")].sort()).toEqual(["Checked", "Controlled", "Disabled", "Size", "value"]);
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

  it("refuses an ItemGroup whose trigger or content part opts out of being a compound sub-element", () => {
    // ItemGroup pairs composed parts through IKeyedPart; an inline part has no pairing key.
    const inlineTrigger = dial() as unknown as Record<string, any>;
    inlineTrigger.anatomy.details.notch.subcomponent = false;
    const triggerIr = buildComponentIR(inlineTrigger as unknown as ComponentContract);
    expect(triggerIr.compoundParts.map(p => p.name)).not.toContain("notch");
    expect(() => unityLowering(triggerIr)).toThrow("UNITY_UNSUPPORTED_INTERACTION: Dial ItemGroup trigger part notch must be a compound sub-element so it can carry the pairing key");
    const inlineContent = dial() as unknown as Record<string, any>;
    inlineContent.anatomy.details.well.subcomponent = false;
    expect(() => unityLowering(buildComponentIR(inlineContent as unknown as ComponentContract))).toThrow("UNITY_UNSUPPORTED_INTERACTION: Dial ItemGroup content part well must be a compound sub-element so it can carry the pairing key");
  });

  it("refuses a dismissal trigger the anchored surface has no knob for", () => {
    const ir = buildComponentIR(fixture("Popover"));
    ir.behavior.normalizedDismissalTriggers = [...ir.behavior.normalizedDismissalTriggers, { event: "routeChange", defaultEnabled: true }];
    expect(() => unityLowering(ir)).toThrow('UNITY_UNSUPPORTED_SURFACE: Popover declares dismissal trigger "routeChange"');
  });

  it("lowers a tooltip surface in hover/focus-open mode", () => {
    const ir = buildComponentIR(fixture("Tooltip"));
    expect(unityLowering(ir)).toMatchObject({
      behavior: "AnchoredSurface", trigger: { name: "trigger" }, content: { name: "content" },
      openOnHover: true, openOnFocus: true, closeOnPointerLeave: true, contentFocusable: false,
    });
    const source = emit(fixture("Tooltip"));
    expect(source).toContain('AnchoredSurface.Attach(this, triggerClass: "tooltip__trigger", contentClass: "tooltip__content", stateClass: null, openOnHover: true, openOnFocus: true, closeOnPointerLeave: true, contentFocusable: false);');
  });

  it("routes a parts-only container through the passive lowering", () => {
    const ir = buildComponentIR(fixture("Card"));
    expect(unityLowering(ir).behavior).toBe("Passive");
    const source = createUnityEmitter().emitComponent(buildComponentIR(completeFixture("Card")), { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class Card : VisualElement");
    expect(source).toContain("public partial class CardHeader : VisualElement");
    expect(source).toContain('public string Density { get => Variants.Get(this, "card", "default", "inset");');
    expect(source).not.toMatch(/Interactive/);
  });

  it("keeps the keyboard claim lowered only where a channel or projected action root realises it", () => {
    const boundary = loadBoundary();
    const keyboardOf = (name: string) => classifyContract(loadContractWithSidecars(root, name) as never, boundary)
      .filter(leaf => leaf.keyed.startsWith("/a11y/keyboard/"));
    const table = keyboardOf("Table");
    expect(table.length).toBeGreaterThan(0);
    expect(table.every(leaf => leaf.disposition === "refused")).toBe(true);
    const tabs = keyboardOf("Tabs");
    expect(tabs.length).toBeGreaterThan(0);
    expect(tabs.every(leaf => leaf.disposition === "lowered")).toBe(true);
  });

  it("suffixes a generated member that would collide with its class name", () => {
    const source = createUnityEmitter().emitComponent(buildComponentIR(completeFixture("Status")), { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class Status : VisualElement");
    expect(source).toContain('public string StatusValue { get => Variants.Get(this, "status", "info", "success", "warning", "danger", "error");');
    expect(source).not.toMatch(/public string Status \{/);
  });

  it("emits prefixed modifier helpers for a variant axis disambiguated by the class recipe", () => {
    const ir = buildComponentIR(fixture("Tabs"));
    ir.classRecipe.valueModifiers = ir.classRecipe.valueModifiers.map(m => m.propName === "appearance" ? { ...m, valuePrefix: "appearance-" } : m);
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain('Variants.GetAxis(this, "tabs", "appearance-",');
    expect(source).toContain('Variants.SetAxis(this, "tabs", "appearance-", value,');
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

  it("lowers a projected-children action to a native Button with callback, disabled and content host", () => {
    const contract = completeFixture("Button") as unknown as ComponentContract;
    const ir = buildComponentIR(contract);
    expect(unityLowering(ir).behavior).toBe("Action");
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toMatch(/partial class Button : UnityEngine\.UIElements\.Button\b/);
    expect(source).toContain("public Action OnClick { get; set; }");
    expect(source).toContain("clicked += () => OnClick?.Invoke();");
    expect(source).toContain("[UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }");
    // The pending-state chrome is a conditional componentRef pending P4 and the
    // loading-text wrapper is flattened: the control's own contentContainer is
    // the projection point, so neither is rendered or exposed.
    expect(source).not.toMatch(/\bSpinner\b/);
    expect(source).not.toMatch(/LoadingText|contentContainer/);
    expect(source).not.toMatch(/public (?:bool|string) (?:Loading|Type|AriaExpanded|AriaPressed) \{/);
  });

  it("carries the DOM click binding name into the generated action callback", () => {
    const contract = fixture("Button") as unknown as Record<string, any>;
    contract.anatomy.dom.events.click = "prop:onActivate";
    contract.props.designed.members.push({ name: "onActivate", propType: { kind: "callback", params: [], returns: { kind: "void" } }, description: "Activation." });
    const source = emit(contract as unknown as ComponentContract);
    expect(source).toContain("public Action OnActivate { get; set; }");
    expect(source).toContain("clicked += () => OnActivate?.Invoke();");
    expect(source).not.toContain("OnClick");
  });

  it("refuses an action root without a click prop binding", () => {
    const contract = fixture("Button") as unknown as Record<string, any>;
    delete contract.anatomy.dom.events.click;
    expect(() => unityLowering(buildComponentIR(contract as unknown as ComponentContract)))
      .toThrow("UNITY_UNSUPPORTED_INTERACTION: Button action root declares no click prop binding");
  });

  it("lowers a root form-control part to a native Button boolean control", () => {
    const contract = fixture("ToggleSwitch") as unknown as ComponentContract;
    contract.name = "UnrelatedToggle";
    const ir = buildComponentIR(contract);
    expect(unityLowering(ir).behavior).toBe("BooleanControl");
    const source = emit(contract);
    expect(source).toMatch(/partial class UnrelatedToggle : UnityEngine\.UIElements\.Button, INotifyValueChanged<bool>/);
    expect(source).toContain("public UnityEngine.UIElements.Button Trigger => this;");
    expect(source).toContain('Control = BooleanControl.Attach(this, control: this, stateClass: "is-checked", labelHost: null);');
  });

  it("lowers a label-host checkbox with its native control child and no withheld axis", () => {
    const contract = fixture("Checkbox") as unknown as ComponentContract;
    contract.name = "UnrelatedCheck";
    const source = emit(contract);
    expect(source).toContain("public UnityEngine.UIElements.Button Input { get; } = new UnityEngine.UIElements.Button();");
    expect(source).toContain('Control = BooleanControl.Attach(this, control: Input, stateClass: "is-checked", labelHost: this);');
    // indeterminate and the size axis are not realised: no emitted API for either.
    expect(source).not.toMatch(/Indeterminate|public string Size/);
  });
});
