using System;
using System.Collections.Generic;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Choice-group behavior: builds one native radio button per declared
    /// option from parallel leaf arrays (value/label/description/disabled), owns the
    /// string selection channel with commit/request semantics, shows the declared
    /// option description as a tooltip and disables the declared options. The
    /// authored internal item markup and data-state selector styling are not
    /// reproduced; the native radio carries the checked indication.</summary>
    public sealed class ChoiceGroupControl
    {
        private readonly VisualElement host;
        private readonly string itemClass;
        private readonly List<UnityEngine.UIElements.RadioButton> radios = new List<UnityEngine.UIElements.RadioButton>();
        private string[] values = Array.Empty<string>();
        private string[] labels = Array.Empty<string>();
        private string[] descriptions = Array.Empty<string>();
        private bool[] optionDisabled = Array.Empty<bool>();
        private string value = "";
        private string defaultValue = "";
        private bool valueExplicit;
        public bool Controlled { get; set; }
        public Action<string> ValueChanged;
        public Action<string> ValueRequested;

        private ChoiceGroupControl(VisualElement host, string prefix, string itemPart)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            itemClass = $"{prefix}__{itemPart}";
        }

        public static ChoiceGroupControl Attach(VisualElement host, string prefix, string itemPart)
            => new ChoiceGroupControl(host, prefix, itemPart);

        public string Value
        {
            get => value;
            set
            {
                valueExplicit = true;
                this.value = value ?? "";
                ApplyValue();
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
                    ApplyValue();
                }
            }
        }

        public void SetOptions(string[] nextValues, string[] nextLabels, string[] nextDescriptions, bool[] nextDisabled)
        {
            values = nextValues ?? Array.Empty<string>();
            labels = nextLabels ?? Array.Empty<string>();
            descriptions = nextDescriptions ?? Array.Empty<string>();
            optionDisabled = nextDisabled ?? Array.Empty<bool>();
            if (!valueExplicit) value = defaultValue;
            Rebuild();
            ApplyValue();
        }

        public T[] GetOptions<T>(Func<string, string, string, bool, T> create)
        {
            var result = new T[values.Length];
            for (var i = 0; i < values.Length; i++)
                result[i] = create(values[i], i < labels.Length ? labels[i] : "", i < descriptions.Length ? descriptions[i] : "", i < optionDisabled.Length && optionDisabled[i]);
            return result;
        }

        private void Rebuild()
        {
            host.Clear();
            radios.Clear();
            for (var i = 0; i < values.Length; i++)
            {
                var index = i;
                var radio = new UnityEngine.UIElements.RadioButton(i < labels.Length ? labels[i] : "");
                radio.AddToClassList(itemClass);
                radio.tooltip = i < descriptions.Length ? descriptions[i] : "";
                radio.SetEnabled(!(i < optionDisabled.Length && optionDisabled[i]));
                radio.RegisterValueChangedCallback(evt =>
                {
                    if (evt.newValue) Request(values[index]);
                });
                host.Add(radio);
                radios.Add(radio);
            }
        }

        private void ApplyValue()
        {
            for (var i = 0; i < radios.Count && i < values.Length; i++)
                radios[i].SetValueWithoutNotify(values[i] == value);
        }

        private void Request(string next)
        {
            if (next == value)
            {
                ApplyValue();
                return;
            }
            if (Controlled)
            {
                ApplyValue();
                ValueRequested?.Invoke(next);
                return;
            }
            value = next;
            valueExplicit = true;
            ApplyValue();
            ValueChanged?.Invoke(value);
        }
    }
}
