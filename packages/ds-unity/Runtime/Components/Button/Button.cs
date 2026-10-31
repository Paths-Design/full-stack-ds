// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Button : UnityEngine.UIElements.Button
    {
        public Action OnClick { get; set; }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "button", "small", "medium", "large"); set { Variants.Set(this, "button", value, "small", "medium", "large"); } }
        [UxmlAttribute] public string Variant { get => Variants.Get(this, "button", "primary", "secondary", "tertiary", "ghost", "destructive", "outline"); set { Variants.Set(this, "button", value, "primary", "secondary", "tertiary", "ghost", "destructive", "outline"); } }
        public Button()
        {
            name = "root";
            AddToClassList("button");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
            clicked += () => OnClick?.Invoke();
            Size = "medium";
            Variant = "primary";
        }
    }
}
