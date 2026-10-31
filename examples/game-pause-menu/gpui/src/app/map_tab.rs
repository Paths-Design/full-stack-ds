//! Map tab: hand-authored sector plot + markers, generated `Switch` filter
//! rail, anchored marker popover (I2–I4), commander readout.

use gpui::prelude::*;
use gpui::{
    AnyElement, Context, InteractiveElement, IntoElement, ParentElement, Styled, div, px,
};

use super::palette::Colors;
use super::widgets::{action_button, kind_glyph, outline_button, status_color};
use super::{Menu, TagStyle, TextRole};
use game_pause_menu_gpui::seam::MapIcon;

/// Base plot geometry at the 1280×800 window; markers are positioned from the
/// fixture's normalized x/y over these dimensions.
const MAP_W: f32 = 892.0;
const MAP_H: f32 = 560.0;
const PANEL_W: f32 = 324.0;
const MARKER: f32 = 28.0;
const POPOVER_W: f32 = 324.0;

impl Menu {
    pub(crate) fn render_map_tab(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let plot = self.render_map_plot(cx);
        let popover = self.render_marker_popover(cx);
        let field = div()
            .relative()
            .w(px(MAP_W))
            .h(px(MAP_H))
            .child(plot)
            .children(popover);
        let panel = self.render_icon_panel(cx);
        let commander = self.render_commander_readout(cx);
        div()
            .flex()
            .flex_row()
            .items_start()
            .gap(px(16.))
            .h_full()
            .child(field)
            .child(
                div()
                    .w(px(PANEL_W))
                    .h(px(MAP_H))
                    .flex()
                    .flex_col()
                    .gap_3()
                    .overflow_hidden()
                    .child(panel)
                    .child(commander),
            )
            .bg(Colors::paint(colors.ink))
            .into_any_element()
    }

    /// Stylized top-down plot: grid, contour ticks, corner brackets, sector
    /// label and the giant N5 watermark motif from the visual reference.
    fn render_map_plot(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let map = self.state.fixtures().map_icons.clone();
        let visible = self.state.visible_icons().len();
        let total = map.icons.len();

        let mut decorations: Vec<AnyElement> = Vec::new();
        // Grid — NOT FSDS: lane-local map drawing, no Map/Canvas component.
        for step in 1..8 {
            let x = MAP_W * step as f32 / 8.0;
            decorations.push(
                div()
                    .absolute()
                    .top_0()
                    .left(px(x))
                    .w(px(1.))
                    .h_full()
                    .bg(Colors::paint(colors.map_grid))
                    .into_any_element(),
            );
        }
        for step in 1..6 {
            let y = MAP_H * step as f32 / 6.0;
            decorations.push(
                div()
                    .absolute()
                    .left_0()
                    .top(px(y))
                    .h(px(1.))
                    .w_full()
                    .bg(Colors::paint(colors.map_grid))
                    .into_any_element(),
            );
        }
        for step in 0..9 {
            let x = MAP_W * (0.08 + step as f32 * 0.105);
            decorations.push(
                div()
                    .absolute()
                    .left(px(x))
                    .top(px(MAP_H * 0.5 - 4.))
                    .w(px(1.))
                    .h(px(8.))
                    .bg(Colors::paint(colors.map_contour))
                    .into_any_element(),
            );
        }
        // Corner brackets (hairline structure from the Orion graphic grammar).
        let bracket = |top: bool, left: bool| {
            let mut corner = div()
                .absolute()
                .w(px(16.))
                .h(px(16.))
                .border_color(Colors::paint(colors.rule_strong));
            corner = if top { corner.top(px(10.)) } else { corner.bottom(px(10.)) };
            corner = if left { corner.left(px(10.)) } else { corner.right(px(10.)) };
            corner = match (top, left) {
                (true, true) => corner.border_t_1().border_l_1(),
                (true, false) => corner.border_t_1().border_r_1(),
                (false, true) => corner.border_b_1().border_l_1(),
                (false, false) => corner.border_b_1().border_r_1(),
            };
            corner.into_any_element()
        };
        decorations.push(bracket(true, true));
        decorations.push(bracket(true, false));
        decorations.push(bracket(false, true));
        decorations.push(bracket(false, false));

        // NOT FSDS: the giant N5 watermark is lane-local decoration (the
        // generated Text is admitted, but the placement/motif is app chrome).
        let watermark = self.text(cx, "map:watermark", TextRole::Watermark, "N5");
        decorations.push(
            div()
                .absolute()
                .left(px(MAP_W * 0.36))
                .top(px(MAP_H * 0.36))
                .opacity(0.45)
                .child(watermark)
                .into_any_element(),
        );

        let sector_label = self.text(
            cx,
            "map:sector",
            TextRole::MicroSignal,
            format!("{}   ·   SCALE {}", map.sector, map.scale),
        );
        let legend = self.text(
            cx,
            "map:legend",
            TextRole::Micro,
            format!(
                "MARKERS {visible}/{total} VISIBLE   ·   CLICK A MARKER FOR DETAIL   ·   ORANGE = NAV TARGET"
            ),
        );
        decorations.push(
            div()
                .absolute()
                .top(px(12.))
                .left(px(14.))
                .child(sector_label)
                .into_any_element(),
        );
        decorations.push(
            div()
                .absolute()
                .bottom(px(12.))
                .left(px(14.))
                .child(legend)
                .into_any_element(),
        );

        let visible: Vec<MapIcon> = self.state.visible_icons().into_iter().cloned().collect();
        let markers = visible
            .iter()
            .enumerate()
            .map(|(index, icon)| self.render_marker(cx, icon, index))
            .collect::<Vec<AnyElement>>();

        div()
            .id("map-field")
            .size_full()
            .relative()
            .overflow_hidden()
            .bg(Colors::paint(colors.map_ground))
            .border_1()
            .border_color(Colors::paint(colors.rule_strong))
            .children(decorations)
            .children(markers)
            .into_any_element()
    }

