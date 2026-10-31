// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Card : VisualElement
    {
        [UxmlAttribute] public string Density { get => Variants.Get(this, "card", "default", "inset"); set { Variants.Set(this, "card", value, "default", "inset"); } }
        public Card()
        {
            name = "root";
            AddToClassList("card");
            Gap.Attach(this);
            Theme.AddStyleSheet(this);
            Density = "default";
        }
    }

    [UxmlElement]
    public partial class CardHeader : VisualElement
    {
        public CardHeader()
        {
            name = "header";
            AddToClassList("card__header");
            Gap.Attach(this);
        }
    }

    [UxmlElement]
    public partial class CardMedia : VisualElement
    {
        public CardMedia()
        {
            name = "media";
            AddToClassList("card__media");
        }
    }

    [UxmlElement]
    public partial class CardContent : VisualElement
    {
        public CardContent()
        {
            name = "content";
            AddToClassList("card__content");
            Gap.Attach(this);
        }
    }

    [UxmlElement]
    public partial class CardFooter : VisualElement
    {
        public CardFooter()
        {
            name = "footer";
            AddToClassList("card__footer");
            Gap.Attach(this);
        }
    }

    [UxmlElement]
    public partial class CardActions : VisualElement
    {
        public CardActions()
        {
            name = "actions";
            AddToClassList("card__actions");
            Gap.Attach(this);
        }
    }

    [UxmlElement]
    public partial class CardBadge : VisualElement
    {
        public CardBadge()
        {
            name = "badge";
            AddToClassList("card__badge");
        }
    }

    [UxmlElement]
    public partial class CardDescription : VisualElement
    {
        public CardDescription()
        {
            name = "description";
            AddToClassList("card__description");
        }
    }

    [UxmlElement]
    public partial class CardLink : VisualElement
    {
        public CardLink()
        {
            name = "link";
            AddToClassList("card__link");
        }
    }

    [UxmlElement]
    public partial class CardNote : VisualElement
    {
        public CardNote()
        {
            name = "note";
            AddToClassList("card__note");
        }
    }
}
