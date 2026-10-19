// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Popover : VisualElement, INotifyValueChanged<bool>
    {
        public const string ChannelName = "open";
        public const string ChangeHandler = "onOpenChange";
        public AnchoredSurface Surface { get; }
        public Button Trigger => Surface.Trigger;
        public VisualElement Content => Surface.Content;
        [UxmlAttribute] public bool Open { get => Surface.Value; set => Surface.Value = value; }
        public bool value { get => Surface.Value; set => Surface.Value = value; }
        public bool Controlled { get => Surface.Controlled; set => Surface.Controlled = value; }
        public event Action<bool> ValueRequested { add => Surface.ValueRequested += value; remove => Surface.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Surface.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Surface.RequestValue(next);
        [UxmlAttribute] public string Placement { get => Variants.Get(this, "popover--placement-"); set { Variants.Set(this, "popover--placement-", value, "top", "bottom", "left", "right", "auto"); Surface.Placement = value; } }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        [UxmlAttribute] public bool CloseOnEscape { get => Surface.CloseOnEscape; set => Surface.CloseOnEscape = value; }
        [UxmlAttribute] public bool CloseOnOutsideClick { get => Surface.CloseOnOutsideClick; set => Surface.CloseOnOutsideClick = value; }
        [UxmlAttribute] public bool CloseOnBlur { get => Surface.CloseOnBlur; set => Surface.CloseOnBlur = value; }
        public Popover()
        {
            name = "root";
            AddToClassList("popover");
            Surface = AnchoredSurface.Attach(this, triggerClass: "popover__trigger", contentClass: "popover__content", stateClass: "is-open");
            CloseOnEscape = true;
            CloseOnOutsideClick = true;
            CloseOnBlur = true;
        }
    }

    [UxmlElement]
    public partial class PopoverTrigger : Button, IKeyedPart
    {
        [UxmlAttribute] public string Value { get; set; }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public PopoverTrigger()
        {
            name = "trigger";
            AddToClassList("popover__trigger");
        }
    }

    [UxmlElement]
    public partial class PopoverContent : ScrollView, IKeyedPart
    {
        [UxmlAttribute] public string Value { get; set; }
        public PopoverContent()
        {
            name = "content";
            AddToClassList("popover__content");
        }
    }
}
