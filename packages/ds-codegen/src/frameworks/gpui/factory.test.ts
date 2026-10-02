import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createDefaultRegistry } from "../../registry.js";
import { createGpuiEmitter, gpuiPlan } from "./factory.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");
const fixture = (name: string): ComponentContract => JSON.parse(fs.readFileSync(path.join(contractsRoot, `components/${name}/${name}.contract.json`), "utf8"));
const emitter = createGpuiEmitter();
const options = { componentsRoot: "", contractsRoot };

describe("GPUI Boolean pilot", () => {
  it.each(["Switch", "ToggleSwitch"])("lowers %s independently of its identity", name => {
    const contract = fixture(name);
    contract.name = "UnrelatedControl";
    const ir = buildComponentIR(contract);
    expect(gpuiPlan(ir).channel.name).toBe("checked");
    const source = emitter.emitComponent(ir, options)[0]!.contents;
    expect(source).toContain("impl Render for UnrelatedControl");
    expect(source).toContain("cx.emit(request)");
    expect(source).toContain('pub const CHANGE_HANDLER: &\'static str = "onChange"');
  });

  it("carries renamed channels, hosts, defaults and suppression bindings", () => {
    const ir = buildComponentIR(fixture("ToggleSwitch"));
    const channel = { ...ir.formControl!.channel, name: "armed", valueProp: "armed", defaultValueProp: "initialArmed", changeHandlerProp: "onArmed" };
    ir.formControl!.channel = channel;
    ir.behavior.normalizedChannels = [channel];
    ir.styledProps.find(p => p.name === "checked")!.name = "armed";
    const initial = ir.styledProps.find(p => p.name === "defaultChecked")!;
    initial.name = "initialArmed";
    initial.defaultExpr = "true";
    ir.styledProps.find(p => p.name === "onChange")!.name = "onArmed";
    ir.styledProps.find(p => p.name === "disabled")!.name = "locked";
    ir.formControl!.part = { ...ir.formControl!.part, name: "actuator" };
    ir.dom!.part = "actuator";
    ir.dom!.bindings.disabled = { kind: "prop", prop: "locked" };
    const source = emitter.emitComponent(ir, options)[0]!.contents;
    expect(source).toContain('CHANNEL: &\'static str = "armed"');
    expect(source).toContain('CHANGE_HANDLER: &\'static str = "onArmed"');
    expect(source).toContain('CONTROL_PART: &\'static str = "actuator"');
    expect(source).toContain("BooleanState::new(true)");
    expect(source).toContain("pub fn armed(");
    expect(source).toContain("pub fn initial_armed(");
    expect(source).toContain("pub fn locked(");
    expect(source).not.toContain("pub fn checked(");
  });

  it.each(["Text", "Tabs", "Popover"])("refuses unsupported %s shapes", name => {
    expect(() => emitter.emitComponent(buildComponentIR(fixture(name)), options)).toThrow("GPUI_UNSUPPORTED_SHAPE");
  });

  it("refuses event callbacks, extra props, nonboolean defaults and identifier collisions", () => {
    const ir = buildComponentIR(fixture("ToggleSwitch"));
    ir.formControl!.channel.callbackKind = "event";
    expect(() => gpuiPlan(ir)).toThrow("GPUI_UNSUPPORTED_CHANNEL");
    ir.formControl!.channel.callbackKind = "value";
    ir.styledProps.find(p => p.name === "size")!.name = "unreviewed";
    expect(() => gpuiPlan(ir)).toThrow("GPUI_UNSUPPORTED_PROP");
    ir.styledProps.find(p => p.name === "unreviewed")!.name = "size";
    ir.styledProps.find(p => p.name === "defaultChecked")!.defaultExpr = '"true"';
    expect(() => gpuiPlan(ir)).toThrow("GPUI_UNSUPPORTED_DEFAULT");
    ir.styledProps.find(p => p.name === "defaultChecked")!.defaultExpr = "false";
    ir.formControl!.channel.valueProp = "disabled";
    ir.styledProps.find(p => p.name === "checked")!.name = "disabled";
    expect(() => gpuiPlan(ir)).toThrow("GPUI_IDENTIFIER_COLLISION");
  });

  it("lists omissions instead of claiming the authored prop surface is realized", () => {
    const ir = buildComponentIR(fixture("ToggleSwitch"));
    const receipt = JSON.parse(emitter.emitComponent(ir, options)[1]!.contents);
    expect(receipt.excludedProps).toEqual(["size", "ariaLabel", "ariaDescribedby"]);
    expect(receipt.omissions).toContain("keyboard");
    expect(receipt.omissions).toContain("tokens");
    expect(receipt.proof).toContain("no-rendered-runtime-admission");
  });

  it("registers its allowlist with a Cargo root and no rail descriptor", () => {
    const registry = createDefaultRegistry({ workspaceRoot: root, contractsRoot });
    const target = registry.get("gpui");
    expect(target.admittedComponents).toEqual(["Switch", "ToggleSwitch"]);
    expect(target.railFrameworkId).toBeUndefined();
    expect(target.componentsRoot).toBe(path.join(root, "packages/ds-gpui/src/components"));
    expect(target.targetPack.capabilities.tokens).toBe("none");
    expect(emitter.emitBarrel(["ToggleSwitch", "Switch"])).toBe('#[path = "Switch/Switch.rs"]\nmod switch;\npub use switch::Switch;\n#[path = "ToggleSwitch/ToggleSwitch.rs"]\nmod toggle_switch;\npub use toggle_switch::ToggleSwitch;\n');
  });
});
