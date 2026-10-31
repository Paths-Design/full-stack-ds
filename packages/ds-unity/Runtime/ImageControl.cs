using UnityEngine;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Media behavior for the generated native Image element: the declared
    /// source string is interpreted as a Resources-relative texture asset and loaded
    /// into the host's image property. Clearing the source clears the texture. No URL
    /// fetching, alternative-text semantics or responsive source selection is
    /// realised; the runtime never reaches outside the Resources store.</summary>
    public sealed class ImageControl
    {
        private readonly UnityEngine.UIElements.Image host;
        private string src = "";
        public string Src
        {
            get => src;
            set
            {
                src = value ?? "";
                host.image = string.IsNullOrEmpty(src) ? null : Resources.Load<Texture>(src);
            }
        }

        private ImageControl(UnityEngine.UIElements.Image host)
        {
            this.host = host ?? throw new System.ArgumentNullException(nameof(host));
        }

        public static ImageControl Attach(UnityEngine.UIElements.Image host) => new ImageControl(host);
    }
}
