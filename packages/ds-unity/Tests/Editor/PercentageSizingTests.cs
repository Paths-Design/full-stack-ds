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
    /// <summary>USS percentage min/max constraints retain their parent-relative
    /// meaning through import, initial layout and a parent-size change.</summary>
    public class PercentageSizingTests
    {
        private EditorWindow window;
        private string assetPath;

        [TearDown] public void Cleanup()
        {
            if (window != null) window.Close();
            if (assetPath != null) AssetDatabase.DeleteAsset(assetPath);
        }

        private static IEnumerator Frames()
        {
            for (var i = 0; i < 8; i++) yield return null;
        }

        private static void SizeIs(VisualElement element, float width, float height, string context)
        {
            Assert.That(element.layout.width, Is.EqualTo(width).Within(.5f), context + " width");
            Assert.That(element.layout.height, Is.EqualTo(height).Within(.5f), context + " height");
        }

        [UnityTest] public IEnumerator ImportedPercentageConstraintsFollowBothParentDimensions()
        {
            assetPath = "Assets/FsdsPercentageSizing-" + Guid.NewGuid().ToString("N") + ".uss";
            // Width/height deliberately exceed the maximums and undershoot the
            // minimums. Flex shrink cannot mask a missing constraint.
            File.WriteAllText(assetPath, @"
.constraint-parent { width: 320px; height: 240px; flex-shrink: 0; align-items: flex-start; }
.constraint-parent.expanded { width: 400px; height: 320px; }
.constraint-max { width: 600px; height: 500px; max-width: 50%; max-height: 25%; flex-shrink: 0; }
.constraint-min { width: 1px; height: 1px; min-width: 75%; min-height: 50%; flex-shrink: 0; }
");
            AssetDatabase.ImportAsset(assetPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            var sheet = AssetDatabase.LoadAssetAtPath<StyleSheet>(assetPath);
            Assert.That(sheet, Is.Not.Null, "authored percentage USS imports");
            Assert.That(sheet.importedWithErrors, Is.False, "percentage constraints must be valid USS");
            Assert.That(sheet.importedWithWarnings, Is.False, "percentage constraints must not be silently dropped");

            window = ScriptableObject.CreateInstance<EditorWindow>();
            window.position = new Rect(40, 40, 600, 600);
            window.Show();
            window.rootVisualElement.styleSheets.Add(sheet);
            var parent = new VisualElement(); parent.AddToClassList("constraint-parent");
            var maximum = new VisualElement(); maximum.AddToClassList("constraint-max");
            var minimum = new VisualElement(); minimum.AddToClassList("constraint-min");
            parent.Add(maximum); parent.Add(minimum); window.rootVisualElement.Add(parent);
            yield return Frames();

            SizeIs(parent, 320, 240, "initial parent");
            SizeIs(maximum, 160, 60, "initial percentage maximum");
            SizeIs(minimum, 240, 120, "initial percentage minimum");
            Assert.That(maximum.style.maxWidth.keyword, Is.EqualTo(StyleKeyword.Null), "max-width comes from USS");
            Assert.That(maximum.style.maxHeight.keyword, Is.EqualTo(StyleKeyword.Null), "max-height comes from USS");
            Assert.That(minimum.style.minWidth.keyword, Is.EqualTo(StyleKeyword.Null), "min-width comes from USS");
            Assert.That(minimum.style.minHeight.keyword, Is.EqualTo(StyleKeyword.Null), "min-height comes from USS");

            parent.AddToClassList("expanded");
            yield return Frames();
            SizeIs(parent, 400, 320, "expanded parent");
            SizeIs(maximum, 200, 80, "resized percentage maximum");
            SizeIs(minimum, 300, 160, "resized percentage minimum");
        }
    }
}
