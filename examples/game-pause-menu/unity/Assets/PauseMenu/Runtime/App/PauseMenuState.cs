using System;
using System.Collections.Generic;

namespace GamePauseMenu
{
    /// <summary>Lane app state: one authoritative store that every view renders. Fixture data is
    /// the seed; interaction only mutates this state, never the fixture objects.</summary>
    public sealed class PauseMenuState
    {
        public const string MapTab = "map";
        public const string ProgressTab = "progress";
        public const string AbilitiesTab = "abilities";
        public const string SettingsTab = "settings";

        public readonly FixtureSet Fixtures;
        private readonly Dictionary<string, bool> iconVisible = new Dictionary<string, bool>();
        private readonly Dictionary<string, bool> general = new Dictionary<string, bool>();
        private readonly Dictionary<string, int> controller = new Dictionary<string, int>();
        private readonly Dictionary<string, string> remap = new Dictionary<string, string>();
        private readonly Dictionary<string, int> audio = new Dictionary<string, int>();
        private readonly Dictionary<string, string> installedBySlot = new Dictionary<string, string>();
        private readonly Dictionary<string, string> slotByAbility = new Dictionary<string, string>();

        public PauseMenuState(FixtureSet fixtures)
        {
            Fixtures = fixtures ?? throw new ArgumentNullException(nameof(fixtures));
            foreach (var icon in fixtures.Map.Icons) iconVisible[icon.Id] = icon.Visible;
            foreach (var toggle in fixtures.Settings.General) general[toggle.Id] = toggle.Value;
            foreach (var setting in fixtures.Settings.Controller) controller[setting.Id] = setting.Value;
            foreach (var action in fixtures.Settings.Remap) remap[action.Id] = action.Binding;
            foreach (var slider in fixtures.Settings.Audio.Sliders) audio[slider.Id] = slider.Value;
            NavTargetId = fixtures.Commander.NavTarget;
            AudioLanguage = fixtures.Settings.Audio.AudioLanguage.Value;
            SubtitleLanguage = fixtures.Settings.Audio.SubtitleLanguage.Value;
            SubtitleBackgroundId = fixtures.Settings.Audio.SubtitleBackground.Value;
            foreach (var slot in fixtures.Vehicle.Slots)
                if (!string.IsNullOrEmpty(slot.AbilityId)) Install(slot.Id, slot.AbilityId);
        }

        public string ActiveTab { get; set; } = MapTab;
        public string NavTargetId { get; set; }
        public string PendingFactionId { get; set; }
        public string PendingAbilityId { get; set; }
        public string RejectedSlotId { get; set; }
        public bool RemapModalOpen { get; set; }
        public string RemapActionId { get; set; }
        public string AudioLanguage { get; set; }
        public string SubtitleLanguage { get; set; }
        public string SubtitleBackgroundId { get; set; }

        public bool IsIconVisible(string iconId) => iconVisible.TryGetValue(iconId, out var visible) && visible;

        public void SetIconVisible(string iconId, bool visible)
        {
            Require(iconVisible, iconId, "map icon");
            iconVisible[iconId] = visible;
        }

        public bool GeneralValue(string id)
        {
            Require(general, id, "general toggle");
            return general[id];
        }

        public void SetGeneralValue(string id, bool value)
        {
            Require(general, id, "general toggle");
            general[id] = value;
        }

        public int ControllerValue(string id)
        {
            Require(controller, id, "controller setting");
            return controller[id];
        }

        public void SetControllerValue(string id, int value)
        {
            Require(controller, id, "controller setting");
            controller[id] = value;
        }

        public string RemapBinding(string id)
        {
            Require(remap, id, "remap action");
            return remap[id];
        }

        public void SetRemapBinding(string id, string binding)
        {
            Require(remap, id, "remap action");
            remap[id] = binding;
        }

        public int AudioValue(string id)
        {
            Require(audio, id, "audio slider");
            return audio[id];
        }

        public void SetAudioValue(string id, int value)
        {
            Require(audio, id, "audio slider");
            audio[id] = value;
        }

        /// <summary>The vehicle owns installation; the <c>installed</c> fixture flag is not
        /// authoritative. Installing into an occupied slot replaces the occupant.</summary>
        public void Install(string slotId, string abilityId)
        {
            if (installedBySlot.TryGetValue(slotId, out var previous) && previous != null)
                slotByAbility.Remove(previous);
            if (slotByAbility.TryGetValue(abilityId, out var otherSlot) && otherSlot != null)
                installedBySlot.Remove(otherSlot);
            installedBySlot[slotId] = abilityId;
            slotByAbility[abilityId] = slotId;
        }

        public bool RemoveInstalled(string slotId)
        {
            if (!installedBySlot.TryGetValue(slotId, out var ability)) return false;
            installedBySlot.Remove(slotId);
            slotByAbility.Remove(ability);
            return true;
        }

        public string InstalledAbilityId(string slotId) =>
            installedBySlot.TryGetValue(slotId, out var ability) ? ability : null;

        public string InstalledSlotFor(string abilityId) =>
            slotByAbility.TryGetValue(abilityId, out var slot) ? slot : null;

        public bool IsAbilityInstalled(string abilityId) => slotByAbility.ContainsKey(abilityId);

        /// <summary>The fixture carries the iconography catalog's PascalCase authoring name; the
        /// generated Icon component resolves the catalog's kebab-case key.</summary>
        public static string IconKey(string fixtureIconName) => FixtureRepository.IconKey(fixtureIconName);

        private static void Require<T>(Dictionary<string, T> map, string id, string label)
        {
            if (id == null || !map.ContainsKey(id))
                throw new ArgumentException($"Unknown {label} id '{id}'.");
        }
    }
}
