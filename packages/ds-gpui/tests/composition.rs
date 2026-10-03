//! Generated content APIs mounted in the real GPUI test dispatcher.
use full_stack_ds_gpui::{components::{Badge,Checkbox,Stat,Switch,Text},content::NativeContent,control::ChangeRequest,style};
use full_stack_ds_gpui::content;
use gpui::{prelude::*,div,px,AppContext,KeyDownEvent,KeyUpEvent,Keystroke,Modifiers,TestAppContext};
use std::{cell::Cell,rc::Rc};
// Emitted from synthetic normalized anatomy in factory.test.ts; that test
// drift-checks these bytes. This is a fixture, not an admitted corpus component.
mod fixture {include!("fixtures/SlotLayout.rs");}
use fixture::{SlotLayout,SlotLayoutSlot};
fn tap_space(cx:&mut gpui::VisualTestContext){let key=Keystroke::parse("space").unwrap();cx.simulate_event(KeyDownEvent{keystroke:key.clone(),is_held:false,prefer_character_input:false});cx.run_until_parked();cx.simulate_event(KeyUpEvent{keystroke:key});cx.run_until_parked();}

#[gpui::test]
fn mounted_nested_controls_own_pointer_focus_and_keyboard_requests(cx:&mut TestAppContext){
    let child=cx.new(|_|Checkbox::default());
    let (parent,cx)=cx.add_window_view(|_,_|Switch::default().content(NativeContent::view(child.clone())));
    let child_requests=Rc::new(Cell::new(0));let recorded=child_requests.clone();
    let _child=cx.update(|_,app|app.subscribe(&child,move|_,_:&ChangeRequest,_|recorded.set(recorded.get()+1)));
    let parent_requests=Rc::new(Cell::new(0));let recorded=parent_requests.clone();
    let _parent=cx.update(|_,app|app.subscribe(&parent,move|_,_:&ChangeRequest,_|recorded.set(recorded.get()+1)));
    let indicator=cx.debug_bounds("checkbox-indicator").unwrap();cx.simulate_click(indicator.center(),Modifiers::default());
    assert_eq!(child_requests.get(),1);assert_eq!(parent_requests.get(),0);
    let focus=child.read_with(cx,|control,_|control.focus_handle.clone().unwrap());assert!(cx.update(|window,_|focus.is_focused(window)));
    tap_space(cx);assert_eq!(child_requests.get(),2);assert_eq!(parent_requests.get(),0);
    child.update(cx,|control,cx|control.set_disabled(true,cx));cx.run_until_parked();
    cx.simulate_click(indicator.center(),Modifiers::default());tap_space(cx);
    assert_eq!(child_requests.get(),2);assert_eq!(parent_requests.get(),0,"disabled child cannot activate its ancestor");
}

#[gpui::test]
fn mounted_generated_children_preserve_control_state_focus_and_subscription(cx:&mut TestAppContext){
    let child=cx.new(|_|Switch::default().checked(Some(false)));
    let retained=NativeContent::view(child.clone());
    let (parent,cx)=cx.add_window_view(|_,_|Text::default().content(retained.clone()));
    let requests=Rc::new(Cell::new(0));let recorded=requests.clone();
    let _owner=cx.update(|_,app|app.subscribe(&child,move|entity,event:&ChangeRequest,app|{recorded.set(recorded.get()+1);entity.update(app,|control,cx|control.set_checked(Some(event.value),cx));}));
    let track=cx.debug_bounds("switch-track").unwrap();cx.simulate_click(track.center(),Modifiers::default());
    assert_eq!(requests.get(),1);assert!(child.read_with(cx,|control,_|control.state.value()));
    let focus=child.read_with(cx,|control,_|control.focus_handle.clone().unwrap());let id=child.entity_id();
    for variant in ["caption","headline","body"] {
        parent.update(cx,|parent,cx|{parent.set_variant(variant,cx);parent.set_theme(style::Theme::default().with_token("text.design.root.foreground.color","#108850"),cx);});cx.run_until_parked();
        assert_eq!(child.entity_id(),id);assert!(cx.update(|window,_|focus.is_focused(window)));
        let thumb=cx.debug_bounds("switch-thumb").unwrap();tap_space(cx);
        assert_ne!(cx.debug_bounds("switch-thumb").unwrap().origin.x,thumb.origin.x,"child redraw reaches layout without parent setter");
    }
    assert_eq!(requests.get(),4);assert!(!child.read_with(cx,|control,_|control.state.value()));
    parent.update(cx,|parent,cx|parent.set_content(NativeContent::Empty,cx));cx.run_until_parked();
    assert!(cx.debug_bounds("switch-track").is_none());assert!(!child.read_with(cx,|control,_|control.state.value()));
    parent.update(cx,|parent,cx|parent.set_content(retained.clone(),cx));cx.run_until_parked();
    assert_eq!(child.read_with(cx,|control,_|control.focus_handle.clone().unwrap()),focus);
    cx.update(|window,app|window.focus(&focus,app));tap_space(cx);assert_eq!(requests.get(),5);
    assert!(child.read_with(cx,|control,_|control.state.value()));
}

