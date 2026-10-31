using System;
using System.Collections.Generic;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Select behavior: owns the selection and open channels, builds the
    /// option buttons from the declared option leaves into the options host, paints
    /// the trigger label from the current selection (or the placeholder), toggles the
    /// listbox surface and its state class from the open channel, and closes after a
    /// single selection. Multi-select, search, empty-state, keyboard roving and the
    /// authored aria/data styling are not realised.</summary>
    public sealed class SelectControl
    {
        private readonly VisualElement host;
        private readonly UnityEngine.UIElements.Button trigger;
        private readonly Label text;
        private readonly VisualElement content;
        private readonly VisualElement optionsHost;
        private readonly string prefix;
        private readonly string stateClass;
        private readonly List<UnityEngine.UIElements.Button> optionButtons = new List<UnityEngine.UIElements.Button>();
        private string[] values = Array.Empty<string>();
        private string[] labels = Array.Empty<string>();
        private bool[] optionDisabled = Array.Empty<bool>();
        private string value = "";
        private string defaultValue = "";
        private string placeholder = "";
        private bool open;
        private bool defaultOpen;
        private bool disabled;
        private bool valueExplicit;
        private bool openExplicit;
        public bool Controlled { get; set; }
        public bool OpenControlled { get; set; }
        public Action<string> ValueChanged;
        public Action<string> ValueRequested;
        public Action<bool> OpenChanged;
        public Action<bool> OpenRequested;

        private SelectControl(VisualElement host, UnityEngine.UIElements.Button trigger, Label text, VisualElement content, VisualElement optionsHost, string prefix, string stateClass)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            this.trigger = trigger ?? throw new ArgumentNullException(nameof(trigger));
            this.text = text ?? throw new ArgumentNullException(nameof(text));
            this.content = content ?? throw new ArgumentNullException(nameof(content));
            this.optionsHost = optionsHost ?? throw new ArgumentNullException(nameof(optionsHost));
            this.prefix = prefix ?? "";
            this.stateClass = stateClass ?? "";
            trigger.clicked += ToggleOpen;
            ApplyOpen();
            ApplyLabel();
        }

        public static SelectControl Attach(VisualElement host, UnityEngine.UIElements.Button trigger, Label text, VisualElement content, VisualElement optionsHost, string prefix, string stateClass)
            => new SelectControl(host, trigger, text, content, optionsHost, prefix, stateClass);

        public string Value
        {
            get => value;
            set
            {
                valueExplicit = true;
                this.value = value ?? "";
                ApplyLabel();
            }
        }

        public string DefaultValue
        {
            get => defaultValue;
            set
            {
                defaultValue = value ?? "";
                if (!valueExplicit)
                {
                    value = defaultValue;
                    ApplyLabel();
                }
            }
        }

        public string Placeholder
        {
            get => placeholder;
            set
            {
                placeholder = value ?? "";
                ApplyLabel();
            }
        }

        public bool Open
        {
            get => open;
            set
            {
                openExplicit = true;
                this.open = value;
                ApplyOpen();
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
                    ApplyOpen();
                }
            }
        }

        public bool Disabled
        {
            get => disabled;
            set
            {
                disabled = value;
                ApplyDisabled();
            }
        }

        public void SetOptions(string[] nextValues, string[] nextLabels, bool[] nextOptionDisabled)
        {
            values = nextValues ?? Array.Empty<string>();
            labels = nextLabels ?? Array.Empty<string>();
            optionDisabled = nextOptionDisabled ?? Array.Empty<bool>();
            RebuildOptions();
            ApplyLabel();
        }

        public T[] GetOptions<T>(Func<string, string, bool, T> create)
        {
            var result = new T[values.Length];
            for (var i = 0; i < values.Length; i++)
                result[i] = create(values[i], i < labels.Length ? labels[i] : "", i < optionDisabled.Length && optionDisabled[i]);
            return result;
        }

        private void RebuildOptions()
        {
            optionsHost.Clear();
            optionButtons.Clear();
            for (var i = 0; i < values.Length; i++)
            {
                var index = i;
                var button = new UnityEngine.UIElements.Button { text = i < labels.Length ? labels[i] : "" };
                button.AddToClassList($"{prefix}__option");
                button.clicked += () => Select(values[index]);
                optionsHost.Add(button);
                optionButtons.Add(button);
            }
            ApplyDisabled();
        }

        private void ApplyDisabled()
        {
            trigger.SetEnabled(!disabled);
            for (var i = 0; i < optionButtons.Count; i++)
                optionButtons[i].SetEnabled(!disabled && !(i < optionDisabled.Length && optionDisabled[i]));
        }

        private void ApplyOpen()
        {
            content.style.display = open ? DisplayStyle.Flex : DisplayStyle.None;
            if (!string.IsNullOrEmpty(stateClass)) host.EnableInClassList(stateClass, open);
        }

        private void ApplyLabel()
        {
            var label = placeholder;
            for (var i = 0; i < values.Length; i++)
            {
                if (values[i] != value) continue;
                label = i < labels.Length ? labels[i] : value;
                break;
            }
            text.text = label ?? "";
        }

        private void ToggleOpen()
        {
            if (disabled) return;
            RequestOpen(!open);
        }

        private void RequestOpen(bool next)
        {
            if (next == open) return;
            if (OpenControlled)
            {
                OpenRequested?.Invoke(next);
                return;
            }
            open = next;
            openExplicit = true;
            ApplyOpen();
            OpenChanged?.Invoke(next);
        }

        private void Select(string next)
        {
            if (disabled) return;
            if (next == value)
            {
                RequestOpen(false);
                return;
            }
            if (Controlled)
            {
                ValueRequested?.Invoke(next);
            }
            else
            {
                value = next;
                valueExplicit = true;
                ApplyLabel();
                ValueChanged?.Invoke(value);
            }
            RequestOpen(false);
        }
    }
}
