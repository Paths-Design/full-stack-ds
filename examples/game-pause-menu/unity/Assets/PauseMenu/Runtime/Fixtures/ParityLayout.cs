using System;
using System.Collections.Generic;
using System.Globalization;

namespace GamePauseMenu
{
    /// <summary>An absolute rectangle in the 1280x800 parity grid.</summary>
    public struct LayoutRect
    {
        public double X;
        public double Y;
        public double W;
        public double H;

        public LayoutRect(double x, double y, double w, double h) { X = x; Y = y; W = w; H = h; }
        public double Right => X + W;
        public double Bottom => Y + H;
        public LayoutRect Offset(double dx, double dy) => new LayoutRect(X + dx, Y + dy, W, H);
        public override string ToString() =>
            "(" + X.ToString("0.##", CultureInfo.InvariantCulture) + "," + Y.ToString("0.##", CultureInfo.InvariantCulture)
            + "," + W.ToString("0.##", CultureInfo.InvariantCulture) + "," + H.ToString("0.##", CultureInfo.InvariantCulture) + ")";
    }

    public sealed class SwitchLayout
    {
        public double Width, Height, Radius, Thumb, ThumbRadius, Inset, BorderWidth, CheckedThumbOffset;
        public string OnTrack, OffTrack, OnThumb, OffThumb, OnBorder, OffBorder;
    }

    public sealed class HeaderStatLayout
    {
        public string Id, Label, Value, Sub;
        public double X, LabelY, ValueY, SubY;
    }

    public sealed class HeaderLayout
    {
        public LayoutRect Rect;
        public string Background, RuleBottom;
        public LayoutRect Wordmark;
        public string TextMain, TextAccent;
        public LayoutRect Mission;
        public string MissionText;
        public readonly List<HeaderStatLayout> Stats = new List<HeaderStatLayout>();
        public LayoutRect PausedChip;
        public string PausedText;
    }

    public sealed class TabLayout
    {
        public string Id, Label;
        public double X, W;
    }

    public sealed class TabBarLayout
    {
        public LayoutRect Rect;
        public string Background, RuleBottom, ActiveBackground, ActiveText, InactiveText, Separator;
        public readonly List<TabLayout> Tabs = new List<TabLayout>();
    }

    public sealed class FooterLayout
    {
        public LayoutRect Rect;
        public string RuleTop;
        public LayoutRect Hints;
        public string HintsText;
        public LayoutRect NavLabel;
        public string NavLabelText;
        public double NavValueRight;
        public double NavValueY;
        public string NavEmpty;
        public string NavAlign;
    }

    public sealed class PanelsLayout
    {
        public LayoutRect Content;
        public double HeaderHeight;
        public double Padding;
        public string Background, Border;
    }

    public sealed class MarkerLayout
    {
        public double Size, Monogram;
    }

    public sealed class NotesLayout
    {
        public double X, YOffsetFromFieldBottom;
        public string Text;
    }

    public sealed class IconRowsLayout
    {
        public double X, FirstY, RowH, Width, IconSize, NameX, NameY, SubY, SwitchX, SwitchY;
    }

    public sealed class MapPopoverLayout
    {
        public LayoutRect Rect;
        public string Title, Action, Cancel;
    }

    public sealed class MapLayout
    {
        public LayoutRect MapPanel;
        public string TitleText, TitleMeta;
        public LayoutRect Field;
        public double FieldCornerTicks;
        public MarkerLayout Marker;
        public NotesLayout FieldNote;
        public LayoutRect IconPanel;
        public string IconPanelTitle, IconPanelMeta;
        public IconRowsLayout IconRows;
        public NotesLayout IconPanelNote;
        public MapPopoverLayout Popover;
    }

    public sealed class ProgressRowsLayout
    {
        public double X, FirstY, RowH, Width, AccentW, NameX, NameY, TaglineY, RepBarX, RepBarY, RepBarW, RepBarH;
        public double StatusX, StatusY, StatusW, StatusH, DossierX, DossierY;
    }

    public sealed class DrawerLayout
    {
        public LayoutRect Rect;
        public string Background, TextStyle;
        public double Padding;
        public double HeaderY, TitleY, TaglineY, RuleY, BriefLabelY, BriefBodyY, HistoryLabelY, HistoryBodyY;
        public double PerksLabelY, PerksY, PartsLabelY, PartsHeaderY, PartRowY, PartRowH, ShopCaptionY;
        public LayoutRect Close;
        public LayoutRect ShopButton;
    }

    public sealed class ProgressLayout
    {
        public LayoutRect ListPanel;
        public string ListTitle, ListMeta;
        public ProgressRowsLayout Rows;
        public DrawerLayout Drawer;
    }

    public sealed class CardChipsLayout
    {
        public double X, Y, W, H;
    }

    public sealed class CardsLayout
    {
        public double X, FirstY, W, H, ColGap, RowGap;
        public int Cols;
        public CardChipsLayout RarityChip;
        public double IconY, NameY, SizeY, InstalledY;

        public LayoutRect CardRect(int index)
        {
            var col = index % Cols;
            var row = index / Cols;
            return new LayoutRect(X + col * (W + ColGap), FirstY + row * (H + RowGap), W, H);
        }
    }

    public sealed class SlotsLayout
    {
        public double X, FirstY, W, H, ColGap, RowGap;
        public int Cols;

