using System;
using System.Collections.Generic;
using System.Globalization;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;
using DsButton = FullStackDS.Button;

namespace GamePauseMenu
{
    /// <summary>PROGRESS tab: generated Card roster panel with five pinned rows (accent bar,
    /// generated Progress reputation bar, generated Badge status chip, generated Button row hit
    /// target) and a hand-authored paper drawer at the pinned rect. Drawer body text uses the
    /// generated Text/Divider components.</summary>
    public sealed class ProgressTab
    {
        private readonly PauseMenuApp app;
        private readonly FixtureSet fixtures;
        private readonly ParityLayoutData layout;
        private readonly OrionPalette palette;
        private readonly Dictionary<string, DsButton> rows = new Dictionary<string, DsButton>();
        private readonly Dictionary<string, VisualElement> rowRoots = new Dictionary<string, VisualElement>();
        private readonly Dictionary<string, Text> rowReputations = new Dictionary<string, Text>();
        private readonly Dictionary<string, VisualElement> rowRepFills = new Dictionary<string, VisualElement>();

        public VisualElement Root { get; }
        public VisualElement Drawer { get; }
        public DsButton CloseButton { get; }
        public DsButton ShopButton { get; }
        public Text DrawerName { get; }
        public Text DrawerTagline { get; }
        public Text DrawerTier { get; }
        public Badge DrawerStatus { get; }
        public Text DrawerRequirement { get; }
        public Text DrawerDescription { get; }
        public Text DrawerHistory { get; }
        public VisualElement PerksList { get; }
        public VisualElement PartsTable { get; }
        public FactionData CurrentFaction { get; private set; }

        public ProgressTab(PauseMenuApp app)
        {
            this.app = app;
            fixtures = app.State.Fixtures;
            layout = app.Layout;
            palette = app.Palette;

            Root = Ui.MakeBox("tab-view progress-tab");
            Root.name = "progress-tab";

            var listPanel = layout.Progress.ListPanel;
            Root.Add(Ui.MakePanel(layout, listPanel, layout.Progress.ListTitle, layout.Progress.ListMeta,
                layout.Panels.HeaderHeight).Root);
            foreach (var faction in fixtures.Factions.Factions) Root.Add(BuildRow(faction));

            Drawer = BuildDrawer(out var closeButton, out var shopButton, out var drawerName, out var drawerTagline,
                out var drawerTier, out var drawerStatus, out var drawerRequirement, out var drawerDescription,
                out var drawerHistory, out var perksList, out var partsTable);
            CloseButton = closeButton;
            ShopButton = shopButton;
            DrawerName = drawerName;
            DrawerTagline = drawerTagline;
            DrawerTier = drawerTier;
            DrawerStatus = drawerStatus;
            DrawerRequirement = drawerRequirement;
            DrawerDescription = drawerDescription;
            DrawerHistory = drawerHistory;
            PerksList = perksList;
            PartsTable = partsTable;
            Root.Add(Drawer);
        }

        public DsButton Row(string factionId) => rows[factionId];
        public VisualElement RowRoot(string factionId) => rowRoots[factionId];
        public Text RowReputation(string factionId) => rowReputations[factionId];
        public VisualElement RowReputationFill(string factionId) => rowRepFills[factionId];
        public bool DrawerOpen => Drawer.style.display.value == DisplayStyle.Flex;
        public string DrawerStatusText => DrawerStatus.Q<Text>()?.text ?? string.Empty;

