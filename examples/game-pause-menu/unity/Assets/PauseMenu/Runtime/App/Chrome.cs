using System.Collections.Generic;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>Header band from the parity layout: wordmark, mission line, three stat columns and
    /// the PAUSED chip, all at absolute JSON coordinates. Shell band chrome is hand-authored; the
    /// text, chip and rules inside it are generated components.</summary>
    public sealed class HeaderBand
    {
        public sealed class StatView
        {
            public string Id;
            public Text Label;
            public Text Value;
            public Text Sub;
        }

        public VisualElement Root { get; }
        public Text BrandWord { get; }
        public Text BrandNumber { get; }
        public Text Mission { get; }
        public Text StatusText { get; }
        public VisualElement PausedChip { get; }
        public readonly List<StatView> Stats = new List<StatView>();

        public HeaderBand(FixtureSet fixtures, ParityLayoutData layout, OrionPalette palette)
        {
            var header = layout.Header;
            Root = Ui.MakeBox("pause-header");
            Root.name = "header";
            Ui.At(Root, header.Rect);
            Root.style.backgroundColor = layout.Color(header.Background);
            Root.style.borderBottomWidth = (float)layout.PanelBorder;
            Root.style.borderBottomColor = layout.Color(header.RuleBottom);

            var wordmark = Ui.MakeBox("wordmark");
            Ui.Point(wordmark, header.Wordmark.X, header.Wordmark.Y);
            wordmark.style.height = (float)header.Wordmark.H;
            wordmark.style.flexDirection = FlexDirection.Row;
            wordmark.style.alignItems = Align.Center;
            BrandWord = Ui.MakeText(layout, header.TextMain, "wordmark", "boneBright", true);
            BrandWord.style.height = (float)header.Wordmark.H;
            BrandNumber = Ui.MakeText(layout, header.TextAccent, "wordmark", "signal", true);
            BrandNumber.style.height = (float)header.Wordmark.H;
            BrandNumber.style.marginLeft = 8;
            wordmark.Add(BrandWord);
            wordmark.Add(BrandNumber);
            Root.Add(wordmark);

            Mission = Ui.MakeText(layout, header.MissionText, "mission", "muted", true,
                letterSpacing: layout.Size("letterSpacingMicro"));
            Ui.Point(Mission, header.Mission.X, header.Mission.Y);
            Root.Add(Mission);

            foreach (var stat in header.Stats)
            {
                var view = new StatView { Id = stat.Id };
                view.Label = Ui.MakeText(layout, stat.Label, "statLabel", "muted", true,
                    letterSpacing: layout.Size("letterSpacingMicro"));
                Ui.Point(view.Label, stat.X, stat.LabelY);
                view.Value = Ui.MakeText(layout, stat.Value, "statValue", "boneBright", true);
                Ui.Point(view.Value, stat.X, stat.ValueY);
                view.Sub = Ui.MakeText(layout, stat.Sub, "statSub", "muted", false);
                Ui.Point(view.Sub, stat.X, stat.SubY);
                Root.Add(view.Label);
                Root.Add(view.Value);
                Root.Add(view.Sub);
                Stats.Add(view);
            }

            PausedChip = Ui.MakeBadge(layout, header.PausedText, "chip", header.PausedChip,
                layout.Color("signal"), layout.Color("onSignal"), false, Color.clear);
            Root.Add(PausedChip);
            StatusText = PausedChip.Query<Text>();
        }
    }

    /// <summary>Footer band: control hints left, NAV TARGET label/value right, at JSON coordinates.</summary>
    public sealed class FooterBand
    {
        public VisualElement Root { get; }
        public Text Hints { get; }
        public Text NavLabel { get; }
        public Text NavTargetValue { get; }

        public FooterBand(FixtureSet fixtures, ParityLayoutData layout, OrionPalette palette)
        {
            var footer = layout.Footer;
            Root = Ui.MakeBox("pause-footer");
            Root.name = "footer";
            Ui.At(Root, footer.Rect);
            Root.style.backgroundColor = layout.Color("ruleStrong");
            Root.style.borderTopWidth = (float)layout.PanelBorder;
            Root.style.borderTopColor = layout.Color(footer.RuleTop);

            Hints = Ui.MakeText(layout, footer.HintsText, "footer", "textSecondary", false);
            // Typography parity: UI Toolkit collapses runs of spaces by default;
            // the pinned hint string uses triple-space separators.
            Hints.style.whiteSpace = WhiteSpace.Pre;
            Ui.Point(Hints, footer.Hints.X, footer.Hints.Y - footer.Rect.Y);
            Root.Add(Hints);

            NavLabel = Ui.MakeText(layout, footer.NavLabelText, "statLabel", "textSecondary", true,
                letterSpacing: layout.Size("letterSpacingMicro"));
            Ui.Point(NavLabel, footer.NavLabel.X, footer.NavLabel.Y - footer.Rect.Y);
            Root.Add(NavLabel);

            // type.statLabel (10) because the type map declares no footer-value size and the pinned
            // prose size (13) overflows the right edge from valueX=1176; JSON type map wins per authority.
            // Pinned: right-aligned to x=1256 at y=770, 13 px / 700 signal.
            NavTargetValue = Ui.MakeText(layout, footer.NavEmpty, "body", "signal", true,
                new LayoutRect(footer.NavValueRight - 256, footer.NavValueY - footer.Rect.Y - 4, 256, 16),
                align: TextAnchor.MiddleRight);
            Root.Add(NavTargetValue);

            if (!string.IsNullOrEmpty(fixtures.Commander.NavTarget)) SetNavTarget(fixtures.Commander.NavTarget);
        }

        public void SetNavTarget(string label)
        {
            NavTargetValue.text = string.IsNullOrEmpty(label) ? "—" : label;
        }
    }
}
