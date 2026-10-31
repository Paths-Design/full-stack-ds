using UnityEditor;
using UnityEngine.UIElements;

namespace FullStackDS.Editor
{
    public class ControlsShowcase : EditorWindow
    {
        // Samples~/InteractiveControls/Sample.uss: consumer styling for the showcase layout. Samples~ is not
        // imported with the package, so the sheet is found by its committed GUID once the sample is imported;
        // without it the showcase shows the generated stylesheet over the Editor theme only.
        public const string SampleStyleSheetGuid = "8887ee4823614395b423f7b80cfff37a";
        [MenuItem("Window/Full Stack DS/Interactive Controls")]
        public static void Open() => GetWindow<ControlsShowcase>("Full Stack DS");
        public static StyleSheet SampleStyleSheet()
        {
            var path = AssetDatabase.GUIDToAssetPath(SampleStyleSheetGuid);
            return string.IsNullOrEmpty(path) ? null : AssetDatabase.LoadAssetAtPath<StyleSheet>(path);
        }
        // Compound parts compose as sub-elements paired by Value, mirroring the web compound API.
        private static void Section(Accordion accordion, string value, string title, params VisualElement[] body)
        {
            var item = new AccordionItem(); var header = new AccordionHeader();
            header.Add(new AccordionTrigger { Value = value, text = title });
            var content = new AccordionContent { Value = value };
            foreach (var child in body) content.Add(child);
            item.Add(header); item.Add(content); accordion.Add(item);
        }
        private static void Page(Tabs tabs, TabsList list, string value, string title, string body)
        {
            list.Add(new TabsTab { Value = value, text = title });
            var panel = new TabsPanel { Value = value }; panel.Add(new Label(body)); tabs.Add(panel);
        }
        private static Switch Labeled(string text, bool on = false)
        {
            var control = new Switch { Checked = on }; control.Add(new Label(text)); return control;
        }
        public void CreateGUI()
        {
            // The consumer sheet goes first so the generated sheet outranks it at equal specificity.
            var sample = SampleStyleSheet();
            if (sample != null) rootVisualElement.styleSheets.Add(sample);
            Theme.Attach(rootVisualElement);
            rootVisualElement.AddToClassList("fsds-sample");
            minSize = new UnityEngine.Vector2(320, 480);
            var sound = Labeled("Enable sound", true);
            var accordion = new Accordion { Collapsible = true };
            Section(accordion, "graphics", "Graphics", new Label("Rendering preferences"), Labeled("High quality textures"));
            Section(accordion, "audio", "Audio", new Label("Music and sound effects"));
            var tabs = new Tabs(); var list = new TabsList(); tabs.Add(list);
            Page(tabs, list, "overview", "Overview", "Your adventure starts here.");
            Page(tabs, list, "inventory", "Inventory", "Your collected items appear here.");
            var popover = new Popover();
            popover.Add(new PopoverTrigger { text = "About these controls" });
            var content = new PopoverContent();
            // Open content floats to the panel root, outside this window's tree, so it carries the sample sheet itself.
            if (sample != null) content.styleSheets.Add(sample);
            content.Add(new Label("Generated from the same contracts as the web packages."));
            var close = new UnityEngine.UIElements.Button(() => popover.Open = false) { text = "Close" };
            close.AddToClassList("fsds-sample-content-action");
            content.Add(close);
            popover.Add(content);
            var title = new Label("Your experience"); title.AddToClassList("fsds-sample-title");
            rootVisualElement.Add(title);
            var description = new Label("Full Stack DS · Unity UI Toolkit"); description.AddToClassList("fsds-sample-description");
            rootVisualElement.Add(description);
            accordion.AddToClassList("fsds-sample-section"); tabs.AddToClassList("fsds-sample-section"); popover.AddToClassList("fsds-sample-section");
            rootVisualElement.Add(sound); rootVisualElement.Add(accordion);
            rootVisualElement.Add(tabs); rootVisualElement.Add(popover);
        }
    }
}
