//! Seam behavior tests for the GPUI pause-menu lane.
//!
//! These tests exercise the domain rules only: fixture parsing/validation,
//! the data seam, and every interaction transition in `spec.md` (I1–I15).
//! The GPUI app layer is not mounted here; the lane README states that
//! boundary explicitly.

use game_pause_menu_gpui::seam::adapter::{
    self, ABILITIES_JSON, COMMANDER_JSON, FACTIONS_JSON, MAP_ICONS_JSON, ORION_APPEARANCE_JSON,
    SETTINGS_JSON, VEHICLE_JSON,
};
use game_pause_menu_gpui::seam::state::{CaptureOutcome, Dismissed, DropdownKind, SlotOutcome};
use game_pause_menu_gpui::seam::{
    AppState, FixtureError, Fixtures, Tab, contrast_ratio, format_grouped, hex_rgb,
    normalize_binding,
};

/// A mutable copy of the embedded fixture corpus, used to feed malformed
/// variants into the same parser the app uses at startup.
struct Corpus {
    commander: String,
    map_icons: String,
    factions: String,
    abilities: String,
    vehicle: String,
    settings: String,
    appearance: String,
}

impl Corpus {
    fn embedded() -> Self {
        Self {
            commander: COMMANDER_JSON.to_string(),
            map_icons: MAP_ICONS_JSON.to_string(),
            factions: FACTIONS_JSON.to_string(),
            abilities: ABILITIES_JSON.to_string(),
            vehicle: VEHICLE_JSON.to_string(),
            settings: SETTINGS_JSON.to_string(),
            appearance: ORION_APPEARANCE_JSON.to_string(),
        }
    }

    fn parse(&self) -> Result<Fixtures, FixtureError> {
        adapter::parse_fixtures(
            &self.commander,
            &self.map_icons,
            &self.factions,
            &self.abilities,
            &self.vehicle,
            &self.settings,
            &self.appearance,
        )
    }

    fn expect_valid(&self) -> Fixtures {
        self.parse().expect("the embedded corpus must validate")
    }

    fn state(&self) -> AppState {
        AppState::new(self.expect_valid())
    }
}

fn state() -> AppState {
    Corpus::embedded().state()
}

fn replace_once(source: &mut String, from: &str, to: &str) {
    assert!(
        source.contains(from),
        "test setup: expected corpus to contain {from:?}"
    );
    *source = source.replacen(from, to, 1);
}

// -- Fixture loading (authoring contract) ---------------------------------

#[test]
fn embedded_corpus_loads_with_the_shared_counts() {
    let fixtures = Corpus::embedded().expect_valid();
    assert_eq!(fixtures.icons().len(), 8, "map icon count");
    assert_eq!(
        fixtures.icons().iter().filter(|icon| icon.visible).count(),
        7,
        "fixture-declared visible icons"
    );
    assert_eq!(fixtures.factions.len(), 5, "faction count");
    assert_eq!(
        fixtures
            .factions
            .iter()
            .filter(|faction| faction.unlocked)
            .count(),
        3,
        "unlocked factions"
    );
    assert_eq!(fixtures.ability_catalog().len(), 10, "ability count");
    assert_eq!(fixtures.vehicle.slots.len(), 6, "loadout slot count");
    assert_eq!(fixtures.settings.general.len(), 5, "general toggles");
    assert_eq!(fixtures.settings.controller.len(), 5, "controller sliders");
    assert_eq!(fixtures.settings.remap.len(), 6, "remap actions");
    assert_eq!(fixtures.settings.audio.sliders.len(), 4, "audio sliders");
    assert_eq!(
        fixtures.settings.audio.subtitle_background.options.len(),
        6,
        "subtitle swatches"
    );
    assert_eq!(
        fixtures.settings.audio.audio_language.options.len(),
        6,
        "language options"
    );
    assert_eq!(fixtures.commander.nav_target, None, "fixture nav target");
    assert_eq!(fixtures.appearance.palette.signal, "#EF6A3C");
    assert_eq!(fixtures.appearance.style.radius, 0.0);
}

