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

use gpui::{AsyncWindowContext, Context, WeakEntity, Window, px, size};

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
        if let Err(error) = std::fs::create_dir_all(directory.join("raw")) {
            eprintln!(
                "game-pause-menu-gpui: cannot create capture directory {}: {error}",
                directory.display()
            );
            std::process::exit(1);
        }
        let manifest_path = directory.join("capture-manifest.json");
        if let Err(error) = std::fs::remove_file(&manifest_path)
            && error.kind() != std::io::ErrorKind::NotFound
        {
            eprintln!("game-pause-menu-gpui: cannot invalidate previous capture manifest: {error}");
            std::process::exit(1);
        }
        let design_viewport = self.layout.viewport;
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
                let Some(receipt) = prepare(&this, cx, &spec, &directory, &name).await else {
                    eprintln!("game-pause-menu-gpui: capture failed at {name}");
                    std::process::exit(1);
                };
                eprintln!("game-pause-menu-gpui: captured {name}.png");
                states.push(serde_json::json!({
                    "file": format!("{name}.png"),
                    "activeTab": spec.active_tab,
                    "rawFile": format!("raw/{name}.png"),
                    "geometry": receipt.geometry,
                    "windowBoundsLogical": receipt.window_bounds,
                }));
            }
            let document = serde_json::json!({
                "schemaVersion": 2,
                "layout": "fixtures/parity-layout.json",
                "designViewport": { "width": design_viewport.width, "height": design_viewport.height },
                "capture": "gpui Window::render_to_image() (pinned zed rev, gpui test-support feature)",
                "renderer": "gpui_macos runtime_shaders feature (Xcode 26 lacks the standalone metal tool on this machine)",
                "normalization": "Top-left authored viewport crop at measured integer display scale; rounded box mean of each device-pixel cell; only clear overscan is excluded",
                "states": states,
            });
            match std::fs::write(
                &manifest_path,
                serde_json::to_string_pretty(&document).unwrap_or_default(),
            ) {
                Ok(()) => eprintln!("game-pause-menu-gpui: wrote {}", manifest_path.display()),
                Err(error) => {
                    eprintln!("game-pause-menu-gpui: cannot write {}: {error}", manifest_path.display());
                    std::process::exit(1);
                }
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
) -> Option<CaptureReceipt> {
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
        return None;
    }
    cx.background_executor().timer(SETTLE).await;

    let path = directory.join(format!("{name}.png"));
    let raw_path = directory.join("raw").join(format!("{name}.png"));
    for attempt in 1..=MAX_ATTEMPTS {
        let read = menu.update_in(cx, |menu, window, _cx| match window.render_to_image() {
            Ok(image) => {
                if !meaningful(&image) {
                    return Ok(None);
                }
                image
                    .save(&raw_path)
                    .map_err(|error| format!("raw PNG save failed: {error}"))?;
                let viewport = window.viewport_size();
                let design = menu.layout.viewport;
                let (normalized, geometry) = normalize_frame(
                    &image,
                    [design.width, design.height],
                    [viewport.width.into(), viewport.height.into()],
                    window.scale_factor(),
                )?;
                normalized
                    .save(&path)
                    .map_err(|error| format!("qualified PNG save failed: {error}"))?;
                let bounds = window.bounds();
                Ok(Some(CaptureReceipt {
                    geometry,
                    window_bounds: LogicalBounds {
                        x: bounds.origin.x.into(),
                        y: bounds.origin.y.into(),
                        width: bounds.size.width.into(),
                        height: bounds.size.height.into(),
                    },
                }))
            }
            Err(error) => Err(format!("Window::render_to_image failed: {error}")),
        });
        match read {
            Ok(Ok(Some(receipt))) => {
                let raw = receipt.geometry.raw_device_pixels;
                let output = receipt.geometry.output_logical_pixels;
                eprintln!(
                    "game-pause-menu-gpui: {name}.png -> {} ({}x{}), raw {}x{}, scale {}, viewport {}x{}",
                    path.display(),
                    output.width,
                    output.height,
                    raw.width,
                    raw.height,
                    receipt.geometry.scale_factor,
                    receipt.geometry.window_viewport_logical.width,
                    receipt.geometry.window_viewport_logical.height,
                );
                return Some(receipt);
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
                return None;
            }
        }
        let _ = menu.update_in(cx, |_menu, _window, cx| cx.notify());
        cx.background_executor().timer(RETRY).await;
    }
    None
}

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)]
struct PixelSize {
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)]
struct LogicalSize {
    width: f32,
    height: f32,
}

