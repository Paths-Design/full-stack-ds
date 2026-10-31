//! ABILITIES tab: 5x2 rarity-tagged card grid, hover popover (I7/I10), detail
//! panel and 2x3 vehicle loadout with compatible-slot highlighting, install and
//! reject states (I8/I9). Geometry from `parity-layout.json`.

use gpui::{div, px, AnyElement, Context, IntoElement, ParentElement, Styled, prelude::*};

use game_pause_menu_gpui::seam::{Ability, Rect};

use super::{colors, style, widgets, Menu};

impl Menu {
    pub(crate) fn render_abilities_tab(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let layout = self.layout.clone();
        let border = layout.style.panel_border;
        let padding = layout.panels.padding;
        let header_h = layout.panels.header_height;
        let title_size = layout.type_scale.panel_title;
        let meta_size = layout.type_scale.panel_meta;
        let mut children: Vec<AnyElement> = Vec::new();

        // -- Grid panel ------------------------------------------------
        let grid_panel = layout.abilities.grid_panel;
        children.push(widgets::panel(&layout, grid_panel).into_any_element());
        children.push(self.text_at(
            cx,
            "abilities:grid-title",
            style::panel_title(&layout.type_scale),
            &layout.colors.bone_bright,
            layout.abilities.grid_title.clone(),
            grid_panel.x + padding,
            grid_panel.y + (header_h - title_size) / 2.0,
        ));
        children.push(self.text_right(
            cx,
            "abilities:grid-meta",
            style::panel_meta(&layout.type_scale),
            &layout.colors.muted,
            layout.abilities.grid_meta.clone(),
            Rect {
                x: grid_panel.right() - padding - 320.0,
                y: grid_panel.y + (header_h - meta_size) / 2.0,
                w: 320.0,
                h: header_h,
            },
        ));
        children.push(self.rule(
            cx,
            "rule:abilities-header",
            Rect {
                x: grid_panel.x,
                y: grid_panel.y + header_h,
                w: grid_panel.w,
                h: border,
            },
        ));

        let catalog = self.state.fixtures().ability_catalog().to_vec();
        let cards = layout.abilities.cards.clone();
        for (index, ability) in catalog.iter().enumerate() {
            let column = index as f32 % cards.cols as f32;
            let row = (index as f32 / cards.cols as f32).floor();
            let rect = Rect {
                x: cards.x + column * (cards.w + cards.col_gap),
                y: cards.first_y + row * (cards.h + cards.row_gap),
                w: cards.w,
                h: cards.h,
            };
            children.push(self.render_ability_card(cx, ability, index, rect));
        }

        // -- Detail panel ---------------------------------------------
        let detail_panel = layout.abilities.detail_panel;
        children.push(widgets::panel(&layout, detail_panel).into_any_element());
        children.push(self.text_at(
            cx,
            "abilities:detail-title",
            style::panel_title(&layout.type_scale),
            &layout.colors.bone_bright,
            layout.abilities.detail_title.clone(),
            detail_panel.x + padding,
            detail_panel.y + (header_h - title_size) / 2.0,
        ));
        let compatible = self.state.compatible_slot_ids().len();
        children.push(self.text_right(
            cx,
            "abilities:detail-meta",
            style::panel_meta(&layout.type_scale),
            &layout.colors.muted,
            format!("{compatible} COMPATIBLE SLOTS"),
            Rect {
                x: detail_panel.right() - padding - 280.0,
                y: detail_panel.y + (header_h - meta_size) / 2.0,
                w: 280.0,
                h: header_h,
            },
        ));
        children.push(self.rule(
            cx,
            "rule:abilities-detail-header",
            Rect {
                x: detail_panel.x,
                y: detail_panel.y + header_h,
                w: detail_panel.w,
                h: border,
            },
        ));
        children.extend(self.render_ability_detail(cx));

        if let Some(popover) = self.render_ability_hover(cx) {
            children.push(popover);
        }
        div().children(children).into_any_element()
    }