        public LayoutRect SlotRect(int index)
        {
            var col = index % Cols;
            var row = index / Cols;
            return new LayoutRect(X + col * (W + ColGap), FirstY + row * (H + RowGap), W, H);
        }
    }

    public sealed class AbilitiesLayout
    {
        public LayoutRect GridPanel;
        public string GridTitle, GridMeta;
        public CardsLayout Cards;
        public LayoutRect DetailPanel;
        public string DetailTitle, DetailMeta;
        public double AbilityTitleY, AbilityChipsY, AbilityBodyY, StatRowY, LoadoutTitleY, VehicleNameY, PendingNoteY;
        public SlotsLayout Slots;
        public LayoutRect HoverPopover;
    }

    public sealed class SettingsPanelLayout
    {
        public string Id, Title, Meta;
        public LayoutRect Rect;
    }

    public sealed class SliderLayout
    {
        public double W, H, Thumb;
    }

    public sealed class SizeLayout
    {
        public double W, H, Gap;
    }

    public sealed class RemapModalLayout
    {
        public LayoutRect Rect;
        public string Prompt;
    }

    public sealed class SettingsLayout
    {
        public readonly List<SettingsPanelLayout> Panels = new List<SettingsPanelLayout>();
        public double RowH, FirstRowY, RemapRowH, RemapFirstRowY, AudioRowH, AudioFirstRowY;
        public SliderLayout Slider;
        public SizeLayout BindingButton, Dropdown, Swatch, Preview;
        public LayoutRect PreviewRect;
        public RemapModalLayout RemapModal;
        public double LanguageLabelY, DropdownY, DropdownH, SwatchLabelY, SwatchY, SwatchH;
    }

    public sealed class StatusChipLayout
    {
        public string AccessBackground, AccessText, LockedBorder, LockedText;
    }

    public sealed class CaptureLayout
    {
        public string ActiveTab;
        public string NavTarget;
        public readonly List<string> HiddenIcons = new List<string>();
        public string Popover;
        public string Drawer;
        public string PendingAbility;
        public string Hover;
        public string RemapModal;
        public string SubtitleBackground;
        public string SubtitleLanguage;
    }

    /// <summary>Typed view of fixtures/parity-layout.json, the design authority for the parity pass.
    /// Every geometry, colour and type constant the lane paints comes from this model; the parser
    /// rejects missing/mistyped members, unknown colour references and out-of-viewport rects.</summary>
    public sealed class ParityLayoutData
    {
        public double ViewportWidth, ViewportHeight;
        public readonly Dictionary<string, string> Colors = new Dictionary<string, string>();
        public readonly Dictionary<string, double> Type = new Dictionary<string, double>();
        public double PanelBorder, Radius;
        public double PanelHeaderHeight, PanelPadding;
        public SwitchLayout Switch;
        public HeaderLayout Header;
        public TabBarLayout TabBar;
        public FooterLayout Footer;
        public PanelsLayout Panels;
        public MapLayout Map;
        public ProgressLayout Progress;
        public AbilitiesLayout Abilities;
        public SettingsLayout Settings;
        public readonly Dictionary<string, string> MarkerMonograms = new Dictionary<string, string>();
        public readonly Dictionary<string, string> MarkerColors = new Dictionary<string, string>();
        public readonly Dictionary<string, string> RarityColors = new Dictionary<string, string>();
        public readonly Dictionary<string, string> RarityTextColors = new Dictionary<string, string>();
        public StatusChipLayout StatusChip;
        public readonly Dictionary<string, CaptureLayout> Captures = new Dictionary<string, CaptureLayout>();

        public string Hex(string name)
        {
            if (name == null) throw new FixtureFormatException("parity-layout.json: a colour reference is null.");
            if (!Colors.TryGetValue(name, out var hex))
                throw new FixtureFormatException("parity-layout.json: colour '" + name + "' is not declared in colors.");
            return hex;
        }

        public UnityEngine.Color Color(string name) => OrionPalette.FromHex(Hex(name));

        public double Size(string name)
        {
            if (!Type.TryGetValue(name, out var value))
                throw new FixtureFormatException("parity-layout.json: type size '" + name + "' is not declared in type.");
            return value;
        }

