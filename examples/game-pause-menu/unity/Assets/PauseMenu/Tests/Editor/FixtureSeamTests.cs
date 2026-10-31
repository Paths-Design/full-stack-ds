using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;

namespace GamePauseMenu.Tests
{
    /// <summary>Seam tests: the copied fixtures parse into the lane model, and malformed authoring
    /// fails loudly with the file and JSON path instead of rendering a partial menu.</summary>
    public sealed class FixtureSeamTests
    {
        private static Dictionary<string, string> Raw()
        {
            var raw = new Dictionary<string, string>();
            foreach (var name in FixtureRepository.Files)
            {
                var asset = Resources.Load<TextAsset>("Fixtures/" + name);
                Assert.That(asset, Is.Not.Null, "committed fixture copy Resources/Fixtures/" + name + ".json");
                raw[name] = asset.text;
            }
            return raw;
        }

        private static FixtureFormatException ParseError(Dictionary<string, string> raw)
        {
            return Assert.Throws<FixtureFormatException>(() => FixtureRepository.Parse(raw));
        }

        [Test]
        public void CommittedFixtureCopiesParseIntoTheLaneModel()
        {
            var fixtures = FixtureRepository.LoadFromResources();

            Assert.That(fixtures.Commander.Id, Is.EqualTo("cmdr-orion-n5"));
            Assert.That(fixtures.Commander.Callsign, Is.EqualTo("ORION N5"));
            Assert.That(fixtures.Commander.Rank.Label, Is.EqualTo("PATHFINDER III"));
            Assert.That(fixtures.Commander.Rank.Level, Is.EqualTo(12));
            Assert.That(fixtures.Commander.NavTarget, Is.Null);

            Assert.That(fixtures.Map.Icons, Has.Count.EqualTo(8));
            Assert.That(fixtures.Map.Sector, Is.EqualTo("ARES BASIN // SECTOR 07"));
            Assert.That(FixtureRepository.FindIcon(fixtures.Map, "relay-01").Visible, Is.True);
            Assert.That(FixtureRepository.FindIcon(fixtures.Map, "rover-07").Visible, Is.False);

            Assert.That(fixtures.Factions.Factions, Has.Count.EqualTo(5));
            Assert.That(fixtures.Factions.Factions.Count(f => f.Unlocked), Is.EqualTo(3));
            var locked = FixtureRepository.FindFaction(fixtures, "solaris-cartel");
            Assert.That(locked.Unlocked, Is.False);
            Assert.That(locked.Requirement, Is.EqualTo("REACH PATHFINDER IV + 7,500 CR"));
            Assert.That(locked.Detail.Perks, Has.Count.EqualTo(3));
            Assert.That(locked.Detail.Parts, Has.Count.EqualTo(3));

            Assert.That(fixtures.Abilities.Abilities, Has.Count.EqualTo(10));
            var overclock = FixtureRepository.FindAbility(fixtures, "overclock");
            Assert.That(overclock.Size, Is.EqualTo(2));
            Assert.That(overclock.Rarity, Is.EqualTo("epic"));
            Assert.That(overclock.Stats.Select(stat => stat.Label), Is.EqualTo(new[] { "HEAT", "COOLDOWN", "DRAW" }));
            Assert.That(overclock.Stats[0].Value, Is.EqualTo("48"));

            Assert.That(fixtures.Vehicle.Slots, Has.Count.EqualTo(6));
            Assert.That(FixtureRepository.FindSlot(fixtures.Vehicle, "CORE-A").AbilityId, Is.EqualTo("thermal-shield"));
            Assert.That(FixtureRepository.FindSlot(fixtures.Vehicle, "AUX-B").AbilityId, Is.Null);

            Assert.That(fixtures.Settings.General, Has.Count.EqualTo(5));
            Assert.That(fixtures.Settings.Controller, Has.Count.EqualTo(5));
            Assert.That(fixtures.Settings.Remap, Has.Count.EqualTo(6));
            Assert.That(fixtures.Settings.Audio.Sliders, Has.Count.EqualTo(4));
            Assert.That(fixtures.Settings.Audio.SubtitleBackground.Options, Has.Count.EqualTo(6));
            Assert.That(fixtures.Settings.Audio.PreviewLine, Does.Contain("DUST FRONT"));

            Assert.That(fixtures.Appearance.Watermark, Is.EqualTo("N5"));
            Assert.That(fixtures.Appearance.Radius, Is.EqualTo(0));
            Assert.That(fixtures.Appearance.Palette, Has.Count.EqualTo(13));
            Assert.That(fixtures.Appearance.Palette["signal"], Is.EqualTo("#EF6A3C"));
            var palette = OrionPalette.From(fixtures.Appearance);
            Assert.That(palette.Signal, Is.EqualTo(OrionPalette.FromHex("#EF6A3C")));
            Assert.That(palette.MicroLabelLetterSpacing, Is.EqualTo(1.4f).Within(0.001f));
        }

