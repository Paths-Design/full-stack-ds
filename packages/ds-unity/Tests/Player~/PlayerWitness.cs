using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;

public class PlayerWitness : MonoBehaviour
{
    [Serializable] public class Result {
        public string runId, unityVersion, platform, error;
        public bool editor, passed;
        public string[] checks;
    }
    private readonly List<string> checks = new List<string>();
    private void Check(bool value, string name) { if (!value) throw new Exception(name); checks.Add(name); Debug.Log("FSDS witness: " + name); }
    private static bool ColorIs(Color actual, string hex) {
        if (!ColorUtility.TryParseHtmlString(hex, out var expected)) return false;
        return Mathf.Abs(actual.r - expected.r) < .01f && Mathf.Abs(actual.g - expected.g) < .01f && Mathf.Abs(actual.b - expected.b) < .01f && Mathf.Abs(actual.a - expected.a) < .01f;
    }
    private static int CapturePixelsIn(Rect world, Func<Color, bool> matches) {
        var image = ScreenCapture.CaptureScreenshotAsTexture();
        try {
            int x0 = Mathf.Clamp(Mathf.FloorToInt(world.xMin), 0, image.width);
            int x1 = Mathf.Clamp(Mathf.CeilToInt(world.xMax), 0, image.width);
            int y0 = Mathf.Clamp(image.height - Mathf.CeilToInt(world.yMax), 0, image.height);
            int y1 = Mathf.Clamp(image.height - Mathf.FloorToInt(world.yMin), 0, image.height);
            int count = 0;
            for (int y = y0; y < y1; y++) for (int x = x0; x < x1; x++)
                if (matches(image.GetPixel(x, y))) count++;
            return count;
        } finally { UnityEngine.Object.Destroy(image); }
    }
    private static void Submit(Button button) { using (var e = NavigationSubmitEvent.GetPooled()) { e.target = button; button.SendEvent(e); } }
    private IEnumerator Start()
    {
        Application.runInBackground = true;
        string dir = Environment.GetEnvironmentVariable("FSDS_PLAYER_EVIDENCE");
        var result = new Result { runId = Environment.GetEnvironmentVariable("FSDS_PLAYER_RUN"), unityVersion = Application.unityVersion, platform = Application.platform.ToString(), editor = Application.isEditor };
        UIDocument doc = null;
        try {
            Check(!Application.isEditor, "standalone-process");
            doc = gameObject.AddComponent<UIDocument>();
            doc.panelSettings = Resources.Load<PanelSettings>("WitnessPanel");
            doc.visualTreeAsset = Resources.Load<VisualTreeAsset>("Controls");
            Check(doc.panelSettings != null && doc.visualTreeAsset != null, "packaged-panel-and-uxml");
        } catch (Exception e) { result.error = e.ToString(); }
        for (int i = 0; i < 20; i++) yield return null;
        try {
            if (result.error != null) throw new Exception(result.error);
            var root = doc.rootVisualElement;
            Check(root.panel.contextType == ContextType.Player, "player-panel");
            var sound = root.Q<Switch>("sound");
            Check(sound != null && sound.Checked, "generated-switch-initial-state");
            var scope = root.Q<ScrollView>(className: Theme.ScopeClass);
            Check(scope != null && ColorIs(scope.resolvedStyle.backgroundColor, "#ffffff"), "sample-stylesheet-resolves");
            Check(ColorIs(sound.Track.resolvedStyle.backgroundColor, "#d92d2e"), "packaged-stylesheet-resolves");
            int changes = 0; sound.RegisterValueChangedCallback(_ => changes++);
            Submit(sound.Trigger);
            Check(!sound.Checked && changes == 1, "submit-delivers-one-switch-change");
            var accordion = root.Q<Accordion>("settings"); Submit(accordion.Group.Triggers[1]);
            Check(accordion.Value == "audio", "accordion-selection");
            var composed = accordion.Group.Triggers[1].Q<Icon>();
            var composedGlyph = composed?.Q<GlyphElement>();
            Check(composed != null && composed.Name == "chevron-down" && composed.Size == "sm" &&
                composedGlyph != null && composedGlyph.HasGlyph && composedGlyph.SelectedViewBox.width == 16,
                "accordion-contract-icon-ref");
            composed.style.color = new Color(1, 0, 1, 1);
            var tabs = root.Q<Tabs>("pages"); Submit(tabs.Group.Triggers[1]);
            Check(tabs.Value == "inventory", "tabs-selection");
            var help = root.Q<Popover>("help"); help.CloseOnBlur = false; Submit(help.Trigger);
            Check(help.Open && help.Content.parent == root.panel.visualTree, "popover-panel-root");
        } catch (Exception e) { result.error = e.ToString(); }
        for (int i = 0; i < 20; i++) yield return null;
        yield return new WaitForEndOfFrame();
        if (result.error == null) {
            try {
                var help = doc.rootVisualElement.Q<Popover>("help");
                Check(help.Content.worldBound.width > 0 && help.Content.worldBound.xMax <= doc.rootVisualElement.panel.visualTree.worldBound.xMax + 1, "popover-layout");
                var composed = doc.rootVisualElement.Q<Accordion>("settings").Group.Triggers[1].Q<Icon>();
                var composedGlyph = composed.Q<GlyphElement>();
                Check(composedGlyph.worldBound.width >= 15 &&
                    CapturePixelsIn(composedGlyph.worldBound, c => c.r > .7f && c.b > .7f && c.g < .2f && c.a > .9f) > 5,
                    "accordion-composed-icon-inherits-pixels");
                composed.style.color = new Color(0, 1, 1, 1);
                using (var e = KeyDownEvent.GetPooled(new Event { type = EventType.KeyDown, keyCode = KeyCode.Escape })) { e.target = help.Trigger; help.Trigger.SendEvent(e); }
                Check(!help.Open, "popover-escape");
            } catch (Exception e) { result.error = e.ToString(); }
        }
        for (int i = 0; i < 20; i++) yield return null;
        yield return new WaitForEndOfFrame();
        if (result.error == null) {
            try {
                var composed = doc.rootVisualElement.Q<Accordion>("settings").Group.Triggers[1].Q<Icon>();
                var composedGlyph = composed.Q<GlyphElement>();
                Check(CapturePixelsIn(composedGlyph.worldBound, c => c.g > .7f && c.b > .7f && c.r < .2f && c.a > .9f) > 5,
                    "accordion-composed-icon-recolors");
                composed.Name = "unknown-glyph";
            } catch (Exception e) { result.error = e.ToString(); }
        }
        for (int i = 0; i < 20; i++) yield return null;
        yield return new WaitForEndOfFrame();
        if (result.error == null) {
            try {
                var composed = doc.rootVisualElement.Q<Accordion>("settings").Group.Triggers[1].Q<Icon>();
                var composedGlyph = composed.Q<GlyphElement>();
                Check(!composedGlyph.HasGlyph && CapturePixelsIn(composedGlyph.worldBound, c => c.g > .7f && c.b > .7f && c.r < .2f && c.a > .9f) == 0,
                    "accordion-composed-icon-unknown-clears");
                composed.Name = "chevron-down";
            } catch (Exception e) { result.error = e.ToString(); }
        }
        VisualElement glyphScope = null;
        Icon icon = null;
        GlyphElement glyph = null;
        if (result.error == null) {
            try {
                glyphScope = new VisualElement();
                glyphScope.style.position = Position.Absolute;
                glyphScope.style.left = 540;
                glyphScope.style.top = 700;
                glyphScope.style.width = 48;
                glyphScope.style.height = 48;
                glyphScope.style.color = new Color(1, 0, 1, 1);
                Theme.Attach(glyphScope);
                doc.rootVisualElement.Add(glyphScope);
                icon = new Icon { Name = "check", Size = "xl" };
                glyphScope.Add(icon);
                glyph = icon.Q<GlyphElement>();
                Check(glyph != null && glyph.HasGlyph && glyph.SelectedViewBox.width == 24, "icon-authored-variant");
                Check(icon.Size == "xl" && glyph.PixelSize == 32, "icon-size-prop");
            } catch (Exception e) { result.error = e.ToString(); }
        }
        for (int i = 0; i < 20; i++) yield return null;
        yield return new WaitForEndOfFrame();
        if (result.error == null) {
            try {
                Check(CapturePixelsIn(glyph.worldBound, c => c.r > .6f && c.b > .6f && c.g < .2f && c.a > .9f) > 10, "icon-authored-pixels");
                glyphScope.style.color = new Color(0, 1, 1, 1);
            } catch (Exception e) { result.error = e.ToString(); }
        }
        for (int i = 0; i < 20; i++) yield return null;
        yield return new WaitForEndOfFrame();
        if (result.error == null) {
            try {
                Check(CapturePixelsIn(glyph.worldBound, c => c.g > .6f && c.b > .6f && c.r < .2f && c.a > .9f) > 10, "icon-inherited-color");
                icon.Name = "unknown-glyph";
            } catch (Exception e) { result.error = e.ToString(); }
        }
        for (int i = 0; i < 20; i++) yield return null;
        yield return new WaitForEndOfFrame();
        if (result.error == null) {
            try {
                Check(!glyph.HasGlyph && CapturePixelsIn(glyph.worldBound, c => c.g > .6f && c.b > .6f && c.r < .2f && c.a > .9f) == 0, "icon-unknown-clears");
                icon.Name = "check";
                icon.Size = "sm";
                glyphScope.style.color = new Color(1, 1, 0, 1);
            } catch (Exception e) { result.error = e.ToString(); }
        }
        for (int i = 0; i < 20; i++) yield return null;
        yield return new WaitForEndOfFrame();
        if (result.error == null) {
            try {
                Check(glyph.HasGlyph && glyph.SelectedViewBox.width == 16 && glyph.PixelSize == 16 &&
                    CapturePixelsIn(glyph.worldBound, c => c.r > .6f && c.g > .6f && c.b < .2f && c.a > .9f) > 5, "icon-recovery-and-size");
            } catch (Exception e) { result.error = e.ToString(); }
        }
        yield return new WaitForEndOfFrame();
        var pixels = ScreenCapture.CaptureScreenshotAsTexture();
        File.WriteAllBytes(Path.Combine(dir, "player.png"), pixels.EncodeToPNG()); Destroy(pixels);
        result.passed = result.error == null; result.checks = checks.ToArray();
        File.WriteAllText(Path.Combine(dir, "result.json"), JsonUtility.ToJson(result, true));
        Application.Quit(result.passed ? 0 : 1);
    }
}
