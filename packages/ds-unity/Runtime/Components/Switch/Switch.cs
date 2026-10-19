// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Switch : VisualElement, INotifyValueChanged<bool>
    {
        public const string ChannelName = "checked";
        public const string ChangeHandler = "onChange";
        public Button Input { get; } = new Button();
        public VisualElement Track { get; } = new VisualElement();
        public VisualElement Thumb { get; } = new VisualElement();
        private readonly VisualElement children = new VisualElement();
        public override VisualElement contentContainer => children;
        public BooleanControl Control { get; }
        public Button Trigger => Input;
        [UxmlAttribute] public bool Checked { get => Control.Value; set => Control.Value = value; }
        public bool value { get => Control.Value; set => Control.Value = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public event Action<bool> ValueRequested { add => Control.ValueRequested += value; remove => Control.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Control.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Control.RequestValue(next);
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public Switch()
        {
            name = "root";
            AddToClassList("switch");
            Input.name = "input";
            Input.AddToClassList("switch__input");
            hierarchy.Add(Input);
            Track.name = "track";
            Track.AddToClassList("switch__track");
            hierarchy.Add(Track);
            Thumb.name = "thumb";
            Thumb.AddToClassList("switch__thumb");
            Track.Add(Thumb);
            children.name = "children";
            children.AddToClassList("switch__children");
            hierarchy.Add(children);
            Track.style.width = 48f;
            Track.style.height = 24f;
            Thumb.style.width = 16f;
            Thumb.style.height = 16f;
            Control = BooleanControl.Attach(this, control: Input, stateClass: "is-checked", labelHost: this);
        }
    }
}
