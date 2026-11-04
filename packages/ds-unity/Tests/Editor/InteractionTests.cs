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
        [TearDown] public void Teardown() { window.Close(); TestAssets.RemoveSample(); }
        private T Mount<T>(T element) where T : VisualElement { window.rootVisualElement.Add(element); return element; }
        private static void Submit(UnityEngine.UIElements.Button button)
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
            var panel = new TabsPanel { Value = value }; panel.Add(new UnityEngine.UIElements.Label("Content " + value));
            root.Add(panel);
            return (tab, panel);
        }
        private static (AccordionTrigger trigger, AccordionContent content) Section(Accordion root, string value)
        {
            var item = new AccordionItem(); var header = new AccordionHeader();
            var trigger = new AccordionTrigger { Value = value, text = value };
            var content = new AccordionContent { Value = value }; content.Add(new UnityEngine.UIElements.Label("Content " + value));
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
            var control = Mount(new Switch()); var caption = new UnityEngine.UIElements.Label("Enable sound"); control.Add(caption);
            Assert.That(control.hierarchy.Children().Select(c => c.name).ToArray(), Is.EqualTo(new[] { "input", "track", "children" }));
            Assert.That(control.Input.ClassListContains("switch__input"), Is.True);
            Assert.That(control.Thumb.hierarchy.parent, Is.EqualTo(control.Track));
            Assert.That(caption.hierarchy.parent, Is.EqualTo(control.contentContainer));
            Assert.That(control.contentContainer.ClassListContains("switch__children"), Is.True);
            // Geometry comes from the generated stylesheet (resolved values pinned in StylingTests); an inline
            // style would outrank every USS rule and mask the size-variant carriers.
            Assert.That(control.Track.style.width.keyword, Is.EqualTo(StyleKeyword.Null)); Assert.That(control.Thumb.style.height.keyword, Is.EqualTo(StyleKeyword.Null));
            int count = 0; control.RegisterValueChangedCallback(_ => count++);
            Click(caption);
            Assert.That(control.Checked, Is.True); Assert.That(count, Is.EqualTo(1));
            // A click whose target is the control itself arrives through UnityEngine.UIElements.Button.clicked; the label host must not add a second toggle.
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
            // dom: list > [{children}, indicator]: composed tabs sit in the list's children host, before the indicator, and are still discovered.
            var list = root.Q<TabsList>();
            Assert.That(a.tab.hierarchy.parent, Is.EqualTo(list.contentContainer)); Assert.That(list.contentContainer.ClassListContains("tabs__children"), Is.True);
            Assert.That(list.hierarchy.Children().Select(c => c.name).ToArray(), Is.EqualTo(new[] { "children", "indicator" }));
            Assert.That(root.Group.Triggers, Is.EqualTo(new UnityEngine.UIElements.Button[] { a.tab, b.tab }));
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
        [Test] public void ParkedPanelAdoptedByAnotherGroupLeavesItsFormerGroup()
        {
            var former = new Tabs { UnmountInactive = true }; Tab(former, "a"); var parked = Tab(former, "b"); Mount(former);
            Assert.That(parked.panel.parent, Is.Null);
            var adopter = new Tabs(); Tab(adopter, "x"); adopter.Add(parked.panel); Mount(adopter);
            var display = parked.panel.style.display.value;
            // The former group must neither remove the adopted panel nor reclaim it through later selection.
            former.Group.Synchronize();
            Assert.That(parked.panel.parent, Is.EqualTo(adopter)); Assert.That(parked.panel.style.display.value, Is.EqualTo(display));
            former.Value = "b";
            Assert.That(parked.panel.parent, Is.EqualTo(adopter)); Assert.That(parked.panel.ClassListContains("is-selected"), Is.False);
            former.Value = "a";
            Assert.That(parked.panel.parent, Is.EqualTo(adopter)); Assert.That(parked.panel.style.display.value, Is.EqualTo(display));
        }
        [Test] public void PanelParkedByTwoGroupsBelongsToTheLastDiscoverer()
        {
            var former = new Tabs { UnmountInactive = true }; Tab(former, "a"); var moved = Tab(former, "b"); Mount(former);
            var adopter = new Tabs { UnmountInactive = true }; Tab(adopter, "x"); adopter.Q<TabsList>().Add(new TabsTab { Value = "b", text = "b" });
            adopter.Add(moved.panel); Mount(adopter);
            // Both groups now hold a parked record with no parent; only the adopter discovered it last.
            Assert.That(moved.panel.parent, Is.Null);
            former.Value = "b"; Assert.That(moved.panel.parent, Is.Null);
            adopter.Value = "b"; Assert.That(moved.panel.parent, Is.EqualTo(adopter));
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
            // Web class recipe: <prefix>--<value>, one class per declared axis.
            Assert.That(tabs.ClassListContains("tabs--horizontal") && tabs.ClassListContains("tabs--underline") && tabs.ClassListContains("tabs--automatic"), Is.True);
            tabs.Appearance = "pills";
            Assert.That(tabs.ClassListContains("tabs--pills"), Is.True); Assert.That(tabs.ClassListContains("tabs--underline"), Is.False);
            // Swapping one axis leaves the other axes' modifiers in place.
            Assert.That(tabs.Orientation, Is.EqualTo("horizontal")); Assert.That(tabs.ActivationMode, Is.EqualTo("automatic"));
            tabs.Orientation = "vertical";
            Assert.That(tabs.ClassListContains("tabs--vertical") && !tabs.ClassListContains("tabs--horizontal") && tabs.ClassListContains("tabs--pills"), Is.True);
            Assert.Throws<ArgumentException>(() => tabs.Appearance = "outline"); Assert.That(tabs.Appearance, Is.EqualTo("pills"));
            Assert.That(tabs.ClassListContains("tabs--outline"), Is.False);
            var accordion = new Accordion(); Assert.That(accordion.Type, Is.EqualTo("single")); Assert.That(accordion.ClassListContains("accordion--single"), Is.True);
            accordion.Type = "multiple"; Assert.That(accordion.Group.SelectionType, Is.EqualTo("multiple"));
            Assert.That(accordion.ClassListContains("accordion--multiple") && !accordion.ClassListContains("accordion--single"), Is.True);
            var popover = new Popover(); Assert.That(popover.Placement, Is.Null);
            popover.Placement = "top"; Assert.That(popover.Surface.Placement, Is.EqualTo("top")); Assert.That(popover.ClassListContains("popover--top"), Is.True);
            popover.Placement = "bottom"; Assert.That(popover.ClassListContains("popover--bottom") && !popover.ClassListContains("popover--top"), Is.True);
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
        [UnityTest] public IEnumerator ContentComposedIntoAnAttachedClosedPopoverIsParked()
        {
            var popover = Mount(new Popover()); yield return null;
            var trigger = new PopoverTrigger { text = "Help" }; var content = new PopoverContent(); content.Add(new UnityEngine.UIElements.Label("Late content"));
            popover.Add(trigger); popover.Add(content);
            yield return null; yield return null;
            // Layout alone (no getter, no channel call) must apply the closed presentation.
            Assert.That(content.parent, Is.Null);
            Assert.That(popover.Content, Is.EqualTo(content)); Assert.That(content.parent, Is.Null);
            Assert.That(popover.Open, Is.False); Assert.That(popover.ClassListContains("is-open"), Is.False);
            Submit(trigger); Assert.That(content.parent, Is.EqualTo(window.rootVisualElement.panel.visualTree));
            Submit(trigger); Assert.That(content.parent, Is.Null);
        }
        [Test] public void PopoverContentAdoptedByAnotherPopoverLeavesItsFormerSurface()
        {
            var former = new Popover(); var parts = Compose(former); Mount(former);
            Assert.That(parts.content.parent, Is.Null);
            var adopter = new Popover(); var adopterTrigger = new PopoverTrigger { text = "Other" }; adopter.Add(adopterTrigger); adopter.Add(parts.content); Mount(adopter);
            Assert.That(adopter.Content, Is.EqualTo(parts.content));
            // Opening the former surface must not pull the adopted content back to the panel root.
            former.Open = true;
            Assert.That(parts.content.parent, Is.Null); Assert.That(former.Content, Is.Null);
            adopter.Open = true; Assert.That(parts.content.parent, Is.EqualTo(window.rootVisualElement.panel.visualTree));
            former.Open = false; Assert.That(parts.content.parent, Is.EqualTo(window.rootVisualElement.panel.visualTree));
        }
        [Test] public void PopoverPointerBoundaryExcludesItsOwnContent()
        {
            // Isolate pointer dismissal; pointer focus changes independently exercise blur.
            var popover = new Popover { CloseOnBlur = false }; var parts = Compose(popover); var inner = new UnityEngine.UIElements.Button(); parts.content.Add(inner);
            Mount(popover); var outside = Mount(new UnityEngine.UIElements.Button()); popover.Open = true;
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
            var popover = new Popover(); var parts = Compose(popover); var inner = new UnityEngine.UIElements.Button(); parts.content.Add(inner);
            Mount(popover); var outside = Mount(new UnityEngine.UIElements.Button());
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
            TestAssets.StageSample();
            TestAssets.SampleControls().CloneTree(window.rootVisualElement);
            yield return null; yield return null;
            var sound = window.rootVisualElement.Q<Switch>("sound");
            Assert.That(sound.Checked, Is.True); Assert.That(sound.contentContainer.Q<UnityEngine.UIElements.Label>().text, Is.EqualTo("Enable sound"));
            var accordion = window.rootVisualElement.Q<Accordion>("settings");
            Assert.That(accordion.Group.Triggers.Count, Is.EqualTo(2)); Assert.That(accordion.Value, Is.EqualTo("graphics"));
            Assert.That(accordion.Q<AccordionContent>().ClassListContains("is-open"), Is.True);
            var tabs = window.rootVisualElement.Q<Tabs>("pages");
            Assert.That(tabs.Group.Triggers.Count, Is.EqualTo(3)); Submit(tabs.Group.Triggers[1]);
            Assert.That(tabs.Value, Is.EqualTo("inventory"));
            Assert.That(tabs.Group.Triggers[2].enabledSelf, Is.False);
            var popover = window.rootVisualElement.Q<Popover>("help"); Submit(popover.Trigger);
            Assert.That(popover.Open, Is.True); Assert.That(popover.Content.Q<UnityEngine.UIElements.Button>(), Is.Not.Null);
            Assert.That(popover.Content.parent, Is.EqualTo(window.rootVisualElement.panel.visualTree));
        }
        [Test] public void ActionButtonFiresOncePerActivationAndSuppressesDisabled()
        {
            var fired = 0;
            var button = Mount(new FullStackDS.Button());
            button.OnClick = () => fired++;
            Submit(button);
            Assert.That(fired, Is.EqualTo(1));
            button.Disabled = true;
            Submit(button);
            Assert.That(fired, Is.EqualTo(1), "a disabled action control suppresses activation");
        }
        [Test] public void ActionButtonRoutesConsumerChildrenIntoItsContentHost()
        {
            var button = Mount(new FullStackDS.Button());
            var label = new UnityEngine.UIElements.Label("Resume");
            button.Add(label);
            Assert.That(button.contentContainer, Is.SameAs(button));
            Assert.That(label.parent, Is.SameAs(button));
            Assert.That(button.ClassListContains("button"), Is.True);
            Assert.That(button.ClassListContains("button--primary"), Is.True);
        }
        [Test] public void ActionButtonVariantAndSizeSetClassCarriers()
        {
            var button = Mount(new FullStackDS.Button { Variant = "ghost", Size = "large" });
            Assert.That(button.ClassListContains("button--ghost"), Is.True);
            Assert.That(button.ClassListContains("button--large"), Is.True);
            Assert.That(button.enabledSelf, Is.True);
        }
        [Test] public void CheckboxActivatesThroughItsNativeControlAndItsLabelHostOnce()
        {
            var checkbox = Mount(new FullStackDS.Checkbox());
            var changes = 0;
            checkbox.RegisterValueChangedCallback(_ => changes++);
            Submit(checkbox.Trigger);
            Assert.That(checkbox.Checked, Is.True);
            Assert.That(changes, Is.EqualTo(1));
            // The label host is the root: a click outside the native control toggles once.
            Click(checkbox);
            Assert.That(checkbox.Checked, Is.False);
            Assert.That(changes, Is.EqualTo(2));
            checkbox.Disabled = true;
            Submit(checkbox.Trigger);
            Assert.That(checkbox.Checked, Is.False, "disabled activation is suppressed");
        }
        [Test] public void CheckboxExposesNoIndeterminateOrSizeApi()
        {
            Assert.That(typeof(FullStackDS.Checkbox).GetProperty("Indeterminate"), Is.Null);
            Assert.That(typeof(FullStackDS.Checkbox).GetProperty("Size"), Is.Null);
        }
        [Test] public void ToggleSwitchRootIsItsOwnTriggerAndTogglesOncePerActivation()
        {
            var toggle = Mount(new FullStackDS.ToggleSwitch());
            var changes = 0;
            INotifyValueChanged<bool> channel = toggle;
            channel.RegisterValueChangedCallback(_ => changes++);
            Assert.That(toggle.Trigger, Is.SameAs(toggle));
            Submit(toggle);
            Assert.That(toggle.Checked, Is.True);
            Assert.That(changes, Is.EqualTo(1));
            Submit(toggle);
            Assert.That(toggle.Checked, Is.False);
            Assert.That(changes, Is.EqualTo(2));
            toggle.Disabled = true;
            Submit(toggle);
            Assert.That(toggle.Checked, Is.False, "disabled activation is suppressed");
        }
        [Test] public void PassiveContainersComposeChildrenAndCarryStyleAxes()
        {
            var stat = Mount(new FullStackDS.Stat { Size = "lg", Trend = "up" });
            stat.Add(new UnityEngine.UIElements.Label("42"));
            Assert.That(stat.ClassListContains("stat--lg"), Is.True);
            Assert.That(stat.ClassListContains("stat--up"), Is.True);
            Assert.That(stat.contentContainer.childCount, Is.EqualTo(1));
            var quote = Mount(new FullStackDS.Blockquote { Variant = "bordered", Size = "sm" });
            quote.Add(new UnityEngine.UIElements.Label("quoted"));
            Assert.That(quote.ClassListContains("blockquote--bordered"), Is.True);
            Assert.That(quote.ClassListContains("blockquote--sm"), Is.True);
            Assert.That(quote.contentContainer.childCount, Is.EqualTo(1));
            var flag = Mount(new FullStackDS.ProfileFlag());
            flag.Add(new UnityEngine.UIElements.Label("Commander"));
            Assert.That(flag.ClassListContains("profile-flag"), Is.True);
            Assert.That(flag.contentContainer.childCount, Is.EqualTo(1));
            Assert.That(typeof(FullStackDS.ProfileFlag).GetProperty("Profile"), Is.Null);
            Assert.That(typeof(FullStackDS.Blockquote).GetProperty("Cite"), Is.Null);
        }
        [Test] public void BadgeCarriesAxesAndItsNodeContentIconIsOmitted()
        {
            var badge = Mount(new FullStackDS.Badge { Variant = "tag", Intent = "success", Size = "lg" });
            var content = new FullStackDS.BadgeContent();
            content.Add(new UnityEngine.UIElements.Label("New"));
            badge.Add(content);
            Assert.That(badge.ClassListContains("badge--tag"), Is.True);
            Assert.That(badge.ClassListContains("badge--success"), Is.True);
            Assert.That(badge.ClassListContains("badge--lg"), Is.True);
            Assert.That(content.parent, Is.SameAs(badge));
            Assert.That(content.childCount, Is.EqualTo(1));
            Assert.That(typeof(FullStackDS.Badge).GetProperty("Icon"), Is.Null);
            Assert.That(typeof(FullStackDS.Badge).GetProperty("ShowStatusIcon"), Is.Null);
        }
        [Test] public void ListComposesItemsAndCarriesPrefixedAxes()
        {
            var list = Mount(new FullStackDS.List { Variant = "inline", Size = "lg" });
            list.Add(new UnityEngine.UIElements.Label("one"));
            list.Add(new UnityEngine.UIElements.Label("two"));
            Assert.That(list.ClassListContains("list"), Is.True);
            Assert.That(list.ClassListContains("list--variant-inline"), Is.True);
            Assert.That(list.ClassListContains("list--size-lg"), Is.True);
            Assert.That(list.contentContainer, Is.SameAs(list));
            Assert.That(list.contentContainer.childCount, Is.EqualTo(2));
            foreach (var prop in new[] { "As", "Marker", "Spacing" })
                Assert.That(typeof(FullStackDS.List).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void AlertContainersCarryAxesAndOmitGuardedChrome()
        {
            var alert = Mount(new FullStackDS.Alert { Intent = "warning", Level = "section" });
            alert.Add(new UnityEngine.UIElements.Label("Careful"));
            Assert.That(alert.ClassListContains("alert--warning"), Is.True);
            Assert.That(alert.ClassListContains("alert--section"), Is.True);
            Assert.That(alert.contentContainer.childCount, Is.EqualTo(1));
            foreach (var prop in new[] { "Icon", "Dismissible", "OnDismiss", "DismissLabel" })
                Assert.That(typeof(FullStackDS.Alert).GetProperty(prop), Is.Null, prop);
            var notice = Mount(new FullStackDS.AlertNotice { Status = "error", Level = "page" });
            notice.Add(new FullStackDS.AlertNoticeTitle());
            Assert.That(notice.ClassListContains("alert-notice--error"), Is.True);
            Assert.That(notice.ClassListContains("alert-notice--page"), Is.True);
            Assert.That(notice.contentContainer.childCount, Is.EqualTo(1));
            foreach (var prop in new[] { "Icon", "Dismissible", "OnDismiss", "DismissLabel" })
                Assert.That(typeof(FullStackDS.AlertNotice).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void SemanticWrappersComposeContentAndIgnoreDomMetadata()
        {
            var label = Mount(new FullStackDS.Label());
            label.text = "Capacity";
            Assert.That(label.text, Is.EqualTo("Capacity"));
            Assert.That(label.ClassListContains("label"), Is.True);
            Assert.That(typeof(FullStackDS.Label).GetProperty("HtmlFor"), Is.Not.Null);
            Assert.That(typeof(FullStackDS.Label).GetProperty("Form"), Is.Null);
            var crumbs = Mount(new FullStackDS.Breadcrumbs());
            var list = new FullStackDS.BreadcrumbsList();
            var item = new FullStackDS.BreadcrumbsItem();
            item.Add(new UnityEngine.UIElements.Label("Home"));
            list.Add(item);
            crumbs.Add(list);
            Assert.That(crumbs.ClassListContains("breadcrumbs"), Is.True);
            Assert.That(list.ClassListContains("breadcrumbs__list"), Is.True);
            Assert.That(item.ClassListContains("breadcrumbs__item"), Is.True);
            Assert.That(item.childCount, Is.EqualTo(1));
            Assert.That(typeof(FullStackDS.Breadcrumbs).GetProperty("AriaLabel"), Is.Null);
            Assert.That(typeof(FullStackDS.Breadcrumbs).GetProperty("Separator"), Is.Null);
        }
        [Test] public void TooltipOpensOnHoverAndFocusAndClosesOnLeaveAndEscape()
        {
            var tooltip = new FullStackDS.Tooltip();
            var trigger = new FullStackDS.TooltipTrigger { text = "Hover" };
            var content = new FullStackDS.TooltipContent(); content.Add(new UnityEngine.UIElements.Label("Help"));
            tooltip.Add(trigger); tooltip.Add(content);
            Mount(tooltip);
            Assert.That(tooltip.Open, Is.False);
            using (var evt = PointerEnterEvent.GetPooled()) { evt.target = trigger; trigger.SendEvent(evt); }
            Assert.That(tooltip.Open, Is.True, "pointer enter opens the tooltip");
            using (var evt = PointerLeaveEvent.GetPooled()) { evt.target = trigger; trigger.SendEvent(evt); }
            Assert.That(tooltip.Open, Is.False, "pointer leave closes the tooltip");
            using (var evt = PointerEnterEvent.GetPooled()) { evt.target = trigger; trigger.SendEvent(evt); }
            Key(trigger, KeyCode.Escape);
            Assert.That(tooltip.Open, Is.False, "escape closes the tooltip");
            trigger.Focus();
            Assert.That(tooltip.Open, Is.True, "trigger focus opens the tooltip");
            using (var evt = PointerLeaveEvent.GetPooled()) { evt.target = trigger; trigger.SendEvent(evt); }
            Assert.That(tooltip.Open, Is.False, "pointer leave closes the focused tooltip");
            tooltip.Disabled = true;
            using (var evt = PointerEnterEvent.GetPooled()) { evt.target = trigger; trigger.SendEvent(evt); }
            Assert.That(tooltip.Open, Is.False, "a disabled trigger does not open the tooltip");
        }
        [Test] public void StatusComposesTextAndCarriesItsRenamedAxis()
        {
            var status = Mount(new FullStackDS.Status { StatusValue = "danger" });
            status.contentContainer.Add(new UnityEngine.UIElements.Label("Offline"));
            Assert.That(status.ClassListContains("status"), Is.True);
            Assert.That(status.ClassListContains("status--danger"), Is.True);
            Assert.That(status.contentContainer.childCount, Is.EqualTo(1));
            Assert.That(typeof(FullStackDS.Status).GetProperty("Icon"), Is.Null);
        }
        [Test] public void CardComposesSubcomponentPartsAndDensityCarrier()
        {
            var card = Mount(new FullStackDS.Card { Density = "inset" });
            var header = new FullStackDS.CardHeader();
            header.Add(new UnityEngine.UIElements.Label("Title"));
            var content = new FullStackDS.CardContent();
            content.Add(new UnityEngine.UIElements.Label("Body"));
            var actions = new FullStackDS.CardActions();
            card.Add(header); card.Add(content); card.Add(actions);
            Assert.That(card.ClassListContains("card"), Is.True);
            Assert.That(card.ClassListContains("card--inset"), Is.True);
            Assert.That(header.ClassListContains("card__header"), Is.True);
            Assert.That(content.ClassListContains("card__content"), Is.True);
            Assert.That(header.childCount, Is.EqualTo(1));
            Assert.That(typeof(FullStackDS.Card).GetProperty("Interactive"), Is.Null);
        }
        [Test] public void NavListComposesItsListAndItems()
        {
            var nav = Mount(new FullStackDS.NavList());
            var list = new FullStackDS.NavListList();
            var item = new FullStackDS.NavListItem();
            item.Add(new UnityEngine.UIElements.Label("Overview"));
            list.Add(item);
            nav.Add(list);
            Assert.That(nav.ClassListContains("nav-list"), Is.True);
            Assert.That(list.ClassListContains("nav-list__list"), Is.True);
            Assert.That(item.ClassListContains("nav-list__item"), Is.True);
            Assert.That(item.childCount, Is.EqualTo(1));
            Assert.That(typeof(FullStackDS.NavList).GetProperty("Orientation"), Is.Null);
            Assert.That(typeof(FullStackDS.NavList).GetProperty("AriaLabel"), Is.Null);
        }
        [Test] public void SkeletonCarriesPlaceholderAxesWithoutIterationOrStateApi()
        {
            var skeleton = Mount(new FullStackDS.Skeleton { Variant = "text", Animate = "none", Density = "compact" });
            Assert.That(skeleton.ClassListContains("skeleton"), Is.True);
            Assert.That(skeleton.ClassListContains("skeleton--text"), Is.True);
            Assert.That(skeleton.ClassListContains("skeleton--none"), Is.True);
            Assert.That(skeleton.ClassListContains("skeleton--compact"), Is.True);
            Assert.That(skeleton.childCount, Is.EqualTo(0));
            foreach (var prop in new[] { "Lines", "Radius", "AspectRatio", "Decorative", "AriaLabel" })
                Assert.That(typeof(FullStackDS.Skeleton).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void TableComposesRowsAndCellsInsideItsRegion()
        {
            var table = Mount(new FullStackDS.Table());
            var row = new FullStackDS.TableRow();
            var cell = new FullStackDS.TableCell();
            cell.Add(new UnityEngine.UIElements.Label("42"));
            row.Add(cell);
            table.Add(row);
            Assert.That(table.ClassListContains("table"), Is.True);
            Assert.That(table.Container.ClassListContains("table__container"), Is.True);
            Assert.That(table.contentContainer, Is.SameAs(table.Container));
            Assert.That(table.Container.childCount, Is.EqualTo(1));
            Assert.That(row.ClassListContains("table__row"), Is.True);
            Assert.That(cell.ClassListContains("table__cell"), Is.True);
            Assert.That(typeof(FullStackDS.Table).GetProperty("Responsive"), Is.Null);
            Assert.That(typeof(FullStackDS.Table).GetProperty("AriaLabel"), Is.Null);
        }
        [Test] public void CodeBlockComposesLinesInsideItsCodeRegion()
        {
            var code = Mount(new FullStackDS.CodeBlock());
            code.contentContainer.Add(new UnityEngine.UIElements.Label("var answer = 42;"));
            Assert.That(code.ClassListContains("code-block"), Is.True);
            Assert.That(code.Code.ClassListContains("code-block__code"), Is.True);
            Assert.That(code.Code.childCount, Is.EqualTo(1));
            Assert.That(code.contentContainer, Is.SameAs(code.Code.Children().First()));
            foreach (var prop in new[] { "Language", "Highlight", "Tokens", "ShowLineNumbers" })
                Assert.That(typeof(FullStackDS.CodeBlock).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void DetailsDisclosureTogglesContentPresenceAndRaisesChangeEvent()
        {
            var details = Mount(new FullStackDS.Details { Summary = "Advanced settings" });
            var changes = new System.Collections.Generic.List<bool>();
            details.RegisterValueChangedCallback(evt => changes.Add(evt.newValue));
            Assert.That(details.Open, Is.False);
            Assert.That(details.Content.style.display.value, Is.EqualTo(DisplayStyle.None));
            Assert.That(details.SummaryText.text, Is.EqualTo("Advanced settings"));
            Submit(details.Trigger);
            Assert.That(details.Open, Is.True);
            Assert.That(details.Content.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(changes, Is.EqualTo(new[] { true }));
            details.SetValueWithoutNotify(false);
            Assert.That(details.Open, Is.False);
            Assert.That(details.Content.style.display.value, Is.EqualTo(DisplayStyle.None));
            details.Disabled = true;
            Assert.That(details.enabledSelf, Is.False);
        }
        [Test] public void ProgressClampsValueIntoItsDeclaredRangeAndTogglesValuePresence()
        {
            var progress = Mount(new FullStackDS.Progress());
            progress.contentContainer.Add(new UnityEngine.UIElements.Label("50%"));
            Assert.That(progress.ClassListContains("progress"), Is.True);
            Assert.That(progress.Fill.ClassListContains("progress__fill"), Is.True);
            Assert.That(progress.contentContainer, Is.SameAs(progress.ValueControl));
            Assert.That(progress.Value, Is.EqualTo(0f));
            Assert.That(progress.Fill.style.width.value.unit, Is.EqualTo(LengthUnit.Percent));
            progress.Value = 50f;
            Assert.That(progress.Fill.style.width.value.value, Is.EqualTo(50f).Within(0.01f));
            progress.Value = 150f;
            Assert.That(progress.Value, Is.EqualTo(100f));
            Assert.That(progress.Fill.style.width.value.value, Is.EqualTo(100f).Within(0.01f));
            progress.Value = -25f;
            Assert.That(progress.Value, Is.EqualTo(0f));
            Assert.That(progress.ValueControl.style.display.value, Is.EqualTo(DisplayStyle.None));
            progress.ShowValue = true;
            Assert.That(progress.ValueControl.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            progress.ShowValue = false;
            Assert.That(progress.ValueControl.style.display.value, Is.EqualTo(DisplayStyle.None));
            foreach (var prop in new[] { "FormatValue", "Label" })
                Assert.That(typeof(FullStackDS.Progress).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void ChipForwardsComposedActionAndDismissAndGuardsDismissPresence()
        {
            var chip = Mount(new FullStackDS.Chip());
            chip.contentContainer.Add(new UnityEngine.UIElements.Label("Filter"));
            int clicks = 0; int dismisses = 0;
            chip.OnClick = () => clicks++;
            chip.OnDismiss = () => dismisses++;
            Assert.That(chip.ClassListContains("chip"), Is.True);
            Assert.That(chip.Action.ClassListContains("chip__action"), Is.True);
            Assert.That(chip.Dismiss.ClassListContains("chip__dismiss"), Is.True);
            Assert.That(chip.contentContainer, Is.SameAs(chip.Text));
            Assert.That(chip.Dismissible, Is.False);
            Assert.That(chip.Dismiss.style.display.value, Is.EqualTo(DisplayStyle.None));
            Submit(chip.Action);
            Assert.That(clicks, Is.EqualTo(1));
            chip.Dismissible = true;
            Assert.That(chip.Dismiss.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Submit(chip.Dismiss);
            Assert.That(dismisses, Is.EqualTo(1));
            chip.Disabled = true;
            Submit(chip.Action);
            Submit(chip.Dismiss);
            Assert.That(clicks, Is.EqualTo(1));
            Assert.That(dismisses, Is.EqualTo(1));
            foreach (var prop in new[] { "AriaLabel", "AriaExpanded", "AriaPressed", "Type" })
                Assert.That(typeof(FullStackDS.Chip).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void CodeSnippetPaintsItsTextAttributeAndCarriesTheAsModifier()
        {
            var snippet = Mount(new FullStackDS.CodeSnippet());
            Assert.That(snippet, Is.InstanceOf<TextElement>());
            Assert.That(snippet.ClassListContains("code-snippet"), Is.True);
            snippet.Text = "git status";
            Assert.That(snippet.text, Is.EqualTo("git status"));
            snippet.As = "kbd";
            Assert.That(snippet.ClassListContains("code-snippet--kbd"), Is.True);
            Assert.That(snippet.ClassListContains("code-snippet--code"), Is.False);
            snippet.As = "samp";
            Assert.That(snippet.ClassListContains("code-snippet--samp"), Is.True);
        }
        [Test] public void DialogOpensAsABlockingModalAndHonoursDismissalKnobs()
        {
            var dialog = Mount(new FullStackDS.Dialog());
            dialog.contentContainer.Add(new UnityEngine.UIElements.Label("Settings"));
            int changes = 0;
            dialog.RegisterValueChangedCallback(_ => changes++);
            Assert.That(dialog.Open, Is.False);
            Assert.That(dialog.Content.style.display.value, Is.EqualTo(DisplayStyle.None));
            dialog.Open = true;
            Assert.That(dialog.Open, Is.True);
            Assert.That(dialog.Content.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(dialog.ClassListContains("is-open"), Is.True);
            Assert.That(changes, Is.EqualTo(1));
            Key(dialog, KeyCode.Escape);
            Assert.That(dialog.Open, Is.False);
            Assert.That(dialog.Content.style.display.value, Is.EqualTo(DisplayStyle.None));
            dialog.Open = true;
            using (var evt = PointerDownEvent.GetPooled()) { evt.target = dialog.Backdrop; dialog.Backdrop.SendEvent(evt); }
            Assert.That(dialog.Open, Is.False);
            dialog.Open = true;
            Submit(dialog.CloseButton);
            Assert.That(dialog.Open, Is.False);
            dialog.Dismissible = false;
            Assert.That(dialog.CloseButton.style.display.value, Is.EqualTo(DisplayStyle.None));
            dialog.Dismissible = true;
            dialog.CloseOnEscape = false;
            dialog.Open = true;
            Key(dialog, KeyCode.Escape);
            Assert.That(dialog.Open, Is.True);
            dialog.CloseOnBackdropClick = false;
            using (var evt = PointerDownEvent.GetPooled()) { evt.target = dialog.Backdrop; dialog.Backdrop.SendEvent(evt); }
            Assert.That(dialog.Open, Is.True);
            dialog.Open = false;
            dialog.Controlled = true;
            bool? requested = null;
            dialog.ValueRequested += next => requested = next;
            dialog.Open = true;
            Submit(dialog.CloseButton);
            Assert.That(dialog.Open, Is.True);
            Assert.That(requested, Is.False);
            foreach (var prop in new[] { "AriaLabel", "InitialFocus", "ReturnFocus" })
                Assert.That(typeof(FullStackDS.Dialog).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void SheetReusesTheModalSurfaceAndAlignsToItsPlacementEdge()
        {
            var sheet = Mount(new FullStackDS.Sheet());
            sheet.contentContainer.Add(new UnityEngine.UIElements.Label("Panel"));
            Assert.That(sheet.Open, Is.False);
            Assert.That(sheet.Side, Is.EqualTo("right"));
            Assert.That(sheet.ClassListContains("sheet--right"), Is.True);
            sheet.Open = true;
            Assert.That(sheet.Content.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(sheet.ClassListContains("is-open"), Is.True);
            sheet.Side = "left";
            Assert.That(sheet.Surface.Placement, Is.EqualTo("left"));
            Assert.That(sheet.ClassListContains("sheet--left"), Is.True);
            Key(sheet, KeyCode.Escape);
            Assert.That(sheet.Open, Is.False);
            sheet.Open = true;
            using (var evt = PointerDownEvent.GetPooled()) { evt.target = sheet.Overlay; sheet.Overlay.SendEvent(evt); }
            Assert.That(sheet.Open, Is.False);
            sheet.Open = true;
            Submit(sheet.Close);
            Assert.That(sheet.Open, Is.False);
            foreach (var prop in new[] { "AriaLabel", "Modal" })
                Assert.That(typeof(FullStackDS.Sheet).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void InputMapsItsStringChannelToTheNativeTextField()
        {
            var input = Mount(new FullStackDS.Input());
            Assert.That(input, Is.InstanceOf<UnityEngine.UIElements.TextField>());
            Assert.That(input.ClassListContains("input"), Is.True);
            input.DefaultValue = "initial";
            Assert.That(input.Value, Is.EqualTo("initial"));
            input.Placeholder = "Search";
            Assert.That(input.textEdition.placeholder, Is.EqualTo("Search"));
            input.SetValueWithoutNotify("typed");
            Assert.That(input.Value, Is.EqualTo("typed"));
            string requested = null;
            int requests = 0;
            input.ValueRequested += next => { requested = next; requests++; };
            using (var evt = ChangeEvent<string>.GetPooled("", "edited")) { evt.target = input; input.SendEvent(evt); }
            Assert.That(input.Value, Is.EqualTo("edited"));
            Assert.That(requested, Is.EqualTo("edited"));
            Assert.That(requests, Is.EqualTo(1));
            input.Controlled = true;
            using (var evt = ChangeEvent<string>.GetPooled("edited", "blocked")) { evt.target = input; input.SendEvent(evt); }
            Assert.That(requested, Is.EqualTo("blocked"));
            Assert.That(input.Value, Is.EqualTo("edited"));
            Assert.That(requests, Is.EqualTo(2));
            input.SetValueWithoutNotify("committed");
            Assert.That(input.Value, Is.EqualTo("committed"));
            input.Invalid = true;
            Assert.That(input.ClassListContains("input--invalid"), Is.True);
            input.Disabled = true;
            Assert.That(input.enabledSelf, Is.False);
            using (var evt = ChangeEvent<string>.GetPooled("committed", "ignored")) { evt.target = input; input.SendEvent(evt); }
            Assert.That(input.Value, Is.EqualTo("committed"));
            Assert.That(requests, Is.EqualTo(2));
            foreach (var prop in new[] { "Type", "Name", "Required", "AriaLabel" })
                Assert.That(typeof(FullStackDS.Input).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void LabelActivationFocusesAssociatedInput()
        {
            var input = Mount(new FullStackDS.Input());
            input.name = "search";
            var label = Mount(new FullStackDS.Label { HtmlFor = "search" });
            Click(label);
            Assert.That(window.rootVisualElement.focusController.focusedElement, Is.SameAs(input));
            label.HtmlFor = "missing";
            label.AssociatedControl = input;
            Click(label);
            Assert.That(window.rootVisualElement.focusController.focusedElement, Is.SameAs(input));
        }
        [Test] public void TextFieldWrapsItsNativeFieldAndExposesNamedSlots()
        {
            var field = Mount(new FullStackDS.TextField());
            Assert.That(field, Is.Not.InstanceOf<UnityEngine.UIElements.TextField>());
            Assert.That(field.Field, Is.InstanceOf<UnityEngine.UIElements.TextField>());
            Assert.That(field.ClassListContains("text-field"), Is.True);
            Assert.That(field.LabelSlot.ClassListContains("text-field__label"), Is.True);
            field.LabelSlot.Add(new UnityEngine.UIElements.Label("Name"));
            field.DescriptionSlot.Add(new UnityEngine.UIElements.Label("Your display name"));
            field.ErrorSlot.Add(new UnityEngine.UIElements.Label("Required"));
            Assert.That(field.LabelSlot.childCount, Is.EqualTo(1));
            Assert.That(field.DescriptionSlot.childCount, Is.EqualTo(1));
            Assert.That(field.ErrorSlot.childCount, Is.EqualTo(1));
            field.SetValueWithoutNotify("typed");
            Assert.That(field.Value, Is.EqualTo("typed"));
            Assert.That(field.Field.value, Is.EqualTo("typed"));
            field.Controlled = true;
            string requested = null;
            field.ValueRequested += next => requested = next;
            using (var evt = ChangeEvent<string>.GetPooled("typed", "blocked")) { evt.target = field.Field; field.Field.SendEvent(evt); }
            Assert.That(requested, Is.EqualTo("blocked"));
            Assert.That(field.Value, Is.EqualTo("typed"));
            field.Disabled = true;
            Assert.That(field.enabledSelf, Is.False);
        }
        [Test] public void ToastPresenceTitleAndCloseFollowTheSurface()
        {
            var toast = Mount(new FullStackDS.Toast());
            toast.contentContainer.Add(new UnityEngine.UIElements.Label("Saved"));
            Assert.That(toast.ClassListContains("toast"), Is.True);
            Assert.That(toast.Open, Is.False);
            Assert.That(toast.Item.style.display.value, Is.EqualTo(DisplayStyle.None));
            toast.Open = true;
            Assert.That(toast.Item.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(toast.ClassListContains("is-open"), Is.True);
            toast.Title = "Saved";
            Assert.That(toast.TitleControl.text, Is.EqualTo("Saved"));
            Assert.That(toast.TitleControl.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            toast.Variant = "success";
            Assert.That(toast.ClassListContains("toast--success"), Is.True);
            Submit(toast.Close);
            Assert.That(toast.Open, Is.False);
            toast.Open = true;
            Key(toast, KeyCode.Escape);
            Assert.That(toast.Open, Is.False);
            toast.Controlled = true;
            bool? requested = null;
            toast.ValueRequested += next => requested = next;
            toast.Open = true;
            Submit(toast.Close);
            Assert.That(toast.Open, Is.True);
            Assert.That(requested, Is.False);
            foreach (var prop in new[] { "Politeness", "AriaLabel" })
                Assert.That(typeof(FullStackDS.Toast).GetProperty(prop), Is.Null, prop);
        }
        [UnityTest] public IEnumerator ToastAutoDismissesAfterItsDuration()
        {
            var toast = Mount(new FullStackDS.Toast { Duration = 10f });
            toast.Open = true;
            Assert.That(toast.Open, Is.True);
            var deadline = Time.realtimeSinceStartup + 2f;
            while (toast.Open && Time.realtimeSinceStartup < deadline) yield return null;
            Assert.That(toast.Open, Is.False);
        }
        [Test] public void FieldExposesItsSlotHostsAndStatusCarrier()
        {
            var field = Mount(new FullStackDS.Field());
            Assert.That(field.ClassListContains("field"), Is.True);
            field.LabelSlot.Add(new UnityEngine.UIElements.Label("Name"));
            field.ControlSlot.Add(new FullStackDS.Input());
            field.HelpSlot.Add(new UnityEngine.UIElements.Label("Shown on your profile"));
            field.ErrorSlot.Add(new UnityEngine.UIElements.Label("Required"));
            Assert.That(field.LabelSlot.childCount, Is.EqualTo(1));
            Assert.That(field.ControlSlot[0], Is.InstanceOf<FullStackDS.Input>());
            Assert.That(field.HelpSlot.childCount, Is.EqualTo(1));
            Assert.That(field.ErrorSlot.childCount, Is.EqualTo(1));
            Assert.That(field.ValidatingIndicatorSlot.childCount, Is.EqualTo(0));
            field.Status = "valid";
            Assert.That(field.ClassListContains("field--valid"), Is.True);
            field.Status = "invalid";
            Assert.That(field.ClassListContains("field--invalid"), Is.True);
            foreach (var prop in new[] { "Value", "Disabled", "Name", "Required", "Validating", "ReadOnly" })
                Assert.That(typeof(FullStackDS.Field).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void WalkthroughComposesSlotsAndWiresItsControlCallbacks()
        {
            var tour = Mount(new FullStackDS.Walkthrough());
            tour.TitleSlot.Add(new UnityEngine.UIElements.Label("Step one"));
            tour.DescriptionSlot.Add(new UnityEngine.UIElements.Label("Try the settings tab"));
            Assert.That(tour.TitleSlot.childCount, Is.EqualTo(1));
            Assert.That(tour.DescriptionSlot.childCount, Is.EqualTo(1));
            tour.Index = 2;
            Assert.That(tour.Index, Is.EqualTo(2));
            tour.ProgressLabel = "2 of 3";
            Assert.That(tour.Counter.text, Is.EqualTo("2 of 3"));
            tour.NextLabel = "Continue";
            Assert.That(tour.Next.text, Is.EqualTo("Continue"));
            tour.PreviousDisabled = true;
            Assert.That(tour.Prev.enabledSelf, Is.False);
            tour.PreviousDisabled = false;
            Assert.That(tour.Prev.enabledSelf, Is.True);
            int skipped = 0, previous = 0, next = 0;
            tour.OnSkip = () => skipped++;
            tour.OnPrevious = () => previous++;
            tour.OnNext = () => next++;
            Submit(tour.Skip);
            Submit(tour.Prev);
            Submit(tour.Next);
            Assert.That(skipped, Is.EqualTo(1));
            Assert.That(previous, Is.EqualTo(1));
            Assert.That(next, Is.EqualTo(1));
            Assert.That(tour.Dots.childCount, Is.EqualTo(0));
            foreach (var prop in new[] { "Steps", "Placement", "CloseOnOutsideClick", "AutoStart", "StorageKey" })
                Assert.That(typeof(FullStackDS.Walkthrough).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void LinksCarriesItsDestinationAndRaisesAnActivationRequest()
        {
            var link = Mount(new FullStackDS.Links());
            link.Add(new UnityEngine.UIElements.Label("Open settings"));
            Assert.That(link.ClassListContains("links"), Is.True);
            link.Href = "/settings";
            link.Target = "_blank";
            link.Rel = "noopener";
            Assert.That(link.Href, Is.EqualTo("/settings"));
            Assert.That(link.Target, Is.EqualTo("_blank"));
            Assert.That(link.Rel, Is.EqualTo("noopener"));
            string activated = null;
            link.Activated += href => activated = href;
            Click(link);
            Assert.That(activated, Is.EqualTo("/settings"));
            link.Disabled = true;
            activated = null;
            Click(link);
            Assert.That(activated, Is.Null);
            link.Disabled = false;
            link.Size = "large";
            Assert.That(link.ClassListContains("links--large"), Is.True);
            foreach (var prop in new[] { "Visited", "Navigate", "OnClick" })
                Assert.That(typeof(FullStackDS.Links).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void ImageLoadsItsResourcesSourceAndProjectsCarriers()
        {
            var media = Mount(new FullStackDS.Image());
            Assert.That(media, Is.InstanceOf<UnityEngine.UIElements.Image>());
            Assert.That(media.ClassListContains("image"), Is.True);
            media.Src = "missing-texture";
            Assert.That(media.image, Is.Null);
            media.Src = "";
            Assert.That(media.image, Is.Null);
            media.Radius = "full";
            Assert.That(media.ClassListContains("image--radius-full"), Is.True);
            foreach (var prop in new[] { "Alt", "Width", "Height", "Loading", "Sizes", "AspectRatio", "ObjectFit", "ObjectPosition", "FallbackSrc" })
                Assert.That(typeof(FullStackDS.Image).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void AvatarGuardsItsImageAndInitialsFallback()
        {
            var avatar = Mount(new FullStackDS.Avatar());
            Assert.That(avatar.Image, Is.InstanceOf<FullStackDS.Image>());
            Assert.That(avatar.InitialsControl, Is.InstanceOf<Label>());
            Assert.That(avatar.Image.style.display.value, Is.EqualTo(DisplayStyle.None));
            Assert.That(avatar.InitialsControl.style.display.value, Is.EqualTo(DisplayStyle.None));
            avatar.Src = "missing-avatar-texture";
            Assert.That(avatar.Image.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(avatar.Image.Src, Is.EqualTo("missing-avatar-texture"));
            avatar.Src = "";
            Assert.That(avatar.Image.style.display.value, Is.EqualTo(DisplayStyle.None));
            avatar.Initials = "DR";
            Assert.That(avatar.InitialsControl.text, Is.EqualTo("DR"));
            Assert.That(avatar.InitialsControl.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            avatar.Initials = "";
            Assert.That(avatar.InitialsControl.style.display.value, Is.EqualTo(DisplayStyle.None));
            avatar.Size = "large";
            Assert.That(avatar.ClassListContains("avatar--large"), Is.True);
            foreach (var prop in new[] { "Name", "Priority", "Alt", "Loading" })
                Assert.That(typeof(FullStackDS.Avatar).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void NavTreeSwitchesItsHeadingPairAndComposesChildItems()
        {
            var tree = Mount(new FullStackDS.NavTree());
            tree.Label = "Workspace";
            Assert.That(tree.HeadingLink.text, Is.EqualTo("Workspace"));
            Assert.That(tree.HeadingLabel.text, Is.EqualTo("Workspace"));
            Assert.That(tree.HeadingLink.style.display.value, Is.EqualTo(DisplayStyle.None));
            Assert.That(tree.HeadingLabel.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            tree.Href = "/workspace";
            Assert.That(tree.Link.Href, Is.EqualTo("/workspace"));
            Assert.That(tree.HeadingLink.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(tree.HeadingLabel.style.display.value, Is.EqualTo(DisplayStyle.None));
            string activated = null;
            tree.Link.Activated += href => activated = href;
            Click(tree.HeadingLink);
            Assert.That(activated, Is.EqualTo("/workspace"));
            tree.Href = "";
            Assert.That(tree.HeadingLink.style.display.value, Is.EqualTo(DisplayStyle.None));
            Assert.That(tree.HeadingLabel.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            var child = new FullStackDS.NavTree { Label = "Settings" };
            tree.Add(child);
            Assert.That(tree.contentContainer, Is.SameAs(tree.List));
            Assert.That(tree.List.childCount, Is.EqualTo(1));
            foreach (var prop in new[] { "Icon", "IconName", "IconSize", "CurrentPage", "Navigate" })
                Assert.That(typeof(FullStackDS.NavTree).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void PostcardProjectsObjectPathTextAndComposesItsBody()
        {
            var postcard = Mount(new FullStackDS.Postcard());
            postcard.AuthorName = "Ada Lovelace";
            postcard.AuthorHandle = "@ada";
            postcard.Timestamp = "2h ago";
            postcard.StatsLikes = "42";
            postcard.StatsReplies = "0";
            postcard.StatsReposts = "14";
            Assert.That(postcard.DisplayName.text, Is.EqualTo("Ada Lovelace"));
            Assert.That(postcard.Handle.text, Is.EqualTo("@ada"));
            Assert.That(postcard.TimestampControl.text, Is.EqualTo("2h ago"));
            Assert.That(postcard.StatsLikes, Is.EqualTo("42"));
            Assert.That(postcard.StatsReplies, Is.EqualTo("0"));
            Assert.That(postcard.StatsReposts, Is.EqualTo("14"));
            Assert.That(postcard.Stat.text, Is.EqualTo("Likes: 42"));
            Assert.That(postcard.Stat2.text, Is.EqualTo("Replies: 0"));
            Assert.That(postcard.Stat3.text, Is.EqualTo("Reposts: 14"));
            Assert.That(postcard.Stats.childCount, Is.EqualTo(3));
            Assert.That(postcard.Stats[0], Is.SameAs(postcard.Stat));
            Assert.That(postcard.Stats[1], Is.SameAs(postcard.Stat2));
            Assert.That(postcard.Stats[2], Is.SameAs(postcard.Stat3));
            foreach (var stat in new[] { postcard.Stat, postcard.Stat2, postcard.Stat3 })
                Assert.That(stat.ClassListContains("postcard__stat"), Is.True);
            postcard.StatsLikes = "١٬٢٣٤";
            Assert.That(postcard.StatsLikes, Is.EqualTo("١٬٢٣٤"));
            Assert.That(postcard.Stat.text, Is.EqualTo("Likes: ١٬٢٣٤"));
            postcard.StatsLikes = null;
            Assert.That(postcard.StatsLikes, Is.EqualTo(""));
            Assert.That(postcard.Stat.text, Is.EqualTo("Likes: "));
            Assert.That(postcard.contentContainer, Is.SameAs(postcard.Content));
            postcard.Add(new FullStackDS.Text());
            Assert.That(postcard.Content.childCount, Is.EqualTo(1));
            foreach (var prop in new[] { "Author", "PostId", "Embed", "Datetime", "AriaLabelledby" })
                Assert.That(typeof(FullStackDS.Postcard).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void PaginationBuildsItsStripFromLabelsAndCommitsTheIndex()
        {
            var pages = Mount(new FullStackDS.Pagination());
            pages.DefaultIndex = 1;
            pages.Pages = new[] { "1", "2", "3" };
            Assert.That(pages.Index, Is.EqualTo(1));
            Assert.That(pages.childCount, Is.EqualTo(3));
            var buttons = pages.Query<UnityEngine.UIElements.Button>().ToList();
            Assert.That(buttons.Count, Is.EqualTo(3));
            Assert.That(buttons[0].ClassListContains("pagination__item"), Is.True);
            Assert.That(buttons[0].Q<Label>().ClassListContains("pagination__label"), Is.True);
            Assert.That(buttons[0].Q<Label>(className: "pagination__label").text, Is.EqualTo("1"));
            Assert.That(buttons[0].Q<VisualElement>(className: "pagination__marker"), Is.Not.Null);
            int changed = -1, requested = -1;
            pages.OnIndexChange += value => changed = value;
            pages.PageRequested += value => requested = value;
            Submit(buttons[2]);
            Assert.That(pages.Index, Is.EqualTo(2));
            Assert.That(changed, Is.EqualTo(2));
            pages.Controlled = true;
            Submit(buttons[0]);
            Assert.That(requested, Is.EqualTo(0));
            Assert.That(pages.Index, Is.EqualTo(2));
            pages.Disabled = true;
            Submit(buttons[1]);
            Assert.That(pages.Index, Is.EqualTo(2));
            pages.Presentation = "pages";
            Assert.That(pages.ClassListContains("pagination--pages"), Is.True);
            foreach (var prop in new[] { "Label", "AriaLabel", "Current", "DataCurrent" })
                Assert.That(typeof(FullStackDS.Pagination).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void OtpBuildsOneCharacterFieldsAndAssemblesItsValue()
        {
            var otp = Mount(new FullStackDS.OTP { Length = 4 });
            Assert.That(otp.Group.childCount, Is.EqualTo(4));
            var fields = otp.Group.Query<UnityEngine.UIElements.TextField>().ToList();
            Assert.That(fields.Count, Is.EqualTo(4));
            Assert.That(fields[0].maxLength, Is.EqualTo(1));
            Assert.That(fields[0].ClassListContains("otp__field"), Is.True);
            string changed = null, completed = null;
            otp.OnChange += value => changed = value;
            otp.Completed += value => completed = value;
            otp.Value = "12";
            Assert.That(otp.Value, Is.EqualTo("12"));
            Assert.That(fields[0].value, Is.EqualTo("1"));
            Assert.That(fields[2].value, Is.EqualTo(""));
            fields[2].value = "3";
            Assert.That(changed, Is.EqualTo("123"));
            fields[3].value = "4";
            Assert.That(completed, Is.EqualTo("1234"));
            fields[2].value = "x";
            Assert.That(otp.Value, Is.EqualTo("1234"));
            otp.Mode = "alphanumeric";
            fields[2].value = "a";
            Assert.That(otp.Value, Is.EqualTo("12a4"));
            otp.Controlled = true;
            string requested = null;
            otp.ValueRequested += value => requested = value;
            fields[1].value = "9";
            Assert.That(requested, Is.EqualTo("19a4"));
            Assert.That(otp.Value, Is.EqualTo("12a4"));
            otp.Disabled = true;
            Assert.That(fields[0].enabledSelf, Is.False);
            otp.ReadOnly = true;
            Assert.That(fields[0].isReadOnly, Is.True);
            foreach (var prop in new[] { "FieldLabel", "Label", "AriaDescribedby" })
                Assert.That(typeof(FullStackDS.OTP).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void RadioGroupBuildsNativeRadiosAndCommitsTheSelection()
        {
            var group = Mount(new FullStackDS.RadioGroup());
            group.Options = new[]
            {
                new FullStackDS.RadioGroup.RadioGroupOption(false, "First choice", "alpha", "Alpha"),
                new FullStackDS.RadioGroup.RadioGroupOption(false, "Second choice", "beta", "Beta"),
                new FullStackDS.RadioGroup.RadioGroupOption(true, "Unavailable", "gamma", "Gamma"),
            };
            Assert.That(group.childCount, Is.EqualTo(3));
            var radios = group.Query<UnityEngine.UIElements.RadioButton>().ToList();
            Assert.That(radios.Count, Is.EqualTo(3));
            Assert.That(radios[0].ClassListContains("radio-group__item"), Is.True);
            Assert.That(radios[0].label, Is.EqualTo("Alpha"));
            Assert.That(radios[0].tooltip, Is.EqualTo("First choice"));
            Assert.That(radios[2].enabledSelf, Is.False);
            group.Value = "beta";
            Assert.That(radios[1].value, Is.True);
            Assert.That(radios[0].value, Is.False);
            string changed = null, requested = null;
            group.OnChange += value => changed = value;
            group.ValueRequested += value => requested = value;
            radios[0].value = true;
            Assert.That(group.Value, Is.EqualTo("alpha"));
            Assert.That(changed, Is.EqualTo("alpha"));
            group.Controlled = true;
            radios[1].value = true;
            Assert.That(requested, Is.EqualTo("beta"));
            Assert.That(group.Value, Is.EqualTo("alpha"));
            Assert.That(radios[0].value, Is.True);
            group.Orientation = "horizontal";
            Assert.That(group.ClassListContains("radio-group--horizontal"), Is.True);
            foreach (var prop in new[] { "Name", "AriaLabel", "DataChecked" })
                Assert.That(typeof(FullStackDS.RadioGroup).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void SelectBuildsItsListboxAndOwnsBothChannels()
        {
            var select = Mount(new FullStackDS.Select());
            select.Placeholder = "Pick a page";
            Assert.That(select.Text.text, Is.EqualTo("Pick a page"));
            select.Options = new[]
            {
                new FullStackDS.Select.SelectOption("alpha", false, "Alpha"),
                new FullStackDS.Select.SelectOption("beta", false, "Beta"),
                new FullStackDS.Select.SelectOption("gamma", true, "Gamma"),
            };
            Assert.That(select.OptionsControl.childCount, Is.EqualTo(3));
            var options = select.OptionsControl.Query<UnityEngine.UIElements.Button>().ToList();
            Assert.That(options.Count, Is.EqualTo(3));
            Assert.That(options[0].ClassListContains("select__option"), Is.True);
            Assert.That(options[0].text, Is.EqualTo("Alpha"));
            Assert.That(options[2].enabledSelf, Is.False);
            Assert.That(select.Content.style.display.value, Is.EqualTo(DisplayStyle.None));
            select.Open = true;
            Assert.That(select.Content.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(select.ClassListContains("select--open"), Is.True);
            bool? openChanged = null;
            string changed = null;
            select.OnOpenChange += value => openChanged = value;
            select.OnChange += value => changed = value;
            Submit(select.Trigger);
            Assert.That(openChanged, Is.False);
            Assert.That(select.Open, Is.False);
            select.Open = true;
            Submit(options[1]);
            Assert.That(select.Value, Is.EqualTo("beta"));
            Assert.That(changed, Is.EqualTo("beta"));
            Assert.That(select.Text.text, Is.EqualTo("Beta"));
            Assert.That(select.Open, Is.False);
            select.Controlled = true;
            string requested = null;
            select.ValueRequested += value => requested = value;
            select.Open = true;
            Submit(options[0]);
            Assert.That(requested, Is.EqualTo("alpha"));
            Assert.That(select.Value, Is.EqualTo("beta"));
            select.OpenControlled = true;
            bool? openRequested = null;
            select.OpenRequested += value => openRequested = value;
            Submit(select.Trigger);
            Assert.That(openRequested, Is.True);
            select.Disabled = true;
            Assert.That(select.Trigger.enabledSelf, Is.False);
            select.Size = "lg";
            Assert.That(select.ClassListContains("select--lg"), Is.True);
            foreach (var prop in new[] { "Searchable", "SearchInput", "TriggerLabel", "SearchLabel", "Multiple" })
                Assert.That(typeof(FullStackDS.Select).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void ShuttleDerivesBothListsAndTransfersTheSelection()
        {
            var shuttle = Mount(new FullStackDS.Shuttle());
            shuttle.Options = new[] { "alpha", "beta", "gamma", "delta" };
            shuttle.DefaultValue = new[] { "beta" };
            var buttons = shuttle.Query<UnityEngine.UIElements.Button>().ToList();
            Assert.That(buttons.Count, Is.EqualTo(6));
            Assert.That(buttons[0].text, Is.EqualTo("alpha"));
            Assert.That(buttons[0].ClassListContains("shuttle__item"), Is.True);
            var add = buttons[3];
            var remove = buttons[4];
            Assert.That(add.ClassListContains("shuttle__add"), Is.True);
            Assert.That(add.enabledSelf, Is.False);
            Assert.That(remove.ClassListContains("shuttle__remove"), Is.True);
            Assert.That(buttons[5].text, Is.EqualTo("beta"));
            string[] changed = null;
            shuttle.OnValueChange += value => changed = value;
            Submit(buttons[0]);
            Assert.That(add.enabledSelf, Is.True);
            Submit(add);
            Assert.That(shuttle.Value, Is.EqualTo(new[] { "beta", "alpha" }));
            Assert.That(changed, Is.EqualTo(new[] { "beta", "alpha" }));
            var afterAdd = shuttle.Query<UnityEngine.UIElements.Button>().ToList();
            Assert.That(afterAdd[0].text, Is.EqualTo("gamma"));
            Assert.That(afterAdd[1].text, Is.EqualTo("delta"));
            Assert.That(remove.enabledSelf, Is.False);
            Assert.That(afterAdd[4].text, Is.EqualTo("beta"));
            Assert.That(afterAdd[5].text, Is.EqualTo("alpha"));
            Submit(afterAdd[4]);
            Assert.That(remove.enabledSelf, Is.True);
            Submit(remove);
            Assert.That(shuttle.Value, Is.EqualTo(new[] { "alpha" }));
            var afterRemove = shuttle.Query<UnityEngine.UIElements.Button>().ToList();
            Assert.That(afterRemove[0].text, Is.EqualTo("beta"));
            Assert.That(afterRemove[5].text, Is.EqualTo("alpha"));
            shuttle.Controlled = true;
            string[] requested = null;
            shuttle.ValueRequested += value => requested = value;
            Submit(afterRemove[1]);
            Submit(add);
            Assert.That(requested, Is.EqualTo(new[] { "alpha", "gamma" }));
            Assert.That(shuttle.Value, Is.EqualTo(new[] { "alpha" }));
            Assert.That(shuttle.childCount, Is.EqualTo(3));
            foreach (var prop in new[] { "AriaLabel", "DataValue", "Tabindex", "AriaSelected", "Available" })
                Assert.That(typeof(FullStackDS.Shuttle).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void ShowMoreOwnsTheExpansionChannelAndPaintsItsLabel()
        {
            var showMore = Mount(new FullStackDS.ShowMore());
            Assert.That(showMore.hierarchy.childCount, Is.EqualTo(2));
            Assert.That(showMore.childCount, Is.EqualTo(0));
            showMore.Content.Add(new Label { text = "Clamped body" });
            Assert.That(showMore.Content.childCount, Is.EqualTo(1));
            Assert.That(showMore.childCount, Is.EqualTo(1));
            showMore.ShowMoreLabel = "Show more";
            showMore.ShowLessLabel = "Show less";
            Assert.That(showMore.Trigger.text, Is.EqualTo("Show more"));
            showMore.DefaultExpanded = true;
            Assert.That(showMore.Expanded, Is.True);
            Assert.That(showMore.Trigger.text, Is.EqualTo("Show less"));
            Assert.That(showMore.ClassListContains("show-more--expanded"), Is.True);
            showMore.Expanded = false;
            Assert.That(showMore.Trigger.text, Is.EqualTo("Show more"));
            Assert.That(showMore.ClassListContains("show-more--expanded"), Is.False);
            bool? changed = null;
            showMore.OnExpandedChange += value => changed = value;
            Submit(showMore.Trigger);
            Assert.That(showMore.Expanded, Is.True);
            Assert.That(changed, Is.True);
            Assert.That(showMore.Trigger.text, Is.EqualTo("Show less"));
            Assert.That(showMore.ClassListContains("show-more--expanded"), Is.True);
            showMore.Controlled = true;
            bool? requested = null;
            showMore.ExpandedRequested += value => requested = value;
            Submit(showMore.Trigger);
            Assert.That(requested, Is.False);
            Assert.That(showMore.Expanded, Is.True);
            Assert.That(showMore.Trigger.text, Is.EqualTo("Show less"));
            Assert.That(typeof(FullStackDS.ShowMore).GetProperty("MaxLines"), Is.Null);
        }
        [Test] public void TruncateGuardsItsToggleAndOwnsTheExpansionChannel()
        {
            var truncate = Mount(new FullStackDS.Truncate());
            Assert.That(truncate.hierarchy.childCount, Is.EqualTo(2));
            truncate.Content.Add(new Label { text = "Long body" });
            Assert.That(truncate.Content.childCount, Is.EqualTo(1));
            truncate.ExpandText = "Expand";
            truncate.CollapseText = "Collapse";
            Assert.That(truncate.Toggle.text, Is.EqualTo("Expand"));
            Assert.That(truncate.Toggle.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            truncate.Expandable = false;
            Assert.That(truncate.Toggle.style.display.value, Is.EqualTo(DisplayStyle.None));
            truncate.Expandable = true;
            Assert.That(truncate.Toggle.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            bool? changed = null;
            truncate.OnExpandedChange += value => changed = value;
            Submit(truncate.Toggle);
            Assert.That(truncate.Expanded, Is.True);
            Assert.That(changed, Is.True);
            Assert.That(truncate.Toggle.text, Is.EqualTo("Collapse"));
            Assert.That(truncate.ClassListContains("truncate--expanded"), Is.True);
            truncate.Controlled = true;
            bool? requested = null;
            truncate.ExpandedRequested += value => requested = value;
            Submit(truncate.Toggle);
            Assert.That(requested, Is.False);
            Assert.That(truncate.Expanded, Is.True);
            Assert.That(typeof(FullStackDS.Truncate).GetProperty("Lines"), Is.Null);
        }
        [Test] public void PageNavigatorBoundsNavigationAndCommitsTheOneBasedDraft()
        {
            var navigator = Mount(new FullStackDS.PageNavigator());
            navigator.Pages = new[] { "One", "Two", "Three", "Four", "Five" };
            var buttons = navigator.Query<UnityEngine.UIElements.Button>().ToList();
            var input = navigator.Query<UnityEngine.UIElements.TextField>().First();
            Assert.That(buttons.Count, Is.EqualTo(3));
            Assert.That(buttons[0].ClassListContains("page-navigator__previous"), Is.True);
            Assert.That(buttons[0].enabledSelf, Is.False);
            Assert.That(buttons[2].enabledSelf, Is.True);
            Assert.That(input.value, Is.EqualTo("1"));
            string changed = null;
            navigator.OnIndexChange += value => changed = value.ToString();
            Submit(buttons[2]);
            Assert.That(navigator.Index, Is.EqualTo(1));
            Assert.That(changed, Is.EqualTo("1"));
            Assert.That(input.value, Is.EqualTo("2"));
            Assert.That(buttons[0].enabledSelf, Is.True);
            input.value = "4";
            Submit(buttons[1]);
            Assert.That(navigator.Index, Is.EqualTo(3));
            Assert.That(input.value, Is.EqualTo("4"));
            input.value = "99";
            Submit(buttons[1]);
            Assert.That(navigator.Index, Is.EqualTo(4));
            Assert.That(input.value, Is.EqualTo("5"));
            Assert.That(buttons[2].enabledSelf, Is.False);
            navigator.Controlled = true;
            int requested = -1;
            navigator.IndexRequested += value => requested = value;
            Submit(buttons[0]);
            Assert.That(requested, Is.EqualTo(3));
            Assert.That(navigator.Index, Is.EqualTo(4));
            navigator.Disabled = true;
            Assert.That(buttons[0].enabledSelf, Is.False);
            Assert.That(buttons[1].enabledSelf, Is.False);
            Assert.That(buttons[2].enabledSelf, Is.False);
            Assert.That(input.enabledSelf, Is.False);
            foreach (var prop in new[] { "Presentation", "ShowChoices", "PreviousLabel", "Label" })
                Assert.That(typeof(FullStackDS.PageNavigator).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void CarouselSwitchesItsSlideAndWrapsNavigation()
        {
            var carousel = Mount(new FullStackDS.Carousel());
            carousel.Slides = new[] { "One", "Two", "Three" };
            carousel.Add(new Label { text = "One" });
            carousel.Add(new Label { text = "Two" });
            carousel.Add(new Label { text = "Three" });
            carousel.RotationStart = "Start";
            carousel.RotationStop = "Stop";
            carousel.PreviousSlide = "Previous";
            carousel.NextSlide = "Next";
            var buttons = carousel.Query<UnityEngine.UIElements.Button>().ToList();
            Assert.That(buttons.Count, Is.EqualTo(3));
            var rotation = buttons[0];
            var previous = buttons[1];
            var next = buttons[2];
            Assert.That(rotation.text, Is.EqualTo("Start"));
            Assert.That(previous.text, Is.EqualTo("Previous"));
            Assert.That(next.text, Is.EqualTo("Next"));
            Assert.That(carousel.Index, Is.EqualTo(0));
            Assert.That(carousel.Viewport[0].style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(carousel.Viewport[1].style.display.value, Is.EqualTo(DisplayStyle.None));
            int changed = -1;
            carousel.OnIndexChange += value => changed = value;
            Submit(next);
            Assert.That(carousel.Index, Is.EqualTo(1));
            Assert.That(changed, Is.EqualTo(1));
            Assert.That(carousel.Viewport[1].style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Submit(previous);
            Assert.That(carousel.Index, Is.EqualTo(0));
            Submit(previous);
            Assert.That(carousel.Index, Is.EqualTo(2));
            Submit(next);
            Assert.That(carousel.Index, Is.EqualTo(0));
            Submit(rotation);
            Assert.That(rotation.text, Is.EqualTo("Stop"));
            carousel.Controlled = true;
            int requested = -1;
            carousel.IndexRequested += value => requested = value;
            Submit(next);
            Assert.That(requested, Is.EqualTo(1));
            Assert.That(carousel.Index, Is.EqualTo(0));
            foreach (var prop in new[] { "Indicator", "Label", "AutoPlayLabel" })
                Assert.That(typeof(FullStackDS.Carousel).GetProperty(prop), Is.Null, prop);
        }
        private FullStackDS.Carousel MountCarousel(int duration, bool autoPlay)
        {
            var carousel = Mount(new FullStackDS.Carousel());
            carousel.Slides = new[] { "One", "Two", "Three" };
            carousel.Add(new Label { text = "One" });
            carousel.Add(new Label { text = "Two" });
            carousel.Add(new Label { text = "Three" });
            carousel.Duration = duration;
            carousel.AutoPlay = autoPlay;
            return carousel;
        }
        // The panel scheduler runs nowhere in a synchronous case, so these own the clock outright: the answer
        // depends on the elapsed time supplied and never on how long a host's frames take.
        [Test] public void CarouselDwellIsElapsedTimeRegardlessOfHowItIsDelivered()
        {
            var carousel = MountCarousel(1000, autoPlay: true);
            var advances = 0;
            carousel.OnIndexChange = _ => advances++;
            carousel.Control.Tick(0);
            carousel.Control.Tick(999);
            Assert.That(carousel.Index, Is.EqualTo(0), "the slide holds until its whole dwell has elapsed");
            carousel.Control.Tick(1);
            Assert.That(carousel.Index, Is.EqualTo(1), "the slide advances exactly at the declared dwell");
            for (var tick = 0; tick < 199; tick++) carousel.Control.Tick(5);
            Assert.That(carousel.Index, Is.EqualTo(1), "many short ticks spend the same budget as one long one");
            carousel.Control.Tick(5);
            Assert.That(carousel.Index, Is.EqualTo(2));
            Assert.That(advances, Is.EqualTo(2));
            Assert.That(carousel.Viewport[2].style.display.value, Is.EqualTo(DisplayStyle.Flex));
        }
        [Test] public void CarouselStallAdvancesOnceAndKeepsTheIncomingSlidesBudget()
        {
            var carousel = MountCarousel(1000, autoPlay: true);
            var advances = 0;
            carousel.OnIndexChange = _ => advances++;
            carousel.Control.Tick(0);
            carousel.Control.Tick(5000);
            Assert.That(carousel.Index, Is.EqualTo(1), "a stall worth five dwells must not skip slides");
            Assert.That(advances, Is.EqualTo(1));
            carousel.Control.Tick(999);
            Assert.That(carousel.Index, Is.EqualTo(1), "the stall's excess is not charged to the incoming slide");
            carousel.Control.Tick(1);
            Assert.That(carousel.Index, Is.EqualTo(2));
            carousel.Control.Tick(1000);
            Assert.That(carousel.Index, Is.EqualTo(0), "the timed sequence wraps");
        }
        [Test] public void CarouselSpendsNoBudgetWhileRotationIsOff()
        {
            var carousel = MountCarousel(1000, autoPlay: false);
            carousel.Control.Tick(0);
            carousel.Control.Tick(5000);
            Assert.That(carousel.Index, Is.EqualTo(0), "autoplay is off");
            Assert.That(carousel.Control.SpentMs, Is.EqualTo(0), "time with rotation off spends nothing");
        }
        [Test] public void CarouselChargesNoIntervalThatBeganBeforeItsBudget()
        {
            var carousel = MountCarousel(300, autoPlay: false);
            carousel.Control.Tick(50);
            carousel.AutoPlay = true;
            carousel.Control.Tick(1000);
            Assert.That(carousel.Index, Is.EqualTo(0), "a stall spanning the start of rotation precedes reading time");
            Assert.That(carousel.Control.SpentMs, Is.EqualTo(0));
            carousel.Control.Tick(100);
            Assert.That(carousel.Control.SpentMs, Is.EqualTo(100), "the next interval is reading time");
            carousel.AutoPlay = true;
            carousel.Control.Tick(50);
            Assert.That(carousel.Control.SpentMs, Is.EqualTo(150), "reassigning the same state starts nothing");
            carousel.Duration = 200;
            carousel.Control.Tick(1000);
            Assert.That(carousel.Index, Is.EqualTo(0), "a stall spanning a budget reset precedes the new budget");
            Assert.That(carousel.Control.SpentMs, Is.EqualTo(0));
            carousel.RotationStart = "Start";
            carousel.RotationStop = "Stop";
            var rotation = carousel.Query<UnityEngine.UIElements.Button>().ToList()[0];
            Submit(rotation);
            carousel.Control.Tick(50);
            Submit(rotation);
            carousel.Control.Tick(1000);
            Assert.That(carousel.Index, Is.EqualTo(0), "a stall spanning a restart precedes reading time");
            carousel.Control.Tick(200);
            Assert.That(carousel.Index, Is.EqualTo(1), "the budget still runs out after the restart");
        }
        // Real-clock cases compare measured quantities, so a slow host only moves both sides. The index comes from
        // the advance itself rather than a later poll.
        private static System.Collections.IEnumerator WaitForAdvance(FullStackDS.Carousel carousel, System.Diagnostics.Stopwatch clock, System.Action<int, long> advanced)
        {
            var first = -1;
            carousel.OnIndexChange = value => { if (first < 0) { first = value; advanced(value, clock.ElapsedMilliseconds); } };
            var deadline = UnityEngine.Time.realtimeSinceStartup + 5f;
            while (first < 0 && UnityEngine.Time.realtimeSinceStartup < deadline) yield return null;
        }
        [UnityTest] public System.Collections.IEnumerator CarouselAdvancesOnTheDeclaredDwell()
        {
            const int Dwell = 300;
            var carousel = MountCarousel(Dwell, autoPlay: false);
            var index = -1; var at = -1L;
            var clock = System.Diagnostics.Stopwatch.StartNew();
            carousel.AutoPlay = true;
            yield return WaitForAdvance(carousel, clock, (value, elapsed) => { index = value; at = elapsed; });
            Assert.That(index, Is.EqualTo(1), "the panel scheduler drives one advance to the next slide");
            Assert.That(at, Is.GreaterThanOrEqualTo(Dwell - 60), "the first slide keeps its declared dwell");
            Assert.That(carousel.Viewport[1].style.display.value, Is.EqualTo(DisplayStyle.Flex));
        }
        [UnityTest] public System.Collections.IEnumerator CarouselSpendsNoBudgetWhileDetachedFromItsPanel()
        {
            const int Away = 400;
            const int Tolerance = 60;
            var carousel = MountCarousel(600_000, autoPlay: true);
            // Ticks on the panel come first: the time away must follow one for a clock to charge it.
            var deadline = UnityEngine.Time.realtimeSinceStartup + 5f;
            while (carousel.Control.SpentMs == 0 && UnityEngine.Time.realtimeSinceStartup < deadline) yield return null;
            var spent = carousel.Control.SpentMs;
            Assert.That(spent, Is.GreaterThan(0), "the panel scheduler spends the budget");
            var parent = carousel.parent;
            carousel.RemoveFromHierarchy();
            var away = System.Diagnostics.Stopwatch.StartNew();
            while (away.ElapsedMilliseconds < Away) yield return null;
            Assert.That(carousel.Control.SpentMs, Is.EqualTo(spent), "nothing ticks off the panel");
            var back = System.Diagnostics.Stopwatch.StartNew();
            parent.Add(carousel);
            deadline = UnityEngine.Time.realtimeSinceStartup + 5f;
            while (carousel.Control.SpentMs == spent && UnityEngine.Time.realtimeSinceStartup < deadline) yield return null;
            var charged = carousel.Control.SpentMs - spent;
            Assert.That(charged, Is.GreaterThan(0), "the budget resumes on the panel");
            Assert.That(charged, Is.LessThanOrEqualTo(back.ElapsedMilliseconds + Tolerance), "time off the panel is not reading time");
        }
        [Test] public void CalendarRendersItsMonthAndCommitsSingleDates()
        {
            var calendar = Mount(new FullStackDS.Calendar());
            calendar.Caption = "Choose a date";
            calendar.Month = "2026-02-01";
            Assert.That(calendar.Month, Is.EqualTo("2026-02-01"));
            var labels = calendar.Query<UnityEngine.UIElements.Label>().ToList();
            Assert.That(labels[0].text, Is.EqualTo("Choose a date"));
            var buttons = calendar.Query<UnityEngine.UIElements.Button>().ToList();
            Assert.That(buttons.Count, Is.EqualTo(44));
            Assert.That(buttons[0].ClassListContains("calendar__nav"), Is.True);
            Assert.That(buttons[2].ClassListContains("calendar__day"), Is.True);
            Assert.That(buttons[2].text, Is.EqualTo("1"));
            string changed = null;
            calendar.OnChange += value => changed = value;
            Submit(buttons[2]);
            Assert.That(calendar.Value, Is.EqualTo("2026-02-01"));
            Assert.That(changed, Is.EqualTo("2026-02-01"));
            string monthChanged = null;
            calendar.OnMonthChange += value => monthChanged = value;
            Submit(buttons[1]);
            Assert.That(calendar.Month, Is.EqualTo("2026-03-01"));
            Assert.That(monthChanged, Is.EqualTo("2026-03-01"));
            calendar.MinDate = "2026-03-10";
            Assert.That(calendar.Query<UnityEngine.UIElements.Button>().ToList()[2].enabledSelf, Is.False);
            calendar.MaxDate = "2026-03-20";
            Assert.That(calendar.Query<UnityEngine.UIElements.Button>().ToList()[11].enabledSelf, Is.True);
            calendar.Value = "2026-03-15";
            Assert.That(calendar.Value, Is.EqualTo("2026-03-15"));
            calendar.Controlled = true;
            string requested = null;
            calendar.ValueRequested += value => requested = value;
            calendar.Month = "2026-03-01";
            Submit(calendar.Query<UnityEngine.UIElements.Button>().ToList()[11]);
            Assert.That(requested, Is.EqualTo("2026-03-10"));
            Assert.That(calendar.Value, Is.EqualTo("2026-03-15"));
            calendar.Disabled = true;
            Assert.That(calendar.Query<UnityEngine.UIElements.Button>().ToList()[1].enabledSelf, Is.False);
            Assert.That(calendar.Query<UnityEngine.UIElements.Button>().ToList()[2].enabledSelf, Is.False);
            foreach (var prop in new[] { "Mode", "Locale", "ShouldCloseOnSelect", "AriaLabel" })
                Assert.That(typeof(FullStackDS.Calendar).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void CommandTogglesItsPaletteAndForwardsBothChannels()
        {
            var command = Mount(new FullStackDS.Command());
            command.Placeholder = "Search commands";
            Assert.That(command.childCount, Is.EqualTo(2));
            var search = command.Query<UnityEngine.UIElements.TextField>().First();
            Assert.That(search.textEdition.placeholder, Is.EqualTo("Search commands"));
            Assert.That(command.childCount, Is.EqualTo(2));
            var overlay = command.hierarchy[0];
            var dialog = command.hierarchy[1];
            Assert.That(overlay.style.display.value, Is.EqualTo(DisplayStyle.None));
            Assert.That(dialog.style.display.value, Is.EqualTo(DisplayStyle.None));
            bool? opened = null;
            command.OnOpenChange += value => opened = value;
            command.Open = true;
            Assert.That(opened, Is.Null);
            Assert.That(overlay.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(dialog.style.display.value, Is.EqualTo(DisplayStyle.Flex));
            string changed = null;
            command.OnSearchChange += value => changed = value;
            search.value = "jump";
            Assert.That(command.Search, Is.EqualTo("jump"));
            Assert.That(changed, Is.EqualTo("jump"));
            command.DefaultOpen = true;
            Assert.That(command.Open, Is.True);
            command.Controlled = true;
            bool? requested = null;
            command.OpenRequested += value => requested = value;
            command.Open = false;
            Assert.That(requested, Is.Null);
            command.SearchControlled = true;
            string requestedSearch = null;
            command.SearchRequested += value => requestedSearch = value;
            search.value = "map";
            Assert.That(requestedSearch, Is.EqualTo("map"));
            Assert.That(command.Search, Is.EqualTo("jump"));
            command.Results.Add(new Label { text = "Jump to base" });
            Assert.That(command.Results.childCount, Is.EqualTo(1));
            foreach (var prop in new[] { "ShouldFilter", "Filter", "EmptyMessage", "SearchLabel", "Label" })
                Assert.That(typeof(FullStackDS.Command).GetProperty(prop), Is.Null, prop);
        }
        [Test] public void SpinnerHoldsTheAuthoredStaticValueWhenReducedMotionIsRequested()
        {
            var spinner = Mount(new FullStackDS.Spinner());
            Assert.That(spinner.childCount, Is.EqualTo(1));
            Assert.That(spinner.Visual.ClassListContains("spinner__visual"), Is.True);
            spinner.ReducedMotion = true;
            var angle = spinner.Visual.style.rotate.value.angle.value;
            Assert.That(angle, Is.EqualTo(0f).Within(0.001f));
            spinner.Size = "lg";
            spinner.Thickness = "bold";
            Assert.That(spinner.Visual.style.width.value.value, Is.EqualTo(24f));
            Assert.That(spinner.Visual.style.height.value.value, Is.EqualTo(24f));
            Assert.That(spinner.ClassListContains("spinner--lg"), Is.True);
            Assert.That(spinner.ClassListContains("spinner--bold"), Is.True);
            foreach (var prop in new[] { "ShowAfterMs", "Inline", "AriaHidden" })
                Assert.That(typeof(FullStackDS.Spinner).GetProperty(prop), Is.Null, prop);
        }
        [UnityTest] public System.Collections.IEnumerator SpinnerRotatesOnTheDeclaredLoop()
        {
            var spinner = Mount(new FullStackDS.Spinner());
            var deadline = UnityEngine.Time.realtimeSinceStartup + 2f;
            var moved = false;
            while (UnityEngine.Time.realtimeSinceStartup < deadline)
            {
                if (Math.Abs(spinner.Visual.style.rotate.value.angle.value) > 1f) { moved = true; break; }
                yield return null;
            }
            Assert.That(moved, Is.True);
            spinner.ReducedMotion = true;
            Assert.That(Math.Abs(spinner.Visual.style.rotate.value.angle.value), Is.LessThan(0.001f));
        }
        [Test] public void MotionLoopUsesElapsedTimeAndLengthensThePeriodWithMultiplier()
        {
            var host = Mount(new VisualElement());
            var target = new VisualElement(); host.Add(target);
            var control = MotionLoopControl.Attach(host, target, 800, 2f, new[] { 0f, 0f, 1f, 1f }, 0f,
                new[] { "sm" }, new[] { 16f });
            var timestamp = typeof(MotionLoopControl).GetField("lastTimestamp", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            var tick = typeof(MotionLoopControl).GetMethod("Tick", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            Assert.That(timestamp, Is.Not.Null);
            Assert.That(tick, Is.Not.Null);
            timestamp.SetValue(control, System.Diagnostics.Stopwatch.GetTimestamp() - System.Diagnostics.Stopwatch.Frequency / 5);
            tick.Invoke(control, null);
            Assert.That(target.style.rotate.value.angle.value, Is.EqualTo(45f).Within(5f),
                "200 ms of elapsed time must cover one eighth of the authored 800 ms x 2 period even after a delayed callback");
        }
        [Test] public void MarkdownPaintsTheDeclaredSourceTextOnly()
        {
            var markdown = Mount(new FullStackDS.Markdown());
            Assert.That(markdown.ClassListContains("markdown"), Is.True);
            markdown.Content = "# Title\n\nBody with **strong** text.";
            Assert.That(markdown.text, Is.EqualTo("# Title\n\nBody with **strong** text."));
            foreach (var prop in new[] { "Heading", "Paragraph", "CodeBlock", "Emphasis", "Strong", "Link" })
                Assert.That(typeof(FullStackDS.Markdown).GetProperty(prop), Is.Null, prop);
        }
    }
}
