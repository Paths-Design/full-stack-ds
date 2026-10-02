use full_stack_ds_gpui::style::{apply_part_style, apply_resolved_style, native_border_paint, resolve_part_style, ResolvedPartStyle, StyleCondition, StyleDeclaration, StyleRule, StyleState, Theme};
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
    for value in ["0", "0.0", "-0", "-0.00"] {
        let rules = [StyleRule { part: "root", conditions: &[], declarations: Box::leak(vec![StyleDeclaration { property: "width", value, token: None }].into_boxed_slice()) }];
        let resolved = resolve_part_style("root", &rules, &StyleState::default(), &Theme::default()).unwrap();
        assert!(apply_resolved_style(div(), &resolved).is_ok(), "CSS unitless zero {value} admitted by codegen must mount successfully");
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

#[gpui::test]
fn asymmetric_one_pixel_edges_execute_native_paint_with_nonempty_solid_quads(cx: &mut TestAppContext) {
    let cx = cx.add_empty_window();
    // These are arbitrary authored borders, independent of any component identity.
    // The padding box has zero extent along its bordered axis. The expected
    // geometry is written independently of the adapter's reconstruction code.
    for (edge, padding_size, expected) in [
        ("top", size(px(180.), px(0.)), gpui::Bounds::new(point(px(12.), px(10.)), size(px(180.), px(1.)))),
        ("bottom", size(px(180.), px(0.)), gpui::Bounds::new(point(px(12.), px(11.)), size(px(180.), px(1.)))),
        ("left", size(px(0.), px(60.)), gpui::Bounds::new(point(px(11.), px(11.)), size(px(1.), px(60.)))),
        ("right", size(px(0.), px(60.)), gpui::Bounds::new(point(px(12.), px(11.)), size(px(1.), px(60.)))),
    ] {
        let style = ResolvedPartStyle { properties: [
            (format!("border-{edge}-width"), "1px".into()),
            (format!("border-{edge}-style"), "solid".into()),
            ("border-color".into(), "#b8b8b8".into()),
        ].into(), ..Default::default() };
        let (_, quads) = cx.draw(point(px(12.), px(11.)), size(px(200.), px(100.)), |_, _| {
            native_border_paint(&style).unwrap().expect("asymmetric edge requires explicit paint")
                .w(padding_size.width).h(padding_size.height)
        });
        assert_eq!(quads.len(), 1, "{edge} edge must produce one painted rectangle");
        assert_eq!(quads[0].bounds, expected, "{edge} paint must cover the complete border box edge");
        assert!(!quads[0].bounds.is_empty());
        assert_eq!(quads[0].background, gpui::Background::from(gpui::rgb(0xb8b8b8)));
        assert_eq!(quads[0].border_widths, gpui::Edges::all(px(0.)), "edge fills must bypass the nearest-quadrant border shader");
        assert_eq!(quads[0].corner_radii, gpui::Corners::all(px(0.)));
    }
}

#[gpui::test]
fn explicit_edge_paint_preserves_layout_respects_none_and_keeps_regular_native_borders(cx: &mut TestAppContext) {
    let cx = cx.add_empty_window();
    let mut style = ResolvedPartStyle { properties: [
        ("border-top-width".into(), "1px".into()),
        ("border-color".into(), "#108850".into()),
    ].into(), ..Default::default() };
    cx.draw(point(px(0.), px(0.)), size(px(100.), px(100.)), |window, app| {
        let mut element = apply_resolved_style(div(), &style).unwrap();
        let actual = element.interactivity().compute_style(None, None, window, app);
        assert_eq!(actual.border_widths.top, px(1.).into(), "source border width remains the layout authority");
        assert_eq!(actual.border_widths.bottom, px(0.).into());
        assert!(actual.border_color.unwrap().is_transparent(), "explicit paint must replace rather than double paint the native border");
        element
    });
    style.properties.insert("border-top-style".into(), "none".into());
    assert!(native_border_paint(&style).unwrap().is_none(), "none suppresses explicit paint as well as layout borders");
    style.properties.remove("border-top-style");
    style.properties.insert("border-radius".into(), "4px".into());
    assert!(native_border_paint(&style).unwrap().is_none(), "rounded borders retain GPUI's native realization");
    style.properties.remove("border-radius");
    style.properties.remove("border-top-width");
    style.properties.insert("border-width".into(), "1px".into());
    assert!(native_border_paint(&style).unwrap().is_none(), "symmetric borders retain GPUI's native realization");
}

#[gpui::test]
fn translucent_asymmetric_edges_have_disjoint_painted_corners_and_transparent_color_suppresses_paint(cx: &mut TestAppContext) {
    let cx = cx.add_empty_window();
    let mut style = ResolvedPartStyle { properties: [
        ("border-top-width".into(), "1px".into()),
        ("border-right-width".into(), "2px".into()),
        ("border-left-width".into(), "1px".into()),
        ("border-color".into(), "rgba(16, 136, 80, 0.5)".into()),
    ].into(), ..Default::default() };
    let (_, quads) = cx.draw(point(px(11.), px(11.)), size(px(100.), px(100.)), |_, _| {
        native_border_paint(&style).unwrap().unwrap().w(px(3.)).h(px(4.))
    });
    let expected = [
        gpui::Bounds::new(point(px(10.), px(10.)), size(px(6.), px(1.))),
        gpui::Bounds::new(point(px(14.), px(11.)), size(px(2.), px(4.))),
        gpui::Bounds::new(point(px(10.), px(11.)), size(px(1.), px(4.))),
    ];
    assert_eq!(quads.iter().map(|quad| quad.bounds).collect::<Vec<_>>(), expected);
    for (index, quad) in quads.iter().enumerate() {
        assert_eq!(quad.background, gpui::Background::from(gpui::Rgba { r: 16./255., g: 136./255., b: 80./255., a: 0.5 }));
        for other in &quads[index+1..] {
            assert!(quad.bounds.intersect(&other.bounds).is_empty(), "alpha must apply once even at occupied corners");
        }
    }
    style.properties.insert("border-color".into(), "transparent".into());
    let (_, invisible) = cx.draw(point(px(11.), px(11.)), size(px(100.), px(100.)), |_, _| {
        native_border_paint(&style).unwrap().unwrap().w(px(3.)).h(px(4.))
    });
    assert!(invisible.is_empty(), "source color changes must alter actual paint geometry emission");
}

#[test]
fn asymmetric_implicit_hover_width_changes_fail_closed_and_disabled_rules_are_suppressed() {
    let rules = [
        StyleRule { part: "root", conditions: &[], declarations: &[
            StyleDeclaration { property: "border-top-width", value: "1px", token: None },
            StyleDeclaration { property: "border-color", value: "#b8b8b8", token: None },
        ] },
        StyleRule { part: "root", conditions: &[StyleCondition::Hover], declarations: &[
            StyleDeclaration { property: "border-top-width", value: "3px", token: None },
        ] },
    ];
    let error = std::panic::catch_unwind(|| apply_part_style(div(), "root", &rules, &StyleState::default(), &Theme::default()));
    let payload = match error { Ok(_) => panic!("an unadmitted border geometry transition must fail closed"), Err(payload) => payload };
    let message = payload.downcast_ref::<String>().map(String::as_str).or_else(||payload.downcast_ref::<&str>().copied()).unwrap();
    assert!(message.contains("GPUI_BORDER_HOVER_GEOMETRY_UNSUPPORTED"));
    let disabled = StyleState { disabled: true, ..StyleState::default() };
    assert!(std::panic::catch_unwind(|| apply_part_style(div(), "root", &rules, &disabled, &Theme::default())).is_ok(), "disabled state excludes hover conditions before border geometry admission");
}
