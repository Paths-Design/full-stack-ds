// Generated from Tooltip normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};


use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Tooltip{pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub disabled:bool,pub close_on_escape:bool,pub close_on_blur:bool,}
impl Default for Tooltip{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("placement","".into());Self{label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,disabled:false,close_on_escape:true,close_on_blur:true,}}}
impl Tooltip{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"16px",token:Some("semantic.surface.size.padding-block")},StyleDeclaration {property:"box-model.padding-block-end",value:"16px",token:Some("semantic.surface.size.padding-block")},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"16px",token:Some("semantic.surface.size.padding-inline")},StyleDeclaration {property:"box-model.padding-inline-end",value:"16px",token:Some("semantic.surface.size.padding-inline")},StyleDeclaration {property:"box-model.gap",value:"8px",token:Some("semantic.surface.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"64px",token:Some("semantic.surface.size.min-width")},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"tooltip.color.background",value:"#141414",token:Some("semantic.color.background.inverse")},StyleDeclaration {property:"tooltip.color.foreground",value:"#fafafa",token:Some("semantic.color.foreground.on-inverse")},StyleDeclaration {property:"tooltip.color.border",value:"#d0d0d0",token:Some("semantic.color.border.subtle")},StyleDeclaration {property:"tooltip.size.padding.x",value:"8px",token:Some("core.spacing.size.04")},StyleDeclaration {property:"tooltip.size.radius",value:"4px",token:Some("semantic.shape.radius.small")},StyleDeclaration {property:"tooltip.size.maxWidth",value:"200px",token:None},StyleDeclaration {property:"tooltip.typography.fontSize",value:"14px",token:Some("semantic.typography.caption.01")},StyleDeclaration {property:"tooltip.layer.content",value:"1800",token:Some("core.layer.tooltip")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"16px",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"16px",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"16px",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"16px",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"8px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"64px",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-block",token:None}]},
StyleRule {part:"trigger",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None}]},
StyleRule {part:"content",conditions:&[],declarations:&[StyleDeclaration {property:"tooltip.design.content.background.fill",value:"#141414",token:Some("tooltip.color.background")},StyleDeclaration {property:"background-color",value:"#141414",token:Some("tooltip.design.content.background.fill")},StyleDeclaration {property:"tooltip.design.content.foreground.color",value:"#fafafa",token:Some("tooltip.color.foreground")},StyleDeclaration {property:"color",value:"#fafafa",token:Some("tooltip.design.content.foreground.color")},StyleDeclaration {property:"tooltip.design.content.border.color",value:"#d0d0d0",token:Some("tooltip.color.border")},StyleDeclaration {property:"border-color",value:"#d0d0d0",token:Some("tooltip.design.content.border.color")},StyleDeclaration {property:"tooltip.design.content.shape.radius",value:"4px",token:Some("tooltip.size.radius")},StyleDeclaration {property:"border-radius",value:"4px",token:Some("tooltip.design.content.shape.radius")},StyleDeclaration {property:"tooltip.design.content.spacing.padding",value:"8px",token:Some("tooltip.size.padding.x")},StyleDeclaration {property:"padding",value:"8px",token:Some("tooltip.design.content.spacing.padding")},StyleDeclaration {property:"tooltip.design.content.sizing.max-width",value:"200px",token:Some("tooltip.size.maxWidth")},StyleDeclaration {property:"max-width",value:"200px",token:Some("tooltip.design.content.sizing.max-width")},StyleDeclaration {property:"tooltip.design.content.typography.size",value:"14px",token:Some("tooltip.typography.fontSize")},StyleDeclaration {property:"font-size",value:"14px",token:Some("tooltip.design.content.typography.size")},StyleDeclaration {property:"display",value:"inline-block",token:None},StyleDeclaration {property:"tooltip.design.content.border.style",value:"solid",token:None},StyleDeclaration {property:"border-style",value:"solid",token:Some("tooltip.design.content.border.style")},StyleDeclaration {property:"tooltip.design.content.border.width",value:"1px",token:None},StyleDeclaration {property:"border-width",value:"1px",token:Some("tooltip.design.content.border.width")}]}];
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
pub fn close_on_blur(mut self,value:bool)->Self {self.close_on_blur=value;self}
pub fn set_close_on_blur(&mut self,value:bool,cx:&mut Context<Self>){self.close_on_blur=value;cx.notify();}



}

impl Render for Tooltip{fn render(&mut self,window:&mut Window,_cx:&mut Context<Self>)->impl IntoElement{



 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"tooltip-root".to_string()).when(!self.label.is_empty(),|node|node.child(div().debug_selector(||"tooltip-label".to_string()).child(self.label.clone()))).id("tooltip");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);

 root.into_any_element()
}}
