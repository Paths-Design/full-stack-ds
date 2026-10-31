//! Evidence capture for the GPUI lane (`--features capture -- --capture <dir>`).
//!
//! Why this path exists: macOS Screen Recording permission is denied to the
//! agent shell, so `screencapture -l <windowid>` and full-screen captures
//! return "could not create image from window/display" (verified on this
//! machine against an unrelated GPUI app). The pinned gpui revision instead
//! exposes `Window::render_to_image()` behind gpui's `test-support` feature:
//! it renders the current frame's scene to an RGBA image without presenting
//! it, so capture needs no TCC grant. The lane enables that feature only under
//! its own `capture` cargo feature; the default build keeps the package pins.
//!
//! The app mutates its domain state into representative states per tab,
//! waits for a paint, reads the last rendered frame, and writes PNGs plus a
//! capture manifest. Screenshots are sampled states, not physical-device proof.

use std::path::{Path, PathBuf};
use std::time::Duration;

use gpui::{AsyncWindowContext, Context, WeakEntity, Window, point, px};

use game_pause_menu_gpui::seam::{AppState, Tab};

use super::Menu;

/// Time allowed for the state change to be painted before the first read.
const SETTLE: Duration = Duration::from_millis(320);
/// Retry cadence when the frame is still blank / the drawable is unavailable.
const RETRY: Duration = Duration::from_millis(160);
const MAX_ATTEMPTS: usize = 30;

struct CaptureStep {
    file: &'static str,
    tab: Tab,
    describe: &'static str,
    prepare: fn(&mut Menu, Tab),
}

/// The four required per-tab captures, followed by extra interaction-state
/// captures that show overlays, reject states and the remap modal.
const STEPS: &[CaptureStep] = &[
    CaptureStep {
        file: "map.png",
        tab: Tab::Map,
        describe: "MAP tab, default marker filter and commander readout",
        prepare: reset_to,
    },
    CaptureStep {
        file: "progress.png",
        tab: Tab::Progress,
        describe: "PROGRESS tab with the unlocked faction drawer open",
        prepare: progress_unlocked,
    },
    CaptureStep {
        file: "abilities.png",
        tab: Tab::Abilities,
        describe: "ABILITIES tab with a size-2 ability pending and compatible slots highlighted",
        prepare: abilities_pending,
    },
    CaptureStep {
        file: "settings.png",
        tab: Tab::Settings,
        describe: "SETTINGS tab, top of the scroll: General + Controller",
        prepare: reset_to,
    },
    CaptureStep {
        file: "map-popover.png",
        tab: Tab::Map,
        describe: "MAP tab with the marker popover open and a nav target set",
        prepare: map_popover,
    },
    CaptureStep {
        file: "progress-locked-drawer.png",
        tab: Tab::Progress,
        describe: "PROGRESS tab with a locked faction drawer (disabled SHOP PARTS)",
        prepare: progress_locked,
    },
    CaptureStep {
        file: "abilities-hover.png",
        tab: Tab::Abilities,
        describe: "ABILITIES tab hover tooltip over a card (I10)",
        prepare: abilities_hover,
    },
    CaptureStep {
        file: "abilities-reject.png",
        tab: Tab::Abilities,
        describe: "ABILITIES tab incompatible-slot reject state (I9)",
        prepare: abilities_reject,
    },
    CaptureStep {
        file: "settings-remap-modal.png",
        tab: Tab::Settings,
        describe: "SETTINGS remap modal waiting for the next key (I13)",
        prepare: settings_remap_modal,
    },
    CaptureStep {
        file: "settings-audio.png",
        tab: Tab::Settings,
        describe: "SETTINGS tab scrolled to the Audio & subtitles section (I14)",
        prepare: settings_audio,
    },
];

fn reset_to(menu: &mut Menu, tab: Tab) {
    let fixtures = menu.state.fixtures().clone();
    menu.state = AppState::new(fixtures);
    menu.state.select_tab(tab);
    menu.hovered_ability = None;
    menu.settings_scroll.set_offset(point(px(0.), px(0.)));
    menu.ability_scroll.set_offset(point(px(0.), px(0.)));
}

