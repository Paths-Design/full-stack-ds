// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Pagination : VisualElement
    {
        public PageStripControl Control { get; }
        [UxmlAttribute] public int Index { get => Control.Index; set => Control.Index = value; }
        [UxmlAttribute] public int DefaultIndex { get => Control.DefaultIndex; set => Control.DefaultIndex = value; }
        public string[] Pages { get => Control.Pages; set => Control.Pages = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<int> PageRequested { get => Control.PageRequested; set => Control.PageRequested = value; }
        public Action<int> OnIndexChange { get => Control.IndexChanged; set => Control.IndexChanged = value; }
        [UxmlAttribute] public bool Disabled { get => Control.Disabled; set => Control.Disabled = value; }
        [UxmlAttribute] public string Presentation { get => Variants.Get(this, "pagination", "indicators", "pages"); set { Variants.Set(this, "pagination", value, "indicators", "pages"); } }
        [UxmlAttribute] public string Progress { get => Variants.Get(this, "pagination", "none", "elapsed"); set { Variants.Set(this, "pagination", value, "none", "elapsed"); } }
        public Pagination()
        {
            name = "root";
            AddToClassList("pagination");
            Gap.Attach(this);
            Control = PageStripControl.Attach(this, prefix: "pagination", itemPart: "item", markerPart: "marker", fillPart: "fill", labelPart: "label");
            Presentation = "indicators";
            Progress = "none";
        }
    }
}
