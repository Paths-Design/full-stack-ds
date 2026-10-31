// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Field : VisualElement
    {
        public VisualElement Header { get; } = new VisualElement();
        public VisualElement Label { get; } = new VisualElement();
        public VisualElement LabelSlot { get; } = new VisualElement();
        public VisualElement Control { get; } = new VisualElement();
        public VisualElement ControlSlot { get; } = new VisualElement();
        public VisualElement Meta { get; } = new VisualElement();
        public VisualElement Help { get; } = new VisualElement();
        public VisualElement HelpSlot { get; } = new VisualElement();
        public VisualElement Error { get; } = new VisualElement();
        public VisualElement ErrorSlot { get; } = new VisualElement();
        public VisualElement ValidatingIndicator { get; } = new VisualElement();
        public VisualElement ValidatingIndicatorSlot { get; } = new VisualElement();
        [UxmlAttribute] public string Status { get => Variants.Get(this, "field", "idle", "validating", "valid", "invalid"); set { Variants.Set(this, "field", value, "idle", "validating", "valid", "invalid"); } }
        public Field()
        {
            name = "root";
            AddToClassList("field");
            Header.name = "header";
            Header.AddToClassList("field__header");
            hierarchy.Add(Header);
            Label.name = "label";
            Label.AddToClassList("field__label");
            Header.Add(Label);
            LabelSlot.name = "label";
            LabelSlot.AddToClassList("field__label");
            Label.Add(LabelSlot);
            Control.name = "control";
            Control.AddToClassList("field__control");
            hierarchy.Add(Control);
            ControlSlot.name = "control";
            ControlSlot.AddToClassList("field__control");
            Control.Add(ControlSlot);
            Meta.name = "meta";
            Meta.AddToClassList("field__meta");
            hierarchy.Add(Meta);
            Help.name = "help";
            Help.AddToClassList("field__help");
            Meta.Add(Help);
            HelpSlot.name = "help";
            HelpSlot.AddToClassList("field__help");
            Help.Add(HelpSlot);
            Error.name = "error";
            Error.AddToClassList("field__error");
            Meta.Add(Error);
            ErrorSlot.name = "error";
            ErrorSlot.AddToClassList("field__error");
            Error.Add(ErrorSlot);
            ValidatingIndicator.name = "validatingIndicator";
            ValidatingIndicator.AddToClassList("field__validatingIndicator");
            Meta.Add(ValidatingIndicator);
            ValidatingIndicatorSlot.name = "validatingIndicator";
            ValidatingIndicatorSlot.AddToClassList("field__validatingIndicator");
            ValidatingIndicator.Add(ValidatingIndicatorSlot);
            Gap.Attach(this);
            Gap.Attach(Header);
            Gap.Attach(Meta);
        }
    }
}
