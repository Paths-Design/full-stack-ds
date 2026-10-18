import SwiftUI

import DsSwiftUI

/// Whole-component entrance: an FSDS Card composes in with opacity + rise +
/// scale on `motion.duration.medium2` / `motion.easing.soft-enter`.
struct EntranceStation: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    private let curve = FsdsMotionTokens.Easing.softEnter
    private let duration = FsdsMotionTokens.Duration.medium2

    private var tokensLine: String {
        "motion.duration.medium2 = \(Int(duration * 1000))ms · "
            + "motion.easing.soft-enter = cubic-bezier(\(curve.x1), \(curve.y1), \(curve.x2), \(curve.y2))"
    }

    var body: some View {
        StationShell(
            title: "1 · Entrance — whole component",
            detail: "An FSDS Card composes in with opacity + rise + scale on a token-resolved timing curve.",
            tokensLine: tokensLine
        ) {
            VStack(alignment: .leading, spacing: 12) {
                Card(content: {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Token-driven entrance").font(.headline)
                        Text("The card is the animation target; the timing curve is the token graph's, mapped onto Animation.timingCurve.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(4)
                })
                .opacity(shown ? 1 : 0)
                .scaleEffect(shown ? 1 : 0.96)
                .offset(y: shown ? 0 : 24)
                FsdsButton(onTap: replay) {
                    Text("Replay")
                }
            }
        }
        .onAppear {
            guard !reduceMotion else {
                shown = true
                return
            }
            withAnimation(fsdsAnimation(curve, duration)) { shown = true }
        }
    }

    private func replay() {
        guard !reduceMotion else {
            withAnimation(nil) { shown = true }
            return
        }
        withAnimation(nil) { shown = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + FsdsMotionTokens.Duration.instant) {
            withAnimation(fsdsAnimation(curve, duration)) { shown = true }
        }
    }
}
