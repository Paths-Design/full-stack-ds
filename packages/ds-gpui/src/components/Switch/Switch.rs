// Generated from Switch contract IR. Do not hand-edit.
use gpui::{prelude::*, div, Context, EventEmitter, SharedString, Window};
use crate::control::{BooleanState, ChangeRequest};

pub struct Switch {
    pub state: BooleanState,
    pub label: SharedString,
}

impl Default for Switch {
    fn default() -> Self {
        let mut state = BooleanState::new(false);
        state.disabled = false;
        Self { state, label: SharedString::default() }
    }
}

impl Switch {
    pub const CHANNEL: &'static str = "checked";
    pub const CHANGE_HANDLER: &'static str = "onChange";
    pub const CONTROL_PART: &'static str = "input";

    pub fn checked(mut self, value: Option<bool>) -> Self {
        self.state.controlled = value;
        self
    }

    /// Initialize before attaching the view to an Entity.
    pub fn default_checked(mut self, value: bool) -> Self {
        let controlled = self.state.controlled;
        let disabled = self.state.disabled;
        self.state = BooleanState::new(value);
        self.state.controlled = controlled;
        self.state.disabled = disabled;
        self
    }

    pub fn disabled(mut self, value: bool) -> Self {
        self.state.disabled = value;
        self
    }

    pub fn request_change(&mut self) -> Option<ChangeRequest> {
        self.state.request_toggle().map(|value| ChangeRequest {
            channel: Self::CHANNEL, handler: Self::CHANGE_HANDLER, value,
        })
    }
}

impl EventEmitter<ChangeRequest> for Switch {}

impl Render for Switch {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div().id("switch").flex().gap_2()
            .child(self.label.clone())
            .child(if self.state.value() { "●" } else { "○" })
            .on_click(cx.listener(|this, _, _, cx| {
                if let Some(request) = this.request_change() {
                    cx.emit(request);
                    cx.notify();
                }
            }))
    }
}
