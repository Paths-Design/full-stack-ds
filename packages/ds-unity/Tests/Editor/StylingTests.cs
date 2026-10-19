using System;
using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace FullStackDS.Tests
{
    public class StylingTests
    {
        private EditorWindow window;
        private GameObject host;
        private PanelSettings settings;
        private RenderTexture texture;
        private static Color Text => new Color32(238, 241, 247, 255);
        private static Color Surface => new Color32(34, 43, 58, 255);
        private static void ColorIs(Color actual, Color expected)
        {
            Assert.That(actual.r, Is.EqualTo(expected.r).Within(.005));
            Assert.That(actual.g, Is.EqualTo(expected.g).Within(.005));
            Assert.That(actual.b, Is.EqualTo(expected.b).Within(.005));
            Assert.That(actual.a, Is.EqualTo(expected.a).Within(.005));
        }
        [UnityTearDown] public IEnumerator Cleanup()
        {
            if (window != null) window.Close();
            if (Application.isPlaying) yield return new ExitPlayMode();
            if (host != null) UnityEngine.Object.DestroyImmediate(host);
            if (settings != null) UnityEngine.Object.DestroyImmediate(settings);
            if (texture != null) { texture.Release(); UnityEngine.Object.DestroyImmediate(texture); }
        }
        [UnityTest] public IEnumerator EditorControlsHaveExplicitTypographySpacingAndFocus()
        {
            window = ScriptableObject.CreateInstance<FullStackDS.Editor.ControlsShowcase>();
            window.position = new Rect(60, 60, 520, 680); window.Show();
            yield return null; yield return null;
            var root = window.rootVisualElement;
            var control = root.Q<Switch>();
            Assert.That(control, Is.Not.Null);
            ColorIs(control.Trigger.resolvedStyle.color, Text);
            Assert.That(control.Trigger.resolvedStyle.fontSize, Is.EqualTo(16));
            Assert.That(control.Trigger.worldBound.height, Is.GreaterThanOrEqualTo(40));
            // Contract anatomy: the children hole (the label) follows the track; the chevron follows the trigger's children.
            var track = control.Q<VisualElement>("track");
            var caption = control.contentContainer.Q<Label>();
            Assert.That(caption.text, Is.EqualTo("Enable sound"));
            Assert.That(caption.worldBound.xMin - track.worldBound.xMax, Is.GreaterThanOrEqualTo(11));
            var trigger = root.Q<AccordionTrigger>();
            Assert.That(trigger.Chevron.layout.xMin - trigger.contentContainer.layout.xMax, Is.GreaterThanOrEqualTo(15));
            Assert.That(trigger.Chevron.layout.width, Is.GreaterThan(0));
            control.Trigger.Focus(); yield return null; yield return null;
            Assert.That(control.Trigger.resolvedStyle.borderLeftWidth, Is.EqualTo(2));
            ColorIs(control.Trigger.resolvedStyle.borderLeftColor, new Color32(169, 206, 255, 255));
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
        private static IEnumerator Frames(int count = 8) { for (int i = 0; i < count; i++) yield return null; }
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
            var doc = Runtime(640, 800); yield return Frames();
            var root = doc.rootVisualElement;
            Assert.That(root.panel.contextType, Is.EqualTo(ContextType.Player));
            Assert.That(root.worldBound.width, Is.EqualTo(640).Within(1));
            var sound = root.Q<Switch>("sound");
            Assert.That(sound.Trigger.resolvedStyle.fontSize, Is.EqualTo(16));
            ColorIs(sound.Trigger.resolvedStyle.color, Text);
            var tabs = root.Q<Tabs>("pages");
            Assert.That(tabs.Group.Triggers[2].resolvedStyle.opacity, Is.EqualTo(.5f).Within(.01));
            ColorIs(tabs.Group.Triggers[0].resolvedStyle.backgroundColor, new Color32(41, 91, 181, 255));
            ColorIs(tabs.Group.Triggers[1].resolvedStyle.backgroundColor, Surface);
            Capture("runtime-controls-640");
            var surface = root.Q<Popover>("help"); surface.CloseOnBlur = false; surface.Open = true;
            yield return Frames();
            Assert.That(surface.Content.parent, Is.EqualTo(root.panel.visualTree));
            ColorIs(surface.Content.resolvedStyle.backgroundColor, Surface);
            var label = surface.Content.Q<Label>();
            Assert.That(label.resolvedStyle.fontSize, Is.EqualTo(16)); ColorIs(label.resolvedStyle.color, Text);
            Assert.That(label.resolvedStyle.whiteSpace, Is.EqualTo(WhiteSpace.Normal));
            var button = surface.Content.Q<Button>();
            Assert.That(button.worldBound.height, Is.GreaterThanOrEqualTo(40)); ColorIs(button.resolvedStyle.color, Text);
            Assert.That(surface.Content.worldBound.xMax, Is.LessThanOrEqualTo(641));
            Assert.That(surface.Content.worldBound.yMax, Is.LessThanOrEqualTo(801));
            Capture("runtime-popover-640");
        }
        [UnityTest] public IEnumerator NarrowPlayerSurfaceWrapsAndScrollsWithoutEscapingViewport()
        {
            yield return new EnterPlayMode();
            var doc = Runtime(320, 600); yield return Frames();
            Capture("runtime-controls-320");
            var sample = doc.rootVisualElement.Q<ScrollView>();
            Assert.That(sample.verticalScroller.highValue, Is.GreaterThan(0));
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
