// Generated from Popover normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};


use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Popover{pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub disabled:bool,pub close_on_escape:bool,pub close_on_outside_click:bool,pub close_on_blur:bool,}
impl Default for Popover{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("placement","".into());Self{label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,disabled:false,close_on_escape:true,close_on_outside_click:true,close_on_blur:true,}}}
impl Popover{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"16px",token:Some("semantic.surface.size.padding-block")},StyleDeclaration {property:"box-model.padding-block-end",value:"16px",token:Some("semantic.surface.size.padding-block")},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"16px",token:Some("semantic.surface.size.padding-inline")},StyleDeclaration {property:"box-model.padding-inline-end",value:"16px",token:Some("semantic.surface.size.padding-inline")},StyleDeclaration {property:"box-model.gap",value:"8px",token:Some("semantic.surface.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"64px",token:Some("semantic.surface.size.min-width")},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"popover.size.padding",value:"16px",token:Some("core.spacing.size.06")},StyleDeclaration {property:"popover.size.radius",value:"6px",token:Some("semantic.shape.control.radius.default")},StyleDeclaration {property:"popover.size.gap",value:"8px",token:Some("core.spacing.size.04")},StyleDeclaration {property:"popover.color.background.content",value:"#ffffff",token:Some("semantic.color.background.elevated")},StyleDeclaration {property:"popover.color.border",value:"#d0d0d0",token:Some("semantic.surface.border.subtle")},StyleDeclaration {property:"popover.elevation",value:"0px 8px 10px #0000000a, 0px 20px 25px #0000001a",token:Some("semantic.elevation.surface.popover")},StyleDeclaration {property:"popover.layer.content",value:"1000",token:Some("core.layer.dropdown")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"16px",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"16px",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"16px",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"16px",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"8px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"64px",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"position",value:"relative",token:None},StyleDeclaration {property:"display",value:"inline-block",token:None}]},
StyleRule {part:"trigger",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None}]},
StyleRule {part:"content",conditions:&[],declarations:&[StyleDeclaration {property:"min-width",value:"256px",token:None},StyleDeclaration {property:"popover.design.content.background.fill",value:"#ffffff",token:Some("popover.color.background.content")},StyleDeclaration {property:"background-color",value:"#ffffff",token:Some("popover.design.content.background.fill")},StyleDeclaration {property:"popover.design.content.border.color",value:"#d0d0d0",token:Some("popover.color.border")},StyleDeclaration {property:"border-color",value:"#d0d0d0",token:Some("popover.design.content.border.color")},StyleDeclaration {property:"popover.design.content.shape.radius",value:"6px",token:Some("popover.size.radius")},StyleDeclaration {property:"border-radius",value:"6px",token:Some("popover.design.content.shape.radius")},StyleDeclaration {property:"popover.design.content.spacing.padding",value:"16px",token:Some("popover.size.padding")},StyleDeclaration {property:"padding",value:"16px",token:Some("popover.design.content.spacing.padding")},StyleDeclaration {property:"popover.design.content.spacing.gap",value:"8px",token:Some("popover.size.gap")},StyleDeclaration {property:"gap",value:"8px",token:Some("popover.design.content.spacing.gap")},StyleDeclaration {property:"display",value:"inline-block",token:None},StyleDeclaration {property:"popover.design.content.border.style",value:"solid",token:None},StyleDeclaration {property:"border-style",value:"solid",token:Some("popover.design.content.border.style")},StyleDeclaration {property:"popover.design.content.border.width",value:"1px",token:None},StyleDeclaration {property:"border-width",value:"1px",token:Some("popover.design.content.border.width")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}

 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn placement(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["top","bottom","left","right","auto",""].contains(&value.as_ref()),"unsupported placement variant");self.variant_values.insert("placement",value);self}
pub fn set_placement(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["top","bottom","left","right","auto",""].contains(&value.as_ref()),"unsupported placement variant");self.variant_values.insert("placement",value);cx.notify();}
pub fn disabled(mut self,value:bool)->Self {self.disabled=value;self}
pub fn set_disabled(&mut self,value:bool,cx:&mut Context<Self>){self.disabled=value;cx.notify();}
pub fn close_on_escape(mut self,value:bool)->Self {self.close_on_escape=value;self}
pub fn set_close_on_escape(&mut self,value:bool,cx:&mut Context<Self>){self.close_on_escape=value;cx.notify();}
pub fn close_on_outside_click(mut self,value:bool)->Self {self.close_on_outside_click=value;self}
pub fn set_close_on_outside_click(&mut self,value:bool,cx:&mut Context<Self>){self.close_on_outside_click=value;cx.notify();}
pub fn close_on_blur(mut self,value:bool)->Self {self.close_on_blur=value;self}
pub fn set_close_on_blur(&mut self,value:bool,cx:&mut Context<Self>){self.close_on_blur=value;cx.notify();}



}

impl Render for Popover{fn render(&mut self,window:&mut Window,_cx:&mut Context<Self>)->impl IntoElement{



 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"popover-root".to_string()).when(!self.label.is_empty(),|node|node.child(div().debug_selector(||"popover-label".to_string()).child(self.label.clone()))).id("popover");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
