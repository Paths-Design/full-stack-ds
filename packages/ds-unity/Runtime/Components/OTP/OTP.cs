// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class OTP : VisualElement
    {
        public VisualElement Group { get; } = new VisualElement();
        public OtpControl Control { get; }
        [UxmlAttribute] public string Value { get => Control.Value; set => Control.Value = value; }
        [UxmlAttribute] public string DefaultValue { get => Control.DefaultValue; set => Control.DefaultValue = value; }
        public Action<string> OnChange { get => Control.ValueChanged; set => Control.ValueChanged = value; }
        public Action<string> Completed { get => Control.Completed; set => Control.Completed = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<string> ValueRequested { get => Control.ValueRequested; set => Control.ValueRequested = value; }
        [UxmlAttribute] public int Length { get => Control.Length; set => Control.Length = value; }
        [UxmlAttribute] public bool Disabled { get => Control.Disabled; set => Control.Disabled = value; }
        [UxmlAttribute] public bool ReadOnly { get => Control.ReadOnly; set => Control.ReadOnly = value; }
        [UxmlAttribute] public string Mode { get => Control.Mode; set => Control.Mode = value; }
        public OTP()
        {
            name = "root";
            AddToClassList("otp");
            Group.name = "group";
            Group.AddToClassList("otp__group");
            hierarchy.Add(Group);
            Gap.Attach(this);
            Gap.Attach(Group);
            Control = OtpControl.Attach(group: Group, prefix: "otp", fieldPart: "field");
        }
    }
}
