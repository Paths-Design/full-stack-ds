// Generated from ProfileFlag normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct ProfileFlag{content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,}
impl Default for ProfileFlag{fn default()->Self {let mut variants=BTreeMap::new();Self{content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,}}}
impl ProfileFlag{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding-block-start",value:"2px",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"2px",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"4px",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"4px",token:None},StyleDeclaration {property:"box-model.min-height",value:"16px",token:Some("semantic.glyph.size.medium.extent")},StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"0",token:None},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"profile-flag.color.background",value:"#ffffff",token:Some("semantic.color.background.primary")},StyleDeclaration {property:"profile-flag.color.border.default",value:"#d0d0d0",token:Some("semantic.surface.border.subtle")},StyleDeclaration {property:"profile-flag.color.foreground.primary",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"profile-flag.size.radius",value:"6px",token:Some("semantic.shape.control.radius.default")},StyleDeclaration {property:"profile-flag.spacing.gap",value:"4px",token:Some("core.spacing.size.03")},StyleDeclaration {property:"profile-flag.spacing.padding.right",value:"16px",token:Some("core.spacing.size.06")},StyleDeclaration {property:"profile-flag.color.border.hover",value:"#888889",token:Some("semantic.color.border.bold")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding-block-start",value:"2px",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"2px",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline-start",value:"4px",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"4px",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"min-height",value:"16px",token:Some("box-model.min-height")},StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"gap",value:"0",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"flex-direction",value:"row",token:None},StyleDeclaration {property:"align-items",value:"center",token:None},StyleDeclaration {property:"box-sizing",value:"border-box",token:None}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"profile-flag.design.root.background.fill",value:"#ffffff",token:Some("profile-flag.color.background")},StyleDeclaration {property:"background-color",value:"#ffffff",token:Some("profile-flag.design.root.background.fill")},StyleDeclaration {property:"profile-flag.design.root.border.color",value:"#d0d0d0",token:Some("profile-flag.color.border.default")},StyleDeclaration {property:"border-color",value:"#d0d0d0",token:Some("profile-flag.design.root.border.color")},StyleDeclaration {property:"profile-flag.design.root.foreground.color",value:"#141414",token:Some("profile-flag.color.foreground.primary")},StyleDeclaration {property:"color",value:"#141414",token:Some("profile-flag.design.root.foreground.color")},StyleDeclaration {property:"profile-flag.design.root.shape.radius",value:"6px",token:Some("profile-flag.size.radius")},StyleDeclaration {property:"border-radius",value:"6px",token:Some("profile-flag.design.root.shape.radius")},StyleDeclaration {property:"profile-flag.design.root.spacing.gap",value:"4px",token:Some("profile-flag.spacing.gap")},StyleDeclaration {property:"gap",value:"4px",token:Some("profile-flag.design.root.spacing.gap")},StyleDeclaration {property:"profile-flag.design.root.spacing.padding",value:"16px",token:Some("profile-flag.spacing.padding.right")},StyleDeclaration {property:"padding",value:"16px",token:Some("profile-flag.design.root.spacing.padding")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Hover],declarations:&[StyleDeclaration {property:"profile-flag.design.hover.border.color",value:"#888889",token:Some("profile-flag.color.border.hover")},StyleDeclaration {property:"border-color",value:"#888889",token:Some("profile-flag.design.hover.border.color")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }




 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"profile-flag-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for ProfileFlag{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"profile-flag-root".to_string()).children(self.render_content(window,cx)).id("profile-flag");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);

 root.into_any_element()
}}
