using System;
using System.Collections.Generic;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Dual-list transfer behavior: owns the string[] selection channel,
    /// derives the available list (options outside the value) and the selected
    /// list, renders both lists as runtime-built rows from the declared parts,
    /// marks items per side, and transfers marked items with the declared
    /// add/remove actions. The authored shell markup is recreated from the
    /// declared parts; keyboard navigation, a11y labels/roles and marked-state
    /// styling are not realised.</summary>
    public sealed class TransferControl
    {
        private readonly VisualElement availableHost;
        private readonly VisualElement selectedHost;
        private readonly UnityEngine.UIElements.Button addButton;
        private readonly UnityEngine.UIElements.Button removeButton;
        private readonly string itemClass;
        private readonly HashSet<string> markedAvailable = new HashSet<string>();
        private readonly HashSet<string> markedSelected = new HashSet<string>();
        private readonly List<(UnityEngine.UIElements.Button button, string id)> availableRows = new List<(UnityEngine.UIElements.Button, string)>();
        private readonly List<(UnityEngine.UIElements.Button button, string id)> selectedRows = new List<(UnityEngine.UIElements.Button, string)>();
        private string[] options = Array.Empty<string>();
        private string[] values = Array.Empty<string>();
        private string[] defaultValues = Array.Empty<string>();
        private bool valueExplicit;
        public bool Controlled { get; set; }
        public Action<string[]> ValueChanged;
        public Action<string[]> ValueRequested;

        private TransferControl(VisualElement host, string prefix, string listPart, string controlsPart, string itemPart, string addPart, string removePart)
        {
            if (host == null) throw new ArgumentNullException(nameof(host));
            prefix ??= "";
            itemClass = $"{prefix}__{itemPart}";
            var availableList = new VisualElement();
            availableList.AddToClassList($"{prefix}__{listPart}");
            var controls = new VisualElement();
            controls.AddToClassList($"{prefix}__{controlsPart}");
            var selectedList = new VisualElement();
            selectedList.AddToClassList($"{prefix}__{listPart}");
            addButton = new UnityEngine.UIElements.Button();
            addButton.AddToClassList($"{prefix}__{addPart}");
            addButton.clicked += AddMarked;
            removeButton = new UnityEngine.UIElements.Button();
            removeButton.AddToClassList($"{prefix}__{removePart}");
            removeButton.clicked += RemoveMarked;
            controls.Add(addButton);
            controls.Add(removeButton);
            host.Add(availableList);
            host.Add(controls);
            host.Add(selectedList);
            availableHost = availableList;
            selectedHost = selectedList;
            Render();
        }

        public static TransferControl Attach(VisualElement host, string prefix, string listPart, string controlsPart, string itemPart, string addPart, string removePart)
            => new TransferControl(host, prefix, listPart, controlsPart, itemPart, addPart, removePart);

        public string[] Options
        {
            get => options;
            set
            {
                options = value ?? Array.Empty<string>();
                Render();
            }
        }

        public string[] Value
        {
            get => values;
            set
            {
                valueExplicit = true;
                values = value ?? Array.Empty<string>();
                Render();
            }
        }

        public string[] DefaultValue
        {
            get => defaultValues;
            set
            {
                defaultValues = value ?? Array.Empty<string>();
                if (!valueExplicit)
                {
                    values = defaultValues;
                    Render();
                }
            }
        }

        private void Render()
        {
            var selectedIds = new HashSet<string>(values);
            var available = new List<string>();
            foreach (var option in options)
                if (!selectedIds.Contains(option)) available.Add(option);
            RenderList(availableHost, availableRows, available, markedAvailable);
            RenderList(selectedHost, selectedRows, values, markedSelected);
            addButton.SetEnabled(markedAvailable.Count > 0);
            removeButton.SetEnabled(markedSelected.Count > 0);
        }

        private void RenderList(VisualElement host, List<(UnityEngine.UIElements.Button button, string id)> rows, IReadOnlyList<string> ids, HashSet<string> marked)
        {
            host.Clear();
            rows.Clear();
            foreach (var id in ids)
            {
                var rowId = id;
                var button = new UnityEngine.UIElements.Button { text = id };
                button.AddToClassList(itemClass);
                button.clicked += () => ToggleMark(marked, rowId);
                host.Add(button);
                rows.Add((button, id));
            }
        }

        private void ToggleMark(HashSet<string> marked, string id)
        {
            if (!marked.Remove(id)) marked.Add(id);
            addButton.SetEnabled(markedAvailable.Count > 0);
            removeButton.SetEnabled(markedSelected.Count > 0);
        }

        private string[] AvailableMarkedInOptionsOrder()
        {
            var result = new List<string>();
            foreach (var option in options)
                if (markedAvailable.Contains(option)) result.Add(option);
            return result.ToArray();
        }

        private void AddMarked()
        {
            var added = AvailableMarkedInOptionsOrder();
            if (added.Length == 0) return;
            var next = new List<string>(values);
            foreach (var id in added)
                if (!next.Contains(id)) next.Add(id);
            markedAvailable.Clear();
            Commit(next.ToArray());
        }

        private void RemoveMarked()
        {
            if (markedSelected.Count == 0) return;
            var next = new List<string>();
            foreach (var id in values)
                if (!markedSelected.Contains(id)) next.Add(id);
            markedSelected.Clear();
            Commit(next.ToArray());
        }

        private void Commit(string[] next)
        {
            if (Controlled)
            {
                Render();
                ValueRequested?.Invoke(next);
                return;
            }
            values = next;
            valueExplicit = true;
            Render();
            ValueChanged?.Invoke(values);
        }
    }
}
