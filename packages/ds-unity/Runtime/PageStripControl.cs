using System;
using System.Collections.Generic;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Page-strip behavior: the runtime builds one native button per declared
    /// page label with the authored item/marker/fill/label classes, owns the numeric
    /// index and raises a commit (uncontrolled) or request (controlled) when an item
    /// is activated. Disabled blocks activation. The authored current-position
    /// selectors key on a data attribute USS cannot set, so no active styling is
    /// claimed; the accessible navigation label is not realised.</summary>
    public sealed class PageStripControl
    {
        private readonly VisualElement host;
        private readonly string itemClass;
        private readonly string markerClass;
        private readonly string fillClass;
        private readonly string labelClass;
        private readonly List<UnityEngine.UIElements.Button> buttons = new List<UnityEngine.UIElements.Button>();
        private string[] pages = Array.Empty<string>();
        private int index;
        private int defaultIndex;
        private bool disabled;
        private bool indexExplicit;
        public bool Controlled { get; set; }
        public Action<int> IndexChanged;
        public Action<int> PageRequested;

        private PageStripControl(VisualElement host, string prefix, string itemPart, string markerPart, string fillPart, string labelPart)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            itemClass = $"{prefix}__{itemPart}";
            markerClass = $"{prefix}__{markerPart}";
            fillClass = $"{prefix}__{fillPart}";
            labelClass = $"{prefix}__{labelPart}";
        }

        public static PageStripControl Attach(VisualElement host, string prefix, string itemPart, string markerPart, string fillPart, string labelPart)
            => new PageStripControl(host, prefix, itemPart, markerPart, fillPart, labelPart);

        public int Index
        {
            get => index;
            set
            {
                indexExplicit = true;
                index = pages.Length == 0 ? 0 : Math.Clamp(value, 0, pages.Length - 1);
            }
        }

        public int DefaultIndex
        {
            get => defaultIndex;
            set
            {
                defaultIndex = value;
                if (indexExplicit) return;
                index = pages.Length == 0 ? 0 : Math.Clamp(value, 0, pages.Length - 1);
            }
        }

        public bool Disabled
        {
            get => disabled;
            set
            {
                disabled = value;
                ApplyDisabled();
            }
        }

        public string[] Pages
        {
            get => pages;
            set
            {
                pages = value ?? Array.Empty<string>();
                if (!indexExplicit) index = pages.Length == 0 ? 0 : Math.Clamp(defaultIndex, 0, pages.Length - 1);
                Rebuild();
            }
        }

        private void Rebuild()
        {
            host.Clear();
            buttons.Clear();
            for (var i = 0; i < pages.Length; i++)
            {
                var page = i;
                var button = new UnityEngine.UIElements.Button();
                button.AddToClassList(itemClass);
                var marker = new VisualElement();
                marker.AddToClassList(markerClass);
                var fill = new VisualElement();
                fill.AddToClassList(fillClass);
                marker.Add(fill);
                var label = new Label { text = pages[i] ?? "" };
                label.AddToClassList(labelClass);
                button.Add(marker);
                button.Add(label);
                button.clicked += () => Request(page);
                host.Add(button);
                buttons.Add(button);
            }
            ApplyDisabled();
        }

        private void ApplyDisabled()
        {
            foreach (var button in buttons) button.SetEnabled(!disabled);
        }

        private void Request(int next)
        {
            if (disabled || next == index) return;
            if (Controlled)
            {
                PageRequested?.Invoke(next);
                return;
            }
            index = next;
            indexExplicit = true;
            IndexChanged?.Invoke(next);
        }
    }
}
