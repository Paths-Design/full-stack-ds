// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class ShowMore : VisualElement
    {
        public VisualElement Content { get; } = new VisualElement();
        public UnityEngine.UIElements.Button Trigger { get; } = new UnityEngine.UIElements.Button();
        public override VisualElement contentContainer => Content;
        public ExpansionControl Control { get; }
        [UxmlAttribute] public bool Expanded { get => Control.Expanded; set => Control.Expanded = value; }
        [UxmlAttribute] public string ShowLessLabel { get => Control.ExpandedLabel; set => Control.ExpandedLabel = value; }
        [UxmlAttribute] public string ShowMoreLabel { get => Control.CollapsedLabel; set => Control.CollapsedLabel = value; }
        [UxmlAttribute] public bool DefaultExpanded { get => Control.DefaultExpanded; set => Control.DefaultExpanded = value; }
        public Action<bool> OnExpandedChange { get => Control.ExpandedChanged; set => Control.ExpandedChanged = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<bool> ExpandedRequested { get => Control.ExpandedRequested; set => Control.ExpandedRequested = value; }
        public ShowMore()
        {
            name = "root";
            AddToClassList("show-more");
            Content.name = "content";
            Content.AddToClassList("show-more__content");
            hierarchy.Add(Content);
            Trigger.name = "trigger";
            Trigger.AddToClassList("show-more__trigger");
            hierarchy.Add(Trigger);
            Gap.Attach(this);
            Control = ExpansionControl.Attach(this, trigger: Trigger, prefix: "show-more", stateClass: "show-more--expanded");
        }
    }
}
