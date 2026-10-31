//! The GPUI pause-menu app owner — parity layout.
//!
//! The UI is rebuilt to the shared parity authority: every region is absolutely
//! positioned from `fixtures/parity-layout.json` (parsed by
//! `game_pause_menu_gpui::seam::parity`), and every colour/type size comes from
//! that file or the pinned defaults in `parity.md` (see `src/app/style.rs`).
//! There is no responsive/flex page frame: the 1280x800 grid is the interface.
//!
//! Interaction paths are unchanged from the app spec (I1–I15) and land on the
//! pure-std seam state; generated components remain the realization for
//! switches, text, badges, dividers and stat readouts.

mod abilities_tab;
#[cfg(feature = "capture")]
mod capture;
mod colors;
mod map_tab;
mod progress_tab;
mod settings_tab;
mod style;
mod widgets;

use std::collections::BTreeMap;

use gpui::{
    actions, div, px, AnyElement, Context, Entity, FocusHandle, KeyDownEvent, Render, SharedString,
    Subscription, Window, prelude::*,
};
use full_stack_ds_gpui::components::{Badge, Divider, Stat, Switch, Text};
use full_stack_ds_gpui::control::ChangeRequest;
use full_stack_ds_gpui::style::Theme;
use game_pause_menu_gpui::seam::{
    AppState, Dismissed, DropdownKind, ParityLayout, Rect, Tab, load_fixtures, load_parity_layout,
};

use style::TextStyleSpec;

actions!(
    orion_pause,
    [
        DismissOverlay,
        SelectMapTab,
        SelectProgressTab,
        SelectAbilitiesTab,
        SelectSettingsTab
    ]
);

/// `--tab <map|progress|abilities|settings>` for manual inspection.
pub(crate) fn initial_tab_from_args() -> Tab {
    let mut arguments = std::env::args().skip(1);
    while let Some(argument) = arguments.next() {
        if argument == "--tab" {
            return arguments
                .next()
                .and_then(|value| Tab::from_key(&value))
                .unwrap_or_else(|| {
                    eprintln!("game-pause-menu-gpui: --tab expects map, progress, abilities or settings");
                    std::process::exit(2);
                });
        }
        if let Some(value) = argument.strip_prefix("--tab=") {
            return Tab::from_key(value).unwrap_or_else(|| {
                eprintln!("game-pause-menu-gpui: unknown tab '{value}'");
                std::process::exit(2);
            });
        }
    }
    Tab::Map
}

/// `--capture <dir>` (evidence mode; requires `--features capture`).
pub(crate) fn capture_dir_from_args() -> Option<String> {
    let mut arguments = std::env::args().skip(1);
    while let Some(argument) = arguments.next() {
        if argument == "--capture" {
            return arguments.next().or_else(|| {
                eprintln!("game-pause-menu-gpui: --capture expects a directory");
                std::process::exit(2);
            });
        }
        if let Some(value) = argument.strip_prefix("--capture=") {
            return Some(value.to_string());
        }
    }
    None
}

/// A generated `Switch` retained in both parity presentations. The canonical
/// switch is borderless when on and has a 1 px ruleStrong border when off; the
/// target's generated switch exposes no state-conditional border token, so two
/// pre-themed entities are kept and the matching one is rendered per state.
pub(crate) struct SwitchPair {
    pub(crate) off: Entity<Switch>,
    pub(crate) on: Entity<Switch>,
}

/// The single owner entity for the pause menu.
pub(crate) struct Menu {
    pub(crate) state: AppState,
    pub(crate) layout: ParityLayout,
    pub(crate) focus: FocusHandle,
    pub(crate) remap_focus: FocusHandle,
    /// Ephemeral hover target for the ability hover popover (I10).
    pub(crate) hovered_ability: Option<String>,
    texts: BTreeMap<String, (Entity<Text>, SharedString)>,
    badges: BTreeMap<String, (Entity<Badge>, SharedString)>,
    stats: BTreeMap<String, (Entity<Stat>, SharedString)>,
    dividers: BTreeMap<String, Entity<Divider>>,
    pub(crate) icon_switches: Vec<(String, SwitchPair)>,
    pub(crate) general_switches: Vec<(String, SwitchPair)>,
    _subscriptions: Vec<Subscription>,
}

