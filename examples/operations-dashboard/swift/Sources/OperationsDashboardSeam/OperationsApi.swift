// Lane-local functional API for the operations-dashboard swift lane.
//
// This is the surface the app UI calls. It is async and owns its own mutable
// in-memory copy of the incident set (seeded from the adapter snapshot), so
// mutations stay inside the API and never touch the parsed fixtures.
// Simulated latency and failure live HERE, behind the API — never in UI code
// — so the UI's loading / empty / error / pending / optimistic states are
// real async transitions.
//
// BOUNDARY: UI code imports this module's public surface only. It must not
// reach the adapter (`FixtureAdapter`) or the raw fixtures directly.
//
// Determinism: there is no wall-clock randomness. Latency is a fixed,
// configurable number of milliseconds (Task.sleep) and can be set to 0 in
// tests; failure is driven by an explicit flag (`failLoads` /
// `simulateLoadFailure`), not chance. This is a direct port of the TS seam's
// `src/api/operations-api.ts` — filter semantics, error codes, and mutation
// behavior match it exactly.

import Foundation

/// Construction-time options. All optional with deterministic defaults.
public struct OperationsApiOptions: Sendable {
    /// Simulated latency applied to every call, in milliseconds. Default 0 so
    /// tests run instantly; a lane can pass e.g. 350 to exercise loading states.
    public var latencyMs: Int
    /// When true, read calls (`listIncidents`, `getIncident`,
    /// `listServiceHealth`) return `.failure(.loadFailed)` to exercise the
    /// error + retry path. Toggle at runtime via `simulateLoadFailure(enabled:)`.
    public var failLoads: Bool

    public init(latencyMs: Int = 0, failLoads: Bool = false) {
        self.latencyMs = latencyMs
        self.failLoads = failLoads
    }
}

/// The operations-dashboard functional API. Construct per app session via
/// `createOperationsApi()`; it seeds mutable state from the fixture snapshot.
/// An actor: sequential mutation semantics without explicit locking.
public actor OperationsApi {
    private let snapshot: FixtureSnapshot
    /// Mutable working copy of incidents (API-owned, not the fixture array;
    /// Swift value semantics make this a copy by construction).
    private var incidents: [Incident]
    private let latencyMs: Int
    private var failLoads: Bool

    init(snapshot: FixtureSnapshot, options: OperationsApiOptions = OperationsApiOptions()) {
        self.snapshot = snapshot
        self.incidents = snapshot.incidents
        self.latencyMs = options.latencyMs
        self.failLoads = options.failLoads
    }

    /// Toggle the simulated read-failure flag at runtime (drives error→retry).
    public func simulateLoadFailure(enabled: Bool) {
        failLoads = enabled
    }

    /// List active (unresolved) incidents matching the multi-axis filters.
    public func listIncidents(filters: IncidentFilters = IncidentFilters()) async -> ApiResult<[Incident]> {
        await delay()
        if failLoads {
            return .failure(ApiError(
                code: .loadFailed,
                message: "Simulated load failure while listing incidents."
            ))
        }
        let rows = incidents.filter { !$0.resolved && Self.matchesFilters($0, filters) }
        return .ok(rows)
    }

    /// Fetch the full detail (description + timeline) for one incident id.
    public func getIncident(id: String) async -> ApiResult<IncidentDetail> {
        await delay()
        if failLoads {
            return .failure(ApiError(
                code: .loadFailed,
                message: "Simulated load failure while fetching incident detail."
            ))
        }
        guard let incident = incidents.first(where: { $0.id == id }), !incident.resolved else {
            return .failure(ApiError(
                code: .notFound,
                message: "Incident \(id) not found in the active queue."
            ))
        }
        return .ok(FixtureAdapter.buildIncidentDetail(from: snapshot, incident: incident))
    }

    /// List per-service health for the header summary band.
    public func listServiceHealth() async -> ApiResult<[ServiceHealth]> {
        await delay()
        if failLoads {
            return .failure(ApiError(
                code: .loadFailed,
                message: "Simulated load failure while listing service health."
            ))
        }
        return .ok(snapshot.services)
    }

    /// Assign (or reassign) an incident; returns the updated incident.
    public func assignIncident(id: String, assignee: String) async -> ApiResult<Incident> {
        await delay()
        guard let index = incidents.firstIndex(where: { $0.id == id }), !incidents[index].resolved else {
            return .failure(ApiError(
                code: .notFound,
                message: "Incident \(id) not found in the active queue."
            ))
        }
        incidents[index].assignee = assignee
        return .ok(incidents[index])
    }

    /// Resolve & close an incident, removing it from the active queue.
    public func resolveIncident(id: String) async -> ApiResult<Incident> {
        await delay()
        guard let index = incidents.firstIndex(where: { $0.id == id }) else {
            return .failure(ApiError(
                code: .notFound,
                message: "Incident \(id) not found."
            ))
        }
        if incidents[index].resolved {
            return .failure(ApiError(
                code: .alreadyResolved,
                message: "Incident \(id) is already resolved."
            ))
        }
        incidents[index].resolved = true
        return .ok(incidents[index])
    }

    // MARK: - Filter semantics (exact port of the TS `matchesFilters`)

    /// `search` is a case-insensitive substring over id/title/service;
    /// `environment` is equality; `severities` is union within the axis.
    /// Axes combine by intersection.
    static func matchesFilters(_ incident: Incident, _ filters: IncidentFilters) -> Bool {
        if let environment = filters.environment, incident.environment != environment {
            return false
        }
        if let severities = filters.severities, !severities.isEmpty,
           !severities.contains(incident.severity) {
            return false
        }
        if let search = filters.search, !search.trimmingCharacters(in: .whitespaces).isEmpty {
            let needle = search.trimmingCharacters(in: .whitespaces).lowercased()
            let haystack = "\(incident.id) \(incident.title) \(incident.service)".lowercased()
            if !haystack.contains(needle) {
                return false
            }
        }
        return true
    }

    /// Fixed latency — never wall-clock randomness.
    private func delay() async {
        guard latencyMs > 0 else { return }
        try? await Task.sleep(nanoseconds: UInt64(latencyMs) * 1_000_000)
    }
}

/// Factory: load the fixture snapshot via the adapter and construct an API.
/// The app calls this once and holds the returned instance.
public func createOperationsApi(options: OperationsApiOptions = OperationsApiOptions()) -> OperationsApi {
    OperationsApi(snapshot: FixtureAdapter.loadSnapshot(), options: options)
}
