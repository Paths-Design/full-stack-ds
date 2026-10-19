using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Keyed selection behavior, attached by a generated constructor when the
    /// contract declares one select / toggle-item trigger over hidden content. It owns
    /// no elements: trigger and content sub-elements are composed by the consumer,
    /// discovered under the host by part class and paired by <see cref="IKeyedPart.Value"/>.
    /// Discovery runs on panel attachment, before pointer/submit interaction reaches a
    /// trigger, on host layout changes and on every public mutation; removed parts drop
    /// out at the next discovery and an orphaned trigger's activation is ignored.</summary>
    public sealed class ItemGroup
    {
        private readonly VisualElement host;
        private readonly string triggerClass, contentClass, stateClass;
        private readonly bool select, roving, allowMultiple;
        private readonly Dictionary<Button, Action> hooked = new Dictionary<Button, Action>();
        private readonly Dictionary<VisualElement, Mount> unmounted = new Dictionary<VisualElement, Mount>();
        private List<Button> triggers = new List<Button>();
        private List<VisualElement> contents = new List<VisualElement>();
        private string[] selected = Array.Empty<string>();
        private bool explicitValue, multiple, unmount;
        private string orientation, activation = "automatic";

        private struct Mount { public VisualElement Parent, Next; public int Index; }

        public bool Controlled { get; set; }
        public event Action<string[]> ValueRequested;
        public event Action<string[]> ValueChanged;
        public bool Loop { get; set; }
        public bool Collapsible { get; set; }
        public IReadOnlyList<Button> Triggers { get { Synchronize(); return triggers.AsReadOnly(); } }

        private ItemGroup(VisualElement host, string triggerClass, string contentClass, string operation, string stateClass, bool multiple, string focus, string orientation, bool wrap)
        {
            if (operation != "select" && operation != "toggle-item") throw new ArgumentException("ItemGroup realises select and toggle-item operations.");
            if (focus != "roving" && focus != "manual") throw new ArgumentException("ItemGroup realises roving and manual focus.");
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            this.triggerClass = triggerClass; this.contentClass = contentClass; this.stateClass = stateClass;
            select = operation == "select"; roving = focus == "roving"; allowMultiple = multiple;
            Orientation = orientation; Loop = wrap;
            Theme.Attach(host);
            PartDiscovery.Claim(host, triggerClass, contentClass);
            host.RegisterCallback<AttachToPanelEvent>(_ => Synchronize());
            host.RegisterCallback<GeometryChangedEvent>(_ => Synchronize());
            // Hook triggers composed after attachment before the native Button handles the event.
            host.RegisterCallback<PointerDownEvent>(evt => HookPending(evt.target), TrickleDown.TrickleDown);
            host.RegisterCallback<NavigationSubmitEvent>(evt => HookPending(evt.target), TrickleDown.TrickleDown);
            host.RegisterCallback<KeyDownEvent>(Navigate);
        }

        private void HookPending(IEventHandler target)
        {
            for (var node = target as VisualElement; node != null && node != host; node = node.hierarchy.parent)
                if (node is Button button && button.ClassListContains(triggerClass) && !hooked.ContainsKey(button) && PartDiscovery.Owner(button, triggerClass) == host) { Synchronize(); return; }
        }

        public static ItemGroup Attach(VisualElement host, string triggerClass, string contentClass, string operation, string stateClass, bool multiple, string focus, string orientation, bool wrap)
            => new ItemGroup(host, triggerClass, contentClass, operation, stateClass, multiple, focus, orientation, wrap);

        public bool UnmountInactive { get => unmount; set { unmount = value; Synchronize(); } }
        public string SelectionType
        {
            get => multiple ? "multiple" : "single";
            set
            {
                if (value != "multiple" && value != "single") throw new ArgumentException("Expected single or multiple.");
                if (!allowMultiple && value == "multiple") throw new ArgumentException("This channel is single-valued.");
                multiple = value == "multiple";
                if (!multiple && selected.Length > 1) SetValuesWithoutNotify(selected.Take(1).ToArray());
            }
        }
        public string Orientation
        {
            get => orientation;
            set
            {
                if (value != "horizontal" && value != "vertical") throw new ArgumentException("Expected horizontal or vertical.");
                orientation = value;
            }
        }
        public string ActivationMode
        {
            get => activation;
            set
            {
                if (value != "manual" && value != "automatic") throw new ArgumentException("Expected automatic or manual.");
                activation = value;
            }
        }
        public string Value { get => selected.FirstOrDefault() ?? ""; set => Values = string.IsNullOrEmpty(value) ? Array.Empty<string>() : new[] { value }; }
        public string[] Values
        {
            get => (string[])selected.Clone();
            set
            {
                var old = Values;
                SetValuesWithoutNotify(value);
                if (!old.SequenceEqual(selected)) ValueChanged?.Invoke(Values);
            }
        }

        public void SetValuesWithoutNotify(string[] next)
        {
            if (next == null || next.Any(string.IsNullOrEmpty) || next.Distinct().Count() != next.Length)
                throw new ArgumentException("Selected values must be non-null, non-empty and unique.");
            if (!multiple && next.Length > 1) throw new ArgumentException("Single selection accepts at most one value.");
            explicitValue = true; selected = (string[])next.Clone(); Synchronize();
        }

        /// <summary>Activates the trigger keyed <paramref name="value"/> as a user would.</summary>
        public void Activate(string value)
        {
            Synchronize();
            var trigger = triggers.FirstOrDefault(t => PartDiscovery.Key(t) == value);
            if (trigger != null) Activate(trigger);
        }

        /// <summary>Re-discovers composed parts, rejects empty or duplicate trigger
        /// keys, and presents selection on triggers and content.</summary>
        public void Synchronize()
        {
            var nextTriggers = PartDiscovery.Find(host, triggerClass).OfType<Button>().Where(t => t is IKeyedPart).ToList();
            var keys = nextTriggers.Select(PartDiscovery.Key).ToList();
            if (keys.Any(string.IsNullOrEmpty) || keys.Distinct().Count() != keys.Count)
                throw new ArgumentException("Trigger values must be non-empty and unique.");
            foreach (var stale in hooked.Keys.Where(t => !nextTriggers.Contains(t)).ToArray()) { stale.clicked -= hooked[stale]; hooked.Remove(stale); }
            foreach (var trigger in nextTriggers.Where(t => !hooked.ContainsKey(t))) {
                var target = trigger;
                Action handler = () => Activate(target);
                trigger.clicked += handler; hooked[trigger] = handler;
            }
            triggers = nextTriggers;
            var discovered = PartDiscovery.Find(host, contentClass).Where(c => c is IKeyedPart).ToList();
            foreach (var content in discovered) PartDiscovery.Hold(content, this);
            // A parked panel stays ours only while nobody re-parented or re-discovered it
            // and its saved insertion point is still under this host.
            foreach (var gone in unmounted.Where(m => m.Key.hierarchy.parent != null || !PartDiscovery.Holds(m.Key, this) || (m.Value.Parent != host && !host.Contains(m.Value.Parent))).Select(m => m.Key).ToArray()) unmounted.Remove(gone);
            contents = discovered.Concat(unmounted.Keys).ToList();
            foreach (var content in contents) { content.focusable = true; content.tabIndex = 0; }
            if (select && !explicitValue) selected = triggers.Where(t => t.enabledSelf).Take(1).Select(PartDiscovery.Key).ToArray();
            Present();
        }

        private void Present()
        {
            var active = triggers.FirstOrDefault(t => selected.Contains(PartDiscovery.Key(t)) && t.enabledSelf) ?? triggers.FirstOrDefault(t => t.enabledSelf);
            foreach (var trigger in triggers) {
                trigger.EnableInClassList(stateClass, selected.Contains(PartDiscovery.Key(trigger)));
                trigger.tabIndex = roving ? (trigger == active ? 0 : -1) : 0;
            }
            foreach (var content in contents) {
                bool on = selected.Contains(PartDiscovery.Key(content));
                content.EnableInClassList(stateClass, on);
                if (unmount && !on) {
                    if (content.hierarchy.parent == null) continue;
                    var parent = content.hierarchy.parent;
                    int index = parent.hierarchy.IndexOf(content);
                    var next = index + 1 < parent.hierarchy.childCount ? parent.hierarchy[index + 1] : null;
                    unmounted[content] = new Mount { Parent = parent, Next = next, Index = index };
                    content.RemoveFromHierarchy();
                } else {
                    if (unmounted.TryGetValue(content, out var mount)) {
                        unmounted.Remove(content);
                        int index = mount.Next != null && mount.Next.hierarchy.parent == mount.Parent ? mount.Parent.hierarchy.IndexOf(mount.Next) : Math.Min(mount.Index, mount.Parent.hierarchy.childCount);
                        mount.Parent.hierarchy.Insert(index, content);
                    }
                    content.style.display = on ? DisplayStyle.Flex : DisplayStyle.None;
                }
            }
        }

        private void Activate(Button trigger)
        {
            // A trigger moved out of this host keeps a stale handler until the next
            // discovery; ownership is re-checked here so it never activates twice.
            if (!host.enabledInHierarchy || !trigger.enabledSelf || PartDiscovery.Owner(trigger, triggerClass) != host) return;
            var key = PartDiscovery.Key(trigger);
            var next = Values;
            if (select) next = new[] { key };
            else if (multiple) next = next.Contains(key) ? next.Where(v => v != key).ToArray() : next.Concat(new[] { key }).ToArray();
            else if (next.Contains(key)) { if (!Collapsible) return; next = Array.Empty<string>(); }
            else next = new[] { key };
            if (next.SequenceEqual(selected)) return;
            if (!Controlled) Values = next;
            ValueRequested?.Invoke((string[])next.Clone());
        }

        private void Navigate(KeyDownEvent evt)
        {
            var key = evt.keyCode;
            if (!host.enabledInHierarchy || (key != KeyCode.Home && key != KeyCode.End && key != KeyCode.LeftArrow && key != KeyCode.RightArrow && key != KeyCode.UpArrow && key != KeyCode.DownArrow)) return;
            Synchronize();
            Button trigger = null;
            for (var node = evt.target as VisualElement; node != null && node != host && trigger == null; node = node.hierarchy.parent)
                if (node is Button button && triggers.Contains(button)) trigger = button;
            if (trigger == null || !trigger.enabledSelf) return;
            var candidates = triggers.Where(t => t.enabledSelf).ToList();
            var index = candidates.IndexOf(trigger);
            int next;
            if (evt.keyCode == KeyCode.Home) next = 0;
            else if (evt.keyCode == KeyCode.End) next = candidates.Count - 1;
            else {
                int delta = 0;
                if (orientation == "horizontal") { if (evt.keyCode == KeyCode.LeftArrow) delta = -1; if (evt.keyCode == KeyCode.RightArrow) delta = 1; }
                else { if (evt.keyCode == KeyCode.UpArrow) delta = -1; if (evt.keyCode == KeyCode.DownArrow) delta = 1; }
                if (delta == 0) return; // Native Button owns Enter/Space activation.
                next = Loop ? (index + delta + candidates.Count) % candidates.Count : Math.Max(0, Math.Min(candidates.Count - 1, index + delta));
            }
            evt.StopPropagation();
            candidates[next].Focus();
            if (select && activation == "automatic") Activate(candidates[next]);
            if (roving) foreach (var candidate in candidates) candidate.tabIndex = candidate == candidates[next] ? 0 : -1;
        }
    }
}
