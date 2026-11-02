// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Input : UnityEngine.UIElements.TextField
    {
        public const string ChannelName = "value";
        public const string ChangeHandler = "onChange";
        public TextControl Control { get; }
        [UxmlAttribute] public string Value { get => Control.Value; set => Control.Value = value; }
        [UxmlAttribute] public string DefaultValue { get => Control.DefaultValue; set => Control.DefaultValue = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public event Action<string> ValueRequested { add => Control.ValueRequested += value; remove => Control.ValueRequested -= value; }
        public void SetValueWithoutNotify(string next) => Control.SetValueWithoutNotify(next);
        public void RequestValue(string next) => Control.RequestValue(next);
        [UxmlAttribute] public string Placeholder { get => Control.Placeholder; set => Control.Placeholder = value; }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        [UxmlAttribute] public bool Invalid { get => ClassListContains("input--invalid"); set => EnableInClassList("input--invalid", value); }
        public Input()
        {
            name = "root";
            AddToClassList("input");
            Gap.Attach(this);
            Control = TextControl.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }
}