    /// NOT FSDS: map markers are app drawing (no Map/Icon component on the
    /// target); shape + monogram encode `kind`, orange encodes the nav target,
    /// the border encodes the fixture status.
    fn render_marker(
        &mut self,
        cx: &mut Context<Self>,
        icon: &MapIcon,
        index: usize,
    ) -> AnyElement {
        let colors = self.colors;
        let nav = self.state.is_nav_target(&icon.id);
        let background = if nav { colors.signal } else { colors.graphite };
        let border = if nav {
            colors.bone_bright
        } else {
            status_color(&icon.status, &colors)
        };
        let glyph_color = if nav { colors.on_signal } else { colors.bone };
        let id = icon.id.clone();
        let left = (icon.x as f32) * MAP_W - MARKER / 2.0;
        let top = (icon.y as f32) * MAP_H - MARKER / 2.0;
        div()
            .id(("map-marker", index))
            .absolute()
            .left(px(left))
            .top(px(top))
            .w(px(MARKER))
            .h(px(MARKER))
            .flex()
            .items_center()
            .justify_center()
            .bg(Colors::paint(background))
            .border_1()
            .border_color(Colors::paint(border))
            .when(nav, |this| this.border_2())
            .cursor_pointer()
            .on_click(cx.listener(move |this, _, _, cx| this.open_marker(&id, cx)))
            .child(
                div()
                    .text_size(px(12.))
                    .font_weight(gpui::FontWeight::BOLD)
                    .text_color(Colors::paint(glyph_color))
                    .child(kind_glyph(&icon.kind)),
            )
            .into_any_element()
    }

