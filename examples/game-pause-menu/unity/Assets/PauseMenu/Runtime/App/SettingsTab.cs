using System;
using System.Collections.Generic;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;
using DsButton = FullStackDS.Button;

namespace GamePauseMenu
{
    /// <summary>SETTINGS tab on the parity grid: four generated Card panels at the pinned 2x2
    /// rects, generated Switches for General, engine-native Sliders/Dropdowns (styled to the pinned
    /// geometry) for Controller/Audio, generated Buttons for remap bindings and a hand-authored
    /// capture modal at the pinned rect.</summary>
    public sealed class SettingsTab
    {
        private sealed class AudioSwatch
        {
            public string Id;
            public Color Color;
            public DsButton Button;
        }

        private readonly PauseMenuApp app;
        private readonly FixtureSet fixtures;
        private readonly ParityLayoutData layout;
        private readonly Dictionary<string, Switch> generalSwitches = new Dictionary<string, Switch>();
        private readonly Dictionary<string, VisualElement> generalRows = new Dictionary<string, VisualElement>();
        private readonly Dictionary<string, Slider> controllerSliders = new Dictionary<string, Slider>();
        private readonly Dictionary<string, Text> controllerValues = new Dictionary<string, Text>();
        private readonly Dictionary<string, DsButton> remapButtons = new Dictionary<string, DsButton>();
        private readonly Dictionary<string, Slider> audioSliders = new Dictionary<string, Slider>();
        private readonly Dictionary<string, Text> audioValues = new Dictionary<string, Text>();
        private readonly Dictionary<string, AudioSwatch> swatches = new Dictionary<string, AudioSwatch>();
        private readonly Dictionary<string, SubtitleBackgroundOptionData> backgroundOptions =
            new Dictionary<string, SubtitleBackgroundOptionData>();

        public VisualElement Root { get; }
        public Text RemapStatus { get; }
        public DropdownField AudioLanguageDropdown { get; }
        public DropdownField SubtitleLanguageDropdown { get; }
        public VisualElement SubtitlePreview { get; }
        public Text SubtitlePreviewText { get; }
        public Text SubtitlePreviewMeta { get; }
        public VisualElement RemapModal { get; }
        public Text RemapActionLabel { get; }
        public Text RemapPrompt { get; }
        public DsButton RemapCancel { get; }
        public bool RemapModalOpen => app.State.RemapModalOpen;

        public SettingsTab(PauseMenuApp app)
        {
            this.app = app;
            fixtures = app.State.Fixtures;
            layout = app.Layout;
            foreach (var option in fixtures.Settings.Audio.SubtitleBackground.Options)
                backgroundOptions[option.Id] = option;

            Root = Ui.MakeBox("tab-view settings-tab");
            Root.name = "settings-tab";

            var panels = layout.Settings.Panels;
            var general = FindPanel("general");
            var controller = FindPanel("controller");
            var remap = FindPanel("remap");
            var audio = FindPanel("audio");
            foreach (var panel in panels)
                Root.Add(Ui.MakePanel(layout, panel.Rect, panel.Title, panel.Meta, 36, "parity-panel--steel").Root);

            RemapStatus = Ui.MakeText(layout, string.Empty, "micro", "signalHot", true,
                new LayoutRect(remap.Rect.X + 300, remap.Rect.Bottom - 17, 292, 14), align: TextAnchor.MiddleRight);
            RemapStatus.style.backgroundColor = layout.Color("charcoal");
            Root.Add(RemapStatus);

            BuildGeneral(general);
            BuildController(controller);
            BuildRemap(remap);
            BuildAudio(audio, out var audioDropdown, out var subtitleDropdown, out var preview,
                out var previewText, out var previewMeta);
            AudioLanguageDropdown = audioDropdown;
            SubtitleLanguageDropdown = subtitleDropdown;
            SubtitlePreview = preview;
            SubtitlePreviewText = previewText;
            SubtitlePreviewMeta = previewMeta;

            RemapModal = BuildRemapModal(out var actionLabel, out var prompt, out var cancel);
            RemapActionLabel = actionLabel;
            RemapPrompt = prompt;
            RemapCancel = cancel;

            RefreshRemap();
            RefreshPreview();
        }