        public void ShowDrawer(FactionData faction)
        {
            CurrentFaction = faction;
            var drawer = layout.Progress.Drawer;
            var paperMuted = layout.Color("paperMuted");
            DrawerName.text = faction.Name;
            DrawerTagline.text = faction.Tagline;
            DrawerTier.text = "DOSSIER  ·  TIER " + faction.Tier + "  ·  "
                               + (faction.Unlocked ? "UNLOCKED" : "LOCKED");
            var locked = !faction.Unlocked;
            UpdateDrawerStatus(locked);
            DrawerRequirement.text = locked ? "UNLOCK — " + faction.Requirement
                : "REPUTATION " + faction.Reputation + " / " + faction.ReputationMax;
            DrawerRequirement.style.color = layout.Color(locked ? layout.StatusChip.LockedText : "paperMuted");
            DrawerDescription.text = faction.Detail.Description;
            DrawerHistory.text = faction.Detail.History;

            PerksList.Clear();
            for (var i = 0; i < faction.Detail.Perks.Count; i++)
            {
                var row = Ui.MakeBox("perk-row");
                Ui.At(row, new LayoutRect(0, i * 18, 512, 18));
                var bullet = Ui.MakeText(layout, "+", "mission", "signal", true);
                Ui.Point(bullet, 0, 0);
                row.Add(bullet);
                var text = Ui.MakeText(layout, faction.Detail.Perks[i], "mission", "ink", false);
                Ui.Point(text, 14, 0);
                row.Add(text);
                PerksList.Add(row);
            }

            PartsTable.Clear();
            var headerRow = PartRow("PART", "COST", "RARITY", "SIZE", true, paperMuted);
            Ui.At(headerRow, 0, 0, 512, layout.Progress.Drawer.PartRowH);
            PartsTable.Add(headerRow);
            for (var i = 0; i < faction.Detail.Parts.Count; i++)
            {
                var part = faction.Detail.Parts[i];
                var row = PartRow(part.Name, Ui.Number(part.Cost) + " CR", part.Rarity.ToUpperInvariant(),
                    part.Size.ToString(CultureInfo.InvariantCulture), false, layout.Color("ink"));
                Ui.At(row, new LayoutRect(0, layout.Progress.Drawer.PartRowH * (i + 1),
                    512, layout.Progress.Drawer.PartRowH));
                PartsTable.Add(row);
            }

            ShopButton.SetEnabled(faction.Unlocked);
            Drawer.style.display = DisplayStyle.Flex;
            Drawer.AddToClassList("is-open");
            Drawer.BringToFront();
        }

        public void CloseDrawer()
        {
            CurrentFaction = null;
            Drawer.RemoveFromClassList("is-open");
            Drawer.style.display = DisplayStyle.None;
        }

        private VisualElement BuildRow(FactionData faction)
        {
            var rowsLayout = layout.Progress.Rows;
            var row = new DsButton { Size = "medium", Variant = "ghost", text = string.Empty };
            row.name = "faction-row-" + faction.Id;
            row.AddToClassList("roster-row");
            Ui.At(row, new LayoutRect(rowsLayout.X, rowsLayout.FirstY + rows.Count * rowsLayout.RowH,
                rowsLayout.Width, rowsLayout.RowH));
            Ui.StripBox(row);
            Ui.Radius(row, 0);
            row.style.paddingLeft = 0;
            row.style.paddingRight = 0;
            row.style.paddingTop = 0;
            row.style.paddingBottom = 0;
            row.style.borderBottomWidth = 1;
            row.style.borderBottomColor = layout.Color("rule");
            row.style.backgroundColor = Color.clear;
            row.OnClick = () => app.OpenFactionDrawer(faction.Id);

            var locked = !faction.Unlocked;
            var accent = Ui.MakeBox("row-accent");
            Ui.Point(accent, 0, 0);
            accent.style.width = (float)rowsLayout.AccentW;
            accent.style.height = (float)rowsLayout.RowH;
            accent.style.backgroundColor = layout.Color(locked ? "alert" : "signal");
            row.Add(accent);

            var name = Ui.MakeText(layout, faction.Name, "rowLabel", "boneBright", true);
            Ui.Point(name, rowsLayout.NameX - rowsLayout.X, rowsLayout.NameY);
            row.Add(name);

            var tagline = Ui.MakeText(layout, faction.Tagline, "rowSub", "muted", false);
            Ui.Point(tagline, rowsLayout.NameX - rowsLayout.X, rowsLayout.TaglineY);
            row.Add(tagline);

            var rep = Ui.MakeProgress(layout, new LayoutRect(rowsLayout.RepBarX - rowsLayout.X,
                rowsLayout.RepBarY, rowsLayout.RepBarW, rowsLayout.RepBarH),
                faction.ReputationMax == 0 ? 0 : 100.0 * faction.Reputation / faction.ReputationMax,
                "graphite", "signal");
            row.Add(rep);

            var repLabel = Ui.MakeText(layout,
                "REPUTATION " + faction.Reputation + " / " + faction.ReputationMax,
                "rowSub", "muted", false);
            Ui.Point(repLabel, rowsLayout.RepBarX - rowsLayout.X + rowsLayout.RepBarW + 12,
                rowsLayout.RepBarY - 5);
            row.Add(repLabel);

            var status = Ui.MakeBadge(layout, locked ? "LOCKED" : "ACCESS", "chip",
                new LayoutRect(rowsLayout.StatusX - rowsLayout.X, rowsLayout.StatusY,
                    rowsLayout.StatusW, rowsLayout.StatusH),
                layout.Color(layout.StatusChip.AccessBackground), layout.Color(layout.StatusChip.AccessText),
                locked, layout.Color(layout.StatusChip.LockedBorder));
            StyleChipLabel(status, locked);
            row.Add(status);

            var dossier = Ui.MakeText(layout, "OPEN →", "micro", "signal", true);
            Ui.Point(dossier, rowsLayout.DossierX - rowsLayout.X, rowsLayout.DossierY - 4);
            row.Add(dossier);

            Ui.PassThroughChildren(row);
            rowRoots[faction.Id] = row;
            rows[faction.Id] = row;
            rowReputations[faction.Id] = repLabel;
            rowRepFills[faction.Id] = rep.Fill;
            return row;
        }

