// Generated from OTP normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};


use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct OTP{pub on_change:Option<crate::callback::ActionHandler>,pub on_complete:Option<crate::callback::ActionHandler>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub disabled:bool,pub read_only:bool,pub field_label:SharedString,pub aria_describedby:SharedString,}
impl Default for OTP{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("mode","numeric".into());Self{on_change:None,on_complete:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,disabled:false,read_only:false,field_label:SharedString::default(),aria_describedby:SharedString::default(),}}}
impl OTP{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"4px",token:Some("semantic.input.size.medium.padding-block")},StyleDeclaration {property:"box-model.padding-block-end",value:"4px",token:Some("semantic.input.size.medium.padding-block")},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"8px",token:Some("semantic.input.size.medium.padding-inline")},StyleDeclaration {property:"box-model.padding-inline-end",value:"8px",token:Some("semantic.input.size.medium.padding-inline")},StyleDeclaration {property:"box-model.gap",value:"8px",token:Some("semantic.input.size.medium.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"32px",token:Some("semantic.input.size.medium.min-height")},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"otp.color.background",value:"#f7f7f7",token:Some("semantic.color.background.secondary")},StyleDeclaration {property:"otp.color.foreground.primary",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"otp.color.border",value:"#a0a0a1",token:Some("semantic.color.border.default")},StyleDeclaration {property:"otp.size.radius",value:"6px",token:Some("semantic.shape.control.radius.default")},StyleDeclaration {property:"otp.color.border.accent",value:"#d92d2e",token:Some("semantic.color.border.accent")},StyleDeclaration {property:"otp.focus.ring.width",value:"2px",token:Some("semantic.focus.ring.width")},StyleDeclaration {property:"otp.focus.ring.color",value:"#0566fe",token:Some("semantic.focus.ring.color")},StyleDeclaration {property:"otp.focus.ring.style",value:"solid",token:Some("semantic.focus.ring.style")},StyleDeclaration {property:"otp.focus.ring.offset",value:"2px",token:Some("semantic.focus.ring.offset")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"4px",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"4px",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"8px",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"8px",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"8px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"32px",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None}]},
StyleRule {part:"group",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None},StyleDeclaration {property:"otp.design.group.spacing.gap",value:"4px",token:None},StyleDeclaration {property:"gap",value:"4px",token:Some("otp.design.group.spacing.gap")}]},
StyleRule {part:"field",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"width",value:"40px",token:None},StyleDeclaration {property:"height",value:"40px",token:None},StyleDeclaration {property:"otp.design.field.typography.alignment",value:"center",token:None},StyleDeclaration {property:"text-align",value:"center",token:Some("otp.design.field.typography.alignment")},StyleDeclaration {property:"otp.design.field.typography.size",value:"1rem",token:None},StyleDeclaration {property:"font-size",value:"1rem",token:Some("otp.design.field.typography.size")},StyleDeclaration {property:"box-sizing",value:"border-box",token:None},StyleDeclaration {property:"otp.design.field.border.style",value:"solid",token:None},StyleDeclaration {property:"border-style",value:"solid",token:Some("otp.design.field.border.style")},StyleDeclaration {property:"otp.design.field.border.width",value:"1px",token:None},StyleDeclaration {property:"border-width",value:"1px",token:Some("otp.design.field.border.width")},StyleDeclaration {property:"otp.design.field.shape.radius",value:"6px",token:Some("otp.size.radius")},StyleDeclaration {property:"border-radius",value:"6px",token:Some("otp.design.field.shape.radius")},StyleDeclaration {property:"otp.design.field.border.color",value:"#a0a0a1",token:Some("otp.color.border")},StyleDeclaration {property:"border-color",value:"#a0a0a1",token:Some("otp.design.field.border.color")},StyleDeclaration {property:"otp.design.field.background.fill",value:"#f7f7f7",token:Some("otp.color.background")},StyleDeclaration {property:"background-color",value:"#f7f7f7",token:Some("otp.design.field.background.fill")},StyleDeclaration {property:"otp.design.field.foreground.color",value:"#141414",token:Some("otp.color.foreground.primary")},StyleDeclaration {property:"color",value:"#141414",token:Some("otp.design.field.foreground.color")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn on_change(mut self,handler:impl Fn(&mut gpui::Window,&mut gpui::App)+'static)->Self{self.on_change=Some(std::rc::Rc::new(handler));self}
 pub fn set_on_change(&mut self,handler:impl Fn(&mut gpui::Window,&mut gpui::App)+'static,cx:&mut Context<Self>){self.on_change=Some(std::rc::Rc::new(handler));cx.notify();}
 pub fn on_complete(mut self,handler:impl Fn(&mut gpui::Window,&mut gpui::App)+'static)->Self{self.on_complete=Some(std::rc::Rc::new(handler));self}
 pub fn set_on_complete(&mut self,handler:impl Fn(&mut gpui::Window,&mut gpui::App)+'static,cx:&mut Context<Self>){self.on_complete=Some(std::rc::Rc::new(handler));cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:self.disabled,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn mode(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["numeric","alphanumeric"].contains(&value.as_ref()),"unsupported mode variant");self.variant_values.insert("mode",value);self}
pub fn set_mode(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["numeric","alphanumeric"].contains(&value.as_ref()),"unsupported mode variant");self.variant_values.insert("mode",value);cx.notify();}
pub fn disabled(mut self,value:bool)->Self {self.disabled=value;self}
pub fn set_disabled(&mut self,value:bool,cx:&mut Context<Self>){self.disabled=value;cx.notify();}
pub fn read_only(mut self,value:bool)->Self {self.read_only=value;self}
pub fn set_read_only(&mut self,value:bool,cx:&mut Context<Self>){self.read_only=value;cx.notify();}
pub fn field_label(mut self,value:impl Into<SharedString>)->Self {self.field_label=value.into();self}
pub fn set_field_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.field_label=value.into();cx.notify();}
pub fn aria_describedby(mut self,value:impl Into<SharedString>)->Self {self.aria_describedby=value.into();self}
pub fn set_aria_describedby(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.aria_describedby=value.into();cx.notify();}



}

impl Render for OTP{fn render(&mut self,window:&mut Window,_cx:&mut Context<Self>)->impl IntoElement{



 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:self.disabled,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"otp-root".to_string()).child(apply_part_style(div(),"group",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"otp-group".to_string())).id("otp");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
