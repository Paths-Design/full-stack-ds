//! SETTINGS tab: 2x2 panels — General switches (I11), Controller sliders (I12),
//! Controller remap + key-waiting modal (I13), Audio & subtitles (I14), with the
//! one-overlay-at-a-time dismissal model (I15). Geometry from
//! `parity-layout.json`; sliders/dropdowns/swatches are hand-authored fallbacks.

use gpui::{div, px, AnyElement, Context, IntoElement, ParentElement, Styled, prelude::*};

use game_pause_menu_gpui::seam::{DropdownKind, Rect, SliderState};

use super::{colors, style, widgets, Menu, SliderTarget};

impl Menu {
    pub(crate) fn render_settings_tab(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let layout = self.layout.clone();
        let mut children: Vec<AnyElement> = Vec::new();
        for panel in layout.settings.panels.clone() {
            children.push(widgets::panel_on(&layout, panel.rect, &layout.panels.elevated_background).into_any_element());
            children.push(self.text_at(
                cx,
                format!("settings:{}:title", panel.id),
                style::panel_title(&layout.type_scale),
                &layout.colors.bone_bright,
                panel.title.clone(),
                panel.rect.x + layout.panels.padding,
                panel.rect.y + (style::SETTINGS_HEADER_HEIGHT - layout.type_scale.panel_title) / 2.0,
            ));
            children.push(self.text_right(
                cx,
                format!("settings:{}:meta", panel.id),
                style::panel_meta(&layout.type_scale),
                &layout.colors.text_secondary,
                panel.meta.clone(),
                Rect {
                    x: panel.rect.right() - layout.panels.padding - 420.0,
                    y: panel.rect.y
                        + (style::SETTINGS_HEADER_HEIGHT - layout.type_scale.panel_meta) / 2.0,
                    w: 420.0,
                    h: style::SETTINGS_HEADER_HEIGHT,
                },
            ));
            children.push(self.rule(
                cx,
                settings_rule_key(&panel.id),
                Rect {
                    x: panel.rect.x,
                    y: panel.rect.y + style::SETTINGS_HEADER_HEIGHT,
                    w: panel.rect.w,
                    h: layout.style.panel_border,
                },
            ));
        }
        children.extend(self.render_general(cx));
        children.extend(self.render_controller(cx));
        children.extend(self.render_remap(cx));
        children.extend(self.render_audio(cx));
        div().children(children).into_any_element()
    }

    // -- GENERAL -------------------------------------------------------

    fn render_general(&mut self, cx: &mut Context<Self>) -> Vec<AnyElement> {
        let layout = self.layout.clone();
        let panel = layout.panel("general").expect("parity settings panel").rect;
        let padding = layout.panels.padding;
        let row_h = layout.settings.row_h;
        let mut children: Vec<AnyElement> = Vec::new();
        for (index, row) in self.state.general().to_vec().iter().enumerate() {
            let row_y = layout.settings.first_row_y + index as f32 * row_h;
            children.push(self.text_at(
                cx,
                format!("general:{}:label", row.id),
                style::row_label(&layout.type_scale),
                &layout.colors.bone_bright,
                row.label.clone(),
                panel.x + padding,
                row_y + 4.0,
            ));
            children.push(self.text_at(
                cx,
                format!("general:{}:description", row.id),
                style::row_sub(&layout.type_scale),
                &layout.colors.muted,
                row.description.clone(),
                panel.x + padding,
                row_y + 20.0,
            ));
            let switch = self
                .general_switches
                .iter()
                .find(|(id, _)| id == &row.id)
                .map(|(_, pair)| Menu::switch_for(pair, row.value));
            if let Some(switch) = switch {
                children.push(
                    widgets::at(
                        panel.right() - padding - layout.switch.width,
                        row_y + (row_h - layout.switch.height) / 2.0,
                        layout.switch.width,
                        layout.switch.height,
                    )
                    .flex()
                    .flex_col()
                    .items_start()
                    .child(switch)
                    .into_any_element(),
                );
            }
            children.push(self.rule(
                cx,
                general_rule_key(index),
                Rect {
                    x: panel.x + padding,
                    y: row_y + row_h - layout.style.panel_border,
                    w: panel.w - padding * 2.0,
                    h: layout.style.panel_border,
                },
            ));
        }
        children
    }

