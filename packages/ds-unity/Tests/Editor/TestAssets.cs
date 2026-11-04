using System;
using System.IO;
using NUnit.Framework;
using UnityEditor;
using UnityEngine.UIElements;
using PackageInfo = UnityEditor.PackageManager.PackageInfo;

namespace FullStackDS.Tests
{
    /// <summary>Every asset a shipped case judges comes from this package, so a case holds in any host project
    /// without staging. Test-only fixtures load by package path. The sample lives in Samples~, which Unity never
    /// imports, so a case that witnesses the shipped sample copies its bytes into a transient folder and the
    /// fixture's teardown removes it.</summary>
    internal static class TestAssets
    {
        private const string Package = "Packages/com.fullstackds.ui";
        // A fixed path: Player-context cases stage before EnterPlayMode and read after its domain reload, which
        // keeps no static state.
        public const string SampleFolder = "Assets/FullStackDS.TestSample";
        // Survives a killed run, so its leftover can be replaced while a host folder of the same name is left
        // alone. The leading dot keeps it out of the AssetDatabase.
        private const string StageMarker = ".staged-by-fullstackds-tests";

        public static ThemeStyleSheet RuntimeTheme() => Fixture<ThemeStyleSheet>("RuntimeTheme.tss");
        public static VisualTreeAsset GlyphUxml() => Fixture<VisualTreeAsset>("GlyphFixture.uxml");

        private static T Fixture<T>(string name) where T : UnityEngine.Object
        {
            var path = $"{Package}/Tests/Editor/Fixtures/{name}";
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            Assert.That(asset, Is.Not.Null, path);
            return asset;
        }

        /// <summary>The on-disk path of a shipped sample file. Package assets resolve through the AssetDatabase,
        /// which cannot see Samples~, so the file is read from the resolved package root.</summary>
        public static string SampleSource(string name) =>
            Path.Combine(PackageInfo.FindForAssembly(typeof(Theme).Assembly).resolvedPath, "Samples~/InteractiveControls", name);

        /// <summary>Imports the shipped UXML and its sheet under fresh GUIDs, so the copy cannot collide with a
        /// sample the host already imported at its committed GUIDs. RuntimeExample.cs stays behind: a script
        /// under Assets would recompile the host's assemblies in the middle of a test.</summary>
        public static void StageSample()
        {
            Claim(SampleFolder);
            Import("Sample.uss", withMeta: false);
            Import("Controls.uxml", withMeta: false);
        }

        /// <summary>The path of the sample sheet at its committed GUID: the host's own import when it has one,
        /// otherwise a transient copy that keeps the committed meta.</summary>
        public static string SampleSheetAtCommittedGuid()
        {
            var imported = AssetDatabase.GUIDToAssetPath(Editor.ControlsShowcase.SampleStyleSheetGuid);
            if (!string.IsNullOrEmpty(imported)) return imported;
            Claim(SampleFolder);
            return Import("Sample.uss", withMeta: true);
        }

        public static VisualTreeAsset SampleControls()
        {
            var path = $"{SampleFolder}/Controls.uxml";
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(path);
            Assert.That(asset, Is.Not.Null, path);
            return asset;
        }

        public static void RemoveSample() => Release(SampleFolder);

        /// <summary>Removes a folder only when it carries this assembly's marker.</summary>
        public static void Release(string folder)
        {
            if (File.Exists(Path.Combine(folder, StageMarker))) AssetDatabase.DeleteAsset(folder);
        }

        /// <summary>Creates a marked folder, replacing an earlier stage and refusing a folder the host owns.</summary>
        public static void Claim(string folder)
        {
            Release(folder);
            if (Directory.Exists(folder)) throw new InvalidOperationException($"{folder} belongs to this project, so a test will not replace it.");
            AssetDatabase.CreateFolder(Path.GetDirectoryName(folder), Path.GetFileName(folder));
            File.WriteAllText(Path.Combine(folder, StageMarker), "");
        }

        private static string Import(string name, bool withMeta)
        {
            var path = $"{SampleFolder}/{name}";
            File.Copy(SampleSource(name), path);
            if (withMeta) File.Copy(SampleSource(name + ".meta"), path + ".meta");
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceSynchronousImport);
            return path;
        }
    }
}
