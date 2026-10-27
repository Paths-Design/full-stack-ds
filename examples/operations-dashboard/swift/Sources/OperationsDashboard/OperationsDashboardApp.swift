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
                .frame(minWidth: 1180, minHeight: 740)
        }
    }
}

struct DashboardRootView: View {
    @State private var controller = DashboardController()

    var body: some View {
        // NOT FSDS: page-frame shell — the persistent header band plus the
        // three-pane body (rail / queue / detail). The spec allows minimal
        // app-shell layout for page regions the design system does not claim;
        // this HStack frame is that region.
        VStack(spacing: 0) {
            HeaderBand(controller: controller)
            Divider()
            HStack(alignment: .top, spacing: 16) {
                FilterRail(controller: controller)
                    .frame(width: 264, alignment: .topLeading)
                QueuePane(controller: controller)
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                DetailPane(controller: controller)
                    .frame(width: 380, alignment: .topLeading)
            }
            .padding(16)

            // Overlays mount at the root: FSDS Sheet + Dialog are zero-frame
            // anchors presenting native sheets; the Toast surface overlays
            // the shell's top edge.
            AssignSheet(controller: controller)
            ResolveDialog(controller: controller)
        }
        .overlay(alignment: .top) {
            ToastRegion(controller: controller)
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
}
