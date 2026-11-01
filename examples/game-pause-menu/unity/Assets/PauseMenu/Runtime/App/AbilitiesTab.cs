using System;
using System.Collections.Generic;
using System.Globalization;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;
using DsButton = FullStackDS.Button;

namespace GamePauseMenu
{
    /// <summary>ABILITIES tab on the parity grid: 5x2 generated Card grid (rarity Badge, Icon,
    /// name, size pips, installed chip, full-card generated Button hit target) and a detail panel
    /// with the ability body, stat blocks and a 2x3 generated Button slot grid. Hover detail is a
    /// generated Popover at the pinned hover rect.</summary>
    public sealed class AbilitiesTab
    {
        private sealed class CardView
        {
            public Card Root;
            public DsButton Hit;
            public Badge Rarity;
            public Badge Installed;
            public Text Name;
        }

        private sealed class SlotView
        {
            public DsButton Root;
            public Text Value;
        }

        private readonly PauseMenuApp app;
        private readonly FixtureSet fixtures;
        private readonly ParityLayoutData layout;
        private readonly Dictionary<string, CardView> cards = new Dictionary<string, CardView>();
        private readonly Dictionary<string, VisualElement> cardArt = new Dictionary<string, VisualElement>();
        private readonly Dictionary<string, SlotView> slots = new Dictionary<string, SlotView>();
        private readonly Text detailMeta;
        private readonly Text abilityTitle;
        private readonly Badge abilityRarity;
        private readonly Badge abilitySize;
        private readonly Text abilityBody;
        private readonly Text[] statValues = new Text[3];
        private readonly Text statusText;
        private readonly Text loadoutName;
        private readonly Text loadoutChassis;
        private AbilityData hovered;

        public VisualElement Root { get; }
        public VisualElement HoverPopoverHost { get; }
        public Popover HoverPopover { get; }
        public Text LoadoutDetail => abilityBody;
        public Text StatusText => statusText;
        public Text AbilityTitle => abilityTitle;
        public Text DetailMeta => detailMeta;
        public Text LoadoutName => loadoutName;
        public Text LoadoutChassis => loadoutChassis;
        public bool HasOpenHover => HoverPopover.Open;

        private readonly Text hoverTitle;
        private readonly Text hoverMeta;
        private readonly Text hoverBody;
        private readonly Text hoverStats;

