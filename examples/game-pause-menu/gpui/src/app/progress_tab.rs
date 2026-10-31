//! PROGRESS tab: faction roster + paper dossier drawer (I5/I6/I15). Geometry
//! from `parity-layout.json`; the drawer/rows are hand-authored (no Drawer/List
//! component on the GPUI target), with generated Text/Badge/Divider inside.

use gpui::{div, px, AnyElement, Context, IntoElement, ParentElement, Styled, prelude::*};

use game_pause_menu_gpui::seam::{Faction, Rect, format_grouped};

use super::{colors, style, widgets, Menu};

impl Menu {
    pub(crate) fn render_progress_tab(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let layout = self.layout.clone();
        let border = layout.style.panel_border;
        let title_size = layout.type_scale.panel_title;
        let meta_size = layout.type_scale.panel_meta;
        let padding = layout.panels.padding;
        let header_h = layout.panels.header_height;
        let list_panel = layout.progress.list_panel;
        let mut children: Vec<AnyElement> = Vec::new();

        children.push(widgets::panel(&layout, list_panel).into_any_element());
        children.push(self.text_at(
            cx,
            "progress:title",
            style::panel_title(&layout.type_scale),
            &layout.colors.bone_bright,
            layout.progress.list_title.clone(),
            list_panel.x + padding,
            list_panel.y + (header_h - title_size) / 2.0,
        ));
        children.push(self.text_right(
            cx,
            "progress:meta",
            style::panel_meta(&layout.type_scale),
            &layout.colors.muted,
            layout.progress.list_meta.clone(),
            Rect {
                x: list_panel.right() - padding - 280.0,
                y: list_panel.y + (header_h - meta_size) / 2.0,
                w: 280.0,
                h: header_h,
            },
        ));
        children.push(self.rule(
            cx,
            "rule:progress-header",
            Rect {
                x: list_panel.x,
                y: list_panel.y + header_h,
                w: list_panel.w,
                h: border,
            },
        ));

        let factions = self.state.fixtures().factions.clone();
        let rows = layout.progress.rows.clone();
        for (index, faction) in factions.iter().enumerate() {
            let row_y = rows.first_y + index as f32 * rows.row_h;
            children.push(self.render_faction_row(cx, faction, index, row_y));
            children.push(self.rule(
                cx,
                faction_row_rule_key(index),
                Rect {
                    x: rows.x,
                    y: row_y + rows.row_h - border,
                    w: rows.width,
                    h: border,
                },
            ));
        }

        if let Some(drawer) = self.render_faction_drawer(cx) {
            children.push(drawer);
        }
        div().children(children).into_any_element()
    }

    fn render_faction_row(
        &mut self,
        cx: &mut Context<Self>,
        faction: &Faction,
        index: usize,
        row_y: f32,
    ) -> AnyElement {
        let layout = self.layout.clone();
        let rows = layout.progress.rows.clone();
        let border = layout.style.panel_border;
        let unlocked = faction.unlocked;
        let accent = if unlocked { "signal" } else { "alert" };
        let name = self.text_at(
            cx,
            format!("faction:{}:name", faction.id),
            style::row_label(&layout.type_scale),
            &layout.colors.bone_bright,
            faction.name.clone(),
            rows.name_x - rows.x,
            rows.name_y,
        );
        let tagline = self.text_at(
            cx,
            format!("faction:{}:tagline", faction.id),
            style::row_sub(&layout.type_scale),
            &layout.colors.muted,
            faction.tagline.clone(),
            rows.name_x - rows.x,
            rows.tagline_y,
        );
        let rep_label = format!(
            "REPUTATION {} / {}",
            faction.reputation, faction.reputation_max
        );
        let rep_text = self.text_right(
            cx,
            format!("faction:{}:rep-label", faction.id),
            style::row_sub(&layout.type_scale),
            &layout.colors.muted,
            rep_label,
            Rect {
                x: rows.rep_bar_x - rows.x - 200.0,
                y: rows.rep_bar_y - 12.0,
                w: 192.0,
                h: 12.0,
            },
        );
        let fraction = if faction.reputation_max == 0 {
            0.0
        } else {
            faction.reputation as f32 / faction.reputation_max as f32
        };
        // NOT FSDS: no Progress component — 200x6 reputation bar.
        let rep_bar = div()
            .absolute()
            .left(px(rows.rep_bar_x - rows.x))
            .top(px(rows.rep_bar_y))
            .w(px(rows.rep_bar_w))
            .h(px(rows.rep_bar_h))
            .bg(colors::paint(&layout.colors.graphite))
            .child(
                div()
                    .h_full()
                    .w(px(rows.rep_bar_w * fraction.clamp(0.0, 1.0)))
                    .bg(colors::paint(&layout.colors.sage)),
            );
        let status_label = if unlocked { "ACCESS" } else { "LOCKED" };
        let status_text_color = if unlocked {
            layout.colors.on_signal.clone()
        } else {
            layout.colors.alert.clone()
        };
        let status = self.badge(
            cx,
            format!("faction:{}:status", faction.id),
            style::STATUS_CHIP.font,
            style::STATUS_CHIP.weight,
            &status_text_color,
            status_label,
        );
        let status_chip = widgets::chip_surface(
            &layout,
            Rect {
                x: rows.status_x - rows.x,
                y: rows.status_y,
                w: rows.status_w,
                h: rows.status_h,
            },
            if unlocked { Some("signal") } else { None },
            if unlocked {
                None
            } else {
                Some(("alert", border))
            },
        )
        .child(status);
        let dossier = self.text_at(
            cx,
            format!("faction:{}:dossier", faction.id),
            style::micro(&layout.type_scale),
            &layout.colors.muted,
            rows.dossier_text.clone(),
            rows.dossier_x - rows.x,
            rows.dossier_y,
        );
        let faction_id = faction.id.clone();
        let row = widgets::at(0.0, 0.0, rows.width, rows.row_h)
            .id(("faction-row", index))
            .cursor_pointer()
            .on_click(cx.listener(move |this, _, _, cx| this.open_faction(&faction_id, cx)))
            .child(
                div()
                    .absolute()
                    .left(px(0.))
                    .top(px(0.))
                    .w(px(rows.accent_w))
                    .h(px(rows.row_h))
                    .bg(colors::paint(&layout.color(accent))),
            )
            .child(name)
            .child(tagline)
            .child(rep_text)
            .child(rep_bar)
            .child(status_chip)
            .child(dossier);
        widgets::at(rows.x, row_y, rows.width, rows.row_h)
            .child(row)
            .into_any_element()
    }

