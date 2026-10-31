//! Fixture adapter: the single reader of the raw fixture shape.
//!
//! Boundary (mirrors `examples/operations-dashboard/gpui/src/seam/`): UI code
//! consumes the validated [`Fixtures`] snapshot and
//! [`crate::seam::state::AppState`] only. The fixture files are embedded with
//! `include_str!` and parsed once at startup.
//!
//! A malformed fixture is an **authoring error** by contract
//! (`examples/game-pause-menu/spec.md` → "Data and API layer"): [`load_fixtures`]
//! panics loudly with a `GPUI_LANE_FIXTURE_INVALID` message, and
//! [`try_load_fixtures`] returns the same failure as a typed error so the
//! parse tests can exercise both paths. Fixture shape is NOT a domain error
//! channel: nothing in the app recreates a fixture at runtime.

use std::collections::BTreeSet;
use std::fmt;

use serde::Deserialize;

use super::types::{
    Abilities, Appearance, Commander, ControllerSetting, Faction, Factions, LanguageSetting,
    MapIcon, MapIcons, Settings, SubtitleBackground, Vehicle, hex_rgb,
};

/// Rarities the shared fixture vocabulary declares, ordered common → legendary.
/// Unknown values are authoring errors rather than silently-neutral tags.
pub const RARITIES: [&str; 5] = ["common", "uncommon", "rare", "epic", "legendary"];

pub const COMMANDER_JSON: &str = include_str!("../../fixtures/commander.json");
pub const MAP_ICONS_JSON: &str = include_str!("../../fixtures/map-icons.json");
pub const FACTIONS_JSON: &str = include_str!("../../fixtures/factions.json");
pub const ABILITIES_JSON: &str = include_str!("../../fixtures/abilities.json");
pub const VEHICLE_JSON: &str = include_str!("../../fixtures/vehicle.json");
pub const SETTINGS_JSON: &str = include_str!("../../fixtures/settings.json");
pub const ORION_APPEARANCE_JSON: &str = include_str!("../../fixtures/orion-appearance.json");

/// Validated, immutable fixture snapshot. Read once at startup; domain state
/// transitions never mutate this snapshot.
#[derive(Debug, Clone, PartialEq)]
pub struct Fixtures {
    pub commander: Commander,
    pub map_icons: MapIcons,
    pub factions: Vec<Faction>,
    pub abilities: Abilities,
    pub vehicle: Vehicle,
    pub settings: Settings,
    pub appearance: Appearance,
}

impl Fixtures {
    pub fn icons(&self) -> &[MapIcon] {
        &self.map_icons.icons
    }

    pub fn ability_catalog(&self) -> &[super::types::Ability] {
        &self.abilities.abilities
    }
}

/// A fixture that does not satisfy the shared authoring contract.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FixtureError {
    pub file: &'static str,
    pub message: String,
}

impl fmt::Display for FixtureError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.file, self.message)
    }
}

impl std::error::Error for FixtureError {}

fn invalid(file: &'static str, message: impl Into<String>) -> FixtureError {
    FixtureError {
        file,
        message: message.into(),
    }
}

fn parse_json<T: for<'de> Deserialize<'de>>(
    file: &'static str,
    source: &str,
) -> Result<T, FixtureError> {
    serde_json::from_str(source).map_err(|error| invalid(file, format!("malformed JSON: {error}")))
}

/// Load the embedded fixtures, panicking on malformed authoring data.
///
/// Panics are intentional: a bad fixture cannot be recovered from at runtime,
/// and a silent fallback would hide an authoring error from the lane's tests.
pub fn load_fixtures() -> Fixtures {
    expect_fixtures(try_load_fixtures())
}

/// Panic-on-error boundary for an already-parsed corpus. Exposed so the parse
/// tests can exercise the same loud authoring-error path with a broken corpus.
pub fn expect_fixtures(result: Result<Fixtures, FixtureError>) -> Fixtures {
    match result {
        Ok(fixtures) => fixtures,
        Err(error) => panic!("GPUI_LANE_FIXTURE_INVALID: {error}"),
    }
}

/// Load the embedded fixtures, surfacing a typed authoring error.
pub fn try_load_fixtures() -> Result<Fixtures, FixtureError> {
    parse_fixtures(
        COMMANDER_JSON,
        MAP_ICONS_JSON,
        FACTIONS_JSON,
        ABILITIES_JSON,
        VEHICLE_JSON,
        SETTINGS_JSON,
        ORION_APPEARANCE_JSON,
    )
}

