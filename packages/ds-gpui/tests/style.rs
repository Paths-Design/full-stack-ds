use full_stack_ds_gpui::style::{apply_resolved_style, resolve_part_style, StyleCondition, StyleDeclaration, StyleRule, StyleState, Theme};
use gpui::{prelude::*, div, point, px, size, TestAppContext};

static CASCADE: &[StyleRule] = &[
    StyleRule { part: "root", conditions: &[], declarations: &[
        StyleDeclaration { property: "control.background", value: "#d0d0d0", token: None },
        StyleDeclaration { property: "control.mark", value: "#ffffff", token: None },
        StyleDeclaration { property: "padding-block-start", value: "0", token: None },
        StyleDeclaration { property: "padding-inline-start", value: "0", token: None },
        StyleDeclaration { property: "padding", value: "8px 16px", token: None },
        StyleDeclaration { property: "padding-left", value: "20px", token: None },
        StyleDeclaration { property: "font-size", value: "0.875rem", token: None },
    ] },
    StyleRule { part: "indicator", conditions: &[], declarations: &[
        StyleDeclaration { property: "background-color", value: "#d0d0d0", token: Some("control.background") },
        StyleDeclaration { property: "width", value: "1em", token: None },
        StyleDeclaration { property: "height", value: "1em", token: None },
    ] },
    StyleRule { part: "indicator", conditions: &[StyleCondition::Checked(true)], declarations: &[
        StyleDeclaration { property: "control.background", value: "#d92d2e", token: Some("semantic.accent") },
    ] },
    StyleRule { part: "indicator", conditions: &[StyleCondition::Disabled(true)], declarations: &[
        StyleDeclaration { property: "control.background", value: "#313131", token: Some("semantic.disabled") },
        StyleDeclaration { property: "control.mark", value: "#727272", token: None },
    ] },
    StyleRule { part: "indicator::after", conditions: &[], declarations: &[
        StyleDeclaration { property: "border-color", value: "#ffffff", token: Some("control.mark") },
    ] },
];

#[test]
fn state_slot_rebinding_disabled_precedence_and_theme_overrides_are_resolved_before_consumers() {
    let mut state = StyleState::default();
    let default = Theme::default();
    assert_eq!(resolve_part_style("indicator", CASCADE, &state, &default).unwrap().get("background-color"), Some("#d0d0d0"));
    state.checked = true;
    assert_eq!(resolve_part_style("indicator", CASCADE, &state, &default).unwrap().get("background-color"), Some("#d92d2e"));
    let override_theme = Theme::default().with_token("semantic.accent", "#008844");
    assert_eq!(resolve_part_style("indicator", CASCADE, &state, &override_theme).unwrap().get("background-color"), Some("#008844"));
    state.disabled = true;
    assert_eq!(resolve_part_style("indicator", CASCADE, &state, &override_theme).unwrap().get("background-color"), Some("#313131"));
    assert_eq!(resolve_part_style("indicator::after", CASCADE, &state, &default).unwrap().get("border-color"), Some("#727272"));
    assert_eq!(resolve_part_style("indicator", CASCADE, &state, &default).unwrap().get("background-color"), Some("#313131"));
}

#[gpui::test]
fn authored_shorthand_precedence_and_inherited_em_reach_real_gpui_style(cx: &mut TestAppContext) {
    let cx = cx.add_empty_window();
    let theme = Theme { rem_size_px: 20., ..Theme::default() };
    let root = resolve_part_style("root", CASCADE, &StyleState::default(), &theme).unwrap();
    assert_eq!(root.get("padding-top"), Some("8px"));
    assert_eq!(root.get("padding-right"), Some("16px"));
    assert_eq!(root.get("padding-left"), Some("20px"));
    cx.draw(point(px(0.), px(0.)), size(px(100.), px(100.)), |window, app| {
        let mut element = apply_resolved_style(div(), &root).unwrap();
        let actual = element.interactivity().compute_style(None, None, window, app);
        assert_eq!(actual.padding.top, px(8.).into());
        assert_eq!(actual.padding.left, px(20.).into());
        element
    });
    let indicator = resolve_part_style("indicator", CASCADE, &StyleState::default(), &theme).unwrap();
    assert_eq!(indicator.get("width"), Some("17.5px"));
    assert_eq!(indicator.get("height"), Some("17.5px"));
}

#[test]
fn cyclic_token_definitions_and_unsupported_property_values_fail_closed() {
    let cycle = [StyleRule { part: "root", conditions: &[], declarations: &[
        StyleDeclaration { property: "a.slot", value: "0", token: Some("b.slot") },
        StyleDeclaration { property: "b.slot", value: "0", token: Some("a.slot") },
        StyleDeclaration { property: "width", value: "0", token: Some("a.slot") },
    ] }];
    let error = resolve_part_style("root", &cycle, &StyleState::default(), &Theme::default()).unwrap_err();
    assert!(error.0.contains("GPUI_TOKEN_CYCLE"));
    for (property, value) in [("width", "nonsense"), ("opacity", "2"), ("background-color", "#broken"), ("invented-property", "0")] {
        let rules = [StyleRule { part: "root", conditions: &[], declarations: Box::leak(vec![StyleDeclaration { property, value, token: None }].into_boxed_slice()) }];
        let resolved = resolve_part_style("root", &rules, &StyleState::default(), &Theme::default()).unwrap();
        assert!(apply_resolved_style(div(), &resolved).is_err(), "{property}={value}");
    }
}

#[gpui::test]
fn percent_translation_uses_the_live_rem_size_and_border_none_wins_over_width(cx: &mut TestAppContext) {
    let cx = cx.add_empty_window();
    let rules = [StyleRule { part: "root", conditions: &[], declarations: &[
        StyleDeclaration { property: "width", value: "2rem", token: None },
        StyleDeclaration { property: "height", value: "2rem", token: None },
        StyleDeclaration { property: "position", value: "absolute", token: None },
        StyleDeclaration { property: "transform", value: "translate(-50%, -50%)", token: None },
        StyleDeclaration { property: "border-style", value: "none", token: None },
        StyleDeclaration { property: "border-width", value: "2px", token: None },
    ] }];
    let resolved = resolve_part_style("root", &rules, &StyleState::default(), &Theme { rem_size_px: 20., ..Theme::default() }).unwrap();
    cx.draw(point(px(0.), px(0.)), size(px(100.), px(100.)), |window, app| {
        let mut element = apply_resolved_style(div(), &resolved).unwrap();
        let actual = element.interactivity().compute_style(None, None, window, app);
        assert_eq!(actual.margin.left, px(-20.).into());
        assert_eq!(actual.margin.top, px(-20.).into());
        assert_eq!(actual.border_widths.top, px(0.).into());
        assert_eq!(actual.border_widths.right, px(0.).into());
        element
    });
}
