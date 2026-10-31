// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class NavList : VisualElement
    {
        public NavList()
        {
            name = "root";
            AddToClassList("nav-list");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }

    [UxmlElement]
    public partial class NavListList : VisualElement
    {
        public NavListList()
        {
            name = "list";
            AddToClassList("nav-list__list");
            Gap.Attach(this);
        }
    }

    [UxmlElement]
    public partial class NavListItem : VisualElement
    {
        public NavListItem()
        {
            name = "item";
            AddToClassList("nav-list__item");
        }
    }
}
