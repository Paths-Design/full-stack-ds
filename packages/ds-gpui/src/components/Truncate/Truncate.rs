// Generated from Truncate normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Truncate{pub on_expanded_change:Option<crate::callback::ActionHandler>,content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub expandable:bool,pub expand_text:SharedString,pub collapse_text:SharedString,}
impl Default for Truncate{fn default()->Self {let mut variants=BTreeMap::new();Self{on_expanded_change:None,content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,expandable:false,expand_text:SharedString::default(),collapse_text:SharedString::default(),}}}
impl Truncate{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"4px",token:Some("semantic.display.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"truncate.color.foreground.link",value:"#d92d2e",token:Some("semantic.color.foreground.link")},StyleDeclaration {property:"truncate.typography.fontWeight",value:"500",token:Some("semantic.typography.font.weight.medium")},StyleDeclaration {property:"truncate.spacing.toggle",value:"2px",token:Some("core.spacing.size.02")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"4px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"block",token:None}]},
StyleRule {part:"content",conditions:&[],declarations:&[StyleDeclaration {property:"overflow",value:"hidden",token:None}]},
StyleRule {part:"content",conditions:&[StyleCondition::Variant {axis:"expanded",value:"true"}],declarations:&[StyleDeclaration {property:"display",value:"block",token:None}]},
StyleRule {part:"toggle",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-flex",token:None},StyleDeclaration {property:"align-items",value:"center",token:None},StyleDeclaration {property:"truncate.design.toggle.foreground.color",value:"#d92d2e",token:Some("truncate.color.foreground.link")},StyleDeclaration {property:"color",value:"#d92d2e",token:Some("truncate.design.toggle.foreground.color")},StyleDeclaration {property:"truncate.design.toggle.typography.weight",value:"500",token:Some("truncate.typography.fontWeight")},StyleDeclaration {property:"font-weight",value:"500",token:Some("truncate.design.toggle.typography.weight")},StyleDeclaration {property:"margin-top",value:"2px",token:Some("truncate.spacing.toggle")},StyleDeclaration {property:"truncate.design.toggle.spacing.padding",value:"0",token:None},StyleDeclaration {property:"padding",value:"0",token:Some("truncate.design.toggle.spacing.padding")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn on_expanded_change(mut self,handler:impl Fn(&mut gpui::Window,&mut gpui::App)+'static)->Self{self.on_expanded_change=Some(std::rc::Rc::new(handler));self}
 pub fn set_on_expanded_change(&mut self,handler:impl Fn(&mut gpui::Window,&mut gpui::App)+'static,cx:&mut Context<Self>){self.on_expanded_change=Some(std::rc::Rc::new(handler));cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }

pub fn expandable(mut self,value:bool)->Self {self.expandable=value;self}
pub fn set_expandable(&mut self,value:bool,cx:&mut Context<Self>){self.expandable=value;cx.notify();}
pub fn expand_text(mut self,value:impl Into<SharedString>)->Self {self.expand_text=value.into();self}
pub fn set_expand_text(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.expand_text=value.into();cx.notify();}
pub fn collapse_text(mut self,value:impl Into<SharedString>)->Self {self.collapse_text=value.into();self}
pub fn set_collapse_text(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.collapse_text=value.into();cx.notify();}


 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"truncate-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for Truncate{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"truncate-root".to_string()).child(apply_part_style(div(),"content",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"truncate-content".to_string()).children(self.render_content(window,cx))).when(self.expandable,|node|node.child(apply_part_style(div(),"toggle",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"truncate-toggle".to_string()))).id("truncate");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
