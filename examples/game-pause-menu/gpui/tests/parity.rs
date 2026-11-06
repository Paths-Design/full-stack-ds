//! Parity layout tests: the shared geometry authority must parse, validate and
//! expose the exact 1280x800 contract the app renders from.
//!
//! These are seam tests (no gpui): they pin the values the three engine lanes
//! share, the canonical switch contract, and the negative authoring paths.

use game_pause_menu_gpui::seam::parity::{
    PARITY_LAYOUT_JSON, ParityLayout, code_two_letters, icon_code, load_parity_layout,
    parse_parity_layout, try_load_parity_layout,
};
use game_pause_menu_gpui::seam::tokens;

fn layout() -> ParityLayout {
    try_load_parity_layout().expect("the committed parity layout must validate")
}

#[test]
fn popover_inner_contract_keeps_all_content_inside_the_surface() {
    let layout = layout();
    let content = &layout.map.popover.content;
    let rects: Vec<_> = content.parts().into_iter()
        .map(|(name, part)| (name, [part.rect.x, part.rect.y, part.rect.w, part.rect.h]))
        .collect();
    assert_eq!(rects, vec![
        ("title", [16.0,14.0,328.0,28.0]), ("status", [16.0,48.0,84.0,18.0]),
        ("meta", [112.0,50.0,232.0,16.0]), ("body", [16.0,78.0,328.0,88.0]),
        ("reward", [16.0,174.0,328.0,14.0]), ("action", [16.0,194.0,220.0,28.0]),
        ("cancel", [244.0,194.0,100.0,28.0]),
    ]);
    let fixtures = game_pause_menu_gpui::seam::adapter::load_fixtures();
    let beacon = fixtures.icons().iter().find(|icon| icon.id == "beacon-05").unwrap();
    assert_eq!(content.metadata(beacon), "HECATE FLATS · 11.2 KM");
    let relay = fixtures.icons().iter().find(|icon| icon.id == "relay-01").unwrap();
    assert_eq!(content.metadata(relay), "ARES BASIN · 4.8 KM");
    assert_eq!(content.status.type_key, "micro");
    assert_eq!(content.status.background.as_deref(), Some("graphite"));
    assert_eq!(layout.type_scale.size(&content.title.type_key), Some(24.0));
}

#[test]
fn malformed_popover_content_is_rejected() {
    let mut raw: serde_json::Value = serde_json::from_str(PARITY_LAYOUT_JSON).unwrap();
    raw["map"]["popover"]["content"]["body"]["rect"]["w"] = 999.into();
    let error = parse_parity_layout(&raw.to_string()).unwrap_err();
    assert!(error.to_string().contains("map.popover.content.body.rect extends beyond"));
    let mut raw: serde_json::Value = serde_json::from_str(PARITY_LAYOUT_JSON).unwrap();
    raw["map"]["popover"]["content"]["meta"]["template"] = "{sector} {unknown}".into();
    assert!(parse_parity_layout(&raw.to_string()).unwrap_err().to_string().contains("must bind sector and distanceKm only"));
    let mut raw: serde_json::Value = serde_json::from_str(PARITY_LAYOUT_JSON).unwrap();
    raw["map"]["popover"]["content"]["status"]["type"] = "unknown".into();
    assert!(parse_parity_layout(&raw.to_string()).unwrap_err().to_string().contains("invalid typography"));
}

#[test]
fn subtitle_preview_keeps_body_and_metadata_in_separate_declared_boxes() {
    let layout = layout();
    let preview = &layout.settings.preview;
    assert_eq!([preview.x, preview.y, preview.w, preview.h], [664.0, 694.0, 576.0, 26.0]);
    assert_eq!(preview.content.line.rect, game_pause_menu_gpui::seam::parity::Rect { x: 8.0, y: 6.0, w: 390.0, h: 14.0 });
    assert_eq!(preview.content.meta.rect, game_pause_menu_gpui::seam::parity::Rect { x: 400.0, y: 6.0, w: 168.0, h: 14.0 });
    assert_eq!(layout.type_scale.size(&preview.content.line.type_key), Some(10.0));
    assert_eq!(preview.content.line.weight, 400);
    assert_eq!(preview.content.meta.weight, 700);
    assert_eq!(preview.content.metadata("English", "CHARCOAL"), "ENGLISH · CHARCOAL");
    assert_eq!(preview.content.metadata("Français", "SIGNAL"), "FRANÇAIS · SIGNAL");
    assert_eq!(preview.content.metadata("Español", "Warm signal"), "ESPAÑOL · WARM SIGNAL");
}

