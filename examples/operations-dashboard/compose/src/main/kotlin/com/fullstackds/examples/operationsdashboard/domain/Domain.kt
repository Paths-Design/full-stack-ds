// Operations dashboard compose lane — lane-local domain + API types.
//
// Kotlin port of `examples/operations-dashboard/src/types/index.ts`. These are
// NOT package exports; they describe the shapes the lane-local adapter
// (`data/FixtureAdapter.kt`) parses out of the static fixtures and the shapes
// the lane-local functional API (`api/OperationsApi.kt`) returns to the UI.
// UI code consumes these types via the API surface only.
//
// The fixture row shapes and the domain records coincide key-for-key, so the
// records are @Serializable and the adapter stays the single fixture-shape
// reader (it owns the Json instance and the wrapper objects).

package com.fullstackds.examples.operationsdashboard.domain

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Service health classification used by summary tiles and queue rows.
 * `@SerialName` values are the fixture spelling; the adapter owns that
 * mapping (it is fixture-shape knowledge).
 */
@Serializable
enum class ServiceStatus {
    @SerialName("healthy") Healthy,
    @SerialName("degraded") Degraded,
    @SerialName("down") Down,
}

/** Incident severity. Ordered most-to-least urgent for derived sorting. */
@Serializable
enum class Severity {
    @SerialName("critical") Critical,
    @SerialName("high") High,
    @SerialName("low") Low,
}

/** Deployment environment an incident or service belongs to. */
@Serializable
enum class Environment {
    @SerialName("prod") Prod,
    @SerialName("staging") Staging,
    @SerialName("dev") Dev,
}

/** A single service's current health, used for the header summary band. */
@Serializable
data class ServiceHealth(
    val id: String,
    val name: String,
    val status: ServiceStatus,
    val environment: Environment,
)

/** A queue row: the compact incident shape shown in the dense table/list. */
@Serializable
data class Incident(
    val id: String,
    val title: String,
    /** Owning service id (joins to [ServiceHealth.id]). */
    val service: String,
    val severity: Severity,
    val environment: Environment,
    /** ISO-8601 timestamp the incident opened. */
    val openedAt: String,
    /** Assignee handle, or null when unassigned. */
    val assignee: String?,
    /** Whether the incident has been resolved (removed from the active queue). */
    val resolved: Boolean,
)

/** A single event in an incident's timeline (progressive-disclosure detail). */
@Serializable
data class TimelineEvent(
    /** Owning incident id. */
    val incidentId: String,
    /** ISO-8601 timestamp of the event. */
    val at: String,
    /** Event kind, e.g. "opened" | "ack" | "comment" | "escalated". */
    val kind: String,
    /** Free-text event message. */
    val message: String,
)

/** The full detail surface for a selected incident: row + body + timeline. */
data class IncidentDetail(
    val incident: Incident,
    /** Long-form incident description. */
    val description: String,
    /** Chronologically ordered timeline events. */
    val timeline: List<TimelineEvent>,
) {
    /** Convenience projections mirroring the TS detail shape's row fields. */
    val id: String get() = incident.id
    val title: String get() = incident.title
    val service: String get() = incident.service
    val severity: Severity get() = incident.severity
    val environment: Environment get() = incident.environment
    val openedAt: String get() = incident.openedAt
    val assignee: String? get() = incident.assignee
    val resolved: Boolean get() = incident.resolved
}

/** Multi-axis filter applied to the queue. All axes are optional (null = no filter). */
data class IncidentFilters(
    /** Case-insensitive substring matched against id, title, and service. */
    val search: String? = null,
    /** Restrict to a single environment. */
    val environment: Environment? = null,
    /**
     * Restrict to one or more severities. Empty/null means "any".
     * Semantics: union within this axis, intersection across axes.
     */
    val severities: List<Severity> = emptyList(),
)

/** Typed error codes the API surfaces instead of throwing untyped errors. */
enum class ApiErrorCode { LoadFailed, NotFound, AlreadyResolved }

/** A typed API error. Callers narrow on [ApiError.code] to drive UI error states. */
data class ApiError(
    val code: ApiErrorCode,
    val message: String,
)

/**
 * Discriminated result the API methods return. Methods never throw for domain
 * failures; they return [Err] so the UI can model error states without
 * try/catch around every call. (Programmer errors — e.g. a malformed fixture
 * at construction time — still throw.)
 */
sealed interface ApiResult<out T> {
    data class Ok<T>(val value: T) : ApiResult<T>
    data class Err(val error: ApiError) : ApiResult<Nothing>
}