impl Menu {
    pub(crate) fn new(window: &mut Window, cx: &mut Context<Self>, initial_tab: Tab) -> Self {
        let fixtures = load_fixtures();
        let layout = load_parity_layout();
        let mut state = AppState::new(fixtures);
        state.select_tab(initial_tab);

        let focus = cx.focus_handle();
        let remap_focus = cx.focus_handle();
        window.focus(&focus, cx);

        let off_theme = switch_theme(&layout, false);
        let on_theme = switch_theme(&layout, true);
        let mut subscriptions = Vec::new();

        // FROM PACKAGE EXPORTS: controlled canonical Switch per map icon (I2).
        let mut icon_switches = Vec::new();
        for icon in state.fixtures().icons() {
            let id = icon.id.clone();
            let visible = state.icon_visible(&id);
            let pair = SwitchPair {
                off: cx.new(|_| {
                    Switch::default()
                        .size("lg")
                        .checked(Some(visible))
                        .label("")
                        .theme(off_theme.clone())
                }),
                on: cx.new(|_| {
                    Switch::default()
                        .size("lg")
                        .checked(Some(visible))
                        .label("")
                        .theme(on_theme.clone())
                }),
            };
            for entity in [pair.off.clone(), pair.on.clone()] {
                let switch_id = id.clone();
                let other_off = pair.off.clone();
                let other_on = pair.on.clone();
                subscriptions.push(cx.subscribe(
                    &entity,
                    move |this: &mut Menu, _entity, request: &ChangeRequest, cx| {
                        this.state.toggle_icon(&switch_id);
                        let value = request.value;
                        other_off.update(cx, |control, cx| control.set_checked(Some(value), cx));
                        other_on.update(cx, |control, cx| control.set_checked(Some(value), cx));
                        cx.notify();
                    },
                ));
            }
            icon_switches.push((id, pair));
        }

        // FROM PACKAGE EXPORTS: controlled Switch per General setting (I11).
        let mut general_switches = Vec::new();
        for toggle in state.general() {
            let id = toggle.id.clone();
            let value = toggle.value;
            let pair = SwitchPair {
                off: cx.new(|_| {
                    Switch::default()
                        .size("lg")
                        .checked(Some(value))
                        .label("")
                        .theme(off_theme.clone())
                }),
                on: cx.new(|_| {
                    Switch::default()
                        .size("lg")
                        .checked(Some(value))
                        .label("")
                        .theme(on_theme.clone())
                }),
            };
            for entity in [pair.off.clone(), pair.on.clone()] {
                let switch_id = id.clone();
                let other_off = pair.off.clone();
                let other_on = pair.on.clone();
                subscriptions.push(cx.subscribe(
                    &entity,
                    move |this: &mut Menu, _entity, request: &ChangeRequest, cx| {
                        this.state.toggle_general(&switch_id);
                        let value = request.value;
                        other_off.update(cx, |control, cx| control.set_checked(Some(value), cx));
                        other_on.update(cx, |control, cx| control.set_checked(Some(value), cx));
                        cx.notify();
                    },
                ));
            }
            general_switches.push((id, pair));
        }

        Self {
            state,
            layout,
            focus,
            remap_focus,
            hovered_ability: None,
            texts: BTreeMap::new(),
            badges: BTreeMap::new(),
            stats: BTreeMap::new(),
            dividers: BTreeMap::new(),
            icon_switches,
            general_switches,
            _subscriptions: subscriptions,
        }
    }

    // -- Generated-component retention helpers -------------------------

    /// Retain (or update) a generated `Text` with an exact parity type spec.
    pub(crate) fn text(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        spec: TextStyleSpec,
        color_hex: &str,
        label: impl Into<SharedString>,
    ) -> Entity<Text> {
        let key = text_key(&key.into(), spec, color_hex);
        let label: SharedString = label.into();
        if let Some((entity, stored)) = self.texts.get_mut(&key) {
            if *stored != label {
                entity.update(cx, |text, cx| text.set_label(label.clone(), cx));
                *stored = label;
            }
            return entity.clone();
        }
        let text = build_text(spec, color_hex, label.clone());
        let entity = cx.new(|_| text);
        self.texts.insert(key, (entity.clone(), label));
        entity
    }

    /// Text at an absolute JSON coordinate (content-sized box).
    pub(crate) fn text_at(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        spec: TextStyleSpec,
        color_hex: &str,
        label: impl Into<SharedString>,
        x: f32,
        y: f32,
    ) -> AnyElement {
        let entity = self.text(cx, key, spec, color_hex, label);
        div()
            .absolute()
            .left(px(x))
            .top(px(y))
            .child(entity)
            .into_any_element()
    }

