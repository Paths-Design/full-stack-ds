// Generated from Progress normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Progress{content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub show_value:bool,}
impl Default for Progress{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("variant","".into());
variants.insert("size","".into());
variants.insert("intent","".into());Self{content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,show_value:false,}}}
impl Progress{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.width",value:"100%",token:None},StyleDeclaration {property:"box-model.height",value:"8px",token:None},StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"0",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"progress.color.text",value:"#474647",token:Some("semantic.color.foreground.secondary")},StyleDeclaration {property:"progress.spacing.gap",value:"2px",token:Some("core.spacing.size.02")},StyleDeclaration {property:"progress.motion.duration.indeterminate",value:"1500ms",token:Some("core.motion.duration.extra.long1")},StyleDeclaration {property:"progress.color.track.background",value:"#f7f7f7",token:Some("semantic.color.background.secondary")},StyleDeclaration {property:"progress.color.fill.info",value:"#0566fe",token:Some("semantic.color.status.info")},StyleDeclaration {property:"progress.color.fill.success",value:"#497f21",token:Some("semantic.color.status.success")},StyleDeclaration {property:"progress.color.fill.warning",value:"#ae5d00",token:Some("semantic.color.status.warning")},StyleDeclaration {property:"progress.color.fill.danger",value:"#d92d2e",token:Some("semantic.color.status.danger")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"width",value:"100%",token:Some("box-model.width")},StyleDeclaration {property:"height",value:"8px",token:Some("box-model.height")},StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"0",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")},StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"box-sizing",value:"border-box",token:None}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"progress.design.root.foreground.color",value:"#474647",token:Some("progress.color.text")},StyleDeclaration {property:"color",value:"#474647",token:Some("progress.design.root.foreground.color")},StyleDeclaration {property:"progress.design.root.spacing.gap",value:"2px",token:Some("progress.spacing.gap")},StyleDeclaration {property:"gap",value:"2px",token:Some("progress.design.root.spacing.gap")}]},
StyleRule {part:"track",conditions:&[],declarations:&[StyleDeclaration {property:"progress.design.track.background.fill",value:"#f7f7f7",token:Some("progress.color.track.background")},StyleDeclaration {property:"background-color",value:"#f7f7f7",token:Some("progress.design.track.background.fill")},StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"width",value:"100%",token:None},StyleDeclaration {property:"height",value:"100%",token:None},StyleDeclaration {property:"overflow",value:"hidden",token:None}]},
StyleRule {part:"fill",conditions:&[],declarations:&[StyleDeclaration {property:"progress.design.fill.background.fill",value:"#0566fe",token:Some("progress.color.fill.info")},StyleDeclaration {property:"background-color",value:"#0566fe",token:Some("progress.design.fill.background.fill")},StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"height",value:"100%",token:None}]},
StyleRule {part:"value",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"inline-block",token:None},StyleDeclaration {property:"progress.design.value.foreground.color",value:"#474647",token:Some("progress.color.text")},StyleDeclaration {property:"color",value:"#474647",token:Some("progress.design.value.foreground.color")},StyleDeclaration {property:"progress.design.value.typography.size",value:"0.875em",token:None},StyleDeclaration {property:"font-size",value:"0.875em",token:Some("progress.design.value.typography.size")}]},
StyleRule {part:"fill",conditions:&[StyleCondition::Variant {axis:"intent",value:"info"}],declarations:&[StyleDeclaration {property:"progress.design.condition-b054611f82c6.background.fill",value:"#0566fe",token:Some("progress.color.fill.info")},StyleDeclaration {property:"background-color",value:"#0566fe",token:Some("progress.design.condition-b054611f82c6.background.fill")}]},
StyleRule {part:"fill",conditions:&[StyleCondition::Variant {axis:"intent",value:"success"}],declarations:&[StyleDeclaration {property:"progress.design.condition-d88c0aa44206.background.fill",value:"#497f21",token:Some("progress.color.fill.success")},StyleDeclaration {property:"background-color",value:"#497f21",token:Some("progress.design.condition-d88c0aa44206.background.fill")}]},
StyleRule {part:"fill",conditions:&[StyleCondition::Variant {axis:"intent",value:"warning"}],declarations:&[StyleDeclaration {property:"progress.design.condition-542ca89dfc3d.background.fill",value:"#ae5d00",token:Some("progress.color.fill.warning")},StyleDeclaration {property:"background-color",value:"#ae5d00",token:Some("progress.design.condition-542ca89dfc3d.background.fill")}]},
StyleRule {part:"fill",conditions:&[StyleCondition::Variant {axis:"intent",value:"danger"}],declarations:&[StyleDeclaration {property:"progress.design.condition-fdd1c2c16a8f.background.fill",value:"#d92d2e",token:Some("progress.color.fill.danger")},StyleDeclaration {property:"background-color",value:"#d92d2e",token:Some("progress.design.condition-fdd1c2c16a8f.background.fill")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}
 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn variant(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["linear","circular",""].contains(&value.as_ref()),"unsupported variant variant");self.variant_values.insert("variant",value);self}
pub fn set_variant(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["linear","circular",""].contains(&value.as_ref()),"unsupported variant variant");self.variant_values.insert("variant",value);cx.notify();}
pub fn size(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["sm","md","lg",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);self}
pub fn set_size(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["sm","md","lg",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);cx.notify();}
pub fn intent(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["info","success","warning","danger",""].contains(&value.as_ref()),"unsupported intent variant");self.variant_values.insert("intent",value);self}
pub fn set_intent(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["info","success","warning","danger",""].contains(&value.as_ref()),"unsupported intent variant");self.variant_values.insert("intent",value);cx.notify();}
pub fn show_value(mut self,value:bool)->Self {self.show_value=value;self}
pub fn set_show_value(&mut self,value:bool,cx:&mut Context<Self>){self.show_value=value;cx.notify();}


 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"progress-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for Progress{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);
 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"progress-root".to_string()).child(apply_part_style(div(),"track",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"progress-track".to_string()).child(apply_part_style(div(),"fill",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"progress-fill".to_string()))).when(self.show_value,|node|node.child(apply_part_style(div(),"value",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"progress-value".to_string()).children(self.render_content(window,cx)))).id("progress");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);

 root.into_any_element()
}}
