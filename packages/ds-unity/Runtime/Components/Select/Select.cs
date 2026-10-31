// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Select : VisualElement
    {
        public UnityEngine.UIElements.Button Trigger { get; } = new UnityEngine.UIElements.Button();
        public Label Text { get; } = new Label();
        public VisualElement Content { get; } = new VisualElement();
        public VisualElement OptionsControl { get; } = new VisualElement();
        public SelectControl Control { get; }
        public readonly struct SelectOption
        {
            public readonly string Value;
            public readonly bool Disabled;
            public readonly string Label;
            public SelectOption(string value, bool disabled, string label)
            {
                this.Value = value;
                this.Disabled = disabled;
                this.Label = label;
            }
        }
        [UxmlAttribute] public string Value { get => Control.Value; set => Control.Value = value; }
        [UxmlAttribute] public bool Open { get => Control.Open; set => Control.Open = value; }
        [UxmlAttribute] public string DefaultValue { get => Control.DefaultValue; set => Control.DefaultValue = value; }
        [UxmlAttribute] public bool DefaultOpen { get => Control.DefaultOpen; set => Control.DefaultOpen = value; }
        [UxmlAttribute] public string Placeholder { get => Control.Placeholder; set => Control.Placeholder = value; }
        [UxmlAttribute] public bool Disabled { get => Control.Disabled; set => Control.Disabled = value; }
        public Action<string> OnChange { get => Control.ValueChanged; set => Control.ValueChanged = value; }
        public Action<bool> OnOpenChange { get => Control.OpenChanged; set => Control.OpenChanged = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<string> ValueRequested { get => Control.ValueRequested; set => Control.ValueRequested = value; }
        public bool OpenControlled { get => Control.OpenControlled; set => Control.OpenControlled = value; }
        public Action<bool> OpenRequested { get => Control.OpenRequested; set => Control.OpenRequested = value; }
        public SelectOption[] Options
        {
            get => Control.GetOptions<SelectOption>((value, label, disabled) => new SelectOption(value, disabled, label));
            set
            {
                var list = value ?? System.Array.Empty<SelectOption>();
                Control.SetOptions(list.Length == 0 ? System.Array.Empty<string>() : System.Array.ConvertAll(list, option => option.Value), list.Length == 0 ? System.Array.Empty<string>() : System.Array.ConvertAll(list, option => option.Label), list.Length == 0 ? System.Array.Empty<bool>() : System.Array.ConvertAll(list, option => option.Disabled));
            }
        }
        [UxmlAttribute] public string Size { get => Variants.Get(this, "select", "sm", "md", "lg"); set { Variants.Set(this, "select", value, "sm", "md", "lg"); } }
        public Select()
        {
            name = "root";
            AddToClassList("select");
            Trigger.name = "trigger";
            Trigger.AddToClassList("select__trigger");
            hierarchy.Add(Trigger);
            Text.name = "text";
            Text.AddToClassList("select__text");
            Trigger.Add(Text);
            Content.name = "content";
            Content.AddToClassList("select__content");
            hierarchy.Add(Content);
            OptionsControl.name = "options";
            OptionsControl.AddToClassList("select__options");
            Content.Add(OptionsControl);
            Gap.Attach(this);
            Gap.Attach(Trigger);
            Gap.Attach(Content);
            Gap.Attach(OptionsControl);
            Control = SelectControl.Attach(this, trigger: Trigger, text: Text, content: Content, optionsHost: OptionsControl, prefix: "select", stateClass: "select--open");
            Size = "md";
        }
    }
}
