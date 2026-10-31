// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Blockquote : VisualElement
    {
        [UxmlAttribute] public string Variant { get => Variants.Get(this, "blockquote", "default", "bordered", "highlighted"); set { Variants.Set(this, "blockquote", value, "default", "bordered", "highlighted"); } }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "blockquote", "sm", "md", "lg"); set { Variants.Set(this, "blockquote", value, "sm", "md", "lg"); } }
        public Blockquote()
        {
            name = "root";
            AddToClassList("blockquote");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }
}
