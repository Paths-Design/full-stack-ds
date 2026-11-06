using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using FullStackDS;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace GamePauseMenu.Tests
{
    /// <summary>Parity-layout seam and geometry tests: the shared layout authority parses with the
    /// pinned values, the app applies its absolute boxes, and the switch geometry is pinned by the
    /// lane stylesheet instead of the token's oversized pill radius.</summary>
    public sealed class ParityLayoutTests
    {
        private static Dictionary<string, string> Raw()
        {
            var raw = new Dictionary<string, string>();
            foreach (var name in FixtureRepository.Files)
                raw[name] = Resources.Load<TextAsset>("Fixtures/" + name).text;
            return raw;
        }

        [Test]
        public void ParityLayoutFixtureParsesWithPinnedGeometry()
        {
            var layout = FixtureRepository.LoadFromResources().Parity;
            Assert.That(layout.ViewportWidth, Is.EqualTo(1280));
            Assert.That(layout.ViewportHeight, Is.EqualTo(800));
            Assert.That(layout.Header.Rect.H, Is.EqualTo(104));
            Assert.That(layout.TabBar.Rect.Y, Is.EqualTo(104));
            Assert.That(layout.TabBar.Rect.H, Is.EqualTo(56));
            Assert.That(layout.TabBar.Tabs.Count, Is.EqualTo(4));
            Assert.That(layout.TabBar.Tabs.Select(tab => tab.W).Distinct(), Is.EqualTo(new[] { 320.0 }));
            Assert.That(layout.Footer.Rect.Y, Is.EqualTo(744));
            Assert.That(layout.Panels.Content.X, Is.EqualTo(24));
            Assert.That(layout.Panels.Content.W, Is.EqualTo(1232));
            Assert.That(layout.Switch.Width, Is.EqualTo(64));
            Assert.That(layout.Switch.Height, Is.EqualTo(32));
            Assert.That(layout.Switch.Radius, Is.EqualTo(16));
            Assert.That(layout.Switch.ThumbRadius, Is.EqualTo(12));
            Assert.That(layout.Switch.CheckedThumbOffset, Is.EqualTo(36));
            Assert.That(layout.Map.Field.W, Is.EqualTo(840));
            Assert.That(layout.Abilities.Cards.W, Is.EqualTo(152));
            Assert.That(layout.Abilities.Cards.H, Is.EqualTo(240));
            Assert.That(layout.Settings.Panels.Count, Is.EqualTo(4));
            Assert.That(layout.Captures.Count, Is.GreaterThanOrEqualTo(8));
            foreach (var required in new[] { "map", "progress", "abilities", "settings" })
                Assert.That(layout.Captures.ContainsKey(required), Is.True, "required capture " + required);
            Assert.That(layout.Captures["map"].HiddenIcons, Does.Contain("weather-06"));
            Assert.That(layout.Captures["map-popover"].Popover, Is.EqualTo("beacon-05"));
            Assert.That(layout.Captures["progress"].Drawer, Is.EqualTo("ares-logistics"));
            Assert.That(layout.Captures["abilities"].PendingAbility, Is.EqualTo("overclock"));
            Assert.That(layout.Captures["settings-subtitle"].SubtitleBackground, Is.EqualTo("signal"));
            Assert.That(layout.MarkerColors["beacon"], Is.EqualTo("alert"));
            Assert.That(layout.RarityColors["epic"], Is.EqualTo("alert"));
        }

        [Test]
        public void CaptureVisibilityReplacesFixtureDefaultsAndPreviousFilters()
        {
            using var host = new TestHost();
            var app = host.App;
            Assert.That(app.State.IsIconVisible("rover-07"), Is.False, "ordinary startup uses the fixture");
            foreach (var name in new[] { "map", "map-popover", "progress", "map-popover", "map" })
            {
                app.SetIconVisible("relay-01", false);
                var capture = app.Layout.Captures[name];
                app.ApplyCaptureIconVisibility(capture);
                foreach (var icon in app.State.Fixtures.Map.Icons)
                {
                    var visible = !capture.HiddenIcons.Contains(icon.Id);
                    Assert.That(app.State.IsIconVisible(icon.Id), Is.EqualTo(visible), name + " state " + icon.Id);
                    Assert.That(app.Map.VisibilitySwitch(icon.Id).value, Is.EqualTo(visible), name + " switch " + icon.Id);
                    Assert.That(app.Map.IsMarkerPlotted(icon.Id), Is.EqualTo(visible), name + " marker " + icon.Id);
                }
                var count = name == "progress" ? 8 : 7;
                Assert.That(app.Map.IconPanelMeta.text, Is.EqualTo(count + "/8 PLOTTED"));
                Assert.That(app.Map.FieldNote.text, Does.StartWith("MARKERS " + count + "/8 VISIBLE"));
            }
            app.ApplyCaptureIconVisibility(new CaptureLayout());
            Assert.That(app.State.Fixtures.Map.Icons.All(icon => app.State.IsIconVisible(icon.Id)), Is.True,
                "an absent hiddenIcons list restores every icon");
            app.SetIconVisible("relay-01", false);
            Assert.That(app.Map.IconPanelMeta.text, Is.EqualTo("7/8 PLOTTED"));
            Assert.That(app.Map.FieldNote.text, Does.StartWith("MARKERS 7/8 VISIBLE"));
            Assert.That(app.State.Fixtures.Map.Icons.Single(icon => icon.Id == "rover-07").Visible, Is.False);
        }

        [Test]
        public void MalformedParityLayoutFailsLoudly()
        {
            var raw = Raw();
            raw[FixtureRepository.ParityLayoutFile] = raw[FixtureRepository.ParityLayoutFile]
                .Replace("\"radius\": 16,", "\"radius\": \"sixteen\",");
            var error = Assert.Throws<FixtureFormatException>(() => FixtureRepository.Parse(raw));
            Assert.That(error.Message, Does.Contain("parity-layout.json"));
            Assert.That(error.Message, Does.Contain("switch.radius must be a number"));

            raw = Raw();
            raw[FixtureRepository.ParityLayoutFile] = raw[FixtureRepository.ParityLayoutFile]
                .Replace("\"w\": 840,", "\"w\": 2000,");
            error = Assert.Throws<FixtureFormatException>(() => FixtureRepository.Parse(raw));
            Assert.That(error.Message, Does.Contain("map.field must fit the viewport"));
        }

        [Test]
        public void AppAppliesThePinnedAbsoluteGeometry()
        {
            using var host = new TestHost();
            var layout = host.App.Layout;
            var tab = host.App.TabButton(PauseMenuState.MapTab);
            Assert.That(tab.style.left.value.value, Is.EqualTo(0).Within(0.001f));
            Assert.That(tab.style.width.value.value, Is.EqualTo(320).Within(0.001f));
            Assert.That(tab.style.height.value.value, Is.EqualTo(56).Within(0.001f));
            var lastTab = host.App.TabButton(PauseMenuState.SettingsTab);
            Assert.That(lastTab.style.left.value.value, Is.EqualTo(960).Within(0.001f));
            var panel = host.App.TabPanel(PauseMenuState.MapTab);
            Assert.That(panel.style.left.value.value, Is.EqualTo(layout.Panels.Content.X).Within(0.001f));
            Assert.That(panel.style.top.value.value, Is.EqualTo(layout.Panels.Content.Y).Within(0.001f));
            Assert.That(panel.style.width.value.value, Is.EqualTo(layout.Panels.Content.W).Within(0.001f));
            Assert.That(panel.style.height.value.value, Is.EqualTo(layout.Panels.Content.H).Within(0.001f));

            Assert.That(host.App.Header.Root.style.left.value.value, Is.EqualTo(0).Within(0.001f));
            Assert.That(host.App.Header.Root.style.height.value.value, Is.EqualTo(104).Within(0.001f));
            Assert.That(host.App.Header.PausedChip.style.left.value.value, Is.EqualTo(1184).Within(0.001f));
            Assert.That(host.App.Header.PausedChip.style.top.value.value, Is.EqualTo(40).Within(0.001f));
            Assert.That(host.App.Header.PausedChip.style.width.value.value, Is.EqualTo(64).Within(0.001f));
            Assert.That(host.App.Header.PausedChip.style.height.value.value, Is.EqualTo(24).Within(0.001f));
            Assert.That(host.App.Footer.Root.style.top.value.value, Is.EqualTo(744).Within(0.001f));

            Assert.That(host.App.Map.Field.style.left.value.value, Is.EqualTo(40).Within(0.001f));
            Assert.That(host.App.Map.Field.style.top.value.value, Is.EqualTo(232).Within(0.001f));
            Assert.That(host.App.Map.Field.style.width.value.value, Is.EqualTo(840).Within(0.001f));
            Assert.That(host.App.Map.Field.style.height.value.value, Is.EqualTo(480).Within(0.001f));

            Assert.That(host.App.Abilities.CardAnchor("threading").style.width.value.value,
                Is.EqualTo(152).Within(0.001f));
            Assert.That(host.App.Abilities.CardAnchor("threading").style.height.value.value,
                Is.EqualTo(240).Within(0.001f));
            Assert.That(host.App.Settings.Swatch("signal").style.width.value.value, Is.EqualTo(36).Within(0.001f));
            Assert.That(host.App.Settings.Swatch("signal").style.height.value.value,
                Is.EqualTo(layout.Settings.SwatchH).Within(0.001f));
        }

        [UnityTest]
        public IEnumerator SwitchGeometryIsPinnedAndColorsComeFromTheLayout()
        {
            using var host = new TestHost();
            yield return null;
            yield return null;
            var layout = host.App.Layout;
            var on = host.App.Map.VisibilitySwitch("relay-01");
            Assert.That(on.Checked, Is.True);
            Assert.That(on.Track.resolvedStyle.width, Is.EqualTo(64f).Within(0.5f));
            Assert.That(on.Track.resolvedStyle.height, Is.EqualTo(32f).Within(0.5f));
            Assert.That(on.Track.resolvedStyle.borderTopLeftRadius, Is.EqualTo(16f).Within(0.01f));
            Assert.That(on.Track.resolvedStyle.borderTopRightRadius, Is.EqualTo(16f).Within(0.01f));
            Assert.That(on.Track.resolvedStyle.borderBottomLeftRadius, Is.EqualTo(16f).Within(0.01f));
            Assert.That(on.Thumb.resolvedStyle.width, Is.EqualTo(24f).Within(0.5f));
            Assert.That(on.Thumb.resolvedStyle.height, Is.EqualTo(24f).Within(0.5f));
            Assert.That(on.Thumb.resolvedStyle.borderTopLeftRadius, Is.EqualTo(12f).Within(0.01f));
            Assert.That(on.Track.resolvedStyle.backgroundColor,
                Is.EqualTo(layout.Color(layout.Switch.OnTrack)));
            Assert.That(on.Thumb.style.left.value.value, Is.EqualTo(36f).Within(0.01f));
            Assert.That(on.Thumb.resolvedStyle.backgroundColor,
                Is.EqualTo(layout.Color(layout.Switch.OnThumb)));

            var off = host.App.Map.VisibilitySwitch("rover-07");
            Assert.That(off.Checked, Is.False);
            Assert.That(off.Track.resolvedStyle.backgroundColor,
                Is.EqualTo(layout.Color(layout.Switch.OffTrack)));
            Assert.That(off.Track.resolvedStyle.borderTopWidth, Is.EqualTo(1f).Within(0.01f));
            Assert.That(off.Thumb.style.left.value.value, Is.EqualTo(4f).Within(0.01f));
            Assert.That(off.Thumb.resolvedStyle.backgroundColor,
                Is.EqualTo(layout.Color(layout.Switch.OffThumb)));
        }
        [UnityTest]
        public IEnumerator MapPopoverUsesSharedInnerGeometryAndPreservesEveryIconsCopy()
        {
            using var host = new TestHost();
            var app = host.App;
            var layout = app.Layout;
            var parts = layout.Map.Popover.Content;
            app.Map.OpenPopover("beacon-05");
            yield return null;
            yield return null;
            // The Editor panel also contains native window chrome; the client
            // mount is the viewport in which this 1280x800 app is exercised.
            var viewport = host.Mount.contentRect;
            Assert.That(viewport.width, Is.EqualTo((float)layout.ViewportWidth).Within(0.1f),
                "native client viewport width; window=" + host.Window.position);
            Assert.That(viewport.height, Is.EqualTo((float)layout.ViewportHeight).Within(0.1f),
                "native client viewport height; window=" + host.Window.position);
            Assert.That(app.Root.worldBound.width, Is.EqualTo((float)layout.ViewportWidth).Within(0.1f));
            Assert.That(app.Root.worldBound.height, Is.EqualTo((float)layout.ViewportHeight).Within(0.1f));
            var panelBounds = app.Root.panel.visualTree.worldBound;
            var clientBounds = host.Mount.worldBound;
            Assert.That(panelBounds.xMin, Is.LessThanOrEqualTo(clientBounds.xMin));
            Assert.That(panelBounds.yMin, Is.LessThanOrEqualTo(clientBounds.yMin));
            Assert.That(panelBounds.xMax, Is.GreaterThanOrEqualTo(clientBounds.xMax));
            Assert.That(panelBounds.yMax, Is.GreaterThanOrEqualTo(clientBounds.yMax));
            app.Map.MarkerPopover.Surface.Reposition();
            yield return null;
            yield return null;
            var content = app.Map.MarkerPopover.Content;
            AssertActualPartRect(content, layout.Map.Popover.Rect, app.Root);
            Assert.That(app.Map.MarkerPopover.Trigger.worldBound.width, Is.EqualTo(0f).Within(0.01f));
            Assert.That(app.Map.MarkerPopover.Trigger.worldBound.height, Is.EqualTo(0f).Within(0.01f));
            AssertActualPartRect(app.Map.Field, layout.Map.Field, app.Root);
            Assert.That(app.Map.Field.resolvedStyle.borderTopLeftRadius, Is.EqualTo(0f));
            Assert.That(app.Map.Field.resolvedStyle.borderTopRightRadius, Is.EqualTo(0f));
            Assert.That(app.Map.Field.resolvedStyle.borderBottomLeftRadius, Is.EqualTo(0f));
            Assert.That(app.Map.Field.resolvedStyle.borderBottomRightRadius, Is.EqualTo(0f));
            AssertPopoverPart(content.Q<VisualElement>("map-popover-title"), parts.Title, layout);
            AssertPopoverPart(content.Q<VisualElement>("map-popover-status"), parts.Status, layout);
            AssertPopoverPart(content.Q<VisualElement>("map-popover-meta"), parts.Meta, layout);
            AssertPopoverPart(content.Q<VisualElement>("map-popover-body"), parts.Body, layout);
            AssertPopoverPart(content.Q<VisualElement>("map-popover-reward"), parts.Reward, layout);
            AssertPopoverPart(content.Q<VisualElement>("map-popover-action"), parts.Action, layout);
            AssertPopoverPart(content.Q<VisualElement>("map-popover-cancel"), parts.Cancel, layout);
            Assert.That(content.style.backgroundColor.value, Is.EqualTo(layout.Color(parts.Background)));
            Assert.That(content.style.borderLeftWidth.value, Is.EqualTo((float)parts.BorderWidth));
            Assert.That(content.style.borderLeftColor.value, Is.EqualTo(layout.Color(parts.Border)));
            Assert.That(content.style.borderTopWidth.value, Is.EqualTo((float)parts.AccentWidth));
            Assert.That(content.style.borderTopColor.value, Is.EqualTo(layout.Color(parts.Accent)));
            var status = content.Q<Badge>("map-popover-status");
            Assert.That(status, Is.Not.Null, "status uses the generated Badge component");
            Assert.That(status.style.backgroundColor.value, Is.EqualTo(layout.Color(parts.Status.Background)));
            Assert.That(status.style.borderTopColor.value, Is.EqualTo(layout.Color(parts.Status.Border)));
            Assert.That(content.Q<Text>("map-popover-body").style.whiteSpace.value, Is.EqualTo(WhiteSpace.Normal));
            foreach (var icon in app.State.Fixtures.Map.Icons)
            {
                app.Map.OpenPopover(icon.Id);
                Assert.That(content.Q<Text>("map-popover-title").text, Is.EqualTo(icon.Label), icon.Id + " title");
                Assert.That(status.Q<Text>().text, Is.EqualTo(icon.Status), icon.Id + " status");
                Assert.That(content.Q<Text>("map-popover-meta").text,
                    Is.EqualTo(icon.Sector + " · " + icon.DistanceKm.ToString("0.0", CultureInfo.InvariantCulture) + " KM"),
                    icon.Id + " sector and distance");
                Assert.That(content.Q<Text>("map-popover-body").text, Is.EqualTo(icon.Detail), icon.Id + " detail");
                Assert.That(content.Q<Text>("map-popover-reward").text, Is.EqualTo(icon.Reward), icon.Id + " reward");
            }
            Assert.That(content.Q<FullStackDS.Button>("map-popover-action").text, Is.EqualTo(layout.Map.Popover.Action));
            Assert.That(content.Q<FullStackDS.Button>("map-popover-cancel").text, Is.EqualTo(layout.Map.Popover.Cancel));
        }

        private static void AssertPopoverPart(VisualElement element, PopoverPartLayout part, ParityLayoutData layout)
        {
            Assert.That(element, Is.Not.Null);
            var surface = element.GetFirstAncestorOfType<PopoverContent>();
            Assert.That(surface, Is.Not.Null, element.name + " surface");
            AssertActualPartRect(element, part.Rect, surface);
            var text = element as TextElement ?? element.Q<Text>();
            Assert.That(text, Is.Not.Null, element.name + " text");
            Assert.That(text.style.fontSize.value.value, Is.EqualTo((float)layout.Size(part.TypeKey)), element.name + " type");
            Assert.That(text.style.color.value, Is.EqualTo(layout.Color(part.Color)), element.name + " color");
            var font = Resources.Load<Font>(part.Weight == 700 ? "Fonts/Inter-Bold" : "Fonts/Inter-Regular");
            Assert.That(text.style.unityFontDefinition.value.font, Is.EqualTo(font), element.name + " font weight");
        }

        private static void AssertActualPartRect(VisualElement element, LayoutRect expected, VisualElement surface)
        {
            var actual = element.worldBound;
            var origin = surface.worldBound;
            Assert.That(actual.x - origin.x, Is.EqualTo((float)expected.X).Within(0.1f), element.name + " rendered x");
            Assert.That(actual.y - origin.y, Is.EqualTo((float)expected.Y).Within(0.1f), element.name + " rendered y");
            Assert.That(actual.width, Is.EqualTo((float)expected.W).Within(0.1f), element.name + " rendered width");
            Assert.That(actual.height, Is.EqualTo((float)expected.H).Within(0.1f), element.name + " rendered height");
        }

        [UnityTest]
        public IEnumerator SubtitlePreviewRendersSharedTextRectsAndAdaptiveColors()
        {
            using var host = new TestHost();
            var app = host.App;
            app.Tabs.Value = PauseMenuState.SettingsTab;
            yield return null;
            yield return null;
            var settings = app.Settings;
            var content = app.Layout.Settings.PreviewContent;
            AssertActualPartRect(settings.SubtitlePreviewText, content.Line.Rect, settings.SubtitlePreview);
            AssertActualPartRect(settings.SubtitlePreviewMeta, content.Meta.Rect, settings.SubtitlePreview);
            Assert.That(settings.SubtitlePreviewText.style.fontSize.value.value,
                Is.EqualTo((float)app.Layout.Size(content.Line.TypeKey)));
            Assert.That(settings.SubtitlePreviewMeta.style.fontSize.value.value,
                Is.EqualTo((float)app.Layout.Size(content.Meta.TypeKey)));
            Assert.That(settings.SubtitlePreviewText.style.unityFontDefinition.value.font,
                Is.EqualTo(Resources.Load<Font>("Fonts/Inter-Regular")));
            Assert.That(settings.SubtitlePreviewMeta.style.unityFontDefinition.value.font,
                Is.EqualTo(Resources.Load<Font>("Fonts/Inter-Bold")));
            Assert.That(settings.SubtitlePreviewMeta.style.unityTextAlign.value, Is.EqualTo(TextAnchor.MiddleRight));
            Assert.That(settings.SubtitlePreviewText.style.overflow.value, Is.EqualTo(Overflow.Hidden));
            Assert.That(settings.SubtitlePreviewMeta.style.overflow.value, Is.EqualTo(Overflow.Hidden));
            Assert.That(settings.SubtitlePreviewText.style.whiteSpace.value, Is.EqualTo(WhiteSpace.NoWrap));
            Assert.That(settings.SubtitlePreviewMeta.style.whiteSpace.value, Is.EqualTo(WhiteSpace.NoWrap));
            foreach (var background in new[] { "charcoal", "signal", "bone" })
            {
                app.SetSubtitleBackground(background);
                var expected = app.Layout.Color(background == "charcoal" ? "boneBright" : "ink");
                Assert.That(settings.SubtitlePreviewText.style.color.value, Is.EqualTo(expected), background + " line contrast");
                Assert.That(settings.SubtitlePreviewMeta.style.color.value, Is.EqualTo(expected), background + " metadata contrast");
            }
        }

        [Test]
        public void MapPopoverRejectsUnsupportedContentBeforeBuildingTheApp()
        {
            var layout = FixtureRepository.LoadFromResources().Parity;
            layout.Map.Popover.Content.Body.Rect.W = layout.Map.Popover.Rect.W + 1;
            var error = Assert.Throws<FixtureFormatException>(() => layout.Validate());
            Assert.That(error.Message, Does.Contain("map.popover.content.body.rect must fit the popover"));

            layout = FixtureRepository.LoadFromResources().Parity;
            layout.Map.Popover.Content.Status.Weight = 500;
            error = Assert.Throws<FixtureFormatException>(() => layout.Validate());
            Assert.That(error.Message, Does.Contain("map.popover.content.status.weight must be 400 or 700"));

            layout = FixtureRepository.LoadFromResources().Parity;
            layout.Map.Popover.Content.Title.TypeKey = "missing-popover-type";
            error = Assert.Throws<FixtureFormatException>(() => layout.Validate());
            Assert.That(error.Message, Does.Contain("type size 'missing-popover-type' is not declared"));

            layout = FixtureRepository.LoadFromResources().Parity;
            layout.Type[layout.Map.Popover.Content.Title.TypeKey] = 0;
            error = Assert.Throws<FixtureFormatException>(() => layout.Validate());
            Assert.That(error.Message, Does.Contain("map.popover.content.title.type must reference a positive font size"));

            var raw = Raw();
            raw[FixtureRepository.ParityLayoutFile] = raw[FixtureRepository.ParityLayoutFile]
                .Replace("{distanceKm}", "{distanceKm} {unknown}");
            error = Assert.Throws<FixtureFormatException>(() => FixtureRepository.Parse(raw));
            Assert.That(error.Message, Does.Contain("map.popover.content.meta.template contains an unsupported placeholder"));
        }

        [Test]
        public void SubtitlePreviewRejectsInvalidRectsAndUnsupportedMetadata()
        {
            var layout = FixtureRepository.LoadFromResources().Parity;
            layout.Settings.PreviewContent.Line.Rect.H = layout.Settings.PreviewRect.H + 1;
            var error = Assert.Throws<FixtureFormatException>(() => layout.Validate());
            Assert.That(error.Message, Does.Contain("settings.preview.content.line.rect must fit the preview"));
            layout = FixtureRepository.LoadFromResources().Parity;
            layout.Settings.PreviewContent.Meta.Template = "{language} · {background} {unknown}";
            error = Assert.Throws<FixtureFormatException>(() => layout.Validate());
            Assert.That(error.Message, Does.Contain("settings.preview.content.meta.template contains an unsupported placeholder"));
            layout = FixtureRepository.LoadFromResources().Parity;
            layout.Settings.PreviewContent.Meta.LetterCase = "lower";
            error = Assert.Throws<FixtureFormatException>(() => layout.Validate());
            Assert.That(error.Message, Does.Contain("settings.preview.content.meta.case must be upper"));
        }

        [Test]
        public void PinnedIconArtRendersPortableTwoLetterTiles()
        {
            var layout = FixtureRepository.LoadFromResources().Parity;
            Assert.That(layout.TabBar.LabelAlign, Is.EqualTo("left"));
            Assert.That(layout.TabBar.LabelInset, Is.EqualTo(32));
            Assert.That(layout.IconArt.RowTile.Size, Is.EqualTo(16));
            Assert.That(layout.IconArt.CardTile.Size, Is.EqualTo(40));

            using var host = new TestHost();

            var mapTab = host.App.TabButton(PauseMenuState.MapTab);
            Assert.That(mapTab.style.paddingLeft.value.value,
                Is.EqualTo((float)layout.TabBar.LabelInset).Within(0.001f));
            Assert.That(mapTab.style.unityTextAlign.value, Is.EqualTo(TextAnchor.MiddleLeft));

            var codes = new List<string>();
            foreach (var icon in host.App.State.Fixtures.Map.Icons)
            {
                var tile = host.App.Map.IconTile(icon.Id);
                Assert.That(tile, Is.Not.Null, "row tile for " + icon.Id);
                Assert.That(tile.style.width.value.value, Is.EqualTo(16).Within(0.001f));
                Assert.That(tile.style.height.value.value, Is.EqualTo(16).Within(0.001f));
                Assert.That(tile.style.borderTopWidth.value, Is.EqualTo(1).Within(0.001f));
                Assert.That(tile.style.backgroundColor.value, Is.EqualTo(layout.Color("graphite")));
                Assert.That(tile.style.borderTopColor.value, Is.EqualTo(layout.Color("ruleStrong")));
                Assert.That(tile.Q<FullStackDS.Icon>(), Is.Null,
                    "pinned icon surfaces render code tiles, not catalog glyphs");
                var label = tile.Q<Text>();
                Assert.That(label, Is.Not.Null);
                Assert.That(label.style.fontSize.value.value, Is.EqualTo(8).Within(0.001f));
                Assert.That(label.style.color.value, Is.EqualTo(layout.Color("boneBright")));
                Assert.That(label.text, Is.EqualTo(layout.IconArt.RowTile.Codes[icon.Icon]));
                codes.Add(label.text);
            }

            Assert.That(codes, Is.EquivalentTo(new[] { "IN", "PL", "HO", "BL", "AL", "CD", "CR", "US" }));
            Assert.That(host.App.Map.IconTile("vein-04").Q<Text>().text, Is.EqualTo("BL"),
                "the pinned table maps Baseline to BL, not the naive first two letters");

            var overclock = host.App.State.Fixtures.Abilities.Abilities.First(ability => ability.Id == "overclock");
            var art = host.App.Abilities.CardArt(overclock.Id);
            Assert.That(art, Is.Not.Null);
            Assert.That(art.style.width.value.value, Is.EqualTo(40).Within(0.001f));
            Assert.That(art.style.height.value.value, Is.EqualTo(40).Within(0.001f));
            Assert.That(art.style.backgroundColor.value, Is.EqualTo(layout.Color("graphite")));
            Assert.That(art.style.borderTopColor.value, Is.EqualTo(layout.Color("ruleStrong")));
            Assert.That(art.Q<FullStackDS.Icon>(), Is.Null);
            var artLabel = art.Q<Text>();
            Assert.That(artLabel, Is.Not.Null);
            Assert.That(artLabel.text, Is.EqualTo("OV"));
            Assert.That(artLabel.style.fontSize.value.value, Is.EqualTo(12).Within(0.001f));
            var cardCodes = new List<string>();
            foreach (var ability in host.App.State.Fixtures.Abilities.Abilities)
            {
                var cardTile = host.App.Abilities.CardArt(ability.Id);
                Assert.That(cardTile, Is.Not.Null, "card art for " + ability.Id);
                Assert.That(cardTile.Q<Text>().text, Is.EqualTo(FixtureRepository.IconCode(ability.Name)));
                cardCodes.Add(cardTile.Q<Text>().text);
            }
            Assert.That(cardCodes, Is.EquivalentTo(new[] { "TH", "OV", "TH", "IO", "DR", "SI", "AE", "RE", "TH", "HA" }));
            Assert.That(artLabel.style.color.value, Is.EqualTo(layout.Color("boneBright")));

            host.App.SelectAbility(overclock.Id);
            var selected = host.App.Abilities.CardRoot(overclock.Id);
            Assert.That(selected.style.borderTopColor.value, Is.EqualTo(layout.Color("signal")));
            Assert.That(selected.style.borderTopWidth.value, Is.EqualTo(2).Within(0.001f));
        }
    }
}