#[test]
fn initial_state_projects_fixture_values() {
    let state = state();
    assert_eq!(state.active_tab(), Tab::Map, "the map tab opens first");
    assert_eq!(state.visible_icons().len(), 7);
    assert_eq!(state.hidden_icon_count(), 1);
    assert!(!state.icon_visible("rover-07"));
    assert!(state.icon_visible("relay-01"));
    assert_eq!(state.nav_target(), None);
    assert_eq!(state.slots()[0].ability_id.as_deref(), Some("thermal-shield"));
    assert_eq!(state.slots()[2].ability_id.as_deref(), Some("threading"));
    assert!(state.pending_ability().is_none());
    assert!(state.remap_waiting().is_none());
    assert_eq!(state.audio_language(), "English");
    assert_eq!(state.subtitle_background().id, "charcoal");
    assert_eq!(state.general().len(), 5);
    assert_eq!(state.controller().len(), 5);
    assert_eq!(state.remap().len(), 6);
    assert_eq!(state.audio_sliders().len(), 4);
}

#[test]
fn capture_visibility_replaces_defaults_and_prior_filters() {
    let layout = game_pause_menu_gpui::seam::parity::load_parity_layout();
    let mut state = state();
    assert!(!state.icon_visible("rover-07"), "ordinary startup follows the fixture");
    for name in ["map", "map-popover", "progress", "map", "map-popover"] {
        state.toggle_icon("relay-01");
        let capture = &layout.captures[name];
        state.apply_capture_icon_visibility(&capture.hidden_icons);
        for icon in state.fixtures().icons() {
            assert_eq!(state.icon_visible(&icon.id), !capture.hidden_icons.contains(&icon.id),
                "capture {name}, icon {}", icon.id);
        }
        let count = if name == "progress" { 8 } else { 7 };
        assert_eq!(state.visible_icons().len(), count);
        assert_eq!(state.icon_visibility_text(&layout.map.icon_panel_meta), format!("{count}/8 PLOTTED"));
        assert!(state.icon_visibility_text(&layout.map.field_note.text).starts_with(&format!("MARKERS {count}/8 VISIBLE")));
    }
    state.apply_capture_icon_visibility(&[]);
    assert_eq!(state.visible_icons().len(), 8, "an empty capture filter restores every icon");
    state.toggle_icon("relay-01");
    assert_eq!(state.icon_visibility_text(&layout.map.icon_panel_meta), "7/8 PLOTTED");
    assert!(!state.fixtures().icons().iter().find(|icon| icon.id == "rover-07").unwrap().visible,
        "capture application never mutates fixture defaults");
}

#[test]
fn load_fixtures_hydrates_the_committed_corpus() {
    let fixtures = adapter::load_fixtures();
    assert_eq!(fixtures.commander.mission, "MARS EXPEDITION");
    assert_eq!(fixtures.commander.rank.label, "PATHFINDER III");
    assert_eq!(fixtures.commander.earnings.credits, 34850);
    assert_eq!(fixtures.commander.followers.total, 52400);
}

#[test]
#[should_panic(expected = "GPUI_LANE_FIXTURE_INVALID")]
fn malformed_fixture_fails_loudly_at_the_panic_boundary() {
    let mut corpus = Corpus::embedded();
    corpus.map_icons = "{ not valid json".to_string();
    adapter::expect_fixtures(corpus.parse());
}

#[test]
fn malformed_json_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    corpus.factions = "{\"factions\": [".to_string();
    let error = corpus.parse().expect_err("truncated JSON must fail");
    assert_eq!(error.file, "factions.json");
    assert!(error.to_string().contains("malformed JSON"));
}

#[test]
fn missing_required_field_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(
        &mut corpus.commander,
        "\"mission\": \"MARS EXPEDITION\",",
        "",
    );
    let error = corpus.parse().expect_err("missing mission must fail");
    assert_eq!(error.file, "commander.json");
    assert!(error.to_string().contains("mission"));
}

#[test]
fn duplicate_ids_are_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(&mut corpus.map_icons, "\"id\": \"relay-01\"", "\"id\": \"cache-02\"");
    let error = corpus.parse().expect_err("duplicate icon id must fail");
    assert!(error.to_string().contains("duplicate id 'cache-02'"));
}

#[test]
fn non_normalized_marker_position_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(&mut corpus.map_icons, "\"x\": 0.22", "\"x\": 1.22");
    let error = corpus.parse().expect_err("out-of-range x must fail");
    assert!(error.to_string().contains("normalized"));
}

