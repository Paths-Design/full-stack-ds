using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>The generated stylesheet and its theme scope. The sheet's token section
    /// declares every token variable on <c>.fsds-theme</c> (light), on
    /// <c>.fsds-theme.fsds-theme--dark</c>, and per brand on <c>.fsds-theme.fsds-brand-&lt;name&gt;</c>
    /// (with a dark variant). Token variables inherit, so one element carrying <c>fsds-theme</c>
    /// is the theme scope for its subtree: call <see cref="Attach"/>, <see cref="SetDark"/> or
    /// <see cref="SetBrand"/> on a consumer container.
    ///
    /// Controls load the stylesheet onto their own root but do not open a theme scope there,
    /// so an ancestor's dark or brand classes reach them. A control outside any scope uses the
    /// light, default-brand fallbacks the sheet carries in every <c>var()</c>. Floating content
    /// leaves its document tree, so it opens its own scope and mirrors the theme and brand of the
    /// scope its originating control sits in (see <see cref="Follow"/>).</summary>
    public static class Theme
    {
        public const string ScopeClass = "fsds-theme";
        public const string DarkClass = "fsds-theme--dark";
        public const string BrandClassPrefix = "fsds-brand-";

        private static StyleSheet controls;
        // Floating elements and the control whose theme scope they mirror. Weak, so a
        // discarded control and its content are not kept alive by the registry.
        private static readonly List<(WeakReference<VisualElement> follower, WeakReference<VisualElement> leader)> followers =
            new List<(WeakReference<VisualElement>, WeakReference<VisualElement>)>();

        /// <summary>Adds the generated stylesheet to <paramref name="element"/> without opening a theme scope.</summary>
        public static void AddStyleSheet(VisualElement element)
        {
            if (controls == null) controls = Resources.Load<StyleSheet>("FullStackDS/Controls");
            if (controls == null) throw new InvalidOperationException("Full Stack DS stylesheet is missing from the imported package.");
            if (!element.styleSheets.Contains(controls)) element.styleSheets.Add(controls);
        }

        /// <summary>Adds the stylesheet and makes <paramref name="root"/> a theme scope (light, default brand
        /// unless <see cref="SetDark"/> or <see cref="SetBrand"/> say otherwise).</summary>
        public static void Attach(VisualElement root)
        {
            AddStyleSheet(root);
            root.AddToClassList(ScopeClass);
        }

        /// <summary>Attaches <paramref name="root"/> as a theme scope and selects the dark (true) or light
        /// (false) token values for its subtree and for content floating from controls inside it.</summary>
        public static void SetDark(VisualElement root, bool dark)
        {
            if (root == null) throw new ArgumentNullException(nameof(root));
            Attach(root);
            root.EnableInClassList(DarkClass, dark);
            RefreshFollowers();
        }

        /// <summary>Attaches <paramref name="root"/> as a theme scope and replaces its brand class with
        /// <c>fsds-brand-&lt;brand&gt;</c>; null or empty selects the default brand. The brand is not
        /// validated: a name the generated sheet does not declare matches no rule, so the default
        /// brand's values apply (the same result as null).</summary>
        public static void SetBrand(VisualElement root, string brand)
        {
            if (root == null) throw new ArgumentNullException(nameof(root));
            Attach(root);
            foreach (var name in root.GetClasses().Where(c => c.StartsWith(BrandClassPrefix, StringComparison.Ordinal)).ToList())
                root.RemoveFromClassList(name);
            if (!string.IsNullOrEmpty(brand)) root.AddToClassList(BrandClassPrefix + brand);
            RefreshFollowers();
        }

        /// <summary>Makes <paramref name="follower"/> (an element floating outside the tree of
        /// <paramref name="leader"/>) its own theme scope and keeps its dark and brand classes equal
        /// to those of the nearest scope enclosing <paramref name="leader"/>. Call <see cref="Mirror"/>
        /// after re-parenting; <see cref="SetDark"/> and <see cref="SetBrand"/> refresh every follower.</summary>
        public static void Follow(VisualElement follower, VisualElement leader)
        {
            if (follower == null) throw new ArgumentNullException(nameof(follower));
            if (leader == null) throw new ArgumentNullException(nameof(leader));
            followers.RemoveAll(entry => !entry.follower.TryGetTarget(out var f) || f == follower);
            followers.Add((new WeakReference<VisualElement>(follower), new WeakReference<VisualElement>(leader)));
            Attach(follower);
            Mirror(follower, leader);
        }

        /// <summary>Copies the dark and brand classes of the nearest scope enclosing <paramref name="leader"/>
        /// (light, default brand when there is none) onto <paramref name="follower"/>.</summary>
        public static void Mirror(VisualElement follower, VisualElement leader)
        {
            VisualElement scope = null;
            for (var node = leader; node != null; node = node.hierarchy.parent)
                if (node != follower && node.ClassListContains(ScopeClass)) { scope = node; break; }
            follower.EnableInClassList(DarkClass, scope != null && scope.ClassListContains(DarkClass));
            var wanted = scope == null ? new List<string>() : scope.GetClasses().Where(c => c.StartsWith(BrandClassPrefix, StringComparison.Ordinal)).ToList();
            foreach (var name in follower.GetClasses().Where(c => c.StartsWith(BrandClassPrefix, StringComparison.Ordinal) && !wanted.Contains(c)).ToList())
                follower.RemoveFromClassList(name);
            foreach (var name in wanted) follower.AddToClassList(name);
        }

        private static void RefreshFollowers()
        {
            followers.RemoveAll(entry => !entry.follower.TryGetTarget(out _) || !entry.leader.TryGetTarget(out _));
            foreach (var (follower, leader) in followers)
                if (follower.TryGetTarget(out var f) && leader.TryGetTarget(out var l)) Mirror(f, l);
        }
    }
}