        public AbilitiesTab(PauseMenuApp app)
        {
            this.app = app;
            fixtures = app.State.Fixtures;
            layout = app.Layout;
            var content = layout.Panels.Content;

            Root = Ui.MakeBox("tab-view abilities-tab");
            Root.name = "abilities-tab";

            Root.Add(Ui.MakePanel(layout, layout.Abilities.GridPanel, layout.Abilities.GridTitle,
                layout.Abilities.GridMeta, layout.Panels.HeaderHeight).Root);
            for (var i = 0; i < fixtures.Abilities.Abilities.Count; i++)
                Root.Add(BuildCard(fixtures.Abilities.Abilities[i], i).Root);

            Root.Add(Ui.MakePanel(layout, layout.Abilities.DetailPanel, layout.Abilities.DetailTitle,
                layout.Abilities.DetailMeta, layout.Panels.HeaderHeight).Root);
            var detail = layout.Abilities.DetailPanel;
            var bodyX = detail.X + layout.PanelPadding;
            var bodyY = detail.Y + layout.Panels.HeaderHeight + 16;

            abilityTitle = Ui.MakeText(layout, "NO MODULE SELECTED", "title", "boneBright", true,
                new LayoutRect(bodyX, layout.Abilities.AbilityTitleY - 4, 376, 30));
            Root.Add(abilityTitle);
            abilityRarity = Ui.MakeBadge(layout, "RARE", "chip", new LayoutRect(bodyX, layout.Abilities.AbilityChipsY, 64, 18),
                layout.Color("signal"), layout.Color("onSignal"), false, Color.clear);
            Root.Add(abilityRarity);
            abilitySize = Ui.MakeBadge(layout, "SIZE 1", "chip",
                new LayoutRect(bodyX + 72, layout.Abilities.AbilityChipsY, 64, 18),
                layout.Color("graphite"), layout.Color("boneBright"), false, Color.clear);
            Root.Add(abilitySize);
            abilityBody = Ui.MakeText(layout, string.Empty, "body", "bone", false,
                new LayoutRect(bodyX, layout.Abilities.AbilityBodyY, 376, 64), align: TextAnchor.UpperLeft, wrap: true);
            Root.Add(abilityBody);

            var statRowY = layout.Abilities.StatRowY;
            for (var i = 0; i < 3; i++)
            {
                var label = Ui.MakeText(layout, string.Empty, "micro", "muted", true,
                    letterSpacing: layout.Size("letterSpacingMicro"));
                Ui.Point(label, bodyX + i * 126, statRowY);
                Root.Add(label);
                statValues[i] = Ui.MakeText(layout, "—", "bigValue", "boneBright", true,
                    new LayoutRect(bodyX + i * 126, statRowY + 16, 120, 24));
                Root.Add(statValues[i]);
                statValues[i].userData = label;
            }

            Root.Add(Ui.MakeRule(layout, layout.Color("rule"),
                new LayoutRect(bodyX, layout.Abilities.LoadoutTitleY - 8, 376, 1)));
            var loadoutTitle = Ui.MakeText(layout, "VEHICLE LOADOUT", "panelTitle", "boneBright", true,
                letterSpacing: layout.Size("letterSpacingMicro"));
            Point(loadoutTitle, bodyX, layout.Abilities.LoadoutTitleY);
            Root.Add(loadoutTitle);
            loadoutName = Ui.MakeText(layout, string.Empty, "value", "boneBright", true,
                new LayoutRect(bodyX, layout.Abilities.VehicleNameY, 240, 20));
            Root.Add(loadoutName);
            loadoutChassis = Ui.MakeText(layout, string.Empty, "micro", "muted", false,
                new LayoutRect(bodyX + 248, layout.Abilities.VehicleNameY + 2, 128, 16));
            Root.Add(loadoutChassis);

            var slotLayout = layout.Abilities.Slots;
            for (var i = 0; i < fixtures.Vehicle.Slots.Count; i++)
            {
                var slot = fixtures.Vehicle.Slots[i];
                var rect = slotLayout.SlotRect(i);
                var button = new DsButton { Size = "medium", Variant = "outline", text = string.Empty };
                button.name = "slot-" + slot.Id;
                button.AddToClassList("loadout-slot");
                Ui.At(button, rect);
                Ui.StripBox(button);
                Ui.Radius(button, 0);
                button.style.paddingLeft = 8;
                button.style.paddingRight = 8;
                button.style.paddingTop = 0;
                button.style.paddingBottom = 0;
                button.style.backgroundColor = layout.Color("charcoal");
                Ui.BorderWidth(button, 1);
                Ui.BorderColor(button, layout.Color("rule"));
                button.style.unityTextAlign = TextAnchor.MiddleLeft;
                button.OnClick = () => app.ActivateSlot(slot.Id);

                var label = Ui.MakeText(layout, slot.Label, "micro", "muted", true,
                    new LayoutRect(0, 6, 120, 14));
                button.Add(label);
                var size = Ui.MakeText(layout, "SIZE " + slot.Size, "micro", "muted", true,
                    new LayoutRect(108, 6, 64, 14), align: TextAnchor.MiddleRight);
                button.Add(size);
                var value = Ui.MakeText(layout, "EMPTY", "value", "muted", true,
                    new LayoutRect(0, 26, 164, 20));
                button.Add(value);
                Ui.PassThroughChildren(button);
                Root.Add(button);
                slots[slot.Id] = new SlotView { Root = button, Value = value };
            }

            statusText = Ui.MakeText(layout, string.Empty, "micro", "signalHot", true,
                new LayoutRect(bodyX, layout.Abilities.PendingNoteY, 376, 16), wrap: true);
            Root.Add(statusText);
            // detailMeta ref: the panel header meta text carries the compatible-slot count.
            detailMeta = FindDetailMeta();

            HoverPopoverHost = Ui.MakeBox("hover-popover-host");
            Ui.At(HoverPopoverHost, 0, 0, 0, 0);
            HoverPopover = new Popover { name = "ability-hover", Placement = "bottom" };
            HoverPopover.AddToClassList("parity-popover");
            HoverPopover.style.position = Position.Absolute;
            Ui.StripBox(HoverPopover);
            var anchor = new PopoverTrigger { name = "ability-hover-anchor", text = string.Empty };
            Ui.At(anchor, new LayoutRect(layout.Abilities.HoverPopover.X, layout.Abilities.HoverPopover.Y - 4, 0, 0));
            anchor.pickingMode = PickingMode.Ignore;
            anchor.style.opacity = 0;
            HoverPopover.Add(anchor);
            var hover = new PopoverContent { name = "ability-hover-content" };
            hover.AddToClassList("parity-popover-content");
            Ui.At(hover, layout.Abilities.HoverPopover);
            Ui.StripBox(hover);
            hover.style.backgroundColor = layout.Color("charcoal");
            Ui.BorderWidth(hover, 1);
            Ui.BorderColor(hover, layout.Color("rule"));
            hover.style.borderTopWidth = 2;
            hover.style.borderTopColor = layout.Color("signal");
            hover.style.overflow = Overflow.Hidden;
            hover.horizontalScrollerVisibility = ScrollerVisibility.Hidden;
            hover.verticalScrollerVisibility = ScrollerVisibility.Hidden;
            hoverTitle = Ui.MakeText(layout, string.Empty, "title", "boneBright", true);
            Ui.Point(hoverTitle, 14, 12);
            hover.Add(hoverTitle);
            hoverMeta = Ui.MakeText(layout, string.Empty, "micro", "muted", true);
            Ui.Point(hoverMeta, 14, 44);
            hover.Add(hoverMeta);
            hoverBody = Ui.MakeText(layout, string.Empty, "body", "textSecondary", false,
                new LayoutRect(14, 62, layout.Abilities.HoverPopover.W - 28, 76), wrap: true);
            hover.Add(hoverBody);
            hoverStats = Ui.MakeText(layout, string.Empty, "micro", "signal", true);
            Ui.Point(hoverStats, 14, 148);
            hover.Add(hoverStats);
            HoverPopover.Add(hover);
            HoverPopoverHost.Add(HoverPopover);

            RefreshAll();
        }

