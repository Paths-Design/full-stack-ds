// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Spinner : VisualElement
    {
        public VisualElement Visual { get; } = new VisualElement();
        public MotionLoopControl Control { get; }
        [UxmlAttribute] public bool ReducedMotion { get => Control.ReducedMotion; set => Control.ReducedMotion = value; }
        public Spinner()
        {
            name = "root";
            AddToClassList("spinner");
            Visual.name = "visual";
            Visual.AddToClassList("spinner__visual");
            hierarchy.Add(Visual);
            Gap.Attach(this);
            Control = MotionLoopControl.Attach(this, target: Visual, durationMs: 800, multiplier: 1, easing: new float[] { 0.000f, 0.000f, 1.000f, 1.000f }, reducedValue: 0);
        }
    }
}
