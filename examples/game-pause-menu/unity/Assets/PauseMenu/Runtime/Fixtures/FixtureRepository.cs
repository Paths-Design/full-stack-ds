using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

namespace GamePauseMenu
{
    /// <summary>The only layer that touches raw fixture shape. It converts the copied JSON
    /// fixtures into typed lane models and rejects malformed authoring loudly: every required
    /// member, type, range, uniqueness and cross-reference is checked with the file and JSON
    /// path in the failure message.</summary>
    public static class FixtureRepository
    {
        public const string CommanderFile = "commander";
        public const string MapIconsFile = "map-icons";
        public const string FactionsFile = "factions";
        public const string AbilitiesFile = "abilities";
        public const string VehicleFile = "vehicle";
        public const string SettingsFile = "settings";
        public const string AppearanceFile = "orion-appearance";
        public const string ParityLayoutFile = "parity-layout";

        public static readonly string[] Files =
        {
            CommanderFile, MapIconsFile, FactionsFile, AbilitiesFile, VehicleFile, SettingsFile, AppearanceFile, ParityLayoutFile
        };

        /// <summary>Parses the whole lane fixture corpus. <paramref name="rawFiles"/> is keyed by
        /// file stem (for example <c>map-icons</c>).</summary>
        public static FixtureSet Parse(IReadOnlyDictionary<string, string> rawFiles)
        {
            if (rawFiles == null) throw new ArgumentNullException(nameof(rawFiles));
            var bodies = new Dictionary<string, JsonObject>();
            foreach (var name in Files)
            {
                if (!rawFiles.TryGetValue(name, out var text))
                    throw new FixtureFormatException($"fixtures/{name}.json: fixture copy is missing.");
                bodies[name] = RootOf(name, text);
            }

            var set = new FixtureSet
            {
                Appearance = ParseAppearance(new Reader(AppearanceFile), bodies[AppearanceFile]),
                Commander = ParseCommander(new Reader(CommanderFile), bodies[CommanderFile]),
                Map = ParseMap(new Reader(MapIconsFile), bodies[MapIconsFile]),
                Factions = ParseFactions(new Reader(FactionsFile), bodies[FactionsFile]),
                Abilities = ParseAbilities(new Reader(AbilitiesFile), bodies[AbilitiesFile]),
            };
            set.Vehicle = ParseVehicle(new Reader(VehicleFile), bodies[VehicleFile], set.Abilities);
            set.Settings = ParseSettings(new Reader(SettingsFile), bodies[SettingsFile]);
            set.Parity = ParityLayoutParser.Parse(ParityLayoutFile, bodies[ParityLayoutFile]);

            if (set.Commander.NavTarget != null && FindIcon(set.Map, set.Commander.NavTarget) == null)
                throw new FixtureFormatException(
                    $"fixtures/{CommanderFile}.json: navTarget '{set.Commander.NavTarget}' is not a fixture map icon id.");
            return set;
        }

        /// <summary>Loads the committed fixture copies from the lane's Resources folders.</summary>
        public static FixtureSet LoadFromResources(string resourceFolder = "Fixtures")
        {
            var raw = new Dictionary<string, string>();
            foreach (var name in Files)
            {
                var path = resourceFolder + "/" + name;
                var asset = Resources.Load<TextAsset>(path);
                if (asset == null)
                    throw new FixtureFormatException($"fixtures/{name}.json: no TextAsset at Resources/{path}.");
                raw[name] = asset.text;
            }
            return Parse(raw);
        }

        public static MapIconData FindIcon(MapData map, string id)
        {
            foreach (var icon in map.Icons) if (icon.Id == id) return icon;
            return null;
        }

        public static FactionData FindFaction(FixtureSet set, string id)
        {
            foreach (var faction in set.Factions.Factions) if (faction.Id == id) return faction;
            return null;
        }

        public static AbilityData FindAbility(FixtureSet set, string id)
        {
            foreach (var ability in set.Abilities.Abilities) if (ability.Id == id) return ability;
            return null;
        }

        public static VehicleSlotData FindSlot(VehicleData vehicle, string id)
        {
            foreach (var slot in vehicle.Slots) if (slot.Id == id) return slot;
            return null;
        }