#[test]
fn unknown_ability_rarity_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(&mut corpus.abilities, "\"rarity\": \"rare\"", "\"rarity\": \"mythic\"");
    let error = corpus.parse().expect_err("unknown rarity must fail");
    assert!(error.to_string().contains("unknown rarity 'mythic'"));
}

#[test]
fn dangling_vehicle_install_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(
        &mut corpus.vehicle,
        "\"abilityId\": \"thermal-shield\"",
        "\"abilityId\": \"ghost-ability\"",
    );
    let error = corpus.parse().expect_err("dangling slot ability must fail");
    assert!(error.to_string().contains("ghost-ability"));
}

#[test]
fn dangling_initial_nav_target_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(
        &mut corpus.commander,
        "\"navTarget\": null",
        "\"navTarget\": \"nowhere-99\"",
    );
    let error = corpus.parse().expect_err("dangling nav target must fail");
    assert!(error.to_string().contains("nowhere-99"));
}

#[test]
fn invalid_slider_step_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(
        &mut corpus.settings,
        "\"step\": 5, \"value\": 45",
        "\"step\": 0, \"value\": 45",
    );
    let error = corpus.parse().expect_err("zero slider step must fail");
    assert!(error.to_string().contains("step must be > 0"));
}

#[test]
fn undeclared_subtitle_background_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(
        &mut corpus.settings,
        "\"value\": \"charcoal\",",
        "\"value\": \"ultraviolet\",",
    );
    let error = corpus.parse().expect_err("undeclared swatch must fail");
    assert!(error.to_string().contains("ultraviolet"));
}

#[test]
fn non_zero_radius_is_an_authoring_error() {
    let mut corpus = Corpus::embedded();
    replace_once(&mut corpus.appearance, "\"radius\": 0", "\"radius\": 4");
    let error = corpus.parse().expect_err("non-zero Orion radius must fail");
    assert!(error.to_string().contains("style.radius = 0"));
}

// -- I1: exactly one tab, content swaps --------------------------------

#[test]
fn selecting_a_tab_makes_exactly_one_tab_active() {
    let mut state = state();
    for tab in Tab::ALL {
        state.select_tab(tab);
        assert_eq!(state.active_tab(), tab);
        assert_eq!(
            Tab::ALL
                .into_iter()
                .filter(|candidate| *candidate == state.active_tab())
                .count(),
            1,
            "exactly one tab is active"
        );
    }
}

#[test]
fn tab_keys_round_trip_and_labels_are_the_spec_labels() {
    assert_eq!(Tab::Map.label(), "MAP");
    assert_eq!(Tab::Progress.label(), "PROGRESS");
    assert_eq!(Tab::Abilities.label(), "ABILITIES");
    assert_eq!(Tab::Settings.label(), "SETTINGS");
    for tab in Tab::ALL {
        assert_eq!(Tab::from_key(tab.key()), Some(tab));
        assert_eq!(tab.index(), state_index(tab));
    }
    assert_eq!(Tab::from_key("nope"), None);
}

fn state_index(tab: Tab) -> usize {
    Tab::ALL
        .into_iter()
        .position(|candidate| candidate == tab)
        .expect("tab is in ALL")
}

#[test]
fn tab_switch_closes_tab_scoped_overlays_but_preserves_selection() {
    let mut state = state();
    state.select_ability("overclock");
    state.set_controller("lookSensitivity", 70.0);
    state.open_marker("relay-01");
    state.open_faction("ares-logistics");
    assert!(state.marker_popover().is_some());
    assert!(state.faction_drawer().is_some());
    state.select_tab(Tab::Settings);
    assert_eq!(state.active_tab(), Tab::Settings);
    assert!(state.marker_popover().is_none(), "popover is tab-scoped");
    assert!(state.faction_drawer().is_none(), "drawer is tab-scoped");
    assert_eq!(
        state.pending_ability().map(|ability| ability.id.as_str()),
        Some("overclock"),
        "ability selection is not a tab-scoped overlay"
    );
    assert_eq!(state.controller()[0].value, 70.0);
}

// -- I2: the visibility panel filters one marker at a time -------------