fn progress_unlocked(menu: &mut Menu, tab: Tab) {
    reset_to(menu, tab);
    menu.state.open_faction("ares-logistics");
}

fn progress_locked(menu: &mut Menu, tab: Tab) {
    reset_to(menu, tab);
    menu.state.open_faction("solaris-cartel");
}

fn abilities_pending(menu: &mut Menu, tab: Tab) {
    reset_to(menu, tab);
    menu.state.select_ability("overclock");
}

fn abilities_hover(menu: &mut Menu, tab: Tab) {
    reset_to(menu, tab);
    menu.state.select_ability("overclock");
    menu.hovered_ability = Some("drone-sweep".to_string());
}

fn abilities_reject(menu: &mut Menu, tab: Tab) {
    reset_to(menu, tab);
    menu.state.select_ability("aegis-plate");
    menu.state.activate_slot("AUX-A");
    // The compact detail section leaves the AUX rows in view without scrolling.
}

fn map_popover(menu: &mut Menu, tab: Tab) {
    reset_to(menu, tab);
    menu.state.set_nav_target("relay-01");
    menu.state.open_marker("beacon-05");
}

fn settings_remap_modal(menu: &mut Menu, tab: Tab) {
    reset_to(menu, tab);
    menu.state.begin_remap("interact");
}

fn settings_audio(menu: &mut Menu, tab: Tab) {
    reset_to(menu, tab);
    // The audio section is the fourth child of the settings scroll container.
    menu.settings_scroll.scroll_to_top_of_item(3);
}

impl Menu {
    /// Spawn the capture task on the window; called only when the binary was
    /// built with `--features capture` and given `--capture <dir>`.
    pub(crate) fn start_capture(
        &mut self,
        window: &mut Window,
        cx: &mut Context<Self>,
        directory: PathBuf,
    ) {
        if let Err(error) = std::fs::create_dir_all(&directory) {
            eprintln!(
                "game-pause-menu-gpui: cannot create capture directory {}: {error}",
                directory.display()
            );
            std::process::exit(1);
        }
        eprintln!(
            "game-pause-menu-gpui: capturing {} states into {}",
            STEPS.len(),
            directory.display()
        );
        cx.spawn_in(window, async move |this, cx| {
            let mut manifest: Vec<serde_json::Value> = Vec::new();
            for step in STEPS {
                if !prepare(&this, cx, step, &directory).await {
                    eprintln!("game-pause-menu-gpui: capture failed at {}", step.file);
                    std::process::exit(1);
                }
                eprintln!(
                    "game-pause-menu-gpui: captured {} ({})",
                    step.file, step.describe
                );
                manifest.push(serde_json::json!({
                    "file": step.file,
                    "tab": step.tab.key(),
                    "describe": step.describe,
                }));
            }
            let manifest_path = directory.join("capture-manifest.json");
            let document = serde_json::json!({
                "window": { "width": 1280, "height": 800 },
                "capture": "gpui Window::render_to_image() (pinned zed rev, gpui test-support feature)",
                "renderer": "gpui_macos runtime_shaders feature (Xcode 26 lacks the standalone metal tool on this machine)",
                "theme": "Orion N5 palette from fixtures/orion-appearance.json via per-instance gpui Theme token overrides",
                "states": manifest,
            });
            match std::fs::write(
                &manifest_path,
                serde_json::to_string_pretty(&document).unwrap_or_default(),
            ) {
                Ok(()) => eprintln!("game-pause-menu-gpui: wrote {}", manifest_path.display()),
                Err(error) => eprintln!(
                    "game-pause-menu-gpui: cannot write {}: {error}",
                    manifest_path.display()
                ),
            }
            let _ = this.update_in(cx, |_menu, _window, cx| cx.quit());
        })
        .detach();
    }
}

