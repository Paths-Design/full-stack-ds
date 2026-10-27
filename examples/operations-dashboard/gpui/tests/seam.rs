//! Seam suite for the GPUI lane — mirrors the reference TypeScript seam tests
//! (`examples/operations-dashboard/src/api/operations-api.test.ts`) with
//! `latency_ms: 0`: fixture parsing + joins, each filter axis alone,
//! cross-axis intersection, detail lookup, assign/resolve mutations with
//! per-instance isolation, typed failure + recovery, NOT_FOUND and
//! ALREADY_RESOLVED paths.
//!
//! These tests run on the pure seam (std + serde, no gpui, no platform).

use operations_dashboard_gpui::{
    ApiErrorCode, Environment, IncidentFilters, OperationsApi, OperationsApiOptions, Severity,
};

fn api() -> OperationsApi {
    OperationsApi::new(OperationsApiOptions::default())
}

fn api_failing() -> OperationsApi {
    OperationsApi::new(OperationsApiOptions {
        latency_ms: 0,
        fail_loads: true,
    })
}

fn all() -> Vec<operations_dashboard_gpui::Incident> {
    api()
        .list_incidents(&IncidentFilters::default())
        .expect("load succeeds")
}

fn ids(incidents: &[operations_dashboard_gpui::Incident]) -> Vec<&str> {
    incidents
        .iter()
        .map(|incident| incident.id.as_str())
        .collect()
}

#[test]
fn parses_the_full_active_queue_from_the_embedded_fixtures() {
    let queue = all();
    assert_eq!(queue.len(), 10, "all ten fixture incidents start active");
    assert!(queue.iter().all(|incident| !incident.resolved));
    // Fixture order is preserved (the queue is not reordered by the API).
    assert_eq!(ids(&queue).first(), Some(&"INC-1042"));
    assert_eq!(ids(&queue).last(), Some(&"INC-1051"));
}

#[test]
fn joins_descriptions_and_chronologically_sorted_timelines_into_detail() {
    let detail = api().get_incident("INC-1042").expect("detail found");
    assert!(!detail.description.is_empty(), "description joined");
    let timeline = &detail.timeline;
    assert!(
        timeline.len() >= 2,
        "INC-1042 has a rich multi-event timeline"
    );
    for pair in timeline.windows(2) {
        assert!(
            pair[0].at <= pair[1].at,
            "timeline must be chronological regardless of fixture line order: {} > {}",
            pair[0].at,
            pair[1].at
        );
    }
    assert_eq!(detail.incident.id, "INC-1042");
}

#[test]
fn incidents_without_joined_fixture_data_get_fallback_description_and_empty_timeline() {
    // Every fixture incident has description + timeline rows, so the join
    // fallback is exercised through the public adapter join with a synthetic
    // row (e.g. an API instance seeded with a record the fixtures never
    // described). This pins the documented fallback contract.
    let synthetic = operations_dashboard_gpui::Incident {
        id: "INC-9999".into(),
        title: "Synthetic unmapped incident".into(),
        service: "synthetic".into(),
        severity: Severity::Low,
        environment: Environment::Dev,
        opened_at: "2026-06-26T09:30:00.000Z".into(),
        assignee: None,
        resolved: false,
    };
    let detail = operations_dashboard_gpui::build_incident_detail(
        operations_dashboard_gpui::load_fixtures(),
        &synthetic,
    );
    assert_eq!(
        detail.description, "No description recorded for this incident.",
        "fallback description when the description fixture has no entry"
    );
    assert!(
        detail.timeline.is_empty(),
        "no timeline events join for an unmapped id"
    );
}

#[test]
fn search_axis_matches_case_insensitive_substring_over_id_title_service() {
    // id prefix
    assert_eq!(ids(&search("1042")), vec!["INC-1042"]);
    // title substring, mixed case
    assert_eq!(ids(&search("LATENCY")), vec!["INC-1042"]);
    // service substring
    assert_eq!(ids(&search("cdn")), vec!["INC-1045"]);
    // whitespace-only search matches everything (trimmed, like the TS seam)
    assert_eq!(search("   ").len(), 10);
    // no-match search returns an empty list, not an error
    assert!(search("no-such-incident-xyz").is_empty());
}

fn search(needle: &str) -> Vec<operations_dashboard_gpui::Incident> {
    api()
        .list_incidents(&IncidentFilters {
            search: Some(needle.into()),
            ..Default::default()
        })
        .expect("load succeeds")
}

