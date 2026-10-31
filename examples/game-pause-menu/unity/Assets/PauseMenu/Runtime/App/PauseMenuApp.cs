using System;
using System.Collections.Generic;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>The lane app: theme scope, shell, generated Tabs, four tab views and the shared
    /// interaction state. Constructing it builds the whole tree synchronously; the host mounts
    /// <see cref="Root"/> into a UIDocument and the tests mount it into an editor panel.</summary>
    public sealed class PauseMenuApp
    {
        public VisualElement Root { get; }
        public PauseMenuState State { get; }
        public OrionPalette Palette { get; }
        public HeaderBand Header { get; }
        public FooterBand Footer { get; }
        public Tabs Tabs { get; }
        public MapTab Map { get; }
        public ProgressTab Progress { get; }
        public AbilitiesTab Abilities { get; }
        public SettingsTab Settings { get; }

        private readonly Dictionary<string, TabsTab> tabButtons = new Dictionary<string, TabsTab>();
        private readonly Dictionary<string, TabsPanel> tabPanels = new Dictionary<string, TabsPanel>();

        public PauseMenuApp(FixtureSet fixtures)
        {
            if (fixtures == null) throw new ArgumentNullException(nameof(fixtures));
            State = new PauseMenuState(fixtures);
            Palette = OrionPalette.From(fixtures.Appearance);

            Root = new VisualElement { name = "pause-app" };
            Root.AddToClassList("pause-app");
            var laneSheet = Resources.Load<StyleSheet>("Styles/PauseMenu");
            if (laneSheet == null)
                throw new InvalidOperationException("Lane stylesheet Resources/Styles/PauseMenu.uss is missing from the imported project.");
            Theme.SetDark(Root, true);   // generated stylesheet + dark token scope
            Theme.SetBrand(Root, "orion"); // generated .fsds-brand-orion scope
            Root.styleSheets.Add(laneSheet);

            var watermark = Ui.Styled(Ui.Display(Palette.Watermark), "app-watermark");
            watermark.pickingMode = PickingMode.Ignore;
            Root.Add(watermark);

            Header = new HeaderBand(fixtures, Palette);
            Root.Add(Header.Root);
            Footer = new FooterBand(fixtures, Palette);

            Map = new MapTab(this);
            Progress = new ProgressTab(this);
            Abilities = new AbilitiesTab(this);
            Settings = new SettingsTab(this);

            Tabs = BuildTabs();
            Root.Add(Tabs);
            Root.Add(Footer.Root);
            Root.Add(Settings.RemapModal);

            Root.RegisterCallback<KeyDownEvent>(OnKeyDown, TrickleDown.TrickleDown);
            AttachLaneSheet(Root, laneSheet);
            ApplyTabStyles();
        }

        /// <summary>The generated controls attach the package stylesheet to their own root, so a
        /// consumer sheet attached only to an ancestor loses same-specificity ties (Unity resolves
        /// ties by the later sheet on the element itself). Attach the lane sheet to every element it
        /// styles, once, after the tree is built. Element-attached consumer sheets then win ties
        /// with the generated component rules and the theme. Documented in the lane README.</summary>
        private static void AttachLaneSheet(VisualElement element, StyleSheet sheet)
        {
            if (!element.styleSheets.Contains(sheet)) element.styleSheets.Add(sheet);
            for (var i = 0; i < element.hierarchy.childCount; i++)
                AttachLaneSheet(element.hierarchy[i], sheet);
        }

        public TabsTab TabButton(string tabId) => tabButtons[tabId];
        public TabsPanel TabPanel(string tabId) => tabPanels[tabId];

        public void SelectTab(string tabId)
        {
            if (!tabButtons.ContainsKey(tabId)) throw new ArgumentException("Unknown tab id '" + tabId + "'.");
            Tabs.Value = tabId;
            ApplyTabStyles();
        }

        public void SetIconVisible(string iconId, bool visible)
        {
            State.SetIconVisible(iconId, visible);
            Map.ApplyVisibility(iconId);
        }

        public void SetNavTarget(string iconId)
        {
            var icon = FixtureRepository.FindIcon(State.Fixtures.Map, iconId);
            if (icon == null) throw new ArgumentException("Unknown map icon id '" + iconId + "'.");
            State.NavTargetId = iconId;
            Map.ApplyAll();
            Footer.SetNavTarget(icon.Label);
            Map.Marker(iconId).Open = false;
        }

        public void OpenFactionDrawer(string factionId)
        {
            var faction = FixtureRepository.FindFaction(State.Fixtures, factionId);
            if (faction == null) throw new ArgumentException("Unknown faction id '" + factionId + "'.");
            State.PendingFactionId = factionId;
            Progress.ShowDrawer(faction);
        }

        public void CloseDrawer()
        {
            State.PendingFactionId = null;
            Progress.CloseDrawer();
            Abilities.ClearStatus();
        }

        public void SelectAbility(string abilityId)
        {
            if (FixtureRepository.FindAbility(State.Fixtures, abilityId) == null)
                throw new ArgumentException("Unknown ability id '" + abilityId + "'.");
            State.PendingAbilityId = abilityId;
            State.RejectedSlotId = null;
            Abilities.RefreshAll();
        }

        public void ActivateSlot(string slotId)
        {
            var slot = FixtureRepository.FindSlot(State.Fixtures.Vehicle, slotId);
            if (slot == null) throw new ArgumentException("Unknown vehicle slot id '" + slotId + "'.");
            var pendingId = State.PendingAbilityId;
            if (pendingId == null)
            {
                var installedId = State.InstalledAbilityId(slotId);
                if (installedId == null)
                {
                    Abilities.SetStatus("SELECT AN ABILITY CARD, THEN A SLOT");
                    return;
                }
                var removed = FixtureRepository.FindAbility(State.Fixtures, installedId);
                State.RemoveInstalled(slotId);
                Abilities.RefreshAll();
                Abilities.SetStatus("REMOVED " + removed.Name + " FROM " + slot.Label);
                return;
            }
            var ability = FixtureRepository.FindAbility(State.Fixtures, pendingId);
            if (ability.Size <= slot.Size)
            {
                State.Install(slotId, pendingId);
                State.PendingAbilityId = null;
                State.RejectedSlotId = null;
                Abilities.RefreshAll();
                Abilities.SetStatus("INSTALLED " + ability.Name + "  //  " + slot.Label);
            }
            else
            {
                State.RejectedSlotId = slotId;
                Abilities.RefreshAll();
                Abilities.SetStatus("REJECTED — " + ability.Name + " IS SIZE " + ability.Size
                                    + ", " + slot.Label + " ACCEPTS SIZE " + slot.Size);
            }
        }

        public void OpenRemapModal(string actionId)
        {
            var action = FindRemap(actionId);
            if (action == null) throw new ArgumentException("Unknown remap action id '" + actionId + "'.");
            State.RemapActionId = actionId;
            Settings.ShowRemapModal(actionId);
            Settings.RemapStatus.text = "WAITING FOR INPUT — " + action.Label;
        }

        public void CompleteRemap(string binding)
        {
            var actionId = State.RemapActionId;
            if (string.IsNullOrEmpty(actionId)) return;
            State.SetRemapBinding(actionId, binding);
            Settings.RefreshRemap();
            Settings.RemapStatus.text = FindRemap(actionId).Label + "  →  " + binding;
            Settings.HideRemapModal();
        }

        public void CancelRemap()
        {
            var actionId = State.RemapActionId;
            Settings.HideRemapModal();
            if (!string.IsNullOrEmpty(actionId))
                Settings.RemapStatus.text = "REMAP CANCELLED — " + FindRemap(actionId).Label
                                            + " STILL " + State.RemapBinding(actionId);
        }

        public void SetSubtitleBackground(string optionId) => Settings.SetSubtitleBackground(optionId);

        private RemapActionData FindRemap(string id)
        {
            foreach (var action in State.Fixtures.Settings.Remap) if (action.Id == id) return action;
            return null;
        }

        private Tabs BuildTabs()
        {
            var tabs = new Tabs { name = "pause-tabs" };
            tabs.AddToClassList("pause-tabs");
            var list = new TabsList();
            list.name = "pause-tabs-list";
            tabs.Add(list);
            AddTab(tabs, list, PauseMenuState.MapTab, "MAP", Map.Root);
            AddTab(tabs, list, PauseMenuState.ProgressTab, "PROGRESS", Progress.Root);
            AddTab(tabs, list, PauseMenuState.AbilitiesTab, "ABILITIES", Abilities.Root);
            AddTab(tabs, list, PauseMenuState.SettingsTab, "SETTINGS", Settings.Root);
            tabs.Value = PauseMenuState.MapTab;
            tabs.ValueChanged += values =>
            {
                if (values.Length > 0) State.ActiveTab = values[0];
                ApplyTabStyles();
            };
            return tabs;
        }

        private void AddTab(Tabs tabs, TabsList list, string value, string label, VisualElement body)
        {
            var tab = new TabsTab { Value = value, text = label };
            tab.name = "tab-" + value;
            list.Add(tab);
            var panel = new TabsPanel { Value = value };
            panel.name = "panel-" + value;
            panel.Add(body);
            tabs.Add(panel);
            tabButtons[value] = tab;
            tabPanels[value] = panel;
        }

        /// <summary>The generated selected-tab selector is outside the native style grammar, so the
        /// lane paints the active-tab fill on the admitted Tabs state class from the appearance
        /// palette (documented in the lane README). Consumer styling of a generated state class.</summary>
        private void ApplyTabStyles()
        {
            foreach (var pair in tabButtons)
            {
                var active = pair.Value.ClassListContains("is-selected");
                pair.Value.style.backgroundColor = active ? Palette.Signal : Color.clear;
                pair.Value.style.color = active ? Palette.OnSignal : Palette.Bone;
            }
        }

        private void OnKeyDown(KeyDownEvent evt)
        {
            if (State.RemapModalOpen)
            {
                Settings.HandleModalKey(evt);
                evt.StopPropagation();
                return;
            }
            if (evt.keyCode == KeyCode.Escape && Progress.DrawerOpen)
            {
                CloseDrawer();
                evt.StopPropagation();
            }
        }
    }
}