/// Parse and validate a complete fixture corpus from source strings.
///
/// Kept public so the lane tests can feed malformed corpus variants without
/// touching the committed fixture files.
#[allow(clippy::too_many_arguments)]
pub fn parse_fixtures(
    commander_json: &str,
    map_icons_json: &str,
    factions_json: &str,
    abilities_json: &str,
    vehicle_json: &str,
    settings_json: &str,
    appearance_json: &str,
) -> Result<Fixtures, FixtureError> {
    let fixtures = Fixtures {
        commander: parse_json("commander.json", commander_json)?,
        map_icons: parse_json("map-icons.json", map_icons_json)?,
        factions: parse_json::<Factions>("factions.json", factions_json)?.factions,
        abilities: parse_json("abilities.json", abilities_json)?,
        vehicle: parse_json("vehicle.json", vehicle_json)?,
        settings: parse_json("settings.json", settings_json)?,
        appearance: parse_json("orion-appearance.json", appearance_json)?,
    };
    validate(&fixtures)?;
    Ok(fixtures)
}

/// Validate the cross-file authoring invariants the app relies on.
fn validate(fixtures: &Fixtures) -> Result<(), FixtureError> {
    validate_commander(fixtures)?;
    validate_map_icons(fixtures)?;
    validate_factions(fixtures)?;
    validate_abilities(fixtures)?;
    validate_vehicle(fixtures)?;
    validate_settings(&fixtures.settings)?;
    validate_appearance(&fixtures.appearance)?;
    Ok(())
}

fn validate_commander(fixtures: &Fixtures) -> Result<(), FixtureError> {
    let commander = &fixtures.commander;
    if commander.id.trim().is_empty() || commander.callsign.trim().is_empty() {
        return Err(invalid("commander.json", "identity fields must not be empty"));
    }
    if let Some(target) = &commander.nav_target
        && !fixtures.icons().iter().any(|icon| &icon.id == target)
    {
        return Err(invalid(
            "commander.json",
            format!("navTarget '{target}' does not name a map icon"),
        ));
    }
    if commander.rank.next_level_at <= commander.rank.points {
        return Err(invalid(
            "commander.json",
            "rank.nextLevelAt must exceed rank.points",
        ));
    }
    Ok(())
}

fn validate_map_icons(fixtures: &Fixtures) -> Result<(), FixtureError> {
    let mut seen = BTreeSet::new();
    for icon in fixtures.icons() {
        validate_id("map-icons.json", &icon.id, &mut seen)?;
        if !icon.x.is_finite() || !(0.0..=1.0).contains(&icon.x) {
            return Err(invalid(
                "map-icons.json",
                format!("icon '{}' x must be normalized 0..=1", icon.id),
            ));
        }
        if !icon.y.is_finite() || !(0.0..=1.0).contains(&icon.y) {
            return Err(invalid(
                "map-icons.json",
                format!("icon '{}' y must be normalized 0..=1", icon.id),
            ));
        }
        if !icon.distance_km.is_finite() || icon.distance_km < 0.0 {
            return Err(invalid(
                "map-icons.json",
                format!("icon '{}' distanceKm must be finite and >= 0", icon.id),
            ));
        }
        if icon.kind.trim().is_empty() || icon.label.trim().is_empty() {
            return Err(invalid(
                "map-icons.json",
                format!("icon '{}' needs a kind and label", icon.id),
            ));
        }
    }
    Ok(())
}

fn validate_factions(fixtures: &Fixtures) -> Result<(), FixtureError> {
    let mut seen = BTreeSet::new();
    for faction in &fixtures.factions {
        validate_id("factions.json", &faction.id, &mut seen)?;
        if faction.reputation > faction.reputation_max {
            return Err(invalid(
                "factions.json",
                format!(
                    "faction '{}' reputation {} exceeds reputationMax {}",
                    faction.id, faction.reputation, faction.reputation_max
                ),
            ));
        }
        if faction.unlocked && !faction.requirement.trim().is_empty() {
            return Err(invalid(
                "factions.json",
                format!(
                    "faction '{}' is unlocked but still declares a requirement",
                    faction.id
                ),
            ));
        }
        if !faction.unlocked && faction.requirement.trim().is_empty() {
            return Err(invalid(
                "factions.json",
                format!("locked faction '{}' must state a requirement", faction.id),
            ));
        }
        for part in &faction.detail.parts {
            if !RARITIES.contains(&part.rarity.as_str()) {
                return Err(invalid(
                    "factions.json",
                    format!(
                        "part '{}' in faction '{}' has unknown rarity '{}'",
                        part.name, faction.id, part.rarity
                    ),
                ));
            }
            if !(1..=2).contains(&part.size) {
                return Err(invalid(
                    "factions.json",
                    format!(
                        "part '{}' in faction '{}' size must be 1..=2",
                        part.name, faction.id
                    ),
                ));
            }
        }
    }
    Ok(())
}

