//! Input policy for focusable native elements. The host capability chooses activation keys.
use gpui::KeyDownEvent;

pub fn is_activation_key(event: &KeyDownEvent, enter_activates: bool) -> bool {
    !event.is_held
        && !event.keystroke.modifiers.control
        && !event.keystroke.modifiers.alt
        && !event.keystroke.modifiers.platform
        && !event.keystroke.modifiers.function
        && (event.keystroke.key == "space"
            || (enter_activates && event.keystroke.key == "enter"))
}
