using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

namespace GamePauseMenu
{
    /// <summary>Standalone Player witness for the parity pass: drives the capture states declared in
    /// fixtures/parity-layout.json, records 1280x800 PNGs and a receipt, then quits. Synthetic
    /// app-API state changes prove the panel renders those states inside a real Player; they are not
    /// input-device integration proof.</summary>
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

        private static readonly string[] RequiredStates = { "map", "progress", "abilities", "settings" };
        private static readonly string[] StateOrder =
        {
            "map", "map-popover", "progress", "abilities", "abilities-hover",
            "settings", "settings-remap-modal", "settings-subtitle",
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
            try { LogParityFacts(); }
            catch (Exception error) { Debug.LogWarning("Parity probe failed: " + error.Message); }

            if (context.Error == null)
            {
                foreach (var state in StateOrder)
                {
                    try { PrepareState(state); }
                    catch (Exception error) { context.Fail(state, error.ToString()); }
                    if (context.Error != null) break;

                    yield return null;
                    yield return null;
                    yield return new WaitForEndOfFrame();

                    try { CaptureState(state, context); }
                    catch (Exception error) { context.Fail(state, error.ToString()); }
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
            foreach (var state in RequiredStates)
                context.Check(app.Layout.Captures.ContainsKey(state), "capture-state-" + state);
            context.Check(app.Layout.Captures.Count >= 8, "eight-capture-states",
                app.Layout.Captures.Count.ToString());
        }

        private void LogParityFacts()
        {
            var app = host.App;
            Debug.Log("FSDSPARITY root=" + app.Root.worldBound
                      + " tabs=" + app.Tabs.worldBound
                      + " list=" + app.Tabs.Q<TabsList>().worldBound
                      + " panel=" + app.TabPanel(PauseMenuState.MapTab).worldBound);
            Debug.Log("FSDSPARITY mapField=" + app.Map.Field.worldBound
                      + " marker=" + app.Map.MarkerAnchor("relay-01").worldBound
                      + " header=" + app.Header.Root.worldBound
                      + " footer=" + app.Footer.Root.worldBound
                      + " tab0=" + app.TabButton(PauseMenuState.MapTab).worldBound);
            var toggle = app.Map.VisibilitySwitch("relay-01");
            Debug.Log("FSDSPARITY switchRoot=" + toggle.worldBound
                      + " track=" + toggle.Track.worldBound
                      + " trackRadius=" + toggle.Track.resolvedStyle.borderTopLeftRadius
                      + " thumbRadius=" + toggle.Thumb.resolvedStyle.borderTopLeftRadius
                      + " thumb=" + toggle.Thumb.worldBound);
        }

        private void PrepareState(string state)
        {
            if (!host.App.Layout.Captures.TryGetValue(state, out var capture))
                throw new ArgumentException("parity-layout.json declares no capture state '" + state + "'.");
            var app = host.App;
            app.CloseAllOverlays();
            if (!string.IsNullOrEmpty(capture.ActiveTab)) app.SelectTab(capture.ActiveTab);
            if (!string.IsNullOrEmpty(capture.NavTarget)) app.SetNavTarget(capture.NavTarget);
            foreach (var icon in capture.HiddenIcons) app.SetIconVisible(icon, false);
            if (!string.IsNullOrEmpty(capture.Drawer)) app.OpenFactionDrawer(capture.Drawer);
            if (!string.IsNullOrEmpty(capture.PendingAbility)) app.SelectAbility(capture.PendingAbility);
            if (!string.IsNullOrEmpty(capture.Popover)) app.Map.OpenPopover(capture.Popover);
            if (!string.IsNullOrEmpty(capture.Hover)) app.Abilities.OpenHover(capture.Hover);
            if (!string.IsNullOrEmpty(capture.RemapModal)) app.OpenRemapModal(capture.RemapModal);
            if (!string.IsNullOrEmpty(capture.SubtitleBackground)) app.SetSubtitleBackground(capture.SubtitleBackground);
            if (!string.IsNullOrEmpty(capture.SubtitleLanguage))
                app.Settings.SubtitleLanguageDropdown.value = capture.SubtitleLanguage;
        }

        private void CaptureState(string state, CaptureContext context)
        {
            var file = state + ".png";
            var texture = ScreenCapture.CaptureScreenshotAsTexture();
            try
            {
                var bytes = texture.EncodeToPNG();
                File.WriteAllBytes(Path.Combine(context.Directory, file), bytes);
                context.Screenshots.Add(file);
                context.Check(bytes.Length > 1024, "capture-" + state);
            }
            finally
            {
                Destroy(texture);
            }
        }
    }
}
