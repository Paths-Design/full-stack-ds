//! Domain + API types for the GPUI lane's data seam.
//!
//! Rust port of `examples/operations-dashboard/src/types/index.ts`. Field names
//! keep the TypeScript camelCase on the wire (serde renames) so the lane-owned
//! fixture copies parse unchanged; the public Rust surface is idiomatic
//! (SCREAMING_SNAKE error codes, `Option<String>` assignee, enum axes).

use serde::{Deserialize, Serialize};

/// Service health classification used by summary tiles and queue rows.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ServiceStatus {
    Healthy,
    Degraded,
    Down,
}

/// Incident severity. Ordered most-to-least urgent for derived sorting.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Low,
}

impl Severity {
    /// Display order for the filter rail, matching the reference lanes.
    pub const DISPLAY_ORDER: [Severity; 3] = [Severity::Critical, Severity::High, Severity::Low];

    /// Lowercase fixture/display name.
    pub fn as_str(self) -> &'static str {
        match self {
            Severity::Critical => "critical",
            Severity::High => "high",
            Severity::Low => "low",
        }
    }
}

/// Deployment environment an incident or service belongs to.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Environment {
    Prod,
    Staging,
    Dev,
}

impl Environment {
    /// Display order for the environment selector, matching the reference lanes.
    pub const DISPLAY_ORDER: [Environment; 3] =
        [Environment::Prod, Environment::Staging, Environment::Dev];

    /// Lowercase fixture/display name.
    pub fn as_str(self) -> &'static str {
        match self {
            Environment::Prod => "prod",
            Environment::Staging => "staging",
            Environment::Dev => "dev",
        }
    }
}

/// A single service's current health, used for the header summary band.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceHealth {
    /// Stable service identifier, e.g. "checkout-api".
    pub id: String,
    /// Human-readable service name.
    pub name: String,
    /// Current health classification.
    pub status: ServiceStatus,
    /// Environment this health record describes.
    pub environment: Environment,
}

/// A queue row: the compact incident shape shown in the dense table/list.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Incident {
    /// Stable incident identifier, e.g. "INC-1042".
    pub id: String,
    /// Short incident title.
    pub title: String,
    /// Owning service id (joins to [`ServiceHealth::id`]).
    pub service: String,
    /// Incident severity.
    pub severity: Severity,
    /// Environment the incident occurred in.
    pub environment: Environment,
    /// ISO-8601 timestamp the incident opened.
    pub opened_at: String,
    /// Assignee handle, or `None` when unassigned.
    pub assignee: Option<String>,
    /// Whether the incident has been resolved (removed from the active queue).
    pub resolved: bool,
}

/// A single event in an incident's timeline (progressive-disclosure detail).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    /// Owning incident id.
    pub incident_id: String,
    /// ISO-8601 timestamp of the event.
    pub at: String,
    /// Event kind, e.g. "opened" | "ack" | "comment" | "escalated".
    pub kind: String,
    /// Free-text event message.
    pub message: String,
}

/// The full detail surface for a selected incident: row + body + timeline.
///
/// The TypeScript seam models this as `interface IncidentDetail extends
/// Incident`; the Rust mirror is composition — `detail` for the row fields.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IncidentDetail {
    /// The compact queue row this detail belongs to.
    pub incident: Incident,
    /// Long-form incident description.
    pub description: String,
    /// Chronologically ordered timeline events.
    pub timeline: Vec<TimelineEvent>,
}

impl IncidentDetail {
    /// Stable incident id.
    pub fn id(&self) -> &str {
        &self.incident.id
    }
}

/// Multi-axis filter applied to the queue. Unset fields filter nothing.
///
/// Semantics (identical to the TypeScript API's `matchesFilters`):
/// - `search`: case-insensitive substring over `id`, `title`, and `service`
///   (trimmed; empty/whitespace search matches everything);
/// - `environment`: single-value equality;
/// - `severities`: union within this axis (any of the listed severities
///   matches) — and intersection across the three axes.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct IncidentFilters {
    /// Case-insensitive substring matched against id, title, and service.
    pub search: Option<String>,
    /// Restrict to a single environment.
    pub environment: Option<Environment>,
    /// Restrict to these severities; empty means "any".
    pub severities: Vec<Severity>,
}

impl IncidentFilters {
    /// True when any axis is set (drives the Clear-filters affordance).
    pub fn is_active(&self) -> bool {
        self.search.as_deref().is_some_and(|s| !s.trim().is_empty())
            || self.environment.is_some()
            || !self.severities.is_empty()
    }
}

/// Typed error codes the API surfaces instead of panicking on domain failures.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ApiErrorCode {
    /// A simulated read failure (the explicit failure flag is on).
    LoadFailed,
    /// Unknown or resolved incident id.
    NotFound,
    /// `resolve_incident` on an already-resolved incident.
    AlreadyResolved,
}

/// A typed API error. Callers narrow on `code` to drive UI error states.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    /// Machine-readable failure code.
    pub code: ApiErrorCode,
    /// Human-readable failure message.
    pub message: String,
}

impl ApiError {
    pub(crate) fn new(code: ApiErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

/// Discriminated result every API method returns: `Ok(value)` or
/// `Err(ApiError { code, message })`.
///
/// The TypeScript seam resolves a `{ ok: true, value } | { ok: false, error }`
/// union so UI lanes model error states without `try/catch`; the Rust mirror
/// is the `Result` enum under a `ApiResult<T>` alias, which keeps the same
/// `Ok`/`Err` shape while letting callers use `?` in seam code. Methods never
/// panic for domain failures. (Programmer errors — a malformed fixture at
/// construction time — still panic in the adapter, matching the TS seam.)
pub type ApiResult<T> = Result<T, ApiError>;