    fn render_ability_card(
        &mut self,
        cx: &mut Context<Self>,
        ability: &Ability,
        index: usize,
        rect: Rect,
    ) -> AnyElement {
        let layout = self.layout.clone();
        let cards = layout.abilities.cards.clone();
        let selected = self.state.pending_ability_id() == Some(ability.id.as_str());
        let installed = self.state.ability_installed(&ability.id);
        let rarity_role = layout
            .rarity_colors
            .get(&ability.rarity)
            .cloned()
            .unwrap_or_else(|| "muted".to_string());
        let rarity_text_role = layout
            .rarity_text_colors
            .get(&ability.rarity)
            .cloned()
            .unwrap_or_else(|| "ink".to_string());
        let rarity_label = self.badge(
            cx,
            format!("ability:{}:rarity", ability.id),
            style::RARITY_CHIP.font,
            style::RARITY_CHIP.weight,
            &layout.color(&rarity_text_role),
            ability.rarity.to_uppercase(),
        );
        let rarity_chip = widgets::at(
            cards.rarity_chip.x,
            cards.rarity_chip.y,
            cards.rarity_chip.w,
            cards.rarity_chip.h,
        )
        .child(
            widgets::chip_surface(
                &layout,
                Rect {
                    x: 0.0,
                    y: 0.0,
                    w: cards.rarity_chip.w,
                    h: cards.rarity_chip.h,
                },
                Some(&rarity_role),
                None,
            )
            .child(rarity_label),
        );
        // NOT FSDS: no Icon component. Parity pins ability-card art to a
        // 40 px code tile (`iconArt.cardTile`), two letters of the ability name.
        let tile = layout.icon_art.card_tile.clone();
        let code = game_pause_menu_gpui::seam::parity::code_two_letters(&ability.name);
        let code_text = self.text(
            cx,
            format!("ability:{}:code", ability.id),
            style::TextStyleSpec::new(
                tile.font_size,
                style::Weight::from_numeric(tile.weight),
                1.0,
            ),
            &layout.color(&tile.text),
            code,
        );
        let glyph = div()
            .absolute()
            .left(px((rect.w - tile.size) / 2.0))
            .top(px(cards.icon_y))
            .w(px(tile.size))
            .h(px(tile.size))
            .flex()
            .items_center()
            .justify_center()
            .bg(colors::paint(&layout.color(&tile.background)))
            .border(px(tile.border_width))
            .border_color(colors::paint(&layout.color(&tile.border)))
            .child(code_text);
        let name = self.text(
            cx,
            format!("ability:{}:name", ability.id),
            style::card_name(&layout.type_scale),
            &layout.colors.bone_bright,
            ability.name.clone(),
        );
        let name_box = widgets::at(0.0, cards.name_y, rect.w, 16.0)
            .flex()
            .justify_center()
            .child(name);
        let size_text = self.text(
            cx,
            format!("ability:{}:size", ability.id),
            style::card_size(&layout.type_scale),
            &layout.colors.muted,
            format!("SIZE {}", ability.size),
        );
        let size_row = widgets::at(0.0, cards.size_y, rect.w, 12.0)
            .flex()
            .flex_row()
            .items_center()
            .justify_center()
            .gap(px(6.))
            .child(widgets::size_pips(&layout, ability.size, 8.0))
            .child(size_text);
        let id = ability.id.clone();
        let hover_id = ability.id.clone();
        let mut card = widgets::rect_box(rect)
            .id(("ability-card", index))
            .bg(colors::paint(&layout.colors.charcoal))
            .border_1()
            .border_color(colors::paint(if selected {
                layout.color("signal")
            } else {
                layout.color("rule")
            }))
            .when(selected, |this| this.border_2())
            .cursor_pointer()
            .on_click(cx.listener(move |this, _, _, cx| this.select_ability(&id, cx)))
            .on_hover(cx.listener(move |this, hovered: &bool, _, cx| {
                this.hover_ability(hovered.then_some(hover_id.as_str()), cx)
            }))
            .child(rarity_chip)
            .child(glyph)
            .child(name_box)
            .child(size_row);
        if installed {
            let chip_label = self.badge(
                cx,
                format!("ability:{}:installed", ability.id),
                style::INSTALLED_CHIP.font,
                style::INSTALLED_CHIP.weight,
                &layout.colors.ink,
                "INSTALLED",
            );
            card = card.child(
                widgets::at((rect.w - 76.0) / 2.0, cards.installed_y, 76.0, style::INSTALLED_CHIP.height)
                    .child(
                        widgets::chip_surface(
                            &layout,
                            Rect {
                                x: 0.0,
                                y: 0.0,
                                w: 76.0,
                                h: style::INSTALLED_CHIP.height,
                            },
                            Some("clear"),
                            None,
                        )
                        .child(chip_label),
                    ),
            );
        }
        card.into_any_element()
    }

