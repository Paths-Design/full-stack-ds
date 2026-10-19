using System;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Anchored floating-surface behavior over a boolean open channel,
    /// attached by a generated constructor when the contract declares a
    /// part-anchored, non-blocking, click-opened surface. The trigger (anchor) and
    /// content are composed sub-elements discovered under the host by part class.
    /// While open, content is reparented to the panel root and positioned against
    /// the trigger; while closed or detached it is out of the hierarchy.</summary>
    public sealed class AnchoredSurface
    {
        private readonly VisualElement host;
        private readonly string triggerClass, contentClass, stateClass;
        private Button trigger;
        private VisualElement content;
        private bool current;
        private VisualElement panelRoot;
        private string placement = "bottom";
        private IVisualElementScheduledItem tracking;
        public bool Controlled { get; set; }
        public event Action<bool> ValueRequested;
        public bool CloseOnEscape { get; set; }
        public bool CloseOnOutsideClick { get; set; }
        public bool CloseOnBlur { get; set; }

        private AnchoredSurface(VisualElement host, string triggerClass, string contentClass, string stateClass)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            this.triggerClass = triggerClass; this.contentClass = contentClass; this.stateClass = stateClass;
            Theme.Attach(host);
            PartDiscovery.Claim(host, triggerClass, contentClass);
            host.RegisterCallback<AttachToPanelEvent>(OnAttach);
            host.RegisterCallback<DetachFromPanelEvent>(OnDetach);
            // Discover parts composed after attachment: on layout change, and before the
            // trigger's Button handles pointer or submit input.
            host.RegisterCallback<GeometryChangedEvent>(_ => Discover());
            host.RegisterCallback<PointerDownEvent>(_ => Discover(), TrickleDown.TrickleDown);
            host.RegisterCallback<NavigationSubmitEvent>(_ => Discover(), TrickleDown.TrickleDown);
        }

        public static AnchoredSurface Attach(VisualElement host, string triggerClass, string contentClass, string stateClass)
            => new AnchoredSurface(host, triggerClass, contentClass, stateClass);

        public Button Trigger { get { Discover(); return trigger; } }
        public VisualElement Content { get { Discover(); return content; } }
        public string Placement
        {
            get => placement;
            set {
                if (value != "top" && value != "bottom" && value != "left" && value != "right" && value != "auto")
                    throw new ArgumentException("Unsupported anchored placement.");
                placement = value; Reposition();
            }
        }
        public bool Value
        {
            get => current;
            set {
                if (current == value) return;
                using (var evt = ChangeEvent<bool>.GetPooled(current, value)) {
                    SetValueWithoutNotify(value); evt.target = host; host.SendEvent(evt);
                }
            }
        }

        /// <summary>Adopts the composed trigger and content; a newly adopted part gets the
        /// current presentation immediately (closed content leaves the hierarchy).</summary>
        private void Discover()
        {
            bool changed = false;
            var nextTrigger = PartDiscovery.Find(host, triggerClass).OfType<Button>().FirstOrDefault();
            if (nextTrigger != trigger) {
                if (trigger != null) { trigger.clicked -= Toggle; trigger.UnregisterCallback<GeometryChangedEvent>(AnchorGeometry); }
                trigger = nextTrigger;
                if (trigger != null) { trigger.clicked += Toggle; trigger.RegisterCallback<GeometryChangedEvent>(AnchorGeometry); }
                changed = true;
            }
            // Content leaves the host while closed or floating, so it has no ancestor to prove
            // ownership; it stays ours until another surface discovers it.
            if (content != null && !PartDiscovery.Holds(content, this)) {
                content.UnregisterCallback<GeometryChangedEvent>(AnchorGeometry);
                content = null; changed = true;
            }
            if (content == null) {
                content = PartDiscovery.Find(host, contentClass).FirstOrDefault();
                if (content != null) {
                    PartDiscovery.Hold(content, this);
                    Theme.Attach(content);
                    content.style.position = Position.Absolute;
                    content.focusable = true;
                    content.RegisterCallback<GeometryChangedEvent>(AnchorGeometry);
                    changed = true;
                }
            }
            if (changed) Present();
        }

        private void Toggle() => RequestValue(!current);
        private void AnchorGeometry(GeometryChangedEvent _) => Reposition();

        private void OnAttach(AttachToPanelEvent evt)
        {
            // A queued attach can arrive after an ancestor surface already parked this subtree.
            if (evt.target != host || host.panel == null || panelRoot != null) return;
            panelRoot = host.panel.visualTree;
            panelRoot.RegisterCallback<PointerDownEvent>(Outside, TrickleDown.TrickleDown);
            panelRoot.RegisterCallback<KeyDownEvent>(Escape, TrickleDown.TrickleDown);
            panelRoot.RegisterCallback<FocusOutEvent>(Blur, TrickleDown.TrickleDown);
            panelRoot.RegisterCallback<GeometryChangedEvent>(AnchorGeometry);
            tracking = host.schedule.Execute(() => { Refresh(); Reposition(); }).Every(16);
            Refresh();
        }
        private void OnDetach(DetachFromPanelEvent evt)
        {
            if (evt.target != host || panelRoot == null) return;
            panelRoot.UnregisterCallback<PointerDownEvent>(Outside, TrickleDown.TrickleDown);
            panelRoot.UnregisterCallback<KeyDownEvent>(Escape, TrickleDown.TrickleDown);
            panelRoot.UnregisterCallback<FocusOutEvent>(Blur, TrickleDown.TrickleDown);
            panelRoot.UnregisterCallback<GeometryChangedEvent>(AnchorGeometry);
            tracking?.Pause(); tracking = null;
            content?.RemoveFromHierarchy(); panelRoot = null;
        }
        private bool Inside(VisualElement node) => node != null && (
            (trigger != null && (node == trigger || trigger.Contains(node))) ||
            (content != null && (node == content || content.Contains(node))));
        private void Outside(PointerDownEvent evt)
        {
            if (current && CloseOnOutsideClick && !Inside(evt.target as VisualElement)) RequestValue(false);
        }
        private void Escape(KeyDownEvent evt)
        {
            if (current && host.enabledInHierarchy && CloseOnEscape && evt.keyCode == KeyCode.Escape && Inside(evt.target as VisualElement)) {
                evt.StopPropagation(); RequestValue(false); trigger?.Focus();
            }
        }
        private void Blur(FocusOutEvent evt)
        {
            if (!current || !CloseOnBlur || !Inside(evt.target as VisualElement)) return;
            if (evt.relatedTarget is VisualElement next) {
                if (!Inside(next)) RequestValue(false);
            } else {
                host.schedule.Execute(() => {
                    if (host.panel != null && current && CloseOnBlur && !Inside(host.panel.focusController.focusedElement as VisualElement)) RequestValue(false);
                });
            }
        }
        public void RequestValue(bool next)
        {
            if (!host.enabledInHierarchy || next == current) return;
            if (!Controlled) Value = next;
            ValueRequested?.Invoke(next);
        }
        public void SetValueWithoutNotify(bool next) { current = next; Refresh(); }
        private void Refresh() { Discover(); Present(); }
        private void Present()
        {
            host.EnableInClassList(stateClass, current && host.enabledInHierarchy);
            if (panelRoot == null) return;
            if (current) tracking?.Resume(); else tracking?.Pause();
            if (content == null) return;
            if (current && host.enabledInHierarchy) {
                if (content.hierarchy.parent != panelRoot) {
                    panelRoot.Add(content); content.BringToFront();
                    content.schedule.Execute(Reposition);
                }
            } else content.RemoveFromHierarchy();
        }
        public void Reposition()
        {
            if (!current || trigger == null || content == null || content.hierarchy.parent == null || panelRoot == null) return;
            Rect anchor = trigger.worldBound;
            Vector2 start = panelRoot.WorldToLocal(anchor.position);
            Rect localAnchor = new Rect(start, anchor.size);
            Rect bounds = panelRoot.contentRect;
            // The floating node is outside UIDocument; carry its styles locally
            // and constrain its scroll viewport before measuring placement.
            float maxWidth = Mathf.Max(0, bounds.width - 16);
            float maxHeight = Mathf.Max(0, bounds.height - 16);
            content.style.maxWidth = maxWidth;
            content.style.maxHeight = maxHeight;
            Vector2 size = content.layout.size;
            if (float.IsNaN(size.x) || float.IsNaN(size.y)) return;
            Vector2 point = CalculatePosition(localAnchor, size, bounds.size, placement);
            content.style.left = point.x; content.style.top = point.y;
        }
        // Framework geometry law: preferred side, opposite-side flip, viewport shift.
        public static Vector2 CalculatePosition(Rect anchor, Vector2 content, Vector2 viewport, string placement)
        {
            const float gap = 4;
            bool horizontal = placement == "left" || placement == "right";
            float x = anchor.xMin, y = anchor.yMax + gap;
            if (horizontal) {
                x = placement == "left" ? anchor.xMin - content.x - gap : anchor.xMax + gap;
                y = anchor.yMin;
                float opposite = placement == "left" ? anchor.xMax + gap : anchor.xMin - content.x - gap;
                if ((x < 0 || x + content.x > viewport.x) && opposite >= 0 && opposite + content.x <= viewport.x) x = opposite;
            } else {
                y = placement == "top" ? anchor.yMin - content.y - gap : anchor.yMax + gap;
                float opposite = placement == "top" ? anchor.yMax + gap : anchor.yMin - content.y - gap;
                if ((y < 0 || y + content.y > viewport.y) && opposite >= 0 && opposite + content.y <= viewport.y) y = opposite;
            }
            return new Vector2(Mathf.Clamp(x, 0, Mathf.Max(0, viewport.x - content.x)), Mathf.Clamp(y, 0, Mathf.Max(0, viewport.y - content.y)));
        }
    }
}
