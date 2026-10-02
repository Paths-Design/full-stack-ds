import fs from 'node:fs';
import path from 'node:path';
import type { FrameworkEmitter } from '../../emitter.js';
import type { ComponentIR, DomNodeIR } from '../../ir.js';
import type { NativeStyleDeclarationIR, NativeStyleRuleIR } from '../../native-style-rules.js';
/** Encode characters directly so literal backslash sequences stay literal. */
function q(value: string): string {
 const escapes: Record<string,string> = {'\\':'\\\\','"':'\\"','\n':'\\n','\r':'\\r','\t':'\\t'};
 return '"' + Array.from(value).map(character => escapes[character] ?? ((character.codePointAt(0)! < 32 || character.codePointAt(0) === 127) ? `\\u{${character.codePointAt(0)!.toString(16)}}` : character)).join('') + '"';
}
const RESERVED = new Set(['self','super','crate','type','mod','fn','match','default','new','request_change','theme','variants','label','focus_handle','request_key']);
function snake(name: string): string {
 const value = name.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase();
 if (!/^[a-z][a-z0-9_]*$/.test(value) || RESERVED.has(value)) throw new Error(`GPUI_UNSUPPORTED_IDENTIFIER: ${name}`);
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
export function gpuiPlan(ir: ComponentIR) {
 const nodes = nodesOf(ir), control = ir.formControl;
 if (!ir.dom || ir.surface || ir.interaction || ir.compositeControl || ir.pagedSet || ir.motion.sequence || nodes.some(node => node.componentRef || node.iteration || node.iconGlyph || node.cssVarBindings.length || node.content && 'transform' in node.content)) throw new Error(`GPUI_UNSUPPORTED_SHAPE: ${ir.name}`);
 if (control && (control.valueModel !== 'boolean' || !['change','activation'].includes(control.commit))) throw new Error(`GPUI_UNSUPPORTED_SHAPE: ${ir.name}`);
 if (control && (control.channel.valueType !== 'boolean' || control.channel.callbackKind !== 'value' || control.channel.enabledByProp || ir.behavior.normalizedChannels.length !== 1)) throw new Error(`GPUI_UNSUPPORTED_CHANNEL: ${ir.name}`);
 if (control && !control.activationKeys?.length) throw new Error(`GPUI_UNSUPPORTED_ACTIVATION_HOST: ${ir.name}`);
 if (!control && (ir.behavior.normalizedChannels.length || nodes.some(node => Object.keys(node.events).length))) throw new Error(`GPUI_UNSUPPORTED_SHAPE: ${ir.name}`);
 const host = control ? nodes.find(node => node.part === control.part.name) : undefined;
 const disabled = host?.bindings.disabled, mixed = host?.propertyBindings.indeterminate;
 if (disabled && (disabled.kind !== 'prop' || disabled.path?.length)) throw new Error(`GPUI_UNSUPPORTED_DISABLED_BINDING: ${ir.name}`);
 if (mixed && (mixed.kind !== 'prop' || mixed.path?.length)) throw new Error(`GPUI_UNSUPPORTED_INDETERMINATE_BINDING: ${ir.name}`);
 const disabledProp = disabled?.kind === 'prop' ? disabled.prop : undefined, mixedProp = mixed?.kind === 'prop' ? mixed.prop : undefined;
 const axes = ir.classRecipe.valueModifiers.filter(axis => ir.variants[axis.propName]?.length).map(axis => ({ ...axis, method: snake(axis.propName), values: ir.variants[axis.propName]! }));
 const textProps = new Set<string>();
 for (const node of nodes) if (node.content && 'kind' in node.content && node.content.kind === 'prop') textProps.add(node.content.prop);
 const boolProps = new Set(ir.classRecipe.booleanModifiers.filter(modifier => ir.styledProps.some(prop => prop.name === modifier.propName)).map(prop => prop.propName));
 for (const node of nodes) if (node.ifProp && node.ifProp !== 'children' && !textProps.has(node.ifProp)) boolProps.add(node.ifProp);
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
 return { channel,part:control?.part.name,valueMethod,defaultMethod,disabledMethod,mixedProp,axes,boolProps:Array.from(boolProps),textProps:Array.from(textProps),defaultValue:booleanDefault(ir,channel?.defaultValueProp),disabledDefault:booleanDefault(ir,disabledProp),keys:control?.activationKeys ?? [],excludedProps:ir.styledProps.filter(prop => !realized.has(prop.name)).map(prop => prop.name) };
}
const supported = new Set(['background-color','color','border-color','border-width','border-style','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top','border-radius','width','height','min-width','min-height','max-width','max-height','padding','padding-block','padding-inline','padding-top','padding-right','padding-bottom','padding-left','padding-block-start','padding-block-end','padding-inline-start','padding-inline-end','margin','margin-top','margin-right','margin-bottom','margin-left','gap','row-gap','column-gap','font-size','font-weight','font-family','line-height','opacity','display','position','top','right','bottom','left','align-items','align-self','justify-content','flex-direction','flex-grow','flex-shrink','overflow','text-align','white-space','text-overflow','translate','transform','outline-width','outline-color','outline-style','outline-offset','box-sizing']);
const dimension = /^-?(?:0(?:\.0+)?|(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%))$/;
const absoluteDimension = (value: string): boolean => dimension.test(value) && !value.endsWith('%') && Number.isFinite(parseFloat(value));
function validScalar(decl: NativeStyleDeclarationIR, pseudo: boolean): boolean {
 const p = decl.property, value = decl.value.trim();
 if (p.endsWith('color') || p === 'background-color') {
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || ['transparent','white','black'].includes(value)) return true;
  const rgb = /^(rgb|rgba)\(([^)]+)\)$/.exec(value);
  if (!rgb) return false;
  const values = rgb[2]!.split(',').map(part=>part.trim());
  return values.length === (rgb[1] === 'rgba' ? 4 : 3) && values.every((part,index)=>/^\d+(?:\.\d+)?$/.test(part) && Number.isFinite(Number(part)) && Number(part) <= (index === 3 ? 1 : 255));
 }
 if (['width','height','min-width','min-height','max-width','max-height','top','right','bottom','left'].includes(p)) return value === 'auto' || p === 'width' && value === 'fit-content' || dimension.test(value);
 if (p === 'border-width') { const values=value.split(/\s+/); return values.length >= 1 && values.length <= 4 && values.every(part=>absoluteDimension(part) && !part.startsWith('-')); }
 if (/^(padding|margin|gap|row-gap|column-gap|translate)(-|$)/.test(p)) { const values=value.split(/\s+/); const limit=p==='translate'||['padding-inline','padding-block'].includes(p)?2:['padding','margin'].includes(p)?4:1;return values.length<=limit&&values.every(part => dimension.test(part) || p.startsWith('margin') && part === 'auto'); }
 if (/^border-(top|right|bottom|left)-width$/.test(p)) return absoluteDimension(value) && !value.startsWith('-');
 if (['outline-width','outline-offset','font-size'].includes(p)) return absoluteDimension(value) && (p === 'outline-offset' || !value.startsWith('-'));
 if (p === 'border-radius') return value === '50%' || absoluteDimension(value) && !value.startsWith('-');
 if (p === 'transform') {
  const functions=Array.from(value.matchAll(/([A-Za-z]+)\(([^)]+)\)/g));
  if (!functions.length || functions.map(match=>match[0]).join('').replace(/\s/g,'') !== value.replace(/\s/g,'')) return false;
  return functions.every(match=>match[1]==='rotate' ? pseudo && /^-?\d+(?:\.\d+)?deg$/.test(match[2]!) : ['translate','translateX','translateY'].includes(match[1]!) && match[2]!.split(',').length === (match[1]==='translate'?2:1) && match[2]!.split(',').every(part=>dimension.test(part.trim()) && !/\dem$/.test(part.trim())));
 }
 if (p === 'font-weight') return ['normal','bold'].includes(value) || /^\d+(?:\.\d+)?$/.test(value) && Number(value) >= 1 && Number(value) <= 1000;
 if (['flex-grow','flex-shrink','opacity'].includes(p)) return /^\d+(?:\.\d+)?$/.test(value) && (p !== 'opacity' || Number(value) <= 1);
 if (p === 'line-height') return (/^\d+(?:\.\d+)?$/.test(value) || dimension.test(value)) && !value.startsWith('-');
 const enums: Record<string,string[]> = {display:['flex','inline-flex','block','inline-block','none'],position:['relative','absolute'], 'align-items':['start','end','flex-start','flex-end','center','baseline','stretch'],'align-self':['start','end','flex-start','flex-end','center','stretch'], 'justify-content':['start','end','flex-start','flex-end','center','space-between','space-around'], 'flex-direction':['row','column','row-reverse','column-reverse'],overflow:['hidden','visible','scroll'],'text-align':['left','right','start','end','center'],'white-space':['normal','nowrap'],'text-overflow':['ellipsis'],'border-style':['solid','none'],'outline-style':['solid','none'],'box-sizing':['border-box']};
 if (p.endsWith('-style')) return ['solid','none'].includes(value);
 if (p === 'border-top') return value === 'none';
 return !enums[p] || enums[p]!.includes(value);
}
export function gpuiStylePlan(ir: ComponentIR) {
 if (!ir.nativeStyleRules) throw new Error(`GPUI_MISSING_STYLE_FACTS: ${ir.name}`);
 const omissions: Array<{ sourceKey:string; property?:string; reason:string }> = ir.nativeStyleRules.unsupported.slice();
 const rules: NativeStyleRuleIR[] = ir.nativeStyleRules.rules.map(rule => ({ ...rule, declarations:rule.declarations.flatMap(decl => {
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
  if (child.tag === 'children' || child.tag === 'slot') { result += labelChild(ir); continue; }
  const expression = tree(ir,plan,styles,child);
  if (child.ifProp && child.ifProp !== 'children') {
   const guard = plan.textProps.includes(child.ifProp) ? `${child.ifNegated?'':'!'}self.${snake(child.ifProp)}.is_empty()` : `${child.ifNegated?'!':''}self.${snake(child.ifProp)}`;
   result += `.when(${guard},|node|node.child(${expression}))`;
  } else result += `.child(${expression})`;
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
 const fields = [...plan.boolProps.map(name=>`pub ${snake(name)}:bool,`),...plan.textProps.map(name=>`pub ${snake(name)}:SharedString,`)];
 const initial = [...plan.boolProps.map(name=>`${snake(name)}:${booleanDefault(ir,name)},`),...plan.textProps.map(name=>`${snake(name)}:SharedString::default(),`)];
 const axisDefaults = plan.axes.map(axis => { const expr=axis.defaultExpr??'""'; let value; try { value=JSON.parse(expr); } catch { throw new Error(`GPUI_UNSUPPORTED_DEFAULT: ${ir.name}.${axis.propName}`); } if (typeof value!=='string'||value&&!axis.values.includes(value)) throw new Error(`GPUI_UNSUPPORTED_DEFAULT: ${ir.name}.${axis.propName}`); return `variants.insert(${q(axis.propName)},${q(value)}.into());`; }).join('\n');
 const axisMethods = plan.axes.map(axis=>`pub fn ${axis.method}(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!([${axis.values.map(q).join(',')}].contains(&value.as_ref()),"unsupported ${axis.propName} variant");self.variant_values.insert(${q(axis.propName)},value);self}\npub fn set_${axis.method}(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!([${axis.values.map(q).join(',')}].contains(&value.as_ref()),"unsupported ${axis.propName} variant");self.variant_values.insert(${q(axis.propName)},value);cx.notify();}`).join('\n');
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
${plan.channel?'use crate::control::{BooleanState,ChangeRequest};':''}
use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style,render_pseudo};
pub struct ${ir.name}{${plan.channel?'pub state:BooleanState,pub hovered:bool,pub active:bool,_focus_subscriptions:Vec<Subscription>,':''}pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,${fields.join('')}}
impl Default for ${ir.name}{fn default()->Self {let mut variants=BTreeMap::new();${axisDefaults}${plan.channel?`let mut state=BooleanState::new(${plan.defaultValue});state.disabled=${plan.disabledDefault};`:''}Self{${plan.channel?'state,hovered:false,active:false,_focus_subscriptions:Vec::new(),':''}label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,${initial.join('')}}}}
impl ${ir.name}{
 pub const STYLE_RULES:&'static [StyleRule]=&[${rustRules(styles.rules)}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:${plan.channel?'self.state.value()':'false'},disabled:${plan.channel?'self.state.disabled':'false'},indeterminate:${plan.mixedProp?'self.'+snake(plan.mixedProp):'false'},hovered:${plan.channel?'self.hovered':'false'},active:${plan.channel?'self.active':'false'},focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 ${axisMethods}\n${fieldMethods}\n${controls}
}
${plan.channel?`impl EventEmitter<ChangeRequest> for ${ir.name}{}`:''}
impl Render for ${ir.name}{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 ${plan.channel?'if self.focus_handle.is_none(){let handle=cx.focus_handle();self._focus_subscriptions.push(cx.on_focus(&handle,window,|_,_,cx|cx.notify()));self._focus_subscriptions.push(cx.on_blur(&handle,window,|_,_,cx|cx.notify()));self.focus_handle=Some(handle);}':''}
 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:${plan.channel?'self.state.value()':'false'},disabled:${plan.channel?'self.state.disabled':'false'},indeterminate:${plan.mixedProp?'self.'+snake(plan.mixedProp):'false'},hovered:${plan.channel?'self.hovered':'false'},active:${plan.channel?'self.active':'false'},focused:self.focused};
 let root=${tree(ir,plan,styles,ir.dom!)}.id(${q(ir.cssPrefix)});
 let root=apply_interaction_style(root,${q(ir.dom!.part ?? 'root')},Self::STYLE_RULES,&style_state,&theme);
 ${plan.channel?`let root=root.track_focus(self.focus_handle.as_ref().unwrap()).tab_index(0).tab_stop(!self.state.disabled).on_hover(cx.listener(|this,hovered,_,cx|{this.hovered=*hovered;cx.notify();})).on_mouse_down(MouseButton::Left,cx.listener(|this,_,window,cx|{if !this.state.disabled {this.active=true;window.focus(this.focus_handle.as_ref().unwrap());cx.notify();}})).on_mouse_up(MouseButton::Left,cx.listener(|this,_,_,cx|{this.active=false;cx.notify();})).on_mouse_up_out(MouseButton::Left,cx.listener(|this,_,_,cx|{this.active=false;cx.notify();})).on_click(cx.listener(|this,_,_,cx|{if let Some(request)=this.request_change(){cx.emit(request);cx.notify();}})).on_key_down(cx.listener(|this,event,_,cx|{if crate::view::is_activation_key(event,Self::ACTIVATION_KEYS.contains(&"enter")){if let Some(request)=this.request_change(){cx.emit(request);cx.notify();cx.stop_propagation();}}}));`:''}
 root
}}
`;
}
export function createGpuiEmitter(): FrameworkEmitter {
 return { id:'gpui', discoverComponentIds:root=>fs.existsSync(root)?fs.readdirSync(root).filter(name=>fs.existsSync(path.join(root,name,`${name}.rs`))).sort():[],
  emitComponent(ir) { const plan=gpuiPlan(ir),styles=gpuiStylePlan(ir); return [
   {relativePath:`${ir.name}/${ir.name}.rs`,contents:source(ir,plan,styles)},
   {relativePath:`${ir.name}/capabilities.json`,contents:JSON.stringify({operation:plan.channel?'boolean-control':'static-anatomy',channel:plan.channel,controlPart:plan.part,activationKeys:plan.keys,excludedProps:plan.excludedProps,narrowedTextProps:plan.textProps,styleOmissions:styles.omissions,styleSource:'shared authored Web vocabulary projected into GPUI; source platform restrictions retained',realized:['part-tree','scoped-token-cascade','variant-builders','mounted-variant-setters','design-slot-overrides',...(plan.channel?['controlled-uncontrolled-request-policy','native-host-key-activation','persistent-focus','disabled-suppression']:[])],omissions:['accessibility','form-submission','field-association','motion','compound-composition','arbitrary-native-children','complete-cross-platform-parity'],proof:'requires-real-gpui-engine-tests-and-render-witness; outside-admission-rail'},null,2)+'\n'},
  ]; }, emitTests:()=>[], emitBarrel:names=>names.slice().sort().map(name=>`#[path = "${name}/${name}.rs"]\nmod ${snake(name)};\npub use ${snake(name)}::${name};`).join('\n')+'\n' };
}
