//! Progress tab: faction roster + left drawer (I5/I6/I15).

use gpui::prelude::*;
use gpui::{
    AnyElement, Context, InteractiveElement, IntoElement, ParentElement, Styled, div, px,
};

use super::palette::Colors;
use super::widgets::{action_button, outline_button, rarity_color, reputation_bar};
use super::{Menu, TagStyle, TextRole};
use game_pause_menu_gpui::seam::format_grouped;

const DRAWER_W: f32 = 540.0;

impl Menu {
    pub(crate) fn render_progress_tab(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let factions = self.state.fixtures().factions.clone();
        let unlocked = factions.iter().filter(|faction| faction.unlocked).count();
        let rows = factions
            .iter()
            .enumerate()
            .map(|(index, faction)| {
                let colors = self.colors;
                let name = self.text(
                    cx,
                    format!("faction:{}:name", faction.id),
                    TextRole::Title,
                    faction.name.clone(),
                );
                let tagline = self.text(
                    cx,
                    format!("faction:{}:tagline", faction.id),
                    TextRole::Micro,
                    faction.tagline.clone(),
                );
                let tier = self.text(
                    cx,
                    format!("faction:{}:tier", faction.id),
                    TextRole::Micro,
                    format!("TIER {:02}", faction.tier),
                );
                let reputation = self.text(
                    cx,
                    format!("faction:{}:reputation", faction.id),
                    TextRole::Micro,
                    format!(
                        "REPUTATION  {} / {}",
                        faction.reputation, faction.reputation_max
                    ),
                );
                let fraction = if faction.reputation_max == 0 {
                    0.0
                } else {
                    faction.reputation as f32 / faction.reputation_max as f32
                };
                let status = if faction.unlocked {
                    self.badge(
                        cx,
                        format!("faction:{}:status", faction.id),
                        TagStyle::Clear,
                        "ACCESS",
                    )
                } else {
                    self.badge(
                        cx,
                        format!("faction:{}:status", faction.id),
                        TagStyle::Locked,
                        "LOCKED",
                    )
                };
                let requirement_role = if faction.unlocked {
                    TextRole::Micro
                } else {
                    TextRole::MicroAlert
                };
                let requirement_label = if faction.unlocked {
                    format!("{} MEMBERS", format_grouped(u64::from(faction.reputation)))
                } else {
                    faction.requirement.clone()
                };
                let requirement = self.text(
                    cx,
                    format!("faction:{}:requirement", faction.id),
                    requirement_role,
                    requirement_label,
                );
                let faction_id = faction.id.clone();
                let row = div()
                    .id(("faction-row", index))
                    .h(px(74.))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_5()
                    .px_4()
                    .bg(Colors::paint(colors.charcoal))
                    .border_1()
                    .border_color(Colors::paint(colors.rule))
                    .cursor_pointer()
                    .hover(move |style| style.bg(Colors::paint(colors.row_hover)))
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.open_faction(&faction_id, cx)
                    }))
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap(px(1.))
                            .w(px(380.))
                            .child(name)
                            .child(tagline),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap(px(1.))
                            .w(px(140.))
                            .child(tier)
                            .child(reputation),
                    )
                    .child(reputation_bar(fraction, &colors))
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .items_end()
                            .gap_1()
                            .flex_1()
                            .child(status)
                            .child(requirement),
                    );
                if faction.unlocked {
                    row.into_any_element()
                } else {
                    row.opacity(0.88).into_any_element()
                }
            })
            .collect::<Vec<_>>();

        let head = super::section(
            self,
            cx,
            "progress-factions",
            "FACTIONS",
            Some(format!(
                "{} REGISTERED   ·   {unlocked} ACCESSIBLE",
                factions.len()
            )),
            rows,
        );
        let drawer = self.render_faction_drawer(cx);
        div()
            .id("progress-tab")
            .relative()
            .h_full()
            .w_full()
            .overflow_hidden()
            .child(
                div()
                    .id("faction-list-scroll")
                    .size_full()
                    .flex()
                    .flex_col()
                    .overflow_y_scroll()
                    .child(head),
            )
            .children(drawer)
            .into_any_element()
    }

    /// I5/I6: drawer enters from the left edge of the content region, overlays
    /// the list's left side, and keeps the list visible. A locked faction's
    /// SHOP PARTS button is present but disabled.
    fn render_faction_drawer(&mut self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let faction = self.state.faction_drawer()?.clone();
        let colors = self.colors;
        let unlocked = faction.unlocked;

        let eyebrow = self.text(
            cx,
            "drawer:eyebrow",
            TextRole::MicroSignal,
            "FACTION DOSSIER",
        );
        let hint = self.text(cx, "drawer:hint", TextRole::Micro, "ESC  CLOSE");
        let close_label = self.text(cx, "drawer:close-label", TextRole::MicroBright, "CLOSE");
        let close = outline_button(
            "drawer-close",
            close_label,
            colors,
            cx.listener(|this, _, _, cx| this.close_faction(cx)),
        );
        let name = self.text(cx, "drawer:name", TextRole::Headline, faction.name.clone());
        let tagline = self.text(cx, "drawer:tagline", TextRole::Micro, faction.tagline.clone());
        let title_rule = self.divider(cx, "divider:drawer");

        let brief_label = self.text(
            cx,
            "drawer:description-eyebrow",
            TextRole::Micro,
            "BRIEF",
        );
        let description = self.text(
            cx,
            "drawer:description",
            TextRole::Body,
            faction.detail.description.clone(),
        );
        let history_label = self.text(cx, "drawer:history-eyebrow", TextRole::Micro, "HISTORY");
        let history = self.text(
            cx,
            "drawer:history",
            TextRole::BodyMuted,
            faction.detail.history.clone(),
        );
        let left_column = div()
            .w(px(258.))
            .flex_none()
            .flex()
            .flex_col()
            .gap_2()
            .child(brief_label)
            .child(div().w_full().child(description))
            .child(history_label)
            .child(div().w_full().child(history));

        let perks_label = self.text(cx, "drawer:perks-eyebrow", TextRole::Micro, "PERKS");
        let perk_rows = faction
            .detail
            .perks
            .clone()
            .iter()
            .enumerate()
            .map(|(index, perk)| {
                let perk = self.text(
                    cx,
                    format!("drawer:perk:{index}"),
                    TextRole::Micro,
                    format!("—  {perk}"),
                );
                div().w_full().pb(px(2.)).child(perk).into_any_element()
            })
            .collect::<Vec<_>>();
        let parts_label = self.text(cx, "drawer:parts-eyebrow", TextRole::Micro, "PARTS");
        let part_rows = faction
            .detail
            .parts
            .clone()
            .iter()
            .enumerate()
            .map(|(index, part)| {
                let colors = self.colors;
                let name = self.text(
                    cx,
                    format!("drawer:part:{index}:name"),
                    TextRole::Value,
                    part.name.clone(),
                );
                let cost = self.text(
                    cx,
                    format!("drawer:part:{index}:cost"),
                    TextRole::MicroBright,
                    format!("{} CR", format_grouped(part.cost)),
                );
                let rarity = self.badge(
                    cx,
                    format!("drawer:part:{index}:rarity"),
                    TagStyle::Rarity(rarity_color(&part.rarity, &colors)),
                    part.rarity.to_uppercase(),
                );
                let size = self.text(
                    cx,
                    format!("drawer:part:{index}:size"),
                    TextRole::Micro,
                    format!("S{}", part.size),
                );
                div()
                    .id(("drawer-part-row", index))
                    .w_full()
                    .flex()
                    .flex_col()
                    .gap(px(1.))
                    .py_1()
                    .border_b_1()
                    .border_color(Colors::paint(colors.rule))
                    .child(div().w_full().child(name))
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .items_center()
                            .gap_2()
                            .child(cost)
                            .child(rarity)
                            .child(size),
                    )
                    .into_any_element()
            })
            .collect::<Vec<_>>();
        let right_column = div()
            .w(px(232.))
            .flex_none()
            .flex()
            .flex_col()
            .gap_2()
            .child(perks_label)
            .children(perk_rows)
            .child(parts_label)
            .children(part_rows);
        let columns = div()
            .w_full()
            .flex()
            .flex_row()
            .items_start()
            .gap_4()
            .child(left_column)
            .child(right_column);

        let requirement = if unlocked {
            self.text(
                cx,
                "drawer:requirement:open",
                TextRole::Micro,
                format!(
                    "ACCESS GRANTED  ·  REPUTATION {} / {}",
                    faction.reputation, faction.reputation_max
                ),
            )
        } else {
            self.text(
                cx,
                "drawer:requirement:locked",
                TextRole::MicroAlert,
                format!("UNLOCK REQUIREMENT  //  {}", faction.requirement),
            )
        };
        let shop_label = if unlocked {
            self.text(cx, "drawer:shop:enabled", TextRole::OnSignal, "SHOP PARTS")
        } else {
            self.text(
                cx,
                "drawer:shop:disabled",
                TextRole::MicroBright,
                "SHOP PARTS — LOCKED",
            )
        };
        let shop = action_button(
            "drawer-shop",
            shop_label,
            unlocked,
            colors,
            cx.listener(|_, _, _, cx| cx.stop_propagation()),
        );
        let footer_hint = if unlocked {
            self.text(
                cx,
                "drawer:shop-hint:open",
                TextRole::Micro,
                "PARTS PURCHASING IS OUTSIDE THIS EXAMPLE (FIXTURE DATA ONLY)",
            )
        } else {
            self.text(
                cx,
                "drawer:shop-hint:locked",
                TextRole::Micro,
                "THE ACTION STAYS DISABLED UNTIL THE REQUIREMENT IS MET (I6)",
            )
        };

        Some(
            div()
                .id("faction-drawer")
                .absolute()
                .left_0()
                .top_0()
                .h_full()
                .w(px(DRAWER_W))
                .overflow_y_scroll()
                .bg(Colors::paint(colors.graphite))
                .border_r_2()
                .border_color(Colors::paint(colors.signal))
                .on_mouse_down(
                    gpui::MouseButton::Left,
                    cx.listener(|_, _, _, cx| cx.stop_propagation()),
                )
                .child(
                    div()
                        .w_full()
                        .p_4()
                        .flex()
                        .flex_col()
                        .gap_3()
                        .child(
                            div()
                                .w_full()
                                .flex()
                                .flex_row()
                                .items_center()
                                .justify_between()
                                .child(
                                    div()
                                        .flex()
                                        .flex_row()
                                        .items_center()
                                        .gap_3()
                                        .child(eyebrow)
                                        .child(hint),
                                )
                                .child(close),
                        )
                        .child(div().w_full().child(name))
                        .child(div().w_full().child(tagline))
                        .child(title_rule)
                        .child(columns)
                        .child(div().w_full().child(requirement))
                        .child(shop)
                        .child(div().w_full().child(footer_hint)),
                )
                .into_any_element(),
        )
    }
}
