//! The lane's framework-neutral pause-menu domain state and rules.
//!
//! Every named interaction in `examples/game-pause-menu/spec.md` has exactly
//! one transition here (I1–I15 below map to these methods); the GPUI view in
//! `src/app/` is a projection over this state. The module is pure `std`: no
//! gpui types, no timers, no I/O, so the semantics are covered by `cargo test`
//! independently of the renderer.
//!
//! Fixtures are immutable after load: the icon-visibility panel is a *filter*
//! over the map field (I2), never a mutation of `fixtures/map-icons.json`, and
//! ability installation lives in the vehicle loadout slots (I8/I9), never in
//! `fixtures/abilities.json`'s non-authoritative `installed` field.

use crate::seam::adapter::Fixtures;
use crate::seam::types::{Ability, Faction, MapIcon, Swatch, contrast_ratio, relative_luminance};

/// The four pause-menu tabs, in spec order (I1).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Tab {
    Map,
    Progress,
    Abilities,
    Settings,
}

impl Tab {
    pub const ALL: [Tab; 4] = [Tab::Map, Tab::Progress, Tab::Abilities, Tab::Settings];

    pub fn label(self) -> &'static str {
        match self {
            Tab::Map => "MAP",
            Tab::Progress => "PROGRESS",
            Tab::Abilities => "ABILITIES",
            Tab::Settings => "SETTINGS",
        }
    }

    /// Stable lowercase name used by `--tab` and the capture evidence filenames.
    pub fn key(self) -> &'static str {
        match self {
            Tab::Map => "map",
            Tab::Progress => "progress",
            Tab::Abilities => "abilities",
            Tab::Settings => "settings",
        }
    }

    pub fn from_key(key: &str) -> Option<Self> {
        Self::ALL
            .into_iter()
            .find(|tab| tab.key().eq_ignore_ascii_case(key.trim()))
    }

    pub fn index(self) -> usize {
        match self {
            Tab::Map => 0,
            Tab::Progress => 1,
            Tab::Abilities => 2,
            Tab::Settings => 3,
        }
    }
}

/// One General-settings toggle row (I11).
#[derive(Debug, Clone, PartialEq)]
pub struct ToggleState {
    pub id: String,
    pub label: String,
    pub description: String,
    pub value: bool,
}

/// One stepped slider row. Used for the Controller section (I12) and the
/// Audio section (I14); the GPUI target admits no Slider component, so the
/// view hand-authors the track while this type owns the value semantics.
#[derive(Debug, Clone, PartialEq)]
pub struct SliderState {
    pub id: String,
    pub label: String,
    pub description: String,
    pub min: f32,
    pub max: f32,
    pub step: f32,
    pub value: f32,
    pub unit: String,
}

impl SliderState {
    fn from_controller(setting: &crate::seam::types::ControllerSetting) -> Self {
        Self {
            id: setting.id.clone(),
            label: setting.label.clone(),
            description: setting.description.clone(),
            min: setting.min,
            max: setting.max,
            step: setting.step,
            value: setting.value,
            unit: setting.unit.clone(),
        }
    }

    fn from_audio(slider: &crate::seam::types::AudioSlider) -> Self {
        Self {
            id: slider.id.clone(),
            label: slider.label.clone(),
            description: String::new(),
            min: 0.0,
            max: 100.0,
            step: 5.0,
            value: slider.value,
            unit: slider.unit.clone(),
        }
    }

    /// Clamp into `min..=max`, then snap to the nearest step from `min`.
    pub fn quantize(&self, requested: f32) -> f32 {
        let clamped = requested.clamp(self.min, self.max);
        let steps = ((clamped - self.min) / self.step).round();
        (self.min + steps * self.step).clamp(self.min, self.max)
    }

    pub fn set(&mut self, requested: f32) -> f32 {
        if requested.is_finite() {
            self.value = self.quantize(requested);
        }
        self.value
    }

