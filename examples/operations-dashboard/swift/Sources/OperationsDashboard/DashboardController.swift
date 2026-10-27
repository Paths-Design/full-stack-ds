// State controller for the operations-dashboard swift lane.
//
// Swift analog of the React lane's `useDashboard.ts` (`@Observable` in place
// of hooks). This class owns ALL app state and is the only place the app's
// seam API (`OperationsApi`) is called. The API is async, so every transition
// below (loading, error, assign-pending, resolve-pending, detail fetch) is a
// real async transition, not a synchronous fake.
//
// BOUNDARY: imports the data/API only through the seam module's public
// surface (`OperationsDashboardSeam`). It never reaches the fixture adapter
// or the raw fixtures.

import Foundation
import Observation
import OperationsDashboardSeam

/// Load phase for the queue + summary band (mirrors the React lane).
enum LoadPhase: Equatable {
    case loading
    case loaded
    case error
}

/// A transient acknowledgement raised through the FSDS Toast surface.
struct DashboardToast: Equatable {
    enum Variant: Equatable {
        case success
        case info
        case warning
        case error
    }

    let title: String
    let variant: Variant
}

/// Local UI filter state (the controlled inputs). Port of the React lane's
/// `FilterState`; severities are a set because the axis semantics are union.
struct FilterState: Equatable {
    var search: String = ""
    var environment: OpsEnvironment?
    var severities: Set<Severity> = []

    /// Whether any filter is active (drives the Clear affordance).
    var isActive: Bool {
        !search.trimmingCharacters(in: .whitespaces).isEmpty
            || environment != nil
            || !severities.isEmpty
    }

    /// Translate into the API's filter record (React parity: pass `search`
    /// untrimmed — the API trims; only non-empty axes are sent).
    var asApiFilters: IncidentFilters {
        var out = IncidentFilters()
        if !search.trimmingCharacters(in: .whitespaces).isEmpty {
            out.search = search
        }
        if let environment {
            out.environment = environment
        }
        if !severities.isEmpty {
            out.severities = Severity.allCases.filter { severities.contains($0) }
        }
        return out
    }

    static let empty = FilterState()
}

/// The dashboard's state + actions. One instance per app session.
@MainActor
@Observable
final class DashboardController {
    /// Simulated latency (ms) so loading/pending states are observable
    /// (mirrors the React lane's LATENCY_MS = 350; tests run at 0).
    static let latencyMs = 350

    private let api: OperationsApi

    // MARK: Observable state (mirrors useDashboard.ts)

    private(set) var phase: LoadPhase = .loading
    private(set) var errorMessage: String?
    private(set) var incidents: [Incident] = []
    private(set) var services: [ServiceHealth] = []
    private(set) var selectedId: String?
    private(set) var detail: IncidentDetail?
    private(set) var detailLoading = false
    var filters = FilterState.empty
    private(set) var failLoads = false
    private(set) var assignOpen = false
    private(set) var assignPending = false
    private(set) var resolveOpen = false
    private(set) var resolvePending = false
    private(set) var toast: DashboardToast?
    /// Openness channel of the single FSDS Toast surface; the component's
    /// dwell auto-dismiss writes `false` back through this binding.
    var toastOpen = false

    private var loadGeneration = 0

    init(api: OperationsApi = createOperationsApi(options: OperationsApiOptions(latencyMs: DashboardController.latencyMs))) {
        self.api = api
    }

    // MARK: Derived state

    var filtersActive: Bool { filters.isActive }

    /// Open-incidents count for the header tile: derived from the CURRENT
    /// (filtered) queue, never hard-coded.
    var openIncidentCount: Int { incidents.count }

    /// Id + title of the current selection, preferring loaded detail
    /// (React parity: `dash.detail ?? dash.incidents.find(selectedId)`).
    var selectedSummary: (id: String, title: String)? {
        if let detail {
            return (detail.id, detail.title)
        }
        guard let selectedId,
              let row = incidents.first(where: { $0.id == selectedId }) else { return nil }
        return (row.id, row.title)
    }

    /// The selected row as currently reflected in the queue, if present.
    var selectedRow: Incident? {
        guard let selectedId else { return nil }
        return incidents.first { $0.id == selectedId }
    }

    /// Service-health record for the selected row's owning service, if any.
    func health(for serviceId: String) -> ServiceHealth? {
        services.first { $0.id == serviceId }
    }

