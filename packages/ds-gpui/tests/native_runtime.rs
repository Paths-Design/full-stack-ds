//! Real generated GPUI entities mounted in GPUI's layout and platform-input dispatcher.
//! The TestWindow does not establish physical OS input or GPU-rendered pixels.
use full_stack_ds_gpui::components::{Badge, Checkbox, Divider, Switch, Text, ToggleSwitch};
use full_stack_ds_gpui::control::ChangeRequest;
use full_stack_ds_gpui::style::{apply_resolved_style, Theme};
use gpui::{prelude::*, div, point, px, size, AppContext, Context, Entity, KeyDownEvent, Keystroke, Modifiers, Render, TestAppContext, Window};
use std::{cell::{Cell, RefCell}, rc::Rc};

#[gpui::test]
fn mounted_switch_pointer_space_owner_acceptance_and_disabled_suppression(cx: &mut TestAppContext) {
    let (view, cx) = cx.add_window_view(|_, _| Switch::default().checked(Some(false)));
    let requests = Rc::new(RefCell::new(Vec::new()));
    let recorded = requests.clone();
    let _events = cx.update(|_, app| app.subscribe(&view, move |_, event: &ChangeRequest, _| recorded.borrow_mut().push(event.clone())));
    let track = cx.debug_bounds("switch-track").expect("generated Switch track must render");
    assert_eq!(track.size, size(px(48.), px(24.)));
    cx.simulate_click(track.center(), Modifiers::default());
    assert_eq!(requests.borrow().len(), 1);
    assert_eq!(requests.borrow()[0], ChangeRequest { channel: "checked", handler: "onChange", value: true });
    assert!(!view.read_with(cx, |control, _| control.state.value()), "controlled refusal preserves owner value");
    let focused = view.read_with(cx, |control, _| control.focus_handle.clone().unwrap());
    assert!(cx.update(|window, _| focused.is_focused(window)));
    cx.simulate_keystrokes("space enter");
    assert_eq!(requests.borrow().len(), 2, "checkbox-host Enter must not activate");
    let notified = Rc::new(Cell::new(0)); let notified_copy = notified.clone();
    let _notifications = cx.update(|_, app| app.observe(&view, move |_, _| notified_copy.set(notified_copy.get() + 1)));
    let _accept = cx.update(|_, app| app.subscribe(&view, |entity, event: &ChangeRequest, app| entity.update(app, |control, cx| control.set_checked(Some(event.value), cx))));
    let before = cx.debug_bounds("switch-thumb").unwrap();
    cx.simulate_keystrokes("space");
    assert!(view.read_with(cx, |control, _| control.state.value()));
    assert_eq!(requests.borrow().len(), 3);
    assert!(notified.get() > 0, "mounted owner setter must notify rendering observers");
    let after = cx.debug_bounds("switch-thumb").unwrap();
    assert_eq!(after.origin.x - before.origin.x, px(24.), "owner acceptance must repaint the thumb");
    assert!(cx.update(|window, _| focused.is_focused(window)), "focus identity survives acceptance redraw");
    view.update(cx, |control, cx| control.set_disabled(true, cx));
    cx.run_until_parked();
    cx.simulate_click(track.center(), Modifiers::default());
    cx.simulate_keystrokes("space enter");
    assert_eq!(requests.borrow().len(), 3);
    assert!(view.read_with(cx, |control, _| control.state.value()));
}

#[gpui::test]
fn mounted_toggle_button_enter_and_space_request_once(cx: &mut TestAppContext) {
    let (view, cx) = cx.add_window_view(|_, _| ToggleSwitch::default().label("Selection"));
    let requests = Rc::new(RefCell::new(Vec::new())); let recorded = requests.clone();
    let _events = cx.update(|_, app| app.subscribe(&view, move |_, event: &ChangeRequest, _| recorded.borrow_mut().push(event.value)));
    let root = cx.debug_bounds("toggle-switch-root").expect("generated ToggleSwitch root");
    cx.simulate_click(root.center(), Modifiers::default());
    cx.simulate_keystrokes("enter space");
    assert_eq!(*requests.borrow(), vec![true, false, true]);
    cx.simulate_event(KeyDownEvent { keystroke: Keystroke::parse("space").unwrap(), is_held: true });
    cx.simulate_keystrokes("ctrl-space cmd-space alt-space");
    assert_eq!(*requests.borrow(), vec![true, false, true]);
    view.update(cx, |control, cx| control.set_disabled(true, cx));
    cx.run_until_parked();
    cx.simulate_click(root.center(), Modifiers::default());
    cx.simulate_keystrokes("enter space");
    assert_eq!(*requests.borrow(), vec![true, false, true]);
}

