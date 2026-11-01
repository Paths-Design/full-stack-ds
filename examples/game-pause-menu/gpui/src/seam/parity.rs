//! Parsed parity layout authority.
//!
//! The shared file `examples/game-pause-menu/fixtures/parity-layout.json` is the
//! machine-readable design authority for the parity pass (see
//! `examples/game-pause-menu/parity.md`). This module is the ONLY reader of its
//! raw shape: it parses the lane-copied fixture, validates the cross-field
//! invariants the app relies on, and exposes typed geometry/colour lookups.
//! The view layer must take every absolute coordinate, colour and type size from
//! here — no layout number is re-typed in `src/app/`.
//!
//! Pure `std` + `serde`: no gpui types, so the geometry and the switch contract
//! are testable without a platform backend.

use std::collections::BTreeMap;
use std::fmt;

use serde::Deserialize;

use super::tokens::{TokenProvenance, resolve_palette, resolve_type_scale};
use super::types::hex_rgb;

pub const PARITY_LAYOUT_JSON: &str =
    include_str!("../../fixtures/parity-layout.json");

/// An absolute rectangle in the 1280x800 parity grid.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

impl Rect {
    pub fn right(&self) -> f32 {
        self.x + self.w
    }

    pub fn bottom(&self) -> f32 {
        self.y + self.h
    }

    /// Offset rectangle used for elements positioned inside a card/row.
    pub fn offset_rect(x: f32, y: f32, w: f32, h: f32) -> Self {
        Self { x, y, w, h }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct Size {
    pub width: f32,
    pub height: f32,
}

/// The JSON `colors` map, typed so role lookups are checked at parse time.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Colors {
    pub signal: String,
    pub signal_deep: String,
    pub signal_hot: String,
    pub on_signal: String,
    pub ink: String,
    pub charcoal: String,
    pub graphite: String,
    pub bone_bright: String,
    pub bone: String,
    pub paper: String,
    pub paper_muted: String,
    pub sage: String,
    pub moss: String,
    pub alert: String,
    pub clear: String,
    pub rule: String,
    pub rule_strong: String,
    pub muted: String,
    pub text_secondary: String,
}

impl Colors {
    /// Resolve a JSON colour-role name (e.g. `"charcoal"`, `"textSecondary"`).
    pub fn role(&self, name: &str) -> Option<&str> {
        Some(match name {
            "signal" => &self.signal,
            "signalDeep" => &self.signal_deep,
            "signalHot" => &self.signal_hot,
            "onSignal" => &self.on_signal,
            "ink" => &self.ink,
            "charcoal" => &self.charcoal,
            "graphite" => &self.graphite,
            "boneBright" => &self.bone_bright,
            "bone" => &self.bone,
            "paper" => &self.paper,
            "paperMuted" => &self.paper_muted,
            "sage" => &self.sage,
            "moss" => &self.moss,
            "alert" => &self.alert,
            "clear" => &self.clear,
            "rule" => &self.rule,
            "ruleStrong" => &self.rule_strong,
            "muted" => &self.muted,
            "textSecondary" => &self.text_secondary,
            _ => return None,
        })
    }
}

impl Colors {
    /// Overwrite the palette with token-resolved values (the authority stores
    /// value literals plus provenance; rendering uses the token resolution).
    pub(crate) fn apply_tokens(&mut self, palette: &BTreeMap<String, String>) -> Result<(), ParityError> {
        for name in [
            "signal", "signalDeep", "signalHot", "onSignal", "ink", "charcoal", "graphite",
            "boneBright", "bone", "paper", "paperMuted", "sage", "moss", "alert", "clear",
            "rule", "ruleStrong", "muted", "textSecondary",
        ] {
            let value = palette.get(name).ok_or_else(|| {
                invalid(format!("authority colours are missing token provenance for '{name}'"))
            })?;
            *self.slot_mut(name).expect("known colour role") = value.clone();
        }
        Ok(())
    }