    /// Text inside an absolute rectangle (used for wrapping body copy).
    pub(crate) fn text_box(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        spec: TextStyleSpec,
        color_hex: &str,
        label: impl Into<SharedString>,
        rect: Rect,
    ) -> AnyElement {
        let entity = self.text(cx, key, spec, color_hex, label);
        widgets::rect_box(rect)
            .overflow_hidden()
            .child(entity)
            .into_any_element()
    }

    /// Right-aligned text inside an absolute rectangle.
    pub(crate) fn text_right(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        spec: TextStyleSpec,
        color_hex: &str,
        label: impl Into<SharedString>,
        rect: Rect,
    ) -> AnyElement {
        let key = text_key(&key.into(), spec, color_hex);
        let label: SharedString = label.into();
        let entity = if let Some((entity, stored)) = self.texts.get_mut(&key) {
            if *stored != label {
                entity.update(cx, |text, cx| text.set_label(label.clone(), cx));
                *stored = label;
            }
            entity.clone()
        } else {
            let text = build_text(spec, color_hex, label.clone()).align("right");
            let entity = cx.new(|_| text);
            self.texts.insert(key, (entity.clone(), label));
            entity
        };
        widgets::rect_box(rect)
            .flex()
            .justify_end()
            .child(entity)
            .into_any_element()
    }

    /// Retain a generated `Badge` label (chip typography inside chip surfaces).
    pub(crate) fn badge(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        font: f32,
        weight: style::Weight,
        color_hex: &str,
        label: impl Into<SharedString>,
    ) -> Entity<Badge> {
        let key = key.into();
        let label: SharedString = label.into();
        if let Some((entity, stored)) = self.badges.get_mut(&key) {
            if *stored != label {
                entity.update(cx, |badge, cx| badge.set_label(label.clone(), cx));
                *stored = label;
            }
            return entity.clone();
        }
        let badge = build_badge(font, weight, color_hex, label.clone());
        let entity = cx.new(|_| badge);
        self.badges.insert(key, (entity.clone(), label));
        entity
    }

    /// Retain a generated `Stat` readout (header values).
    pub(crate) fn stat(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        value: impl Into<SharedString>,
        color_hex: &str,
    ) -> Entity<Stat> {
        let key = key.into();
        let value: SharedString = value.into();
        if let Some((entity, stored)) = self.stats.get_mut(&key) {
            if *stored != value {
                entity.update(cx, |stat, cx| stat.set_label(value.clone(), cx));
                *stored = value;
            }
            return entity.clone();
        }
        let stat = build_stat(self.layout.type_scale.stat_value, color_hex, value.clone());
        let entity = cx.new(|_| stat);
        self.stats.insert(key, (entity.clone(), value));
        entity
    }

    /// Retain a generated `Divider` (rule) per insertion site.
    pub(crate) fn divider(&mut self, cx: &mut Context<Self>, key: &'static str) -> Entity<Divider> {
        if let Some(entity) = self.dividers.get(key) {
            return entity.clone();
        }
        let mut divider = Divider::default();
        divider.theme = Theme::default()
            .with_token("divider.color", self.layout.color("rule"))
            .with_token("divider.spacing.margin", "0px");
        let entity = cx.new(|_| divider);
        self.dividers.insert(key.to_string(), entity.clone());
        entity
    }

    /// An absolute generated rule at a JSON rectangle (1 px high).
    pub(crate) fn rule(
        &mut self,
        cx: &mut Context<Self>,
        key: &'static str,
        rect: Rect,
    ) -> AnyElement {
        let divider = self.divider(cx, key);
        widgets::rule_slot(divider, rect)
    }

    /// The canonical switch entity for a toggle's current state.
    pub(crate) fn switch_for(pair: &SwitchPair, checked: bool) -> Entity<Switch> {
        if checked {
            pair.on.clone()
        } else {
            pair.off.clone()
        }
    }

    // -- Interaction handlers (I1–I15) --------------------------------

    pub(crate) fn select_tab(&mut self, tab: Tab, cx: &mut Context<Self>) {
        self.state.select_tab(tab);
        self.hovered_ability = None;
        cx.notify();
    }

    pub(crate) fn open_marker(&mut self, icon_id: &str, cx: &mut Context<Self>) {
        if self.state.open_marker(icon_id) {
            cx.notify();
        }
    }

