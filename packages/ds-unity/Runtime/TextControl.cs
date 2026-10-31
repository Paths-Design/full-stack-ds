using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>String channel behavior for a generated text input that derives the
    /// native TextField. User edits commit through the native ChangeEvent unless the
    /// control is owner-controlled, in which case the requested value is raised and
    /// the native value is reverted until the owner commits. The placeholder drives
    /// the native text edition; no HTML form participation is claimed.</summary>
    public sealed class TextControl
    {
        private readonly UnityEngine.UIElements.TextField host;
        private string current;
        private string placeholder;
        private bool syncing;
        public bool Controlled { get; set; }
        public event Action<string> ValueRequested;

        private TextControl(UnityEngine.UIElements.TextField host)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            current = host.value ?? "";
            host.RegisterValueChangedCallback(evt =>
            {
                if (syncing) return;
                var next = evt.newValue ?? "";
                if (Controlled)
                {
                    SetValueWithoutNotify(current);
                    ValueRequested?.Invoke(next);
                }
                else
                {
                    current = next;
                }
            });
        }

        public static TextControl Attach(UnityEngine.UIElements.TextField host) => new TextControl(host);

        public string Value
        {
            get => current;
            set
            {
                if (current == value) return;
                using (var evt = ChangeEvent<string>.GetPooled(current, value))
                {
                    SetValueWithoutNotify(value);
                    evt.target = host;
                    host.SendEvent(evt);
                }
            }
        }

        public string Placeholder
        {
            get => placeholder;
            set
            {
                placeholder = value ?? "";
                host.textEdition.placeholder = placeholder;
            }
        }

        public void RequestValue(string next)
        {
            next ??= "";
            if (!host.enabledInHierarchy || next == current) return;
            if (!Controlled) Value = next;
            ValueRequested?.Invoke(next);
        }

        public void SetValueWithoutNotify(string next)
        {
            next ??= "";
            syncing = true;
            try
            {
                current = next;
                host.SetValueWithoutNotify(next);
            }
            finally
            {
                syncing = false;
            }
        }
    }
}
