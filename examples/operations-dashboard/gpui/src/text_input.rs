//! NOT FSDS: gpui 0.2.2 ships no text-input widget. The spec requires a
//! free-text search field (filter rail) and an assignee field (assign sheet),
//! so this lane hand-authors a minimal single-line focused field: a
//! `FocusHandle`, key-down accumulation (printable characters via
//! `key_char`, backspace), a painted value/placeholder, and a static caret
//! while focused. This is the lane's largest single boundary finding and is
//! recorded in the README ledger. Styling approximates the package's input
//! tokens (border, focus ring accent) at the app layer.

use gpui::prelude::*;
use gpui::{
    Context, EventEmitter, FocusHandle, InteractiveElement, IntoElement, KeyDownEvent, MouseButton,
    Render, SharedString, Styled, Window, div, px, rgb,
};

/// Emitted after every value mutation so the owner can apply it as a filter or
/// form input (the gpui analog of the web lanes' `onChange`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TextChanged;

/// A minimal single-line text field. The owner keeps the source of truth in
/// sync via [`TextField::set_value`] (e.g. Clear filters).
pub struct TextField {
    pub focus: FocusHandle,
    value: String,
    placeholder: SharedString,
}

impl TextField {
    pub fn new(cx: &mut Context<Self>) -> Self {
        Self {
            focus: cx.focus_handle(),
            value: String::new(),
            placeholder: SharedString::default(),
        }
    }

    /// Builder: placeholder shown while the value is empty.
    pub fn placeholder(mut self, placeholder: impl Into<SharedString>) -> Self {
        self.placeholder = placeholder.into();
        self
    }

    /// Current field value.
    pub fn value(&self) -> &str {
        &self.value
    }

    /// Owner-driven value replacement (does not emit `TextChanged`).
    pub fn set_value(&mut self, value: String, cx: &mut Context<Self>) {
        if self.value != value {
            self.value = value;
            cx.notify();
        }
    }
}

impl EventEmitter<TextChanged> for TextField {}

impl Render for TextField {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let focused = self.focus.is_focused(window);
        let value = self.value.clone();
        let empty = value.is_empty();
        let display: SharedString = if empty {
            self.placeholder.clone()
        } else {
            value.into()
        };
        div()
            .id("text-field")
            .w_full()
            .h(px(32.))
            .px_2()
            .flex()
            .flex_row()
            .items_center()
            .gap(px(1.))
            .rounded(px(4.))
            .border_1()
            .border_color(if focused {
                rgb(0x0566fe)
            } else {
                rgb(0xa0a0a1)
            })
            .bg(rgb(0xffffff))
            .text_size(px(13.))
            .text_color(if empty { rgb(0x727272) } else { rgb(0x141414) })
            .track_focus(&self.focus)
            .on_mouse_down(
                MouseButton::Left,
                cx.listener(|this, _, window, cx| {
                    window.focus(&this.focus, cx);
                    cx.notify();
                }),
            )
            .on_key_down(cx.listener(|this, event: &KeyDownEvent, _, cx| {
                let keystroke = &event.keystroke;
                // Plain typing only; modifier chords fall through untouched.
                if keystroke.modifiers.control
                    || keystroke.modifiers.alt
                    || keystroke.modifiers.platform
                    || keystroke.modifiers.function
                {
                    return;
                }
                let mut changed = false;
                match keystroke.key.as_str() {
                    "backspace" => {
                        changed = this.value.pop().is_some();
                    }
                    "space" => {
                        this.value.push(' ');
                        changed = true;
                    }
                    key if key.chars().count() == 1 => {
                        // Prefer the platform-typed character (correct for
                        // shifted/symbol keys), falling back to the printed key.
                        let ch = keystroke
                            .key_char
                            .clone()
                            .filter(|ch| ch.chars().count() == 1)
                            .unwrap_or_else(|| key.to_string());
                        this.value.push_str(&ch);
                        changed = true;
                    }
                    _ => {}
                }
                if changed {
                    cx.emit(TextChanged);
                    cx.notify();
                }
            }))
            .child(
                div()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap(px(0.))
                    .min_w_0()
                    .child(display)
                    .when(focused, |row| {
                        row.child(
                            div()
                                .w(px(1.5))
                                .h(px(16.))
                                .ml(px(0.5))
                                .flex_shrink_0()
                                .bg(rgb(0x0566fe)),
                        )
                    }),
            )
    }
}
