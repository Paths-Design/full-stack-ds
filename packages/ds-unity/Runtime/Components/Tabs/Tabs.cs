// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Tabs : VisualElement
    {
        public const string ChannelName = "activeTab";
        public const string ChangeHandler = "onValueChange";
        public ItemGroup Group { get; }
        [UxmlAttribute] public string Value { get => Group.Value; set => Group.Value = value; }
        public string[] Values { get => Group.Values; set => Group.Values = value; }
        public bool Controlled { get => Group.Controlled; set => Group.Controlled = value; }
        public event Action<string[]> ValueRequested { add => Group.ValueRequested += value; remove => Group.ValueRequested -= value; }
        public event Action<string[]> ValueChanged { add => Group.ValueChanged += value; remove => Group.ValueChanged -= value; }
        [UxmlAttribute] public string Orientation { get => Variants.Get(this, "tabs", "horizontal", "vertical"); set { Variants.Set(this, "tabs", value, "horizontal", "vertical"); Group.Orientation = value; } }
        [UxmlAttribute] public string Appearance { get => Variants.Get(this, "tabs", "underline", "pills"); set { Variants.Set(this, "tabs", value, "underline", "pills"); } }
        [UxmlAttribute] public string ActivationMode { get => Variants.Get(this, "tabs", "automatic", "manual"); set { Variants.Set(this, "tabs", value, "automatic", "manual"); Group.ActivationMode = value; } }
        [UxmlAttribute] public bool Loop { get => Group.Loop; set => Group.Loop = value; }
        [UxmlAttribute] public bool UnmountInactive { get => Group.UnmountInactive; set => Group.UnmountInactive = value; }
        public Tabs()
        {
            name = "root";
            AddToClassList("tabs");
            Group = ItemGroup.Attach(this, triggerClass: "tabs__tab", contentClass: "tabs__panel", operation: "select", stateClass: "is-selected", multiple: false, focus: "roving", orientation: "horizontal", wrap: true);
            Orientation = "horizontal";
            Appearance = "underline";
            ActivationMode = "automatic";
            Loop = true;
        }
    }

    [UxmlElement]
    public partial class TabsList : VisualElement
    {
        public VisualElement Indicator { get; } = new VisualElement();
        public TabsList()
        {
            name = "list";
            AddToClassList("tabs__list");
            Indicator.name = "indicator";
            Indicator.AddToClassList("tabs__indicator");
            hierarchy.Add(Indicator);
        }
    }

    [UxmlElement]
    public partial class TabsTab : Button, IKeyedPart
    {
        [UxmlAttribute] public string Value { get; set; }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public TabsTab()
        {
            name = "tab";
            AddToClassList("tabs__tab");
        }
    }

    [UxmlElement]
    public partial class TabsPanel : VisualElement, IKeyedPart
    {
        [UxmlAttribute] public string Value { get; set; }
        public TabsPanel()
        {
            name = "panel";
            AddToClassList("tabs__panel");
        }
    }
}