    // -- CONTROLLER ----------------------------------------------------

    fn render_controller(&mut self, cx: &mut Context<Self>) -> Vec<AnyElement> {
        let layout = self.layout.clone();
        let panel = layout.panel("controller").expect("parity settings panel").rect;
        let padding = layout.panels.padding;
        let row_h = layout.settings.row_h;
        let mut children: Vec<AnyElement> = Vec::new();
        for (index, row) in self.state.controller().to_vec().iter().enumerate() {
            let row_y = layout.settings.first_row_y + index as f32 * row_h;
            let value_w = 44.0;
            let value_x = panel.right() - padding - value_w;
            let slider_x = value_x - 8.0 - layout.settings.slider.w;
            let label_w = slider_x - (panel.x + padding) - 16.0;
            children.push(self.text_box(
                cx,
                format!("controller:{}:label", row.id),
                style::row_label(&layout.type_scale),
                &layout.colors.bone_bright,
                row.label.clone(),
                Rect {
                    x: panel.x + padding,
                    y: row_y + 4.0,
                    w: label_w,
                    h: layout.type_scale.row_label + 2.0,
                },
            ));
            children.push(self.text_box(
                cx,
                format!("controller:{}:description", row.id),
                style::row_sub(&layout.type_scale),
                &layout.colors.muted,
                row.description.clone(),
                Rect {
                    x: panel.x + padding,
                    y: row_y + 20.0,
                    w: label_w,
                    h: 14.0,
                },
            ));
            let slider_y = row_y + (row_h - layout.settings.slider.thumb) / 2.0;
            children.push(self.render_slider(
                cx,
                format!("controller:{}", row.id),
                slider_x,
                slider_y,
                row,
                SliderTarget::Controller,
            ));
            children.push(self.text_right(
                cx,
                format!("controller:{}:value", row.id),
                style::slider_value(&layout.type_scale),
                &layout.colors.bone_bright,
                row.value_label(),
                Rect {
                    x: value_x,
                    y: row_y + 4.0,
                    w: value_w,
                    h: layout.type_scale.value + 2.0,
                },
            ));
            children.push(self.rule(
                cx,
                controller_rule_key(index),
                Rect {
                    x: panel.x + padding,
                    y: row_y + row_h - layout.style.panel_border,
                    w: panel.w - padding * 2.0,
                    h: layout.style.panel_border,
                },
            ));
        }
        children
    }

    // -- REMAP ---------------------------------------------------------

    fn render_remap(&mut self, cx: &mut Context<Self>) -> Vec<AnyElement> {
        let layout = self.layout.clone();
        let panel = layout.panel("remap").expect("parity settings panel").rect;
        let padding = layout.panels.padding;
        let row_h = layout.settings.remap_row_h;
        let button = layout.settings.binding_button.clone();
        let mut children: Vec<AnyElement> = Vec::new();
        for (index, row) in self.state.remap().to_vec().iter().enumerate() {
            let row_y = layout.settings.remap_first_row_y + index as f32 * row_h;
            children.push(self.text_at(
                cx,
                format!("remap:{}:label", row.id),
                style::row_label(&layout.type_scale),
                &layout.colors.bone_bright,
                row.label.clone(),
                panel.x + padding,
                row_y + 4.0,
            ));
            let binding = self.text(
                cx,
                format!("remap:{}:binding", row.id),
                style::button_secondary(),
                &layout.colors.bone_bright,
                row.binding.clone(),
            );
            let action_id = row.id.clone();
            // Binding button: graphite fill, ruleStrong border, 11px/700 text.
            let binding_button = div()
                .id(("binding-button", index))
                .w(px(button.w))
                .h(px(button.h))
                .flex()
                .items_center()
                .justify_center()
                .bg(colors::paint(&layout.colors.graphite))
                .border_1()
                .border_color(colors::paint(&layout.colors.rule_strong))
                .cursor_pointer()
                .on_click(cx.listener(move |this, _, window, cx| {
                    this.begin_remap(&action_id, window, cx)
                }))
                .child(binding);
            children.push(
                widgets::at(
                    panel.right() - padding - button.w,
                    row_y + (row_h - button.h) / 2.0,
                    button.w,
                    button.h,
                )
                .child(binding_button)
                .into_any_element(),
            );
            children.push(self.rule(
                cx,
                remap_rule_key(index),
                Rect {
                    x: panel.x + padding,
                    y: row_y + row_h - layout.style.panel_border,
                    w: panel.w - padding * 2.0,
                    h: layout.style.panel_border,
                },
            ));
        }
        children
    }

