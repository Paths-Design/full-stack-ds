using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Navigation-tree behavior: the heading link and label are the two
    /// polarities of one page link — the label shows while there is no href and the
    /// link shows once one is set. Both texts are painted here and the link raises
    /// activation requests through its own control. Glyph composition, browser
    /// navigation and current-page state are not realised.</summary>
    public sealed class NavTreeControl
    {
        private readonly Label link;
        private readonly Label label;
        private string href = "";
        private string text = "";
        public LinkControl Link { get; }

        private NavTreeControl(Label link, Label label)
        {
            this.link = link ?? throw new System.ArgumentNullException(nameof(link));
            this.label = label ?? throw new System.ArgumentNullException(nameof(label));
            Link = LinkControl.Attach(link);
            Apply();
        }

        public static NavTreeControl Attach(Label link, Label label) => new NavTreeControl(link, label);

        public string Href
        {
            get => href;
            set
            {
                href = value ?? "";
                Link.Href = href;
                Apply();
            }
        }

        public string Label
        {
            get => text;
            set
            {
                text = value ?? "";
                link.text = text;
                label.text = text;
            }
        }

        private void Apply()
        {
            var linked = !string.IsNullOrEmpty(href);
            link.style.display = linked ? DisplayStyle.Flex : DisplayStyle.None;
            label.style.display = linked ? DisplayStyle.None : DisplayStyle.Flex;
        }
    }
}
