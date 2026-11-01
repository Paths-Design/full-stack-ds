//! Colour plumbing for the parity app.
//!
//! Colours come only from the parsed parity layout (`fixtures/parity-layout.json`
//! → `seam::parity::Colors`); this module only converts the authored `#RRGGBB`
//! strings into gpui paint values and back for theme-token overrides. No hue is
//! stated here.

use gpui::{Rgba, rgb};

use game_pause_menu_gpui::seam::hex_rgb;

/// Parse a validated `#RRGGBB` parity colour into `0xRRGGBB`.
pub(crate) fn packed(hex: &str) -> u32 {
    let [red, green, blue] = hex_rgb(hex).unwrap_or_else(|| {
        panic!("GPUI_LANE_PARITY_INVALID: parity colour '{hex}' is not #RRGGBB")
    });
    (u32::from(red) << 16) | (u32::from(green) << 8) | u32::from(blue)
}

/// Opaque paint for plain-gpui styling.
pub(crate) fn paint(hex: &str) -> Rgba {
    rgb(packed(hex))
}

/// Translucent paint for parity overlays: `alpha` is 0-255.
pub(crate) fn paint_alpha(hex: &str, alpha: u8) -> Rgba {
    gpui::rgba((packed(hex) << 8) | u32::from(alpha))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parity_hex_round_trips() {
        assert_eq!(packed("#EF6A3C"), 0xEF6A3C);
    }
}