    // -- AUDIO & SUBTITLES ---------------------------------------------

    fn render_audio(&mut self, cx: &mut Context<Self>) -> Vec<AnyElement> {
        let layout = self.layout.clone();
        let panel = layout.panel("audio").expect("parity settings panel").rect;
        let padding = layout.panels.padding;
        let row_h = layout.settings.audio_row_h;
        let mut children: Vec<AnyElement> = Vec::new();
        for (index, row) in self.state.audio_sliders().to_vec().iter().enumerate() {
            let row_y = layout.settings.audio_first_row_y + index as f32 * row_h;
            children.push(self.text_at(
                cx,
                format!("audio:{}:label", row.id),
                style::row_label(&layout.type_scale),
                &layout.colors.bone_bright,
                row.label.clone(),
                panel.x + padding,
                row_y + 4.0,
            ));
            let value_x = panel.right() - padding - layout.settings.slider.w - 68.0;
            let slider_x = panel.right() - padding - layout.settings.slider.w;
            let slider_y = row_y + (row_h - layout.settings.slider.thumb) / 2.0;
            children.push(self.render_slider(
                cx,
                format!("audio:{}", row.id),
                slider_x,
                slider_y,
                row,
                SliderTarget::Audio,
            ));
            children.push(self.text_right(
                cx,
                format!("audio:{}:value", row.id),
                style::slider_value(&layout.type_scale),
                &layout.colors.bone_bright,
                row.value_label(),
                Rect {
                    x: value_x,
                    y: row_y + (row_h - layout.type_scale.value) / 2.0,
                    w: 56.0,
                    h: layout.type_scale.value,
                },
            ));
            children.push(self.rule(
                cx,
                audio_rule_key(index),
                Rect {
                    x: panel.x + padding,
                    y: row_y + row_h - layout.style.panel_border,
                    w: panel.w - padding * 2.0,
                    h: layout.style.panel_border,
                },
            ));
        }
        let dropdown_w = layout.settings.dropdown.w;
        let dropdown_h = layout.settings.dropdown_h;
        let dropdown_y = layout.settings.dropdown_y;
        children.push(self.render_language_dropdown(
            cx,
            DropdownKind::AudioLanguage,
            panel.x + padding,
            layout.settings.language_label_y,
            dropdown_y,
            dropdown_h,
        ));
        children.push(self.render_language_dropdown(
            cx,
            DropdownKind::SubtitleLanguage,
            panel.x + padding + dropdown_w + padding,
            layout.settings.language_label_y,
            dropdown_y,
            dropdown_h,
        ));
        // Swatches.
        let swatch = layout.settings.swatch.clone();
        let swatch_y = layout.settings.swatch_y;
        children.push(self.text_at(
            cx,
            "audio:swatch-label",
            style::micro(&layout.type_scale),
            &layout.colors.muted,
            "SUBTITLE BACKGROUND",
            panel.x + padding,
            layout.settings.swatch_label_y,
        ));
        let selected = self.state.subtitle_background().id.clone();
        for (index, option) in self.state.subtitle_background_options().to_vec().iter().enumerate() {
            let is_selected = option.id == selected;
            let swatch_id = option.id.clone();
            let x = panel.x + padding + index as f32 * (swatch.w + swatch.gap);
            let mut block = div()
                .id(("subtitle-swatch", index))
                .absolute()
                .left(px(x))
                .top(px(swatch_y))
                .w(px(swatch.w))
                .h(px(layout.settings.swatch_h))
                .bg(colors::paint(&option.value))
                .border_1()
                .border_color(colors::paint(&layout.colors.rule_strong))
                .cursor_pointer()
                .on_click(cx.listener(move |this, _, _, cx| {
                    this.select_background(&swatch_id, cx)
                }));
            if is_selected {
                block = block.border_2().border_color(colors::paint(&layout.colors.signal));
            }
            children.push(block.into_any_element());
        }
        // Live subtitle preview strip.
        let preview = layout.settings.preview;
        let background = self.state.subtitle_background().value.clone();
        let foreground = self.state.subtitle_preview_text_color().to_string();
        let preview_text = self.text(
            cx,
            "audio:preview",
            style::copy(&layout.type_scale),
            &foreground,
            format!(
                "{}   [{}]",
                self.state.subtitle_preview_line(),
                self.state.subtitle_language()
            ),
        );
        children.push(
            widgets::rect_box(preview)
                .bg(colors::paint(&background))
                .px(px(12.))
                .flex()
                .items_center()
                .border_1()
                .border_color(colors::paint(&layout.colors.rule_strong))
                .child(preview_text)
                .into_any_element(),
        );
        children
    }

