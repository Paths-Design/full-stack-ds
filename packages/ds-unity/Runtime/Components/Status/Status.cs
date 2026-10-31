// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Status : VisualElement
    {
        public VisualElement Label { get; } = new VisualElement();
        public override VisualElement contentContainer => Label;
        [UxmlAttribute] public string StatusValue { get => Variants.Get(this, "status", "info", "success", "warning", "danger", "error"); set { Variants.Set(this, "status", value, "info", "success", "warning", "danger", "error"); } }
        public Status()
        {
            name = "root";
            AddToClassList("status");
            Label.name = "label";
            Label.AddToClassList("status__label");
            hierarchy.Add(Label);
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }
}
