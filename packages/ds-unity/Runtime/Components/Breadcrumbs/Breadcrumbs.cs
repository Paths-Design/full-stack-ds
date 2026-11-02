// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
// Omitted projectedCollection: {"part":"list","itemPart":"item","separatorPart":"separator","separator":{"kind":"prop","prop":"separator"},"cssVariable":"--fsds-breadcrumbs-child-separator"}
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Breadcrumbs : VisualElement
    {
        public Breadcrumbs()
        {
            name = "root";
            AddToClassList("breadcrumbs");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }

    [UxmlElement]
    public partial class BreadcrumbsList : VisualElement
    {
        public BreadcrumbsList()
        {
            name = "list";
            AddToClassList("breadcrumbs__list");
            Gap.Attach(this);
        }
    }

    [UxmlElement]
    public partial class BreadcrumbsItem : VisualElement
    {
        public BreadcrumbsItem()
        {
            name = "item";
            AddToClassList("breadcrumbs__item");
        }
    }
}
