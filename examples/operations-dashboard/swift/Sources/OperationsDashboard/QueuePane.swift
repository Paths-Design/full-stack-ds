// Queue pane region: the dense incident table. Realized through the FSDS
// FsdsTable surface plus FSDS loading / empty / error states, with the row
// grid composed from plain SwiftUI — see the NOT FSDS markers and the lane
// README findings for why.
//
// Responsive: the pane receives its available content width from the shell
// and distributes it across the seven columns via `QueueColumns.widths(for:)`
// — floors when space allows, proportional squeeze below them, never a
// dropped column and never horizontal scrolling (spec cross-tier invariants).
// The shell owns vertical scrolling; this pane renders at natural height.

import SwiftUI
import DsSwiftUI
import OperationsDashboardSeam

struct QueuePane: View {
    @Bindable var controller: DashboardController
    /// Content width available to the table row, derived by the shell
    /// (`ShellLayout.queueContentWidth`) for the current tier.
    let availableWidth: CGFloat

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
            // FSDS: FsdsTable is the queue's root surface.
            FsdsTable(content: {
                // NOT FSDS: FsdsTable exposes a single passive content
                // region on the SwiftUI target — no header/column/row
                // substructure, no row-selection channel, and no
                // column-priority/visibility API (lane findings 1–2, 8). The
                // row grid, header row, the selected-row indication, and the
                // tier-independent squeeze arithmetic are composed inside the
                // FSDS surface from plain SwiftUI.
                let columnWidths = QueueColumns.widths(for: availableWidth)
                Stack(variant: .vertical, spacing: 0) {
                    QueueHeaderRow(widths: columnWidths)
                    ForEach(controller.incidents) { incident in
                        QueueRow(
                            incident: incident,
                            widths: columnWidths,
                            isSelected: incident.id == controller.selectedId
                        ) {
                            controller.selectIncident(incident.id)
                        }
                    }
                }
            })
        })
    }
}

private struct QueueHeaderRow: View {
    let widths: [CGFloat]

    var body: some View {
        HStack(spacing: QueueColumns.spacing) {
            headerCell("ID", width: widths[0])
            headerCell("Title", width: widths[1])
            headerCell("Service", width: widths[2])
            headerCell("Severity", width: widths[3])
            headerCell("Env", width: widths[4])
            headerCell("Age", width: widths[5])
            headerCell("Assignee", width: widths[6])
        }
        .padding(.vertical, 6)
    }

    private func headerCell(_ title: String, width: CGFloat) -> some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .frame(width: width, alignment: .leading)
    }
}

private struct QueueRow: View {
    let incident: Incident
    let widths: [CGFloat]
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
                    .lineLimit(1)
            }
            .frame(width: widths[0], alignment: .leading)

            cell(incident.title, width: widths[1])
            cell(incident.service, width: widths[2])

            severityCell(width: widths[3])

            cell(incident.environment.rawValue, width: widths[4])
            cell(Format.age(of: incident.openedAt), width: widths[5])
            cell(Format.assigneeText(incident.assignee), width: widths[6])
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

    /// FSDS severity Badge inside its column. The pill's label truncates
    /// under squeeze pressure (the Badge has no intrinsic max-width channel,
    /// so the cap is applied to its content text).
    private func severityCell(width: CGFloat) -> some View {
        Badge(
            variant: .status,
            intent: Format.severityBadgeIntent(incident.severity),
            content: {
                Text(Format.severityLabel(incident.severity))
                    .lineLimit(1)
                    .frame(maxWidth: max(0, width - 22), alignment: .leading)
            }
        )
        .frame(width: width, alignment: .leading)
    }

    private func cell(_ text: String, width: CGFloat) -> some View {
        Text(text)
            .lineLimit(1)
            .truncationMode(.tail)
            .frame(width: width, alignment: .leading)
    }
}
