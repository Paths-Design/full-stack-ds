using System;
using System.Collections;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace FullStackDS.Tests
{
    public class GlyphTests
    {
        private GameObject host;
        private PanelSettings settings;
        private RenderTexture texture;

        [UnityTearDown] public IEnumerator Cleanup()
        {
            if (Application.isPlaying) yield return new ExitPlayMode();
            if (host != null) UnityEngine.Object.DestroyImmediate(host);
            if (settings != null) UnityEngine.Object.DestroyImmediate(settings);
            if (texture != null) {
                texture.Release();
                UnityEngine.Object.DestroyImmediate(texture);
            }
        }

        private static IEnumerator Frames()
        {
            for (int i = 0; i < 8; i++) yield return null;
        }

        [Test] public void UnknownNamesClearAndValidNamesRecover()
        {
            var glyph = new GlyphElement { GlyphName = "check", PixelSize = 20 };
            Assert.That(glyph.HasGlyph, Is.True);
            Assert.That(glyph.SelectedViewBox, Is.EqualTo(new Rect(0, 0, 16, 16)));
            glyph.PixelSize = 24;
            Assert.That(glyph.SelectedViewBox, Is.EqualTo(new Rect(0, 0, 24, 24)));
            glyph.GlyphName = "unknown-glyph";
            Assert.That(glyph.HasGlyph, Is.False);
            Assert.That(glyph.SelectedViewBox, Is.EqualTo(Rect.zero));
            glyph.GlyphName = "check";
            Assert.That(glyph.HasGlyph, Is.True);
            glyph.GlyphName = null;
            Assert.That(glyph.HasGlyph, Is.False);
        }

        [Test] public void FrameSizeRejectsInvalidValues()
        {
            var glyph = new GlyphElement();
            foreach (var size in new[] { 0f, -1f, float.NaN, float.PositiveInfinity })
                Assert.Throws<ArgumentOutOfRangeException>(() => glyph.PixelSize = size);
            Assert.That(glyph.PixelSize, Is.EqualTo(20));
        }

        [UnityTest] public IEnumerator StandaloneIconLoadsStylesWithoutThemeScope()
        {
            yield return new EnterPlayMode();
            var root = Runtime();
            var icon = new Icon { Name = "check" };
            root.Add(icon);
            yield return Frames();
            Assert.That(icon.styleSheets.count, Is.EqualTo(1));
            Assert.That(icon.layout.width, Is.EqualTo(20).Within(.01));
            Assert.That(icon.layout.height, Is.EqualTo(20).Within(.01));
            Assert.That(icon.Q<GlyphElement>().HasGlyph, Is.True);
        }

        [UnityTest] public IEnumerator UxmlIconAndRenamedReferenceSurviveReload()
        {
            yield return new EnterPlayMode();
            var root = Runtime();
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/GlyphFixture.uxml");
            Assert.That(asset, Is.Not.Null);
            for (int reload = 0; reload < 2; reload++) {
                root.Clear();
                asset.CloneTree(root);
                yield return Frames();
                var direct = root.Q<Icon>();
                Assert.That(direct, Is.Not.Null);
                Assert.That(direct.Name, Is.EqualTo("check"));
                Assert.That(direct.Size, Is.EqualTo("xl"));
                Assert.That(direct.Q<GlyphElement>().HasGlyph, Is.True);
                var synthetic = root.Q(className: "accordion");
                Assert.That(synthetic, Is.Not.Null);
                var nested = synthetic.Q<Icon>();
                Assert.That(nested, Is.Not.Null);
                Assert.That(nested.Name, Is.EqualTo("chevron-down"));
                Assert.That(nested.Q<GlyphElement>().HasGlyph, Is.True);
                nested.style.color = Color.magenta;
                yield return Frames();
                Assert.That(nested.Q<GlyphElement>().resolvedStyle.color, Is.EqualTo(Color.magenta));
            }
        }

        private VisualElement Runtime()
        {
            texture = new RenderTexture(64, 64, 24);
            texture.Create();
            settings = ScriptableObject.CreateInstance<PanelSettings>();
            settings.themeStyleSheet =
                AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>("Assets/RuntimeTheme.tss");
            Assert.That(settings.themeStyleSheet, Is.Not.Null);
            settings.scaleMode = PanelScaleMode.ConstantPixelSize;
            settings.targetTexture = texture;
            settings.clearColor = true;
            settings.colorClearValue = Color.black;
            host = new GameObject("Glyph pixel witness");
            var document = host.AddComponent<UIDocument>();
            document.panelSettings = settings;
            return document.rootVisualElement;
        }

        private int Pixels(Func<Color, bool> matches)
        {
            var previous = RenderTexture.active;
            var image = new Texture2D(64, 64, TextureFormat.RGBA32, false);
            try {
                RenderTexture.active = texture;
                image.ReadPixels(new Rect(0, 0, 64, 64), 0, 0);
                image.Apply();
                int count = 0;
                foreach (var color in image.GetPixels())
                    if (matches(color)) count++;
                return count;
            } finally {
                RenderTexture.active = previous;
                UnityEngine.Object.DestroyImmediate(image);
            }
        }

        [UnityTest] public IEnumerator PixelsTrackInheritedColorUnknownClearingAndRecovery()
        {
            yield return new EnterPlayMode();
            var root = Runtime();
            var scope = new VisualElement {
                style = { color = Color.red, width = 64, height = 64 }
            };
            root.Add(scope);
            var icon = new Icon { Name = "check", Size = "xl" };
            icon.style.position = Position.Absolute;
            icon.style.left = 16;
            icon.style.top = 16;
            scope.Add(icon);
            yield return Frames();
            var glyph = icon.Q<GlyphElement>();
            Assert.That(root.panel.contextType, Is.EqualTo(ContextType.Player));
            Assert.That(glyph, Is.Not.Null);
            Assert.That(glyph.layout.width, Is.EqualTo(32).Within(.01));
            Assert.That(glyph.SelectedViewBox.width, Is.EqualTo(24));
            Assert.That(Pixels(c => c.r > .6f && c.g < .2f && c.b < .2f && c.a > .9f),
                Is.GreaterThan(10), "authored geometry must paint opaque red pixels");

            scope.style.color = Color.green;
            yield return Frames();
            Assert.That(Pixels(c => c.g > .6f && c.r < .2f && c.b < .2f && c.a > .9f),
                Is.GreaterThan(10), "inherited color must repaint existing geometry");
            Assert.That(Pixels(c => c.r > .6f && c.g < .2f), Is.Zero);

            icon.Name = "unknown-glyph";
            yield return Frames();
            Assert.That(glyph.HasGlyph, Is.False);
            Assert.That(Pixels(c => c.r > .2f || c.g > .2f || c.b > .2f), Is.Zero,
                "unknown names must erase the previously retained mesh");

            icon.Name = "check";
            icon.Size = "sm";
            var blue = new VisualElement {
                style = { color = Color.blue, width = 64, height = 64 }
            };
            root.Add(blue);
            blue.Add(icon);
            yield return Frames();
            Assert.That(glyph.layout.width, Is.EqualTo(16).Within(.01));
            Assert.That(glyph.SelectedViewBox.width, Is.EqualTo(16));
            Assert.That(Pixels(c => c.b > .6f && c.r < .2f && c.g < .2f && c.a > .9f),
                Is.GreaterThan(5), "recovery and reparenting must paint new inherited color");
        }
    }
}
