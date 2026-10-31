using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace FullStackDS.Tests
{
    /// <summary>Gap realization: the generated sheet's --fsds-gap (lowered from the contract gap facts,
    /// values from resolved.tokens.json) becomes spacing between in-flow children.</summary>
    public class GapTests
    {
        private UnityEditor.EditorWindow window;
        private VisualElement scope;
        [SetUp] public void Setup()
        {
            window = ScriptableObject.CreateInstance<UnityEditor.EditorWindow>();
            window.position = new Rect(0, 0, 600, 600); window.Show();
            scope = new VisualElement(); Theme.Attach(scope); window.rootVisualElement.Add(scope);
        }
        [TearDown] public void Teardown() => window.Close();
        private static IEnumerator Frames(int count = 3) { for (int i = 0; i < count; i++) yield return null; }
        // Space between two consecutive children, excluding the second child's own leading margin
        // (as in CSS, gap adds to the items' margins; the emulation replaces the first child's trailing margin).
        private static float Row(VisualElement before, VisualElement after) => after.worldBound.xMin - after.resolvedStyle.marginLeft - before.worldBound.xMax;
        private static float Column(VisualElement before, VisualElement after) => after.worldBound.yMin - after.resolvedStyle.marginTop - before.worldBound.yMax;
        private static void NoInlineMargin(VisualElement e, string what)
        {
            Assert.That(e.style.marginRight.keyword, Is.EqualTo(StyleKeyword.Null), what + " margin-right");
            Assert.That(e.style.marginBottom.keyword, Is.EqualTo(StyleKeyword.Null), what + " margin-bottom");
        }

        [Test] public void OnlyPixelAndUnitlessLengthsAreSpacing()
        {
            Assert.That(Gap.ParsePixels("8px"), Is.EqualTo(8));
            Assert.That(Gap.ParsePixels(" 12.5px "), Is.EqualTo(12.5f));
            Assert.That(Gap.ParsePixels("0"), Is.EqualTo(0));
            Assert.That(Gap.ParsePixels("50%"), Is.NaN);
            Assert.That(Gap.ParsePixels("1em"), Is.NaN);
            Assert.That(Gap.ParsePixels("auto"), Is.NaN);
            Assert.That(Gap.ParsePixels(null), Is.NaN);
        }

        [UnityTest] public IEnumerator SwitchLabelFollowsTheTrackByTheBoxModelGap()
        {
            var control = new Switch(); var caption = new UnityEngine.UIElements.Label("Sound"); control.Add(caption);
            scope.Add(control); yield return Frames();
            Assert.That(Gap.Resolved(control), Is.EqualTo(8)); // box-model.gap -> semantic.action.size.medium.gap
            Assert.That(Row(control.Track, control.contentContainer), Is.EqualTo(8).Within(.5));
            Assert.That(control.Track.style.marginRight.value.value, Is.EqualTo(8));
            NoInlineMargin(control.Input, "absolutely positioned input");
            NoInlineMargin(control.contentContainer, "last in-flow child");
            // A variant change re-resolves the custom property and re-applies.
            control.Size = "lg"; yield return Frames();
            Assert.That(Gap.Resolved(control), Is.EqualTo(12)); // switch--lg: box-model.gap -> semantic.action.size.large.gap
            Assert.That(Row(control.Track, control.contentContainer), Is.EqualTo(12).Within(.5));
        }

        [UnityTest] public IEnumerator AccordionItemsAreSpacedDownTheColumn()
        {
            var accordion = new Accordion();
            foreach (var key in new[] { "a", "b" }) {
                var item = new AccordionItem(); var header = new AccordionHeader();
                header.Add(new AccordionTrigger { Value = key, text = key }); item.Add(header);
                item.Add(new AccordionContent { Value = key }); accordion.Add(item);
            }
            scope.Add(accordion); yield return Frames();
            var items = accordion.Query<AccordionItem>().ToList();
            Assert.That(Gap.Resolved(accordion), Is.EqualTo(24)); // accordion.spacing.gap -> core.spacing.size.07 (root rule after the box-model gap)
            Assert.That(Column(items[0], items[1]), Is.EqualTo(24).Within(.5));
            NoInlineMargin(items[1], "last item");
        }

        [UnityTest] public IEnumerator TabsListSpacesTabsAndReappliesWhenTabsChange()
        {
            var tabs = new Tabs(); var list = new TabsList(); tabs.Add(list);
            TabsTab Tab(string key) { var tab = new TabsTab { Value = key, text = key }; list.Add(tab); tabs.Add(new TabsPanel { Value = key }); return tab; }
            var a = Tab("a"); var b = Tab("b"); var c = Tab("c");
            scope.Add(tabs); yield return Frames();
            Assert.That(b.worldBound.yMin, Is.EqualTo(a.worldBound.yMin).Within(1), "tabs share one row");
            Assert.That(Row(a, b), Is.EqualTo(8).Within(.5)); // tabs.spacing.gap -> core.spacing.size.04
            Assert.That(Row(b, c), Is.EqualTo(8).Within(.5));
            NoInlineMargin(c, "last tab");
            // Appending a tab: the former last tab gains the spacing, the new one carries none.
            var d = Tab("d"); yield return Frames();
            Assert.That(Row(c, d), Is.EqualTo(8).Within(.5));
            NoInlineMargin(d, "appended last tab");
            // Removing a middle tab and then the last one: spacing follows, removed tabs keep no margin.
            b.RemoveFromHierarchy(); yield return Frames();
            Assert.That(Row(a, c), Is.EqualTo(8).Within(.5));
            NoInlineMargin(b, "removed tab");
            d.RemoveFromHierarchy(); yield return Frames();
            NoInlineMargin(c, "tab that became last");
            NoInlineMargin(d, "removed last tab");
        }

        [UnityTest] public IEnumerator PopoverContentSpacesItsScrollContent()
        {
            var popover = new Popover(); var trigger = new PopoverTrigger { text = "Help" }; var content = new PopoverContent();
            var text = new UnityEngine.UIElements.Label("Body"); var action = new Button { text = "Action" };
            content.Add(text); content.Add(action); popover.Add(trigger); popover.Add(content); scope.Add(popover);
            yield return Frames();
            popover.CloseOnBlur = false; popover.Open = true; yield return Frames(4);
            Assert.That(Gap.Resolved(content), Is.EqualTo(8)); // popover.size.gap -> core.spacing.size.04
            Assert.That(Column(text, action), Is.EqualTo(8).Within(.5));
            NoInlineMargin(action, "last content child");
        }
    }
}
