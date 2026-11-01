using System;
using System.Linq;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;
using DsButton = FullStackDS.Button;

namespace GamePauseMenu
{
    /// <summary>Parity UI construction helpers. Every geometry value comes from the parsed
    /// fixtures/parity-layout.json model and every colour from its `colors` table; the helpers only
    /// apply those values as inline styles (inline wins over generated component stylesheet rules,
    /// which is how the parity boxes are forced exactly).</summary>
    internal static class Ui
    {
        public static void At(VisualElement element, LayoutRect rect, double originX = 0, double originY = 0)
        {
            element.style.position = Position.Absolute;
            element.style.left = (float)(rect.X - originX);
            element.style.top = (float)(rect.Y - originY);
            if (rect.W > 0) element.style.width = (float)rect.W;
            if (rect.H > 0) element.style.height = (float)rect.H;
        }

        public static void At(VisualElement element, double x, double y, double w, double h) =>
            At(element, new LayoutRect(x, y, w, h));

        public static void Point(VisualElement element, double x, double y)
        {
            element.style.position = Position.Absolute;
            element.style.left = (float)x;
            element.style.top = (float)y;
        }

        public static void Radius(VisualElement element, double radius)
        {
            element.style.borderTopLeftRadius = (float)radius;
            element.style.borderTopRightRadius = (float)radius;
            element.style.borderBottomLeftRadius = (float)radius;
            element.style.borderBottomRightRadius = (float)radius;
        }

        public static void BorderWidth(VisualElement element, double width)
        {
            element.style.borderTopWidth = (float)width;
            element.style.borderBottomWidth = (float)width;
            element.style.borderLeftWidth = (float)width;
            element.style.borderRightWidth = (float)width;
        }

        public static void BorderColor(VisualElement element, Color color)
        {
            element.style.borderTopColor = color;
            element.style.borderBottomColor = color;
            element.style.borderLeftColor = color;
            element.style.borderRightColor = color;
        }

        public static void Pad(VisualElement element, double padding)
        {
            element.style.paddingLeft = (float)padding;
            element.style.paddingRight = (float)padding;
            element.style.paddingTop = (float)padding;
            element.style.paddingBottom = (float)padding;
        }

        // Typography parity: both Inter weights are imported as Unity Font
        // assets; every lane text element is projected onto one of them and the
        // synthetic bold/italic styles are disabled so no faux weight is drawn.
        private static UnityEngine.Font interRegular;
        private static UnityEngine.Font interBold;

        public static UnityEngine.Font InterRegular =>
            interRegular ??= Resources.Load<UnityEngine.Font>("Fonts/Inter-Regular");

        public static UnityEngine.Font InterBold =>
            interBold ??= Resources.Load<UnityEngine.Font>("Fonts/Inter-Bold");

        /// <summary>Pin an element (and its inherited descendants) to an Inter weight.</summary>
        public static void UseFont(VisualElement element, bool bold)
        {
            if (element == null) return;
            var face = bold ? InterBold : InterRegular;
            if (face == null)
                throw new FixtureFormatException("Unity Inter font asset missing from Resources/Fonts.");
            element.style.unityFontDefinition = new StyleFontDefinition(FontDefinition.FromFont(face));
            element.style.unityFontStyleAndWeight = FontStyle.Normal;
        }

        /// <summary>Apply Inter to generated-component text after the app tree is built.</summary>
        public static void ApplyParityFonts(VisualElement root)
        {
            UseFont(root, false);
            foreach (var element in root.Query<VisualElement>().ToList())
            {
                if (element.ClassListContains("button") || element.ClassListContains("tabs__tab") ||
                    element.ClassListContains("badge") || element.ClassListContains("badge__content"))
                {
                    UseFont(element, true);
                }
            }
            foreach (var textElement in root.Query<TextElement>().ToList())
            {
                if (textElement.ClassListContains("parity-text")) continue;
                var bold = textElement.ClassListContains("tabs__tab") ||
                           textElement.ClassListContains("button") ||
                           textElement.ClassListContains("badge") ||
                           textElement.ClassListContains("badge__content");
                UseFont(textElement, bold);
            }
        }

