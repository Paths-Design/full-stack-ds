// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class ProfileFlag : VisualElement
    {
        public ProfileFlag()
        {
            name = "root";
            AddToClassList("profile-flag");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
        }
    }
}
