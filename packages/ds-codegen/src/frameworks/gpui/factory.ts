import fs from 'node:fs';
import path from 'node:path';
import type { FrameworkEmitter } from '../../emitter.js';
import type { ComponentIR, DomNodeIR } from '../../ir.js';
import { hasChildrenPlaceholder } from '../../ir.js';
import { collectDomSlots } from '../native-emission-class.js';
import type { NativeStyleDeclarationIR, NativeStyleRuleIR } from '../../native-style-rules.js';
import { gpuiAnatomyPlan, gpuiAnatomyStylePlan } from './anatomy.js';
import type { GpuiPlan, GpuiStylePlan } from './plan-types.js';
import { supported, validScalar } from './style-vocabulary.js';
/** Encode characters directly so literal backslash sequences stay literal. */
function q(value: string): string {
 const escapes: Record<string,string> = {'\\':'\\\\','"':'\\"','\n':'\\n','\r':'\\r','\t':'\\t'};
 return '"' + Array.from(value).map(character => escapes[character] ?? ((character.codePointAt(0)! < 32 || character.codePointAt(0) === 127) ? `\\u{${character.codePointAt(0)!.toString(16)}}` : character)).join('') + '"';
}
const RESERVED = new Set(['self','super','crate','type','mod','fn','match','default','new','request_change','theme','variants','label','focus_handle','request_key','content','set_content','clear_content','has_content','render_content','slot','slots','slot_key','set_slot','clear_slot','has_slot','render_slot']);
function snake(name: string): string {
 const value = name.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
 if (!/^[a-z][a-z0-9_]*$/.test(value) || RESERVED.has(value) || RUST_KEYWORDS.has(value)) throw new Error(`GPUI_UNSUPPORTED_IDENTIFIER: ${name}`);
 return value;
}
function booleanDefault(ir: ComponentIR, name: string | undefined): string {
 const value = ir.styledProps.find(prop => prop.name === name)?.defaultExpr ?? 'false';
 if (value !== 'true' && value !== 'false') throw new Error(`GPUI_UNSUPPORTED_DEFAULT: ${ir.name}.${name}`);
 return value;
}
function nodesOf(ir: ComponentIR): DomNodeIR[] {
 const nodes: DomNodeIR[] = [];
 const visit = (node: DomNodeIR) => { nodes.push(node); node.children.forEach(visit); };
 if (ir.dom) visit(ir.dom);
 return nodes;
}
/** Source facts: normalized control, anatomy and variant capability.
 * Applies by: Boolean channels or static native/slot anatomy, never identity.
 * Removable when: additional native capabilities are independently admitted. */