#[gpui::test]
fn mounted_checkbox_mixed_mark_and_hover_owner(cx: &mut TestAppContext) {
    let (view, cx) = cx.add_window_view(|_, _| Checkbox::default().label("A label outside the indicator").default_checked(true).indeterminate(true));
    let mark = cx.debug_bounds("indicator::after").expect("generated pseudo mark");
    assert_eq!(mark.size, size(px(8.), px(2.)), "mixed has priority over a simultaneously checked value");
    let indicator = cx.debug_bounds("checkbox-indicator").unwrap();
    assert_eq!(indicator.size, size(px(16.), px(16.)));
    let label = cx.debug_bounds("checkbox-label").expect("native visible label");
    assert!(!indicator.contains(&label.center()));
    cx.simulate_mouse_move(label.center(), None, Modifiers::default());
    assert!(view.read_with(cx, |control, _| control.hovered));
    assert_eq!(view.read_with(cx, |control, _| control.resolved_style("indicator").unwrap().get("border-color").map(str::to_owned)), Some("#888889".into()));
    view.update(cx, |control, cx| control.set_indeterminate(false, cx));
    cx.run_until_parked();
    assert_eq!(cx.debug_bounds("indicator::after").unwrap().size, size(px(5.), px(9.)));
    view.update(cx, |control, cx| control.set_disabled(true, cx));
    cx.run_until_parked();
    assert_eq!(view.read_with(cx, |control, _| control.resolved_style("indicator").unwrap().get("border-color").map(str::to_owned)), Some("#a0a0a1".into()));
    let requests = Rc::new(Cell::new(0)); let recorded = requests.clone();
    let _events = cx.update(|_, app| app.subscribe(&view, move |_, _: &ChangeRequest, _| recorded.set(recorded.get() + 1)));
    cx.simulate_click(indicator.center(), Modifiers::default());
    cx.simulate_keystrokes("space enter");
    assert_eq!(requests.get(), 0);
}

struct GeometryHost { controls: [Entity<Switch>; 2] }
impl Render for GeometryHost {
    fn render(&mut self, _: &mut Window, _: &mut Context<Self>) -> impl IntoElement {
        // The primary specimen renders last, so shared generated part selectors address it.
        div().flex().flex_col().items_start().children(self.controls.iter().cloned())
    }
}

