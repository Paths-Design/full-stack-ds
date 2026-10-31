// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class NavTree : VisualElement
    {
        public VisualElement Heading { get; } = new VisualElement();
        public Label HeadingLink { get; } = new Label();
        public Label HeadingLabel { get; } = new Label();
        public VisualElement List { get; } = new VisualElement();
        public override VisualElement contentContainer => List;
        public NavTreeControl Control { get; }
        public LinkControl Link => Control.Link;
        [UxmlAttribute] public string Href { get => Control.Href; set => Control.Href = value; }
        [UxmlAttribute] public string Label { get => Control.Label; set => Control.Label = value; }
        public NavTree()
        {
            name = "root";
            AddToClassList("nav-tree");
            Heading.name = "heading";
            Heading.AddToClassList("nav-tree__heading");
            hierarchy.Add(Heading);
            HeadingLink.name = "headingLink";
            HeadingLink.AddToClassList("nav-tree__headingLink");
            Heading.Add(HeadingLink);
            HeadingLabel.name = "headingLabel";
            HeadingLabel.AddToClassList("nav-tree__headingLabel");
            Heading.Add(HeadingLabel);
            List.name = "list";
            List.AddToClassList("nav-tree__list");
            hierarchy.Add(List);
            Gap.Attach(this);
            Gap.Attach(Heading);
            Gap.Attach(List);
            Control = NavTreeControl.Attach(link: HeadingLink, label: HeadingLabel);
        }
    }

    [UxmlElement]
    public partial class NavTreeItem : VisualElement
    {
        public NavTreeItem()
        {
            name = "item";
            AddToClassList("nav-tree__item");
        }
    }
}
