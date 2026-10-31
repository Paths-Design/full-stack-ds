//! The GPUI pause-menu app owner.
//!
//! This module owns the single `Menu` entity: the lane-local [`AppState`], the
//! retained entities of the generated `full_stack_ds_gpui` components the
//! target admits (Switch / ToggleSwitch / Checkbox / Text / Badge / Divider /
//! Stat — the lane uses Switch, Text, Badge, Divider and Stat), and the
//! hand-authored fallback regions marked `// NOT FSDS:`.
//!
//! Interaction paths: every spec interaction I1–I15 lands on an `AppState`
//! transition (`game_pause_menu_gpui::seam::state`) called from one of the
//! handlers below. The view is a projection; it never edits fixture data.

mod abilities_tab;
#[cfg(feature = "capture")]
mod capture;
mod chrome;
mod map_tab;
mod palette;
mod progress_tab;
mod settings_tab;
mod widgets;

use std::collections::BTreeMap;

use gpui::prelude::*;
use gpui::{
    AnyElement, Context, Entity, FocusHandle, KeyDownEvent, Render, ScrollHandle, SharedString,
    Subscription, Window, actions, div, px,
};
use full_stack_ds_gpui::components::{Badge, Divider, Stat, Switch, Text};
use full_stack_ds_gpui::control::ChangeRequest;
use full_stack_ds_gpui::style::Theme;
use game_pause_menu_gpui::seam::{AppState, Dismissed, DropdownKind, Tab, load_fixtures};

use palette::Colors;

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

