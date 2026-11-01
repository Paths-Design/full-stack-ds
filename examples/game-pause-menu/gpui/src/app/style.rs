//! Type/chrome defaults pinned by `parity.md` → "Component styling defaults".
//!
//! Geometry, palette and the type-map sizes come from
//! `fixtures/parity-layout.json`. A handful of text sizes/weights are pinned by
//! the parity document but are not present in the JSON type map (for example
//! the 9 px / 800 rarity chip and the 28 px drawer title); they live here, in
//! one module, with the parity-document source named, so no view file re-types
//! an ad-hoc number.

use game_pause_menu_gpui::seam::TypeScale;

/// A resolved text request: exact size, weight and leading.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct TextStyleSpec {
    pub size: f32,
    pub weight: Weight,
    pub line_height: f32,
}

impl TextStyleSpec {
    pub(crate) const fn new(size: f32, weight: Weight, line_height: f32) -> Self {
        Self {
            size,
            weight,
            line_height,
        }
    }
}

/// The generated `Text` weight variants plus the two pinned extra weights
/// (600 and 800) that the lane forces through the component's token cascade.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Weight {
    Regular,
    SemiBold,
    Bold,
    Heavy,
}

impl Weight {
    /// Map a JSON weight number to the two pinned Inter weights. The parity
    /// authority uses only regular 400 and bold 700 (the pinned GPUI renderer
    /// has no variable-axis channel); any larger request is bold.
    pub(crate) fn from_numeric(weight: u32) -> Self {
        match weight {
            300 | 400 => Weight::Regular,
            _ => Weight::Bold,
        }
    }

    /// The generated `Text` weight variant the lane sets.
    pub(crate) fn variant(self) -> &'static str {
        match self {
            Weight::Regular | Weight::SemiBold => "normal",
            Weight::Bold | Weight::Heavy => "bold",
        }
    }

    /// No token nudge is needed: the bold variant already resolves to 700, and
    /// 600/800 are retired from the parity type treatment.
    pub(crate) fn token_override(self) -> Option<(&'static str, &'static str)> {
        None
    }
}

/// Pinned chip metrics (`parity.md` → "Status chips" / "Rarity chips").
pub(crate) struct ChipMetrics {
    pub font: f32,
    pub weight: Weight,
    pub height: f32,
}

pub(crate) const STATUS_CHIP: ChipMetrics = ChipMetrics {
    font: 10.0,
    weight: Weight::Heavy,
    height: 22.0,
};

pub(crate) const RARITY_CHIP: ChipMetrics = ChipMetrics {
    font: 9.0,
    weight: Weight::Heavy,
    height: 18.0,
};

pub(crate) const HEADER_CHIP: ChipMetrics = ChipMetrics {
    font: 10.0,
    weight: Weight::Heavy,
    height: 24.0,
};

pub(crate) const INSTALLED_CHIP: ChipMetrics = ChipMetrics {
    font: 9.0,
    weight: Weight::Heavy,
    height: 18.0,
};

/// SETTINGS panels use a 36 px header (`parity.md` → SETTINGS); the seam owns
/// the constant so the app and the layout validation cannot drift.
pub(crate) use game_pause_menu_gpui::seam::parity::SETTINGS_PANEL_HEADER_HEIGHT as SETTINGS_HEADER_HEIGHT;

/// Oversized grey display wordmark/numeral (`parity.md` → Orion restyle).
pub(crate) fn ghost(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.ghost, Weight::Bold, 0.9)
}

/// Panel title: 11 px / 700 / uppercase / boneBright (`parity.md`).
pub(crate) fn panel_title(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.panel_title, Weight::Bold, 1.0)
}

/// Panel meta: 10 px / 600 / muted.
pub(crate) fn panel_meta(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.panel_meta, Weight::SemiBold, 1.0)
}

/// Row primary label: 12 px / 700 / uppercase / boneBright.
pub(crate) fn row_label(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.row_label, Weight::Bold, 1.0)
}

/// Row secondary line: 10 px / 400 / muted.
pub(crate) fn row_sub(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.row_sub, Weight::Regular, 1.0)
}