        /// <summary>Validates every colour reference the lane consumes and that core rects fit the viewport.</summary>
        public void Validate()
        {
            Require(ViewportWidth == 1280 && ViewportHeight == 800,
                "viewport must be 1280x800, found " + ViewportWidth + "x" + ViewportHeight);
            foreach (var name in new[] { "panelTitle", "panelMeta", "rowLabel", "rowSub", "value", "bigValue", "title", "body", "micro", "footer", "chip", "tab", "mission", "statLabel", "statValue", "statSub", "wordmark", "letterSpacingMicro", "letterSpacingTab" })
                Size(name);
            Require(Colors.Count >= 18, "colors must declare the Orion palette");
            foreach (var name in Colors.Keys)
                Require(OrionPalette.IsHexColor(Colors[name]), "colour '" + name + "' must be #RRGGBB, found '" + Colors[name] + "'");
            foreach (var reference in new[] { Switch.OnTrack, Switch.OffTrack, Switch.OnThumb, Switch.OffThumb, Switch.OffBorder })
                Hex(reference);
            Hex(Header.Background); Hex(Header.RuleBottom);
            Hex(TabBar.Background); Hex(TabBar.RuleBottom); Hex(TabBar.ActiveBackground); Hex(TabBar.ActiveText); Hex(TabBar.InactiveText); Hex(TabBar.Separator);
            Hex(Footer.RuleTop);
            Hex(Panels.Background); Hex(Panels.Border);
            foreach (var colour in MarkerColors.Values) Hex(colour);
            foreach (var colour in RarityColors.Values) Hex(colour);
            foreach (var colour in RarityTextColors.Values) Hex(colour);
            Hex(StatusChip.AccessBackground); Hex(StatusChip.AccessText); Hex(StatusChip.LockedBorder); Hex(StatusChip.LockedText);
            Hex(Progress.Drawer.Background); Hex(Progress.Drawer.TextStyle);
            Require(TabBar.Tabs.Count == 4, "tabBar.tabs must declare four tabs");
            Require(Header.Stats.Count == 3, "header.stats must declare three stat columns");
            Require(Settings.Panels.Count == 4, "settings.panels must declare four panels");
            Require(Captures.Count >= 8, "captures must declare the eight capture states");
            foreach (var state in new[] { "map", "progress", "abilities", "settings" })
                Require(Captures.ContainsKey(state), "captures must declare the required state '" + state + "'");
            RequireInViewport("header.rect", Header.Rect);
            RequireInViewport("tabBar.rect", TabBar.Rect);
            RequireInViewport("footer.rect", Footer.Rect);
            RequireInViewport("map.mapPanel", Map.MapPanel);
            RequireInViewport("map.field", Map.Field);
            RequireInViewport("map.iconPanel", Map.IconPanel);
            RequireInViewport("progress.listPanel", Progress.ListPanel);
            RequireInViewport("progress.drawer", Progress.Drawer.Rect);
            RequireInViewport("abilities.gridPanel", Abilities.GridPanel);
            RequireInViewport("abilities.detailPanel", Abilities.DetailPanel);
            foreach (var panel in Settings.Panels) RequireInViewport("settings.panel." + panel.Id, panel.Rect);
            RequireInViewport("settings.remapModal", Settings.RemapModal.Rect);
        }

        private static void Require(bool condition, string problem)
        {
            if (!condition) throw new FixtureFormatException("parity-layout.json: " + problem);
        }

        private void RequireInViewport(string path, LayoutRect rect)
        {
            Require(rect.X >= 0 && rect.Y >= 0 && rect.W > 0 && rect.H > 0 && rect.Right <= ViewportWidth + 0.001 &&
                    rect.Bottom <= ViewportHeight + 0.001,
                path + " must fit the viewport, found " + rect);
        }
    }

    /// <summary>Parses the parity layout fixture; the only layer that touches its raw shape.</summary>
    public static class ParityLayoutParser
    {
        public static ParityLayoutData Parse(string file, JsonObject root)
        {
            var read = new Reader(file);
            var data = new ParityLayoutData();
            var viewport = read.ObjectField(root, "viewport", "viewport");
            data.ViewportWidth = read.NumberField(viewport, "width", "viewport.width");
            data.ViewportHeight = read.NumberField(viewport, "height", "viewport.height");

            var colors = read.ObjectField(root, "colors", "colors");
            foreach (var member in colors.Members)
            {
                if (!(member.Value is JsonString value)) throw read.Error("colors." + member.Key, "must be a string.");
                data.Colors[member.Key] = value.Value;
            }
            var type = read.ObjectField(root, "type", "type");
            foreach (var member in type.Members)
            {
                if (!(member.Value is JsonNumber number)) throw read.Error("type." + member.Key, "must be a number.");
                data.Type[member.Key] = number.Value;
            }

            var style = read.ObjectField(root, "style", "style");
            data.PanelBorder = read.NumberField(style, "panelBorder", "style.panelBorder");
            data.Radius = read.NumberField(style, "radius", "style.radius");

            data.Switch = ParseSwitch(read, read.ObjectField(root, "switch", "switch"));
            data.Header = ParseHeader(read, read.ObjectField(root, "header", "header"));
            data.TabBar = ParseTabBar(read, read.ObjectField(root, "tabBar", "tabBar"));
            data.Footer = ParseFooter(read, read.ObjectField(root, "footer", "footer"));
            data.Panels = ParsePanels(read, read.ObjectField(root, "panels", "panels"));
            data.PanelHeaderHeight = data.Panels.HeaderHeight;
            data.PanelPadding = data.Panels.Padding;
            data.Map = ParseMap(read, read.ObjectField(root, "map", "map"));
            data.Progress = ParseProgress(read, read.ObjectField(root, "progress", "progress"));
            data.Abilities = ParseAbilities(read, read.ObjectField(root, "abilities", "abilities"));
            data.Settings = ParseSettings(read, read.ObjectField(root, "settings", "settings"));

            var monograms = read.ObjectField(root, "markerMonograms", "markerMonograms");
            foreach (var member in monograms.Members)
            {
                if (!(member.Value is JsonString value)) throw read.Error("markerMonograms." + member.Key, "must be a string.");
                data.MarkerMonograms[member.Key] = value.Value;
            }
            var markerColors = read.ObjectField(root, "markerColors", "markerColors");
            foreach (var member in markerColors.Members)
            {
                if (!(member.Value is JsonString value)) throw read.Error("markerColors." + member.Key, "must be a string.");
                data.MarkerColors[member.Key] = value.Value;
            }
            var rarity = read.ObjectField(root, "rarityColors", "rarityColors");
            foreach (var member in rarity.Members)
            {
                if (!(member.Value is JsonString value)) throw read.Error("rarityColors." + member.Key, "must be a string.");
                data.RarityColors[member.Key] = value.Value;
            }
            var rarityText = read.ObjectField(root, "rarityTextColors", "rarityTextColors");
            foreach (var member in rarityText.Members)
            {
                if (!(member.Value is JsonString value)) throw read.Error("rarityTextColors." + member.Key, "must be a string.");
                data.RarityTextColors[member.Key] = value.Value;
            }
            var status = read.ObjectField(root, "statusChip", "statusChip");
            data.StatusChip = new StatusChipLayout
            {
                AccessBackground = read.Str(status, "accessBackground", "statusChip.accessBackground"),
                AccessText = read.Str(status, "accessText", "statusChip.accessText"),
                LockedBorder = read.Str(status, "lockedBorder", "statusChip.lockedBorder"),
                LockedText = read.Str(status, "lockedText", "statusChip.lockedText"),
            };

            var captures = read.ObjectField(root, "captures", "captures");
            foreach (var member in captures.Members)
            {
                var path = "captures." + member.Key;
                if (!(member.Value is JsonObject capture)) throw read.Error(path, "must be an object.");
                var state = new CaptureLayout { ActiveTab = read.OptStr(capture, "activeTab", path + ".activeTab", null) };
                state.NavTarget = read.OptStr(capture, "navTarget", path + ".navTarget", null);
                state.Popover = read.OptStr(capture, "popover", path + ".popover", null);
                state.Drawer = read.OptStr(capture, "drawer", path + ".drawer", null);
                state.PendingAbility = read.OptStr(capture, "pendingAbility", path + ".pendingAbility", null);
                state.Hover = read.OptStr(capture, "hover", path + ".hover", null);
                state.RemapModal = read.OptStr(capture, "remapModal", path + ".remapModal", null);
                state.SubtitleBackground = read.OptStr(capture, "subtitleBackground", path + ".subtitleBackground", null);
                state.SubtitleLanguage = read.OptStr(capture, "subtitleLanguage", path + ".subtitleLanguage", null);
                if (capture.TryGet("hiddenIcons", out var hidden))
                {
                    if (!(hidden is JsonArray items)) throw read.Error(path + ".hiddenIcons", "must be an array.");
                    for (var i = 0; i < items.Items.Count; i++)
                        if (items.Items[i] is JsonString icon) state.HiddenIcons.Add(icon.Value);
                        else throw read.Error(path + ".hiddenIcons[" + i + "]", "must be a string.");
                }
                data.Captures[member.Key] = state;
            }

            data.Validate();
            return data;
        }

