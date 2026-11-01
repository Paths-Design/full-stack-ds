// Generated from ShowMore normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct ShowMore{content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub show_more_label:SharedString,pub show_less_label:SharedString,}
impl Default for ShowMore{fn default()->Self {let mut variants=BTreeMap::new();Self{content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,show_more_label:SharedString::default(),show_less_label:SharedString::default(),}}}
impl ShowMore{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"4px",token:Some("semantic.action.size.medium.padding-block")},StyleDeclaration {property:"box-model.padding-block-end",value:"4px",token:Some("semantic.action.size.medium.padding-block")},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"8px",token:Some("semantic.action.size.medium.padding-inline")},StyleDeclaration {property:"box-model.padding-inline-end",value:"8px",token:Some("semantic.action.size.medium.padding-inline")},StyleDeclaration {property:"box-model.gap",value:"8px",token:Some("semantic.action.size.medium.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"32px",token:Some("semantic.action.size.medium.min-width")},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"32px",token:Some("semantic.action.size.medium.min-height")},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"show-more.color.background",value:"#f7f7f7",token:Some("semantic.color.background.secondary")},StyleDeclaration {property:"show-more.color.foreground.primary",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"show-more.color.foreground.secondary",value:"#474647",token:Some("semantic.color.foreground.secondary")},StyleDeclaration {property:"show-more.color.border",value:"#d0d0d0",token:Some("semantic.surface.border.subtle")},StyleDeclaration {property:"show-more.size.padding",value:"24px",token:Some("core.spacing.size.07")},StyleDeclaration {property:"show-more.size.radius",value:"6px",token:Some("semantic.shape.control.radius.default")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"4px",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"4px",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"8px",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"8px",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"8px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"32px",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"32px",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"show-more.design.root.background.fill",value:"#f7f7f7",token:Some("show-more.color.background")},StyleDeclaration {property:"background-color",value:"#f7f7f7",token:Some("show-more.design.root.background.fill")},StyleDeclaration {property:"show-more.design.root.foreground.color",value:"#474647",token:Some("show-more.color.foreground.secondary")},StyleDeclaration {property:"color",value:"#474647",token:Some("show-more.design.root.foreground.color")},StyleDeclaration {property:"show-more.design.root.spacing.padding",value:"24px",token:Some("show-more.size.padding")},StyleDeclaration {property:"padding",value:"24px",token:Some("show-more.design.root.spacing.padding")},StyleDeclaration {property:"show-more.design.root.shape.radius",value:"6px",token:Some("show-more.size.radius")},StyleDeclaration {property:"border-radius",value:"6px",token:Some("show-more.design.root.shape.radius")}]},
StyleRule {part:"content",conditions:&[],declarations:&[StyleDeclaration {property:"overflow",value:"hidden",token:None}]},
StyleRule {part:"content",conditions:&[StyleCondition::Variant {axis:"expanded",value:"true"}],declarations:&[StyleDeclaration {property:"display",value:"block",token:None}]},
StyleRule {part:"trigger",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None},StyleDeclaration {property:"show-more.design.trigger.foreground.color",value:"#141414",token:Some("show-more.color.foreground.primary")},StyleDeclaration {property:"color",value:"#141414",token:Some("show-more.design.trigger.foreground.color")},StyleDeclaration {property:"show-more.design.trigger.border.style",value:"solid",token:None},StyleDeclaration {property:"border-style",value:"solid",token:Some("show-more.design.trigger.border.style")},StyleDeclaration {property:"show-more.design.trigger.border.width",value:"1px",token:None},StyleDeclaration {property:"border-width",value:"1px",token:Some("show-more.design.trigger.border.width")},StyleDeclaration {property:"show-more.design.trigger.border.color",value:"#d0d0d0",token:Some("show-more.color.border")},StyleDeclaration {property:"border-color",value:"#d0d0d0",token:Some("show-more.design.trigger.border.color")},StyleDeclaration {property:"show-more.design.trigger.spacing.padding",value:"0",token:None},StyleDeclaration {property:"padding",value:"0",token:Some("show-more.design.trigger.spacing.padding")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }

pub fn show_more_label(mut self,value:impl Into<SharedString>)->Self {self.show_more_label=value.into();self}
pub fn set_show_more_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.show_more_label=value.into();cx.notify();}
pub fn show_less_label(mut self,value:impl Into<SharedString>)->Self {self.show_less_label=value.into();self}
pub fn set_show_less_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.show_less_label=value.into();cx.notify();}


 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"show-more-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for ShowMore{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"show-more-root".to_string()).child(apply_part_style(div(),"content",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"show-more-content".to_string()).children(self.render_content(window,cx))).child(apply_part_style(div(),"trigger",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"show-more-trigger".to_string())).id("show-more");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);

 root.into_any_element()
}}