        private VisualElement BuildDrawer(out DsButton closeButton, out DsButton shopButton, out Text drawerName,
            out Text drawerTagline, out Text drawerTier, out Badge drawerStatus, out Text drawerRequirement,
            out Text drawerDescription, out Text drawerHistory, out VisualElement perksList,
            out VisualElement partsTable)
        {
            var drawerLayout = layout.Progress.Drawer;
            var rect = drawerLayout.Rect;
            var paperMuted = layout.Color("paperMuted");
            var ink = layout.Color("ink");
            var drawer = Ui.MakeBox("faction-drawer");
            drawer.name = "faction-drawer";
            Ui.At(drawer, rect);
            drawer.style.backgroundColor = layout.Color(drawerLayout.Background);
            Ui.BorderWidth(drawer, 0);
            drawer.style.display = DisplayStyle.None;
            drawer.style.overflow = Overflow.Hidden;

            drawerTier = Ui.MakeText(layout, "DOSSIER", "micro", paperMuted, true,
                letterSpacing: layout.Size("letterSpacingMicro"));
            Ui.Point(drawerTier, 24, drawerLayout.HeaderY - rect.Y);
            drawer.Add(drawerTier);

            closeButton = Ui.MakeButton(layout, "CLOSE",
                new LayoutRect(drawerLayout.Close.X - rect.X, drawerLayout.Close.Y - rect.Y,
                    drawerLayout.Close.W, drawerLayout.Close.H), () => app.CloseDrawer(), false);
            closeButton.style.color = ink;
            Ui.BorderColor(closeButton, paperMuted);
            drawer.Add(closeButton);

            drawerName = Ui.MakeText(layout, string.Empty, "drawerTitle", ink, true,
                new LayoutRect(24, drawerLayout.TitleY - rect.Y, 440, 34));
            drawer.Add(drawerName);
            drawerTagline = Ui.MakeText(layout, string.Empty, "rowSub", paperMuted, false,
                new LayoutRect(24, drawerLayout.TaglineY - rect.Y, 512, 16));
            drawer.Add(drawerTagline);

            var rule = Ui.MakeRule(layout, paperMuted, new LayoutRect(0, drawerLayout.RuleY - rect.Y, rect.W, 1));
            drawer.Add(rule);

            drawer.Add(SectionLabel("BRIEF", 24, drawerLayout.BriefLabelY - rect.Y, paperMuted));
            drawerDescription = Ui.MakeText(layout, string.Empty, "body", ink, false,
                new LayoutRect(24, drawerLayout.BriefBodyY - rect.Y, 512, 48), align: TextAnchor.UpperLeft, wrap: true);
            drawer.Add(drawerDescription);
            drawer.Add(SectionLabel("HISTORY", 24, drawerLayout.HistoryLabelY - rect.Y, paperMuted));
            drawerHistory = Ui.MakeText(layout, string.Empty, "body", ink, false,
                new LayoutRect(24, drawerLayout.HistoryBodyY - rect.Y, 512, 40), align: TextAnchor.UpperLeft, wrap: true);
            drawer.Add(drawerHistory);
            drawer.Add(SectionLabel("PERKS", 24, drawerLayout.PerksLabelY - rect.Y, paperMuted));
            perksList = Ui.MakeBox("drawer-perks");
            Ui.At(perksList, new LayoutRect(24, drawerLayout.PerksY - rect.Y, 512, 64));
            drawer.Add(perksList);
            drawer.Add(SectionLabel("PARTS", 24, drawerLayout.PartsLabelY - rect.Y, paperMuted));
            partsTable = Ui.MakeBox("drawer-parts");
            Ui.At(partsTable, new LayoutRect(24, drawerLayout.PartsHeaderY - rect.Y, 512, 96));
            drawer.Add(partsTable);

            var shopRect = drawerLayout.ShopButton;
            shopButton = Ui.MakeButton(layout, "SHOP PARTS",
                new LayoutRect(shopRect.X - rect.X, shopRect.Y - rect.Y, shopRect.W, shopRect.H),
                () => Shop(), true);
            drawer.Add(shopButton);

            drawerStatus = Ui.MakeBadge(layout, "ACCESS", "chip", new LayoutRect(340, 24, 76, 22),
                layout.Color(layout.StatusChip.AccessBackground), layout.Color(layout.StatusChip.AccessText),
                false, layout.Color(layout.StatusChip.LockedBorder));
            drawerStatus.name = "drawer-status";
            drawer.Add(drawerStatus);

            drawerRequirement = Ui.MakeText(layout, string.Empty, "micro", paperMuted, true,
                new LayoutRect(shopRect.X - rect.X + shopRect.W + 16, drawerLayout.ShopCaptionY - rect.Y, 340, 16));
            drawer.Add(drawerRequirement);
            return drawer;
        }

