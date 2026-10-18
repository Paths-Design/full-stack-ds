// Motion-lab native lane — SwiftUI realization of the motion-lab spec.
//
// Every animated duration, easing curve, and stagger interval comes from
// FsdsMotionTokens (generated from the committed token graph — the same
// facts the web lanes read as CSS custom properties). No timing literals
// live in this file. Reduced motion is honored through SwiftUI's own
// accessibility environment.
import SwiftUI

import DsSwiftUI

/// Map a token-resolved bezier curve onto SwiftUI's native timing-curve
/// animation — the platform's exact cubic-bézier entry point.
func fsdsAnimation(_ curve: FsdsMotionCurve, _ duration: Double) -> Animation {
    .timingCurve(curve.x1, curve.y1, curve.x2, curve.y2, duration: duration)
}

struct StationShell<Content: View>: View {
    let title: String
    let detail: String
    let tokensLine: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
            Text(detail)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(tokensLine)
                .font(.system(size: 10, design: .monospaced))
                .padding(8)
                .background(.quaternary.opacity(0.35), in: RoundedRectangle(cornerRadius: 6))
            content
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(.background, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.quaternary))
    }
}

@main
struct MotionLabApp: App {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some Scene {
        WindowGroup {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("FSDS Motion Lab — SwiftUI")
                            .font(.title)
                        Text(
                            "Consumer-side proof: every effect is driven by platform-native animation against "
                                + "the DsSwiftUI public API, timed entirely by token constants generated from the "
                                + "committed token graph. Reduce Motion: \(reduceMotion ? "on — effects settle statically" : "off")."
                        )
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                    EntranceStation()
                    StaggerStation()
                    ScrambleStation()
                    PartTakeoverStation()
                    GlyphLoopStation()
                }
                .padding(24)
                .frame(maxWidth: 880)
            }
        }
    }
}