#[test]
fn toggling_a_marker_only_affects_that_marker() {
    let mut state = state();
    let others_before: Vec<bool> = state
        .fixtures()
        .icons()
        .iter()
        .filter(|icon| icon.id != "relay-01")
        .map(|icon| state.icon_visible(&icon.id))
        .collect();
    assert_eq!(state.toggle_icon("relay-01"), Some(false));
    let others_after: Vec<bool> = state
        .fixtures()
        .icons()
        .iter()
        .filter(|icon| icon.id != "relay-01")
        .map(|icon| state.icon_visible(&icon.id))
        .collect();
    assert_eq!(others_before, others_after, "sibling markers are unaffected");
    assert!(!state.icon_visible("relay-01"));
    assert_eq!(state.visible_icons().len(), 6);
    assert!(!state.visible_icons().iter().any(|icon| icon.id == "relay-01"));
    assert_eq!(state.toggle_icon("relay-01"), Some(true));
    assert!(state.visible_icons().iter().any(|icon| icon.id == "relay-01"));
    assert_eq!(state.visible_icons().len(), 7);
    assert_eq!(state.toggle_icon("does-not-exist"), None);
}

#[test]
fn the_visibility_filter_never_mutates_the_fixture() {
    let mut state = state();
    // Toggling every icon once inverts the fixture-declared visibility:
    // seven were visible and rover-07 was hidden.
    for icon in state.fixtures().icons().to_vec() {
        state.toggle_icon(&icon.id);
    }
    assert_eq!(state.visible_icons().len(), 1);
    assert_eq!(state.visible_icons()[0].id, "rover-07");
    assert_eq!(state.hidden_icon_count(), 7);
    assert!(
        state.fixtures().icons()[0].visible,
        "fixtures are immutable; the panel is a filter, not a mutation"
    );
    assert!(!state.fixtures().icons()[6].visible);
}

#[test]
fn disabling_a_marker_closes_its_popover_but_keeps_the_nav_target() {
    let mut state = state();
    assert!(state.set_nav_target("relay-01"));
    assert!(state.open_marker("relay-01"));
    assert_eq!(state.toggle_icon("relay-01"), Some(false));
    assert!(state.marker_popover().is_none(), "hidden marker closes popover");
    assert_eq!(
        state.nav_target(),
        Some("relay-01"),
        "the nav target is domain state, not a marker-visibility flag"
    );
}

// -- I3/I4: marker popover and exactly one nav target ------------------

#[test]
fn marker_popover_requires_a_visible_marker() {
    let mut state = state();
    assert!(!state.open_marker("rover-07"), "fixture ships it hidden");
    assert!(state.marker_popover().is_none());
    assert!(state.open_marker("relay-01"));
    assert_eq!(
        state.marker_popover().map(|icon| icon.id.as_str()),
        Some("relay-01")
    );
    state.close_marker();
    assert!(state.marker_popover().is_none());
}

#[test]
fn setting_a_nav_target_selects_one_icon_and_closes_the_popover() {
    let mut state = state();
    state.open_marker("relay-01");
    assert!(state.set_nav_target("relay-01"));
    assert_eq!(state.nav_target(), Some("relay-01"));
    assert_eq!(state.nav_target_label(), Some("RELAY TOWER 01"));
    assert!(state.marker_popover().is_none(), "I4 closes the popover");
    assert!(state.is_nav_target("relay-01"));
    assert!(!state.is_nav_target("cache-02"));

    state.open_marker("beacon-05");
    assert!(state.set_nav_target("beacon-05"));
    assert_eq!(state.nav_target(), Some("beacon-05"));
    assert!(!state.is_nav_target("relay-01"), "only one nav target");
    assert_eq!(state.nav_target_label(), Some("DISTRESS BEACON"));
}

#[test]
fn hidden_markers_cannot_become_nav_targets() {
    let mut state = state();
    assert!(!state.set_nav_target("rover-07"));
    assert_eq!(state.nav_target(), None);
}

// -- I5/I6: faction drawer, locked shop --------------------------------