    /// Move by whole steps (keyboard-style adjustment), clamped at both ends.
    pub fn advance(&mut self, steps: i32) -> f32 {
        let target = self.value + steps as f32 * self.step;
        self.set(target)
    }

    /// Current position as 0..=1 for the hand-authored track fill.
    pub fn fraction(&self) -> f32 {
        if self.max <= self.min {
            return 0.0;
        }
        ((self.value - self.min) / (self.max - self.min)).clamp(0.0, 1.0)
    }

    pub fn value_label(&self) -> String {
        format!("{}{}", self.value.round() as i64, self.unit)
    }
}

/// One controller-remap row (I13).
#[derive(Debug, Clone, PartialEq)]
pub struct RemapRow {
    pub id: String,
    pub label: String,
    pub binding: String,
}

/// One vehicle loadout slot; installation authority for abilities (I8/I9).
#[derive(Debug, Clone, PartialEq)]
pub struct SlotState {
    pub id: String,
    pub label: String,
    pub size: u32,
    pub ability_id: Option<String>,
}

/// Why an installation attempt was rejected (I9).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RejectReason {
    /// The pending ability is larger than the activated slot.
    TooLarge,
}

/// The visible reject state: which slot rejected which ability, and why.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SlotReject {
    pub slot_id: String,
    pub ability_id: String,
    pub reason: RejectReason,
}

/// Result of activating a loadout slot (I8/I9).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SlotOutcome {
    Installed {
        slot_id: String,
        ability_id: String,
    },
    Rejected {
        slot_id: String,
        ability_id: String,
        reason: RejectReason,
    },
    /// No ability card is selected; activation is a no-op.
    NoPending,
    UnknownSlot,
}

/// Result of the remap modal consuming the next key (I13/I15).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CaptureOutcome {
    Bound { action_id: String, label: String },
    /// Escape/cancel dismissed the modal without changing the binding.
    Cancelled,
    /// The modal is not waiting for input.
    NotWaiting,
    /// The keystroke has no printable binding representation; still waiting.
    Ignored,
}

/// Which language dropdown, if any, is open.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DropdownKind {
    AudioLanguage,
    SubtitleLanguage,
}

impl DropdownKind {
    pub fn label(self) -> &'static str {
        match self {
            DropdownKind::AudioLanguage => "AUDIO LANGUAGE",
            DropdownKind::SubtitleLanguage => "SUBTITLE LANGUAGE",
        }
    }
}

/// What a single Escape/cancel press dismissed (I15).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dismissed {
    RemapModal,
    FactionDrawer,
    MarkerPopover,
    LanguageDropdown,
    Nothing,
}

/// The complete pause-menu domain state. The view holds one of these and
/// responds to it; it never edits fixture data.
#[derive(Debug, Clone, PartialEq)]
pub struct AppState {
    fixtures: Fixtures,
    active_tab: Tab,
    icon_visible: Vec<bool>,
    nav_target: Option<String>,
    marker_popover: Option<String>,
    drawer_faction: Option<String>,
    pending_ability: Option<String>,
    reject: Option<SlotReject>,
    slots: Vec<SlotState>,
    general: Vec<ToggleState>,
    controller: Vec<SliderState>,
    remap: Vec<RemapRow>,
    remap_wait: Option<String>,
    audio_sliders: Vec<SliderState>,
    audio_language: String,
    subtitle_language: String,
    subtitle_background: String,
    open_dropdown: Option<DropdownKind>,
}

