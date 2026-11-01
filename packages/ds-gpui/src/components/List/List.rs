// Generated from List normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};
use crate::content::NativeContent;

use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct List{content:Option<NativeContent>,pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,}
impl Default for List{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("variant","default".into());
variants.insert("marker","default".into());
variants.insert("spacing","".into());
variants.insert("size","".into());Self{content:None,label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,}}}
impl List{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"16px",token:Some("semantic.structure.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.max-width",value:"none",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"list.color.foreground.primary",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"list.color.border",value:"#d0d0d0",token:Some("semantic.surface.border.subtle")},StyleDeclaration {property:"list.size.padding",value:"16px",token:Some("core.spacing.size.06")},StyleDeclaration {property:"list.size.sm",value:"14px",token:Some("semantic.typography.body.03")},StyleDeclaration {property:"list.size.md",value:"16px",token:Some("semantic.typography.body.02")},StyleDeclaration {property:"list.size.lg",value:"18px",token:Some("semantic.typography.body.01")},StyleDeclaration {property:"list.spacing.none",value:"0px",token:Some("core.spacing.size.00")},StyleDeclaration {property:"list.spacing.sm",value:"8px",token:Some("core.spacing.size.04")},StyleDeclaration {property:"list.spacing.md",value:"12px",token:Some("core.spacing.size.05")},StyleDeclaration {property:"list.spacing.lg",value:"24px",token:Some("core.spacing.size.07")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"16px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"list.design.root.foreground.color",value:"#141414",token:Some("list.color.foreground.primary")},StyleDeclaration {property:"color",value:"#141414",token:Some("list.design.root.foreground.color")},StyleDeclaration {property:"list.design.root.border.color",value:"#d0d0d0",token:Some("list.color.border")},StyleDeclaration {property:"border-color",value:"#d0d0d0",token:Some("list.design.root.border.color")},StyleDeclaration {property:"list.design.root.spacing.padding",value:"16px",token:Some("list.size.padding")},StyleDeclaration {property:"padding",value:"16px",token:Some("list.design.root.spacing.padding")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"sm"}],declarations:&[StyleDeclaration {property:"list.design.condition-f14e3fae918a.typography.size",value:"14px",token:Some("list.size.sm")},StyleDeclaration {property:"font-size",value:"14px",token:Some("list.design.condition-f14e3fae918a.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"md"}],declarations:&[StyleDeclaration {property:"list.design.condition-8791efdf7f0f.typography.size",value:"16px",token:Some("list.size.md")},StyleDeclaration {property:"font-size",value:"16px",token:Some("list.design.condition-8791efdf7f0f.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"lg"}],declarations:&[StyleDeclaration {property:"list.design.condition-b1a65b7b2e57.typography.size",value:"18px",token:Some("list.size.lg")},StyleDeclaration {property:"font-size",value:"18px",token:Some("list.design.condition-b1a65b7b2e57.typography.size")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"variant",value:"unstyled"}],declarations:&[StyleDeclaration {property:"list.design.condition-45022d26848f.spacing.padding",value:"0",token:None},StyleDeclaration {property:"padding",value:"0",token:Some("list.design.condition-45022d26848f.spacing.padding")},StyleDeclaration {property:"margin",value:"0",token:None}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"variant",value:"inline"}],declarations:&[StyleDeclaration {property:"display",value:"flex",token:None},StyleDeclaration {property:"flex-direction",value:"row",token:None},StyleDeclaration {property:"list.design.condition-49c5416e5f1d.spacing.gap",value:"12px",token:Some("list.spacing.md")},StyleDeclaration {property:"gap",value:"12px",token:Some("list.design.condition-49c5416e5f1d.spacing.gap")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}

 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn variant(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["default","unstyled","inline","divided","spaced"].contains(&value.as_ref()),"unsupported variant variant");self.variant_values.insert("variant",value);self}
pub fn set_variant(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["default","unstyled","inline","divided","spaced"].contains(&value.as_ref()),"unsupported variant variant");self.variant_values.insert("variant",value);cx.notify();}
pub fn marker(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["default","none","disc","circle","square","decimal","alpha","roman"].contains(&value.as_ref()),"unsupported marker variant");self.variant_values.insert("marker",value);self}
pub fn set_marker(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["default","none","disc","circle","square","decimal","alpha","roman"].contains(&value.as_ref()),"unsupported marker variant");self.variant_values.insert("marker",value);cx.notify();}
pub fn spacing(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["none","sm","md","lg",""].contains(&value.as_ref()),"unsupported spacing variant");self.variant_values.insert("spacing",value);self}
pub fn set_spacing(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["none","sm","md","lg",""].contains(&value.as_ref()),"unsupported spacing variant");self.variant_values.insert("spacing",value);cx.notify();}
pub fn size(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["sm","md","lg",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);self}
pub fn set_size(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["sm","md","lg",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);cx.notify();}



 pub fn content(mut self,value:NativeContent)->Self{self.content=Some(value);self}
 pub fn set_content(&mut self,value:NativeContent,cx:&mut Context<Self>){self.content=Some(value);cx.notify();}
 pub fn clear_content(&mut self,cx:&mut Context<Self>){self.content=None;cx.notify();}
 pub fn has_content(&self)->bool{self.content.as_ref().map(NativeContent::is_present).unwrap_or(!self.label.is_empty())}
 fn render_content(&self,window:&mut Window,cx:&mut gpui::App)->Vec<gpui::AnyElement>{
  match &self.content {Some(content)=>content.render(window,cx),None=>if self.label.is_empty(){Vec::new()}else{vec![div().debug_selector(||"list-label".to_string()).child(self.label.clone()).into_any_element()]}}
 }


}

impl Render for List{fn render(&mut self,window:&mut Window,cx:&mut Context<Self>)->impl IntoElement{
 NativeContent::assert_unique_views(self.content.iter());


 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"list-root".to_string()).children(self.render_content(window,cx)).id("list");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