        private Text FindDetailMeta()
        {
            foreach (var text in Root.Query<Text>().ToList())
                if (text.text == layout.Abilities.DetailMeta) return text;
            return null;
        }

        public Popover Card(string abilityId)
        {
            if (!cards.ContainsKey(abilityId)) throw new ArgumentException("Unknown ability id '" + abilityId + "'.");
            return HoverPopover;
        }

        /// <summary>The pinned 40x40 code tile for an ability card.</summary>
        public VisualElement CardArt(string abilityId) => cardArt.TryGetValue(abilityId, out var art) ? art : null;

        /// <summary>The generated ability-card root (holds the selected/installed state classes and outline).</summary>
        public Card CardRoot(string abilityId)
        {
            if (!cards.ContainsKey(abilityId)) throw new ArgumentException("Unknown ability id '" + abilityId + "'.");
            return cards[abilityId].Root;
        }

        public DsButton CardAnchor(string abilityId)
        {
            if (!cards.ContainsKey(abilityId)) throw new ArgumentException("Unknown ability id '" + abilityId + "'.");
            return cards[abilityId].Hit;
        }

        public DsButton SlotButton(string slotId) => slots[slotId].Root;
        public Text SlotLabel(string slotId) => slots[slotId].Value;
        public bool IsCardSelected(string abilityId) => cards[abilityId].Root.ClassListContains("is-selected");
        public bool IsCardInstalled(string abilityId) => cards[abilityId].Root.ClassListContains("is-installed");
        public bool IsSlotCompatible(string slotId) => slots[slotId].Root.ClassListContains("is-compatible");
        public bool IsSlotRejected(string slotId) => slots[slotId].Root.ClassListContains("is-rejected");
        public bool IsSlotInstalled(string slotId) => slots[slotId].Root.ClassListContains("is-installed");

        public void OpenHover(string abilityId)
        {
            var ability = FixtureRepository.FindAbility(fixtures, abilityId);
            if (ability == null) throw new ArgumentException("Unknown ability id '" + abilityId + "'.");
            hovered = ability;
            hoverTitle.text = ability.Name;
            hoverMeta.text = ability.Rarity.ToUpperInvariant() + "  ·  SIZE " + ability.Size;
            hoverBody.text = ability.Description;
            var stats = string.Empty;
            foreach (var stat in ability.Stats)
                stats += (stats.Length == 0 ? string.Empty : "   ") + stat.Label + " " + stat.Value;
            hoverStats.text = stats;
            HoverPopover.Open = true;
        }