    fn render_ability_detail(&mut self, cx: &mut Context<Self>) -> Vec<AnyElement> {
        let layout = self.layout.clone();
        let padding = layout.panels.padding;
        let detail = layout.abilities.detail_panel;
        let inner_w = detail.w - padding * 2.0;
        let left = detail.x + padding;
        let pending = self.state.pending_ability().cloned();
        let mut children: Vec<AnyElement> = Vec::new();
        match &pending {
            Some(ability) => {
                children.push(self.text_at(
                    cx,
                    "detail:name",
                    style::ability_title(&layout.type_scale),
                    &layout.colors.bone_bright,
                    ability.name.clone(),
                    left,
                    layout.abilities.ability_title_y,
                ));
                let rarity_role = layout
                    .rarity_colors
                    .get(&ability.rarity)
                    .cloned()
                    .unwrap_or_else(|| "muted".to_string());
                let rarity_text_role = layout
                    .rarity_text_colors
                    .get(&ability.rarity)
                    .cloned()
                    .unwrap_or_else(|| "ink".to_string());
                let rarity_label = self.badge(
                    cx,
                    "detail:rarity",
                    style::RARITY_CHIP.font,
                    style::RARITY_CHIP.weight,
                    &layout.color(&rarity_text_role),
                    ability.rarity.to_uppercase(),
                );
                children.push(
                    widgets::chip_surface(
                        &layout,
                        Rect {
                            x: left,
                            y: layout.abilities.ability_chips_y,
                            w: layout.abilities.cards.rarity_chip.w,
                            h: layout.abilities.cards.rarity_chip.h,
                        },
                        Some(&rarity_role),
                        None,
                    )
                    .child(rarity_label)
                    .into_any_element(),
                );
                let size_label = self.badge(
                    cx,
                    "detail:size",
                    style::RARITY_CHIP.font,
                    style::RARITY_CHIP.weight,
                    &layout.colors.bone_bright,
                    format!("SIZE {}", ability.size),
                );
                children.push(
                    widgets::chip_surface(
                        &layout,
                        Rect {
                            x: left + layout.abilities.cards.rarity_chip.w + 8.0,
                            y: layout.abilities.ability_chips_y,
                            w: layout.abilities.cards.rarity_chip.w,
                            h: layout.abilities.cards.rarity_chip.h,
                        },
                        Some("graphite"),
                        Some(("ruleStrong", layout.style.panel_border)),
                    )
                    .child(size_label)
                    .into_any_element(),
                );
                children.push(self.text_box(
                    cx,
                    "detail:body",
                    style::copy(&layout.type_scale),
                    &layout.colors.bone,
                    ability.description.clone(),
                    Rect {
                        x: left,
                        y: layout.abilities.ability_body_y,
                        w: inner_w,
                        h: 60.0,
                    },
                ));
            }
            None => {
                children.push(self.text_at(
                    cx,
                    "detail:empty",
                    style::copy(&layout.type_scale),
                    &layout.colors.muted,
                    "SELECT A MODULE TO INSPECT",
                    left,
                    layout.abilities.ability_title_y,
                ));
            }
        }
        // Stat blocks HEAT / COOLDOWN / DRAW.
        let stat_y = layout.abilities.stat_row_y;
        let column_w = inner_w / 3.0;
        let (heat, cooldown, draw) = pending
            .as_ref()
            .map(|ability| {
                (
                    format!("{}", ability.stats.heat),
                    ability.stats.cooldown.clone(),
                    ability.stats.draw.clone(),
                )
            })
            .unwrap_or_else(|| ("—".into(), "—".into(), "—".into()));
        for (index, (label, value)) in [("HEAT", heat), ("COOLDOWN", cooldown), ("DRAW", draw)]
            .into_iter()
            .enumerate()
        {
            let x = left + index as f32 * column_w;
            children.push(self.text_at(
                cx,
                format!("detail:stat:{label}:label"),
                style::stat_block_label(&layout.type_scale),
                &layout.colors.muted,
                label,
                x,
                stat_y,
            ));
            children.push(self.text_at(
                cx,
                format!("detail:stat:{label}:value"),
                style::value(&layout.type_scale),
                &layout.colors.bone_bright,
                value,
                x,
                stat_y + 16.0,
            ));
        }
        children.push(self.rule(
            cx,
            "rule:detail-stats",
            Rect {
                x: detail.x,
                y: stat_y + 44.0,
                w: detail.w,
                h: layout.style.panel_border,
            },
        ));
        // Vehicle loadout.
        let vehicle = self.state.fixtures().vehicle.clone();
        children.push(self.text_at(
            cx,
            "detail:loadout-title",
            style::panel_title(&layout.type_scale),
            &layout.colors.bone_bright,
            "VEHICLE LOADOUT",
            left,
            layout.abilities.loadout_title_y,
        ));
        children.push(self.text_at(
            cx,
            "detail:vehicle",
            style::value(&layout.type_scale),
            &layout.colors.bone_bright,
            format!("{} · {}", vehicle.name, vehicle.chassis),
            left,
            layout.abilities.vehicle_name_y,
        ));
        children.extend(self.render_loadout_slots(cx));
        children.push(self.text_at(
            cx,
            "detail:pending-note",
            style::micro(&layout.type_scale),
            &layout.colors.muted,
            "COMPATIBLE SLOTS ARE OUTLINED IN CLEAR".to_string(),
            left,
            layout.abilities.pending_note_y,
        ));
        children
    }

