using System;
using System.Collections.Generic;
using System.Globalization;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;
using DsButton = FullStackDS.Button;

namespace GamePauseMenu
{
    /// <summary>MAP tab on the parity grid: map panel with pinned field + marker squares + note,
    /// icon panel with eight generated Switch rows, and one generated Popover at the pinned popover
    /// rect. The plot is app decoration; the switches and popover are generated components.</summary>
    public sealed class MapTab
    {
        private readonly PauseMenuApp app;
        private readonly FixtureSet fixtures;
        private readonly ParityLayoutData layout;
        private readonly OrionPalette palette;
        private readonly Dictionary<string, DsButton> markers = new Dictionary<string, DsButton>();
        private readonly Dictionary<string, Switch> visibilitySwitches = new Dictionary<string, Switch>();
        private readonly Dictionary<string, VisualElement> iconTiles = new Dictionary<string, VisualElement>();
        private readonly Text popoverTitle;
        private readonly Text popoverMeta;
        private readonly Text popoverBody;
        private readonly Text popoverReward;
        private readonly DsButton setNavTargetButton;
        private MapIconData currentIcon;

        public VisualElement Root { get; }
        public VisualElement PopoverHost { get; }
        public Popover MarkerPopover { get; }
        public VisualElement Field { get; }
        public bool HasOpenPopover => MarkerPopover.Open;

        public MapTab(PauseMenuApp app)
        {
            this.app = app;
            fixtures = app.State.Fixtures;
            layout = app.Layout;
            palette = app.Palette;
            var contentRect = layout.Panels.Content;

            Root = Ui.MakeBox("tab-view map-tab");
            Root.name = "map-tab";

            Root.Add(Ui.MakePanel(layout, layout.Map.MapPanel, layout.Map.TitleText, layout.Map.TitleMeta,
                layout.Panels.HeaderHeight).Root);
            var bodyX = layout.Map.MapPanel.X;
            var bodyY = layout.Map.MapPanel.Y + layout.Panels.HeaderHeight;
            var fieldRect = layout.Map.Field;
            Field = Ui.MakeBox("map-field");
            Field.name = "map-field";
            Ui.At(Field, fieldRect);
            Field.style.backgroundColor = layout.Color("sage");
            BuildPlot();
            foreach (var icon in fixtures.Map.Icons)
            {
                var marker = BuildMarker(icon);
                Field.Add(marker);
                markers[icon.Id] = marker;
            }
            Root.Add(Field);

            var note = layout.Map.FieldNote;
            var fieldNote = Ui.MakeText(layout, note.Text, "micro", "ink", false);
            Ui.Point(fieldNote, note.X - fieldRect.X, fieldRect.H + note.YOffsetFromFieldBottom);
            Field.Add(fieldNote);

            var iconPanel = layout.Map.IconPanel;
            Root.Add(Ui.MakePanel(layout, iconPanel, layout.Map.IconPanelTitle, layout.Map.IconPanelMeta,
                layout.Panels.HeaderHeight).Root);
            BuildIconRows();
            var panelNote = layout.Map.IconPanelNote;
            var filterNote = Ui.MakeText(layout, panelNote.Text, "micro", "muted", false);
            Ui.Point(filterNote, panelNote.X, panelNote.YOffsetFromFieldBottom);
            Root.Add(filterNote);

            PopoverHost = Ui.MakeBox("popover-host");
            Ui.At(PopoverHost, 0, 0, 0, 0);

            MarkerPopover = new Popover { name = "map-popover", Placement = "bottom" };
            MarkerPopover.AddToClassList("parity-popover");
            MarkerPopover.style.position = Position.Absolute;
            Ui.StripBox(MarkerPopover);
            var anchor = new PopoverTrigger { name = "map-popover-anchor", text = string.Empty };
            Ui.At(anchor, new LayoutRect(layout.Map.Popover.Rect.X, layout.Map.Popover.Rect.Y - 4, 0, 0));
            anchor.pickingMode = PickingMode.Ignore;
            anchor.style.opacity = 0;
            MarkerPopover.Add(anchor);

            var content = new PopoverContent { name = "map-popover-content" };
            content.AddToClassList("parity-popover-content");
            Ui.At(content, layout.Map.Popover.Rect);
            Ui.StripBox(content);
            content.style.backgroundColor = layout.Color("charcoal");
            Ui.BorderWidth(content, layout.PanelBorder);
            Ui.BorderColor(content, layout.Color("rule"));
            content.style.borderTopWidth = 2;
            content.style.borderTopColor = layout.Color("signal");
            content.style.overflow = Overflow.Hidden;
            content.horizontalScrollerVisibility = ScrollerVisibility.Hidden;
            content.verticalScrollerVisibility = ScrollerVisibility.Hidden;

            popoverTitle = Ui.MakeText(layout, layout.Map.Popover.Title, "title", "boneBright", true);
            Ui.Point(popoverTitle, 16, 14);
            content.Add(popoverTitle);
            popoverMeta = Ui.MakeText(layout, string.Empty, "rowSub", "muted", false);
            Ui.Point(popoverMeta, 16, 48);
            content.Add(popoverMeta);
            popoverBody = Ui.MakeText(layout, string.Empty, "body", "textSecondary", false,
                new LayoutRect(16, 70, layout.Map.Popover.Rect.W - 32, 106), wrap: true);
            content.Add(popoverBody);
            popoverReward = Ui.MakeText(layout, string.Empty, "micro", "signal", true);
            Ui.Point(popoverReward, 16, 180);
            content.Add(popoverReward);
            setNavTargetButton = Ui.MakeButton(layout, layout.Map.Popover.Action,
                new LayoutRect(16, 194, 196, 28), () => app.SetNavTarget(currentIcon.Id), true);
            content.Add(setNavTargetButton);
            var close = Ui.MakeButton(layout, layout.Map.Popover.Cancel,
                new LayoutRect(220, 194, 124, 28), () => ClosePopovers(), false);
            content.Add(close);
            MarkerPopover.Add(content);
            PopoverHost.Add(MarkerPopover);
        }