#[test]
fn subtitle_preview_rejects_lost_feedback_and_out_of_bounds_parts() {
    let mut raw: serde_json::Value = serde_json::from_str(PARITY_LAYOUT_JSON).unwrap();
    raw["settings"]["preview"]["content"]["meta"]["template"] = "{language}".into();
    assert!(parse_parity_layout(&raw.to_string()).unwrap_err().to_string().contains("must bind language and background"));
    let mut raw: serde_json::Value = serde_json::from_str(PARITY_LAYOUT_JSON).unwrap();
    raw["settings"]["preview"]["content"]["line"]["rect"]["h"] = 99.into();
    assert!(parse_parity_layout(&raw.to_string()).unwrap_err().to_string().contains("settings.preview.content.line.rect extends beyond"));
}

fn mutated(from: &str, to: &str) -> String {
    assert!(
        PARITY_LAYOUT_JSON.contains(from),
        "test setup: parity layout should contain {from:?}"
    );
    PARITY_LAYOUT_JSON.replacen(from, to, 1)
}

#[test]
fn committed_parity_layout_parses_and_validates() {
    let layout = layout();
    assert_eq!(layout.viewport.width, 1280.0);
    assert_eq!(layout.viewport.height, 800.0);
    assert_eq!(layout.captures.len(), 8);
    for required in ParityLayout::REQUIRED_CAPTURES {
        assert!(
            layout.captures.contains_key(required),
            "capture {required} must be declared"
        );
    }
}

#[test]
fn shell_rects_match_the_parity_authority() {
    let layout = layout();
    let header = layout.header.rect;
    assert_eq!((header.x, header.y, header.w, header.h), (0.0, 0.0, 1280.0, 104.0));
    let tab_bar = layout.tab_bar.rect;
    assert_eq!((tab_bar.x, tab_bar.y, tab_bar.w, tab_bar.h), (0.0, 104.0, 1280.0, 56.0));
    let content = layout.panels.content;
    assert_eq!((content.x, content.y, content.w, content.h), (24.0, 176.0, 1232.0, 552.0));
    let footer = layout.footer.rect;
    assert_eq!((footer.x, footer.y, footer.w, footer.h), (0.0, 744.0, 1280.0, 56.0));
    assert_eq!(layout.header.paused_chip.x, 1184.0);
    assert_eq!(layout.header.paused_chip.y, 40.0);
    assert_eq!(layout.header.paused_chip.w, 64.0);
    assert_eq!(layout.header.paused_chip.h, 24.0);
    assert_eq!(layout.header.stats[0].x, 608.0);
    assert_eq!(layout.header.stats[1].x, 800.0);
    assert_eq!(layout.header.stats[2].x, 992.0);
}

#[test]
fn tabs_are_four_equal_contiguous_columns() {
    let layout = layout();
    let expected = [
        ("map", 0.0, "MAP"),
        ("progress", 320.0, "PROGRESS"),
        ("abilities", 640.0, "ABILITIES"),
        ("settings", 960.0, "SETTINGS"),
    ];
    for (tab, (id, x, label)) in layout.tab_bar.tabs.iter().zip(expected) {
        assert_eq!(tab.id, id);
        assert_eq!(tab.x, x);
        assert_eq!(tab.w, 320.0);
        assert_eq!(tab.label, label);
    }
    assert_eq!(layout.tab_bar.label_align, "left");
    assert_eq!(layout.tab_bar.label_inset, 32.0);
}

#[test]
fn switch_contract_is_the_canonical_pill() {
    let layout = layout();
    let switch = &layout.switch;
    assert_eq!((switch.width, switch.height), (64.0, 32.0));
    assert_eq!(switch.radius, 16.0);
    assert_eq!((switch.thumb, switch.thumb_radius), (24.0, 12.0));
    assert_eq!(switch.inset, 4.0);
    assert_eq!(switch.checked_thumb_offset, 36.0);
    assert_eq!(switch.radius, switch.height / 2.0);
    assert_eq!(switch.thumb_radius, switch.thumb / 2.0);
    assert_eq!(
        switch.checked_thumb_offset,
        switch.width - switch.thumb - switch.inset
    );

    let off = layout.switch_style(false);
    assert_eq!(off.track_hex, "#2E2E29");
    assert_eq!(off.thumb_hex, "#F4F1E6");
    assert_eq!(off.border_hex.as_deref(), Some("#56564C"));
    assert_eq!(off.border_width, 1.0);
    assert_eq!(off.thumb_offset, 4.0);
    let on = layout.switch_style(true);
    assert_eq!(on.track_hex, "#EF6A3C");
    assert_eq!(on.thumb_hex, "#191917");
    assert_eq!(on.border_hex, None);
    assert_eq!(on.border_width, 0.0);
    assert_eq!(on.thumb_offset, 36.0);
    assert_eq!(on.radius_px(), "16px");
    assert_eq!(on.thumb_radius_px(), "12px");
    assert_eq!(on.track_px(), "64px");
    assert_eq!(on.track_height_px(), "32px");
    assert_eq!(on.thumb_px(), "24px");
    assert_eq!(on.thumb_offset_px(), "36px");
    assert_eq!(on.border_width_px(), "0px");
}

