using System;
using System.Collections.Generic;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>Map tab: hand-authored map field plot + generated Switch filter + generated
    /// Popover marker detail. Fixture only supplies data; the plot is lane-local drawing.</summary>
    public sealed class MapTab
    {
        private readonly PauseMenuApp app;
        private readonly FixtureSet fixtures;
        private readonly OrionPalette palette;
        private readonly Dictionary<string, Popover> markers = new Dictionary<string, Popover>();
        private readonly Dictionary<string, PopoverTrigger> markerAnchors = new Dictionary<string, PopoverTrigger>();
        private readonly Dictionary<string, Switch> visibilitySwitches = new Dictionary<string, Switch>();
        private readonly Dictionary<string, Button> setNavButtons = new Dictionary<string, Button>();
        private readonly Dictionary<string, Text> visibilityStates = new Dictionary<string, Text>();

        public VisualElement Root { get; }
        public VisualElement Field { get; }
        public VisualElement SidePanel { get; }
        public VisualElement StatsRow { get; }
        public Text SectorLabel { get; private set; }
        public Text ScaleLabel { get; private set; }

        public MapTab(PauseMenuApp app)
        {
            this.app = app;
            fixtures = app.State.Fixtures;
            palette = app.Palette;

            Root = Ui.Box("map-tab");
            Root.name = "map-tab";
            var main = Ui.Box("map-main");
            main.name = "map-main";

            Field = Ui.Box("map-field");
            Field.name = "map-field";
            Field.style.backgroundColor = palette.Sage;
            BuildPlot();
            foreach (var icon in fixtures.Map.Icons) Field.Add(BuildMarker(icon));
            main.Add(Field);

            SidePanel = BuildSidePanel();
            main.Add(SidePanel);
            Root.Add(main);

            StatsRow = BuildStats();
            Root.Add(StatsRow);
            ApplyAll();
        }

        public Popover Marker(string iconId) => markers[iconId];
        public PopoverTrigger MarkerAnchor(string iconId) => markerAnchors[iconId];
        public Switch VisibilitySwitch(string iconId) => visibilitySwitches[iconId];
        public Button SetNavTargetButton(string iconId) => setNavButtons[iconId];
        public Text VisibilityState(string iconId) => visibilityStates[iconId];

        /// <summary>True when the marker root participates in layout (the fixture filter plots it).</summary>
        public bool IsMarkerPlotted(string iconId) => markers[iconId].style.display.value == DisplayStyle.Flex;

        public void ApplyAll()
        {
            foreach (var icon in fixtures.Map.Icons)
            {
                ApplyVisibility(icon.Id);
                ApplyNavTarget(icon.Id);
            }
        }

        public void ApplyVisibility(string iconId)
        {
            var visible = app.State.IsIconVisible(iconId);
            var marker = markers[iconId];
            marker.style.display = visible ? DisplayStyle.Flex : DisplayStyle.None;
            if (!visible) marker.Open = false;
            visibilityStates[iconId].text = visible ? "PLOTTED" : "HIDDEN";
            visibilitySwitches[iconId].SetValueWithoutNotify(visible);
        }

        public void ApplyNavTarget(string iconId)
        {
            var isTarget = app.State.NavTargetId == iconId;
            markerAnchors[iconId].EnableInClassList("is-nav-target", isTarget);
            markers[iconId].EnableInClassList("is-nav-target", isTarget);
        }

        private void BuildPlot()
        {
            for (var i = 1; i < 8; i++)
            {
                var line = Ui.Box("map-grid-line");
                line.style.left = Length.Percent(i * 12.5f);
                Field.Add(line);
            }
            for (var i = 1; i < 6; i++)
            {
                var line = Ui.Box("map-grid-line map-grid-line--h");
                line.style.top = Length.Percent(i * 16.66f);
                Field.Add(line);
            }
            for (var i = 0; i < 4; i++)
            {
                var tick = Ui.Box("map-corner-tick");
                tick.AddToClassList(i % 2 == 0 ? "map-corner-tick--left" : "map-corner-tick--right");
                tick.AddToClassList(i < 2 ? "map-corner-tick--top" : "map-corner-tick--bottom");
                Field.Add(tick);
            }
            var header = Ui.Box("map-plot-header");
            SectorLabel = Ui.Styled(Ui.Overline(fixtures.Map.Sector), "map-sector");
            header.Add(SectorLabel);
            ScaleLabel = Ui.Styled(Ui.Overline("SCALE " + fixtures.Map.Scale), "map-scale");
            header.Add(ScaleLabel);
            Field.Add(header);

            var watermark = Ui.Styled(Ui.Display(palette.Watermark), "map-watermark");
            watermark.pickingMode = PickingMode.Ignore;
            Field.Add(watermark);
        }

        private Popover BuildMarker(MapIconData icon)
        {
            var popover = new Popover { name = "marker-" + icon.Id, Placement = "right" };
            popover.AddToClassList("map-marker-popover");
            popover.style.left = Length.Percent((float)(icon.X * 100));
            popover.style.top = Length.Percent((float)((1 - icon.Y) * 100));
            popover.style.translate = new Translate(Length.Percent(-50), Length.Percent(-50));

            var anchor = new PopoverTrigger { name = "marker-anchor-" + icon.Id };
            anchor.AddToClassList("map-marker");
            anchor.AddToClassList("map-marker--" + icon.Kind);
            var glyph = new FullStackDS.Icon { Name = PauseMenuState.IconKey(icon.Icon), Size = "md" };
            anchor.Add(glyph);
            var kind = Ui.Styled(Ui.Overline(icon.Kind.ToUpperInvariant()), "map-marker-kind");
            anchor.Add(kind);
            Ui.IgnorePicking(glyph, kind);
            popover.Add(anchor);

            var content = new PopoverContent { name = "marker-detail-" + icon.Id };
            content.AddToClassList("map-detail");
            // Floating content leaves the app tree; carry the lane app class so app chrome rules
            // (detail rows, primary action, type sizes) keep applying to the portalled surface.
            content.AddToClassList("pause-app");
            content.style.backgroundColor = palette.SurfacePanel;
            content.style.borderTopColor = palette.Signal;
            content.style.borderLeftColor = palette.SurfaceRuleStrong;
            content.Add(Ui.Overline("MARKER // " + icon.Kind.ToUpperInvariant()));
            content.Add(Ui.Styled(Ui.Title(icon.Label), "detail-title"));
            content.Add(Ui.Rule());
            content.Add(DetailRow("SECTOR", icon.Sector));
            content.Add(DetailRow("DISTANCE", icon.DistanceKm.ToString("0.0") + " KM"));
            content.Add(DetailRow("STATUS", icon.Status));
            var copy = Ui.Body(icon.Detail);
            copy.AddToClassList("detail-copy");
            content.Add(copy);
            content.Add(DetailRow("REWARD", icon.Reward));
            var setTarget = Ui.NativeButton("SET AS NAV TARGET", "primary-action", () => app.SetNavTarget(icon.Id));
            setTarget.name = "set-nav-target-" + icon.Id;
            content.Add(setTarget);
            popover.Add(content);

            markers[icon.Id] = popover;
            markerAnchors[icon.Id] = anchor;
            setNavButtons[icon.Id] = setTarget;
            return popover;
        }

        private VisualElement BuildSidePanel()
        {
            var panel = Ui.Box("map-side");
            panel.name = "map-side";
            var head = Ui.Box("map-side-head");
            head.Add(Ui.Styled(Ui.Overline("ICON VISIBILITY"), "panel-label"));
            head.Add(Ui.Caption("FILTER OVER THE MAP FIELD"));
            panel.Add(head);
            panel.Add(Ui.Rule());

            var list = new ScrollView(ScrollViewMode.Vertical);
            list.AddToClassList("icon-filter-list");
            foreach (var icon in fixtures.Map.Icons)
            {
                var row = Ui.Box("filter-row");
                row.name = "filter-row-" + icon.Id;
                row.Add(new FullStackDS.Icon { Name = PauseMenuState.IconKey(icon.Icon), Size = "sm" });
                var toggle = new Switch { name = "icon-switch-" + icon.Id, Checked = app.State.IsIconVisible(icon.Id) };
                toggle.AddToClassList("filter-switch");
                toggle.Add(Ui.Caption(icon.Label));
                row.Add(toggle);
                var state = Ui.Styled(Ui.Overline(""), "filter-state");
                visibilityStates[icon.Id] = state;
                row.Add(state);
                toggle.RegisterValueChangedCallback(evt => app.SetIconVisible(icon.Id, evt.newValue));
                visibilitySwitches[icon.Id] = toggle;
                list.Add(row);
            }
            panel.Add(list);
            return panel;
        }

        private VisualElement BuildStats()
        {
            var commander = fixtures.Commander;
            var row = Ui.Box("map-stats");
            row.name = "map-stats";
            row.Add(Stat("RANK", commander.Rank.Label, $"LV {commander.Rank.Level}  ·  GLOBAL #{commander.Rank.GlobalPosition}"));
            row.Add(Stat("PROGRESSION", Ui.Number(commander.Rank.Points) + " / " + Ui.Number(commander.Rank.NextLevelAt),
                "POINTS TO NEXT RANK"));
            row.Add(Stat("EARNINGS", Ui.Number(commander.Earnings.Credits) + " " + commander.Earnings.Currency,
                "PENDING " + Ui.Number(commander.Earnings.Pending)));
            row.Add(Stat("FOLLOWERS", Ui.Number(commander.Followers.Total), commander.Followers.Trend + "  " + commander.Followers.Period));
            return row;
        }

        private static VisualElement Stat(string label, string value, string sub)
        {
            var block = Ui.Box("map-stat");
            block.Add(Ui.Overline(label));
            block.Add(Ui.Styled(Ui.Title(value), "stat-value"));
            block.Add(Ui.Caption(sub));
            return block;
        }

        private static VisualElement DetailRow(string label, string value)
        {
            var row = Ui.Box("detail-row");
            row.Add(Ui.Styled(Ui.Overline(label), "detail-label"));
            var text = Ui.Caption(value);
            text.AddToClassList("detail-value");
            row.Add(text);
            return row;
        }
    }
}