        public Switch GeneralSwitch(string id) => generalSwitches[id];
        public VisualElement GeneralRow(string id) => generalRows[id];
        public Slider ControllerSlider(string id) => controllerSliders[id];
        public Text ControllerValueText(string id) => controllerValues[id];
        public DsButton RemapButton(string id) => remapButtons[id];
        public Slider AudioSlider(string id) => audioSliders[id];
        public Text AudioValueText(string id) => audioValues[id];
        public DsButton Swatch(string id) => swatches[id].Button;

        public void ShowRemapModal(string actionId)
        {
            var action = FindRemap(actionId);
            if (action == null) throw new ArgumentException("Unknown remap action id '" + actionId + "'.");
            app.State.RemapModalOpen = true;
            app.State.RemapActionId = actionId;
            RemapActionLabel.text = action.Label + "  ·  CURRENT BINDING " + action.Binding;
            RemapPrompt.text = layout.Settings.RemapModal.Prompt;
            RemapModal.style.display = DisplayStyle.Flex;
            RemapModal.BringToFront();
        }

        public void HideRemapModal()
        {
            app.State.RemapModalOpen = false;
            app.State.RemapActionId = null;
            RemapModal.style.display = DisplayStyle.None;
        }

        /// <summary>Escape cancels; every other key is the new binding (I13/I15).</summary>
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
            foreach (var action in fixtures.Settings.Remap)
                remapButtons[action.Id].text = app.State.RemapBinding(action.Id);
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

        public void SetSubtitleBackground(string optionId)
        {
            if (!backgroundOptions.ContainsKey(optionId)) throw new ArgumentException("Unknown subtitle background id '" + optionId + "'.");
            app.State.SubtitleBackgroundId = optionId;
            RefreshPreview();
        }

        private SettingsPanelLayout FindPanel(string id)
        {
            foreach (var panel in layout.Settings.Panels) if (panel.Id == id) return panel;
            throw new FixtureFormatException("parity-layout.json: settings panel '" + id + "' is missing.");
        }

        private void BuildGeneral(SettingsPanelLayout panel)
        {
            for (var i = 0; i < fixtures.Settings.General.Count; i++)
            {
                var toggle = fixtures.Settings.General[i];
                var rowY = layout.Settings.FirstRowY + i * layout.Settings.RowH;
                var row = RowFrame(panel, rowY, layout.Settings.RowH);
                var label = Ui.MakeText(layout, toggle.Label, "rowLabel", "boneBright", true);
                Ui.Point(label, 16, 4);
                row.Add(label);
                var description = Ui.MakeText(layout, toggle.Description, "rowSub", "muted", false);
                Ui.Point(description, 16, 20);
                row.Add(description);
                var toggleControl = Ui.MakeSwitch(layout, app.State.GeneralValue(toggle.Id), value =>
                {
                    app.State.SetGeneralValue(toggle.Id, value);
                    row.EnableInClassList("is-on", value);
                });
                Ui.Point(toggleControl, panel.Rect.W - layout.PanelPadding - layout.Switch.Width, 6);
                row.EnableInClassList("is-on", app.State.GeneralValue(toggle.Id));
                row.Add(toggleControl);
                generalSwitches[toggle.Id] = toggleControl;
                generalRows[toggle.Id] = row;
                Root.Add(row);
            }
        }

