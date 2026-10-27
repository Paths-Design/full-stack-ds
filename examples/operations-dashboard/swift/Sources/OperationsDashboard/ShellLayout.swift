// Responsive shell arithmetic for the operations-dashboard swift lane.
//
// Pure, testable logic behind the responsive shell: the tier thresholds from
// the spec's "Responsive behavior" section, the shell's fixed chrome widths,
// the per-tier queue-pane width derivation, and the queue table's column
// width distribution (squeeze, never drop — no column-priority/visibility API
// exists on the FSDS Table surface; see the lane README findings).
//
// This is app-layer page-frame code (the spec claims the responsive shell for
// the app). It owns no component behavior, state indication, or styling.

import Foundation

/// Responsive tier by window content width (spec: "Responsive behavior").
enum ShellTier: Equatable {
    /// ≥ 1280pt: filter rail + queue + detail in one row.
    case wide
    /// 900–1279pt: queue + detail in one row; filter rail collapsed behind
    /// the Filters toggle.
    case medium
    /// < 900pt: single column (header → filters → queue → detail).
    case narrow

    static func tier(contentWidth: CGFloat) -> ShellTier {
        if contentWidth >= 1280 { return .wide }
        if contentWidth >= 900 { return .medium }
        return .narrow
    }
}

/// Fixed chrome widths and per-tier width derivation for the shell.
enum ShellLayout {
    /// Filter rail column width (wide tier only; spec band 200–300).
    static let railWidth: CGFloat = 264
    /// Detail pane column width (wide/medium tiers; spec band 300–420).
    static let detailWidth: CGFloat = 360
    /// Outer horizontal padding of the body region.
    static let bodyPadding: CGFloat = 16
    /// Spacing between the shell's pane columns.
    static let paneSpacing: CGFloat = 16

    /// Width available to the queue pane's table row at a given tier/width,
    /// derived from the shell's own chrome so the table can distribute
    /// columns without a second geometry pass.
    static func queueContentWidth(tier: ShellTier, shellWidth: CGFloat) -> CGFloat {
        let body = shellWidth - bodyPadding * 2
        switch tier {
        case .wide:
            return body - railWidth - detailWidth - paneSpacing * 2
        case .medium:
            return body - detailWidth - paneSpacing
        case .narrow:
            return body
        }
    }
}

/// Queue table column metrics. Columns have floors; below the floors they
/// squeeze proportionally. A column is never dropped at any tier (spec
/// cross-tier invariant; the package Table exposes no column-priority or
/// visibility API — a recorded finding).
enum QueueColumns {
    static let id: CGFloat = 92
    static let title: CGFloat = 190
    static let service: CGFloat = 130
    static let severity: CGFloat = 84
    static let environment: CGFloat = 56
    static let age: CGFloat = 44
    static let assignee: CGFloat = 90
    static let spacing: CGFloat = 12

    static let columnCount = 7
    static let minimums: [CGFloat] = [id, title, service, severity, environment, age, assignee]

    /// Distribute the row's available width across the seven columns.
    ///
    /// Returns exactly `columnCount` positive widths whose sum (plus
    /// inter-column spacing) equals `available`. When space permits, every
    /// column gets at least its floor and the surplus is shared by the
    /// flexible columns (title ~50%, service ~25%, assignee ~25%, with the
    /// title absorbing rounding). Below the floors, columns squeeze
    /// proportionally so the queue narrows instead of clipping or introducing
    /// horizontal scrolling.
    static func widths(for available: CGFloat) -> [CGFloat] {
        let usable = (available - spacing * CGFloat(columnCount - 1)).rounded(.down)
        guard usable >= CGFloat(columnCount) else {
            // Degenerate (below the minimum window size): keep all seven
            // columns at the smallest positive width rather than dropping.
            return [CGFloat](repeating: 1, count: columnCount)
        }
        let totalMin = minimums.reduce(0, +)
        if usable >= totalMin {
            var widths = minimums.map { $0.rounded(.down) }
            let floorsSum = widths.reduce(0, +)
            var surplus = usable - floorsSum
            let titleShare = (surplus * 0.5).rounded(.down)
            let serviceShare = (surplus * 0.25).rounded(.down)
            let assigneeShare = (surplus * 0.25).rounded(.down)
            widths[1] += titleShare
            widths[2] += serviceShare
            widths[6] += assigneeShare
            surplus -= titleShare + serviceShare + assigneeShare
            widths[1] += surplus // absorb rounding into the title column
            return widths
        }
        let scale = usable / totalMin
        var widths = minimums.map { max(1, ($0 * scale).rounded(.down)) }
        // Repair rounding (and the per-column min-1 floor) so the widths sum
        // exactly to the usable width — the no-clip invariant the queue's
        // layout relies on. Bounded pass; the title absorbs any residual.
        var deficit = usable - widths.reduce(0, +)
        var index = 0
        while deficit != 0, index < columnCount * 4 {
            let i = index % columnCount
            if deficit > 0 {
                widths[i] += 1
                deficit -= 1
            } else if widths[i] > 1 {
                widths[i] -= 1
                deficit += 1
            }
            index += 1
        }
        if deficit > 0 {
            widths[1] += deficit
        }
        return widths
    }
}
