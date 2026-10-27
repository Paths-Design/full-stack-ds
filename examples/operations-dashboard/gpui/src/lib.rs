//! Operations dashboard GPUI lane — data seam library.
//!
//! This crate is the standalone GPUI consumer lane for the
//! operations-dashboard example (`examples/operations-dashboard/spec.md`).
//! The library target holds ONLY the lane-local data seam: domain types, the
//! fixture adapter (the single fixture-shape reader), and the synchronous
//! `OperationsApi` that mirrors the reference TypeScript API
//! (`examples/operations-dashboard/src/api/operations-api.ts`).
//!
//! The seam is pure `std` + `serde`: it deliberately imports no gpui types so
//! `cargo test` exercises it without a platform backend. The binary target
//! (`src/main.rs`) owns the GPUI app and turns the synchronous seam into real
//! async UI transitions via gpui's executor (fixed-latency timer + explicit
//! failure flag — never wall-clock randomness).

pub mod seam;

pub use seam::{
    ApiError, ApiErrorCode, ApiResult, Environment, FixtureSnapshot, Incident, IncidentDetail,
    IncidentFilters, OperationsApi, OperationsApiOptions, ServiceHealth, ServiceStatus, Severity,
    TimelineEvent, adapter, build_incident_detail, load_fixtures, operations_api,
};
