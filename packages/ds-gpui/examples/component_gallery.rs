//! A real owner-controlled GPUI consumer. It exercises generated views, not a parallel UI.
use full_stack_ds_gpui::components::{Badge, Checkbox, Divider, Switch, Text, ToggleSwitch};
use full_stack_ds_gpui::control::ChangeRequest;
use full_stack_ds_gpui::style::Theme;
use gpui::{prelude::*, actions, div, px, size, App, Application, Bounds, Context, Entity, FocusHandle, KeyBinding, Subscription, Window, WindowBounds, WindowOptions};

actions!(fsds_gallery, [Tab, BackTab]);

struct Gallery {
    focus: FocusHandle,
    switches: Vec<Entity<Switch>>,
    toggles: Vec<Entity<ToggleSwitch>>,
    checkboxes: Vec<Entity<Checkbox>>,
    text: Vec<Entity<Text>>,
    badges: Vec<Entity<Badge>>,
    divider: Entity<Divider>,
    vertical: Entity<Divider>,
    accepted: usize,
    last_request: String,
    _subscriptions: Vec<Subscription>,
}

impl Gallery {
    fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let focus = cx.focus_handle();
        window.focus(&focus);
        let mut switches = Vec::new();
        for size in ["sm", "md", "lg"] {
            for checked in [false, true] {
                switches.push(cx.new(|_| {
                    let mut control = Switch::default().size(size).default_checked(checked);
                    control.label = format!("{size} / {}", if checked { "on" } else { "off" }).into();
                    control
                }));
            }
        }
        switches.push(cx.new(|_| {
            let mut control = Switch::default().default_checked(true).disabled(true);
            control.label = "Disabled / on".into(); control
        }));
        switches.push(cx.new(|_| {
            let mut control = Switch::default().default_checked(true);
            control.theme = Theme::default().with_token("switch.design.track.background.fill", "#108850");
            control.label = "Per-instance track token override".into(); control
        }));
        let mut toggles = Vec::new();
        for checked in [false, true] {
            toggles.push(cx.new(|_| {
                let mut control = ToggleSwitch::default().default_checked(checked);
                control.label = if checked { "Selected" } else { "Unselected" }.into(); control
            }));
        }
        toggles.push(cx.new(|_| {
            let mut control = ToggleSwitch::default().default_checked(true).disabled(true);
            control.label = "Disabled".into(); control
        }));
        let mut checkboxes = Vec::new();
        for (label, checked, indeterminate, disabled) in [
            ("Unchecked", false, false, false), ("Checked", true, false, false),
            ("Mixed", false, true, false), ("Mixed + checked", true, true, false),
            ("Disabled unchecked", false, false, true), ("Disabled checked", true, false, true),
        ] {
            checkboxes.push(cx.new(|_| {
                let mut control = Checkbox::default().default_checked(checked).indeterminate(indeterminate).disabled(disabled);
                control.label = label.into(); control
            }));
        }
        let owner_switch = cx.new(|_| {
            let mut control = Switch::default().checked(Some(false));
            control.label = "Owner accepts requests".into(); control
        });
        let owner_refuses = cx.new(|_| {
            let mut control = Switch::default().checked(Some(false));
            control.label = "Owner refuses requests".into(); control
        });
        let accept = cx.subscribe(&owner_switch, |this, entity, request: &ChangeRequest, cx| {
            this.accepted += 1;
            this.last_request = format!("Accepted {} = {}", request.channel, request.value);
            entity.update(cx, |control, cx| control.set_checked(Some(request.value), cx));
            cx.notify();
        });
        let refuse = cx.subscribe(&owner_refuses, |this, _, request: &ChangeRequest, cx| {
            this.last_request = format!("Refused {} = {} (owner stays off)", request.channel, request.value);
            cx.notify();
        });
        switches.extend([owner_switch, owner_refuses]);
        let text = [
            ("headline", "Generated native components"),
            ("body", "Pointer, Space and Tab use the generated control event path."),
            ("caption", "Switch and Checkbox: Space. ToggleSwitch: Space or Enter."),
            ("code", "fn render(&mut self, window, cx) -> impl IntoElement"),
        ].into_iter().map(|(variant, label)| cx.new(|_| {
            let mut text = Text::default().variant(variant);
            text.label = label.into(); text
        })).collect();
        let badges = ["info", "success", "warning", "danger"].into_iter().map(|intent| cx.new(|_| {
            let mut badge = Badge::default().intent(intent);
            badge.label = intent.into(); badge
        })).collect();
        let divider = cx.new(|_| Divider::default());
        let vertical = cx.new(|_| Divider::default().orientation("vertical"));
        Self { focus, switches, toggles, checkboxes, text, badges, divider, vertical, accepted: 0, last_request: "No owner request yet".into(), _subscriptions: vec![accept, refuse] }
    }
}

impl Render for Gallery {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div().id("gallery").track_focus(&self.focus).size_full().p_6().flex().flex_col().gap_3()
            .bg(gpui::rgb(0xfafafa)).text_color(gpui::rgb(0x141414))
            .on_action(cx.listener(|_, _: &Tab, window, _| window.focus_next()))
            .on_action(cx.listener(|_, _: &BackTab, window, _| window.focus_prev()))
            .children(self.text.iter().cloned())
            .child(self.divider.clone())
            .child(div().flex().items_start().gap_4()
                .child(div().flex().flex_col().gap_2().child("Switch / contract size and state").children(self.switches.iter().cloned()))
                .child(self.vertical.clone())
                .child(div().flex().flex_col().gap_2().child("Checkbox / mixed and disabled").children(self.checkboxes.iter().cloned()))
                .child(div().flex().flex_col().gap_2().child("ToggleSwitch / selected pills").children(self.toggles.iter().cloned())))
            .child(div().flex().items_start().gap_2().children(self.badges.iter().cloned()))
            .child(format!("{} accepted request(s). {}", self.accepted, self.last_request))
    }
}

fn main() {
    Application::new().run(|cx: &mut App| {
        cx.bind_keys([KeyBinding::new("tab", Tab, None), KeyBinding::new("shift-tab", BackTab, None)]);
        let bounds = Bounds::centered(None, size(px(1120.), px(760.)), cx);
        cx.open_window(WindowOptions { window_bounds: Some(WindowBounds::Windowed(bounds)), ..Default::default() }, |window, cx| cx.new(|cx| Gallery::new(window, cx))).expect("GPUI gallery window creation");
        cx.activate(true);
    });
}
