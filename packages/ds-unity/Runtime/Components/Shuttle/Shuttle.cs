// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Shuttle : VisualElement
    {
        public TransferControl Control { get; }
        public string[] Options { get => Control.Options; set => Control.Options = value; }
        public string[] Value { get => Control.Value; set => Control.Value = value; }
        public string[] DefaultValue { get => Control.DefaultValue; set => Control.DefaultValue = value; }
        public Action<string[]> OnValueChange { get => Control.ValueChanged; set => Control.ValueChanged = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<string[]> ValueRequested { get => Control.ValueRequested; set => Control.ValueRequested = value; }
        public Shuttle()
        {
            name = "root";
            AddToClassList("shuttle");
            Gap.Attach(this);
            Control = TransferControl.Attach(this, prefix: "shuttle", listPart: "list", controlsPart: "controls", itemPart: "item", addPart: "add", removePart: "remove");
        }
    }
}
