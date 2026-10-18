import SwiftUI

import DsSwiftUI

/// Exclusive channel takeover: the DS skeleton loop writer is disabled
/// through the component's public `animate: .none` argument, and the
/// consumer owns the opacity channel — pulsing three skeleton hosts on
/// `motion.easing.continuous` at `motion.duration.medium`, staggered by
/// `motion.stagger.md`.
struct PartTakeoverStation: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var dimmed = false

    private let duration = FsdsMotionTokens.Duration.medium
    private let curve = FsdsMotionTokens.Easing.continuous
    private let stagger = FsdsMotionTokens.Stagger.md

    private var tokensLine: String {
        "motion.duration.medium = \(Int(duration * 1000))ms · "
            + "motion.stagger.md = \(Int(stagger * 1000))ms · "
            + "motion.easing.continuous = cubic-bezier(\(curve.x1), \(curve.y1), \(curve.x2), \(curve.y2))"
    }

    var body: some View {
        StationShell(
            title: "4 · Part takeover — one channel, exclusively owned",
            detail: "Skeleton shimmer is switched off via the public animate argument; the consumer pulses the hosts.",
            tokensLine: tokensLine
        ) {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(0..<3, id: \.self) { index in
                    Skeleton(variant: .text, animate: .none) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(.quaternary)
                            .frame(width: 240, height: 12)
                    }
                    .opacity(dimmed ? 0.45 : 1)
                    .animation(
                        reduceMotion ? nil : fsdsAnimation(curve, duration)
                            .repeatForever()
                            .delay(Double(index) * stagger),
                        value: dimmed
                    )
                }
            }
        }
        .onAppear {
            guard !reduceMotion else { return }
            dimmed.toggle()
        }
    }
}
