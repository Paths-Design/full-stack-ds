// Queue pane region: the dense incident table. Realized through the FSDS
// FsdsTable surface plus FSDS loading / empty / error states, with the row
// grid composed from plain SwiftUI — see the NOT FSDS markers and the lane
// README findings for why.

import SwiftUI
import DsSwiftUI
import OperationsDashboardSeam

struct QueuePane: View {
    @Bindable var controller: DashboardController

    var body: some View {
        switch controller.phase {
        case .error:
            errorCard
        case .loading:
            loadingCard
        case .loaded:
            if controller.incidents.isEmpty {
                emptyCard
            } else {
                queueCard
            }
        }
    }

    // MARK: States

    private var errorCard: some View {
        // FSDS: simulated load failure renders an AlertNotice error region
        // with a package-owned retry affordance.
        Card(header: { Text("Incident queue").font(.headline) }, content: {
            AlertNotice(status: .error, level: .section, content: {
                Stack(variant: .vertical, spacing: 8) {
                    Text(controller.errorMessage ?? "Failed to load incidents.")
                    FsdsButton(variant: .primary, onTap: { controller.retry() }) {
                        Text("Retry")
                    }
                }
            })
        })
    }

    private var loadingCard: some View {
        // FSDS: Skeleton is the loading surface; Spinner accompanies it. On
        // this target Skeleton is a passive wrapper (no lines/shimmer
        // channel), so the placeholder rows are consumer-supplied — see the
        // lane README findings.
        Card(header: { Text("Incident queue").font(.headline) }, content: {
            Stack(variant: .vertical, spacing: 12) {
                Skeleton(variant: .text, density: .regular, content: {
                    // NOT FSDS: placeholder row shapes — the Skeleton export
                    // applies token padding but renders no placeholder visual.
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(0..<6, id: \.self) { _ in
                            Capsule()
                                .fill(Color.secondary.opacity(0.18))
                                .frame(height: 12)
                        }
                    }
                })
                Spinner(label: "Loading incidents")
            }
        })
    }

    private var emptyCard: some View {
        // FSDS: distinct empty state, distinct from loading (React parity).
        Card(header: { Text("Incident queue").font(.headline) }, content: {
            Alert(intent: .info, level: .section, content: {
                Text("No incidents match the current filters.")
            })
        })
    }

    // MARK: Queue table

    private var queueCard: some View {
        Card(header: {
            Text("Incident queue (\(controller.incidents.count))").font(.headline)
        }, content: {
            ScrollView {
                // FSDS: FsdsTable is the queue's root surface.
                FsdsTable(content: {
                    // NOT FSDS: FsdsTable exposes a single passive content
                    // region on the SwiftUI target — no header/column/row
                    // substructure and no row-selection channel (lane finding
                    // 2, the Swift analog of the React lane's finding). The
                    // row grid, header row, and the selected-row indication
                    // are plain SwiftUI composed inside the FSDS surface.
                    Stack(variant: .vertical, spacing: 0) {
                        QueueHeaderRow()
                        ForEach(controller.incidents) { incident in
                            QueueRow(
                                incident: incident,
                                isSelected: incident.id == controller.selectedId
                            ) {
                                controller.selectIncident(incident.id)
                            }
                        }
                    }
                })
            }
        })
    }
}

/// Shared column metrics so the header row and data rows align.
private enum QueueColumns {
    static let id: CGFloat = 96
    static let title: CGFloat = 232
    static let service: CGFloat = 148
    static let severity: CGFloat = 92
    static let environment: CGFloat = 72
    static let age: CGFloat = 56
    static let assignee: CGFloat = 104
    static let spacing: CGFloat = 12
}

private struct QueueHeaderRow: View {
    var body: some View {
        HStack(spacing: QueueColumns.spacing) {
            headerCell("ID", width: QueueColumns.id)
            headerCell("Title", width: QueueColumns.title)
            headerCell("Service", width: QueueColumns.service)
            headerCell("Severity", width: QueueColumns.severity)
            headerCell("Env", width: QueueColumns.environment)
            headerCell("Age", width: QueueColumns.age)
            headerCell("Assignee", width: QueueColumns.assignee)
        }
        .padding(.vertical, 6)
    }

    private func headerCell(_ title: String, width: CGFloat) -> some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .frame(width: width, alignment: .leading)
    }
}

private struct QueueRow: View {
    let incident: Incident
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        HStack(spacing: QueueColumns.spacing) {
            // Row selection: the package Table exposes no row-select channel,
            // so selection is driven by an in-cell FsdsButton (package-owned
            // focus/press) and the app tracks the id — the selected-row
            // VISUAL indication below is app-side, a recorded boundary gap
            // (see lane README findings).
            FsdsButton(
                size: .small,
                variant: .ghost,
                accessibilityLabel: "Select incident \(incident.id)",
                onTap: onSelect
            ) {
                Text(incident.id)
            }
            .frame(width: QueueColumns.id, alignment: .leading)

            cell(incident.title, width: QueueColumns.title)
            cell(incident.service, width: QueueColumns.service)

            // FSDS: severity is a Badge.
            Badge(
                variant: .status,
                intent: Format.severityBadgeIntent(incident.severity),
                content: { Text(Format.severityLabel(incident.severity)) }
            )
            .frame(width: QueueColumns.severity, alignment: .leading)

            cell(incident.environment.rawValue, width: QueueColumns.environment)
            cell(Format.age(of: incident.openedAt), width: QueueColumns.age)
            cell(Format.assigneeText(incident.assignee), width: QueueColumns.assignee)
        }
        .font(.callout)
        .padding(.vertical, 6)
        // NOT FSDS: selected-row indication. No package-owned selected-row
        // styling exists on this target (finding 2); this is the one place
        // the lane's own rendering crosses from page-frame into state
        // indication, mirroring the React lane's `.ops-row-selected`.
        .background {
            if isSelected {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(Color.accentColor.opacity(0.16))
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private func cell(_ text: String, width: CGFloat) -> some View {
        Text(text)
            .frame(width: width, alignment: .leading)
            .lineLimit(1)
    }
}
