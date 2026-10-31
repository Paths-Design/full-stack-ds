// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Carousel : VisualElement
    {
        public VisualElement Viewport { get; } = new VisualElement();
        public override VisualElement contentContainer => Viewport;
        public SequenceControl Control { get; }
        public int Index { get => Control.Index; set => Control.Index = value; }
        public string[] Slides { get => Control.Items; set => Control.Items = value; }
        [UxmlAttribute] public string RotationStart { get => Control.StartLabel; set => Control.StartLabel = value; }
        [UxmlAttribute] public string RotationStop { get => Control.StopLabel; set => Control.StopLabel = value; }
        public int DefaultIndex { get => Control.DefaultIndex; set => Control.DefaultIndex = value; }
        public Action<int> OnIndexChange { get => Control.IndexChanged; set => Control.IndexChanged = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<int> IndexRequested { get => Control.IndexRequested; set => Control.IndexRequested = value; }
        [UxmlAttribute] public bool AutoPlay { get => Control.AutoPlay; set => Control.AutoPlay = value; }
        [UxmlAttribute] public int Duration { get => Control.Duration; set => Control.Duration = value; }
        [UxmlAttribute] public string PreviousSlide { get => Control.PreviousLabel; set => Control.PreviousLabel = value; }
        [UxmlAttribute] public string NextSlide { get => Control.NextLabel; set => Control.NextLabel = value; }
        public Carousel()
        {
            name = "root";
            AddToClassList("carousel");
            Viewport.name = "viewport";
            Viewport.AddToClassList("carousel__viewport");
            hierarchy.Add(Viewport);
            Gap.Attach(this);
            Control = SequenceControl.Attach(this, viewport: Viewport, prefix: "carousel");
            Duration = 6000;
        }
    }
}