        public static void StripBox(VisualElement element)
        {
            Pad(element, 0);
            element.style.marginLeft = 0;
            element.style.marginRight = 0;
            element.style.marginTop = 0;
            element.style.marginBottom = 0;
            element.style.minWidth = 0;
            element.style.minHeight = 0;
        }

        /// <summary>Disables picking for an element and its subtree so a full-card hit target
        /// underneath receives the pointer.</summary>
        public static void PassThrough(VisualElement element)
        {
            element.pickingMode = PickingMode.Ignore;
            for (var i = 0; i < element.hierarchy.childCount; i++) PassThrough(element.hierarchy[i]);
        }

        public static void PassThroughChildren(VisualElement element)
        {
            for (var i = 0; i < element.hierarchy.childCount; i++) PassThrough(element.hierarchy[i]);
        }

        public static Text MakeText(ParityLayoutData layout, string content, string typeKey, string colorKey,
            bool bold, LayoutRect? rect = null, TextAnchor align = TextAnchor.MiddleLeft, bool wrap = false,
            double letterSpacing = 0)
        {
            var text = new Text { text = content };
            text.AddToClassList("parity-text");
            StripBox(text);
            text.style.fontSize = (float)layout.Size(typeKey);
            text.style.color = layout.Color(colorKey);
            // Typography parity: two Inter weights, zero tracking. The spacing
            // argument is retained for call-site compatibility and ignored.
            UseFont(text, bold);
            text.style.unityTextAlign = align;
            text.style.whiteSpace = wrap ? WhiteSpace.Normal : WhiteSpace.NoWrap;
            text.style.letterSpacing = 0;
            text.style.overflow = Overflow.Visible;
            if (rect.HasValue) At(text, rect.Value);
            return text;
        }

        public static Text MakeText(ParityLayoutData layout, string content, string typeKey, Color color,
            bool bold, LayoutRect? rect = null, TextAnchor align = TextAnchor.MiddleLeft, bool wrap = false,
            double letterSpacing = 0)
        {
            var text = MakeText(layout, content, typeKey, "ink", bold, rect, align, wrap, letterSpacing);
            text.style.color = color;
            return text;
        }

        public static Divider MakeRule(ParityLayoutData layout, Color color, LayoutRect rect)
        {
            var divider = new Divider { Orientation = "horizontal" };
            At(divider, rect);
            divider.style.backgroundColor = color;
            divider.style.height = (float)Math.Max(1, rect.H);
            StripBox(divider);
            divider.style.borderTopWidth = 0;
            divider.style.borderBottomWidth = 0;
            return divider;
        }

        public static Badge MakeBadge(ParityLayoutData layout, string content, string typeKey, LayoutRect? rect,
            Color background, Color foreground, bool outlined, Color outlineColor, double letterSpacing = 1.1)
        {
            var badge = new Badge { Size = "sm" };
            badge.AddToClassList("parity-badge");
            StripBox(badge);
            Radius(badge, 0);
            badge.style.flexDirection = FlexDirection.Row;
            badge.style.alignItems = Align.Center;
            badge.style.justifyContent = Justify.Center;
            badge.style.backgroundColor = outlined ? new Color(0, 0, 0, 0) : background;
            BorderWidth(badge, outlined ? 1 : 0);
            if (outlined) BorderColor(badge, outlineColor);
            if (rect.HasValue) At(badge, rect.Value);
            var contentHost = new BadgeContent { name = "content" };
            contentHost.style.flexGrow = 1;
            contentHost.style.flexDirection = FlexDirection.Row;
            contentHost.style.alignItems = Align.Center;
            contentHost.style.justifyContent = Justify.Center;
            StripBox(contentHost);
            var text = MakeText(layout, content, typeKey, foreground, true, align: TextAnchor.MiddleCenter);
            text.style.letterSpacing = 0;
            contentHost.Add(text);
            badge.Add(contentHost);
            return badge;
        }