        private void BuildController(SettingsPanelLayout panel)
        {
            foreach (var setting in fixtures.Settings.Controller)
            {
                var index = fixtures.Settings.Controller.IndexOf(setting);
                var rowY = layout.Settings.FirstRowY + index * layout.Settings.RowH;
                var row = RowFrame(panel, rowY, layout.Settings.RowH);
                var label = Ui.MakeText(layout, setting.Label, "rowLabel", "boneBright", true);
                Ui.Point(label, 16, 4);
                row.Add(label);
                var description = Ui.MakeText(layout, setting.Description, "rowSub", "muted", false);
                Ui.Point(description, 16, 20);
                row.Add(description);
                var value = Ui.MakeText(layout, app.State.ControllerValue(setting.Id) + setting.Unit,
                    "value", "boneBright", true,
                    new LayoutRect(panel.Rect.W - layout.PanelPadding - 120, 4, 120, 16), align: TextAnchor.MiddleRight);
                row.Add(value);
                var sliderRect = new LayoutRect(292, 26, layout.Settings.Slider.W, 16);
                var slider = BuildSlider(setting.Min, setting.Max, app.State.ControllerValue(setting.Id),
                    sliderRect, out var controllerFill);
                slider.name = "controller-" + setting.Id;
                slider.RegisterValueChangedCallback(evt =>
                {
                    var snapped = Snap(evt.newValue, setting.Min, setting.Max, setting.Step);
                    if (Mathf.Abs(slider.value - snapped) > 0.0001f) slider.SetValueWithoutNotify(snapped);
                    app.State.SetControllerValue(setting.Id, snapped);
                    value.text = snapped + setting.Unit;
                    controllerFill.style.width = (float)FillWidth(snapped, setting.Min, setting.Max, sliderRect.W);
                });
                row.Add(slider);
                row.Add(controllerFill);
                controllerSliders[setting.Id] = slider;
                controllerValues[setting.Id] = value;
                Root.Add(row);
            }
        }

        private void BuildRemap(SettingsPanelLayout panel)
        {
            var first = layout.Settings.RemapFirstRowY;
            if (first < panel.Rect.Y) first = panel.Rect.Y + 36; // authority y is panel-relative (see README)
            for (var i = 0; i < fixtures.Settings.Remap.Count; i++)
            {
                var action = fixtures.Settings.Remap[i];
                var row = RowFrame(panel, first + i * layout.Settings.RemapRowH, layout.Settings.RemapRowH);
                var label = Ui.MakeText(layout, action.Label, "rowLabel", "boneBright", true);
                Ui.Point(label, 16, 2);
                row.Add(label);
                var button = Ui.MakeButton(layout, app.State.RemapBinding(action.Id),
                    new LayoutRect(panel.Rect.W - layout.PanelPadding - layout.Settings.BindingButton.W,
                        (layout.Settings.RemapRowH - layout.Settings.BindingButton.H) / 2,
                        layout.Settings.BindingButton.W, layout.Settings.BindingButton.H),
                    () => app.OpenRemapModal(action.Id), false);
                button.name = "remap-" + action.Id;
                button.style.backgroundColor = layout.Color("graphite");
                row.Add(button);
                remapButtons[action.Id] = button;
                Root.Add(row);
            }
        }

