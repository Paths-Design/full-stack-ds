// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Badge : VisualElement
    {
        [UxmlAttribute] public string Variant { get => Variants.Get(this, "badge", "default", "status", "counter", "tag"); set { Variants.Set(this, "badge", value, "default", "status", "counter", "tag"); } }
        [UxmlAttribute] public string Intent { get => Variants.Get(this, "badge", "info", "success", "warning", "danger"); set { Variants.Set(this, "badge", value, "info", "success", "warning", "danger"); } }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "badge", "sm", "md", "lg"); set { Variants.Set(this, "badge", value, "sm", "md", "lg"); } }
        public Badge()
        {
            name = "root";
            AddToClassList("badge");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }

    [UxmlElement]
    public partial class BadgeContent : VisualElement
    {
        public BadgeContent()
        {
            name = "content";
            AddToClassList("badge__content");
        }
    }
}