        private static SwitchLayout ParseSwitch(Reader read, JsonObject root) => new SwitchLayout
        {
            Width = read.NumberField(root, "width", "switch.width"),
            Height = read.NumberField(root, "height", "switch.height"),
            Radius = read.NumberField(root, "radius", "switch.radius"),
            Thumb = read.NumberField(root, "thumb", "switch.thumb"),
            ThumbRadius = read.NumberField(root, "thumbRadius", "switch.thumbRadius"),
            Inset = read.NumberField(root, "inset", "switch.inset"),
            OnTrack = read.Str(root, "onTrack", "switch.onTrack"),
            OffTrack = read.Str(root, "offTrack", "switch.offTrack"),
            OnThumb = read.Str(root, "onThumb", "switch.onThumb"),
            OffThumb = read.Str(root, "offThumb", "switch.offThumb"),
            OnBorder = read.OptStr(root, "onBorder", "switch.onBorder", null),
            OffBorder = read.Str(root, "offBorder", "switch.offBorder"),
            BorderWidth = read.NumberField(root, "borderWidth", "switch.borderWidth"),
            CheckedThumbOffset = read.NumberField(root, "checkedThumbOffset", "switch.checkedThumbOffset"),
        };

        private static HeaderLayout ParseHeader(Reader read, JsonObject root)
        {
            var header = new HeaderLayout
            {
                Rect = read.RectField(root, "rect", "header.rect"),
                Background = read.Str(root, "background", "header.background"),
                RuleBottom = read.Str(root, "ruleBottom", "header.ruleBottom"),
            };
            var wordmark = read.ObjectField(root, "wordmark", "header.wordmark");
            header.Wordmark = new LayoutRect(
                read.NumberField(wordmark, "x", "header.wordmark.x"),
                read.NumberField(wordmark, "y", "header.wordmark.y"),
                0,
                read.NumberField(wordmark, "h", "header.wordmark.h"));
            header.TextMain = read.Str(wordmark, "textMain", "header.wordmark.textMain");
            header.TextAccent = read.Str(wordmark, "textAccent", "header.wordmark.textAccent");
            var mission = read.ObjectField(root, "mission", "header.mission");
            header.Mission = new LayoutRect(
                read.NumberField(mission, "x", "header.mission.x"),
                read.NumberField(mission, "y", "header.mission.y"), 0, 0);
            header.MissionText = read.Str(mission, "text", "header.mission.text");
            var stats = read.ArrayField(root, "stats", "header.stats");
            for (var i = 0; i < stats.Items.Count; i++)
            {
                var path = "header.stats[" + i + "]";
                var item = read.ObjectAt(stats, i, path);
                header.Stats.Add(new HeaderStatLayout
                {
                    Id = read.Str(item, "id", path + ".id"),
                    X = read.NumberField(item, "x", path + ".x"),
                    LabelY = read.NumberField(item, "labelY", path + ".labelY"),
                    ValueY = read.NumberField(item, "valueY", path + ".valueY"),
                    SubY = read.NumberField(item, "subY", path + ".subY"),
                    Label = read.Str(item, "label", path + ".label"),
                    Value = read.Str(item, "value", path + ".value"),
                    Sub = read.Str(item, "sub", path + ".sub"),
                });
            }
            var paused = read.ObjectField(root, "pausedChip", "header.pausedChip");
            header.PausedChip = read.Rect(paused, "header.pausedChip");
            header.PausedText = read.Str(paused, "text", "header.pausedChip.text");
            return header;
        }

