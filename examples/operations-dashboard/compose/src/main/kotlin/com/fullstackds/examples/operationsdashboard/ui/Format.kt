// Pure display-formatting helpers for the operations-dashboard compose lane.
// Kotlin port of the React lane's `format.ts`: these map domain values to the
// props the public design-system components expect. They are app-layer
// presentation logic (not package code) and contain no styling.

package com.fullstackds.examples.operationsdashboard.ui

import com.fullstackds.examples.operationsdashboard.domain.Environment
import com.fullstackds.examples.operationsdashboard.domain.Severity
import com.fullstackds.examples.operationsdashboard.domain.ServiceStatus
import com.fullstackds.components.badge.BadgeIntent
import com.fullstackds.components.status.StatusStatus

/** Display labels for severity values (the fixtures carry lowercase ids). */
val SEVERITY_LABEL: Map<Severity, String> = mapOf(
    Severity.Critical to "Critical",
    Severity.High to "High",
    Severity.Low to "Low",
)

/** All severities, in display order, for the filter control. */
val SEVERITIES: List<Severity> = listOf(Severity.Critical, Severity.High, Severity.Low)

/** Environment options for the filter Select (the "" value = all environments). */
val ENVIRONMENTS: List<EnvironmentOption> = listOf(
    EnvironmentOption(value = "", label = "All environments"),
    EnvironmentOption(value = "prod", label = "prod"),
    EnvironmentOption(value = "staging", label = "staging"),
    EnvironmentOption(value = "dev", label = "dev"),
)

/** One environment `Select` option. */
data class EnvironmentOption(val value: String, val label: String)

/** Map an environment filter value to the domain enum (null = no filter). */
fun environmentFromFilterValue(value: String): Environment? =
    when (value) {
        "prod" -> Environment.Prod
        "staging" -> Environment.Staging
        "dev" -> Environment.Dev
        else -> null
    }

/** Map incident severity to a Badge intent (color semantics owned by Badge). */
fun severityIntent(severity: Severity): BadgeIntent =
    when (severity) {
        Severity.Critical -> BadgeIntent.Danger
        Severity.High -> BadgeIntent.Warning
        Severity.Low -> BadgeIntent.Info
    }

/** Map service-health status to a Status variant (owned by Status). */
fun serviceStatusIntent(status: ServiceStatus): StatusStatus =
    when (status) {
        ServiceStatus.Healthy -> StatusStatus.Success
        ServiceStatus.Degraded -> StatusStatus.Warning
        ServiceStatus.Down -> StatusStatus.Danger
    }

/**
 * Compact relative age from an ISO-8601 timestamp (e.g. "3h", "2d").
 * `nowMs` is injectable so callers can pin the reference clock; the UI passes
 * a composition-time value, mirroring the React lane's `Date.now()` default.
 * Display-only — the data/API seam itself never reads the wall clock.
 */
fun formatAge(iso: String, nowMs: Long): String {
    val thenMs = runCatching { java.time.Instant.parse(iso).toEpochMilli() }
        .getOrNull() ?: return "—"
    val diffMs = (nowMs - thenMs).coerceAtLeast(0)
    val mins = diffMs / 60_000
    if (mins < 60) return "${mins}m"
    val hours = mins / 60
    if (hours < 24) return "${hours}h"
    return "${hours / 24}d"
}
