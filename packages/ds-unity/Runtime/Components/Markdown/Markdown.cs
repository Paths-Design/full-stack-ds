// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Markdown : TextElement
    {
        [UxmlAttribute] public string Content { get => text; set => text = value ?? ""; }
        public Markdown()
        {
            name = "root";
            AddToClassList("markdown");
            Gap.Attach(this);
        }
    }
}
