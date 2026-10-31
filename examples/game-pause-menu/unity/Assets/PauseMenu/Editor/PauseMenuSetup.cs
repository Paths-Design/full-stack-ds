using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu.Editor
{
    /// <summary>Creates the committed project wiring (PanelSettings asset, scene, build settings)
    /// idempotently. The assets it writes are committed; a fresh checkout can either open the
    /// project directly or re-run this method.</summary>
    public static class PauseMenuSetup
    {
        public const string ScenePath = "Assets/PauseMenu/Scenes/PauseMenu.unity";
        public const string PanelPath = "Assets/PauseMenu/PanelSettings.asset";
        public const string ThemePath = "Assets/PauseMenu/Resources/Styles/PauseMenuTheme.tss";

        [MenuItem("Tools/Game Pause Menu/Configure Project")]
        public static void Configure()
        {
            var theme = AssetDatabase.LoadAssetAtPath<ThemeStyleSheet>(ThemePath);
            if (theme == null) throw new Exception("Missing theme style sheet at " + ThemePath);
            var panel = AssetDatabase.LoadAssetAtPath<PanelSettings>(PanelPath);
            if (panel == null)
            {
                panel = ScriptableObject.CreateInstance<PanelSettings>();
                AssetDatabase.CreateAsset(panel, PanelPath);
            }
            panel.themeStyleSheet = theme;
            panel.scaleMode = PanelScaleMode.ConstantPixelSize;
            panel.scale = 1;
            panel.referenceResolution = new Vector2Int(1280, 800);
            panel.screenMatchMode = PanelScreenMatchMode.MatchWidthOrHeight;
            panel.match = 0.5f;
            panel.clearColor = true;
            panel.colorClearValue = new Color(0.078f, 0.078f, 0.071f, 1f);
            EditorUtility.SetDirty(panel);

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var menu = new GameObject("Pause Menu");
            var document = menu.AddComponent<UIDocument>();
            document.panelSettings = panel;
            menu.AddComponent<PauseMenuHost>();
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

            PlayerSettings.companyName = "FullStackDS";
            PlayerSettings.productName = "Orion N5 Pause Menu";
            PlayerSettings.runInBackground = true;
            PlayerSettings.defaultScreenWidth = 1280;
            PlayerSettings.defaultScreenHeight = 800;
            PlayerSettings.defaultIsNativeResolution = false;
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.resizableWindow = false;
            PlayerSettings.macRetinaSupport = false;

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("Game pause menu project configured: scene=" + ScenePath + " panel=" + PanelPath);
        }
    }

    /// <summary>Builds the standalone macOS Player used for the four-tab screenshot evidence.</summary>
    public static class PauseMenuBuild
    {
        public static void BuildPlayer()
        {
            PauseMenuSetup.Configure();
            var app = Environment.GetEnvironmentVariable("FSDS_PAUSE_APP");
            if (string.IsNullOrEmpty(app))
                throw new Exception("Set FSDS_PAUSE_APP to the Player app output path before -executeMethod PauseMenuBuild.BuildPlayer.");
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { PauseMenuSetup.ScenePath },
                locationPathName = app,
                target = BuildTarget.StandaloneOSX,
                options = BuildOptions.None,
            });
            if (report.summary.result != BuildResult.Succeeded)
                throw new Exception("Player build failed: " + report.summary.result
                                    + " (" + report.summary.totalErrors + " errors).");
            Debug.Log("Game pause menu Player built: " + app);
        }
    }
}
