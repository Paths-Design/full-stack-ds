// Generated from Image normalized contract IR. Do not hand-edit.
use std::collections::BTreeMap;
use gpui::{prelude::*,div,Context,SharedString,Window,FocusHandle};


use crate::style::{StyleRule,StyleCondition,StyleDeclaration,StyleState,Theme,ResolvedPartStyle,StyleError,resolve_part_style,apply_part_style,apply_interaction_style};

pub struct Image{pub label:SharedString,pub theme:Theme,pub focused:bool,pub variant_values:BTreeMap<&'static str,SharedString>,pub focus_handle:Option<FocusHandle>,pub show_placeholder:bool,pub src:SharedString,pub alt:SharedString,pub object_position:SharedString,pub sizes:SharedString,pub fallback_src:SharedString,}
impl Default for Image{fn default()->Self {let mut variants=BTreeMap::new();variants.insert("radius","".into());
variants.insert("size","".into());Self{label:SharedString::default(),theme:Theme::default(),focused:false,variant_values:variants,focus_handle:None,show_placeholder:false,src:SharedString::default(),alt:SharedString::default(),object_position:SharedString::default(),sizes:SharedString::default(),fallback_src:SharedString::default(),}}}
impl Image{
 pub const STYLE_RULES:&'static [StyleRule]=&[StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"box-model.max-width",value:"100%",token:None},StyleDeclaration {property:"box-model.padding",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-block-end",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-start",value:"0",token:None},StyleDeclaration {property:"box-model.padding-inline-end",value:"0",token:None},StyleDeclaration {property:"box-model.gap",value:"4px",token:Some("semantic.display.size.gap")},StyleDeclaration {property:"box-model.width",value:"auto",token:None},StyleDeclaration {property:"box-model.min-width",value:"0",token:None},StyleDeclaration {property:"box-model.height",value:"auto",token:None},StyleDeclaration {property:"box-model.min-height",value:"0",token:None},StyleDeclaration {property:"box-model.max-height",value:"none",token:None},StyleDeclaration {property:"image.color.background",value:"#f7f7f7",token:Some("semantic.color.background.secondary")},StyleDeclaration {property:"image.color.foreground.primary",value:"#141414",token:Some("semantic.color.foreground.primary")},StyleDeclaration {property:"image.size.xs",value:"24px",token:None},StyleDeclaration {property:"image.size.sm",value:"32px",token:None},StyleDeclaration {property:"image.size.md",value:"48px",token:None},StyleDeclaration {property:"image.size.lg",value:"64px",token:None},StyleDeclaration {property:"image.size.xl",value:"96px",token:None},StyleDeclaration {property:"image.radius.none",value:"0px",token:Some("semantic.shape.radius.none")},StyleDeclaration {property:"image.radius.sm",value:"4px",token:Some("semantic.shape.radius.small")},StyleDeclaration {property:"image.radius.md",value:"8px",token:Some("semantic.shape.radius.medium")},StyleDeclaration {property:"image.radius.lg",value:"16px",token:Some("semantic.shape.radius.large")},StyleDeclaration {property:"image.radius.full",value:"9999px",token:Some("semantic.shape.radius.full")}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"max-width",value:"100%",token:Some("box-model.max-width")},StyleDeclaration {property:"padding",value:"0",token:Some("box-model.padding")},StyleDeclaration {property:"padding-block",value:"0",token:Some("box-model.padding-block")},StyleDeclaration {property:"padding-block-start",value:"0",token:Some("box-model.padding-block-start")},StyleDeclaration {property:"padding-block-end",value:"0",token:Some("box-model.padding-block-end")},StyleDeclaration {property:"padding-inline",value:"0",token:Some("box-model.padding-inline")},StyleDeclaration {property:"padding-inline-start",value:"0",token:Some("box-model.padding-inline-start")},StyleDeclaration {property:"padding-inline-end",value:"0",token:Some("box-model.padding-inline-end")},StyleDeclaration {property:"gap",value:"4px",token:Some("box-model.gap")},StyleDeclaration {property:"min-width",value:"0",token:Some("box-model.min-width")},StyleDeclaration {property:"min-height",value:"0",token:Some("box-model.min-height")},StyleDeclaration {property:"display",value:"block",token:None}]},
StyleRule {part:"root",conditions:&[],declarations:&[StyleDeclaration {property:"display",value:"block",token:None},StyleDeclaration {property:"max-width",value:"100%",token:None},StyleDeclaration {property:"image.design.root.background.fill",value:"#f7f7f7",token:Some("image.color.background")},StyleDeclaration {property:"background-color",value:"#f7f7f7",token:Some("image.design.root.background.fill")},StyleDeclaration {property:"image.design.root.foreground.color",value:"#141414",token:Some("image.color.foreground.primary")},StyleDeclaration {property:"color",value:"#141414",token:Some("image.design.root.foreground.color")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"xs"}],declarations:&[StyleDeclaration {property:"image.design.condition-97f4094db01a.sizing.width",value:"24px",token:Some("image.size.xs")},StyleDeclaration {property:"width",value:"24px",token:Some("image.design.condition-97f4094db01a.sizing.width")},StyleDeclaration {property:"image.design.condition-97f4094db01a.sizing.height",value:"24px",token:Some("image.size.xs")},StyleDeclaration {property:"height",value:"24px",token:Some("image.design.condition-97f4094db01a.sizing.height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"sm"}],declarations:&[StyleDeclaration {property:"image.design.condition-2d67a81a05e1.sizing.width",value:"32px",token:Some("image.size.sm")},StyleDeclaration {property:"width",value:"32px",token:Some("image.design.condition-2d67a81a05e1.sizing.width")},StyleDeclaration {property:"image.design.condition-2d67a81a05e1.sizing.height",value:"32px",token:Some("image.size.sm")},StyleDeclaration {property:"height",value:"32px",token:Some("image.design.condition-2d67a81a05e1.sizing.height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"md"}],declarations:&[StyleDeclaration {property:"image.design.condition-8e1efb4eb84e.sizing.width",value:"48px",token:Some("image.size.md")},StyleDeclaration {property:"width",value:"48px",token:Some("image.design.condition-8e1efb4eb84e.sizing.width")},StyleDeclaration {property:"image.design.condition-8e1efb4eb84e.sizing.height",value:"48px",token:Some("image.size.md")},StyleDeclaration {property:"height",value:"48px",token:Some("image.design.condition-8e1efb4eb84e.sizing.height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"lg"}],declarations:&[StyleDeclaration {property:"image.design.condition-d030467f8081.sizing.width",value:"64px",token:Some("image.size.lg")},StyleDeclaration {property:"width",value:"64px",token:Some("image.design.condition-d030467f8081.sizing.width")},StyleDeclaration {property:"image.design.condition-d030467f8081.sizing.height",value:"64px",token:Some("image.size.lg")},StyleDeclaration {property:"height",value:"64px",token:Some("image.design.condition-d030467f8081.sizing.height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"xl"}],declarations:&[StyleDeclaration {property:"image.design.condition-f5bb7eeb08f7.sizing.width",value:"96px",token:Some("image.size.xl")},StyleDeclaration {property:"width",value:"96px",token:Some("image.design.condition-f5bb7eeb08f7.sizing.width")},StyleDeclaration {property:"image.design.condition-f5bb7eeb08f7.sizing.height",value:"96px",token:Some("image.size.xl")},StyleDeclaration {property:"height",value:"96px",token:Some("image.design.condition-f5bb7eeb08f7.sizing.height")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"size",value:"full"}],declarations:&[StyleDeclaration {property:"width",value:"100%",token:None},StyleDeclaration {property:"height",value:"auto",token:None}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"radius",value:"none"}],declarations:&[StyleDeclaration {property:"image.design.condition-7ff92e698786.shape.radius",value:"0px",token:Some("image.radius.none")},StyleDeclaration {property:"border-radius",value:"0px",token:Some("image.design.condition-7ff92e698786.shape.radius")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"radius",value:"sm"}],declarations:&[StyleDeclaration {property:"image.design.condition-82add41f9b7f.shape.radius",value:"4px",token:Some("image.radius.sm")},StyleDeclaration {property:"border-radius",value:"4px",token:Some("image.design.condition-82add41f9b7f.shape.radius")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"radius",value:"md"}],declarations:&[StyleDeclaration {property:"image.design.condition-7453c4d117a5.shape.radius",value:"8px",token:Some("image.radius.md")},StyleDeclaration {property:"border-radius",value:"8px",token:Some("image.design.condition-7453c4d117a5.shape.radius")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"radius",value:"lg"}],declarations:&[StyleDeclaration {property:"image.design.condition-339951a6bd4f.shape.radius",value:"16px",token:Some("image.radius.lg")},StyleDeclaration {property:"border-radius",value:"16px",token:Some("image.design.condition-339951a6bd4f.shape.radius")}]},
StyleRule {part:"root",conditions:&[StyleCondition::Variant {axis:"radius",value:"full"}],declarations:&[StyleDeclaration {property:"image.design.condition-6872d88ea9c6.shape.radius",value:"9999px",token:Some("image.radius.full")},StyleDeclaration {property:"border-radius",value:"9999px",token:Some("image.design.condition-6872d88ea9c6.shape.radius")}]}];
 pub fn label(mut self,value:impl Into<SharedString>)->Self{self.label=value.into();self}
 pub fn set_label(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.label=value.into();cx.notify();}
 pub fn theme(mut self,value:Theme)->Self{self.theme=value;self}
 pub fn set_theme(&mut self,value:Theme,cx:&mut Context<Self>){self.theme=value;cx.notify();}

