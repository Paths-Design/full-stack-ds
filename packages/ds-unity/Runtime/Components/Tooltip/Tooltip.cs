// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Tooltip : VisualElement, INotifyValueChanged<bool>
    {
        public const string ChannelName = "open";
        public const string ChangeHandler = "onOpenChange";
        public AnchoredSurface Surface { get; }
        public UnityEngine.UIElements.Button Trigger => Surface.Trigger;
        public VisualElement Content => Surface.Content;
        [UxmlAttribute] public bool Open { get => Surface.Value; set => Surface.Value = value; }
        public bool value { get => Surface.Value; set => Surface.Value = value; }
        public bool Controlled { get => Surface.Controlled; set => Surface.Controlled = value; }
        public event Action<bool> ValueRequested { add => Surface.ValueRequested += value; remove => Surface.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Surface.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Surface.RequestValue(next);
        [UxmlAttribute] public string Placement { get => Variants.Get(this, "tooltip", "top", "bottom", "left", "right", "auto"); set { Variants.Set(this, "tooltip", value, "top", "bottom", "left", "right", "auto"); Surface.Placement = value; } }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        [UxmlAttribute] public bool CloseOnEscape { get => Surface.CloseOnEscape; set => Surface.CloseOnEscape = value; }
        [UxmlAttribute] public bool CloseOnBlur { get => Surface.CloseOnBlur; set => Surface.CloseOnBlur = value; }
        public Tooltip()
        {
            name = "root";
            AddToClassList("tooltip");
            Gap.Attach(this);
            Surface = AnchoredSurface.Attach(this, triggerClass: "tooltip__trigger", contentClass: "tooltip__content", stateClass: null, openOnHover: true, openOnFocus: true, closeOnPointerLeave: true, contentFocusable: false);
            CloseOnEscape = true;
            CloseOnBlur = true;
        }
    }

    [UxmlElement]
    public partial class TooltipTrigger : UnityEngine.UIElements.Button
    {
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public TooltipTrigger()
        {
            name = "trigger";
            AddToClassList("tooltip__trigger");
        }
    }

    [UxmlElement]
    public partial class TooltipContent : VisualElement
    {
        public TooltipContent()
        {
            name = "content";
            AddToClassList("tooltip__content");
        }
    }
}
