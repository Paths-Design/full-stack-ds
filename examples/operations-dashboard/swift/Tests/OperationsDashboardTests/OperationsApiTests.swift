// Seam tests for the operations-dashboard swift lane.
//
// Proves the lane-local data/API seam (adapter + functional API) against the
// committed fixtures: fixture parsing + joins (descriptions, chronologically
// ordered timelines), each filter axis alone, cross-axis intersection, detail
// lookup, assign/resolve mutations with per-instance isolation, the simulated
// load-failure path with recovery, and the NOT_FOUND / ALREADY_RESOLVED
// paths. All tests run with `latencyMs: 0` (deterministic, instant). This is
// the Swift port of the React lane's `operations-api.test.ts` coverage; it
// proves the seam only — not the UI, not visual parity, not the package.

import XCTest
@testable import OperationsDashboardSeam

final class OperationsApiTests: XCTestCase {
    // MARK: - Helpers

    /// Build a fresh API over a fresh fixture parse. `latencyMs` stays 0.
    private func makeApi(failLoads: Bool = false) async -> OperationsApi {
        createOperationsApi(options: OperationsApiOptions(latencyMs: 0, failLoads: failLoads))
    }

    /// Unwrap a `.ok` list result into active ids, failing the test on `.failure`.
    private func activeIds(_ api: OperationsApi, filters: IncidentFilters = IncidentFilters()) async throws -> [String] {
        let result = await api.listIncidents(filters: filters)
        guard case let .ok(rows) = result else {
            XCTFail("expected listIncidents to succeed, got \(result)")
            return []
        }
        return rows.map(\.id)
    }

    /// Unwrap a `.ok` result of any type, failing the test on `.failure`.
    private func okValue<T>(_ result: ApiResult<T>, _ message: @autoclosure () -> String = "expected .ok") throws -> T {
        switch result {
        case .ok(let value):
            return value
        case .failure(let error):
            XCTFail("\(message()) — got .failure(\(error))")
            // Return a placeholder that keeps types happy; XCTFail above has
            // already failed the test, so this value is never asserted.
            throw TestUnreachable.afterFailedAssertion
        }
    }

    /// Marker thrown only after XCTFail has recorded a failure (unreachable in
    /// a passing suite; the throw propagates as a test error, never silence).
    private enum TestUnreachable: Error {
        case afterFailedAssertion
    }

    // MARK: - Fixture parse + joins

    func testFixtureParseProducesFullActiveQueueAndServiceHealth() async throws {
        let api = await makeApi()

        let ids = try await activeIds(api)
        // All 10 seeded incidents are active on a fresh snapshot.
        XCTAssertEqual(ids, [
            "INC-1042", "INC-1043", "INC-1044", "INC-1045", "INC-1046",
            "INC-1047", "INC-1048", "INC-1049", "INC-1050", "INC-1051",
        ])

        let services = try okValue(await api.listServiceHealth(), "expected listServiceHealth to succeed")
        XCTAssertEqual(services.count, 10)
        XCTAssertEqual(Set(services.map(\.status)), Set([ServiceStatus.healthy, .degraded, .down]))
    }

    func testDetailJoinsDescriptionAndChronologicalTimeline() async throws {
        let api = await makeApi()

        let detail = try okValue(await api.getIncident(id: "INC-1042"), "expected INC-1042 detail")
        // Description joined from incident-descriptions.json.
        XCTAssertTrue(
            detail.descriptionText.hasPrefix("Checkout API p99 latency exceeded 2s"),
            "description join failed: \(detail.descriptionText)"
        )
        // Timeline joined from timeline-events.jsonl, in chronological order.
        XCTAssertEqual(detail.timeline.map(\.at), [
            "2026-06-26T08:12:00.000Z",
            "2026-06-26T08:14:30.000Z",
            "2026-06-26T08:21:00.000Z",
            "2026-06-26T08:35:00.000Z",
        ])
        XCTAssertEqual(detail.timeline.map(\.kind), ["opened", "ack", "comment", "escalated"])
        XCTAssertEqual(detail.timeline.map(\.incidentId), Array(repeating: "INC-1042", count: 4))
    }

