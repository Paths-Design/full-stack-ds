using System.Collections;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace FullStackDS.Tests
{
    /// <summary>Theme scope API and the BooleanControl host-state mirror, at the class-list level.
    /// Resolved token values under these classes are pinned in StylingTests.</summary>
    public class ThemeTests
    {
        private UnityEditor.EditorWindow window;
        [SetUp] public void Setup()
        {
            window = ScriptableObject.CreateInstance<UnityEditor.EditorWindow>();
            window.position = new Rect(0, 0, 600, 600); window.Show();
        }
        [TearDown] public void Teardown() => window.Close();
        private static string[] Brands(VisualElement e) => e.GetClasses().Where(c => c.StartsWith(Theme.BrandClassPrefix)).ToArray();
        private static void Submit(UnityEngine.UIElements.Button button)
        {
            using (var evt = NavigationSubmitEvent.GetPooled()) { evt.target = button; button.SendEvent(evt); }
        }
        private static void Send<T>(T evt, VisualElement target) where T : EventBase<T>, new()
        {
            using (evt) { evt.target = target; target.SendEvent(evt); }
        }

        [Test] public void SetDarkAndSetBrandOpenAScopeAndSwapOnlyTheirOwnClasses()
        {
            var root = new VisualElement(); root.AddToClassList("consumer");
            Theme.SetDark(root, true);
            Assert.That(root.ClassListContains(Theme.ScopeClass), Is.True);
            Assert.That(root.ClassListContains(Theme.DarkClass), Is.True);
            Assert.That(root.styleSheets.count, Is.EqualTo(1));
            Theme.SetDark(root, false);
            Assert.That(root.ClassListContains(Theme.DarkClass), Is.False);
            Assert.That(root.ClassListContains(Theme.ScopeClass), Is.True, "light is the scope without the dark class, not the absence of a scope");
            Theme.SetBrand(root, "canary");
            Assert.That(Brands(root), Is.EqualTo(new[] { "fsds-brand-canary" }));
            Theme.SetBrand(root, "forest");
            Assert.That(Brands(root), Is.EqualTo(new[] { "fsds-brand-forest" }));
            // Brands are not validated: an undeclared brand replaces the current one and matches no rule.
            Theme.SetBrand(root, "not-a-brand");
            Assert.That(Brands(root), Is.EqualTo(new[] { "fsds-brand-not-a-brand" }));
            Theme.SetBrand(root, null);
            Assert.That(Brands(root), Is.Empty);
            Theme.SetDark(root, true); Theme.SetBrand(root, "canary");
            Assert.That(root.ClassListContains(Theme.DarkClass), Is.True, "a brand change keeps the theme");
            Assert.That(root.ClassListContains("consumer"), Is.True);
            Assert.That(root.styleSheets.count, Is.EqualTo(1), "repeated calls attach the sheet once");
        }

        [Test] public void ControlsLoadTheSheetWithoutOpeningAThemeScope()
        {
            // A scope on the control would re-declare the light token values and mask an ancestor's dark or brand scope.
            foreach (var control in new VisualElement[] { new Switch(), new Accordion(), new Tabs(), new Popover() }) {
                Assert.That(control.ClassListContains(Theme.ScopeClass), Is.False, control.GetType().Name);
                Assert.That(control.styleSheets.count, Is.EqualTo(1), control.GetType().Name);
            }
        }

        [Test] public void FloatingContentMirrorsTheHostScopeOnEveryOpen()
        {
            var scope = new VisualElement(); Theme.SetBrand(scope, "canary");
            window.rootVisualElement.Add(scope);
            var popover = new Popover(); var trigger = new PopoverTrigger { text = "Help" }; var content = new PopoverContent();
            popover.Add(trigger); popover.Add(content); scope.Add(popover);
            Submit(trigger);
            Assert.That(content.parent, Is.EqualTo(window.rootVisualElement.panel.visualTree));
            Assert.That(content.ClassListContains(Theme.ScopeClass), Is.True, "content outside the tree carries its own scope");
            Assert.That(Brands(content), Is.EqualTo(new[] { "fsds-brand-canary" }));
            Assert.That(content.ClassListContains(Theme.DarkClass), Is.False);
            // A theme change through the API reaches content that is already floating.
            Theme.SetDark(scope, true);
            Assert.That(content.ClassListContains(Theme.DarkClass), Is.True);
            Submit(trigger); Assert.That(content.parent, Is.Null);
            // A change outside the API (direct class edits) is picked up when the content opens again.
            scope.RemoveFromClassList(Theme.DarkClass); scope.RemoveFromClassList("fsds-brand-canary"); scope.AddToClassList("fsds-brand-forest");
            Submit(trigger);
            Assert.That(content.ClassListContains(Theme.DarkClass), Is.False);
            Assert.That(Brands(content), Is.EqualTo(new[] { "fsds-brand-forest" }));
            Submit(trigger);
            // Moved under a dark scope between opens: the content follows the new enclosing scope.
            var dark = new VisualElement(); Theme.SetDark(dark, true); window.rootVisualElement.Add(dark);
            dark.Add(popover);
            Submit(popover.Trigger);
            Assert.That(content.ClassListContains(Theme.DarkClass), Is.True);
            Assert.That(Brands(content), Is.Empty);
        }

        [Test] public void ContentOfAnUnscopedPopoverIsALightDefaultScope()
        {
            var popover = new Popover(); var trigger = new PopoverTrigger { text = "Help" }; var content = new PopoverContent();
            popover.Add(trigger); popover.Add(content); window.rootVisualElement.Add(popover);
            Submit(trigger);
            Assert.That(content.ClassListContains(Theme.ScopeClass), Is.True);
            Assert.That(content.ClassListContains(Theme.DarkClass), Is.False);
            Assert.That(Brands(content), Is.Empty);
        }

        [UnityTest] public IEnumerator SwitchMirrorsControlPointerAndFocusStateOntoHostClasses()
        {
            var control = new Switch(); control.Add(new UnityEngine.UIElements.Label("Sound"));
            window.rootVisualElement.Add(control);
            yield return null;
            var input = control.Trigger;
            Assert.That(control.ClassListContains(BooleanControl.HoverClass), Is.False);
            Send(PointerEnterEvent.GetPooled(), input);
            Assert.That(control.ClassListContains(BooleanControl.HoverClass), Is.True);
            Assert.That(input.ClassListContains(BooleanControl.HoverClass), Is.False, "the class is placed on the host, not the control");
            Send(PointerDownEvent.GetPooled(new Event { type = EventType.MouseDown, button = 0, mousePosition = input.worldBound.center }), input);
            Assert.That(control.ClassListContains(BooleanControl.ActiveClass), Is.True);
            Send(PointerUpEvent.GetPooled(new Event { type = EventType.MouseUp, button = 0, mousePosition = input.worldBound.center }), input);
            Assert.That(control.ClassListContains(BooleanControl.ActiveClass), Is.False);
            Send(PointerDownEvent.GetPooled(new Event { type = EventType.MouseDown, button = 0, mousePosition = input.worldBound.center }), input);
            Assert.That(control.ClassListContains(BooleanControl.ActiveClass), Is.True);
            Send(PointerLeaveEvent.GetPooled(), input);
            Assert.That(control.ClassListContains(BooleanControl.HoverClass), Is.False);
            Assert.That(control.ClassListContains(BooleanControl.ActiveClass), Is.False, "leaving drops the pressed state");
            Send(PointerUpEvent.GetPooled(new Event { type = EventType.MouseUp, button = 0, mousePosition = Vector2.zero }), input);
            input.Focus(); yield return null;
            Assert.That(input.focusController.focusedElement, Is.EqualTo(input));
            Assert.That(control.ClassListContains(BooleanControl.FocusClass), Is.True);
            Assert.That(input.ClassListContains(BooleanControl.FocusClass), Is.False);
            input.Blur(); yield return null;
            Assert.That(control.ClassListContains(BooleanControl.FocusClass), Is.False);
            Send(PointerEnterEvent.GetPooled(), input); input.Focus(); yield return null;
            Assert.That(control.ClassListContains(BooleanControl.HoverClass), Is.True);
            Assert.That(control.ClassListContains(BooleanControl.FocusClass), Is.True);
            control.RemoveFromHierarchy();
            Assert.That(control.ClassListContains(BooleanControl.HoverClass), Is.False, "a detached control is neither hovered nor focused");
            Assert.That(control.ClassListContains(BooleanControl.FocusClass), Is.False);
        }
    }
}
