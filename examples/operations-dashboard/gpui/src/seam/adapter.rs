//! Lane-local fixture adapter — the ONLY layer that knows the raw fixture file
//! shape (Rust port of `examples/operations-dashboard/src/data/adapter.ts`).
//!
//! The four fixture files are lane-owned verbatim copies under
//! `fixtures/`, embedded at compile time via `include_str!`. The adapter
//! parses and lightly validates them into the typed domain records, joins
//! descriptions and chronologically-sorted timelines onto incidents, and
//! memoizes the parsed snapshot (the static fixtures are read and parsed
//! once). A malformed fixture panics at load time — an authoring error —
//! rather than surfacing as a domain `ApiError` to the UI.
//!
//! BOUNDARY: UI code must NOT use this module or the raw fixtures directly;
//! it consumes data only through [`crate::seam::operations_api::OperationsApi`].

use std::sync::OnceLock;

use super::types::{Incident, IncidentDetail, ServiceHealth, TimelineEvent};

/// Lane-owned verbatim fixture copies (byte-identical to
/// `examples/operations-dashboard/fixtures/`).
pub mod raw {
    pub const INCIDENTS_JSONL: &str = include_str!("../../fixtures/incidents.jsonl");
    pub const TIMELINE_EVENTS_JSONL: &str = include_str!("../../fixtures/timeline-events.jsonl");
    pub const SERVICE_HEALTH_JSON: &str = include_str!("../../fixtures/service-health.json");
    pub const INCIDENT_DESCRIPTIONS_JSON: &str =
        include_str!("../../fixtures/incident-descriptions.json");
}

/// The fully-parsed, joined snapshot the API operates over.
#[derive(Clone, Debug, Default)]
pub struct FixtureSnapshot {
    /// Active queue rows (compact incident shape), in fixture order.
    pub incidents: Vec<Incident>,
    /// Per-service health for the summary band, in fixture order.
    pub services: Vec<ServiceHealth>,
    /// Timeline events grouped by incident id, each list chronological.
    pub timeline_by_incident: std::collections::BTreeMap<String, Vec<TimelineEvent>>,
    /// Long-form descriptions keyed by incident id.
    pub description_by_id: std::collections::BTreeMap<String, String>,
}

/// Parse a JSONL string into typed records, ignoring blank lines. A malformed
/// line panics with file:line context — an authoring error, not a domain
/// failure.
fn parse_jsonl<T: serde::de::DeserializeOwned>(raw: &str, file: &str) -> Vec<T> {
    let mut out = Vec::new();
    for (index, line) in raw.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        match serde_json::from_str(line) {
            Ok(record) => out.push(record),
            Err(cause) => panic!(
                "operations-dashboard adapter: invalid JSONL at {file}:{}: {cause}",
                index + 1
            ),
        }
    }
    out
}

/// Parse all lane fixtures into a typed snapshot.
///
/// Memoized behind a process-wide lock: the embedded fixtures are parsed once,
/// then the same frozen-by-convention snapshot is reused. The API clones its
/// own mutable working copy out of the snapshot, so mutations never touch it.
pub fn load_fixtures() -> &'static FixtureSnapshot {
    static SNAPSHOT: OnceLock<FixtureSnapshot> = OnceLock::new();
    SNAPSHOT.get_or_init(|| {
        let incidents: Vec<Incident> = parse_jsonl(raw::INCIDENTS_JSONL, "incidents.jsonl");
        let events: Vec<TimelineEvent> =
            parse_jsonl(raw::TIMELINE_EVENTS_JSONL, "timeline-events.jsonl");
        #[derive(serde::Deserialize)]
        struct ServiceHealthFile {
            #[serde(rename = "services")]
            records: Vec<ServiceHealth>,
        }
        let services: Vec<ServiceHealth> =
            serde_json::from_str::<ServiceHealthFile>(raw::SERVICE_HEALTH_JSON)
                .unwrap_or_else(|cause| {
                    panic!("operations-dashboard adapter: invalid service-health.json: {cause}")
                })
                .records;
        let descriptions: std::collections::BTreeMap<String, String> =
            serde_json::from_str(raw::INCIDENT_DESCRIPTIONS_JSON).unwrap_or_else(|cause| {
                panic!("operations-dashboard adapter: invalid incident-descriptions.json: {cause}")
            });

        let mut timeline_by_incident: std::collections::BTreeMap<String, Vec<TimelineEvent>> =
            std::collections::BTreeMap::new();
        for event in events {
            timeline_by_incident
                .entry(event.incident_id.clone())
                .or_default()
                .push(event);
        }
        // Keep each incident's timeline in chronological order regardless of
        // fixture line order, so the detail surface is deterministic.
        // (ISO-8601 timestamps sort lexicographically, as in the TS seam.)
        for list in timeline_by_incident.values_mut() {
            list.sort_by(|a, b| a.at.cmp(&b.at));
        }

        FixtureSnapshot {
            incidents,
            services,
            timeline_by_incident,
            description_by_id: descriptions,
        }
    })
}

/// Build the full detail record for one incident by joining the compact row
/// with its description and timeline. Falls back to a recorded placeholder
/// description and an empty timeline when the id has no joined fixture data.
pub fn build_incident_detail(snapshot: &FixtureSnapshot, incident: &Incident) -> IncidentDetail {
    IncidentDetail {
        incident: incident.clone(),
        description: snapshot
            .description_by_id
            .get(&incident.id)
            .cloned()
            .unwrap_or_else(|| "No description recorded for this incident.".to_string()),
        timeline: snapshot
            .timeline_by_incident
            .get(&incident.id)
            .cloned()
            .unwrap_or_default(),
    }
}
