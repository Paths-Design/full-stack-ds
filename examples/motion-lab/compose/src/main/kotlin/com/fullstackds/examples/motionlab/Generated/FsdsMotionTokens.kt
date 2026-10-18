// GENERATED FILE — do not edit by hand.
// Source: packages/ds-tokens/generated/resolved.tokens.json (core.motion.*)
// Regenerate: node examples/motion-lab/tools/gen-native-motion-tokens.mjs
//
// Pure data: durations in milliseconds, easing control points. Mapping onto
// Compose animation types lives in the lane stations.

package com.fullstackds.examples.motionlab

/** Cubic-bézier control points exactly as authored in the FSDS token graph
 * (the same values the web lowers as `--fsds-core-motion-easing-*`). */
data class FsdsMotionCurve(
    val x1: Float,
    val y1: Float,
    val x2: Float,
    val y2: Float,
)

object FsdsMotionTokens {
    object Duration {
        /** instant (100ms) */
        const val Instant: Long = 100L
        /** short1 (50ms) */
        const val Short1: Long = 50L
        /** short2 (83ms) */
        const val Short2: Long = 83L
        /** short3 (167ms) */
        const val Short3: Long = 167L
        /** short (150ms) */
        const val Short: Long = 150L
        /** medium0 (300ms) */
        const val Medium0: Long = 300L
        /** medium1 (250ms) */
        const val Medium1: Long = 250L
        /** medium2 (333ms) */
        const val Medium2: Long = 333L
        /** medium3 (500ms) */
        const val Medium3: Long = 500L
        /** medium (250ms) */
        const val Medium: Long = 250L
        /** long0 (600ms) */
        const val Long0: Long = 600L
        /** long1 (667ms) */
        const val Long1: Long = 667L
        /** long2 (833ms) */
        const val Long2: Long = 833L
        /** long3 (1000ms) */
        const val Long3: Long = 1000L
        /** long (400ms) */
        const val Long: Long = 400L
        /** extra-long1 (1500ms) */
        const val ExtraLong1: Long = 1500L
    }

    object Easing {
        /** standard */
        val Standard = FsdsMotionCurve(0.4f, 0f, 0.2f, 1f)
        /** emphasized-in */
        val EmphasizedIn = FsdsMotionCurve(0.2f, 0f, 0f, 1f)
        /** emphasized-out */
        val EmphasizedOut = FsdsMotionCurve(0.4f, 0f, 0.2f, 1f)
        /** quick-enter */
        val QuickEnter = FsdsMotionCurve(0f, 0f, 0.1f, 1f)
        /** quick-exit */
        val QuickExit = FsdsMotionCurve(1f, 0f, 1f, 1f)
        /** soft-enter */
        val SoftEnter = FsdsMotionCurve(0f, 0f, 0.7f, 1f)
        /** soft-exit */
        val SoftExit = FsdsMotionCurve(0.3f, 0f, 1f, 1f)
        /** continuous */
        val Continuous = FsdsMotionCurve(0.3f, 0f, 0.7f, 1f)
        /** bounce */
        val Bounce = FsdsMotionCurve(0.3f, 0f, 0.1f, 1.25f)
        /** linear */
        val Linear = FsdsMotionCurve(0f, 0f, 1f, 1f)
    }

    object Stagger {
        /** xs (17ms) */
        const val Xs: Long = 17L
        /** sm (30ms) */
        const val Sm: Long = 30L
        /** slow (40ms) */
        const val Slow: Long = 40L
        /** md (60ms) */
        const val Md: Long = 60L
        /** lg (100ms) */
        const val Lg: Long = 100L
    }

    object Dwell {
        /** short (4000ms) */
        const val Short: Long = 4000L
        /** medium (6000ms) */
        const val Medium: Long = 6000L
        /** long (8000ms) */
        const val Long: Long = 8000L
    }

    object Delay {
        /** none (0ms) */
        const val None: Long = 0L
        /** short (50ms) */
        const val Short: Long = 50L
        /** medium (100ms) */
        const val Medium: Long = 100L
        /** long (150ms) */
        const val Long: Long = 150L
    }
}
