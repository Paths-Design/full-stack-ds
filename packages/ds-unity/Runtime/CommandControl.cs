using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Command-palette behavior: owns the boolean open channel and the
    /// search string channel, builds the declared overlay/dialog/list shell from
    /// native controls and hosts consumer result items in the slot. Filtering,
    /// the empty state, dismissal, keyboard navigation and a11y wiring are not
    /// realised.</summary>
    public sealed class CommandControl
    {
        private readonly VisualElement root;
        private readonly VisualElement overlay;
        private readonly VisualElement dialog;
        private readonly UnityEngine.UIElements.TextField input;
        private readonly VisualElement results;
        private bool open;
        private bool defaultOpen;
        private string search = "";
        private string defaultSearch = "";
        private string placeholder = "";
        private bool openExplicit;
        private bool searchExplicit;
        public bool Controlled { get; set; }
        public bool SearchControlled { get; set; }
        public Action<bool> OpenChanged;
        public Action<bool> OpenRequested;
        public Action<string> SearchChanged;
        public Action<string> SearchRequested;
        public VisualElement ResultsSlot => results;

        private CommandControl(VisualElement root, string prefix, string overlayPart, string dialogPart, string listPart, string inputPart)
        {
            this.root = root ?? throw new ArgumentNullException(nameof(root));
            prefix ??= "";
            overlay = new VisualElement();
            overlay.AddToClassList($"{prefix}__{overlayPart}");
            dialog = new VisualElement();
            dialog.AddToClassList($"{prefix}__{dialogPart}");
            input = new UnityEngine.UIElements.TextField();
            input.AddToClassList($"{prefix}__{inputPart}");
            var list = new VisualElement();
            list.AddToClassList($"{prefix}__{listPart}");
            results = new VisualElement();
            results.AddToClassList($"{prefix}__results");
            list.Add(results);
            dialog.Add(input);
            dialog.Add(list);
            root.Add(overlay);
            root.Add(dialog);
            input.RegisterValueChangedCallback(evt => CommitSearch(evt.newValue ?? ""));
            Apply();
        }

        public static CommandControl Attach(VisualElement root, string prefix, string overlayPart, string dialogPart, string listPart, string inputPart)
            => new CommandControl(root, prefix, overlayPart, dialogPart, listPart, inputPart);

        public bool Open
        {
            get => open;
            set
            {
                openExplicit = true;
                open = value;
                Apply();
            }
        }

        public bool DefaultOpen
        {
            get => defaultOpen;
            set
            {
                defaultOpen = value;
                if (!openExplicit)
                {
                    open = defaultOpen;
                    Apply();
                }
            }
        }

        public string Search
        {
            get => search;
            set
            {
                searchExplicit = true;
                search = value ?? "";
                input.SetValueWithoutNotify(search);
                Apply();
            }
        }

        public string DefaultSearch
        {
            get => defaultSearch;
            set
            {
                defaultSearch = value ?? "";
                if (!searchExplicit)
                {
                    search = defaultSearch;
                    input.SetValueWithoutNotify(search);
                    Apply();
                }
            }
        }

        public string Placeholder
        {
            get => placeholder;
            set
            {
                placeholder = value ?? "";
                input.textEdition.placeholder = placeholder;
            }
        }

        private void CommitSearch(string next)
        {
            if (next == search) return;
            if (SearchControlled)
            {
                input.SetValueWithoutNotify(search);
                SearchRequested?.Invoke(next);
                return;
            }
            search = next;
            searchExplicit = true;
            SearchChanged?.Invoke(search);
        }

        private void Apply()
        {
            overlay.style.display = open ? DisplayStyle.Flex : DisplayStyle.None;
            dialog.style.display = open ? DisplayStyle.Flex : DisplayStyle.None;
            input.SetValueWithoutNotify(search);
            if (!string.IsNullOrEmpty(placeholder)) input.textEdition.placeholder = placeholder;
        }
    }
}