fn validate_abilities(fixtures: &Fixtures) -> Result<(), FixtureError> {
    let catalog = fixtures.ability_catalog();
    if catalog.is_empty() {
        return Err(invalid("abilities.json", "the ability catalog is empty"));
    }
    let mut seen = BTreeSet::new();
    for ability in catalog {
        validate_id("abilities.json", &ability.id, &mut seen)?;
        if !RARITIES.contains(&ability.rarity.as_str()) {
            return Err(invalid(
                "abilities.json",
                format!(
                    "ability '{}' has unknown rarity '{}'",
                    ability.id, ability.rarity
                ),
            ));
        }
        if !(1..=2).contains(&ability.size) {
            return Err(invalid(
                "abilities.json",
                format!("ability '{}' size must be 1..=2", ability.id),
            ));
        }
        if ability.stats.cooldown.trim().is_empty() || ability.stats.draw.trim().is_empty() {
            return Err(invalid(
                "abilities.json",
                format!("ability '{}' needs cooldown and draw stats", ability.id),
            ));
        }
    }
    Ok(())
}

fn validate_vehicle(fixtures: &Fixtures) -> Result<(), FixtureError> {
    let vehicle = &fixtures.vehicle;
    if vehicle.slots.len() != 6 {
        return Err(invalid(
            "vehicle.json",
            format!(
                "vehicle '{}' must expose six loadout slots, found {}",
                vehicle.name,
                vehicle.slots.len()
            ),
        ));
    }
    let mut seen = BTreeSet::new();
    for slot in &vehicle.slots {
        validate_id("vehicle.json", &slot.id, &mut seen)?;
        if !(1..=2).contains(&slot.size) {
            return Err(invalid(
                "vehicle.json",
                format!("slot '{}' size must be 1..=2", slot.id),
            ));
        }
        if let Some(ability_id) = &slot.ability_id
            && !fixtures
                .ability_catalog()
                .iter()
                .any(|ability| &ability.id == ability_id)
        {
            return Err(invalid(
                "vehicle.json",
                format!(
                    "slot '{}' references unknown ability '{}'",
                    slot.id, ability_id
                ),
            ));
        }
    }
    Ok(())
}

fn validate_settings(settings: &Settings) -> Result<(), FixtureError> {
    let mut general = BTreeSet::new();
    for toggle in &settings.general {
        validate_id("settings.json", &toggle.id, &mut general)?;
        if toggle.label.trim().is_empty() || toggle.description.trim().is_empty() {
            return Err(invalid(
                "settings.json",
                format!(
                    "general toggle '{}' needs a label and description",
                    toggle.id
                ),
            ));
        }
    }
    let mut controller = BTreeSet::new();
    for slider in &settings.controller {
        validate_id("settings.json", &slider.id, &mut controller)?;
        validate_slider_range(slider)?;
    }
    let mut remap = BTreeSet::new();
    for action in &settings.remap {
        validate_id("settings.json", &action.id, &mut remap)?;
        if action.binding.trim().is_empty() {
            return Err(invalid(
                "settings.json",
                format!("remap action '{}' has an empty binding", action.id),
            ));
        }
    }
    let mut audio = BTreeSet::new();
    for slider in &settings.audio.sliders {
        validate_id("settings.json", &slider.id, &mut audio)?;
        validate_unit_slider(&slider.id, slider.value, &slider.unit)?;
    }
    validate_language("audioLanguage", &settings.audio.audio_language)?;
    validate_language("subtitleLanguage", &settings.audio.subtitle_language)?;
    validate_background(&settings.audio.subtitle_background)?;
    if settings.audio.preview_line.trim().is_empty() {
        return Err(invalid(
            "settings.json",
            "audio.previewLine must contain the subtitle preview text",
        ));
    }
    Ok(())
}

fn validate_slider_range(slider: &ControllerSetting) -> Result<(), FixtureError> {
    if !slider.min.is_finite() || !slider.max.is_finite() || slider.min > slider.max {
        return Err(invalid(
            "settings.json",
            format!("controller slider '{}' has an invalid min/max", slider.id),
        ));
    }
    if !slider.step.is_finite() || slider.step <= 0.0 {
        return Err(invalid(
            "settings.json",
            format!("controller slider '{}' step must be > 0", slider.id),
        ));
    }
    if !slider.value.is_finite() || slider.value < slider.min || slider.value > slider.max {
        return Err(invalid(
            "settings.json",
            format!(
                "controller slider '{}' value {} is outside {}..={}",
                slider.id, slider.value, slider.min, slider.max
            ),
        ));
    }
    if slider.unit.trim().is_empty() {
        return Err(invalid(
            "settings.json",
            format!("controller slider '{}' needs a unit", slider.id),
        ));
    }
    Ok(())
}

