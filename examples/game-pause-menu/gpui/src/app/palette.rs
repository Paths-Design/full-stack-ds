//! Orion N5 palette projection for the GPUI lane.
//!
//! The brand layer (`packages/ds-tokens/src/brands/orion.tokens.json`,
//! `data-brand="orion"`) is the authority for these values. The GPUI target has
//! **no brand-graph loader** — `Theme::with_token`/`set_token` accept explicit
//! token addresses only — so the lane consumes the palette from the
//! lane-copied `fixtures/orion-appearance.json` and applies it through two
//! mechanisms:
//!
//! 1. **Generated components** (`Switch`, `Text`, `Badge`, `Divider`, `Stat`)
//!    receive per-instance `Theme::with_token(..)` overrides at the token
//!    addresses their contracts resolve (see `theme_for_*` helpers).
//! 2. **Hand-authored regions** use the plain-gpui colors below, derived from
//!    the same palette values (mixed tones are computed, never hard-coded).
//!
//! This is app-layer theme delivery, not a brand-loader claim; the lane README
//! ledgers it.

use gpui::{Rgba, rgb, rgba};

use game_pause_menu_gpui::seam::{Appearance, hex_rgb};

/// The resolved Orion palette plus the few derived surface tones the graphic
/// grammar needs (map ground, grid, hover row, overlay backdrop).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct Colors {
    pub signal: u32,
    pub signal_deep: u32,
    pub signal_hot: u32,
    pub on_signal: u32,
    pub ink: u32,
    pub charcoal: u32,
    pub graphite: u32,
    pub bone_bright: u32,
    pub bone: u32,
    pub sage: u32,
    pub moss: u32,
    pub alert: u32,
    pub clear: u32,
    pub raised: u32,
    pub rule: u32,
    pub rule_strong: u32,
    pub muted: u32,
    pub telemetry: u32,
    /// Derived: map ground = ink blended 10% toward sage.
    pub map_ground: u32,
    /// Derived: grid lines = graphite blended 55% toward moss.
    pub map_grid: u32,
    /// Derived: contour ticks = graphite blended 35% toward sage.
    pub map_contour: u32,
    /// Derived: inset field = charcoal blended 35% toward ink.
    pub inset: u32,
    /// Derived: row hover = graphite blended 8% toward signal.
    pub row_hover: u32,
}

impl Colors {
    pub fn from_appearance(appearance: &Appearance) -> Self {
        let palette = &appearance.palette;
        let surface = &appearance.surface;
        let signal = parse(&palette.signal);
        let ink = parse(&palette.ink);
        let charcoal = parse(&palette.charcoal);
        let graphite = parse(&palette.graphite);
        let sage = parse(&palette.sage);
        let moss = parse(&palette.moss);
        Self {
            signal,
            signal_deep: parse(&palette.signal_deep),
            signal_hot: parse(&palette.signal_hot),
            on_signal: parse(&palette.on_signal),
            ink,
            charcoal,
            graphite,
            bone_bright: parse(&palette.bone_bright),
            bone: parse(&palette.bone),
            sage,
            moss,
            alert: parse(&palette.alert),
            clear: parse(&palette.clear),
            raised: parse(&surface.raised),
            rule: parse(&surface.rule),
            rule_strong: parse(&surface.rule_strong),
            muted: parse(&surface.muted),
            telemetry: parse(&surface.telemetry),
            map_ground: mix(ink, sage, 0.10),
            map_grid: mix(graphite, moss, 0.55),
            map_contour: mix(graphite, sage, 0.35),
            inset: mix(charcoal, ink, 0.35),
            row_hover: mix(graphite, signal, 0.08),
        }
    }

    /// `#RRGGBB` form for a `Theme::with_token` override.
    pub fn hex(color: u32) -> String {
        format!("#{color:06X}")
    }

    /// Opaque paint for plain-gpui styling.
    pub fn paint(color: u32) -> Rgba {
        rgb(color)
    }

    /// Translucent paint (`0xRRGGBBAA`) for the modal backdrop.
    pub fn paint_alpha(color: u32) -> Rgba {
        rgba(color)
    }
}

/// Parse a validated `#RRGGBB` appearance color into `0xRRGGBB`.
pub(crate) fn parse(hex: &str) -> u32 {
    let [red, green, blue] = hex_rgb(hex).unwrap_or_else(|| {
        panic!("GPUI_LANE_FIXTURE_INVALID: orion-appearance color '{hex}' is not #RRGGBB")
    });
    (u32::from(red) << 16) | (u32::from(green) << 8) | u32::from(blue)
}

/// Blend `from` toward `to` by `amount` (0..=1); used for the derived surface
/// tones so every app color still descends from the brand fixture.
pub(crate) fn mix(from: u32, to: u32, amount: f32) -> u32 {
    let amount = amount.clamp(0.0, 1.0);
    let blend = |shift: u32| {
        let a = ((from >> shift) & 0xFF) as f32;
        let b = ((to >> shift) & 0xFF) as f32;
        ((a + (b - a) * amount).round() as u32) << shift
    };
    blend(16) | blend(8) | blend(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mix_interpolates_each_channel() {
        assert_eq!(mix(0x000000, 0xFFFFFF, 0.0), 0x000000);
        assert_eq!(mix(0x000000, 0xFFFFFF, 1.0), 0xFFFFFF);
        assert_eq!(mix(0x000000, 0xFFFFFF, 0.5), 0x808080);
    }

    #[test]
    fn hex_round_trips_the_palette_value() {
        assert_eq!(Colors::hex(0xEF6A3C), "#EF6A3C");
        assert_eq!(parse("#EF6A3C"), 0xEF6A3C);
    }
}
