//! Operations dashboard — GPUI lane binary.
//!
//! macOS GPUI window realizing the operations-dashboard spec
//! (`examples/operations-dashboard/spec.md`) through ONLY the public API of
//! `full_stack_ds_gpui` (7-component allowlist) plus the lane-local seam. The
//! established consumer pattern follows `packages/ds-gpui/examples/
//! component_gallery.rs`: `gpui_platform::current_platform` →
//! `Application::with_platform` → `open_window` → an owner `Entity` that
//! subscribes to generated `ChangeRequest` events.

mod dashboard;
mod format;
mod text_input;

use dashboard::Dashboard;
use gpui::{
    App, Bounds, KeyBinding, TitlebarOptions, WindowBounds, WindowOptions, prelude::*, px, size,
};

fn main() {
    let platform = gpui_platform::current_platform(false);
    gpui::Application::with_platform(platform).run(move |cx: &mut App| {
        // Interaction 10 + focus traversal bindings. Components keep their own
        // generated activation keys (Space for Checkbox/Switch; Space/Enter
        // for ToggleSwitch); the owner owns Tab/Shift-Tab and Escape.
        cx.bind_keys([
            KeyBinding::new("escape", dashboard::DismissOverlay, None),
            KeyBinding::new("tab", dashboard::CycleFocusForward, None),
            KeyBinding::new("shift-tab", dashboard::CycleFocusBackward, None),
        ]);
        let bounds = Bounds::centered(None, size(px(1440.), px(860.)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some("Operations dashboard — GPUI lane".into()),
                    ..Default::default()
                }),
                ..Default::default()
            },
            |window, cx| cx.new(|cx| Dashboard::new(window, cx)),
        )
        .expect("operations-dashboard GPUI window creation");
        cx.activate(true);
    });
}