 pub fn resolved_style(&self,part:&str)->Result<ResolvedPartStyle,StyleError>{
  let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
  let state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
  resolve_part_style(part,Self::STYLE_RULES,&state,&self.theme)
 }
 pub fn radius(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["none","sm","md","lg","full",""].contains(&value.as_ref()),"unsupported radius variant");self.variant_values.insert("radius",value);self}
pub fn set_radius(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["none","sm","md","lg","full",""].contains(&value.as_ref()),"unsupported radius variant");self.variant_values.insert("radius",value);cx.notify();}
pub fn size(mut self,value:impl Into<SharedString>)->Self {let value=value.into();assert!(["xs","sm","md","lg","xl","full",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);self}
pub fn set_size(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){let value=value.into();assert!(["xs","sm","md","lg","xl","full",""].contains(&value.as_ref()),"unsupported size variant");self.variant_values.insert("size",value);cx.notify();}
pub fn show_placeholder(mut self,value:bool)->Self {self.show_placeholder=value;self}
pub fn set_show_placeholder(&mut self,value:bool,cx:&mut Context<Self>){self.show_placeholder=value;cx.notify();}
pub fn src(mut self,value:impl Into<SharedString>)->Self {self.src=value.into();self}
pub fn set_src(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.src=value.into();cx.notify();}
pub fn alt(mut self,value:impl Into<SharedString>)->Self {self.alt=value.into();self}
pub fn set_alt(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.alt=value.into();cx.notify();}
pub fn object_position(mut self,value:impl Into<SharedString>)->Self {self.object_position=value.into();self}
pub fn set_object_position(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.object_position=value.into();cx.notify();}
pub fn sizes(mut self,value:impl Into<SharedString>)->Self {self.sizes=value.into();self}
pub fn set_sizes(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.sizes=value.into();cx.notify();}
pub fn fallback_src(mut self,value:impl Into<SharedString>)->Self {self.fallback_src=value.into();self}
pub fn set_fallback_src(&mut self,value:impl Into<SharedString>,cx:&mut Context<Self>){self.fallback_src=value.into();cx.notify();}



}

impl Render for Image{fn render(&mut self,window:&mut Window,_cx:&mut Context<Self>)->impl IntoElement{



 let variants:Vec<(&str,&str)>=self.variant_values.iter().map(|(axis,value)|(*axis,value.as_ref())).collect();
 self.theme.rem_size_px=f32::from(window.rem_size());self.theme.inherited_font_size_px=f32::from(window.text_style().font_size.to_pixels(window.rem_size()));let theme=self.theme.clone();
 self.focused=self.focus_handle.as_ref().map(|handle|handle.is_focused(window)).unwrap_or(false);

 let style_state=StyleState{variants:&variants,checked:false,disabled:false,indeterminate:false,hovered:false,active:false,focused:self.focused};
 let root=apply_part_style(div(),"root",Self::STYLE_RULES,&style_state,&theme).debug_selector(||"image-root".to_string()).when(!self.label.is_empty(),|node|node.child(div().debug_selector(||"image-label".to_string()).child(self.label.clone()))).id("image");
 let root=apply_interaction_style(root,"root",Self::STYLE_RULES,&style_state,&theme);


 root.into_any_element()
}}