    pub(crate) fn close_marker(&mut self, cx: &mut Context<Self>) {
        self.state.close_marker();
        cx.notify();
    }

    pub(crate) fn set_nav_target(&mut self, icon_id: &str, cx: &mut Context<Self>) {
        if self.state.set_nav_target(icon_id) {
            cx.notify();
        }
    }

    pub(crate) fn open_faction(&mut self, faction_id: &str, cx: &mut Context<Self>) {
        if self.state.open_faction(faction_id) {
            cx.notify();
        }
    }

    pub(crate) fn close_faction(&mut self, cx: &mut Context<Self>) {
        self.state.close_faction();
        cx.notify();
    }

    pub(crate) fn select_ability(&mut self, ability_id: &str, cx: &mut Context<Self>) {
        if self.state.select_ability(ability_id) {
            cx.notify();
        }
    }

    pub(crate) fn activate_slot(&mut self, slot_id: &str, cx: &mut Context<Self>) {
        self.state.activate_slot(slot_id);
        cx.notify();
    }

    pub(crate) fn remove_slot(&mut self, slot_id: &str, cx: &mut Context<Self>) {
        self.state.remove_from_slot(slot_id);
        cx.notify();
    }

    pub(crate) fn hover_ability(&mut self, ability_id: Option<&str>, cx: &mut Context<Self>) {
        let next = ability_id.map(str::to_string);
        if self.hovered_ability != next {
            self.hovered_ability = next;
            cx.notify();
        }
    }

    pub(crate) fn set_slider(
        &mut self,
        target: SliderTarget,
        id: &str,
        value: f32,
        cx: &mut Context<Self>,
    ) {
        match target {
            SliderTarget::Controller => self.state.set_controller(id, value),
            SliderTarget::Audio => self.state.set_audio(id, value),
        };
        cx.notify();
    }

    pub(crate) fn begin_remap(
        &mut self,
        action_id: &str,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        if self.state.begin_remap(action_id) {
            window.focus(&self.remap_focus, cx);
            cx.notify();
        }
    }

    pub(crate) fn capture_keystroke(
        &mut self,
        event: &KeyDownEvent,
        window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        if self.state.remap_waiting().is_none() || event.is_held {
            return;
        }
        self.state.capture_binding(&event.keystroke.key);
        window.focus(&self.focus, cx);
        cx.notify();
    }

    pub(crate) fn cancel_remap_modal(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.state.cancel_remap() {
            window.focus(&self.focus, cx);
            cx.notify();
        }
    }

    pub(crate) fn select_language(
        &mut self,
        kind: DropdownKind,
        value: &str,
        cx: &mut Context<Self>,
    ) {
        match kind {
            DropdownKind::AudioLanguage => {
                self.state.set_audio_language(value);
            }
            DropdownKind::SubtitleLanguage => {
                self.state.set_subtitle_language(value);
            }
        }
        cx.notify();
    }

    pub(crate) fn select_background(&mut self, swatch_id: &str, cx: &mut Context<Self>) {
        self.state.set_subtitle_background(swatch_id);
        cx.notify();
    }

    pub(crate) fn dismiss_overlay(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let dismissed = self.state.dismiss_top_overlay();
        if matches!(dismissed, Dismissed::RemapModal) {
            window.focus(&self.focus, cx);
        }
        cx.notify();
    }

    /// Keep controlled switch entities in lockstep when state moved without a
    /// component request (e.g. capture reset).
    fn sync_controls(&mut self, cx: &mut Context<Self>) {
        let icons: Vec<(String, bool)> = self
            .state
            .fixtures()
            .icons()
            .iter()
            .map(|icon| (icon.id.clone(), self.state.icon_visible(&icon.id)))
            .collect();
        for (id, pair) in &self.icon_switches {
            if let Some((_, value)) = icons.iter().find(|(icon_id, _)| icon_id == id) {
                for entity in [pair.off.clone(), pair.on.clone()] {
                    if entity.read(cx).state.value() != *value {
                        entity.update(cx, |control, cx| control.set_checked(Some(*value), cx));
                    }
                }
            }
        }
        let general: Vec<(String, bool)> = self
            .state
            .general()
            .iter()
            .map(|row| (row.id.clone(), row.value))
            .collect();
        for (id, pair) in &self.general_switches {
            if let Some((_, value)) = general.iter().find(|(row_id, _)| row_id == id) {
                for entity in [pair.off.clone(), pair.on.clone()] {
                    if entity.read(cx).state.value() != *value {
                        entity.update(cx, |control, cx| control.set_checked(Some(*value), cx));
                    }
                }
            }
        }
    }

