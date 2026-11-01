using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Motion-loop behavior: rotates the declared target through the
    /// declared full-turn loop on its declared period with the declared easing.
    /// Reduced motion is an explicit consumer preference: when requested the
    /// target holds the authored static value. OS preference integration, loop
    /// delay/inline behaviour and assistive-technology exposure are not realised.</summary>
    public sealed class MotionLoopControl
    {
        private readonly VisualElement host;
        private readonly VisualElement target;
        private readonly int durationMs;
        private readonly float multiplier;
        private readonly float[] easing;
        private readonly float reducedValue;
        private readonly string[] sizeNames;
        private readonly float[] sizePixels;
        private string size = string.Empty;
        private float elapsedMs;
        private bool reducedMotion;

        private MotionLoopControl(VisualElement host, VisualElement target, int durationMs, float multiplier, float[] easing, float reducedValue, string[] sizeNames, float[] sizePixels)
        {
            this.host = host ?? throw new ArgumentNullException(nameof(host));
            this.target = target ?? throw new ArgumentNullException(nameof(target));
            this.durationMs = durationMs;
            this.multiplier = multiplier;
            this.easing = easing is { Length: 4 } ? easing : new[] { 0f, 0f, 1f, 1f };
            this.reducedValue = reducedValue;
            this.sizeNames = sizeNames ?? throw new ArgumentNullException(nameof(sizeNames));
            this.sizePixels = sizePixels ?? throw new ArgumentNullException(nameof(sizePixels));
            if (sizeNames.Length == 0 || sizeNames.Length != sizePixels.Length) throw new ArgumentException("Loop visual size carriers must align.");
            host.RegisterCallback<AttachToPanelEvent>(_ => RefreshSize());
            RefreshSize();
            target.schedule.Execute(Tick).Every(16);
            Apply(0f);
        }

        public static MotionLoopControl Attach(VisualElement host, VisualElement target, int durationMs, float multiplier, float[] easing, float reducedValue, string[] sizeNames, float[] sizePixels)
            => new MotionLoopControl(host, target, durationMs, multiplier, easing, reducedValue, sizeNames, sizePixels);

        public string Size
        {
            get => size;
            set { size = value ?? string.Empty; RefreshSize(); }
        }

        private void RefreshSize()
        {
            var index = Array.IndexOf(sizeNames, size);
            if (!string.IsNullOrEmpty(size) && index < 0) throw new ArgumentOutOfRangeException(nameof(Size), size, "Unknown loop visual size.");
            var pixels = index >= 0 ? sizePixels[index] : host.resolvedStyle.fontSize;
            if (pixels <= 0f) pixels = 16f;
            target.style.width = pixels;
            target.style.height = pixels;
        }

        public bool ReducedMotion
        {
            get => reducedMotion;
            set
            {
                reducedMotion = value;
                if (value) Apply(reducedValue);
            }
        }

        private void Tick()
        {
            if (reducedMotion || durationMs <= 0) return;
            elapsedMs += 16f * Math.Max(0f, multiplier);
            var duration = durationMs;
            var progress = ((elapsedMs % duration) + duration) % duration / duration;
            Apply(360f * Ease(progress));
        }

        private void Apply(float angle)
        {
            target.style.rotate = new Rotate(new Angle(angle));
        }

        private float Ease(float time)
        {
            var x1 = easing[0];
            var y1 = easing[1];
            var x2 = easing[2];
            var y2 = easing[3];
            if (x1 == y1 && x2 == y2) return time;
            float Sample(float t, float a, float b) => 3f * (1f - t) * (1f - t) * t * a + 3f * (1f - t) * t * t * b + t * t * t;
            var low = 0f;
            var high = 1f;
            for (var i = 0; i < 20; i++)
            {
                var mid = (low + high) * 0.5f;
                if (Sample(mid, x1, x2) < time) low = mid;
                else high = mid;
            }
            return Sample((low + high) * 0.5f, y1, y2);
        }
    }
}