        public void CloseHoverPopovers()
        {
            HoverPopover.Open = false;
            hovered = null;
        }

        public void ClearStatus() => statusText.text = string.Empty;
        public void SetStatus(string message) => statusText.text = message;

        public void RefreshAll()
        {
            var pending = app.State.PendingAbilityId == null
                ? null
                : FixtureRepository.FindAbility(fixtures, app.State.PendingAbilityId);
            foreach (var ability in fixtures.Abilities.Abilities)
            {
                var view = cards[ability.Id];
                view.Root.EnableInClassList("is-selected", pending != null && pending.Id == ability.Id);
                view.Hit.EnableInClassList("is-selected", pending != null && pending.Id == ability.Id);
                var installed = app.State.IsAbilityInstalled(ability.Id);
                view.Root.EnableInClassList("is-installed", installed);
                view.Installed.style.display = installed ? DisplayStyle.Flex : DisplayStyle.None;
                var selected = pending != null && pending.Id == ability.Id;
                Ui.BorderWidth(view.Root, selected ? 2 : 1);
                Ui.BorderColor(view.Root, layout.Color(selected ? "signal" : "rule"));
            }

            var compatible = 0;
            foreach (var slot in fixtures.Vehicle.Slots)
            {
                var view = slots[slot.Id];
                var installedId = app.State.InstalledAbilityId(slot.Id);
                var installed = installedId == null ? null : FixtureRepository.FindAbility(fixtures, installedId);
                var fits = pending != null && slot.Size >= pending.Size;
                var rejected = app.State.RejectedSlotId == slot.Id;
                view.Root.EnableInClassList("is-compatible", fits);
                view.Root.EnableInClassList("is-installed", installed != null);
                view.Root.EnableInClassList("is-rejected", rejected);
                Ui.BorderWidth(view.Root, rejected || fits ? 2 : 1);
                Ui.BorderColor(view.Root, layout.Color(rejected ? "alert" : fits ? "clear" : "rule"));
                view.Root.style.backgroundColor = layout.Color(rejected ? "graphite" : "charcoal");
                view.Value.text = installed == null ? "EMPTY" : installed.Name;
                view.Value.style.color = layout.Color(installed == null ? "muted" : "boneBright");
                if (fits) compatible++;
            }

            if (pending == null)
            {
                abilityTitle.text = "NO MODULE SELECTED";
                abilityBody.text = "SELECT AN ABILITY CARD, THEN A COMPATIBLE SLOT.";
                SetBadge(abilityRarity, "—", layout.Color("graphite"), layout.Color("muted"));
                SetBadge(abilitySize, "SIZE —", layout.Color("graphite"), layout.Color("muted"));
                for (var i = 0; i < statValues.Length; i++)
                {
                    statValues[i].text = "—";
                    if (statValues[i].userData is Text label) label.text = string.Empty;
                }
            }
            else
            {
                abilityTitle.text = pending.Name;
                abilityBody.text = pending.Description;
                SetBadge(abilityRarity, pending.Rarity.ToUpperInvariant(),
                    RarityColor(pending.Rarity), RarityTextColor(pending.Rarity));
                SetBadge(abilitySize, "SIZE " + pending.Size, layout.Color("graphite"), layout.Color("boneBright"));
                for (var i = 0; i < statValues.Length; i++)
                {
                    var stat = i < pending.Stats.Count ? pending.Stats[i] : null;
                    statValues[i].text = stat == null ? "—" : stat.Value;
                    if (statValues[i].userData is Text label) label.text = stat == null ? string.Empty : stat.Label;
                }
            }
            if (detailMeta != null) detailMeta.text = compatible + " COMPATIBLE SLOTS";
            loadoutName.text = fixtures.Vehicle.Name;
            loadoutChassis.text = fixtures.Vehicle.Chassis;
        }

        private Color RarityColor(string rarity) => layout.Color(layout.RarityColors[rarity]);
        private Color RarityTextColor(string rarity) => layout.Color(layout.RarityTextColors[rarity]);

        private static void SetBadge(Badge badge, string text, Color background, Color foreground)
        {
            var content = badge.Q<VisualElement>(className: "badge__content");
            if (content == null) return;
            content.Clear();
            var label = new Text { text = text };
            label.style.color = foreground;
            label.style.fontSize = 10;
            label.style.unityFontStyleAndWeight = FontStyle.Bold;
            label.style.unityTextAlign = TextAnchor.MiddleCenter;
            label.style.letterSpacing = 1.1f;
            content.Add(label);
            badge.style.backgroundColor = background;
        }

