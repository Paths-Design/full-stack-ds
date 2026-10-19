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
    /// <summary>Resolved styles under the generated Controls.uss. Every literal is a token-graph value read from
    /// packages/ds-tokens/generated/resolved.tokens.json (theme named beside it; brand values from the
    /// brand layer the token build composes), so a drift between the projection and the graph fails here.
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
            var sheet = FullStackDS.Editor.ControlsShowcase.SampleStyleSheet();
            Assert.That(sheet, Is.Not.Null);
            Assert.That(AssetDatabase.GetAssetPath(sheet), Is.EqualTo("Assets/InteractiveControls/Sample.uss"));
            Assert.That(sheet.importedWithErrors, Is.False);
            Assert.That(sheet.importedWithWarnings, Is.False);
        }

        [UnityTest] public IEnumerator ThemeScopeSelectsTheTokenValuesOfTheControlsInsideIt()
        {
            var root = EditorRoot();
            var light = new VisualElement(); Theme.Attach(light);
            var dark = new VisualElement(); Theme.SetDark(dark, true);
            root.Add(light); root.Add(dark);
            var control = new Switch(); control.Add(new Label("Sound"));
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

        [UnityTest] public IEnumerator FloatingContentResolvesTheScopeItsPopoverSitsIn()
        {
            var root = EditorRoot();
            var dark = new VisualElement(); Theme.SetDark(dark, true); root.Add(dark);
            var popover = new Popover(); var trigger = new PopoverTrigger { text = "Help" }; var content = new PopoverContent();
            content.Add(new Label("Body")); popover.Add(trigger); popover.Add(content); dark.Add(popover);
            yield return Frames(3);
            popover.CloseOnBlur = false; popover.Open = true; yield return Frames(4);
            Assert.That(content.parent, Is.EqualTo(root.panel.visualTree));
            ColorIs(content.resolvedStyle.backgroundColor, "#141414", "dark content"); // semantic.color.background.elevated (dark)
            ColorIs(content.resolvedStyle.borderTopColor, "#474647", "dark content border"); // semantic.color.border.subtle (dark)
            Theme.SetDark(dark, false); yield return Frames(3);
            ColorIs(content.resolvedStyle.backgroundColor, "#ffffff", "light content"); // semantic.color.background.elevated (light)
            ColorIs(content.resolvedStyle.borderTopColor, "#d0d0d0", "light content border"); // semantic.color.border.subtle (light)
            Assert.That(content.resolvedStyle.borderTopWidth, Is.EqualTo(1)); // popover content border width (contract literal)
            Assert.That(content.resolvedStyle.borderTopLeftRadius, Is.EqualTo(6)); // semantic.shape.control.radius.default
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
            var caption = control.contentContainer.Q<Label>();
            Assert.That(caption.text, Is.EqualTo("Enable sound"));
            Assert.That(caption.worldBound.xMin - track.worldBound.xMax, Is.EqualTo(8).Within(.5)); // semantic.action.size.medium.gap
            // Accordion trigger typography; the chevron follows the trigger's children.
            var trigger = root.Q<AccordionTrigger>();
            Assert.That(trigger.resolvedStyle.fontSize, Is.EqualTo(16)); // semantic.typography.body.02
            ColorIs(trigger.resolvedStyle.color, "#141414", "accordion trigger text"); // semantic.color.foreground.primary (light)
            Assert.That(trigger.resolvedStyle.paddingLeft, Is.EqualTo(8)); // core.spacing.size.04 (accordion.spacing.paddingY)
            Assert.That(trigger.Chevron.layout.xMin, Is.GreaterThanOrEqualTo(trigger.contentContainer.layout.xMax));
            Assert.That(trigger.Chevron.layout.width, Is.EqualTo(8)); // core.spacing.size.04 (accordion.icon.size)
            // The hidden form control's focus is drawn on the track from the focus-ring tokens (host is-focus).
            control.Trigger.Focus(); yield return Frames(2);
            Assert.That(control.ClassListContains("is-focus"), Is.True);
            Assert.That(track.resolvedStyle.borderLeftWidth, Is.EqualTo(2)); // semantic.focus.ring.width
            ColorIs(track.resolvedStyle.borderLeftColor, "#0566fe", "focus ring"); // semantic.focus.ring.color (light)
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
            var control = new Switch(); control.Add(new Label("Sound")); scope.Add(control);
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
            settings.themeStyleSheet = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>("Assets/RuntimeTheme.tss");
            Assert.That(settings.themeStyleSheet, Is.Not.Null);
            settings.scaleMode = PanelScaleMode.ConstantPixelSize;
            settings.targetTexture = texture;
            settings.clearColor = true;
            settings.colorClearValue = new Color32(23, 29, 41, 255);
            host = new GameObject("FSDS runtime style witness");
            var document = host.AddComponent<UIDocument>();
            document.panelSettings = settings;
            document.visualTreeAsset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/InteractiveControls/Controls.uxml");
            Assert.That(document.visualTreeAsset, Is.Not.Null);
            return document;
        }
        private void Capture(string name)
        {
            var previous = RenderTexture.active;
            var pixels = new Texture2D(texture.width, texture.height, TextureFormat.RGBA32, false);
            try {
                RenderTexture.active = texture;
                pixels.ReadPixels(new Rect(0, 0, texture.width, texture.height), 0, 0); pixels.Apply();
                var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "../../screenshots"));
                Directory.CreateDirectory(dir); File.WriteAllBytes(Path.Combine(dir, name + ".png"), pixels.EncodeToPNG());
            } finally { RenderTexture.active = previous; UnityEngine.Object.DestroyImmediate(pixels); }
        }
        [UnityTest] public IEnumerator PlayerThemeReachesControlsAndPortaledContent()
        {
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
            var label = surface.Content.Q<Label>();
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
            yield return new EnterPlayMode();
            var doc = Runtime(320, 600); yield return Frames();
            Capture("runtime-controls-320");
            var sample = doc.rootVisualElement.Q<ScrollView>();
            // The sample alone fits 320x600 under the token geometry; wrapped consumer text above the
            // controls pushes the Popover below the fold so reaching it requires scrolling.
            var body = sample.Q(className: "fsds-sample-body");
            for (int i = 0; i < 6; i++) body.Insert(2, new Label("Consumer text above the controls wraps at the narrow width and pushes them below the fold."));
            yield return Frames();
            Assert.That(sample.verticalScroller.highValue, Is.GreaterThan(0));
            Assert.That(doc.rootVisualElement.Q<Popover>("help").Trigger.worldBound.yMin, Is.GreaterThan(600), "the Popover starts below the fold");
            sample.scrollOffset = new Vector2(0, sample.verticalScroller.highValue); yield return Frames();
            Assert.That(doc.rootVisualElement.Q<Popover>("help").Trigger.worldBound.yMax, Is.LessThanOrEqualTo(601));
            var surface = doc.rootVisualElement.Q<Popover>("help");
            surface.CloseOnBlur = false;
            for (int i = 0; i < 12; i++) surface.Content.Add(new Label("A long content paragraph must wrap within a narrow floating surface and remain reachable by scrolling."));
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
            var label = surface.Content.Q<Label>();
            Assert.That(label.worldBound.xMax, Is.LessThanOrEqualTo(bounds.xMax));
            Capture("runtime-popover-320");
            scroll.scrollOffset = new Vector2(0, scroll.verticalScroller.highValue); yield return Frames();
            Assert.That(scroll.scrollOffset.y, Is.GreaterThan(0));
        }
    }
}
