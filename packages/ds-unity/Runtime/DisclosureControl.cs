using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Disclosure behavior: a native button trigger toggles a boolean
    /// channel and the content part's presence. Controlled semantics match the
    /// other boolean channel behaviors; the content is shown or hidden by display
    /// rather than detached, so the generated class owns one content region.</summary>
    public sealed class DisclosureControl
    {
        private bool current;
        private readonly string stateClass;
        public VisualElement Host { get; }
        public UnityEngine.UIElements.Button Summary { get; }
        public VisualElement Content { get; }
        public bool Controlled { get; set; }
        public event Action<bool> ValueRequested;

        private DisclosureControl(VisualElement host, UnityEngine.UIElements.Button summary, VisualElement content, string stateClass)
        {
            Host = host ?? throw new ArgumentNullException(nameof(host));
            Summary = summary ?? throw new ArgumentNullException(nameof(summary));
            Content = content ?? throw new ArgumentNullException(nameof(content));
            this.stateClass = stateClass;
            Theme.AddStyleSheet(host);
            summary.clicked += () => RequestValue(!current);
            SetValueWithoutNotify(false);
        }

        public static DisclosureControl Attach(VisualElement host, UnityEngine.UIElements.Button summary, VisualElement content, string stateClass)
            => new DisclosureControl(host, summary, content, stateClass);

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
            Content.style.display = next ? DisplayStyle.Flex : DisplayStyle.None;
            Summary.SetEnabled(Host.enabledSelf);
        }
    }
}
