// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Divider : VisualElement
    {
        [UxmlAttribute] public string Orientation { get => Variants.Get(this, "divider", "horizontal", "vertical"); set { Variants.Set(this, "divider", value, "horizontal", "vertical"); } }
        public Divider()
        {
            name = "root";
            AddToClassList("divider");
            Gap.Attach(this);
        }
    }
}
