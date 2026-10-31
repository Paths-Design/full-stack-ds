// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Command : VisualElement
    {
        public CommandControl Control { get; }
        [UxmlAttribute] public bool Open { get => Control.Open; set => Control.Open = value; }
        [UxmlAttribute] public string Search { get => Control.Search; set => Control.Search = value; }
        public VisualElement Results { get => Control.ResultsSlot; }
        [UxmlAttribute] public bool DefaultOpen { get => Control.DefaultOpen; set => Control.DefaultOpen = value; }
        [UxmlAttribute] public string DefaultSearch { get => Control.DefaultSearch; set => Control.DefaultSearch = value; }
        [UxmlAttribute] public string Placeholder { get => Control.Placeholder; set => Control.Placeholder = value; }
        public Action<bool> OnOpenChange { get => Control.OpenChanged; set => Control.OpenChanged = value; }
        public Action<string> OnSearchChange { get => Control.SearchChanged; set => Control.SearchChanged = value; }
        public bool Controlled { get => Control.Controlled; set => Control.Controlled = value; }
        public Action<bool> OpenRequested { get => Control.OpenRequested; set => Control.OpenRequested = value; }
        public bool SearchControlled { get => Control.SearchControlled; set => Control.SearchControlled = value; }
        public Action<string> SearchRequested { get => Control.SearchRequested; set => Control.SearchRequested = value; }
        public Command()
        {
            name = "root";
            AddToClassList("command");
            Gap.Attach(this);
            Control = CommandControl.Attach(this, prefix: "command", overlayPart: "overlay", dialogPart: "dialog", listPart: "list", inputPart: "input");
        }
    }
}
