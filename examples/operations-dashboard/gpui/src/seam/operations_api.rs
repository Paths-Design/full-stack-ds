//! Lane-local functional API for the GPUI lane (Rust port of
//! `examples/operations-dashboard/src/api/operations-api.ts`).
//!
//! The reference TypeScript API is promise-returning so web loading / error /
//! pending states are real async transitions. The Rust mirror is
//! **synchronous and pure**: it holds the same state (a mutable in-memory
//! incident copy seeded from the adapter snapshot, the fixed-latency knob, and
//! the explicit failure flag) but performs no scheduling. The GPUI binary
//! creates the async transitions itself — `cx.spawn` +
//! `background_executor().timer(latency)` with this API's fixed
//! [`OperationsApiOptions::latency_ms`] and an explicit failure flag — so
//! there is no wall-clock randomness anywhere.
//!
//! BOUNDARY: UI code calls only this surface. It never imports the adapter or
//! the raw fixtures.

use super::adapter::{FixtureSnapshot, build_incident_detail, load_fixtures};
use super::types::{
    ApiError, ApiErrorCode, ApiResult, Incident, IncidentDetail, IncidentFilters, ServiceHealth,
};

/// Construction-time options. All fields have deterministic defaults.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OperationsApiOptions {
    /// Simulated latency the UI applies to every call, in milliseconds.
    /// Default 0 so tests run instantly; the binary passes a fixed nonzero
    /// value to exercise its loading states. Never randomized.
    pub latency_ms: u64,
    /// When true, read calls (`list_incidents`, `get_incident`,
    /// `list_service_health`) return `Err(ApiError { code: LoadFailed })` to
    /// exercise the error + retry path. Toggle at runtime via
    /// [`OperationsApi::set_load_failure`].
    pub fail_loads: bool,
}

impl Default for OperationsApiOptions {
    fn default() -> Self {
        Self {
            latency_ms: 0,
            fail_loads: false,
        }
    }
}

fn err<T>(code: ApiErrorCode, message: impl Into<String>) -> ApiResult<T> {
    Err(ApiError::new(code, message))
}

/// Filter semantics identical to the TypeScript `matchesFilters`:
/// environment equality; severities union within the axis; case-insensitive
/// trimmed substring over `"{id} {title} {service}"`; intersection across axes.
fn matches_filters(incident: &Incident, filters: &IncidentFilters) -> bool {
    if let Some(environment) = filters.environment {
        if incident.environment != environment {
            return false;
        }
    }
    if !filters.severities.is_empty() && !filters.severities.contains(&incident.severity) {
        return false;
    }
    if let Some(search) = filters.search.as_deref() {
        let needle = search.trim().to_lowercase();
        if !needle.is_empty() {
            let haystack =
                format!("{} {} {}", incident.id, incident.title, incident.service).to_lowercase();
            if !haystack.contains(&needle) {
                return false;
            }
        }
    }
    true
}

/// The operations-dashboard functional API. Construct one per app session via
/// [`OperationsApi::new`]; it seeds its mutable state from the fixture
/// snapshot so mutations stay inside this instance (per-instance isolation).
#[derive(Clone, Debug)]
pub struct OperationsApi {
    snapshot: &'static FixtureSnapshot,
    /// Mutable working copy of incidents (API-owned, not the fixture array).
    incidents: Vec<Incident>,
    latency_ms: u64,
    fail_loads: bool,
}

impl OperationsApi {
    /// Construct an API seeded from the memoized fixture snapshot.
    pub fn new(options: OperationsApiOptions) -> Self {
        let snapshot = load_fixtures();
        // Clone each record so mutations stay inside the API instance.
        Self {
            snapshot,
            incidents: snapshot.incidents.clone(),
            latency_ms: options.latency_ms,
            fail_loads: options.fail_loads,
        }
    }

    /// Fixed latency (ms) the UI layer should simulate per call.
    pub fn latency_ms(&self) -> u64 {
        self.latency_ms
    }

    /// Toggle the simulated read-failure flag (drives error → retry).
    pub fn set_load_failure(&mut self, enabled: bool) {
        self.fail_loads = enabled;
    }

    /// Current simulated failure flag.
    pub fn load_failure(&self) -> bool {
        self.fail_loads
    }

    /// List active (unresolved) incidents matching the multi-axis filters.
    pub fn list_incidents(&self, filters: &IncidentFilters) -> ApiResult<Vec<Incident>> {
        if self.fail_loads {
            return err(
                ApiErrorCode::LoadFailed,
                "Simulated load failure while listing incidents.",
            );
        }
        Ok(self
            .incidents
            .iter()
            .filter(|incident| !incident.resolved && matches_filters(incident, filters))
            .cloned()
            .collect())
    }

    /// Fetch the full detail (description + timeline) for one incident id.
    pub fn get_incident(&self, id: &str) -> ApiResult<IncidentDetail> {
        if self.fail_loads {
            return err(
                ApiErrorCode::LoadFailed,
                "Simulated load failure while fetching incident detail.",
            );
        }
        match self.incidents.iter().find(|incident| incident.id == id) {
            Some(incident) if !incident.resolved => {
                Ok(build_incident_detail(self.snapshot, incident))
            }
            _ => err(
                ApiErrorCode::NotFound,
                format!("Incident {id} not found in the active queue."),
            ),
        }
    }

    /// List per-service health for the header summary band.
    pub fn list_service_health(&self) -> ApiResult<Vec<ServiceHealth>> {
        if self.fail_loads {
            return err(
                ApiErrorCode::LoadFailed,
                "Simulated load failure while listing service health.",
            );
        }
        Ok(self.snapshot.services.clone())
    }

    /// Assign (or reassign) an incident; returns the updated incident.
    pub fn assign_incident(&mut self, id: &str, assignee: &str) -> ApiResult<Incident> {
        let Some(incident) = self
            .incidents
            .iter_mut()
            .find(|incident| incident.id == id && !incident.resolved)
        else {
            return err(
                ApiErrorCode::NotFound,
                format!("Incident {id} not found in the active queue."),
            );
        };
        incident.assignee = Some(assignee.to_string());
        Ok(incident.clone())
    }

    /// Resolve & close an incident, removing it from the active queue.
    pub fn resolve_incident(&mut self, id: &str) -> ApiResult<Incident> {
        let Some(incident) = self.incidents.iter_mut().find(|incident| incident.id == id) else {
            return err(ApiErrorCode::NotFound, format!("Incident {id} not found."));
        };
        if incident.resolved {
            return err(
                ApiErrorCode::AlreadyResolved,
                format!("Incident {id} is already resolved."),
            );
        }
        incident.resolved = true;
        Ok(incident.clone())
    }
}
