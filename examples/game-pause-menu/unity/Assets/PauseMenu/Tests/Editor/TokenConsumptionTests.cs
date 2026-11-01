using System.Linq;
using FullStackDS;
using NUnit.Framework;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace GamePauseMenu.Tests
{
    /// <summary>Token-consumption witness: the parity panel does not set its surface inline;
    /// its background resolves from the generated Card token variable through the Orion brand
    /// scope, and follows that scope when the theme changes. This is the runtime check behind
    /// scripts/game-pause-token-consumption.mjs.</summary>
    public sealed class TokenConsumptionTests
    {
        [UnityTest]
        public System.Collections.IEnumerator PanelSurfaceResolvesThroughTheOrionBrandTokenChannel()
        {
            using var host = new TestHost();
            yield return null;
            yield return null;

            var layout = host.App.Layout;
            var panel = host.App.Root.Query<Card>()
                .ToList()
                .FirstOrDefault(card => card.ClassListContains("parity-panel"));
            Assert.That(panel, Is.Not.Null, "the mounted app must contain a generated Card with the parity-panel class");

            // Dark Orion scope: the Card consumer reads the token variable set by the lane
            // class, which itself reads the brand-scope semantic token.
            Assert.That(panel.resolvedStyle.backgroundColor,
                Is.EqualTo(layout.Color(layout.Panels.Background)),
                "panel background must resolve to the Orion dark background.secondary token");
            Assert.That(panel.resolvedStyle.borderTopColor,
                Is.EqualTo(layout.Color(layout.Panels.Border)),
                "panel border must resolve to the Orion dark border.subtle token");

            // Light Orion scope: no inline colour changes, so a different value proves the
            // rendered surface really is sourced from the token scope rather than a literal.
            Theme.SetDark(host.App.Root, false);
            yield return null;
            yield return null;
            Assert.That(panel.resolvedStyle.backgroundColor,
                Is.EqualTo(layout.Color("paper")),
                "panel background must follow the Orion light background.secondary token when the scope flips");
        }
    }
}