/// Where the app is when it starts, optionally set by `--tab <name>`.
pub(crate) fn initial_tab_from_args() -> Tab {
    let mut arguments = std::env::args().skip(1);
    while let Some(argument) = arguments.next() {
        if argument == "--tab" {
            return arguments
                .next()
                .and_then(|value| Tab::from_key(&value))
                .unwrap_or_else(|| {
                    eprintln!("game-pause-menu-gpui: --tab expects one of map, progress, abilities, settings");
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

/// `--capture <dir>` argument (evidence mode; requires `--features capture`).
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

/// The single owner entity for the pause menu.
pub(crate) struct Menu {
    pub(crate) state: AppState,
    pub(crate) colors: Colors,
    pub(crate) focus: FocusHandle,
    remap_focus: FocusHandle,
    /// Ephemeral hover target for the ability tooltip (I10); not domain data.
    pub(crate) hovered_ability: Option<String>,
    /// Settings scroll position so the capture path can frame the audio section.
    pub(crate) settings_scroll: ScrollHandle,
    /// Ability detail/loadout scroll position (capture frames the reject slot).
    pub(crate) ability_scroll: ScrollHandle,
    /// Retained generated `Text` entities, keyed by a stable logical name.
    texts: BTreeMap<String, (Entity<Text>, SharedString)>,
    /// Retained generated `Badge` entities, keyed by a stable logical name.
    badges: BTreeMap<String, (Entity<Badge>, SharedString)>,
    /// Retained generated `Stat` entities, keyed by a stable logical name.
    stats: BTreeMap<String, (Entity<Stat>, SharedString)>,
    /// Retained generated `Divider` entities, keyed by insertion site.
    dividers: BTreeMap<String, Entity<Divider>>,
    /// One controlled `Switch` per map icon (I2) and per General setting (I11).
    pub(crate) icon_switches: Vec<(String, Entity<Switch>)>,
    pub(crate) general_switches: Vec<(String, Entity<Switch>)>,
    _subscriptions: Vec<Subscription>,
}

impl Menu {
    pub(crate) fn new(window: &mut Window, cx: &mut Context<Self>, initial_tab: Tab) -> Self {
        let fixtures = load_fixtures();
        let colors = Colors::from_appearance(&fixtures.appearance);
        let mut state = AppState::new(fixtures);
        state.select_tab(initial_tab);

        let focus = cx.focus_handle();
        let remap_focus = cx.focus_handle();
        window.focus(&focus, cx);

        let mut subscriptions = Vec::new();

        // FROM PACKAGE EXPORTS: controlled Switch per map icon (I2). Requests
        // are accepted explicitly; the fixture itself is never mutated.
        let mut icon_switches = Vec::new();
        for icon in state.fixtures().icons() {
            let id = icon.id.clone();
            let subscription_id = id.clone();
            let visible = state.icon_visible(&id);
            let switch = cx.new(|_| {
                Switch::default()
                    .size("sm")
                    .checked(Some(visible))
                    .label("")
                    .theme(switch_theme(&colors))
            });
            let subscription = cx.subscribe(
                &switch,
                move |this: &mut Menu, entity: Entity<Switch>, request: &ChangeRequest, cx| {
                    if let Some(new_value) = this.state.toggle_icon(&subscription_id) {
                        debug_assert_eq!(new_value, request.value, "switch request mirrors the filter");
                    }
                    entity.update(cx, |control, cx| {
                        control.set_checked(Some(request.value), cx)
                    });
                    cx.notify();
                },
            );
            subscriptions.push(subscription);
            icon_switches.push((id, switch));
        }

        // FROM PACKAGE EXPORTS: controlled Switch per General setting (I11).
        let mut general_switches = Vec::new();
        for toggle in state.general() {
            let id = toggle.id.clone();
            let subscription_id = id.clone();
            let value = toggle.value;
            let switch = cx.new(|_| {
                Switch::default()
                    .checked(Some(value))
                    .label("")
                    .theme(switch_theme(&colors))
            });
            let subscription = cx.subscribe(
                &switch,
                move |this: &mut Menu, entity: Entity<Switch>, request: &ChangeRequest, cx| {
                    this.state.toggle_general(&subscription_id);
                    entity.update(cx, |control, cx| {
                        control.set_checked(Some(request.value), cx)
                    });
                    cx.notify();
                },
            );
            subscriptions.push(subscription);
            general_switches.push((id, switch));
        }

        Self {
            state,
            colors,
            focus,
            remap_focus,
            hovered_ability: None,
            settings_scroll: ScrollHandle::new(),
            ability_scroll: ScrollHandle::new(),
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

    /// Retain (or update) one generated `Text` entity. Updating only happens
    /// when the label changes, so render is not a notify loop.
    pub(crate) fn text(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        role: TextRole,
        label: impl Into<SharedString>,
    ) -> Entity<Text> {
        let key = key.into();
        let label: SharedString = label.into();
        let colors = self.colors;
        if let Some((entity, stored)) = self.texts.get_mut(&key) {
            if *stored != label {
                entity.update(cx, |text, cx| text.set_label(label.clone(), cx));
                *stored = label;
            }
            return entity.clone();
        }
        let text = build_text(role, &colors, label.clone());
        let entity = cx.new(|_| text);
        self.texts.insert(key, (entity.clone(), label));
        entity
    }

    /// Retain (or update) one generated `Badge` entity.
    pub(crate) fn badge(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        style: TagStyle,
        label: impl Into<SharedString>,
    ) -> Entity<Badge> {
        let key = key.into();
        let label: SharedString = label.into();
        let colors = self.colors;
        if let Some((entity, stored)) = self.badges.get_mut(&key) {
            if *stored != label {
                entity.update(cx, |badge, cx| badge.set_label(label.clone(), cx));
                *stored = label;
            }
            return entity.clone();
        }
        let badge = build_badge(style, &colors, label.clone());
        let entity = cx.new(|_| badge);
        self.badges.insert(key, (entity.clone(), label));
        entity
    }

    /// Retain (or update) one generated `Stat` entity.
    pub(crate) fn stat(
        &mut self,
        cx: &mut Context<Self>,
        key: impl Into<String>,
        size: &'static str,
        label: impl Into<SharedString>,
    ) -> Entity<Stat> {
        let key = key.into();
        let label: SharedString = label.into();
        let colors = self.colors;
        if let Some((entity, stored)) = self.stats.get_mut(&key) {
            if *stored != label {
                entity.update(cx, |stat, cx| stat.set_label(label.clone(), cx));
                *stored = label;
            }
            return entity.clone();
        }
        let stat = build_stat(size, &colors, label.clone());
        let entity = cx.new(|_| stat);
        self.stats.insert(key, (entity.clone(), label));
        entity
    }

    /// Retain one generated `Divider` entity per insertion site.
    pub(crate) fn divider(&mut self, cx: &mut Context<Self>, key: &'static str) -> Entity<Divider> {
        let colors = self.colors;
        if let Some(entity) = self.dividers.get(key) {
            return entity.clone();
        }
        let divider = build_divider(&colors);
        let entity = cx.new(|_| divider);
        self.dividers.insert(key.to_string(), entity.clone());
        entity
    }

    // -- Interaction handlers (I1–I15) --------------------------------

    /// I1: switch tabs; exactly one tab is active by construction.
    pub(crate) fn select_tab(&mut self, tab: Tab, cx: &mut Context<Self>) {
        self.state.select_tab(tab);
        self.hovered_ability = None;
        cx.notify();
    }

    /// I3: open the anchored marker popover (visible markers only).
    pub(crate) fn open_marker(&mut self, icon_id: &str, cx: &mut Context<Self>) {
        if self.state.open_marker(icon_id) {
            cx.notify();
        }
    }

    /// I3/I15: close the marker popover.
    pub(crate) fn close_marker(&mut self, cx: &mut Context<Self>) {
        self.state.close_marker();
        cx.notify();
    }

    /// I4: set the single nav target; the popover closes.
    pub(crate) fn set_nav_target(&mut self, icon_id: &str, cx: &mut Context<Self>) {
        if self.state.set_nav_target(icon_id) {
            cx.notify();
        }
    }

    /// I5/I6: open a faction drawer from a visible list row.
    pub(crate) fn open_faction(&mut self, faction_id: &str, cx: &mut Context<Self>) {
        if self.state.open_faction(faction_id) {
            cx.notify();
        }
    }

    /// I15: close the drawer, returning to the list.
    pub(crate) fn close_faction(&mut self, cx: &mut Context<Self>) {
        self.state.close_faction();
        cx.notify();
    }

    /// I7: select an ability card (marks pending, clears reject).
    pub(crate) fn select_ability(&mut self, ability_id: &str, cx: &mut Context<Self>) {
        if self.state.select_ability(ability_id) {
            cx.notify();
        }
    }

    /// I8/I9: activate a loadout slot.
    pub(crate) fn activate_slot(&mut self, slot_id: &str, cx: &mut Context<Self>) {
        self.state.activate_slot(slot_id);
        cx.notify();
    }

    /// Remove an installed ability from its slot.
    pub(crate) fn remove_slot(&mut self, slot_id: &str, cx: &mut Context<Self>) {
        self.state.remove_from_slot(slot_id);
        cx.notify();
    }

    /// I10: hover state for the ability tooltip.
    pub(crate) fn hover_ability(&mut self, ability_id: Option<&str>, cx: &mut Context<Self>) {
        let next = ability_id.map(str::to_string);
        if self.hovered_ability != next {
            self.hovered_ability = next;
            cx.notify();
        }
    }

    /// I12/I14: set a stepped slider value from its track.
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

    /// I13: open the input-waiting remap modal and focus it so it receives the
    /// next keystroke (only one modal can be open at a time).
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

    /// I13/I15: the modal consumes the next key press while waiting.
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

    /// I15: cancel the remap modal without changing the binding.
    pub(crate) fn cancel_remap_modal(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.state.cancel_remap() {
            window.focus(&self.focus, cx);
            cx.notify();
        }
    }

    /// I14: select a language option from an open dropdown.
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

    /// I14: pick the subtitle background swatch.
    pub(crate) fn select_background(&mut self, swatch_id: &str, cx: &mut Context<Self>) {
        self.state.set_subtitle_background(swatch_id);
        cx.notify();
    }

    /// I15: Escape/cancel closes exactly one overlay, topmost first.
    pub(crate) fn dismiss_overlay(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let dismissed = self.state.dismiss_top_overlay();
        if matches!(dismissed, Dismissed::RemapModal) {
            window.focus(&self.focus, cx);
        }
        cx.notify();
    }

    // -- Render plumbing ----------------------------------------------

    /// Keep controlled component entities in lockstep when domain state moved
    /// without a component request (e.g. a capture reset). Guarded so render
    /// does not notify itself into a loop.
    fn sync_controls(&mut self, cx: &mut Context<Self>) {
        let visible: Vec<(String, bool)> = self
            .state
            .fixtures()
            .icons()
            .iter()
            .map(|icon| (icon.id.clone(), self.state.icon_visible(&icon.id)))
            .collect();
        for (id, switch) in &self.icon_switches {
            let want = visible
                .iter()
                .find(|(icon_id, _)| icon_id == id)
                .map(|(_, visible)| *visible)
                .unwrap_or(false);
            if switch.read(cx).state.value() != want {
                switch.update(cx, |control, cx| control.set_checked(Some(want), cx));
            }
        }
        let general: Vec<(String, bool)> = self
            .state
            .general()
            .iter()
            .map(|row| (row.id.clone(), row.value))
            .collect();
        for (id, switch) in &self.general_switches {
            let want = general
                .iter()
                .find(|(row_id, _)| row_id == id)
                .map(|(_, value)| *value)
                .unwrap_or(false);
            if switch.read(cx).state.value() != want {
                switch.update(cx, |control, cx| control.set_checked(Some(want), cx));
            }
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) enum SliderTarget {
    Controller,
    Audio,
}

/// Text roles map to generated `Text` variants + per-instance token overrides.
#[derive(Clone, Copy)]
pub(crate) enum TextRole {
    Display,
    Headline,
    Title,
    Body,
    BodyMuted,
    BodySmall,
    Caption,
    Micro,
    MicroBright,
    MicroSignal,
    MicroAlert,
    Value,
    ValueLarge,
    OnSignal,
    Watermark,
    PreviewOnInk,
    PreviewOnBone,
}

impl TextRole {
    fn variant(self) -> &'static str {
        match self {
            TextRole::Display => "display",
            TextRole::Headline => "headline",
            TextRole::Title => "title",
            TextRole::ValueLarge => "headline",
            TextRole::Body
            | TextRole::BodyMuted
            | TextRole::BodySmall
            | TextRole::OnSignal
            | TextRole::PreviewOnInk
            | TextRole::PreviewOnBone => "body",
            TextRole::Micro
            | TextRole::MicroBright
            | TextRole::MicroSignal
            | TextRole::MicroAlert => "overline",
            TextRole::Caption => "caption",
            TextRole::Value => "body",
            TextRole::Watermark => "display",
        }
    }

    fn size(self) -> Option<&'static str> {
        match self {
            TextRole::BodySmall
            | TextRole::Value
            | TextRole::PreviewOnInk
            | TextRole::PreviewOnBone => Some("sm"),
            TextRole::Micro | TextRole::MicroBright | TextRole::MicroSignal | TextRole::MicroAlert => {
                Some("xs")
            }
            _ => None,
        }
    }

    fn weight(self) -> Option<&'static str> {
        match self {
            TextRole::Display
            | TextRole::Headline
            | TextRole::Title
            | TextRole::ValueLarge
            | TextRole::Value
            | TextRole::Micro
            | TextRole::MicroBright
            | TextRole::MicroSignal
            | TextRole::MicroAlert
            | TextRole::OnSignal => Some("bold"),
            _ => None,
        }
    }

    fn color(self, colors: &Colors) -> u32 {
        match self {
            TextRole::Display | TextRole::Headline | TextRole::Title | TextRole::ValueLarge => {
                colors.bone_bright
            }
            TextRole::Body | TextRole::BodySmall | TextRole::Value => colors.bone,
            TextRole::BodyMuted | TextRole::Caption => colors.muted,
            TextRole::Micro => colors.muted,
            TextRole::MicroBright => colors.bone,
            TextRole::MicroSignal => colors.signal_hot,
            TextRole::MicroAlert => colors.alert,
            TextRole::OnSignal => colors.on_signal,
            TextRole::Watermark => colors.map_grid,
            TextRole::PreviewOnInk => colors.bone_bright,
            TextRole::PreviewOnBone => colors.ink,
        }
    }
}

/// Badge roles map rarity/status tags onto generated `Badge` token overrides.
#[derive(Clone, Copy)]
pub(crate) enum TagStyle {
    Signal,
    Alert,
    Clear,
    Locked,
    Paused,
    Installed,
    Rarity(u32),
}

fn tag_colors(style: TagStyle, colors: &Colors) -> (u32, u32, u32) {
    match style {
        TagStyle::Signal => (colors.signal, colors.on_signal, colors.signal),
        TagStyle::Alert => (colors.alert, colors.bone_bright, colors.alert),
        TagStyle::Clear => (colors.clear, colors.bone_bright, colors.clear),
        TagStyle::Locked => (colors.charcoal, colors.alert, colors.alert),
        TagStyle::Paused => (colors.alert, colors.bone_bright, colors.alert),
        TagStyle::Installed => (colors.moss, colors.ink, colors.moss),
        TagStyle::Rarity(color) => (colors.inset, color, color),
    }
}

pub(crate) fn switch_theme(colors: &Colors) -> Theme {
    Theme::default()
        // Track: graphite off / signal orange on (semantic definitions the
        // generated checked rule rebinds).
        .with_token(
            "semantic.color.background.tertiary",
            Colors::hex(colors.graphite),
        )
        .with_token(
            "semantic.color.foreground.accent",
            Colors::hex(colors.signal),
        )
        // Thumb: bone off / on-signal dark when the track is orange.
        .with_token(
            "semantic.color.background.primary",
            Colors::hex(colors.bone_bright),
        )
        .with_token(
            "semantic.color.foreground.on.brand",
            Colors::hex(colors.on_signal),
        )
        .with_token("semantic.color.border.subtle", Colors::hex(colors.rule_strong))
        .with_token("semantic.focus.ring.color", Colors::hex(colors.signal_hot))
        // Orion N5 graphic grammar: zero radius.
        .with_token("switch.design.track.shape.radius", "0")
        .with_token("switch.design.thumb.shape.radius", "0")
}

fn build_text(role: TextRole, colors: &Colors, label: SharedString) -> Text {
    let mut text = Text::default().variant(role.variant());
    if let Some(size) = role.size() {
        text = text.size(size);
    }
    if let Some(weight) = role.weight() {
        text = text.weight(weight);
    }
    text.theme = Theme::default().with_token(
        "text.design.root.foreground.color",
        Colors::hex(role.color(colors)),
    );
    text.label = label;
    text
}

fn build_badge(style: TagStyle, colors: &Colors, label: SharedString) -> Badge {
    let (background, foreground, border) = tag_colors(style, colors);
    let mut badge = Badge::default().variant("tag").size("sm");
    badge.theme = Theme::default()
        .with_token(
            "badge.color.background.default",
            Colors::hex(background),
        )
        .with_token("badge.color.background.hover", Colors::hex(background))
        .with_token(
            "badge.color.foreground.primary",
            Colors::hex(foreground),
        )
        .with_token("badge.color.border", Colors::hex(border))
        // Zero radius through the tooltip/tag semantic radius definition.
        .with_token("semantic.shape.control.radius.default", "0");
    badge.label = label;
    badge
}

fn build_stat(size: &'static str, colors: &Colors, label: SharedString) -> Stat {
    let mut stat = Stat::default().size(size);
    stat.theme = Theme::default()
        .with_token("stat.color.foreground.value", Colors::hex(colors.bone_bright))
        .with_token("semantic.typography.font.weight.bold", "700");
    stat.label = label;
    stat
}

fn build_divider(colors: &Colors) -> Divider {
    let mut divider = Divider::default();
    divider.theme = Theme::default().with_token("divider.color", Colors::hex(colors.rule));
    divider
}

/// Section heading used by every tab: micro-label + optional micro count and a
/// generated Divider rule underneath.
pub(crate) fn section(
    menu: &mut Menu,
    cx: &mut Context<Menu>,
    key: &'static str,
    title: impl Into<SharedString>,
    detail: Option<String>,
    children: Vec<AnyElement>,
) -> AnyElement {
    let title = menu.text(cx, format!("section:{key}:title"), TextRole::MicroSignal, title);
    let mut heading = div()
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        .gap_2()
        .child(title);
    if let Some(detail) = detail {
        let detail = menu.text(cx, format!("section:{key}:detail"), TextRole::Micro, detail);
        heading = heading.child(detail);
    }
    let rule = menu.divider(cx, section_divider_key(key));
    div()
        .w_full()
        .flex()
        .flex_col()
        .gap_2()
        .child(heading)
        .child(rule)
        .children(children.into_iter().map(|child| div().w_full().child(child)))
        .into_any_element()
}

fn section_divider_key(key: &'static str) -> &'static str {
    // Divider entities are retained per insertion site; the section key is a
    // bounded &'static str set, so leaking a small label is unnecessary: use
    // the section titles' static table instead.
    match key {
        "map-icons" => "divider:map-icons",
        "map-commander" => "divider:map-commander",
        "progress-factions" => "divider:progress-factions",
        "drawer" => "divider:drawer",
        "abilities-catalog" => "divider:abilities-catalog",
        "abilities-detail" => "divider:abilities-detail",
        "abilities-loadout" => "divider:abilities-loadout",
        "settings-general" => "divider:settings-general",
        "settings-controller" => "divider:settings-controller",
        "settings-remap" => "divider:settings-remap",
        "settings-audio" => "divider:settings-audio",
        "remap-caption" => "divider:remap-caption",
        other => {
            debug_assert!(false, "unknown section divider key: {other}");
            "divider:map-icons"
        }
    }
}

impl Render for Menu {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        self.sync_controls(cx);
        let content = match self.state.active_tab() {
            Tab::Map => self.render_map_tab(cx),
            Tab::Progress => self.render_progress_tab(cx),
            Tab::Abilities => self.render_abilities_tab(cx),
            Tab::Settings => self.render_settings_tab(cx),
        };
        let header = self.render_header(cx);
        let tabs = self.render_tab_bar(cx);
        let footer = self.render_footer(cx);
        let modal = self.render_remap_modal(cx);

        let mut root = div()
            .id("orion-pause")
            .size_full()
            .relative()
            .flex()
            .flex_col()
            .bg(Colors::paint(self.colors.ink))
            .text_color(Colors::paint(self.colors.bone))
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
            .child(header)
            .child(tabs)
            .child(
                div()
                    .id("content-region")
                    .flex_1()
                    .overflow_hidden()
                    .px(px(24.))
                    .py(px(16.))
                    .child(content),
            )
            .child(footer);
        if let Some(modal) = modal {
            root = root.child(modal);
        }
        root
    }
}