    fn slot_mut(&mut self, name: &str) -> Option<&mut String> {
        Some(match name {
            "signal" => &mut self.signal,
            "signalDeep" => &mut self.signal_deep,
            "signalHot" => &mut self.signal_hot,
            "onSignal" => &mut self.on_signal,
            "ink" => &mut self.ink,
            "charcoal" => &mut self.charcoal,
            "graphite" => &mut self.graphite,
            "boneBright" => &mut self.bone_bright,
            "bone" => &mut self.bone,
            "paper" => &mut self.paper,
            "paperMuted" => &mut self.paper_muted,
            "sage" => &mut self.sage,
            "moss" => &mut self.moss,
            "alert" => &mut self.alert,
            "clear" => &mut self.clear,
            "rule" => &mut self.rule,
            "ruleStrong" => &mut self.rule_strong,
            "muted" => &mut self.muted,
            "textSecondary" => &mut self.text_secondary,
            _ => return None,
        })
    }
}

/// The JSON `type` map. Field name is `type` in the fixture, `type_scale` here.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeScale {
    pub wordmark: f32,
    pub mission: f32,
    pub stat_label: f32,
    pub stat_value: f32,
    pub stat_sub: f32,
    pub chip: f32,
    pub tab: f32,
    pub panel_title: f32,
    pub panel_meta: f32,
    pub row_label: f32,
    pub row_sub: f32,
    pub value: f32,
    pub big_value: f32,
    pub title: f32,
    pub body: f32,
    pub micro: f32,
    pub footer: f32,
    pub drawer_title: f32,
    pub letter_spacing_micro: f32,
    pub letter_spacing_tab: f32,
}

impl TypeScale {
    pub(crate) fn apply_tokens(&mut self, sizes: &BTreeMap<String, f32>) -> Result<(), ParityError> {
        for name in [
            "wordmark", "mission", "statLabel", "statValue", "statSub", "chip", "tab",
            "panelTitle", "panelMeta", "rowLabel", "rowSub", "value", "bigValue", "title",
            "body", "micro", "footer", "drawerTitle", "letterSpacingMicro", "letterSpacingTab",
        ] {
            let value = *sizes.get(name).ok_or_else(|| {
                invalid(format!("authority type sizes are missing token provenance for '{name}'"))
            })?;
            *self.slot_mut(name).expect("known type role") = value;
        }
        Ok(())
    }

