// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class RadioGroup : VisualElement
    {
        public ChoiceGroupControl Control { get; }
        public readonly struct RadioGroupOption
        {
            public readonly bool Disabled;
            public readonly string Description;
            public readonly string Value;
            public readonly string Label;
            public RadioGroupOption(bool disabled, string description, string value, string label)
            {
                this.Disabled = disabled;
                this.Description = description;
                this.Value = value;
                this.Label = label;
            }
        }
        [UxmlAttribute] public string Value { get => Control.Value; set => Control.Value = value; }
        [UxmlAttribute] public string DefaultValue { get => Control.DefaultValue; set => Control.DefaultValue = value; }
        public Action<string> OnChange { get => Control.ValueChanged; set => Control.ValueChanged = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<string> ValueRequested { get => Control.ValueRequested; set => Control.ValueRequested = value; }
        public RadioGroupOption[] Options
        {
            get => Control.GetOptions<RadioGroupOption>((value, label, description, disabled) => new RadioGroupOption(disabled, description, value, label));
            set
            {
                var list = value ?? System.Array.Empty<RadioGroupOption>();
                Control.SetOptions(list.Length == 0 ? System.Array.Empty<string>() : System.Array.ConvertAll(list, option => option.Value), list.Length == 0 ? System.Array.Empty<string>() : System.Array.ConvertAll(list, option => option.Label), list.Length == 0 ? System.Array.Empty<string>() : System.Array.ConvertAll(list, option => option.Description), list.Length == 0 ? System.Array.Empty<bool>() : System.Array.ConvertAll(list, option => option.Disabled));
            }
        }
        [UxmlAttribute] public string Orientation { get => Variants.Get(this, "radio-group", "vertical", "horizontal"); set { Variants.Set(this, "radio-group", value, "vertical", "horizontal"); } }
        public RadioGroup()
        {
            name = "root";
            AddToClassList("radio-group");
            Gap.Attach(this);
            Control = ChoiceGroupControl.Attach(this, prefix: "radio-group", itemPart: "item");
            Orientation = "vertical";
        }
    }
}
