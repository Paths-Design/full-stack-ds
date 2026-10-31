using System;
using System.Collections.Generic;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>Settings tab: four stacked sections composed with the generated Accordion, generated
    /// Switch toggles and generated Text/Divider chrome. Sliders, dropdowns, swatches, the remap
    /// capture modal and the subtitle preview strip are engine-native or hand-authored fallbacks.</summary>
    public sealed class SettingsTab
    {
        private readonly PauseMenuApp app;
        private readonly FixtureSet fixtures;
        private readonly OrionPalette palette;
        private readonly Dictionary<string, Switch> generalSwitches = new Dictionary<string, Switch>();
        private readonly Dictionary<string, Text> generalValues = new Dictionary<string, Text>();
        private readonly Dictionary<string, VisualElement> generalRows = new Dictionary<string, VisualElement>();
        private readonly Dictionary<string, Slider> controllerSliders = new Dictionary<string, Slider>();
        private readonly Dictionary<string, Text> controllerValues = new Dictionary<string, Text>();
        private readonly Dictionary<string, Button> remapButtons = new Dictionary<string, Button>();
        private readonly Dictionary<string, Slider> audioSliders = new Dictionary<string, Slider>();
        private readonly Dictionary<string, Text> audioValues = new Dictionary<string, Text>();
        private readonly Dictionary<string, Button> swatches = new Dictionary<string, Button>();
        private readonly Dictionary<string, SubtitleBackgroundOptionData> backgroundOptions =
            new Dictionary<string, SubtitleBackgroundOptionData>();

        public VisualElement Root { get; }
        public ScrollView Scroller { get; }
        public Accordion Sections { get; }
        public Text RemapStatus { get; }
        public DropdownField AudioLanguageDropdown { get; }
        public DropdownField SubtitleLanguageDropdown { get; }
        public VisualElement SubtitlePreview { get; }
        public Text SubtitlePreviewText { get; }
        public Text SubtitlePreviewMeta { get; }
        public VisualElement RemapModal { get; }
        public Text RemapActionLabel { get; }
        public Text RemapPrompt { get; }
        public Button RemapCancel { get; }

        public SettingsTab(PauseMenuApp app)
        {
            this.app = app;
            fixtures = app.State.Fixtures;
            palette = app.Palette;
            foreach (var option in fixtures.Settings.Audio.SubtitleBackground.Options)
                backgroundOptions[option.Id] = option;

            var scroll = new ScrollView(ScrollViewMode.Vertical);
            scroll.AddToClassList("settings-scroll");
            scroll.name = "settings-tab";
            Scroller = scroll;

            Sections = new Accordion { name = "settings-sections" };
            Sections.Type = "multiple";
            Sections.Collapsible = false;
            Sections.AddToClassList("settings-accordion");

            RemapStatus = Ui.Styled(Ui.Caption(string.Empty), "remap-status");
            RemapStatus.name = "remap-status";

            var remapStatusHolder = RemapStatus;
            AddSection("general", "GENERAL", BuildGeneral());
            AddSection("controller", "CONTROLLER", BuildController());
            AddSection("remap", "CONTROLLER REMAP", BuildRemap(remapStatusHolder));
            AddSection("audio", "AUDIO & SUBTITLES", BuildAudio(out var audioDropdown, out var subtitleDropdown,
                out var preview, out var previewText, out var previewMeta));
            AudioLanguageDropdown = audioDropdown;
            SubtitleLanguageDropdown = subtitleDropdown;
            SubtitlePreview = preview;
            SubtitlePreviewText = previewText;
            SubtitlePreviewMeta = previewMeta;

            Sections.Values = new[] { "general", "controller", "remap", "audio" };
            scroll.Add(Sections);
            Root = scroll;

            RemapModal = BuildRemapModal(out var actionLabel, out var prompt, out var cancel);
            RemapActionLabel = actionLabel;
            RemapPrompt = prompt;
            RemapCancel = cancel;

            RefreshPreview();
        }

        public Switch GeneralSwitch(string id) => generalSwitches[id];
        public Text GeneralValueText(string id) => generalValues[id];
        public VisualElement GeneralRow(string id) => generalRows[id];
        public Slider ControllerSlider(string id) => controllerSliders[id];
        public Text ControllerValueText(string id) => controllerValues[id];
        public Button RemapButton(string id) => remapButtons[id];
        public Slider AudioSlider(string id) => audioSliders[id];
        public Text AudioValueText(string id) => audioValues[id];
        public Button Swatch(string id) => swatches[id];
        public bool RemapModalOpen => app.State.RemapModalOpen;

        public Slider ControllerSliderFor(string settingId) => controllerSliders[settingId];

        public void ShowRemapModal(string actionId)
        {
            var action = FindRemap(actionId);
            if (action == null) throw new ArgumentException("Unknown remap action id '" + actionId + "'.");
            app.State.RemapModalOpen = true;
            app.State.RemapActionId = actionId;
            RemapActionLabel.text = action.Label + "  //  CURRENT BINDING " + action.Binding;
            RemapPrompt.text = "PRESS ANY KEY OR BUTTON";
            RemapModal.style.display = DisplayStyle.Flex;
            RemapModal.BringToFront();
        }

        public void HideRemapModal()
        {
            app.State.RemapModalOpen = false;
            app.State.RemapActionId = null;
            RemapModal.style.display = DisplayStyle.None;
        }

        /// <summary>Returns true when the modal consumed the key. Escape cancels; every other key
        /// is the new binding, per the shared interaction contract (I13/I15).</summary>
        public bool HandleModalKey(KeyDownEvent evt)
        {
            if (!RemapModalOpen) return false;
            if (evt.keyCode == KeyCode.Escape)
            {
                app.CancelRemap();
                return true;
            }
            if (evt.keyCode == KeyCode.None) return true;
            app.CompleteRemap(BindingFor(evt.keyCode));
            return true;
        }

        public void RefreshRemap()
        {
            foreach (var action in fixtures.Settings.Remap) remapButtons[action.Id].text = app.State.RemapBinding(action.Id);
        }

        public static string BindingFor(KeyCode key)
        {
            switch (key)
            {
                case KeyCode.LeftShift:
                case KeyCode.RightShift: return "SHIFT";
                case KeyCode.LeftControl:
                case KeyCode.RightControl: return "CTRL";
                case KeyCode.LeftAlt:
                case KeyCode.RightAlt:
                case KeyCode.AltGr: return "ALT";
                case KeyCode.Space: return "SPACE";
                case KeyCode.Return:
                case KeyCode.KeypadEnter: return "ENTER";
                case KeyCode.Tab: return "TAB";
                case KeyCode.UpArrow: return "UP";
                case KeyCode.DownArrow: return "DOWN";
                case KeyCode.LeftArrow: return "LEFT";
                case KeyCode.RightArrow: return "RIGHT";
            }
            if (key >= KeyCode.A && key <= KeyCode.Z) return ((char)('A' + (key - KeyCode.A))).ToString();
            if (key >= KeyCode.Alpha0 && key <= KeyCode.Alpha9) return ((char)('0' + (key - KeyCode.Alpha0))).ToString();
            if (key >= KeyCode.F1 && key <= KeyCode.F15) return "F" + (key - KeyCode.F1 + 1);
            return key.ToString().ToUpperInvariant();
        }

        public static int Snap(float value, int min, int max, int step)
        {
            if (step <= 0) step = 1;
            var snapped = min + Mathf.RoundToInt((value - min) / step) * step;
            return Mathf.Clamp(snapped, min, max);
        }

        private void AddSection(string value, string label, VisualElement body)
        {
            var item = new AccordionItem();
            var header = new AccordionHeader();
            var trigger = new AccordionTrigger { Value = value, text = label };
            trigger.name = "settings-section-" + value;
            var content = new AccordionContent { Value = value };
            content.Add(body);
            header.Add(trigger);
            item.Add(header);
            item.Add(content);
            Sections.Add(item);
        }

        private VisualElement BuildGeneral()
        {
            var body = Ui.Box("settings-body");
            foreach (var toggle in fixtures.Settings.General)
            {
                var row = Ui.Box("setting-row");
                row.name = "general-row-" + toggle.Id;
                row.EnableInClassList("is-on", app.State.GeneralValue(toggle.Id));
                var switchControl = new Switch { name = "general-" + toggle.Id, Checked = app.State.GeneralValue(toggle.Id) };
                switchControl.AddToClassList("general-switch");
                var label = Ui.Styled(Ui.Body(toggle.Label), "setting-label");
                label.AddToClassList("switch-label");
                switchControl.Add(label);
                row.Add(switchControl);
                row.Add(Ui.Styled(Ui.Caption(toggle.Description), "setting-description"));
                var value = Ui.Chip(app.State.GeneralValue(toggle.Id) ? "ON" : "OFF", "value-chip");
                value.name = "general-value-" + toggle.Id;
                row.Add(value);
                switchControl.RegisterValueChangedCallback(evt =>
                {
                    app.State.SetGeneralValue(toggle.Id, evt.newValue);
                    value.text = evt.newValue ? "ON" : "OFF";
                    row.EnableInClassList("is-on", evt.newValue);
                });
                generalSwitches[toggle.Id] = switchControl;
                generalValues[toggle.Id] = value;
                generalRows[toggle.Id] = row;
                body.Add(row);
            }
            return body;
        }

        private VisualElement BuildController()
        {
            var body = Ui.Box("settings-body");
            foreach (var setting in fixtures.Settings.Controller)
            {
                var row = Ui.Box("setting-row setting-row--slider");
                row.name = "controller-row-" + setting.Id;
                var left = Ui.Box("setting-copy");
                left.Add(Ui.Styled(Ui.Body(setting.Label), "setting-label"));
                left.Add(Ui.Caption(setting.Description));
                row.Add(left);
                var right = Ui.Box("setting-control");
                var value = Ui.Styled(Ui.Title(app.State.ControllerValue(setting.Id) + setting.Unit), "slider-value");
                value.name = "controller-value-" + setting.Id;
                var slider = BuildSlider(setting.Min, setting.Max, app.State.ControllerValue(setting.Id));
                slider.name = "controller-" + setting.Id;
                // NOT FSDS: all three native allowlists lack Slider; native UI Toolkit Slider.
                slider.RegisterValueChangedCallback(evt =>
                {
                    var snapped = Snap(evt.newValue, setting.Min, setting.Max, setting.Step);
                    if (Mathf.Abs(slider.value - snapped) > 0.0001f) slider.SetValueWithoutNotify(snapped);
                    app.State.SetControllerValue(setting.Id, snapped);
                    value.text = snapped + setting.Unit;
                });
                right.Add(value);
                right.Add(slider);
                row.Add(right);
                body.Add(row);
                controllerSliders[setting.Id] = slider;
                controllerValues[setting.Id] = value;
            }
            return body;
        }

        private VisualElement BuildRemap(Text status)
        {
            var body = Ui.Box("settings-body");
            body.Add(status);
            foreach (var action in fixtures.Settings.Remap)
            {
                var row = Ui.Box("setting-row setting-row--remap");
                row.name = "remap-row-" + action.Id;
                var copy = Ui.Box("setting-copy");
                copy.Add(Ui.Styled(Ui.Body(action.Label), "setting-label"));
                copy.Add(Ui.Caption(FindRemap(action.Id).Binding + " CURRENTLY BOUND"));
                row.Add(copy);
                var button = Ui.NativeButton(app.State.RemapBinding(action.Id), "binding-button",
                    () => app.OpenRemapModal(action.Id));
                button.name = "remap-" + action.Id;
                row.Add(button);
                remapButtons[action.Id] = button;
                body.Add(row);
            }
            return body;
        }

        private VisualElement BuildAudio(out DropdownField audioLanguage, out DropdownField subtitleLanguage,
            out VisualElement preview, out Text previewText, out Text previewMeta)
        {
            var body = Ui.Box("settings-body");
            foreach (var sliderSetting in fixtures.Settings.Audio.Sliders)
            {
                var row = Ui.Box("setting-row setting-row--slider");
                row.name = "audio-row-" + sliderSetting.Id;
                var copy = Ui.Box("setting-copy");
                copy.Add(Ui.Styled(Ui.Body(sliderSetting.Label), "setting-label"));
                row.Add(copy);
                var right = Ui.Box("setting-control");
                var value = Ui.Styled(Ui.Title(app.State.AudioValue(sliderSetting.Id) + sliderSetting.Unit), "slider-value");
                value.name = "audio-value-" + sliderSetting.Id;
                var slider = BuildSlider(0, 100, app.State.AudioValue(sliderSetting.Id));
                slider.name = "audio-" + sliderSetting.Id;
                // NOT FSDS: all three native allowlists lack Slider; native UI Toolkit Slider.
                slider.RegisterValueChangedCallback(evt =>
                {
                    var snapped = Snap(evt.newValue, 0, 100, 1);
                    if (Mathf.Abs(slider.value - snapped) > 0.0001f) slider.SetValueWithoutNotify(snapped);
                    app.State.SetAudioValue(sliderSetting.Id, snapped);
                    value.text = snapped + sliderSetting.Unit;
                });
                right.Add(value);
                right.Add(slider);
                row.Add(right);
                body.Add(row);
                audioSliders[sliderSetting.Id] = slider;
                audioValues[sliderSetting.Id] = value;
            }

            var languageRow = Ui.Box("setting-row setting-row--language");
            audioLanguage = BuildDropdown(fixtures.Settings.Audio.AudioLanguage, out var audioHolder);
            languageRow.Add(audioHolder);
            subtitleLanguage = BuildDropdown(fixtures.Settings.Audio.SubtitleLanguage, out var subtitleHolder);
            languageRow.Add(subtitleHolder);
            body.Add(languageRow);

            audioLanguage.RegisterValueChangedCallback(evt =>
            {
                app.State.AudioLanguage = evt.newValue;
                RefreshPreview();
            });
            subtitleLanguage.RegisterValueChangedCallback(evt =>
            {
                app.State.SubtitleLanguage = evt.newValue;
                RefreshPreview();
            });

            body.Add(Ui.Styled(Ui.Overline("SUBTITLE BACKGROUND"), "block-label"));
            var swatchRow = Ui.Box("swatch-row");
            foreach (var option in fixtures.Settings.Audio.SubtitleBackground.Options)
            {
                var color = OrionPalette.FromHex(option.Value);
                var swatch = Ui.NativeButton(string.Empty, "swatch", () => app.SetSubtitleBackground(option.Id));
                // NOT FSDS: no ColorField or swatch control in the Unity allowlist; app-authored swatch.
                swatch.name = "swatch-" + option.Id;
                swatch.style.backgroundColor = color;
                var label = Ui.Overline(option.Label);
                label.style.color = palette.ContrastText(color);
                swatch.Add(label);
                Ui.IgnorePicking(label);
                swatchRow.Add(swatch);
                swatches[option.Id] = swatch;
            }
            body.Add(swatchRow);

            preview = Ui.Box("subtitle-preview");
            preview.name = "subtitle-preview";
            previewMeta = Ui.Styled(Ui.Overline(""), "subtitle-preview-meta");
            previewMeta.name = "subtitle-preview-meta";
            previewText = Ui.Body(fixtures.Settings.Audio.PreviewLine);
            previewText.AddToClassList("subtitle-preview-text");
            previewText.name = "subtitle-preview-text";
            preview.Add(previewMeta);
            preview.Add(previewText);
            body.Add(preview);
            return body;
        }

        private DropdownField BuildDropdown(LanguageSettingData setting, out VisualElement holder)
        {
            holder = Ui.Box("setting-control setting-control--dropdown");
            holder.Add(Ui.Styled(Ui.Overline(setting.Label), "block-label"));
            var choices = new List<string>(setting.Options);
            // NOT FSDS: DropdownField is not in the Unity allowlist; native UI Toolkit DropdownField.
            var dropdown = new DropdownField(choices, Mathf.Max(0, choices.IndexOf(setting.Value)));
            dropdown.name = "dropdown-" + setting.Label.ToLowerInvariant().Replace(' ', '-');
            holder.Add(dropdown);
            return dropdown;
        }

        private static Slider BuildSlider(int min, int max, int value)
        {
            var slider = new Slider();
            slider.lowValue = min;
            slider.highValue = max;
            slider.showInputField = false;
            slider.value = Mathf.Clamp(value, min, max);
            slider.AddToClassList("setting-slider");
            return slider;
        }

        private RemapActionData FindRemap(string id)
        {
            foreach (var action in fixtures.Settings.Remap) if (action.Id == id) return action;
            return null;
        }

        public void SetSubtitleBackground(string optionId)
        {
            if (!backgroundOptions.ContainsKey(optionId)) throw new ArgumentException("Unknown subtitle background id '" + optionId + "'.");
            app.State.SubtitleBackgroundId = optionId;
            RefreshPreview();
        }

        private void RefreshPreview()
        {
            var option = backgroundOptions[app.State.SubtitleBackgroundId];
            var color = OrionPalette.FromHex(option.Value);
            SubtitlePreview.style.backgroundColor = color;
            var textColor = palette.ContrastText(color);
            SubtitlePreviewText.style.color = textColor;
            SubtitlePreviewMeta.style.color = textColor;
            SubtitlePreviewMeta.text = "SUBTITLE PREVIEW  //  " + app.State.SubtitleLanguage.ToUpperInvariant()
                                       + "  //  " + option.Label;
            foreach (var pair in swatches)
            {
                var selected = pair.Key == app.State.SubtitleBackgroundId;
                pair.Value.EnableInClassList("is-selected", selected);
                var border = selected ? palette.Signal : palette.SurfaceRuleStrong;
                pair.Value.style.borderTopColor = border;
                pair.Value.style.borderLeftColor = border;
                pair.Value.style.borderRightColor = border;
                pair.Value.style.borderBottomColor = border;
            }
        }

        private VisualElement BuildRemapModal(out Text actionLabel, out Text prompt, out Button cancel)
        {
            var modal = Ui.Box("remap-modal");
            modal.name = "remap-modal";
            modal.style.display = DisplayStyle.None;
            var panel = Ui.Box("remap-panel");
            panel.Add(Ui.Overline("CONTROLLER REMAP  //  INPUT CAPTURE"));
            actionLabel = Ui.Styled(Ui.Headline(""), "remap-action-label");
            actionLabel.name = "remap-action-label";
            panel.Add(actionLabel);
            prompt = Ui.Styled(Ui.Title("PRESS ANY KEY OR BUTTON"), "remap-prompt");
            prompt.name = "remap-prompt";
            panel.Add(prompt);
            panel.Add(Ui.Caption("ESCAPE CANCELS WITHOUT CHANGING THE BINDING"));
            cancel = Ui.NativeButton("CANCEL", "key-chip", () => app.CancelRemap());
            cancel.name = "remap-cancel";
            panel.Add(cancel);
            modal.Add(panel);
            // NOT FSDS: no Dialog/Modal in the Unity allowlist; app-authored blocking overlay.
            modal.RegisterCallback<PointerDownEvent>(evt =>
            {
                if (evt.target != modal) return;
                if (evt.button >= 0 && evt.button <= 6) app.CompleteRemap("MOUSE " + (evt.button + 1));
            });
            return modal;
        }
    }
}