impl AppState {
    /// Build the initial state from the validated fixture snapshot.
    pub fn new(fixtures: Fixtures) -> Self {
        let icon_visible = fixtures.icons().iter().map(|icon| icon.visible).collect();
        let general = fixtures
            .settings
            .general
            .iter()
            .map(|toggle| ToggleState {
                id: toggle.id.clone(),
                label: toggle.label.clone(),
                description: toggle.description.clone(),
                value: toggle.value,
            })
            .collect();
        let controller = fixtures
            .settings
            .controller
            .iter()
            .map(SliderState::from_controller)
            .collect();
        let remap = fixtures
            .settings
            .remap
            .iter()
            .map(|action| RemapRow {
                id: action.id.clone(),
                label: action.label.clone(),
                binding: action.binding.clone(),
            })
            .collect();
        let audio_sliders = fixtures
            .settings
            .audio
            .sliders
            .iter()
            .map(SliderState::from_audio)
            .collect();
        let slots = fixtures
            .vehicle
            .slots
            .iter()
            .map(|slot| SlotState {
                id: slot.id.clone(),
                label: slot.label.clone(),
                size: slot.size,
                ability_id: slot.ability_id.clone(),
            })
            .collect();
        let nav_target = fixtures.commander.nav_target.clone();
        Self {
            icon_visible,
            nav_target,
            marker_popover: None,
            drawer_faction: None,
            pending_ability: None,
            reject: None,
            slots,
            general,
            controller,
            remap,
            remap_wait: None,
            audio_sliders,
            audio_language: fixtures.settings.audio.audio_language.value.clone(),
            subtitle_language: fixtures.settings.audio.subtitle_language.value.clone(),
            subtitle_background: fixtures.settings.audio.subtitle_background.value.clone(),
            open_dropdown: None,
            active_tab: Tab::Map,
            fixtures,
        }
    }

    pub fn fixtures(&self) -> &Fixtures {
        &self.fixtures
    }

    // -- Tabs (I1) ------------------------------------------------------

    pub fn active_tab(&self) -> Tab {
        self.active_tab
    }

    /// Select a tab. Exactly one tab is active by construction; overlays that
    /// belong to the previous tab close so a popover/drawer cannot survive a
    /// tab swap. Selection, loadout and settings state are preserved.
    pub fn select_tab(&mut self, tab: Tab) {
        self.active_tab = tab;
        self.marker_popover = None;
        self.drawer_faction = None;
        self.open_dropdown = None;
    }

    // -- Map tab (I2–I4) -----------------------------------------------

    pub fn icon_visible(&self, icon_id: &str) -> bool {
        self.icon_index(icon_id)
            .map(|index| self.icon_visible[index])
            .unwrap_or(false)
    }

    fn icon_index(&self, icon_id: &str) -> Option<usize> {
        self.fixtures
            .icons()
            .iter()
            .position(|icon| icon.id == icon_id)
    }

    /// Icons currently plotted on the map field, in fixture order.
    pub fn visible_icons(&self) -> Vec<&MapIcon> {
        self.fixtures
            .icons()
            .iter()
            .zip(self.icon_visible.iter())
            .filter(|(_, visible)| **visible)
            .map(|(icon, _)| icon)
            .collect()
    }

    pub fn hidden_icon_count(&self) -> usize {
        self.icon_visible.iter().filter(|visible| !**visible).count()
    }

    /// Toggle exactly one icon's marker visibility (I2). Returns the new
    /// visibility, or `None` for an unknown icon id. Other icons are untouched
    /// and the fixture itself is never mutated.
    pub fn toggle_icon(&mut self, icon_id: &str) -> Option<bool> {
        let index = self.icon_index(icon_id)?;
        self.icon_visible[index] = !self.icon_visible[index];
        let visible = self.icon_visible[index];
        if !visible && self.marker_popover.as_deref() == Some(icon_id) {
            self.marker_popover = None;
        }
        Some(visible)
    }

    /// Open the marker popover (I3). Hidden markers cannot be activated.
    pub fn open_marker(&mut self, icon_id: &str) -> bool {
        if !self.icon_visible(icon_id) {
            return false;
        }
        self.marker_popover = Some(icon_id.to_string());
        self.open_dropdown = None;
        true
    }

    pub fn close_marker(&mut self) {
        self.marker_popover = None;
    }

    pub fn marker_popover(&self) -> Option<&MapIcon> {
        let id = self.marker_popover.as_deref()?;
        self.fixtures.icons().iter().find(|icon| icon.id == id)
    }