#[test]
fn per_tab_rects_match_the_parity_authority() {
    let layout = layout();
    let map = &layout.map;
    assert_eq!((map.map_panel.x, map.map_panel.y, map.map_panel.w, map.map_panel.h), (24.0, 176.0, 872.0, 552.0));
    assert_eq!((map.field.x, map.field.y, map.field.w, map.field.h), (40.0, 232.0, 840.0, 480.0));
    assert_eq!((map.icon_panel.x, map.icon_panel.y, map.icon_panel.w, map.icon_panel.h), (912.0, 176.0, 344.0, 552.0));
    assert_eq!(map.marker.size, 24.0);
    assert_eq!(map.icon_rows.row_h, 48.0);

    let progress = &layout.progress;
    assert_eq!((progress.list_panel.x, progress.list_panel.y, progress.list_panel.w, progress.list_panel.h), (24.0, 176.0, 1232.0, 552.0));
    let drawer = progress.drawer.rect;
    assert_eq!((drawer.x, drawer.y, drawer.w, drawer.h), (24.0, 176.0, 560.0, 552.0));
    assert_eq!(progress.drawer.background, "sage");
    assert_eq!(progress.drawer.text, "ink");
    assert_eq!(progress.rows.row_h, 88.0);
    assert_eq!(progress.rows.rep_bar_w, 200.0);

    let abilities = &layout.abilities;
    assert_eq!((abilities.grid_panel.w, abilities.grid_panel.h), (808.0, 552.0));
    assert_eq!((abilities.cards.w, abilities.cards.h), (152.0, 240.0));
    assert_eq!(abilities.cards.cols, 5);
    assert_eq!((abilities.detail_panel.x, abilities.detail_panel.w), (848.0, 408.0));
    assert_eq!((abilities.slots.w, abilities.slots.h), (180.0, 60.0));
    assert_eq!(abilities.slots.cols, 2);

    let settings = &layout.settings;
    assert_eq!(settings.panels.len(), 4);
    let rects: Vec<(f32, f32, f32, f32)> = settings
        .panels
        .iter()
        .map(|panel| (panel.rect.x, panel.rect.y, panel.rect.w, panel.rect.h))
        .collect();
    assert_eq!(
        rects,
        vec![
            (24.0, 176.0, 608.0, 268.0),
            (648.0, 176.0, 608.0, 268.0),
            (24.0, 460.0, 608.0, 268.0),
            (648.0, 460.0, 608.0, 268.0),
        ]
    );
    assert_eq!(settings.remap_first_row_y, 496.0);
    assert_eq!(settings.audio_row_h, 28.0);
    assert_eq!(settings.audio_first_row_y, 496.0);
    assert_eq!(settings.language_label_y, 612.0);
    assert_eq!(settings.dropdown_y, 624.0);
    assert_eq!(settings.dropdown_h, 28.0);
    assert_eq!(settings.swatch_label_y, 658.0);
    assert_eq!(settings.swatch_y, 670.0);
    assert_eq!(settings.swatch_h, 18.0);
    assert_eq!((settings.preview.x, settings.preview.y, settings.preview.w, settings.preview.h), (664.0, 694.0, 576.0, 26.0));
    assert_eq!(layout.footer.nav_target.align, "right");
    assert_eq!(layout.footer.nav_target.value_right, 1256.0);
    assert_eq!(layout.footer.nav_target.value_y, 770.0);
    assert_eq!(layout.progress.rows.dossier_text, "OPEN →");
    assert_eq!(settings.slider.w, 300.0);
    assert_eq!(settings.slider.h, 6.0);
    assert_eq!(settings.slider.thumb, 16.0);
    assert_eq!(settings.binding_button.w, 120.0);
    assert_eq!(settings.dropdown.w, 200.0);
    assert_eq!(settings.swatch.w, 36.0);
    assert_eq!((settings.remap_modal.x, settings.remap_modal.y), (430.0, 300.0));
}