        public Switch VisibilitySwitch(string iconId) => visibilitySwitches[iconId];
        public DsButton MarkerAnchor(string iconId) => markers[iconId];
        public Popover Marker(string iconId)
        {
            if (!markers.ContainsKey(iconId)) throw new ArgumentException("Unknown map icon id '" + iconId + "'.");
            return MarkerPopover;
        }
        public DsButton SetNavTargetButton(string iconId)
        {
            if (currentIcon == null || currentIcon.Id != iconId)
                throw new InvalidOperationException("Open marker '" + iconId + "' before using its nav-target action.");
            return setNavTargetButton;
        }
        public bool IsMarkerPlotted(string iconId) => markers[iconId].style.display.value != DisplayStyle.None;

        /// <summary>The pinned 16x16 code tile for an icon-visibility row.</summary>
        public VisualElement IconTile(string iconId) => iconTiles.TryGetValue(iconId, out var tile) ? tile : null;
        public string CurrentMarkerId => currentIcon == null ? null : currentIcon.Id;

        public void OpenPopover(string iconId)
        {
            var icon = FixtureRepository.FindIcon(fixtures.Map, iconId);
            if (icon == null) throw new ArgumentException("Unknown map icon id '" + iconId + "'.");
            currentIcon = icon;
            popoverTitle.text = icon.Label;
            popoverMeta.text = icon.Sector + "  ·  " + icon.DistanceKm.ToString("0.0", CultureInfo.InvariantCulture)
                               + " KM  ·  " + icon.Status;
            popoverBody.text = icon.Detail;
            popoverReward.text = icon.Reward;
            MarkerPopover.Open = true;
        }

        public void ClosePopovers()
        {
            MarkerPopover.Open = false;
        }

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
            markers[iconId].style.display = visible ? DisplayStyle.Flex : DisplayStyle.None;
            if (!visible && currentIcon != null && currentIcon.Id == iconId) ClosePopovers();
            var toggle = visibilitySwitches[iconId];
            toggle.SetValueWithoutNotify(visible);
            // Silent value changes do not raise ChangeEvent, so re-apply the inline on/off colours.
            Ui.ApplySwitchState(layout, toggle, visible);
        }

        public void ApplyNavTarget(string iconId)
        {
            var marker = markers[iconId];
            var isTarget = app.State.NavTargetId == iconId;
            Ui.BorderWidth(marker, isTarget ? 3 : 1);
            Ui.BorderColor(marker, layout.Color(isTarget ? "signal" : "ink"));
            marker.EnableInClassList("is-nav-target", isTarget);
        }