    /// Set the single nav target and close the popover (I4).
    pub fn set_nav_target(&mut self, icon_id: &str) -> bool {
        if !self.icon_visible(icon_id) {
            return false;
        }
        self.nav_target = Some(icon_id.to_string());
        self.marker_popover = None;
        true
    }

    pub fn nav_target(&self) -> Option<&str> {
        self.nav_target.as_deref()
    }

    pub fn nav_target_icon(&self) -> Option<&MapIcon> {
        let id = self.nav_target.as_deref()?;
        self.fixtures.icons().iter().find(|icon| icon.id == id)
    }

    pub fn nav_target_label(&self) -> Option<&str> {
        self.nav_target_icon().map(|icon| icon.label.as_str())
    }

    pub fn is_nav_target(&self, icon_id: &str) -> bool {
        self.nav_target.as_deref() == Some(icon_id)
    }

    // -- Progress tab (I5/I6/I15) --------------------------------------

    pub fn faction(&self, faction_id: &str) -> Option<&Faction> {
        self.fixtures
            .factions
            .iter()
            .find(|faction| faction.id == faction_id)
    }

    pub fn faction_drawer(&self) -> Option<&Faction> {
        let id = self.drawer_faction.as_deref()?;
        self.faction(id)
    }

    pub fn open_faction(&mut self, faction_id: &str) -> bool {
        if self.faction(faction_id).is_none() {
            return false;
        }
        self.drawer_faction = Some(faction_id.to_string());
        self.open_dropdown = None;
        true
    }

    pub fn close_faction(&mut self) {
        self.drawer_faction = None;
    }

    /// SHOP PARTS is enabled only while an unlocked faction's drawer is open.
    /// A locked faction's drawer opens (I6) but its primary action is disabled.
    pub fn shop_parts_enabled(&self) -> bool {
        self.faction_drawer()
            .map(|faction| faction.unlocked)
            .unwrap_or(false)
    }

    // -- Abilities tab (I7–I10) ----------------------------------------

    pub fn ability(&self, ability_id: &str) -> Option<&Ability> {
        self.fixtures
            .ability_catalog()
            .iter()
            .find(|ability| ability.id == ability_id)
    }

    pub fn pending_ability(&self) -> Option<&Ability> {
        let id = self.pending_ability.as_deref()?;
        self.ability(id)
    }

    pub fn pending_ability_id(&self) -> Option<&str> {
        self.pending_ability.as_deref()
    }

    /// Select an ability card (I7): marks it pending, clears any previous
    /// reject state, and (through `slot_fit`) highlights compatible slots.
    pub fn select_ability(&mut self, ability_id: &str) -> bool {
        if self.ability(ability_id).is_none() {
            return false;
        }
        self.pending_ability = Some(ability_id.to_string());
        self.reject = None;
        true
    }

    /// `true` when the slot can hold the pending ability.
    pub fn slot_fit(&self, slot_id: &str) -> Option<bool> {
        let slot = self.slots().iter().find(|slot| slot.id == slot_id)?;
        let ability = self.pending_ability()?;
        Some(slot.size >= ability.size)
    }

    /// Slot ids currently highlighted as install targets, in vehicle order.
    pub fn compatible_slot_ids(&self) -> Vec<&str> {
        let Some(ability) = self.pending_ability() else {
            return Vec::new();
        };
        self.slots()
            .iter()
            .filter(|slot| slot.size >= ability.size)
            .map(|slot| slot.id.as_str())
            .collect()
    }

    pub fn slots(&self) -> &[SlotState] {
        &self.slots
    }

    pub fn reject(&self) -> Option<&SlotReject> {
        self.reject.as_ref()
    }

    pub fn ability_installed(&self, ability_id: &str) -> bool {
        self.slots()
            .iter()
            .any(|slot| slot.ability_id.as_deref() == Some(ability_id))
    }

