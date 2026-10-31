//! Game pause menu — GPUI lane binary.
//!
//! A macOS GPUI window realizing `examples/game-pause-menu/spec.md` (four tabs,
//! interactions I1–I15) through ONLY the public API of
//! `full_stack_ds_gpui` (7-component allowlist) plus the lane-local seam.
//!
//! Flags:
//! - `--tab <map|progress|abilities|settings>` opens on a specific tab.
//! - `--capture <dir>` (build with `--features capture`) renders each tab state
//!   to PNG and exits; used for the lane's evidence screenshots because the
//!   host's Screen Recording permission is unavailable to `screencapture`.

mod app;

use app::{
    DismissOverlay, Menu, SelectAbilitiesTab, SelectMapTab, SelectProgressTab, SelectSettingsTab,
};
use gpui::{
    App, Bounds, KeyBinding, TitlebarOptions, WindowBounds, WindowOptions, prelude::*, px, size,
};

fn main() {
    let initial_tab = app::initial_tab_from_args();
    let capture_dir = app::capture_dir_from_args();
    #[cfg(not(feature = "capture"))]
    if capture_dir.is_some() {
        eprintln!(
            "game-pause-menu-gpui: --capture requires a capture-enabled build: \
             cargo run --features capture -- --capture <dir>"
        );
        std::process::exit(2);
    }

    let platform = gpui_platform::current_platform(false);
    gpui::Application::with_platform(platform).run(move |cx: &mut App| {
        // Escape dismisses one overlay; number keys select a tab. Tab/Shift-Tab
        // focus traversal belongs to the generated controls' own tab stops.
        cx.bind_keys([
            KeyBinding::new("escape", DismissOverlay, None),
            KeyBinding::new("1", SelectMapTab, None),
            KeyBinding::new("2", SelectProgressTab, None),
            KeyBinding::new("3", SelectAbilitiesTab, None),
            KeyBinding::new("4", SelectSettingsTab, None),
        ]);
        let bounds = Bounds::centered(None, size(px(1280.), px(800.)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(TitlebarOptions {
                    title: Some("ORION N5 — PAUSE".into()),
                    ..Default::default()
                }),
                ..Default::default()
            },
            {
                let capture_dir = capture_dir.clone();
                move |window, cx| {
                    let menu = cx.new(|cx| Menu::new(window, cx, initial_tab));
                    #[cfg(feature = "capture")]
                    if let Some(directory) = capture_dir.clone() {
                        menu.update(cx, |menu, cx| {
                            menu.start_capture(window, cx, std::path::PathBuf::from(directory));
                        });
                    }
                    #[cfg(not(feature = "capture"))]
                    let _ = (&capture_dir, window);
                    menu
                }
            },
        )
        .expect("game-pause-menu GPUI window creation");
        cx.activate(true);
    });
}