    func testTimelineIsSortedAndJoinedPerIncident() async throws {
        let api = await makeApi()

        // INC-1043 (two events) and INC-1048 (two events) must come back
        // sorted by `at` ascending regardless of fixture line order.
        for id in ["INC-1043", "INC-1048"] {
            let detail = try okValue(await api.getIncident(id: id), "expected \(id) detail")
            let stamps = detail.timeline.map(\.at)
            XCTAssertEqual(stamps, stamps.sorted(), "\(id) timeline not chronological: \(stamps)")
            XCTAssertTrue(detail.timeline.allSatisfy { $0.incidentId == id }, "\(id) timeline has foreign events")
        }
        // Two events for INC-1048 (opened → ack).
        let detail = try okValue(await api.getIncident(id: "INC-1048"), "expected INC-1048 detail")
        XCTAssertEqual(detail.timeline.map(\.kind), ["opened", "ack"])
    }

    // MARK: - Filters: one axis at a time

    func testSearchFilterAloneMatchesIdTitleAndServiceCaseInsensitive() async throws {
        let api = await makeApi()

        // Substring over id.
        let byId = try await activeIds(api, filters: IncidentFilters(search: "INC-1044"))
        XCTAssertEqual(byId, ["INC-1044"])
        // Substring over title, case-insensitive.
        let byTitle = try await activeIds(api, filters: IncidentFilters(search: "PAY"))
        XCTAssertEqual(byTitle, ["INC-1043"])
        // Substring over service.
        let byService = try await activeIds(api, filters: IncidentFilters(search: "flags"))
        XCTAssertEqual(byService, ["INC-1050"])
        // Whitespace is trimmed before matching.
        let trimmed = try await activeIds(api, filters: IncidentFilters(search: "  pay  "))
        XCTAssertEqual(trimmed, ["INC-1043"])
        // Whitespace-only search is not a filter.
        let whitespaceOnly = try await activeIds(api, filters: IncidentFilters(search: "   "))
        XCTAssertEqual(whitespaceOnly.count, 10)
        // No match → empty (the UI empty-state path).
        let noMatch = try await activeIds(api, filters: IncidentFilters(search: "zzz-no-match"))
        XCTAssertTrue(noMatch.isEmpty, "expected no matches, got \(noMatch)")
    }

    func testEnvironmentFilterAlone() async throws {
        let api = await makeApi()

        let prod = try await activeIds(api, filters: IncidentFilters(environment: .prod))
        XCTAssertEqual(prod, ["INC-1042", "INC-1043", "INC-1045", "INC-1048", "INC-1051"])

        let staging = try await activeIds(api, filters: IncidentFilters(environment: .staging))
        XCTAssertEqual(staging, ["INC-1044", "INC-1047", "INC-1050"])

        let dev = try await activeIds(api, filters: IncidentFilters(environment: .dev))
        XCTAssertEqual(dev, ["INC-1046", "INC-1049"])
    }

    func testSeverityFilterAloneIsUnionWithinAxis() async throws {
        let api = await makeApi()

        let critical = try await activeIds(api, filters: IncidentFilters(severities: [.critical]))
        XCTAssertEqual(critical, ["INC-1042", "INC-1043", "INC-1050"])

        let low = try await activeIds(api, filters: IncidentFilters(severities: [.low]))
        XCTAssertEqual(low, ["INC-1046", "INC-1049", "INC-1051"])

        // Multiple selected severities = union within the axis.
        let criticalOrLow = try await activeIds(api, filters: IncidentFilters(severities: [.critical, .low]))
        XCTAssertEqual(
            Set(criticalOrLow),
            Set(["INC-1042", "INC-1043", "INC-1046", "INC-1049", "INC-1050", "INC-1051"])
        )

        // Empty severities array = no filter on the axis.
        let anySeverity = try await activeIds(api, filters: IncidentFilters(severities: []))
        XCTAssertEqual(anySeverity.count, 10)
    }