#[test]
fn colours_and_type_resolve_from_the_json_maps() {
    let layout = layout();
    for role in [
        "signal", "signalDeep", "signalHot", "onSignal", "ink", "charcoal", "graphite",
        "boneBright", "bone", "paper", "paperMuted", "sage", "moss", "alert", "clear",
        "rule", "ruleStrong", "muted", "textSecondary",
    ] {
        let hex = layout.color(role);
        assert!(hex.starts_with('#') && hex.len() == 7, "{role} is #RRGGBB");
    }
    for (kind, role) in &layout.marker_colors {
        assert!(layout.marker_monograms.contains_key(kind));
        assert!(
            layout.colors.role(role).is_some(),
            "marker {kind} uses a declared colour role"
        );
    }
    for rarity in ["common", "uncommon", "rare", "epic", "legendary"] {
        assert!(layout.rarity_colors.contains_key(rarity));
        assert!(layout.rarity_text_colors.contains_key(rarity));
    }
    assert_eq!(layout.marker_monograms.get("rover").map(String::as_str), Some("O"));
    assert_eq!(layout.marker_monograms.get("camp").map(String::as_str), Some("M"));
    assert!(layout.type_scale.wordmark > 0.0);
    assert!(layout.type_scale.body > 0.0);
    // Typography parity: tracking is pinned to zero so the three engines can match.
    assert_eq!(layout.type_scale.letter_spacing_micro, 0.0);
    assert_eq!(layout.type_scale.letter_spacing_tab, 0.0);
}

#[test]
fn icon_art_is_the_portable_code_tile_language() {
    let layout = layout();
    let row = &layout.icon_art.row_tile;
    assert_eq!(row.size, 16.0);
    assert_eq!(row.background, "graphite");
    assert_eq!(row.border, "ruleStrong");
    assert_eq!(row.border_width, 1.0);
    assert_eq!(row.radius, 0.0);
    assert_eq!(row.font_size, 8.0);
    assert_eq!(row.weight, 700);
    assert_eq!(row.text, "boneBright");
    let card = &layout.icon_art.card_tile;
    assert_eq!(card.size, 40.0);
    assert_eq!(card.font_size, 12.0);
    assert_eq!(card.weight, 700);
    assert_eq!(card.background, "graphite");
    assert_eq!(card.border, "ruleStrong");
    assert_eq!(card.radius, 0.0);
    // The code language pins these exact catalog initials (parity.md).
    for (catalog, expected) in [
        ("Info", "IN"),
        ("Placeholder", "PL"),
        ("Home", "HO"),
        ("Baseline", "BL"),
        ("Alarm", "AL"),
        ("CircleDot", "CD"),
        ("ChevronRight", "CR"),
        ("User", "US"),
    ] {
        assert_eq!(icon_code(catalog), expected, "icon code for {catalog}");
    }
    // Ability names are single uppercase words: first two letters.
    for (ability, expected) in [
        ("THREADING", "TH"),
        ("OVERCLOCK", "OV"),
        ("ION DRILL", "IO"),
        ("RECON PING", "RE"),
    ] {
        assert_eq!(code_two_letters(ability), expected, "ability code for {ability}");
    }
}

#[test]
fn a_rounded_icon_tile_is_an_authoring_error() {
    let broken = mutated("\"radius\": 0,\n      \"fontSize\": 8,", "\"radius\": 4,\n      \"fontSize\": 8,");
    let error = parse_parity_layout(&broken).expect_err("icon tiles must be square");
    assert!(error.to_string().contains("square"));
}

#[test]
fn capture_states_are_exactly_the_parity_plan() {
    let layout = layout();
    let map = layout.captures.get("map").expect("map capture");
    assert_eq!(map.active_tab, "map");
    assert_eq!(map.nav_target.as_deref(), Some("cache-02"));
    assert_eq!(map.hidden_icons, vec!["weather-06".to_string()]);
    assert_eq!(map.popover, None);

    let popover = layout.captures.get("map-popover").expect("map-popover");
    assert_eq!(popover.popover.as_deref(), Some("beacon-05"));
    assert_eq!(popover.nav_target.as_deref(), Some("cache-02"));

    let progress = layout.captures.get("progress").expect("progress");
    assert_eq!(progress.drawer.as_deref(), Some("ares-logistics"));

    for (name, capture) in &layout.captures {
        assert_eq!(
            capture.nav_target.as_deref(),
            Some("cache-02"),
            "capture {name} must set the shared nav target"
        );
    }
    let abilities = layout.captures.get("abilities").expect("abilities");
    assert_eq!(abilities.pending_ability.as_deref(), Some("overclock"));
    assert_eq!(abilities.hover, None);
    assert_eq!(
        layout
            .captures
            .get("abilities-hover")
            .and_then(|capture| capture.hover.as_deref()),
        Some("overclock")
    );

    let remap = layout.captures.get("settings-remap-modal").expect("remap modal");
    assert_eq!(remap.remap_modal.as_deref(), Some("interact"));

    let subtitle = layout.captures.get("settings-subtitle").expect("subtitle");
    assert_eq!(subtitle.subtitle_background.as_deref(), Some("signal"));
    assert_eq!(subtitle.subtitle_language.as_deref(), Some("Français"));
}