        public static DsButton MakeButton(ParityLayoutData layout, string label, LayoutRect rect, Action onClick,
            bool primary)
        {
            var button = new DsButton
            {
                Size = primary ? "large" : "medium",
                Variant = primary ? "primary" : "outline",
                text = label,
                OnClick = onClick,
            };
            button.AddToClassList("parity-button");
            At(button, rect);
            StripBox(button);
            Radius(button, 0);
            button.style.paddingLeft = primary ? 12 : 10;
            button.style.paddingRight = primary ? 12 : 10;
            button.style.paddingTop = 0;
            button.style.paddingBottom = 0;
            button.style.unityFontStyleAndWeight = FontStyle.Bold;
            button.style.fontSize = (float)layout.Size(primary ? "body" : "mission");
            button.style.unityTextAlign = TextAnchor.MiddleCenter;
            button.style.whiteSpace = WhiteSpace.NoWrap;
            button.style.overflow = Overflow.Hidden;
            button.style.backgroundColor = primary ? layout.Color("signal") : new Color(0, 0, 0, 0);
            button.style.color = primary ? layout.Color("onSignal") : layout.Color("boneBright");
            BorderWidth(button, primary ? 0 : 1);
            if (!primary) BorderColor(button, layout.Color("ruleStrong"));
            return button;
        }

        public static Switch MakeSwitch(ParityLayoutData layout, bool value, Action<bool> changed)
        {
            var geometry = layout.Switch;
            var toggle = new Switch { Size = "lg", Checked = value };
            toggle.name = "switch";
            StripBox(toggle);
            toggle.style.flexDirection = FlexDirection.Row;
            toggle.style.alignItems = Align.Center;
            toggle.style.position = Position.Relative;
            // Geometry is pinned by the lane stylesheet (.switch--lg rules), not by inline styles:
            // the parity fix replaces the generated 9999px pill radius with explicit 16px/12px.

            toggle.Input.style.display = DisplayStyle.None;
            var childrenHost = toggle.hierarchy.Children().LastOrDefault();
            if (childrenHost != null && childrenHost.ClassListContains("switch__children"))
                childrenHost.style.display = DisplayStyle.None;

            toggle.Track.RegisterCallback<ClickEvent>(_ => toggle.Checked = !toggle.Checked);
            ApplySwitchState(layout, toggle, value);
            toggle.RegisterValueChangedCallback(evt =>
            {
                ApplySwitchState(layout, toggle, evt.newValue);
                changed?.Invoke(evt.newValue);
            });
            return toggle;
        }

        public static void ApplySwitchState(ParityLayoutData layout, Switch toggle, bool on)
        {
            var geometry = layout.Switch;
            var track = toggle.Track;
            track.style.backgroundColor = layout.Color(on ? geometry.OnTrack : geometry.OffTrack);
            BorderWidth(track, on ? 0 : geometry.BorderWidth);
            if (!on) BorderColor(track, layout.Color(geometry.OffBorder));
            toggle.Thumb.style.backgroundColor = layout.Color(on ? geometry.OnThumb : geometry.OffThumb);
            toggle.Thumb.style.left = (float)(on ? geometry.CheckedThumbOffset : geometry.Inset);
            toggle.Thumb.style.translate = new Translate(Length.Pixels(0), Length.Pixels(0));
        }

        public static Progress MakeProgress(ParityLayoutData layout, LayoutRect rect, double value,
            string trackKey, string fillKey)
        {
            var progress = new Progress { Intent = "info", ShowValue = false };
            progress.AddToClassList("parity-progress");
            At(progress, rect);
            StripBox(progress);
            progress.style.flexDirection = FlexDirection.Row;
            progress.Track.style.height = (float)rect.H;
            progress.Track.style.width = Length.Percent(100);
            progress.Track.style.backgroundColor = layout.Color(trackKey);
            StripBox(progress.Track);
            progress.Track.style.height = (float)rect.H;
            Radius(progress.Track, 0);
            progress.Fill.style.height = (float)rect.H;
            progress.Fill.style.backgroundColor = layout.Color(fillKey);
            Radius(progress.Fill, 0);
            progress.Value = (float)value;
            return progress;
        }

