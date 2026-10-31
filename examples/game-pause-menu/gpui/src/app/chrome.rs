//! Header band, four-tab bar and footer band — app-level chrome for every tab.

use gpui::{AnyElement, Context, InteractiveElement, IntoElement, ParentElement, Styled, div, px};

use super::palette::Colors;
use super::widgets::{TabButtonMode, tab_button};
use super::{Menu, TagStyle, TextRole};
use game_pause_menu_gpui::seam::{Tab, format_grouped};

impl Menu {
    /// Header band: brand mark, mission label, commander readout and the
    /// `PAUSED` status chip (spec → "Shell structure" 1).
    pub(crate) fn render_header(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let commander = self.state.fixtures().commander.clone();
        let rank = &commander.rank;
        let earnings = &commander.earnings;
        let followers = &commander.followers;

        // NOT FSDS: brand block + orange action-strip motif are app-level
        // chrome (no Stack/Card/Icon on the target).
        let strip = div().w(px(5.)).h(px(52.)).bg(Colors::paint(colors.signal));
        let brand = self.text(cx, "header:brand", TextRole::Display, commander.callsign.clone());
        let mission = self.text(
            cx,
            "header:mission",
            TextRole::MicroBright,
            format!("{}  //  COMMANDER {}", commander.mission, commander.callsign_plate),
        );
        let brand_block = div()
            .w(px(430.))
            .flex_none()
            .flex()
            .flex_row()
            .items_center()
            .gap(px(14.))
            .child(strip)
            .child(
                div()
                    .w(px(400.))
                    .flex_none()
                    .flex()
                    .flex_col()
                    .gap_1()
                    .child(div().w_full().child(brand))
                    .child(div().w_full().child(mission)),
            );

        let rank_readout = self.readout(
            cx,
            "rank",
            "RANKING",
            206.0,
            rank.label.clone(),
            format!("LVL {:02}  ·  GLOBAL #{}  ·  {}", rank.level, rank.global_position, rank.percentile),
        );
        let level_readout = self.level_readout(cx, rank.level);
        let earnings_readout = self.readout(
            cx,
            "earnings",
            "EARNINGS",
            165.0,
            format!("{} {}", format_grouped(earnings.credits), earnings.currency),
            format!("{} {} PENDING", format_grouped(earnings.pending), earnings.currency),
        );
        let followers_readout = self.readout(
            cx,
            "followers",
            "FOLLOWERS",
            150.0,
            format_grouped(followers.total),
            format!("{}  {}", followers.trend, followers.period),
        );
        let paused = self.badge(cx, "header:paused", TagStyle::Paused, commander.status.clone());

        div()
            .id("header-band")
            .h(px(112.))
            .overflow_hidden()
            .px(px(24.))
            .py(px(12.))
            .flex()
            .flex_row()
            .items_center()
            .justify_between()
            .gap_4()
            .bg(Colors::paint(colors.charcoal))
            .border_b_1()
            .border_color(Colors::paint(colors.rule))
            .child(brand_block)
            .child(
                div()
                    .flex_none()
                    .flex()
                    .flex_row()
                    .items_end()
                    .gap(px(14.))
                    .child(rank_readout)
                    .child(level_readout)
                    .child(earnings_readout)
                    .child(followers_readout)
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .items_end()
                            .gap_1()
                            .pb(px(2.))
                            .child(paused),
                    ),
            )
            .into_any_element()
    }

    /// Micro-label + big `Stat` + caption. Reuses generated components for the
    /// label/value/caption roles.
    fn readout(
        &mut self,
        cx: &mut Context<Self>,
        key: &'static str,
        label: &'static str,
        width: f32,
        value: String,
        caption: String,
    ) -> AnyElement {
        let label = self.text(cx, format!("header:{key}:label"), TextRole::Micro, label);
        let value = self.stat(cx, format!("header:{key}:value"), "md", value);
        let caption = self.text(cx, format!("header:{key}:caption"), TextRole::Micro, caption);
        div()
            .flex()
            .flex_col()
            .items_start()
            .gap(px(2.))
            .w(px(width))
            .child(label)
            .child(value)
            .child(caption)
            .into_any_element()
    }

    fn level_readout(&mut self, cx: &mut Context<Self>, level: u32) -> AnyElement {
        let label = self.text(cx, "header:level:label", TextRole::Micro, "LEVEL");
        let value = self.stat(cx, "header:level:value", "lg", format!("{level:02}"));
        let caption = self.text(
            cx,
            "header:level:caption",
            TextRole::Micro,
            "MISSION-CRITICAL",
        );
        div()
            .flex()
            .flex_col()
            .items_start()
            .gap(px(2.))
            .w(px(118.))
            .flex_none()
            .child(label)
            .child(value)
            .child(caption)
            .into_any_element()
    }

    /// Four exclusive tabs in spec order (I1). The target admits no Tabs
    /// component; the control is hand-authored and the wording is app chrome.
    pub(crate) fn render_tab_bar(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let active = self.state.active_tab();
        let tabs = Tab::ALL
            .into_iter()
            .enumerate()
            .map(|(index, tab)| {
                let is_active = tab == active;
                let mode = if is_active {
                    TabButtonMode::Active
                } else {
                    TabButtonMode::Idle
                };
                let role = if is_active {
                    TextRole::OnSignal
                } else {
                    TextRole::MicroBright
                };
                let key = format!("tab:{}:{}", tab.key(), if is_active { "active" } else { "idle" });
                let label = self.text(cx, key, role, format!("0{}  {}", index + 1, tab.label()));
                // NOT FSDS: no Tabs component on the target; hand-authored
                // tab buttons with exclusive active styling.
                tab_button(mode, colors, index, label, cx.listener(move |this, _, _, cx| {
                    this.select_tab(tab, cx)
                }))
            })
            .collect::<Vec<_>>();
        div()
            .id("tab-bar")
            .h(px(52.))
            .flex()
            .flex_row()
            .bg(Colors::paint(colors.charcoal))
            .border_b_1()
            .border_color(Colors::paint(colors.rule))
            .children(tabs)
            .into_any_element()
    }

    /// Footer band: control hints + current nav-target summary (spec → shell 4).
    pub(crate) fn render_footer(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let hints = self.text(
            cx,
            "footer:hints",
            TextRole::Micro,
            "ESC  BACK    ·    TAB  FOCUS    ·    CLICK  SELECT    ·    1–4  TABS",
        );
        let target_label = self
            .state
            .nav_target_label()
            .map(|label| format!("NAV TARGET // {label}"))
            .unwrap_or_else(|| "NAV TARGET // —".to_string());
        let target_role = if self.state.nav_target().is_some() {
            TextRole::MicroSignal
        } else {
            TextRole::Micro
        };
        let target = self.text(cx, "footer:nav-target", target_role, target_label);
        div()
            .id("footer-band")
            .h(px(44.))
            .px(px(24.))
            .flex()
            .flex_row()
            .items_center()
            .justify_between()
            .bg(Colors::paint(colors.charcoal))
            .border_t_1()
            .border_color(Colors::paint(colors.rule))
            .child(hints)
            .child(target)
            .into_any_element()
    }
}