fn validate_unit_slider(id: &str, value: f32, unit: &str) -> Result<(), FixtureError> {
    if !value.is_finite() || !(0.0..=100.0).contains(&value) {
        return Err(invalid(
            "settings.json",
            format!("audio slider '{id}' value must be 0..=100"),
        ));
    }
    if unit.trim().is_empty() {
        return Err(invalid(
            "settings.json",
            format!("audio slider '{id}' needs a unit"),
        ));
    }
    Ok(())
}

fn validate_language(name: &'static str, setting: &LanguageSetting) -> Result<(), FixtureError> {
    if setting.options.is_empty() {
        return Err(invalid(
            "settings.json",
            format!("{name} must declare at least one option"),
        ));
    }
    if !setting.options.contains(&setting.value) {
        return Err(invalid(
            "settings.json",
            format!(
                "{name} value '{}' is not one of the declared options",
                setting.value
            ),
        ));
    }
    let unique: BTreeSet<&String> = setting.options.iter().collect();
    if unique.len() != setting.options.len() {
        return Err(invalid(
            "settings.json",
            format!("{name} options must be unique"),
        ));
    }
    Ok(())
}

fn validate_background(background: &SubtitleBackground) -> Result<(), FixtureError> {
    if background.options.is_empty() {
        return Err(invalid(
            "settings.json",
            "subtitleBackground must declare at least one swatch",
        ));
    }
    let ids: BTreeSet<&str> = background
        .options
        .iter()
        .map(|swatch| swatch.id.as_str())
        .collect();
    if ids.len() != background.options.len() {
        return Err(invalid(
            "settings.json",
            "subtitleBackground swatch ids must be unique",
        ));
    }
    if !ids.contains(background.value.as_str()) {
        return Err(invalid(
            "settings.json",
            format!(
                "subtitleBackground value '{}' is not a declared swatch id",
                background.value
            ),
        ));
    }
    for swatch in &background.options {
        if hex_rgb(&swatch.value).is_none() {
            return Err(invalid(
                "settings.json",
                format!(
                    "subtitleBackground swatch '{}' has malformed color '{}'",
                    swatch.id, swatch.value
                ),
            ));
        }
    }
    Ok(())
}

fn validate_appearance(appearance: &Appearance) -> Result<(), FixtureError> {
    let colors: Vec<(&'static str, &str)> = vec![
        ("palette.signal", &appearance.palette.signal),
        ("palette.signalDeep", &appearance.palette.signal_deep),
        ("palette.signalHot", &appearance.palette.signal_hot),
        ("palette.onSignal", &appearance.palette.on_signal),
        ("palette.ink", &appearance.palette.ink),
        ("palette.charcoal", &appearance.palette.charcoal),
        ("palette.graphite", &appearance.palette.graphite),
        ("palette.boneBright", &appearance.palette.bone_bright),
        ("palette.bone", &appearance.palette.bone),
        ("palette.sage", &appearance.palette.sage),
        ("palette.moss", &appearance.palette.moss),
        ("palette.alert", &appearance.palette.alert),
        ("palette.clear", &appearance.palette.clear),
        ("surface.app", &appearance.surface.app),
        ("surface.panel", &appearance.surface.panel),
        ("surface.raised", &appearance.surface.raised),
        ("surface.rule", &appearance.surface.rule),
        ("surface.ruleStrong", &appearance.surface.rule_strong),
        ("surface.muted", &appearance.surface.muted),
        ("surface.telemetry", &appearance.surface.telemetry),
    ];
    if let Some((name, value)) = colors
        .into_iter()
        .find(|(_, value)| hex_rgb(value).is_none())
    {
        return Err(invalid(
            "orion-appearance.json",
            format!("{name} is not a #RRGGBB color: '{value}'"),
        ));
    }
    if appearance.style.radius != 0.0 {
        return Err(invalid(
            "orion-appearance.json",
            "Orion N5 graphic grammar requires style.radius = 0",
        ));
    }
    Ok(())
}

fn validate_id(file: &'static str, id: &str, seen: &mut BTreeSet<String>) -> Result<(), FixtureError> {
    if id.trim().is_empty() {
        return Err(invalid(file, "ids must not be empty"));
    }
    if !seen.insert(id.to_string()) {
        return Err(invalid(file, format!("duplicate id '{id}'")));
    }
    Ok(())
}
