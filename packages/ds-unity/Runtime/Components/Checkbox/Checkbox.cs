// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Checkbox : VisualElement, INotifyValueChanged<bool>
    {
        public const string ChannelName = "checked";
        public const string ChangeHandler = "onChange";
        public UnityEngine.UIElements.Button Input { get; } = new UnityEngine.UIElements.Button();
        public VisualElement Indicator { get; } = new VisualElement();
        public BooleanControl Control { get; }
        public UnityEngine.UIElements.Button Trigger => Input;
        [UxmlAttribute] public bool Checked { get => Control.Value; set => Control.Value = value; }
        public bool value { get => Control.Value; set => Control.Value = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public event Action<bool> ValueRequested { add => Control.ValueRequested += value; remove => Control.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Control.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Control.RequestValue(next);
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public Checkbox()
        {
            name = "root";
            AddToClassList("checkbox");
            Input.name = "input";
            Input.AddToClassList("checkbox__input");
            hierarchy.Add(Input);
            Indicator.name = "indicator";
            Indicator.AddToClassList("checkbox__indicator");
            hierarchy.Add(Indicator);
            Gap.Attach(this);
            Control = BooleanControl.Attach(this, control: Input, stateClass: "is-checked", labelHost: this);
        }
    }
}
