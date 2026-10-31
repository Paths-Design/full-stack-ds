using System;
using FullStackDS;
using UnityEngine;
using UnityEngine.UIElements;
using Button = UnityEngine.UIElements.Button; // native fallback; FullStackDS now admits Button

namespace GamePauseMenu
{
    /// <summary>Small construction helpers for the pause-menu chrome. Text, Divider and Icon
    /// helpers return generated components; the native helpers are the ledgered fallbacks.</summary>
    internal static class Ui
    {
        public static Text Overline(string text) => new Text { text = text, Variant = "overline" };
        public static Text Caption(string text) => new Text { text = text, Variant = "caption" };
        public static Text Body(string text) => new Text { text = text, Variant = "body" };
        public static Text Title(string text) => new Text { text = text, Variant = "title" };
        public static Text Headline(string text) => new Text { text = text, Variant = "headline" };
        public static Text Display(string text) => new Text { text = text, Variant = "display" };

        public static Text Styled(Text text, string className)
        {
            text.AddToClassList(className);
            return text;
        }

        public static VisualElement Box(string classNames)
        {
            var element = new VisualElement();
            AddClasses(element, classNames);
            return element;
        }

        public static void AddClasses(VisualElement element, string classNames)
        {
            if (string.IsNullOrEmpty(classNames)) return;
            foreach (var className in classNames.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries))
                element.AddToClassList(className);
        }

        public static VisualElement Row(string className, params VisualElement[] children)
        {
            var row = Box(className);
            row.style.flexDirection = FlexDirection.Row;
            foreach (var child in children) row.Add(child);
            return row;
        }

        public static VisualElement Column(string className, params VisualElement[] children)
        {
            var column = Box(className);
            column.style.flexDirection = FlexDirection.Column;
            foreach (var child in children) column.Add(child);
            return column;
        }

        /// <summary>Adds a 1px hairline rule. The element is the generated Divider; the spacing
        /// around it is lane chrome.</summary>
        public static Divider Rule(bool strong = false)
        {
            var divider = new Divider { Orientation = "horizontal" };
            divider.AddToClassList(strong ? "rule-strong" : "rule");
            return divider;
        }

        /// <summary>NOT FSDS: Unity allowlist admits no Button. Native UI Toolkit Button is used
        /// for app actions (set nav target, shop parts, remap binding, drawer close, swatches).</summary>
        public static Button NativeButton(string text, string className, Action clicked)
        {
            var button = new Button(clicked) { text = text };
            button.AddToClassList("native-button");
            if (!string.IsNullOrEmpty(className)) button.AddToClassList(className);
            return button;
        }

        /// <summary>NOT FSDS: Unity allowlist admits no Badge. App-authored status chip.</summary>
        public static Text Chip(string text, string className)
        {
            var chip = new Text { text = text, Variant = "overline" };
            chip.AddToClassList("chip");
            if (!string.IsNullOrEmpty(className)) chip.AddToClassList(className);
            return chip;
        }

        public static void IgnorePicking(params VisualElement[] elements)
        {
            foreach (var element in elements) element.pickingMode = PickingMode.Ignore;
        }

        public static Text StatValue(string text, string className = "stat-value") => Styled(Title(text), className);

        public static string Number(int value) => value.ToString("N0", System.Globalization.CultureInfo.InvariantCulture);
    }
}
