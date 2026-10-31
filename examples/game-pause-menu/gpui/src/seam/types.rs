//! The lane-local fixture shape.
//!
//! This module is the ONLY place that names the raw JSON field names of the
//! shared pause-menu fixture corpus (`examples/game-pause-menu/fixtures/`).
//! It is pure `std` + `serde`: no gpui types appear anywhere on this path, so
//! the domain rules can be exercised by `cargo test` without a platform
//! backend. UI code consumes the higher-level [`crate::seam::state::AppState`]
//! and the validated [`crate::seam::adapter::Fixtures`] snapshot, never the raw
//! JSON and never a `serde_json::Value`.

use serde::Deserialize;

/// `fixtures/commander.json`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Commander {
    pub id: String,
    pub callsign: String,
    pub callsign_plate: String,
    pub mission: String,
    pub status: String,
    pub rank: Rank,
    pub earnings: Earnings,
    pub followers: Followers,
    /// Initial nav target. The fixture ships `null`; domain state owns the
    /// live target (fixtures are immutable after load).
    pub nav_target: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rank {
    pub label: String,
    pub level: u32,
    pub global_position: u32,
    pub percentile: String,
    pub points: u32,
    pub next_level_at: u32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Earnings {
    pub credits: u64,
    pub pending: u64,
    pub currency: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Followers {
    pub total: u64,
    pub trend: String,
    pub period: String,
}

/// `fixtures/map-icons.json`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct MapIcons {
    pub sector: String,
    pub scale: String,
    pub icons: Vec<MapIcon>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MapIcon {
    pub id: String,
    pub kind: String,
    pub label: String,
    /// Lucide-style icon name from the web fixture. The GPUI target admits no
    /// Icon component, so the lane renders a hand-authored kind glyph instead;
    /// the field is carried for fixture fidelity.
    pub icon: String,
    pub x: f64,
    pub y: f64,
    pub visible: bool,
    pub status: String,
    pub sector: String,
    pub distance_km: f64,
    pub detail: String,
    pub reward: String,
}

/// `fixtures/factions.json`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Factions {
    pub factions: Vec<Faction>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Faction {
    pub id: String,
    pub name: String,
    pub tagline: String,
    pub unlocked: bool,
    pub tier: u32,
    pub reputation: u32,
    pub reputation_max: u32,
    pub requirement: String,
    pub detail: FactionDetail,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FactionDetail {
    pub description: String,
    pub history: String,
    pub perks: Vec<String>,
    pub parts: Vec<Part>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Part {
    pub name: String,
    pub cost: u64,
    pub rarity: String,
    pub size: u32,
}

/// `fixtures/abilities.json`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Abilities {
    pub abilities: Vec<Ability>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ability {
    pub id: String,
    pub name: String,
    pub description: String,
    pub rarity: String,
    pub size: u32,
    pub icon: String,
    pub stats: AbilityStats,
    pub detail: String,
    /// Carried by the shared fixture contract but NOT authoritative: the
    /// vehicle owns installation. Domain state derives installed-ness from
    /// the loadout slots.
    #[serde(default)]
    pub installed: bool,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct AbilityStats {
    pub heat: u32,
    pub cooldown: String,
    pub draw: String,
}

/// `fixtures/vehicle.json`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Vehicle {
    pub name: String,
    pub chassis: String,
    pub slots: Vec<VehicleSlot>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleSlot {
    pub id: String,
    pub label: String,
    pub size: u32,
    pub ability_id: Option<String>,
}

/// `fixtures/settings.json`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Settings {
    pub general: Vec<GeneralSetting>,
    pub controller: Vec<ControllerSetting>,
    pub remap: Vec<RemapAction>,
    pub audio: Audio,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct GeneralSetting {
    pub id: String,
    pub label: String,
    pub description: String,
    pub value: bool,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct ControllerSetting {
    pub id: String,
    pub label: String,
    pub description: String,
    pub min: f32,
    pub max: f32,
    pub step: f32,
    pub value: f32,
    pub unit: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct RemapAction {
    pub id: String,
    pub label: String,
    pub binding: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Audio {
    pub sliders: Vec<AudioSlider>,
    pub audio_language: LanguageSetting,
    pub subtitle_language: LanguageSetting,
    pub subtitle_background: SubtitleBackground,
    pub preview_line: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct AudioSlider {
    pub id: String,
    pub label: String,
    pub value: f32,
    pub unit: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct LanguageSetting {
    pub label: String,
    pub value: String,
    pub options: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct SubtitleBackground {
    pub label: String,
    pub value: String,
    pub options: Vec<Swatch>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Swatch {
    pub id: String,
    pub label: String,
    pub value: String,
}

/// `fixtures/orion-appearance.json`.
///
/// The brand layer in `packages/ds-tokens/src/brands/orion.tokens.json` is the
/// authority for these values; this file is the lane-consumption copy the GPUI
/// target needs because it has no brand-graph loader.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Appearance {
    #[serde(rename = "$note", default)]
    pub note: Option<String>,
    pub palette: Palette,
    pub surface: Surface,
    pub style: StyleConstants,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Palette {
    pub signal: String,
    pub signal_deep: String,
    pub signal_hot: String,
    pub on_signal: String,
    pub ink: String,
    pub charcoal: String,
    pub graphite: String,
    pub bone_bright: String,
    pub bone: String,
    pub sage: String,
    pub moss: String,
    pub alert: String,
    pub clear: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Surface {
    pub app: String,
    pub panel: String,
    pub raised: String,
    pub rule: String,
    pub rule_strong: String,
    pub muted: String,
    pub telemetry: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StyleConstants {
    pub radius: f32,
    pub border_width: f32,
    pub micro_label_letter_spacing: f32,
    pub uppercase_labels: bool,
    pub watermark: String,
    pub font_note: String,
}

/// Parse a `#RRGGBB` / `#RRGGBBAA` hex color from the appearance fixture.
///
/// Returns `(r, g, b)`; alpha is intentionally ignored because the graphic
/// grammar has no translucent fills (no shadows, no washes).
pub fn hex_rgb(hex: &str) -> Option<[u8; 3]> {
    let raw = hex.strip_prefix('#')?;
    if raw.len() != 6 && raw.len() != 8 {
        return None;
    }
    let red = u8::from_str_radix(raw.get(0..2)?, 16).ok()?;
    let green = u8::from_str_radix(raw.get(2..4)?, 16).ok()?;
    let blue = u8::from_str_radix(raw.get(4..6)?, 16).ok()?;
    Some([red, green, blue])
}

/// WCAG relative luminance of a hex color (`None` for a malformed value).
pub fn relative_luminance(hex: &str) -> Option<f64> {
    fn linear(channel: u8) -> f64 {
        let c = f64::from(channel) / 255.0;
        if c <= 0.04045 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    }
    let [r, g, b] = hex_rgb(hex)?;
    Some(0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b))
}

/// WCAG contrast ratio between two hex colors (`None` for malformed input).
pub fn contrast_ratio(foreground: &str, background: &str) -> Option<f64> {
    let a = relative_luminance(foreground)?;
    let b = relative_luminance(background)?;
    let (light, dark) = if a > b { (a, b) } else { (b, a) };
    Some((light + 0.05) / (dark + 0.05))
}
