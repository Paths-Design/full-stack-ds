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

    /// <summary>Root modifier classes for variant-axis props:
    /// <c>&lt;cssPrefix&gt;--&lt;axis&gt;-&lt;value&gt;</c>. The root's class list is the
    /// single record of the current value.</summary>
    public static class Variants
    {
        public static string Get(VisualElement root, string modifier)
        {
            foreach (var name in root.GetClasses())
                if (name.StartsWith(modifier, StringComparison.Ordinal)) return name.Substring(modifier.Length);
            return null;
        }

        public static void Set(VisualElement root, string modifier, string value, params string[] allowed)
        {
            if (value == null || Array.IndexOf(allowed, value) < 0)
                throw new ArgumentException($"{modifier}: expected one of {string.Join(", ", allowed)}, got {value ?? "null"}.");
            var previous = Get(root, modifier);
            if (previous == value) return;
            if (previous != null) root.RemoveFromClassList(modifier + previous);
            root.AddToClassList(modifier + value);
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
