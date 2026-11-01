using System;
using System.Collections.Generic;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>The parity rebuild of the pause menu. Shell bands, Tabs, four tab views and the
    /// shared interaction state are all placed from fixtures/parity-layout.json at 1280x800.
    /// Semantics are unchanged from the first pass: the generated Tabs still own tab selection and
    /// the interaction handlers below are the same contract.</summary>
    public sealed class PauseMenuApp
    {
        public VisualElement Root { get; }
        public PauseMenuState State { get; }
        public OrionPalette Palette { get; }
        public ParityLayoutData Layout { get; }
        public HeaderBand Header { get; }
        public FooterBand Footer { get; }
        public Tabs Tabs { get; }
        public MapTab Map { get; }
        public ProgressTab Progress { get; }
        public AbilitiesTab Abilities { get; }
        public SettingsTab Settings { get; }
        public VisualElement Overlay { get; }

        private readonly Dictionary<string, TabsTab> tabButtons = new Dictionary<string, TabsTab>();
        private readonly Dictionary<string, TabsPanel> tabPanels = new Dictionary<string, TabsPanel>();

        public PauseMenuApp(FixtureSet fixtures)
        {
            if (fixtures == null) throw new ArgumentNullException(nameof(fixtures));
            Layout = fixtures.Parity ?? throw new ArgumentException("Fixture set carries no parity layout.");
            State = new PauseMenuState(fixtures);
            Palette = OrionPalette.From(Layout);

            Root = new VisualElement { name = "pause-app" };
            Root.AddToClassList("pause-app");
            var laneSheet = Resources.Load<StyleSheet>("Styles/PauseMenu");
            if (laneSheet == null)
                throw new InvalidOperationException("Lane stylesheet Resources/Styles/PauseMenu.uss is missing from the imported project.");
            Theme.SetDark(Root, true);   // generated stylesheet + dark token scope
            Theme.SetBrand(Root, "orion"); // generated .fsds-brand-orion scope
            Root.styleSheets.Add(laneSheet);
            Ui.StripBox(Root);
            Root.style.width = (float)Layout.ViewportWidth;
            Root.style.height = (float)Layout.ViewportHeight;
            Root.style.backgroundColor = Layout.Color("ruleStrong");
            Root.style.overflow = Overflow.Hidden;

            Header = new HeaderBand(fixtures, Layout, Palette);
            Root.Add(Header.Root);

            Map = new MapTab(this);
            Progress = new ProgressTab(this);
            Abilities = new AbilitiesTab(this);
            Settings = new SettingsTab(this);

            Tabs = BuildTabs();
            Root.Add(Tabs);

            Footer = new FooterBand(fixtures, Layout, Palette);
            Root.Add(Footer.Root);

            Overlay = Ui.MakeBox("parity-overlay");
            Ui.At(Overlay, new LayoutRect(0, 0, Layout.ViewportWidth, Layout.ViewportHeight));
            Overlay.pickingMode = PickingMode.Ignore;
            Root.Add(Overlay);
            Overlay.Add(Map.PopoverHost);
            Overlay.Add(Abilities.HoverPopoverHost);
            Overlay.Add(Settings.RemapModal);

            Root.RegisterCallback<KeyDownEvent>(OnKeyDown, TrickleDown.TrickleDown);
            AttachLaneSheet(Root, laneSheet);
            ApplyTabStyles();
        }

        public TabsTab TabButton(string tabId) => tabButtons[tabId];

        /// <summary>Typography parity: project generated-component text onto Inter.</summary>
        public void ApplyParityTypography() => Ui.ApplyParityFonts(Root);
        public TabsPanel TabPanel(string tabId) => tabPanels[tabId];

        public void SelectTab(string tabId)
        {
            if (!tabButtons.ContainsKey(tabId)) throw new ArgumentException("Unknown tab id '" + tabId + "'.");
            Tabs.Value = tabId;
            State.ActiveTab = tabId;
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
            Map.ClosePopovers();
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
                    Abilities.SetStatus("SELECT AN ABILITY, THEN A COMPATIBLE SLOT");
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
                Abilities.SetStatus("INSTALLED " + ability.Name + " IN " + slot.Label);
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
            if (FindRemap(actionId) == null) throw new ArgumentException("Unknown remap action id '" + actionId + "'.");
            State.RemapActionId = actionId;
            Settings.ShowRemapModal(actionId);
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

        /// <summary>Closes every overlay and clears pending interaction selection (capture states).</summary>
        public void CloseAllOverlays()
        {
            Map.ClosePopovers();
            Abilities.CloseHoverPopovers();
            CloseDrawer();
            if (State.RemapModalOpen) CancelRemap();
            State.PendingAbilityId = null;
            State.RejectedSlotId = null;
            Abilities.ClearStatus();
        }

        private RemapActionData FindRemap(string id)
        {
            foreach (var action in State.Fixtures.Settings.Remap) if (action.Id == id) return action;
            return null;
        }

        private Tabs BuildTabs()
        {
            var tabs = new Tabs { name = "parity-tabs" };
            tabs.AddToClassList("parity-tabs");
            Ui.At(tabs, new LayoutRect(0, 0, Layout.ViewportWidth, Layout.ViewportHeight));
            Ui.StripBox(tabs);
            tabs.style.flexDirection = FlexDirection.Column;
            tabs.style.backgroundColor = Color.clear;
            tabs.style.overflow = Overflow.Visible;

            var list = new TabsList { name = "tabs-list" };
            Ui.At(list, Layout.TabBar.Rect);
            Ui.StripBox(list);
            list.style.backgroundColor = Layout.Color(Layout.TabBar.Background);
            list.style.flexDirection = FlexDirection.Row;
            list.style.borderBottomWidth = (float)Layout.PanelBorder;
            list.style.borderBottomColor = Layout.Color(Layout.TabBar.RuleBottom);
            list.contentContainer.style.width = (float)Layout.ViewportWidth;
            list.contentContainer.style.height = (float)Layout.TabBar.Rect.H;
            list.contentContainer.style.flexDirection = FlexDirection.Row;
            tabs.Add(list);

            var content = Layout.Panels.Content;
            for (var i = 0; i < Layout.TabBar.Tabs.Count; i++)
            {
                var definition = Layout.TabBar.Tabs[i];
                var tab = new TabsTab { Value = definition.Id, text = definition.Label };
                tab.name = "tab-" + definition.Id;
                Ui.At(tab, new LayoutRect(definition.X, 0, definition.W, Layout.TabBar.Rect.H));
                Ui.StripBox(tab);
                tab.style.paddingLeft = 0;
                tab.style.paddingRight = 0;
                tab.style.paddingTop = 0;
                tab.style.paddingBottom = 0;
                tab.style.borderTopWidth = 0;
                tab.style.borderBottomWidth = 0;
                tab.style.borderRightWidth = 0;
                Ui.Radius(tab, 0);
                tab.style.fontSize = (float)Layout.Size("tab");
                tab.style.unityFontStyleAndWeight = FontStyle.Bold;
                tab.style.letterSpacing = (float)Layout.Size("letterSpacingTab");
                tab.style.unityTextAlign = TabLabelAlign();
                Ui.UseFont(tab, true);
                tab.style.paddingLeft = (float)Layout.TabBar.LabelInset;
                tab.style.whiteSpace = WhiteSpace.NoWrap;
                if (i > 0)
                {
                    tab.style.borderLeftWidth = (float)Layout.PanelBorder;
                    tab.style.borderLeftColor = Layout.Color(Layout.TabBar.Separator);
                }
                list.Add(tab);
                tabButtons[definition.Id] = tab;

                var panel = new TabsPanel { Value = definition.Id };
                panel.name = "panel-" + definition.Id;
                Ui.At(panel, content);
                Ui.StripBox(panel);
                panel.style.paddingLeft = 0;
                panel.style.paddingRight = 0;
                panel.style.paddingTop = 0;
                panel.style.paddingBottom = 0;
                panel.style.flexDirection = FlexDirection.Column;
                panel.Add(TabContent(definition.Id, content));
                tabs.Add(panel);
                tabPanels[definition.Id] = panel;
            }

            tabs.Value = PauseMenuState.MapTab;
            tabs.ValueChanged += values =>
            {
                if (values.Length > 0) State.ActiveTab = values[0];
                ApplyTabStyles();
            };
            return tabs;
        }

        private VisualElement TabContent(string tabId, LayoutRect content)
        {
            var view = tabId == PauseMenuState.MapTab ? Map.Root
                : tabId == PauseMenuState.ProgressTab ? Progress.Root
                : tabId == PauseMenuState.AbilitiesTab ? Abilities.Root
                : Settings.Root;
            // The tab view is offset by the content origin so its children can use the layout
            // authority's absolute viewport coordinates directly.
            Ui.At(view, new LayoutRect(0, 0, Layout.ViewportWidth, Layout.ViewportHeight),
                content.X, content.Y);
            return view;
        }

        /// <summary>Active-tab fill and text are pinned by the layout authority and applied to the
        /// generated Tabs `is-selected` state class (the package sheet's selected-tab selector is a
        /// documented uss-selector gap, so the lane paints it from the state class).</summary>
        private TextAnchor TabLabelAlign() => Layout.TabBar.LabelAlign switch
        {
            "center" => TextAnchor.MiddleCenter,
            "right" => TextAnchor.MiddleRight,
            _ => TextAnchor.MiddleLeft,
        };

        private void ApplyTabStyles()
        {
            foreach (var pair in tabButtons)
            {
                var active = pair.Value.ClassListContains("is-selected");
                pair.Value.style.backgroundColor = Layout.Color(active
                    ? Layout.TabBar.ActiveBackground : Layout.TabBar.Background);
                pair.Value.style.color = Layout.Color(active
                    ? Layout.TabBar.ActiveText : Layout.TabBar.InactiveText);
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
            if (evt.keyCode != KeyCode.Escape) return;
            if (Progress.DrawerOpen)
            {
                CloseDrawer();
                evt.StopPropagation();
                return;
            }
            if (Map.HasOpenPopover)
            {
                Map.ClosePopovers();
                evt.StopPropagation();
                return;
            }
            if (Abilities.HasOpenHover)
            {
                Abilities.CloseHoverPopovers();
                evt.StopPropagation();
            }
        }

        /// <summary>The generated controls attach the package stylesheet to their own root, so a
        /// consumer sheet attached only to the app root loses same-specificity ties. Attach the lane
        /// sheet to every element, once, after the tree is built (documented in the lane README).</summary>
        private static void AttachLaneSheet(VisualElement element, StyleSheet sheet)
        {
            if (!element.styleSheets.Contains(sheet)) element.styleSheets.Add(sheet);
            for (var i = 0; i < element.hierarchy.childCount; i++)
                AttachLaneSheet(element.hierarchy[i], sheet);
        }
    }
}
