import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { loadBoxModelPrimitive, mergeBoxModelDefaults } from '../../box-model.js';
import { createDefaultRegistry } from "../../registry.js";
import { createGpuiEmitter, gpuiPlan, gpuiStylePlan } from "./factory.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");
const fixture = (name: string): ComponentContract => {
  const contract = JSON.parse(fs.readFileSync(path.join(contractsRoot, `components/${name}/${name}.contract.json`), "utf8"));
  for (const sidecar of ['tokens','styles']) {
    const file = path.join(contractsRoot, `components/${name}/${name}.${sidecar}.json`);
    if (fs.existsSync(file)) contract[sidecar] = JSON.parse(fs.readFileSync(file,'utf8'));
  }
  contract.tokens = mergeBoxModelDefaults(contract.tokens,loadBoxModelPrimitive(contractsRoot),contract.morphology);
  return contract;
};
const emitter = createGpuiEmitter();
const options = { componentsRoot: "", contractsRoot };

describe("GPUI native style and control lowering", () => {
  it.each(["Switch", "ToggleSwitch"])("lowers %s independently of its identity", name => {
    const contract = fixture(name);
    contract.name = "UnrelatedControl";
    // Existing sidecar names remain owned by their original contract; this
    // identity test isolates normalized channel lowering from styling custody.
    delete contract.styles;
    delete contract.tokens;
    const ir = buildComponentIR(contract);
    expect(gpuiPlan(ir).channel!.name).toBe("checked");
    const source = emitter.emitComponent(ir, options)[0]!.contents;
    expect(source).toContain("impl Render for UnrelatedControl");
    expect(source).toContain("cx.emit(request)");
    expect(source).toContain('pub const CHANGE_HANDLER:&\'static str="onChange"');
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
    expect(source).toContain('CHANNEL:&\'static str="armed"');
    expect(source).toContain('CHANGE_HANDLER:&\'static str="onArmed"');
    expect(source).toContain('CONTROL_PART:&\'static str="actuator"');
    expect(source).toContain("BooleanState::new(true)");
    expect(source).toContain("pub fn armed(");
    expect(source).toContain("pub fn initial_armed(");
    expect(source).toContain("pub fn locked(");
    expect(source).not.toContain("pub fn checked(");
  });

  it.each(["Tabs", "Popover", "Button", "Card", "Progress"])("refuses unsupported %s shapes", name => {
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
    expect(receipt.excludedProps).toEqual(["ariaLabel", "ariaDescribedby"]);
    expect(receipt.omissions).toContain("accessibility");
    expect(receipt.realized).toContain("scoped-token-cascade");
    expect(receipt.proof).toContain("outside-admission-rail");
  });

  it("registers its allowlist with a Cargo root and no rail descriptor", () => {
    const registry = createDefaultRegistry({ workspaceRoot: root, contractsRoot });
    const target = registry.get("gpui");
    const configured = JSON.parse(fs.readFileSync(path.join(root,'fsds.targets.json'),'utf8')).targets.find((item:{id:string})=>item.id==='gpui');
    expect(target.admittedComponents).toEqual(configured.components);
    expect(target.railFrameworkId).toBeUndefined();
    expect(target.componentsRoot).toBe(path.join(root, "packages/ds-gpui/src/components"));
    expect(emitter.emitBarrel(["ToggleSwitch", "Switch"])).toBe('#[path = "Switch/Switch.rs"]\nmod switch;\npub use switch::Switch;\n#[path = "ToggleSwitch/ToggleSwitch.rs"]\nmod toggle_switch;\npub use toggle_switch::ToggleSwitch;\n');
  });
  it.each(['Switch','ToggleSwitch','Checkbox','Text','Badge','Divider'])('emits %s with actual authored styles and mounted setters', name => {
    const ir=buildComponentIR(fixture(name));
    const source=emitter.emitComponent(ir,options)[0]!.contents;
    expect(source).toContain('pub const STYLE_RULES');
    expect(source).toContain('pub fn set_theme(');
    expect(source).toContain('pub fn set_label(');
    expect(source).toContain('apply_part_style');
    if(ir.formControl) { expect(source).toContain('crate::view::is_activation_key'); expect(source).toContain('cx.on_blur'); expect(source).toContain('tab_stop(!self.state.disabled)'); }
  });
  it('keeps pseudo rotation, typed token indirection and separate design overrides',()=>{
    const ir=buildComponentIR(fixture('Checkbox'));
    const source=emitter.emitComponent(ir,options)[0]!.contents;
    expect(source).toContain('render_pseudo("indicator::after"');
    expect(source).toContain('rotate(45deg)');
    expect(source).toContain('property:"checkbox.design.indicator.background.fill"');
    expect(source).toContain('token:Some("checkbox.color.background")');
  });
  it('refuses malformed dimensions before emitting mount-time failures',()=>{
    const ir=buildComponentIR(fixture('Switch'));
    ir.nativeStyleRules!.rules.find(rule=>rule.part==='track'&&rule.sourceKey==='track')!.declarations.find(decl=>decl.property==='width')!.value='arbitrary';
    expect(()=>gpuiStylePlan(ir)).toThrow('GPUI_UNSUPPORTED_STYLE_VALUE');
  });
  it('checks indirect token values despite a valid consumer fallback',()=>{
    const ir=buildComponentIR(fixture('Switch'));
    ir.nativeStyleRules!.rules[0]!.declarations.find(decl=>decl.property==='switch.size.md.track.width')!.value='nonsense';
    expect(()=>gpuiStylePlan(ir)).toThrow('GPUI_UNSUPPORTED_STYLE_VALUE');
  });
  it('preserves literal backslash sequences separately from control characters in Rust',()=>{
    const ir=buildComponentIR(fixture('Text'));
    ir.dom!.children=[];
    ir.dom!.content={kind:'literal',value:'\\b\\u0000\b\f\u0000'};
    const source=emitter.emitComponent(ir,options)[0]!.contents;
    expect(source).toContain('.child("\\\\b\\\\u0000\\u{8}\\u{c}\\u{0}")');
  });
  it.each([['width','12'],['border-width','2%'],['border-top-width','bad'],['font-weight','400px'],['background-color','rgba(300,0,0,1)'],['transform','translateX(wrongpx)']])('refuses bad %s scalar syntax', (property,value)=>{
    const ir=buildComponentIR(fixture('Switch'));
    ir.nativeStyleRules!.rules.push({sourceKey:'mutant',part:'track',predicates:[],declarations:[{property,value}]});
    expect(()=>gpuiStylePlan(ir)).toThrow('GPUI_UNSUPPORTED_STYLE_VALUE');
  });
});
