// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class List : VisualElement
    {
        [UxmlAttribute] public string Variant { get => Variants.GetAxis(this, "list", "variant-", "default", "unstyled", "inline", "divided", "spaced"); set { Variants.SetAxis(this, "list", "variant-", value, "default", "unstyled", "inline", "divided", "spaced"); } }
        [UxmlAttribute] public string Size { get => Variants.GetAxis(this, "list", "size-", "sm", "md", "lg"); set { Variants.SetAxis(this, "list", "size-", value, "sm", "md", "lg"); } }
        public List()
        {
            name = "root";
            AddToClassList("list");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
            Variant = "default";
        }
    }
}
