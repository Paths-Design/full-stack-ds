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

/// Typography parity: disable macOS font smoothing for this application domain
/// before GPUI's text system initialises.
///
/// The pinned `gpui_macos` renderer implements CoreGraphics-style glyph dilation
/// when `AppleFontSmoothing` is enabled (`glyph_dilation_for_color`), which makes
/// light-on-dark text paint noticeably heavier than the same Inter Bold face in
/// the Unity and Godot lanes. Writing `AppleFontSmoothing = 0` into the current
/// application's preferences domain keeps the weight probe comparable without
/// touching the user's global font settings.
#[cfg(target_os = "macos")]
fn disable_macos_font_smoothing() {
    use core_foundation_sys::base::{CFRelease, CFTypeRef};
    use core_foundation_sys::number::{kCFNumberSInt32Type, CFNumberCreate};
    use core_foundation_sys::preferences::{
        kCFPreferencesCurrentApplication, CFPreferencesAppSynchronize, CFPreferencesSetAppValue,
    };
    use core_foundation_sys::string::{kCFStringEncodingUTF8, CFStringCreateWithCString};
    use std::ptr;

    unsafe {
        let key = CFStringCreateWithCString(
            ptr::null(),
            c"AppleFontSmoothing".as_ptr(),
            kCFStringEncodingUTF8,
        );
        if key.is_null() {
            return;
        }
        let value: i32 = 0;
        let number = CFNumberCreate(
            ptr::null(),
            kCFNumberSInt32Type,
            &value as *const i32 as *const std::ffi::c_void,
        );
        if !number.is_null() {
            CFPreferencesSetAppValue(
                key,
                number as CFTypeRef,
                kCFPreferencesCurrentApplication,
            );
            CFPreferencesAppSynchronize(kCFPreferencesCurrentApplication);
            CFRelease(number as CFTypeRef);
        }
        CFRelease(key as CFTypeRef);
    }
}

#[cfg(not(target_os = "macos"))]
fn disable_macos_font_smoothing() {}

fn main() {
    // Must run before any GPUI text layout: gpui_macos caches the preference.
    disable_macos_font_smoothing();
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
        // Typography parity: every lane loads the bundled Inter 4.1 static faces
        // (`examples/game-pause-menu/fonts`, OFL). GPUI has no system-font
        // guarantee, so embed and register the exact bytes used by the other lanes.
        cx.text_system()
            .add_fonts(vec![
                std::borrow::Cow::Borrowed(include_bytes!("../../fonts/inter/Inter-Regular.ttf")),
                std::borrow::Cow::Borrowed(include_bytes!("../../fonts/inter/Inter-Bold.ttf")),
            ])
            .expect("register Inter parity fonts");
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
