using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Slide-sequence behavior: owns the numeric index channel over the
    /// declared slide labels, builds rotation/previous/next controls, switches the
    /// viewport children by visibility, wraps index navigation, advances on the
    /// declared autoplay dwell and stops rotation when focus enters. The picker
    /// composition, transitions and message-derived labels are not realised; the
    /// control labels stay consumer-authored.</summary>
    public sealed class SequenceControl
    {
        private readonly VisualElement host;
        private readonly VisualElement viewport;
        private readonly UnityEngine.UIElements.Button rotationButton;
        private readonly UnityEngine.UIElements.Button previousButton;
        private readonly UnityEngine.UIElements.Button nextButton;
        private string[] items = Array.Empty<string>();
        private int index;
        private int defaultIndex;
        private bool indexExplicit;
        private bool autoPlay;
        private int duration;
        private bool focusStopped;
        private bool playing;
        private long elapsedMs;
        private bool intervalPredatesBudget;
        internal long SpentMs => elapsedMs;
        public bool Controlled { get; set; }
        public Action<int> IndexChanged;
        public Action<int> IndexRequested;
        private string startLabel = "";
        private string stopLabel = "";
        private string previousLabel = "";
        private string nextLabel = "";
        public string StartLabel { get => startLabel; set { startLabel = value ?? ""; ApplyLabel(); } }
        public string StopLabel { get => stopLabel; set { stopLabel = value ?? ""; ApplyLabel(); } }
        public string PreviousLabel { get => previousLabel; set { previousLabel = value ?? ""; ApplyLabel(); } }
        public string NextLabel { get => nextLabel; set { nextLabel = value ?? ""; ApplyLabel(); } }

        private SequenceControl(VisualElement host, VisualElement viewport, string prefix)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            this.viewport = viewport ?? throw new ArgumentNullException(nameof(viewport));
            prefix ??= "";
            rotationButton = new UnityEngine.UIElements.Button();
            rotationButton.AddToClassList($"{prefix}__rotation");
            previousButton = new UnityEngine.UIElements.Button();
            previousButton.AddToClassList($"{prefix}__previous");
            nextButton = new UnityEngine.UIElements.Button();
            nextButton.AddToClassList($"{prefix}__next");
            var controls = new VisualElement();
            controls.AddToClassList($"{prefix}__controls");
            controls.Add(previousButton);
            controls.Add(nextButton);
            host.Insert(0, rotationButton);
            host.Add(controls);
            rotationButton.clicked += ToggleRotation;
            previousButton.clicked += () => Request(index - 1);
            nextButton.clicked += () => Request(index + 1);
            host.RegisterCallback<FocusInEvent>(_ => StopRotation());
            host.schedule.Execute(state => Tick(state.deltaTime)).Every(50);
            Apply();
        }

        public static SequenceControl Attach(VisualElement host, VisualElement viewport, string prefix)
            => new SequenceControl(host, viewport, prefix);

        public string[] Items
        {
            get => items;
            set
            {
                items = value ?? Array.Empty<string>();
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
                defaultIndex = value;
                if (!indexExplicit)
                {
                    index = Bound(value);
                    Apply();
                }
            }
        }

        public bool AutoPlay
        {
            get => autoPlay;
            set
            {
                autoPlay = value;
                playing = autoPlay && !focusStopped;
                intervalPredatesBudget = true;
                Apply();
            }
        }

        public int Duration
        {
            get => duration;
            set
            {
                duration = value;
                elapsedMs = 0;
                intervalPredatesBudget = true;
                Apply();
            }
        }

        private int MaxIndex => items.Length > 0 ? items.Length - 1 : 0;

        private int Bound(int value) => Math.Clamp(value, 0, MaxIndex);

        private void StopRotation()
        {
            focusStopped = true;
            playing = false;
            ApplyLabel();
        }

        private void ToggleRotation()
        {
            focusStopped = false;
            playing = !playing;
            intervalPredatesBudget = true;
            ApplyLabel();
        }

        /// <summary>Spends elapsed milliseconds from the slide's reading budget. Duration is time rather than a
        /// count of ticks, so a slow frame cannot stretch a dwell, and one exhausted budget advances one slide
        /// however late it was noticed: the excess is not charged to the incoming slide. The interval in progress
        /// when rotation starts or the budget resets began before that reading time, so it spends nothing; a dwell
        /// can run up to one interval long but never short.</summary>
        internal void Tick(long elapsed)
        {
            var predatesBudget = intervalPredatesBudget;
            intervalPredatesBudget = false;
            if (predatesBudget || !playing || duration <= 0 || items.Length <= 1) return;
            elapsedMs += elapsed;
            if (elapsedMs < duration) return;
            elapsedMs = 0;
            Request(index + 1);
        }

        private void Request(int next)
        {
            if (items.Length <= 1) return;
            var wrapped = ((next % items.Length) + items.Length) % items.Length;
            if (wrapped == index) return;
            if (Controlled)
            {
                Apply();
                IndexRequested?.Invoke(wrapped);
                return;
            }
            index = wrapped;
            indexExplicit = true;
            Apply();
            IndexChanged?.Invoke(index);
        }

        private void Apply()
        {
            index = Bound(index);
            for (var i = 0; i < viewport.childCount; i++)
                viewport[i].style.display = i == index ? DisplayStyle.Flex : DisplayStyle.None;
            previousButton.SetEnabled(items.Length > 1);
            nextButton.SetEnabled(items.Length > 1);
            ApplyLabel();
        }

        private void ApplyLabel()
        {
            rotationButton.text = playing ? stopLabel : startLabel;
            previousButton.text = previousLabel;
            nextButton.text = nextLabel;
        }
    }
}
