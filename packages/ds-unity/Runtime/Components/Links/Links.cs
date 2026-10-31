// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Links : VisualElement
    {
        public LinkControl Control { get; }
        [UxmlAttribute] public string Href { get => Control.Href; set => Control.Href = value; }
        [UxmlAttribute] public string Target { get => Control.Target; set => Control.Target = value; }
        [UxmlAttribute] public string Rel { get => Control.Rel; set => Control.Rel = value; }
        public event Action<string> Activated { add => Control.Activated += value; remove => Control.Activated -= value; }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "links", "small", "medium", "large"); set { Variants.Set(this, "links", value, "small", "medium", "large"); } }
        public Links()
        {
            name = "root";
            AddToClassList("links");
            Gap.Attach(this);
            Control = LinkControl.Attach(this);
        }
    }
}
