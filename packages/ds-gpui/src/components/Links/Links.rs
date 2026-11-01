// Generated from Links normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Links{content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub disabled:bool,pub href:SharedString,pub rel:SharedString,}
impl Default for Links{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("size","".into());Self{content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,disabled:false,href:SharedString::default(),rel:SharedString::default(),}}}
impl Links{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"4px",token:Some("semantic.display.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"links.color.foreground.default",value:"#d92d2e",token:Some("semantic.color.foreground.link")},StyleDeclaration {property:"links.color.foreground.hover",value:"#b31b1b",token:Some("semantic.color.foreground.linkHover")},StyleDeclaration {property:"links.color.foreground.visited",value:"#e55b5a",token:Some("semantic.color.foreground.linkVisited")},StyleDeclaration {property:"links.color.foreground.disabled",value:"#727272",token:Some("semantic.color.foreground.disabled")},StyleDeclaration {property:"links.color.underline",value:"#b8b8b8",token:Some("semantic.color.border.light")},StyleDeclaration {property:"links.spacing.gap",value:"2px",token:Some("core.spacing.size.02")},StyleDeclaration {property:"links.motion.duration.fast",value:"150ms",token:Some("core.motion.duration.short")},StyleDeclaration {property:"links.focus.ring.width",value:"2px",token:Some("semantic.focus.ring.width")},StyleDeclaration {property:"links.focus.ring.color",value:"#0566fe",token:Some("semantic.focus.ring.color")},StyleDeclaration {property:"links.focus.ring.style",value:"solid",token:Some("semantic.focus.ring.style")},StyleDeclaration {property:"links.focus.ring.offset",value:"2px",token:Some("semantic.focus.ring.offset")},StyleDeclaration {property:"links.focus.ring.radius",value:"4px",token:Some("semantic.shape.radius.small")},StyleDeclaration {property:"links.size.fontSize.small",value:"0.875rem",token:Some("core.typography.ramp.3")},StyleDeclaration {property:"links.size.fontSize.medium",value:"1rem",token:Some("core.typography.ramp.4")},StyleDeclaration {property:"links.size.fontSize.large",value:"1.125rem",token:Some("core.typography.ramp.5")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"4px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"links.design.root.foreground.color",value:"#d92d2e",token:Some("links.color.foreground.default")},StyleDeclaration {property:"color",value:"#d92d2e",token:Some("links.design.root.foreground.color")},StyleDeclaration {property:"links.design.root.typography.size",value:"1rem",token:Some("links.size.fontSize.medium")},StyleDeclaration {property:"font-size",value:"1rem",token:Some("links.design.root.typography.size")},StyleDeclaration {property:"links.design.root.spacing.gap",value:"2px",token:Some("links.spacing.gap")},StyleDeclaration {property:"gap",value:"2px",token:Some("links.design.root.spacing.gap")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"small"}],declarations:&[StyleDeclaration {property:"links.size.fontSize.medium",value:"0.875rem",token:Some("links.size.fontSize.small")},StyleDeclaration {property:"links.design.condition-42b522a9c46e.typography.size",value:"1rem",token:Some("links.size.fontSize.medium")},StyleDeclaration {property:"font-size",value:"1rem",token:Some("links.design.condition-42b522a9c46e.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"medium"}],declarations:&[StyleDeclaration {property:"links.size.fontSize.medium",value:"1rem",token:Some("core.typography.ramp.4")},StyleDeclaration {property:"links.design.condition-a9821c9eea70.typography.size",value:"1rem",token:Some("links.size.fontSize.medium")},StyleDeclaration {property:"font-size",value:"1rem",token:Some("links.design.condition-a9821c9eea70.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"large"}],declarations:&[StyleDeclaration {property:"links.size.fontSize.medium",value:"1.125rem",token:Some("links.size.fontSize.large")},StyleDeclaration {property:"links.design.condition-cbbd2740a3e5.typography.size",value:"1rem",token:Some("links.size.fontSize.medium")},StyleDeclaration {property:"font-size",value:"1rem",token:Some("links.design.condition-cbbd2740a3e5.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Hover],declarations:&[StyleDeclaration {property:"links.design.hover.foreground.color",value:"#b31b1b",token:Some("links.color.foreground.hover")},StyleDeclaration {property:"color",value:"#b31b1b",token:Some("links.design.hover.foreground.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Disabled(true)],declarations:&[StyleDeclaration {property:"links.design.disabled.foreground.color",value:"#727272",token:Some("links.color.foreground.disabled")},StyleDeclaration {property:"color",value:"#727272",token:Some("links.design.disabled.foreground.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Focus],declarations:&[StyleDeclaration {property:"links.design.focus.focus.width",value:"2px",token:Some("links.focus.ring.width")},StyleDeclaration {property:"outline-width",value:"2px",token:Some("links.design.focus.focus.width")},StyleDeclaration {property:"links.design.focus.focus.color",value:"#0566fe",token:Some("links.focus.ring.color")},StyleDeclaration {property:"outline-color",value:"#0566fe",token:Some("links.design.focus.focus.color")},StyleDeclaration {property:"links.design.focus.focus.style",value:"solid",token:Some("links.focus.ring.style")},StyleDeclaration {property:"outline-style",value:"solid",token:Some("links.design.focus.focus.style")},StyleDeclaration {property:"links.design.focus.focus.offset",value:"2px",token:Some("links.focus.ring.offset")},StyleDeclaration {property:"outline-offset",value:"2px",token:Some("links.design.focus.focus.offset")},StyleDeclaration {property:"links.design.focus.shape.radius",value:"4px",token:Some("links.focus.ring.radius")},StyleDeclaration {property:"border-radius",value:"4px",token:Some("links.design.focus.shape.radius")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}

 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn size(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["small","medium","large",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);self}
pub fn set_size(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["small","medium","large",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);cx.notify();}
pub fn disabled(mut self,value:bool)->Self {self.disabled=value;self}
pub fn set_disabled(&mut self,value:bool,cx:&mut Context<Self>){self.disabled=value;cx.notify();}
pub fn href(mut self,value:impl Into<SharedString>)->Self {self.href=value.into();self}
pub fn set_href(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.href=value.into();cx.notify();}
pub fn rel(mut self,value:impl Into<SharedString>)->Self {self.rel=value.into();self}
pub fn set_rel(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.rel=value.into();cx.notify();}


 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"links-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for Links{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"links-root".to_string()).children(self.render_content(window,cx)).id("links");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
