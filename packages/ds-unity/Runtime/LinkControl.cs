using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Anchor behavior: carries the declared destination metadata and
    /// raises an activation request when the host is clicked while enabled. The
    /// runtime never navigates and models no visited state; the consumer decides
    /// what activation means.</summary>
    public sealed class LinkControl
    {
        private readonly VisualElement host;
        private string href = "";
        private string target = "";
        private string rel = "";
        public string Href { get => href; set => href = value ?? ""; }
        public string Target { get => target; set => target = value ?? ""; }
        public string Rel { get => rel; set => rel = value ?? ""; }
        public event Action<string> Activated;

        private LinkControl(VisualElement host)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            host.RegisterCallback<ClickEvent>(_ =>
            {
                if (!host.enabledSelf) return;
                Activated?.Invoke(href);
            });
        }

        public static LinkControl Attach(VisualElement host) => new LinkControl(host);
    }
}