        /// <summary>The fixture carries the iconography catalog's PascalCase authoring name,
        /// for example <c>CircleDot</c>; the generated Icon component resolves the catalog's
        /// kebab-case key <c>circle-dot</c>.</summary>
        public static string IconKey(string fixtureIconName)
        {
            if (string.IsNullOrEmpty(fixtureIconName))
                throw new FixtureFormatException("fixtures: an icon name must be a non-empty string.");
            var builder = new System.Text.StringBuilder();
            for (var i = 0; i < fixtureIconName.Length; i++)
            {
                var c = fixtureIconName[i];
                if (char.IsUpper(c))
                {
                    if (i > 0) builder.Append('-');
                    builder.Append(char.ToLowerInvariant(c));
                }
                else
                {
                    builder.Append(c);
                }
            }
            return builder.ToString();
        }

        private static JsonObject RootOf(string file, string text)
        {
            JsonValue root;
            try
            {
                root = Json.Parse(text);
            }
            catch (JsonParseException error)
            {
                throw new FixtureFormatException($"fixtures/{file}.json: {error.Message}");
            }
            if (!(root is JsonObject obj))
                throw new FixtureFormatException($"fixtures/{file}.json: $ must be an object (found {root.TypeName}).");
            return obj;
        }

        private static OrionAppearanceData ParseAppearance(Reader reader, JsonObject root)
        {
            var data = new OrionAppearanceData();
            var palette = reader.ObjectField(root, "palette", "palette");
            foreach (var key in new[]
                     {
                         "signal", "signalDeep", "signalHot", "onSignal", "ink", "charcoal", "graphite",
                         "boneBright", "bone", "sage", "moss", "alert", "clear"
                     })
            {
                var path = "palette." + key;
                var hex = reader.StringField(palette, key, path);
                reader.RequireHex(hex, path);
                data.Palette[key] = hex;
            }
            var surface = reader.ObjectField(root, "surface", "surface");
            foreach (var key in new[] { "app", "panel", "raised", "rule", "ruleStrong", "muted", "telemetry" })
            {
                var path = "surface." + key;
                var hex = reader.StringField(surface, key, path);
                reader.RequireHex(hex, path);
                data.Surface[key] = hex;
            }
            var style = reader.ObjectField(root, "style", "style");
            data.Radius = reader.IntField(style, "radius", "style.radius", 0, 64);
            data.BorderWidth = reader.IntField(style, "borderWidth", "style.borderWidth", 0, 8);
            data.Watermark = reader.StringField(style, "watermark", "style.watermark");
            data.UppercaseLabels = reader.BoolField(style, "uppercaseLabels", "style.uppercaseLabels");
            data.MicroLabelLetterSpacing = reader.NumberField(style, "microLabelLetterSpacing", "style.microLabelLetterSpacing");
            data.FontNote = reader.OptionalStringField(style, "fontNote", "style.fontNote", string.Empty);
            return data;
        }

        private static CommanderData ParseCommander(Reader reader, JsonObject root)
        {
            var rank = reader.ObjectField(root, "rank", "rank");
            var earnings = reader.ObjectField(root, "earnings", "earnings");
            var followers = reader.ObjectField(root, "followers", "followers");
            var data = new CommanderData
            {
                Id = reader.StringField(root, "id", "id"),
                Callsign = reader.StringField(root, "callsign", "callsign"),
                CallsignPlate = reader.StringField(root, "callsignPlate", "callsignPlate"),
                Mission = reader.StringField(root, "mission", "mission"),
                Status = reader.StringField(root, "status", "status"),
                Rank = new RankData
                {
                    Label = reader.StringField(rank, "label", "rank.label"),
                    Level = reader.IntField(rank, "level", "rank.level", 0, 9999),
                    GlobalPosition = reader.IntField(rank, "globalPosition", "rank.globalPosition", 1, 100000000),
                    Percentile = reader.StringField(rank, "percentile", "rank.percentile"),
                    Points = reader.IntField(rank, "points", "rank.points", 0, 100000000),
                    NextLevelAt = reader.IntField(rank, "nextLevelAt", "rank.nextLevelAt", 1, 100000000),
                },
                Earnings = new EarningsData
                {
                    Credits = reader.IntField(earnings, "credits", "earnings.credits", 0, 1000000000),
                    Pending = reader.IntField(earnings, "pending", "earnings.pending", 0, 1000000000),
                    Currency = reader.StringField(earnings, "currency", "earnings.currency"),
                },
                Followers = new FollowersData
                {
                    Total = reader.IntField(followers, "total", "followers.total", 0, 1000000000),
                    Trend = reader.StringField(followers, "trend", "followers.trend"),
                    Period = reader.StringField(followers, "period", "followers.period"),
                },
            };
            var nav = reader.Member(root, "navTarget", "navTarget");
            if (nav is JsonNull) data.NavTarget = null;
            else if (nav is JsonString text && text.Value.Length > 0) data.NavTarget = text.Value;
            else throw reader.Error("navTarget", $"must be null or a non-empty map-icon id (found {nav.TypeName}).");
            return data;
        }

