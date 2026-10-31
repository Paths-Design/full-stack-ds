// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Skeleton : VisualElement
    {
        [UxmlAttribute] public string Variant { get => Variants.Get(this, "skeleton", "block", "text", "avatar", "media", "dataviz", "actions"); set { Variants.Set(this, "skeleton", value, "block", "text", "avatar", "media", "dataviz", "actions"); } }
        [UxmlAttribute] public string Animate { get => Variants.Get(this, "skeleton", "shimmer", "wipe", "pulse", "none"); set { Variants.Set(this, "skeleton", value, "shimmer", "wipe", "pulse", "none"); } }
        [UxmlAttribute] public string Density { get => Variants.Get(this, "skeleton", "compact", "regular", "spacious"); set { Variants.Set(this, "skeleton", value, "compact", "regular", "spacious"); } }
        public Skeleton()
        {
            name = "root";
            AddToClassList("skeleton");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
            Variant = "block";
            Animate = "shimmer";
            Density = "regular";
        }
    }
}
