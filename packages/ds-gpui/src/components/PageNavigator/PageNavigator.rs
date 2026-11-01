// Generated from PageNavigator normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};


use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct PageNavigator{pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub disabled:bool,pub show_choices:bool,pub page_label:SharedString,pub previous_label:SharedString,pub next_label:SharedString,pub commit_label:SharedString,}
impl Default for PageNavigator{fn default()->Self {let mut variants=BTreeMap::new();Self{label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,disabled:false,show_choices:false,page_label:SharedString::default(),previous_label:SharedString::default(),next_label:SharedString::default(),commit_label:SharedString::default(),}}}
impl PageNavigator{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"0",token:None},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"0",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None},StyleDeclaration {property:"page-navigator.design.root.spacing.gap",value:"8px",token:None},StyleDeclaration {property:"gap",value:"8px",token:Some("page-navigator.design.root.spacing.gap")}]},
StyleRule {part:"field",conditions:&[],declarations:&[StyleDeclaration {property:"page-navigator.design.field.sizing.width",value:"64px",token:None},StyleDeclaration {property:"width",value:"64px",token:Some("page-navigator.design.field.sizing.width")}]},
StyleRule {part:"input",conditions:&[],declarations:&[StyleDeclaration {property:"page-navigator.design.input.sizing.width",value:"100%",token:None},StyleDeclaration {property:"width",value:"100%",token:Some("page-navigator.design.input.sizing.width")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }

pub fn disabled(mut self,value:bool)->Self {self.disabled=value;self}
pub fn set_disabled(&mut self,value:bool,cx:&mut Context<Self>){self.disabled=value;cx.notify();}
pub fn show_choices(mut self,value:bool)->Self {self.show_choices=value;self}
pub fn set_show_choices(&mut self,value:bool,cx:&mut Context<Self>){self.show_choices=value;cx.notify();}
pub fn page_label(mut self,value:impl Into<SharedString>)->Self {self.page_label=value.into();self}
pub fn set_page_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.page_label=value.into();cx.notify();}
pub fn previous_label(mut self,value:impl Into<SharedString>)->Self {self.previous_label=value.into();self}
pub fn set_previous_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.previous_label=value.into();cx.notify();}
pub fn next_label(mut self,value:impl Into<SharedString>)->Self {self.next_label=value.into();self}
pub fn set_next_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.next_label=value.into();cx.notify();}
pub fn commit_label(mut self,value:impl Into<SharedString>)->Self {self.commit_label=value.into();self}
pub fn set_commit_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.commit_label=value.into();cx.notify();}



}

impl Render for PageNavigator{fn render(&mut self,window:&mut Window,_cx:&mut Context<Self>)->impl IntoElement{



 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"page-navigator-root".to_string()).child(apply_part_style(div(),"field",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"page-navigator-field".to_string())).child(apply_part_style(div(),"context",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"page-navigator-context".to_string())).id("page-navigator");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);

 root.into_any_element()
}}