#[test]
fn environment_axis_filters_by_equality() {
    let prod = api()
        .list_incidents(&IncidentFilters {
            environment: Some(Environment::Prod),
            ..Default::default()
        })
        .expect("load succeeds");
    assert_eq!(
        ids(&prod),
        vec!["INC-1042", "INC-1043", "INC-1045", "INC-1048", "INC-1051"]
    );
    assert!(
        prod.iter()
            .all(|incident| incident.environment == Environment::Prod)
    );
}

#[test]
fn severity_axis_is_a_union_within_the_axis() {
    let critical_or_low = api()
        .list_incidents(&IncidentFilters {
            severities: vec![Severity::Critical, Severity::Low],
            ..Default::default()
        })
        .expect("load succeeds");
    assert_eq!(
        ids(&critical_or_low),
        vec![
            "INC-1042", "INC-1043", "INC-1046", "INC-1049", "INC-1050", "INC-1051"
        ]
    );
    assert!(
        critical_or_low
            .iter()
            .all(|incident| matches!(incident.severity, Severity::Critical | Severity::Low))
    );
    // A single severity also works.
    let only_high = api()
        .list_incidents(&IncidentFilters {
            severities: vec![Severity::High],
            ..Default::default()
        })
        .expect("load succeeds");
    assert_eq!(
        ids(&only_high),
        vec!["INC-1044", "INC-1045", "INC-1047", "INC-1048"]
    );
}

#[test]
fn axes_intersect_across_search_environment_and_severity() {
    // prod ∩ critical → exactly the two prod criticals.
    let both = api()
        .list_incidents(&IncidentFilters {
            environment: Some(Environment::Prod),
            severities: vec![Severity::Critical],
            ..Default::default()
        })
        .expect("load succeeds");
    assert_eq!(ids(&both), vec!["INC-1042", "INC-1043"]);
    // search ∩ environment: "104" ids in prod → 1042, 1043, 1045, 1048.
    let narrowed = api()
        .list_incidents(&IncidentFilters {
            search: Some("104".into()),
            environment: Some(Environment::Prod),
            ..Default::default()
        })
        .expect("load succeeds");
    assert_eq!(
        ids(&narrowed),
        vec!["INC-1042", "INC-1043", "INC-1045", "INC-1048"]
    );
    // All three axes: search "api" ∩ staging ∩ critical → INC-1050 (flags-api).
    let triple = api()
        .list_incidents(&IncidentFilters {
            search: Some("api".into()),
            environment: Some(Environment::Staging),
            severities: vec![Severity::Critical],
            ..Default::default()
        })
        .expect("load succeeds");
    assert_eq!(ids(&triple), vec!["INC-1050"]);
}

#[test]
fn assign_mutates_api_state_and_is_isolated_per_instance() {
    let mut a = api();
    let b = api();
    let updated = a
        .assign_incident("INC-1043", "drosebrook")
        .expect("assign ok");
    assert_eq!(updated.assignee.as_deref(), Some("drosebrook"));
    // The mutation is visible in the same instance…
    let detail = a.get_incident("INC-1043").expect("detail");
    assert_eq!(detail.incident.assignee.as_deref(), Some("drosebrook"));
    // …and in that instance's filtered queue rows…
    let row = a
        .list_incidents(&IncidentFilters::default())
        .expect("load")
        .into_iter()
        .find(|incident| incident.id == "INC-1043")
        .unwrap();
    assert_eq!(row.assignee.as_deref(), Some("drosebrook"));
    // …but never leaks into a second instance (fixture snapshot untouched).
    let other = b.get_incident("INC-1043").expect("detail");
    assert_eq!(other.incident.assignee, None);
}

#[test]
fn resolve_removes_from_queue_and_supports_recovery_paths() {
    let mut api = api();
    let resolved = api.resolve_incident("INC-1046").expect("resolve ok");
    assert!(resolved.resolved);
    // Removed from the active queue…
    let queue = api
        .list_incidents(&IncidentFilters::default())
        .expect("load");
    assert!(!ids(&queue).contains(&"INC-1046"));
    // …and its detail is now NOT_FOUND (resolved ids leave the active queue).
    let missing = api.get_incident("INC-1046").unwrap_err();
    assert_eq!(missing.code, ApiErrorCode::NotFound);
    assert!(missing.message.contains("INC-1046"));
    // Filters apply on top of the resolved removal.
    let dev = api
        .list_incidents(&IncidentFilters {
            environment: Some(Environment::Dev),
            ..Default::default()
        })
        .expect("load");
    assert_eq!(
        ids(&dev),
        vec!["INC-1049"],
        "only INC-1046 and INC-1049 were dev; 1046 is resolved"
    );
}

