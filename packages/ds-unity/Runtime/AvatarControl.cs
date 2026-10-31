using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Avatar behavior: owns the presence of the admitted Image child and
    /// the initials fallback, paints the fallback text and forwards the source to
    /// the media child's own control. Each child is shown when its declared string
    /// prop is non-empty; no a11y label, priority or image-loading state is
    /// realised.</summary>
    public sealed class AvatarControl
    {
        private readonly VisualElement host;
        private readonly FullStackDS.Image image;
        private readonly Label initials;
        private string src = "";
        private string initialsText = "";

        private AvatarControl(VisualElement host, FullStackDS.Image image, Label initials)
        {
            this.host = host ?? throw new System.ArgumentNullException(nameof(host));
            this.image = image ?? throw new System.ArgumentNullException(nameof(image));
            this.initials = initials ?? throw new System.ArgumentNullException(nameof(initials));
            image.style.display = DisplayStyle.None;
            initials.style.display = DisplayStyle.None;
        }

        public static AvatarControl Attach(VisualElement host, FullStackDS.Image image, Label initials)
            => new AvatarControl(host, image, initials);

        public string Src
        {
            get => src;
            set
            {
                src = value ?? "";
                image.Src = src;
                image.style.display = string.IsNullOrEmpty(src) ? DisplayStyle.None : DisplayStyle.Flex;
            }
        }

        public string Initials
        {
            get => initialsText;
            set
            {
                initialsText = value ?? "";
                initials.text = initialsText;
                initials.style.display = string.IsNullOrEmpty(initialsText) ? DisplayStyle.None : DisplayStyle.Flex;
            }
        }
    }
}