        private void BuildAudio(SettingsPanelLayout panel, out DropdownField audioLanguage,
            out DropdownField subtitleLanguage, out VisualElement preview, out Text previewText, out Text previewMeta)
        {
            for (var i = 0; i < fixtures.Settings.Audio.Sliders.Count; i++)
            {
                var setting = fixtures.Settings.Audio.Sliders[i];
                var rowY = layout.Settings.AudioFirstRowY + i * layout.Settings.AudioRowH;
                var row = RowFrame(panel, rowY, layout.Settings.AudioRowH);
                var label = Ui.MakeText(layout, setting.Label, "rowLabel", "boneBright", true);
                Ui.Point(label, 16, 2);
                row.Add(label);
                var value = Ui.MakeText(layout, app.State.AudioValue(setting.Id) + setting.Unit,
                    "value", "boneBright", true, new LayoutRect(520, 2, 72, 16), align: TextAnchor.MiddleRight);
                row.Add(value);
                var sliderRect = new LayoutRect(216, 6, layout.Settings.Slider.W, 16);
                var slider = BuildSlider(0, 100, app.State.AudioValue(setting.Id), sliderRect, out var audioFill);
                slider.name = "audio-" + setting.Id;
                slider.RegisterValueChangedCallback(evt =>
                {
                    var snapped = Snap(evt.newValue, 0, 100, 1);
                    if (Mathf.Abs(slider.value - snapped) > 0.0001f) slider.SetValueWithoutNotify(snapped);
                    app.State.SetAudioValue(setting.Id, snapped);
                    value.text = snapped + setting.Unit;
                    audioFill.style.width = (float)FillWidth(snapped, 0, 100, sliderRect.W);
                });
                row.Add(slider);
                row.Add(audioFill);
                audioSliders[setting.Id] = slider;
                audioValues[setting.Id] = value;
                Root.Add(row);
            }

            var languageLabel = Ui.MakeText(layout, "AUDIO LANGUAGE", "micro", "muted", true,
                new LayoutRect(panel.Rect.X + layout.PanelPadding, layout.Settings.LanguageLabelY, 200, 12),
                letterSpacing: layout.Size("letterSpacingMicro"));
            Root.Add(languageLabel);
            var subtitleLabel = Ui.MakeText(layout, "SUBTITLE LANGUAGE", "micro", "muted", true,
                new LayoutRect(panel.Rect.X + layout.PanelPadding + layout.Settings.Dropdown.W + 16,
                    layout.Settings.LanguageLabelY, 200, 12),
                letterSpacing: layout.Size("letterSpacingMicro"));
            Root.Add(subtitleLabel);
            audioLanguage = BuildDropdown(fixtures.Settings.Audio.AudioLanguage,
                new LayoutRect(panel.Rect.X + layout.PanelPadding, layout.Settings.DropdownY,
                    layout.Settings.Dropdown.W, layout.Settings.DropdownH));
            subtitleLanguage = BuildDropdown(fixtures.Settings.Audio.SubtitleLanguage,
                new LayoutRect(panel.Rect.X + layout.PanelPadding + layout.Settings.Dropdown.W + 16,
                    layout.Settings.DropdownY, layout.Settings.Dropdown.W, layout.Settings.DropdownH));
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
            Root.Add(audioLanguage);
            Root.Add(subtitleLanguage);

            var swatchLabel = Ui.MakeText(layout, "SUBTITLE BACKGROUND", "micro", "muted", true,
                new LayoutRect(panel.Rect.X + layout.PanelPadding, layout.Settings.SwatchLabelY, 240, 12),
                letterSpacing: layout.Size("letterSpacingMicro"));
            Root.Add(swatchLabel);
            for (var i = 0; i < fixtures.Settings.Audio.SubtitleBackground.Options.Count; i++)
            {
                var option = fixtures.Settings.Audio.SubtitleBackground.Options[i];
                var color = OrionPalette.FromHex(option.Value);
                var button = new DsButton { Size = "medium", Variant = "outline", text = string.Empty };
                button.name = "swatch-" + option.Id;
                button.AddToClassList("parity-swatch");
                Ui.At(button, new LayoutRect(panel.Rect.X + layout.PanelPadding
                                             + i * (layout.Settings.Swatch.W + layout.Settings.Swatch.Gap),
                    layout.Settings.SwatchY, layout.Settings.Swatch.W, layout.Settings.SwatchH));
                Ui.StripBox(button);
                Ui.Radius(button, 0);
                button.style.backgroundColor = color;
                Ui.BorderWidth(button, 1);
                Ui.BorderColor(button, layout.Color("ruleStrong"));
                button.OnClick = () => app.SetSubtitleBackground(option.Id);
                swatches[option.Id] = new AudioSwatch { Id = option.Id, Color = color, Button = button };
                Root.Add(button);
            }

            preview = Ui.MakeBox("subtitle-preview");
            Ui.At(preview, layout.Settings.PreviewRect);
            previewText = Ui.MakeText(layout, fixtures.Settings.Audio.PreviewLine, "micro", "ink", true,
                new LayoutRect(8, 6, 390, 14));
            preview.Add(previewText);
            previewMeta = Ui.MakeText(layout, string.Empty, "micro", "ink", true,
                new LayoutRect(400, 6, 168, 14), align: TextAnchor.MiddleRight);
            preview.Add(previewMeta);
            Root.Add(preview);
        }

        private VisualElement RowFrame(SettingsPanelLayout panel, double y, double height)
        {
            var row = Ui.MakeBox("settings-row");
            Ui.At(row, new LayoutRect(panel.Rect.X, y, panel.Rect.W, height));
            row.style.borderBottomWidth = 1;
            row.style.borderBottomColor = layout.Color("rule");
            return row;
        }

