// Lane-local fixture adapter for the operations-dashboard swift lane.
//
// This type is the ONLY layer that touches the raw fixture file shape. It
// reads the lane-owned static JSON/JSONL copies from this target's resource
// bundle (`Bundle.module` — never `../../fixtures` at runtime), parses and
// lightly validates them into the typed domain records declared in
// `DomainTypes.swift`, and joins descriptions and chronologically sorted
// timelines onto incidents for the functional API (`OperationsApi.swift`).
//
// BOUNDARY: UI code must NOT import this module's adapter or read the raw
// fixtures directly. UI consumes data only through `createOperationsApi` /
// `OperationsApi`. Keeping fixture-shape knowledge here means queue rows stay
// compact JSONL while detail/timeline joins happen in one typed place.
//
// Determinism: parsing is pure — no wall clock, no randomness. A malformed
// fixture is a fatal authoring error (mirrors the TS adapter throwing loudly
// at load time), never a domain error surfaced to the UI.

import Foundation

/// The fully-parsed, joined snapshot the API operates over.
struct FixtureSnapshot: Sendable {
    /// Active queue rows (compact incident shape).
    let incidents: [Incident]
    /// Per-service health for the summary band.
    let services: [ServiceHealth]
    /// Timeline events, grouped by incident id for detail lookup.
    let timelineByIncident: [String: [TimelineEvent]]
    /// Long-form descriptions keyed by incident id.
    let descriptionById: [String: String]
}

enum FixtureAdapter {
    /// The committed fixture files are valid by construction (lane gate);
    /// parse failures crash with the offending file + line instead of
    /// surfacing as an `ApiError`.
    static func loadSnapshot(bundle: Bundle = .module) -> FixtureSnapshot {
        let incidentsRaw = readResource("incidents", "jsonl", from: bundle)
        let timelineRaw = readResource("timeline-events", "jsonl", from: bundle)
        let serviceHealthRaw = readResource("service-health", "json", from: bundle)
        let descriptionsRaw = readResource("incident-descriptions", "json", from: bundle)

        let incidents = parseJsonl(incidentsRaw, file: "incidents.jsonl", as: Incident.self)
        let events = parseJsonl(timelineRaw, file: "timeline-events.jsonl", as: TimelineEvent.self)

        let services: [ServiceHealth]
        do {
            services = try JSONDecoder().decode(ServiceHealthFile.self, from: Data(serviceHealthRaw.utf8)).services
        } catch {
            fatalError("operations-dashboard adapter: invalid service-health.json — \(error)")
        }
        let descriptions: [String: String]
        do {
            descriptions = try JSONDecoder().decode([String: String].self, from: Data(descriptionsRaw.utf8))
        } catch {
            fatalError("operations-dashboard adapter: invalid incident-descriptions.json — \(error)")
        }

        var timelineByIncident: [String: [TimelineEvent]] = [:]
        for event in events {
            timelineByIncident[event.incidentId, default: []].append(event)
        }
        // Keep each incident's timeline in chronological order regardless of
        // fixture line order, so the detail surface is deterministic. ISO-8601
        // UTC stamps compare lexicographically in chronological order.
        for id in timelineByIncident.keys {
            timelineByIncident[id]?.sort { $0.at < $1.at }
        }

        return FixtureSnapshot(
            incidents: incidents,
            services: services,
            timelineByIncident: timelineByIncident,
            descriptionById: descriptions
        )
    }

    /// Build the full detail record for one incident by joining the compact
    /// row with its description and timeline.
    static func buildIncidentDetail(from snapshot: FixtureSnapshot, incident: Incident) -> IncidentDetail {
        IncidentDetail(
            id: incident.id,
            title: incident.title,
            service: incident.service,
            severity: incident.severity,
            environment: incident.environment,
            openedAt: incident.openedAt,
            assignee: incident.assignee,
            resolved: incident.resolved,
            descriptionText: snapshot.descriptionById[incident.id]
                ?? "No description recorded for this incident.",
            timeline: snapshot.timelineByIncident[incident.id] ?? []
        )
    }

    // MARK: - Private

    /// service-health.json's `{ "services": [...] }` envelope.
    private struct ServiceHealthFile: Decodable {
        let services: [ServiceHealth]
    }

    private static func readResource(_ name: String, _ ext: String, from bundle: Bundle) -> String {
        guard let url = bundle.url(forResource: name, withExtension: ext, subdirectory: "Fixtures"),
              let raw = try? String(contentsOf: url, encoding: .utf8)
        else {
            fatalError("operations-dashboard adapter: fixture \(name).\(ext) missing from the resource bundle")
        }
        return raw
    }

    /// Parse a JSONL string into an array of records, ignoring blank lines.
    private static func parseJsonl<T: Decodable>(_ raw: String, file: String, as type: T.Type) -> [T] {
        var out: [T] = []
        let lines = raw.split(separator: "\n", omittingEmptySubsequences: false)
        for (index, rawLine) in lines.enumerated() {
            let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !line.isEmpty else { continue }
            do {
                out.append(try JSONDecoder().decode(T.self, from: Data(line.utf8)))
            } catch {
                // A malformed fixture is a programmer/authoring error, not a
                // domain failure — crash loudly at load time rather than
                // surface it as an ApiError to the UI.
                fatalError("operations-dashboard adapter: invalid JSONL at \(file):\(index + 1) — \(error)")
            }
        }
        return out
    }
}
