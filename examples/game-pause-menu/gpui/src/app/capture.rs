//! Evidence capture for the parity pass (`--features capture -- --capture <dir>`).
//!
//! The capture states are the JSON `captures` map: for each state the task
//! resets domain state, applies that capture's selectors, focuses the window,
//! waits for a paint, reads the last rendered frame with
//! `Window::render_to_image()` (the pinned gpui revision's test-support surface;
//! macOS Screen Recording is unavailable to this shell), saves a PNG and finally
//! writes `capture-manifest.json` and quits. Screenshots are sampled states of
//! the running app, not physical-device proof.

use std::path::Path;
use std::path::PathBuf;
use std::time::Duration;

use gpui::{AsyncWindowContext, Context, WeakEntity, Window};

use game_pause_menu_gpui::seam::{AppState, CaptureSpec, Tab};

use super::Menu;

const SETTLE: Duration = Duration::from_millis(320);
const RETRY: Duration = Duration::from_millis(160);
const MAX_ATTEMPTS: usize = 30;

impl Menu {
    /// Spawn the capture task; called when the binary was built with
    /// `--features capture` and given `--capture <dir>`.
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
        let captures: Vec<(String, CaptureSpec)> = self
            .layout
            .captures
            .iter()
            .map(|(name, spec)| (name.clone(), spec.clone()))
            .collect();
        let order = [
            "map",
            "progress",
            "abilities",
            "settings",
            "map-popover",
            "abilities-hover",
            "settings-remap-modal",
            "settings-subtitle",
        ];
        let mut ordered: Vec<(String, CaptureSpec)> = Vec::new();
        for name in order {
            if let Some((_, spec)) = captures.iter().find(|(key, _)| key == name) {
                ordered.push((name.to_string(), spec.clone()));
            }
        }
        eprintln!(
            "game-pause-menu-gpui: capturing {} parity states into {}",
            ordered.len(),
            directory.display()
        );
        cx.spawn_in(window, async move |this, cx| {
            let mut states: Vec<serde_json::Value> = Vec::new();
            for (name, spec) in ordered {
                if !prepare(&this, cx, &spec, &directory, &name).await {
                    eprintln!("game-pause-menu-gpui: capture failed at {name}");
                    std::process::exit(1);
                }
                eprintln!("game-pause-menu-gpui: captured {name}.png");
                states.push(serde_json::json!({
                    "file": format!("{name}.png"),
                    "activeTab": spec.active_tab,
                }));
            }
            let manifest_path = directory.join("capture-manifest.json");
            let document = serde_json::json!({
                "layout": "fixtures/parity-layout.json",
                "window": { "width": 1280, "height": 800 },
                "capture": "gpui Window::render_to_image() (pinned zed rev, gpui test-support feature)",
                "renderer": "gpui_macos runtime_shaders feature (Xcode 26 lacks the standalone metal tool on this machine)",
                "states": states,
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

/// Apply one JSON capture state, wait for a paint, save the rendered frame.
async fn prepare(
    menu: &WeakEntity<Menu>,
    cx: &mut AsyncWindowContext,
    spec: &CaptureSpec,
    directory: &Path,
    name: &str,
) -> bool {
    let prepared = menu.update_in(cx, |menu, window, cx| {
        apply_capture(menu, spec);
        if menu.state.remap_waiting().is_some() {
            window.focus(&menu.remap_focus, cx);
        } else {
            window.focus(&menu.focus, cx);
        }
        cx.notify();
    });
    if prepared.is_err() {
        eprintln!("game-pause-menu-gpui: window closed before {name}");
        return false;
    }
    cx.background_executor().timer(SETTLE).await;

    let path = directory.join(format!("{name}.png"));
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
                    "game-pause-menu-gpui: {name}.png -> {} ({width}x{height})",
                    path.display()
                );
                return true;
            }
            Ok(Ok(None)) => {
                if attempt == MAX_ATTEMPTS {
                    eprintln!(
                        "game-pause-menu-gpui: {name}.png stayed blank after {MAX_ATTEMPTS} attempts"
                    );
                }
            }
            Ok(Err(message)) => {
                if attempt == 1 || attempt == MAX_ATTEMPTS {
                    eprintln!("game-pause-menu-gpui: {name}.png: {message}");
                }
            }
            Err(_) => {
                eprintln!("game-pause-menu-gpui: window closed while capturing {name}");
                return false;
            }
        }
        let _ = menu.update_in(cx, |_menu, _window, cx| cx.notify());
        cx.background_executor().timer(RETRY).await;
    }
    false
}

/// Apply the JSON capture selectors to a freshly reset domain state.
fn apply_capture(menu: &mut Menu, spec: &CaptureSpec) {
    let fixtures = menu.state.fixtures().clone();
    menu.state = AppState::new(fixtures);
    if let Some(tab) = Tab::from_key(&spec.active_tab) {
        menu.state.select_tab(tab);
    }
    for icon_id in &spec.hidden_icons {
        if menu.state.icon_visible(icon_id) {
            menu.state.toggle_icon(icon_id);
        }
    }
    if let Some(target) = &spec.nav_target {
        menu.state.set_nav_target(target);
    }
    if let Some(ability) = &spec.pending_ability {
        menu.state.select_ability(ability);
    }
    if let Some(faction) = &spec.drawer {
        menu.state.open_faction(faction);
    }
    if let Some(icon) = &spec.popover {
        menu.state.open_marker(icon);
    }
    menu.hovered_ability = spec.hover.clone();
    if let Some(action) = &spec.remap_modal {
        menu.state.begin_remap(action);
    }
    if let Some(swatch) = &spec.subtitle_background {
        menu.state.set_subtitle_background(swatch);
    }
    if let Some(language) = &spec.subtitle_language {
        menu.state.set_subtitle_language(language);
    }
}

/// A frame is meaningful when its sampled pixels carry more than a handful of
/// distinct colours — an undrawn surface reads as uniform.
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
}
