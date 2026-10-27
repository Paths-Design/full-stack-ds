// Seam tests for the operations-dashboard compose lane's data/API port.
//
// Kotlin port of the React lane's `operations-api.test.ts` coverage: fixture
// parsing + joins, each filter axis alone, cross-axis intersection, detail
// lookup, assign/resolve mutations with per-instance isolation, and the typed
// failure + recovery paths (LOAD_FAILED / NOT_FOUND / ALREADY_RESOLVED).
//
// All tests run with latencyMs = 0 under runTest — instant and deterministic
// (the seam's determinism rule: no wall-clock randomness on the API path).

package com.fullstackds.examples.operationsdashboard

import com.fullstackds.examples.operationsdashboard.api.OperationsApiOptions
import com.fullstackds.examples.operationsdashboard.api.createOperationsApi
import com.fullstackds.examples.operationsdashboard.api.matchesFilters
import com.fullstackds.examples.operationsdashboard.domain.ApiResult
import com.fullstackds.examples.operationsdashboard.domain.ApiErrorCode
import com.fullstackds.examples.operationsdashboard.domain.Environment
import com.fullstackds.examples.operationsdashboard.domain.Incident
import com.fullstackds.examples.operationsdashboard.domain.IncidentDetail
import com.fullstackds.examples.operationsdashboard.domain.IncidentFilters
import com.fullstackds.examples.operationsdashboard.domain.Severity
import com.fullstackds.examples.operationsdashboard.domain.ServiceHealth
import com.fullstackds.examples.operationsdashboard.domain.ServiceStatus
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OperationsApiTest {

    // --- Fixture parse + joins -------------------------------------------------

    @Test
    fun `factory parses fixtures and lists the active queue`() = runTest {
        val api = createOperationsApi()
        val result = api.listIncidents()
        val rows = assertIs<ApiResult.Ok<List<Incident>>>(result).value
        assertEquals(10, rows.size, "the fixture seeds 10 active incidents")
        assertTrue(rows.all { !it.resolved })
        assertTrue(rows.any { it.id == "INC-1042" && it.severity == Severity.Critical })
    }

    @Test
    fun `detail join returns description and chronologically ordered timeline`() = runTest {
        val api = createOperationsApi()
        val detail = assertIs<ApiResult.Ok<IncidentDetail>>(api.getIncident("INC-1042")).value
        assertEquals("Checkout API latency spike", detail.title)
        assertTrue(
            detail.description.startsWith("Checkout API p99 latency exceeded 2s"),
            "description join hits incident-descriptions.json",
        )
        val timeline = detail.timeline
        assertEquals(4, timeline.size, "INC-1042 carries the rich 4-event timeline")
        assertEquals(listOf("opened", "ack", "comment", "escalated"), timeline.map { it.kind })
        assertEquals(
            timeline.map { it.at },
            timeline.map { it.at }.sorted(),
            "timeline is chronologically ordered regardless of fixture line order",
        )
    }

    @Test
    fun `service health join covers every status for the summary band`() = runTest {
        val api = createOperationsApi()
        val services = assertIs<ApiResult.Ok<List<ServiceHealth>>>(api.listServiceHealth()).value
        assertEquals(10, services.size)
        assertEquals(3, services.count { it.status == ServiceStatus.Healthy })
        assertEquals(5, services.count { it.status == ServiceStatus.Degraded })
        assertEquals(2, services.count { it.status == ServiceStatus.Down })
    }

    // --- Filter axes -------------------------------------------------------------

    @Test
    fun `search axis matches id title and service case-insensitively`() = runTest {
        val api = createOperationsApi()
        suspend fun ids(filters: IncidentFilters): List<String> =
            assertIs<ApiResult.Ok<List<Incident>>>(api.listIncidents(filters)).value.map { it.id }

        assertEquals(listOf("INC-1043"), ids(IncidentFilters(search = "1043")))
        // "latency" hits INC-1042 by title; "scheduler" hits INC-1051 by service.
        assertEquals(listOf("INC-1042"), ids(IncidentFilters(search = "LATENCY")))
        assertEquals(listOf("INC-1051"), ids(IncidentFilters(search = "scheduler")))
        assertTrue(
            ids(IncidentFilters(search = "zzz-no-match")).isEmpty(),
            "a no-match search yields the empty-state path",
        )
    }

    @Test
    fun `environment axis restricts to one environment`() = runTest {
        val api = createOperationsApi()
        val rows = assertIs<ApiResult.Ok<List<Incident>>>(
            api.listIncidents(IncidentFilters(environment = Environment.Prod)),
        ).value
        assertEquals(5, rows.size)
        assertTrue(rows.all { it.environment == Environment.Prod })
    }

    @Test
    fun `severity axis is a union within the axis`() = runTest {
        val api = createOperationsApi()
        val rows = assertIs<ApiResult.Ok<List<Incident>>>(
            api.listIncidents(IncidentFilters(severities = listOf(Severity.High, Severity.Low))),
        ).value
        assertEquals(7, rows.size, "4 high + 3 low incidents in the fixture")
        assertTrue(rows.all { it.severity == Severity.High || it.severity == Severity.Low })
    }

    @Test
    fun `cross-axis intersection intersects across axes`() = runTest {
        val api = createOperationsApi()
        val rows = assertIs<ApiResult.Ok<List<Incident>>>(
            api.listIncidents(
                IncidentFilters(environment = Environment.Prod, severities = listOf(Severity.Critical)),
            ),
        ).value
        assertEquals(listOf("INC-1042", "INC-1043"), rows.map { it.id })
        // And search composes with the other axes.
        val narrowed = assertIs<ApiResult.Ok<List<Incident>>>(
            api.listIncidents(
                IncidentFilters(environment = Environment.Prod, search = "webhook"),
            ),
        ).value
        assertEquals(listOf("INC-1043"), narrowed.map { it.id })
    }

    @Test
    fun `matchesFilters mirrors the TS predicate edge semantics`() {
        val incident = Incident(
            id = "INC-1042",
            title = "Checkout API latency spike",
            service = "checkout-api",
            severity = Severity.Critical,
            environment = Environment.Prod,
            openedAt = "2026-06-26T08:12:00.000Z",
            assignee = null,
            resolved = false,
        )
        // Blank/whitespace search is a no-op (the TS adapter trims first).
        assertTrue(matchesFilters(incident, IncidentFilters(search = "   ")))
        assertTrue(matchesFilters(incident, IncidentFilters()))
        // Empty severities list means "any".
        assertTrue(matchesFilters(incident, IncidentFilters(severities = emptyList())))
        // Environment inequality rejects.
        assertFalse(matchesFilters(incident, IncidentFilters(environment = Environment.Dev)))
    }

    // --- Detail lookup ------------------------------------------------------------

    @Test
    fun `unknown id returns typed NOT_FOUND`() = runTest {
        val api = createOperationsApi()
        val err = assertIs<ApiResult.Err>(api.getIncident("INC-9999")).error
        assertEquals(ApiErrorCode.NotFound, err.code)
    }

    @Test
    fun `resolved id returns typed NOT_FOUND from getIncident`() = runTest {
        val api = createOperationsApi()
        assertIs<ApiResult.Ok<*>>(api.resolveIncident("INC-1046"))
        val err = assertIs<ApiResult.Err>(api.getIncident("INC-1046")).error
        assertEquals(ApiErrorCode.NotFound, err.code)
    }

    // --- Mutations + per-instance isolation -------------------------------------------

    @Test
    fun `assignIncident mutates the instance and the change is visible in the queue`() = runTest {
        val api = createOperationsApi()
        val assigned = assertIs<ApiResult.Ok<Incident>>(
            api.assignIncident("INC-1043", "adoshi"),
        ).value
        assertEquals("adoshi", assigned.assignee)
        val rows = assertIs<ApiResult.Ok<List<Incident>>>(api.listIncidents()).value
        assertEquals("adoshi", rows.first { it.id == "INC-1043" }.assignee)
        // Reassignment overwrites (assign-or-reassign semantics).
        val reassigned = assertIs<ApiResult.Ok<Incident>>(
            api.assignIncident("INC-1043", "arivera"),
        ).value
        assertEquals("arivera", reassigned.assignee)
    }

    @Test
    fun `assign on unknown id returns typed NOT_FOUND`() = runTest {
        val api = createOperationsApi()
        val err = assertIs<ApiResult.Err>(api.assignIncident("INC-9999", "x")).error
        assertEquals(ApiErrorCode.NotFound, err.code)
    }

    @Test
    fun `instances are isolated - a mutation in one never leaks into another`() = runTest {
        val apiA = createOperationsApi()
        val apiB = createOperationsApi()
        assertIs<ApiResult.Ok<*>>(apiA.assignIncident("INC-1045", "lchen"))
        assertIs<ApiResult.Ok<*>>(apiA.resolveIncident("INC-1045"))
        val rowsA = assertIs<ApiResult.Ok<List<Incident>>>(apiA.listIncidents()).value
        val rowsB = assertIs<ApiResult.Ok<List<Incident>>>(apiB.listIncidents()).value
        assertEquals(9, rowsA.size, "resolved row left instance A's queue")
        assertNull(rowsA.firstOrNull { it.id == "INC-1045" })
        assertEquals(10, rowsB.size, "instance B is untouched")
        assertNull(rowsB.first { it.id == "INC-1045" }.assignee, "assign never leaked into B")
    }

    @Test
    fun `resolveIncident removes the row from the active queue`() = runTest {
        val api = createOperationsApi()
        val resolved = assertIs<ApiResult.Ok<Incident>>(api.resolveIncident("INC-1049")).value
        assertTrue(resolved.resolved)
        val rows = assertIs<ApiResult.Ok<List<Incident>>>(api.listIncidents()).value
        assertNull(rows.firstOrNull { it.id == "INC-1049" }, "resolved rows leave the queue")
    }

    @Test
    fun `re-resolving returns typed ALREADY_RESOLVED`() = runTest {
        val api = createOperationsApi()
        assertIs<ApiResult.Ok<*>>(api.resolveIncident("INC-1046"))
        val err = assertIs<ApiResult.Err>(api.resolveIncident("INC-1046")).error
        assertEquals(ApiErrorCode.AlreadyResolved, err.code)
    }

    // --- Typed failure + recovery ----------------------------------------------------

    @Test
    fun `failLoads constructor flag fails all three reads with LOAD_FAILED`() = runTest {
        val api = createOperationsApi(OperationsApiOptions(failLoads = true))
        for (err in listOf(
            assertIs<ApiResult.Err>(api.listIncidents()).error,
            assertIs<ApiResult.Err>(api.getIncident("INC-1042")).error,
            assertIs<ApiResult.Err>(api.listServiceHealth()).error,
        )) {
            assertEquals(ApiErrorCode.LoadFailed, err.code)
        }
    }

    @Test
    fun `simulateLoadFailure(false) recovers the reads`() = runTest {
        val api = createOperationsApi(OperationsApiOptions(failLoads = true))
        assertIs<ApiResult.Err>(api.listIncidents())
        api.simulateLoadFailure(false)
        val rows = assertIs<ApiResult.Ok<List<Incident>>>(api.listIncidents()).value
        assertEquals(10, rows.size, "retry after recovery restores the full queue")
    }

    @Test
    fun `mutation paths are not gated by the load-failure flag (mirrors TS)`() = runTest {
        val api = createOperationsApi(OperationsApiOptions(failLoads = true))
        val assigned = assertIs<ApiResult.Ok<Incident>>(
            api.assignIncident("INC-1042", "pkumar"),
        ).value
        assertEquals("pkumar", assigned.assignee)
        val resolved = assertIs<ApiResult.Ok<Incident>>(api.resolveIncident("INC-1042")).value
        assertTrue(resolved.resolved)
    }
}
