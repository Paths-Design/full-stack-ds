// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Progress : VisualElement
    {
        public VisualElement Track { get; } = new VisualElement();
        public VisualElement Fill { get; } = new VisualElement();
        public VisualElement ValueControl { get; } = new VisualElement();
        public override VisualElement contentContainer => ValueControl;
        public ProgressControl ValueFill { get; }
        [UxmlAttribute] public float Value { get => (float)ValueFill.Value; set => ValueFill.Value = value; }
        [UxmlAttribute] public bool ShowValue { get => ValueFill.ShowValue; set => ValueFill.ShowValue = value; }
        [UxmlAttribute] public string Intent { get => Variants.Get(this, "progress", "info", "success", "warning", "danger"); set { Variants.Set(this, "progress", value, "info", "success", "warning", "danger"); } }
        public Progress()
        {
            name = "root";
            AddToClassList("progress");
            Track.name = "track";
            Track.AddToClassList("progress__track");
            hierarchy.Add(Track);
            Fill.name = "fill";
            Fill.AddToClassList("progress__fill");
            Track.Add(Fill);
            ValueControl.name = "value";
            ValueControl.AddToClassList("progress__value");
            hierarchy.Add(ValueControl);
            Gap.Attach(this);
            ValueFill = ProgressControl.Attach(this, fill: Fill, valueElement: ValueControl, min: 0, max: 100);
        }
    }
}