        private void BuildPlot()
        {
            var field = layout.Map.Field;
            for (var i = 1; i * 60 < field.W; i++)
            {
                var line = Ui.MakeBox("map-grid-line");
                Ui.Point(line, i * 60, 0);
                line.style.width = 1;
                line.style.height = Length.Percent(100);
                line.style.backgroundColor = layout.Color("ink");
                line.style.opacity = 0.12f;
                Field.Add(line);
            }
            for (var i = 1; i * 60 < field.H; i++)
            {
                var line = Ui.MakeBox("map-grid-line");
                Ui.Point(line, 0, i * 60);
                line.style.height = 1;
                line.style.width = Length.Percent(100);
                line.style.backgroundColor = layout.Color("ink");
                line.style.opacity = 0.12f;
                Field.Add(line);
            }
            var tick = (float)layout.Map.FieldCornerTicks;
            for (var corner = 0; corner < 4; corner++)
            {
                var element = Ui.MakeBox("map-corner-tick");
                Ui.Point(element, corner % 2 == 0 ? 0 : field.W - tick, corner < 2 ? 0 : field.H - tick);
                element.style.width = tick;
                element.style.height = tick;
                element.style.borderLeftWidth = corner % 2 == 0 ? 2 : 0;
                element.style.borderRightWidth = corner % 2 == 1 ? 2 : 0;
                element.style.borderTopWidth = corner < 2 ? 2 : 0;
                element.style.borderBottomWidth = corner >= 2 ? 2 : 0;
                Ui.BorderColor(element, layout.Color("ink"));
                Field.Add(element);
            }
        }

        private DsButton BuildMarker(MapIconData icon)
        {
            var size = layout.Map.Marker.Size;
            var field = layout.Map.Field;
            var marker = new DsButton { Size = "small", Variant = "ghost", text = layout.MarkerMonograms[icon.Kind] };
            marker.name = "marker-" + icon.Id;
            marker.AddToClassList("map-marker");
            marker.AddToClassList("map-marker--" + icon.Kind);
            Ui.At(marker, new LayoutRect(icon.X * field.W - size / 2, icon.Y * field.H - size / 2, size, size));
            Ui.StripBox(marker);
            Ui.Radius(marker, 0);
            Ui.BorderWidth(marker, 1);
            Ui.BorderColor(marker, layout.Color("ink"));
            marker.style.backgroundColor = layout.Color(layout.MarkerColors[icon.Kind]);
            marker.style.color = MarkerTextColor(icon.Kind);
            marker.style.fontSize = (float)layout.Map.Marker.Monogram;
            marker.style.unityFontStyleAndWeight = FontStyle.Bold;
            marker.style.unityTextAlign = TextAnchor.MiddleCenter;
            marker.style.paddingLeft = 0;
            marker.style.paddingRight = 0;
            marker.style.paddingTop = 0;
            marker.style.paddingBottom = 0;
            marker.OnClick = () => OpenPopover(icon.Id);
            return marker;
        }

        private Color MarkerTextColor(string kind)
        {
            var fill = layout.MarkerColors[kind];
            return fill == "onSignal" ? layout.Color("boneBright") : layout.Color("ink");
        }

        private void BuildIconRows()
        {
            var rows = layout.Map.IconRows;
            for (var i = 0; i < fixtures.Map.Icons.Count; i++)
            {
                var icon = fixtures.Map.Icons[i];
                var row = Ui.MakeBox("icon-row");
                row.name = "icon-row-" + icon.Id;
                Ui.At(row, new LayoutRect(rows.X, rows.FirstY + i * rows.RowH, rows.Width, rows.RowH));
                row.style.borderBottomWidth = 1;
                row.style.borderBottomColor = layout.Color("rule");

                if (!layout.IconArt.RowTile.Codes.TryGetValue(icon.Icon, out var code))
                    throw new FixtureFormatException("map-icons.json: icon \"" + icon.Icon
                        + "\" has no pinned iconArt.rowTile.codes entry.");
                var tile = Ui.MakeCodeTile(layout, layout.IconArt.RowTile, code);
                Ui.Point(tile, 0, (rows.RowH - layout.IconArt.RowTile.Size) / 2);
                row.Add(tile);
                iconTiles[icon.Id] = tile;

                var name = Ui.MakeText(layout, icon.Label, "rowLabel", "boneBright", true);
                Ui.Point(name, rows.NameX - rows.X, rows.NameY);
                row.Add(name);

                var sub = Ui.MakeText(layout, icon.Status + "  ·  "
                                             + icon.DistanceKm.ToString("0.0", CultureInfo.InvariantCulture) + " KM",
                    "rowSub", "muted", false);
                Ui.Point(sub, rows.NameX - rows.X, rows.SubY);
                row.Add(sub);

                var toggle = Ui.MakeSwitch(layout, app.State.IsIconVisible(icon.Id),
                    value => app.SetIconVisible(icon.Id, value));
                Ui.Point(toggle, rows.SwitchX - rows.X, rows.SwitchY);
                row.Add(toggle);
                visibilitySwitches[icon.Id] = toggle;
                Root.Add(row);
            }
        }
    }
}
