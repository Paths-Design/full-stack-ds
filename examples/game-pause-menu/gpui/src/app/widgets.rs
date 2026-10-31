//! Hand-authored app chrome for the GPUI lane.
//!
//! Every helper here exists because the GPUI target's 7-component allowlist
//! does not admit the surface the app spec requires. Each carries a
//! `// NOT FSDS: <reason>` marker at its definition and a row in the lane
//! README's realization ledger. The generated components used by the app live
//! in the view modules, not here.

use gpui::{
    div, px, AnyElement, App, ClickEvent, Div, InteractiveElement, IntoElement, ParentElement,
    Stateful, Styled, Window, prelude::*,
};

use super::palette::Colors;

/// NOT FSDS: the GPUI target emits no Button component, so every action in the
/// lane is a hand-authored square button (zero radius, saturated orange fill).
pub(crate) fn action_button(
    id: &'static str,
    label: impl IntoElement,
    enabled: bool,
    colors: Colors,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> AnyElement {
    let background = if enabled { colors.signal } else { colors.inset };
    let border = if enabled { colors.signal } else { colors.rule };
    let hover = if enabled { colors.signal_hot } else { colors.inset };
    div()
        .id(id)
        .h(px(36.))
        .px_4()
        .flex()
        .items_center()
        .justify_center()
        .bg(Colors::paint(background))
        .border_1()
        .border_color(Colors::paint(border))
        .when(enabled, move |this| {
            this.cursor_pointer()
                .hover(move |style| style.bg(Colors::paint(hover)))
                .on_click(on_click)
        })
        .child(label)
        .into_any_element()
}

/// NOT FSDS: no secondary/ghost Button variant on the target either.
pub(crate) fn outline_button(
    id: &'static str,
    label: impl IntoElement,
    colors: Colors,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> AnyElement {
    div()
        .id(id)
        .h(px(30.))
        .px_3()
        .flex()
        .items_center()
        .justify_center()
        .bg(Colors::paint(colors.charcoal))
        .border_1()
        .border_color(Colors::paint(colors.rule_strong))
        .cursor_pointer()
        .hover(move |style| style.bg(Colors::paint(colors.row_hover)))
        .on_click(on_click)
        .child(label)
        .into_any_element()
}

/// NOT FSDS: no Icon component on the target. Map-marker kind glyphs are
/// app-authored monograms inside hard-edged marker squares.
pub(crate) fn kind_glyph(kind: &str) -> &'static str {
    match kind {
        "relay" => "R",
        "cache" => "C",
        "pad" => "P",
        "vein" => "V",
        "beacon" => "B",
        "weather" => "W",
        "rover" => "X",
        "camp" => "D",
        _ => "?",
    }
}

/// NOT FSDS: ability-card icon glyph monograms (the fixture carries Lucide
/// names, which the GPUI target cannot render).
pub(crate) fn ability_glyph(icon: &str) -> &'static str {
    match icon {
        "CircleDot" => "CD",
        "Maximize" => "MX",
        "Baseline" => "BL",
        "Calculator" => "CA",
        "Search" => "SR",
        "Alarm" => "AL",
        "TriangleAlert" => "TA",
        "Circle" => "CI",
        "ArrowUpDown" => "AU",
        "PanelLeft" => "PL",
        _ => "AB",
    }
}

/// App-level status color, derived from the Orion palette roles.
pub(crate) fn status_color(status: &str, colors: &Colors) -> u32 {
    match status {
        "ONLINE" | "CLEAR" | "GARRISONED" => colors.clear,
        "SEALED" | "UNSURVEYED" => colors.moss,
        "WARNING" | "ACTIVE" => colors.signal,
        "DERELICT" => colors.alert,
        _ => colors.muted,
    }
}

/// Rarity tag color (rarity is fixture data, never re-derived per engine).
pub(crate) fn rarity_color(rarity: &str, colors: &Colors) -> u32 {
    match rarity {
        "common" => colors.muted,
        "uncommon" => colors.moss,
        "rare" => colors.sage,
        "epic" => colors.signal_hot,
        "legendary" => colors.alert,
        _ => colors.muted,
    }
}

/// NOT FSDS: no Progress/LinearGauge component on the target; faction
/// reputation is a hand-authored hard-edged bar.
pub(crate) fn reputation_bar(fraction: f32, colors: &Colors) -> AnyElement {
    let width = 180.0;
    let filled = (fraction.clamp(0.0, 1.0) * width).round();
    div()
        .w(px(width))
        .h(px(6.))
        .bg(Colors::paint(colors.inset))
        .border_1()
        .border_color(Colors::paint(colors.rule))
        .child(
            div()
                .h_full()
                .w(px(filled))
                .bg(Colors::paint(colors.sage)),
        )
        .into_any_element()
}

/// NOT FSDS: ability "size" is a hard-edged pip block; no Tag/Pip control on
/// the target admits a size meter.
pub(crate) fn size_pips(size: u32, colors: &Colors) -> AnyElement {
    div()
        .flex()
        .flex_row()
        .gap_1()
        .children((0..2).map(|index| {
            let filled = index < size;
            div()
                .w(px(10.))
                .h(px(10.))
                .bg(Colors::paint(if filled {
                    colors.signal
                } else {
                    colors.inset
                }))
                .border_1()
                .border_color(Colors::paint(if filled {
                    colors.signal
                } else {
                    colors.rule
                }))
        }))
        .into_any_element()
}

/// NOT FSDS: the tab bar has no Tabs component on the target; tabs are
/// hand-authored square buttons with an exclusive active state.
pub(crate) fn tab_button(
    mode: TabButtonMode,
    colors: Colors,
    index: usize,
    label: impl IntoElement,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> Stateful<Div> {
    let background = match mode {
        TabButtonMode::Active => colors.signal,
        TabButtonMode::Idle => colors.charcoal,
    };
    let border = match mode {
        TabButtonMode::Active => colors.signal,
        TabButtonMode::Idle => colors.rule,
    };
    div()
        .id(("pause-tab", index))
        .h_full()
        .px_5()
        .flex()
        .flex_row()
        .items_center()
        .gap_3()
        .bg(Colors::paint(background))
        .border_t_1()
        .border_r_1()
        .border_color(Colors::paint(border))
        .cursor_pointer()
        .on_click(on_click)
        .when(mode == TabButtonMode::Idle, move |this| {
            this.hover(move |style| style.bg(Colors::paint(colors.row_hover)))
        })
        .child(label)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum TabButtonMode {
    Active,
    Idle,
}