    fn render_loadout_slots(&mut self, cx: &mut Context<Self>) -> Vec<AnyElement> {
        let layout = self.layout.clone();
        let slots_layout = layout.abilities.slots.clone();
        let slots = self.state.slots().to_vec();
        let mut children: Vec<AnyElement> = Vec::new();
        for (index, slot) in slots.iter().enumerate() {
            let column = index as f32 % slots_layout.cols as f32;
            let row = (index as f32 / slots_layout.cols as f32).floor();
            let rect = Rect {
                x: slots_layout.x + column * (slots_layout.w + slots_layout.col_gap),
                y: slots_layout.first_y + row * (slots_layout.h + slots_layout.row_gap),
                w: slots_layout.w,
                h: slots_layout.h,
            };
            let compatible = self.state.slot_fit(&slot.id).unwrap_or(false);
            let rejected = self
                .state
                .reject()
                .map(|reject| reject.slot_id == slot.id)
                .unwrap_or(false);
            let installed = slot
                .ability_id
                .as_deref()
                .and_then(|ability_id| self.state.ability(ability_id))
                .map(|ability| ability.name.clone());
            let label = self.text_at(
                cx,
                format!("slot:{}:label", slot.id),
                style::stat_block_label(&layout.type_scale),
                &layout.colors.muted,
                format!("{} · SIZE {}", slot.label, slot.size),
                8.0,
                8.0,
            );
            let occupant_color = if installed.is_some() {
                layout.colors.bone_bright.clone()
            } else {
                layout.colors.muted.clone()
            };
            let occupant = self.text_at(
                cx,
                format!("slot:{}:occupant", slot.id),
                if installed.is_some() {
                    style::row_label(&layout.type_scale)
                } else {
                    style::row_sub(&layout.type_scale)
                },
                &occupant_color,
                installed.clone().unwrap_or_else(|| "EMPTY".to_string()),
                8.0,
                30.0,
            );
            let border_role = if rejected {
                "alert"
            } else if compatible {
                "clear"
            } else {
                "rule"
            };
            let border_width = if compatible || rejected { 2.0 } else { 1.0 };
            let slot_id = slot.id.clone();
            let mut slot_box = widgets::rect_box(rect)
                .id(("loadout-slot", index))
                .bg(colors::paint(&layout.colors.charcoal))
                .border(px(border_width))
                .border_color(colors::paint(layout.color(&border_role)))
                .cursor_pointer()
                .on_click(cx.listener(move |this, _, _, cx| this.activate_slot(&slot_id, cx)))
                .child(label)
                .child(occupant);
            if rejected {
                let badge = self.badge(
                    cx,
                    format!("slot:{}:reject", slot.id),
                    style::INSTALLED_CHIP.font,
                    style::INSTALLED_CHIP.weight,
                    &layout.colors.bone_bright,
                    "REJECTED",
                );
                slot_box = slot_box.child(
                    widgets::at(rect.w - 74.0, 8.0, 66.0, style::INSTALLED_CHIP.height).child(
                        widgets::chip_surface(
                            &layout,
                            Rect {
                                x: 0.0,
                                y: 0.0,
                                w: 66.0,
                                h: style::INSTALLED_CHIP.height,
                            },
                            Some("alert"),
                            None,
                        )
                        .child(badge),
                    ),
                );
            }
            if installed.is_some() {
                let remove_label = self.text(
                    cx,
                    format!("slot:{}:remove-label", slot.id),
                    style::button_tiny(),
                    &layout.colors.bone_bright,
                    "×",
                );
                let slot_id = slot.id.clone();
                slot_box = slot_box.child(
                    widgets::at(rect.w - 16.0, 32.0, 16.0, 16.0).child(
                        div()
                            .id(("slot-remove", index))
                            .w(px(16.))
                            .h(px(16.))
                            .flex()
                            .items_center()
                            .justify_center()
                            .border_1()
                            .border_color(colors::paint(&layout.colors.rule_strong))
                            .cursor_pointer()
                            .on_click(cx.listener(move |this, _, _, cx| {
                                cx.stop_propagation();
                                this.remove_slot(&slot_id, cx)
                            }))
                            .child(remove_label),
                    ),
                );
            }
            children.push(slot_box.into_any_element());
        }
        children
    }

