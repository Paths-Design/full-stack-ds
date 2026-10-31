using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Page-navigation behavior: owns the numeric position channel over the
    /// declared page items, builds the declared previous/field/context/commit/next
    /// shell from native controls, commits the one-based draft field as a bounded
    /// zero-based position and bounds previous/next navigation. The composed
    /// Button/Input/Pagination/Icon children, page-choice composition, a11y labels
    /// and message templates are not realised.</summary>
    public sealed class PagedSetControl
    {
        private readonly VisualElement host;
        private readonly UnityEngine.UIElements.Button previousButton;
        private readonly UnityEngine.UIElements.Button nextButton;
        private readonly UnityEngine.UIElements.Button commitButton;
        private readonly UnityEngine.UIElements.TextField input;
        private readonly Label context;
        private readonly string prefix;
        private string[] items = Array.Empty<string>();
        private int count;
        private bool countExplicit;
        private int index;
        private int defaultIndex;
        private bool disabled;
        private bool indexExplicit;
        private string draft = "";
        public bool Controlled { get; set; }
        public Action<int> IndexChanged;
        public Action<int> IndexRequested;

        private PagedSetControl(VisualElement host, string prefix, string previousPart, string nextPart, string commitPart, string fieldPart, string inputPart, string contextPart)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            this.prefix = prefix ?? "";
            previousButton = new UnityEngine.UIElements.Button { text = "\u2039" };
            previousButton.AddToClassList($"{prefix}__{previousPart}");
            nextButton = new UnityEngine.UIElements.Button { text = "\u203A" };
            nextButton.AddToClassList($"{prefix}__{nextPart}");
            var field = new VisualElement();
            field.AddToClassList($"{prefix}__{fieldPart}");
            input = new UnityEngine.UIElements.TextField();
            input.AddToClassList($"{prefix}__{inputPart}");
            field.Add(input);
            context = new Label();
            context.AddToClassList($"{prefix}__{contextPart}");
            commitButton = new UnityEngine.UIElements.Button();
            commitButton.AddToClassList($"{prefix}__{commitPart}");
            host.Add(previousButton);
            host.Add(field);
            host.Add(context);
            host.Add(commitButton);
            host.Add(nextButton);
            previousButton.clicked += () => Request(index - 1);
            nextButton.clicked += () => Request(index + 1);
            commitButton.clicked += CommitDraft;
            input.RegisterValueChangedCallback(evt => draft = evt.newValue ?? "");
            input.RegisterCallback<KeyDownEvent>(evt =>
            {
                if (evt.keyCode != UnityEngine.KeyCode.Return && evt.keyCode != UnityEngine.KeyCode.KeypadEnter) return;
                CommitDraft();
                evt.StopPropagation();
            });
            input.RegisterCallback<FocusOutEvent>(_ => CommitDraft());
            Apply();
        }

        public static PagedSetControl Attach(VisualElement host, string prefix, string previousPart, string nextPart, string commitPart, string fieldPart, string inputPart, string contextPart)
            => new PagedSetControl(host, prefix, previousPart, nextPart, commitPart, fieldPart, inputPart, contextPart);

        public string[] Items
        {
            get => items;
            set
            {
                items = value ?? Array.Empty<string>();
                if (!countExplicit) count = items.Length;
                Apply();
            }
        }

        public int Count
        {
            get => count;
            set
            {
                count = Math.Max(0, value);
                countExplicit = true;
                Apply();
            }
        }

        public bool Disabled
        {
            get => disabled;
            set
            {
                disabled = value;
                Apply();
            }
        }

        public int Index
        {
            get => index;
            set
            {
                indexExplicit = true;
                index = Bound(value);
                Apply();
            }
        }

        public int DefaultIndex
        {
            get => defaultIndex;
            set
            {
                defaultIndex = Bound(value);
                if (!indexExplicit)
                {
                    index = defaultIndex;
                    Apply();
                }
            }
        }

        private int MaxIndex => count > 0 ? count - 1 : 0;

        private int Bound(int value) => Math.Clamp(value, 0, MaxIndex);

        private void Apply()
        {
            input.SetValueWithoutNotify((index + 1).ToString());
            draft = (index + 1).ToString();
            context.text = count.ToString();
            previousButton.SetEnabled(!disabled && index > 0);
            nextButton.SetEnabled(!disabled && index < MaxIndex);
            commitButton.SetEnabled(!disabled);
            input.SetEnabled(!disabled);
        }

        private void CommitDraft()
        {
            if (disabled) return;
            if (!int.TryParse((draft ?? "").Trim(), out var value))
            {
                Apply();
                return;
            }
            Request(value - 1);
        }

        private void Request(int next)
        {
            var bounded = Bound(next);
            if (bounded == index)
            {
                Apply();
                return;
            }
            if (Controlled)
            {
                Apply();
                IndexRequested?.Invoke(bounded);
                return;
            }
            index = bounded;
            indexExplicit = true;
            Apply();
            IndexChanged?.Invoke(index);
        }
    }
}
