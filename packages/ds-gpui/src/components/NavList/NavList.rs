// Generated from NavList normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct NavList{content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,}
impl Default for NavList{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("orientation","vertical".into());Self{content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,}}}
impl NavList{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"16px",token:Some("semantic.structure.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"nav-list.color.foreground.default",value:"#474647",token:Some("semantic.color.foreground.secondary")},StyleDeclaration {property:"nav-list.color.foreground.hover",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"nav-list.color.foreground.current",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"nav-list.color.background.default",value:"transparent",token:Some("semantic.color.background.transparent")},StyleDeclaration {property:"nav-list.color.background.hover",value:"#f7f7f7",token:Some("semantic.color.background.subtle")},StyleDeclaration {property:"nav-list.stateLayer.hover",value:"0.04",token:Some("semantic.interaction.stateLayer.hover")},StyleDeclaration {property:"nav-list.stateLayer.selected",value:"0.08",token:Some("semantic.interaction.stateLayer.selected")},StyleDeclaration {property:"nav-list.color.outline.focus",value:"#0566fe",token:Some("semantic.focus.ring.color")},StyleDeclaration {property:"nav-list.size.padding.block",value:"2px",token:Some("core.spacing.size.02")},StyleDeclaration {property:"nav-list.size.padding.inline",value:"8px",token:Some("core.spacing.size.04")},StyleDeclaration {property:"nav-list.size.radius",value:"6px",token:Some("semantic.shape.control.radius.default")},StyleDeclaration {property:"nav-list.size.gap.list",value:"1px",token:Some("core.spacing.size.01")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"16px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"block",token:None}]},
StyleRule {part:"list",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"flex-direction",value:"column",token:None},StyleDeclaration {property:"nav-list.design.list.spacing.gap",value:"1px",token:Some("nav-list.size.gap.list")},StyleDeclaration {property:"gap",value:"1px",token:Some("nav-list.design.list.spacing.gap")},StyleDeclaration {property:"margin",value:"0",token:None},StyleDeclaration {property:"nav-list.design.list.spacing.padding",value:"0",token:None},StyleDeclaration {property:"padding",value:"0",token:Some("nav-list.design.list.spacing.padding")}]},
StyleRule {part:"item",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"nav-list.design.item.foreground.color",value:"#474647",token:Some("nav-list.color.foreground.default")},StyleDeclaration {property:"color",value:"#474647",token:Some("nav-list.design.item.foreground.color")},StyleDeclaration {property:"nav-list.design.item.spacing.padding-block",value:"2px",token:Some("nav-list.size.padding.block")},StyleDeclaration {property:"padding-block",value:"2px",token:Some("nav-list.design.item.spacing.padding-block")},StyleDeclaration {property:"nav-list.design.item.spacing.padding-inline",value:"8px",token:Some("nav-list.size.padding.inline")},StyleDeclaration {property:"padding-inline",value:"8px",token:Some("nav-list.design.item.spacing.padding-inline")},StyleDeclaration {property:"nav-list.design.item.shape.radius",value:"6px",token:Some("nav-list.size.radius")},StyleDeclaration {property:"border-radius",value:"6px",token:Some("nav-list.design.item.shape.radius")}]},
StyleRule {part:"item",conditions:&[StyleCondition::Hover],declarations:&[]},
StyleRule {part:"item",conditions:&[StyleCondition::Focus],declarations:&[]}];
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



 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"nav-list-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for NavList{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"nav-list-root".to_string()).child(apply_part_style(div(),"list",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"nav-list-list".to_string()).children(self.render_content(window,cx))).id("nav-list");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);

 root.into_any_element()
}}
