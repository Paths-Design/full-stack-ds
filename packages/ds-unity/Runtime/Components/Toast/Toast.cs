// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Toast : VisualElement, INotifyValueChanged<bool>
    {
        public const string ChannelName = "open";
        public const string ChangeHandler = "onOpenChange";
        public VisualElement Item { get; } = new VisualElement();
        public VisualElement Row { get; } = new VisualElement();
        public Label TitleControl { get; } = new Label();
        public VisualElement Description { get; } = new VisualElement();
        public VisualElement Action { get; } = new VisualElement();
        public VisualElement ActionSlot { get; } = new VisualElement();
        public UnityEngine.UIElements.Button Close { get; } = new UnityEngine.UIElements.Button();
        public VisualElement Progress { get; } = new VisualElement();
        public override VisualElement contentContainer => Description;
        public ToastSurface Surface { get; }
        [UxmlAttribute] public string Title { get => Surface.Title; set => Surface.Title = value; }
        [UxmlAttribute] public float Duration { get => Surface.Duration; set => Surface.Duration = value; }
        [UxmlAttribute] public bool Open { get => Surface.Value; set => Surface.Value = value; }
        public bool value { get => Surface.Value; set => Surface.Value = value; }
        public bool Controlled { get => Surface.Controlled; set => Surface.Controlled = value; }
        public event Action<bool> ValueRequested { add => Surface.ValueRequested += value; remove => Surface.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Surface.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Surface.RequestValue(next);
        [UxmlAttribute] public string Variant { get => Variants.Get(this, "toast", "info", "success", "warning", "error"); set { Variants.Set(this, "toast", value, "info", "success", "warning", "error"); } }
        public Toast()
        {
            name = "viewport";
            AddToClassList("toast");
            Item.name = "item";
            Item.AddToClassList("toast__item");
            hierarchy.Add(Item);
            Row.name = "row";
            Row.AddToClassList("toast__row");
            Item.Add(Row);
            TitleControl.name = "title";
            TitleControl.AddToClassList("toast__title");
            Row.Add(TitleControl);
            Description.name = "description";
            Description.AddToClassList("toast__description");
            Row.Add(Description);
            Action.name = "action";
            Action.AddToClassList("toast__action");
            Row.Add(Action);
            ActionSlot.name = "action";
            ActionSlot.AddToClassList("toast__action");
            Action.Add(ActionSlot);
            Close.name = "close";
            Close.AddToClassList("toast__close");
            Row.Add(Close);
            Progress.name = "progress";
            Progress.AddToClassList("toast__progress");
            Item.Add(Progress);
            Gap.Attach(this);
            Gap.Attach(Row);
            Surface = ToastSurface.Attach(this, item: Item, close: Close, title: TitleControl, stateClass: "is-open");
            Variant = "info";
        }
    }
}
