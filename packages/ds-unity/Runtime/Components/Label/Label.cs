// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Label : TextElement
    {
        [UxmlAttribute] public string HtmlFor { get; set; }
        public VisualElement AssociatedControl { get; set; }
        public Label()
        {
            name = "root";
            AddToClassList("label");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
            RegisterCallback<ClickEvent>(_ => { var target = AssociatedControl ?? (string.IsNullOrEmpty(HtmlFor) ? null : panel?.visualTree.Q<VisualElement>(HtmlFor)); if (target != null && target.enabledInHierarchy) target.Focus(); });
        }
    }
}
