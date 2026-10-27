// State controller for the operations-dashboard compose lane.
//
// Kotlin port of the React lane's `useDashboard.ts`: this class owns ALL app
// state and is the only place the lane-local API (`api/OperationsApi`) is
// called. It exposes Compose snapshot state + actions so the rendering
// composables stay declarative. The API is suspend-returning, so every
// transition below (loading, error, assign-pending, resolve-pending) is a
// real async transition, not a synchronous fake.
//
// BOUNDARY: imports the data/API ONLY through the app-local `api` package.
// It never reaches into the `data` adapter or the raw fixture resources.

package com.fullstackds.examples.operationsdashboard.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.fullstackds.examples.operationsdashboard.api.OperationsApi
import com.fullstackds.examples.operationsdashboard.api.OperationsApiOptions
import com.fullstackds.examples.operationsdashboard.api.createOperationsApi
import com.fullstackds.examples.operationsdashboard.domain.ApiResult
import com.fullstackds.examples.operationsdashboard.domain.Environment
import com.fullstackds.examples.operationsdashboard.domain.Incident
import com.fullstackds.examples.operationsdashboard.domain.IncidentDetail
import com.fullstackds.examples.operationsdashboard.domain.IncidentFilters
import com.fullstackds.examples.operationsdashboard.domain.Severity
import com.fullstackds.examples.operationsdashboard.domain.ServiceHealth
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

/** Simulated latency (ms) so loading/pending states are observable. */
const val LATENCY_MS = 350L

/** Local UI filter state (the controlled inputs). */
data class FilterState(
    val search: String = "",
    /** "" = all environments (the Select's sentinel value). */
    val environment: String = "",
    val severities: Set<Severity> = emptySet(),
) {
    /** Whether any filter is active (drives the Clear affordance). */
    val active: Boolean
        get() = search.isNotBlank() || environment.isNotEmpty() || severities.isNotEmpty()
}

/** Load phase for the queue + summary. */
enum class LoadPhase { Loading, Loaded, Error }

/** A transient acknowledgement. */
data class ToastState(
    val id: Int,
    val title: String,
    val variant: ToastVariant,
)

/** Toast variant — app-side semantics; see the README ledger for the target's Toast surface gap. */
enum class ToastVariant { Success, Info, Warning, Error }

/** Map the UI filter state to the API's filter record (mirrors `toApiFilters`). */
internal fun FilterState.toApiFilters(): IncidentFilters = IncidentFilters(
    search = search.trim().takeIf { it.isNotEmpty() },
    environment = environmentFromFilterValue(environment),
    severities = severities.toList(),
)

/**
 * One controller per app session. [scope] is the composition's
 * `rememberCoroutineScope()`, so in-flight loads are cancelled with the window.
 */
