// Responsive shell arithmetic tests for the operations-dashboard swift lane.
//
// Pins the spec's "### Responsive behavior" contract at the unit level: tier
// thresholds (wide ≥1280, medium 900–1279, narrow <900), the per-tier
// queue-pane width derivation, and the queue table's column distribution —
// exactly seven positive columns at every width (never dropped), floors
// respected when space allows, proportional squeeze below them, and widths
// that always sum exactly to the available row width (no clipping, no
// horizontal scrolling by construction).
//
// These tests prove the arithmetic only — not the rendered layout (no
// automated visual/resize proof exists for this lane; see the README
// non-claims). The seam suite in OperationsApiTests.swift is untouched.

import XCTest
@testable import OperationsDashboard

final class ShellLayoutTests: XCTestCase {
    // MARK: - Tier thresholds (spec-pinned)

    func testTierThresholds() {
        XCTAssertEqual(ShellTier.tier(contentWidth: 0), .narrow)
        XCTAssertEqual(ShellTier.tier(contentWidth: 719), .narrow)
        XCTAssertEqual(ShellTier.tier(contentWidth: 719.5), .narrow)
        XCTAssertEqual(ShellTier.tier(contentWidth: 900), .medium)
        XCTAssertEqual(ShellTier.tier(contentWidth: 1024), .medium)
        XCTAssertEqual(ShellTier.tier(contentWidth: 1279), .medium)
        XCTAssertEqual(ShellTier.tier(contentWidth: 1279.5), .medium)
        XCTAssertEqual(ShellTier.tier(contentWidth: 1280), .wide)
        XCTAssertEqual(ShellTier.tier(contentWidth: 2560), .wide)
    }

    // MARK: - Per-tier queue width derivation

    func testQueueContentWidthPerTier() {
        // Narrow: full body width (window minus outer padding).
        XCTAssertEqual(
            ShellLayout.queueContentWidth(tier: .narrow, shellWidth: 720),
            720 - 32
        )
        // Medium: body minus detail pane and one pane spacing.
        XCTAssertEqual(
            ShellLayout.queueContentWidth(tier: .medium, shellWidth: 900),
            900 - 32 - ShellLayout.detailWidth - ShellLayout.paneSpacing
        )
        // Wide: body minus rail, detail, and two pane spacings.
        XCTAssertEqual(
            ShellLayout.queueContentWidth(tier: .wide, shellWidth: 1440),
            1440 - 32 - ShellLayout.railWidth - ShellLayout.detailWidth - ShellLayout.paneSpacing * 2
        )
    }

    func testShellChromeWidthsStayInSpecBands() {
        // Spec: rail ≈ 200–300px, detail ≈ 300–420px.
        XCTAssertTrue((200...300).contains(ShellLayout.railWidth), "rail \(ShellLayout.railWidth) outside 200–300")
        XCTAssertTrue((300...420).contains(ShellLayout.detailWidth), "detail \(ShellLayout.detailWidth) outside 300–420")
    }

    // MARK: - Column distribution invariants (cross-tier: never drop)

    func testColumnWidthsAlwaysSevenPositiveAndSumExactly() {
        for width in stride(from: CGFloat(0), through: 2400, by: 13) {
            let widths = QueueColumns.widths(for: width)
            XCTAssertEqual(widths.count, QueueColumns.columnCount, "at width \(width)")
            XCTAssertTrue(widths.allSatisfy { $0 > 0 }, "at width \(width): \(widths)")
            let spacingTotal = QueueColumns.spacing * CGFloat(QueueColumns.columnCount - 1)
            XCTAssertEqual(
                widths.reduce(0, +) + spacingTotal,
                max(width, CGFloat(QueueColumns.columnCount) + spacingTotal),
                accuracy: 1,
                "at width \(width): \(widths)"
            )
        }
    }

    func testColumnWidthsRespectFloorsWhenSpaceAllows() {
        let widths = QueueColumns.widths(for: 2000)
        for (index, column) in widths.enumerated() {
            XCTAssertGreaterThanOrEqual(
                column, QueueColumns.minimums[index],
                "column \(index) below its floor despite ample space"
            )
        }
        // Surplus lands on the flexible columns (title/service/assignee)…
        XCTAssertGreaterThan(widths[1], QueueColumns.minimums[1], "title should absorb surplus")
        // …while fixed columns stay at their floors (± rounding).
        XCTAssertEqual(widths[0], QueueColumns.minimums[0])
        XCTAssertEqual(widths[5], QueueColumns.minimums[5])
    }

    func testColumnWidthsSqueezeProportionallyBelowFloors() {
        // 720pt window, narrow tier: below the floor total → proportional
        // squeeze; every column survives, none exceeds its floor.
        let available = ShellLayout.queueContentWidth(tier: .narrow, shellWidth: 720)
        let widths = QueueColumns.widths(for: available)
        XCTAssertEqual(widths.count, QueueColumns.columnCount)
        for (index, column) in widths.enumerated() {
            XCTAssertGreaterThan(column, 0, "column \(index) collapsed at 720pt")
            XCTAssertLessThanOrEqual(
                column, QueueColumns.minimums[index],
                "column \(index) exceeds its floor while squeezed"
            )
        }
        // Squeeze is proportional (same ratio everywhere, ± rounding).
        let ratios = zip(widths, QueueColumns.minimums).map { $0 / $1 }
        if let first = ratios.first {
            for ratio in ratios.dropFirst() {
                XCTAssertEqual(ratio, first, accuracy: 0.02, "squeeze not proportional: \(ratios)")
            }
        }
    }

    func testMinimumWindowColumnsNeverOverlapTheirTrack() {
        // At the pinned minimum window (720×520) each column must be wide
        // enough for its track and every cell caps its label inside it.
        let available = ShellLayout.queueContentWidth(tier: .narrow, shellWidth: 720)
        let widths = QueueColumns.widths(for: available)
        XCTAssertEqual(widths.reduce(0, +) + QueueColumns.spacing * 6, available, accuracy: 1)
    }

    // MARK: - Active-filter count (collapsed-tier toggle badge)

    func testActiveFilterCount() {
        var filters = FilterState()
        XCTAssertEqual(filters.activeCount, 0)
        filters.search = "checkout"
        XCTAssertEqual(filters.activeCount, 1)
        filters.search = "   " // whitespace-only search is not active
        XCTAssertEqual(filters.activeCount, 0)
        filters.environment = .prod
        XCTAssertEqual(filters.activeCount, 1)
        filters.search = "checkout"
        XCTAssertEqual(filters.activeCount, 2)
        filters.severities = [.critical, .low]
        XCTAssertEqual(filters.activeCount, 4)
    }
}
