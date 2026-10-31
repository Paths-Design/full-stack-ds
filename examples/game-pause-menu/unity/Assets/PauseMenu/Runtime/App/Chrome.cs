using System.Collections.Generic;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>Header band: brand mark, commander readout and paused chip. Container layout is
    /// app chrome; every text/divider inside is a generated component.</summary>
    public sealed class HeaderBand
    {
        public VisualElement Root { get; }
        public Text RankValue { get; }
        public Text RankSub { get; }
        public Text CreditsValue { get; }
        public Text CreditsSub { get; }
        public Text FollowersValue { get; }
        public Text FollowersSub { get; }
        public Text StatusText { get; }
        public Text BrandWord { get; }
        public Text BrandNumber { get; }

        public HeaderBand(FixtureSet fixtures, OrionPalette palette)
        {
            var commander = fixtures.Commander;
            Root = Ui.Box("pause-header");
            Root.name = "pause-header";

            var brand = Ui.Box("header-brand");
            var mark = Ui.Box("brand-mark");
            var words = commander.Callsign.Split(' ');
            BrandWord = Ui.Styled(Ui.Display(words[0]), "brand-word");
            mark.Add(BrandWord);
            if (words.Length > 1)
            {
                BrandNumber = Ui.Styled(Ui.Display(words[words.Length - 1]), "brand-number");
                BrandNumber.style.color = palette.Signal;
                mark.Add(BrandNumber);
            }
            brand.Add(mark);

            var sub = Ui.Box("brand-sub");
            sub.Add(Ui.Overline(commander.Mission));
            sub.Add(Ui.Chip(commander.CallsignPlate, "plate-chip"));
            brand.Add(sub);
            Root.Add(brand);

            Root.Add(Ui.Box("header-rule"));

            var readout = Ui.Box("header-readout");
            readout.Add(Stat("RANK", commander.Rank.Label,
                $"LV {commander.Rank.Level}  ·  GLOBAL #{commander.Rank.GlobalPosition}  ·  {commander.Rank.Percentile}",
                out var rankValue, out var rankSub));
            readout.Add(Stat("EARNINGS", Ui.Number(commander.Earnings.Credits) + " " + commander.Earnings.Currency,
                "PENDING " + Ui.Number(commander.Earnings.Pending) + " " + commander.Earnings.Currency,
                out var creditsValue, out var creditsSub));
            readout.Add(Stat("FOLLOWERS", Ui.Number(commander.Followers.Total),
                commander.Followers.Trend + "  " + commander.Followers.Period,
                out var followersValue, out var followersSub));
            Root.Add(readout);
            RankValue = rankValue;
            RankSub = rankSub;
            CreditsValue = creditsValue;
            CreditsSub = creditsSub;
            FollowersValue = followersValue;
            FollowersSub = followersSub;

            StatusText = Ui.Chip(commander.Status, "paused-chip");
            StatusText.name = "paused-chip";
            Root.Add(StatusText);
        }

        private static VisualElement Stat(string label, string value, string sub, out Text valueText, out Text subText)
        {
            var block = Ui.Box("header-stat");
            block.Add(Ui.Overline(label));
            valueText = Ui.Styled(Ui.Title(value), "stat-value");
            block.Add(valueText);
            subText = Ui.Caption(sub);
            subText.AddToClassList("stat-sub");
            block.Add(subText);
            return block;
        }
    }

    /// <summary>Footer band: control hints plus the current nav-target summary. App-level chrome
    /// shared by every engine; the icons and labels inside are generated components.</summary>
    public sealed class FooterBand
    {
        public VisualElement Root { get; }
        public VisualElement Hints { get; }
        public Text NavTargetValue { get; }
        public readonly List<Text> HintLabels = new List<Text>();

        public FooterBand(FixtureSet fixtures, OrionPalette palette)
        {
            Root = Ui.Box("pause-footer");
            Root.name = "pause-footer";

            Hints = Ui.Box("footer-hints");
            Hint("arrow-left", "BACK");
            Hint("check", "SELECT");
            Hint("menu", "TAB");
            Root.Add(Hints);

            var nav = Ui.Box("footer-nav");
            nav.Add(Ui.Overline("NAV TARGET"));
            NavTargetValue = Ui.Styled(Ui.Title("—"), "nav-target-value");
            NavTargetValue.name = "nav-target-value";
            nav.Add(NavTargetValue);
            Root.Add(nav);

            if (fixtures.Commander.NavTarget != null) SetNavTarget(fixtures.Commander.NavTarget);
        }

        private void Hint(string iconName, string label)
        {
            var hint = Ui.Box("footer-hint");
            hint.Add(new FullStackDS.Icon { Name = iconName, Size = "sm" });
            var text = Ui.Caption(label);
            HintLabels.Add(text);
            hint.Add(text);
            Hints.Add(hint);
        }

        public void SetNavTarget(string label)
        {
            NavTargetValue.text = string.IsNullOrEmpty(label) ? "—" : label;
            NavTargetValue.EnableInClassList("is-set", !string.IsNullOrEmpty(label));
        }
    }
}
