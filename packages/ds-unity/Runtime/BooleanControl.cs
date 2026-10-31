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
        public UnityEngine.UIElements.Button Control { get; }
        public bool Controlled { get; set; }
        public event Action<bool> ValueRequested;

        private BooleanControl(VisualElement host, UnityEngine.UIElements.Button control, string stateClass, VisualElement labelHost)
        {
            Host = host ?? throw new ArgumentNullException(nameof(host));
            Control = control ?? throw new ArgumentNullException(nameof(control));
            this.stateClass = stateClass;
            Theme.AddStyleSheet(host);
            MirrorInteractionState(host, control);
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

        public static BooleanControl Attach(VisualElement host, UnityEngine.UIElements.Button control, string stateClass, VisualElement labelHost)
            => new BooleanControl(host, control, stateClass, labelHost);

        public const string HoverClass = "is-hover";
        public const string ActiveClass = "is-active";
        public const string FocusClass = "is-focus";

        /// <summary>The contract styles sibling parts (the track) from the form control's
        /// pointer and focus state; USS cannot select a sibling, so the control's state is
        /// mirrored onto host classes the generated sheet selects as
        /// <c>.&lt;prefix&gt;.is-focus .&lt;prefix&gt;__&lt;part&gt;</c>. Pointer-down and -up are
        /// observed in the trickle-down phase, ahead of the Button's own pointer handling.
        /// <c>is-focus</c> follows UI Toolkit focus (pointer focus included; there is no
        /// focus-visible distinction in UI Toolkit).</summary>
        private static void MirrorInteractionState(VisualElement host, UnityEngine.UIElements.Button control)
        {
            control.RegisterCallback<PointerEnterEvent>(_ => host.AddToClassList(HoverClass));
            control.RegisterCallback<PointerLeaveEvent>(_ => { host.RemoveFromClassList(HoverClass); host.RemoveFromClassList(ActiveClass); });
            control.RegisterCallback<PointerDownEvent>(_ => host.AddToClassList(ActiveClass), TrickleDown.TrickleDown);
            control.RegisterCallback<PointerUpEvent>(_ => host.RemoveFromClassList(ActiveClass), TrickleDown.TrickleDown);
            control.RegisterCallback<PointerCancelEvent>(_ => host.RemoveFromClassList(ActiveClass));
            control.RegisterCallback<PointerCaptureOutEvent>(_ => host.RemoveFromClassList(ActiveClass));
            control.RegisterCallback<FocusEvent>(_ => host.AddToClassList(FocusClass));
            control.RegisterCallback<BlurEvent>(_ => host.RemoveFromClassList(FocusClass));
            control.RegisterCallback<DetachFromPanelEvent>(_ => {
                host.RemoveFromClassList(HoverClass); host.RemoveFromClassList(ActiveClass); host.RemoveFromClassList(FocusClass);
            });
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
        }
    }
}
