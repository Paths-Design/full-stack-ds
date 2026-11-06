using System.Linq;
using FullStackDS;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UIElements;
using UButton = UnityEngine.UIElements.Button;

namespace GamePauseMenu.Tests
{
    /// <summary>Interaction contract coverage I1..I15 against the parity-layout UI. Every test
    /// drives the mounted app through UI Toolkit events and asserts observable state (values, state
    /// classes, text, resolved styles), never just that an element was constructed.</summary>
    public sealed class PauseMenuInteractionTests
    {
        private static bool HasText(VisualElement root, string fragment) =>
            root.Query<Text>().ToList().Any(text => text.text != null && text.text.Contains(fragment))
            || root.Query<UButton>().ToList().Any(button => !string.IsNullOrEmpty(button.text) && button.text.Contains(fragment));

        [Test]
        public void AppMountsWithFourGeneratedTabsAndOrionThemeScope()
        {
            using var host = new TestHost();
            Assert.That(host.App.Tabs.Group.Triggers.Count, Is.EqualTo(4));
            Assert.That(host.App.Tabs.Value, Is.EqualTo(PauseMenuState.MapTab));
            Assert.That(host.App.Root.ClassListContains(Theme.ScopeClass), Is.True);
            Assert.That(host.App.Root.ClassListContains(Theme.DarkClass), Is.True);
            Assert.That(host.App.Root.ClassListContains(Theme.BrandClassPrefix + "orion"), Is.True);
            Assert.That(host.App.Layout.ViewportWidth, Is.EqualTo(1280));
            Assert.That(host.App.Layout.ViewportHeight, Is.EqualTo(800));
        }

