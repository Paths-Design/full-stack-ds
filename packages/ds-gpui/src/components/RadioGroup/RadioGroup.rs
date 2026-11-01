// Generated from RadioGroup normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};


use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct RadioGroup{pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub name:SharedString,pub aria_label:SharedString,}
impl Default for RadioGroup{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("orientation","vertical".into());Self{label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,name:SharedString::default(),aria_label:SharedString::default(),}}}
impl RadioGroup{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"8px",token:Some("core.spacing.size.04")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"8px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"flex-direction",value:"column",token:None},StyleDeclaration {property:"min-width",value:"0",token:None}]},
StyleRule {part:"item",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None},StyleDeclaration {property:"radio-group.design.item.spacing.gap",value:"8px",token:None},StyleDeclaration {property:"gap",value:"8px",token:Some("radio-group.design.item.spacing.gap")},StyleDeclaration {property:"radio-group.design.item.spacing.padding",value:"6px 10px",token:None},StyleDeclaration {property:"padding",value:"6px 10px",token:Some("radio-group.design.item.spacing.padding")},StyleDeclaration {property:"radio-group.design.item.shape.radius",value:"999px",token:None},StyleDeclaration {property:"border-radius",value:"999px",token:Some("radio-group.design.item.shape.radius")},StyleDeclaration {property:"radio-group.design.item.background.fill",value:"#f7f7f7",token:Some("semantic.color.background.secondary")},StyleDeclaration {property:"background-color",value:"#f7f7f7",token:Some("radio-group.design.item.background.fill")},StyleDeclaration {property:"radio-group.design.item.foreground.color",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"color",value:"#141414",token:Some("radio-group.design.item.foreground.color")}]},
StyleRule {part:"option",conditions:&[],declarations:&[StyleDeclaration {property:"margin",value:"0",token:None},StyleDeclaration {property:"flex-shrink",value:"0",token:None}]},
StyleRule {part:"label",conditions:&[],declarations:&[StyleDeclaration {property:"min-width",value:"0",token:None}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"orientation",value:"horizontal"}],declarations:&[StyleDeclaration {property:"flex-direction",value:"row",token:None}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn orientation(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["vertical","horizontal"].contains(&value.as_ref()),"unsupported orientation variant");self.variant_values.insert("orientation",value);self}
pub fn set_orientation(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["vertical","horizontal"].contains(&value.as_ref()),"unsupported orientation variant");self.variant_values.insert("orientation",value);cx.notify();}
pub fn name(mut self,value:impl Into<SharedString>)->Self {self.name=value.into();self}
pub fn set_name(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.name=value.into();cx.notify();}
pub fn aria_label(mut self,value:impl Into<SharedString>)->Self {self.aria_label=value.into();self}
pub fn set_aria_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.aria_label=value.into();cx.notify();}



}

impl Render for RadioGroup{fn render(&mut self,window:&mut Window,_cx:&mut Context<Self>)->impl IntoElement{



 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"radio-group-root".to_string()).when(!self.label.is_empty(),|node|node.child(div().debug_selector(||"radio-group-label".to_string()).child(self.label.clone()))).id("radio-group");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);

 root.into_any_element()
}}
