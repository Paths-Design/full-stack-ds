import SwiftUI

import DsSwiftUI

/// Repeated instances: six badges reveal with a per-item offset of
/// `motion.stagger.sm` and `motion.easing.quick-enter` at
/// `motion.duration.short2`.
struct StaggerStation: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    private static let intents: [BadgeIntent] = [.info, .success, .warning, .danger, .info, .success]

    private let duration = FsdsMotionTokens.Duration.short2
    private let curve = FsdsMotionTokens.Easing.quickEnter
    private let stagger = FsdsMotionTokens.Stagger.sm

    private var tokensLine: String {
        "motion.duration.short2 = \(Int(duration * 1000))ms · "
            + "motion.stagger.sm = \(Int(stagger * 1000))ms · "
            + "motion.easing.quick-enter = cubic-bezier(\(curve.x1), \(curve.y1), \(curve.x2), \(curve.y2))"
    }

    var body: some View {
        StationShell(
            title: "2 · Stagger — repeated instances",
            detail: "Each badge animates on the same token curve, delayed by its index times the token stagger.",
            tokensLine: tokensLine
        ) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    ForEach(Array(Self.intents.enumerated()), id: \.offset) { index, intent in
                        Badge(intent: intent) {
                            Text("item \(index + 1)")
                        }
                        .opacity(shown ? 1 : 0)
                        .offset(y: shown ? 0 : 14)
                        .scaleEffect(shown ? 1 : 0.9)
                        .animation(
                            reduceMotion ? nil : fsdsAnimation(curve, duration).delay(Double(index) * stagger),
                            value: shown
                        )
                    }
                }
                FsdsButton(onTap: { shown.toggle() }) {
                    Text("Replay")
                }
            }
        }
        .onAppear { shown = true }
    }
}