        [Test]
        public void I1_TabSelectionSwapsContentAndStylesExactlyOneActiveTab()
        {
            using var host = new TestHost();
            Assert.That(host.App.TabPanel(PauseMenuState.MapTab).style.display.value, Is.EqualTo(DisplayStyle.Flex));

            host.Submit(host.App.TabButton(PauseMenuState.ProgressTab));

            Assert.That(host.App.Tabs.Value, Is.EqualTo(PauseMenuState.ProgressTab));
            Assert.That(host.App.State.ActiveTab, Is.EqualTo(PauseMenuState.ProgressTab));
            Assert.That(host.App.TabPanel(PauseMenuState.ProgressTab).style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(host.App.TabPanel(PauseMenuState.MapTab).style.display.value, Is.EqualTo(DisplayStyle.None));
            Assert.That(host.App.TabButton(PauseMenuState.ProgressTab).ClassListContains("is-selected"), Is.True);
            Assert.That(host.App.TabButton(PauseMenuState.MapTab).ClassListContains("is-selected"), Is.False);
            Assert.That(host.App.TabButton(PauseMenuState.ProgressTab).style.color.value,
                Is.EqualTo(host.App.Layout.Color(host.App.Layout.TabBar.ActiveText)));
            Assert.That(host.App.Tabs.Group.Triggers.Count(trigger => trigger.ClassListContains("is-selected")), Is.EqualTo(1));

            host.Submit(host.App.TabButton(PauseMenuState.SettingsTab));
            Assert.That(host.App.TabPanel(PauseMenuState.SettingsTab).style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(host.App.TabPanel(PauseMenuState.ProgressTab).style.display.value, Is.EqualTo(DisplayStyle.None));
        }

        [Test]
        public void I2_VisibilitySwitchHidesAndRestoresOnlyItsMarker()
        {
            using var host = new TestHost();
            var control = host.App.Map.VisibilitySwitch("relay-01");
            Assert.That(host.App.Map.IsMarkerPlotted("relay-01"), Is.True);
            Assert.That(host.App.Map.IsMarkerPlotted("cache-02"), Is.True);

            host.Submit(control.Trigger);

            Assert.That(host.App.State.IsIconVisible("relay-01"), Is.False);
            Assert.That(control.Checked, Is.False);
            Assert.That(host.App.Map.IsMarkerPlotted("relay-01"), Is.False);
            Assert.That(host.App.Map.IsMarkerPlotted("cache-02"), Is.True);

            host.Submit(control.Trigger);

            Assert.That(host.App.State.IsIconVisible("relay-01"), Is.True);
            Assert.That(control.Checked, Is.True);
            Assert.That(host.App.Map.IsMarkerPlotted("relay-01"), Is.True);
            Assert.That(host.App.Map.IsMarkerPlotted("cache-02"), Is.True);
        }

        [Test]
        public void InitiallyHiddenMapMarkerMatchesItsSwitchBeforeAnyInteraction()
        {
            using var host = new TestHost();
            var rover = host.App.Map.VisibilitySwitch("rover-07");
            Assert.That(host.App.State.IsIconVisible("rover-07"), Is.False);
            Assert.That(rover.Checked, Is.False);
            Assert.That(host.App.Map.IsMarkerPlotted("rover-07"), Is.False);

            host.Submit(rover.Trigger);
            Assert.That(host.App.State.IsIconVisible("rover-07"), Is.True);
            Assert.That(host.App.Map.IsMarkerPlotted("rover-07"), Is.True);
        }

        [Test]
        public void I3_MarkerActivationOpensAnchoredPopoverWithDetail()
        {
            using var host = new TestHost();
            host.Submit(host.App.Map.MarkerAnchor("relay-01"));
            var popover = host.App.Map.MarkerPopover;

            Assert.That(popover.Open, Is.True);
            Assert.That(popover.Content, Is.Not.Null);
            Assert.That(popover.Content.parent, Is.EqualTo(host.Mount.panel.visualTree));
            var detail = popover.Content;
            Assert.That(HasText(detail, "RELAY TOWER 01"), Is.True);
            Assert.That(HasText(detail, "ARES BASIN"), Is.True);
            Assert.That(HasText(detail, "4.8 KM"), Is.True);
            Assert.That(HasText(detail, "ONLINE"), Is.True);
            Assert.That(HasText(detail, "+120 CR / CYCLE"), Is.True);
            Assert.That(HasText(detail, "Uplink relay carrying colony traffic"), Is.True);
            Assert.That(HasText(detail, "SET AS NAV TARGET"), Is.True);
            Assert.That(HasText(detail, "CLOSE"), Is.True);
        }

        [Test]
        public void I4_SetAsNavTargetUpdatesFooterHighlightAndClosesPopover()
        {
            using var host = new TestHost();
            Assert.That(host.App.Footer.NavTargetValue.text, Is.EqualTo("—"));
            Assert.That(host.App.State.NavTargetId, Is.Null);

            host.Submit(host.App.Map.MarkerAnchor("relay-01"));
            host.Submit(host.App.Map.SetNavTargetButton("relay-01"));

            Assert.That(host.App.State.NavTargetId, Is.EqualTo("relay-01"));
            Assert.That(host.App.Footer.NavTargetValue.text, Is.EqualTo("RELAY TOWER 01"));
            Assert.That(host.App.Map.MarkerAnchor("relay-01").ClassListContains("is-nav-target"), Is.True);
            Assert.That(host.App.Map.MarkerPopover.Open, Is.False);
            Assert.That(host.App.Map.MarkerPopover.Content.parent, Is.Null);

            host.Submit(host.App.Map.MarkerAnchor("cache-02"));
            host.Submit(host.App.Map.SetNavTargetButton("cache-02"));

            Assert.That(host.App.State.NavTargetId, Is.EqualTo("cache-02"));
            Assert.That(host.App.Footer.NavTargetValue.text, Is.EqualTo("SUPPLY CACHE 02"));
            Assert.That(host.App.Map.MarkerAnchor("relay-01").ClassListContains("is-nav-target"), Is.False);
            Assert.That(host.App.Map.MarkerAnchor("cache-02").ClassListContains("is-nav-target"), Is.True);
        }

        [Test]
        public void I5_UnlockedFactionOpensDrawerWithDetailsAndEnabledShop()
        {
            using var host = new TestHost();
            host.Submit(host.App.Progress.Row("ares-logistics"));

            Assert.That(host.App.Progress.DrawerOpen, Is.True);
            Assert.That(host.App.Progress.Drawer.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(host.App.Progress.DrawerName.text, Is.EqualTo("ARES LOGISTICS GUILD"));
            Assert.That(host.App.Progress.DrawerDescription.text, Does.Contain("freight lane"));
            Assert.That(host.App.Progress.DrawerHistory.text, Does.Contain("colony council"));
            Assert.That(host.App.Progress.DrawerStatus.ClassListContains("is-locked"), Is.False);
            Assert.That(host.App.Progress.DrawerStatusText, Does.Contain("ACCESS"));
            Assert.That(host.App.Progress.PerksList.childCount, Is.EqualTo(3));
            Assert.That(HasText(host.App.Progress.PartsTable, "Cargo Clamp Mk III"), Is.True);
            Assert.That(HasText(host.App.Progress.PartsTable, "6,400 CR"), Is.True);
            Assert.That(host.App.Progress.PartsTable.childCount, Is.EqualTo(4)); // head + three parts
            Assert.That(host.App.Progress.ShopButton.enabledSelf, Is.True);
            Assert.That(host.App.Progress.ShopButton.text, Is.EqualTo("SHOP PARTS"));
            Assert.That(host.App.Progress.RowRoot("hellforge").parent, Is.Not.Null,
                "the roster stays visible beside the drawer");
        }

        [Test]
        public void I6_LockedFactionDrawerStatesRequirementAndDisablesShop()
        {
            using var host = new TestHost();
            host.Submit(host.App.Progress.Row("solaris-cartel"));

            Assert.That(host.App.Progress.DrawerOpen, Is.True);
            Assert.That(host.App.Progress.DrawerName.text, Is.EqualTo("SOLARIS CARTEL"));
            Assert.That(host.App.Progress.DrawerRequirement.text, Does.Contain("REACH PATHFINDER IV"));
            Assert.That(host.App.Progress.DrawerStatus.ClassListContains("is-locked"), Is.True);
            Assert.That(host.App.Progress.DrawerStatusText, Does.Contain("LOCKED"));
            Assert.That(host.App.Progress.ShopButton.enabledSelf, Is.False);
            Assert.That(host.App.Progress.ShopButton.text, Is.EqualTo("SHOP PARTS"));
        }

        [Test]
        public void I7_SelectingAbilityMarksItAndHighlightsCompatibleSlots()
        {
            using var host = new TestHost();
            host.Submit(host.App.Abilities.CardAnchor("threading"));
            Assert.That(host.App.Abilities.IsCardSelected("threading"), Is.True);
            Assert.That(host.App.Abilities.AbilityTitle.text, Is.EqualTo("THREADING"));
            Assert.That(host.App.Abilities.LoadoutDetail.text, Does.Contain("decision window"));
            Assert.That(host.App.Abilities.DetailMeta.text, Does.Contain("COMPATIBLE SLOTS"));
            foreach (var slot in host.App.State.Fixtures.Vehicle.Slots)
                Assert.That(host.App.Abilities.IsSlotCompatible(slot.Id), Is.True, "size-1 ability fits " + slot.Id);
            host.App.Abilities.Card("threading").Open = false;

            host.Submit(host.App.Abilities.CardAnchor("overclock"));

            Assert.That(host.App.Abilities.IsCardSelected("overclock"), Is.True);
            Assert.That(host.App.Abilities.IsCardSelected("threading"), Is.False);
            Assert.That(host.App.Abilities.IsSlotCompatible("CORE-A"), Is.True);
            Assert.That(host.App.Abilities.IsSlotCompatible("CORE-B"), Is.True);
            Assert.That(host.App.Abilities.IsSlotCompatible("UTIL-A"), Is.True);
            Assert.That(host.App.Abilities.IsSlotCompatible("AUX-A"), Is.False);
            Assert.That(host.App.Abilities.IsSlotCompatible("AUX-B"), Is.False);
            Assert.That(host.App.Abilities.IsSlotCompatible("UTIL-B"), Is.False);
            Assert.That(host.App.Abilities.AbilityTitle.text, Is.EqualTo("OVERCLOCK"));
        }

        [Test]
        public void I8_CompatibleSlotInstallsAbilityAndReplacingSlotMovesInstallation()
        {
            using var host = new TestHost();
            host.Submit(host.App.Abilities.CardAnchor("threading"));
            host.App.Abilities.Card("threading").Open = false;
            host.Submit(host.App.Abilities.SlotButton("AUX-B"));

            Assert.That(host.App.State.InstalledAbilityId("AUX-B"), Is.EqualTo("threading"));
            Assert.That(host.App.Abilities.SlotLabel("AUX-B").text, Is.EqualTo("THREADING"));
            Assert.That(host.App.Abilities.IsCardInstalled("threading"), Is.True);
            Assert.That(host.App.Abilities.IsSlotInstalled("AUX-B"), Is.True);
            Assert.That(host.App.Abilities.StatusText.text, Does.Contain("INSTALLED"));
            Assert.That(host.App.State.PendingAbilityId, Is.Null);
            Assert.That(host.App.State.InstalledAbilityId("AUX-A"), Is.Null,
                "installing moved the ability out of its old slot");

            host.Submit(host.App.Abilities.CardAnchor("overclock"));
            host.App.Abilities.Card("overclock").Open = false;
            host.Submit(host.App.Abilities.SlotButton("CORE-A"));

            Assert.That(host.App.State.InstalledAbilityId("CORE-A"), Is.EqualTo("overclock"));
            Assert.That(host.App.Abilities.SlotLabel("CORE-A").text, Is.EqualTo("OVERCLOCK"));
            Assert.That(host.App.Abilities.IsCardInstalled("thermal-shield"), Is.False);
            Assert.That(host.App.Abilities.IsCardInstalled("overclock"), Is.True);
            Assert.That(host.App.State.InstalledSlotFor("thermal-shield"), Is.Null);
        }

        [Test]
        public void I9_IncompatibleSlotRejectsWithoutInstalling()
        {
            using var host = new TestHost();
            host.Submit(host.App.Abilities.CardAnchor("overclock"));
            host.App.Abilities.Card("overclock").Open = false;

            host.Submit(host.App.Abilities.SlotButton("AUX-B"));

            Assert.That(host.App.State.InstalledAbilityId("AUX-B"), Is.Null);
            Assert.That(host.App.Abilities.IsSlotRejected("AUX-B"), Is.True);
            Assert.That(host.App.Abilities.StatusText.text, Does.Contain("REJECTED"));
            Assert.That(host.App.Abilities.StatusText.text, Does.Contain("SIZE 2"));
            Assert.That(host.App.State.RejectedSlotId, Is.EqualTo("AUX-B"));
            Assert.That(host.App.Abilities.IsCardInstalled("overclock"), Is.False);
        }

        [Test]
        public void I10_HoveringAbilityCardOpensStatsPopoverAndHoverOutClosesIt()
        {
            using var host = new TestHost();
            host.Hover(host.App.Abilities.CardAnchor("thermal-shield"));
            var popover = host.App.Abilities.HoverPopover;

            Assert.That(popover.Open, Is.True);
            var detail = popover.Content;
            Assert.That(HasText(detail, "THERMAL SHIELD"), Is.True);
            Assert.That(HasText(detail, "heat envelope"), Is.True);
            Assert.That(HasText(detail, "UNCOMMON"), Is.True);
            Assert.That(HasText(detail, "SIZE 2"), Is.True);
            Assert.That(HasText(detail, "COOLDOWN"), Is.True);
            Assert.That(HasText(detail, "DRAW"), Is.True);

            host.Unhover(host.App.Abilities.CardAnchor("thermal-shield"));
            Assert.That(popover.Open, Is.False);
        }

        [Test]
        public void I11_GeneralSwitchFlipsExactlyOnceAndRowReflectsIt()
        {
            using var host = new TestHost();
            var control = host.App.Settings.GeneralSwitch("performanceOverlay");
            Assert.That(control.Checked, Is.False);
            var changes = 0;
            control.RegisterValueChangedCallback(_ => changes++);

            host.Submit(control.Trigger);

            Assert.That(control.Checked, Is.True);
            Assert.That(changes, Is.EqualTo(1));
            Assert.That(host.App.State.GeneralValue("performanceOverlay"), Is.True);
            Assert.That(host.App.Settings.GeneralRow("performanceOverlay").ClassListContains("is-on"), Is.True);

            host.Submit(control.Trigger);

            Assert.That(control.Checked, Is.False);
            Assert.That(changes, Is.EqualTo(2));
            Assert.That(host.App.Settings.GeneralRow("performanceOverlay").ClassListContains("is-on"), Is.False);
        }

        [Test]
        public void I12_ControllerSliderSnapsUpdatesValueAndIsDisplayed()
        {
            using var host = new TestHost();
            var slider = host.App.Settings.ControllerSlider("lookSensitivity");
            Assert.That(host.App.Settings.ControllerValueText("lookSensitivity").text, Is.EqualTo("45%"));

            slider.value = 47f;

            Assert.That(host.App.State.ControllerValue("lookSensitivity"), Is.EqualTo(45), "snapped to the 5-unit step");
            Assert.That(slider.value, Is.EqualTo(45f).Within(0.001f));
            Assert.That(host.App.Settings.ControllerValueText("lookSensitivity").text, Is.EqualTo("45%"));

            slider.value = 80f;

            Assert.That(host.App.State.ControllerValue("lookSensitivity"), Is.EqualTo(80));
            Assert.That(host.App.Settings.ControllerValueText("lookSensitivity").text, Is.EqualTo("80%"));
        }

        [Test]
        public void I13_RemapModalWaitsThenCapturesTheNextKey()
        {
            using var host = new TestHost();
            Assert.That(host.App.Settings.RemapButton("interact").text, Is.EqualTo("E"));

            host.Submit(host.App.Settings.RemapButton("interact"));

            Assert.That(host.App.Settings.RemapModalOpen, Is.True);
            Assert.That(host.App.Settings.RemapModal.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(host.App.Settings.RemapPrompt.text,
                Is.EqualTo(host.App.Layout.Settings.RemapModal.Prompt));

            host.Key(host.App.Root, KeyCode.K);

            Assert.That(host.App.Settings.RemapModalOpen, Is.False);
            Assert.That(host.App.Settings.RemapModal.style.display.value, Is.EqualTo(DisplayStyle.None));
            Assert.That(host.App.State.RemapBinding("interact"), Is.EqualTo("K"));
            Assert.That(host.App.Settings.RemapButton("interact").text, Is.EqualTo("K"));
            Assert.That(host.App.Settings.RemapStatus.text, Does.Contain("INTERACT"));
            Assert.That(host.App.Settings.RemapStatus.text, Does.Contain("K"));

            host.Submit(host.App.Settings.RemapButton("interact"));
            Assert.That(host.App.Settings.RemapActionLabel.text, Does.Contain("CURRENT BINDING K"));
            host.Key(host.App.Root, KeyCode.Escape);
            Assert.That(host.App.State.RemapBinding("interact"), Is.EqualTo("K"));
        }

        [Test]
        public void I14_AudioSliderLanguagesAndSubtitleSwatchUpdateLivePreview()
        {
            using var host = new TestHost();
            Assert.That(host.App.Settings.SubtitlePreviewMeta.text, Is.EqualTo("ENGLISH · CHARCOAL"));
            Assert.That(host.App.Settings.SubtitlePreviewText.text,
                Is.EqualTo(host.App.State.Fixtures.Settings.Audio.PreviewLine));
            var slider = host.App.Settings.AudioSlider("music");
            slider.value = 40f;
            Assert.That(host.App.State.AudioValue("music"), Is.EqualTo(40));
            Assert.That(host.App.Settings.AudioValueText("music").text, Is.EqualTo("40%"));

            host.App.Settings.AudioLanguageDropdown.value = "日本語";
            host.App.Settings.SubtitleLanguageDropdown.value = "Français";

            Assert.That(host.App.State.AudioLanguage, Is.EqualTo("日本語"));
            Assert.That(host.App.State.SubtitleLanguage, Is.EqualTo("Français"));
            Assert.That(host.App.Settings.SubtitlePreviewMeta.text, Is.EqualTo("FRANÇAIS · CHARCOAL"));

            host.Submit(host.App.Settings.Swatch("signal"));

            Assert.That(host.App.State.SubtitleBackgroundId, Is.EqualTo("signal"));
            Assert.That(host.App.Settings.SubtitlePreview.style.backgroundColor.value,
                Is.EqualTo(host.App.Layout.Color("signal")));
            Assert.That(host.App.Settings.SubtitlePreviewMeta.text, Is.EqualTo("FRANÇAIS · SIGNAL"));
            host.App.Settings.SubtitleLanguageDropdown.value = "Español";
            Assert.That(host.App.Settings.SubtitlePreviewMeta.text, Is.EqualTo("ESPAÑOL · SIGNAL"));
            Assert.That(host.App.Settings.SubtitlePreviewText.text,
                Is.EqualTo(host.App.State.Fixtures.Settings.Audio.PreviewLine));
            Assert.That(host.App.Settings.Swatch("signal").ClassListContains("is-selected"), Is.True);
            Assert.That(host.App.Settings.Swatch("charcoal").ClassListContains("is-selected"), Is.False);
        }

        [Test]
        public void I15_CancelPathsReturnToPriorStateWithoutChangingData()
        {
            using var host = new TestHost();

            host.Submit(host.App.Progress.Row("hellforge"));
            Assert.That(host.App.Progress.DrawerOpen, Is.True);
            host.Key(host.App.Root, KeyCode.Escape);
            Assert.That(host.App.Progress.DrawerOpen, Is.False);
            Assert.That(host.App.State.PendingFactionId, Is.Null);
            Assert.That(host.App.State.Fixtures.Factions.Factions.Count(faction => faction.Unlocked), Is.EqualTo(3));
            host.Submit(host.App.Progress.Row("hellforge"));
            host.Submit(host.App.Progress.CloseButton);
            Assert.That(host.App.Progress.DrawerOpen, Is.False);

            host.Submit(host.App.Map.MarkerAnchor("pad-03"));
            Assert.That(host.App.Map.MarkerPopover.Open, Is.True);
            host.Key(host.App.Map.MarkerAnchor("pad-03"), KeyCode.Escape);
            Assert.That(host.App.Map.MarkerPopover.Open, Is.False);
            Assert.That(host.App.State.NavTargetId, Is.Null);

            host.Submit(host.App.Settings.RemapButton("vehicleBoost"));
            Assert.That(host.App.Settings.RemapModalOpen, Is.True);
            host.Key(host.App.Root, KeyCode.Escape);
            Assert.That(host.App.Settings.RemapModalOpen, Is.False);
            Assert.That(host.App.State.RemapBinding("vehicleBoost"), Is.EqualTo("SHIFT"));
            Assert.That(host.App.Settings.RemapButton("vehicleBoost").text, Is.EqualTo("SHIFT"));
            Assert.That(host.App.Settings.RemapStatus.text, Does.Contain("CANCELLED"));
        }

        [Test]
        public void InstalledAbilityCanBeRemovedFromItsSlot()
        {
            using var host = new TestHost();
            Assert.That(host.App.State.InstalledAbilityId("CORE-A"), Is.EqualTo("thermal-shield"));

            host.Submit(host.App.Abilities.SlotButton("CORE-A"));

            Assert.That(host.App.State.InstalledAbilityId("CORE-A"), Is.Null);
            Assert.That(host.App.Abilities.SlotLabel("CORE-A").text, Is.EqualTo("EMPTY"));
            Assert.That(host.App.Abilities.IsSlotInstalled("CORE-A"), Is.False);
            Assert.That(host.App.Abilities.IsCardInstalled("thermal-shield"), Is.False);
            Assert.That(host.App.Abilities.StatusText.text, Does.Contain("REMOVED"));
        }

        [Test]
        public void ShellChromeRendersPinnedHeaderAndFooterCopy()
        {
            using var host = new TestHost();
            var layout = host.App.Layout;
            Assert.That(host.App.Header.BrandWord.text, Is.EqualTo(layout.Header.TextMain));
            Assert.That(host.App.Header.BrandNumber.text, Is.EqualTo(layout.Header.TextAccent));
            Assert.That(host.App.Header.Mission.text, Is.EqualTo(layout.Header.MissionText));
            Assert.That(host.App.Header.StatusText.text, Is.EqualTo(layout.Header.PausedText));
            Assert.That(host.App.Header.Stats.Count, Is.EqualTo(3));
            Assert.That(host.App.Header.Stats[0].Value.text, Is.EqualTo("PATHFINDER III"));
            Assert.That(host.App.Header.Stats[1].Value.text, Is.EqualTo("34,850 CR"));
            Assert.That(host.App.Header.Stats[2].Value.text, Is.EqualTo("52,400"));
            Assert.That(host.App.Footer.Hints.text, Is.EqualTo(layout.Footer.HintsText));
            Assert.That(host.App.Footer.NavLabel.text, Is.EqualTo("NAV TARGET"));
            Assert.That(host.App.Footer.NavTargetValue.text, Is.EqualTo("—"));
        }
    }
}