    // -- Render --------------------------------------------------------

    fn render_shell(&mut self, cx: &mut Context<Self>) -> Vec<AnyElement> {
        let layout = self.layout.clone();
        let header = layout.header.rect;
        let tab_bar = layout.tab_bar.rect;
        let footer = layout.footer.rect;
        let border = layout.style.panel_border;
        let mut children: Vec<AnyElement> = Vec::new();

        // Header band.
        let wordmark_spec = style::wordmark(&layout.type_scale);
        let main = self.text(
            cx,
            "header:wordmark-main",
            wordmark_spec,
            &layout.colors.bone_bright,
            format!("{} ", layout.header.wordmark.text_main),
        );
        let accent = self.text(
            cx,
            "header:wordmark-accent",
            wordmark_spec,
            &layout.colors.signal,
            layout.header.wordmark.text_accent.clone(),
        );
        let mut header_children: Vec<AnyElement> = vec![
            div()
                .absolute()
                .left(px(layout.header.wordmark.x))
                .top(px(layout.header.wordmark.y))
                .h(px(layout.header.wordmark.h))
                .flex()
                .flex_row()
                .items_center()
                .child(main)
                .child(accent)
                .into_any_element(),
            self.text_at(
                cx,
                "header:mission",
                style::mission(&layout.type_scale),
                &layout.colors.muted,
                layout.header.mission.text.clone(),
                layout.header.mission.x,
                layout.header.mission.y,
            ),
        ];
        for stat in layout.header.stats.clone() {
            let entity = self.stat(
                cx,
                format!("header:{}", stat.id),
                stat.value.clone(),
                &layout.colors.bone_bright,
            );
            header_children.push(self.text_at(
                cx,
                format!("header:{}:label", stat.id),
                style::stat_label(&layout.type_scale),
                &layout.colors.muted,
                stat.label.clone(),
                stat.x,
                stat.label_y,
            ));
            header_children.push(
                div()
                    .absolute()
                    .left(px(stat.x))
                    .top(px(stat.value_y))
                    .child(entity)
                    .into_any_element(),
            );
            header_children.push(self.text_at(
                cx,
                format!("header:{}:sub", stat.id),
                style::stat_sub(&layout.type_scale),
                &layout.colors.muted,
                stat.sub.clone(),
                stat.x,
                stat.sub_y,
            ));
        }
        let paused_rect = Rect {
            x: layout.header.paused_chip.x,
            y: layout.header.paused_chip.y,
            w: layout.header.paused_chip.w,
            h: layout.header.paused_chip.h,
        };
        let paused_label = self.badge(
            cx,
            "header:paused",
            style::HEADER_CHIP.font,
            style::HEADER_CHIP.weight,
            &layout.colors.bone_bright,
            layout.header.paused_chip.text.clone(),
        );
        header_children.push(
            widgets::chip_surface(
                &layout,
                paused_rect,
                Some("alert"),
                Some(("alert", border)),
            )
            .child(paused_label)
            .into_any_element(),
        );
        children.push(
            widgets::rect_box(header)
                .bg(colors::paint(layout.color(&layout.header.background)))
                .children(header_children)
                .into_any_element(),
        );
        children.push(self.rule(
            cx,
            "rule:header",
            Rect {
                x: 0.0,
                y: header.bottom() - border,
                w: header.w,
                h: border,
            },
        ));

        // Tab bar: four equal tabs from the JSON tab definitions.
        let mut tab_children: Vec<AnyElement> = Vec::new();
        for (index, tab) in layout.tab_bar.tabs.clone().iter().enumerate() {
            let active = self.state.active_tab().key() == tab.id;
            let tab_id = match tab.id.as_str() {
                "progress" => Tab::Progress,
                "abilities" => Tab::Abilities,
                "settings" => Tab::Settings,
                _ => Tab::Map,
            };
            let label_color = if active {
                layout.colors.on_signal.clone()
            } else {
                layout.colors.text_secondary.clone()
            };
            let key = format!("tab:{}:{}", tab.id, if active { "active" } else { "idle" });
            let label = self.text(cx, key, style::tab(&layout.type_scale), &label_color, tab.label.clone());
            let rect = Rect {
                x: tab.x,
                y: tab_bar.y,
                w: tab.w,
                h: tab_bar.h,
            };
            let label_box = div()
                .w_full()
                .h_full()
                .flex()
                .items_center()
                .pl(px(layout.tab_bar.label_inset))
                .child(label);
            tab_children.push(
                widgets::tab_surface(
                    &layout,
                    rect,
                    active,
                    index < layout.tab_bar.tabs.len() - 1,
                    label_box,
                    cx.listener(move |this, _, _, cx| this.select_tab(tab_id, cx)),
                )
                .into_any_element(),
            );
        }
        children.push(
            widgets::rect_box(tab_bar)
                .bg(colors::paint(layout.color(&layout.tab_bar.background)))
                .into_any_element(),
        );
        children.extend(tab_children);
        children.push(self.rule(
            cx,
            "rule:tabbar",
            Rect {
                x: 0.0,
                y: tab_bar.bottom() - border,
                w: tab_bar.w,
                h: border,
            },
        ));

        // Active tab content.
        children.push(match self.state.active_tab() {
            Tab::Map => self.render_map_tab(cx),
            Tab::Progress => self.render_progress_tab(cx),
            Tab::Abilities => self.render_abilities_tab(cx),
            Tab::Settings => self.render_settings_tab(cx),
        });

        // Footer band (ink ground).
        let hints = self.text(
            cx,
            "footer:hints",
            style::footer_hint(&layout.type_scale),
            &layout.colors.muted,
            layout.footer.hints.text.clone(),
        );
        let nav_label = self.text(
            cx,
            "footer:label",
            style::footer_label(&layout.type_scale),
            &layout.colors.muted,
            layout.footer.nav_target.label.clone(),
        );
        let target = self
            .state
            .nav_target_label()
            .map(|label| label.to_string())
            .unwrap_or_else(|| layout.footer.nav_target.empty.clone());
        let value_color = if self.state.nav_target().is_some() {
            layout.colors.signal.clone()
        } else {
            layout.colors.muted.clone()
        };
        let value = self.text(
            cx,
            "footer:value",
            style::footer_value(&layout.type_scale),
            &value_color,
            target,
        );
        let nav_rect = Rect {
            x: layout.footer.nav_target.value_right - 320.0,
            y: layout.footer.nav_target.value_y - footer.y,
            w: 320.0,
            h: layout.type_scale.tab,
        };
        children.push(
            widgets::rect_box(footer)
                .bg(colors::paint(&layout.colors.ink))
                .child(
                    div()
                        .absolute()
                        .left(px(layout.footer.hints.x))
                        .top(px(layout.footer.hints.y - footer.y))
                        .child(hints),
                )
                .child(
                    div()
                        .absolute()
                        .left(px(layout.footer.nav_target.label_x))
                        .top(px(layout.footer.nav_target.label_y - footer.y))
                        .child(nav_label),
                )
                .child(
                    widgets::rect_box(nav_rect)
                        .flex()
                        .justify_end()
                        .child(value),
                )
                .into_any_element(),
        );
        children.push(self.rule(
            cx,
            "rule:footer",
            Rect {
                x: 0.0,
                y: footer.y,
                w: footer.w,
                h: border,
            },
        ));

        children
    }
}

