import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createUnityEmitter, unityLowering } from "./factory.js";
import { createDefaultRegistry } from "../../registry.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");
function fixture(name: string) {
  return JSON.parse(fs.readFileSync(path.join(contractsRoot, `components/${name}/${name}.contract.json`), "utf8")) as ComponentContract;
}
const emit = (contract: ComponentContract) => createUnityEmitter().emitComponent(buildComponentIR(contract), { componentsRoot: "", contractsRoot })[0]!.contents;

describe("Unity capability lowering", () => {
  it.each([
    ["Switch", "BooleanControl"], ["Accordion", "ItemGroup"], ["Tabs", "ItemGroup"], ["Popover", "AnchoredSurface"],
  ])("%s survives identity substitution with the same behavior adapter", (name, expected) => {
    const contract = fixture(name);
    contract.name = "UnrelatedFixture";
    const ir = buildComponentIR(contract);
    expect(unityLowering(ir).base).toBe(expected);
    expect(emit(contract)).toContain(`partial class UnrelatedFixture : ${expected}`);
  });
  it("refuses unsupported static and modal surfaces instead of emitting inert controls", () => {
    expect(() => emit(fixture("Text"))).toThrow("UNITY_UNSUPPORTED_INTERACTION");
    expect(() => emit(fixture("Dialog"))).toThrow("UNITY_UNSUPPORTED_SURFACE");
  });
  it("carries channel and anatomy names rather than assuming checked/input", () => {
    const ir = buildComponentIR(fixture("Switch"));
    ir.formControl!.channel = { ...ir.formControl!.channel, name: "armed", valueProp: "armed", changeHandlerProp: "onArmed" };
    ir.formControl!.part = { ...ir.formControl!.part, name: "actuator" };
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain('ChannelName = "armed"');
    expect(source).toContain('ChangeHandler = "onArmed"');
    expect(source).toContain('public bool Armed');
    expect(source).toContain('Configure("actuator", "switch")');
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
  it("typed default-size geometry reaches the emitted control", () => {
    const ir = buildComponentIR(fixture("Switch"));
    ir.tokenFacts = [{ name: "renamed.size.md.track.width", cssVar: "--irrelevant", category: "size", layer: "semantic", source: "tokens-sidecar", rawValue: "61px", isLiteral: true }];
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("TrackWidth = 61f;");
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
