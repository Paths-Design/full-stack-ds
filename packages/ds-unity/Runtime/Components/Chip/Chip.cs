// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Chip : VisualElement
    {
        public UnityEngine.UIElements.Button Action { get; } = new UnityEngine.UIElements.Button();
        public VisualElement Text { get; } = new VisualElement();
        public UnityEngine.UIElements.Button Dismiss { get; } = new UnityEngine.UIElements.Button();
        public override VisualElement contentContainer => Text;
        public Action OnClick { get; set; }
        public Action OnDismiss { get; set; }
        [UxmlAttribute] public bool Dismissible { get => Dismiss.style.display.value == DisplayStyle.Flex; set { Dismiss.style.display = value ? DisplayStyle.Flex : DisplayStyle.None; } }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        [UxmlAttribute] public string Variant { get => Variants.Get(this, "chip", "default", "selected", "dismissible"); set { Variants.Set(this, "chip", value, "default", "selected", "dismissible"); } }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "chip", "small", "medium", "large"); set { Variants.Set(this, "chip", value, "small", "medium", "large"); } }
        public Chip()
        {
            name = "root";
            AddToClassList("chip");
            Action.name = "action";
            Action.AddToClassList("chip__action");
            hierarchy.Add(Action);
            Text.name = "text";
            Text.AddToClassList("chip__text");
            Action.Add(Text);
            Dismiss.name = "dismiss";
            Dismiss.AddToClassList("chip__dismiss");
            hierarchy.Add(Dismiss);
            Gap.Attach(this);
            Action.clicked += () => OnClick?.Invoke();
            Dismiss.clicked += () => OnDismiss?.Invoke();
            Dismissible = false;
        }
    }
}
