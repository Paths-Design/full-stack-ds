using System;
using UnityEngine.UIElements;

namespace FullStackDS
{
    /// <summary>Motion-loop behavior: rotates the declared target through the
    /// declared full-turn loop on its declared period with the declared easing.
    /// Reduced motion is an explicit consumer preference: when requested the
    /// target holds the authored static value. OS preference integration, loop
    /// delay/inline behaviour and native arc rendering are not realised.</summary>
    public sealed class MotionLoopControl
    {
        private readonly VisualElement target;
        private readonly int durationMs;
        private readonly float multiplier;
        private readonly float[] easing;
        private readonly float reducedValue;
        private float elapsedMs;
        private bool reducedMotion;

        private MotionLoopControl(VisualElement target, int durationMs, float multiplier, float[] easing, float reducedValue)
        {
            this.target = target ?? throw new ArgumentNullException(nameof(target));
            this.durationMs = durationMs;
            this.multiplier = multiplier;
            this.easing = easing is { Length: 4 } ? easing : new[] { 0f, 0f, 1f, 1f };
            this.reducedValue = reducedValue;
            target.schedule.Execute(Tick).Every(16);
            Apply(0f);
        }

        public static MotionLoopControl Attach(VisualElement target, int durationMs, float multiplier, float[] easing, float reducedValue)
            => new MotionLoopControl(target, durationMs, multiplier, easing, reducedValue);

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
            var duration = durationMs * Math.Max(0.0001f, multiplier);
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
