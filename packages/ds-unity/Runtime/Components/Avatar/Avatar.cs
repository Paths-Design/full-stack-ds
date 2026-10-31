// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Avatar : VisualElement
    {
        public Image Image { get; } = new Image();
        public Label InitialsControl { get; } = new Label();
        public AvatarControl Control { get; }
        [UxmlAttribute] public string Src { get => Control.Src; set => Control.Src = value; }
        [UxmlAttribute] public string Initials { get => Control.Initials; set => Control.Initials = value; }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "avatar", "small", "medium", "large", "extra-large"); set { Variants.Set(this, "avatar", value, "small", "medium", "large", "extra-large"); } }
        public Avatar()
        {
            name = "root";
            AddToClassList("avatar");
            Image.name = "image";
            Image.AddToClassList("avatar__image");
            hierarchy.Add(Image);
            InitialsControl.name = "initials";
            InitialsControl.AddToClassList("avatar__initials");
            hierarchy.Add(InitialsControl);
            Gap.Attach(this);
            Control = AvatarControl.Attach(this, image: Image, initials: InitialsControl);
        }
    }
}