    /// Activate a loadout slot (I8/I9). A compatible slot installs the pending
    /// ability, replacing the slot occupant and removing that ability from any
    /// other slot (one ability lives in at most one slot). An incompatible
    /// slot leaves the loadout unchanged and records a visible reject state.
    pub fn activate_slot(&mut self, slot_id: &str) -> SlotOutcome {
        let Some(slot_index) = self.slots().iter().position(|slot| slot.id == slot_id) else {
            return SlotOutcome::UnknownSlot;
        };
        let Some(ability) = self.pending_ability().cloned() else {
            return SlotOutcome::NoPending;
        };
        let slot_size = self.slots[slot_index].size;
        if slot_size < ability.size {
            self.reject = Some(SlotReject {
                slot_id: slot_id.to_string(),
                ability_id: ability.id.clone(),
                reason: RejectReason::TooLarge,
            });
            return SlotOutcome::Rejected {
                slot_id: slot_id.to_string(),
                ability_id: ability.id,
                reason: RejectReason::TooLarge,
            };
        }
        self.reject = None;
        for slot in &mut self.slots {
            if slot.ability_id.as_deref() == Some(ability.id.as_str()) {
                slot.ability_id = None;
            }
        }
        self.slots[slot_index].ability_id = Some(ability.id.clone());
        SlotOutcome::Installed {
            slot_id: slot_id.to_string(),
            ability_id: ability.id,
        }
    }

    /// Remove the installed ability from a slot (spec: "Installed abilities can
    /// be removed from their slot"). Returns the removed ability id.
    pub fn remove_from_slot(&mut self, slot_id: &str) -> Option<String> {
        let slot = self
            .slots
            .iter_mut()
            .find(|slot| slot.id == slot_id)?;
        self.reject = None;
        slot.ability_id.take()
    }

    pub fn installed_slot_id(&self, ability_id: &str) -> Option<&str> {
        self.slots()
            .iter()
            .find(|slot| slot.ability_id.as_deref() == Some(ability_id))
            .map(|slot| slot.id.as_str())
    }

    // -- Settings: General (I11) ---------------------------------------

    pub fn general(&self) -> &[ToggleState] {
        &self.general
    }

    /// Flip exactly one General toggle (I11). Returns the row's new value.
    pub fn toggle_general(&mut self, id: &str) -> Option<bool> {
        let row = self.general.iter_mut().find(|row| row.id == id)?;
        row.value = !row.value;
        Some(row.value)
    }

    // -- Settings: Controller sliders (I12) ----------------------------

    pub fn controller(&self) -> &[SliderState] {
        &self.controller
    }

    pub fn adjust_controller(&mut self, id: &str, steps: i32) -> Option<f32> {
        self.controller
            .iter_mut()
            .find(|row| row.id == id)
            .map(|row| row.advance(steps))
    }

    pub fn set_controller(&mut self, id: &str, value: f32) -> Option<f32> {
        self.controller
            .iter_mut()
            .find(|row| row.id == id)
            .map(|row| row.set(value))
    }

    // -- Settings: Remap modal (I13/I15) -------------------------------

    pub fn remap(&self) -> &[RemapRow] {
        &self.remap
    }

    pub fn remap_waiting(&self) -> Option<&str> {
        self.remap_wait.as_deref()
    }

    /// Open the input-waiting modal for one action. Only one remap modal can be
    /// open at a time; opening one while another waits is refused.
    pub fn begin_remap(&mut self, action_id: &str) -> bool {
        if self.remap_wait.is_some() {
            return false;
        }
        if !self.remap.iter().any(|row| row.id == action_id) {
            return false;
        }
        self.remap_wait = Some(action_id.to_string());
        true
    }

    /// Dismiss the waiting modal without changing the binding (I15).
    pub fn cancel_remap(&mut self) -> bool {
        self.remap_wait.take().is_some()
    }

