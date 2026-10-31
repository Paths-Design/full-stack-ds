using System;
using System.Collections.Generic;

namespace GamePauseMenu
{
    /// <summary>A fixture copy violates the lane data contract. The message carries the file
    /// and the JSON path of the offending value so authoring errors are actionable.</summary>
    public sealed class FixtureFormatException : Exception
    {
        public FixtureFormatException(string message) : base(message) { }
    }

    public sealed class RankData
    {
        public string Label;
        public int Level;
        public int GlobalPosition;
        public string Percentile;
        public int Points;
        public int NextLevelAt;
    }

    public sealed class EarningsData
    {
        public int Credits;
        public int Pending;
        public string Currency;
    }

    public sealed class FollowersData
    {
        public int Total;
        public string Trend;
        public string Period;
    }

    public sealed class CommanderData
    {
        public string Id;
        public string Callsign;
        public string CallsignPlate;
        public string Mission;
        public string Status;
        public RankData Rank;
        public EarningsData Earnings;
        public FollowersData Followers;
        public string NavTarget;
    }

    public sealed class MapIconData
    {
        public string Id;
        public string Kind;
        public string Label;
        public string Icon;
        public double X;
        public double Y;
        public bool Visible;
        public string Status;
        public string Sector;
        public double DistanceKm;
        public string Detail;
        public string Reward;
    }

    public sealed class MapData
    {
        public string Sector;
        public string Scale;
        public readonly List<MapIconData> Icons = new List<MapIconData>();
    }

    public sealed class FactionPartData
    {
        public string Name;
        public int Cost;
        public string Rarity;
        public int Size;
    }

    public sealed class FactionDetailData
    {
        public string Description;
        public string History;
        public readonly List<string> Perks = new List<string>();
        public readonly List<FactionPartData> Parts = new List<FactionPartData>();
    }

    public sealed class FactionData
    {
        public string Id;
        public string Name;
        public string Tagline;
        public bool Unlocked;
        public int Tier;
        public int Reputation;
        public int ReputationMax;
        public string Requirement;
        public FactionDetailData Detail;
    }

    public sealed class FactionsData
    {
        public readonly List<FactionData> Factions = new List<FactionData>();
    }

    public sealed class AbilityStat
    {
        public string Label;
        public string Value;
    }

    public sealed class AbilityData
    {
        public string Id;
        public string Name;
        public string Description;
        public string Rarity;
        public int Size;
        public string Icon;
        public string Detail;
        public readonly List<AbilityStat> Stats = new List<AbilityStat>();
    }

    public sealed class AbilitiesData
    {
        public readonly List<AbilityData> Abilities = new List<AbilityData>();
    }

    public sealed class VehicleSlotData
    {
        public string Id;
        public string Label;
        public int Size;
        public string AbilityId;
    }

    public sealed class VehicleData
    {
        public string Name;
        public string Chassis;
        public readonly List<VehicleSlotData> Slots = new List<VehicleSlotData>();
    }

    public sealed class GeneralToggleData
    {
        public string Id;
        public string Label;
        public string Description;
        public bool Value;
    }

    public sealed class ControllerSettingData
    {
        public string Id;
        public string Label;
        public string Description;
        public int Min;
        public int Max;
        public int Step;
        public int Value;
        public string Unit;
    }

    public sealed class RemapActionData
    {
        public string Id;
        public string Label;
        public string Binding;
    }

    public sealed class AudioSliderData
    {
        public string Id;
        public string Label;
        public int Value;
        public string Unit;
    }

    public sealed class LanguageSettingData
    {
        public string Label;
        public string Value;
        public readonly List<string> Options = new List<string>();
    }

    public sealed class SubtitleBackgroundOptionData
    {
        public string Id;
        public string Label;
        public string Value;
    }

    public sealed class SubtitleBackgroundData
    {
        public string Label;
        public string Value;
        public readonly List<SubtitleBackgroundOptionData> Options = new List<SubtitleBackgroundOptionData>();
    }

    public sealed class AudioSettingsData
    {
        public readonly List<AudioSliderData> Sliders = new List<AudioSliderData>();
        public LanguageSettingData AudioLanguage;
        public LanguageSettingData SubtitleLanguage;
        public SubtitleBackgroundData SubtitleBackground;
        public string PreviewLine;
    }

    public sealed class SettingsData
    {
        public readonly List<GeneralToggleData> General = new List<GeneralToggleData>();
        public readonly List<ControllerSettingData> Controller = new List<ControllerSettingData>();
        public readonly List<RemapActionData> Remap = new List<RemapActionData>();
        public AudioSettingsData Audio;
    }

    /// <summary>The lane-consumption copy of the Orion N5 appearance fixture. Its palette is
    /// app-decoration authority only (map ground, signal strips, rarity and locked states);
    /// component theming comes from the generated <c>.fsds-brand-orion</c> scope.</summary>
    public sealed class OrionAppearanceData
    {
        public readonly Dictionary<string, string> Palette = new Dictionary<string, string>();
        public readonly Dictionary<string, string> Surface = new Dictionary<string, string>();
        public int Radius;
        public int BorderWidth;
        public string Watermark;
        public bool UppercaseLabels;
        public double MicroLabelLetterSpacing;
        public string FontNote;
    }

    public sealed class FixtureSet
    {
        public CommanderData Commander;
        public MapData Map;
        public FactionsData Factions;
        public AbilitiesData Abilities;
        public VehicleData Vehicle;
        public SettingsData Settings;
        public OrionAppearanceData Appearance;
        public ParityLayoutData Parity;
    }
}
