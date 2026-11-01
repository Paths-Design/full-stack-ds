// Generated from Field normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};
#[derive(Clone,Copy,Debug,PartialEq,Eq,PartialOrd,Ord)]
pub enum FieldSlot{Label,Control,Help,Error,ValidatingIndicator}
pub struct Field{slots:BTreeMap<FieldSlot,NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub required:bool,pub disabled:bool,pub read_only:bool,pub validating:bool,pub name:SharedString,pub id:SharedString,}
impl Default for Field{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("status","".into());Self{slots:BTreeMap::new(),label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,required:false,disabled:false,read_only:false,validating:false,name:SharedString::default(),id:SharedString::default(),}}}
impl Field{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"8px",token:Some("semantic.input.size.medium.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"field.gap.y",value:"8px",token:Some("semantic.spacing.density.compact.sm")},StyleDeclaration {property:"field.gap.meta",value:"4px",token:Some("core.spacing.size.03")},StyleDeclaration {property:"field.color.fg",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"field.color.invalid-text",value:"#d92d2e",token:Some("semantic.color.foreground.danger")},StyleDeclaration {property:"field.label.fontSize",value:"14px",token:Some("semantic.typography.body.small.font.size")},StyleDeclaration {property:"field.label.color",value:"#474647",token:Some("semantic.color.foreground.secondary")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"8px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"flex-direction",value:"column",token:None},StyleDeclaration {property:"field.design.root.spacing.gap",value:"8px",token:Some("field.gap.y")},StyleDeclaration {property:"gap",value:"8px",token:Some("field.design.root.spacing.gap")}]},
StyleRule {part:"label",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-block",token:None},StyleDeclaration {property:"field.design.label.typography.size",value:"14px",token:Some("field.label.fontSize")},StyleDeclaration {property:"font-size",value:"14px",token:Some("field.design.label.typography.size")},StyleDeclaration {property:"field.design.label.typography.weight",value:"500",token:None},StyleDeclaration {property:"font-weight",value:"500",token:Some("field.design.label.typography.weight")},StyleDeclaration {property:"field.design.label.foreground.color",value:"#474647",token:Some("field.label.color")},StyleDeclaration {property:"color",value:"#474647",token:Some("field.design.label.foreground.color")}]},
StyleRule {part:"header",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"align-items",value:"baseline",token:None},StyleDeclaration {property:"justify-content",value:"space-between",token:None},StyleDeclaration {property:"field.design.header.spacing.gap",value:"4px",token:Some("field.gap.meta")},StyleDeclaration {property:"gap",value:"4px",token:Some("field.design.header.spacing.gap")}]},
StyleRule {part:"control",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"flex-direction",value:"column",token:None},StyleDeclaration {property:"width",value:"100%",token:None},StyleDeclaration {property:"box-sizing",value:"border-box",token:None}]},
StyleRule {part:"help",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"field.design.help.typography.size",value:"0.875em",token:None},StyleDeclaration {property:"font-size",value:"0.875em",token:Some("field.design.help.typography.size")},StyleDeclaration {property:"field.design.help.foreground.color",value:"#141414",token:Some("field.color.fg")},StyleDeclaration {property:"color",value:"#141414",token:Some("field.design.help.foreground.color")}]},
StyleRule {part:"error",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"field.design.error.typography.size",value:"0.875em",token:None},StyleDeclaration {property:"font-size",value:"0.875em",token:Some("field.design.error.typography.size")},StyleDeclaration {property:"field.design.error.foreground.color",value:"#d92d2e",token:Some("field.color.invalid-text")},StyleDeclaration {property:"color",value:"#d92d2e",token:Some("field.design.error.foreground.color")}]},
StyleRule {part:"meta",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"flex-direction",value:"column",token:None},StyleDeclaration {property:"field.design.meta.spacing.gap",value:"4px",token:Some("field.gap.meta")},StyleDeclaration {property:"gap",value:"4px",token:Some("field.design.meta.spacing.gap")}]},
StyleRule {part:"validatingIndicator",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"width",value:"1em",token:None},StyleDeclaration {property:"height",value:"1em",token:None},StyleDeclaration {property:"field.design.validating-indicator.foreground.color",value:"#141414",token:Some("field.color.fg")},StyleDeclaration {property:"color",value:"#141414",token:Some("field.design.validating-indicator.foreground.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"status",value:"idle"}],declarations:&[StyleDeclaration {property:"field.color.fg",value:"#141414",token:Some("semantic.color.foreground.primary")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"status",value:"validating"}],declarations:&[StyleDeclaration {property:"field.color.fg",value:"#474647",token:Some("semantic.color.foreground.secondary")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"status",value:"valid"}],declarations:&[StyleDeclaration {property:"field.color.fg",value:"#497f21",token:Some("semantic.color.foreground.success")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"status",value:"invalid"}],declarations:&[StyleDeclaration {property:"field.color.fg",value:"#d92d2e",token:Some("semantic.color.foreground.danger")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}

 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn status(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["idle","validating","valid","invalid",""].contains(&value.as_ref()),"unsupported status variant");self.variant_values.insert("status",value);self}
pub fn set_status(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["idle","validating","valid","invalid",""].contains(&value.as_ref()),"unsupported status variant");self.variant_values.insert("status",value);cx.notify();}
pub fn required(mut self,value:bool)->Self {self.required=value;self}
pub fn set_required(&mut self,value:bool,cx:&mut Context<Self>){self.required=value;cx.notify();}
pub fn disabled(mut self,value:bool)->Self {self.disabled=value;self}
pub fn set_disabled(&mut self,value:bool,cx:&mut Context<Self>){self.disabled=value;cx.notify();}
pub fn read_only(mut self,value:bool)->Self {self.read_only=value;self}
pub fn set_read_only(&mut self,value:bool,cx:&mut Context<Self>){self.read_only=value;cx.notify();}
pub fn validating(mut self,value:bool)->Self {self.validating=value;self}
pub fn set_validating(&mut self,value:bool,cx:&mut Context<Self>){self.validating=value;cx.notify();}
pub fn name(mut self,value:impl Into<SharedString>)->Self {self.name=value.into();self}
pub fn set_name(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.name=value.into();cx.notify();}
pub fn id(mut self,value:impl Into<SharedString>)->Self {self.id=value.into();self}
pub fn set_id(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.id=value.into();cx.notify();}



 pub fn slot(mut self,key:FieldSlot,value:NativeContent)->Self{self.slots.insert(key,value);self}
 pub fn set_slot(&mut self,key:FieldSlot,value:NativeContent,cx:&mut Context<Self>){self.slots.insert(key,value);cx.notify();}
 pub fn clear_slot(&mut self,key:FieldSlot,cx:&mut Context<Self>){self.slots.remove(&key);cx.notify();}
 pub fn has_slot(&self,key:FieldSlot)->bool{self.slots.get(&key).is_some_and(NativeContent::is_present)}
 fn render_slot(&self,key:FieldSlot,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{self.slots.get(&key).map(|content|content.render(window,cx)).unwrap_or_default()}
 fn slot_key(name:&str)->FieldSlot{match name{"label"=>FieldSlot::Label,"control"=>FieldSlot::Control,"help"=>FieldSlot::Help,"error"=>FieldSlot::Error,"validatingIndicator"=>FieldSlot::ValidatingIndicator,_=>unreachable!("generated slot key")}}

}

impl Render for Field{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.slots.values());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"field-root".to_string()).child(apply_part_style(div(),"header",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"field-header".to_string()).child(apply_part_style(div(),"label",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"field-label".to_string()).children(self.render_slot(Self::slot_key("label"),window,cx)))).child(apply_part_style(div(),"control",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"field-control".to_string()).children(self.render_slot(Self::slot_key("control"),window,cx))).child(apply_part_style(div(),"meta",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"field-meta".to_string()).child(apply_part_style(div(),"help",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"field-help".to_string()).children(self.render_slot(Self::slot_key("help"),window,cx))).child(apply_part_style(div(),"error",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"field-error".to_string()).children(self.render_slot(Self::slot_key("error"),window,cx))).when(self.validating,|node|node.child(apply_part_style(div(),"validatingIndicator",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"field-validatingIndicator".to_string()).children(self.render_slot(Self::slot_key("validatingIndicator"),window,cx))))).id("field");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
