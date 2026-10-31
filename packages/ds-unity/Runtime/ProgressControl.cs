using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Value-fill behavior: a numeric value drives a decoration element's
    /// native percentage width inside a declared range, and an optional
    /// presence-guarded label is shown only when the show-value flag is set. The
    /// contract declares a plain value prop (no channel), so this exposes no
    /// change event; the host carries the same value as a UXML float attribute.</summary>
    public sealed class ProgressControl
    {
        private readonly double min;
        private readonly double max;
        private double value;
        private bool showValue;
        public VisualElement Host { get; }
        public VisualElement Fill { get; }
        public VisualElement ValueElement { get; }
        public double Min => min;
        public double Max => max;

        private ProgressControl(VisualElement host, VisualElement fill, VisualElement valueElement, double min, double max)
        {
            Host = host ?? throw new ArgumentNullException(nameof(host));
            Fill = fill ?? throw new ArgumentNullException(nameof(fill));
            ValueElement = valueElement;
            this.min = min;
            this.max = max;
            Theme.AddStyleSheet(host);
            ShowValue = false;
            Value = 0;
        }

        public static ProgressControl Attach(VisualElement host, VisualElement fill, VisualElement valueElement, double min, double max)
            => new ProgressControl(host, fill, valueElement, min, max);

        public double Value
        {
            get => value;
            set
            {
                this.value = double.IsNaN(value) ? min : Math.Clamp(value, min, max);
                var fraction = max > min ? (this.value - min) / (max - min) : 0;
                Fill.style.width = Length.Percent((float)(fraction * 100));
            }
        }

        public bool ShowValue
        {
            get => showValue;
            set
            {
                showValue = value;
                if (ValueElement != null) ValueElement.style.display = value ? DisplayStyle.Flex : DisplayStyle.None;
            }
        }
    }
}