#[gpui::test]
fn mounted_switch_variant_geometry_and_component_token_override(cx: &mut TestAppContext) {
    let (host, cx) = cx.add_window_view(|_, cx| GeometryHost { controls: [cx.new(|_| Switch::default().default_checked(true)), cx.new(|_| Switch::default())] });
    let controls = host.read_with(cx, |host, _| host.controls.clone());
    let neighbor = controls[0].clone();
    let view = controls[1].clone();
    for (variant, track_size, thumb_size, travel) in [
        ("sm", size(px(32.), px(16.)), px(12.), px(16.)),
        ("md", size(px(48.), px(24.)), px(16.), px(24.)),
        ("lg", size(px(64.), px(32.)), px(24.), px(36.)),
    ] {
        view.update(cx, |control, cx| { control.set_size(variant, cx); control.set_checked(Some(false), cx); });
        cx.run_until_parked();
        assert_eq!(cx.debug_bounds("switch-track").unwrap().size, track_size);
        let before = cx.debug_bounds("switch-thumb").unwrap();
        assert_eq!(before.size, size(thumb_size, thumb_size));
        view.update(cx, |control, cx| control.set_checked(Some(true), cx));
        cx.run_until_parked();
        let after = cx.debug_bounds("switch-thumb").unwrap();
        assert_eq!(after.origin.x - before.origin.x, travel);
        assert_eq!(after.origin.y, before.origin.y);
    }
    view.update(cx, |control, cx| control.set_theme(Theme::default().with_token("switch.design.track.background.fill", "#108850"), cx));
    cx.run_until_parked();
    let style = view.read_with(cx, |control, _| control.resolved_style("track").unwrap());
    assert_eq!(style.get("background-color"), Some("#108850"));
    let adjacent_style = neighbor.read_with(cx, |control, _| control.resolved_style("track").unwrap());
    assert_eq!(adjacent_style.get("background-color"), Some("#d92d2e"), "per-instance theme overrides cannot leak to an adjacent mounted component");
    cx.draw(point(px(0.), px(0.)), size(px(100.), px(100.)), |window, app| {
        let mut element = apply_resolved_style(div(), &style).unwrap();
        let actual = element.interactivity().compute_style(None, None, window, app);
        assert_eq!(actual.background.unwrap().color().unwrap(), gpui::rgb(0x108850).into());
        element
    });
    cx.draw(point(px(0.), px(0.)), size(px(100.), px(100.)), |window, app| {
        let mut element = apply_resolved_style(div(), &adjacent_style).unwrap();
        let actual = element.interactivity().compute_style(None, None, window, app);
        assert_eq!(actual.background.unwrap().color().unwrap(), gpui::rgb(0xd92d2e).into());
        element
    });
}

struct FocusHost { controls: [Entity<Switch>; 3] }
impl Render for FocusHost {
    fn render(&mut self, _: &mut Window, _: &mut Context<Self>) -> impl IntoElement {
        div().flex().flex_col().items_start().children(self.controls.iter().cloned()).on_key_down(|event, window, cx| {
            if event.keystroke.key == "tab" { if event.keystroke.modifiers.shift { window.focus_prev(); } else { window.focus_next(); } cx.stop_propagation(); }
        })
    }
}

#[gpui::test]
fn mounted_tab_order_skips_disabled_and_focus_is_stable(cx: &mut TestAppContext) {
    let (host, cx) = cx.add_window_view(|_, cx| FocusHost { controls: [cx.new(|_| Switch::default().label("First")), cx.new(|_| Switch::default().label("Disabled").disabled(true)), cx.new(|_| Switch::default().label("Last"))] });
    let controls = host.read_with(cx, |host, _| host.controls.clone());
    let first = controls[0].read_with(cx, |control, _| control.focus_handle.clone().unwrap());
    let disabled = controls[1].read_with(cx, |control, _| control.focus_handle.clone().unwrap());
    let last = controls[2].read_with(cx, |control, _| control.focus_handle.clone().unwrap());
    cx.update(|window, _| window.focus(&first));
    cx.run_until_parked();
    cx.simulate_keystrokes("tab");
    assert!(cx.update(|window, _| last.is_focused(window)));
    assert!(!cx.update(|window, _| disabled.is_focused(window)));
    cx.simulate_keystrokes("shift-tab");
    assert!(cx.update(|window, _| first.is_focused(window)));
    controls[1].update(cx, |control, cx| control.set_disabled(false, cx));
    cx.run_until_parked();
    cx.simulate_keystrokes("tab");
    assert!(cx.update(|window, _| disabled.is_focused(window)), "enabling a mounted control adds its existing handle to tab order");
    controls[1].update(cx, |control, cx| control.set_disabled(true, cx));
    cx.update(|window, _| window.focus(&first));
    cx.run_until_parked();
    cx.simulate_keystrokes("tab");
    assert!(cx.update(|window, _| last.is_focused(window)), "disabling a mounted control removes its handle from tab order");
    cx.simulate_keystrokes("shift-tab");
    controls[0].update(cx, |control, cx| control.set_size("lg", cx));
    cx.run_until_parked();
    assert!(cx.update(|window, _| first.is_focused(window)), "a variant redraw preserves the same focus handle");
}

struct StaticHost { text: Entity<Text>, badge: Entity<Badge>, divider: Entity<Divider> }
impl Render for StaticHost {
    fn render(&mut self, _: &mut Window, _: &mut Context<Self>) -> impl IntoElement {
        div().flex().flex_col().items_start().gap_2().child(self.text.clone()).child(self.badge.clone()).child(self.divider.clone())
    }
}

