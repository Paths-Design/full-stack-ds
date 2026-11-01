import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import type { DomNodeIR } from "../../ir.js";
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
  it("omits a presence predicate without emitting a nonexistent Rust condition", () => {
    const contract = fixture("Text");
    contract.styles = { ...contract.styles, ".text:not([hidden])": { opacity: { literal: "0.5", platforms: ["web"] } } };
    const ir = buildComponentIR(contract);
    const plan = gpuiStylePlan(ir);
    expect(plan.omissions).toContainEqual({
      sourceKey: ".text:not([hidden])", property: "opacity", reason: "predicate present has no admitted GPUI state carrier",
    });
    expect(plan.rules.some(rule => rule.sourceKey === ".text:not([hidden])")).toBe(false);
    expect(emitter.emitComponent(ir, options)[0]!.contents).not.toContain("StyleCondition::Present");
  });
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

  it.each(["Tabs", "Popover", "Button", "Card", "Progress"])("projects %s through the generic anatomy path with named omissions", name => {
    const ir = buildComponentIR(fixture(name));
    // The bounded planner still refuses the shape; the corpus component is
    // admitted by the anatomy projection instead of failing generation.
    expect(() => gpuiPlan(ir)).toThrow("GPUI_UNSUPPORTED_SHAPE");
    const files = emitter.emitComponent(ir, options);
    const receipt = JSON.parse(files[1]!.contents) as { operation: string; omittedFacts: unknown[]; omittedFactKinds: string[] };
    expect(files[0]!.contents).toContain(`impl Render for ${name}`);
    expect(receipt.operation).toBe("generic-anatomy");
    expect(receipt.omittedFacts.length).toBeGreaterThan(0);
    expect(receipt.omittedFactKinds.length).toBeGreaterThan(0);
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
    expect(emitter.emitBarrel(["ToggleSwitch", "Switch"])).toBe(
      '#[path = "Switch/Switch.rs"]\nmod switch;\npub use switch::*;\n'
      + '#[path = "ToggleSwitch/ToggleSwitch.rs"]\nmod toggle_switch;\npub use toggle_switch::*;\n'
      + '#[cfg(test)]\n#[path = "Switch/Switch.test.rs"]\nmod switch_mount;\n'
      + '#[cfg(test)]\n#[path = "ToggleSwitch/ToggleSwitch.test.rs"]\nmod toggle_switch_mount;\n',
    );
  });
  it('retains by-reference child components and receipts the facts it cannot project', () => {
    // The corpus is required to resolve componentRef nodes into instances.
    const corpus = new Map(
      fs.readdirSync(path.join(contractsRoot, 'components'))
        .filter(name => fs.existsSync(path.join(contractsRoot, 'components', name, `${name}.contract.json`)))
        .map(name => [name, fixture(name)] as const),
    );
    const ir = buildComponentIR(fixture('Chip'), { allContracts: corpus });
    const files = emitter.emitComponent(ir, options);
    const source = files[0]!.contents;
    const receipt = JSON.parse(files[1]!.contents) as { operation: string; refs: Array<{ field: string; refType: string; projectedAttrs: string[]; dynamicProps: string[]; omissions: Array<{ kind: string; reason: string }> }> };
    // One retained entity per reference, created once and rendered in the tree.
    expect(receipt.refs).toHaveLength(2);
    expect(receipt.refs.map(ref => ref.refType)).toEqual(['Button', 'Button']);
    for (const ref of receipt.refs) {
      expect(source).toContain(`${ref.field}:Option<gpui::Entity<crate::components::Button>>`);
      expect(source).toContain(`self.${ref.field}.get_or_insert_with(||cx.new(|_|crate::components::Button::default()`);
      expect(source).toContain(`.child(${ref.field}.clone())`);
    }
    // Static literal attrs are projected; dynamic bindings and event wiring are receipted.
    expect(receipt.refs[0]!.projectedAttrs).toContain('variant');
    expect(receipt.refs[0]!.omissions.some(omission => omission.kind === 'ref-binding')).toBe(true);
    expect(receipt.refs.some(ref => ref.omissions.some(omission => omission.kind === 'ref-event'))).toBe(true);
    // Realized parent props update the child through its setters each render.
    expect(receipt.refs[0]!.dynamicProps).toContain('disabled');
    expect(source).toContain('.update(cx,|child,cx|{child.set_disabled(');
    // Paged/channel expressions have no parent-state lowering and stay omissions.
    const pageNavigator = emitter.emitComponent(buildComponentIR(fixture('PageNavigator'), { allContracts: corpus }), options);
    const pageReceipt = JSON.parse(pageNavigator[1]!.contents) as { refs: Array<{ omissions: Array<{ kind: string; reason: string }> }> };
    expect(pageReceipt.refs.some(ref => ref.omissions.some(omission => omission.kind === 'ref-binding' && omission.reason.includes("'paged'")))).toBe(true);
    // A component without references keeps the pre-slice output shape.
    const plain = emitter.emitComponent(buildComponentIR(fixture('Text')), options)[0]!.contents;
    expect(plain).not.toContain('Entity<crate::components::');
  });
  it('emits an executed mount witness for every admitted component', () => {
    for (const name of ["Switch", "Dialog", "Select", "Icon", "Markdown"]) {
      const ir = buildComponentIR(fixture(name));
      const files = emitter.emitTests(ir, options);
      expect(files).toHaveLength(1);
      expect(files[0]!.relativePath).toBe(`${name}/${name}.test.rs`);
      expect(files[0]!.contents).toContain("#[gpui::test]");
      expect(files[0]!.contents).toContain("add_window_view");
      // A witness that never asserts anything cannot fail; every component
      // either asserts its root reached layout or (content-guarded root) runs
      // the render and parks.
      expect(
        files[0]!.contents.includes("debug_bounds") || files[0]!.contents.includes("run_until_parked"),
      ).toBe(true);
    }
  });
  it.each(['Switch','ToggleSwitch','Checkbox','Text','Badge','Divider','Stat'])('emits %s with actual authored styles and mounted setters', name => {
    const ir=buildComponentIR(fixture(name));
    const source=emitter.emitComponent(ir,options)[0]!.contents;
    expect(source).toContain('pub const STYLE_RULES');
    expect(source).toContain('pub fn set_theme(');
    expect(source).toContain('pub fn set_label(');
    expect(source).toContain('apply_part_style');
    if(ir.formControl) { expect(source).toContain('crate::view::is_activation_key'); expect(source).toContain('cx.on_blur'); expect(source).toContain('self.focus_handle.take().map(|handle|handle.tab_index(0).tab_stop(!self.state.disabled))'); }
  });
  it('derives retained children APIs from insertion facts and preserves bounded controls',()=>{
    for(const name of ['Text','Badge','Switch','Stat']) {
      const ir=buildComponentIR(fixture(name));
      expect(gpuiPlan(ir).childContent).toBe(true);
      const source=emitter.emitComponent(ir,options)[0]!.contents;
      expect(source).toContain('Some(content)=>content.render(window,cx)');
      if(!ir.formControl) expect(source).not.toContain('self.state.value()');
    }
    for(const name of ['Checkbox','ToggleSwitch','Divider']) expect(gpuiPlan(buildComponentIR(fixture(name))).childContent).toBe(false);
  });
  it('rejects repeated default or named insertion placements before retaining an entity twice',()=>{
    const ir=buildComponentIR(fixture('Stat'));
    ir.dom!.children.push(structuredClone(ir.dom!.children[0]!));
    expect(()=>gpuiPlan(ir)).toThrow('GPUI_DUPLICATE_CONTENT_PLACEMENT');
    ir.dom!.children.forEach(node=>{node.tag='slot';node.slotName='metric';});
    expect(()=>gpuiPlan(ir)).toThrow('GPUI_DUPLICATE_CONTENT_PLACEMENT');
    ir.dom!.children[1]!.slotName='other';
    expect(gpuiPlan(ir).slots).toEqual(['metric','other']);
  });
  it('lowers control and variant guards from their normalized storage and rejects root insertion',()=>{
    const ir=buildComponentIR(fixture('Switch'));
    ir.dom!.ifProp='checked';
    ir.dom!.children.find(node=>node.tag==='children')!.ifProp='disabled';
    const source=emitter.emitComponent(ir,options)[0]!.contents;
    expect(source).toContain('if !(self.state.value())');expect(source).toContain('.when(self.state.disabled,');
    ir.dom!.ifProp='size';
    expect(emitter.emitComponent(ir,options)[0]!.contents).toContain('self.variant_values.get("size").is_some_and(|value|!value.is_empty())');
    ir.dom!.ifProp='ariaLabel';expect(()=>gpuiPlan(ir)).toThrow('GPUI_UNSUPPORTED_PROP_GUARD');
    ir.dom!.ifProp=undefined;ir.dom!.tag='children';expect(()=>gpuiPlan(ir)).toThrow('GPUI_UNSUPPORTED_ROOT_INSERTION');
  });
  it.each(['self','primary-','primary--icon'])('rejects invalid slot identifier %s deterministically',name=>{
    const ir=buildComponentIR(fixture('Stat'));ir.dom!.children[0]!.tag='slot';ir.dom!.children[0]!.slotName=name;
    expect(()=>gpuiPlan(ir)).toThrow('GPUI_UNSUPPORTED_SLOT_IDENTIFIER');
  });
  it('pins the emitted slot witness compiled by the native mounted suite',()=>{
    const ir=buildComponentIR(fixture('Stat'));
    ir.name='SlotLayout';ir.cssPrefix='slot-layout';
    const leaf=structuredClone(ir.dom!.children[0]!);
    const part=(name:string,children:DomNodeIR[])=>({...structuredClone(ir.dom!),part:name,children});
    const primary={...structuredClone(leaf),tag:'slot',slotName:'primary'};
    const secondary={...structuredClone(leaf),tag:'slot',slotName:'secondary'};
    const optional={...structuredClone(leaf),tag:'slot',slotName:'optional'};
    ir.dom!.children=[
      {...part('body',[leaf]),ifProp:'children'},
      {...part('primary',[primary]),ifSlot:'primary'},
      part('secondary',[secondary]),
      {...part('fallback',[optional,{...part('fallback-label',[]),content:{kind:'literal',value:'No optional content'}}]),ifSlot:'optional',ifNegated:true},
    ];
    const source=emitter.emitComponent(ir,options)[0]!.contents;
    const file=path.join(root,'packages/ds-gpui/tests/fixtures/SlotLayout.rs');
    if(process.env.FSDS_UPDATE_GPUI_FIXTURES==='1'){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,source);}
    expect(source).toBe(fs.readFileSync(file,'utf8'));
    expect(source).toContain('.when(self.has_content(),|node|node.child(');
    expect(source).toContain('.when(!(self.has_slot(Self::slot_key("optional"))),|node|node.child(');
    expect(source).toContain('pub enum SlotLayoutSlot{Primary,Secondary,Optional}');
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
  it.each([['width','12'],['border-width','2%'],['border-top-width','bad'],['font-weight','400px'],['background-color','rgba(300,0,0,1)'],['transform','translateX(wrongpx)'],['transform','translateX(1em)']])('refuses bad %s scalar syntax', (property,value)=>{
    const ir=buildComponentIR(fixture('Switch'));
    ir.nativeStyleRules!.rules.push({sourceKey:'mutant',part:'track',predicates:[],declarations:[{property,value}]});
    expect(()=>gpuiStylePlan(ir)).toThrow('GPUI_UNSUPPORTED_STYLE_VALUE');
  });
});
