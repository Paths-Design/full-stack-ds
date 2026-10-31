// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Walkthrough : VisualElement
    {
        public const string ChannelName = "step";
        public const string ChangeHandler = "onStepChange";
        public VisualElement Content { get; } = new VisualElement();
        public VisualElement Title { get; } = new VisualElement();
        public VisualElement TitleSlot { get; } = new VisualElement();
        public VisualElement Description { get; } = new VisualElement();
        public VisualElement DescriptionSlot { get; } = new VisualElement();
        public VisualElement Controls { get; } = new VisualElement();
        public UnityEngine.UIElements.Button Skip { get; } = new UnityEngine.UIElements.Button();
        public UnityEngine.UIElements.Button Prev { get; } = new UnityEngine.UIElements.Button();
        public VisualElement Dots { get; } = new VisualElement();
        public Label Counter { get; } = new Label();
        public UnityEngine.UIElements.Button Next { get; } = new UnityEngine.UIElements.Button();
        [UxmlAttribute] public int Index { get; set; }
        public Action OnSkip { get; set; }
        public Action OnPrevious { get; set; }
        public Action OnNext { get; set; }
        [UxmlAttribute] public bool PreviousDisabled { get => !Prev.enabledSelf; set => Prev.SetEnabled(!value); }
        [UxmlAttribute] public string ProgressLabel { get => Counter.text; set { Counter.text = value ?? ""; } }
        [UxmlAttribute] public string NextLabel { get => Next.text; set { Next.text = value ?? ""; } }
        public Walkthrough()
        {
            name = "root";
            AddToClassList("walkthrough");
            Content.name = "content";
            Content.AddToClassList("walkthrough__content");
            hierarchy.Add(Content);
            Title.name = "title";
            Title.AddToClassList("walkthrough__title");
            Content.Add(Title);
            TitleSlot.name = "title";
            TitleSlot.AddToClassList("walkthrough__title");
            Title.Add(TitleSlot);
            Description.name = "description";
            Description.AddToClassList("walkthrough__description");
            Content.Add(Description);
            DescriptionSlot.name = "description";
            DescriptionSlot.AddToClassList("walkthrough__description");
            Description.Add(DescriptionSlot);
            Controls.name = "controls";
            Controls.AddToClassList("walkthrough__controls");
            hierarchy.Add(Controls);
            Skip.name = "skip";
            Skip.AddToClassList("walkthrough__skip");
            Controls.Add(Skip);
            Prev.name = "prev";
            Prev.AddToClassList("walkthrough__prev");
            Controls.Add(Prev);
            Dots.name = "dots";
            Dots.AddToClassList("walkthrough__dots");
            Controls.Add(Dots);
            Counter.name = "counter";
            Counter.AddToClassList("walkthrough__counter");
            Controls.Add(Counter);
            Next.name = "next";
            Next.AddToClassList("walkthrough__next");
            Controls.Add(Next);
            Gap.Attach(this);
            Gap.Attach(Content);
            Gap.Attach(Controls);
            Gap.Attach(Dots);
            Skip.clicked += () => OnSkip?.Invoke();
            Prev.clicked += () => OnPrevious?.Invoke();
            Next.clicked += () => OnNext?.Invoke();
        }
    }
}