#[test]
fn unlocked_faction_drawer_enables_the_shop() {
    let mut state = state();
    assert!(!state.shop_parts_enabled(), "no drawer, no shop");
    assert!(state.open_faction("ares-logistics"));
    assert!(state.shop_parts_enabled());
    let faction = state.faction_drawer().expect("drawer open");
    assert_eq!(faction.name, "ARES LOGISTICS GUILD");
    assert_eq!(faction.detail.parts.len(), 3);
    assert_eq!(faction.detail.perks.len(), 3);
    state.close_faction();
    assert!(!state.shop_parts_enabled());
}

#[test]
fn locked_faction_drawer_shows_requirement_and_disables_the_shop() {
    let mut state = state();
    assert!(state.open_faction("solaris-cartel"));
    let faction = state.faction_drawer().expect("drawer opens for locked faction");
    assert!(!faction.unlocked);
    assert_eq!(faction.requirement, "REACH PATHFINDER IV + 7,500 CR");
    assert_eq!(
        faction.detail.parts.len(),
        3,
        "parts stay visible; the action is disabled"
    );
    assert!(!state.shop_parts_enabled());
    assert!(!state.open_faction("no-such-faction"));
}

// -- I7–I9: ability selection, compatibility, install/reject ----------

#[test]
fn selecting_an_ability_highlights_only_compatible_slots() {
    let mut state = state();
    assert!(state.select_ability("overclock"), "size 2");
    assert_eq!(state.compatible_slot_ids(), vec!["CORE-A", "CORE-B", "UTIL-A"]);
    assert_eq!(state.slot_fit("AUX-A"), Some(false));
    assert_eq!(state.slot_fit("UTIL-B"), Some(false));
    assert_eq!(state.slot_fit("nope"), None);

    assert!(state.select_ability("recon-ping"), "size 1");
    assert_eq!(
        state.compatible_slot_ids(),
        vec!["CORE-A", "CORE-B", "AUX-A", "AUX-B", "UTIL-A", "UTIL-B"]
    );
    assert!(!state.select_ability("no-such-ability"));
}

#[test]
fn compatible_slot_installs_the_ability_and_updates_the_loadout() {
    let mut state = state();
    state.select_ability("overclock");
    let outcome = state.activate_slot("CORE-B");
    assert_eq!(
        outcome,
        SlotOutcome::Installed {
            slot_id: "CORE-B".into(),
            ability_id: "overclock".into(),
        }
    );
    assert_eq!(state.slots()[1].ability_id.as_deref(), Some("overclock"));
    assert!(state.ability_installed("overclock"));
    assert_eq!(state.installed_slot_id("overclock"), Some("CORE-B"));
    assert!(state.reject().is_none());

    // Installing into an occupied slot replaces the occupant.
    state.select_ability("hardlight-cut");
    assert_eq!(
        state.activate_slot("CORE-B"),
        SlotOutcome::Installed {
            slot_id: "CORE-B".into(),
            ability_id: "hardlight-cut".into(),
        }
    );
    assert_eq!(state.slots()[1].ability_id.as_deref(), Some("hardlight-cut"));
    assert!(!state.ability_installed("overclock"));
}

#[test]
fn an_ability_is_never_installed_in_two_slots() {
    let mut state = state();
    // threading starts installed in AUX-A.
    state.select_ability("threading");
    assert_eq!(state.installed_slot_id("threading"), Some("AUX-A"));
    assert_eq!(
        state.activate_slot("AUX-B"),
        SlotOutcome::Installed {
            slot_id: "AUX-B".into(),
            ability_id: "threading".into(),
        }
    );
    assert_eq!(state.slots()[2].ability_id, None, "AUX-A is vacated");
    assert_eq!(state.slots()[3].ability_id.as_deref(), Some("threading"));
    assert_eq!(state.installed_slot_id("threading"), Some("AUX-B"));
}

#[test]
fn incompatible_slot_rejects_without_mutating_the_loadout() {
    let mut state = state();
    let before = state.slots().to_vec();
    state.select_ability("overclock");
    let outcome = state.activate_slot("AUX-A");
    assert_eq!(
        outcome,
        SlotOutcome::Rejected {
            slot_id: "AUX-A".into(),
            ability_id: "overclock".into(),
            reason: game_pause_menu_gpui::seam::RejectReason::TooLarge,
        }
    );
    assert_eq!(state.slots(), before.as_slice(), "loadout is unchanged");
    let reject = state.reject().expect("reject state is visible");
    assert_eq!(reject.slot_id, "AUX-A");
    assert_eq!(reject.ability_id, "overclock");
}