        private static TabBarLayout ParseTabBar(Reader read, JsonObject root)
        {
            var bar = new TabBarLayout
            {
                Rect = read.RectField(root, "rect", "tabBar.rect"),
                Background = read.Str(root, "background", "tabBar.background"),
                RuleBottom = read.Str(root, "ruleBottom", "tabBar.ruleBottom"),
                ActiveBackground = read.Str(root, "activeBackground", "tabBar.activeBackground"),
                ActiveText = read.Str(root, "activeText", "tabBar.activeText"),
                InactiveText = read.Str(root, "inactiveText", "tabBar.inactiveText"),
                Separator = read.Str(root, "separator", "tabBar.separator"),
            };
            var tabs = read.ArrayField(root, "tabs", "tabBar.tabs");
            for (var i = 0; i < tabs.Items.Count; i++)
            {
                var path = "tabBar.tabs[" + i + "]";
                var item = read.ObjectAt(tabs, i, path);
                bar.Tabs.Add(new TabLayout
                {
                    Id = read.Str(item, "id", path + ".id"),
                    X = read.NumberField(item, "x", path + ".x"),
                    W = read.NumberField(item, "w", path + ".w"),
                    Label = read.Str(item, "label", path + ".label"),
                });
            }
            return bar;
        }

        private static FooterLayout ParseFooter(Reader read, JsonObject root)
        {
            var footer = new FooterLayout
            {
                Rect = read.RectField(root, "rect", "footer.rect"),
                RuleTop = read.Str(root, "ruleTop", "footer.ruleTop"),
            };
            var hints = read.ObjectField(root, "hints", "footer.hints");
            footer.Hints = new LayoutRect(
                read.NumberField(hints, "x", "footer.hints.x"),
                read.NumberField(hints, "y", "footer.hints.y"), 0, 0);
            footer.HintsText = read.Str(hints, "text", "footer.hints.text");
            var nav = read.ObjectField(root, "navTarget", "footer.navTarget");
            footer.NavLabel = new LayoutRect(
                read.NumberField(nav, "labelX", "footer.navTarget.labelX"),
                read.NumberField(nav, "labelY", "footer.navTarget.labelY"), 0, 0);
            footer.NavLabelText = read.Str(nav, "label", "footer.navTarget.label");
            footer.NavValueRight = read.NumberField(nav, "valueRight", "footer.navTarget.valueRight");
            footer.NavValueY = read.NumberField(nav, "valueY", "footer.navTarget.valueY");
            footer.NavEmpty = read.Str(nav, "empty", "footer.navTarget.empty");
            footer.NavAlign = read.Str(nav, "align", "footer.navTarget.align");
            return footer;
        }

        private static PanelsLayout ParsePanels(Reader read, JsonObject root) => new PanelsLayout
        {
            Content = read.RectField(root, "content", "panels.content"),
            HeaderHeight = read.NumberField(root, "headerHeight", "panels.headerHeight"),
            Padding = read.NumberField(root, "padding", "panels.padding"),
            Background = read.Str(root, "background", "panels.background"),
            Border = read.Str(root, "border", "panels.border"),
        };