#[gpui::test]
fn mounted_explicit_empty_content_suppresses_label_and_clear_restores_it(cx:&mut TestAppContext){
    let (text,cx)=cx.add_window_view(|_,_|Text::default().label("Legacy label"));
    assert!(cx.debug_bounds("text-label").is_some());
    text.update(cx,|text,cx|text.set_content(NativeContent::Empty,cx));cx.run_until_parked();
    assert!(!text.read_with(cx,|text,_|text.has_content()));assert!(cx.debug_bounds("text-label").is_none());
    text.update(cx,|text,cx|text.set_label("Updated fallback",cx));cx.run_until_parked();assert!(cx.debug_bounds("text-label").is_none());
    text.update(cx,|text,cx|text.clear_content(cx));cx.run_until_parked();assert!(cx.debug_bounds("text-label").is_some());
    text.update(cx,|text,cx|text.set_content(NativeContent::text("Explicit text"),cx));cx.run_until_parked();
    assert!(text.read_with(cx,|text,_|text.has_content()));assert!(cx.debug_bounds("text-label").is_none());
}

#[gpui::test]
fn mounted_named_slots_preserve_locations_and_do_not_invoke_hidden_factories(cx:&mut TestAppContext){
    let primary_calls=Rc::new(Cell::new(0));let observed=primary_calls.clone();
    let primary=NativeContent::factory(move|_,_|{observed.set(observed.get()+1);div().w(px(31.)).h(px(9.)).debug_selector(||"primary-content".into())});
    let badge=cx.new(|_|Badge::default().content(NativeContent::text("Secondary")));
    let hidden_calls=Rc::new(Cell::new(0));let hidden=hidden_calls.clone();
    let (layout,cx)=cx.add_window_view(|_,_|SlotLayout::default().content(NativeContent::text("Body")).slot(SlotLayoutSlot::Primary,primary.clone()).slot(SlotLayoutSlot::Secondary,NativeContent::view(badge.clone())));
    assert!(cx.debug_bounds("slot-layout-body").is_some());assert!(cx.debug_bounds("slot-layout-fallback-label").is_some());
    let first=cx.debug_bounds("primary-content").unwrap();let second=cx.debug_bounds("badge-root").unwrap();assert!(second.top()>=first.bottom());
    let before=primary_calls.get();layout.update(cx,|layout,cx|{layout.set_size("lg",cx);layout.set_slot(SlotLayoutSlot::Optional,NativeContent::factory(move|_,_|{hidden.set(hidden.get()+1);div().debug_selector(||"hidden-optional".into())}),cx);});cx.run_until_parked();
    assert!(primary_calls.get()>before);assert_eq!(hidden_calls.get(),0,"inverted presence guard must precede factory materialization");
    assert!(cx.debug_bounds("slot-layout-fallback-label").is_none());assert!(cx.debug_bounds("hidden-optional").is_none());
    layout.update(cx,|layout,cx|layout.clear_slot(SlotLayoutSlot::Primary,cx));cx.run_until_parked();
    assert!(cx.debug_bounds("primary-content").is_none());assert!(cx.debug_bounds("badge-root").is_some());
    let before=primary_calls.get();layout.update(cx,|layout,cx|{layout.set_slot(SlotLayoutSlot::Primary,primary.clone(),cx);layout.clear_slot(SlotLayoutSlot::Optional,cx);layout.set_content(NativeContent::Empty,cx);});cx.run_until_parked();
    assert!(primary_calls.get()>before);assert_eq!(hidden_calls.get(),0);assert!(cx.debug_bounds("slot-layout-body").is_none());
    assert!(cx.debug_bounds("slot-layout-fallback-label").is_some());assert!(cx.debug_bounds("badge-root").is_some());
}

#[gpui::test]
fn mounted_stat_variants_and_retained_content_reach_layout(cx:&mut TestAppContext){
    let (stat,cx)=cx.add_window_view(|_,_|Stat::default().content(NativeContent::text("104")).trend("up"));
    assert!(cx.debug_bounds("stat-root").unwrap().size.width>px(0.));
    assert_eq!(stat.read_with(cx,|stat,_|stat.resolved_style("root").unwrap().get("font-size").map(str::to_owned)),Some("24px".into()));
    assert_eq!(stat.read_with(cx,|stat,_|stat.resolved_style("root").unwrap().get("color").map(str::to_owned)),Some("#497f21".into()));
    stat.update(cx,|stat,cx|{stat.set_size("lg",cx);stat.set_trend("down",cx);});cx.run_until_parked();
    assert_eq!(stat.read_with(cx,|stat,_|stat.resolved_style("root").unwrap().get("font-size").map(str::to_owned)),Some("32px".into()));
    assert_eq!(stat.read_with(cx,|stat,_|stat.resolved_style("root").unwrap().get("color").map(str::to_owned)),Some("#d92d2e".into()));
    stat.update(cx,|stat,cx|stat.set_trend("",cx));cx.run_until_parked();
    assert_eq!(stat.read_with(cx,|stat,_|stat.resolved_style("root").unwrap().get("color").map(str::to_owned)),Some("#141414".into()),"unset trend restores the authored default, not neutral styling");
}