        [Test]
        public void EveryFixtureIconNameMapsToTheGlyphCatalogKeyForm()
        {
            var fixtures = FixtureRepository.LoadFromResources();
            var expected = new Dictionary<string, string>
            {
                { "Info", "info" },
                { "Placeholder", "placeholder" },
                { "Home", "home" },
                { "Baseline", "baseline" },
                { "Alarm", "alarm" },
                { "CircleDot", "circle-dot" },
                { "ChevronRight", "chevron-right" },
                { "User", "user" },
                { "Maximize", "maximize" },
                { "Calculator", "calculator" },
                { "Search", "search" },
                { "TriangleAlert", "triangle-alert" },
                { "Circle", "circle" },
                { "ArrowUpDown", "arrow-up-down" },
                { "PanelLeft", "panel-left" },
            };
            var consumed = fixtures.Map.Icons.Select(icon => icon.Icon)
                .Concat(fixtures.Abilities.Abilities.Select(ability => ability.Icon))
                .Distinct();
            foreach (var name in consumed)
            {
                Assert.That(expected.ContainsKey(name), Is.True, "unexpected fixture icon name " + name);
                Assert.That(PauseMenuState.IconKey(name), Is.EqualTo(expected[name]));
                // The generated icon catalog keys are kebab-case; an empty key would clear the glyph.
                Assert.That(PauseMenuState.IconKey(name), Does.Not.Contain("_"));
                Assert.That(PauseMenuState.IconKey(name), Is.EqualTo(PauseMenuState.IconKey(name).ToLowerInvariant()));
            }
            Assert.Throws<FixtureFormatException>(() => PauseMenuState.IconKey(string.Empty));
        }

        [Test]
        public void MalformedJsonReportsTheFileAndOffset()
        {
            var raw = Raw();
            raw[FixtureRepository.MapIconsFile] = "{ \"sector\": \"X\", \"icons\": [ }";
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("map-icons.json"));
            Assert.That(error.Message, Does.Contain("offset"));
        }

