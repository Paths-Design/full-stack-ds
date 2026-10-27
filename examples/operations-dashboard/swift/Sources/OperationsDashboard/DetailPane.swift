// Detail pane region: a Card populated from the selected queue item — full
// title, description, progressive-disclosure timeline (FSDS Details), current
// status, and an action row (Assign / Resolve & close). Empty state when no
// row is selected.

import SwiftUI
import DsSwiftUI
import OperationsDashboardSeam

struct DetailPane: View {
    @Bindable var controller: DashboardController

    var body: some View {
        if let row = controller.selectedRow {
            detailCard(row: row)
        } else {
            emptyCard
        }
    }

    private var emptyCard: some View {
        // FSDS: the detail pane's own empty state, distinct from the queue's.
        Card(header: { Text("Detail").font(.headline) }, content: {
            Alert(intent: .info, level: .section, content: {
                Text("Select an incident from the queue to see its detail and timeline.")
            })
        })
    }

    private func detailCard(row: Incident) -> some View {
        Card(header: { Text(row.id).font(.headline) }, content: {
            Stack(variant: .vertical, spacing: 12) {
                // NOT FSDS: page-frame detail title (native text run; see the
                // React lane's finding-1 posture).
                Text(row.title)
                    .font(.headline)

                Stack(variant: .horizontal, spacing: 8) {
                    // FSDS: severity Badge.
                    Badge(
                        variant: .status,
                        intent: Format.severityBadgeIntent(row.severity),
                        content: { Text(Format.severityLabel(row.severity)) }
                    )
                    // FSDS: owning service shown as a Status pill; intent
                    // follows the joined service-health record when present.
                    Status(
                        status: Format.serviceStatusIntent(
                            controller.health(for: row.service)?.status ?? .degraded
                        ),
                        content: { Text(row.service) }
                    )
                }

                Text("\(row.environment.rawValue) · opened \(Format.age(of: row.openedAt)) ago · \(assigneePhrase(row))")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if controller.detailLoading || controller.detail == nil {
                    loadingDetail
                } else if let detail = controller.detail {
                    Text(detail.descriptionText)

                    // FSDS: progressive disclosure — expanding the Details
                    // reveals the timeline; collapsing hides it again.
                    Details(summary: "Timeline (\(detail.timeline.count))", content: {
                        Stack(variant: .vertical, spacing: 8) {
                            ForEach(Array(detail.timeline.enumerated()), id: \.offset) { _, event in
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(event.kind)
                                        .font(.caption.weight(.semibold))
                                    Text("\(event.message) (\(Format.age(of: event.at)))")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    })

                    FsdsDivider()

                    // Action row: Assign opens the Sheet; Resolve & close
                    // opens the confirm Dialog.
                    Stack(variant: .horizontal, spacing: 8) {
                        FsdsButton(
                            variant: .secondary,
                            disabled: controller.resolvePending,
                            onTap: { controller.openAssign() }
                        ) {
                            Text("Assign")
                        }
                        FsdsButton(
                            variant: .destructive,
                            disabled: controller.assignPending,
                            onTap: { controller.openResolve() }
                        ) {
                            Text("Resolve & close")
                        }
                    }
                }
            }
        })
    }

    private var loadingDetail: some View {
        // FSDS: detail fetch in flight — Skeleton + Spinner. The Skeleton
        // placeholder shapes are consumer-supplied on this target (finding).
        Stack(variant: .vertical, spacing: 12) {
            Skeleton(variant: .text, density: .regular, content: {
                // NOT FSDS: placeholder shapes (Skeleton is a passive wrapper).
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(0..<4, id: \.self) { _ in
                        Capsule()
                            .fill(Color.secondary.opacity(0.18))
                            .frame(height: 12)
                    }
                }
            })
            Spinner(label: "Loading detail")
        }
    }

    private func assigneePhrase(_ row: Incident) -> String {
        if let assignee = row.assignee {
            return "@\(assignee)"
        }
        return "unassigned"
    }
}
