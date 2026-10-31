//! Abilities tab: rarity-tagged card grid with hover tooltip (I7/I10),
//! vehicle loadout with compatible-slot highlighting, install and reject
//! states (I8/I9).

use gpui::prelude::*;
use gpui::{
    AnyElement, Context, InteractiveElement, IntoElement, ParentElement, Styled, div, px,
};

use super::palette::Colors;
use super::widgets::{ability_glyph, outline_button, rarity_color, size_pips};
use super::{Menu, TagStyle, TextRole};

const CARD_W: f32 = 162.0;
const CARD_H: f32 = 158.0;
const CARD_GAP: f32 = 12.0;
const COLUMNS: usize = 5;
const GRID_W: f32 = 880.0;
const DETAIL_W: f32 = 324.0;
const TOOLTIP_W: f32 = 344.0;

impl Menu {
    pub(crate) fn render_abilities_tab(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let grid = self.render_ability_grid(cx);
        let detail = self.render_ability_detail(cx);
        let loadout = self.render_loadout(cx);
        let scroll = self.ability_scroll.clone();
        div()
            .id("abilities-tab")
            .flex()
            .flex_row()
            .items_start()
            .gap(px(16.))
            .h_full()
            .child(div().w(px(GRID_W)).h_full().relative().child(grid))
            .child(
                div()
                    .id("ability-detail-scroll")
                    .w(px(DETAIL_W))
                    .h_full()
                    .flex()
                    .flex_col()
                    .gap_3()
                    .overflow_y_scroll()
                    .track_scroll(&scroll)
                    .child(detail)
                    .child(loadout),
            )
            .into_any_element()
    }

    fn render_ability_grid(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let catalog = self.state.fixtures().ability_catalog().to_vec();
        let cards = catalog
            .iter()
            .enumerate()
            .map(|(index, ability)| {
                let colors = self.colors;
                let selected = self.state.pending_ability_id() == Some(ability.id.as_str());
                let installed = self.state.ability_installed(&ability.id);
                let rarity = rarity_color(&ability.rarity, &colors);
                let id = ability.id.clone();
                let hover_id = ability.id.clone();

                let rarity_tag = self.badge(
                    cx,
                    format!("ability:{}:rarity", ability.id),
                    TagStyle::Rarity(rarity),
                    ability.rarity.to_uppercase(),
                );
                let name = self.text(
                    cx,
                    format!("ability:{}:name", ability.id),
                    TextRole::Value,
                    ability.name.clone(),
                );
                let size = self.text(
                    cx,
                    format!("ability:{}:size", ability.id),
                    TextRole::Micro,
                    format!("SIZE {}", ability.size),
                );
                let glyph = div()
                    .w(px(38.))
                    .h(px(38.))
                    .flex()
                    .items_center()
                    .justify_center()
                    .bg(Colors::paint(colors.inset))
                    .border_1()
                    .border_color(Colors::paint(colors.rule_strong))
                    .child(
                        div()
                            .text_size(px(13.))
                            .font_weight(gpui::FontWeight::BOLD)
                            .text_color(Colors::paint(rarity))
                            .child(ability_glyph(&ability.icon)),
                    );

                let mut card = div()
                    .id(("ability-card", index))
                    .relative()
                    .w(px(CARD_W))
                    .h(px(CARD_H))
                    .p_3()
                    .flex()
                    .flex_col()
                    .gap_2()
                    .bg(Colors::paint(if selected {
                        colors.raised
                    } else {
                        colors.charcoal
                    }))
                    .border_1()
                    .border_color(Colors::paint(if selected {
                        colors.signal
                    } else {
                        colors.rule
                    }))
                    .when(selected, |this| this.border_2())
                    .cursor_pointer()
                    .on_click(cx.listener(move |this, _, _, cx| this.select_ability(&id, cx)))
                    .on_hover(cx.listener(move |this, hovered: &bool, _, cx| {
                        this.hover_ability(hovered.then_some(hover_id.as_str()), cx)
                    }))
                    .child(
                        div()
                            .absolute()
                            .top(px(-9.))
                            .left(px(8.))
                            .child(rarity_tag),
                    )
                    .child(glyph)
                    .child(name)
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .items_center()
                            .justify_between()
                            .child(size_pips(ability.size, &colors))
                            .child(size),
                    );
                if installed {
                    let badge = self.badge(
                        cx,
                        format!("ability:{}:installed", ability.id),
                        TagStyle::Installed,
                        "INSTALLED",
                    );
                    card = card.child(badge);
                }
                card.into_any_element()
            })
            .collect::<Vec<_>>();

