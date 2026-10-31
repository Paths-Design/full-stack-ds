using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Controlled expansion behavior: owns the boolean channel, toggles the
    /// authored expanded state class on the host and paints the trigger label from
    /// the declared state-dependent label props. The content slot stays
    /// consumer-owned; line-clamp measurement and the localised message defaults
    /// are not realised.</summary>
    public sealed class ExpansionControl
    {
        private readonly VisualElement host;
        private readonly UnityEngine.UIElements.Button trigger;
        private readonly string stateClass;
        private bool expanded;
        private bool defaultExpanded;
        private string expandedLabel = "";
        private string collapsedLabel = "";
        private bool expandable = true;
        private bool expandedExplicit;
        public bool Controlled { get; set; }
        public Action<bool> ExpandedChanged;
        public Action<bool> ExpandedRequested;

        private ExpansionControl(VisualElement host, UnityEngine.UIElements.Button trigger, string stateClass)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            this.trigger = trigger ?? throw new ArgumentNullException(nameof(trigger));
            this.stateClass = stateClass ?? "";
            trigger.clicked += Toggle;
            Apply();
        }

        public static ExpansionControl Attach(VisualElement host, UnityEngine.UIElements.Button trigger, string prefix, string stateClass)
            => new ExpansionControl(host, trigger, stateClass);

        public bool Expanded
        {
            get => expanded;
            set
            {
                expandedExplicit = true;
                expanded = value;
                Apply();
            }
        }

        public bool DefaultExpanded
        {
            get => defaultExpanded;
            set
            {
                defaultExpanded = value;
                if (!expandedExplicit)
                {
                    expanded = defaultExpanded;
                    Apply();
                }
            }
        }

        /// <summary>Whether the trigger toggle is present; the guarded toggle switch.</summary>
        public bool Expandable
        {
            get => expandable;
            set
            {
                expandable = value;
                Apply();
            }
        }

        public string ExpandedLabel
        {
            get => expandedLabel;
            set
            {
                expandedLabel = value ?? "";
                Apply();
            }
        }

        public string CollapsedLabel
        {
            get => collapsedLabel;
            set
            {
                collapsedLabel = value ?? "";
                Apply();
            }
        }

        private void Toggle()
        {
            if (Controlled)
            {
                ExpandedRequested?.Invoke(!expanded);
                return;
            }
            expanded = !expanded;
            expandedExplicit = true;
            Apply();
            ExpandedChanged?.Invoke(expanded);
        }

        private void Apply()
        {
            trigger.text = expanded ? expandedLabel : collapsedLabel;
            trigger.style.display = expandable ? DisplayStyle.Flex : DisplayStyle.None;
            if (!string.IsNullOrEmpty(stateClass)) host.EnableInClassList(stateClass, expanded);
        }
    }
}
