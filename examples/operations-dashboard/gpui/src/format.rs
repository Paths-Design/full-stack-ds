//! App-layer display formatting (Rust mirror of `react/src/format.ts`).
//!
//! One deliberate divergence from the React lane, in the direction of the
//! lane's determinism rule: the React `formatAge` defaults its `now` to
//! `Date.now()` (wall clock). This lane formats ages against a **fixed
//! reference instant** (`REFERENCE_NOW`), so every rendered byte is
//! deterministic and the lane contains no wall-clock reads at all.

use operations_dashboard_gpui::{Environment, Severity};

/// Fixed reference instant for relative ages: 2026-06-26T10:00:00Z — shortly
/// after the newest fixture timestamp, so fixture ages read like a live
/// morning queue. Display-only state; the data seam never uses it.
pub const REFERENCE_NOW: (i64, i64, i64, i64, i64) = (2026, 6, 26, 10, 0);

/// Map incident severity to a Badge intent (color semantics owned by Badge).
/// Mirrors the React lane's `severityIntent`.
pub fn severity_intent(severity: Severity) -> &'static str {
    match severity {
        Severity::Critical => "danger",
        Severity::High => "warning",
        Severity::Low => "info",
    }
}

/// Days since 1970-01-01 for a civil date (Howard Hinnant's algorithm).
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

fn reference_epoch_secs() -> i64 {
    let (y, mo, d, h, mi) = REFERENCE_NOW;
    days_from_civil(y, mo, d) * 86_400 + h * 3_600 + mi * 60
}

/// Parse the fixture's fixed-format ISO-8601 UTC timestamps
/// (`YYYY-MM-DDTHH:MM:SS.mmmZ`) into epoch seconds. Returns `None` for
/// anything else, mirroring the React lane's `NaN` → `"—"` path.
pub fn parse_iso_secs(iso: &str) -> Option<i64> {
    let bytes = iso.as_bytes();
    if bytes.len() < 19 || bytes[4] != b'-' || bytes[7] != b'-' || bytes[10] != b'T' {
        return None;
    }
    let num = |range: std::ops::Range<usize>| iso.get(range)?.parse::<i64>().ok();
    let (y, mo, d) = (num(0..4)?, num(5..7)?, num(8..10)?);
    let (h, mi, s) = (num(11..13)?, num(14..16)?, num(17..19)?);
    Some(days_from_civil(y, mo, d) * 86_400 + h * 3_600 + mi * 60 + s)
}

/// Compact relative age from an ISO timestamp (e.g. "3h", "2d"), deterministic
/// against [`REFERENCE_NOW`]. Mirrors the React lane's `formatAge` buckets.
pub fn format_age(iso: &str) -> String {
    let Some(then) = parse_iso_secs(iso) else {
        return "—".to_string();
    };
    let mins = (reference_epoch_secs() - then).max(0) / 60;
    if mins < 60 {
        return format!("{mins}m");
    }
    let hours = mins / 60;
    if hours < 24 {
        return format!("{hours}h");
    }
    format!("{}d", hours / 24)
}

/// Lowercase display label for an environment segment.
pub fn environment_label(environment: Option<Environment>) -> &'static str {
    match environment {
        Some(env) => env.as_str(),
        None => "all",
    }
}