#[test]
fn slot_activation_without_a_pending_ability_is_a_noop() {
    let mut state = state();
    let before = state.slots().to_vec();
    assert_eq!(state.activate_slot("CORE-B"), SlotOutcome::NoPending);
    assert_eq!(state.slots(), before.as_slice());
    assert_eq!(state.activate_slot("no-such-slot"), SlotOutcome::UnknownSlot);
}

#[test]
fn selecting_an_ability_clears_a_previous_reject_state() {
    let mut state = state();
    state.select_ability("overclock");
    let _ = state.activate_slot("AUX-A");
    assert!(state.reject().is_some());
    state.select_ability("recon-ping");
    assert!(state.reject().is_none(), "new selection clears the reject");
}

#[test]
fn installed_abilities_can_be_removed_from_their_slot() {
    let mut state = state();
    assert_eq!(state.remove_from_slot("CORE-A"), Some("thermal-shield".into()));
    assert_eq!(state.slots()[0].ability_id, None);
    assert!(!state.ability_installed("thermal-shield"));
    assert_eq!(state.remove_from_slot("CORE-A"), None);
    assert_eq!(state.remove_from_slot("no-such-slot"), None);
}

#[test]
fn ability_fixture_installed_flag_is_not_authoritative() {
    let mut state = state();
    assert!(
        !state
            .fixtures()
            .ability_catalog()
            .iter()
            .any(|ability| ability.installed),
        "the fixture's installed field is not authoritative"
    );
    state.select_ability("overclock");
    let _ = state.activate_slot("CORE-B");
    assert!(
        !state
            .fixtures()
            .ability_catalog()
            .iter()
            .find(|ability| ability.id == "overclock")
            .expect("ability present")
            .installed,
        "installation never mutates the ability fixture"
    );
}

// -- I11: general settings toggle -------------------------------------

#[test]
fn toggling_a_general_setting_flips_exactly_one_row_once() {
    let mut state = state();
    let before: Vec<bool> = state.general().iter().map(|row| row.value).collect();
    assert_eq!(before[0], true, "autoSave fixture value");
    assert_eq!(state.toggle_general("autoSave"), Some(false));
    let after: Vec<bool> = state.general().iter().map(|row| row.value).collect();
    assert_eq!(after[0], false);
    assert_eq!(after[1..], before[1..], "sibling rows are untouched");
    assert_eq!(state.toggle_general("autoSave"), Some(true));
    assert_eq!(state.toggle_general("no-such-toggle"), None);
}

// -- I12: controller sliders ------------------------------------------

#[test]
fn controller_sliders_snap_to_their_step_and_clamp_to_their_range() {
    let mut state = state();
    assert_eq!(state.controller()[0].value, 45.0);
    assert_eq!(state.controller()[0].value_label(), "45%");
    assert_eq!(state.set_controller("lookSensitivity", 52.4), Some(50.0));
    assert_eq!(state.set_controller("lookSensitivity", 300.0), Some(100.0));
    assert_eq!(state.set_controller("lookSensitivity", -50.0), Some(10.0));
    assert_eq!(state.adjust_controller("lookSensitivity", 1), Some(15.0));
    assert_eq!(
        state.controller()[0].value_label(),
        "15%",
        "the display follows the stored value"
    );
    assert_eq!(state.adjust_controller("no-such-slider", 1), None);
}

#[test]
fn slider_fraction_is_bounded() {
    let mut state = state();
    state.set_controller("deadZone", 0.0);
    assert_eq!(state.controller()[2].fraction(), 0.0);
    state.set_controller("deadZone", 40.0);
    assert_eq!(state.controller()[2].fraction(), 1.0);
}

// -- I13: remap modal waits for the next key --------------------------

