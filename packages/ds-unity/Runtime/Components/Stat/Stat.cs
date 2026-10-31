// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Stat : VisualElement
    {
        [UxmlAttribute] public string Size { get => Variants.Get(this, "stat", "sm", "md", "lg"); set { Variants.Set(this, "stat", value, "sm", "md", "lg"); } }
        [UxmlAttribute] public string Trend { get => Variants.Get(this, "stat", "up", "down", "neutral"); set { Variants.Set(this, "stat", value, "up", "down", "neutral"); } }
        public Stat()
        {
            name = "root";
            AddToClassList("stat");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
            Size = "md";
        }
    }
}
