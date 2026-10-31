// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class TextField : VisualElement
    {
        public const string ChannelName = "value";
        public const string ChangeHandler = "onChange";
        public VisualElement Label { get; } = new VisualElement();
        public VisualElement LabelSlot { get; } = new VisualElement();
        public UnityEngine.UIElements.TextField Field { get; } = new UnityEngine.UIElements.TextField();
        public VisualElement Description { get; } = new VisualElement();
        public VisualElement DescriptionSlot { get; } = new VisualElement();
        public VisualElement Error { get; } = new VisualElement();
        public VisualElement ErrorSlot { get; } = new VisualElement();
        public TextControl Control { get; }
        [UxmlAttribute] public string Value { get => Control.Value; set => Control.Value = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public event Action<string> ValueRequested { add => Control.ValueRequested += value; remove => Control.ValueRequested -= value; }
        public void SetValueWithoutNotify(string next) => Control.SetValueWithoutNotify(next);
        public void RequestValue(string next) => Control.RequestValue(next);
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        public TextField()
        {
            name = "root";
            AddToClassList("text-field");
            Label.name = "label";
            Label.AddToClassList("text-field__label");
            hierarchy.Add(Label);
            LabelSlot.name = "label";
            LabelSlot.AddToClassList("text-field__label");
            Label.Add(LabelSlot);
            Field.name = "field";
            Field.AddToClassList("text-field__field");
            hierarchy.Add(Field);
            Description.name = "description";
            Description.AddToClassList("text-field__description");
            hierarchy.Add(Description);
            DescriptionSlot.name = "description";
            DescriptionSlot.AddToClassList("text-field__description");
            Description.Add(DescriptionSlot);
            Error.name = "error";
            Error.AddToClassList("text-field__error");
            hierarchy.Add(Error);
            ErrorSlot.name = "error";
            ErrorSlot.AddToClassList("text-field__error");
            Error.Add(ErrorSlot);
            Gap.Attach(this);
            Control = TextControl.Attach(Field);
        }
    }
}
