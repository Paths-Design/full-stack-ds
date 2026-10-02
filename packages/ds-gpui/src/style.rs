//! Contract-derived native style rules and token cascade. No component identities live here.
use gpui::{prelude::*, AbsoluteLength, DefiniteLength, Div, FontWeight, Hsla, Length, Rgba, px, rems};
use std::collections::BTreeMap;
#[derive(Clone,Debug)]
pub struct StyleRule { pub part:&'static str, pub conditions:&'static [StyleCondition], pub declarations:&'static [StyleDeclaration] }
#[derive(Clone,Copy,Debug)]
pub enum StyleCondition { Variant{axis:&'static str,value:&'static str},Checked(bool),Disabled(bool),Indeterminate(bool),Hover,Active,Focus }
#[derive(Clone,Copy,Debug)]
pub struct StyleDeclaration { pub property:&'static str,pub value:&'static str,pub token:Option<&'static str> }
#[derive(Clone,Debug,Default)]
pub struct StyleState<'a> { pub variants:&'a [(&'a str,&'a str)],pub checked:bool,pub disabled:bool,pub indeterminate:bool,pub hovered:bool,pub active:bool,pub focused:bool }
/// Overrides retain authored token identity rather than replacing generated style rules.
#[derive(Clone,Debug)]
pub struct Theme { pub tokens:BTreeMap<String,String>, pub rem_size_px:f32, pub inherited_font_size_px:f32 }
impl Default for Theme {fn default()->Self{Self{tokens:BTreeMap::new(),rem_size_px:16.,inherited_font_size_px:16.}}}
impl Theme {
 pub fn with_token(mut self,token:impl Into<String>,value:impl Into<String>)->Self {self.tokens.insert(token.into(),value.into());self}
 pub fn set_token(&mut self,token:impl Into<String>,value:impl Into<String>) {self.tokens.insert(token.into(),value.into());}
}
#[derive(Clone,Debug,PartialEq)]
pub struct ResolvedPartStyle { pub properties:BTreeMap<String,String>,pub rem_size_px:f32 }
impl Default for ResolvedPartStyle {fn default()->Self{Self{properties:BTreeMap::new(),rem_size_px:16.}}}
impl ResolvedPartStyle {pub fn get(&self,p:&str)->Option<&str>{self.properties.get(p).map(String::as_str)}}
#[derive(Clone,Debug,PartialEq)]
pub struct StyleError(pub String);
impl std::fmt::Display for StyleError {fn fmt(&self,f:&mut std::fmt::Formatter<'_>)->std::fmt::Result{f.write_str(&self.0)}}
impl std::error::Error for StyleError{}
fn matches(c:&StyleCondition,s:&StyleState<'_>)->bool {match c {
 StyleCondition::Variant{axis,value}=>s.variants.iter().any(|(a,v)|a==axis&&v==value),StyleCondition::Checked(v)=>s.checked==*v,StyleCondition::Disabled(v)=>s.disabled==*v,StyleCondition::Indeterminate(v)=>s.indeterminate==*v,StyleCondition::Hover=>s.hovered&&!s.disabled,StyleCondition::Active=>s.active&&!s.disabled,StyleCondition::Focus=>s.focused&&!s.disabled}}
/// Root definitions are inherited by parts; property declarations are not. Resolve matching
/// definitions before property consumers, including later state-dependent slot rebindings.
pub fn resolve_part_style(part:&str,rules:&[StyleRule],state:&StyleState<'_>,theme:&Theme)->Result<ResolvedPartStyle,StyleError>{
 let mut definitions=BTreeMap::new();let mut properties=Vec::new();
 let parent_part=part.split_once("::").map(|(parent,_)|parent);
 for rule in rules {if (rule.part=="root"||rule.part==part||Some(rule.part)==parent_part)&&rule.conditions.iter().all(|c|matches(c,state)){for d in rule.declarations{if d.property.contains('.') {definitions.insert(d.property,*d);} else if rule.part==part {properties.push(*d);}}}}
 fn resolve(d:&StyleDeclaration,defs:&BTreeMap<&str,StyleDeclaration>,theme:&Theme,visited:&mut Vec<String>)->Result<String,StyleError>{
  let Some(token)=d.token else{return Ok(d.value.into())};if let Some(v)=theme.tokens.get(token){return Ok(v.clone())}if visited.iter().any(|v|v==token){return Err(StyleError(format!("GPUI_TOKEN_CYCLE: {token}")))}
  if let Some(next)=defs.get(token){visited.push(token.into());let v=resolve(next,defs,theme,visited);visited.pop();v}else{Ok(d.value.into())}
 }
 let inherited_font=if part!="root" {
  let root=resolve_part_style("root",rules,state,theme)?;
  root.get("font-size").map(|v|absolute("font-size",v).map(|n|f32::from(n.to_pixels(px(theme.rem_size_px))))).transpose()?.unwrap_or(theme.inherited_font_size_px)
 }else{theme.inherited_font_size_px};
 let mut result=ResolvedPartStyle{rem_size_px:theme.rem_size_px,..Default::default()};for d in properties {
  let mut value=resolve(&d,&definitions,theme,&mut Vec::new())?;
  if value.split_whitespace().any(|v|v.ends_with("em")&&!v.ends_with("rem")){
   let font=result.get("font-size").map(|v|absolute("font-size",v).map(|n|f32::from(n.to_pixels(px(theme.rem_size_px))))).transpose()?.unwrap_or(inherited_font);
   value=value.split_whitespace().map(|v|{if let Some(n)=v.strip_suffix("em").filter(|_|!v.ends_with("rem")){number(d.property,n).map(|n|format!("{}px",n*font))}else{Ok(v.into())}}).collect::<Result<Vec<String>,StyleError>>()?.join(" ");
  }
  match d.property {
   "padding"|"margin"|"border-width" => {
    let values=edges(d.property,&value)?;
    for (i,edge) in ["top","right","bottom","left"].iter().enumerate() {
     let name=if d.property=="border-width" {format!("border-{edge}-width")}else{format!("{}-{edge}",d.property)};
     result.properties.insert(name,values[i].into());
    }
   }
   "gap" => {let values=edges("gap",&value)?;result.properties.insert("row-gap".into(),values[0].into());result.properties.insert("column-gap".into(),values[1].into());}
   "padding-block"=>{let values=edges("padding-block",&value)?;result.properties.insert("padding-top".into(),values[0].into());result.properties.insert("padding-bottom".into(),values[1].into());}
   "padding-inline"=>{let values=edges("padding-inline",&value)?;result.properties.insert("padding-left".into(),values[0].into());result.properties.insert("padding-right".into(),values[1].into());}
   "border-top"|"border-right"|"border-bottom"|"border-left" if value=="none"||value=="0"=>{
    result.properties.insert(format!("{}-style",d.property),"none".into());result.properties.insert(format!("{}-width",d.property),"0".into());
   }
   "padding-block-start"=>{result.properties.insert("padding-top".into(),value);}
   "padding-block-end"=>{result.properties.insert("padding-bottom".into(),value);}
   "padding-inline-start"=>{result.properties.insert("padding-left".into(),value);}
   "padding-inline-end"=>{result.properties.insert("padding-right".into(),value);}
   _=>{result.properties.insert(d.property.into(),value);}
  }
 }Ok(result)
}
fn error(p:&str,v:&str)->StyleError{StyleError(format!("GPUI_STYLE_VALUE_UNSUPPORTED: {p}={v}"))}
fn number(p:&str,v:&str)->Result<f32,StyleError>{v.trim().parse::<f32>().ok().filter(|n|n.is_finite()).ok_or_else(||error(p,v))}
fn absolute(p:&str,v:&str)->Result<AbsoluteLength,StyleError>{let v=v.trim();if let Some(n)=v.strip_suffix("px"){Ok(px(number(p,n)?).into())}else if let Some(n)=v.strip_suffix("rem"){Ok(rems(number(p,n)?).into())}else if v=="0"{Ok(px(0.).into())}else{Err(error(p,v))}}
fn definite(p:&str,v:&str)->Result<DefiniteLength,StyleError>{if let Some(n)=v.trim().strip_suffix('%'){Ok(DefiniteLength::Fraction(number(p,n)?/100.))}else{absolute(p,v).map(Into::into)}}
fn length(p:&str,v:&str)->Result<Length,StyleError>{if v.trim()=="auto"||v.trim()=="fit-content"{Ok(Length::Auto)}else{definite(p,v).map(Into::into)}}
fn color(p:&str,v:&str)->Result<Hsla,StyleError>{match v.trim(){
 "transparent"=>Ok(gpui::transparent_black()),"white"=>Ok(gpui::white()),"black"=>Ok(gpui::black()),v if v.starts_with('#')=>Rgba::try_from(v).map(Into::into).map_err(|_|error(p,v)),
 v if v.starts_with("rgb(")||v.starts_with("rgba(")=>{let b=v.split_once('(').unwrap().1.strip_suffix(')').ok_or_else(||error(p,v))?;let ns=b.split(',').map(|n|number(p,n)).collect::<Result<Vec<_>,_>>()?;if ns.len()!=3&&ns.len()!=4{return Err(error(p,v))}let a=ns.get(3).copied().unwrap_or(1.);if ns[..3].iter().any(|n|!(0. ..=255.).contains(n))||!(0. ..=1.).contains(&a){return Err(error(p,v))}Ok(Rgba{r:ns[0]/255.,g:ns[1]/255.,b:ns[2]/255.,a}.into())},_=>Err(error(p,v))}}
fn edges<'a>(p:&str,v:&'a str)->Result<[&'a str;4],StyleError>{let ns=v.split_whitespace().collect::<Vec<_>>();match ns.as_slice(){[a]=>Ok([a,a,a,a]),[a,b]=>Ok([a,b,a,b]),[a,b,c]=>Ok([a,b,c,b]),[a,b,c,d]=>Ok([a,b,c,d]),_=>Err(error(p,v))}}
/// Apply supported declarations to actual GPUI style fields; unsupported input fails visibly.
pub fn apply_resolved_style(mut e:Div,s:&ResolvedPartStyle)->Result<Div,StyleError>{
 for (property,value) in &s.properties{let p=property.as_str();let v=value.as_str();match p{
  "background-color"=>e=e.bg(color(p,v)?),"color"=>e=e.text_color(color(p,v)?),"border-color"|"border-top-color"|"border-right-color"|"border-bottom-color"|"border-left-color"=>e=e.border_color(color(p,v)?),
  "width"=>e.style().size.width=Some(length(p,v)?),"height"=>e.style().size.height=Some(length(p,v)?),
  "min-width"=>e.style().min_size.width=Some(length(p,v)?),"min-height"=>e.style().min_size.height=Some(length(p,v)?),
  "max-width"=>e.style().max_size.width=Some(length(p,v)?),"max-height"=>e.style().max_size.height=Some(length(p,v)?),
  "top"=>e.style().inset.top=Some(length(p,v)?),"right"=>e.style().inset.right=Some(length(p,v)?),"bottom"=>e.style().inset.bottom=Some(length(p,v)?),"left"=>e.style().inset.left=Some(length(p,v)?),
  "border-radius"=>{let n=if v=="50%"{px(9999.).into()}else{absolute(p,v)?};e.style().corner_radii.top_left=Some(n);e.style().corner_radii.top_right=Some(n);e.style().corner_radii.bottom_left=Some(n);e.style().corner_radii.bottom_right=Some(n);},
  "border-width"=>{let[t,r,b,l]=edges(p,v)?;e.style().border_widths.top=Some(absolute(p,t)?);e.style().border_widths.right=Some(absolute(p,r)?);e.style().border_widths.bottom=Some(absolute(p,b)?);e.style().border_widths.left=Some(absolute(p,l)?);},
  "border-top-width"=>e.style().border_widths.top=Some(absolute(p,v)?),"border-right-width"=>e.style().border_widths.right=Some(absolute(p,v)?),"border-bottom-width"=>e.style().border_widths.bottom=Some(absolute(p,v)?),"border-left-width"=>e.style().border_widths.left=Some(absolute(p,v)?),
  "padding"=>{let[t,r,b,l]=edges(p,v)?;e.style().padding.top=Some(definite(p,t)?);e.style().padding.right=Some(definite(p,r)?);e.style().padding.bottom=Some(definite(p,b)?);e.style().padding.left=Some(definite(p,l)?);},
  "padding-top"|"padding-block-start"=>e.style().padding.top=Some(definite(p,v)?),"padding-right"|"padding-inline-end"=>e.style().padding.right=Some(definite(p,v)?),"padding-bottom"|"padding-block-end"=>e.style().padding.bottom=Some(definite(p,v)?),"padding-left"|"padding-inline-start"=>e.style().padding.left=Some(definite(p,v)?),
  "margin"=>{let[t,r,b,l]=edges(p,v)?;e.style().margin.top=Some(length(p,t)?);e.style().margin.right=Some(length(p,r)?);e.style().margin.bottom=Some(length(p,b)?);e.style().margin.left=Some(length(p,l)?);},
  "margin-top"=>e.style().margin.top=Some(length(p,v)?),"margin-right"=>e.style().margin.right=Some(length(p,v)?),"margin-bottom"=>e.style().margin.bottom=Some(length(p,v)?),"margin-left"=>e.style().margin.left=Some(length(p,v)?),
  "gap"=>{let[r,c,_,_]=edges(p,v)?;e.style().gap.width=Some(definite(p,c)?);e.style().gap.height=Some(definite(p,r)?);},"row-gap"=>e.style().gap.height=Some(definite(p,v)?),"column-gap"=>e.style().gap.width=Some(definite(p,v)?),
  "font-size"=>e=e.text_size(absolute(p,v)?),"font-weight"=>e=e.font_weight(FontWeight(match v{"normal"=>400.,"bold"=>700.,_=>number(p,v)?})),"font-family"=>e=e.font_family(native_font_family(v)),
  "line-height"=>e=e.line_height(if v.parse::<f32>().is_ok(){DefiniteLength::Fraction(number(p,v)?)}else{definite(p,v)?}),
  "opacity"=>{let n=number(p,v)?;if !(0. ..=1.).contains(&n){return Err(error(p,v))}e=e.opacity(n);},
  "display"=>e=match v{"flex"|"inline-flex"=>e.flex(),"block"|"inline-block"=>e.block(),"none"=>e.hidden(),_=>return Err(error(p,v))},
  "position"=>e=match v{"relative"=>e.relative(),"absolute"=>e.absolute(),_=>return Err(error(p,v))},
  "flex-direction"=>e=match v{"row"=>e.flex_row(),"column"=>e.flex_col(),"row-reverse"=>e.flex_row_reverse(),"column-reverse"=>e.flex_col_reverse(),_=>return Err(error(p,v))},
  "flex-grow"=>e.style().flex_grow=Some(number(p,v)?),"flex-shrink"=>e.style().flex_shrink=Some(number(p,v)?),
  "align-items"=>e=match v{"start"|"flex-start"=>e.items_start(),"end"|"flex-end"=>e.items_end(),"center"=>e.items_center(),"baseline"=>e.items_baseline(),"stretch"=>{e.style().align_items=Some(gpui::AlignItems::Stretch);e},_=>return Err(error(p,v))},
  "align-self"=>{e.style().align_self=Some(match v{"start"|"flex-start"=>gpui::AlignSelf::FlexStart,"end"|"flex-end"=>gpui::AlignSelf::FlexEnd,"center"=>gpui::AlignSelf::Center,"stretch"=>gpui::AlignSelf::Stretch,_=>return Err(error(p,v))});},
  "justify-content"=>e=match v{"start"|"flex-start"=>e.justify_start(),"end"|"flex-end"=>e.justify_end(),"center"=>e.justify_center(),"space-between"=>e.justify_between(),"space-around"=>e.justify_around(),_=>return Err(error(p,v))},
  "overflow"=>{let overflow=match v{"hidden"=>gpui::Overflow::Hidden,"visible"=>gpui::Overflow::Visible,"scroll"=>gpui::Overflow::Scroll,_=>return Err(error(p,v))};e.style().overflow.x=Some(overflow);e.style().overflow.y=Some(overflow);},
  "text-align"=>e=match v{"left"|"start"=>e.text_left(),"right"|"end"=>e.text_right(),"center"=>e.text_center(),_=>return Err(error(p,v))},
  "white-space"=>e=match v{"normal"=>e.whitespace_normal(),"nowrap"=>e.whitespace_nowrap(),_=>return Err(error(p,v))},"text-overflow"=>e=match v{"ellipsis"=>e.text_ellipsis(),_=>return Err(error(p,v))},
  "border-style"=>match v{"solid"=>{},"none"=>{e.style().border_widths.top=Some(px(0.).into());e.style().border_widths.right=Some(px(0.).into());e.style().border_widths.bottom=Some(px(0.).into());e.style().border_widths.left=Some(px(0.).into());},_=>return Err(error(p,v))},
  "border-top-style"|"border-right-style"|"border-bottom-style"|"border-left-style" if v=="solid"||v=="none"=>{},
  "box-sizing" if v=="border-box"=>{},"translate"|"transform"|"outline-width"|"outline-color"|"outline-style"|"outline-offset"=>{},_=>return Err(error(p,v)),
 }}
 let mut dx=0.;let mut dy=0.;
 if let Some(v)=s.get("translate"){let ns=v.split_whitespace().collect::<Vec<_>>();if ns.is_empty()||ns.len()>2{return Err(error("translate",v))}dx+=translation("translate",ns[0],s.get("width"),s.rem_size_px)?;if let Some(y)=ns.get(1){dy+=translation("translate",y,s.get("height"),s.rem_size_px)?;}}
 if let Some(v)=s.get("transform"){for f in v.split(')').map(str::trim).filter(|f|!f.is_empty()){let(name,args)=f.split_once('(').ok_or_else(||error("transform",v))?;let ns=args.split(',').map(str::trim).collect::<Vec<_>>();match(name,ns.as_slice()){
  ("translateX",[x])=>dx+=translation("transform",x,s.get("width"),s.rem_size_px)?,("translateY",[y])=>dy+=translation("transform",y,s.get("height"),s.rem_size_px)?,("translate",[x,y])=>{dx+=translation("transform",x,s.get("width"),s.rem_size_px)?;dy+=translation("transform",y,s.get("height"),s.rem_size_px)?;},_=>return Err(error("transform",v)),}}}
 if dx!=0.{e.style().margin.left=Some(px(dx+margin_pixels(s.get("margin-left"),s.rem_size_px)?).into());}if dy!=0.{e.style().margin.top=Some(px(dy+margin_pixels(s.get("margin-top"),s.rem_size_px)?).into());}
 if s.get("border-style")==Some("none") {e.style().border_widths.top=Some(px(0.).into());e.style().border_widths.right=Some(px(0.).into());e.style().border_widths.bottom=Some(px(0.).into());e.style().border_widths.left=Some(px(0.).into());}
 if s.get("border-top-style")==Some("none"){e.style().border_widths.top=Some(px(0.).into());}
 if s.get("border-right-style")==Some("none"){e.style().border_widths.right=Some(px(0.).into());}
 if s.get("border-bottom-style")==Some("none"){e.style().border_widths.bottom=Some(px(0.).into());}
 if s.get("border-left-style")==Some("none"){e.style().border_widths.left=Some(px(0.).into());}
 Ok(e)
}
fn margin_pixels(v:Option<&str>,rem:f32)->Result<f32,StyleError>{v.map(|v|absolute("margin",v).map(|n|f32::from(n.to_pixels(px(rem))))).unwrap_or(Ok(0.))}
fn translation(p:&str,v:&str,basis:Option<&str>,rem:f32)->Result<f32,StyleError>{if let Some(n)=v.strip_suffix('%'){let basis=basis.ok_or_else(||error(p,v))?;Ok(number(p,n)?*f32::from(absolute(p,basis)?.to_pixels(px(rem)))/100.)}else{Ok(f32::from(absolute(p,v)?.to_pixels(px(rem))))}}
fn native_font_family(value:&str)->String{
 let families=value.split(',').map(|v|v.trim().trim_matches(['\"','\''])).collect::<Vec<_>>();
 // Native aliases have platform realizations. Prefer a portable generic fallback when an
 // authored web font family is not registered; a single explicit native override is retained.
 if families.iter().any(|v|matches!(*v,"ui-monospace"|"monospace")){"Menlo".into()}
 else if families.iter().any(|v|matches!(*v,"system-ui"|"sans-serif")){".SystemUIFont".into()}
 else{families.first().copied().unwrap_or(".SystemUIFont").into()}
}
pub fn apply_part_style(e:Div,part:&str,rules:&[StyleRule],state:&StyleState<'_>,theme:&Theme)->Div{
 use gpui::Refineable;
 let resolved=resolve_part_style(part,rules,state,theme).expect("generated GPUI token cascade must be valid");
 let e=apply_resolved_style(e,&resolved).expect("generated GPUI style declarations must be supported");
 let mut hovered=state.clone();hovered.hovered=true;
 let hover=resolve_part_style(part,rules,&hovered,theme).expect("generated GPUI hover cascade");
 let mut hover_div=apply_resolved_style(gpui::div(),&hover).expect("generated GPUI hover declarations");let refinement=hover_div.style().clone();
 let e=e.hover(move|mut style|{style.refine(&refinement);style});
 apply_outline(e,&resolved).expect("generated GPUI outline")
}
pub fn apply_interaction_style(e:gpui::Stateful<Div>,part:&str,rules:&[StyleRule],state:&StyleState<'_>,theme:&Theme)->gpui::Stateful<Div>{
 use gpui::Refineable;
 let mut active=state.clone();active.active=true;
 let mut active_div=apply_part_style(gpui::div(),part,rules,&active,theme);let refinement=active_div.style().clone();
 e.active(move|mut style|{style.refine(&refinement);style})
}
fn apply_outline(e:Div,s:&ResolvedPartStyle)->Result<Div,StyleError>{
 let Some(value)=s.get("outline-width") else{return Ok(e)};
 if s.get("outline-style")==Some("none"){return Ok(e)}
 if s.get("outline-style").is_some_and(|v|v!="solid"){return Err(error("outline-style",s.get("outline-style").unwrap()))}
 let width=absolute("outline-width",value)?;
 let offset=absolute("outline-offset",s.get("outline-offset").unwrap_or("0"))?;
 let color=color("outline-color",s.get("outline-color").unwrap_or("#000000"))?;
 let radius=if s.get("border-radius")==Some("50%") {px(9999.).into()}else{absolute("border-radius",s.get("border-radius").unwrap_or("0"))?};
 Ok(e.child(gpui::canvas(|_,_,_|(),move|bounds,_,window,_|{
  let width=width.to_pixels(window.rem_size());let offset=offset.to_pixels(window.rem_size());let radius=radius.to_pixels(window.rem_size());
  window.paint_quad(gpui::quad(bounds.dilate(width+offset),radius+width+offset,gpui::transparent_black(),width,color,gpui::BorderStyle::Solid));
 }).absolute().top(px(0.)).left(px(0.)).size_full()))
}

/// Pseudo marks are native vector shapes. Rotation applies around their authored box center
/// to border polygons, preserving asymmetric border geometry rather than substituting a glyph.
pub fn render_pseudo(part:&str,rules:&[StyleRule],state:&StyleState<'_>,theme:&Theme)->gpui::AnyElement{
 use gpui::{canvas,point,PathBuilder};
 let mut resolved=resolve_part_style(part,rules,state,theme).expect("valid native pseudo token cascade");
 let mut angle=0.;
 if let Some(transform)=resolved.get("transform").map(str::to_owned){
  let mut retained=Vec::new();
  for f in transform.split(')').map(str::trim).filter(|f|!f.is_empty()){
   if let Some(v)=f.strip_prefix("rotate("){angle=number("transform",v.trim_end_matches("deg")).expect("native rotate degrees");}
   else{retained.push(format!("{f})"));}
  }
  if retained.is_empty(){resolved.properties.remove("transform");}else{resolved.properties.insert("transform".into(),retained.join(" "));}
 }
 if angle==0.{return apply_resolved_style(gpui::div(),&resolved).expect("supported pseudo style").debug_selector(||part.to_string()).into_any_element();}
 let border=color("border-color",resolved.get("border-color").unwrap_or("transparent")).expect("pseudo border color");
 let widths=["border-top-width","border-right-width","border-bottom-width","border-left-width"].map(|p|f32::from(absolute(p,resolved.get(p).unwrap_or("0")).expect("pseudo border width").to_pixels(px(resolved.rem_size_px))));
 let background=resolved.get("background-color").map(|v|color("background-color",v).expect("pseudo background"));
 let mut placement=resolved.clone();placement.properties.remove("background-color");placement.properties.remove("border-color");
 for p in ["border-top-width","border-right-width","border-bottom-width","border-left-width"]{placement.properties.remove(p);}
 let e=apply_resolved_style(gpui::div(),&placement).expect("supported pseudo placement").debug_selector(||part.to_string());
 e.child(canvas(|_,_,_|(),move|bounds,_,window,_|{
  let w=f32::from(bounds.size.width);let h=f32::from(bounds.size.height);let x=f32::from(bounds.origin.x);let y=f32::from(bounds.origin.y);
  let theta=angle.to_radians();let(cos,sin)=(theta.cos(),theta.sin());
  let mut polygon=|points:&[(f32,f32)],fill:Hsla|{
   let mut path=PathBuilder::fill();
   for(i,(px_,py_))in points.iter().enumerate(){let dx=px_-w/2.;let dy=py_-h/2.;let p=point(px(x+w/2.+dx*cos-dy*sin),px(y+h/2.+dx*sin+dy*cos));if i==0{path.move_to(p);}else{path.line_to(p);}}
   path.close();window.paint_path(path.build().expect("native border polygon"),fill);
  };
  if let Some(fill)=background{polygon(&[(0.,0.),(w,0.),(w,h),(0.,h)],fill);}
  let[t,r,b,l]=widths;
  if t>0.{polygon(&[(0.,0.),(w,0.),(w,t),(0.,t)],border);}
  if r>0.{polygon(&[(w-r,0.),(w,0.),(w,h),(w-r,h)],border);}
  if b>0.{polygon(&[(0.,h-b),(w,h-b),(w,h),(0.,h)],border);}
  if l>0.{polygon(&[(0.,0.),(l,0.),(l,h),(0.,h)],border);}
 }).size_full()).into_any_element()
}