        let head = super::section(
            self,
            cx,
            "abilities-catalog",
            "ABILITY CATALOG",
            Some(format!("{} CARDS  ·  SELECT, THEN ACTIVATE A SLOT", catalog.len())),
            vec![],
        );
        let tooltip = self.render_ability_tooltip(cx, &catalog);
        div()
            .flex()
            .flex_col()
            .gap_3()
            .child(head)
            .child(
                div()
                    .id("ability-grid")
                    .relative()
                    .w(px(GRID_W))
                    .flex()
                    .flex_row()
                    .flex_wrap()
                    .gap(px(CARD_GAP))
                    .children(cards),
            )
            .children(tooltip)
            .into_any_element()
    }

    /// I10: hover popover with description, stat block and rarity/size detail.
    fn render_ability_tooltip(
        &mut self,
        cx: &mut Context<Self>,
        catalog: &[game_pause_menu_gpui::seam::Ability],
    ) -> Option<AnyElement> {
        let hovered_id = self.hovered_ability.clone()?;
        let index = catalog
            .iter()
            .position(|ability| ability.id == hovered_id)?;
        let ability = catalog[index].clone();
        let colors = self.colors;
        let column = index % COLUMNS;
        let row = index / COLUMNS;
        let left = ((column as f32) * (CARD_W + CARD_GAP)).min(GRID_W - TOOLTIP_W);
        let top = (row as f32) * (CARD_H + CARD_GAP) + CARD_H + 18.0;

        let name = self.text(cx, "tooltip:name", TextRole::Title, ability.name.clone());
        let rarity = self.badge(
            cx,
            "tooltip:rarity",
            TagStyle::Rarity(rarity_color(&ability.rarity, &colors)),
            ability.rarity.to_uppercase(),
        );
        let size = self.text(
            cx,
            "tooltip:size",
            TextRole::Micro,
            format!(
                "SIZE {}  ·  RARITY {}  ·  HEAT {}",
                ability.size,
                ability.rarity.to_uppercase(),
                ability.stats.heat
            ),
        );
        let description = self.text(
            cx,
            "tooltip:description",
            TextRole::Body,
            ability.description.clone(),
        );
        let divider = self.divider(cx, "divider:tooltip");
        let stats = self.ability_stats_row(cx, "tooltip", &ability);
        let detail = self.text(
            cx,
            "tooltip:detail",
            TextRole::BodyMuted,
            ability.detail.clone(),
        );
        Some(
            div()
                .id("ability-tooltip")
                .absolute()
                .left(px(left))
                .top(px(top))
                .w(px(TOOLTIP_W))
                .p_3()
                .flex()
                .flex_col()
                .gap_2()
                .bg(Colors::paint(colors.ink))
                .border_2()
                .border_color(Colors::paint(colors.signal))
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .child(name)
                        .child(rarity),
                )
                .child(size)
                .child(description)
                .child(divider)
                .child(stats)
                .child(detail)
                .into_any_element(),
        )
    }

    fn render_ability_detail(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let pending = self.state.pending_ability().cloned();
        let mut children: Vec<AnyElement> = Vec::new();
        if let Some(ability) = &pending {
            let name = self.text(cx, "detail:name", TextRole::Title, ability.name.clone());
            let rarity = self.badge(
                cx,
                "detail:rarity",
                TagStyle::Rarity(rarity_color(&ability.rarity, &colors)),
                ability.rarity.to_uppercase(),
            );
            let size = self.text(
                cx,
                "detail:size",
                TextRole::Micro,
                format!("SIZE {}", ability.size),
            );
            let description = self.text(
                cx,
                "detail:description",
                TextRole::BodySmall,
                ability.description.clone(),
            );
            let divider = self.divider(cx, "divider:abilities-detail");
            let stats = self.ability_stats_row(cx, "detail", ability);
            let detail = self.text(
                cx,
                "detail:detail",
                TextRole::Caption,
                ability.detail.clone(),
            );
            let installed_at = self
                .state
                .installed_slot_id(&ability.id)
                .and_then(|slot_id| {
                    self.state
                        .slots()
                        .iter()
                        .find(|slot| slot.id == slot_id)
                        .map(|slot| slot.label.clone())
                });
            children.push(
                div()
                    .w_full()
                    .flex()
                    .flex_row()
                    .items_end()
                    .justify_between()
                    .gap_3()
                    .child(div().flex_none().child(name))
                    .child(
                        div()
                            .flex_none()
                            .flex()
                            .flex_row()
                            .items_center()
                            .gap_2()
                            .child(rarity)
                            .child(size),
                    )
                    .into_any_element(),
            );
            children.push(div().w_full().child(description).into_any_element());
            children.push(divider.into_any_element());
            children.push(stats);
            children.push(div().w_full().child(detail).into_any_element());
            if let Some(label) = installed_at {
                let installed = self.badge(
                    cx,
                    "detail:installed",
                    TagStyle::Installed,
                    format!("INSTALLED — {label}"),
                );
                children.push(installed.into_any_element());
            } else {
                let hint = self.text(
                    cx,
                    "detail:not-installed",
                    TextRole::MicroSignal,
                    "COMPATIBLE SLOTS ARE HIGHLIGHTED IN THE LOADOUT",
                );
                children.push(hint.into_any_element());
            }
        } else {
            let empty = self.text(
                cx,
                "detail:empty",
                TextRole::BodyMuted,
                "SELECT A CARD TO INSPECT AND INSTALL",
            );
            let hint = self.text(
                cx,
                "detail:hint",
                TextRole::Micro,
                "HOVER A CARD FOR ITS TOOLTIP (I10)  ·  CLICK TO MARK IT PENDING (I7)",
            );
            children.push(empty.into_any_element());
            children.push(hint.into_any_element());
        }
        super::section(
            self,
            cx,
            "abilities-detail",
            "ABILITY DETAIL",
            Some(format!(
                "{} COMPATIBLE SLOTS",
                self.state.compatible_slot_ids().len()
            )),
            children,
        )
    }

    fn ability_stats_row(
        &mut self,
        cx: &mut Context<Self>,
        key: &'static str,
        ability: &game_pause_menu_gpui::seam::Ability,
    ) -> AnyElement {
        let colors = self.colors;
        let cell = |menu: &mut Menu,
                    cx: &mut Context<Menu>,
                    label: &'static str,
                    value: String,
                    suffix: &'static str| {
            let label = menu.text(cx, format!("stats:{key}:{suffix}:label"), TextRole::Micro, label);
            let value = menu.text(cx, format!("stats:{key}:{suffix}:value"), TextRole::Value, value);
            div()
                .flex()
                .flex_col()
                .gap(px(1.))
                .w(px(96.))
                .flex_none()
                .child(div().w_full().child(label))
                .child(div().w_full().child(value))
                .into_any_element()
        };
        div()
            .flex()
            .flex_row()
            .gap_4()
            .p_2()
            .bg(Colors::paint(colors.inset))
            .border_1()
            .border_color(Colors::paint(colors.rule))
            .child(cell(self, cx, "HEAT", format!("{}", ability.stats.heat), "heat"))
            .child(cell(
                self,
                cx,
                "COOLDOWN",
                ability.stats.cooldown.clone(),
                "cooldown",
            ))
            .child(cell(self, cx, "DRAW", ability.stats.draw.clone(), "draw"))
            .into_any_element()
    }

    fn render_loadout(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let vehicle = self.state.fixtures().vehicle.clone();
        let slots = self.state.slots().to_vec();
        let pending = self
            .state
            .pending_ability()
            .map(|ability| ability.id.clone());
        let mut rows: Vec<AnyElement> = Vec::new();
        let title = self.text(
            cx,
            "loadout:vehicle",
            TextRole::Title,
            vehicle.name.clone(),
        );
        let chassis = self.text(
            cx,
            "loadout:chassis",
            TextRole::Micro,
            format!("{}  ·  {} SLOTS", vehicle.chassis, slots.len()),
        );
        rows.push(
            div()
                .w_full()
                .flex()
                .flex_col()
                .gap(px(1.))
                .child(div().w_full().child(title))
                .child(div().w_full().child(chassis))
                .into_any_element(),
        );
        for (index, slot) in slots.iter().enumerate() {
            let compatible = pending
                .as_deref()
                .and_then(|_| self.state.slot_fit(&slot.id))
                .unwrap_or(false);
            let rejected = self
                .state
                .reject()
                .map(|reject| reject.slot_id == slot.id)
                .unwrap_or(false);
            let installed_name = slot
                .ability_id
                .as_deref()
                .and_then(|ability_id| self.state.ability(ability_id))
                .map(|ability| ability.name.clone());
            let slot_label = self.text(
                cx,
                format!("loadout:{}:label", slot.id),
                TextRole::Micro,
                slot.label.clone(),
            );
            let slot_size = self.text(
                cx,
                format!("loadout:{}:size", slot.id),
                TextRole::Micro,
                format!("SIZE {}", slot.size),
            );
            let occupant = if let Some(name) = &installed_name {
                self.text(
                    cx,
                    format!("loadout:{}:occupant", slot.id),
                    TextRole::Value,
                    name.clone(),
                )
            } else {
                self.text(
                    cx,
                    format!("loadout:{}:occupant", slot.id),
                    TextRole::Micro,
                    "EMPTY",
                )
            };
            let withdraw = installed_name.as_ref().map(|_| {
                let remove_label =
                    self.text(cx, format!("loadout:{}:remove-label", slot.id), TextRole::MicroBright, "×");
                let slot_id = slot.id.clone();
                outline_button(
                    "loadout-remove",
                    remove_label,
                    colors,
                    cx.listener(move |this, _, _, cx| {
                        cx.stop_propagation();
                        this.remove_slot(&slot_id, cx)
                    }),
                )
            });
            let badge = if rejected {
                Some(self.badge(
                    cx,
                    format!("loadout:{}:reject", slot.id),
                    TagStyle::Alert,
                    "REJECTED",
                ))
            } else if compatible {
                Some(self.badge(
                    cx,
                    format!("loadout:{}:compatible", slot.id),
                    TagStyle::Signal,
                    "COMPATIBLE",
                ))
            } else {
                None
            };
            let border = if rejected {
                colors.alert
            } else if compatible {
                colors.signal
            } else {
                colors.rule
            };
            let slot_id = slot.id.clone();
            let mut row = div()
                .id(("loadout-slot", index))
                .flex()
                .flex_row()
                .items_center()
                .gap_3()
                .h(px(52.))
                .px_3()
                .bg(Colors::paint(if compatible {
                    colors.inset
                } else {
                    colors.charcoal
                }))
                .border_1()
                .border_color(Colors::paint(border))
                .cursor_pointer()
                .on_click(cx.listener(move |this, _, _, cx| this.activate_slot(&slot_id, cx)))
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .gap(px(1.))
                        .w(px(72.))
                        .child(slot_label)
                        .child(slot_size),
                )
                .child(div().flex_1().overflow_hidden().child(occupant));
            if let Some(badge) = badge {
                row = row.child(badge);
            }
            if let Some(withdraw) = withdraw {
                row = row.child(withdraw);
            }
            rows.push(row.into_any_element());
        }
        let hint = self.text(
            cx,
            "loadout:hint",
            TextRole::Micro,
            "CLICK A SLOT TO INSTALL THE PENDING ABILITY  ·  INCOMPATIBLE SLOTS REJECT (I9)",
        );
        rows.push(hint.into_any_element());
        super::section(
            self,
            cx,
            "abilities-loadout",
            "VEHICLE LOADOUT",
            Some("SIX SIZED SLOTS".to_string()),
            rows,
        )
    }
}
