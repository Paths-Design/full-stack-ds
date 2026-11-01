//! Action callbacks for generated controls.
//!
//! Value controls emit `ChangeRequest`s through `EventEmitter`; action controls
//! (a trigger that does not describe a value) instead invoke a consumer-supplied
//! callback. The handler is a plain `Rc<dyn Fn>` so it can be stored on the
//! generated component and invoked from a pointer or keyboard activation.
use gpui::{App, Window};
use std::rc::Rc;

/// A generated action callback. Narrowed from the contract's event parameter to
/// window/app access; the event payload is not projected yet.
pub type ActionHandler = Rc<dyn Fn(&mut Window, &mut App)>;

/// Invoke a stored handler if the consumer registered one.
pub fn invoke(handler: &Option<ActionHandler>, window: &mut Window, cx: &mut App) {
    if let Some(handler) = handler.clone() {
        handler(window, cx);
    }
}