    fn slot_mut(&mut self, name: &str) -> Option<&mut f32> {
        Some(match name {
            "wordmark" => &mut self.wordmark,
            "mission" => &mut self.mission,
            "statLabel" => &mut self.stat_label,
            "statValue" => &mut self.stat_value,
            "statSub" => &mut self.stat_sub,
            "chip" => &mut self.chip,
            "tab" => &mut self.tab,
            "panelTitle" => &mut self.panel_title,
            "panelMeta" => &mut self.panel_meta,
            "rowLabel" => &mut self.row_label,
            "rowSub" => &mut self.row_sub,
            "value" => &mut self.value,
            "bigValue" => &mut self.big_value,
            "title" => &mut self.title,
            "body" => &mut self.body,
            "micro" => &mut self.micro,
            "footer" => &mut self.footer,
            "drawerTitle" => &mut self.drawer_title,
            "letterSpacingMicro" => &mut self.letter_spacing_micro,
            "letterSpacingTab" => &mut self.letter_spacing_tab,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct StyleBlock {
    #[serde(rename = "panelBorder")]
    pub panel_border: f32,
    pub radius: f32,
    pub shadow: String,
}

/// Canonical switch geometry (`parity.md` → "Switch parity").
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchGeometry {
    pub width: f32,
    pub height: f32,
    pub radius: f32,
    pub thumb: f32,
    pub thumb_radius: f32,
    pub inset: f32,
    pub on_track: String,
    pub off_track: String,
    pub on_thumb: String,
    pub off_thumb: String,
    pub on_border: Option<String>,
    pub off_border: String,
    pub border_width: f32,
    pub checked_thumb_offset: f32,
}

/// The resolved per-state switch contract the app feeds to `Theme` tokens.
#[derive(Debug, Clone, PartialEq)]
pub struct SwitchStyle {
    pub width: f32,
    pub height: f32,
    pub radius: f32,
    pub thumb: f32,
    pub thumb_radius: f32,
    pub thumb_offset: f32,
    pub track_hex: String,
    pub thumb_hex: String,
    pub border_hex: Option<String>,
    pub border_width: f32,
}

impl SwitchStyle {
    pub fn track_px(&self) -> String {
        format!("{}px", self.width)
    }

    pub fn track_height_px(&self) -> String {
        format!("{}px", self.height)
    }

    pub fn radius_px(&self) -> String {
        format!("{}px", self.radius)
    }

    pub fn thumb_px(&self) -> String {
        format!("{}px", self.thumb)
    }

    pub fn thumb_radius_px(&self) -> String {
        format!("{}px", self.thumb_radius)
    }

    pub fn thumb_offset_px(&self) -> String {
        format!("{}px", self.thumb_offset)
    }

    pub fn border_width_px(&self) -> String {
        format!("{}px", self.border_width)
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Wordmark {
    pub x: f32,
    pub y: f32,
    pub h: f32,
    pub text_main: String,
    pub text_accent: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct TextAt {
    pub x: f32,
    pub y: f32,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HeaderStat {
    pub id: String,
    pub x: f32,
    pub label_y: f32,
    pub value_y: f32,
    pub sub_y: f32,
    pub label: String,
    pub value: String,
    pub sub: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChipRect {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Header {
    pub rect: Rect,
    pub background: String,
    pub rule_bottom: String,
    pub wordmark: Wordmark,
    pub mission: TextAt,
    pub stats: Vec<HeaderStat>,
    pub paused_chip: ChipRect,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct TabDef {
    pub id: String,
    pub x: f32,
    pub w: f32,
    pub label: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabBar {
    pub rect: Rect,
    pub background: String,
    pub rule_bottom: String,
    pub tabs: Vec<TabDef>,
    pub active_background: String,
    pub active_text: String,
    pub inactive_text: String,
    pub separator: String,
    pub label_align: String,
    pub label_inset: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NavTarget {
    pub label_x: f32,
    pub label_y: f32,
    pub label: String,
    pub value_right: f32,
    pub value_y: f32,
    pub empty: String,
    pub align: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Footer {
    pub rect: Rect,
    pub rule_top: String,
    pub hints: TextAt,
    pub nav_target: NavTarget,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Panels {
    pub content: Rect,
    pub header_height: f32,
    pub padding: f32,
    pub background: String,
    pub border: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct MapTitle {
    pub text: String,
    pub meta: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct MarkerGeometry {
    pub size: f32,
    pub monogram: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldNote {
    pub x: f32,
    pub y_offset_from_field_bottom: f32,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconRows {
    pub x: f32,
    pub first_y: f32,
    pub row_h: f32,
    pub width: f32,
    pub icon_size: f32,
    pub name_x: f32,
    pub name_y: f32,
    pub sub_y: f32,
    pub switch_x: f32,
    pub switch_y: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Note {
    pub x: f32,
    pub y: f32,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct PopoverSpec {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    pub title: String,
    pub action: String,
    pub cancel: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MapLayout {
    pub map_panel: Rect,
    pub map_title: MapTitle,
    pub field: Rect,
    pub field_corner_ticks: f32,
    pub marker: MarkerGeometry,
    pub field_note: FieldNote,
    pub icon_panel: Rect,
    pub icon_panel_title: String,
    pub icon_panel_meta: String,
    pub icon_rows: IconRows,
    pub icon_panel_note: Note,
    pub popover: PopoverSpec,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressRows {
    pub x: f32,
    pub first_y: f32,
    pub row_h: f32,
    pub width: f32,
    pub accent_w: f32,
    pub name_x: f32,
    pub name_y: f32,
    pub tagline_y: f32,
    pub rep_bar_x: f32,
    pub rep_bar_y: f32,
    pub rep_bar_w: f32,
    pub rep_bar_h: f32,
    pub status_x: f32,
    pub status_y: f32,
    pub status_w: f32,
    pub status_h: f32,
    pub dossier_x: f32,
    pub dossier_y: f32,
    pub dossier_text: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DrawerClose {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Drawer {
    pub rect: Rect,
    pub background: String,
    pub text: String,
    pub padding: f32,
    pub header_y: f32,
    pub close: DrawerClose,
    pub title_y: f32,
    pub tagline_y: f32,
    pub rule_y: f32,
    pub brief_label_y: f32,
    pub brief_body_y: f32,
    pub history_label_y: f32,
    pub history_body_y: f32,
    pub perks_label_y: f32,
    pub perks_y: f32,
    pub parts_label_y: f32,
    pub parts_header_y: f32,
    pub part_row_y: f32,
    pub part_row_h: f32,
    pub shop_button: Rect,
    pub shop_caption_y: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressLayout {
    pub list_panel: Rect,
    pub list_title: String,
    pub list_meta: String,
    pub rows: ProgressRows,
    pub drawer: Drawer,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RarityChip {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cards {
    pub x: f32,
    pub first_y: f32,
    pub w: f32,
    pub h: f32,
    pub col_gap: f32,
    pub row_gap: f32,
    pub cols: u32,
    pub rarity_chip: RarityChip,
    pub icon_y: f32,
    pub name_y: f32,
    pub size_y: f32,
    pub installed_y: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SlotGrid {
    pub x: f32,
    pub first_y: f32,
    pub w: f32,
    pub h: f32,
    pub col_gap: f32,
    pub row_gap: f32,
    pub cols: u32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AbilitiesLayout {
    pub grid_panel: Rect,
    pub grid_title: String,
    pub grid_meta: String,
    pub cards: Cards,
    pub detail_panel: Rect,
    pub detail_title: String,
    pub detail_meta: String,
    pub ability_title_y: f32,
    pub ability_chips_y: f32,
    pub ability_body_y: f32,
    pub stat_row_y: f32,
    pub loadout_title_y: f32,
    pub vehicle_name_y: f32,
    pub slots: SlotGrid,
    pub pending_note_y: f32,
    pub hover_popover: Rect,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct SettingsPanel {
    pub id: String,
    pub rect: Rect,
    pub title: String,
    pub meta: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct FixedBox {
    pub w: f32,
    pub h: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct SliderSpec {
    pub w: f32,
    pub h: f32,
    pub thumb: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct SwatchSpec {
    pub w: f32,
    pub h: f32,
    pub gap: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemapModalSpec {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
    pub prompt: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsLayout {
    pub panels: Vec<SettingsPanel>,
    pub row_h: f32,
    pub first_row_y: f32,
    pub remap_row_h: f32,
    pub remap_first_row_y: f32,
    pub audio_row_h: f32,
    pub audio_first_row_y: f32,
    pub language_label_y: f32,
    pub dropdown_y: f32,
    pub dropdown_h: f32,
    pub swatch_label_y: f32,
    pub swatch_y: f32,
    pub swatch_h: f32,
    pub slider: SliderSpec,
    pub binding_button: FixedBox,
    pub dropdown: FixedBox,
    pub swatch: SwatchSpec,
    pub preview: Rect,
    pub remap_modal: RemapModalSpec,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusChip {
    pub access_background: String,
    pub access_text: String,
    pub locked_border: String,
    pub locked_text: String,
}

/// A portable two-letter code tile (`iconArt` in the parity authority).
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconTileSpec {
    #[serde(rename = "$note", default)]
    pub note: Option<String>,
    pub size: f32,
    pub background: String,
    pub border: String,
    pub border_width: f32,
    pub radius: f32,
    pub font_size: f32,
    pub weight: u32,
    pub text: String,
    pub source: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IconArt {
    #[serde(rename = "$note", default)]
    pub note: Option<String>,
    pub row_tile: IconTileSpec,
    pub card_tile: IconTileSpec,
}

/// One capture state from the JSON `captures` map. All optional selectors are
/// applied to a freshly reset [`crate::seam::state::AppState`].
#[derive(Debug, Clone, PartialEq, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CaptureSpec {
    pub active_tab: String,
    #[serde(default)]
    pub nav_target: Option<String>,
    #[serde(default)]
    pub hidden_icons: Vec<String>,
    #[serde(default)]
    pub popover: Option<String>,
    #[serde(default)]
    pub drawer: Option<String>,
    #[serde(default)]
    pub pending_ability: Option<String>,
    #[serde(default)]
    pub hover: Option<String>,
    #[serde(default)]
    pub section: Option<String>,
    #[serde(default)]
    pub remap_modal: Option<String>,
    #[serde(default)]
    pub subtitle_background: Option<String>,
    #[serde(default)]
    pub subtitle_language: Option<String>,
}

/// SETTINGS panels use a 36 px header (`parity.md` → SETTINGS), while the
/// global panel header height in the JSON is 40 px.
pub const SETTINGS_PANEL_HEADER_HEIGHT: f32 = 36.0;

/// The complete parity layout authority.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParityLayout {
    #[serde(rename = "$note", default)]
    pub note: Option<String>,
    pub viewport: Size,
    pub colors: Colors,
    #[serde(rename = "type")]
    pub type_scale: TypeScale,
    pub style: StyleBlock,
    pub switch: SwitchGeometry,
    pub header: Header,
    pub tab_bar: TabBar,
    pub footer: Footer,
    pub panels: Panels,
    pub map: MapLayout,
    pub progress: ProgressLayout,
    pub abilities: AbilitiesLayout,
    pub settings: SettingsLayout,
    pub marker_monograms: BTreeMap<String, String>,
    pub marker_colors: BTreeMap<String, String>,
    pub rarity_colors: BTreeMap<String, String>,
    pub rarity_text_colors: BTreeMap<String, String>,
    pub status_chip: StatusChip,
    pub captures: BTreeMap<String, CaptureSpec>,
    pub icon_art: IconArt,
    #[serde(rename = "colorTokens", default)]
    pub color_tokens: BTreeMap<String, TokenProvenance>,
    #[serde(rename = "typeTokens", default)]
    pub type_tokens: BTreeMap<String, TokenProvenance>,
}

/// The portable icon code for a catalog name (`parity.md` → "Icon art").
///
/// The authority pins outputs such as `Info → IN`, `CircleDot → CD` and
/// `ChevronRight → CR`: the first character plus the first following uppercase
/// character (CamelCase initials), falling back to the second character and
/// finally to the single character. Both characters are uppercased.
pub fn code_two_letters(source: &str) -> String {
    let letters: Vec<char> = source
        .chars()
        .filter(|character| character.is_alphanumeric())
        .collect();
    let Some(&first) = letters.first() else {
        return String::new();
    };
    let second = letters
        .iter()
        .skip(1)
        .find(|character| character.is_uppercase())
        .or_else(|| letters.get(1))
        .copied()
        .unwrap_or(first);
    format!(
        "{}{}",
        first.to_uppercase(),
        second.to_uppercase()
    )
}

/// The pinned code for one of the fixture's icon-catalog names.
///
/// `parity.md` → "Icon art" pins these exact outputs for the shared corpus
/// (`Baseline → BL` is not derivable from the first two characters, so the
/// fixture vocabulary is pinned explicitly); unknown catalog names fall back to
/// [`code_two_letters`] so the language is still deterministic.
pub fn icon_code(catalog_name: &str) -> String {
    match catalog_name {
        "Info" => "IN".to_string(),
        "Placeholder" => "PL".to_string(),
        "Home" => "HO".to_string(),
        "Baseline" => "BL".to_string(),
        "Alarm" => "AL".to_string(),
        "CircleDot" => "CD".to_string(),
        "ChevronRight" => "CR".to_string(),
        "User" => "US".to_string(),
        other => code_two_letters(other),
    }
}

impl ParityLayout {
    /// Required lane captures (`parity.md` → "Capture states").
    pub const REQUIRED_CAPTURES: [&'static str; 4] =
        ["map", "progress", "abilities", "settings"];

    /// The per-state switch contract derived from the JSON switch geometry.
    pub fn switch_style(&self, checked: bool) -> SwitchStyle {
        let geometry = &self.switch;
        let role = |name: &str| {
            self.colors
                .role(name)
                .unwrap_or_else(|| panic!("GPUI_LANE_PARITY_INVALID: unknown colour role {name}"))
                .to_string()
        };
        SwitchStyle {
            width: geometry.width,
            height: geometry.height,
            radius: geometry.radius,
            thumb: geometry.thumb,
            thumb_radius: geometry.thumb_radius,
            thumb_offset: if checked {
                geometry.checked_thumb_offset
            } else {
                geometry.inset
            },
            track_hex: role(if checked {
                &geometry.on_track
            } else {
                &geometry.off_track
            }),
            thumb_hex: role(if checked {
                &geometry.on_thumb
            } else {
                &geometry.off_thumb
            }),
            border_hex: if checked {
                geometry
                    .on_border
                    .as_deref()
                    .map(|name| role(name))
            } else {
                Some(role(&geometry.off_border))
            },
            border_width: if checked && geometry.on_border.is_none() {
                0.0
            } else {
                geometry.border_width
            },
        }
    }

    pub fn color(&self, role: &str) -> &str {
        self.colors
            .role(role)
            .unwrap_or_else(|| panic!("GPUI_LANE_PARITY_INVALID: unknown colour role {role}"))
    }

    pub fn panel(&self, id: &str) -> Option<&SettingsPanel> {
        self.settings.panels.iter().find(|panel| panel.id == id)
    }
}

/// A parity fixture that does not satisfy the shared authority contract.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParityError {
    pub message: String,
}

impl fmt::Display for ParityError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for ParityError {}

fn invalid(message: impl Into<String>) -> ParityError {
    ParityError {
        message: message.into(),
    }
}

/// Load the embedded parity layout, panicking on malformed authority data.
pub fn load_parity_layout() -> ParityLayout {
    expect_parity_layout(try_load_parity_layout())
}

pub fn expect_parity_layout(result: Result<ParityLayout, ParityError>) -> ParityLayout {
    match result {
        Ok(layout) => layout,
        Err(error) => panic!("GPUI_LANE_PARITY_INVALID: {error}"),
    }
}

pub fn try_load_parity_layout() -> Result<ParityLayout, ParityError> {
    let mut layout = parse_parity_layout(PARITY_LAYOUT_JSON)?;
    apply_token_authority(&mut layout)?;
    Ok(layout)
}

/// Resolve the authority's `colorTokens` / `typeTokens` provenance through the
/// embedded token graph + Orion brand layer and write the values the views
/// render. The literal values in the fixture are the checked fallback, not the
/// rendering source.
fn apply_token_authority(layout: &mut ParityLayout) -> Result<(), ParityError> {
    if layout.color_tokens.is_empty() || layout.type_tokens.is_empty() {
        return Err(invalid("authority must declare colorTokens and typeTokens provenance"));
    }
    let palette = resolve_palette(&layout.color_tokens)
        .map_err(|error| invalid(format!("colour token resolution failed: {error}")))?;
    layout.colors.apply_tokens(&palette)?;
    let sizes = resolve_type_scale(&layout.type_tokens)
        .map_err(|error| invalid(format!("type token resolution failed: {error}")))?;
    layout.type_scale.apply_tokens(&sizes)?;
    Ok(())
}

/// Parse and validate a parity layout document.
pub fn parse_parity_layout(source: &str) -> Result<ParityLayout, ParityError> {
    let layout: ParityLayout =
        serde_json::from_str(source).map_err(|error| invalid(format!("malformed JSON: {error}")))?;
    validate(&layout)?;
    Ok(layout)
}

fn validate(layout: &ParityLayout) -> Result<(), ParityError> {
    validate_viewport(layout)?;
    validate_switch(layout)?;
    validate_tabs(layout)?;
    validate_rects(layout)?;
    validate_colours(layout)?;
    validate_captures(layout)?;
    validate_icon_art(layout)?;
    Ok(())
}

fn check_rect(name: &str, rect: Rect, viewport: Size) -> Result<(), ParityError> {
    if rect.w <= 0.0 || rect.h <= 0.0 || rect.x < 0.0 || rect.y < 0.0 {
        return Err(invalid(format!("{name} must have positive size inside the viewport")));
    }
    if rect.right() > viewport.width + 0.5 || rect.bottom() > viewport.height + 0.5 {
        return Err(invalid(format!("{name} extends beyond the viewport")));
    }
    Ok(())
}

fn validate_viewport(layout: &ParityLayout) -> Result<(), ParityError> {
    if layout.viewport.width <= 0.0 || layout.viewport.height <= 0.0 {
        return Err(invalid("viewport must be positive"));
    }
    let viewport = layout.viewport;
    if layout.style.radius != 0.0 {
        return Err(invalid("panel radius must be 0"));
    }
    if layout.style.shadow != "none" {
        return Err(invalid("panel shadow must be none"));
    }
    if layout.style.panel_border <= 0.0 {
        return Err(invalid("panel border width must be positive"));
    }
    if layout.panels.content.y - layout.panels.padding != layout.tab_bar.rect.bottom() {
        return Err(invalid(
            "content region must sit one padding step below the tab bar",
        ));
    }
    if layout.panels.content.y < layout.tab_bar.rect.bottom() {
        return Err(invalid("content region must start below the tab bar"));
    }
    if layout.footer.rect.y + layout.footer.rect.h != viewport.height {
        return Err(invalid("footer must touch the viewport bottom"));
    }
    if layout.footer.rect.y < layout.panels.content.bottom() {
        return Err(invalid("footer must start below the content region"));
    }
    if layout.footer.nav_target.align != "right" {
        return Err(invalid("footer nav target must be right-aligned"));
    }
    if layout.footer.nav_target.value_right > layout.footer.rect.right() - layout.panels.padding {
        return Err(invalid("footer nav target value must stay inside the footer padding"));
    }
    if layout.header.rect.y != 0.0 || layout.header.rect.x != 0.0 {
        return Err(invalid("header must be at the origin"));
    }
    if layout.header.rect.bottom() != layout.tab_bar.rect.y {
        return Err(invalid("tab bar must start at the header bottom"));
    }
    Ok(())
}

fn validate_switch(layout: &ParityLayout) -> Result<(), ParityError> {
    let switch = &layout.switch;
    let half_height = switch.height / 2.0;
    if (switch.radius - half_height).abs() > f32::EPSILON {
        return Err(invalid("switch radius must be half the track height (pill)"));
    }
    if (switch.thumb_radius - switch.thumb / 2.0).abs() > f32::EPSILON {
        return Err(invalid("switch thumb radius must be half the thumb size (circle)"));
    }
    let expected_offset = switch.width - switch.thumb - switch.inset;
    if (switch.checked_thumb_offset - expected_offset).abs() > f32::EPSILON {
        return Err(invalid(format!(
            "switch checked thumb offset must equal width - thumb - inset ({expected_offset})"
        )));
    }
    if switch.inset <= 0.0 || switch.border_width <= 0.0 {
        return Err(invalid("switch inset and border width must be positive"));
    }
    if switch.on_border.is_some() {
        return Err(invalid("the canonical switch has no border when on"));
    }
    Ok(())
}

fn validate_tabs(layout: &ParityLayout) -> Result<(), ParityError> {
    if layout.tab_bar.tabs.len() != 4 {
        return Err(invalid("the tab bar must declare exactly four tabs"));
    }
    let mut expected_x = layout.tab_bar.rect.x;
    for tab in &layout.tab_bar.tabs {
        if (tab.x - expected_x).abs() > f32::EPSILON {
            return Err(invalid("tabs must be contiguous from the tab bar origin"));
        }
        if tab.w != layout.tab_bar.rect.w / 4.0 {
            return Err(invalid("tabs must be equal quarter-width columns"));
        }
        expected_x += tab.w;
    }
    if (expected_x - layout.tab_bar.rect.right()).abs() > f32::EPSILON {
        return Err(invalid("tabs must span the tab bar width"));
    }
    if layout.tab_bar.label_align != "left" {
        return Err(invalid("tab labels must be left-aligned (`tabBar.labelAlign`)"));
    }
    if layout.tab_bar.label_inset < 0.0 || layout.tab_bar.label_inset > layout.tab_bar.rect.w / 4.0 {
        return Err(invalid("tab label inset must fit one tab column"));
    }
    Ok(())
}

fn validate_rects(layout: &ParityLayout) -> Result<(), ParityError> {
    let viewport = layout.viewport;
    let rects: [(&str, Rect); 14] = [
        ("header", layout.header.rect),
        ("tabBar", layout.tab_bar.rect),
        ("footer", layout.footer.rect),
        ("panels.content", layout.panels.content),
        ("map.mapPanel", layout.map.map_panel),
        ("map.field", layout.map.field),
        ("map.iconPanel", layout.map.icon_panel),
        ("progress.listPanel", layout.progress.list_panel),
        ("progress.drawer", layout.progress.drawer.rect),
        ("abilities.gridPanel", layout.abilities.grid_panel),
        ("abilities.detailPanel", layout.abilities.detail_panel),
        ("abilities.hoverPopover", layout.abilities.hover_popover),
        ("settings.preview", layout.settings.preview),
        (
            "settings.remapModal",
            Rect {
                x: layout.settings.remap_modal.x,
                y: layout.settings.remap_modal.y,
                w: layout.settings.remap_modal.w,
                h: layout.settings.remap_modal.h,
            },
        ),
    ];
    for (name, rect) in rects {
        check_rect(name, rect, viewport)?;
    }
    if layout.map.map_panel.right() + layout.panels.padding != layout.map.icon_panel.x {
        return Err(invalid(
            "map icon panel must sit one padding step right of the map panel",
        ));
    }
    for (index, panel) in layout.settings.panels.iter().enumerate() {
        check_rect(&format!("settings.panels[{index}]"), panel.rect, viewport)?;
    }
    if layout.settings.panels.len() != 4 {
        return Err(invalid("settings must declare four panels"));
    }
    let remap_panel = layout
        .panel("remap")
        .ok_or_else(|| invalid("settings must declare the remap panel"))?
        .rect;
    let remap_last_row_bottom = layout.settings.remap_first_row_y
        + 5.0 * layout.settings.remap_row_h
        + layout.settings.binding_button.h;
    if layout.settings.remap_first_row_y < remap_panel.y + SETTINGS_PANEL_HEADER_HEIGHT
        || remap_last_row_bottom > remap_panel.bottom()
    {
        return Err(invalid("remap rows must fit inside the remap panel"));
    }
    let audio_panel = layout
        .panel("audio")
        .ok_or_else(|| invalid("settings must declare the audio panel"))?
        .rect;
    if layout.settings.swatch_y + layout.settings.swatch_h > audio_panel.bottom()
        || layout.settings.preview.bottom() > audio_panel.bottom()
        || layout.settings.dropdown_y + layout.settings.dropdown_h > audio_panel.bottom()
    {
        return Err(invalid("audio sub-layout must not spill past the panel bottom"));
    }
    let cards = &layout.abilities.cards;
    let rows = 2.0;
    let grid_bottom = cards.first_y
        + (rows - 1.0) * (cards.h + cards.row_gap)
        + cards.h;
    if grid_bottom > layout.abilities.grid_panel.bottom() {
        return Err(invalid("ability card rows must fit inside the grid panel"));
    }
    if layout.settings.panels[0].rect.w != layout.settings.panels[1].rect.w
        || layout.settings.panels[0].rect.h != layout.settings.panels[1].rect.h
    {
        return Err(invalid("the 2x2 settings grid must use equal panel sizes"));
    }
    Ok(())
}

fn validate_colours(layout: &ParityLayout) -> Result<(), ParityError> {
    let check = |role: &str, context: &str| {
        if layout.colors.role(role).is_none() {
            return Err(invalid(format!("{context} references unknown colour role '{role}'")));
        }
        if let Some(hex) = layout.colors.role(role)
            && hex_rgb(hex).is_none()
        {
            return Err(invalid(format!("{context} colour role '{role}' is not #RRGGBB")));
        }
        Ok(())
    };
    let roles = [
        ("header.background", layout.header.background.as_str()),
        ("header.ruleBottom", layout.header.rule_bottom.as_str()),
        ("tabBar.background", layout.tab_bar.background.as_str()),
        ("tabBar.activeBackground", layout.tab_bar.active_background.as_str()),
        ("tabBar.activeText", layout.tab_bar.active_text.as_str()),
        ("tabBar.inactiveText", layout.tab_bar.inactive_text.as_str()),
        ("tabBar.separator", layout.tab_bar.separator.as_str()),
        ("footer.ruleTop", layout.footer.rule_top.as_str()),
        ("panels.background", layout.panels.background.as_str()),
        ("panels.border", layout.panels.border.as_str()),
        ("switch.onTrack", layout.switch.on_track.as_str()),
        ("switch.offTrack", layout.switch.off_track.as_str()),
        ("switch.onThumb", layout.switch.on_thumb.as_str()),
        ("switch.offThumb", layout.switch.off_thumb.as_str()),
        ("switch.offBorder", layout.switch.off_border.as_str()),
        ("progress.drawer.background", layout.progress.drawer.background.as_str()),
        ("progress.drawer.text", layout.progress.drawer.text.as_str()),
        ("statusChip.accessBackground", layout.status_chip.access_background.as_str()),
        ("statusChip.accessText", layout.status_chip.access_text.as_str()),
        ("statusChip.lockedBorder", layout.status_chip.locked_border.as_str()),
        ("statusChip.lockedText", layout.status_chip.locked_text.as_str()),
    ];
    for (context, role) in roles {
        check(role, context)?;
    }
    for (kind, role) in &layout.marker_colors {
        check(role, &format!("markerColors.{kind}"))?;
    }
    for (rarity, role) in &layout.rarity_colors {
        check(role, &format!("rarityColors.{rarity}"))?;
    }
    for (rarity, role) in &layout.rarity_text_colors {
        check(role, &format!("rarityTextColors.{rarity}"))?;
    }
    if layout.marker_monograms.keys().ne(layout.marker_colors.keys()) {
        return Err(invalid(
            "markerMonograms and markerColors must cover the same marker kinds",
        ));
    }
    if layout.rarity_colors.keys().ne(layout.rarity_text_colors.keys()) {
        return Err(invalid(
            "rarityColors and rarityTextColors must cover the same rarities",
        ));
    }
    Ok(())
}

fn validate_icon_art(layout: &ParityLayout) -> Result<(), ParityError> {
    for (name, tile) in [
        ("iconArt.rowTile", &layout.icon_art.row_tile),
        ("iconArt.cardTile", &layout.icon_art.card_tile),
    ] {
        if tile.size <= 0.0 || tile.font_size <= 0.0 || tile.border_width < 0.0 {
            return Err(invalid(format!("{name} must declare positive geometry")));
        }
        if tile.radius != 0.0 {
            return Err(invalid(format!("{name} must be square (radius 0)")));
        }
        if tile.font_size >= tile.size {
            return Err(invalid(format!("{name} text must fit inside the tile")));
        }
        if layout.colors.role(&tile.background).is_none() {
            return Err(invalid(format!("{name} background is not a colour role")));
        }
        if layout.colors.role(&tile.border).is_none() {
            return Err(invalid(format!("{name} border is not a colour role")));
        }
        if layout.colors.role(&tile.text).is_none() {
            return Err(invalid(format!("{name} text is not a colour role")));
        }
    }
    Ok(())
}

fn validate_captures(layout: &ParityLayout) -> Result<(), ParityError> {
    for required in ParityLayout::REQUIRED_CAPTURES {
        let Some(capture) = layout.captures.get(required) else {
            return Err(invalid(format!("captures must include the required state '{required}'")));
        };
        if capture.active_tab.is_empty() {
            return Err(invalid(format!("capture '{required}' needs an activeTab")));
        }
    }
    if layout.captures.len() < 8 {
        return Err(invalid("the parity plan declares eight capture states"));
    }
    for (name, capture) in &layout.captures {
        if capture.nav_target.is_none() {
            return Err(invalid(format!(
                "capture '{name}' must set the shared nav target"
            )));
        }
        if super::state::Tab::from_key(&capture.active_tab).is_none() {
            return Err(invalid(format!(
                "capture '{name}' names unknown tab '{}'",
                capture.active_tab
            )));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_layout_parses() {
        let layout = load_parity_layout();
        assert_eq!(layout.viewport.width, 1280.0);
        assert_eq!(layout.viewport.height, 800.0);
        assert_eq!(layout.captures.len(), 8);
    }
}