#[derive(Clone, Copy)]
pub(crate) enum SliderTarget {
    Controller,
    Audio,
}

/// Retained text identity includes the resolved style: a site whose colour or
/// size changes between states gets a distinct retained entity instead of
/// reusing one whose tokens were baked at creation.
fn text_key(key: &str, spec: TextStyleSpec, color_hex: &str) -> String {
    format!(
        "{key}|{color_hex}|{}|{:?}|{}",
        spec.size, spec.weight, spec.line_height
    )
}

fn build_text(spec: TextStyleSpec, color_hex: &str, label: SharedString) -> Text {
    let mut text = Text::default().weight(spec.weight.variant());
    let mut theme = Theme::default()
        .with_token("text.design.root.foreground.color", color_hex)
        .with_token(
            "text.design.root.typography.size",
            format!("{}px", spec.size),
        )
        .with_token(
            "text.design.root.typography.line-height",
            format!("{}", spec.line_height),
        );
    if let Some((token, value)) = spec.weight.token_override() {
        theme = theme.with_token(token, value);
    }
    text.theme = theme;
    text.label = label;
    text
}

fn build_badge(font: f32, weight: style::Weight, color_hex: &str, label: SharedString) -> Badge {
    let mut badge = Badge::default();
    let mut theme = Theme::default()
        .with_token("badge.design.root.background.fill", "transparent")
        .with_token("badge.design.hover.background.fill", "transparent")
        .with_token("badge.design.root.border.width", "0px")
        .with_token("badge.design.root.shape.radius", "0px")
        .with_token("badge.design.root.foreground.color", color_hex)
        .with_token("badge.design.root.typography.size", format!("{font}px"))
        .with_token(
            "badge.design.root.typography.weight",
            weight_token(weight),
        )
        .with_token("badge.design.root.sizing.min-height", "0px")
        .with_token("badge.design.root.spacing.padding-inline", "0px")
        .with_token("badge.design.root.spacing.padding-block", "0px")
        .with_token("box-model.min-width", "0px")
        .with_token("box-model.min-height", "0px")
        .with_token("badge.design.root.spacing.gap", "0px");
    if let Some((token, value)) = weight.token_override() {
        theme = theme.with_token(token, value);
    }
    badge.theme = theme;
    badge.label = label;
    badge
}

