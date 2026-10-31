using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Non-blocking ephemeral viewport surface: the host is portalled to the
    /// panel root and anchored to the viewport edge; the runtime toggles the item's
    /// presence, owns the auto-dismiss timer, drives the title text and closes through
    /// the close button (and Escape). The open channel uses the shared controlled
    /// semantics; progress animation and ARIA live-region state are not realised.</summary>
    public sealed class ToastSurface
    {
        private bool current;
        private readonly string stateClass;
        private float duration;
        private IVisualElementScheduledItem timer;
        public VisualElement Host { get; }
        public VisualElement Item { get; }
        public UnityEngine.UIElements.Button Close { get; }
        public Label TitleLabel { get; }
        public bool Controlled { get; set; }
        public event Action<bool> ValueRequested;

        private ToastSurface(VisualElement host, VisualElement item, UnityEngine.UIElements.Button close, Label title, string stateClass)
        {
            Host = host ?? throw new ArgumentNullException(nameof(host));
            Item = item ?? throw new ArgumentNullException(nameof(item));
            Close = close ?? throw new ArgumentNullException(nameof(close));
            TitleLabel = title;
            this.stateClass = stateClass;
            Theme.AddStyleSheet(host);
            host.style.position = Position.Absolute;
            host.style.right = 0f;
            host.style.bottom = 0f;
            host.style.alignItems = Align.FlexEnd;
            host.RegisterCallback<AttachToPanelEvent>(_ => Host.schedule.Execute(Portal));
            host.RegisterCallback<KeyDownEvent>(evt =>
            {
                if (!current || evt.keyCode != KeyCode.Escape) return;
                RequestValue(false);
                evt.StopPropagation();
            }, TrickleDown.TrickleDown);
            Close.clicked += () => RequestValue(false);
            SetValueWithoutNotify(false);
        }

        public static ToastSurface Attach(VisualElement host, VisualElement item, UnityEngine.UIElements.Button close, Label title, string stateClass)
            => new ToastSurface(host, item, close, title, stateClass);

        private void Portal()
        {
            var panel = Host.panel;
            if (panel == null || Host.parent == panel.visualTree) return;
            if (Host.parent != null) Host.RemoveFromHierarchy();
            panel.visualTree.Add(Host);
        }

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
            Host.style.display = next ? DisplayStyle.Flex : DisplayStyle.None;
            Item.style.display = next ? DisplayStyle.Flex : DisplayStyle.None;
            timer?.Pause();
            timer = null;
            if (next && duration > 0)
            {
                timer = Host.schedule.Execute(() => RequestValue(false)).StartingIn((long)duration);
            }
        }

        /// <summary>Auto-dismiss budget in milliseconds; zero or less keeps the toast open.</summary>
        public float Duration
        {
            get => duration;
            set
            {
                duration = value;
                if (current) SetValueWithoutNotify(true);
            }
        }

        public string Title
        {
            get => TitleLabel?.text ?? "";
            set
            {
                if (TitleLabel == null) return;
                TitleLabel.text = value ?? "";
                TitleLabel.style.display = string.IsNullOrEmpty(value) ? DisplayStyle.None : DisplayStyle.Flex;
            }
        }
    }
}
