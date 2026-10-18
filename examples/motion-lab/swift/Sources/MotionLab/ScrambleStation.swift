import SwiftUI

import DsSwiftUI

/// Per-character symbol swap: the lane renders one Text per character with
/// stable index identity, cycles each through a symbol pool at
/// `motion.duration.short1` with per-character offsets of
/// `motion.stagger.xs`, then settles.
struct ScrambleStation: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var display: [Character] = Array(Self.phrase)
    @State private var task: Task<Void, Never>?

    nonisolated static let phrase = "TOKENS DRIVE MOTION"
    nonisolated static let pool: [Character] = Array("!<>-_\\/[]{}—=+*^?#")

    private let cadence = FsdsMotionTokens.Duration.short1
    private let stagger = FsdsMotionTokens.Stagger.xs

    private var tokensLine: String {
        "motion.duration.short1 = \(Int(cadence * 1000))ms per swap · "
            + "motion.stagger.xs = \(Int(stagger * 1000))ms per character"
    }

    var body: some View {
        StationShell(
            title: "3 · Scramble — per-character symbol swap",
            detail: "Stable per-index character slots cycle through a symbol pool and settle back to the phrase.",
            tokensLine: tokensLine
        ) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 2) {
                    ForEach(Array(display.enumerated()), id: \.offset) { _, character in
                        Text(String(character))
                            .font(.system(size: 22, weight: .semibold, design: .monospaced))
                            .frame(minWidth: 14)
                    }
                }
                FsdsButton(onTap: scramble) {
                    Text("Scramble")
                }
            }
        }
    }

    private func scramble() {
        task?.cancel()
        guard !reduceMotion else {
            display = Array(Self.phrase)
            return
        }
        let cadence = self.cadence
        let stagger = self.stagger
        task = Task {
            let originals = Array(Self.phrase)
            await withTaskGroup(of: Void.self) { group in
                for (index, original) in originals.enumerated() {
                    group.addTask {
                        try? await Task.sleep(for: .seconds(Double(index) * stagger))
                        for _ in 0..<4 {
                            if Task.isCancelled { return }
                            let symbol = Self.pool.randomElement() ?? original
                            await MainActor.run { display[index] = symbol }
                            try? await Task.sleep(for: .seconds(cadence))
                        }
                        await MainActor.run { display[index] = original }
                    }
                }
            }
        }
    }
}
