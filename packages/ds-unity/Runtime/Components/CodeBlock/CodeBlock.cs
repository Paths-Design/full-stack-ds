// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class CodeBlock : VisualElement
    {
        public VisualElement Code { get; } = new VisualElement();
        private readonly VisualElement children = new VisualElement();
        public override VisualElement contentContainer => children;
        public CodeBlock()
        {
            name = "root";
            AddToClassList("code-block");
            Code.name = "code";
            Code.AddToClassList("code-block__code");
            hierarchy.Add(Code);
            children.name = "children";
            children.AddToClassList("code-block__children");
            Code.Add(children);
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }
}