/// Body copy: 13 px / 400 with readable leading.
pub(crate) fn body(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.body, Weight::Regular, 1.2)
}

/// Perk/part micro copy in the drawer: 11 px.
pub(crate) fn drawer_micro() -> TextStyleSpec {
    TextStyleSpec::new(11.0, Weight::Regular, 1.2)
}

/// Drawer title: `type.drawerTitle` / 700 (`parity.md` → "Drawer").
pub(crate) fn drawer_title(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.drawer_title, Weight::Bold, 1.0)
}

/// Header stat label: 10 px / 700 / muted.
pub(crate) fn stat_label(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.stat_label, Weight::Bold, 1.0)
}

/// Header stat value: 20 px / 800 / boneBright.
pub(crate) fn stat_value(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.stat_value, Weight::Heavy, 1.0)
}

/// Header stat subline: 11 px / 400 / muted.
pub(crate) fn stat_sub(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.stat_sub, Weight::Regular, 1.0)
}

/// Primary button label: 13 px / 800 / uppercase (`parity.md` → "Buttons").
pub(crate) fn button_primary() -> TextStyleSpec {
    TextStyleSpec::new(13.0, Weight::Heavy, 1.0)
}

/// Outline/binding button label: 11 px / 700.
pub(crate) fn button_secondary() -> TextStyleSpec {
    TextStyleSpec::new(11.0, Weight::Bold, 1.0)
}

/// Tiny outline control label (CLOSE chips): 10 px / 700.
pub(crate) fn button_tiny() -> TextStyleSpec {
    TextStyleSpec::new(10.0, Weight::Bold, 1.0)
}

/// Slider value: 14 px / 700 / boneBright.
pub(crate) fn slider_value(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.value, Weight::Bold, 1.0)
}

/// Footer hints: 11 px / 400 / muted.
pub(crate) fn footer_hint(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.footer, Weight::Regular, 1.0)
}

/// Footer NAV TARGET label: 10 px / 700 / muted.
pub(crate) fn footer_label(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.micro, Weight::Bold, 1.0)
}

/// Footer NAV TARGET value: 13 px / 700 / signal.
pub(crate) fn footer_value(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.tab, Weight::Bold, 1.0)
}

/// Roster dossier affordance: 10 px / 700 / signal (`parity.md` → PROGRESS).
pub(crate) fn dossier() -> TextStyleSpec {
    TextStyleSpec::new(10.0, Weight::Bold, 1.0)
}

/// Wordmark: 40 px / 800.
pub(crate) fn wordmark(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.wordmark, Weight::Heavy, 1.0)
}

/// Mission subline: 11 px / 600.
pub(crate) fn mission(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.mission, Weight::SemiBold, 1.0)
}

/// Tab label: 13 px.
pub(crate) fn tab(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.tab, Weight::Bold, 1.0)
}

/// Generic value line: `type.value` px / 700.
pub(crate) fn value(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.value, Weight::Bold, 1.0)
}

/// Generic micro label: `type.micro` px / 600.
pub(crate) fn micro(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.micro, Weight::SemiBold, 1.0)
}

/// Card name: 12 px / 700 (same as row label).
pub(crate) fn card_name(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.row_label, Weight::Bold, 1.0)
}

/// Card size line: 10 px / 400.
pub(crate) fn card_size(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.row_sub, Weight::Regular, 1.0)
}

/// Ability detail title: `type.title` px / 700.
pub(crate) fn ability_title(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.title, Weight::Bold, 1.0)
}

/// Drawer / modal body copy (13 px / 400).
pub(crate) fn copy(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.body, Weight::Regular, 1.2)
}

/// Remap prompt: 20 px / 800 (big value size).
pub(crate) fn prompt(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.big_value, Weight::Heavy, 1.0)
}

/// Section stat label (HEAT/COOLDOWN/DRAW): 10 px / 700 / muted.
pub(crate) fn stat_block_label(type_scale: &TypeScale) -> TextStyleSpec {
    TextStyleSpec::new(type_scale.micro, Weight::Bold, 1.0)
}
