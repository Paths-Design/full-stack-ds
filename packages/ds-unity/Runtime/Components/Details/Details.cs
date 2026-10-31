// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Details : VisualElement, INotifyValueChanged<bool>
    {
        public const string ChannelName = "open";
        public const string ChangeHandler = "onOpenChange";
        public UnityEngine.UIElements.Button SummaryControl { get; } = new UnityEngine.UIElements.Button();
        public VisualElement SummaryContent { get; } = new VisualElement();
        public Icon IconControl { get; } = new Icon();
        public Label SummaryText { get; } = new Label();
        public VisualElement Content { get; } = new VisualElement();
        public override VisualElement contentContainer => Content;
        public DisclosureControl Disclosure { get; }
        public UnityEngine.UIElements.Button Trigger => SummaryControl;
        [UxmlAttribute] public bool Open { get => Disclosure.Value; set => Disclosure.Value = value; }
        public bool value { get => Disclosure.Value; set => Disclosure.Value = value; }
        public bool Controlled { get => Disclosure.Controlled; set => Disclosure.Controlled = value; }
        public event Action<bool> ValueRequested { add => Disclosure.ValueRequested += value; remove => Disclosure.ValueRequested -= value; }
        public void SetValueWithoutNotify(bool next) => Disclosure.SetValueWithoutNotify(next);
        public void RequestValue(bool next) => Disclosure.RequestValue(next);
        [UxmlAttribute] public string Summary { get => SummaryText.text; set { SummaryText.text = value ?? ""; } }
        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }
        [UxmlAttribute] public string Variant { get => Variants.Get(this, "details", "default", "inline", "compact"); set { Variants.Set(this, "details", value, "default", "inline", "compact"); } }
        [UxmlAttribute] public string Icon { get => Variants.Get(this, "details", "left", "right", "none"); set { Variants.Set(this, "details", value, "left", "right", "none"); } }
        public Details()
        {
            name = "root";
            AddToClassList("details");
            SummaryControl.name = "summary";
            SummaryControl.AddToClassList("details__summary");
            hierarchy.Add(SummaryControl);
            SummaryContent.name = "summaryContent";
            SummaryContent.AddToClassList("details__summaryContent");
            SummaryControl.Add(SummaryContent);
            IconControl.name = "icon";
            IconControl.AddToClassList("details__icon");
            IconControl.Name = "chevron-down";
            IconControl.Size = "sm";
            SummaryContent.Add(IconControl);
            SummaryText.name = "summaryText";
            SummaryText.AddToClassList("details__summaryText");
            SummaryContent.Add(SummaryText);
            Content.name = "content";
            Content.AddToClassList("details__content");
            hierarchy.Add(Content);
            Gap.Attach(this);
            Gap.Attach(SummaryControl);
            Gap.Attach(SummaryContent);
            Disclosure = DisclosureControl.Attach(this, summary: SummaryControl, content: Content, stateClass: "is-open");
            Variant = "default";
            Icon = "left";
        }
    }
}
