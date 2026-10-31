using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

namespace GamePauseMenu
{
    /// <summary>The Orion N5 graphic-grammar palette used by app-level decoration (map ground,
    /// signal strips, active indicators, rarity and locked states). Component colours come from
    /// the generated `.fsds-brand-orion` token scope via <c>Theme.SetBrand</c>; the appearance
    /// fixture only carries the raw graphic grammar the token projection does not expose.</summary>
    public sealed class OrionPalette
    {
        public Color Signal;
        public Color SignalDeep;
        public Color SignalHot;
        public Color OnSignal;
        public Color Ink;
        public Color Charcoal;
        public Color Graphite;
        public Color BoneBright;
        public Color Bone;
        public Color Sage;
        public Color Moss;
        public Color Alert;
        public Color Clear;

        public Color SurfaceApp;
        public Color SurfacePanel;
        public Color SurfaceRaised;
        public Color SurfaceRule;
        public Color SurfaceRuleStrong;
        public Color SurfaceMuted;
        public Color SurfaceTelemetry;

        public int Radius;
        public int BorderWidth;
        public string Watermark;
        public bool UppercaseLabels;
        public float MicroLabelLetterSpacing;

        public static OrionPalette From(OrionAppearanceData data)
        {
            if (data == null) throw new ArgumentNullException(nameof(data));
            string P(string key) => data.Palette[key];
            string S(string key) => data.Surface[key];
            return new OrionPalette
            {
                Signal = FromHex(P("signal")),
                SignalDeep = FromHex(P("signalDeep")),
                SignalHot = FromHex(P("signalHot")),
                OnSignal = FromHex(P("onSignal")),
                Ink = FromHex(P("ink")),
                Charcoal = FromHex(P("charcoal")),
                Graphite = FromHex(P("graphite")),
                BoneBright = FromHex(P("boneBright")),
                Bone = FromHex(P("bone")),
                Sage = FromHex(P("sage")),
                Moss = FromHex(P("moss")),
                Alert = FromHex(P("alert")),
                Clear = FromHex(P("clear")),
                SurfaceApp = FromHex(S("app")),
                SurfacePanel = FromHex(S("panel")),
                SurfaceRaised = FromHex(S("raised")),
                SurfaceRule = FromHex(S("rule")),
                SurfaceRuleStrong = FromHex(S("ruleStrong")),
                SurfaceMuted = FromHex(S("muted")),
                SurfaceTelemetry = FromHex(S("telemetry")),
                Radius = data.Radius,
                BorderWidth = data.BorderWidth,
                Watermark = data.Watermark,
                UppercaseLabels = data.UppercaseLabels,
                MicroLabelLetterSpacing = (float)data.MicroLabelLetterSpacing,
            };
        }

        /// <summary>A #RRGGBB colour, the only form the appearance fixture is allowed to carry.</summary>
        public static bool IsHexColor(string value)
        {
            if (value == null || value.Length != 7 || value[0] != '#') return false;
            for (var i = 1; i < value.Length; i++)
            {
                var c = value[i];
                var hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
                if (!hex) return false;
            }
            return true;
        }

        public static Color FromHex(string value)
        {
            if (!IsHexColor(value)) throw new FormatException($"'{value}' is not a #RRGGBB colour.");
            var r = int.Parse(value.Substring(1, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            var g = int.Parse(value.Substring(3, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            var b = int.Parse(value.Substring(5, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture);
            return new Color(r / 255f, g / 255f, b / 255f, 1f);
        }

        public static Color WithAlpha(Color color, float alpha) => new Color(color.r, color.g, color.b, alpha);

        /// <summary>Rarity is data, not a per-engine derivation; this only picks the lane's tag colour.</summary>
        public Color RarityColor(string rarity)
        {
            var value = (rarity ?? string.Empty).ToLowerInvariant();
            switch (value)
            {
                case "common": return Moss;
                case "uncommon": return Clear;
                case "rare": return SignalHot;
                case "epic": return Signal;
                case "legendary": return BoneBright;
                default: return SurfaceMuted;
            }
        }

        /// <summary>Near-black on the saturated fills, bone on dark grounds.</summary>
        public Color ContrastText(Color background)
        {
            var luminance = 0.2126f * background.r + 0.7152f * background.g + 0.0722f * background.b;
            return luminance > 0.5f ? OnSignal : BoneBright;
        }
    }
}