    /// Consume the next key press while the modal waits (I13): Escape cancels
    /// without changing the binding; any other representable key binds and
    /// closes the modal.
    pub fn capture_binding(&mut self, key: &str) -> CaptureOutcome {
        let Some(action_id) = self.remap_wait.clone() else {
            return CaptureOutcome::NotWaiting;
        };
        if key.trim().eq_ignore_ascii_case("escape") {
            self.remap_wait = None;
            return CaptureOutcome::Cancelled;
        }
        let Some(label) = normalize_binding(key) else {
            return CaptureOutcome::Ignored;
        };
        if let Some(row) = self.remap.iter_mut().find(|row| row.id == action_id) {
            row.binding = label.clone();
        }
        self.remap_wait = None;
        CaptureOutcome::Bound { action_id, label }
    }

    // -- Settings: Audio & subtitles (I14) -----------------------------

    pub fn audio_sliders(&self) -> &[SliderState] {
        &self.audio_sliders
    }

    pub fn adjust_audio(&mut self, id: &str, steps: i32) -> Option<f32> {
        self.audio_sliders
            .iter_mut()
            .find(|row| row.id == id)
            .map(|row| row.advance(steps))
    }

    pub fn set_audio(&mut self, id: &str, value: f32) -> Option<f32> {
        self.audio_sliders
            .iter_mut()
            .find(|row| row.id == id)
            .map(|row| row.set(value))
    }

    pub fn audio_language(&self) -> &str {
        &self.audio_language
    }

    pub fn subtitle_language(&self) -> &str {
        &self.subtitle_language
    }

    pub fn set_audio_language(&mut self, value: &str) -> bool {
        if !self
            .fixtures
            .settings
            .audio
            .audio_language
            .options
            .iter()
            .any(|option| option == value)
        {
            return false;
        }
        self.audio_language = value.to_string();
        self.open_dropdown = None;
        true
    }

    pub fn set_subtitle_language(&mut self, value: &str) -> bool {
        if !self
            .fixtures
            .settings
            .audio
            .subtitle_language
            .options
            .iter()
            .any(|option| option == value)
        {
            return false;
        }
        self.subtitle_language = value.to_string();
        self.open_dropdown = None;
        true
    }

    /// Swatches available for the subtitle background picker.
    pub fn subtitle_background_options(&self) -> &[Swatch] {
        &self.fixtures.settings.audio.subtitle_background.options
    }

    pub fn subtitle_background(&self) -> &Swatch {
        let options = self.subtitle_background_options();
        options
            .iter()
            .find(|swatch| swatch.id == self.subtitle_background)
            .unwrap_or_else(|| {
                options
                    .first()
                    .expect("validated fixtures declare at least one subtitle swatch")
            })
    }

    pub fn set_subtitle_background(&mut self, swatch_id: &str) -> bool {
        if !self
            .subtitle_background_options()
            .iter()
            .any(|swatch| swatch.id == swatch_id)
        {
            return false;
        }
        self.subtitle_background = swatch_id.to_string();
        true
    }

    pub fn subtitle_preview_line(&self) -> &str {
        &self.fixtures.settings.audio.preview_line
    }

    /// Text color for the live subtitle preview strip: the Orion palette's ink
    /// or bone-bright whichever has the higher WCAG contrast against the
    /// selected swatch. Both choices clear AA for every declared swatch.
    pub fn subtitle_preview_text_color(&self) -> &str {
        let palette = &self.fixtures.appearance.palette;
        contrast_ratio(&palette.ink, &self.subtitle_background().value)
            .zip(contrast_ratio(
                &palette.bone_bright,
                &self.subtitle_background().value,
            ))
            .map(|(ink, bone)| {
                if ink >= bone {
                    palette.ink.as_str()
                } else {
                    palette.bone_bright.as_str()
                }
            })
            .unwrap_or(&palette.bone_bright)
    }

    // -- Language dropdowns (I14/I15) ----------------------------------

    pub fn dropdown(&self) -> Option<DropdownKind> {
        self.open_dropdown
    }