#[test]
fn remap_modal_waits_then_binds_the_next_key_and_closes() {
    let mut state = state();
    assert!(state.begin_remap("vehicleBoost"));
    assert_eq!(state.remap_waiting(), Some("vehicleBoost"));
    assert!(
        !state.begin_remap("mapToggle"),
        "only one remap modal at a time"
    );
    assert_eq!(
        state.capture_binding("f"),
        CaptureOutcome::Bound {
            action_id: "vehicleBoost".into(),
            label: "F".into(),
        }
    );
    assert!(state.remap_waiting().is_none(), "modal closes after capture");
    let row = state
        .remap()
        .iter()
        .find(|row| row.id == "vehicleBoost")
        .expect("remap row");
    assert_eq!(row.binding, "F");
    assert_eq!(state.capture_binding("g"), CaptureOutcome::NotWaiting);
}

#[test]
fn escape_cancels_the_remap_modal_without_changing_the_binding() {
    let mut state = state();
    let original = state
        .remap()
        .iter()
        .find(|row| row.id == "thruster")
        .expect("remap row")
        .binding
        .clone();
    assert!(state.begin_remap("thruster"));
    assert_eq!(state.capture_binding("escape"), CaptureOutcome::Cancelled);
    assert!(state.remap_waiting().is_none());
    assert_eq!(
        state
            .remap()
            .iter()
            .find(|row| row.id == "thruster")
            .expect("remap row")
            .binding,
        original
    );
    assert!(state.begin_remap("thruster"));
    assert!(state.cancel_remap());
    assert!(!state.cancel_remap(), "cancel is idempotent");
}

#[test]
fn remap_captures_named_and_modifier_keys() {
    let mut state = state();
    for (action, key, expected) in [
        ("interact", "space", "SPACE"),
        ("mapToggle", "arrowup", "UP"),
        ("capacityScan", "shift", "SHIFT"),
        ("firePrimary", "f1", "F1"),
    ] {
        assert!(state.begin_remap(action));
        assert_eq!(
            state.capture_binding(key),
            CaptureOutcome::Bound {
                action_id: action.into(),
                label: expected.into(),
            }
        );
        assert_eq!(
            state
                .remap()
                .iter()
                .find(|row| row.id == action)
                .expect("row")
                .binding,
            expected
        );
    }
}

#[test]
fn binding_normalization_rejects_unrepresentable_keys() {
    assert_eq!(normalize_binding("a"), Some("A".into()));
    assert_eq!(normalize_binding("shift"), Some("SHIFT".into()));
    assert_eq!(normalize_binding("space"), Some("SPACE".into()));
    assert_eq!(normalize_binding("i"), Some("I".into()));
    assert_eq!(normalize_binding("escape"), None);
    assert_eq!(normalize_binding(""), None);
    assert_eq!(normalize_binding("alt+shift"), None);
}

// -- I14: audio sliders, languages, subtitle background ----------------

#[test]
fn audio_sliders_adjust_and_display() {
    let mut state = state();
    assert_eq!(state.audio_sliders()[0].value, 80.0);
    assert_eq!(state.adjust_audio("master", -1), Some(75.0));
    assert_eq!(state.audio_sliders()[0].value_label(), "75%");
    assert_eq!(state.set_audio("music", 68.0), Some(70.0));
}

#[test]
fn language_dropdowns_select_declared_options_only() {
    let mut state = state();
    assert!(state.set_audio_language("日本語"));
    assert_eq!(state.audio_language(), "日本語");
    assert!(!state.set_audio_language("Klingon"));
    assert_eq!(state.audio_language(), "日本語");
    assert!(state.set_subtitle_language("Español"));
    assert_eq!(state.subtitle_language(), "Español");
    assert!(!state.set_subtitle_language("Klingon"));
}

#[test]
fn dropdown_open_state_is_single_and_scoped() {
    let mut state = state();
    assert!(state.dropdown().is_none());
    state.toggle_dropdown(DropdownKind::AudioLanguage);
    assert_eq!(state.dropdown(), Some(DropdownKind::AudioLanguage));
    state.toggle_dropdown(DropdownKind::SubtitleLanguage);
    assert_eq!(
        state.dropdown(),
        Some(DropdownKind::SubtitleLanguage),
        "opening one dropdown closes the other"
    );
    state.toggle_dropdown(DropdownKind::SubtitleLanguage);
    assert!(state.dropdown().is_none(), "second toggle closes it");
    state.open_dropdown(DropdownKind::AudioLanguage);
    assert!(state.set_audio_language("Deutsch"));
    assert!(state.dropdown().is_none(), "selecting closes the dropdown");
}

