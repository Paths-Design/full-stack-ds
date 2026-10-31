using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Blocking modal surface: the host is portalled to the panel root and
    /// fills it; the content panel is centered as a modal region with a backdrop
    /// overlay. While open the runtime traps focus inside the content and closes
    /// through the declared dismissal knobs (escape, backdrop click, close button).
    /// Presence is display-based: the content is hidden rather than unmounted.</summary>
    public sealed class ModalSurface
    {
        private bool current;
        private readonly string stateClass;
        private VisualElement previousFocus;
        public VisualElement Host { get; }
        public VisualElement Content { get; }
        public VisualElement Overlay { get; }
        public UnityEngine.UIElements.Button Trigger { get; }
        public bool Controlled { get; set; }
        public bool CloseOnEscape { get; set; } = true;
        public bool CloseOnOverlayClick { get; set; } = true;
        private bool dismissible = true;
        public bool Dismissible
        {
            get => dismissible;
            set
            {
                dismissible = value;
                Trigger.style.display = value ? DisplayStyle.Flex : DisplayStyle.None;
            }
        }
        public event Action<bool> ValueRequested;

        private ModalSurface(VisualElement host, VisualElement content, VisualElement overlay, UnityEngine.UIElements.Button trigger, string stateClass)
        {
            Host = host ?? throw new ArgumentNullException(nameof(host));
            Content = content ?? throw new ArgumentNullException(nameof(content));
            Overlay = overlay;
            Trigger = trigger ?? throw new ArgumentNullException(nameof(trigger));
            this.stateClass = stateClass;
            Theme.AddStyleSheet(host);
            // The runtime owns the blocking layout: fill the panel, center the
            // panel region, and keep the backdrop behind it.
            host.style.position = Position.Absolute;
            host.style.left = 0f;
            host.style.top = 0f;
            host.style.right = 0f;
            host.style.bottom = 0f;
            host.style.alignItems = Align.Center;
            host.style.justifyContent = Justify.Center;
            if (Overlay != null)
            {
                Overlay.style.position = Position.Absolute;
                Overlay.style.left = 0f;
                Overlay.style.top = 0f;
                Overlay.style.right = 0f;
                Overlay.style.bottom = 0f;
            }
            host.RegisterCallback<AttachToPanelEvent>(_ => Host.schedule.Execute(Portal));
            host.RegisterCallback<KeyDownEvent>(OnKeyDown, TrickleDown.TrickleDown);
            if (Overlay != null)
            {
                Overlay.RegisterCallback<PointerDownEvent>(evt =>
                {
                    if (current && CloseOnOverlayClick && evt.target == Overlay) RequestValue(false);
                });
            }
            Trigger.clicked += () => RequestValue(false);
            Dismissible = true;
            SetValueWithoutNotify(false);
        }

        public static ModalSurface Attach(VisualElement host, VisualElement content, VisualElement overlay, UnityEngine.UIElements.Button trigger, string stateClass)
            => new ModalSurface(host, content, overlay, trigger, stateClass);

        private void Portal()
        {
            var panel = Host.panel;
            if (panel == null || Host.parent == panel.visualTree) return;
            if (Host.parent != null) Host.RemoveFromHierarchy();
            panel.visualTree.Add(Host);
            if (current) FocusFirst();
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
            Content.style.display = next ? DisplayStyle.Flex : DisplayStyle.None;
            if (Overlay != null) Overlay.style.display = next ? DisplayStyle.Flex : DisplayStyle.None;
            if (next) FocusFirst(); else ReturnFocus();
        }

        private List<VisualElement> Focusables()
        {
            return Content.Query<VisualElement>().Where(element => element.focusable && element.enabledInHierarchy).ToList();
        }

        private void FocusFirst()
        {
            var panel = Content.panel;
            previousFocus = panel?.focusController?.focusedElement as VisualElement;
            var focusables = Focusables();
            if (focusables.Count > 0) focusables[0].Focus();
        }

        private void ReturnFocus()
        {
            if (previousFocus != null && previousFocus.panel != null && previousFocus.focusable) previousFocus.Focus();
            previousFocus = null;
        }

        private void OnKeyDown(KeyDownEvent evt)
        {
            if (!current) return;
            if (evt.keyCode == KeyCode.Escape)
            {
                if (CloseOnEscape) RequestValue(false);
                evt.StopPropagation();
                return;
            }
            if (evt.keyCode != KeyCode.Tab) return;
            var focusables = Focusables();
            if (focusables.Count == 0) return;
            var focused = Content.panel?.focusController?.focusedElement as VisualElement;
            var index = focused == null ? -1 : focusables.IndexOf(focused);
            var delta = evt.shiftKey ? -1 : 1;
            var next = index < 0 ? 0 : (index + delta + focusables.Count) % focusables.Count;
            focusables[next].Focus();
            evt.StopPropagation();
            evt.PreventDefault();
        }
    }
}
