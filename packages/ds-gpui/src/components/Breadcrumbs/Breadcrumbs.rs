// Generated from Breadcrumbs normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Breadcrumbs{content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub aria_label:SharedString,pub separator:SharedString,}
impl Default for Breadcrumbs{fn default()->Self {let mut variants=BTreeMap::new();Self{content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,aria_label:SharedString::default(),separator:SharedString::default(),}}}
impl Breadcrumbs{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"16px",token:Some("semantic.structure.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"breadcrumbs.color.foreground.primary",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"breadcrumbs.color.background.elevated",value:"#ffffff",token:Some("semantic.color.background.elevated")},StyleDeclaration {property:"breadcrumbs.color.border.subtle",value:"#d0d0d0",token:Some("semantic.surface.border.subtle")},StyleDeclaration {property:"breadcrumbs.typography.lineHeight.collapse",value:"1",token:Some("semantic.typography.line.height.collapse")},StyleDeclaration {property:"breadcrumbs.shape.radius.medium",value:"6px",token:Some("semantic.shape.control.radius.default")},StyleDeclaration {property:"breadcrumbs.spacing.gap",value:"8px",token:Some("core.spacing.size.04")},StyleDeclaration {property:"breadcrumbs.spacing.padding",value:"8px",token:Some("core.spacing.size.04")},StyleDeclaration {property:"breadcrumbs.color.focus",value:"#0566fe",token:Some("semantic.focus.ring.color")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"16px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"breadcrumbs.design.root.background.fill",value:"#ffffff",token:Some("breadcrumbs.color.background.elevated")},StyleDeclaration {property:"background-color",value:"#ffffff",token:Some("breadcrumbs.design.root.background.fill")},StyleDeclaration {property:"breadcrumbs.design.root.border.color",value:"#d0d0d0",token:Some("breadcrumbs.color.border.subtle")},StyleDeclaration {property:"border-color",value:"#d0d0d0",token:Some("breadcrumbs.design.root.border.color")},StyleDeclaration {property:"breadcrumbs.design.root.typography.line-height",value:"1",token:Some("breadcrumbs.typography.lineHeight.collapse")},StyleDeclaration {property:"line-height",value:"1",token:Some("breadcrumbs.design.root.typography.line-height")},StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"breadcrumbs.design.root.shape.radius",value:"6px",token:Some("breadcrumbs.shape.radius.medium")},StyleDeclaration {property:"border-radius",value:"6px",token:Some("breadcrumbs.design.root.shape.radius")},StyleDeclaration {property:"breadcrumbs.design.root.spacing.padding",value:"8px",token:Some("breadcrumbs.spacing.padding")},StyleDeclaration {property:"padding",value:"8px",token:Some("breadcrumbs.design.root.spacing.padding")},StyleDeclaration {property:"breadcrumbs.design.root.foreground.color",value:"#141414",token:Some("breadcrumbs.color.foreground.primary")},StyleDeclaration {property:"color",value:"#141414",token:Some("breadcrumbs.design.root.foreground.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Focus],declarations:&[StyleDeclaration {property:"breadcrumbs.design.focus.focus.color",value:"#0566fe",token:Some("breadcrumbs.color.focus")},StyleDeclaration {property:"outline-color",value:"#0566fe",token:Some("breadcrumbs.design.focus.focus.color")}]},
StyleRule {part:"list",conditions:&[],declarations:&[StyleDeclaration {property:"breadcrumbs.design.list.spacing.padding",value:"0",token:None},StyleDeclaration {property:"padding",value:"0",token:Some("breadcrumbs.design.list.spacing.padding")},StyleDeclaration {property:"margin",value:"0",token:None},StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None},StyleDeclaration {property:"breadcrumbs.design.list.spacing.gap",value:"8px",token:Some("breadcrumbs.spacing.gap")},StyleDeclaration {property:"gap",value:"8px",token:Some("breadcrumbs.design.list.spacing.gap")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}

 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }

pub fn aria_label(mut self,value:impl Into<SharedString>)->Self {self.aria_label=value.into();self}
pub fn set_aria_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.aria_label=value.into();cx.notify();}
pub fn separator(mut self,value:impl Into<SharedString>)->Self {self.separator=value.into();self}
pub fn set_separator(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.separator=value.into();cx.notify();}


 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"breadcrumbs-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for Breadcrumbs{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"breadcrumbs-root".to_string()).child(apply_part_style(div(),"list",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"breadcrumbs-list".to_string()).children(self.render_content(window,cx))).id("breadcrumbs");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
