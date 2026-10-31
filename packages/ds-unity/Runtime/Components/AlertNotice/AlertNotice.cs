// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class AlertNotice : VisualElement
    {
        private readonly VisualElement children = new VisualElement();
        public override VisualElement contentContainer => children;
        [UxmlAttribute] public string Status { get => Variants.Get(this, "alert-notice", "info", "success", "warning", "error"); set { Variants.Set(this, "alert-notice", value, "info", "success", "warning", "error"); } }
        [UxmlAttribute] public string Level { get => Variants.Get(this, "alert-notice", "page", "section", "inline"); set { Variants.Set(this, "alert-notice", value, "page", "section", "inline"); } }
        public AlertNotice()
        {
            name = "root";
            AddToClassList("alert-notice");
            children.name = "children";
            children.AddToClassList("alert-notice__children");
            hierarchy.Add(children);
            Gap.Attach(this);
            Gap.Attach(children);
            Theme.AddStyleSheet(this);
        }
    }

    [UxmlElement]
    public partial class AlertNoticeBody : VisualElement
    {
        public AlertNoticeBody()
        {
            name = "body";
            AddToClassList("alert-notice__body");
            Gap.Attach(this);
        }
    }

    [UxmlElement]
    public partial class AlertNoticeTitle : VisualElement
    {
        public AlertNoticeTitle()
        {
            name = "title";
            AddToClassList("alert-notice__title");
        }
    }
}
