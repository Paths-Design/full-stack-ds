// Lane-local functional API for the operations-dashboard compose lane.
//
// Kotlin port of `examples/operations-dashboard/src/api/operations-api.ts`.
// This is the surface the UI imports and calls. It is suspend-returning so
// the UI's loading / empty / error / pending / optimistic states are real
// async transitions. Simulated latency and failure live HERE, behind the API
// — never in UI code. The API owns its own mutable in-memory copy of the
// incident set (seeded from the adapter snapshot) so `assignIncident` /
// `resolveIncident` mutate API state without touching the parsed fixtures.
//
// BOUNDARY: UI code imports from this package only. It must not import the
// adapter (`data/`) or the raw fixtures directly.
//
// Determinism: there is no wall-clock randomness. Latency is a fixed,
// configurable number of milliseconds and can be set to 0 in tests; failure
// is driven by an explicit flag, not chance.

package com.fullstackds.examples.operationsdashboard.api

import com.fullstackds.examples.operationsdashboard.data.FixtureAdapter
import com.fullstackds.examples.operationsdashboard.data.FixtureSnapshot
import com.fullstackds.examples.operationsdashboard.data.buildIncidentDetail
import com.fullstackds.examples.operationsdashboard.domain.ApiError
import com.fullstackds.examples.operationsdashboard.domain.ApiErrorCode
import com.fullstackds.examples.operationsdashboard.domain.ApiResult
import com.fullstackds.examples.operationsdashboard.domain.Incident
import com.fullstackds.examples.operationsdashboard.domain.IncidentDetail
import com.fullstackds.examples.operationsdashboard.domain.IncidentFilters
import com.fullstackds.examples.operationsdashboard.domain.ServiceHealth
import kotlinx.coroutines.delay

/** Construction-time options. All optional with deterministic defaults. */
data class OperationsApiOptions(
    /**
     * Simulated latency applied to every call, in milliseconds. Default 0 so
     * tests run instantly; a lane can pass e.g. 350 to exercise loading states.
     */
    val latencyMs: Long = 0,
    /**
     * When true, read calls ([listIncidents], [getIncident], [listServiceHealth])
     * return `Err(LoadFailed)` to exercise the error + retry path. Toggle at
     * runtime via [simulateLoadFailure].
     */
    val failLoads: Boolean = false,
)

/** Filter semantics identical to the TS API: equality / union-in-axis / substring. */
internal fun matchesFilters(incident: Incident, filters: IncidentFilters): Boolean {
    if (filters.environment != null && incident.environment != filters.environment) {
        return false
    }
    if (filters.severities.isNotEmpty() && incident.severity !in filters.severities) {
        return false
    }
    val search = filters.search?.trim().orEmpty()
    if (search.isNotEmpty()) {
        val needle = search.lowercase()
        val haystack = "${incident.id} ${incident.title} ${incident.service}".lowercase()
        if (needle !in haystack) return false
    }
    return true
}

/**
 * The operations-dashboard functional API. Construct one per app session via
 * [createOperationsApi]; it seeds mutable state from the fixture snapshot.
 * Instances are fully isolated: each holds its own working copy of incidents.
 */
class OperationsApi(
    private val snapshot: FixtureSnapshot,
    options: OperationsApiOptions = OperationsApiOptions(),
) {
    /** Mutable working copy of incidents (API-owned, not the fixture list). */
    private val incidents: MutableList<Incident> =
        snapshot.incidents.map { it.copy() }.toMutableList()

    private var latencyMs: Long = options.latencyMs
    private var failLoads: Boolean = options.failLoads

    /** Toggle the simulated read-failure flag at runtime (drives error→retry). */
    fun simulateLoadFailure(enabled: Boolean) {
        failLoads = enabled
    }

    private suspend fun latency() {
        if (latencyMs > 0) delay(latencyMs)
    }

    private fun loadFailure(what: String): ApiResult.Err =
        ApiResult.Err(
            ApiError(
                code = ApiErrorCode.LoadFailed,
                message = "Simulated load failure while $what.",
            ),
        )

    /** List active (unresolved) incidents matching the multi-axis filters. */
    suspend fun listIncidents(filters: IncidentFilters = IncidentFilters()): ApiResult<List<Incident>> {
        latency()
        if (failLoads) return loadFailure("listing incidents")
        val rows = incidents
            .asSequence()
            .filter { !it.resolved && matchesFilters(it, filters) }
            .map { it.copy() }
            .toList()
        return ApiResult.Ok(rows)
    }

    /** Fetch the full detail (description + timeline) for one incident id. */
    suspend fun getIncident(id: String): ApiResult<IncidentDetail> {
        latency()
        if (failLoads) return loadFailure("fetching incident detail")
        val incident = incidents.firstOrNull { it.id == id }
        if (incident == null || incident.resolved) {
            return ApiResult.Err(
                ApiError(
                    code = ApiErrorCode.NotFound,
                    message = "Incident $id not found in the active queue.",
                ),
            )
        }
        return ApiResult.Ok(buildIncidentDetail(snapshot, incident.copy()))
    }

    /** List per-service health for the header summary band. */
    suspend fun listServiceHealth(): ApiResult<List<ServiceHealth>> {
        latency()
        if (failLoads) return loadFailure("listing service health")
        return ApiResult.Ok(snapshot.services)
    }

    /** Assign (or reassign) an incident; returns the updated incident. */
    suspend fun assignIncident(id: String, assignee: String): ApiResult<Incident> {
        latency()
        val index = incidents.indexOfFirst { it.id == id }
        if (index < 0 || incidents[index].resolved) {
            return ApiResult.Err(
                ApiError(
                    code = ApiErrorCode.NotFound,
                    message = "Incident $id not found in the active queue.",
                ),
            )
        }
        val updated = incidents[index].copy(assignee = assignee)
        incidents[index] = updated
        return ApiResult.Ok(updated)
    }

    /** Resolve & close an incident, removing it from the active queue. */
    suspend fun resolveIncident(id: String): ApiResult<Incident> {
        latency()
        val index = incidents.indexOfFirst { it.id == id }
        if (index < 0) {
            return ApiResult.Err(
                ApiError(ApiErrorCode.NotFound, "Incident $id not found."),
            )
        }
        val incident = incidents[index]
        if (incident.resolved) {
            return ApiResult.Err(
                ApiError(ApiErrorCode.AlreadyResolved, "Incident $id is already resolved."),
            )
        }
        val resolved = incident.copy(resolved = true)
        incidents[index] = resolved
        return ApiResult.Ok(resolved)
    }
}

/**
 * Factory: load the fixture snapshot via the adapter and construct an API.
 * The UI calls this once and holds the returned instance.
 */
fun createOperationsApi(options: OperationsApiOptions = OperationsApiOptions()): OperationsApi =
    OperationsApi(FixtureAdapter.loadFixtures(), options)
