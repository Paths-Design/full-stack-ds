//! Hand-authored chrome helpers for the parity layout.
//!
//! Everything positioned by these helpers takes its coordinates, colours and
//! sizes from the parsed parity layout; no geometry literal is re-typed here.
//! Regions that have an admitted generated component (tabs, switches, chips,
//! rules, text) render that component; these helpers provide the page-frame,
//! buttons, map drawing and control surfaces the allowlist does not admit, and
//! are ledgered in the lane README.

use gpui::{
    div, px, AnyElement, App, ClickEvent, Div, InteractiveElement, IntoElement, ParentElement,
    Stateful, Styled, Window, prelude::*,
};

use game_pause_menu_gpui::seam::{ParityLayout, Rect};

use super::colors;

/// Absolutely positioned box at this JSON rectangle.
pub(crate) fn rect_box(rect: Rect) -> Div {
    div()
        .absolute()
        .left(px(rect.x))
        .top(px(rect.y))
        .w(px(rect.w))
        .h(px(rect.h))
}

/// Absolutely positioned box from raw JSON values.
pub(crate) fn at(x: f32, y: f32, w: f32, h: f32) -> Div {
    div()
        .absolute()
        .left(px(x))
        .top(px(y))
        .w(px(w))
        .h(px(h))
}

/// A parity panel: JSON ground colour, 1 px rule border, square corners.
pub(crate) fn panel(layout: &ParityLayout, rect: Rect) -> Div {
    rect_box(rect)
        .bg(colors::paint(layout.color(&layout.panels.background)))
        .border(px(layout.style.panel_border))
        .border_color(colors::paint(layout.color(&layout.panels.border)))
}

/// NOT FSDS: no Button component on the GPUI target. Primary action: signal
/// fill, on-signal label, square corners, pinned parity height.
pub(crate) fn primary_button(
    id: &'static str,
    label: impl IntoElement,
    width: f32,
    height: f32,
    layout: &ParityLayout,
    enabled: bool,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> AnyElement {
    let background = if enabled {
        layout.color("signal")
    } else {
        layout.color("graphite")
    };
    let border = if enabled {
        layout.color("signal")
    } else {
        layout.color("ruleStrong")
    };
    let hover = if enabled {
        layout.color("signalHot")
    } else {
        layout.color("graphite")
    };
    div()
        .id(id)
        .h(px(height))
        .w(px(width))
        .flex()
        .items_center()
        .justify_center()
        .bg(colors::paint(background))
        .border_1()
        .border_color(colors::paint(border))
        .when(enabled, move |this| {
            this.cursor_pointer()
                .hover(move |style| style.bg(colors::paint(hover)))
                .on_click(on_click)
        })
        .child(label)
        .into_any_element()
}

/// NOT FSDS: secondary/outline button (1 px ruleStrong border, boneBright
/// label).
pub(crate) fn outline_button(
    id: &'static str,
    label: impl IntoElement,
    width: f32,
    height: f32,
    layout: &ParityLayout,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> AnyElement {
    div()
        .id(id)
        .h(px(height))
        .w(px(width))
        .flex()
        .items_center()
        .justify_center()
        .border_1()
        .border_color(colors::paint(layout.color("ruleStrong")))
        .cursor_pointer()
        .hover(move |style| style.bg(colors::paint(layout.color("graphite"))))
        .on_click(on_click)
        .child(label)
        .into_any_element()
}

/// A hand-authored chip surface. The chip label itself is a generated `Badge`
/// (chip typography) centred inside; the target's Badge has no fixed
/// width/height/justify channel, so the JSON chip rectangle is this surface and
/// the Badge contributes the chip type. Ledgered in the README.
pub(crate) fn chip_surface(
    layout: &ParityLayout,
    rect: Rect,
    background: Option<&str>,
    border: Option<(&str, f32)>,
) -> Div {
    let mut chip = at(rect.x, rect.y, rect.w, rect.h)
        .flex()
        .items_center()
        .justify_center();
    if let Some(role) = background {
        chip = chip.bg(colors::paint(layout.color(role)));
    }
    if let Some((role, width)) = border {
        chip = chip
            .border(px(width))
            .border_color(colors::paint(layout.color(role)));
    }
    chip
}

/// NOT FSDS: no Progress/Pip component on the target — ability size pips.
pub(crate) fn size_pips(layout: &ParityLayout, size: u32, pip: f32) -> AnyElement {
    div()
        .flex()
        .flex_row()
        .gap(px(3.))
        .children((0..2).map(|index| {
            let filled = index < size;
            div()
                .w(px(pip))
                .h(px(pip))
                .bg(colors::paint(layout.color(if filled {
                    "signal"
                } else {
                    "graphite"
                })))
        }))
        .into_any_element()
}

/// NOT FSDS: no Map/Icon component on the target — marker square with a 1 px
/// ink border, JSON `markerColors` fill and `markerMonograms` monogram. The nav
/// target gets a 3 px signal outline.
pub(crate) fn marker_square(
    layout: &ParityLayout,
    size: f32,
    kind_color: &str,
    monogram: &str,
    nav_target: bool,
) -> AnyElement {
    let monogram_color = if kind_color == "onSignal" {
        "boneBright"
    } else {
        "ink"
    };
    let border = if nav_target { "signal" } else { "ink" };
    let border_width = if nav_target { 3.0 } else { 1.0 };
    div()
        .w(px(size))
        .h(px(size))
        .flex()
        .items_center()
        .justify_center()
        .bg(colors::paint(layout.color(kind_color)))
        .border(px(border_width))
        .border_color(colors::paint(layout.color(border)))
        .child(
            div()
                .text_size(px(layout.map.marker.monogram))
                .font_weight(gpui::FontWeight(800.))
                .text_color(colors::paint(layout.color(monogram_color)))
                .child(monogram.to_string()),
        )
        .into_any_element()
}

/// A generated `Divider` render slot at an absolute rule rectangle.
pub(crate) fn rule_slot(
    divider: gpui::Entity<full_stack_ds_gpui::components::Divider>,
    rect: Rect,
) -> AnyElement {
    at(rect.x, rect.y, rect.w, rect.h)
        .child(divider)
        .into_any_element()
}

/// The tab button surface: absolute equal-width column, active signal fill with
/// on-signal label; idle uses the tab-bar ground with textSecondary.
pub(crate) fn tab_surface(
    layout: &ParityLayout,
    rect: Rect,
    active: bool,
    separator: bool,
    label: impl IntoElement,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> Stateful<Div> {
    let background = if active {
        layout.color(&layout.tab_bar.active_background)
    } else {
        layout.color(&layout.tab_bar.background)
    };
    let idle_background = layout.color("graphite").to_string();
    let separator_color = layout.color(&layout.tab_bar.separator).to_string();
    let mut tab = at(rect.x, rect.y, rect.w, rect.h)
        .id(("parity-tab", rect.x as usize))
        .flex()
        .items_center()
        .justify_center()
        .bg(colors::paint(background))
        .cursor_pointer()
        .on_click(on_click)
        .when(separator, move |this| {
            this.border_r_1()
                .border_color(colors::paint(&separator_color))
        });
    if !active {
        tab = tab.hover(move |style| style.bg(colors::paint(&idle_background)));
    }
    tab.child(label)
}
