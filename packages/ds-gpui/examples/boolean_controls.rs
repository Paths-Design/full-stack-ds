use full_stack_ds_gpui::components::{Switch, ToggleSwitch};
use full_stack_ds_gpui::control::ChangeRequest;
use gpui::{prelude::*, App, Application, Context, Entity, Subscription, Window, WindowOptions, div};

struct Controls {
    switch: Entity<Switch>,
    toggle: Entity<ToggleSwitch>,
    _owner: Subscription,
}

impl Render for Controls {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div().flex().flex_col().gap_4().p_8()
            .child("FSDS GPUI Boolean-control pilot")
            .child(self.switch.clone())
            .child(self.toggle.clone())
    }
}

fn main() {
    Application::new().run(|cx: &mut App| {
        cx.open_window(WindowOptions::default(), |_, cx| {
            cx.new(|cx| {
                let switch = cx.new(|_| {
                    let mut control = Switch::default().default_checked(true);
                    control.label = "Uncontrolled setting".into();
                    control
                });
                let toggle = cx.new(|_| {
                    let mut control = ToggleSwitch::default().checked(Some(false));
                    control.label = "Owner-controlled setting".into();
                    control
                });
                let owner = cx.subscribe(&toggle, |_, entity, request: &ChangeRequest, cx| {
                    entity.update(cx, |control, cx| {
                        control.state.controlled = Some(request.value);
                        cx.notify();
                    });
                });
                Controls { switch, toggle, _owner: owner }
            })
        }).expect("GPUI window creation failed");
        cx.activate(true);
    });
}
