using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using FullStackDS;
using UnityEngine;

namespace GamePauseMenu
{
    /// <summary>Standalone Player witness: switches through the tabs, records 1280x800 PNG
    /// captures and a result receipt, then quits. Synthetic app-API state changes prove the panel
    /// renders those states inside a real Player; they are not input-device integration proof.</summary>
    public sealed class CaptureHarness : MonoBehaviour
    {
        [Serializable]
        public sealed class Result
        {
            public string runId;
            public string unityVersion;
            public string platform;
            public bool editor;
            public bool passed;
            public string error;
            public int width;
            public int height;
            public string[] screenshots;
            public string[] checks;
        }

        private sealed class Step
        {
            public string Tab;
            public string File;
            public Action<PauseMenuApp> Prepare;
            public bool ScrollSettingsToBottom;
        }

        private sealed class CaptureContext
        {
            public string Directory;
            public string Error;
            public readonly List<string> Checks = new List<string>();
            public readonly List<string> Screenshots = new List<string>();

            public void Check(bool condition, string name, string detail = null)
            {
                if (condition)
                {
                    Checks.Add(name);
                    return;
                }
                Fail(name, detail);
            }

            public void Fail(string name, string detail)
            {
                if (Error == null)
                {
                    Error = "check failed: " + (name ?? "capture")
                            + (string.IsNullOrEmpty(detail) ? string.Empty : " — " + detail);
                    Debug.LogError("Game pause menu capture: " + Error);
                }
            }
        }

        // Four required tab captures, plus two extra interaction-state captures for the comparison doc.
        private static readonly Step[] Steps =
        {
            new Step
            {
                Tab = PauseMenuState.MapTab, File = "map.png",
                Prepare = app =>
                {
                    // Plot state: a chosen nav target plus one filtered-off marker.
                    app.SetNavTarget("cache-02");
                    app.SetIconVisible("weather-06", false);
                },
            },
            new Step
            {
                Tab = PauseMenuState.ProgressTab, File = "progress.png",
                Prepare = app => app.OpenFactionDrawer("ares-logistics"),
            },
            new Step
            {
                Tab = PauseMenuState.AbilitiesTab, File = "abilities.png",
                Prepare = app => app.SelectAbility("overclock"),
            },
            new Step
            {
                Tab = PauseMenuState.SettingsTab, File = "settings.png",
                Prepare = app =>
                {
                    if (app.State.RemapModalOpen) app.CancelRemap();
                },
            },
            new Step
            {
                Tab = PauseMenuState.SettingsTab, File = "remap-modal.png",
                Prepare = app => app.OpenRemapModal("interact"),
            },
            new Step
            {
                Tab = PauseMenuState.SettingsTab, File = "subtitle-picker.png",
                ScrollSettingsToBottom = true,
                Prepare = app =>
                {
                    if (app.State.RemapModalOpen) app.CancelRemap();
                    app.Settings.SubtitleLanguageDropdown.value = "Français";
                    app.SetSubtitleBackground("signal");
                },
            },
        };

        private PauseMenuHost host;

        public void Bind(PauseMenuHost sceneHost) => host = sceneHost;