        private static MapLayout ParseMap(Reader read, JsonObject root)
        {
            var map = new MapLayout
            {
                MapPanel = read.RectField(root, "mapPanel", "map.mapPanel"),
            };
            var title = read.ObjectField(root, "mapTitle", "map.mapTitle");
            map.TitleText = read.Str(title, "text", "map.mapTitle.text");
            map.TitleMeta = read.Str(title, "meta", "map.mapTitle.meta");
            map.Field = read.RectField(root, "field", "map.field");
            map.FieldCornerTicks = read.NumberField(root, "fieldCornerTicks", "map.fieldCornerTicks");
            var marker = read.ObjectField(root, "marker", "map.marker");
            map.Marker = new MarkerLayout
            {
                Size = read.NumberField(marker, "size", "map.marker.size"),
                Monogram = read.NumberField(marker, "monogram", "map.marker.monogram"),
            };
            var note = read.ObjectField(root, "fieldNote", "map.fieldNote");
            map.FieldNote = new NotesLayout
            {
                X = read.NumberField(note, "x", "map.fieldNote.x"),
                YOffsetFromFieldBottom = read.NumberField(note, "yOffsetFromFieldBottom", "map.fieldNote.yOffsetFromFieldBottom"),
                Text = read.Str(note, "text", "map.fieldNote.text"),
            };
            map.IconPanel = read.RectField(root, "iconPanel", "map.iconPanel");
            map.IconPanelTitle = read.Str(root, "iconPanelTitle", "map.iconPanelTitle");
            map.IconPanelMeta = read.Str(root, "iconPanelMeta", "map.iconPanelMeta");
            var rows = read.ObjectField(root, "iconRows", "map.iconRows");
            map.IconRows = new IconRowsLayout
            {
                X = read.NumberField(rows, "x", "map.iconRows.x"),
                FirstY = read.NumberField(rows, "firstY", "map.iconRows.firstY"),
                RowH = read.NumberField(rows, "rowH", "map.iconRows.rowH"),
                Width = read.NumberField(rows, "width", "map.iconRows.width"),
                IconSize = read.NumberField(rows, "iconSize", "map.iconRows.iconSize"),
                NameX = read.NumberField(rows, "nameX", "map.iconRows.nameX"),
                NameY = read.NumberField(rows, "nameY", "map.iconRows.nameY"),
                SubY = read.NumberField(rows, "subY", "map.iconRows.subY"),
                SwitchX = read.NumberField(rows, "switchX", "map.iconRows.switchX"),
                SwitchY = read.NumberField(rows, "switchY", "map.iconRows.switchY"),
            };
            var panelNote = read.ObjectField(root, "iconPanelNote", "map.iconPanelNote");
            map.IconPanelNote = new NotesLayout
            {
                X = read.NumberField(panelNote, "x", "map.iconPanelNote.x"),
                YOffsetFromFieldBottom = read.NumberField(panelNote, "y", "map.iconPanelNote.y"),
                Text = read.Str(panelNote, "text", "map.iconPanelNote.text"),
            };
            var popover = read.ObjectField(root, "popover", "map.popover");
            map.Popover = new MapPopoverLayout
            {
                Rect = read.Rect(popover, "map.popover"),
                Title = read.Str(popover, "title", "map.popover.title"),
                Action = read.Str(popover, "action", "map.popover.action"),
                Cancel = read.Str(popover, "cancel", "map.popover.cancel"),
            };
            return map;
        }

        private static ProgressLayout ParseProgress(Reader read, JsonObject root)
        {
            var progress = new ProgressLayout
            {
                ListPanel = read.RectField(root, "listPanel", "progress.listPanel"),
                ListTitle = read.Str(root, "listTitle", "progress.listTitle"),
                ListMeta = read.Str(root, "listMeta", "progress.listMeta"),
            };
            var rows = read.ObjectField(root, "rows", "progress.rows");
            progress.Rows = new ProgressRowsLayout
            {
                X = read.NumberField(rows, "x", "progress.rows.x"),
                FirstY = read.NumberField(rows, "firstY", "progress.rows.firstY"),
                RowH = read.NumberField(rows, "rowH", "progress.rows.rowH"),
                Width = read.NumberField(rows, "width", "progress.rows.width"),
                AccentW = read.NumberField(rows, "accentW", "progress.rows.accentW"),
                NameX = read.NumberField(rows, "nameX", "progress.rows.nameX"),
                NameY = read.NumberField(rows, "nameY", "progress.rows.nameY"),
                TaglineY = read.NumberField(rows, "taglineY", "progress.rows.taglineY"),
                RepBarX = read.NumberField(rows, "repBarX", "progress.rows.repBarX"),
                RepBarY = read.NumberField(rows, "repBarY", "progress.rows.repBarY"),
                RepBarW = read.NumberField(rows, "repBarW", "progress.rows.repBarW"),
                RepBarH = read.NumberField(rows, "repBarH", "progress.rows.repBarH"),
                StatusX = read.NumberField(rows, "statusX", "progress.rows.statusX"),
                StatusY = read.NumberField(rows, "statusY", "progress.rows.statusY"),
                StatusW = read.NumberField(rows, "statusW", "progress.rows.statusW"),
                StatusH = read.NumberField(rows, "statusH", "progress.rows.statusH"),
                DossierX = read.NumberField(rows, "dossierX", "progress.rows.dossierX"),
                DossierY = read.NumberField(rows, "dossierY", "progress.rows.dossierY"),
            };
            var drawer = read.ObjectField(root, "drawer", "progress.drawer");
            var close = read.ObjectField(drawer, "close", "progress.drawer.close");
            var shop = read.ObjectField(drawer, "shopButton", "progress.drawer.shopButton");
            progress.Drawer = new DrawerLayout
            {
                Rect = read.RectField(drawer, "rect", "progress.drawer.rect"),
                Background = read.Str(drawer, "background", "progress.drawer.background"),
                TextStyle = read.Str(drawer, "text", "progress.drawer.text"),
                Padding = read.NumberField(drawer, "padding", "progress.drawer.padding"),
                HeaderY = read.NumberField(drawer, "headerY", "progress.drawer.headerY"),
                Close = read.Rect(close, "progress.drawer.close"),
                TitleY = read.NumberField(drawer, "titleY", "progress.drawer.titleY"),
                TaglineY = read.NumberField(drawer, "taglineY", "progress.drawer.taglineY"),
                RuleY = read.NumberField(drawer, "ruleY", "progress.drawer.ruleY"),
                BriefLabelY = read.NumberField(drawer, "briefLabelY", "progress.drawer.briefLabelY"),
                BriefBodyY = read.NumberField(drawer, "briefBodyY", "progress.drawer.briefBodyY"),
                HistoryLabelY = read.NumberField(drawer, "historyLabelY", "progress.drawer.historyLabelY"),
                HistoryBodyY = read.NumberField(drawer, "historyBodyY", "progress.drawer.historyBodyY"),
                PerksLabelY = read.NumberField(drawer, "perksLabelY", "progress.drawer.perksLabelY"),
                PerksY = read.NumberField(drawer, "perksY", "progress.drawer.perksY"),
                PartsLabelY = read.NumberField(drawer, "partsLabelY", "progress.drawer.partsLabelY"),
                PartsHeaderY = read.NumberField(drawer, "partsHeaderY", "progress.drawer.partsHeaderY"),
                PartRowY = read.NumberField(drawer, "partRowY", "progress.drawer.partRowY"),
                PartRowH = read.NumberField(drawer, "partRowH", "progress.drawer.partRowH"),
                ShopButton = read.Rect(shop, "progress.drawer.shopButton"),
                ShopCaptionY = read.NumberField(drawer, "shopCaptionY", "progress.drawer.shopCaptionY"),
            };
            return progress;
        }

