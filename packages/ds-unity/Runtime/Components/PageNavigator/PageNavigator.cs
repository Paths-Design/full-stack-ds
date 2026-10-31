// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class PageNavigator : VisualElement
    {
        public PagedSetControl Control { get; }
        public int Index { get => Control.Index; set => Control.Index = value; }
        public int DefaultIndex { get => Control.DefaultIndex; set => Control.DefaultIndex = value; }
        public Action<int> OnIndexChange { get => Control.IndexChanged; set => Control.IndexChanged = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<int> IndexRequested { get => Control.IndexRequested; set => Control.IndexRequested = value; }
        public string[] Pages { get => Control.Items; set => Control.Items = value; }
        public int PageCount { get => Control.Count; set => Control.Count = value; }
        public bool Disabled { get => Control.Disabled; set => Control.Disabled = value; }
        public PageNavigator()
        {
            name = "root";
            AddToClassList("page-navigator");
            Gap.Attach(this);
            Control = PagedSetControl.Attach(this, prefix: "page-navigator", previousPart: "previous", nextPart: "next", commitPart: "commit", fieldPart: "field", inputPart: "input", contextPart: "context");
        }
    }
}
