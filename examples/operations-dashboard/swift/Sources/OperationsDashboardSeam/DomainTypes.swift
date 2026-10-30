// Lane-local app-layer domain + API types for the operations-dashboard swift
// lane.
//
// These are NOT package exports. They are the Swift port of the seam types
// declared in `../../src/types/index.ts` (the React lane's shared seam
// shape): the records the fixture adapter parses out of the static fixtures
// and the values the functional API returns to the UI. App UI code consumes
// these types via the API surface only (`OperationsApi` / `createOperationsApi`).
//
// Naming note: the TS `Environment` domain union is ported as `OpsEnvironment`
// because SwiftUI owns the `Environment` symbol and the app target imports
// SwiftUI; the domain concept and its values ("prod" / "staging" / "dev") are
// unchanged.

import Foundation

/// Service health classification used by summary tiles and queue rows.
public enum ServiceStatus: String, Codable, Sendable, CaseIterable {
    case healthy
    case degraded
    case down
}

/// Incident severity. Ordered most-to-least urgent for display.
public enum Severity: String, Codable, Sendable, CaseIterable {
    case critical
    case high
    case low
}

/// Deployment environment an incident or service belongs to
/// (TS seam name: `Environment`).
public enum OpsEnvironment: String, Codable, Sendable, CaseIterable {
    case prod
    case staging
    case dev
}

/// A single service's current health, used for the header summary band.
public struct ServiceHealth: Codable, Hashable, Sendable, Identifiable {
    /// Stable service identifier, e.g. "checkout-api".
    public let id: String
    /// Human-readable service name.
    public let name: String
    /// Current health classification.
    public let status: ServiceStatus
    /// Environment this health record describes.
    public let environment: OpsEnvironment

    public init(id: String, name: String, status: ServiceStatus, environment: OpsEnvironment) {
        self.id = id
        self.name = name
        self.status = status
        self.environment = environment
    }
}

/// A queue row: the compact incident shape shown in the dense table/list.
public struct Incident: Codable, Hashable, Sendable, Identifiable {
    /// Stable incident identifier, e.g. "INC-1042".
    public let id: String
    /// Short incident title.
    public let title: String
    /// Owning service id (joins to `ServiceHealth.id`).
    public let service: String
    /// Incident severity.
    public let severity: Severity
    /// Environment the incident occurred in.
    public let environment: OpsEnvironment
    /// ISO-8601 timestamp the incident opened.
    public let openedAt: String
    /// Assignee handle, or nil when unassigned.
    public var assignee: String?
    /// Whether the incident has been resolved (removed from the active queue).
    public var resolved: Bool

    public init(
        id: String,
        title: String,
        service: String,
        severity: Severity,
        environment: OpsEnvironment,
        openedAt: String,
        assignee: String?,
        resolved: Bool
    ) {
        self.id = id
        self.title = title
        self.service = service
        self.severity = severity
        self.environment = environment
        self.openedAt = openedAt
        self.assignee = assignee
        self.resolved = resolved
    }
}

/// A single event in an incident's timeline (progressive-disclosure detail).
public struct TimelineEvent: Codable, Hashable, Sendable {
    /// Owning incident id.
    public let incidentId: String
    /// ISO-8601 timestamp of the event.
    public let at: String
    /// Event kind, e.g. "opened" | "ack" | "comment" | "escalated".
    public let kind: String
    /// Free-text event message.
    public let message: String
}

/// The full detail surface for a selected incident: row + body + timeline.
///
/// The TS seam models this as `IncidentDetail extends Incident`; Swift structs
/// do not inherit, so the row fields are flattened onto the detail record and
/// the adapter owns the join from an `Incident`.
public struct IncidentDetail: Hashable, Sendable, Identifiable {
    public let id: String
    public let title: String
    public let service: String
    public let severity: Severity
    public let environment: OpsEnvironment
    public let openedAt: String
    public var assignee: String?
    public let resolved: Bool
    /// Long-form incident description.
    public let descriptionText: String
    /// Chronologically ordered timeline events.
    public let timeline: [TimelineEvent]

    public init(
        id: String,
        title: String,
        service: String,
        severity: Severity,
        environment: OpsEnvironment,
        openedAt: String,
        assignee: String?,
        resolved: Bool,
        descriptionText: String,
        timeline: [TimelineEvent]
    ) {
        self.id = id
        self.title = title
        self.service = service
        self.severity = severity
        self.environment = environment
        self.openedAt = openedAt
        self.assignee = assignee
        self.resolved = resolved
        // TS seam property name: `description`. Renamed here so the record does
        // not shadow `CustomStringConvertible.description` in UI code.
        self.descriptionText = descriptionText
        self.timeline = timeline
    }
}

/// Multi-axis filter applied to the queue. All axes are optional (nil/empty = no filter).
public struct IncidentFilters: Sendable, Equatable {
    /// Case-insensitive substring matched against id, title, and service.
    public var search: String?
    /// Restrict to a single environment.
    public var environment: OpsEnvironment?
    /// Restrict to one or more severities. nil/empty means "any".
    /// Semantics: union within this axis, intersection across axes.
    public var severities: [Severity]?

    public init(search: String? = nil, environment: OpsEnvironment? = nil, severities: [Severity]? = nil) {
        self.search = search
        self.environment = environment
        self.severities = severities
    }
}

/// Typed error codes the API surfaces instead of throwing untyped errors
/// (values match the TS seam's `ApiErrorCode` strings).
public enum ApiErrorCode: String, Sendable {
    case loadFailed = "LOAD_FAILED"
    case notFound = "NOT_FOUND"
    case alreadyResolved = "ALREADY_RESOLVED"
}

/// A typed API error. Callers narrow on `code` to drive UI error states.
public struct ApiError: Error, Hashable, Sendable {
    public let code: ApiErrorCode
    public let message: String

    public init(code: ApiErrorCode, message: String) {
        self.code = code
        self.message = message
    }
}

/// Discriminated result the API methods return. Methods never throw for
/// domain failures; they return `.failure(error)` so UI lanes can model error
/// states without do/catch around every call. (Programmer errors — e.g. a
/// malformed fixture at construction time — are fatal authoring errors in the
/// adapter, mirroring the TS seam throwing at load time.)
public enum ApiResult<Value: Sendable>: Sendable {
    case ok(Value)
    case failure(ApiError)
}