    // MARK: - Filters: cross-axis intersection

    func testCrossAxisFilterIntersection() async throws {
        let api = await makeApi()

        // prod ∩ critical.
        let prodCritical = try await activeIds(api, filters: IncidentFilters(environment: .prod, severities: [.critical]))
        XCTAssertEqual(prodCritical, ["INC-1042", "INC-1043"])

        // staging ∩ critical.
        let stagingCritical = try await activeIds(api, filters: IncidentFilters(environment: .staging, severities: [.critical]))
        XCTAssertEqual(stagingCritical, ["INC-1050"])

        // dev ∩ critical = ∅ (still a success with an empty list).
        let devCritical = try await activeIds(api, filters: IncidentFilters(environment: .dev, severities: [.critical]))
        XCTAssertTrue(devCritical.isEmpty, "expected empty intersection, got \(devCritical)")

        // All three axes intersect.
        let allAxes = try await activeIds(api, filters: IncidentFilters(search: "webhook", environment: .prod, severities: [.critical]))
        XCTAssertEqual(allAxes, ["INC-1043"])
    }

    // MARK: - Detail lookup

    func testDetailLookupForEveryActiveIncident() async throws {
        let api = await makeApi()

        let ids = try await activeIds(api)
        XCTAssertEqual(ids.count, 10, "precondition: the full queue is active")
        for id in ids {
            let detail = try okValue(await api.getIncident(id: id), "expected detail for \(id)")
            XCTAssertEqual(detail.id, id)
            // Every committed incident has a real description joined.
            XCTAssertFalse(detail.descriptionText.isEmpty)
            XCTAssertNotEqual(
                detail.descriptionText, "No description recorded for this incident.",
                "\(id) should join a real description"
            )
            // Every committed incident has at least its "opened" event.
            XCTAssertTrue(detail.timeline.contains { $0.kind == "opened" }, "\(id) missing opened event")
        }
    }

    // MARK: - Mutations + per-instance isolation

    func testAssignIncidentMutatesAndReturnsUpdatedRecord() async throws {
        let api = await makeApi()

        let updated = try okValue(await api.assignIncident(id: "INC-1043", assignee: "ada"), "expected assign to succeed")
        XCTAssertEqual(updated.id, "INC-1043")
        XCTAssertEqual(updated.assignee, "ada")

        // The queue row reflects the new assignee.
        let rows = try okValue(await api.listIncidents(), "expected list after assign")
        XCTAssertEqual(rows.first { $0.id == "INC-1043" }?.assignee, "ada")

        // Reassign overwrites the previous owner.
        let reassigned = try okValue(await api.assignIncident(id: "INC-1042", assignee: "ada"), "expected reassign to succeed")
        XCTAssertEqual(reassigned.assignee, "ada")
    }

    func testApiInstancesAreIsolated() async throws {
        // Mutations stay inside the API instance that made them (each instance
        // seeds its own mutable copy from the fixture snapshot).
        let apiA = await makeApi()
        let apiB = await makeApi()

        _ = try okValue(await apiA.assignIncident(id: "INC-1043", assignee: "ada"), "expected assign in A")
        _ = try okValue(await apiA.resolveIncident(id: "INC-1042"), "expected resolve in A")

        // B is untouched by A's mutations.
        let bIds = try await activeIds(apiB)
        XCTAssertEqual(bIds.count, 10)
        let bRows = try okValue(await apiB.listIncidents(), "expected B list")
        XCTAssertNil(bRows.first { $0.id == "INC-1043" }?.assignee, "B must not see A's assignment")

        // A keeps them.
        let aIds = try await activeIds(apiA)
        XCTAssertEqual(aIds.count, 9)
    }

    func testResolveRemovesFromActiveQueue() async throws {
        let api = await makeApi()

        let resolved = try okValue(await api.resolveIncident(id: "INC-1042"), "expected resolve to succeed")
        XCTAssertTrue(resolved.resolved)

        // Removed from the active queue.
        let ids = try await activeIds(api)
        XCTAssertFalse(ids.contains("INC-1042"))
        XCTAssertEqual(ids.count, 9)

        // Detail lookup for a resolved id is NOT_FOUND (TS parity).
        let detail = await api.getIncident(id: "INC-1042")
        guard case let .failure(error) = detail else {
            return XCTFail("expected NOT_FOUND for resolved detail, got \(detail)")
        }
        XCTAssertEqual(error.code, .notFound)
    }

