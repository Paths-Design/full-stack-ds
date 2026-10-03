// Generated from Stat normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Stat{content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,}
impl Default for Stat{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("size","md".into());
variants.insert("trend","".into());Self{content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,}}}
impl Stat{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"4px",token:Some("semantic.display.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"stat.color.foreground.value",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"stat.color.foreground.trend.up",value:"#497f21",token:Some("semantic.color.feedback.foreground.success.default")},StyleDeclaration {property:"stat.color.foreground.trend.down",value:"#d92d2e",token:Some("semantic.color.feedback.foreground.danger.default")},StyleDeclaration {property:"stat.color.foreground.trend.neutral",value:"#474647",token:Some("semantic.color.foreground.secondary")},StyleDeclaration {property:"stat.size.value.sm",value:"18px",token:Some("semantic.typography.heading.04")},StyleDeclaration {property:"stat.size.value.md",value:"24px",token:Some("semantic.typography.heading.02")},StyleDeclaration {property:"stat.size.value.lg",value:"32px",token:Some("semantic.typography.heading.01")},StyleDeclaration {property:"stat.typography.lineHeight.value",value:"1.1",token:None},StyleDeclaration {property:"stat.typography.weight.value",value:"700",token:Some("semantic.typography.font.weight.bold")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"4px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"stat.design.root.foreground.color",value:"#141414",token:Some("stat.color.foreground.value")},StyleDeclaration {property:"color",value:"#141414",token:Some("stat.design.root.foreground.color")},StyleDeclaration {property:"stat.design.root.typography.size",value:"24px",token:Some("stat.size.value.md")},StyleDeclaration {property:"font-size",value:"24px",token:Some("stat.design.root.typography.size")},StyleDeclaration {property:"stat.design.root.typography.weight",value:"700",token:Some("stat.typography.weight.value")},StyleDeclaration {property:"font-weight",value:"700",token:Some("stat.design.root.typography.weight")},StyleDeclaration {property:"stat.design.root.typography.line-height",value:"1.1",token:Some("stat.typography.lineHeight.value")},StyleDeclaration {property:"line-height",value:"1.1",token:Some("stat.design.root.typography.line-height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"trend",value:"up"}],declarations:&[StyleDeclaration {property:"stat.design.condition-150f0c29952e.foreground.color",value:"#497f21",token:Some("stat.color.foreground.trend.up")},StyleDeclaration {property:"color",value:"#497f21",token:Some("stat.design.condition-150f0c29952e.foreground.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"trend",value:"down"}],declarations:&[StyleDeclaration {property:"stat.design.condition-c3362b4b3c5b.foreground.color",value:"#d92d2e",token:Some("stat.color.foreground.trend.down")},StyleDeclaration {property:"color",value:"#d92d2e",token:Some("stat.design.condition-c3362b4b3c5b.foreground.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"trend",value:"neutral"}],declarations:&[StyleDeclaration {property:"stat.design.condition-611d8c5b8be1.foreground.color",value:"#474647",token:Some("stat.color.foreground.trend.neutral")},StyleDeclaration {property:"color",value:"#474647",token:Some("stat.design.condition-611d8c5b8be1.foreground.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"sm"}],declarations:&[StyleDeclaration {property:"stat.design.condition-24964d7ed3a7.typography.size",value:"18px",token:Some("stat.size.value.sm")},StyleDeclaration {property:"font-size",value:"18px",token:Some("stat.design.condition-24964d7ed3a7.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"lg"}],declarations:&[StyleDeclaration {property:"stat.design.condition-72800fd5573d.typography.size",value:"32px",token:Some("stat.size.value.lg")},StyleDeclaration {property:"font-size",value:"32px",token:Some("stat.design.condition-72800fd5573d.typography.size")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn size(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["sm","md","lg"].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);self}
pub fn set_size(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["sm","md","lg"].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);cx.notify();}
pub fn trend(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["up","down","neutral",""].contains(&value.as_ref()),"unsupported trend variant");self.variant_values.insert("trend",value);self}
pub fn set_trend(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["up","down","neutral",""].contains(&value.as_ref()),"unsupported trend variant");self.variant_values.insert("trend",value);cx.notify();}



 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"stat-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for Stat{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"stat-root".to_string()).children(self.render_content(window,cx)).id("stat");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);

 root.into_any_element()
}}