    // MARK: Load

    /// Load the queue + service health for the current filters. Re-runs
    /// whenever filters change (live filtering) or a retry occurs. A
    /// generation counter drops stale responses when loads overlap.
    func load() {
        loadGeneration += 1
        let generation = loadGeneration
        let activeFilters = filters.asApiFilters
        phase = .loading
        errorMessage = nil
        Task {
            async let listResult = api.listIncidents(filters: activeFilters)
            async let healthResult = api.listServiceHealth()
            let (list, health) = await (listResult, healthResult)
            guard generation == loadGeneration else { return }
            switch (list, health) {
            case let (.failure(listError), _):
                errorMessage = listError.message
                phase = .error
            case let (.ok, .failure(healthError)):
                errorMessage = healthError.message
                phase = .error
            case let (.ok(rows), .ok(healthRows)):
                incidents = rows
                services = healthRows
                phase = .loaded
            }
        }
    }

    /// Retry after a simulated load failure (error → loading → loaded).
    func retry() {
        load()
    }

    /// Toggle the simulated load-failure flag (a dev affordance for the demo).
    func setFailLoads(_ enabled: Bool) {
        Task { await api.simulateLoadFailure(enabled: enabled) }
        failLoads = enabled
    }

    /// Fetch detail whenever the selection changes (called from `.task(id:)`).
    func loadDetail() async {
        guard let id = selectedId else {
            detail = nil
            detailLoading = false
            return
        }
        detailLoading = true
        let result = await api.getIncident(id: id)
        guard id == selectedId else { return } // selection moved on; drop stale
        detailLoading = false
        switch result {
        case .ok(let loaded):
            detail = loaded
        case .failure:
            // Selected incident vanished (e.g. resolved) — clear selection.
            detail = nil
            selectedId = nil
        }
    }

    // MARK: Filters

    func toggleSeverity(_ severity: Severity) {
        if filters.severities.contains(severity) {
            filters.severities.remove(severity)
        } else {
            filters.severities.insert(severity)
        }
    }

    /// "Clear filters" resets all filter state and restores the full queue
    /// (the `.task(id: filters)` reload picks the reset up).
    func clearFilters() {
        filters = .empty
    }

    // MARK: Selection

    func selectIncident(_ id: String) {
        selectedId = id
    }

    // MARK: Assign workflow (Sheet)

    func openAssign() {
        assignOpen = true
    }

    func closeAssign() {
        assignOpen = false
    }

    func submitAssign(_ rawAssignee: String) {
        guard let selectedId else { return }
        let assignee = rawAssignee.trimmingCharacters(in: .whitespaces)
        guard !assignee.isEmpty else { return }
        let id = selectedId
        assignPending = true
        Task {
            let result = await api.assignIncident(id: id, assignee: assignee)
            assignPending = false
            assignOpen = false
            switch result {
            case .ok(let updated):
                // Reflect the new assignee in the queue row and detail pane.
                incidents = incidents.map { $0.id == updated.id ? updated : $0 }
                if detail?.id == updated.id {
                    detail?.assignee = updated.assignee
                }
                raiseToast("Assigned \(updated.id) to \(assignee)", .success)
            case .failure(let error):
                raiseToast(error.message, .error)
            }
        }
    }

    // MARK: Resolve workflow (confirm Dialog)

    func openResolve() {
        resolveOpen = true
    }

    func closeResolve() {
        resolveOpen = false
    }

    func confirmResolve() {
        guard let currentId = selectedId else { return }
        let id = currentId
        resolvePending = true
        Task {
            let result = await api.resolveIncident(id: id)
            resolvePending = false
            resolveOpen = false
            switch result {
            case .ok:
                // Remove from queue and clear the selection (detail → empty state).
                incidents.removeAll { $0.id == id }
                selectedId = nil
                detail = nil
                raiseToast("Resolved & closed \(id)", .success)
            case .failure(let error):
                raiseToast(error.message, .error)
            }
        }
    }

    // MARK: Toasts

    /// Dismiss the toast surface (component auto-dismiss also writes here).
    func dismissToast() {
        toastOpen = false
    }

    private func raiseToast(_ title: String, _ variant: DashboardToast.Variant) {
        toast = DashboardToast(title: title, variant: variant)
        toastOpen = true
    }
}
