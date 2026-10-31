using System;
using System.Collections.Generic;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>OTP behavior: the runtime builds one one-character native text field per
    /// declared position inside the group host, assembles the joined string value
    /// from their characters, filters input by mode (numeric digits or alphanumerics),
    /// raises a completion event when every position is filled, and applies disabled
    /// and read-only state to every field. Accessible labels/describedby are not
    /// realised; pasted characters distribute across the following positions.</summary>
    public sealed class OtpControl
    {
        private readonly VisualElement group;
        private readonly string fieldClass;
        private readonly string fieldName;
        private readonly List<UnityEngine.UIElements.TextField> fields = new List<UnityEngine.UIElements.TextField>();
        private int length = 6;
        private string value = "";
        private string defaultValue = "";
        private bool disabled;
        private bool readOnly;
        private string mode = "numeric";
        private bool syncing;
        private bool valueExplicit;
        public bool Controlled { get; set; }
        public Action<string> ValueChanged;
        public Action<string> ValueRequested;
        public Action<string> Completed;

        private OtpControl(VisualElement group, string prefix, string fieldPart)
        {
            this.group = group ?? throw new ArgumentNullException(nameof(group));
            fieldClass = $"{prefix}__{fieldPart}";
            fieldName = fieldPart;
            Rebuild();
        }

        public static OtpControl Attach(VisualElement group, string prefix, string fieldPart)
            => new OtpControl(group, prefix, fieldPart);

        public int Length
        {
            get => length;
            set
            {
                length = Math.Clamp(value, 1, 12);
                Rebuild();
            }
        }

        public string Value
        {
            get => value;
            set
            {
                valueExplicit = true;
                SetValue(value ?? "");
            }
        }

        public string DefaultValue
        {
            get => defaultValue;
            set
            {
                defaultValue = value ?? "";
                if (!valueExplicit) SetValue(defaultValue);
            }
        }

        public string Mode
        {
            get => mode;
            set
            {
                mode = string.Equals(value, "alphanumeric", StringComparison.Ordinal) ? "alphanumeric" : "numeric";
                SetValue(this.value);
            }
        }

        public bool Disabled
        {
            get => disabled;
            set
            {
                disabled = value;
                ApplyState();
            }
        }

        public bool ReadOnly
        {
            get => readOnly;
            set
            {
                readOnly = value;
                ApplyState();
            }
        }

        private void Rebuild()
        {
            group.Clear();
            fields.Clear();
            for (var i = 0; i < length; i++)
            {
                var index = i;
                var field = new UnityEngine.UIElements.TextField { maxLength = 1, name = $"{fieldName}{i}" };
                field.AddToClassList(fieldClass);
                field.RegisterValueChangedCallback(evt => OnFieldChanged(index, evt.newValue));
                group.Add(field);
                fields.Add(field);
            }
            ApplyState();
            ApplyChars(value);
        }

        private void ApplyState()
        {
            foreach (var field in fields)
            {
                field.SetEnabled(!disabled);
                field.isReadOnly = readOnly;
            }
        }

        private void SetValue(string next)
        {
            value = Sanitize(next);
            ApplyChars(value);
        }

        private void ApplyChars(string chars)
        {
            syncing = true;
            try
            {
                for (var i = 0; i < fields.Count; i++)
                    fields[i].SetValueWithoutNotify(i < chars.Length ? chars[i].ToString() : "");
            }
            finally
            {
                syncing = false;
            }
        }

        private string Sanitize(string text)
        {
            if (text == null) return "";
            var builder = new System.Text.StringBuilder();
            foreach (var c in text)
            {
                if (mode == "numeric")
                {
                    if (char.IsDigit(c)) builder.Append(c);
                }
                else if (char.IsLetterOrDigit(c)) builder.Append(c);
            }
            return builder.ToString();
        }

        private void OnFieldChanged(int index, string raw)
        {
            if (syncing) return;
            var chars = value.PadRight(length, ' ').ToCharArray();
            if (index < chars.Length) chars[index] = ' ';
            var accepted = Sanitize(raw);
            if (accepted.Length == 0 && !string.IsNullOrEmpty(raw))
            {
                ApplyChars(value);
                return;
            }
            for (var offset = 0; offset < accepted.Length && index + offset < chars.Length; offset++)
                chars[index + offset] = accepted[offset];
            var builder = new System.Text.StringBuilder();
            foreach (var c in chars) builder.Append(c == ' ' ? '\0' : c);
            var next = builder.ToString().Replace("\0", "");
            if (next == value)
            {
                ApplyChars(value);
            }
            else if (Controlled)
            {
                ApplyChars(value);
                ValueRequested?.Invoke(next);
            }
            else
            {
                value = next;
                ApplyChars(value);
                ValueChanged?.Invoke(value);
                if (value.Length == length) Completed?.Invoke(value);
            }
            if (index + 1 < fields.Count && accepted.Length > 0) fields[index + 1].Focus();
        }
    }
}