#[test]
fn re_resolving_returns_typed_already_resolved() {
    let mut api = api();
    api.resolve_incident("INC-1046").expect("first resolve ok");
    let again = api.resolve_incident("INC-1046").unwrap_err();
    assert_eq!(again.code, ApiErrorCode::AlreadyResolved);
    assert!(again.message.contains("already resolved"));
}

#[test]
fn assigning_a_missing_or_resolved_incident_is_not_found() {
    let mut api = api();
    let missing = api.assign_incident("INC-9999", "someone").unwrap_err();
    assert_eq!(missing.code, ApiErrorCode::NotFound);
    api.resolve_incident("INC-1046").expect("resolve");
    let resolved = api.assign_incident("INC-1046", "someone").unwrap_err();
    assert_eq!(resolved.code, ApiErrorCode::NotFound);
    let detail_missing = api.get_incident("INC-9999").unwrap_err();
    assert_eq!(detail_missing.code, ApiErrorCode::NotFound);
}

#[test]
fn simulated_failure_produces_typed_load_failed_on_every_read() {
    let mut api = api_failing();
    for result in [
        api.list_incidents(&IncidentFilters::default())
            .map(|_| ())
            .unwrap_err()
            .code,
        api.get_incident("INC-1042").map(|_| ()).unwrap_err().code,
        api.list_service_health().map(|_| ()).unwrap_err().code,
    ] {
        assert_eq!(result, ApiErrorCode::LoadFailed);
    }
    // Mutations are NOT read calls: they still work while the flag is on,
    // exactly like the TypeScript seam (only reads consult failLoads).
    api.assign_incident("INC-1043", "x")
        .expect("assign unaffected by load-failure flag");
}

#[test]
fn failure_flag_recovery_restores_reads() {
    let mut api = api_failing();
    assert!(api.list_incidents(&IncidentFilters::default()).is_err());
    api.set_load_failure(false);
    let queue = api
        .list_incidents(&IncidentFilters::default())
        .expect("recovered");
    assert_eq!(queue.len(), 10);
    // And re-enabling breaks reads again (the flag is the only cause).
    api.set_load_failure(true);
    assert_eq!(
        api.list_incidents(&IncidentFilters::default())
            .unwrap_err()
            .code,
        ApiErrorCode::LoadFailed
    );
}

#[test]
fn service_health_lists_the_full_fleet_for_the_summary_band() {
    let health = api().list_service_health().expect("health loads");
    assert_eq!(health.len(), 10);
    let by_status = |status: operations_dashboard_gpui::ServiceStatus| {
        health
            .iter()
            .filter(|service| service.status == status)
            .count()
    };
    assert_eq!(
        by_status(operations_dashboard_gpui::ServiceStatus::Healthy),
        3
    );
    assert_eq!(
        by_status(operations_dashboard_gpui::ServiceStatus::Degraded),
        5
    );
    assert_eq!(by_status(operations_dashboard_gpui::ServiceStatus::Down), 2);
}

#[test]
fn filters_can_be_detected_as_active_for_the_clear_affordance() {
    let empty = IncidentFilters::default();
    assert!(!empty.is_active());
    assert!(
        IncidentFilters {
            search: Some("prod".into()),
            ..Default::default()
        }
        .is_active()
    );
    assert!(
        !IncidentFilters {
            search: Some("   ".into()),
            ..Default::default()
        }
        .is_active(),
        "whitespace-only search is not an active filter"
    );
    assert!(
        IncidentFilters {
            environment: Some(Environment::Dev),
            ..Default::default()
        }
        .is_active()
    );
    assert!(
        !IncidentFilters {
            severities: vec![],
            ..Default::default()
        }
        .is_active()
    );
}

#[test]
fn fixed_latency_defaults_to_zero_for_instant_tests() {
    assert_eq!(
        OperationsApiOptions::default().latency_ms,
        0,
        "the deterministic default latency must be 0 (tests run instantly)"
    );
    assert!(!OperationsApiOptions::default().fail_loads);
}
