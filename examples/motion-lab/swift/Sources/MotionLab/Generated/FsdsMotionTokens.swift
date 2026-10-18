// GENERATED FILE — do not edit by hand.
// Source: packages/ds-tokens/generated/resolved.tokens.json (core.motion.*)
// Regenerate: node examples/motion-lab/tools/gen-native-motion-tokens.mjs
//
// Pure data: durations in milliseconds, easing control points. Mapping onto
// SwiftUI animation types lives in MotionLabApp.swift.

/// Cubic-bézier control points exactly as authored in the FSDS token graph
/// (the same values the web lowers as `--fsds-core-motion-easing-*`).
public struct FsdsMotionCurve: Sendable {
    public let x1: Double
    public let y1: Double
    public let x2: Double
    public let y2: Double

    public init(x1: Double, y1: Double, x2: Double, y2: Double) {
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
    }
}

public enum FsdsMotionTokens {
    public enum Duration {
        /// instant (100ms)
        public static let instant: Double = 0.1
        /// short1 (50ms)
        public static let short1: Double = 0.05
        /// short2 (83ms)
        public static let short2: Double = 0.083
        /// short3 (167ms)
        public static let short3: Double = 0.167
        /// short (150ms)
        public static let short: Double = 0.15
        /// medium0 (300ms)
        public static let medium0: Double = 0.3
        /// medium1 (250ms)
        public static let medium1: Double = 0.25
        /// medium2 (333ms)
        public static let medium2: Double = 0.333
        /// medium3 (500ms)
        public static let medium3: Double = 0.5
        /// medium (250ms)
        public static let medium: Double = 0.25
        /// long0 (600ms)
        public static let long0: Double = 0.6
        /// long1 (667ms)
        public static let long1: Double = 0.667
        /// long2 (833ms)
        public static let long2: Double = 0.833
        /// long3 (1000ms)
        public static let long3: Double = 1.0
        /// long (400ms)
        public static let long: Double = 0.4
        /// extra-long1 (1500ms)
        public static let extraLong1: Double = 1.5
    }

    public enum Easing {
        /// standard
        public static let standard = FsdsMotionCurve(x1: 0.4, y1: 0, x2: 0.2, y2: 1)
        /// emphasized-in
        public static let emphasizedIn = FsdsMotionCurve(x1: 0.2, y1: 0, x2: 0, y2: 1)
        /// emphasized-out
        public static let emphasizedOut = FsdsMotionCurve(x1: 0.4, y1: 0, x2: 0.2, y2: 1)
        /// quick-enter
        public static let quickEnter = FsdsMotionCurve(x1: 0, y1: 0, x2: 0.1, y2: 1)
        /// quick-exit
        public static let quickExit = FsdsMotionCurve(x1: 1, y1: 0, x2: 1, y2: 1)
        /// soft-enter
        public static let softEnter = FsdsMotionCurve(x1: 0, y1: 0, x2: 0.7, y2: 1)
        /// soft-exit
        public static let softExit = FsdsMotionCurve(x1: 0.3, y1: 0, x2: 1, y2: 1)
        /// continuous
        public static let continuous = FsdsMotionCurve(x1: 0.3, y1: 0, x2: 0.7, y2: 1)
        /// bounce
        public static let bounce = FsdsMotionCurve(x1: 0.3, y1: 0, x2: 0.1, y2: 1.25)
        /// linear
        public static let linear = FsdsMotionCurve(x1: 0, y1: 0, x2: 1, y2: 1)
    }

    public enum Stagger {
        /// xs (17ms)
        public static let xs: Double = 0.017
        /// sm (30ms)
        public static let sm: Double = 0.03
        /// slow (40ms)
        public static let slow: Double = 0.04
        /// md (60ms)
        public static let md: Double = 0.06
        /// lg (100ms)
        public static let lg: Double = 0.1
    }

    public enum Dwell {
        /// short (4000ms)
        public static let short: Double = 4.0
        /// medium (6000ms)
        public static let medium: Double = 6.0
        /// long (8000ms)
        public static let long: Double = 8.0
    }

    public enum Delay {
        /// none (0ms)
        public static let none: Double = 0.0
        /// short (50ms)
        public static let short: Double = 0.05
        /// medium (100ms)
        public static let medium: Double = 0.1
        /// long (150ms)
        public static let long: Double = 0.15
    }
}
