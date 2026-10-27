//! Lane-local data seam: adapter → types → API.
//!
//! BOUNDARY (mirrors `examples/operations-dashboard/README.md` → "Consumption
//! boundary"): UI code consumes ONLY [`operations_api::OperationsApi`]. The
//! adapter ([`adapter`]) is the single module that knows the raw fixture file
//! shape; reaching past the API into the adapter or the fixtures from UI code
//! is a boundary violation, the same class as reaching past the
//! `full_stack_ds_gpui` public exports.

pub mod adapter;
pub mod operations_api;
pub mod types;

pub use adapter::{FixtureSnapshot, build_incident_detail, load_fixtures};
pub use operations_api::{OperationsApi, OperationsApiOptions};
pub use types::{
    ApiError, ApiErrorCode, ApiResult, Environment, Incident, IncidentDetail, IncidentFilters,
    ServiceHealth, ServiceStatus, Severity, TimelineEvent,
};