        private static MapData ParseMap(Reader reader, JsonObject root)
        {
            var data = new MapData
            {
                Sector = reader.StringField(root, "sector", "sector"),
                Scale = reader.StringField(root, "scale", "scale"),
            };
            var icons = reader.ArrayField(root, "icons", "icons");
            var ids = new HashSet<string>();
            for (var i = 0; i < icons.Items.Count; i++)
            {
                var path = "icons[" + i + "]";
                var item = reader.ObjectAt(icons, i, path);
                var icon = new MapIconData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Kind = reader.StringField(item, "kind", path + ".kind"),
                    Label = reader.StringField(item, "label", path + ".label"),
                    Icon = reader.StringField(item, "icon", path + ".icon"),
                    X = reader.NumberField(item, "x", path + ".x", 0, 1),
                    Y = reader.NumberField(item, "y", path + ".y", 0, 1),
                    Visible = reader.BoolField(item, "visible", path + ".visible"),
                    Status = reader.StringField(item, "status", path + ".status"),
                    Sector = reader.StringField(item, "sector", path + ".sector"),
                    DistanceKm = reader.NumberField(item, "distanceKm", path + ".distanceKm", 0, 100000),
                    Detail = reader.StringField(item, "detail", path + ".detail"),
                    Reward = reader.StringField(item, "reward", path + ".reward"),
                };
                reader.RequireUnique(ids, icon.Id, path + ".id");
                data.Icons.Add(icon);
            }
            return data;
        }

