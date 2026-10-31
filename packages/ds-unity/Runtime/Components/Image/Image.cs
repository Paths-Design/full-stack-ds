// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Image : UnityEngine.UIElements.Image
    {
        public ImageControl Control { get; }
        [UxmlAttribute] public string Src { get => Control.Src; set => Control.Src = value; }
        [UxmlAttribute] public string Radius { get => Variants.GetAxis(this, "image", "radius-", "none", "sm", "md", "lg", "full"); set { Variants.SetAxis(this, "image", "radius-", value, "none", "sm", "md", "lg", "full"); } }
        public Image()
        {
            name = "root";
            AddToClassList("image");
            Gap.Attach(this);
            Control = ImageControl.Attach(this);
        }
    }
}
