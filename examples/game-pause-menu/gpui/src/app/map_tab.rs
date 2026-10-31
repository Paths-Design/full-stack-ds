//! MAP tab: shared sector plot + markers, icon-visibility switch panel,
//! anchored marker popover (I2–I4). Geometry from `parity-layout.json`; the
//! plot/marker/popover drawing is hand-authored (no Map/Popover/Icon component
//! on the GPUI target) and ledgered in the README.

use gpui::{div, px, AnyElement, Context, IntoElement, ParentElement, Styled, prelude::*};

use game_pause_menu_gpui::seam::{MapIcon, Rect};

use super::{colors, style, widgets, Menu};

/// `parity.md` → MAP: the field is drawn on a 60 px grid.
const MAP_GRID: f32 = 60.0;

impl Menu {
    pub(crate) fn render_map_tab(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let layout = self.layout.clone();
        let border = layout.style.panel_border;
        let padding = layout.panels.padding;
        let header_h = layout.panels.header_height;
        let title_size = layout.type_scale.panel_title;
        let meta_size = layout.type_scale.panel_meta;
        let mut children: Vec<AnyElement> = Vec::new();

        // -- Map panel chrome ------------------------------------------
        let map_panel = layout.map.map_panel;
        children.push(widgets::panel(&layout, map_panel).into_any_element());
        children.push(self.text_at(
            cx,
            "map:title",
            style::panel_title(&layout.type_scale),
            &layout.colors.bone_bright,
            layout.map.map_title.text.clone(),
            map_panel.x + padding,
            map_panel.y + (header_h - title_size) / 2.0,
        ));
        children.push(self.text_right(
            cx,
            "map:title-meta",
            style::panel_meta(&layout.type_scale),
            &layout.colors.muted,
            layout.map.map_title.meta.clone(),
            Rect {
                x: map_panel.right() - padding - 240.0,
                y: map_panel.y + (header_h - meta_size) / 2.0,
                w: 240.0,
                h: header_h,
            },
        ));
        children.push(self.rule(
            cx,
            "rule:map-header",
            Rect {
                x: map_panel.x,
                y: map_panel.y + header_h,
                w: map_panel.w,
                h: border,
            },
        ));

        // -- Field + grid + corner ticks -------------------------------
        let field = layout.map.field;
        children.push(
            widgets::rect_box(field)
                .bg(colors::paint(&layout.colors.sage))
                .into_any_element(),
        );
        let mut grid_x = field.x + MAP_GRID;
        while grid_x < field.right() {
            children.push(
                div()
                    .absolute()
                    .left(px(grid_x))
                    .top(px(field.y))
                    .w(px(1.))
                    .h(px(field.h))
                    .bg(colors::paint(&layout.colors.ink))
                    .opacity(0.12)
                    .into_any_element(),
            );
            grid_x += MAP_GRID;
        }
        let mut grid_y = field.y + MAP_GRID;
        while grid_y < field.bottom() {
            children.push(
                div()
                    .absolute()
                    .left(px(field.x))
                    .top(px(grid_y))
                    .w(px(field.w))
                    .h(px(1.))
                    .bg(colors::paint(&layout.colors.ink))
                    .opacity(0.12)
                    .into_any_element(),
            );
            grid_y += MAP_GRID;
        }
        let tick = layout.map.field_corner_ticks;
        for (offset_x, offset_y) in [
            (0.0, 0.0),
            (field.w - tick, 0.0),
            (0.0, field.h - tick),
            (field.w - tick, field.h - tick),
        ] {
            children.push(
                div()
                    .absolute()
                    .left(px(field.x + offset_x))
                    .top(px(field.y + offset_y))
                    .w(px(tick))
                    .h(px(tick))
                    .border_1()
                    .border_color(colors::paint(&layout.colors.moss))
                    .into_any_element(),
            );
        }

        // -- Markers (only icons whose visibility switch is on) --------
        let icons = self.state.fixtures().icons().to_vec();
        let marker_size = layout.map.marker.size;
        let visible: Vec<MapIcon> = self.state.visible_icons().into_iter().cloned().collect();
        for icon in visible {
            let index = icons.iter().position(|candidate| candidate.id == icon.id).unwrap_or(0);
            let kind_color = layout
                .marker_colors
                .get(&icon.kind)
                .cloned()
                .unwrap_or_else(|| "muted".to_string());
            let monogram = layout
                .marker_monograms
                .get(&icon.kind)
                .cloned()
                .unwrap_or_else(|| "?".to_string());
            let marker_rect = Rect {
                x: field.x + (icon.x as f32) * field.w - marker_size / 2.0,
                y: field.y + (icon.y as f32) * field.h - marker_size / 2.0,
                w: marker_size,
                h: marker_size,
            };
            let nav_target = self.state.is_nav_target(&icon.id);
            let content = widgets::marker_square(&layout, marker_size, &kind_color, &monogram, nav_target);
            let id = icon.id.clone();
            children.push(
                widgets::at(marker_rect.x, marker_rect.y, marker_rect.w, marker_rect.h)
                    .id(("map-marker-hit", index))
                    .flex()
                    .cursor_pointer()
                    .on_click(cx.listener(move |this, _, _, cx| this.open_marker(&id, cx)))
                    .child(content)
                    .into_any_element(),
            );
        }
        children.push(self.text_at(
            cx,
            "map:field-note",
            style::micro(&layout.type_scale),
            &layout.colors.ink,
            layout.map.field_note.text.clone(),
            layout.map.field_note.x,
            field.bottom() + layout.map.field_note.y_offset_from_field_bottom,
        ));

        // -- Icon visibility panel -------------------------------------
        let icon_panel = layout.map.icon_panel;
        children.push(widgets::panel(&layout, icon_panel).into_any_element());
        children.push(self.text_at(
            cx,
            "map:icon-title",
            style::panel_title(&layout.type_scale),
            &layout.colors.bone_bright,
            layout.map.icon_panel_title.clone(),
            icon_panel.x + padding,
            icon_panel.y + (header_h - title_size) / 2.0,
        ));
        children.push(self.text_right(
            cx,
            "map:icon-meta",
            style::panel_meta(&layout.type_scale),
            &layout.colors.muted,
            layout.map.icon_panel_meta.clone(),
            Rect {
                x: icon_panel.right() - padding - 200.0,
                y: icon_panel.y + (header_h - meta_size) / 2.0,
                w: 200.0,
                h: header_h,
            },
        ));
        children.push(self.rule(
            cx,
            "rule:icon-header",
            Rect {
                x: icon_panel.x,
                y: icon_panel.y + header_h,
                w: icon_panel.w,
                h: border,
            },
        ));
        let rows = layout.map.icon_rows.clone();
        for (index, icon) in icons.iter().enumerate() {
            let row_y = rows.first_y + index as f32 * rows.row_h;
            children.push(self.render_icon_row(cx, icon, index, row_y));
            children.push(self.rule(
                cx,
                icon_row_rule_key(index),
                Rect {
                    x: rows.x,
                    y: row_y + rows.row_h - border,
                    w: rows.width,
                    h: border,
                },
            ));
        }
        children.push(self.text_at(
            cx,
            "map:icon-panel-note",
            style::micro(&layout.type_scale),
            &layout.colors.muted,
            layout.map.icon_panel_note.text.clone(),
            layout.map.icon_panel_note.x,
            layout.map.icon_panel_note.y,
        ));

        if let Some(popover) = self.render_marker_popover(cx) {
            children.push(popover);
        }
        div().children(children).into_any_element()
    }