    /// I10: hover popover over the grid with name, rarity/size, body and stats.
    fn render_ability_hover(&mut self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let hovered = self.hovered_ability.clone()?;
        let ability = self.state.ability(&hovered)?.clone();
        let layout = self.layout.clone();
        let rect = layout.abilities.hover_popover;
        let padding = layout.panels.padding;
        let rarity_role = layout
            .rarity_colors
            .get(&ability.rarity)
            .cloned()
            .unwrap_or_else(|| "muted".to_string());
        let rarity_text_role = layout
            .rarity_text_colors
            .get(&ability.rarity)
            .cloned()
            .unwrap_or_else(|| "ink".to_string());
        let title = self.text_at(
            cx,
            "hover:title",
            style::ability_title(&layout.type_scale),
            &layout.colors.bone_bright,
            ability.name.clone(),
            padding,
            padding,
        );
        let chip = self.badge(
            cx,
            "hover:rarity",
            style::RARITY_CHIP.font,
            style::RARITY_CHIP.weight,
            &layout.color(&rarity_text_role),
            ability.rarity.to_uppercase(),
        );
        let chip_surface = widgets::at(
            rect.w - padding - layout.abilities.cards.rarity_chip.w,
            padding + 4.0,
            layout.abilities.cards.rarity_chip.w,
            layout.abilities.cards.rarity_chip.h,
        )
        .child(
            widgets::chip_surface(
                &layout,
                Rect {
                    x: 0.0,
                    y: 0.0,
                    w: layout.abilities.cards.rarity_chip.w,
                    h: layout.abilities.cards.rarity_chip.h,
                },
                Some(&rarity_role),
                None,
            )
            .child(chip),
        );
        let meta = self.text_at(
            cx,
            "hover:meta",
            style::card_size(&layout.type_scale),
            &layout.colors.muted,
            format!("SIZE {} · HEAT {}", ability.size, ability.stats.heat),
            padding,
            padding + 34.0,
        );
        let body = self.text_box(
            cx,
            "hover:body",
            style::copy(&layout.type_scale),
            &layout.colors.bone,
            ability.description.clone(),
            Rect {
                x: padding,
                y: padding + 54.0,
                w: rect.w - padding * 2.0,
                h: 58.0,
            },
        );
        let stats = self.text_at(
            cx,
            "hover:stats",
            style::micro(&layout.type_scale),
            &layout.colors.muted,
            format!(
                "COOLDOWN {}   ·   DRAW {}",
                ability.stats.cooldown, ability.stats.draw
            ),
            padding,
            rect.h - padding - 14.0,
        );
        Some(
            widgets::rect_box(rect)
                .bg(colors::paint(&layout.colors.charcoal))
                .border_1()
                .border_color(colors::paint(&layout.colors.signal))
                .child(title)
                .child(chip_surface)
                .child(meta)
                .child(body)
                .child(stats)
                .into_any_element(),
        )
    }
}

