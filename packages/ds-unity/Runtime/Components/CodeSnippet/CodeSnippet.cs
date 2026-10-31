// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class CodeSnippet : TextElement
    {
        [UxmlAttribute] public string As { get => Variants.Get(this, "code-snippet", "code", "kbd", "samp"); set { Variants.Set(this, "code-snippet", value, "code", "kbd", "samp"); } }
        [UxmlAttribute] public string Text { get => this.text; set => this.text = value ?? ""; }
        public CodeSnippet()
        {
            name = "root";
            AddToClassList("code-snippet");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
            As = "code";
        }
    }
}