fn weight_token(weight: style::Weight) -> &'static str {
    match weight {
        style::Weight::Regular => "400",
        style::Weight::SemiBold => "600",
        style::Weight::Bold => "700",
        style::Weight::Heavy => "800",
    }
}

fn build_stat(value_size: f32, color_hex: &str, value: SharedString) -> Stat {
    let mut stat = Stat::default();
    stat.theme = Theme::default()
        .with_token("stat.design.root.foreground.color", color_hex)
        .with_token(
            "stat.design.root.typography.size",
            format!("{value_size}px"),
        )
        .with_token("stat.design.root.typography.weight", "800");
    stat.label = value;
    stat
}

/// Per-state switch theme from the JSON switch contract.
fn switch_theme(layout: &ParityLayout, checked: bool) -> Theme {
    let style = layout.switch_style(checked);
    let border = style
        .border_hex
        .clone()
        .unwrap_or_else(|| style.track_hex.clone());
    let theme = Theme::default()
        .with_token(
            "switch.design.track.background.fill",
            style.track_hex.clone(),
        )
        .with_token(
            "switch.design.thumb.background.fill",
            style.thumb_hex.clone(),
        )
        .with_token("switch.design.track.border.color", border)
        .with_token("switch.design.track.border.width", style.border_width_px())
        .with_token("switch.size.lg.track.radius", style.radius_px())
        .with_token("switch.size.lg.track.width", style.track_px())
        .with_token("switch.size.lg.track.height", style.track_height_px())
        .with_token("switch.size.lg.track.padding", "0px")
        .with_token("switch.size.lg.thumb.size", style.thumb_px())
        .with_token("switch.size.lg.thumb.height", style.thumb_px())
        .with_token(
            "switch.size.lg.thumb.translate.off",
            format!("{}px", layout.switch.inset),
        )
        .with_token(
            "switch.size.lg.thumb.translate.on",
            format!("{}px", layout.switch.checked_thumb_offset),
        )
        .with_token(
            "switch.design.thumb.shape.radius",
            style.thumb_radius_px(),
        )
        // The generated lg control carries action-size chrome (16 px inline
        // padding, 8 px block padding, 12 px gap, 48 px min box). Parity needs
        // the component box to be exactly the 64x32 track, so those semantic
        // size tokens are pinned to zero for this instance.
        .with_token("semantic.action.size.large.padding-inline", "0px")
        .with_token("semantic.action.size.large.padding-block", "0px")
        .with_token("semantic.action.size.large.gap", "0px")
        .with_token("semantic.action.size.large.min-width", "0px")
        .with_token("semantic.action.size.large.min-height", "0px");
    if checked {
        theme.with_token("switch.design.track.border.width", "0px")
    } else {
        theme
    }
}

