// Generated from Icon normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};


use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Icon{pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub decorative:bool,pub name:SharedString,pub aria_label:SharedString,}
impl Default for Icon{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("size","md".into());Self{label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,decorative:true,name:SharedString::default(),aria_label:SharedString::default(),}}}
impl Icon{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.width",value:"16px",token:Some("semantic.glyph.size.medium.extent")},StyleDeclaration {property:"box-model.height",value:"16px",token:Some("semantic.glyph.size.medium.extent")},StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"0",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"icon.size.sm",value:"16px",token:Some("core.icon.size.sm")},StyleDeclaration {property:"icon.size.md",value:"20px",token:Some("core.icon.size.md")},StyleDeclaration {property:"icon.size.lg",value:"24px",token:Some("core.icon.size.lg")},StyleDeclaration {property:"icon.size.xl",value:"32px",token:Some("core.icon.size.xl")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"width",value:"16px",token:Some("box-model.width")},StyleDeclaration {property:"height",value:"16px",token:Some("box-model.height")},StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"0",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")},StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None},StyleDeclaration {property:"justify-content",value:"center",token:None},StyleDeclaration {property:"flex-shrink",value:"0",token:None},StyleDeclaration {property:"box-sizing",value:"border-box",token:None}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-sizing",value:"border-box",token:None}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"sm"}],declarations:&[StyleDeclaration {property:"icon.design.condition-24964d7ed3a7.sizing.width",value:"16px",token:Some("icon.size.sm")},StyleDeclaration {property:"width",value:"16px",token:Some("icon.design.condition-24964d7ed3a7.sizing.width")},StyleDeclaration {property:"icon.design.condition-24964d7ed3a7.sizing.height",value:"16px",token:Some("icon.size.sm")},StyleDeclaration {property:"height",value:"16px",token:Some("icon.design.condition-24964d7ed3a7.sizing.height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"md"}],declarations:&[StyleDeclaration {property:"icon.design.condition-dc35d39122c5.sizing.width",value:"20px",token:Some("icon.size.md")},StyleDeclaration {property:"width",value:"20px",token:Some("icon.design.condition-dc35d39122c5.sizing.width")},StyleDeclaration {property:"icon.design.condition-dc35d39122c5.sizing.height",value:"20px",token:Some("icon.size.md")},StyleDeclaration {property:"height",value:"20px",token:Some("icon.design.condition-dc35d39122c5.sizing.height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"lg"}],declarations:&[StyleDeclaration {property:"icon.design.condition-72800fd5573d.sizing.width",value:"24px",token:Some("icon.size.lg")},StyleDeclaration {property:"width",value:"24px",token:Some("icon.design.condition-72800fd5573d.sizing.width")},StyleDeclaration {property:"icon.design.condition-72800fd5573d.sizing.height",value:"24px",token:Some("icon.size.lg")},StyleDeclaration {property:"height",value:"24px",token:Some("icon.design.condition-72800fd5573d.sizing.height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"xl"}],declarations:&[StyleDeclaration {property:"icon.design.condition-bcfaa22e125a.sizing.width",value:"32px",token:Some("icon.size.xl")},StyleDeclaration {property:"width",value:"32px",token:Some("icon.design.condition-bcfaa22e125a.sizing.width")},StyleDeclaration {property:"icon.design.condition-bcfaa22e125a.sizing.height",value:"32px",token:Some("icon.size.xl")},StyleDeclaration {property:"height",value:"32px",token:Some("icon.design.condition-bcfaa22e125a.sizing.height")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}

 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn size(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["sm","md","lg","xl"].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);self}
pub fn set_size(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["sm","md","lg","xl"].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);cx.notify();}
pub fn decorative(mut self,value:bool)->Self {self.decorative=value;self}
pub fn set_decorative(&mut self,value:bool,cx:&mut Context<Self>){self.decorative=value;cx.notify();}
pub fn name(mut self,value:impl Into<SharedString>)->Self {self.name=value.into();self}
pub fn set_name(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.name=value.into();cx.notify();}
pub fn aria_label(mut self,value:impl Into<SharedString>)->Self {self.aria_label=value.into();self}
pub fn set_aria_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.aria_label=value.into();cx.notify();}



}

impl Render for Icon{fn render(&mut self,window:&mut Window,_cx:&mut Context<Self>)->impl IntoElement{



 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"icon-root".to_string()).child(apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"icon-root".to_string())).id("icon");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
