using System;
using System.Collections.Generic;
using System.Linq;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>Abilities tab: hover-popover ability cards over a vehicle loadout. Cards and slots
    /// are app-authored chrome anchored by the generated Popover trigger part; the hover detail,
    /// icons and text are generated components.</summary>
    public sealed class AbilitiesTab
    {
        private readonly PauseMenuApp app;
        private readonly FixtureSet fixtures;
        private readonly OrionPalette palette;
        private readonly Dictionary<string, Popover> cards = new Dictionary<string, Popover>();
        private readonly Dictionary<string, PopoverTrigger> cardAnchors = new Dictionary<string, PopoverTrigger>();
        private readonly Dictionary<string, Button> slotButtons = new Dictionary<string, Button>();
        private readonly Dictionary<string, Text> slotLabels = new Dictionary<string, Text>();

        public VisualElement Root { get; }
        public VisualElement Grid { get; }
        public VisualElement Loadout { get; }
        public Text LoadoutDetail { get; }
        public Text StatusText { get; }
        public Text LoadoutName { get; }
        public Text LoadoutChassis { get; }

        public AbilitiesTab(PauseMenuApp app)
        {
            this.app = app;
            fixtures = app.State.Fixtures;
            palette = app.Palette;

            Root = Ui.Box("abilities-tab");
            Root.name = "abilities-tab";

            var left = Ui.Box("ability-library");
            left.Add(Ui.Styled(Ui.Overline("ABILITY LIBRARY"), "panel-label"));
            left.Add(Ui.Caption(fixtures.Abilities.Abilities.Count + " MODULES  //  SELECT A CARD, THEN A COMPATIBLE SLOT"));
            left.Add(Ui.Rule(true));
            Grid = new ScrollView(ScrollViewMode.Vertical);
            Grid.AddToClassList("ability-grid");
            var gridInner = Ui.Box("ability-grid-inner");
            foreach (var ability in fixtures.Abilities.Abilities) gridInner.Add(BuildCard(ability));
            Grid.Add(gridInner);
            left.Add(Grid);
            Root.Add(left);

            Loadout = BuildLoadout(out var loadoutDetail, out var statusText, out var loadoutName, out var loadoutChassis);
            LoadoutDetail = loadoutDetail;
            StatusText = statusText;
            LoadoutName = loadoutName;
            LoadoutChassis = loadoutChassis;
            Root.Add(Loadout);
            RefreshAll();
        }

        public Popover Card(string abilityId) => cards[abilityId];
        public PopoverTrigger CardAnchor(string abilityId) => cardAnchors[abilityId];
        public Text SizeChip(string abilityId) => cardAnchors[abilityId].Q<Text>(className: "size-chip");
        public Button SlotButton(string slotId) => slotButtons[slotId];
        public Text SlotLabel(string slotId) => slotLabels[slotId];

        public bool IsCardSelected(string abilityId) => cardAnchors[abilityId].ClassListContains("is-selected");
        public bool IsCardInstalled(string abilityId) => cardAnchors[abilityId].ClassListContains("is-installed");
        public bool IsSlotCompatible(string slotId) => slotButtons[slotId].ClassListContains("is-compatible");
        public bool IsSlotRejected(string slotId) => slotButtons[slotId].ClassListContains("is-rejected");
        public bool IsSlotInstalled(string slotId) => slotButtons[slotId].ClassListContains("is-installed");

        public void RefreshAll()
        {
            var pending = app.State.PendingAbilityId;
            var pendingAbility = pending == null ? null : FixtureRepository.FindAbility(fixtures, pending);
            foreach (var ability in fixtures.Abilities.Abilities)
            {
                var anchor = cardAnchors[ability.Id];
                anchor.EnableInClassList("is-selected", pending == ability.Id);
                anchor.EnableInClassList("is-installed", app.State.IsAbilityInstalled(ability.Id));
            }
            foreach (var slot in fixtures.Vehicle.Slots)
            {
                var button = slotButtons[slot.Id];
                var installedId = app.State.InstalledAbilityId(slot.Id);
                var installed = installedId == null ? null : FixtureRepository.FindAbility(fixtures, installedId);
                var compatible = pendingAbility != null && slot.Size >= pendingAbility.Size;
                button.EnableInClassList("is-installed", installed != null);
                button.EnableInClassList("is-compatible", compatible);
                button.EnableInClassList("is-rejected", app.State.RejectedSlotId == slot.Id);
                slotLabels[slot.Id].text = installed == null ? "EMPTY" : installed.Name;
                slotLabels[slot.Id].EnableInClassList("is-empty", installed == null);
            }
            LoadoutDetail.text = pendingAbility == null
                ? "SELECT AN ABILITY CARD"
                : pendingAbility.Name + "  //  SIZE " + pendingAbility.Size + "  //  " + pendingAbility.Rarity.ToUpperInvariant()
                  + "\n" + pendingAbility.Description;
            if (pendingAbility != null && app.State.RejectedSlotId == null)
                StatusText.text = CountCompatible(pendingAbility) + " COMPATIBLE SLOT(S) HIGHLIGHTED";
            LoadoutName.text = fixtures.Vehicle.Name;
            LoadoutChassis.text = fixtures.Vehicle.Chassis;
        }

        public void SetStatus(string message) => StatusText.text = message;
        public void ClearStatus() => StatusText.text = string.Empty;

        private int CountCompatible(AbilityData ability)
        {
            var count = 0;
            foreach (var slot in fixtures.Vehicle.Slots) if (slot.Size >= ability.Size) count++;
            return count;
        }

        private VisualElement BuildCard(AbilityData ability)
        {
            var popover = new Popover { name = "ability-card-" + ability.Id, Placement = "bottom" };
            popover.AddToClassList("ability-card-popover");

            var anchor = new PopoverTrigger { name = "ability-card-anchor-" + ability.Id };
            anchor.AddToClassList("ability-card");
            var rarityColor = palette.RarityColor(ability.Rarity);
            var tag = Ui.Chip(ability.Rarity.ToUpperInvariant(), "rarity-tag");
            tag.name = "rarity-tag-" + ability.Id;
            tag.style.backgroundColor = rarityColor;
            tag.style.color = palette.ContrastText(rarityColor);
            anchor.Add(tag);
            var glyph = new FullStackDS.Icon { Name = PauseMenuState.IconKey(ability.Icon), Size = "lg" };
            glyph.AddToClassList("ability-glyph");
            anchor.Add(glyph);
            var name = Ui.Styled(Ui.Title(ability.Name), "ability-name");
            anchor.Add(name);
            var sizeChip = Ui.Chip("SIZE " + ability.Size, "size-chip");
            sizeChip.name = "size-chip-" + ability.Id;
            anchor.Add(sizeChip);
            Ui.IgnorePicking(tag, glyph, name, sizeChip);

            anchor.clicked += () => app.SelectAbility(ability.Id);
            anchor.RegisterCallback<PointerEnterEvent>(_ => popover.Open = true);
            anchor.RegisterCallback<PointerLeaveEvent>(_ => popover.Open = false);
            popover.Add(anchor);

            var content = new PopoverContent { name = "ability-detail-" + ability.Id };
            content.AddToClassList("ability-detail");
            // Floating content leaves the app tree; carry the lane app class so app chrome rules
            // (detail typography, stat cells, primary actions) keep applying after the portal.
            content.AddToClassList("pause-app");
            content.style.backgroundColor = palette.SurfaceRaised;
            content.style.borderTopColor = rarityColor;
            content.Add(Ui.Overline(ability.Rarity.ToUpperInvariant() + "  //  SIZE " + ability.Size));
            content.Add(Ui.Styled(Ui.Title(ability.Name), "detail-title"));
            content.Add(Ui.Body(ability.Description));
            var stats = Ui.Box("stat-list");
            foreach (var stat in ability.Stats)
            {
                var cell = Ui.Box("stat-cell");
                cell.Add(Ui.Overline(stat.Label));
                cell.Add(Ui.Styled(Ui.Title(stat.Value), "stat-cell-value"));
                stats.Add(cell);
            }
            content.Add(stats);
            content.Add(Ui.Caption(ability.Detail));
            popover.Add(content);

            cards[ability.Id] = popover;
            cardAnchors[ability.Id] = anchor;
            return popover;
        }

        private VisualElement BuildLoadout(out Text loadoutDetail, out Text statusText, out Text loadoutName,
            out Text loadoutChassis)
        {
            var panel = Ui.Box("loadout");
            panel.name = "loadout";
            panel.style.backgroundColor = palette.SurfacePanel;
            panel.Add(Ui.Overline("VEHICLE LOADOUT"));
            loadoutName = Ui.Styled(Ui.Title(""), "loadout-title");
            loadoutName.name = "loadout-name";
            panel.Add(loadoutName);
            loadoutChassis = Ui.Caption("");
            loadoutChassis.name = "loadout-chassis";
            panel.Add(loadoutChassis);
            panel.Add(Ui.Rule());

            foreach (var slot in fixtures.Vehicle.Slots)
            {
                var button = Ui.NativeButton(string.Empty, "loadout-slot", () => app.ActivateSlot(slot.Id));
                button.name = "slot-" + slot.Id;
                var top = Ui.Box("slot-top");
                top.Add(Ui.Styled(Ui.Overline(slot.Label), "slot-label"));
                var size = Ui.Overline("SIZE " + slot.Size);
                size.AddToClassList("slot-size");
                top.Add(size);
                button.Add(top);
                var value = Ui.Styled(Ui.Body("EMPTY"), "slot-value");
                value.name = "slot-value-" + slot.Id;
                button.Add(value);
                panel.Add(button);
                slotButtons[slot.Id] = button;
                slotLabels[slot.Id] = value;
            }

            panel.Add(Ui.Rule());
            panel.Add(Ui.Overline("PENDING ABILITY"));
            loadoutDetail = Ui.Body("SELECT AN ABILITY CARD");
            loadoutDetail.AddToClassList("loadout-detail");
            loadoutDetail.name = "loadout-detail";
            panel.Add(loadoutDetail);
            statusText = Ui.Styled(Ui.Caption(""), "ability-status");
            statusText.name = "ability-status";
            panel.Add(statusText);
            return panel;
        }
    }
}