        [Test]
        public void MissingRequiredMemberReportsTheJsonPath()
        {
            var raw = Raw();
            raw[FixtureRepository.CommanderFile] = raw[FixtureRepository.CommanderFile].Replace("\"level\": 12,", string.Empty);
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("commander.json"));
            Assert.That(error.Message, Does.Contain("rank.level is required"));
        }

        [Test]
        public void WrongTypeReportsTheJsonPathAndType()
        {
            var raw = Raw();
            var broken = raw[FixtureRepository.MapIconsFile].Replace("\"x\": 0.22", "\"x\": \"left\"");
            Assert.That(broken, Is.Not.EqualTo(raw[FixtureRepository.MapIconsFile]), "fixture shape changed");
            raw[FixtureRepository.MapIconsFile] = broken;
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("map-icons.json"));
            Assert.That(error.Message, Does.Contain("icons[0].x must be a number (found string)"));
        }

        [Test]
        public void OutOfRangeCoordinateReportsTheRange()
        {
            var raw = Raw();
            var broken = raw[FixtureRepository.MapIconsFile].Replace("\"x\": 0.22", "\"x\": 1.4");
            Assert.That(broken, Is.Not.EqualTo(raw[FixtureRepository.MapIconsFile]), "fixture shape changed");
            raw[FixtureRepository.MapIconsFile] = broken;
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("icons[0].x must be within [0, 1]"));
        }

        [Test]
        public void DuplicateIdsAreRejected()
        {
            var raw = Raw();
            raw[FixtureRepository.AbilitiesFile] = raw[FixtureRepository.AbilitiesFile]
                .Replace("\"id\": \"overclock\"", "\"id\": \"threading\"");
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("abilities.json"));
            Assert.That(error.Message, Does.Contain("'threading' is a duplicate id"));
        }

        [Test]
        public void UnknownVehicleAbilityReferenceIsRejected()
        {
            var raw = Raw();
            raw[FixtureRepository.VehicleFile] = raw[FixtureRepository.VehicleFile]
                .Replace("\"abilityId\": \"thermal-shield\"", "\"abilityId\": \"ghost-module\"");
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("vehicle.json"));
            Assert.That(error.Message, Does.Contain("ghost-module"));
        }

        [Test]
        public void LockedFactionWithoutRequirementIsRejected()
        {
            var raw = Raw();
            raw[FixtureRepository.FactionsFile] = raw[FixtureRepository.FactionsFile]
                .Replace("\"requirement\": \"REACH PATHFINDER IV + 7,500 CR\"", "\"requirement\": \"\"");
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("factions.json"));
            Assert.That(error.Message, Does.Contain("unlock requirement"));
        }

        [Test]
        public void UnknownSubtitleBackgroundSelectionIsRejected()
        {
            var raw = Raw();
            raw[FixtureRepository.SettingsFile] = raw[FixtureRepository.SettingsFile]
                .Replace("\"value\": \"charcoal\"", "\"value\": \"vapor\"");
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("settings.json"));
            Assert.That(error.Message, Does.Contain("'vapor' is not one of the declared option ids"));
        }

        [Test]
        public void NonHexAppearanceColourIsRejected()
        {
            var raw = Raw();
            raw[FixtureRepository.AppearanceFile] = raw[FixtureRepository.AppearanceFile]
                .Replace("\"signal\": \"#EF6A3C\"", "\"signal\": \"orange\"");
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("orion-appearance.json"));
            Assert.That(error.Message, Does.Contain("palette.signal"));
            Assert.That(error.Message, Does.Contain("not a #RRGGBB colour"));
        }

        [Test]
        public void NavTargetMustNameAFixtureIcon()
        {
            var raw = Raw();
            raw[FixtureRepository.CommanderFile] = raw[FixtureRepository.CommanderFile]
                .Replace("\"navTarget\": null", "\"navTarget\": \"not-a-marker\"");
            var error = ParseError(raw);
            Assert.That(error.Message, Does.Contain("commander.json"));
            Assert.That(error.Message, Does.Contain("not-a-marker"));
        }

        [Test]
        public void JsonReaderRejectsDuplicateKeysAndTrailingContent()
        {
            var duplicate = Assert.Throws<JsonParseException>(() => Json.Parse("{\"a\": 1, \"a\": 2}"));
            Assert.That(duplicate.Message, Does.Contain("duplicate object key 'a'"));
            var trailing = Assert.Throws<JsonParseException>(() => Json.Parse("{} {}"));
            Assert.That(trailing.Message, Does.Contain("trailing content"));
            var unterminated = Assert.Throws<JsonParseException>(() => Json.Parse("{\"a\": \"x}"));
            Assert.That(unterminated.Message, Does.Contain("unterminated string"));
        }
    }
}