        /// <summary>Status-chip labels render as a small left-aligned tag inside the 76 px chip
        /// (the pinned layout samples the chip fill at its centre, so the label stays at the edge).</summary>
        private void StyleChipLabel(Badge chip, bool locked)
        {
            chip.style.justifyContent = Justify.Center;
            var content = chip.Q<VisualElement>(className: "badge__content");
            if (content == null) return;
            content.style.justifyContent = Justify.Center;
            content.style.flexGrow = 1;
            content.style.width = Length.Percent(100);
            var label = content.Q<Text>();
            if (label == null) return;
            content.style.alignItems = Align.Center;
            label.style.fontSize = (float)layout.Size("chip");
            label.style.flexGrow = 1;
            label.style.letterSpacing = 0;
            label.style.unityTextAlign = TextAnchor.MiddleCenter;
            Ui.UseFont(label, true);
            label.style.color = layout.Color(locked
                ? layout.StatusChip.LockedText : layout.StatusChip.AccessText);
        }

        private void UpdateDrawerStatus(bool locked)
        {
            var content = DrawerStatus.Q<VisualElement>(className: "badge__content");
            if (content != null) content.Clear();
            var label = Ui.MakeText(layout, locked ? "LOCKED" : "ACCESS", "chip",
                locked ? layout.Color(layout.StatusChip.LockedText) : layout.Color(layout.StatusChip.AccessText),
                true, align: TextAnchor.MiddleCenter);
            label.style.letterSpacing = 0;
            if (content != null) content.Add(label);
            DrawerStatus.style.backgroundColor = locked ? Color.clear : layout.Color(layout.StatusChip.AccessBackground);
            Ui.BorderWidth(DrawerStatus, locked ? 1 : 0);
            if (locked) Ui.BorderColor(DrawerStatus, layout.Color(layout.StatusChip.LockedBorder));
            DrawerStatus.EnableInClassList("is-locked", locked);
        }

        private Text SectionLabel(string label, double x, double y, Color color)
        {
            var text = Ui.MakeText(layout, label, "micro", color, true,
                letterSpacing: layout.Size("letterSpacingMicro"));
            Ui.Point(text, x, y);
            return text;
        }

        private void Shop()
        {
            if (CurrentFaction == null || !CurrentFaction.Unlocked) return;
            DrawerRequirement.text = "ORDER QUEUED — " + CurrentFaction.Name;
        }

        private VisualElement PartRow(string name, string cost, string rarity, string size, bool header, Color color)
        {
            var row = Ui.MakeBox("part-row");
            var nameText = Ui.MakeText(layout, name, "mission", color, header,
                new LayoutRect(0, 0, 300, 16));
            row.Add(nameText);
            var costText = Ui.MakeText(layout, cost, "mission", color, header,
                new LayoutRect(300, 0, 82, 16), align: TextAnchor.MiddleRight);
            row.Add(costText);
            var rarityText = Ui.MakeText(layout, rarity, "mission", color, header,
                new LayoutRect(382, 0, 84, 16), align: TextAnchor.MiddleRight);
            row.Add(rarityText);
            var sizeText = Ui.MakeText(layout, size, "mission", color, header,
                new LayoutRect(466, 0, 46, 16), align: TextAnchor.MiddleRight);
            row.Add(sizeText);
            row.style.height = (float)layout.Progress.Drawer.PartRowH;
            return row;
        }
    }
}
