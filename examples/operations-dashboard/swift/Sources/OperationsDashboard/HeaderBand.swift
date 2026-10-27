// Header band region: app title + global status summary tiles + the dev
// load-failure toggle. Counts derive from the CURRENT (filtered) queue and
// the service-health roll-up — never hard-coded.

import SwiftUI
import DsSwiftUI
import OperationsDashboardSeam

struct HeaderBand: View {
    @Bindable var controller: DashboardController

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                // NOT FSDS: page-frame title. The DsSwiftUI Text export is a
                // passive content region without a heading channel, mirroring
                // the React lane's finding-1 posture (native text for text runs).
                Text("Operations dashboard")
                    .font(.title2.weight(.semibold))
                Spacer()
                summaryTiles
            }
            failLoadsToggle
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var summaryTiles: some View {
        // FSDS: summary tiles are Card(inset) > Stat hosting Status/Badge.
        Stack(variant: .horizontal, spacing: 12) {
            summaryTile(label: "Healthy", count: healthyCount, trend: .neutral) {
                Status(status: .success) { Text("Healthy") }
            }
            summaryTile(label: "Degraded", count: degradedCount, trend: degradedCount > 0 ? .down : .neutral) {
                Status(status: .warning) { Text("Degraded") }
            }
            summaryTile(label: "Down", count: downCount, trend: downCount > 0 ? .down : .neutral) {
                Status(status: .danger) { Text("Down") }
            }
            summaryTile(label: "Open incidents", count: controller.openIncidentCount, trend: .neutral) {
                Badge(variant: .counter, intent: .info, content: { Text("Open incidents") })
            }
        }
    }

    private func summaryTile(
        label: String,
        count: Int,
        trend: StatTrend,
        @ViewBuilder badge: () -> some View
    ) -> some View {
        Card(density: .inset, content: {
            // FSDS: Stat is the tile's display compound; its content region
            // composes the package-owned Status/Badge with the count.
            Stat(trend: trend, content: {
                VStack(alignment: .leading, spacing: 4) {
                    badge()
                    Text("\(count)")
                        .font(.title3.weight(.semibold))
                        .monospacedDigit()
                }
            })
        })
        .accessibilityLabel("\(label): \(count)")
    }

    private var healthyCount: Int { services(with: .healthy) }
    private var degradedCount: Int { services(with: .degraded) }
    private var downCount: Int { services(with: .down) }

    private func services(with status: ServiceStatus) -> Int {
        controller.services.filter { $0.status == status }.count
    }

    private var failLoadsToggle: some View {
        // Dev affordance: toggle the API's simulated load-failure flag so the
        // error + retry path is demonstrable from the UI (React parity).
        Stack(variant: .horizontal, spacing: 6) {
            Checkbox(
                checked: Binding(
                    get: { controller.failLoads },
                    set: { controller.setFailLoads($0) }
                )
            )
            Text("Simulate load failure").font(.caption)
        }
    }
}