#[test]
fn a_non_pill_switch_radius_is_an_authoring_error() {
    let broken = mutated("\"radius\": 16,", "\"radius\": 6,");
    let error = parse_parity_layout(&broken).expect_err("wrong switch radius must fail");
    assert!(error.to_string().contains("half the track height"));
}

#[test]
fn a_flat_thumb_radius_is_an_authoring_error() {
    let broken = mutated("\"thumbRadius\": 12,", "\"thumbRadius\": 8,");
    let error = parse_parity_layout(&broken).expect_err("thumb must be a circle");
    assert!(error.to_string().contains("half the thumb size"));
}

#[test]
fn an_unknown_colour_role_is_an_authoring_error() {
    let broken = mutated(
        "\"onTrack\": \"signal\",",
        "\"onTrack\": \"neonPink\",",
    );
    let error = parse_parity_layout(&broken).expect_err("unknown colour role must fail");
    assert!(error.to_string().contains("neonPink"));
}

#[test]
fn a_missing_required_capture_is_an_authoring_error() {
    let broken = mutated("\"map\": {\n      \"activeTab\": \"map\",", "\"map-not\": {\n      \"activeTab\": \"map\",");
    let error = parse_parity_layout(&broken).expect_err("required capture must be declared");
    assert!(error.to_string().contains("map.png") || error.to_string().contains("'map'"));
}

#[test]
fn a_capture_without_the_shared_nav_target_is_an_authoring_error() {
    let broken = mutated(
        "\"progress\": {\n      \"activeTab\": \"progress\",\n      \"drawer\": \"ares-logistics\",\n      \"navTarget\": \"cache-02\",",
        "\"progress\": {\n      \"activeTab\": \"progress\",\n      \"drawer\": \"ares-logistics\",",
    );
    let error = parse_parity_layout(&broken).expect_err("captures must set the nav target");
    assert!(error.to_string().contains("nav target"));
}

#[test]
fn unequal_tab_columns_are_an_authoring_error() {
    let broken = mutated(
        "\"id\": \"map\",\n        \"x\": 0,\n        \"w\": 320,",
        "\"id\": \"map\",\n        \"x\": 0,\n        \"w\": 300,",
    );
    let error = parse_parity_layout(&broken).expect_err("unequal tabs must fail");
    assert!(error.to_string().contains("equal quarter-width"));
}

/// Runtime consumption witness: the loaded colours come from the authority's
/// `colorTokens` entries resolved through the embedded token graph + Orion
/// brand, not from the literal JSON values. The values currently agree, so the
/// check is structural (every role must resolve) and would fail if a lane
/// stopped routing a role through the token path or a provenance entry drifted.
#[test]
fn loaded_palette_consumes_every_authority_colour_token() {
    let layout = load_parity_layout();
    assert_eq!(layout.color_tokens.len(), 19, "all authority colours carry token provenance");
    assert_eq!(layout.type_tokens.len(), 21, "all authority type values carry token provenance");
    for (name, provenance) in &layout.color_tokens {
        let expected = tokens::resolve_color(&provenance.token, &provenance.mode)
            .unwrap_or_else(|| panic!("colour {name} token {} must resolve", provenance.token));
        let actual = layout.colors.role(name).expect("known colour role");
        assert_eq!(
            actual.to_ascii_uppercase(),
            expected.to_ascii_uppercase(),
            "colour {name} must be resolved from {} ({})",
            provenance.token,
            provenance.mode
        );
    }
    let drawer = tokens::resolve_size("semantic.typography.graphic.size.display", "dark")
        .expect("drawer title token must resolve");
    assert!((layout.type_scale.drawer_title - drawer).abs() < 0.001);
}
