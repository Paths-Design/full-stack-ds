// Generated from Spinner normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};


use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Spinner{pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub aria_hidden:bool,pub inline:bool,}
impl Default for Spinner{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("size","".into());
variants.insert("thickness","".into());Self{label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,aria_hidden:false,inline:false,}}}
impl Spinner{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"0",token:None},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"spinner.size.xs",value:"12px",token:Some("semantic.glyph.size.small.extent")},StyleDeclaration {property:"spinner.size.sm",value:"16px",token:Some("core.icon.size.sm")},StyleDeclaration {property:"spinner.size.md",value:"20px",token:Some("core.icon.size.md")},StyleDeclaration {property:"spinner.size.lg",value:"24px",token:Some("core.icon.size.lg")},StyleDeclaration {property:"spinner.thickness.hairline",value:"2px",token:None},StyleDeclaration {property:"spinner.thickness.regular",value:"3px",token:None},StyleDeclaration {property:"spinner.thickness.bold",value:"4px",token:None},StyleDeclaration {property:"spinner.color.accent",value:"#d92d2e",token:Some("semantic.color.background.accent")},StyleDeclaration {property:"spinner.color.track",value:"#d0d0d0",token:Some("semantic.color.border.subtle")},StyleDeclaration {property:"spinner.anim.duration",value:"800ms",token:None}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"0",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"visual",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-block",token:None},StyleDeclaration {property:"width",value:"1em",token:None},StyleDeclaration {property:"height",value:"1em",token:None},StyleDeclaration {property:"box-sizing",value:"border-box",token:None},StyleDeclaration {property:"spinner.design.visual.shape.radius",value:"50%",token:None},StyleDeclaration {property:"border-radius",value:"50%",token:Some("spinner.design.visual.shape.radius")},StyleDeclaration {property:"spinner.design.visual.border.style",value:"solid",token:None},StyleDeclaration {property:"border-style",value:"solid",token:Some("spinner.design.visual.border.style")},StyleDeclaration {property:"spinner.design.visual.border.width",value:"3px",token:Some("spinner.thickness.regular")},StyleDeclaration {property:"border-width",value:"3px",token:Some("spinner.design.visual.border.width")},StyleDeclaration {property:"spinner.design.visual.border.color",value:"#d0d0d0",token:Some("spinner.color.track")},StyleDeclaration {property:"border-color",value:"#d0d0d0",token:Some("spinner.design.visual.border.color")},StyleDeclaration {property:"spinner.design.visual.border.top.color",value:"#d92d2e",token:Some("spinner.color.accent")},StyleDeclaration {property:"border-top-color",value:"#d92d2e",token:Some("spinner.design.visual.border.top.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"xs"}],declarations:&[StyleDeclaration {property:"spinner.design.condition-ac39d57baace.typography.size",value:"12px",token:Some("spinner.size.xs")},StyleDeclaration {property:"font-size",value:"12px",token:Some("spinner.design.condition-ac39d57baace.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"sm"}],declarations:&[StyleDeclaration {property:"spinner.design.condition-24964d7ed3a7.typography.size",value:"16px",token:Some("spinner.size.sm")},StyleDeclaration {property:"font-size",value:"16px",token:Some("spinner.design.condition-24964d7ed3a7.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"md"}],declarations:&[StyleDeclaration {property:"spinner.design.condition-dc35d39122c5.typography.size",value:"20px",token:Some("spinner.size.md")},StyleDeclaration {property:"font-size",value:"20px",token:Some("spinner.design.condition-dc35d39122c5.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"lg"}],declarations:&[StyleDeclaration {property:"spinner.design.condition-72800fd5573d.typography.size",value:"24px",token:Some("spinner.size.lg")},StyleDeclaration {property:"font-size",value:"24px",token:Some("spinner.design.condition-72800fd5573d.typography.size")}]},
StyleRule {part:"visual",conditions:&[StyleCondition::Variant {axis:"thickness",value:"hairline"}],declarations:&[StyleDeclaration {property:"spinner.design.condition-ddd83ecdda11.border.width",value:"2px",token:Some("spinner.thickness.hairline")},StyleDeclaration {property:"border-width",value:"2px",token:Some("spinner.design.condition-ddd83ecdda11.border.width")}]},
StyleRule {part:"visual",conditions:&[StyleCondition::Variant {axis:"thickness",value:"regular"}],declarations:&[StyleDeclaration {property:"spinner.design.condition-5fe4ba5b6059.border.width",value:"3px",token:Some("spinner.thickness.regular")},StyleDeclaration {property:"border-width",value:"3px",token:Some("spinner.design.condition-5fe4ba5b6059.border.width")}]},
StyleRule {part:"visual",conditions:&[StyleCondition::Variant {axis:"thickness",value:"bold"}],declarations:&[StyleDeclaration {property:"spinner.design.condition-f69ec4fadb37.border.width",value:"4px",token:Some("spinner.thickness.bold")},StyleDeclaration {property:"border-width",value:"4px",token:Some("spinner.design.condition-f69ec4fadb37.border.width")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}

 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn size(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["xs","sm","md","lg",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);self}
pub fn set_size(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["xs","sm","md","lg",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);cx.notify();}
pub fn thickness(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["hairline","regular","bold",""].contains(&value.as_ref()),"unsupported thickness variant");self.variant_values.insert("thickness",value);self}
pub fn set_thickness(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["hairline","regular","bold",""].contains(&value.as_ref()),"unsupported thickness variant");self.variant_values.insert("thickness",value);cx.notify();}
pub fn aria_hidden(mut self,value:bool)->Self {self.aria_hidden=value;self}
pub fn set_aria_hidden(&mut self,value:bool,cx:&mut Context<Self>){self.aria_hidden=value;cx.notify();}
pub fn inline(mut self,value:bool)->Self {self.inline=value;self}
pub fn set_inline(&mut self,value:bool,cx:&mut Context<Self>){self.inline=value;cx.notify();}



}

impl Render for Spinner{fn render(&mut self,window:&mut Window,_cx:&mut Context<Self>)->impl IntoElement{



 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"spinner-root".to_string()).child(apply_part_style(div(),"visual",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"spinner-visual".to_string())).id("spinner");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