#[derive(Debug, Clone, Copy, serde::Serialize)]
struct LogicalBounds {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)]
struct PixelCrop {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CaptureGeometry {
    window_viewport_logical: LogicalSize,
    scale_factor: f32,
    raw_device_pixels: PixelSize,
    crop_device_pixels: PixelCrop,
    output_logical_pixels: PixelSize,
}

#[derive(Debug, serde::Serialize)]
struct CaptureReceipt {
    geometry: CaptureGeometry,
    window_bounds: LogicalBounds,
}

fn integral_dimension(name: &str, value: f32) -> Result<u32, String> {
    if !value.is_finite()
        || value < 1.0
        || value.fract() != 0.0
        || f64::from(value) > f64::from(u32::MAX)
    {
        return Err(format!(
            "{name} must be a positive representable integer, got {value}"
        ));
    }
    Ok(value as u32)
}

fn qualify_geometry(
    raw: PixelSize,
    design: [f32; 2],
    viewport: [f32; 2],
    scale: f32,
) -> Result<CaptureGeometry, String> {
    let width = integral_dimension("design width", design[0])?;
    let height = integral_dimension("design height", design[1])?;
    let factor = integral_dimension("display scale", scale)?;
    for (name, value) in [
        ("window viewport width", viewport[0]),
        ("window viewport height", viewport[1]),
    ] {
        if !value.is_finite()
            || value <= 0.0
            || f64::from(value) * f64::from(scale) > f64::from(i32::MAX)
        {
            return Err(format!(
                "{name} must be positive, finite and device-pixel representable"
            ));
        }
    }
    if viewport[0] < design[0] || viewport[1] < design[1] {
        return Err("window viewport is smaller than the declared design viewport".into());
    }
    let expected = size(px(viewport[0]), px(viewport[1])).to_device_pixels(scale);
    if expected.width.0 <= 0
        || expected.height.0 <= 0
        || raw.width != expected.width.0 as u32
        || raw.height != expected.height.0 as u32
    {
        return Err(format!(
            "raw drawable {}x{} does not match measured window viewport {}x{} at scale {scale}",
            raw.width, raw.height, viewport[0], viewport[1]
        ));
    }
    let crop_width = width
        .checked_mul(factor)
        .ok_or("design crop width is not representable")?;
    let crop_height = height
        .checked_mul(factor)
        .ok_or("design crop height is not representable")?;
    if raw.width < crop_width || raw.height < crop_height {
        return Err("raw drawable is smaller than the declared design crop".into());
    }
    Ok(CaptureGeometry {
        window_viewport_logical: LogicalSize {
            width: viewport[0],
            height: viewport[1],
        },
        scale_factor: scale,
        raw_device_pixels: raw,
        crop_device_pixels: PixelCrop {
            x: 0,
            y: 0,
            width: crop_width,
            height: crop_height,
        },
        output_logical_pixels: PixelSize { width, height },
    })
}

/// The pinned Metal capture reads texture origin (0,0) without flipping. The
/// app's fixed root also starts at (0,0), so its authored viewport defines the
/// crop independently of any larger native content view. Never stretch that
/// extra window area into the design or silently discard painted overflow.
fn normalize_frame(
    raw: &image::RgbaImage,
    design: [f32; 2],
    viewport: [f32; 2],
    scale: f32,
) -> Result<(image::RgbaImage, CaptureGeometry), String> {
    let geometry = qualify_geometry(
        PixelSize {
            width: raw.width(),
            height: raw.height(),
        },
        design,
        viewport,
        scale,
    )?;
    let crop = geometry.crop_device_pixels;
    for y in 0..raw.height() {
        let first_outside = if y < crop.height { crop.width } else { 0 };
        for x in first_outside..raw.width() {
            let pixel = raw.get_pixel(x, y).0;
            if pixel[3] != 0 && pixel != [0, 0, 0, 255] {
                return Err(format!(
                    "painted pixels outside the declared design viewport at ({x},{y}); refusing crop"
                ));
            }
        }
    }
    let factor = scale as u32;
    let samples = u128::from(factor) * u128::from(factor);
    let output = geometry.output_logical_pixels;
    let mut normalized = image::RgbaImage::new(output.width, output.height);
    for y in 0..output.height {
        for x in 0..output.width {
            let mut channels = [0u128; 4];
            for dy in 0..factor {
                for dx in 0..factor {
                    let pixel = raw.get_pixel(x * factor + dx, y * factor + dy);
                    for channel in 0..4 {
                        channels[channel] += u128::from(pixel[channel]);
                    }
                }
            }
            normalized.put_pixel(
                x,
                y,
                image::Rgba(channels.map(|sum| ((sum + samples / 2) / samples) as u8)),
            );
        }
    }
    Ok((normalized, geometry))
}

/// Apply the JSON capture selectors to a freshly reset domain state.
fn apply_capture(menu: &mut Menu, spec: &CaptureSpec) {
    let fixtures = menu.state.fixtures().clone();
    menu.state = AppState::new(fixtures);
    if let Some(tab) = Tab::from_key(&spec.active_tab) {
        menu.state.select_tab(tab);
    }
    menu.state.apply_capture_icon_visibility(&spec.hidden_icons);
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

    #[test]
    fn observed_retina_drawable_crops_only_the_extra_native_row() {
        let geometry = qualify_geometry(
            PixelSize {
                width: 2560,
                height: 1602,
            },
            [1280.0, 800.0],
            [1280.0, 801.0],
            2.0,
        )
        .unwrap();
        assert_eq!(
            geometry.crop_device_pixels,
            PixelCrop {
                x: 0,
                y: 0,
                width: 2560,
                height: 1600
            }
        );
        assert_eq!(
            geometry.output_logical_pixels,
            PixelSize {
                width: 1280,
                height: 800
            }
        );
        assert_eq!(
            geometry.window_viewport_logical,
            LogicalSize {
                width: 1280.0,
                height: 801.0
            }
        );
    }

    #[test]
    fn black_overscan_is_excluded_without_stretching_or_flipping() {
        let colors = [
            [240, 0, 0, 255],
            [0, 240, 0, 255],
            [0, 0, 240, 255],
            [240, 240, 240, 255],
        ];
        let mut raw = image::RgbaImage::from_pixel(4, 6, image::Rgba([0, 0, 0, 255]));
        for y in 0..4 {
            for x in 0..4 {
                raw.put_pixel(x, y, image::Rgba(colors[((y / 2) * 2 + x / 2) as usize]));
            }
        }
        let original = raw.clone();
        let (normalized, _) = normalize_frame(&raw, [2.0, 2.0], [2.0, 3.0], 2.0).unwrap();
        assert_eq!(normalized.dimensions(), (2, 2));
        assert_eq!(
            normalized.pixels().map(|pixel| pixel.0).collect::<Vec<_>>(),
            colors
        );
        assert_eq!(
            raw, original,
            "normalization leaves the original device frame intact"
        );
    }

    #[test]
    fn each_device_pixel_cell_uses_a_deterministic_rounded_box_mean() {
        let raw = image::RgbaImage::from_raw(
            2,
            2,
            vec![
                0, 0, 0, 255, 10, 20, 30, 255, 20, 40, 60, 255, 30, 60, 90, 255,
            ],
        )
        .unwrap();
        let (normalized, _) = normalize_frame(&raw, [1.0, 1.0], [1.0, 1.0], 2.0).unwrap();
        assert_eq!(normalized.get_pixel(0, 0).0, [15, 30, 45, 255]);
    }

    #[test]
    fn unit_scale_preserves_every_authored_pixel() {
        let raw = image::RgbaImage::from_raw(2, 1, vec![1, 2, 3, 255, 4, 5, 6, 255]).unwrap();
        assert_eq!(
            normalize_frame(&raw, [2.0, 1.0], [2.0, 1.0], 1.0)
                .unwrap()
                .0,
            raw
        );
    }

    #[test]
    fn painted_overflow_cannot_be_hidden_by_the_crop() {
        let mut raw = image::RgbaImage::from_pixel(2, 3, image::Rgba([0, 0, 0, 255]));
        raw.put_pixel(1, 2, image::Rgba([1, 0, 0, 255]));
        assert!(
            normalize_frame(&raw, [2.0, 2.0], [2.0, 3.0], 1.0)
                .unwrap_err()
                .contains("painted pixels outside")
        );
    }

    #[test]
    fn invalid_or_undersized_geometry_is_rejected() {
        let raw = PixelSize {
            width: 4,
            height: 4,
        };
        for scale in [0.0, -1.0, f32::NAN, f32::INFINITY, 1.5, 1.0e20] {
            assert!(
                qualify_geometry(raw, [2.0, 2.0], [2.0, 2.0], scale).is_err(),
                "scale {scale}"
            );
        }
        assert!(
            qualify_geometry(
                PixelSize {
                    width: 3,
                    height: 3
                },
                [2.0, 2.0],
                [2.0, 2.0],
                1.5
            )
            .unwrap_err()
            .contains("display scale"),
            "fractional scale is rejected even when the drawable dimensions match"
        );
        for width in [0.0, -1.0, f32::NAN, f32::INFINITY, 1.5, 1.0e20] {
            assert!(
                qualify_geometry(raw, [width, 2.0], [2.0, 2.0], 2.0).is_err(),
                "design width {width}"
            );
        }
        for width in [0.0, f32::NAN, f32::INFINITY, 1.0e20] {
            assert!(
                qualify_geometry(raw, [2.0, 2.0], [width, 2.0], 2.0).is_err(),
                "viewport width {width}"
            );
        }
        assert!(
            qualify_geometry(raw, [2.0, 2.0], [1.0, 2.0], 2.0)
                .unwrap_err()
                .contains("smaller")
        );
        assert!(
            qualify_geometry(
                PixelSize {
                    width: 4,
                    height: 3
                },
                [2.0, 2.0],
                [2.0, 2.0],
                2.0
            )
            .unwrap_err()
            .contains("does not match")
        );
    }
}
