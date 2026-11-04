using System;
using System.Collections;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace FullStackDS.Tests
{
    /// <summary>Resolved styles under the generated Controls.uss. Expected literals follow the built token CSS
    /// in the named theme/brand scope, including the default brand when no brand class is set.
    /// Graph aliases are resolved in that scope rather than taken from the flattened graph alone.
    ///
    /// USS behaviour these witnesses depend on, observed with resolvedStyle / ICustomStyle probes on Unity
    /// 6000.5.3f1 (none of it produces an importer warning, so GeneratedStyleSheetImportsCleanly cannot see it):
    /// - a var() in a multi-component declaration takes the whole value and drops the other components:
    ///   <c>translate: var(--x, 24px) -50%</c> and <c>translate: var(--x) var(--y)</c> resolve to (24, 24), while the
    ///   literal <c>translate: 24px -50%</c> resolves to (24, -8);
    /// - a single-value <c>translate: 24px</c> applies to both axes (24, 24), unlike CSS (x only);
    /// - the same holds outside translate: <c>padding: var(--x, 24px) 2px</c> resolves to 24 on every side;
    /// - custom properties declared on a ScrollView are absent from its contentContainer's ICustomStyle (no
    ///   CustomStyleResolvedEvent there), so --fsds-gap is read on the ScrollView itself;
    /// - ICustomStyle's float read refuses a Dimension (<c>8px</c>); the string read returns the var()-resolved text;
    /// - <c>gap</c> is not a USS property (importer: "Unknown property 'gap'"; runtime: "Unknown style property gap").</summary>
    public class StylingTests
    {
        private EditorWindow window;
        private GameObject host;
        private PanelSettings settings;
        private RenderTexture texture;
        private static Color Hex(string hex) { Assert.That(ColorUtility.TryParseHtmlString(hex, out var color), Is.True, hex); return color; }
        private static void ColorIs(Color actual, string expected, string what = null)
        {
            var e = Hex(expected);
            var message = $"{what ?? "colour"}: expected {expected}, was #{ColorUtility.ToHtmlStringRGBA(actual)}";
            Assert.That(actual.r, Is.EqualTo(e.r).Within(.005), message);
            Assert.That(actual.g, Is.EqualTo(e.g).Within(.005), message);
            Assert.That(actual.b, Is.EqualTo(e.b).Within(.005), message);
            Assert.That(actual.a, Is.EqualTo(e.a).Within(.005), message);
        }
        [UnityTearDown] public IEnumerator Cleanup()
        {
            if (window != null) window.Close();
            if (Application.isPlaying) yield return new ExitPlayMode();
            if (host != null) UnityEngine.Object.DestroyImmediate(host);
            if (settings != null) UnityEngine.Object.DestroyImmediate(settings);
            if (texture != null) { texture.Release(); UnityEngine.Object.DestroyImmediate(texture); }
            TestAssets.RemoveSample();
        }
        private static IEnumerator Frames(int count = 8) { for (int i = 0; i < count; i++) yield return null; }
        // The contract's transitions (switch.motion.duration 100ms, tabs indicator 150ms) animate colour and
        // position changes, so a resolved value is read only after the longest declared transition has elapsed.
        private static IEnumerator Settle()
        {
            yield return null;
            var until = Time.realtimeSinceStartup + .4f;
            while (Time.realtimeSinceStartup < until) yield return null;
            yield return null;
        }
        private VisualElement EditorRoot(int width = 520, int height = 680)
        {
            window = ScriptableObject.CreateInstance<EditorWindow>();
            window.position = new Rect(60, 60, width, height); window.Show();
            return window.rootVisualElement;
        }

        // The USS vocabulary oracle for the emitter's property table: an importer warning names a
        // property or value USS does not accept, which belongs in Controls.unsupported.json, not in the sheet.
        [Test] public void GeneratedStyleSheetImportsCleanly()
        {
            var sheet = Resources.Load<StyleSheet>("FullStackDS/Controls");
            Assert.That(sheet, Is.Not.Null);
            Assert.That(sheet.importedWithErrors, Is.False, "Controls.uss imported with errors; see the Editor log");
            Assert.That(sheet.importedWithWarnings, Is.False, "Controls.uss imported with warnings; see the Editor log");
        }
        [Test] public void SampleStyleSheetImportsCleanlyAndIsFoundByItsGuid()
        {
            // The showcase finds an imported sample wherever it was imported, by the GUID the sample's meta commits.
            Assert.That(File.ReadAllText(TestAssets.SampleSource("Sample.uss.meta")), Does.Contain("guid: " + FullStackDS.Editor.ControlsShowcase.SampleStyleSheetGuid));
            var expected = TestAssets.SampleSheetAtCommittedGuid();
            var sheet = FullStackDS.Editor.ControlsShowcase.SampleStyleSheet();
            Assert.That(sheet, Is.Not.Null);
            Assert.That(AssetDatabase.GetAssetPath(sheet), Is.EqualTo(expected));
            Assert.That(sheet.importedWithErrors, Is.False);
            Assert.That(sheet.importedWithWarnings, Is.False);
        }

        [UnityTest] public IEnumerator InputInvalidStatePaintsTheAuthoredBorderColor()
        {
            var root = EditorRoot();
            var scope = new VisualElement(); Theme.Attach(scope); root.Add(scope);
            var input = new FullStackDS.Input(); scope.Add(input);
            yield return Settle();
            ColorIs(input.resolvedStyle.borderTopColor, "#a0a0a1", "default input border");
            input.Invalid = true; yield return Settle();
            ColorIs(input.resolvedStyle.borderTopColor, "#b31b1b", "invalid input border");
            input.Invalid = false; yield return Settle();
            ColorIs(input.resolvedStyle.borderTopColor, "#a0a0a1", "restored input border");
        }

        [UnityTest] public IEnumerator PassiveTextAndRuleComposeWithTokenBackedStyles()
        {
            var root = EditorRoot();
            var scope = new VisualElement(); Theme.Attach(scope); root.Add(scope);
            var text = new Text { text = "Menu settings", Variant = "caption" };
            var composed = new UnityEngine.UIElements.Label("Composed child"); text.Add(composed);
            var horizontal = new Divider();
            scope.Add(text); scope.Add(horizontal);
            var row = new VisualElement { style = { flexDirection = FlexDirection.Row, height = 80 } };
            var vertical = new Divider { Orientation = "vertical" };
            row.Add(new UnityEngine.UIElements.Label("Left")); row.Add(vertical); row.Add(new UnityEngine.UIElements.Label("Right")); scope.Add(row);
            yield return Settle();
            Assert.That(text.text, Is.EqualTo("Menu settings"));
            Assert.That(composed.parent, Is.EqualTo(text.contentContainer));
            Assert.That(text.resolvedStyle.fontSize, Is.EqualTo(12).Within(.01)); // core.typography.ramp.2
            ColorIs(text.resolvedStyle.color, "#141414", "light text");
            Assert.That(horizontal.resolvedStyle.borderTopWidth, Is.EqualTo(1)); // semantic.shape.control.border.default.width
            ColorIs(horizontal.resolvedStyle.borderTopColor, "#d0d0d0", "light rule");
            Assert.That(vertical.ClassListContains("divider--vertical"), Is.True);
            Assert.That(vertical.resolvedStyle.borderTopWidth, Is.EqualTo(0));
            Assert.That(vertical.resolvedStyle.borderLeftWidth, Is.EqualTo(1));
            Assert.That(vertical.resolvedStyle.marginLeft, Is.EqualTo(8)); // core.spacing.size.04
            Assert.That(vertical.layout.height, Is.GreaterThan(60), "vertical rule stretches in a row");

            text.Variant = "display"; text.Size = "xl"; text.Weight = "bold";
            Theme.SetDark(scope, true); yield return Settle();
            Assert.That(text.ClassListContains("text--display"), Is.True);
            Assert.That(text.ClassListContains("text--xl"), Is.True);
            Assert.That(text.resolvedStyle.fontSize, Is.EqualTo(20).Within(.01)); // text.size.xl
            Assert.That(text.resolvedStyle.unityFontStyleAndWeight, Is.EqualTo(FontStyle.Bold));
            ColorIs(text.resolvedStyle.color, "#fafafa", "dark text");
            ColorIs(horizontal.resolvedStyle.borderTopColor, "#474647", "dark rule");
            ColorIs(vertical.resolvedStyle.borderLeftColor, "#474647", "dark vertical rule");
        }

        [UnityTest] public IEnumerator ThemeScopeSelectsTheTokenValuesOfTheControlsInsideIt()
        {
            var root = EditorRoot();
            var light = new VisualElement(); Theme.Attach(light);
            var dark = new VisualElement(); Theme.SetDark(dark, true);
            root.Add(light); root.Add(dark);
            var control = new Switch(); control.Add(new UnityEngine.UIElements.Label("Sound"));
            dark.Add(control); yield return Settle();
            ColorIs(control.Track.resolvedStyle.backgroundColor, "#474647", "dark track"); // semantic.color.background.tertiary (dark)
            light.Add(control); yield return Settle();
            ColorIs(control.Track.resolvedStyle.backgroundColor, "#d0d0d0", "light track"); // semantic.color.background.tertiary (light)
            control.Checked = true; yield return Settle();
            ColorIs(control.Track.resolvedStyle.backgroundColor, "#d92d2e", "light checked track"); // semantic.color.foreground.accent (light)
            dark.Add(control); yield return Settle();
            ColorIs(control.Track.resolvedStyle.backgroundColor, "#e55b5a", "dark checked track"); // semantic.color.foreground.accent (dark)
            Theme.SetBrand(dark, "canary"); yield return Settle();
            ColorIs(control.Track.resolvedStyle.backgroundColor, "#d39500", "canary dark checked track"); // canary: semantic.color.foreground.accent -> core.color.palette.yellow.300 (dark)
            Theme.SetDark(dark, false); yield return Settle();
            ColorIs(control.Track.resolvedStyle.backgroundColor, "#755600", "canary light checked track"); // canary: semantic.color.foreground.accent -> core.color.palette.yellow.600 (light)
            Theme.SetBrand(dark, "not-a-brand"); yield return Settle();
            ColorIs(control.Track.resolvedStyle.backgroundColor, "#d92d2e", "undeclared brand"); // default brand, semantic.color.foreground.accent (light)
            // Outside every scope the var() fallbacks apply: the light, default-brand values.
            root.Add(control); yield return Settle();
            ColorIs(control.Track.resolvedStyle.backgroundColor, "#d92d2e", "unscoped checked track"); // semantic.color.foreground.accent (light)
        }

        [UnityTest] public IEnumerator AccordionContentBecomesOpaqueWhenOpenedWithoutAThemeScope()
        {
            var root = EditorRoot();
            var accordion = new Accordion();
            var item = new AccordionItem(); var header = new AccordionHeader();
            var trigger = new AccordionTrigger { Value = "one", text = "One" };
            var content = new AccordionContent { Value = "one" };
            content.Add(new UnityEngine.UIElements.Label("Visible body")); header.Add(trigger); item.Add(header); item.Add(content); accordion.Add(item); root.Add(accordion);
            yield return Settle();
            Assert.That(content.resolvedStyle.opacity, Is.EqualTo(0).Within(.01));
            var duration = content.resolvedStyle.transitionDuration.First();
            Assert.That(duration.unit == TimeUnit.Second ? duration.value * 1000 : duration.value, Is.EqualTo(167).Within(.01));
            accordion.Values = new[] { "one" }; yield return Settle();
            Assert.That(content.ClassListContains("is-open"), Is.True);
            Assert.That(content.resolvedStyle.display, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(content.resolvedStyle.opacity, Is.EqualTo(1).Within(.01));
            accordion.Values = Array.Empty<string>(); yield return Settle();
            Assert.That(content.resolvedStyle.opacity, Is.EqualTo(0).Within(.01));
        }

        [UnityTest] public IEnumerator FloatingContentResolvesTheScopeItsPopoverSitsIn()
        {
            var root = EditorRoot();
            var dark = new VisualElement(); Theme.SetDark(dark, true); root.Add(dark);
            var popover = new Popover(); var trigger = new PopoverTrigger { text = "Help" }; var content = new PopoverContent();
            content.Add(new UnityEngine.UIElements.Label("Body")); popover.Add(trigger); popover.Add(content); dark.Add(popover);
            yield return Frames(3);
            popover.CloseOnBlur = false; popover.Open = true; yield return Frames(4);
            Assert.That(content.parent, Is.EqualTo(root.panel.visualTree));
            ColorIs(content.resolvedStyle.backgroundColor, "#141414", "dark content"); // semantic.color.background.elevated (dark)
            ColorIs(content.resolvedStyle.borderTopColor, "#474647", "dark content border"); // semantic.color.border.subtle (dark)
            Theme.SetDark(dark, false); yield return Frames(3);
            ColorIs(content.resolvedStyle.backgroundColor, "#ffffff", "light content"); // semantic.color.background.elevated (light)
            ColorIs(content.resolvedStyle.borderTopColor, "#d0d0d0", "light content border"); // semantic.color.border.subtle (light)
            Assert.That(content.resolvedStyle.borderTopWidth, Is.EqualTo(1)); // popover content border width (contract literal)
            Assert.That(content.resolvedStyle.borderTopLeftRadius, Is.EqualTo(8)); // default brand: semantic.shape.control.radius.default
            Theme.SetBrand(dark, "default"); yield return Frames(3);
            Assert.That(content.resolvedStyle.borderTopLeftRadius, Is.EqualTo(8)); // explicit Default equals an unbranded scope
            ColorIs(content.resolvedStyle.backgroundColor, "#ffffff", "explicit default content");
            Theme.SetBrand(dark, null); yield return Frames(3);
            Assert.That(content.resolvedStyle.borderTopLeftRadius, Is.EqualTo(8)); // clearing the brand keeps Default
        }

        [UnityTest] public IEnumerator EditorControlsHaveExplicitTypographySpacingAndFocus()
        {
            window = ScriptableObject.CreateInstance<FullStackDS.Editor.ControlsShowcase>();
            window.position = new Rect(60, 60, 520, 680); window.Show();
            yield return Frames(2);
            var root = window.rootVisualElement;
            var control = root.Q<Switch>();
            Assert.That(control, Is.Not.Null);
            var track = control.Track;
            // Switch geometry and spacing (light scope: the showcase root).
            Assert.That(control.resolvedStyle.minHeight.value, Is.EqualTo(32)); // semantic.action.size.medium.min-height
            Assert.That(control.resolvedStyle.paddingTop, Is.EqualTo(4)); // semantic.action.size.medium.padding-block
            Assert.That(control.resolvedStyle.paddingLeft, Is.EqualTo(8)); // semantic.action.size.medium.padding-inline
            Assert.That(track.resolvedStyle.width, Is.EqualTo(48)); // core.spacing.size.09 (switch.size.md.track.width)
            Assert.That(track.resolvedStyle.height, Is.EqualTo(24)); // core.spacing.size.07 (switch.size.md.track.height)
            Assert.That(control.Thumb.resolvedStyle.width, Is.EqualTo(16)); // core.spacing.size.06 (switch.size.md.thumb.size)
            Assert.That(track.resolvedStyle.borderLeftWidth, Is.EqualTo(1)); // switch track border width (contract literal)
            ColorIs(track.resolvedStyle.borderLeftColor, "#d0d0d0", "track border"); // semantic.color.border.subtle (light)
            // Contract anatomy: the children hole (the label) follows the track by the root gap.
            var caption = control.contentContainer.Q<UnityEngine.UIElements.Label>();
            Assert.That(caption.text, Is.EqualTo("Enable sound"));
            Assert.That(caption.worldBound.xMin - track.worldBound.xMax, Is.EqualTo(8).Within(.5)); // semantic.action.size.medium.gap
            // Accordion trigger typography; the chevron follows the trigger's children.
            var trigger = root.Q<AccordionTrigger>();
            Assert.That(trigger.resolvedStyle.fontSize, Is.EqualTo(16)); // semantic.typography.body.02
            ColorIs(trigger.resolvedStyle.color, "#141414", "accordion trigger text"); // semantic.color.foreground.primary (light)
            Assert.That(trigger.resolvedStyle.paddingLeft, Is.EqualTo(8)); // core.spacing.size.04 (accordion.spacing.paddingY)
            Assert.That(trigger.Chevron.layout.xMin, Is.GreaterThanOrEqualTo(trigger.contentContainer.layout.xMax));
            Assert.That(trigger.Chevron.layout.width, Is.EqualTo(16)); // semantic.glyph.size.medium.extent (accordion.icon.size)
            // The hidden form control's focus is drawn on the track from the focus-ring tokens (host is-focus).
            control.Trigger.Focus(); yield return Frames(2);
            Assert.That(control.ClassListContains("is-focus"), Is.True);
            Assert.That(track.resolvedStyle.borderLeftWidth, Is.EqualTo(2)); // semantic.focus.ring.width
            ColorIs(track.resolvedStyle.borderLeftColor, "#d92d2e", "focus ring"); // default-brand semantic.focus.ring.color (light)
            control.Trigger.Blur(); yield return Frames(2);
            Assert.That(track.resolvedStyle.borderLeftWidth, Is.EqualTo(1));
            // The colour change is animated by the contract's motion token.
            var duration = track.resolvedStyle.transitionDuration.First();
            Assert.That(duration.unit == TimeUnit.Second ? duration.value * 1000 : duration.value, Is.EqualTo(100).Within(.01)); // semantic.motion.interaction.press.duration
            // The size variant's modifier carriers resize the track, thumb and root.
            control.Size = "lg"; yield return Settle();
            Assert.That(control.ClassListContains("switch--lg"), Is.True);
            Assert.That(track.resolvedStyle.width, Is.EqualTo(64)); // core.spacing.size.10 (switch.size.lg.track.width)
            Assert.That(track.resolvedStyle.height, Is.EqualTo(32)); // core.spacing.size.08 (switch.size.lg.track.height)
            Assert.That(control.Thumb.resolvedStyle.width, Is.EqualTo(24)); // core.spacing.size.07 (switch.size.lg.thumb.size)
            Assert.That(control.resolvedStyle.minHeight.value, Is.EqualTo(48)); // semantic.action.size.large.min-height
            Assert.That(control.resolvedStyle.paddingLeft, Is.EqualTo(16)); // semantic.action.size.large.padding-inline
        }

        [UnityTest] public IEnumerator SwitchThumbIsCentredOnTheTrackAndTranslatedWhenChecked()
        {
            var root = EditorRoot();
            var scope = new VisualElement(); Theme.Attach(scope); root.Add(scope);
            var control = new Switch(); control.Add(new UnityEngine.UIElements.Label("Sound")); scope.Add(control);
            yield return Settle();
            var track = control.Track; var thumb = control.Thumb;
            // Offsets from the track's left edge: border 1 + left core.spacing.size.01 (switch.size.<size>.track.padding),
            // plus switch.size.<size>.thumb.translate.on while checked; the cross axis is top 50% with translate -50%.
            string Where() => $"thumb {thumb.worldBound} translate {thumb.resolvedStyle.translate}, track {track.worldBound}";
            Assert.That(thumb.worldBound.center.y, Is.EqualTo(track.worldBound.center.y).Within(.5), "md unchecked: " + Where());
            Assert.That(thumb.worldBound.xMin - track.worldBound.xMin, Is.EqualTo(1 + 1).Within(.5), "md unchecked: " + Where()); // translate.off 0
            control.Checked = true; yield return Settle();
            Assert.That(thumb.worldBound.center.y, Is.EqualTo(track.worldBound.center.y).Within(.5), "md checked: " + Where());
            Assert.That(thumb.worldBound.xMin - track.worldBound.xMin, Is.EqualTo(1 + 1 + 24).Within(.5), "md checked: " + Where()); // switch.size.md.thumb.translate.on 24px
            control.Size = "lg"; yield return Settle();
            Assert.That(thumb.worldBound.center.y, Is.EqualTo(track.worldBound.center.y).Within(.5), "lg checked: " + Where());
            Assert.That(thumb.worldBound.xMin - track.worldBound.xMin, Is.EqualTo(1 + 1 + 36).Within(.5), "lg checked: " + Where()); // switch.size.lg.thumb.translate.on 36px
            control.Size = "sm"; control.Checked = false; yield return Settle();
            Assert.That(thumb.worldBound.center.y, Is.EqualTo(track.worldBound.center.y).Within(.5), "sm unchecked: " + Where());
            Assert.That(thumb.worldBound.xMin - track.worldBound.xMin, Is.EqualTo(1 + 1).Within(.5), "sm unchecked: " + Where()); // switch.size.sm.thumb.translate.off 0
        }

        private UIDocument Runtime(int width, int height)
        {
            texture = new RenderTexture(width, height, 24); texture.Create();
            settings = ScriptableObject.CreateInstance<PanelSettings>();
            settings.themeStyleSheet = TestAssets.RuntimeTheme();
            settings.scaleMode = PanelScaleMode.ConstantPixelSize;
            settings.targetTexture = texture;
            settings.clearColor = true;
            settings.colorClearValue = new Color32(23, 29, 41, 255);
            host = new GameObject("FSDS runtime style witness");
            var document = host.AddComponent<UIDocument>();
            document.panelSettings = settings;
            document.visualTreeAsset = TestAssets.SampleControls();
            return document;
        }
        private void Capture(string name)
        {
            // Visual evidence for the lane that asks for it; a consumer's test run writes no images.
            var dir = Environment.GetEnvironmentVariable("FSDS_UNITY_SCREENSHOTS");
            if (string.IsNullOrEmpty(dir)) return;
            var previous = RenderTexture.active;
            var pixels = new Texture2D(texture.width, texture.height, TextureFormat.RGBA32, false);
            try {
                RenderTexture.active = texture;
                pixels.ReadPixels(new Rect(0, 0, texture.width, texture.height), 0, 0); pixels.Apply();
                Directory.CreateDirectory(dir); File.WriteAllBytes(Path.Combine(dir, name + ".png"), pixels.EncodeToPNG());
            } finally { RenderTexture.active = previous; UnityEngine.Object.DestroyImmediate(pixels); }
        }
        private int CountPixels(Rect world, Func<Color, bool> matches)
        {
            var previous = RenderTexture.active;
            var pixels = new Texture2D(texture.width, texture.height, TextureFormat.RGBA32, false);
            try {
                RenderTexture.active = texture;
                pixels.ReadPixels(new Rect(0, 0, texture.width, texture.height), 0, 0); pixels.Apply();
                var count = 0;
                var x0 = Mathf.Max(0, Mathf.FloorToInt(world.xMin));
                var x1 = Mathf.Min(texture.width, Mathf.CeilToInt(world.xMax));
                var y0 = Mathf.Max(0, texture.height - Mathf.CeilToInt(world.yMax));
                var y1 = Mathf.Min(texture.height, texture.height - Mathf.FloorToInt(world.yMin));
                for (var y = y0; y < y1; y++)
                    for (var x = x0; x < x1; x++)
                        if (matches(pixels.GetPixel(x, y))) count++;
                return count;
            } finally { RenderTexture.active = previous; UnityEngine.Object.DestroyImmediate(pixels); }
        }
        [UnityTest] public IEnumerator SpinnerPaintsSourceBoundGeometryAndThemeColors()
        {
            TestAssets.StageSample();
            yield return new EnterPlayMode();
            var document = Runtime(160, 160); yield return Settle();
            var root = document.rootVisualElement;
            root.Clear();
            var scope = new VisualElement { style = { width = 160, height = 160 } };
            Theme.Attach(scope); root.Add(scope);
            var spinner = new Spinner { Size = "lg", Thickness = "bold", ReducedMotion = true };
            spinner.style.position = Position.Absolute;
            spinner.style.left = 64;
            spinner.style.top = 64;
            scope.Add(spinner); yield return Settle();
            Assert.That(spinner.Visual.resolvedStyle.width, Is.EqualTo(24f).Within(.5f));
            Assert.That(spinner.Visual.resolvedStyle.height, Is.EqualTo(24f).Within(.5f));
            Assert.That(spinner.Visual.resolvedStyle.borderTopWidth, Is.EqualTo(4f).Within(.5f));
            ColorIs(spinner.Visual.resolvedStyle.borderTopColor, "#d92d2e", "spinner accent");
            ColorIs(spinner.Visual.resolvedStyle.borderBottomColor, "#d0d0d0", "spinner track");
            Assert.That(CountPixels(spinner.Visual.worldBound, c => c.r > .55f && c.r > c.g * 1.8f && c.g < .35f), Is.GreaterThan(2), "accent border painted no red pixels");
            Assert.That(CountPixels(spinner.Visual.worldBound, c => c.r > .55f && Mathf.Abs(c.r - c.g) < .08f && Mathf.Abs(c.g - c.b) < .08f), Is.GreaterThan(6), "track border painted no grey pixels");
            var bounds = spinner.Visual.worldBound;
            var topHalf = new Rect(bounds.xMin, bounds.yMin, bounds.width, bounds.height * .5f);
            var staticTopRed = CountPixels(topHalf, c => c.r > .55f && c.r > c.g * 1.8f && c.g < .35f);
            spinner.ReducedMotion = false;
            var deadline = Time.realtimeSinceStartup + 2f;
            while (Time.realtimeSinceStartup < deadline &&
                   (spinner.Visual.style.rotate.value.angle.value < 70f || spinner.Visual.style.rotate.value.angle.value > 110f))
                yield return null;
            Assert.That(spinner.Visual.style.rotate.value.angle.value, Is.InRange(70f, 110f), "declared loop did not reach a quarter turn");
            yield return null;
            Assert.That(CountPixels(topHalf, c => c.r > .55f && c.r > c.g * 1.8f && c.g < .35f), Is.LessThan(staticTopRed), "painted accent did not move with the declared loop");
            spinner.ReducedMotion = true;
            Assert.That(spinner.Visual.style.rotate.value.angle.value, Is.EqualTo(0f).Within(.001f));
            Theme.SetBrand(scope, "corporate"); yield return Settle();
            ColorIs(spinner.Visual.resolvedStyle.borderTopColor, "#0566fe", "corporate spinner accent");
            Assert.That(CountPixels(spinner.Visual.worldBound, c => c.b > .55f && c.b > c.r * 2f && c.b > c.g * 1.2f), Is.GreaterThan(2), "corporate accent did not change painted pixels");
            spinner.Size = "xs"; spinner.Thickness = "hairline"; yield return Settle();
            Assert.That(spinner.Visual.resolvedStyle.width, Is.EqualTo(12f).Within(.5f));
            Assert.That(spinner.Visual.resolvedStyle.height, Is.EqualTo(12f).Within(.5f));
            Assert.That(spinner.Visual.resolvedStyle.borderTopWidth, Is.EqualTo(2f).Within(.5f));
        }
        [UnityTest] public IEnumerator PlayerThemeReachesControlsAndPortaledContent()
        {
            TestAssets.StageSample();
            yield return new EnterPlayMode();
            var doc = Runtime(640, 800); yield return Settle();
            var root = doc.rootVisualElement;
            Assert.That(root.panel.contextType, Is.EqualTo(ContextType.Player));
            Assert.That(root.worldBound.width, Is.EqualTo(640).Within(1));
            var scope = root.Q<ScrollView>(className: Theme.ScopeClass);
            Assert.That(scope, Is.Not.Null, "the sample root is the theme scope");
            var sound = root.Q<Switch>("sound");
            var trigger = root.Q<AccordionTrigger>();
            var tabs = root.Q<Tabs>("pages");
            var list = root.Q<TabsList>();
            // Light (the sample's scope without the dark class).
            ColorIs(sound.Track.resolvedStyle.backgroundColor, "#d92d2e", "checked track"); // semantic.color.foreground.accent (light)
            ColorIs(trigger.resolvedStyle.color, "#141414", "accordion trigger"); // semantic.color.foreground.primary (light)
            ColorIs(tabs.Group.Triggers[1].resolvedStyle.color, "#141414", "tab"); // semantic.color.foreground.primary (light)
            ColorIs(tabs.Group.Triggers[2].resolvedStyle.color, "#727272", "disabled tab"); // semantic.color.foreground.disabled (light)
            ColorIs(list.resolvedStyle.borderBottomColor, "#d92d2e", "tab list rule"); // semantic.color.border.accent (light)
            Assert.That(tabs.Group.Triggers[0].resolvedStyle.paddingLeft, Is.EqualTo(8)); // core.spacing.size.04 (tabs.spacing.padding)
            // The tab strip is a row: each tab starts right of the previous one on the same line.
            Rect first = tabs.Group.Triggers[0].worldBound, second = tabs.Group.Triggers[1].worldBound;
            Assert.That(second.xMin, Is.GreaterThanOrEqualTo(first.xMax)); Assert.That(second.yMin, Is.EqualTo(first.yMin).Within(1));
            Capture("runtime-controls-640");
            var surface = root.Q<Popover>("help"); surface.CloseOnBlur = false; surface.Open = true;
            yield return Frames();
            Assert.That(surface.Content.parent, Is.EqualTo(root.panel.visualTree));
            ColorIs(surface.Content.resolvedStyle.backgroundColor, "#ffffff", "popover content"); // semantic.color.background.elevated (light)
            var label = surface.Content.Q<UnityEngine.UIElements.Label>();
            Assert.That(label.resolvedStyle.whiteSpace, Is.EqualTo(WhiteSpace.Normal));
            Assert.That(label.worldBound.xMax, Is.LessThanOrEqualTo(surface.Content.worldBound.xMax));
            Assert.That(surface.Content.worldBound.xMax, Is.LessThanOrEqualTo(641));
            Assert.That(surface.Content.worldBound.yMax, Is.LessThanOrEqualTo(801));
            Capture("runtime-popover-640");
            // Dark: one class on the sample's scope reaches the controls and the floating content.
            Theme.SetDark(scope, true); yield return Settle();
            ColorIs(sound.Track.resolvedStyle.backgroundColor, "#e55b5a", "dark checked track"); // semantic.color.foreground.accent (dark)
            ColorIs(trigger.resolvedStyle.color, "#fafafa", "dark accordion trigger"); // semantic.color.foreground.primary (dark)
            ColorIs(tabs.Group.Triggers[1].resolvedStyle.color, "#fafafa", "dark tab"); // semantic.color.foreground.primary (dark)
            ColorIs(tabs.Group.Triggers[2].resolvedStyle.color, "#888889", "dark disabled tab"); // semantic.color.foreground.disabled (dark)
            ColorIs(list.resolvedStyle.borderBottomColor, "#e55b5a", "dark tab list rule"); // semantic.color.border.accent (dark)
            ColorIs(surface.Content.resolvedStyle.backgroundColor, "#141414", "dark popover content"); // semantic.color.background.elevated (dark)
            Capture("runtime-popover-640-dark");
            surface.Open = false; yield return Frames();
            Capture("runtime-controls-640-dark");
        }
        [UnityTest] public IEnumerator NarrowPlayerSurfaceWrapsAndScrollsWithoutEscapingViewport()
        {
            TestAssets.StageSample();
            yield return new EnterPlayMode();
            var doc = Runtime(320, 600); yield return Frames();
            Capture("runtime-controls-320");
            var sample = doc.rootVisualElement.Q<ScrollView>();
            // The sample alone fits 320x600 under the token geometry; wrapped consumer text above the
            // controls pushes the Popover below the fold so reaching it requires scrolling.
            var body = sample.Q(className: "fsds-sample-body");
            for (int i = 0; i < 6; i++) body.Insert(2, new UnityEngine.UIElements.Label("Consumer text above the controls wraps at the narrow width and pushes them below the fold."));
            yield return Frames();
            Assert.That(sample.verticalScroller.highValue, Is.GreaterThan(0));
            Assert.That(doc.rootVisualElement.Q<Popover>("help").Trigger.worldBound.yMin, Is.GreaterThan(600), "the Popover starts below the fold");
            sample.scrollOffset = new Vector2(0, sample.verticalScroller.highValue); yield return Frames();
            Assert.That(doc.rootVisualElement.Q<Popover>("help").Trigger.worldBound.yMax, Is.LessThanOrEqualTo(601));
            var surface = doc.rootVisualElement.Q<Popover>("help");
            surface.CloseOnBlur = false;
            for (int i = 0; i < 12; i++) surface.Content.Add(new UnityEngine.UIElements.Label("A long content paragraph must wrap within a narrow floating surface and remain reachable by scrolling."));
            surface.Open = true; yield return Frames(15);
            Rect bounds = surface.Content.worldBound;
            Assert.That(bounds.width, Is.LessThanOrEqualTo(304.5));
            Assert.That(bounds.height, Is.LessThanOrEqualTo(584.5));
            Assert.That(bounds.xMin, Is.GreaterThanOrEqualTo(-.5));
            Assert.That(bounds.yMin, Is.GreaterThanOrEqualTo(-.5));
            Assert.That(bounds.xMax, Is.LessThanOrEqualTo(320.5));
            Assert.That(bounds.yMax, Is.LessThanOrEqualTo(600.5));
            var scroll = (ScrollView)surface.Content;
            Assert.That(scroll.verticalScroller.highValue, Is.GreaterThan(0));
            var label = surface.Content.Q<UnityEngine.UIElements.Label>();
            Assert.That(label.worldBound.xMax, Is.LessThanOrEqualTo(bounds.xMax));
            Capture("runtime-popover-320");
            scroll.scrollOffset = new Vector2(0, scroll.verticalScroller.highValue); yield return Frames();
            Assert.That(scroll.scrollOffset.y, Is.GreaterThan(0));
        }
    }
}
