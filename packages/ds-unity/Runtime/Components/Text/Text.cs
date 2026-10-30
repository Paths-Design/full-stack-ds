// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Text : TextElement
    {
        [UxmlAttribute] public string Variant { get => Variants.Get(this, "text", "display", "headline", "title", "body", "caption", "overline", "code"); set { Variants.Set(this, "text", value, "display", "headline", "title", "body", "caption", "overline", "code"); } }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "text", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"); set { Variants.Set(this, "text", value, "xs", "sm", "md", "lg", "xl", "2xl", "3xl"); } }
        [UxmlAttribute] public string Weight { get => Variants.Get(this, "text", "light", "normal", "medium", "semibold", "bold"); set { Variants.Set(this, "text", value, "light", "normal", "medium", "semibold", "bold"); } }
        public Text()
        {
            name = "root";
            AddToClassList("text");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }
}
