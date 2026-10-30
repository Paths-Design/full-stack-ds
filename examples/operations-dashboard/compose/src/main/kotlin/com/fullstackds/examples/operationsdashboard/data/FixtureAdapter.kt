// Lane-local fixture adapter for the operations-dashboard compose lane.
//
// Kotlin port of `examples/operations-dashboard/src/data/adapter.ts`. This
// object is the ONLY layer in the lane that touches the raw fixture file
// shape. It reads the static JSON/JSONL fixtures from the classloader
// (lane-owned copies under src/main/resources/fixtures/ — never the sibling
// lane's files), parses them with kotlinx-serialization into the typed domain
// records declared in `domain/Domain.kt`, joins descriptions and timelines
// onto incidents, and sorts each timeline chronologically. A malformed
// fixture throws IllegalStateException at load/construction time — an
// authoring error, never a domain error surfaced to the UI.
//
// BOUNDARY: UI code must NOT import this object or the raw fixtures. The UI
// consumes data only through the functional API in `api/OperationsApi.kt`,
// which builds on this adapter.

package com.fullstackds.examples.operationsdashboard.data

import com.fullstackds.examples.operationsdashboard.domain.Incident
import com.fullstackds.examples.operationsdashboard.domain.IncidentDetail
import com.fullstackds.examples.operationsdashboard.domain.ServiceHealth
import com.fullstackds.examples.operationsdashboard.domain.TimelineEvent
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Fixture wrapper for `service-health.json` (the file's single top-level key). */
@Serializable
internal data class ServiceHealthFile(val services: List<ServiceHealth>)

/** The fully-parsed, joined snapshot the API operates over. */
data class FixtureSnapshot(
    /** Active queue rows (compact incident shape), in fixture order. */
    val incidents: List<Incident>,
    /** Per-service health for the summary band. */
    val services: List<ServiceHealth>,
    /** Timeline events, grouped by incident id for detail lookup. */
    val timelineByIncident: Map<String, List<TimelineEvent>>,
    /** Long-form descriptions keyed by incident id. */
    val descriptionById: Map<String, String>,
)

/**
 * Build the full detail record for one incident by joining the compact row
 * with its description and timeline. Description falls back to a stable
 * placeholder when the fixture has none for the id.
 */
fun buildIncidentDetail(snapshot: FixtureSnapshot, incident: Incident): IncidentDetail =
    IncidentDetail(
        incident = incident,
        description = snapshot.descriptionById[incident.id]
            ?: "No description recorded for this incident.",
        timeline = snapshot.timelineByIncident[incident.id] ?: emptyList(),
    )

object FixtureAdapter {
    /** Strict parser: unknown keys and malformed values throw (authoring errors). */
    private val json = Json {
        ignoreUnknownKeys = false
        isLenient = false
    }

    /** Read a classloader resource; a missing fixture is an authoring error. */
    private fun readResource(name: String): String {
        val stream = FixtureAdapter::class.java.getResourceAsStream("/fixtures/$name")
            ?: throw IllegalStateException(
                "operations-dashboard adapter: fixture resource not found: fixtures/$name",
            )
        return stream.use { it.readBytes().toString(Charsets.UTF_8) }
    }

    /** Parse a JSONL string into records, rejecting blank-line payloads loudly. */
    private inline fun <reified T> parseJsonl(raw: String, file: String): List<T> =
        raw.lineSequence()
            .mapIndexedNotNull { index, line ->
                val trimmed = line.trim()
                if (trimmed.isEmpty()) {
                    null
                } else {
                    try {
                        json.decodeFromString<T>(trimmed)
                    } catch (cause: Exception) {
                        // A malformed fixture is a programmer/authoring error,
                        // not a domain failure — throw at load time.
                        throw IllegalStateException(
                            "operations-dashboard adapter: invalid JSONL at $file:${index + 1}",
                            cause,
                        )
                    }
                }
            }
            .toList()

    private inline fun <reified T> parseJson(raw: String, file: String): T =
        try {
            json.decodeFromString<T>(raw)
        } catch (cause: Exception) {
            throw IllegalStateException(
                "operations-dashboard adapter: invalid JSON in $file",
                cause,
            )
        }

    /**
     * Parse all lane-owned fixtures into a typed snapshot. The static fixtures
     * are read and parsed once per call site need; the API seeds its own
     * mutable working copy from the result, so the snapshot itself is
     * treated as immutable by convention.
     */
    fun loadFixtures(): FixtureSnapshot {
        val incidents = parseJsonl<Incident>(readResource("incidents.jsonl"), "incidents.jsonl")
        val events = parseJsonl<TimelineEvent>(readResource("timeline-events.jsonl"), "timeline-events.jsonl")
        val services = parseJson<ServiceHealthFile>(readResource("service-health.json"), "service-health.json").services
        val descriptions = parseJson<Map<String, String>>(readResource("incident-descriptions.json"), "incident-descriptions.json")

        val timelineByIncident = events
            .groupBy { it.incidentId }
            .mapValues { (_, list) -> list.sortedBy { it.at } }

        return FixtureSnapshot(
            incidents = incidents,
            services = services,
            timelineByIncident = timelineByIncident,
            descriptionById = descriptions,
        )
    }
}