    pub fn language_options(&self, kind: DropdownKind) -> &[String] {
        match kind {
            DropdownKind::AudioLanguage => &self.fixtures.settings.audio.audio_language.options,
            DropdownKind::SubtitleLanguage => {
                &self.fixtures.settings.audio.subtitle_language.options
            }
        }
    }

    pub fn open_dropdown(&mut self, kind: DropdownKind) {
        self.open_dropdown = Some(kind);
    }

    pub fn close_dropdown(&mut self) {
        self.open_dropdown = None;
    }

    pub fn toggle_dropdown(&mut self, kind: DropdownKind) {
        self.open_dropdown = if self.open_dropdown == Some(kind) {
            None
        } else {
            Some(kind)
        };
    }

    // -- Overlay dismissal (I15) ---------------------------------------

    pub fn has_overlay(&self) -> bool {
        self.remap_wait.is_some()
            || self.drawer_faction.is_some()
            || self.marker_popover.is_some()
            || self.open_dropdown.is_some()
    }

    /// Escape/cancel closes exactly one overlay, topmost first, without
    /// touching domain data other than the open/closed flags.
    pub fn dismiss_top_overlay(&mut self) -> Dismissed {
        if self.cancel_remap() {
            return Dismissed::RemapModal;
        }
        if self.drawer_faction.is_some() {
            self.close_faction();
            return Dismissed::FactionDrawer;
        }
        if self.marker_popover.is_some() {
            self.close_marker();
            return Dismissed::MarkerPopover;
        }
        if self.open_dropdown.is_some() {
            self.close_dropdown();
            return Dismissed::LanguageDropdown;
        }
        Dismissed::Nothing
    }
}

/// Normalize a platform keystroke name to the fixture's binding vocabulary.
///
/// Returns `None` for Escape (modal cancel) and for names that have no
/// single-key console binding. The GPUI view passes `Keystroke::key`.
pub fn normalize_binding(key: &str) -> Option<String> {
    let normalized = key.trim().to_lowercase();
    let label = match normalized.as_str() {
        "" | "escape" => return None,
        " " | "space" | "spacebar" => "SPACE".to_string(),
        "enter" | "return" => "ENTER".to_string(),
        "tab" => "TAB".to_string(),
        "backspace" => "BACKSPACE".to_string(),
        "delete" | "del" => "DELETE".to_string(),
        "insert" => "INSERT".to_string(),
        "home" => "HOME".to_string(),
        "end" => "END".to_string(),
        "pageup" | "page_up" => "PAGE UP".to_string(),
        "pagedown" | "page_down" => "PAGE DOWN".to_string(),
        "up" | "arrowup" => "UP".to_string(),
        "down" | "arrowdown" => "DOWN".to_string(),
        "left" | "arrowleft" => "LEFT".to_string(),
        "right" | "arrowright" => "RIGHT".to_string(),
        "shift" => "SHIFT".to_string(),
        "control" | "ctrl" => "CTRL".to_string(),
        "alt" | "option" => "ALT".to_string(),
        "cmd" | "command" | "meta" | "platform" | "super" => "CMD".to_string(),
        other => {
            if other.chars().count() == 1 {
                other.to_uppercase()
            } else if other.chars().all(|character| character.is_ascii_alphanumeric()) {
                other.to_uppercase()
            } else {
                return None;
            }
        }
    };
    Some(label)
}

/// Group an integer with thousands separators for the commander readouts.
pub fn format_grouped(value: u64) -> String {
    let digits = value.to_string();
    let mut grouped = String::with_capacity(digits.len() + digits.len() / 3);
    for (index, character) in digits.chars().enumerate() {
        if index > 0 && (digits.len() - index) % 3 == 0 {
            grouped.push(',');
        }
        grouped.push(character);
    }
    grouped
}

/// Relative luminance re-export for the view's contrast decisions.
pub fn luminance(hex: &str) -> Option<f64> {
    relative_luminance(hex)
}