    /// I5/I6/I15: paper dossier drawer overlaying the left side of the roster.
    fn render_faction_drawer(&mut self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let faction = self.state.faction_drawer()?.clone();
        let layout = self.layout.clone();
        let drawer = layout.progress.drawer.clone();
        let rect = drawer.rect;
        let padding = drawer.padding;
        let border = layout.style.panel_border;
        let inner_w = rect.w - padding * 2.0;
        let top = rect.y;
        let rel = |canvas_y: f32| canvas_y - top;

        let eyebrow = self.text_at(
            cx,
            "drawer:eyebrow",
            style::micro(&layout.type_scale),
            &layout.colors.paper_muted,
            "FACTION DOSSIER",
            padding,
            rel(drawer.header_y),
        );
        let close_label = self.text(
            cx,
            "drawer:close-label",
            style::button_tiny(),
            &layout.colors.ink,
            "CLOSE",
        );
        // NOT FSDS: paper-ground outline control (secondary button on paper).
        let close = div()
            .id(("drawer-close", 0usize))
            .absolute()
            .left(px(rect.w - padding - drawer.close.w))
            .top(px(rel(drawer.close.y)))
            .w(px(drawer.close.w))
            .h(px(drawer.close.h))
            .flex()
            .items_center()
            .justify_center()
            .border_1()
            .border_color(colors::paint(&layout.colors.paper_muted))
            .cursor_pointer()
            .on_click(cx.listener(|this, _, _, cx| this.close_faction(cx)))
            .child(close_label)
            .into_any_element();
        let title = self.text_at(
            cx,
            "drawer:title",
            style::drawer_title(),
            &layout.colors.ink,
            faction.name.clone(),
            padding,
            rel(drawer.title_y),
        );
        let tagline = self.text_at(
            cx,
            "drawer:tagline",
            style::copy(&layout.type_scale),
            &layout.colors.paper_muted,
            faction.tagline.clone(),
            padding,
            rel(drawer.tagline_y),
        );
        let rule = self.rule(
            cx,
            "rule:drawer-title",
            Rect {
                x: padding,
                y: rel(drawer.rule_y),
                w: inner_w,
                h: border,
            },
        );
        let brief_label = self.text_at(
            cx,
            "drawer:brief-label",
            style::micro(&layout.type_scale),
            &layout.colors.paper_muted,
            "BRIEF",
            padding,
            rel(drawer.brief_label_y),
        );
        let brief = self.text_box(
            cx,
            "drawer:brief",
            style::body(&layout.type_scale),
            &layout.colors.ink,
            faction.detail.description.clone(),
            Rect {
                x: padding,
                y: rel(drawer.brief_body_y),
                w: inner_w,
                h: 50.0,
            },
        );
        let history_label = self.text_at(
            cx,
            "drawer:history-label",
            style::micro(&layout.type_scale),
            &layout.colors.paper_muted,
            "HISTORY",
            padding,
            rel(drawer.history_label_y),
        );
        let history = self.text_box(
            cx,
            "drawer:history",
            style::body(&layout.type_scale),
            &layout.colors.ink,
            faction.detail.history.clone(),
            Rect {
                x: padding,
                y: rel(drawer.history_body_y),
                w: inner_w,
                h: 44.0,
            },
        );
        let perks_label = self.text_at(
            cx,
            "drawer:perks-label",
            style::micro(&layout.type_scale),
            &layout.colors.paper_muted,
            "PERKS",
            padding,
            rel(drawer.perks_label_y),
        );
        let mut perk_children: Vec<AnyElement> = vec![perks_label];
        for (index, perk) in faction.detail.perks.iter().enumerate() {
            perk_children.push(self.text_at(
                cx,
                format!("drawer:perk:{index}"),
                style::drawer_micro(),
                &layout.colors.ink,
                format!("—  {perk}"),
                padding,
                rel(drawer.perks_y) + index as f32 * 18.0,
            ));
        }
        let parts_label = self.text_at(
            cx,
            "drawer:parts-label",
            style::micro(&layout.type_scale),
            &layout.colors.paper_muted,
            "PARTS",
            padding,
            rel(drawer.parts_label_y),
        );
        perk_children.push(parts_label);
        let columns = [padding, padding + 300.0, padding + 360.0, padding + 452.0];
        for (label, x) in ["PART", "COST", "RARITY", "SIZE"]
            .into_iter()
            .zip(columns)
        {
            perk_children.push(self.text_at(
                cx,
                format!("drawer:parts-header:{label}"),
                style::micro(&layout.type_scale),
                &layout.colors.paper_muted,
                label,
                x,
                rel(drawer.parts_header_y),
            ));
        }
        for (index, part) in faction.detail.parts.iter().enumerate() {
            let row_y = rel(drawer.part_row_y) + index as f32 * drawer.part_row_h;
            perk_children.push(self.text_at(
                cx,
                format!("drawer:part:{index}:name"),
                style::drawer_micro(),
                &layout.colors.ink,
                part.name.clone(),
                padding,
                row_y,
            ));
            perk_children.push(self.text_at(
                cx,
                format!("drawer:part:{index}:cost"),
                style::drawer_micro(),
                &layout.colors.ink,
                format!("{} CR", format_grouped(part.cost)),
                columns[1],
                row_y,
            ));
            let rarity_role = layout
                .rarity_colors
                .get(&part.rarity)
                .cloned()
                .unwrap_or_else(|| "muted".to_string());
            let text_role = layout
                .rarity_text_colors
                .get(&part.rarity)
                .cloned()
                .unwrap_or_else(|| "ink".to_string());
            let rarity = self.badge(
                cx,
                format!("drawer:part:{index}:rarity"),
                style::RARITY_CHIP.font,
                style::RARITY_CHIP.weight,
                &layout.color(&text_role),
                part.rarity.to_uppercase(),
            );
            perk_children.push(
                widgets::chip_surface(
                    &layout,
                    Rect {
                        x: columns[2],
                        y: row_y - 1.0,
                        w: layout.abilities.cards.rarity_chip.w,
                        h: layout.abilities.cards.rarity_chip.h,
                    },
                    Some(&rarity_role),
                    None,
                )
                .child(rarity)
                .into_any_element(),
            );
            perk_children.push(self.text_at(
                cx,
                format!("drawer:part:{index}:size"),
                style::drawer_micro(),
                &layout.colors.ink,
                format!("S{}", part.size),
                columns[3],
                row_y,
            ));
        }

        let unlocked = faction.unlocked;
        let shop_label = self.text(
            cx,
            if unlocked {
                "drawer:shop:label"
            } else {
                "drawer:shop:label-locked"
            },
            style::button_primary(),
            &layout.color(if unlocked { "onSignal" } else { "muted" }),
            "SHOP PARTS",
        );
        let shop = widgets::at(
            padding,
            rel(drawer.shop_button.y),
            drawer.shop_button.w,
            drawer.shop_button.h,
        )
        .child(widgets::primary_button(
            "drawer-shop",
            shop_label,
            drawer.shop_button.w,
            drawer.shop_button.h,
            &layout,
            unlocked,
            cx.listener(|_, _, _, cx| cx.stop_propagation()),
        ));
        let requirement = if unlocked {
            String::new()
        } else {
            format!("UNLOCK · {}", faction.requirement)
        };
        let caption = self.text_at(
            cx,
            "drawer:shop-caption",
            style::micro(&layout.type_scale),
            &layout.color(if unlocked { "paperMuted" } else { "alert" }),
            requirement,
            padding + drawer.shop_button.w + 16.0,
            rel(drawer.shop_caption_y),
        );

        let mut body: Vec<AnyElement> = vec![
            eyebrow,
            close,
            title,
            tagline,
            rule,
            brief_label,
            brief,
            history_label,
            history,
        ];
        body.extend(perk_children);
        body.push(shop.into_any_element());
        body.push(caption);
        Some(
            widgets::rect_box(rect)
                .bg(colors::paint(&layout.colors.paper))
                .border_1()
                .border_color(colors::paint(&layout.colors.rule_strong))
                .children(body)
                .into_any_element(),
        )
    }
}

fn faction_row_rule_key(index: usize) -> &'static str {
    const KEYS: [&str; 5] = [
        "rule:faction-row-0",
        "rule:faction-row-1",
        "rule:faction-row-2",
        "rule:faction-row-3",
        "rule:faction-row-4",
    ];
    KEYS[index.min(4)]
}