export function gpuiPlan(ir: ComponentIR): GpuiPlan {
 const nodes = nodesOf(ir), control = ir.formControl;
 if (ir.dom?.tag==='children'||ir.dom?.tag==='slot') throw new Error(`GPUI_UNSUPPORTED_ROOT_INSERTION: ${ir.name}`);
 if (!ir.dom || ir.surface || ir.interaction || ir.compositeControl || ir.pagedSet || ir.motion.sequence || nodes.some(node => node.componentRef || node.iteration || node.iconGlyph || node.cssVarBindings.length || node.content && 'transform' in node.content)) throw new Error(`GPUI_UNSUPPORTED_SHAPE: ${ir.name}`);
 if (control && (control.valueModel !== 'boolean' || !['change','activation'].includes(control.commit))) throw new Error(`GPUI_UNSUPPORTED_SHAPE: ${ir.name}`);
 if (control && (control.channel.valueType !== 'boolean' || control.channel.callbackKind !== 'value' || control.channel.enabledByProp || ir.behavior.normalizedChannels.length !== 1)) throw new Error(`GPUI_UNSUPPORTED_CHANNEL: ${ir.name}`);
 if (control && !control.activationKeys?.length) throw new Error(`GPUI_UNSUPPORTED_ACTIVATION_HOST: ${ir.name}`);
 if (!control && (ir.behavior.normalizedChannels.length || nodes.some(node => Object.keys(node.events).length))) throw new Error(`GPUI_UNSUPPORTED_SHAPE: ${ir.name}`);
 const slots = collectDomSlots(ir.dom!);
 const defaultSites = nodes.filter(node => node.tag === 'children' || node.tag === 'slot' && !node.slotName);
 if (defaultSites.length > 1 || new Set(slots).size !== slots.length) throw new Error(`GPUI_DUPLICATE_CONTENT_PLACEMENT: ${ir.name}`);
 const childContent = hasChildrenPlaceholder(ir) || defaultSites.length > 0;
 if (!childContent && nodes.some(node=>node.ifProp==='children')) throw new Error(`GPUI_UNSUPPORTED_CONTENT_GUARD: ${ir.name}`);
 const slotVariants = slots.map(name => {
  if (!/^[a-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*$/.test(name)) throw new Error(`GPUI_UNSUPPORTED_SLOT_IDENTIFIER: ${ir.name}.${name}`);
  const value=name.split(/[-_]/).map(word => word[0]!.toUpperCase()+word.slice(1)).join('');
  if(value==='Self') throw new Error(`GPUI_UNSUPPORTED_SLOT_IDENTIFIER: ${ir.name}.${name}`);
  return value;
 });
 if (new Set(slotVariants).size !== slotVariants.length) throw new Error(`GPUI_SLOT_IDENTIFIER_COLLISION: ${ir.name}`);
 const host = control ? nodes.find(node => node.part === control.part.name) : undefined;
 const disabled = host?.bindings.disabled, mixed = host?.propertyBindings.indeterminate;
 if (disabled && (disabled.kind !== 'prop' || disabled.path?.length)) throw new Error(`GPUI_UNSUPPORTED_DISABLED_BINDING: ${ir.name}`);
 if (mixed && (mixed.kind !== 'prop' || mixed.path?.length)) throw new Error(`GPUI_UNSUPPORTED_INDETERMINATE_BINDING: ${ir.name}`);
 const disabledProp = disabled?.kind === 'prop' ? disabled.prop : undefined, mixedProp = mixed?.kind === 'prop' ? mixed.prop : undefined;
 const axes = ir.classRecipe.valueModifiers.filter(axis => ir.variants[axis.propName]?.length).map(axis => ({ ...axis, method: snake(axis.propName), values: ir.variants[axis.propName]! }));
 const textProps = new Set<string>();
 for (const node of nodes) if (node.content && 'kind' in node.content && node.content.kind === 'prop') textProps.add(node.content.prop);
 const boolProps = new Set(ir.classRecipe.booleanModifiers.filter(modifier => ir.styledProps.some(prop => prop.name === modifier.propName)).map(prop => prop.propName));
 for (const node of nodes) if (node.ifProp && node.ifProp !== 'children' && !textProps.has(node.ifProp) && !axes.some(axis=>axis.propName===node.ifProp)) {
  const prop=ir.styledProps.find(prop=>prop.name===node.ifProp);
  const knownBoolean = node.ifProp===control?.channel.valueProp || node.ifProp===disabledProp;
  if(!knownBoolean && prop?.propType.kind!=='boolean' && !(prop?.propType.kind==='fallback' && prop.propType.raw.trim()==='boolean')) throw new Error(`GPUI_UNSUPPORTED_PROP_GUARD: ${ir.name}.${node.ifProp}`);
  boolProps.add(node.ifProp);
 }
 if (mixedProp) boolProps.add(mixedProp);
 if (control) { boolProps.delete(control.channel.valueProp); if (disabledProp) boolProps.delete(disabledProp); }
 const channel = control?.channel, valueMethod = channel ? snake(channel.valueProp) : undefined;
 const defaultMethod = channel?.defaultValueProp ? snake(channel.defaultValueProp) : undefined, disabledMethod = disabledProp ? snake(disabledProp) : undefined;
 const realized = new Set<string | undefined>([channel?.valueProp,channel?.defaultValueProp,channel?.changeHandlerProp,disabledProp,...axes.map(axis => axis.propName),...boolProps,...textProps]);
 const omitted = new Set(['name','value','ariaLabel','ariaDescribedby','ariaLabelledby','idBase','as','showStatusIcon','decorative','thickness','title','truncate']);
 for (const prop of ir.styledProps) if (!realized.has(prop.name) && !omitted.has(prop.name)) throw new Error(`GPUI_UNSUPPORTED_PROP: ${ir.name}.${prop.name}`);
 const methods = [valueMethod,defaultMethod,disabledMethod,...axes.map(axis => axis.method),...Array.from(boolProps).map(snake),...Array.from(textProps).map(snake)].filter(Boolean);
 if (new Set(methods).size !== methods.length) throw new Error(`GPUI_IDENTIFIER_COLLISION: ${ir.name}`);
 if (!/^[A-Z][A-Za-z0-9]*$/.test(ir.name)) throw new Error(`GPUI_UNSUPPORTED_IDENTIFIER: ${ir.name}`);
 return { channel,part:control?.part.name,valueMethod,defaultMethod,disabledMethod,mixedProp,axes,boolProps:Array.from(boolProps),textProps:Array.from(textProps),childContent,slots,slotVariants,defaultValue:booleanDefault(ir,channel?.defaultValueProp),disabledDefault:booleanDefault(ir,disabledProp),keys:control?.activationKeys ?? [],excludedProps:ir.styledProps.filter(prop => !realized.has(prop.name)).map(prop => prop.name),omissions:[] };
}
export function gpuiStylePlan(ir: ComponentIR): GpuiStylePlan {
 if (!ir.nativeStyleRules) throw new Error(`GPUI_MISSING_STYLE_FACTS: ${ir.name}`);
 const omissions: Array<{ sourceKey:string; property?:string; reason:string }> = ir.nativeStyleRules.unsupported.slice();
 const admittedPredicates = new Set(['variant','checked','disabled','indeterminate','hover','active','focus']);
 const rules: NativeStyleRuleIR[] = ir.nativeStyleRules.rules.filter(rule => {
  const unsupported = rule.predicates.find(predicate => !admittedPredicates.has(predicate.kind));
  if (!unsupported) return true;
  for (const declaration of rule.declarations) omissions.push({sourceKey:rule.sourceKey,property:declaration.property,reason:`predicate ${unsupported.kind} has no admitted GPUI state carrier`});
  return false;
 }).map(rule => ({ ...rule, declarations:rule.declarations.flatMap(decl => {
  if (rule.predicates.some(predicate => 'ownerPart' in predicate && predicate.ownerPart && !['root',ir.formControl?.part.name].includes(predicate.ownerPart))) { omissions.push({sourceKey:rule.sourceKey,property:decl.property,reason:'predicate owner has no admitted native event carrier'}); return []; }
  if (decl.property.includes('.')) return [decl];
  if (!supported.has(decl.property)) { omissions.push({sourceKey:rule.sourceKey,property:decl.property,reason:'property outside GPUI admitted style vocabulary'}); return []; }
  if (decl.value.includes('var(') || decl.value.includes('calc(') || decl.value.includes('clamp(')) { omissions.push({sourceKey:rule.sourceKey,property:decl.property,reason:'expression has no normalized scalar realization'}); return []; }
  if (!validScalar(decl,!!rule.pseudo)) { if (decl.property === 'text-align' && decl.value === 'justify' || decl.value === 'fit-content') { omissions.push({sourceKey:rule.sourceKey,property:decl.property,reason:'GPUI has no admitted realization for this intrinsic/alignment value'}); return []; } throw new Error(`GPUI_UNSUPPORTED_STYLE_VALUE: ${ir.name}.${rule.sourceKey}.${decl.property}=${decl.value}`); }
  return decl.designSlot ? [{property:decl.designSlot,value:decl.value,...(decl.token?{token:decl.token}:{})},{...decl,token:decl.designSlot}] : [decl];
 }) }));
 // Every possible scoped definition in a consumer's token closure must be a
 // realizable scalar. Good consumer fallbacks cannot hide malformed overrides.
 const definitions = new Map<string,NativeStyleDeclarationIR[]>();
 for (const rule of rules) for (const decl of rule.declarations) if (decl.property.includes('.')) {
  definitions.set(decl.property,[...(definitions.get(decl.property) ?? []),decl]);
 }
 function validateConsumer(consumer: NativeStyleDeclarationIR, token: string | undefined, pseudo: boolean, visited: string[]): void {
  if (!token || !definitions.has(token)) return;
  if (visited.includes(token)) throw new Error(`GPUI_UNSUPPORTED_TOKEN_CYCLE: ${ir.name}.${token}`);
  for (const definition of definitions.get(token)!) {
   if (!validScalar({...consumer,value:definition.value},pseudo)) throw new Error(`GPUI_UNSUPPORTED_STYLE_VALUE: ${ir.name}.${token}=${definition.value}`);
   validateConsumer(consumer,definition.token,pseudo,[...visited,token]);
  }
 }
 for (const rule of rules) for (const decl of rule.declarations) if (!decl.property.includes('.')) validateConsumer(decl,decl.token,!!rule.pseudo,[]);
 return {rules,omissions};
}
function rustRules(rules: NativeStyleRuleIR[]): string {
 return rules.map(rule => `StyleRule {part:${q(rule.part+(rule.pseudo?'::'+rule.pseudo:''))},conditions:&[${rule.predicates.map(predicate => predicate.kind === 'variant' ? `StyleCondition::Variant {axis:${q(predicate.axis)},value:${q(predicate.value)}}` : ['hover','active','focus'].includes(predicate.kind) ? `StyleCondition::${predicate.kind[0]!.toUpperCase()+predicate.kind.slice(1)}` : `StyleCondition::${predicate.kind[0]!.toUpperCase()+predicate.kind.slice(1)}(${(predicate as {value:boolean}).value})`).join(',')}],declarations:&[${rule.declarations.map(decl => `StyleDeclaration {property:${q(decl.property)},value:${q(decl.value)},token:${decl.token?'Some('+q(decl.token)+')':'None'}}`).join(',')}]}`).join(',\n');
}
type Plan = ReturnType<typeof gpuiPlan>;
type Styles = ReturnType<typeof gpuiStylePlan>;
function guard(plan: Plan, node: DomNodeIR): string | undefined {
 let condition: string | undefined;
 if (node.ifSlot) {
  const index = plan.slots.indexOf(node.ifSlot);
  if (index < 0) throw new Error(`GPUI_UNSUPPORTED_SLOT_GUARD: ${node.ifSlot}`);
  condition = `self.has_slot(Self::slot_key(${q(node.ifSlot)}))`;
 } else if (node.ifProp === 'children') condition = 'self.has_content()';
 else if(node.ifProp && node.ifProp===plan.channel?.valueProp) condition='self.state.value()';
 else if(node.ifProp && snake(node.ifProp)===plan.disabledMethod) condition='self.state.disabled';
 else if(node.ifProp && plan.axes.some(axis=>axis.propName===node.ifProp)) condition=`self.variant_values.get(${q(node.ifProp)}).is_some_and(|value|!value.is_empty())`;
 else if (node.ifProp) condition = plan.textProps.includes(node.ifProp) ? `!self.${snake(node.ifProp)}.is_empty()` : `self.${snake(node.ifProp)}`;
 return condition && (node.ifNegated ? `!(${condition})` : condition);
}
function tree(ir: ComponentIR, plan: Plan, styles: Styles, node: DomNodeIR): string {
 const part = node.part ?? 'root';
 let result = `apply_part_style(div(),${q(part)},Self::STYLE_RULES,&style_state,&theme).debug_selector(||${q(ir.cssPrefix+'-'+part)}.to_string())`;
 if (node.content && 'kind' in node.content) {
  if (node.content.kind === 'prop') result += `.child(self.${snake(node.content.prop)}.clone())`;
  else if (node.content.kind === 'literal') result += `.child(${q(node.content.value)})`;
  else throw new Error(`GPUI_UNSUPPORTED_CONTENT: ${ir.name}.${part}`);
 }
 for (const child of node.children) {
  if (plan.channel && child.part === plan.part && child.tag === 'input') continue;
  const condition = guard(plan,child);
  let insertion: string;
  if (child.tag === 'children' || child.tag === 'slot' && !child.slotName) insertion = '.children(self.render_content(window,cx))';
  else if (child.tag === 'slot') insertion = `.children(self.render_slot(Self::slot_key(${q(child.slotName!)}),window,cx))`;
  else insertion = `.child(${tree(ir,plan,styles,child)})`;
  result += condition ? `.when(${condition},|node|node${insertion})` : insertion;
 }
 for (const pseudo of ['before','after']) if (styles.rules.some(rule => rule.part === part && rule.pseudo === pseudo)) result += `.child(render_pseudo(${q(part+'::'+pseudo)},Self::STYLE_RULES,&style_state,&theme))`;
 if (node === ir.dom && !node.content && node.tag !== 'hr' && (!node.children.length || plan.channel && !nodesOf(ir).some(child=>child.tag==='children'||child.tag==='slot'))) result += labelChild(ir);
 return result;
}
/** Consumer-supplied native label, with no fabricated default or a11y claim. */
function labelChild(ir: ComponentIR): string {
 return `.when(!self.label.is_empty(),|node|node.child(div().debug_selector(||${q(ir.cssPrefix+'-label')}.to_string()).child(self.label.clone())))`;
}
function source(ir: ComponentIR, plan: Plan, styles: Styles): string {
 const nativeContent = plan.childContent || plan.slots.length > 0;
 const slotType = `${ir.name}Slot`;
 const slotEnum = plan.slots.length ? `#[derive(Clone,Copy,Debug,PartialEq,Eq,PartialOrd,Ord)]\npub enum ${slotType}{${plan.slotVariants.join(',')}}` : '';
 const contentMethods = plan.childContent ? `
 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||${q(ir.cssPrefix+'-label')}.to_string()).child(self.label.clone()).into_any_element()]}}
 }
 ` : '';
 const slotMethods = plan.slots.length ? `
 pub fn slot(mut self,key:${slotType},value:NativeContent)->Self{self.slots.insert(key,value);self}
 pub fn set_slot(&mut self,key:${slotType},value:NativeContent,cx:&mut Context<Self>){self.slots.insert(key,value);cx.notify();}
 pub fn clear_slot(&mut self,key:${slotType},cx:&mut Context<Self>){self.slots.remove(&key);cx.notify();}
 pub fn has_slot(&self,key:${slotType})->bool{self.slots.get(&key).is_some_and(NativeContent::is_present)}
 fn render_slot(&self,key:${slotType},window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{self.slots.get(&key).map(|content|content.render(window,cx)).unwrap_or_default()}
 fn slot_key(name:&str)->${slotType}{match name{${plan.slots.map((name,index)=>`${q(name)}=>${slotType}::${plan.slotVariants[index]},`).join('')}_=>unreachable!("generated slot key")}}
 ` : '';
 const fields = [...plan.boolProps.map(name=>`pub ${snake(name)}:bool,`),...plan.textProps.map(name=>`pub ${snake(name)}:SharedString,`)];
 const initial = [...plan.boolProps.map(name=>`${snake(name)}:${booleanDefault(ir,name)},`),...plan.textProps.map(name=>`${snake(name)}:SharedString::default(),`)];
 const axisDefaults = plan.axes.map(axis => { const expr=axis.defaultExpr??'""'; let value; try { value=JSON.parse(expr); } catch { throw new Error(`GPUI_UNSUPPORTED_DEFAULT: ${ir.name}.${axis.propName}`); } if (typeof value!=='string'||value&&!axis.values.includes(value)) throw new Error(`GPUI_UNSUPPORTED_DEFAULT: ${ir.name}.${axis.propName}`); return `variants.insert(${q(axis.propName)},${q(value)}.into());`; }).join('\n');
 const axisMethods = plan.axes.map(axis=>`pub fn ${axis.method}(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!([${[...axis.values,...(axis.defaultExpr===undefined||axis.defaultExpr==='""'?['']:[])].map(q).join(',')}].contains(&value.as_ref()),"unsupported ${axis.propName} variant");self.variant_values.insert(${q(axis.propName)},value);self}\npub fn set_${axis.method}(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!([${[...axis.values,...(axis.defaultExpr===undefined||axis.defaultExpr==='""'?['']:[])].map(q).join(',')}].contains(&value.as_ref()),"unsupported ${axis.propName} variant");self.variant_values.insert(${q(axis.propName)},value);cx.notify();}`).join('\n');
 const fieldMethods = [...plan.boolProps.map(name=>`pub fn ${snake(name)}(mut self,value:bool)->Self {self.${snake(name)}=value;self}\npub fn set_${snake(name)}(&mut self,value:bool,cx:&mut Context<Self>){self.${snake(name)}=value;cx.notify();}`),...plan.textProps.map(name=>`pub fn ${snake(name)}(mut self,value:impl Into<SharedString>)->Self {self.${snake(name)}=value.into();self}\npub fn set_${snake(name)}(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.${snake(name)}=value.into();cx.notify();}`)].join('\n');
 const controls = plan.channel ? `
 pub const CHANNEL:&'static str=${q(plan.channel.name)};
 pub const CHANGE_HANDLER:&'static str=${q(plan.channel.changeHandlerProp)};
 pub const CONTROL_PART:&'static str=${q(plan.part!)};
 pub const ACTIVATION_KEYS:&'static [&'static str]=&[${plan.keys.map(key=>q(key==='Space'?'space':'enter')).join(',')}];
 pub fn ${plan.valueMethod}(mut self,value:Option<bool>)->Self {self.state.controlled=value;self}
 pub fn set_${plan.valueMethod}(&mut self,value:Option<bool>,cx:&mut Context<Self>){self.state.controlled=value;cx.notify();}
 ${plan.defaultMethod?`pub fn ${plan.defaultMethod}(mut self,value:bool)->Self {let controlled=self.state.controlled;let disabled=self.state.disabled;self.state=BooleanState::new(value);self.state.controlled=controlled;self.state.disabled=disabled;self}`:''}
 ${plan.disabledMethod?`pub fn ${plan.disabledMethod}(mut self,value:bool)->Self {self.state.disabled=value;self}\npub fn set_${plan.disabledMethod}(&mut self,value:bool,cx:&mut Context<Self>){self.state.disabled=value;cx.notify();}`:''}
 pub fn request_change(&mut self)->Option<ChangeRequest>{self.state.request_toggle().map(|value|ChangeRequest{channel:Self::CHANNEL,handler:Self::CHANGE_HANDLER,value})}
 pub fn request_key(&mut self,key:&str)->Option<ChangeRequest>{if Self::ACTIVATION_KEYS.contains(&key){self.request_change()}else{None}}
 ` : '';
 return `// Generated from ${ir.name} normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle${plan.channel?',EventEmitter,MouseButton,Subscription':''}};
${nativeContent?'use crate::content::NativeContent;':''}
${plan.channel?'use crate::control::{BooleanState,ChangeRequest};':''}
use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style${styles.rules.some(rule=>rule.pseudo)?',render_pseudo':''}};
${slotEnum}
pub struct ${ir.name}{${plan.channel?'pub state:BooleanState,pub hovered:bool,pub active:bool,_focus_subscriptions:Vec<Subscription>,':''}${plan.childContent?'content:Option<NativeContent>,':''}${plan.slots.length?`slots:BTreeMap<${slotType},NativeContent>,`:''}pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,${fields.join('')}}
impl Default for ${ir.name}{fn default()->Self {let mut variants=BTreeMap::new();${axisDefaults}${plan.channel?`let mut state=BooleanState::new(${plan.defaultValue});state.disabled=${plan.disabledDefault};`:''}Self{${plan.channel?'state,hovered:false,active:false,_focus_subscriptions:Vec::new(),':''}${plan.childContent?'content:None,':''}${plan.slots.length?'slots:BTreeMap::new(),':''}label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,${initial.join('')}}}}
impl ${ir.name}{
 pub const STYLE_RULES:&'static [StyleRule]=&[${rustRules(styles.rules)}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:${plan.channel?'self.state.value()':'false'},disabled:${plan.channel?'self.state.disabled':plan.disabledMethod?'self.'+plan.disabledMethod:'false'},indeterminate:${plan.mixedProp?'self.'+snake(plan.mixedProp):'false'},hovered:${plan.channel?'self.hovered':'false'},active:${plan.channel?'self.active':'false'},focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 ${axisMethods}\n${fieldMethods}\n${controls}\n${contentMethods}\n${slotMethods}
}
${plan.channel?`impl EventEmitter<ChangeRequest> for ${ir.name}{}`:''}
impl Render for ${ir.name}{fn render(&mut self,window:&mut Window,${plan.channel||nativeContent?'cx':'_cx'}:&mut Context<Self>)->impl IntoElement{
 ${nativeContent?`NativeContent::assert_unique_views(${plan.childContent?'self.content.iter()':''}${plan.childContent&&plan.slots.length?'.chain(self.slots.values())':plan.slots.length?'self.slots.values()':''});`:''}
 ${guard(plan,ir.dom!)?`if !(${guard(plan,ir.dom!)}){return gpui::Empty.into_any_element();}`:''}
 ${plan.channel?'if self.focus_handle.is_none(){let handle=cx.focus_handle();self._focus_subscriptions.push(cx.on_focus(&handle,window,|_,_,cx|cx.notify()));self._focus_subscriptions.push(cx.on_blur(&handle,window,|_,_,cx|cx.notify()));self.focus_handle=Some(handle);}self.focus_handle=self.focus_handle.take().map(|handle|handle.tab_index(0).tab_stop(!self.state.disabled));':''}
 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:${plan.channel?'self.state.value()':'false'},disabled:${plan.channel?'self.state.disabled':plan.disabledMethod?'self.'+plan.disabledMethod:'false'},indeterminate:${plan.mixedProp?'self.'+snake(plan.mixedProp):'false'},hovered:${plan.channel?'self.hovered':'false'},active:${plan.channel?'self.active':'false'},focused:self.focused};
 let root=${tree(ir,plan,styles,ir.dom!)}.id(${q(ir.cssPrefix)});
 let root=apply_interaction_style(root,${q(ir.dom!.part ?? 'root')},Self::STYLE_RULES,&style_state,&theme);
 ${plan.channel?`let root=root.track_focus(self.focus_handle.as_ref().unwrap()).tab_index(0).tab_stop(!self.state.disabled).on_hover(cx.listener(|this,hovered,_,cx|{this.hovered=*hovered;cx.notify();})).on_mouse_down(MouseButton::Left,cx.listener(|this,_,window,cx|{cx.stop_propagation();if !this.state.disabled {this.active=true;window.focus(this.focus_handle.as_ref().unwrap(),cx);cx.notify();}})).on_mouse_up(MouseButton::Left,cx.listener(|this,_,_,cx|{this.active=false;cx.notify();})).on_mouse_up_out(MouseButton::Left,cx.listener(|this,_,_,cx|{this.active=false;cx.notify();})).on_click(cx.listener(|this,event,_,cx|{if matches!(event,gpui::ClickEvent::Mouse(_)){cx.stop_propagation();if let Some(request)=this.request_change(){cx.emit(request);cx.notify();}}})).on_key_down(cx.listener(|this,event,window,cx|{if this.focus_handle.as_ref().is_some_and(|handle|handle.is_focused(window)) && crate::view::is_activation_key(event,Self::ACTIVATION_KEYS.contains(&"enter")){cx.stop_propagation();if let Some(request)=this.request_change(){cx.emit(request);cx.notify();}}}));`:''}
 root.into_any_element()
}}
`;
}
const RUST_KEYWORDS = new Set(['as','break','const','continue','crate','dyn','else','enum','extern','false','fn','for','if','impl','in','let','loop','match','mod','move','mut','pub','ref','return','self','static','struct','super','trait','true','type','unsafe','use','where','while','async','await']);
/** Module identifier for the generated barrel. The prop RESERVED set is about
 * member names (`label`, `content`) which are legal module names; only Rust
 * keywords and malformed names are refused here. */
function moduleSnake(name: string): string {
 const value = name.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
 if (!/^[a-z][a-z0-9_]*$/.test(value) || RUST_KEYWORDS.has(value)) throw new Error(`GPUI_UNSUPPORTED_MODULE_IDENTIFIER: ${name}`);
 return value;
}

/** Refusals the generic anatomy projection may take over. Strictness the
 * bounded planners keep is untouched: a style-value defect on an admitted shape
 * still fails generation, it does not silently become an omission. */
const SHAPE_REFUSALS = [
 'GPUI_UNSUPPORTED_SHAPE','GPUI_UNSUPPORTED_ROOT_INSERTION','GPUI_UNSUPPORTED_PROP','GPUI_UNSUPPORTED_DEFAULT',
 'GPUI_UNSUPPORTED_CHANNEL','GPUI_UNSUPPORTED_ACTIVATION_HOST','GPUI_UNSUPPORTED_CONTENT_GUARD','GPUI_UNSUPPORTED_CONTENT',
 'GPUI_UNSUPPORTED_SLOT_IDENTIFIER','GPUI_SLOT_IDENTIFIER_COLLISION','GPUI_UNSUPPORTED_PROP_GUARD',
 'GPUI_UNSUPPORTED_IDENTIFIER','GPUI_IDENTIFIER_COLLISION','GPUI_DUPLICATE_CONTENT_PLACEMENT',
 'GPUI_UNSUPPORTED_DISABLED_BINDING','GPUI_UNSUPPORTED_INDETERMINATE_BINDING','GPUI_UNSUPPORTED_SLOT_GUARD',
];
function isShapeRefusal(error: unknown): boolean {
 const message = error instanceof Error ? error.message : String(error);
 return SHAPE_REFUSALS.some(code => message.startsWith(`${code}:`));
}
/** Bounded projection: the control/static shapes the strict planners admit. */
function boundedFiles(ir: ComponentIR, plan: GpuiPlan, styles: GpuiStylePlan) {
 return [
  {relativePath:`${ir.name}/${ir.name}.rs`,contents:source(ir,plan,styles).replace(/[\t ]+$/gm,'')},
  {relativePath:`${ir.name}/capabilities.json`,contents:JSON.stringify({operation:plan.channel?'boolean-control':'static-anatomy',channel:plan.channel,controlPart:plan.part,activationKeys:plan.keys,defaultContent:plan.childContent,namedSlots:plan.slots,excludedProps:plan.excludedProps,narrowedTextProps:plan.textProps,styleOmissions:styles.omissions,styleSource:'shared authored Web vocabulary projected into GPUI; source platform restrictions retained',realized:['part-tree','scoped-token-cascade','variant-builders','mounted-variant-setters','design-slot-overrides',...(plan.childContent?['retained-native-children','explicit-content-label-fallback']:[]),...(plan.slots.length?['typed-named-slots','slot-presence-guards']:[]),...(plan.channel?['controlled-uncontrolled-request-policy','native-host-key-activation','persistent-focus','disabled-suppression']:[])],omissions:['accessibility','form-submission','field-association','motion','compound-composition','duplicate-view-placement','complete-cross-platform-parity'],proof:'requires-real-gpui-engine-tests-and-render-witness; outside-admission-rail'},null,2)+'\n'},
 ];
}
/** Generic anatomy projection: every corpus shape, bounded and omission-bearing. */
function anatomyFiles(ir: ComponentIR) {
 const { ir: projected, plan } = gpuiAnatomyPlan(ir);
 const styles = gpuiAnatomyStylePlan(ir);
 const omitted = plan.omissions;
 const capabilities = {
  operation:'generic-anatomy',
  channel:null,
  controlPart:null,
  activationKeys:[],
  defaultContent:plan.childContent,
  namedSlots:plan.slots,
  excludedProps:plan.excludedProps,
  narrowedTextProps:plan.textProps,
  realizedVariants:plan.axes.map(axis=>axis.propName),
  realizedBooleanProps:plan.boolProps,
  styleOmissions:styles.omissions,
  styleSource:'shared authored Web vocabulary projected into GPUI; source platform restrictions retained',
  realized:['part-tree','scoped-token-cascade','variant-builders','mounted-variant-setters','design-slot-overrides',...(plan.childContent?['retained-native-children','explicit-content-label-fallback']:[]),...(plan.slots.length?['typed-named-slots','slot-presence-guards']:[]),...(plan.boolProps.length||plan.textProps.length?['static-value-fields']:[])],
  omittedFacts:omitted,
  omittedFactKinds:[...new Set(omitted.map(omission=>omission.kind))].sort(),
  omissions:['control-semantics','accessibility','form-submission','field-association','motion','compound-composition','overlay-behaviour','iteration','content-transform','glyph-rendering','duplicate-view-placement','complete-cross-platform-parity'],
  proof:'requires-real-gpui-engine-tests-and-render-witness; outside-admission-rail',
 };
 return [
  {relativePath:`${ir.name}/${ir.name}.rs`,contents:source(projected,plan,styles).replace(/[\t ]+$/gm,'')},
  {relativePath:`${ir.name}/capabilities.json`,contents:JSON.stringify(capabilities,null,2)+'\n'},
 ];
}
/** The planner family that admits this component, used by the mount witness. */
function planFor(ir: ComponentIR): GpuiPlan {
 try { return gpuiPlan(ir); }
 catch (error) { if (!isShapeRefusal(error)) throw error; return gpuiAnatomyPlan(ir).plan; }
}

/**
 * Generated mount witness.
 *
 * Every admitted component gets one so `cargo test` proves the generated view
 * actually constructs and renders — compilation alone does not. The witness is
 * deliberately bounded: it mounts the default view with every realized boolean
 * set true (so presence guards can pass), renders it in GPUI's test window and,
 * unless the contract's own root guard makes the default view legitimately
 * empty, asserts the root part reached layout. It does not claim interaction,
 * styling correctness or pixels; the hand-written interaction witnesses cover
 * the bounded controls.
 */
function mountWitness(ir: ComponentIR, plan: GpuiPlan): string {
 const rootPart = ir.dom?.part ?? 'root';
 const selector = `${ir.cssPrefix}-${rootPart}`;
 const setters = plan.boolProps.map(name => `.${snake(name)}(true)`).join('');
 const rootGuard = ir.dom?.ifProp === 'children' || (ir.dom?.ifSlot && plan.slots.length > 0);
 const assertion = rootGuard
  ? `    // The contract guards the root on consumer-supplied content; this witness\n    // proves the default view renders without panicking.\n    cx.run_until_parked();`
  : `    cx.run_until_parked();\n    assert!(cx.debug_bounds(${q(selector)}).is_some(), "generated ${ir.name} root part must reach layout");`;
 return `// Generated mount witness for ${ir.name}. Do not hand-edit.
#[gpui::test]
fn mounts(cx: &mut gpui::TestAppContext) {
    let (_view, cx) = cx.add_window_view(|_, _| super::${ir.name}::default()${setters});
${assertion}
}
`;
}

export function createGpuiEmitter(): FrameworkEmitter {
 return { id:'gpui', discoverComponentIds:root=>fs.existsSync(root)?fs.readdirSync(root).filter(name=>fs.existsSync(path.join(root,name,`${name}.rs`))).sort():[],
  emitComponent(ir) {
   let plan: GpuiPlan;
   try { plan = gpuiPlan(ir); }
   catch (error) { if (!isShapeRefusal(error)) throw error; return anatomyFiles(ir); }
   const styles = gpuiStylePlan(ir);
   return boundedFiles(ir, plan, styles);
  }, emitTests(ir) { return [{relativePath:`${ir.name}/${ir.name}.test.rs`,contents:mountWitness(ir, planFor(ir))}]; },
  emitBarrel:names=>names.slice().sort().map(name=>`#[path = "${name}/${name}.rs"]\nmod ${moduleSnake(name)};\npub use ${moduleSnake(name)}::*;`).join('\n')+'\n'
   + names.slice().sort().map(name=>`#[cfg(test)]\n#[path = "${name}/${name}.test.rs"]\nmod ${moduleSnake(name)}_mount;`).join('\n')+'\n' };
}
