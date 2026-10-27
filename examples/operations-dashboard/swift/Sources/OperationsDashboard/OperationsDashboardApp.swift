// Operations dashboard — swift lane.
//
// Realizes the framework-neutral examples/operations-dashboard/spec.md as a
// macOS SwiftUI app composed from public DsSwiftUI exports (SwiftUI target):
// header summary band, filter rail, dense incident queue, selection-driven
// detail pane, and the assign Sheet / confirm Dialog / Toast overlays. The
// data seam is the lane-local OperationsDashboardSeam module (fixtures →
// adapter → async API); the UI never reads fixtures or the adapter directly.
// Partial realizations are marked `NOT FSDS` in source and ledgered in the
// lane README.
//
// Responsive (spec "### Responsive behavior"): the shell measures the window
// content width with a GeometryReader and lowers it to a ShellTier — wide
// (≥1280: rail + queue + detail row), medium (900–1279: queue + detail row,
// rail collapsed behind the Filters toggle), narrow (<900: single column,
// detail stacked below the queue). No breakpoint/container-size concept
// exists on the swiftui target, so tier computation is app-layer geometry —
// a recorded finding. Filter, selection, and overlay semantics are
// tier-independent: the same controller drives every shell.

import SwiftUI
import DsSwiftUI

@main
struct OperationsDashboardApp: App {
    var body: some Scene {
        WindowGroup("Operations dashboard") {
            DashboardRootView()
                // Graph-derived semantic defaults: component slots resolve
                // through the ref arm, so FSDS components paint graph colors
                // (same posture as examples/settings/swift).
                .environment(\.fsdsTheme, FsdsTheme(tokens: FsdsSemanticDefaults.light))
                // Cross-tier invariant: the window resizes to 720×520 with no
                // clipped or unreachable region.
                .frame(minWidth: 720, minHeight: 520)
        }
    }
}

struct DashboardRootView: View {
    @State private var controller = DashboardController()
    /// Collapsed-filters state for the medium/narrow tiers (collapsed by
    /// default; filters keep applying while collapsed).
    @State private var filtersExpanded = false

    var body: some View {
        // NOT FSDS: responsive page-frame shell. The spec claims the frame,
        // columns, and responsive shell for the app; this GeometryReader is
        // that region. It only chooses layout — component behavior, state
        // indication, and styling stay package-owned.
        GeometryReader { geo in
            let tier = ShellTier.tier(contentWidth: geo.size.width)
            shell(tier: tier, shellWidth: geo.size.width)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .overlay(alignment: .top) {
            // Overlay surfaces mount at the shell root for every tier: the
            // Toast panel shows at the top edge; FSDS Sheet + Dialog are
            // zero-frame anchors presenting native sheets. Semantics are
            // tier-independent.
            VStack(spacing: 0) {
                ToastRegion(controller: controller)
                AssignSheet(controller: controller)
                ResolveDialog(controller: controller)
            }
        }
        // Live filtering: any filter change re-runs the queue + summary load
        // through the async API (loading state is a real transition).
        .task(id: controller.filters) {
            controller.load()
        }
        // Selection drives detail: selection change fetches the detail record.
        .task(id: controller.selectedId) {
            await controller.loadDetail()
        }
    }

    // MARK: Tier shells

    @ViewBuilder
    private func shell(tier: ShellTier, shellWidth: CGFloat) -> some View {
        switch tier {
        case .wide:
            wideShell(shellWidth: shellWidth)
        case .medium:
            mediumShell(shellWidth: shellWidth)
        case .narrow:
            narrowShell(shellWidth: shellWidth)
        }
    }

    /// Wide (≥1280): the base layout — rail + queue + detail in one row.
    private func wideShell(shellWidth: CGFloat) -> some View {
        VStack(spacing: 0) {
            HeaderBand(controller: controller, tier: .wide)
            Divider()
            ScrollView {
                // NOT FSDS: three-pane page-frame row.
                HStack(alignment: .top, spacing: ShellLayout.paneSpacing) {
                    FilterRail(controller: controller)
                        .frame(width: ShellLayout.railWidth, alignment: .topLeading)
                    QueuePane(
                        controller: controller,
                        availableWidth: ShellLayout.queueContentWidth(tier: .wide, shellWidth: shellWidth)
                    )
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                    DetailPane(controller: controller)
                        .frame(width: ShellLayout.detailWidth, alignment: .topLeading)
                }
                .padding(ShellLayout.bodyPadding)
            }
            .frame(maxHeight: .infinity, alignment: .top)
        }
    }

    /// Medium (900–1279): queue + detail in one row; the filter rail is
    /// collapsed behind the persistent Filters toggle (active-filter count
    /// badge). Expanding reveals the same filter Card inline above the row.
    private func mediumShell(shellWidth: CGFloat) -> some View {
        VStack(spacing: 0) {
            HeaderBand(controller: controller, tier: .medium)
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    FilterToggleRow(controller: controller, expanded: $filtersExpanded)
                    if filtersExpanded {
                        FilterRail(controller: controller)
                    }
                    // NOT FSDS: two-pane page-frame row.
                    HStack(alignment: .top, spacing: ShellLayout.paneSpacing) {
                        QueuePane(
                            controller: controller,
                            availableWidth: ShellLayout.queueContentWidth(tier: .medium, shellWidth: shellWidth)
                        )
                        .frame(maxWidth: .infinity, alignment: .topLeading)
                        DetailPane(controller: controller)
                            .frame(width: ShellLayout.detailWidth, alignment: .topLeading)
                    }
                }
                .padding(ShellLayout.bodyPadding)
            }
            .frame(maxHeight: .infinity, alignment: .top)
        }
    }

    /// Narrow (<900): single column — header → filters (collapsed by
    /// default) → queue → detail. The detail pane is a full-width section
    /// below the queue in the same vertical scroll, never a modal.
    private func narrowShell(shellWidth: CGFloat) -> some View {
        VStack(spacing: 0) {
            HeaderBand(controller: controller, tier: .narrow)
            Divider()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    FilterToggleRow(controller: controller, expanded: $filtersExpanded)
                    if filtersExpanded {
                        FilterRail(controller: controller)
                    }
                    QueuePane(
                        controller: controller,
                        availableWidth: ShellLayout.queueContentWidth(tier: .narrow, shellWidth: shellWidth)
                    )
                    DetailPane(controller: controller)
                }
                .padding(.horizontal, ShellLayout.bodyPadding)
                .padding(.vertical, 12)
            }
            .frame(maxHeight: .infinity, alignment: .top)
        }
    }
}