/// Apply one capture state, wait for it to paint, then save the rendered frame.
async fn prepare(
    menu: &WeakEntity<Menu>,
    cx: &mut AsyncWindowContext,
    step: &'static CaptureStep,
    directory: &Path,
) -> bool {
    let prepared = menu.update_in(cx, |menu, window, cx| {
        (step.prepare)(menu, step.tab);
        if menu.state.remap_waiting().is_some() {
            window.focus(&menu.remap_focus, cx);
        } else {
            window.focus(&menu.focus, cx);
        }
        menu.sync_controls(cx);
        cx.notify();
    });
    if prepared.is_err() {
        eprintln!("game-pause-menu-gpui: window closed before {}", step.file);
        return false;
    }
    cx.background_executor().timer(SETTLE).await;

    let path = directory.join(step.file);
    for attempt in 1..=MAX_ATTEMPTS {
        let read = menu.update_in(cx, |_menu, window, _cx| match window.render_to_image() {
            Ok(image) => {
                if !meaningful(&image) {
                    return Ok(None);
                }
                let width = image.width();
                let height = image.height();
                match image.save(&path) {
                    Ok(()) => Ok(Some((width, height))),
                    Err(error) => Err(format!("PNG save failed: {error}")),
                }
            }
            Err(error) => Err(format!("Window::render_to_image failed: {error}")),
        });
        match read {
            Ok(Ok(Some((width, height)))) => {
                eprintln!(
                    "game-pause-menu-gpui: {} -> {} ({width}x{height})",
                    step.file,
                    path.display()
                );
                return true;
            }
            Ok(Ok(None)) => {
                if attempt == MAX_ATTEMPTS {
                    eprintln!(
                        "game-pause-menu-gpui: {} stayed blank after {MAX_ATTEMPTS} attempts",
                        step.file
                    );
                }
            }
            Ok(Err(message)) => {
                if attempt == 1 || attempt == MAX_ATTEMPTS {
                    eprintln!("game-pause-menu-gpui: {}: {message}", step.file);
                }
            }
            Err(_) => {
                eprintln!(
                    "game-pause-menu-gpui: window closed while capturing {}",
                    step.file
                );
                return false;
            }
        }
        // Nudge another paint and retry.
        let _ = menu.update_in(cx, |_menu, _window, cx| cx.notify());
        cx.background_executor().timer(RETRY).await;
    }
    false
}

/// A frame is meaningful when its sampled pixels carry more than a handful of
/// distinct colors — a not-yet-drawn surface reads as uniform.
fn meaningful(image: &image::RgbaImage) -> bool {
    let (width, height) = image.dimensions();
    if width < 2 || height < 2 {
        return false;
    }
    let mut colors = std::collections::BTreeSet::new();
    let mut y = 0;
    while y < height {
        let mut x = 0;
        while x < width {
            let pixel = image.get_pixel(x, y);
            colors.insert([pixel[0], pixel[1], pixel[2]]);
            if colors.len() > 8 {
                return true;
            }
            x += 31;
        }
        y += 23;
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uniform_frames_are_not_meaningful() {
        let image = image::RgbaImage::from_pixel(64, 64, image::Rgba([2, 3, 4, 255]));
        assert!(!meaningful(&image));
    }

    #[test]
    fn varied_frames_are_meaningful() {
        let mut image = image::RgbaImage::from_pixel(64, 64, image::Rgba([2, 3, 4, 255]));
        for y in 0..64 {
            for x in 0..64 {
                image.put_pixel(x, y, image::Rgba([x as u8, y as u8, 7, 255]));
            }
        }
        assert!(meaningful(&image));
    }

    #[test]
    fn the_required_four_tab_captures_are_present() {
        let names: Vec<&str> = STEPS.iter().map(|step| step.file).collect();
        for required in ["map.png", "progress.png", "abilities.png", "settings.png"] {
            assert!(names.contains(&required), "{required} is required evidence");
        }
        let tabs: Vec<Tab> = STEPS.iter().map(|step| step.tab).collect();
        for tab in Tab::ALL {
            assert!(tabs.contains(&tab), "{} must be captured", tab.label());
        }
    }
}
