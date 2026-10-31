// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class ToggleSwitch : UnityEngine.UIElements.Button, INotifyValueChanged<bool>
    {
        public const string ChannelName = "checked";
        public const string ChangeHandler = "onChange";
        public BooleanControl Control { get; }
        public UnityEngine.UIElements.Button Trigger => this;
        [UxmlAttribute] public bool Checked { get => Control.Value; set => Control.Value = value; }
        public bool value { get => Control.Value; set => Control.Value = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public event Action<bool> ValueRequested { add => Control.ValueRequested += value; remove => Control.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Control.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Control.RequestValue(next);
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public ToggleSwitch()
        {
            name = "root";
            AddToClassList("toggle-switch");
            Gap.Attach(this);
            Control = BooleanControl.Attach(this, control: this, stateClass: "is-checked", labelHost: null);
        }
    }
}