#[gpui::test]
fn mounted_static_typography_badge_and_divider_are_styled(cx: &mut TestAppContext) {
    let (host, cx) = cx.add_window_view(|_, cx| StaticHost {
        text: cx.new(|_| Text::default().label("let value = 42;")),
        badge: cx.new(|_| Badge::default().label("Ready")),
        divider: cx.new(|_| Divider::default()),
    });
    let (text, badge, divider) = host.read_with(cx, |host, _| (host.text.clone(), host.badge.clone(), host.divider.clone()));
    assert_eq!(badge.read_with(cx, |control, _| control.resolved_style("root").unwrap().get("background-color").map(str::to_owned)), Some("#f7f7f7".into()));
    assert_eq!(cx.debug_bounds("badge-root").unwrap().size.height, px(24.));
    text.update(cx, |control, cx| control.set_variant("code", cx));
    badge.update(cx, |control, cx| { control.set_size("lg", cx); control.set_intent("success", cx); });
    divider.update(cx, |control, cx| control.set_orientation("vertical", cx));
    cx.run_until_parked();
    assert_eq!(cx.debug_bounds("badge-root").unwrap().size.height, px(32.));
    let text_style = text.read_with(cx, |control, _| control.resolved_style("root").unwrap());
    cx.draw(point(px(0.), px(0.)), size(px(100.), px(100.)), |window, app| {
        let mut element = apply_resolved_style(div(), &text_style).unwrap();
        let actual = element.interactivity().compute_style(None, None, window, app);
        assert_eq!(actual.text.font_family.as_ref().map(|value| value.as_ref()), Some("Menlo"));
        assert_eq!(actual.text.font_size.unwrap().to_pixels(px(16.)), px(14.));
        element
    });
    let badge_style = badge.read_with(cx, |control, _| control.resolved_style("root").unwrap());
    assert_eq!(badge_style.get("padding-top"), Some("4px"));
    assert_eq!(badge_style.get("padding-left"), Some("12px"));
    assert_eq!(badge_style.get("background-color"), Some("#b3dba7"));
    assert_eq!(badge_style.get("color"), Some("#2c4f09"));
    assert_eq!(badge_style.get("border-color"), Some("#3a6614"));
    cx.draw(point(px(0.), px(0.)), size(px(100.), px(100.)), |window, app| {
        let mut element = apply_resolved_style(div(), &badge_style).unwrap();
        let actual = element.interactivity().compute_style(None, None, window, app);
        assert_eq!(actual.background.unwrap().color().unwrap(), gpui::rgb(0xb3dba7).into());
        assert_eq!(actual.text.color.unwrap(), gpui::rgb(0x2c4f09).into());
        assert_eq!(actual.border_color.unwrap(), gpui::rgb(0x3a6614).into());
        assert_eq!(actual.text.font_size.unwrap().to_pixels(px(16.)), px(14.));
        element
    });
    let divider_style = divider.read_with(cx, |control, _| control.resolved_style("root").unwrap());
    assert_eq!(divider_style.get("border-top-style"), Some("none"));
    assert_eq!(divider_style.get("border-left-width"), Some("1px"));
    let bounds = cx.debug_bounds("divider-root").unwrap();
    assert_eq!(bounds.size.width, px(1.));
    assert!(bounds.size.height >= px(16.));
    text.update(cx, |control, cx| { control.set_variant("display", cx); control.set_size("md", cx); control.set_weight("semibold", cx); });
    cx.run_until_parked();
    let cascade = text.read_with(cx, |control, _| control.resolved_style("root").unwrap());
    cx.draw(point(px(0.), px(0.)), size(px(100.), px(100.)), |window, app| {
        let mut element = apply_resolved_style(div(), &cascade).unwrap();
        let actual = element.interactivity().compute_style(None, None, window, app);
        assert_eq!(actual.text.font_size.unwrap().to_pixels(px(16.)), px(16.), "explicit size overrides the display variant ramp");
        assert_eq!(actual.text.font_weight.unwrap(), gpui::FontWeight(600.));
        element
    });
}