    /// NOT FSDS: no Slider component on the target. 300x6 graphite track with a
    /// signal fill and a 16 px circular boneBright thumb; the whole track is
    /// divided into 20 pointer cells so a click sets the stepped value (I12/I14).
    fn render_slider(
        &mut self,
        cx: &mut Context<Self>,
        key: String,
        x: f32,
        y: f32,
        row: &SliderState,
        target: SliderTarget,
    ) -> AnyElement {
        let layout = self.layout.clone();
        let spec = layout.settings.slider.clone();
        let fraction = row.fraction();
        let thumb = spec.thumb;
        let track_y = y + (thumb - spec.h) / 2.0;
        let fill_w = (spec.w - thumb) * fraction + thumb;
        let thumb_x = (spec.w - thumb) * fraction;
        let steps = 20usize;
        let mut cells: Vec<AnyElement> = Vec::new();
        for step in 0..steps {
            let value = row.min + (row.max - row.min) * (step as f32 + 0.5) / steps as f32;
            let click_id = row.id.clone();
            cells.push(
                div()
                    .id(("slider-cell", slider_seed(&key) * 32 + step))
                    .w(px(spec.w / steps as f32))
                    .h(px(thumb))
                    .cursor_pointer()
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.set_slider(target, &click_id, value, cx)
                    }))
                    .into_any_element(),
            );
        }
        div()
            .absolute()
            .left(px(x))
            .top(px(y))
            .w(px(spec.w))
            .h(px(thumb))
            .child(
                div()
                    .absolute()
                    .left(px(0.))
                    .top(px(track_y - y))
                    .w(px(spec.w))
                    .h(px(spec.h))
                    .bg(colors::paint(&layout.colors.graphite)),
            )
            .child(
                div()
                    .absolute()
                    .left(px(0.))
                    .top(px(track_y - y))
                    .w(px(fill_w))
                    .h(px(spec.h))
                    .bg(colors::paint(&layout.colors.signal)),
            )
            .child(
                div()
                    .absolute()
                    .left(px(thumb_x))
                    .top(px(0.))
                    .w(px(thumb))
                    .h(px(thumb))
                    .rounded(px(thumb / 2.0))
                    .bg(colors::paint(&layout.colors.bone_bright)),
            )
            .child(div().flex().flex_row().children(cells))
            .into_any_element()
    }

    /// NOT FSDS: no Select component on the target — 200x30 graphite dropdown.
    fn render_language_dropdown(
        &mut self,
        cx: &mut Context<Self>,
        kind: DropdownKind,
        x: f32,
        label_y: f32,
        y: f32,
        height: f32,
    ) -> AnyElement {
        let layout = self.layout.clone();
        let spec = layout.settings.dropdown.clone();
        let value = match kind {
            DropdownKind::AudioLanguage => self.state.audio_language().to_string(),
            DropdownKind::SubtitleLanguage => self.state.subtitle_language().to_string(),
        };
        let label_text = match kind {
            DropdownKind::AudioLanguage => "AUDIO LANGUAGE",
            DropdownKind::SubtitleLanguage => "SUBTITLE LANGUAGE",
        };
        let open = self.state.dropdown() == Some(kind);
        let label = self.text_at(
            cx,
            format!("dropdown:{kind:?}:label"),
            style::micro(&layout.type_scale),
            &layout.colors.muted,
            label_text,
            x,
            label_y,
        );
        let value = self.text(
            cx,
            format!("dropdown:{kind:?}:value"),
            style::button_secondary(),
            &layout.colors.bone_bright,
            value.clone(),
        );
        let chevron = div()
            .text_size(px(layout.type_scale.chip))
            .font_weight(gpui::FontWeight::BOLD)
            .text_color(colors::paint(&layout.colors.muted))
            .child(if open { "▴" } else { "▾" });
        let button = div()
            .id(match kind {
                DropdownKind::AudioLanguage => "audio-language-button",
                DropdownKind::SubtitleLanguage => "subtitle-language-button",
            })
            .absolute()
            .left(px(x))
            .top(px(y))
            .w(px(spec.w))
            .h(px(height))
            .flex()
            .items_center()
            .justify_between()
            .px(px(8.))
            .bg(colors::paint(&layout.colors.graphite))
            .border_1()
            .border_color(colors::paint(&layout.colors.rule_strong))
            .cursor_pointer()
            .on_click(cx.listener(move |this, _, _, cx| {
                this.state.toggle_dropdown(kind);
                cx.notify();
            }))
            .child(value)
            .child(chevron);
        let mut children: Vec<AnyElement> = vec![label, button.into_any_element()];
        if open {
            let options = self.state.language_options(kind).to_vec();
            for (index, option) in options.iter().enumerate() {
                let selected = option == &value_text(&self.state, kind);
                let option_value = option.clone();
                let option_label = self.text(
                    cx,
                    format!("dropdown:{kind:?}:option:{index}"),
                    style::button_secondary(),
                    &layout.color(if selected { "signal" } else { "boneBright" }),
                    option.clone(),
                );
                children.push(
                    div()
                        .id(("language-option", index))
                        .absolute()
                        .left(px(x))
                        .top(px(y + height + index as f32 * 24.0))
                        .w(px(spec.w))
                        .h(px(24.))
                        .flex()
                        .items_center()
                        .px(px(8.))
                        .bg(colors::paint(&layout.colors.charcoal))
                        .border_1()
                        .border_color(colors::paint(&layout.colors.rule_strong))
                        .cursor_pointer()
                        .on_click(cx.listener(move |this, _, _, cx| {
                            this.select_language(kind, &option_value, cx)
                        }))
                        .child(option_label)
                        .into_any_element(),
                );
            }
        }
        div().children(children).into_any_element()
    }

    /// I13: the key-waiting remap modal (no Dialog component on the target).
    pub(crate) fn render_remap_modal(&mut self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let action_id = self.state.remap_waiting()?.to_string();
        let row = self
            .state
            .remap()
            .iter()
            .find(|row| row.id == action_id)?
            .clone();
        let layout = self.layout.clone();
        let spec = layout.settings.remap_modal.clone();
        let rect = Rect {
            x: spec.x,
            y: spec.y,
            w: spec.w,
            h: spec.h,
        };
        let focus = self.remap_focus.clone();
        let action_label = self.text(
            cx,
            "remap-modal:action",
            style::row_label(&layout.type_scale),
            &layout.colors.muted,
            format!("REBIND  {}", row.label),
        );
        let prompt = self.text(
            cx,
            "remap-modal:prompt",
            style::prompt(&layout.type_scale),
            &layout.colors.bone_bright,
            spec.prompt.clone(),
        );
        let binding = self.text(
            cx,
            "remap-modal:binding",
            style::value(&layout.type_scale),
            &layout.colors.muted,
            format!("CURRENT BINDING · {}", row.binding),
        );
        let hint = self.text(
            cx,
            "remap-modal:hint",
            style::micro(&layout.type_scale),
            &layout.colors.muted,
            "NEXT KEY REPLACES BINDING · ESC CANCELS",
        );
        let cancel_label = self.text(
            cx,
            "remap-modal:cancel",
            style::button_secondary(),
            &layout.colors.bone_bright,
            "CANCEL",
        );
        let cancel = div()
            .absolute()
            .left(px(rect.w - 16.0 - layout.settings.binding_button.w))
            .top(px(rect.h - 16.0 - layout.settings.binding_button.h))
            .child(widgets::outline_button(
                "remap-modal-cancel",
                cancel_label,
                layout.settings.binding_button.w,
                layout.settings.binding_button.h,
                &layout,
                cx.listener(|this, _, window, cx| this.cancel_remap_modal(window, cx)),
            ));
        let viewport = layout.viewport;
        let panel = widgets::rect_box(rect)
            .id("remap-modal")
            .flex()
            .flex_col()
            .items_center()
            .gap(px(10.))
            .py(px(20.))
            .bg(colors::paint(&layout.colors.charcoal))
            .border_2()
            .border_color(colors::paint(&layout.colors.signal))
            .track_focus(&focus)
            .on_key_down(
                cx.listener(|this, event: &gpui::KeyDownEvent, window, cx| {
                    this.capture_keystroke(event, window, cx)
                }),
            )
            .child(action_label)
            .child(prompt)
            .child(binding)
            .child(hint)
            .child(cancel);
        // Parity modal scrim: Unity and Godot dim the whole viewport behind the
        // remap panel; GPUI must carry the same ink/0.78 veil.
        Some(
            widgets::rect_box(Rect { x: 0.0, y: 0.0, w: viewport.width, h: viewport.height })
                .bg(colors::paint_alpha(&layout.colors.ink, 199))
                .child(panel)
                .into_any_element(),
        )
    }
}

