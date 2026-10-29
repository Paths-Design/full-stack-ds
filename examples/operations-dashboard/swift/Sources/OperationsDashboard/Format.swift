// Pure display-formatting helpers for the operations-dashboard swift lane.
// Swift port of the React lane's `format.ts`: they map domain values to the
// props/channels the public DsSwiftUI components expect. App-layer
// presentation logic — no styling decisions that belong to the package.

import Foundation
import DsSwiftUI
import OperationsDashboardSeam

enum Format {
    /// Display label for an incident severity.
    static func severityLabel(_ severity: Severity) -> String {
        switch severity {
        case .critical: return "Critical"
        case .high: return "High"
        case .low: return "Low"
        }
    }

    /// Map incident severity to a Badge intent (color semantics owned by Badge).
    static func severityBadgeIntent(_ severity: Severity) -> BadgeIntent {
        switch severity {
        case .critical: return .danger
        case .high: return .warning
        case .low: return .info
        }
    }

    /// Map service-health status to a Status intent (owned by Status).
    static func serviceStatusIntent(_ status: ServiceStatus) -> StatusIntent {
        switch status {
        case .healthy: return .success
        case .degraded: return .warning
        case .down: return .danger
        }
    }

    /// Display label for a toast variant (the FSDS Toast surface exposes no
    /// variant channel on this target — see the lane README findings).
    static func toastLabel(_ variant: DashboardToast.Variant) -> String {
        switch variant {
        case .success: return "Success"
        case .info: return "Info"
        case .warning: return "Warning"
        case .error: return "Error"
        }
    }

    /// Map a toast variant to the Badge intent shown in the Toast item region.
    static func toastBadgeIntent(_ variant: DashboardToast.Variant) -> BadgeIntent {
        switch variant {
        case .success: return .success
        case .info: return .info
        case .warning: return .warning
        case .error: return .danger
        }
    }

    /// Compact relative age from an ISO-8601 timestamp (e.g. "3h", "2d"),
    /// matching the React lane's `formatAge` granularity.
    static func age(of iso: String, now: Date = Date()) -> String {
        let decoder = ISO8601DateFormatter()
        decoder.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let opened = decoder.date(from: iso) else {
            return "—"
        }
        let diffSeconds = max(0, now.timeIntervalSince(opened))
        let minutes = Int(diffSeconds / 60)
        if minutes < 60 { return "\(minutes)m" }
        let hours = minutes / 60
        if hours < 24 { return "\(hours)h" }
        return "\(hours / 24)d"
    }

    /// Assignee cell text: handle, or an em-dash when unassigned (React parity).
    static func assigneeText(_ assignee: String?) -> String {
        assignee ?? "—"
    }
}