        private static AbilitiesLayout ParseAbilities(Reader read, JsonObject root)
        {
            var abilities = new AbilitiesLayout
            {
                GridPanel = read.RectField(root, "gridPanel", "abilities.gridPanel"),
                GridTitle = read.Str(root, "gridTitle", "abilities.gridTitle"),
                GridMeta = read.Str(root, "gridMeta", "abilities.gridMeta"),
            };
            var cards = read.ObjectField(root, "cards", "abilities.cards");
            var rarity = read.ObjectField(cards, "rarityChip", "abilities.cards.rarityChip");
            abilities.Cards = new CardsLayout
            {
                X = read.NumberField(cards, "x", "abilities.cards.x"),
                FirstY = read.NumberField(cards, "firstY", "abilities.cards.firstY"),
                W = read.NumberField(cards, "w", "abilities.cards.w"),
                H = read.NumberField(cards, "h", "abilities.cards.h"),
                ColGap = read.NumberField(cards, "colGap", "abilities.cards.colGap"),
                RowGap = read.NumberField(cards, "rowGap", "abilities.cards.rowGap"),
                Cols = read.IntField(cards, "cols", "abilities.cards.cols"),
                RarityChip = new CardChipsLayout
                {
                    X = read.NumberField(rarity, "x", "abilities.cards.rarityChip.x"),
                    Y = read.NumberField(rarity, "y", "abilities.cards.rarityChip.y"),
                    W = read.NumberField(rarity, "w", "abilities.cards.rarityChip.w"),
                    H = read.NumberField(rarity, "h", "abilities.cards.rarityChip.h"),
                },
                IconY = read.NumberField(cards, "iconY", "abilities.cards.iconY"),
                NameY = read.NumberField(cards, "nameY", "abilities.cards.nameY"),
                SizeY = read.NumberField(cards, "sizeY", "abilities.cards.sizeY"),
                InstalledY = read.NumberField(cards, "installedY", "abilities.cards.installedY"),
            };
            abilities.DetailPanel = read.RectField(root, "detailPanel", "abilities.detailPanel");
            abilities.DetailTitle = read.Str(root, "detailTitle", "abilities.detailTitle");
            abilities.DetailMeta = read.Str(root, "detailMeta", "abilities.detailMeta");
            abilities.AbilityTitleY = read.NumberField(root, "abilityTitleY", "abilities.abilityTitleY");
            abilities.AbilityChipsY = read.NumberField(root, "abilityChipsY", "abilities.abilityChipsY");
            abilities.AbilityBodyY = read.NumberField(root, "abilityBodyY", "abilities.abilityBodyY");
            abilities.StatRowY = read.NumberField(root, "statRowY", "abilities.statRowY");
            abilities.LoadoutTitleY = read.NumberField(root, "loadoutTitleY", "abilities.loadoutTitleY");
            abilities.VehicleNameY = read.NumberField(root, "vehicleNameY", "abilities.vehicleNameY");
            abilities.PendingNoteY = read.NumberField(root, "pendingNoteY", "abilities.pendingNoteY");
            var slots = read.ObjectField(root, "slots", "abilities.slots");
            abilities.Slots = new SlotsLayout
            {
                X = read.NumberField(slots, "x", "abilities.slots.x"),
                FirstY = read.NumberField(slots, "firstY", "abilities.slots.firstY"),
                W = read.NumberField(slots, "w", "abilities.slots.w"),
                H = read.NumberField(slots, "h", "abilities.slots.h"),
                ColGap = read.NumberField(slots, "colGap", "abilities.slots.colGap"),
                RowGap = read.NumberField(slots, "rowGap", "abilities.slots.rowGap"),
                Cols = read.IntField(slots, "cols", "abilities.slots.cols"),
            };
            abilities.HoverPopover = read.RectField(root, "hoverPopover", "abilities.hoverPopover");
            return abilities;
        }

