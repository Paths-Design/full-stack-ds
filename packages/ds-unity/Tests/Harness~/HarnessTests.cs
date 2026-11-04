using System;
using System.Collections;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace FullStackDS.HarnessTests
{
    /// <summary>Witnesses that need what only scripts/unity-tests.mjs creates: a contract host compiled under a
    /// new name, and the sample imported as a consumer imports it. They pin the emitter and the sample, not the
    /// package a consumer installs, so they run in the lane's staged pass and are not shipped in Tests/Editor.</summary>
    public class HarnessTests
    {
        private const string RuntimeTheme = "Packages/com.fullstackds.ui/Tests/Editor/Fixtures/RuntimeTheme.tss";
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

        private VisualElement Runtime()
        {
            texture = new RenderTexture(64, 64, 24);
            texture.Create();
            settings = ScriptableObject.CreateInstance<PanelSettings>();
            settings.themeStyleSheet = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(RuntimeTheme);
            Assert.That(settings.themeStyleSheet, Is.Not.Null);
            settings.scaleMode = PanelScaleMode.ConstantPixelSize;
            settings.targetTexture = texture;
            host = new GameObject("Renamed host witness");
            var document = host.AddComponent<UIDocument>();
            document.panelSettings = settings;
            return document.rootVisualElement;
        }

        [UnityTest] public IEnumerator RenamedContractHostComposesItsIconAcrossUxmlReload()
        {
            yield return new EnterPlayMode();
            var root = Runtime();
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/Harness/RenamedHost.uxml");
            Assert.That(asset, Is.Not.Null);
            for (int reload = 0; reload < 2; reload++) {
                root.Clear();
                asset.CloneTree(root);
                yield return Frames();
                var renamed = root.Q(className: "accordion");
                Assert.That(renamed, Is.Not.Null);
                Assert.That(renamed.GetType().Name, Is.EqualTo("SyntheticGroup"));
                var nested = renamed.Q<Icon>();
                Assert.That(nested, Is.Not.Null);
                Assert.That(nested.Name, Is.EqualTo("chevron-down"));
                Assert.That(nested.Q<GlyphElement>().HasGlyph, Is.True);
                nested.style.color = Color.magenta;
                yield return Frames();
                Assert.That(nested.Q<GlyphElement>().resolvedStyle.color, Is.EqualTo(Color.magenta));
            }
        }

        [Test] public void ImportedSampleScriptCompilesInTheConsumerAssembly()
        {
            var example = Type.GetType("FullStackDS.Samples.RuntimeExample, Assembly-CSharp");
            Assert.That(example, Is.Not.Null);
            Assert.That(typeof(MonoBehaviour).IsAssignableFrom(example), Is.True);
        }

        [Test] public void ShowcaseFindsTheSampleSheetAtItsImportedPath()
        {
            var sheet = FullStackDS.Editor.ControlsShowcase.SampleStyleSheet();
            Assert.That(sheet, Is.Not.Null);
            Assert.That(AssetDatabase.GetAssetPath(sheet), Is.EqualTo("Assets/InteractiveControls/Sample.uss"));
        }
    }
}