        private CardView BuildCard(AbilityData ability, int index)
        {
            var cardsLayout = layout.Abilities.Cards;
            var rect = cardsLayout.CardRect(index);
            var view = new CardView();
            var card = new Card { Density = "default" };
            card.name = "ability-card-" + ability.Id;
            card.AddToClassList("ability-card");
            Ui.At(card, rect);
            Ui.StripBox(card);
            card.style.overflow = Overflow.Visible;

            var hit = new DsButton { Size = "medium", Variant = "ghost", text = string.Empty };
            hit.name = "ability-card-hit-" + ability.Id;
            Ui.At(hit, 0, 0, rect.W, rect.H);
            Ui.StripBox(hit);
            hit.style.backgroundColor = Color.clear;
            Ui.BorderWidth(hit, 0);
            hit.OnClick = () => app.SelectAbility(ability.Id);
            hit.RegisterCallback<PointerEnterEvent>(_ => OpenHover(ability.Id));
            hit.RegisterCallback<PointerLeaveEvent>(_ => CloseHoverPopovers());
            card.Add(hit);

            var chip = cardsLayout.RarityChip;
            var rarity = Ui.MakeBadge(layout, ability.Rarity.ToUpperInvariant(), "chip",
                new LayoutRect(chip.X, chip.Y, chip.W, chip.H),
                RarityColor(ability.Rarity), RarityTextColor(ability.Rarity), false, Color.clear);
            rarity.style.justifyContent = Justify.FlexStart;
            var rarityLabel = rarity.Q<Text>();
            if (rarityLabel != null)
            {
                rarityLabel.style.fontSize = 9;
                rarityLabel.style.letterSpacing = 0.6f;
                rarityLabel.style.unityTextAlign = TextAnchor.MiddleLeft;
            }
            // Position relative to the card, not the viewport.
            Ui.Point(rarity, chip.X, chip.Y);
            rarity.style.backgroundColor = RarityColor(ability.Rarity);
            card.Add(rarity);

            var art = Ui.MakeCodeTile(layout, layout.IconArt.CardTile, FixtureRepository.IconCode(ability.Name));
            Ui.Point(art, (rect.W - layout.IconArt.CardTile.Size) / 2, cardsLayout.IconY);
            card.Add(art);
            cardArt[ability.Id] = art;

            var name = Ui.MakeText(layout, ability.Name, "rowLabel", "boneBright", true,
                new LayoutRect(8, cardsLayout.NameY, rect.W - 16, 16), align: TextAnchor.MiddleCenter);
            name.style.overflow = Overflow.Hidden;
            name.style.textOverflow = TextOverflow.Ellipsis;
            card.Add(name);

            var sizeLine = Ui.MakeBox("card-size-line");
            Ui.Point(sizeLine, 0, cardsLayout.SizeY);
            sizeLine.style.width = Length.Percent(100);
            sizeLine.style.flexDirection = FlexDirection.Row;
            sizeLine.style.justifyContent = Justify.Center;
            sizeLine.style.alignItems = Align.Center;
            var size = Ui.MakeText(layout, "SIZE " + ability.Size, "micro", "muted", true);
            sizeLine.Add(size);
            for (var pip = 0; pip < ability.Size; pip++)
            {
                var block = Ui.MakeBox("size-pip");
                block.style.width = 10;
                block.style.height = 4;
                block.style.marginLeft = 3;
                block.style.backgroundColor = layout.Color("signal");
                sizeLine.Add(block);
            }
            card.Add(sizeLine);

            var installed = Ui.MakeBadge(layout, "INSTALLED", "micro",
                new LayoutRect((rect.W - 84) / 2, cardsLayout.InstalledY, 84, 18),
                layout.Color("clear"), layout.Color("ink"), false, Color.clear);
            installed.style.display = DisplayStyle.None;
            card.Add(installed);

            Ui.PassThroughChildren(card);
            view.Root = card;
            view.Hit = hit;
            view.Rarity = rarity;
            view.Installed = installed;
            view.Name = name;
            cards[ability.Id] = view;
            return view;
        }

        private static void Point(VisualElement element, double x, double y) => Ui.Point(element, x, y);
    }
}
