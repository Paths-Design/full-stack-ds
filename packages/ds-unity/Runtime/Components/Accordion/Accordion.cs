// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Accordion : VisualElement
    {
        public const string ChannelName = "openness";
        public const string ChangeHandler = "onValueChange";
        public ItemGroup Group { get; }
        [UxmlAttribute] public string Value { get => Group.Value; set => Group.Value = value; }
        public string[] Values { get => Group.Values; set => Group.Values = value; }
        public bool Controlled { get => Group.Controlled; set => Group.Controlled = value; }
        public event Action<string[]> ValueRequested { add => Group.ValueRequested += value; remove => Group.ValueRequested -= value; }
        public event Action<string[]> ValueChanged { add => Group.ValueChanged += value; remove => Group.ValueChanged -= value; }
        [UxmlAttribute] public string Type { get => Variants.Get(this, "accordion--type-"); set { Variants.Set(this, "accordion--type-", value, "single", "multiple"); Group.SelectionType = value; } }
        [UxmlAttribute] public bool Collapsible { get => Group.Collapsible; set => Group.Collapsible = value; }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public Accordion()
        {
            name = "root";
            AddToClassList("accordion");
            Group = ItemGroup.Attach(this, triggerClass: "accordion__trigger", contentClass: "accordion__content", operation: "toggle-item", stateClass: "is-open", multiple: true, focus: "manual", orientation: "vertical", wrap: true);
            Type = "single";
            Collapsible = false;
        }
    }

    [UxmlElement]
    public partial class AccordionItem : VisualElement
    {
        public AccordionItem()
        {
            name = "item";
            AddToClassList("accordion__item");
        }
    }

    [UxmlElement]
    public partial class AccordionTrigger : Button, IKeyedPart
    {
        public VisualElement Chevron { get; } = new VisualElement();
        private readonly VisualElement children = new VisualElement();
        public override VisualElement contentContainer => children;
        [UxmlAttribute] public string Value { get; set; }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public AccordionTrigger()
        {
            name = "trigger";
            AddToClassList("accordion__trigger");
            children.name = "children";
            children.AddToClassList("accordion__children");
            hierarchy.Add(children);
            Chevron.name = "chevron";
            Chevron.AddToClassList("accordion__chevron");
            hierarchy.Add(Chevron);
        }
    }

    [UxmlElement]
    public partial class AccordionHeader : VisualElement
    {
        public AccordionHeader()
        {
            name = "header";
            AddToClassList("accordion__header");
        }
    }

    [UxmlElement]
    public partial class AccordionContent : VisualElement, IKeyedPart
    {
        public VisualElement ContentInner { get; } = new VisualElement();
        public override VisualElement contentContainer => ContentInner;
        [UxmlAttribute] public string Value { get; set; }
        public AccordionContent()
        {
            name = "content";
            AddToClassList("accordion__content");
            ContentInner.name = "contentInner";
            ContentInner.AddToClassList("accordion__contentInner");
            hierarchy.Add(ContentInner);
        }
    }
}