    fn render_icon_row(
        &mut self,
        cx: &mut Context<Self>,
        icon: &MapIcon,
        index: usize,
        row_y: f32,
    ) -> AnyElement {
        let layout = self.layout.clone();
        let _ = &layout.map;
        let rows = layout.map.icon_rows.clone();
        let kind_color = layout
            .marker_colors
            .get(&icon.kind)
            .cloned()
            .unwrap_or_else(|| "muted".to_string());
        let monogram = layout
            .marker_monograms
            .get(&icon.kind)
            .cloned()
            .unwrap_or_else(|| "?".to_string());
        let glyph_size = rows.icon_size;
        // NOT FSDS: no Icon component on the target — 16 px kind glyph chip.
        // NOT FSDS: no Icon component — a 16 px line glyph: transparent
        // interior, kind-colour edge marks, so the panel ground shows through.
        let _ = (&monogram, &kind_color);
        let glyph = div()
            .absolute()
            .left(px(0.))
            .top(px((rows.row_h - glyph_size) / 2.0))
            .w(px(glyph_size))
            .h(px(glyph_size))
            .border(px(1.))
            .border_color(colors::paint(&layout.color("ruleStrong")))
            .child(
                div()
                    .absolute()
                    .left(px(4.))
                    .top(px(4.))
                    .w(px(glyph_size - 8.0))
                    .h(px(glyph_size - 8.0))
                    .bg(colors::paint(&layout.color("graphite"))),
            );
        // Child coordinates are row-relative; the JSON row helpers give
        // canvas x positions, so subtract the row origin.
        let name = self.text_at(
            cx,
            format!("icon-row:{}:name", icon.id),
            style::row_label(&layout.type_scale),
            &layout.colors.bone_bright,
            icon.label.clone(),
            rows.name_x - rows.x,
            rows.name_y,
        );
        let sub = self.text_at(
            cx,
            format!("icon-row:{}:sub", icon.id),
            style::row_sub(&layout.type_scale),
            &layout.colors.muted,
            format!("{} · {:.1} KM", icon.status, icon.distance_km),
            rows.name_x - rows.x,
            rows.sub_y,
        );
        let visible = self.state.icon_visible(&icon.id);
        let switch = self
            .icon_switches
            .iter()
            .find(|(id, _)| id == &icon.id)
            .map(|(_, pair)| Menu::switch_for(pair, visible));
        let mut row = widgets::at(0.0, 0.0, rows.width, rows.row_h)
            .id(("icon-row", index))
            .child(glyph)
            .child(name)
            .child(sub);
        if let Some(switch) = switch {
            row = row.child(
                div()
                    .absolute()
                    .left(px(rows.switch_x - rows.x))
                    .top(px(rows.switch_y))
                    .w(px(layout.switch.width))
                    .h(px(layout.switch.height))
                    .flex()
                    .flex_col()
                    .items_start()
                    .child(switch),
            );
        }
        widgets::at(rows.x, row_y, rows.width, rows.row_h)
            .child(row)
            .into_any_element()
    }

