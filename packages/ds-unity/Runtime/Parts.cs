using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>A generated compound part that carries a pairing key (the web
    /// <c>value</c> prop). Item groups pair trigger and content parts by it.</summary>
    public interface IKeyedPart
    {
        string Value { get; }
    }

    /// <summary>Root modifier classes for variant-axis props, matching the web class
    /// recipe: <c>&lt;cssPrefix&gt;--&lt;value&gt;</c> (<c>tabs--pills</c>). The root's class
    /// list is the single record of the current value; each axis reads and swaps
    /// only among its own declared values.</summary>
    public static class Variants
    {
        /// <summary>The declared value whose modifier class is on <paramref name="root"/>, or null.</summary>
        public static string Get(VisualElement root, string prefix, params string[] values)
        {
            foreach (var value in values)
                if (root.ClassListContains(prefix + "--" + value)) return value;
            return null;
        }

        /// <summary>Validates <paramref name="value"/> against the declared values and swaps the modifier class.</summary>
        public static void Set(VisualElement root, string prefix, string value, params string[] values)
        {
            if (value == null || Array.IndexOf(values, value) < 0)
                throw new ArgumentException($"{prefix}: expected one of {string.Join(", ", values)}, got {value ?? "null"}.");
            foreach (var other in values)
                if (other != value) root.RemoveFromClassList(prefix + "--" + other);
            root.AddToClassList(prefix + "--" + value);
        }
    }

    /// <summary>Discovers composed sub-elements by part class. A behavior claims
    /// the part classes it owns on its host; an element belongs to the nearest
    /// ancestor host claiming its class, so nested components keep their own parts.</summary>
    internal static class PartDiscovery
    {
        private static readonly ConditionalWeakTable<VisualElement, HashSet<string>> claims = new ConditionalWeakTable<VisualElement, HashSet<string>>();

        public static void Claim(VisualElement host, params string[] classNames)
        {
            var set = claims.GetOrCreateValue(host);
            foreach (var name in classNames) set.Add(name);
        }

        public static VisualElement Owner(VisualElement element, string className)
        {
            for (var node = element.hierarchy.parent; node != null; node = node.hierarchy.parent)
                if (claims.TryGetValue(node, out var set) && set.Contains(className)) return node;
            return null;
        }

        /// <summary>Owned elements carrying <paramref name="className"/>, in document order.</summary>
        public static List<VisualElement> Find(VisualElement host, string className)
        {
            return host.Query<VisualElement>(className: className).ToList()
                .Where(e => e != host && Owner(e, className) == host).ToList();
        }

        public static string Key(VisualElement element) => (element as IKeyedPart)?.Value;
    }
}