        private static SettingsLayout ParseSettings(Reader read, JsonObject root)
        {
            var settings = new SettingsLayout();
            var panels = read.ArrayField(root, "panels", "settings.panels");
            for (var i = 0; i < panels.Items.Count; i++)
            {
                var path = "settings.panels[" + i + "]";
                var item = read.ObjectAt(panels, i, path);
                settings.Panels.Add(new SettingsPanelLayout
                {
                    Id = read.Str(item, "id", path + ".id"),
                    Rect = read.RectField(item, "rect", path + ".rect"),
                    Title = read.Str(item, "title", path + ".title"),
                    Meta = read.Str(item, "meta", path + ".meta"),
                });
            }
            settings.RowH = read.NumberField(root, "rowH", "settings.rowH");
            settings.FirstRowY = read.NumberField(root, "firstRowY", "settings.firstRowY");
            settings.RemapRowH = read.NumberField(root, "remapRowH", "settings.remapRowH");
            settings.RemapFirstRowY = read.NumberField(root, "remapFirstRowY", "settings.remapFirstRowY");
            settings.AudioRowH = read.NumberField(root, "audioRowH", "settings.audioRowH");
            settings.AudioFirstRowY = read.NumberField(root, "audioFirstRowY", "settings.audioFirstRowY");
            var slider = read.ObjectField(root, "slider", "settings.slider");
            settings.Slider = new SliderLayout
            {
                W = read.NumberField(slider, "w", "settings.slider.w"),
                H = read.NumberField(slider, "h", "settings.slider.h"),
                Thumb = read.NumberField(slider, "thumb", "settings.slider.thumb"),
            };
            settings.BindingButton = ParseSize(read, root, "bindingButton");
            settings.Dropdown = ParseSize(read, root, "dropdown");
            settings.Swatch = ParseSize(read, root, "swatch");
            var swatch = read.ObjectField(root, "swatch", "settings.swatch");
            if (swatch.TryGet("gap", out var gap) && gap is JsonNumber gapNumber) settings.Swatch.Gap = gapNumber.Value;
            settings.Preview = ParseSize(read, root, "preview");
            settings.PreviewRect = read.RectField(root, "preview", "settings.preview");
            var modal = read.ObjectField(root, "remapModal", "settings.remapModal");
            settings.RemapModal = new RemapModalLayout
            {
                Rect = read.Rect(modal, "settings.remapModal"),
                Prompt = read.Str(modal, "prompt", "settings.remapModal.prompt"),
            };
            settings.LanguageLabelY = read.NumberField(root, "languageLabelY", "settings.languageLabelY");
            settings.DropdownY = read.NumberField(root, "dropdownY", "settings.dropdownY");
            settings.DropdownH = read.NumberField(root, "dropdownH", "settings.dropdownH");
            settings.SwatchLabelY = read.NumberField(root, "swatchLabelY", "settings.swatchLabelY");
            settings.SwatchY = read.NumberField(root, "swatchY", "settings.swatchY");
            settings.SwatchH = read.NumberField(root, "swatchH", "settings.swatchH");
            return settings;
        }

        private static SizeLayout ParseSize(Reader read, JsonObject root, string name)
        {
            var item = read.ObjectField(root, name, "settings." + name);
            return new SizeLayout
            {
                W = read.NumberField(item, "w", "settings." + name + ".w"),
                H = read.NumberField(item, "h", "settings." + name + ".h"),
                Gap = 0,
            };
        }

        private sealed class Reader
        {
            private readonly string file;

            public Reader(string file) { this.file = "fixtures/" + file + ".json"; }

            public FixtureFormatException Error(string path, string problem) =>
                new FixtureFormatException(file + ": " + path + " " + problem);

            public LayoutRect Rect(JsonObject item, string path) => new LayoutRect(
                NumberField(item, "x", path + ".x"),
                NumberField(item, "y", path + ".y"),
                NumberField(item, "w", path + ".w"),
                NumberField(item, "h", path + ".h"));

            public LayoutRect RectField(JsonObject parent, string name, string path) =>
                Rect(ObjectField(parent, name, path), path);

            public JsonValue Member(JsonObject parent, string name, string path)
            {
                if (!parent.TryGet(name, out var value)) throw Error(path, "is required.");
                return value;
            }

            public JsonObject ObjectField(JsonObject parent, string name, string path)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonObject obj)) throw Error(path, "must be an object (found " + value.TypeName + ").");
                return obj;
            }

            public JsonArray ArrayField(JsonObject parent, string name, string path)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonArray array)) throw Error(path, "must be an array (found " + value.TypeName + ").");
                return array;
            }

            public JsonObject ObjectAt(JsonArray array, int index, string path)
            {
                if (!(array.Items[index] is JsonObject obj))
                    throw Error(path, "must be an object (found " + array.Items[index].TypeName + ").");
                return obj;
            }

            public string Str(JsonObject parent, string name, string path)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonString text)) throw Error(path, "must be a string (found " + value.TypeName + ").");
                return text.Value;
            }

            public string OptStr(JsonObject parent, string name, string path, string fallback)
            {
                if (!parent.TryGet(name, out var value) || value is JsonNull) return fallback;
                if (!(value is JsonString text)) throw Error(path, "must be a string (found " + value.TypeName + ").");
                return text.Value;
            }

            public double NumberField(JsonObject parent, string name, string path)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonNumber number)) throw Error(path, "must be a number (found " + value.TypeName + ").");
                if (double.IsNaN(number.Value) || double.IsInfinity(number.Value)) throw Error(path, "must be finite.");
                return number.Value;
            }

            public int IntField(JsonObject parent, string name, string path)
            {
                var number = NumberField(parent, name, path);
                var rounded = Math.Round(number);
                if (Math.Abs(number - rounded) > 0.0000001) throw Error(path, "must be an integer.");
                return (int)rounded;
            }
        }
    }
}
