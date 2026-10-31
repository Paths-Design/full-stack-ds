// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Dialog : VisualElement, INotifyValueChanged<bool>
    {
        public const string ChannelName = "openness";
        public const string ChangeHandler = "onOpenChange";
        public VisualElement Backdrop { get; } = new VisualElement();
        public VisualElement Modal { get; } = new VisualElement();
        public VisualElement Header { get; } = new VisualElement();
        public VisualElement Title { get; } = new VisualElement();
        public VisualElement TitleSlot { get; } = new VisualElement();
        public UnityEngine.UIElements.Button CloseButton { get; } = new UnityEngine.UIElements.Button();
        public VisualElement Body { get; } = new VisualElement();
        public VisualElement Footer { get; } = new VisualElement();
        public VisualElement FooterSlot { get; } = new VisualElement();
        public override VisualElement contentContainer => Body;
        public ModalSurface Surface { get; }
        public VisualElement Content => Modal;
        [UxmlAttribute] public bool Dismissible { get => Surface.Dismissible; set => Surface.Dismissible = value; }
        [UxmlAttribute] public bool CloseOnBackdropClick { get => Surface.CloseOnOverlayClick; set => Surface.CloseOnOverlayClick = value; }
        [UxmlAttribute] public bool Open { get => Surface.Value; set => Surface.Value = value; }
        public bool value { get => Surface.Value; set => Surface.Value = value; }
        public bool Controlled { get => Surface.Controlled; set => Surface.Controlled = value; }
        public event Action<bool> ValueRequested { add => Surface.ValueRequested += value; remove => Surface.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Surface.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Surface.RequestValue(next);
        [UxmlAttribute] public string Size { get => Variants.Get(this, "dialog", "sm", "md", "lg", "xl", "full"); set { Variants.Set(this, "dialog", value, "sm", "md", "lg", "xl", "full"); } }
        [UxmlAttribute] public bool CloseOnEscape { get => Surface.CloseOnEscape; set => Surface.CloseOnEscape = value; }
        public Dialog()
        {
            name = "root";
            AddToClassList("dialog");
            Backdrop.name = "backdrop";
            Backdrop.AddToClassList("dialog__backdrop");
            hierarchy.Add(Backdrop);
            Modal.name = "modal";
            Modal.AddToClassList("dialog__modal");
            hierarchy.Add(Modal);
            Header.name = "header";
            Header.AddToClassList("dialog__header");
            Modal.Add(Header);
            Title.name = "title";
            Title.AddToClassList("dialog__title");
            Header.Add(Title);
            TitleSlot.name = "title";
            TitleSlot.AddToClassList("dialog__title");
            Title.Add(TitleSlot);
            CloseButton.name = "closeButton";
            CloseButton.AddToClassList("dialog__closeButton");
            Header.Add(CloseButton);
            var node1 = new Icon();
            node1.Name = "x";
            node1.Size = "sm";
            CloseButton.Add(node1);
            Body.name = "body";
            Body.AddToClassList("dialog__body");
            Modal.Add(Body);
            Footer.name = "footer";
            Footer.AddToClassList("dialog__footer");
            Modal.Add(Footer);
            FooterSlot.name = "footer";
            FooterSlot.AddToClassList("dialog__footer");
            Footer.Add(FooterSlot);
            Gap.Attach(this);
            Gap.Attach(Footer);
            Gap.Attach(FooterSlot);
            Surface = ModalSurface.Attach(this, content: Modal, overlay: Backdrop, trigger: CloseButton, stateClass: "is-open");
            Dismissible = true;
            CloseOnBackdropClick = true;
            Size = "md";
            CloseOnEscape = true;
        }
    }
}