        private static double Fraction(double value, double min, double max, double width) =>
            max > min ? (value - min) / (max - min) * width : 0;

        /// <summary>Fill ends at the thumb's left edge so the circular thumb stays uncut.</summary>
        private double FillWidth(double value, double min, double max, double width) =>
            Math.Max(0, Fraction(value, min, max, width) - layout.Settings.Slider.Thumb / 2);

        private Slider BuildSlider(int min, int max, int value, LayoutRect rect, out VisualElement fill)
        {
            // NOT FSDS: the Unity allowlist admits no Slider; engine-native Slider styled to the JSON
            // slider geometry (300x6 track, 16px circular thumb, signal fill, graphite track). The
            // theme slider exposes a tracker and a dragger but no fill element, so the lane draws the
            // signal fill as an overlay sized from the value.
            var slider = new Slider();
            slider.lowValue = min;
            slider.highValue = max;
            slider.showInputField = false;
            slider.value = Mathf.Clamp(value, min, max);
            slider.AddToClassList("parity-slider");
            Ui.At(slider, rect);
            slider.style.width = (float)rect.W;
            slider.style.height = (float)rect.H;
            slider.style.backgroundColor = Color.clear;
            Ui.Pad(slider, 0);
            slider.style.marginLeft = 0;
            slider.style.marginRight = 0;
            slider.style.marginTop = 0;
            slider.style.marginBottom = 0;
            var input = slider.Q(className: "unity-base-slider__input");
            if (input != null) input.style.backgroundColor = Color.clear;
            var tracker = slider.Q(className: "unity-base-slider__tracker");
            if (tracker != null)
            {
                tracker.style.height = (float)layout.Settings.Slider.H;
                tracker.style.backgroundColor = layout.Color("graphite");
                Ui.Radius(tracker, 0);
            }
            var dragger = slider.Q(className: "unity-base-slider__dragger");
            if (dragger != null)
            {
                dragger.style.width = (float)layout.Settings.Slider.Thumb;
                dragger.style.height = (float)layout.Settings.Slider.Thumb;
                dragger.style.backgroundColor = layout.Color("boneBright");
                Ui.Radius(dragger, layout.Settings.Slider.Thumb / 2);
                Ui.BorderWidth(dragger, 0);
                dragger.style.translate = new Translate(0, 0);
            }
            fill = Ui.MakeBox("slider-fill");
            Ui.At(fill, rect.X, rect.Y + (rect.H - layout.Settings.Slider.H) / 2,
                Fraction(value, min, max, rect.W), layout.Settings.Slider.H);
            fill.style.backgroundColor = layout.Color("signal");
            return slider;
        }

        private DropdownField BuildDropdown(LanguageSettingData setting, LayoutRect rect)
        {
            var choices = new List<string>(setting.Options);
            var dropdown = new DropdownField(choices, Mathf.Max(0, choices.IndexOf(setting.Value)));
            dropdown.AddToClassList("parity-dropdown");
            dropdown.name = "dropdown-" + setting.Label.ToLowerInvariant().Replace(' ', '-');
            Ui.At(dropdown, rect);
            dropdown.style.width = (float)rect.W;
            dropdown.style.height = (float)rect.H;
            Ui.Pad(dropdown, 0);
            var input = dropdown.Q(className: "unity-base-popup-field__input");
            if (input != null)
            {
                input.style.backgroundColor = layout.Color("graphite");
                Ui.BorderWidth(input, 1);
                Ui.BorderColor(input, layout.Color("ruleStrong"));
                Ui.Radius(input, 0);
                input.style.paddingLeft = 8;
                input.style.paddingTop = 0;
                input.style.paddingBottom = 0;
                input.style.height = (float)(rect.H - 2);
            }
            var text = dropdown.Q<TextElement>(className: "unity-base-popup-field__text");
            if (text != null)
            {
                text.style.color = layout.Color("boneBright");
                text.style.fontSize = (float)layout.Size("rowLabel");
                text.style.unityFontStyleAndWeight = FontStyle.Normal;
                text.style.height = (float)(rect.H - 2);
                text.style.unityTextAlign = TextAnchor.MiddleLeft;
            }
            var arrow = dropdown.Q(className: "unity-base-popup-field__arrow");
            if (arrow != null) arrow.style.unityBackgroundImageTintColor = layout.Color("muted");
            return dropdown;
        }

