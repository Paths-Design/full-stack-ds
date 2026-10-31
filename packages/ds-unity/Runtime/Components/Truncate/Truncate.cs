// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Truncate : VisualElement
    {
        public VisualElement Content { get; } = new VisualElement();
        public UnityEngine.UIElements.Button Toggle { get; } = new UnityEngine.UIElements.Button();
        public override VisualElement contentContainer => Content;
        public ExpansionControl Control { get; }
        [UxmlAttribute] public bool Expanded { get => Control.Expanded; set => Control.Expanded = value; }
        [UxmlAttribute] public string CollapseText { get => Control.ExpandedLabel; set => Control.ExpandedLabel = value; }
        [UxmlAttribute] public string ExpandText { get => Control.CollapsedLabel; set => Control.CollapsedLabel = value; }
        [UxmlAttribute] public bool DefaultExpanded { get => Control.DefaultExpanded; set => Control.DefaultExpanded = value; }
        public Action<bool> OnExpandedChange { get => Control.ExpandedChanged; set => Control.ExpandedChanged = value; }
        [UxmlAttribute] public bool Expandable { get => Control.Expandable; set => Control.Expandable = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<bool> ExpandedRequested { get => Control.ExpandedRequested; set => Control.ExpandedRequested = value; }
        public Truncate()
        {
            name = "root";
            AddToClassList("truncate");
            Content.name = "content";
            Content.AddToClassList("truncate__content");
            hierarchy.Add(Content);
            Toggle.name = "toggle";
            Toggle.AddToClassList("truncate__toggle");
            hierarchy.Add(Toggle);
            Gap.Attach(this);
            Control = ExpansionControl.Attach(this, trigger: Toggle, prefix: "truncate", stateClass: "truncate--expanded");
        }
    }
}
