using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Boolean channel behavior, attached by a generated constructor when
    /// the contract's form control has a boolean value model. Native UI Toolkit
    /// activation (Button.clicked: pointer and submit) commits through the channel;
    /// ChangeEvent&lt;bool&gt; targets the host so RegisterValueChangedCallback works
    /// on the generated root.</summary>
    public sealed class BooleanControl
    {
        private bool current;
        private readonly string stateClass;
        public VisualElement Host { get; }
        public Button Control { get; }
        public bool Controlled { get; set; }
        public event Action<bool> ValueRequested;

        private BooleanControl(VisualElement host, Button control, string stateClass, VisualElement labelHost)
        {
            Host = host ?? throw new ArgumentNullException(nameof(host));
            Control = control ?? throw new ArgumentNullException(nameof(control));
            this.stateClass = stateClass;
            Theme.Attach(host);
            control.clicked += () => RequestValue(!current);
            // HTML label semantics: a click inside the label host but outside the
            // control activates the control. Clicks on the control itself already
            // arrive through Button.clicked, so they are excluded here.
            labelHost?.RegisterCallback<ClickEvent>(evt => {
                if (evt.target is VisualElement target && (target == control || control.Contains(target))) return;
                RequestValue(!current);
            });
            SetValueWithoutNotify(false);
        }

        public static BooleanControl Attach(VisualElement host, Button control, string stateClass, VisualElement labelHost)
            => new BooleanControl(host, control, stateClass, labelHost);

        public bool Value
        {
            get => current;
            set
            {
                if (current == value) return;
                using (var evt = ChangeEvent<bool>.GetPooled(current, value))
                {
                    SetValueWithoutNotify(value);
                    evt.target = Host;
                    Host.SendEvent(evt);
                }
            }
        }

        public void RequestValue(bool next)
        {
            if (!Host.enabledInHierarchy || next == current) return;
            if (!Controlled) Value = next;
            ValueRequested?.Invoke(next);
        }

        public void SetValueWithoutNotify(bool next)
        {
            current = next;
            Host.EnableInClassList(stateClass, next);
        }
    }
}
