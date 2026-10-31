// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Alert : VisualElement
    {
        private readonly VisualElement children = new VisualElement();
        public override VisualElement contentContainer => children;
        [UxmlAttribute] public string Intent { get => Variants.Get(this, "alert", "info", "success", "warning", "danger"); set { Variants.Set(this, "alert", value, "info", "success", "warning", "danger"); } }
        [UxmlAttribute] public string Level { get => Variants.Get(this, "alert", "inline", "section", "page"); set { Variants.Set(this, "alert", value, "inline", "section", "page"); } }
        public Alert()
        {
            name = "root";
            AddToClassList("alert");
            children.name = "children";
            children.AddToClassList("alert__children");
            hierarchy.Add(children);
            Gap.Attach(this);
            Gap.Attach(children);
            Theme.AddStyleSheet(this);
        }
    }

    [UxmlElement]
    public partial class AlertBody : VisualElement
    {
        public AlertBody()
        {
            name = "body";
            AddToClassList("alert__body");
            Gap.Attach(this);
        }
    }

    [UxmlElement]
    public partial class AlertTitle : VisualElement
    {
        public AlertTitle()
        {
            name = "title";
            AddToClassList("alert__title");
        }
    }
}
