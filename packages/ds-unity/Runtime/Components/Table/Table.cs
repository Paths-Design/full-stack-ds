// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Table : VisualElement
    {
        public VisualElement Container { get; } = new VisualElement();
        public override VisualElement contentContainer => Container;
        public Table()
        {
            name = "root";
            AddToClassList("table");
            Container.name = "container";
            Container.AddToClassList("table__container");
            hierarchy.Add(Container);
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }

    [UxmlElement]
    public partial class TableCaption : VisualElement
    {
        public TableCaption()
        {
            name = "caption";
            AddToClassList("table__caption");
        }
    }

    [UxmlElement]
    public partial class TableHead : VisualElement
    {
        public TableHead()
        {
            name = "head";
            AddToClassList("table__head");
        }
    }

    [UxmlElement]
    public partial class TableBody : VisualElement
    {
        public TableBody()
        {
            name = "body";
            AddToClassList("table__body");
        }
    }

    [UxmlElement]
    public partial class TableFooter : VisualElement
    {
        public TableFooter()
        {
            name = "footer";
            AddToClassList("table__footer");
        }
    }

    [UxmlElement]
    public partial class TableRow : VisualElement
    {
        public TableRow()
        {
            name = "row";
            AddToClassList("table__row");
        }
    }

    [UxmlElement]
    public partial class TableHeaderCell : VisualElement
    {
        public TableHeaderCell()
        {
            name = "headerCell";
            AddToClassList("table__headerCell");
        }
    }

    [UxmlElement]
    public partial class TableCell : VisualElement
    {
        public TableCell()
        {
            name = "cell";
            AddToClassList("table__cell");
        }
    }
}
