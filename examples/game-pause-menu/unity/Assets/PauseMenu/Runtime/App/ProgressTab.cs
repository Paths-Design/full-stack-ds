using System;
using System.Collections.Generic;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>Progress tab: faction list plus a left drawer that overlays the list. The row and
    /// drawer chrome is app-authored (the Unity allowlist admits no Card/Progress/Badge); the
    /// labels and rules inside them are generated components.</summary>
    public sealed class ProgressTab
    {
        private readonly PauseMenuApp app;
        private readonly FixtureSet fixtures;
        private readonly OrionPalette palette;
        private readonly Dictionary<string, Button> rows = new Dictionary<string, Button>();
        private readonly Dictionary<string, VisualElement> rowRoots = new Dictionary<string, VisualElement>();
        private readonly Dictionary<string, Text> rowReputations = new Dictionary<string, Text>();
        private readonly Dictionary<string, VisualElement> rowRepFills = new Dictionary<string, VisualElement>();

        public VisualElement Root { get; }
        public VisualElement List { get; }
        public VisualElement Drawer { get; }
        public Button CloseButton { get; }
        public Button ShopButton { get; }
        public Text DrawerName { get; }
        public Text DrawerTagline { get; }
        public Text DrawerTier { get; }
        public Text DrawerStatus { get; }
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
            palette = app.Palette;

            Root = Ui.Box("progress-tab");
            Root.name = "progress-tab";
            Root.style.position = Position.Relative;
            Root.style.overflow = Overflow.Hidden;

            var head = Ui.Box("tab-head");
            head.Add(Ui.Styled(Ui.Overline("FACTIONS"), "panel-label"));
            head.Add(Ui.Caption(fixtures.Factions.Factions.Count + " TRACKED  //  SELECT A ROW TO OPEN ITS FILE"));
            Root.Add(head);
            Root.Add(Ui.Rule(true));

            List = new ScrollView(ScrollViewMode.Vertical);
            List.AddToClassList("faction-list");
            foreach (var faction in fixtures.Factions.Factions) List.Add(BuildRow(faction));
            Root.Add(List);

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

        public Button Row(string factionId) => rows[factionId];
        public VisualElement RowRoot(string factionId) => rowRoots[factionId];
        public Text RowReputation(string factionId) => rowReputations[factionId];
        public VisualElement RowReputationFill(string factionId) => rowRepFills[factionId];
        public bool DrawerOpen => Drawer.style.display.value == DisplayStyle.Flex;

        public bool RowUnlocked(string factionId)
        {
            var faction = FixtureRepository.FindFaction(fixtures, factionId);
            return faction != null && faction.Unlocked;
        }

        public void ShowDrawer(FactionData faction)
        {
            CurrentFaction = faction;
            DrawerName.text = faction.Name;
            DrawerTagline.text = faction.Tagline;
            DrawerTier.text = "TIER " + faction.Tier + "  //  REPUTATION " + faction.Reputation + " / " + faction.ReputationMax
                + (faction.Unlocked ? "  //  UNLOCKED" : "  //  LOCKED");
            DrawerStatus.text = faction.Unlocked ? "OPEN CONTRACT" : "CONTRACT LOCKED";
            DrawerStatus.EnableInClassList("is-locked", !faction.Unlocked);
            DrawerRequirement.text = faction.Unlocked
                ? "REPUTATION " + faction.Reputation + " / " + faction.ReputationMax
                : "UNLOCK REQUIREMENT — " + faction.Requirement;
            DrawerRequirement.EnableInClassList("is-locked", !faction.Unlocked);
            DrawerDescription.text = faction.Detail.Description;
            DrawerHistory.text = faction.Detail.History;

            PerksList.Clear();
            foreach (var perk in faction.Detail.Perks)
            {
                var row = Ui.Box("perk-row");
                row.Add(Ui.Styled(Ui.Overline("+"), "perk-mark"));
                row.Add(Ui.Body(perk));
                PerksList.Add(row);
            }

            PartsTable.Clear();
            PartsTable.Add(PartRow("PART", "COST", "RARITY", "SIZE", true));
            foreach (var part in faction.Detail.Parts)
                PartsTable.Add(PartRow(part.Name, Ui.Number(part.Cost) + " CR", part.Rarity.ToUpperInvariant(), part.Size.ToString(), false));

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
            var row = Ui.NativeButton(string.Empty, "faction-row", () => app.OpenFactionDrawer(faction.Id));
            row.name = "faction-row-" + faction.Id;
            row.AddToClassList(faction.Unlocked ? "is-unlocked" : "is-locked");

            var top = Ui.Box("faction-row-top");
            top.Add(Ui.Styled(Ui.Title(faction.Name), "faction-name"));
            top.Add(Ui.Chip("TIER " + faction.Tier, "tier-chip"));
            top.Add(Ui.Chip(faction.Unlocked ? "UNLOCKED" : "LOCKED", faction.Unlocked ? "unlocked-chip" : "lock-chip"));
            row.Add(top);
            row.Add(Ui.Caption(faction.Tagline));

            var rep = Ui.Box("faction-rep");
            var track = Ui.Box("rep-track");
            var fill = Ui.Box("rep-fill");
            fill.style.width = Length.Percent(100f * faction.Reputation / Mathf.Max(1, faction.ReputationMax));
            fill.style.backgroundColor = faction.Unlocked ? palette.Signal : palette.Moss;
            track.Add(fill);
            rep.Add(track);
            var repText = Ui.Styled(Ui.Caption(faction.Unlocked
                ? faction.Reputation + " / " + faction.ReputationMax + " REPUTATION"
                : "REQUIRES — " + faction.Requirement), "rep-text");
            rep.Add(repText);
            row.Add(rep);

            rows[faction.Id] = row;
            rowRoots[faction.Id] = row;
            rowReputations[faction.Id] = repText;
            rowRepFills[faction.Id] = fill;
            return row;
        }

        private VisualElement BuildDrawer(out Button closeButton, out Button shopButton, out Text drawerName,
            out Text drawerTagline, out Text drawerTier, out Text drawerStatus, out Text drawerRequirement,
            out Text drawerDescription, out Text drawerHistory, out VisualElement perksList, out VisualElement partsTable)
        {
            // A ScrollView so the drawer stays usable down to the 960x640 supported viewport.
            var drawer = new ScrollView(ScrollViewMode.Vertical);
            drawer.AddToClassList("faction-drawer");
            drawer.name = "faction-drawer";
            drawer.style.display = DisplayStyle.None;
            drawer.style.backgroundColor = palette.SurfacePanel;
            drawer.style.borderRightColor = palette.Signal;
            drawer.style.borderRightWidth = palette.BorderWidth * 2;

            var top = Ui.Box("drawer-top");
            closeButton = Ui.NativeButton("BACK", "key-chip", () => app.CloseDrawer());
            closeButton.name = "drawer-close";
            top.Add(closeButton);
            var kicker = Ui.Overline("FACTION FILE");
            kicker.AddToClassList("drawer-kicker");
            top.Add(kicker);
            drawer.Add(top);

            drawerName = Ui.Styled(Ui.Headline(""), "drawer-name");
            drawerName.name = "drawer-name";
            drawer.Add(drawerName);
            drawerTagline = Ui.Caption("");
            drawerTagline.name = "drawer-tagline";
            drawer.Add(drawerTagline);
            drawerTier = Ui.Overline("");
            drawerTier.name = "drawer-tier";
            drawer.Add(drawerTier);
            drawer.Add(Ui.Rule());

            var statusRow = Ui.Box("drawer-status-row");
            drawerStatus = Ui.Chip("", "drawer-status");
            drawerStatus.name = "drawer-status";
            statusRow.Add(drawerStatus);
            drawerRequirement = Ui.Styled(Ui.Body(""), "drawer-requirement");
            drawerRequirement.name = "drawer-requirement";
            statusRow.Add(drawerRequirement);
            drawer.Add(statusRow);
            drawer.Add(Ui.Rule());

            drawer.Add(Ui.Styled(Ui.Overline("BRIEF"), "block-label"));
            drawerDescription = Ui.Body("");
            drawerDescription.name = "drawer-description";
            drawer.Add(drawerDescription);
            drawer.Add(Ui.Styled(Ui.Overline("HISTORY"), "block-label"));
            drawerHistory = Ui.Body("");
            drawerHistory.name = "drawer-history";
            drawer.Add(drawerHistory);

            drawer.Add(Ui.Styled(Ui.Overline("PERKS"), "block-label"));
            perksList = Ui.Box("drawer-perks");
            perksList.name = "drawer-perks";
            drawer.Add(perksList);

            drawer.Add(Ui.Styled(Ui.Overline("PARTS"), "block-label"));
            partsTable = Ui.Box("drawer-parts");
            partsTable.name = "drawer-parts";
            drawer.Add(partsTable);

            var actions = Ui.Box("drawer-actions");
            shopButton = Ui.NativeButton("SHOP PARTS", "primary-action", () => Shop());
            shopButton.name = "shop-parts";
            actions.Add(shopButton);
            drawer.Add(actions);
            return drawer;
        }

        private void Shop()
        {
            if (CurrentFaction == null || !CurrentFaction.Unlocked) return;
            DrawerStatus.text = "PARTS ORDER QUEUED  //  " + CurrentFaction.Name;
        }

        private static VisualElement PartRow(string name, string cost, string rarity, string size, bool header)
        {
            var row = Ui.Box("part-row");
            if (header) row.AddToClassList("part-row--head");
            var nameText = Ui.Caption(name);
            nameText.AddToClassList("part-name");
            var costText = Ui.Caption(cost);
            costText.AddToClassList("part-cost");
            var rarityText = Ui.Caption(rarity);
            rarityText.AddToClassList("part-rarity");
            var sizeText = Ui.Caption(size);
            sizeText.AddToClassList("part-size");
            row.Add(nameText);
            row.Add(costText);
            row.Add(rarityText);
            row.Add(sizeText);
            return row;
        }
    }
}
