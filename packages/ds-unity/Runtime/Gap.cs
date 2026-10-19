using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Flex gap for USS, which has no <c>gap</c> property. The generated sheet lowers each
    /// contract <c>gap</c> declaration to the custom property <c>--fsds-gap</c> on the same selector,
    /// and a generated constructor attaches this helper to each part whose rules carry it.
    ///
    /// The resolved <c>--fsds-gap</c> length (px) becomes a margin between consecutive in-flow children
    /// of the element's layout container: <c>margin-right</c> in a row, <c>margin-left</c> in
    /// row-reverse, <c>margin-bottom</c> in a column, <c>margin-top</c> in column-reverse, from the
    /// container's resolved <c>flex-direction</c>. As with CSS gap, absolutely positioned and
    /// <c>display: none</c> children take no part, and the last in-flow child carries no spacing.
    /// The layout container is the element itself, or a ScrollView's content container (its children
    /// are the scroll content). The spacing is an inline margin on that side, so it replaces any USS or
    /// inline margin the child had on that side. It is re-applied when the custom property resolves
    /// (theme, brand or variant changes) and when the container or one of its children changes geometry;
    /// call <see cref="Refresh"/> after a child change that moves nothing.</summary>
    public static class Gap
    {
        public const string PropertyName = "--fsds-gap";
        // Read as text: ICustomStyle's float read refuses a Dimension value ("8px"), while the string read
        // returns the var()-resolved value. Only px and unitless lengths are spacing; anything else is ignored.
        private static readonly CustomStyleProperty<string> property = new CustomStyleProperty<string>(PropertyName);

        /// <summary>Parses a resolved USS length: <c>8px</c>, <c>8</c> or <c>0</c>; NaN for any other unit or keyword.</summary>
        public static float ParsePixels(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return float.NaN;
            var value = text.Trim();
            if (value.EndsWith("px", StringComparison.Ordinal)) value = value.Substring(0, value.Length - 2);
            return float.TryParse(value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var px) ? px : float.NaN;
        }

        private sealed class State
        {
            public float gap = float.NaN;
            public readonly Dictionary<VisualElement, Side> spaced = new Dictionary<VisualElement, Side>();
            public readonly HashSet<VisualElement> observed = new HashSet<VisualElement>();
            public EventCallback<GeometryChangedEvent> onGeometry;
        }
        private enum Side { Right, Left, Bottom, Top }
        private static readonly ConditionalWeakTable<VisualElement, State> states = new ConditionalWeakTable<VisualElement, State>();

        public static void Attach(VisualElement host)
        {
            if (host == null) throw new ArgumentNullException(nameof(host));
            if (states.TryGetValue(host, out _)) return;
            var state = new State();
            states.Add(host, state);
            state.onGeometry = _ => Apply(host, state);
            host.RegisterCallback<CustomStyleResolvedEvent>(evt => {
                state.gap = evt.customStyle.TryGetValue(property, out var value) ? ParsePixels(value) : float.NaN;
                Apply(host, state);
            });
            host.RegisterCallback(state.onGeometry);
            var container = Container(host);
            if (container != host) container.RegisterCallback(state.onGeometry);
        }

        /// <summary>The resolved gap in px, or NaN when <paramref name="host"/> has no gap attached or resolved.</summary>
        public static float Resolved(VisualElement host) => states.TryGetValue(host, out var state) ? state.gap : float.NaN;

        /// <summary>Re-applies the spacing now.</summary>
        public static void Refresh(VisualElement host)
        {
            if (states.TryGetValue(host, out var state)) Apply(host, state);
        }

        // A ScrollView's in-flow children live in its contentContainer, whose ICustomStyle does not carry the host's custom properties.
        private static VisualElement Container(VisualElement host) => host is ScrollView scroll ? scroll.contentContainer : host;

        private static void Apply(VisualElement host, State state)
        {
            var container = Container(host);
            var wanted = new Dictionary<VisualElement, Side>();
            if (!float.IsNaN(state.gap) && state.gap > 0) {
                var direction = container.resolvedStyle.flexDirection;
                var side = direction == FlexDirection.Row ? Side.Right : direction == FlexDirection.RowReverse ? Side.Left
                    : direction == FlexDirection.ColumnReverse ? Side.Top : Side.Bottom;
                VisualElement previous = null;
                foreach (var child in container.hierarchy.Children()) {
                    if (state.observed.Add(child)) child.RegisterCallback(state.onGeometry);
                    if (child.resolvedStyle.position == Position.Absolute || child.resolvedStyle.display == DisplayStyle.None) continue;
                    if (previous != null) wanted[previous] = side;
                    previous = child;
                }
            }
            foreach (var entry in new List<KeyValuePair<VisualElement, Side>>(state.spaced)) {
                if (wanted.TryGetValue(entry.Key, out var side) && side == entry.Value) continue;
                Set(entry.Key, entry.Value, null);
                state.spaced.Remove(entry.Key);
            }
            foreach (var entry in wanted) {
                Set(entry.Key, entry.Value, state.gap);
                state.spaced[entry.Key] = entry.Value;
            }
            state.observed.RemoveWhere(child => {
                if (child.hierarchy.parent == container) return false;
                child.UnregisterCallback(state.onGeometry);
                return true;
            });
        }

        private static void Set(VisualElement child, Side side, float? px)
        {
            StyleLength value = px.HasValue ? new StyleLength(px.Value) : new StyleLength(StyleKeyword.Null);
            switch (side) {
                case Side.Right: if (child.style.marginRight != value) child.style.marginRight = value; break;
                case Side.Left: if (child.style.marginLeft != value) child.style.marginLeft = value; break;
                case Side.Top: if (child.style.marginTop != value) child.style.marginTop = value; break;
                default: if (child.style.marginBottom != value) child.style.marginBottom = value; break;
            }
        }
    }
}
