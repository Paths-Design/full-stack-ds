// Generated from ComponentIR. Regenerate with pnpm run generate:unity.
using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    [UxmlElement]
    public partial class Postcard : VisualElement
    {
        public VisualElement Header { get; } = new VisualElement();
        public VisualElement UserInfo { get; } = new VisualElement();
        public Label DisplayName { get; } = new Label();
        public Label Handle { get; } = new Label();
        public Label TimestampControl { get; } = new Label();
        public VisualElement Content { get; } = new VisualElement();
        public VisualElement Footer { get; } = new VisualElement();
        public VisualElement Stats { get; } = new VisualElement();
        public Label Stat { get; } = new Label();
        public override VisualElement contentContainer => Content;
        [UxmlAttribute] public string AuthorName { get => DisplayName.text; set { DisplayName.text = value ?? ""; } }
        [UxmlAttribute] public string AuthorHandle { get => Handle.text; set { Handle.text = value ?? ""; } }
        [UxmlAttribute] public string Timestamp { get => TimestampControl.text; set { TimestampControl.text = value ?? ""; } }
        [UxmlAttribute] public string StatsLikes { get => Stat.text; set { Stat.text = value ?? ""; } }
        public Postcard()
        {
            name = "root";
            AddToClassList("postcard");
            Header.name = "header";
            Header.AddToClassList("postcard__header");
            hierarchy.Add(Header);
            UserInfo.name = "userInfo";
            UserInfo.AddToClassList("postcard__userInfo");
            Header.Add(UserInfo);
            DisplayName.name = "displayName";
            DisplayName.AddToClassList("postcard__displayName");
            UserInfo.Add(DisplayName);
            Handle.name = "handle";
            Handle.AddToClassList("postcard__handle");
            UserInfo.Add(Handle);
            TimestampControl.name = "timestamp";
            TimestampControl.AddToClassList("postcard__timestamp");
            Header.Add(TimestampControl);
            Content.name = "content";
            Content.AddToClassList("postcard__content");
            hierarchy.Add(Content);
            Footer.name = "footer";
            Footer.AddToClassList("postcard__footer");
            hierarchy.Add(Footer);
            Stats.name = "stats";
            Stats.AddToClassList("postcard__stats");
            Footer.Add(Stats);
            Stat.name = "stat";
            Stat.AddToClassList("postcard__stat");
            Stats.Add(Stat);
            Gap.Attach(this);
            Gap.Attach(Header);
            Gap.Attach(Content);
            Gap.Attach(Footer);
            Gap.Attach(Stats);
            Theme.AddStyleSheet(this);
        }
    }
}