        /// <summary>The parity authority pins icon surfaces to a portable two-letter code tile
        /// (first two letters of the source name, uppercased) so every engine renders the same art.</summary>
        public static VisualElement MakeCodeTile(ParityLayoutData layout, IconTileLayout spec, string code)
        {
            var tile = new VisualElement();
            tile.AddToClassList("parity-code-tile");
            tile.style.width = (float)spec.Size;
            tile.style.height = (float)spec.Size;
            tile.style.flexShrink = 0;
            tile.style.backgroundColor = layout.Color(spec.Background);
            var width = (float)spec.BorderWidth;
            tile.style.borderLeftWidth = width;
            tile.style.borderRightWidth = width;
            tile.style.borderTopWidth = width;
            tile.style.borderBottomWidth = width;
            BorderColor(tile, layout.Color(spec.Border));
            Radius(tile, (float)spec.Radius);
            tile.style.alignItems = Align.Center;
            tile.style.justifyContent = Justify.Center;

            var label = new Text { text = code, name = "code-tile-label" };
            label.style.fontSize = (float)spec.FontSize;
            label.style.unityFontStyleAndWeight = spec.Weight >= 700 ? FontStyle.Bold : FontStyle.Normal;
            label.style.color = layout.Color(spec.Text);
            label.style.unityTextAlign = TextAnchor.MiddleCenter;
            label.style.letterSpacing = 0;
            label.style.whiteSpace = WhiteSpace.NoWrap;
            tile.Add(label);
            return tile;
        }

        public static string Number(int value) =>
            value.ToString("N0", System.Globalization.CultureInfo.InvariantCulture);

        public static VisualElement MakeBox(string className)
        {
            var box = new VisualElement();
            if (!string.IsNullOrEmpty(className)) box.AddToClassList(className);
            return box;
        }

        /// <summary>A panel: generated Card root + generated CardHeader strip + CardContent body.
        /// Body children use viewport coordinates; callers subtract the panel origin.</summary>
        public sealed class Panel
        {
            public Card Root;
            public CardHeader Header;
            public CardContent Body;
            public LayoutRect Rect;
            public double HeaderHeight;
        }

        public static Panel MakePanel(ParityLayoutData layout, LayoutRect rect, string title, string meta,
            double headerHeight, string surfaceClass = null)
        {
            var panel = new Panel
            {
                Rect = rect,
                HeaderHeight = headerHeight,
                Root = new Card { Density = "default" },
            };
            var root = panel.Root;
            root.name = "panel";
            root.AddToClassList("parity-panel");
            if (surfaceClass != null) root.AddToClassList(surfaceClass);
            At(root, rect);
            StripBox(root);
            root.style.flexDirection = FlexDirection.Column;
            root.style.overflow = Overflow.Visible;

            var header = new CardHeader { name = "header" };
            header.AddToClassList("parity-panel-header");
            Point(header, 0, 0);
            header.style.width = Length.Percent(100);
            header.style.height = (float)headerHeight;
            header.style.flexDirection = FlexDirection.Row;
            header.style.alignItems = Align.Center;
            header.style.paddingLeft = (float)layout.PanelPadding;
            header.style.paddingRight = (float)layout.PanelPadding;
            header.style.paddingTop = 0;
            header.style.paddingBottom = 0;
            header.style.borderBottomWidth = 1;
            var titleText = MakeText(layout, title, "panelTitle", "boneBright", true,
                letterSpacing: layout.Size("letterSpacingMicro"));
            titleText.style.flexGrow = 1;
            titleText.style.height = (float)headerHeight;
            var metaText = MakeText(layout, meta, "panelMeta", "textSecondary", false, align: TextAnchor.MiddleRight);
            metaText.style.height = (float)headerHeight;
            header.Add(titleText);
            header.Add(metaText);
            root.Add(header);

            var body = new CardContent { name = "content" };
            body.AddToClassList("parity-panel-body");
            Point(body, 0, headerHeight);
            body.style.width = Length.Percent(100);
            body.style.height = (float)(rect.H - headerHeight);
            Pad(body, 0);
            body.style.marginLeft = 0;
            body.style.marginRight = 0;
            body.style.marginTop = 0;
            body.style.marginBottom = 0;
            root.Add(body);
            panel.Header = header;
            panel.Body = body;
            return panel;
        }
    }
}
