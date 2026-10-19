using System;
using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace FullStackDS.Tests
{
    public class InteractionTests
    {
        private EditorWindow window;
        [SetUp] public void Setup()
        {
            window = ScriptableObject.CreateInstance<EditorWindow>();
            window.position = new Rect(0, 0, 600, 600); window.Show();
        }
        [TearDown] public void Teardown() => window.Close();
        private T Mount<T>(T element) where T : VisualElement { window.rootVisualElement.Add(element); return element; }
        private static void Submit(Button button)
        {
            using (var evt = NavigationSubmitEvent.GetPooled()) { evt.target = button; button.SendEvent(evt); }
        }
        private static void Click(VisualElement target)
        {
            using (var evt = ClickEvent.GetPooled()) { evt.target = target; target.SendEvent(evt); }
        }
        private static void Key(VisualElement target, KeyCode key)
        {
            using (var evt = KeyDownEvent.GetPooled(new Event { type = EventType.KeyDown, keyCode = key })) {
                evt.target = target; target.SendEvent(evt);
            }
        }
        // Composition mirrors the web compound API: one sub-element per compound part, paired by value.
        private static (TabsTab tab, TabsPanel panel) Tab(Tabs root, string value, bool disabled = false)
        {
            var list = root.Q<TabsList>();
            if (list == null) { list = new TabsList(); root.Add(list); }
            var tab = new TabsTab { Value = value, text = value, Disabled = disabled };
            list.Add(tab);
            var panel = new TabsPanel { Value = value }; panel.Add(new Label("Content " + value));
            root.Add(panel);
            return (tab, panel);
        }
        private static (AccordionTrigger trigger, AccordionContent content) Section(Accordion root, string value)
        {
            var item = new AccordionItem(); var header = new AccordionHeader();
            var trigger = new AccordionTrigger { Value = value, text = value };
            var content = new AccordionContent { Value = value }; content.Add(new Label("Content " + value));
            header.Add(trigger); item.Add(header); item.Add(content); root.Add(item);
            return (trigger, content);
        }
        private static (PopoverTrigger trigger, PopoverContent content) Compose(Popover root)
        {
            var trigger = new PopoverTrigger { text = "Help" }; var content = new PopoverContent();
            root.Add(trigger); root.Add(content);
            return (trigger, content);
        }

        [Test] public void SwitchActivationChangesValueExactlyOnceAndSilentSetterDoesNotNotify()
        {
            var control = Mount(new Switch());
            int count = 0; bool observed = false;
            control.RegisterValueChangedCallback(e => { count++; observed = e.newValue; });
            Submit(control.Trigger);
            Assert.That(control.Checked, Is.True); Assert.That(observed, Is.True); Assert.That(count, Is.EqualTo(1));
            Assert.That(control.ClassListContains("is-checked"), Is.True);
            control.SetValueWithoutNotify(false);
            Assert.That(control.Checked, Is.False); Assert.That(count, Is.EqualTo(1));
            Assert.That(control.ClassListContains("is-checked"), Is.False);
            control.Disabled = true; Submit(control.Trigger);
            Assert.That(control.Checked, Is.False); Assert.That(count, Is.EqualTo(1));
        }
        [Test] public void ControlledSwitchRequestsWithoutChangingUntilOwnerCommits()
        {
            var control = Mount(new Switch { Controlled = true });
            bool? request = null; control.ValueRequested += v => request = v;
            Submit(control.Trigger);
            Assert.That(request, Is.True); Assert.That(control.Checked, Is.False);
            control.Checked = true; Assert.That(control.Checked, Is.True);
        }
        [Test] public void SwitchTreeFollowsContractAnatomyAndLabelHostTogglesOnce()
        {
            // dom: label.root > [input.input, span.track > span.thumb, <children>]; root tag label selects the label host.
            var control = Mount(new Switch()); var caption = new Label("Enable sound"); control.Add(caption);
            Assert.That(control.hierarchy.Children().Select(c => c.name).ToArray(), Is.EqualTo(new[] { "input", "track", "children" }));
            Assert.That(control.Input.ClassListContains("switch__input"), Is.True);
            Assert.That(control.Thumb.hierarchy.parent, Is.EqualTo(control.Track));
            Assert.That(caption.hierarchy.parent, Is.EqualTo(control.contentContainer));
            Assert.That(control.contentContainer.ClassListContains("switch__children"), Is.True);
            Assert.That(control.Track.style.width.value.value, Is.EqualTo(48)); Assert.That(control.Thumb.style.height.value.value, Is.EqualTo(16));
            int count = 0; control.RegisterValueChangedCallback(_ => count++);
            Click(caption);
            Assert.That(control.Checked, Is.True); Assert.That(count, Is.EqualTo(1));
            // A click whose target is the control itself arrives through Button.clicked; the label host must not add a second toggle.
            Click(control.Input);
            Assert.That(control.Checked, Is.True); Assert.That(count, Is.EqualTo(1));
            control.Disabled = true; Click(caption);
            Assert.That(control.Checked, Is.True); Assert.That(count, Is.EqualTo(1));
        }
        [Test] public void AccordionSingleSelectionHonorsCollapsibleAndDisabled()
        {
            var root = new Accordion(); var a = Section(root, "a"); var b = Section(root, "b"); Mount(root);
            Submit(a.trigger); Assert.That(root.Values, Is.EqualTo(new[] { "a" }));
            Assert.That(a.content.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(b.content.style.display.value, Is.EqualTo(DisplayStyle.None));
            Submit(a.trigger); Assert.That(root.Value, Is.EqualTo("a"));
            Submit(b.trigger); Assert.That(root.Value, Is.EqualTo("b"));
            root.Collapsible = true; Submit(b.trigger); Assert.That(root.Values, Is.Empty);
            root.Disabled = true; Submit(a.trigger); Assert.That(root.Values, Is.Empty);
        }
        [Test] public void AccordionMultipleSelectionTogglesIndependentlyAndCopiesValues()
        {
            var root = new Accordion { Type = "multiple" }; var a = Section(root, "a"); var b = Section(root, "b"); Mount(root);
            Submit(a.trigger); Submit(b.trigger);
            Assert.That(root.Values, Is.EqualTo(new[] { "a", "b" }));
            var snapshot = root.Values; snapshot[0] = "corruption";
            Assert.That(root.Values, Is.EqualTo(new[] { "a", "b" }));
            Submit(a.trigger); Assert.That(root.Values, Is.EqualTo(new[] { "b" }));
            Assert.That(a.content.style.display.value, Is.EqualTo(DisplayStyle.None));
        }
        [Test] public void ControlledAccordionRequestsWithoutPresentingUncommittedState()
        {
            var root = new Accordion { Controlled = true }; var a = Section(root, "a"); Mount(root);
            string[] requested = null; root.ValueRequested += v => requested = v;
            Submit(a.trigger); Assert.That(requested, Is.EqualTo(new[] { "a" })); Assert.That(root.Value, Is.Empty);
            Assert.That(a.content.style.display.value, Is.EqualTo(DisplayStyle.None));
            root.Value = "a"; Assert.That(a.content.style.display.value, Is.EqualTo(DisplayStyle.Flex));
        }
        [Test] public void AccordionStateClassLandsOnPairedTriggerAndContentByValue()
        {
            var root = new Accordion(); var a = Section(root, "a"); var b = Section(root, "b");
            // Pairing is by Value, not position: a content keyed "a" composed inside b's item still follows "a".
            var stray = new AccordionContent { Value = "a" }; b.trigger.parent.parent.Add(stray);
            Mount(root);
            Submit(a.trigger);
            Assert.That(a.trigger.ClassListContains("is-open"), Is.True); Assert.That(a.content.ClassListContains("is-open"), Is.True);
            Assert.That(stray.ClassListContains("is-open"), Is.True); Assert.That(stray.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(b.trigger.ClassListContains("is-open"), Is.False); Assert.That(b.content.ClassListContains("is-open"), Is.False);
            Assert.That(root.ClassListContains("is-open"), Is.False);
            // Manual focus: vertical arrows move focus without toggling and every trigger stays a tab stop.
            Key(a.trigger, KeyCode.DownArrow); Key(b.trigger, KeyCode.DownArrow);
            Assert.That(root.Values, Is.EqualTo(new[] { "a" }));
            Assert.That(a.trigger.tabIndex, Is.Zero); Assert.That(b.trigger.tabIndex, Is.Zero);
        }
        [Test] public void TabsActivateMatchingPanelAndRejectDuplicateValues()
        {
            var root = new Tabs(); var a = Tab(root, "a"); var b = Tab(root, "b"); Mount(root);
            Assert.That(root.Value, Is.EqualTo("a")); Submit(b.tab);
            Assert.That(root.Value, Is.EqualTo("b"));
            Assert.That(a.panel.style.display.value, Is.EqualTo(DisplayStyle.None));
            Assert.That(b.panel.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(b.tab.ClassListContains("is-selected"), Is.True); Assert.That(a.tab.ClassListContains("is-selected"), Is.False);
            Assert.Throws<ArgumentException>(() => root.Values = new[] { "a", "b" });
            var duplicate = new TabsTab { Value = "b", text = "b" }; root.Q<TabsList>().Add(duplicate);
            Assert.Throws<ArgumentException>(() => root.Group.Synchronize());
            duplicate.RemoveFromHierarchy(); root.Group.Synchronize();
            Assert.That(root.Group.Triggers.Count, Is.EqualTo(2)); Assert.That(root.Value, Is.EqualTo("b"));
        }
        [Test] public void TabsArrowNavigationSkipsDisabledAndRespectsManualModeAndLoop()
        {
            var root = new Tabs(); var a = Tab(root, "a").tab; var b = Tab(root, "b", true).tab; var c = Tab(root, "c").tab; Mount(root);
            Key(a, KeyCode.RightArrow); Assert.That(root.Value, Is.EqualTo("c"));
            Key(c, KeyCode.RightArrow); Assert.That(root.Value, Is.EqualTo("a"));
            root.ActivationMode = "manual";
            Key(a, KeyCode.End); Assert.That(root.Value, Is.EqualTo("a"));
            Assert.That(c.tabIndex, Is.Zero); Assert.That(a.tabIndex, Is.EqualTo(-1)); Submit(c); Assert.That(root.Value, Is.EqualTo("c"));
            root.ActivationMode = "automatic"; root.Loop = false;
            Key(c, KeyCode.RightArrow); Assert.That(root.Value, Is.EqualTo("c"));
            root.Orientation = "vertical";
            Key(c, KeyCode.LeftArrow); Assert.That(root.Value, Is.EqualTo("c"));
            Key(c, KeyCode.UpArrow); Assert.That(root.Value, Is.EqualTo("a"));
            Assert.That(b.tabIndex, Is.EqualTo(-1));
        }
        [Test] public void TabsUnmountAndRemountPreserveContentAndNestedState()
        {
            var root = new Tabs { UnmountInactive = true }; var a = Tab(root, "a"); var b = Tab(root, "b");
            var nested = new Switch { Checked = true }; a.panel.Add(nested); Mount(root);
            int index = root.hierarchy.IndexOf(a.panel);
            Submit(b.tab); Assert.That(a.panel.parent, Is.Null);
            Submit(a.tab); Assert.That(a.panel.parent, Is.EqualTo(root)); Assert.That(root.hierarchy.IndexOf(a.panel), Is.EqualTo(index));
            Assert.That(nested.Checked, Is.True); Assert.That(b.panel.parent, Is.Null);
        }
        [Test] public void RemovedPairLeavesItsGroupAndJoinsAnother()
        {
            var root = new Tabs(); var a = Tab(root, "a"); Mount(root);
            Assert.That(root.Group.Triggers.Single(), Is.EqualTo(a.tab));
            a.tab.RemoveFromHierarchy(); a.panel.RemoveFromHierarchy();
            Assert.That(root.Group.Triggers, Is.Empty);
            var other = Mount(new Tabs()); var list = new TabsList(); other.Add(list);
            int changes = 0; root.ValueChanged += _ => changes++;
            list.Add(a.tab); other.Add(a.panel);
            // Interaction discovers a trigger composed after attachment; the previous group ignores it.
            Submit(a.tab);
            Assert.That(other.Group.Triggers.Single(), Is.EqualTo(a.tab)); Assert.That(other.Value, Is.EqualTo("a"));
            Assert.That(changes, Is.Zero);
        }
        [Test] public void NestedTabsKeepTheirOwnParts()
        {
            var outer = new Tabs(); var x = Tab(outer, "x"); Tab(outer, "y");
            var inner = new Tabs(); Tab(inner, "p"); var q = Tab(inner, "q"); x.panel.Add(inner);
            Mount(outer);
            Assert.That(outer.Group.Triggers.Count, Is.EqualTo(2)); Assert.That(inner.Group.Triggers.Count, Is.EqualTo(2));
            Submit(q.tab); Assert.That(inner.Value, Is.EqualTo("q")); Assert.That(outer.Value, Is.EqualTo("x"));
            Key(q.tab, KeyCode.RightArrow); Assert.That(inner.Value, Is.EqualTo("p")); Assert.That(outer.Value, Is.EqualTo("x"));
        }
        [Test] public void VariantPropsToggleRootModifiersAndRejectUndeclaredValues()
        {
            var tabs = new Tabs();
            Assert.That(tabs.ClassListContains("tabs--orientation-horizontal") && tabs.ClassListContains("tabs--appearance-underline") && tabs.ClassListContains("tabs--activationMode-automatic"), Is.True);
            tabs.Appearance = "pills";
            Assert.That(tabs.ClassListContains("tabs--appearance-pills"), Is.True); Assert.That(tabs.ClassListContains("tabs--appearance-underline"), Is.False);
            Assert.Throws<ArgumentException>(() => tabs.Appearance = "outline"); Assert.That(tabs.Appearance, Is.EqualTo("pills"));
            var accordion = new Accordion(); Assert.That(accordion.Type, Is.EqualTo("single")); Assert.That(accordion.ClassListContains("accordion--type-single"), Is.True);
            accordion.Type = "multiple"; Assert.That(accordion.Group.SelectionType, Is.EqualTo("multiple"));
            var popover = new Popover(); Assert.That(popover.Placement, Is.Null);
            popover.Placement = "top"; Assert.That(popover.Surface.Placement, Is.EqualTo("top")); Assert.That(popover.ClassListContains("popover--placement-top"), Is.True);
            Assert.Throws<ArgumentException>(() => popover.Placement = "center");
        }
        [Test] public void PopoverActivationEscapeDisabledAndDetachHonorSurfaceBoundary()
        {
            var popover = new Popover(); Compose(popover); Mount(popover); Submit(popover.Trigger);
            Assert.That(popover.Open, Is.True); Assert.That(popover.Content.parent, Is.Not.Null);
            popover.CloseOnEscape = false; Key(popover.Trigger, KeyCode.Escape); Assert.That(popover.Open, Is.True);
            popover.CloseOnEscape = true; Key(popover.Trigger, KeyCode.Escape);
            Assert.That(popover.Open, Is.False); Assert.That(popover.Content.parent, Is.Null);
            popover.Disabled = true; Submit(popover.Trigger); Assert.That(popover.Open, Is.False);
            popover.Disabled = false; Submit(popover.Trigger); popover.RemoveFromHierarchy();
            Assert.That(popover.Content.parent, Is.Null);
        }
        [Test] public void PopoverContentReparentsToPanelRootOnlyWhileOpen()
        {
            // Content composed before the trigger, holding a nested popover whose trigger must not be adopted.
            var popover = new Popover(); var content = new PopoverContent(); popover.Add(content);
            var nested = new Popover(); var nestedParts = Compose(nested); content.Add(nested);
            var trigger = new PopoverTrigger { text = "Help" }; popover.Add(trigger);
            Mount(popover);
            Assert.That(popover.Trigger, Is.EqualTo(trigger)); Assert.That(popover.Content, Is.EqualTo(content));
            Assert.That(content.parent, Is.Null);
            Submit(trigger);
            Assert.That(content.parent, Is.EqualTo(window.rootVisualElement.panel.visualTree));
            Assert.That(content.ClassListContains("fsds-theme"), Is.True); Assert.That(popover.ClassListContains("is-open"), Is.True);
            Assert.That(nested.Trigger, Is.EqualTo(nestedParts.trigger)); Assert.That(nested.Open, Is.False);
            Submit(trigger);
            Assert.That(content.parent, Is.Null); Assert.That(popover.ClassListContains("is-open"), Is.False);
        }
        [Test] public void PopoverPointerBoundaryExcludesItsOwnContent()
        {
            // Isolate pointer dismissal; pointer focus changes independently exercise blur.
            var popover = new Popover { CloseOnBlur = false }; var parts = Compose(popover); var inner = new Button(); parts.content.Add(inner);
            Mount(popover); var outside = Mount(new Button()); popover.Open = true;
            using (var evt = PointerDownEvent.GetPooled()) { evt.target = inner; inner.SendEvent(evt); }
            Assert.That(popover.Open, Is.True);
            popover.CloseOnOutsideClick = false;
            using (var evt = PointerDownEvent.GetPooled()) { evt.target = outside; outside.SendEvent(evt); }
            Assert.That(popover.Open, Is.True);
            popover.CloseOnOutsideClick = true;
            using (var evt = PointerDownEvent.GetPooled()) { evt.target = outside; outside.SendEvent(evt); }
            Assert.That(popover.Open, Is.False);
        }
        [UnityTest] public IEnumerator PopoverBlurTracksAnchorAndContentUnion()
        {
            var popover = new Popover(); var parts = Compose(popover); var inner = new Button(); parts.content.Add(inner);
            Mount(popover); var outside = Mount(new Button());
            popover.Open = true; popover.Trigger.Focus(); yield return null;
            inner.Focus(); yield return null; Assert.That(popover.Open, Is.True);
            outside.Focus(); yield return null; Assert.That(popover.Open, Is.False);
        }
        [Test] public void AnchoredGeometryFlipsAndShiftsAtViewportEdges()
        {
            var anchor = new Rect(90, 90, 10, 10);
            Assert.That(AnchoredSurface.CalculatePosition(anchor, new Vector2(30, 20), new Vector2(100, 100), "bottom"), Is.EqualTo(new Vector2(70, 66)));
            Assert.That(AnchoredSurface.CalculatePosition(anchor, new Vector2(30, 20), new Vector2(100, 100), "right"), Is.EqualTo(new Vector2(56, 80)));
            Assert.That(AnchoredSurface.CalculatePosition(anchor, new Vector2(130, 120), new Vector2(100, 100), "auto"), Is.EqualTo(Vector2.zero));
        }
        [UnityTest] public IEnumerator UxmlImportsRealGeneratedControlsAndCompoundItems()
        {
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/InteractiveControls/Controls.uxml");
            Assert.That(asset, Is.Not.Null);
            asset.CloneTree(window.rootVisualElement);
            yield return null; yield return null;
            var sound = window.rootVisualElement.Q<Switch>("sound");
            Assert.That(sound.Checked, Is.True); Assert.That(sound.contentContainer.Q<Label>().text, Is.EqualTo("Enable sound"));
            var accordion = window.rootVisualElement.Q<Accordion>("settings");
            Assert.That(accordion.Group.Triggers.Count, Is.EqualTo(2)); Assert.That(accordion.Value, Is.EqualTo("graphics"));
            Assert.That(accordion.Q<AccordionContent>().ClassListContains("is-open"), Is.True);
            var tabs = window.rootVisualElement.Q<Tabs>("pages");
            Assert.That(tabs.Group.Triggers.Count, Is.EqualTo(3)); Submit(tabs.Group.Triggers[1]);
            Assert.That(tabs.Value, Is.EqualTo("inventory"));
            Assert.That(tabs.Group.Triggers[2].enabledSelf, Is.False);
            var popover = window.rootVisualElement.Q<Popover>("help"); Submit(popover.Trigger);
            Assert.That(popover.Open, Is.True); Assert.That(popover.Content.Q<Button>(), Is.Not.Null);
            Assert.That(popover.Content.parent, Is.EqualTo(window.rootVisualElement.panel.visualTree));
        }
    }
}
