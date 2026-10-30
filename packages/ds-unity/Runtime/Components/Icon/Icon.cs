// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Icon : VisualElement
    {
        private readonly GlyphElement glyphElement = new GlyphElement();
        [UxmlAttribute] public string Name { get => glyphElement.GlyphName; set => glyphElement.GlyphName = value; }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "icon", "sm", "md", "lg", "xl"); set { Variants.Set(this, "icon", value, "sm", "md", "lg", "xl"); glyphElement.PixelSize = value == "sm" ? 16 : value == "md" ? 20 : value == "lg" ? 24 : value == "xl" ? 32 : 0; } }
        public Icon()
        {
            name = "root";
            AddToClassList("icon");
            hierarchy.Add(glyphElement);
            Gap.Attach(this);
            Size = "md";
        }
    }
}
