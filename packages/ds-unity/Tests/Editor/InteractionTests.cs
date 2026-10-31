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
            var asset = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/InteractiveControls/Controls.uxml");
            Assert.That(asset, Is.Not.Null);
            asset.CloneTree(window.rootVisualElement);
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
            Assert.That(typeof(FullStackDS.Label).GetProperty("HtmlFor"), Is.Null);
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
    }
}
