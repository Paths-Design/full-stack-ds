//! Settings tab: General switches (I11), Controller sliders (I12), remap modal
//! that waits for the next key (I13), Audio & subtitles (I14), and the
//! one-at-a-time overlay dismissal model (I15).

use gpui::prelude::*;
use gpui::{
    AnyElement, Context, InteractiveElement, IntoElement, MouseButton, ParentElement, Styled,
    div, px,
};

use super::palette::{Colors, parse};
use super::widgets::outline_button;
use super::{Menu, SliderTarget, TextRole};
use game_pause_menu_gpui::seam::{DropdownKind, SliderState};

impl Menu {
    pub(crate) fn render_settings_tab(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let general = self.render_general_section(cx);
        let controller = self.render_controller_section(cx);
        let remap = self.render_remap_section(cx);
        let audio = self.render_audio_section(cx);
        let scroll = self.settings_scroll.clone();
        div()
            .id("settings-scroll")
            .size_full()
            .overflow_y_scroll()
            .track_scroll(&scroll)
            .flex()
            .flex_col()
            .gap_3()
            .child(general)
            .child(controller)
            .child(remap)
            .child(audio)
            .into_any_element()
    }

    // -- General (I11) -------------------------------------------------

    fn render_general_section(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let rows = self
            .state
            .general()
            .to_vec()
            .iter()
            .enumerate()
            .map(|(index, row)| {
                let switch = self
                    .general_switches
                    .iter()
                    .find(|(id, _)| id == &row.id)
                    .map(|(_, switch)| switch.clone())
                    .expect("general switch retained at startup");
                let label = self.text(
                    cx,
                    format!("general:{}:label", row.id),
                    TextRole::Value,
                    row.label.clone(),
                );
                let description = self.text(
                    cx,
                    format!("general:{}:description", row.id),
                    TextRole::Micro,
                    row.description.clone(),
                );
                div()
                    .id(("general-row", index))
                    .h(px(46.))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_4()
                    .border_b_1()
                    .border_color(Colors::paint(colors.rule))
                    .child(switch)
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap(px(1.))
                            .flex_1()
                            .child(label)
                            .child(description),
                    )
                    .into_any_element()
            })
            .collect::<Vec<_>>();
        super::section(
            self,
            cx,
            "settings-general",
            "GENERAL",
            Some("GENERATED SWITCH PER FIXTURE TOGGLE".to_string()),
            rows,
        )
    }

    // -- Controller sliders (I12) --------------------------------------

    fn render_controller_section(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let rows = self
            .state
            .controller()
            .to_vec()
            .iter()
            .enumerate()
            .map(|(index, row)| {
                let label = self.text(
                    cx,
                    format!("controller:{}:label", row.id),
                    TextRole::Value,
                    row.label.clone(),
                );
                let description = self.text(
                    cx,
                    format!("controller:{}:description", row.id),
                    TextRole::Micro,
                    row.description.clone(),
                );
                let value = self.text(
                    cx,
                    format!("controller:{}:value", row.id),
                    TextRole::ValueLarge,
                    row.value_label(),
                );
                let track = self.slider(cx, SliderTarget::Controller, row, index);
                div()
                    .id(("controller-row", index))
                    .h(px(54.))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_4()
                    .border_b_1()
                    .border_color(Colors::paint(self.colors.rule))
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap(px(1.))
                            .w(px(380.))
                            .child(label)
                            .child(description),
                    )
                    .child(track)
                    .child(div().w(px(74.)).flex().justify_end().child(value))
                    .into_any_element()
            })
            .collect::<Vec<_>>();
        super::section(
            self,
            cx,
            "settings-controller",
            "CONTROLLER",
            Some("HAND-AUTHORED STEPPED SLIDERS (NO SLIDER ON THE TARGET)".to_string()),
            rows,
        )
    }

    // -- Remap (I13) ---------------------------------------------------

    fn render_remap_section(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let rows = self
            .state
            .remap()
            .to_vec()
            .iter()
            .enumerate()
            .map(|(index, row)| {
                let label = self.text(
                    cx,
                    format!("remap:{}:label", row.id),
                    TextRole::Value,
                    row.label.clone(),
                );
                let binding = self.text(
                    cx,
                    format!("remap:{}:binding", row.id),
                    TextRole::MicroBright,
                    row.binding.clone(),
                );
                let action_id = row.id.clone();
                let button = outline_button(
                    "remap-binding-button",
                    binding,
                    colors,
                    cx.listener(move |this, _, window, cx| {
                        this.begin_remap(&action_id, window, cx)
                    }),
                );
                div()
                    .id(("remap-row", index))
                    .h(px(42.))
                    .flex()
                    .flex_row()
                    .items_center()
                    .justify_between()
                    .border_b_1()
                    .border_color(Colors::paint(colors.rule))
                    .child(label)
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .items_center()
                            .gap_3()
                            .child(
                                self.text(
                                    cx,
                                    format!("remap:{}:caption", row.id),
                                    TextRole::Micro,
                                    "BINDING",
                                ),
                            )
                            .child(button),
                    )
                    .into_any_element()
            })
            .collect::<Vec<_>>();
        super::section(
            self,
            cx,
            "settings-remap",
            "CONTROLLER REMAP",
            Some("ACTIVATE A BINDING TO OPEN THE KEY-WAITING MODAL".to_string()),
            rows,
        )
    }

    // -- Audio & subtitles (I14) ---------------------------------------

    fn render_audio_section(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let sliders = self
            .state
            .audio_sliders()
            .to_vec()
            .iter()
            .enumerate()
            .map(|(index, row)| {
                let label = self.text(
                    cx,
                    format!("audio:{}:label", row.id),
                    TextRole::Value,
                    row.label.clone(),
                );
                let value = self.text(
                    cx,
                    format!("audio:{}:value", row.id),
                    TextRole::Value,
                    row.value_label(),
                );
                let track = self.slider(cx, SliderTarget::Audio, row, index);
                div()
                    .id(("audio-row", index))
                    .h(px(42.))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_4()
                    .border_b_1()
                    .border_color(Colors::paint(colors.rule))
                    .child(div().w(px(120.)).child(label))
                    .child(track)
                    .child(div().w(px(60.)).flex().justify_end().child(value))
                    .into_any_element()
            })
            .collect::<Vec<_>>();

        let audio_language = self.language_dropdown(cx, DropdownKind::AudioLanguage);
        let subtitle_language = self.language_dropdown(cx, DropdownKind::SubtitleLanguage);

        let background_label = self.text(
            cx,
            "audio:background:label",
            TextRole::Micro,
            "SUBTITLE BACKGROUND",
        );
        let swatches = self
            .state
            .subtitle_background_options()
            .to_vec()
            .iter()
            .enumerate()
            .map(|(index, swatch)| {
                let selected = self.state.subtitle_background().id == swatch.id;
                let color = parse(&swatch.value);
                let swatch_id = swatch.id.clone();
                let colors = self.colors;
                div()
                    .id(("subtitle-swatch", index))
                    .w(px(34.))
                    .h(px(34.))
                    .bg(Colors::paint(color))
                    .border_1()
                    .border_color(Colors::paint(if selected {
                        colors.bone_bright
                    } else {
                        colors.rule_strong
                    }))
                    .when(selected, |this| this.border_2())
                    .cursor_pointer()
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.select_background(&swatch_id, cx)
                    }))
                    .into_any_element()
            })
            .collect::<Vec<_>>();
        let selected_swatch = self.state.subtitle_background().label.clone();
        let swatch_caption = self.text(
            cx,
            "audio:background:caption",
            TextRole::Micro,
            format!("SELECTED  ·  {selected_swatch}"),
        );

        let preview = self.render_subtitle_preview(cx);

        let mut children: Vec<AnyElement> = Vec::new();
        children.extend(sliders);
        children.push(
            div()
                .flex()
                .flex_row()
                .items_start()
                .gap_5()
                .pt_1()
                .child(audio_language)
                .child(subtitle_language)
                .into_any_element(),
        );
        children.push(
            div()
                .w_full()
                .flex()
                .flex_col()
                .gap_2()
                .pt_1()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_3()
                        .child(div().flex_none().child(background_label))
                        .child(div().flex_none().child(swatch_caption)),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_2()
                        .children(swatches),
                )
                .into_any_element(),
        );
        children.push(preview);
        super::section(
            self,
            cx,
            "settings-audio",
            "AUDIO & SUBTITLES",
            Some("PREVIEW STRIP REFLECTS BACKGROUND + SUBTITLE LANGUAGE".to_string()),
            children,
        )
    }

    /// Live subtitle preview strip: the selected swatch is the background and
    /// the palette's higher-contrast foreground is picked by the seam.
    fn render_subtitle_preview(&mut self, cx: &mut Context<Self>) -> AnyElement {
        let colors = self.colors;
        let swatch = self.state.subtitle_background().clone();
        let background = parse(&swatch.value);
        let foreground = self.state.subtitle_preview_text_color().to_string();
        let on_ink = foreground == Colors::hex(colors.bone_bright);
        let role = if on_ink {
            TextRole::PreviewOnInk
        } else {
            TextRole::PreviewOnBone
        };
        let line = self.text(
            cx,
            "audio:preview:line",
            role,
            format!(
                "{}   [{}]",
                self.state.subtitle_preview_line(),
                self.state.subtitle_language()
            ),
        );
        let caption = self.text(
            cx,
            "audio:preview:caption",
            TextRole::Micro,
            format!(
                "SUBTITLE PREVIEW  ·  {}  ·  {}",
                swatch.label,
                self.state.subtitle_language()
            ),
        );
        div()
            .flex()
            .flex_col()
            .gap_1()
            .child(
                div()
                    .w_full()
                    .px_3()
                    .py_2()
                    .bg(Colors::paint(background))
                    .border_1()
                    .border_color(Colors::paint(colors.rule_strong))
                    .child(line),
            )
            .child(caption)
            .into_any_element()
    }

    /// NOT FSDS: hand-authored stepped slider track — the target admits no
    /// Slider component. Each tick is a pointer target; the filled prefix and
    /// value label follow the seam's stepped value.
    fn slider(
        &mut self,
        cx: &mut Context<Self>,
        target: SliderTarget,
        row: &SliderState,
        row_index: usize,
    ) -> AnyElement {
        let colors = self.colors;
        let row = row.clone();
        let steps = (((row.max - row.min) / row.step).round() as usize).max(1);
        let current = (((row.value - row.min) / row.step).round() as usize).min(steps);
        let seed_base = match target {
            SliderTarget::Controller => 0usize,
            SliderTarget::Audio => 1000usize,
        };
        let ticks = (0..=steps)
            .map(|tick| {
                let value = row.min + tick as f32 * row.step;
                let filled = tick <= current;
                let id = row.id.clone();
                div()
                    .id(("slider-tick", seed_base + row_index * 64 + tick))
                    .w(px(7.))
                    .h(px(18.))
                    .bg(Colors::paint(if filled {
                        colors.signal
                    } else {
                        colors.inset
                    }))
                    .border_1()
                    .border_color(Colors::paint(if filled {
                        colors.signal
                    } else {
                        colors.rule
                    }))
                    .cursor_pointer()
                    .hover(move |style| style.bg(Colors::paint(colors.signal_hot)))
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.set_slider(target, &id, value, cx)
                    }))
                    .into_any_element()
            })
            .collect::<Vec<_>>();
        div()
            .flex()
            .flex_row()
            .items_center()
            .gap(px(2.))
            .px_1()
            .py_1()
            .bg(Colors::paint(colors.charcoal))
            .border_1()
            .border_color(Colors::paint(colors.rule))
            .children(ticks)
            .into_any_element()
    }

    /// NOT FSDS: no Select/Dropdown component on the target; each language
    /// picker is a hand-authored button + option list.
    fn language_dropdown(&mut self, cx: &mut Context<Self>, kind: DropdownKind) -> AnyElement {
        let colors = self.colors;
        let value = match kind {
            DropdownKind::AudioLanguage => self.state.audio_language().to_string(),
            DropdownKind::SubtitleLanguage => self.state.subtitle_language().to_string(),
        };
        let open = self.state.dropdown() == Some(kind);
        let label = self.text(
            cx,
            format!("language:{:?}:label", kind),
            TextRole::Micro,
            kind.label(),
        );
        let current = self.text(
            cx,
            format!("language:{:?}:value", kind),
            TextRole::MicroBright,
            value.clone(),
        );
        let caret = div()
            .text_size(px(11.))
            .font_weight(gpui::FontWeight::BOLD)
            .text_color(Colors::paint(colors.bone))
            .child(if open { "▴" } else { "▾" });
        let button_id = match kind {
            DropdownKind::AudioLanguage => "audio-language-button",
            DropdownKind::SubtitleLanguage => "subtitle-language-button",
        };
        let button = outline_button(
            button_id,
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap_2()
                .w(px(250.))
                .justify_between()
                .child(current)
                .child(caret),
            colors,
            cx.listener(move |this, _, _, cx| {
                this.state.toggle_dropdown(kind);
                cx.notify();
            }),
        );
        let options = if open {
            let rows = self
                .state
                .language_options(kind)
                .to_vec()
                .iter()
                .enumerate()
                .map(|(index, option)| {
                    let selected = option == &value;
                    let option_value = option.clone();
                    let option_label = self.text(
                        cx,
                        format!("language:{:?}:option:{index}", kind),
                        if selected {
                            TextRole::MicroSignal
                        } else {
                            TextRole::MicroBright
                        },
                        option.clone(),
                    );
                    div()
                        .id(("language-option", index))
                        .h(px(28.))
                        .px_2()
                        .flex()
                        .items_center()
                        .bg(Colors::paint(if selected {
                            colors.inset
                        } else {
                            colors.charcoal
                        }))
                        .cursor_pointer()
                        .hover(move |style| style.bg(Colors::paint(colors.row_hover)))
                        .on_click(cx.listener(move |this, _, _, cx| {
                            this.select_language(kind, &option_value, cx)
                        }))
                        .child(option_label)
                        .into_any_element()
                })
                .collect::<Vec<_>>();
            Some(
                div()
                    .id("language-options")
                    .absolute()
                    .top(px(52.))
                    .left_0()
                    .w(px(252.))
                    .p_1()
                    .flex()
                    .flex_col()
                    .gap(px(1.))
                    .bg(Colors::paint(colors.ink))
                    .border_2()
                    .border_color(Colors::paint(colors.signal))
                    .children(rows)
                    .into_any_element(),
            )
        } else {
            None
        };
        div()
            .relative()
            .flex()
            .flex_col()
            .gap_1()
            .w(px(260.))
            .child(label)
            .child(button)
            .children(options)
            .into_any_element()
    }

    /// I13: the single remap modal. It owns focus while waiting, so the next
    /// keystroke reaches `capture_keystroke` (Escape cancels without binding).
    pub(crate) fn render_remap_modal(&mut self, cx: &mut Context<Self>) -> Option<AnyElement> {
        let action_id = self.state.remap_waiting()?.to_string();
        let row = self
            .state
            .remap()
            .iter()
            .find(|row| row.id == action_id)?
            .clone();
        let colors = self.colors;
        let focus = self.remap_focus.clone();

        let eyebrow = self.text(
            cx,
            "remap-modal:eyebrow",
            TextRole::MicroSignal,
            "CONTROLLER REMAP",
        );
        let title = self.text(
            cx,
            "remap-modal:title",
            TextRole::Title,
            format!("REBIND  {}", row.label),
        );
        let waiting = self.text(
            cx,
            "remap-modal:waiting",
            TextRole::Headline,
            "PRESS ANY KEY OR BUTTON",
        );
        let current = self.text(
            cx,
            "remap-modal:current",
            TextRole::Value,
            format!("CURRENT BINDING  ·  {}", row.binding),
        );
        let hint = self.text(
            cx,
            "remap-modal:hint",
            TextRole::Micro,
            "THE NEXT KEY REPLACES THE BINDING  ·  ESC CANCELS WITHOUT CHANGING IT",
        );
        let caption = self.text(
            cx,
            "remap-modal:caption",
            TextRole::Micro,
            "ONLY ONE REMAP MODAL CAN BE OPEN AT A TIME",
        );
        let cancel_label = self.text(
            cx,
            "remap-modal:cancel-label",
            TextRole::MicroBright,
            "CANCEL",
        );
        let cancel = outline_button(
            "remap-modal-cancel",
            cancel_label,
            colors,
            cx.listener(|this, _, window, cx| this.cancel_remap_modal(window, cx)),
        );
        let divider = self.divider(cx, "divider:remap-caption");

        Some(
            div()
                .id("remap-backdrop")
                .absolute()
                .inset_0()
                .flex()
                .items_center()
                .justify_center()
                .bg(Colors::paint_alpha(0x000000B8))
                .on_mouse_down(
                    MouseButton::Left,
                    cx.listener(|this, _, window, cx| this.cancel_remap_modal(window, cx)),
                )
                .child(
                    div()
                        .id("remap-modal")
                        .w(px(540.))
                        .p_6()
                        .flex()
                        .flex_col()
                        .gap_3()
                        .bg(Colors::paint(colors.charcoal))
                        .border_2()
                        .border_color(Colors::paint(colors.signal))
                        .track_focus(&focus)
                        .on_key_down(cx.listener(
                            |this, event: &gpui::KeyDownEvent, window, cx| {
                                this.capture_keystroke(event, window, cx)
                            },
                        ))
                        .on_mouse_down(
                            MouseButton::Left,
                            cx.listener(|_, _, _, cx| cx.stop_propagation()),
                        )
                        .child(eyebrow)
                        .child(title)
                        .child(waiting)
                        .child(current)
                        .child(hint)
                        .child(divider)
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .justify_between()
                                .child(caption)
                                .child(cancel),
                        ),
                )
                .into_any_element(),
        )
    }
}