fn value_text(state: &game_pause_menu_gpui::seam::AppState, kind: DropdownKind) -> String {
    match kind {
        DropdownKind::AudioLanguage => state.audio_language().to_string(),
        DropdownKind::SubtitleLanguage => state.subtitle_language().to_string(),
    }
}

fn slider_seed(id: &str) -> usize {
    let mut seed = 0usize;
    for byte in id.bytes() {
        seed = seed.wrapping_mul(31).wrapping_add(byte as usize);
    }
    seed % 64
}

fn settings_rule_key(id: &str) -> &'static str {
    match id {
        "general" => "rule:settings-general-header",
        "controller" => "rule:settings-controller-header",
        "remap" => "rule:settings-remap-header",
        _ => "rule:settings-audio-header",
    }
}

fn general_rule_key(index: usize) -> &'static str {
    const KEYS: [&str; 5] = [
        "rule:general-row-0",
        "rule:general-row-1",
        "rule:general-row-2",
        "rule:general-row-3",
        "rule:general-row-4",
    ];
    KEYS[index.min(4)]
}

fn controller_rule_key(index: usize) -> &'static str {
    const KEYS: [&str; 5] = [
        "rule:controller-row-0",
        "rule:controller-row-1",
        "rule:controller-row-2",
        "rule:controller-row-3",
        "rule:controller-row-4",
    ];
    KEYS[index.min(4)]
}

fn remap_rule_key(index: usize) -> &'static str {
    const KEYS: [&str; 6] = [
        "rule:remap-row-0",
        "rule:remap-row-1",
        "rule:remap-row-2",
        "rule:remap-row-3",
        "rule:remap-row-4",
        "rule:remap-row-5",
    ];
    KEYS[index.min(5)]
}

fn audio_rule_key(index: usize) -> &'static str {
    const KEYS: [&str; 4] = [
        "rule:audio-row-0",
        "rule:audio-row-1",
        "rule:audio-row-2",
        "rule:audio-row-3",
    ];
    KEYS[index.min(3)]
}