class DashboardController(
    private val api: OperationsApi = createOperationsApi(OperationsApiOptions(latencyMs = LATENCY_MS)),
    private val scope: CoroutineScope,
) {
    var phase by mutableStateOf(LoadPhase.Loading)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set
    var incidents by mutableStateOf<List<Incident>>(emptyList())
        private set
    var services by mutableStateOf<List<ServiceHealth>>(emptyList())
        private set
    var selectedId by mutableStateOf<String?>(null)
        private set
    var detail by mutableStateOf<IncidentDetail?>(null)
        private set
    var detailLoading by mutableStateOf(false)
        private set
    var filters by mutableStateOf(FilterState())
    var failLoads by mutableStateOf(false)
    var assignOpen by mutableStateOf(false)
    var assignPending by mutableStateOf(false)
        private set
    var assigneeInput by mutableStateOf("")
    var resolveOpen by mutableStateOf(false)
    var resolvePending by mutableStateOf(false)
        private set
    var toast by mutableStateOf<ToastState?>(null)
        private set

    /** Most recently issued request per channel; stale responses are dropped. */
    private var loadGeneration = 0
    private var detailGeneration = 0
    private var toastSeq = 0

    /** The currently selected incident's queue row (null when none selected). */
    val selectedIncident: Incident?
        get() = incidents.firstOrNull { it.id == selectedId }

    // --- Loading -------------------------------------------------------------

    /** Load the queue + service health for [activeFilters]. Re-runs on filter change. */
    fun load(activeFilters: FilterState) {
        val generation = ++loadGeneration
        phase = LoadPhase.Loading
        errorMessage = null
        scope.launch {
            val (listResult, healthResult) = coroutineScope {
                val list = async { api.listIncidents(activeFilters.toApiFilters()) }
                val health = async { api.listServiceHealth() }
                list.await() to health.await()
            }
            // Drop stale responses when filters changed mid-flight.
            if (generation != loadGeneration) return@launch
            val listOk = listResult as? ApiResult.Ok
            val healthOk = healthResult as? ApiResult.Ok
            if (listOk == null) {
                errorMessage = (listResult as ApiResult.Err).error.message
                phase = LoadPhase.Error
                return@launch
            }
            if (healthOk == null) {
                errorMessage = (healthResult as ApiResult.Err).error.message
                phase = LoadPhase.Error
                return@launch
            }
            incidents = listOk.value
            services = healthOk.value
            phase = LoadPhase.Loaded
        }
    }

    /** Re-run the simulated load for the current filters (error → loading → loaded). */
    fun retry() = load(filters)

    // --- Filters -------------------------------------------------------------

    fun setSearch(value: String) {
        filters = filters.copy(search = value)
    }

    fun setEnvironment(value: String) {
        filters = filters.copy(environment = value)
    }

    /** Union within the severity axis: toggling one severity never clears others. */
    fun toggleSeverity(severity: Severity) {
        val next = if (severity in filters.severities) {
            filters.severities - severity
        } else {
            filters.severities + severity
        }
        filters = filters.copy(severities = next)
    }

    /** Reset all filter state; the full queue returns. */
    fun clearFilters() {
        filters = FilterState()
    }

    // --- Selection & detail ----------------------------------------------------

    /** Select a queue row and fetch its detail; re-selecting replaces the selection. */
    fun selectIncident(id: String) {
        selectedId = id
        detail = null
        detailLoading = true
        val generation = ++detailGeneration
        scope.launch {
            val result = api.getIncident(id)
            if (generation != detailGeneration) return@launch
            detailLoading = false
            val detailOk = result as? ApiResult.Ok
            if (detailOk != null) {
                detail = detailOk.value
            } else {
                // Selected incident vanished (e.g. resolved elsewhere) — clear it.
                detail = null
                selectedId = null
            }
        }
    }

    fun clearSelection() {
        detailGeneration++
        selectedId = null
        detail = null
        detailLoading = false
    }

    // --- Dev affordance --------------------------------------------------------

    /**
     * Toggle the API's simulated load-failure flag (drives the error+retry path).
     * Named after the API verb — `setFailLoads` would clash with the
     * `failLoads` property's JVM setter signature.
     */
    fun simulateLoadFailure(enabled: Boolean) {
        api.simulateLoadFailure(enabled)
        failLoads = enabled
    }

    // --- Toasts ----------------------------------------------------------------

    private fun pushToast(title: String, variant: ToastVariant) {
        toastSeq += 1
        toast = ToastState(id = toastSeq, title = title, variant = variant)
    }

    fun dismissToast() {
        toast = null
    }

    // --- Assign workflow (Sheet) -------------------------------------------------

    fun openAssign() {
        assignOpen = true
    }

    fun closeAssign() {
        assignOpen = false
    }

    fun submitAssign() {
        val id = selectedId ?: return
        val assignee = assigneeInput.trim()
        if (assignee.isEmpty()) return
        assignPending = true
        scope.launch {
            val result = api.assignIncident(id, assignee)
            assignPending = false
            assignOpen = false
            assigneeInput = ""
            val ok = result as? ApiResult.Ok
            if (ok != null) {
                // Reflect the new assignee in the queue row and detail pane.
                incidents = incidents.map {
                    if (it.id == ok.value.id) it.copy(assignee = ok.value.assignee) else it
                }
                detail = detail?.let { d ->
                    if (d.id == ok.value.id) d.copy(incident = ok.value) else d
                }
                pushToast("Assigned ${ok.value.id} to $assignee", ToastVariant.Success)
            } else {
                pushToast((result as ApiResult.Err).error.message, ToastVariant.Error)
            }
        }
    }

    // --- Resolve & close (confirm Dialog) ----------------------------------------

    fun openResolve() {
        resolveOpen = true
    }

    fun closeResolve() {
        resolveOpen = false
    }

    /** Confirm removes the item from the queue, clears selection, raises a toast. */
    fun confirmResolve() {
        val id = selectedId ?: return
        resolvePending = true
        scope.launch {
            val result = api.resolveIncident(id)
            resolvePending = false
            resolveOpen = false
            val ok = result as? ApiResult.Ok
            if (ok != null) {
                incidents = incidents.filter { it.id != id }
                clearSelection()
                pushToast("Resolved & closed $id", ToastVariant.Success)
            } else {
                pushToast((result as ApiResult.Err).error.message, ToastVariant.Error)
            }
        }
    }
}
