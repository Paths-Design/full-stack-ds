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
        public Label Stat2 { get; } = new Label();
        public Label Stat3 { get; } = new Label();
        public override VisualElement contentContainer => Content;
        [UxmlAttribute] public string AuthorName { get => DisplayName.text; set { DisplayName.text = value ?? ""; } }
        [UxmlAttribute] public string AuthorHandle { get => Handle.text; set { Handle.text = value ?? ""; } }
        [UxmlAttribute] public string Timestamp { get => TimestampControl.text; set { TimestampControl.text = value ?? ""; } }
        private string textValue1 = "";
        [UxmlAttribute] public string StatsLikes { get => textValue1; set { textValue1 = value ?? ""; Stat.text = "Likes: {count}".Replace("{count}", textValue1); } }
        private string textValue2 = "";
        [UxmlAttribute] public string StatsReplies { get => textValue2; set { textValue2 = value ?? ""; Stat2.text = "Replies: {count}".Replace("{count}", textValue2); } }
        private string textValue3 = "";
        [UxmlAttribute] public string StatsReposts { get => textValue3; set { textValue3 = value ?? ""; Stat3.text = "Reposts: {count}".Replace("{count}", textValue3); } }
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
            Stat.text = "Likes: ";
            Stats.Add(Stat);
            Stat2.name = "stat";
            Stat2.AddToClassList("postcard__stat");
            Stat2.text = "Replies: ";
            Stats.Add(Stat2);
            Stat3.name = "stat";
            Stat3.AddToClassList("postcard__stat");
            Stat3.text = "Reposts: ";
            Stats.Add(Stat3);
            Gap.Attach(this);
            Gap.Attach(Header);
            Gap.Attach(UserInfo);
            Gap.Attach(Content);
            Gap.Attach(Footer);
            Gap.Attach(Stats);
            Theme.AddStyleSheet(this);
        }
    }
}
