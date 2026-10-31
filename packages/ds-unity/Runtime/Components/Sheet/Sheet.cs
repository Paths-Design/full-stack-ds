// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Sheet : VisualElement, INotifyValueChanged<bool>
    {
        public const string ChannelName = "openness";
        public const string ChangeHandler = "onOpenChange";
        public VisualElement Overlay { get; } = new VisualElement();
        public VisualElement Content { get; } = new VisualElement();
        public VisualElement Header { get; } = new VisualElement();
        public VisualElement Title { get; } = new VisualElement();
        public VisualElement TitleSlot { get; } = new VisualElement();
        public VisualElement Description { get; } = new VisualElement();
        public VisualElement DescriptionSlot { get; } = new VisualElement();
        public UnityEngine.UIElements.Button Close { get; } = new UnityEngine.UIElements.Button();
        public VisualElement Body { get; } = new VisualElement();
        public VisualElement Footer { get; } = new VisualElement();
        public VisualElement FooterSlot { get; } = new VisualElement();
        public override VisualElement contentContainer => Body;
        public ModalSurface Surface { get; }
        [UxmlAttribute] public string Side { get => Variants.Get(this, "sheet", "top", "right", "bottom", "left"); set { Variants.Set(this, "sheet", value, "top", "right", "bottom", "left"); Surface.Placement = value; } }
        [UxmlAttribute] public bool Open { get => Surface.Value; set => Surface.Value = value; }
        public bool value { get => Surface.Value; set => Surface.Value = value; }
        public bool Controlled { get => Surface.Controlled; set => Surface.Controlled = value; }
        public event Action<bool> ValueRequested { add => Surface.ValueRequested += value; remove => Surface.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Surface.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Surface.RequestValue(next);
        public Sheet()
        {
            name = "root";
            AddToClassList("sheet");
            Overlay.name = "overlay";
            Overlay.AddToClassList("sheet__overlay");
            hierarchy.Add(Overlay);
            Content.name = "content";
            Content.AddToClassList("sheet__content");
            hierarchy.Add(Content);
            Header.name = "header";
            Header.AddToClassList("sheet__header");
            Content.Add(Header);
            Title.name = "title";
            Title.AddToClassList("sheet__title");
            Header.Add(Title);
            TitleSlot.name = "title";
            TitleSlot.AddToClassList("sheet__title");
            Title.Add(TitleSlot);
            Description.name = "description";
            Description.AddToClassList("sheet__description");
            Header.Add(Description);
            DescriptionSlot.name = "description";
            DescriptionSlot.AddToClassList("sheet__description");
            Description.Add(DescriptionSlot);
            Close.name = "close";
            Close.AddToClassList("sheet__close");
            Header.Add(Close);
            Body.name = "body";
            Body.AddToClassList("sheet__body");
            Content.Add(Body);
            Footer.name = "footer";
            Footer.AddToClassList("sheet__footer");
            Content.Add(Footer);
            FooterSlot.name = "footer";
            FooterSlot.AddToClassList("sheet__footer");
            Footer.Add(FooterSlot);
            Gap.Attach(this);
            Gap.Attach(Header);
            Gap.Attach(Footer);
            Gap.Attach(FooterSlot);
            Surface = ModalSurface.Attach(this, content: Content, overlay: Overlay, trigger: Close, stateClass: "is-open");
            Side = "right";
        }
    }
}
