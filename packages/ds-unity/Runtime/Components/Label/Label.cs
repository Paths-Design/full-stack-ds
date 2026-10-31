// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Label : TextElement
    {
        public Label()
        {
            name = "root";
            AddToClassList("label");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }
}