    /// I3: anchored popover with the icon's fixture detail and the I4 action.
    fn render_marker_popover(&mut self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let icon = self.state.marker_popover()?.clone();
        let colors = self.colors;
        let nav = self.state.is_nav_target(&icon.id);
        let anchor_x = (icon.x as f32) * MAP_W;
        let anchor_y = (icon.y as f32) * MAP_H;
        let left = if anchor_x + 20.0 + POPOVER_W > MAP_W - 8.0 {
            anchor_x - 20.0 - POPOVER_W
        } else {
            anchor_x + 20.0
        };
        let top = (anchor_y - 48.0).clamp(8.0, MAP_H - 300.0);

        let title = self.text(cx, "popover:title", TextRole::Title, icon.label.clone());
        let close_label = self.text(cx, "popover:close-label", TextRole::MicroBright, "ESC");
        let close = outline_button("popover-close", close_label, colors, cx.listener(|this, _, _, cx| {
            this.close_marker(cx)
        }));
        let status = self.badge(
            cx,
            "popover:status",
            TagStyle::Signal,
            icon.status.clone(),
        );
        let meta = self.text(
            cx,
            "popover:meta",
            TextRole::Micro,
            format!("{}   ·   {:.1} KM", icon.sector, icon.distance_km),
        );
        let detail = self.text(cx, "popover:detail", TextRole::Body, icon.detail.clone());
        let reward = self.text(cx, "popover:reward", TextRole::MicroSignal, icon.reward.clone());
        let divider = self.divider(cx, "divider:popover");
        let action_label = if nav {
            self.text(
                cx,
                "popover:action:active",
                TextRole::MicroBright,
                "ACTIVE NAV TARGET",
            )
        } else {
            self.text(
                cx,
                "popover:action:set",
                TextRole::OnSignal,
                "SET AS NAV TARGET",
            )
        };
        let action_id = icon.id.clone();
        let action = action_button(
            "popover-set-nav",
            action_label,
            !nav,
            colors,
            cx.listener(move |this, _, _, cx| this.set_nav_target(&action_id, cx)),
        );
        let hint = self.text(
            cx,
            "popover:hint",
            TextRole::Micro,
            "SETTING A TARGET UPDATES THE FOOTER AND MARKER HIGHLIGHT",
        );

        Some(
            div()
                .id("marker-popover")
                .absolute()
                .left(px(left))
                .top(px(top))
                .w(px(POPOVER_W))
                .p_4()
                .flex()
                .flex_col()
                .gap_2()
                .bg(Colors::paint(colors.charcoal))
                .border_2()
                .border_color(Colors::paint(colors.signal))
                .child(title)
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_2()
                                .child(status)
                                .child(meta),
                        )
                        .child(close),
                )
                .child(detail)
                .child(reward)
                .child(divider)
                .child(action)
                .child(hint)
                .on_mouse_down(
                    gpui::MouseButton::Left,
                    cx.listener(|_, _, _, cx| cx.stop_propagation()),
                )
                .into_any_element(),
        )
    }

    /// I2: generated `Switch` per fixture icon (the switch is retained at
    /// startup; this section lays the rows out).
    fn render_icon_panel(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let icons = self.state.fixtures().icons().to_vec();
        let visible = self.state.visible_icons().len();
        let rows = icons
            .iter()
            .enumerate()
            .map(|(index, icon)| {
                let switch = self
                    .icon_switches
                    .iter()
                    .find(|(id, _)| id == &icon.id)
                    .map(|(_, switch)| switch.clone())
                    .expect("icon switch retained at startup");
                let label = self.text(
                    cx,
                    format!("icon-row:{}:label", icon.id),
                    TextRole::MicroBright,
                    icon.label.clone(),
                );
                let status = self.badge(
                    cx,
                    format!("icon-row:{}:status", icon.id),
                    TagStyle::Rarity(super::widgets::status_color(&icon.status, &colors)),
                    icon.status.clone(),
                );
                let distance = self.text(
                    cx,
                    format!("icon-row:{}:distance", icon.id),
                    TextRole::Micro,
                    format!("{:.1} KM", icon.distance_km),
                );
                let highlighted = self.state.is_nav_target(&icon.id);
                div()
                    .id(("icon-filter-row", index))
                    .h(px(32.))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_2()
                    .px_2()
                    .bg(Colors::paint(if highlighted {
                        colors.inset
                    } else {
                        colors.charcoal
                    }))
                    .border_l_2()
                    .border_color(Colors::paint(if highlighted {
                        colors.signal
                    } else {
                        colors.charcoal
                    }))
                    .child(switch)
                    .child(div().flex_1().overflow_hidden().child(label))
                    .child(status)
                    .child(distance)
                    .into_any_element()
            })
            .collect::<Vec<_>>();
        super::section(
            self,
            cx,
            "map-icons",
            "ICON FILTERS",
            Some(format!("{visible} OF {} PLOTTED", icons.len())),
            vec![
                div()
                    .flex()
                    .flex_col()
                    .gap(px(2.))
                    .children(rows)
                    .into_any_element(),
            ],
        )
    }

    /// Commander readout owned by the Map tab (spec → Map tab).
    fn render_commander_readout(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let commander = self.state.fixtures().commander.clone();
        let rank = &commander.rank;
        let earnings = &commander.earnings;
        let followers = &commander.followers;
        let rows = vec![
            self.readout_row(cx, "map-rank", "RANK", rank.label.clone()),
            self.readout_row(
                cx,
                "map-level",
                "LEVEL / GLOBAL",
                format!("{:02}  ·  #{:03}", rank.level, rank.global_position),
            ),
            self.stat_readout_row(
                cx,
                "map-earnings",
                "EARNINGS",
                format!("{} {}", format_grouped_u64(earnings.credits), earnings.currency),
                format!("{} PENDING", format_grouped_u64(earnings.pending)),
            ),
            self.stat_readout_row(
                cx,
                "map-followers",
                "FOLLOWERS",
                format_grouped_u64(followers.total),
                format!("{}  {}", followers.trend, followers.period),
            ),
        ];
        super::section(
            self,
            cx,
            "map-commander",
            "COMMANDER READOUT",
            Some(commander.callsign.clone()),
            rows,
        )
    }

    fn readout_row(
        &mut self,
        cx: &mut Context<Self>,
        key: &'static str,
        label: &'static str,
        value: String,
    ) -> AnyElement {
        let label = self.text(cx, format!("map:{key}:label"), TextRole::Micro, label);
        let value = self.text(cx, format!("map:{key}:value"), TextRole::Value, value);
        div()
            .h(px(24.))
            .flex()
            .flex_row()
            .items_center()
            .justify_between()
            .child(div().flex_none().child(label))
            .child(div().flex_none().child(value))
            .into_any_element()
    }

    fn stat_readout_row(
        &mut self,
        cx: &mut Context<Self>,
        key: &'static str,
        label: &'static str,
        value: String,
        caption: String,
    ) -> AnyElement {
        let label = self.text(cx, format!("map:{key}:label"), TextRole::Micro, label);
        let value = self.stat(cx, format!("map:{key}:stat"), "sm", value);
        let caption = self.text(cx, format!("map:{key}:caption"), TextRole::Micro, caption);
        div()
            .flex()
            .flex_row()
            .items_end()
            .justify_between()
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap(px(1.))
                    .w(px(170.))
                    .flex_none()
                    .child(div().w_full().child(label))
                    .child(div().w_full().child(caption)),
            )
            .child(div().flex_none().child(value))
            .into_any_element()
    }
}

fn format_grouped_u64(value: u64) -> String {
    game_pause_menu_gpui::seam::format_grouped(value)
}