impl Render for Menu {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.sync_controls(cx);
        let children = self.render_shell(cx);
        let modal = self.render_remap_modal(cx);
        let viewport = self.layout.viewport;
        let mut root = div()
            .id("orion-pause")
            .relative()
            .w(px(viewport.width))
            .h(px(viewport.height))
            .bg(colors::paint(&self.layout.colors.ink))
            .text_color(colors::paint(&self.layout.colors.bone_bright))
            .track_focus(&self.focus)
            .on_action(cx.listener(|this, _: &DismissOverlay, window, cx| {
                this.dismiss_overlay(window, cx)
            }))
            .on_action(cx.listener(|this, _: &SelectMapTab, _, cx| {
                this.select_tab(Tab::Map, cx)
            }))
            .on_action(cx.listener(|this, _: &SelectProgressTab, _, cx| {
                this.select_tab(Tab::Progress, cx)
            }))
            .on_action(cx.listener(|this, _: &SelectAbilitiesTab, _, cx| {
                this.select_tab(Tab::Abilities, cx)
            }))
            .on_action(cx.listener(|this, _: &SelectSettingsTab, _, cx| {
                this.select_tab(Tab::Settings, cx)
            }))
            .children(children);
        if let Some(modal) = modal {
            root = root.child(modal);
        }
        root
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    /// The canonical switch contract is expressed only through `Theme` token
    /// overrides on the generated `Switch`; assert the resolved track/thumb
    /// geometry and colours for both parity states.
    #[test]
    fn switch_theme_resolves_the_canonical_geometry() {
        let layout = load_parity_layout();
        let off = Switch::default()
            .size("lg")
            .checked(Some(false))
            .theme(switch_theme(&layout, false));
        let track = off.resolved_style("track").expect("off track style");
        assert_eq!(track.get("width"), Some("64px"));
        assert_eq!(track.get("height"), Some("32px"));
        assert_eq!(track.get("border-radius"), Some("16px"));
        assert_eq!(track.get("border-top-width"), Some("1px"));
        assert_eq!(track.get("background-color"), Some("#2E2E29"));
        assert_eq!(track.get("padding-left"), Some("0px"));
        let thumb = off.resolved_style("thumb").expect("off thumb style");
        assert_eq!(thumb.get("width"), Some("24px"));
        assert_eq!(thumb.get("height"), Some("24px"));
        assert_eq!(thumb.get("border-radius"), Some("12px"));
        assert_eq!(thumb.get("background-color"), Some("#F4F1E6"));
        assert_eq!(thumb.get("translate"), Some("4px"));

        let on = Switch::default()
            .size("lg")
            .checked(Some(true))
            .theme(switch_theme(&layout, true));
        let track = on.resolved_style("track").expect("on track style");
        assert_eq!(track.get("border-radius"), Some("16px"));
        assert_eq!(track.get("border-top-width"), Some("0px"));
        assert_eq!(track.get("background-color"), Some("#EF6A3C"));
        let thumb = on.resolved_style("thumb").expect("on thumb style");
        assert_eq!(thumb.get("border-radius"), Some("12px"));
        assert_eq!(thumb.get("background-color"), Some("#191917"));
    }
}

#[cfg(all(test, feature = "capture"))]
mod mounted_layout_tests {
    use super::*;
    use gpui::{TestAppContext, point, size};

    struct SwitchHarness {
        switch: Entity<Switch>,
    }

    impl Render for SwitchHarness {
        fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
            div()
                .relative()
                .w(px(400.))
                .h(px(300.))
                .child(
                    div()
                        .debug_selector(|| "switch-slot".to_string())
                        .absolute()
                        .left(px(100.))
                        .top(px(50.))
                        .w(px(64.))
                        .h(px(32.))
                        .flex()
                        .flex_col()
                        .items_start()
                        .child(self.switch.clone()),
                )
        }
    }

    #[gpui::test]
    fn mounted_switch_geometry_matches_parity(cx: &mut TestAppContext) {
        let layout = load_parity_layout();
        let (view, cx) = cx.add_window_view(|_, cx| {
            let switch = cx.new(|_| {
                Switch::default()
                    .size("lg")
                    .checked(Some(false))
                    .label("")
                    .theme(switch_theme(&layout, false))
            });
            SwitchHarness { switch }
        });
        let _ = view;
        let slot = cx.debug_bounds("switch-slot").expect("slot");
        let track = cx.debug_bounds("switch-track").expect("track");
        let thumb = cx.debug_bounds("switch-thumb").expect("thumb");
        let root = cx.debug_bounds("switch-root").expect("root");
        assert_eq!(slot.origin, point(px(100.), px(50.)));
        assert_eq!(track.size, size(px(64.), px(32.)));
        assert_eq!(thumb.size, size(px(24.), px(24.)));
        assert_eq!(track.origin, point(px(100.), px(50.)));
        assert_eq!(root.size, size(px(64.), px(32.)));
    }
}