    // MARK: - Typed failure paths

    func testResolveUnknownIdIsNotFound() async throws {
        let api = await makeApi()
        guard case let .failure(error) = await api.resolveIncident(id: "INC-9999") else {
            return XCTFail("expected NOT_FOUND for unknown resolve")
        }
        XCTAssertEqual(error.code, .notFound)
        XCTAssertTrue(error.message.contains("INC-9999"))
    }

    func testAssignResolvedIncidentIsNotFound() async throws {
        let api = await makeApi()
        _ = try okValue(await api.resolveIncident(id: "INC-1046"), "expected resolve")
        guard case let .failure(error) = await api.assignIncident(id: "INC-1046", assignee: "ada") else {
            return XCTFail("expected NOT_FOUND for resolved assign")
        }
        XCTAssertEqual(error.code, .notFound)
    }

    func testDoubleResolveIsAlreadyResolved() async throws {
        let api = await makeApi()
        _ = try okValue(await api.resolveIncident(id: "INC-1044"), "expected first resolve")
        guard case let .failure(error) = await api.resolveIncident(id: "INC-1044") else {
            return XCTFail("expected ALREADY_RESOLVED on second resolve")
        }
        XCTAssertEqual(error.code, .alreadyResolved)
        XCTAssertTrue(error.message.contains("already resolved"))
    }

    func testDetailForUnknownIdIsNotFound() async throws {
        let api = await makeApi()
        guard case let .failure(error) = await api.getIncident(id: "INC-9999") else {
            return XCTFail("expected NOT_FOUND for unknown detail")
        }
        XCTAssertEqual(error.code, .notFound)
    }

    // MARK: - Simulated load failure + recovery

    func testSimulatedLoadFailureFailsReadsTypedAndRecovers() async throws {
        let api = await makeApi(failLoads: true)

        // All three read surfaces fail typed, with LOAD_FAILED.
        guard case let .failure(listError) = await api.listIncidents() else {
            return XCTFail("expected list LOAD_FAILED")
        }
        XCTAssertEqual(listError.code, .loadFailed)

        guard case let .failure(detailError) = await api.getIncident(id: "INC-1042") else {
            return XCTFail("expected detail LOAD_FAILED")
        }
        XCTAssertEqual(detailError.code, .loadFailed)

        guard case let .failure(healthError) = await api.listServiceHealth() else {
            return XCTFail("expected health LOAD_FAILED")
        }
        XCTAssertEqual(healthError.code, .loadFailed)

        // Mutations are not gated by the read-failure flag (TS parity).
        _ = try okValue(await api.assignIncident(id: "INC-1049", assignee: "ada"), "expected assign while failing loads")

        // Recovery: toggling the flag off restores reads.
        await api.simulateLoadFailure(enabled: false)
        let rows = try okValue(await api.listIncidents(), "expected recovery after simulateLoadFailure(false)")
        XCTAssertEqual(rows.count, 10)
    }

    func testConstructorFailLoadsFlagDrivesSameTypedFailure() async throws {
        // Explicit construction-time flag (the `failLoads` option).
        let api = await makeApi(failLoads: true)
        guard case let .failure(error) = await api.listIncidents() else {
            return XCTFail("expected LOAD_FAILED from constructor flag")
        }
        XCTAssertEqual(error.code, .loadFailed)
    }

    // MARK: - Determinism

    func testLatencyZeroIsInstantAndDeterministic() async throws {
        // latencyMs: 0 (the default) resolves without observable delay; the
        // same query repeats identically (no wall-clock randomness).
        let api = await makeApi()
        let first = try await activeIds(api)
        let second = try await activeIds(api)
        XCTAssertEqual(first, second)
    }
}