    /// I3: anchored popover with the selected marker's detail and the I4 action.
    fn render_marker_popover(&mut self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let icon = self.state.marker_popover()?.clone();
        let layout = self.layout.clone();
        let popover = layout.map.popover.clone();
        let rect = Rect {
            x: popover.x,
            y: popover.y,
            w: popover.w,
            h: popover.h,
        };
        let border = layout.style.panel_border;
        let padding = layout.panels.padding;
        let nav = self.state.is_nav_target(&icon.id);
        let stat_value = layout.type_scale.stat_value;

        let title = self.text_at(
            cx,
            "popover:title",
            style::stat_value(&layout.type_scale),
            &layout.colors.bone_bright,
            popover.title.clone(),
            padding,
            padding,
        );
        let status = self.badge(
            cx,
            "popover:status",
            style::STATUS_CHIP.font,
            style::STATUS_CHIP.weight,
            &layout.colors.bone_bright,
            icon.status.clone(),
        );
        let status_chip = widgets::chip_surface(
            &layout,
            Rect {
                x: padding,
                y: padding + stat_value + 10.0,
                w: 76.0,
                h: style::STATUS_CHIP.height,
            },
            Some("graphite"),
            Some(("ruleStrong", border)),
        )
        .child(status);
        let meta = self.text_at(
            cx,
            "popover:meta",
            style::card_size(&layout.type_scale),
            &layout.colors.muted,
            format!("{} · {:.1} KM", icon.sector, icon.distance_km),
            padding + 88.0,
            padding + stat_value + 13.0,
        );
        let detail = self.text_box(
            cx,
            "popover:detail",
            style::copy(&layout.type_scale),
            &layout.colors.bone,
            icon.detail.clone(),
            Rect {
                x: padding,
                y: padding + stat_value + 46.0,
                w: rect.w - padding * 2.0,
                h: 62.0,
            },
        );
        let reward = self.text_at(
            cx,
            "popover:reward",
            style::micro(&layout.type_scale),
            &layout.colors.signal_hot,
            icon.reward.clone(),
            padding,
            rect.h - padding - 32.0 - 26.0,
        );
        let action_height = 32.0;
        let action_label = if nav {
            self.text(
                cx,
                "popover:action:active",
                style::button_primary(),
                &layout.colors.muted,
                "ACTIVE NAV TARGET",
            )
        } else {
            self.text(
                cx,
                "popover:action:set",
                style::button_primary(),
                &layout.colors.on_signal,
                popover.action.clone(),
            )
        };
        let action_id = icon.id.clone();
        let action = widgets::at(
            padding,
            rect.h - padding - action_height,
            rect.w - padding * 2.0,
            action_height,
        )
        .child(widgets::primary_button(
            "popover-set-nav",
            action_label,
            rect.w - padding * 2.0,
            action_height,
            &layout,
            !nav,
            cx.listener(move |this, _, _, cx| this.set_nav_target(&action_id, cx)),
        ));
        let close_label = self.text(
            cx,
            "popover:close",
            style::button_tiny(),
            &layout.colors.bone_bright,
            popover.cancel.clone(),
        );
        let close = widgets::at(rect.w - padding - 64.0, padding, 64.0, 26.0).child(
            widgets::outline_button(
                "popover-close",
                close_label,
                64.0,
                26.0,
                &layout,
                cx.listener(|this, _, _, cx| this.close_marker(cx)),
            ),
        );
        Some(
            widgets::rect_box(rect)
                .bg(colors::paint(&layout.colors.charcoal))
                .border_1()
                .border_color(colors::paint(&layout.color("ruleStrong")))
                .child(title)
                .child(status_chip)
                .child(meta)
                .child(detail)
                .child(reward)
                .child(action)
                .child(close)
                .into_any_element(),
        )
    }
}

fn icon_row_rule_key(index: usize) -> &'static str {
    const KEYS: [&str; 8] = [
        "rule:icon-row-0",
        "rule:icon-row-1",
        "rule:icon-row-2",
        "rule:icon-row-3",
        "rule:icon-row-4",
        "rule:icon-row-5",
        "rule:icon-row-6",
        "rule:icon-row-7",
    ];
    KEYS[index.min(7)]
}
