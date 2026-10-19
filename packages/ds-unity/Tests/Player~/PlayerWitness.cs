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
            int changes = 0; sound.RegisterValueChangedCallback(_ => changes++);
            Submit(sound.Trigger);
            Check(!sound.Checked && changes == 1, "submit-delivers-one-switch-change");
            Check(sound.Trigger.resolvedStyle.fontSize == 16 && sound.Trigger.resolvedStyle.color.r > .9f, "packaged-stylesheet-resolves");
            var accordion = root.Q<Accordion>("settings"); Submit(accordion.Group.Triggers[1]);
            Check(accordion.Value == "audio", "accordion-selection");
            var tabs = root.Q<Tabs>("pages"); Submit(tabs.Group.Triggers[1]);
            Check(tabs.Value == "inventory", "tabs-selection");
            var help = root.Q<Popover>("help"); help.CloseOnBlur = false; Submit(help.Trigger);
            Check(help.Open && help.Content.parent == root.panel.visualTree, "popover-panel-root");
        } catch (Exception e) { result.error = e.ToString(); }
        for (int i = 0; i < 20; i++) yield return null;
        if (result.error == null) {
            try {
                var help = doc.rootVisualElement.Q<Popover>("help");
                Check(help.Content.worldBound.width > 0 && help.Content.worldBound.xMax <= doc.rootVisualElement.panel.visualTree.worldBound.xMax + 1, "popover-layout");
                using (var e = KeyDownEvent.GetPooled(new Event { type = EventType.KeyDown, keyCode = KeyCode.Escape })) { e.target = help.Trigger; help.Trigger.SendEvent(e); }
                Check(!help.Open, "popover-escape");
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