        private static FactionsData ParseFactions(Reader reader, JsonObject root)
        {
            var data = new FactionsData();
            var factions = reader.ArrayField(root, "factions", "factions");
            var ids = new HashSet<string>();
            for (var i = 0; i < factions.Items.Count; i++)
            {
                var path = "factions[" + i + "]";
                var item = reader.ObjectAt(factions, i, path);
                var detail = reader.ObjectField(item, "detail", path + ".detail");
                var faction = new FactionData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Name = reader.StringField(item, "name", path + ".name"),
                    Tagline = reader.StringField(item, "tagline", path + ".tagline"),
                    Unlocked = reader.BoolField(item, "unlocked", path + ".unlocked"),
                    Tier = reader.IntField(item, "tier", path + ".tier", 0, 99),
                    Reputation = reader.IntField(item, "reputation", path + ".reputation", 0, 1000000),
                    ReputationMax = reader.IntField(item, "reputationMax", path + ".reputationMax", 1, 1000000),
                    Requirement = reader.StringField(item, "requirement", path + ".requirement", allowEmpty: true),
                    Detail = new FactionDetailData
                    {
                        Description = reader.StringField(detail, "description", path + ".detail.description"),
                        History = reader.StringField(detail, "history", path + ".detail.history"),
                    },
                };
                if (faction.Reputation > faction.ReputationMax)
                    throw reader.Error(path + ".reputation", $"must not exceed reputationMax ({faction.ReputationMax}).");
                if (!faction.Unlocked && faction.Requirement.Length == 0)
                    throw reader.Error(path + ".requirement", "must state the unlock requirement when the faction is locked.");
                reader.RequireUnique(ids, faction.Id, path + ".id");
                var perks = reader.ArrayField(detail, "perks", path + ".detail.perks");
                for (var p = 0; p < perks.Items.Count; p++)
                {
                    if (!(perks.Items[p] is JsonString perk) || perk.Value.Length == 0)
                        throw reader.Error(path + ".detail.perks[" + p + "]", "must be a non-empty string.");
                    faction.Detail.Perks.Add(perk.Value);
                }
                var parts = reader.ArrayField(detail, "parts", path + ".detail.parts");
                for (var p = 0; p < parts.Items.Count; p++)
                {
                    var partPath = path + ".detail.parts[" + p + "]";
                    var part = reader.ObjectAt(parts, p, partPath);
                    faction.Detail.Parts.Add(new FactionPartData
                    {
                        Name = reader.StringField(part, "name", partPath + ".name"),
                        Cost = reader.IntField(part, "cost", partPath + ".cost", 0, 1000000000),
                        Rarity = reader.StringField(part, "rarity", partPath + ".rarity"),
                        Size = reader.IntField(part, "size", partPath + ".size", 1, 2),
                    });
                }
                data.Factions.Add(faction);
            }
            return data;
        }

        private static AbilitiesData ParseAbilities(Reader reader, JsonObject root)
        {
            var data = new AbilitiesData();
            var abilities = reader.ArrayField(root, "abilities", "abilities");
            var ids = new HashSet<string>();
            for (var i = 0; i < abilities.Items.Count; i++)
            {
                var path = "abilities[" + i + "]";
                var item = reader.ObjectAt(abilities, i, path);
                var ability = new AbilityData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Name = reader.StringField(item, "name", path + ".name"),
                    Description = reader.StringField(item, "description", path + ".description"),
                    Rarity = reader.StringField(item, "rarity", path + ".rarity"),
                    Size = reader.IntField(item, "size", path + ".size", 1, 2),
                    Icon = reader.StringField(item, "icon", path + ".icon"),
                    Detail = reader.StringField(item, "detail", path + ".detail"),
                };
                reader.RequireUnique(ids, ability.Id, path + ".id");
                var stats = reader.ObjectField(item, "stats", path + ".stats");
                if (stats.Members.Count == 0)
                    throw reader.Error(path + ".stats", "must declare at least one stat.");
                var labels = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var member in stats.Members)
                {
                    var statPath = path + ".stats." + member.Key;
                    reader.RequireLabel(labels, member.Key, statPath);
                    string value;
                    if (member.Value is JsonString text) value = text.Value;
                    else if (member.Value is JsonNumber number) value = number.Value.ToString("0.###", CultureInfo.InvariantCulture);
                    else throw reader.Error(statPath, $"must be a string or a number (found {member.Value.TypeName}).");
                    ability.Stats.Add(new AbilityStat { Label = member.Key.ToUpperInvariant(), Value = value });
                }
                data.Abilities.Add(ability);
            }
            return data;
        }

        private static VehicleData ParseVehicle(Reader reader, JsonObject root, AbilitiesData abilities)
        {
            var data = new VehicleData
            {
                Name = reader.StringField(root, "name", "name"),
                Chassis = reader.StringField(root, "chassis", "chassis"),
            };
            var known = new HashSet<string>();
            foreach (var ability in abilities.Abilities) known.Add(ability.Id);
            var slots = reader.ArrayField(root, "slots", "slots");
            if (slots.Items.Count == 0) throw reader.Error("slots", "must declare at least one slot.");
            var ids = new HashSet<string>();
            for (var i = 0; i < slots.Items.Count; i++)
            {
                var path = "slots[" + i + "]";
                var item = reader.ObjectAt(slots, i, path);
                var slot = new VehicleSlotData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Label = reader.StringField(item, "label", path + ".label"),
                    Size = reader.IntField(item, "size", path + ".size", 1, 2),
                };
                var abilityMember = reader.Member(item, "abilityId", path + ".abilityId");
                if (abilityMember is JsonNull) slot.AbilityId = null;
                else if (abilityMember is JsonString text && text.Value.Length > 0)
                {
                    if (!known.Contains(text.Value))
                        throw reader.Error(path + ".abilityId", $"'{text.Value}' is not a fixture ability id.");
                    slot.AbilityId = text.Value;
                }
                else throw reader.Error(path + ".abilityId", $"must be null or a non-empty ability id (found {abilityMember.TypeName}).");
                reader.RequireUnique(ids, slot.Id, path + ".id");
                data.Slots.Add(slot);
            }
            return data;
        }

        private static SettingsData ParseSettings(Reader reader, JsonObject root)
        {
            var data = new SettingsData();
            var general = reader.ArrayField(root, "general", "general");
            var ids = new HashSet<string>();
            for (var i = 0; i < general.Items.Count; i++)
            {
                var path = "general[" + i + "]";
                var item = reader.ObjectAt(general, i, path);
                var toggle = new GeneralToggleData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Label = reader.StringField(item, "label", path + ".label"),
                    Description = reader.StringField(item, "description", path + ".description"),
                    Value = reader.BoolField(item, "value", path + ".value"),
                };
                reader.RequireUnique(ids, toggle.Id, path + ".id");
                data.General.Add(toggle);
            }
            var controller = reader.ArrayField(root, "controller", "controller");
            ids.Clear();
            for (var i = 0; i < controller.Items.Count; i++)
            {
                var path = "controller[" + i + "]";
                var item = reader.ObjectAt(controller, i, path);
                var setting = new ControllerSettingData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Label = reader.StringField(item, "label", path + ".label"),
                    Description = reader.StringField(item, "description", path + ".description"),
                    Min = reader.IntField(item, "min", path + ".min", int.MinValue, int.MaxValue),
                    Max = reader.IntField(item, "max", path + ".max", int.MinValue, int.MaxValue),
                    Step = reader.IntField(item, "step", path + ".step", 1, 1000),
                    Value = reader.IntField(item, "value", path + ".value", int.MinValue, int.MaxValue),
                    Unit = reader.StringField(item, "unit", path + ".unit", allowEmpty: true),
                };
                if (setting.Min >= setting.Max) throw reader.Error(path + ".max", "must be greater than min.");
                if (setting.Value < setting.Min || setting.Value > setting.Max)
                    throw reader.Error(path + ".value", $"must be within [{setting.Min}, {setting.Max}].");
                reader.RequireUnique(ids, setting.Id, path + ".id");
                data.Controller.Add(setting);
            }
            var remap = reader.ArrayField(root, "remap", "remap");
            ids.Clear();
            for (var i = 0; i < remap.Items.Count; i++)
            {
                var path = "remap[" + i + "]";
                var item = reader.ObjectAt(remap, i, path);
                var action = new RemapActionData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Label = reader.StringField(item, "label", path + ".label"),
                    Binding = reader.StringField(item, "binding", path + ".binding"),
                };
                reader.RequireUnique(ids, action.Id, path + ".id");
                data.Remap.Add(action);
            }
            var audio = reader.ObjectField(root, "audio", "audio");
            data.Audio = new AudioSettingsData
            {
                AudioLanguage = ParseLanguage(reader, reader.ObjectField(audio, "audioLanguage", "audio.audioLanguage"), "audio.audioLanguage"),
                SubtitleLanguage = ParseLanguage(reader, reader.ObjectField(audio, "subtitleLanguage", "audio.subtitleLanguage"), "audio.subtitleLanguage"),
                SubtitleBackground = ParseSubtitleBackground(reader, reader.ObjectField(audio, "subtitleBackground", "audio.subtitleBackground")),
                PreviewLine = reader.StringField(audio, "previewLine", "audio.previewLine"),
            };
            var sliders = reader.ArrayField(audio, "sliders", "audio.sliders");
            ids.Clear();
            for (var i = 0; i < sliders.Items.Count; i++)
            {
                var path = "audio.sliders[" + i + "]";
                var item = reader.ObjectAt(sliders, i, path);
                var slider = new AudioSliderData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Label = reader.StringField(item, "label", path + ".label"),
                    Value = reader.IntField(item, "value", path + ".value", 0, 100),
                    Unit = reader.StringField(item, "unit", path + ".unit", allowEmpty: true),
                };
                reader.RequireUnique(ids, slider.Id, path + ".id");
                data.Audio.Sliders.Add(slider);
            }
            return data;
        }

        private static LanguageSettingData ParseLanguage(Reader reader, JsonObject root, string path)
        {
            var data = new LanguageSettingData
            {
                Label = reader.StringField(root, "label", path + ".label"),
                Value = reader.StringField(root, "value", path + ".value"),
            };
            var options = reader.ArrayField(root, "options", path + ".options");
            if (options.Items.Count == 0) throw reader.Error(path + ".options", "must offer at least one option.");
            for (var i = 0; i < options.Items.Count; i++)
            {
                if (!(options.Items[i] is JsonString text) || text.Value.Length == 0)
                    throw reader.Error(path + ".options[" + i + "]", "must be a non-empty string.");
                data.Options.Add(text.Value);
            }
            if (!data.Options.Contains(data.Value))
                throw reader.Error(path + ".value", $"'{data.Value}' is not one of the declared options.");
            return data;
        }

        private static SubtitleBackgroundData ParseSubtitleBackground(Reader reader, JsonObject root)
        {
            var data = new SubtitleBackgroundData
            {
                Label = reader.StringField(root, "label", "audio.subtitleBackground.label"),
                Value = reader.StringField(root, "value", "audio.subtitleBackground.value"),
            };
            var options = reader.ArrayField(root, "options", "audio.subtitleBackground.options");
            if (options.Items.Count == 0) throw reader.Error("audio.subtitleBackground.options", "must offer at least one option.");
            var ids = new HashSet<string>();
            for (var i = 0; i < options.Items.Count; i++)
            {
                var path = "audio.subtitleBackground.options[" + i + "]";
                var item = reader.ObjectAt(options, i, path);
                var option = new SubtitleBackgroundOptionData
                {
                    Id = reader.StringField(item, "id", path + ".id"),
                    Label = reader.StringField(item, "label", path + ".label"),
                    Value = reader.StringField(item, "value", path + ".value"),
                };
                reader.RequireHex(option.Value, path + ".value");
                reader.RequireUnique(ids, option.Id, path + ".id");
                data.Options.Add(option);
            }
            var known = false;
            foreach (var option in data.Options) if (option.Id == data.Value) known = true;
            if (!known) throw reader.Error("audio.subtitleBackground.value", $"'{data.Value}' is not one of the declared option ids.");
            return data;
        }

        /// <summary>Typed member access with file-relative JSON paths in every failure.</summary>
        private sealed class Reader
        {
            private readonly string file;

            public Reader(string file) { this.file = file; }

            public string File => "fixtures/" + file + ".json";

            public FixtureFormatException Error(string path, string problem) => new FixtureFormatException($"{File}: {path} {problem}");

            public JsonValue Member(JsonObject parent, string name, string path)
            {
                if (!parent.TryGet(name, out var value)) throw Error(path, "is required.");
                return value;
            }

            public JsonObject ObjectField(JsonObject parent, string name, string path)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonObject obj)) throw Error(path, $"must be an object (found {value.TypeName}).");
                return obj;
            }

            public JsonArray ArrayField(JsonObject parent, string name, string path)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonArray array)) throw Error(path, $"must be an array (found {value.TypeName}).");
                return array;
            }

            public JsonObject ObjectAt(JsonArray array, int index, string path)
            {
                if (!(array.Items[index] is JsonObject obj)) throw Error(path, $"must be an object (found {array.Items[index].TypeName}).");
                return obj;
            }

            public string StringField(JsonObject parent, string name, string path, bool allowEmpty = false)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonString text)) throw Error(path, $"must be a string (found {value.TypeName}).");
                if (!allowEmpty && text.Value.Length == 0) throw Error(path, "must be a non-empty string.");
                return text.Value;
            }

            public string OptionalStringField(JsonObject parent, string name, string path, string fallback)
            {
                if (!parent.TryGet(name, out var value) || value is JsonNull) return fallback;
                if (!(value is JsonString text)) throw Error(path, $"must be a string (found {value.TypeName}).");
                return text.Value;
            }

            public bool BoolField(JsonObject parent, string name, string path)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonBool boolean)) throw Error(path, $"must be a boolean (found {value.TypeName}).");
                return boolean.Value;
            }

            public double NumberField(JsonObject parent, string name, string path,
                double min = double.MinValue, double max = double.MaxValue)
            {
                var value = Member(parent, name, path);
                if (!(value is JsonNumber number)) throw Error(path, $"must be a number (found {value.TypeName}).");
                if (double.IsNaN(number.Value) || double.IsInfinity(number.Value))
                    throw Error(path, "must be a finite number.");
                if (number.Value < min || number.Value > max)
                    throw Error(path, $"must be within [{Invariant(min)}, {Invariant(max)}].");
                return number.Value;
            }

            public int IntField(JsonObject parent, string name, string path, int min = int.MinValue, int max = int.MaxValue)
            {
                var number = NumberField(parent, name, path, min, max);
                var rounded = Math.Round(number);
                if (Math.Abs(number - rounded) > 0.0000001)
                    throw Error(path, $"must be an integer (found {Invariant(number)}).");
                return (int)rounded;
            }

            public void RequireHex(string hex, string path)
            {
                if (!OrionPalette.IsHexColor(hex)) throw Error(path, $"'{hex}' is not a #RRGGBB colour.");
            }

            public void RequireUnique(HashSet<string> seen, string id, string path)
            {
                if (!seen.Add(id)) throw Error(path, $"'{id}' is a duplicate id.");
            }

            public void RequireLabel(HashSet<string> seen, string label, string path)
            {
                if (!seen.Add(label)) throw Error(path, $"'{label}' is a duplicate stat label.");
            }

            private static string Invariant(double value) => value.ToString("0.###", CultureInfo.InvariantCulture);
        }
    }
}
