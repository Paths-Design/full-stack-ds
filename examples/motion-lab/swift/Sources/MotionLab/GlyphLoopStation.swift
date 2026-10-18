import SwiftUI

import DsSwiftUI

/// Glyph effects: a whole FSDS Icon rotates forever on `motion.easing.linear`
/// at `motion.duration.medium1`; a second glyph reveals with the token
/// graph's deliberately overshooting `motion.easing.bounce` curve.
///
/// Native boundary note: the SwiftUI Icon renders its glyph through the
/// shared glyph substrate with no public per-path access — the per-path
/// reveal the web lanes demonstrate over SVG internals has no public
/// equivalent here. That gap is a lane finding, not silently skipped scope.
struct GlyphLoopStation: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var rotation: Double = 0
    @State private var revealed = false

    private let loopDuration = FsdsMotionTokens.Duration.medium1
    private let linear = FsdsMotionTokens.Easing.linear
    private let revealDuration = FsdsMotionTokens.Duration.short3
    private let bounce = FsdsMotionTokens.Easing.bounce

    private var tokensLine: String {
        "loop motion.duration.medium1 = \(Int(loopDuration * 1000))ms linear · "
            + "reveal motion.duration.short3 = \(Int(revealDuration * 1000))ms · "
            + "motion.easing.bounce = cubic-bezier(\(bounce.x1), \(bounce.y1), \(bounce.x2), \(bounce.y2))"
    }

    var body: some View {
        StationShell(
            title: "5 · Glyphs — whole-glyph loop, overshoot reveal",
            detail: "Left: forever rotation on the token linear curve. Right: a bounce-curve reveal (y overshoot is authored in the token).",
            tokensLine: tokensLine
        ) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 48) {
                    VStack(spacing: 8) {
                        Icon(name: "arrow-up-down", size: .lg)
                            .rotationEffect(.degrees(rotation))
                        Text("whole-glyph loop").font(.caption2).foregroundStyle(.secondary)
                    }
                    VStack(spacing: 8) {
                        Icon(name: "circle-dot", size: .lg)
                            .opacity(revealed ? 1 : 0)
                            .scaleEffect(revealed ? 1 : 0.55)
                        Text("bounce-curve reveal").font(.caption2).foregroundStyle(.secondary)
                    }
                }
                FsdsButton(onTap: reveal) {
                    Text("Reveal")
                }
            }
        }
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(fsdsAnimation(linear, loopDuration).repeatForever(autoreverses: false)) {
                rotation = 360
            }
        }
    }

    private func reveal() {
        guard !reduceMotion else {
            withAnimation(nil) { revealed = true }
            return
        }
        withAnimation(nil) { revealed = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + FsdsMotionTokens.Duration.instant) {
            withAnimation(fsdsAnimation(bounce, revealDuration)) { revealed = true }
        }
    }
}