#[test]
fn subtitle_background_swatch_updates_the_preview_and_passes_aa() {
    let mut state = state();
    assert_eq!(state.subtitle_background().id, "charcoal");
    assert!(state.set_subtitle_background("signal"));
    assert_eq!(state.subtitle_background().id, "signal");
    assert_eq!(state.subtitle_background().value, "#EF6A3C");
    assert!(!state.set_subtitle_background("ultraviolet"));

    let (ink, bone_bright) = {
        let palette = &state.fixtures().appearance.palette;
        (palette.ink.clone(), palette.bone_bright.clone())
    };
    for swatch in state.subtitle_background_options().to_vec() {
        state.set_subtitle_background(&swatch.id);
        let foreground = state.subtitle_preview_text_color().to_string();
        assert!(
            foreground == ink || foreground == bone_bright,
            "preview text uses an Orion palette foreground"
        );
        let ratio = contrast_ratio(&foreground, &swatch.value)
            .expect("validated fixture colors parse");
        assert!(
            ratio >= 4.5,
            "preview '{}' contrast {ratio:.2} must meet AA",
            swatch.id
        );
    }
    assert_eq!(
        state.subtitle_preview_line(),
        "WARNING: DUST FRONT CROSSING THE BASIN. RETURN TO THE PAD."
    );
}

#[test]
fn white_swatches_pick_ink_and_dark_swatches_pick_bone() {
    let mut state = state();
    state.set_subtitle_background("bone");
    assert_eq!(
        state.subtitle_preview_text_color(),
        state.fixtures().appearance.palette.ink
    );
    state.set_subtitle_background("black");
    assert_eq!(
        state.subtitle_preview_text_color(),
        state.fixtures().appearance.palette.bone_bright
    );
}

// -- I15: cancel/dismiss returns to the prior state -------------------

#[test]
fn escape_dismisses_one_overlay_at_a_time_without_touching_data() {
    let mut state = state();
    state.open_marker("relay-01");
    state.open_faction("ares-logistics");
    state.begin_remap("interact");
    state.open_dropdown(DropdownKind::AudioLanguage);
    let bindings_before = state.remap().to_vec();
    let nav_before = state.nav_target().map(str::to_string);

    assert_eq!(state.dismiss_top_overlay(), Dismissed::RemapModal);
    assert!(state.remap_waiting().is_none());
    assert_eq!(state.remap(), bindings_before.as_slice());
    assert_eq!(state.dismiss_top_overlay(), Dismissed::FactionDrawer);
    assert_eq!(state.dismiss_top_overlay(), Dismissed::MarkerPopover);
    assert_eq!(state.dismiss_top_overlay(), Dismissed::LanguageDropdown);
    assert_eq!(state.dismiss_top_overlay(), Dismissed::Nothing);
    assert_eq!(state.nav_target().map(str::to_string), nav_before);
    assert!(!state.has_overlay());
}

#[test]
fn closing_a_drawer_returns_to_the_previous_list_state() {
    let mut state = state();
    assert!(state.open_faction("hellforge"));
    state.close_faction();
    assert!(state.faction_drawer().is_none());
    assert!(!state.shop_parts_enabled());
    // Reopening restores the same data (fixtures are immutable).
    assert!(state.open_faction("hellforge"));
    assert_eq!(
        state.faction_drawer().map(|faction| faction.id.as_str()),
        Some("hellforge")
    );
}

// -- Formatting helpers ----------------------------------------------

#[test]
fn commander_numbers_are_grouped() {
    assert_eq!(format_grouped(0), "0");
    assert_eq!(format_grouped(999), "999");
    assert_eq!(format_grouped(34850), "34,850");
    assert_eq!(format_grouped(52400), "52,400");
    assert_eq!(format_grouped(1_234_567), "1,234,567");
}

#[test]
fn palette_hex_parsing_rejects_malformed_values() {
    assert_eq!(hex_rgb("#EF6A3C"), Some([0xEF, 0x6A, 0x3C]));
    assert_eq!(hex_rgb("EF6A3C"), None);
    assert_eq!(hex_rgb("#EF6A3"), None);
    assert_eq!(hex_rgb("#GGGGGG"), None);
}