        private IEnumerator Start()
        {
            var evidenceDir = Environment.GetEnvironmentVariable("FSDS_PAUSE_EVIDENCE");
            var result = new Result
            {
                runId = Environment.GetEnvironmentVariable("FSDS_PAUSE_RUN"),
                unityVersion = Application.unityVersion,
                platform = Application.platform.ToString(),
                editor = Application.isEditor,
                width = Screen.width,
                height = Screen.height,
                screenshots = Array.Empty<string>(),
                checks = Array.Empty<string>(),
            };
            var context = new CaptureContext { Directory = evidenceDir };
            for (var i = 0; i < 3 && host == null; i++) yield return null;

            // Every try/catch here is in a plain method: an iterator cannot yield inside one.
            try { Validate(context); }
            catch (Exception error) { context.Fail(null, error.ToString()); }

            yield return null;
            try { LogLayout(); }
            catch (Exception error) { Debug.LogWarning("Layout probe failed: " + error.Message); }

            if (context.Error == null)
            {
                foreach (var step in Steps)
                {
                    try { PrepareStep(step); }
                    catch (Exception error) { context.Fail(step.Tab, error.ToString()); }
                    if (context.Error != null) break;

                    yield return null;
                    if (step.ScrollSettingsToBottom)
                        host.App.Settings.Scroller.scrollOffset = new Vector2(0f, 10000f);
                    yield return null;
                    yield return new WaitForEndOfFrame();

                    try { CaptureStep(step, context); }
                    catch (Exception error) { context.Fail(step.Tab, error.ToString()); }
                    if (context.Error != null) break;
                }
            }

            result.passed = context.Error == null;
            result.error = context.Error;
            result.screenshots = context.Screenshots.ToArray();
            result.checks = context.Checks.ToArray();
            if (!string.IsNullOrEmpty(evidenceDir))
                File.WriteAllText(Path.Combine(evidenceDir, "result.json"), JsonUtility.ToJson(result, true));
            Application.Quit(result.passed ? 0 : 1);
        }

        private void Validate(CaptureContext context)
        {
            context.Check(!Application.isEditor, "standalone-process");
            context.Check(host != null && host.App != null, "app-built",
                host == null ? "scene host missing" : host.Error);
            if (context.Error != null) return;
            var app = host.App;
            context.Check(app.Tabs.Group.Triggers.Count == 4, "four-tabs");
            context.Check(app.Root.ClassListContains(Theme.ScopeClass), "theme-scope-attached");
            context.Check(app.Root.ClassListContains(Theme.BrandClassPrefix + "orion"), "orion-brand-class");
            context.Check(Screen.width == 1280 && Screen.height == 800, "capture-size-1280x800",
                Screen.width + "x" + Screen.height);
            context.Check(app.Root.styleSheets.count >= 2, "lane-and-generated-sheets",
                app.Root.styleSheets.count.ToString());
        }

        private void LogLayout()
        {
            var app = host.App;
            Debug.Log("FSDSPLAYOUT root=" + app.Root.worldBound + " panel=" + app.Root.panel.visualTree.worldBound
                      + " headerPaused=" + app.Header.StatusText.worldBound
                      + " rankSub=" + app.Header.RankSub.worldBound
                      + " rankSubWs=" + app.Header.RankSub.resolvedStyle.whiteSpace);
            var widths = string.Empty;
            foreach (var label in app.Footer.HintLabels)
                widths += label.text + ":" + label.worldBound.width + "x" + label.worldBound.height + " ";
            Debug.Log("FSDSPLAYOUT footer=" + app.Footer.Root.worldBound + " hints=" + app.Footer.Hints.worldBound
                      + " labels=" + widths);
            var marker = app.Map.Marker("relay-01");
            Debug.Log("FSDSPLAYOUT field=" + app.Map.Field.worldBound
                      + " markerPos=" + marker.resolvedStyle.position + " marker=" + marker.worldBound
                      + " anchor=" + app.Map.MarkerAnchor("relay-01").worldBound);
            var sector = app.Map.SectorLabel;
            Debug.Log("FSDSPLAYOUT sector=" + sector.worldBound + " size=" + sector.resolvedStyle.fontSize
                      + " ws=" + sector.resolvedStyle.whiteSpace);
        }

        private void PrepareStep(Step step)
        {
            step.Prepare(host.App);
            host.App.SelectTab(step.Tab);
        }

        private void CaptureStep(Step step, CaptureContext context)
        {
            var texture = ScreenCapture.CaptureScreenshotAsTexture();
            try
            {
                var bytes = texture.EncodeToPNG();
                File.WriteAllBytes(Path.Combine(context.Directory, step.File), bytes);
                context.Screenshots.Add(step.File);
                context.Check(bytes.Length > 1024, "capture-" + step.Tab
                                                   + (step.File == step.Tab + ".png" ? string.Empty : "-" + step.File));
            }
            finally
            {
                Destroy(texture);
            }
        }
    }
}