        private void RefreshPreview()
        {
            var option = backgroundOptions[app.State.SubtitleBackgroundId];
            var color = OrionPalette.FromHex(option.Value);
            SubtitlePreview.style.backgroundColor = color;
            var textColor = PaletteContrast(color);
            SubtitlePreviewText.style.color = textColor;
            SubtitlePreviewMeta.style.color = textColor;
            SubtitlePreviewMeta.text = app.State.SubtitleLanguage.ToUpperInvariant() + "  ·  " + option.Label;
            foreach (var pair in swatches)
            {
                var selected = pair.Key == app.State.SubtitleBackgroundId;
                pair.Value.Button.EnableInClassList("is-selected", selected);
                Ui.BorderWidth(pair.Value.Button, selected ? 2 : 1);
                Ui.BorderColor(pair.Value.Button, selected ? layout.Color("signal") : layout.Color("ruleStrong"));
            }
        }

        private Color PaletteContrast(Color background)
        {
            var luminance = 0.2126f * background.r + 0.7152f * background.g + 0.0722f * background.b;
            return luminance > 0.5f ? layout.Color("ink") : layout.Color("boneBright");
        }

        private RemapActionData FindRemap(string id)
        {
            foreach (var action in fixtures.Settings.Remap) if (action.Id == id) return action;
            return null;
        }

        private VisualElement BuildRemapModal(out Text actionLabel, out Text prompt, out DsButton cancel)
        {
            var modal = Ui.MakeBox("remap-modal");
            modal.name = "remap-modal";
            Ui.At(modal, new LayoutRect(0, 0, layout.ViewportWidth, layout.ViewportHeight));
            modal.style.backgroundColor = new Color(0.078f, 0.078f, 0.071f, 0.78f);
            modal.style.alignItems = Align.Center;
            modal.style.justifyContent = Justify.Center;
            modal.style.display = DisplayStyle.None;

            var rect = layout.Settings.RemapModal.Rect;
            var panel = Ui.MakeBox("remap-panel");
            Ui.At(panel, rect);
            panel.style.backgroundColor = layout.Color("charcoal");
            Ui.BorderWidth(panel, 2);
            Ui.BorderColor(panel, layout.Color("signal"));
            panel.style.flexDirection = FlexDirection.Column;
            panel.style.alignItems = Align.Center;
            var overline = Ui.MakeText(layout, "CONTROLLER REMAP  //  INPUT CAPTURE", "micro", "signal", true,
                letterSpacing: layout.Size("letterSpacingMicro"));
            Ui.Point(overline, 0, 18);
            overline.style.width = Length.Percent(100);
            overline.style.unityTextAlign = TextAnchor.MiddleCenter;
            panel.Add(overline);
            actionLabel = Ui.MakeText(layout, string.Empty, "value", "boneBright", true,
                new LayoutRect(0, 52, rect.W, 20), align: TextAnchor.MiddleCenter);
            panel.Add(actionLabel);
            prompt = Ui.MakeText(layout, layout.Settings.RemapModal.Prompt, "title", "signal", true,
                new LayoutRect(0, 88, rect.W, 30), align: TextAnchor.MiddleCenter);
            panel.Add(prompt);
            cancel = Ui.MakeButton(layout, "CANCEL", new LayoutRect((rect.W - 120) / 2, rect.H - 54, 120, 30),
                () => app.CancelRemap(), false);
            cancel.name = "remap-cancel";
            panel.Add(cancel);
            modal.Add(panel);
            modal.RegisterCallback<PointerDownEvent>(evt =>
            {
                if (evt.target == modal && evt.button >= 0 && evt.button <= 6)
                    app.CompleteRemap("MOUSE " + (evt.button + 1));
            });
            return modal;
        }
    }
}
