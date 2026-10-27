//! The operations-dashboard GPUI assembly (`Dashboard` entity).
//!
//! Realizes `examples/operations-dashboard/spec.md` for the GPUI target:
//! header summary band, filter rail, dense queue pane, selection-driven detail
//! pane, and the overlay workflow surfaces (confirm dialog, side sheet, toast
//! region), with loading / empty / error / pending states as real async
//! transitions created through gpui's executor (`cx.spawn` +
//! `background_executor().timer` with the seam's fixed latency — never
//! wall-clock randomness).
//!
//! Package boundary: dashboard *behavior and component styling* come only from
//! `full_stack_ds_gpui` public exports (Switch, ToggleSwitch, Checkbox, Text,
//! Badge, Divider, Stat). Regions the 7-component allowlist cannot express are
//! hand-authored plain gpui and marked `// NOT FSDS: <reason>` in source; the
//! README ledger mirrors every marker.

use std::time::Duration;

use full_stack_ds_gpui::components::{Badge, Checkbox, Divider, Stat, Switch, Text, ToggleSwitch};
use full_stack_ds_gpui::content::NativeContent;
use gpui::prelude::*;
use gpui::{
    App, ClickEvent, Context, Entity, FocusHandle, InteractiveElement, IntoElement, MouseButton,
    ParentElement, Render, SharedString, Stateful, Styled, Subscription, Window, actions, div, px,
    rgb, rgba,
};
use operations_dashboard_gpui::{
    Environment, Incident, IncidentDetail, IncidentFilters, OperationsApi, ServiceStatus, Severity,
};

use crate::format::{environment_label, format_age, severity_intent};
use crate::text_input::{TextChanged, TextField};

actions!(
    ops_dashboard,
    [CycleFocusForward, CycleFocusBackward, DismissOverlay]
);

// Hand-authored surface palette (page-frame + NOT FSDS regions only). These
// approximate the package's light-appearance token values for the app-shell
// frame the 7-component allowlist does not cover; component-owned styling
// always comes from the FSDS components themselves.
const PAGE_BG: u32 = 0xfafafa;
const SURFACE: u32 = 0xffffff;
const BORDER: u32 = 0xd0d0d0;
const TEXT: u32 = 0x141414;
const MUTED: u32 = 0x474647;
const ACCENT: u32 = 0x0566fe;
const ACCENT_SUBTLE: u32 = 0xeef4ff;
const DANGER: u32 = 0xb31b1b;
const SUCCESS: u32 = 0x3a6614;
const HOVER: u32 = 0xf0f0f0;
const SKELETON: u32 = 0xe5e7eb;

/// Fixed simulated latency for the binary's loads (mirrors the React lane's
/// LATENCY_MS so loading states are observable; deterministic, never random).
const LATENCY_MS: u64 = 250;

/// Deterministic skeleton-line widths for the detail pane placeholders.
const DETAIL_SKELETON_WIDTHS: [f32; 4] = [220., 340., 300., 160.];

/// Responsive tier (spec: "Responsive behavior"), a pure function of the
/// window's content width — never persisted. The gpui target has no breakpoint
/// concept, so the lane computes thresholds from `window.viewport_size()`;
/// that app-computed shell is page-frame plumbing (allowed) and is a recorded
/// boundary finding.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Tier {
    /// < 900px — single column: header → filters (collapsed) → queue → detail.
    Narrow,
    /// 900–1279px — queue + detail row; filters collapsed behind a toggle.
    Medium,
    /// ≥ 1280px — filter rail + queue + detail in one row (the base layout).
    Wide,
}

impl Tier {
    fn from_viewport_width(width: gpui::Pixels) -> Self {
        let width = f32::from(width);
        if width >= 1280. {
            Tier::Wide
        } else if width >= 900. {
            Tier::Medium
        } else {
            Tier::Narrow
        }
    }
}

/// Tier-aware fixed widths for the hand-authored queue row grid. No column is
/// ever dropped at any tier (spec invariant — column visibility/priority is a
/// package-level capability no target exposes); widths compress instead, and
/// every cell truncates rather than introducing horizontal scrolling.
#[derive(Clone, Copy)]
struct ColumnWidths {
    id: f32,
    service: f32,
    severity: f32,
    environment: f32,
    age: f32,
    assignee: f32,
}

impl ColumnWidths {
    fn for_tier(tier: Tier) -> Self {
        match tier {
            Tier::Wide => Self {
                id: 72.,
                service: 132.,
                severity: 84.,
                environment: 64.,
                age: 48.,
                assignee: 104.,
            },
            Tier::Medium => Self {
                id: 60.,
                service: 96.,
                severity: 72.,
                environment: 48.,
                age: 36.,
                assignee: 84.,
            },
            Tier::Narrow => Self {
                id: 64.,
                service: 110.,
                severity: 76.,
                environment: 52.,
                age: 40.,
                assignee: 92.,
            },
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum LoadPhase {
    Loading,
    Loaded,
    Error,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ToastVariant {
    Success,
    Error,
}

impl ToastVariant {
    fn color(self) -> u32 {
        match self {
            ToastVariant::Success => SUCCESS,
            ToastVariant::Error => DANGER,
        }
    }
}

struct Toast {
    id: u64,
    title: String,
    variant: ToastVariant,
}

/// Which overlay is open, in trap-focus terms.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum OpenOverlay {
    None,
    Assign,
    Resolve,
}

pub struct Dashboard {
    /// The lane-local seam (the ONLY data source; UI never touches fixtures).
    api: OperationsApi,

    // Load state (real async transitions via gpui's executor).
    phase: LoadPhase,
    error_message: Option<String>,
    incidents: Vec<Incident>,
    services: Vec<operations_dashboard_gpui::ServiceHealth>,
    load_generation: u64,

    // Selection + detail.
    selected_id: Option<String>,
    detail: Option<IncidentDetail>,
    detail_loading: bool,
    detail_generation: u64,
    timeline_expanded: bool,

    // Filter + toggle state (controlled inputs).
    environment: Option<Environment>,
    severities: Vec<Severity>,
    fail_loads: bool,
    compact: bool,

    // Overlay workflow state.
    assign_open: bool,
    assign_pending: bool,
    resolve_open: bool,
    resolve_pending: bool,

    // Toast region.
    toasts: Vec<Toast>,
    toast_seq: u64,

    // Focus (root + the overlay controls participate in the hand-authored
    // focus trap).
    focus: FocusHandle,
    focus_resolve_cancel: FocusHandle,
    focus_resolve_confirm: FocusHandle,
    focus_assign_cancel: FocusHandle,
    focus_assign_complete: FocusHandle,

    // Retained FSDS entities (created once, updated through setters).
    search_field: Entity<TextField>,
    assignee_field: Entity<TextField>,
    severity_checkboxes: Vec<(Severity, Entity<Checkbox>)>,
    density_toggle: Entity<ToggleSwitch>,
    fail_switch: Entity<Switch>,
    stat_healthy: Entity<Stat>,
    stat_degraded: Entity<Stat>,
    stat_down: Entity<Stat>,
    stat_open: Entity<Stat>,
    severity_badges: Vec<(Severity, Entity<Badge>)>,
    detail_status_badge: Entity<Badge>,
    title_header: Entity<Text>,
    title_filters: Entity<Text>,
    title_queue: Entity<Text>,
    title_queue_count: Entity<Text>,
    title_detail: Entity<Text>,
    detail_title: Entity<Text>,
    title_resolve: Entity<Text>,
    title_assign: Entity<Text>,
    divider_rail_search: Entity<Divider>,
    divider_rail_env: Entity<Divider>,
    divider_queue: Entity<Divider>,
    divider_detail: Entity<Divider>,

    // Responsive shell: the tier is derived per frame from the viewport; the
    // only stored choice is the medium/narrow collapse, and collapsing never
    // clears filter state (they keep applying — spec invariant).
    filters_open: bool,
    /// FROM PACKAGE EXPORTS: active-filter count (Badge variant "counter").
    filter_count_badge: Entity<Badge>,

    _subscriptions: Vec<Subscription>,
}

impl Dashboard {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let focus = cx.focus_handle();
        window.focus(&focus, cx);

        // The seam: fixed latency (observable loading), failure flag off.
        let api = OperationsApi::new(operations_dashboard_gpui::OperationsApiOptions {
            latency_ms: LATENCY_MS,
            fail_loads: false,
        });

        // NOT FSDS: hand-authored text fields — gpui ships no input widget.
        let search_field =
            cx.new(|cx| TextField::new(cx).placeholder("Search id, title, or service…"));
        let assignee_field = cx.new(|cx| TextField::new(cx).placeholder("Assignee handle"));

        // FROM PACKAGE EXPORTS: controlled severity Checkbox group. Requests
        // arrive as ChangeRequest events; the owner accepts them explicitly
        // and re-runs the filtered load.
        let mut severity_checkboxes = Vec::new();
        let mut severity_subs = Vec::new();
        for severity in Severity::DISPLAY_ORDER {
            let checkbox = cx.new(|_| {
                Checkbox::default()
                    .checked(Some(false))
                    .label(severity.as_str())
            });
            let subscription = cx.subscribe(&checkbox, move |this, entity, request, cx| {
                this.accept_severity(severity, request.value, entity, cx);
            });
            severity_subs.push(subscription);
            severity_checkboxes.push((severity, checkbox));
        }

        // FROM PACKAGE EXPORTS: density toggle (the spec's pressure-point
        // residual — Table/List-owned density does not exist on this target,
        // so density is app-owned and recorded in the ledger).
        let density_toggle = cx.new(|_| {
            ToggleSwitch::default()
                .size("medium")
                .checked(Some(false))
                .label("Compact rows")
        });
        let density_sub = cx.subscribe(&density_toggle, |this, entity, request, cx| {
            this.compact = request.value;
            entity.update(cx, |control, cx| {
                control.set_checked(Some(request.value), cx)
            });
            cx.notify();
        });

        // FROM PACKAGE EXPORTS: simulated-load-failure Switch (drives the
        // error → retry interaction; explicit flag, never chance).
        let fail_switch = cx.new(|_| {
            Switch::default()
                .checked(Some(false))
                .label("Simulate load failure")
        });
        let fail_sub = cx.subscribe(&fail_switch, |this, entity, request, cx| {
            this.fail_loads = request.value;
            this.api.set_load_failure(request.value);
            entity.update(cx, |control, cx| {
                control.set_checked(Some(request.value), cx)
            });
            cx.notify();
        });

        // Search field drives live filtering (interaction 1). The field owns
        // the search text; `current_filters` reads it through cx.
        let search_sub = cx.subscribe(&search_field, |this, _, _: &TextChanged, cx| {
            this.reload(cx);
        });

        // FROM PACKAGE EXPORTS: header summary Stat tiles (counts derived from
        // the loaded service roll-up + the CURRENT filtered queue).
        let make_stat = |cx: &mut Context<Self>| cx.new(|_| Stat::default().size("md"));
        let (stat_healthy, stat_degraded, stat_down, stat_open) =
            (make_stat(cx), make_stat(cx), make_stat(cx), make_stat(cx));

        // FROM PACKAGE EXPORTS: severity Badge pool (one retained Badge per
        // severity, reused across queue rows) + detail status Badge.
        let mut severity_badges = Vec::new();
        for severity in Severity::DISPLAY_ORDER {
            let badge = cx.new(|_| {
                Badge::default()
                    .intent(severity_intent(severity))
                    .size("sm")
                    .label(severity.as_str())
            });
            severity_badges.push((severity, badge));
        }
        let detail_status_badge = cx.new(|_| {
            Badge::default()
                .variant("status")
                .intent("success")
                .size("sm")
                .label("Open")
        });
        // FROM PACKAGE EXPORTS: active-filter counter Badge for the
        // responsive Filters toggle (medium/narrow tiers).
        let filter_count_badge =
            cx.new(|_| Badge::default().variant("counter").size("sm").label("0"));

        // FROM PACKAGE EXPORTS: Text + Divider section chrome (retained
        // entities; dynamic strings flow through the mounted `set_label`).
        let make_text = |variant: &'static str, label: &'static str, cx: &mut Context<Self>| {
            cx.new(|_| Text::default().variant(variant).label(label))
        };
        let title_header = make_text("headline", "Operations dashboard", cx);
        let title_filters = make_text("overline", "Filters", cx);
        let title_queue = make_text("title", "Queue", cx);
        let title_queue_count = make_text("body", "", cx);
        let title_detail = make_text("title", "Incident detail", cx);
        let detail_title = make_text("headline", "Nothing selected", cx);
        let title_resolve = make_text("title", "Resolve & close incident?", cx);
        let title_assign = make_text("title", "Assign incident", cx);
        let make_divider = |cx: &mut Context<Self>| cx.new(|_| Divider::default());
        let divider_rail_search = make_divider(cx);
        let divider_rail_env = make_divider(cx);
        let divider_queue = make_divider(cx);
        let divider_detail = make_divider(cx);

        let mut this = Self {
            api,
            phase: LoadPhase::Loading,
            error_message: None,
            incidents: Vec::new(),
            services: Vec::new(),
            load_generation: 0,
            selected_id: None,
            detail: None,
            detail_loading: false,
            detail_generation: 0,
            timeline_expanded: false,
            environment: None,
            severities: Vec::new(),
            fail_loads: false,
            compact: false,
            assign_open: false,
            assign_pending: false,
            resolve_open: false,
            resolve_pending: false,
            toasts: Vec::new(),
            toast_seq: 0,
            filters_open: false,
            filter_count_badge,
            focus,
            focus_resolve_cancel: cx.focus_handle(),
            focus_resolve_confirm: cx.focus_handle(),
            focus_assign_cancel: cx.focus_handle(),
            focus_assign_complete: cx.focus_handle(),
            search_field,
            assignee_field,
            severity_checkboxes,
            density_toggle,
            fail_switch,
            stat_healthy,
            stat_degraded,
            stat_down,
            stat_open,
            severity_badges,
            detail_status_badge,
            title_header,
            title_filters,
            title_queue,
            title_queue_count,
            title_detail,
            detail_title,
            title_resolve,
            title_assign,
            divider_rail_search,
            divider_rail_env,
            divider_queue,
            divider_detail,
            _subscriptions: vec![density_sub, fail_sub, search_sub]
                .into_iter()
                .chain(severity_subs)
                .collect(),
        };
        // Initial load → loading → loaded is a real async transition.
        this.reload(cx);
        this
    }

    // ------------------------------------------------------------------
    // Filter state helpers
    // ------------------------------------------------------------------

    /// Build the API filter struct from the controlled inputs. The search text
    /// lives in the field entity; read it through `cx`.
    fn current_filters(&self, cx: &App) -> IncidentFilters {
        let value = self.search_field.read(cx).value().to_string();
        IncidentFilters {
            search: if value.trim().is_empty() {
                None
            } else {
                Some(value)
            },
            environment: self.environment,
            severities: self.severities.clone(),
        }
    }

    fn open_overlay(&self) -> OpenOverlay {
        if self.resolve_open {
            OpenOverlay::Resolve
        } else if self.assign_open {
            OpenOverlay::Assign
        } else {
            OpenOverlay::None
        }
    }

    // ------------------------------------------------------------------
    // Async transitions (loading / detail / commits) via gpui's executor
    // ------------------------------------------------------------------

    /// Reload the queue + service health through the API with the seam's fixed
    /// latency. Later filter changes supersede in-flight loads by generation.
    fn reload(&mut self, cx: &mut Context<Self>) {
        self.load_generation += 1;
        let generation = self.load_generation;
        self.phase = LoadPhase::Loading;
        self.error_message = None;
        let filters = self.current_filters(cx);
        // The toggle badge derives from the just-changed filter state.
        self.update_filter_count_badge(cx);
        let latency = Duration::from_millis(self.api.latency_ms());
        cx.spawn(async move |this, cx| {
            // Simulated latency: a fixed timer from the seam's latency knob.
            if latency > Duration::ZERO {
                cx.background_executor().timer(latency).await;
            }
            let results = this.update(cx, |dashboard, _| {
                (
                    dashboard.api.list_incidents(&filters),
                    dashboard.api.list_service_health(),
                )
            });
            if let Ok((queue, health)) = results {
                let _ = this.update(cx, |dashboard, cx| {
                    if generation != dashboard.load_generation {
                        return; // a newer load superseded this one
                    }
                    match (queue, health) {
                        (Ok(incidents), Ok(services)) => {
                            dashboard.incidents = incidents;
                            dashboard.services = services;
                            dashboard.phase = LoadPhase::Loaded;
                            dashboard.update_summary_tiles(cx);
                        }
                        (Err(error), _) | (_, Err(error)) => {
                            dashboard.error_message = Some(error.message);
                            dashboard.phase = LoadPhase::Error;
                        }
                    }
                    cx.notify();
                });
            }
        })
        .detach();
    }

    /// Fetch the selected incident's detail (async; NOT_FOUND clears selection).
    fn fetch_detail(&mut self, id: String, cx: &mut Context<Self>) {
        self.detail_generation += 1;
        let generation = self.detail_generation;
        self.detail = None;
        self.detail_loading = true;
        self.timeline_expanded = false;
        let latency = Duration::from_millis(self.api.latency_ms());
        cx.spawn(async move |this, cx| {
            if latency > Duration::ZERO {
                cx.background_executor().timer(latency).await;
            }
            let result = this.update(cx, |dashboard, _| dashboard.api.get_incident(&id));
            if let Ok(result) = result {
                let _ = this.update(cx, |dashboard, cx| {
                    if generation != dashboard.detail_generation {
                        return; // a newer selection superseded this fetch
                    }
                    dashboard.detail_loading = false;
                    match result {
                        Ok(detail) => {
                            dashboard.detail_title.update(cx, |text, cx| {
                                text.set_label(detail.incident.title.as_str(), cx)
                            });
                            dashboard.detail = Some(detail);
                        }
                        Err(_) => {
                            // Selected incident vanished (e.g. resolved) —
                            // clear it, mirroring the React lane.
                            dashboard.selected_id = None;
                        }
                    }
                    cx.notify();
                });
            }
        })
        .detach();
    }

    fn commit_assign(&mut self, cx: &mut Context<Self>) {
        let Some(id) = self.selected_id.clone() else {
            return;
        };
        let assignee = self.assignee_field.read(cx).value().trim().to_string();
        if assignee.is_empty() {
            return;
        }
        self.assign_pending = true;
        let latency = Duration::from_millis(self.api.latency_ms());
        cx.spawn(async move |this, cx| {
            if latency > Duration::ZERO {
                cx.background_executor().timer(latency).await;
            }
            let result = this.update(cx, |dashboard, _| {
                dashboard.api.assign_incident(&id, &assignee)
            });
            if let Ok(result) = result {
                let _ = this.update(cx, |dashboard, cx| {
                    dashboard.assign_pending = false;
                    dashboard.assign_open = false;
                    match result {
                        Ok(updated) => {
                            // Reflect the new assignee in queue row + detail.
                            for incident in &mut dashboard.incidents {
                                if incident.id == updated.id {
                                    incident.assignee = updated.assignee.clone();
                                }
                            }
                            if let Some(detail) = &mut dashboard.detail {
                                if detail.incident.id == updated.id {
                                    detail.incident.assignee = updated.assignee.clone();
                                }
                            }
                            dashboard.push_toast(
                                format!("Assigned {} to {}", updated.id, assignee),
                                ToastVariant::Success,
                                cx,
                            );
                        }
                        Err(error) => dashboard.push_toast(error.message, ToastVariant::Error, cx),
                    }
                    cx.notify();
                });
            }
        })
        .detach();
    }

    fn commit_resolve(&mut self, cx: &mut Context<Self>) {
        let Some(id) = self.selected_id.clone() else {
            return;
        };
        self.resolve_pending = true;
        let latency = Duration::from_millis(self.api.latency_ms());
        cx.spawn(async move |this, cx| {
            if latency > Duration::ZERO {
                cx.background_executor().timer(latency).await;
            }
            let result = this.update(cx, |dashboard, _| dashboard.api.resolve_incident(&id));
            if let Ok(result) = result {
                let _ = this.update(cx, |dashboard, cx| {
                    dashboard.resolve_pending = false;
                    dashboard.resolve_open = false;
                    match result {
                        Ok(_) => {
                            // Remove from queue, clear selection (detail pane
                            // returns to its empty state), raise a toast.
                            dashboard.incidents.retain(|incident| incident.id != id);
                            dashboard.selected_id = None;
                            dashboard.detail = None;
                            dashboard.detail_loading = false;
                            dashboard.push_toast(
                                format!("Resolved & closed {id}"),
                                ToastVariant::Success,
                                cx,
                            );
                            dashboard.update_summary_tiles(cx);
                        }
                        Err(error) => dashboard.push_toast(error.message, ToastVariant::Error, cx),
                    }
                    cx.notify();
                });
            }
        })
        .detach();
    }

    fn push_toast(&mut self, title: String, variant: ToastVariant, cx: &mut Context<Self>) {
        self.toast_seq += 1;
        self.toasts.push(Toast {
            id: self.toast_seq,
            title,
            variant,
        });
        cx.notify();
    }

    // ------------------------------------------------------------------
    // Interaction handlers (the spec's ten interactions)
    // ------------------------------------------------------------------

    /// Interaction 4: selecting a queue row drives the detail pane.
    fn select_incident(&mut self, id: &str, cx: &mut Context<Self>) {
        if self.selected_id.as_deref() != Some(id) {
            self.selected_id = Some(id.to_string());
            self.fetch_detail(id.to_string(), cx);
            cx.notify();
        }
    }

    fn accept_severity(
        &mut self,
        severity: Severity,
        value: bool,
        entity: Entity<Checkbox>,
        cx: &mut Context<Self>,
    ) {
        // Accept the controlled request, then re-run the filtered load
        // (interactions 1–3 all funnel through `reload`).
        entity.update(cx, |control, cx| control.set_checked(Some(value), cx));
        if value {
            if !self.severities.contains(&severity) {
                self.severities.push(severity);
            }
        } else {
            self.severities.retain(|active| *active != severity);
        }
        self.reload(cx);
    }

    fn set_environment(&mut self, environment: Option<Environment>, cx: &mut Context<Self>) {
        if self.environment != environment {
            self.environment = environment;
            self.reload(cx);
        }
    }

    /// Interaction 3: Clear filters resets every control to its default.
    fn clear_filters(&mut self, cx: &mut Context<Self>) {
        self.environment = None;
        self.severities.clear();
        self.search_field
            .update(cx, |field, cx| field.set_value(String::new(), cx));
        for (_, checkbox) in &self.severity_checkboxes {
            checkbox.update(cx, |control, cx| control.set_checked(Some(false), cx));
        }
        self.reload(cx);
    }

    /// Interaction 9: retry re-runs the load with the failure flag off.
    fn retry(&mut self, cx: &mut Context<Self>) {
        if self.fail_loads {
            self.fail_loads = false;
            self.api.set_load_failure(false);
            self.fail_switch
                .update(cx, |control, cx| control.set_checked(Some(false), cx));
        }
        self.reload(cx);
    }

    fn open_assign(&mut self, cx: &mut Context<Self>) {
        if self.selected_id.is_some() {
            self.assign_open = true;
            self.assignee_field
                .update(cx, |field, cx| field.set_value(String::new(), cx));
            cx.notify();
        }
    }

    fn close_assign(&mut self, cx: &mut Context<Self>) {
        // Cancel is a no-op on queue state: close only.
        self.assign_open = false;
        cx.notify();
    }

    fn open_resolve(&mut self, cx: &mut Context<Self>) {
        if self.selected_id.is_some() {
            self.resolve_open = true;
            cx.notify();
        }
    }

    fn close_resolve(&mut self, cx: &mut Context<Self>) {
        // Cancel is a no-op on queue state: close only.
        self.resolve_open = false;
        cx.notify();
    }

    /// Number of active filter constraints (search, environment, and each
    /// selected severity) — shown by the responsive Filters toggle's Badge.
    fn active_filter_count(&self, cx: &App) -> usize {
        let filters = self.current_filters(cx);
        usize::from(filters.search.is_some())
            + usize::from(filters.environment.is_some())
            + filters.severities.len()
    }

    /// FROM PACKAGE EXPORTS: push the count into the retained counter Badge.
    fn update_filter_count_badge(&self, cx: &mut Context<Self>) {
        let count = self.active_filter_count(cx);
        self.filter_count_badge
            .update(cx, |badge, cx| badge.set_label(count.to_string(), cx));
    }

    /// Responsive shell (medium/narrow tiers): expand or collapse the filter
    /// controls. Collapsing never clears filter state — they keep applying
    /// (spec invariant); the tier itself is derived per frame, never stored.
    fn toggle_filters(&mut self, cx: &mut Context<Self>) {
        self.filters_open = !self.filters_open;
        cx.notify();
    }

    /// Interaction 5: timeline progressive disclosure.
    fn toggle_timeline(&mut self, cx: &mut Context<Self>) {
        self.timeline_expanded = !self.timeline_expanded;
        cx.notify();
    }

    fn dismiss_toast(&mut self, id: u64, cx: &mut Context<Self>) {
        self.toasts.retain(|toast| toast.id != id);
        cx.notify();
    }

    // ------------------------------------------------------------------
    // Overlay focus + dismissal (interaction 10)
    // ------------------------------------------------------------------

    /// Interaction 10: while an overlay is open, Tab/Shift-Tab cycle within
    /// the overlay's controls (the hand-authored trap — the gpui target ships
    /// no Dialog/Sheet surfaces with focus trapping, recorded finding).
    fn cycle_overlay_focus(&self, forward: bool, window: &mut Window, cx: &mut Context<Self>) {
        let handles = match self.open_overlay() {
            OpenOverlay::Resolve => {
                vec![
                    self.focus_resolve_cancel.clone(),
                    self.focus_resolve_confirm.clone(),
                ]
            }
            OpenOverlay::Assign => vec![
                self.assignee_field.read(cx).focus.clone(),
                self.focus_assign_cancel.clone(),
                self.focus_assign_complete.clone(),
            ],
            OpenOverlay::None => {
                // No overlay: normal window-wide traversal.
                if forward {
                    window.focus_next(cx);
                } else {
                    window.focus_prev(cx);
                }
                return;
            }
        };
        let next = match handles.iter().position(|handle| handle.is_focused(window)) {
            None => 0,
            Some(index) => {
                if forward {
                    (index + 1) % handles.len()
                } else {
                    (index + handles.len() - 1) % handles.len()
                }
            }
        };
        window.focus(&handles[next], cx);
    }

    fn dismiss_topmost_overlay(&mut self, cx: &mut Context<Self>) {
        match self.open_overlay() {
            OpenOverlay::Resolve => self.close_resolve(cx),
            OpenOverlay::Assign => self.close_assign(cx),
            OpenOverlay::None => {}
        }
    }

    // ------------------------------------------------------------------
    // Derived state
    // ------------------------------------------------------------------

    /// Push the current summary counts into the retained Stat tiles (counts
    /// derived from the loaded service roll-up + the CURRENT filtered queue).
    fn update_summary_tiles(&mut self, cx: &mut Context<Self>) {
        let healthy = self
            .services
            .iter()
            .filter(|service| service.status == ServiceStatus::Healthy)
            .count();
        let degraded = self
            .services
            .iter()
            .filter(|service| service.status == ServiceStatus::Degraded)
            .count();
        let down = self
            .services
            .iter()
            .filter(|service| service.status == ServiceStatus::Down)
            .count();
        let open = self.incidents.len();
        let tile = |count: String, label: &'static str| {
            NativeContent::group([NativeContent::text(count), NativeContent::text(label)])
        };
        self.stat_healthy.update(cx, |stat, cx| {
            stat.set_trend(if healthy > 0 { "up" } else { "neutral" }, cx);
            stat.set_content(tile(healthy.to_string(), "Healthy services"), cx);
        });
        self.stat_degraded.update(cx, |stat, cx| {
            stat.set_trend(if degraded > 0 { "down" } else { "neutral" }, cx);
            stat.set_content(tile(degraded.to_string(), "Degraded"), cx);
        });
        self.stat_down.update(cx, |stat, cx| {
            stat.set_trend(if down > 0 { "down" } else { "neutral" }, cx);
            stat.set_content(tile(down.to_string(), "Down"), cx);
        });
        self.stat_open.update(cx, |stat, cx| {
            stat.set_trend("neutral", cx);
            stat.set_content(tile(open.to_string(), "Open incidents"), cx);
        });
        self.title_queue_count.update(cx, |text, cx| {
            text.set_label(format!("{open} matching the current filters"), cx)
        });
    }
}

impl Render for Dashboard {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        // Responsive tier: pure function of state + viewport, re-derived every
        // frame (resize re-renders); nothing about the tier is persisted.
        let tier = Tier::from_viewport_width(window.viewport_size().width);
        div()
            .id("dashboard")
            .track_focus(&self.focus)
            .relative()
            .size_full()
            .flex()
            .flex_col()
            .bg(rgb(PAGE_BG))
            .text_color(rgb(TEXT))
            .text_size(px(13.))
            // Interaction 10 bindings (Escape dismisses the open overlay;
            // Tab cycles within it while trapped).
            .on_action(cx.listener(|this, _: &CycleFocusForward, window, cx| {
                this.cycle_overlay_focus(true, window, cx);
            }))
            .on_action(cx.listener(|this, _: &CycleFocusBackward, window, cx| {
                this.cycle_overlay_focus(false, window, cx);
            }))
            .on_action(cx.listener(|this, _: &DismissOverlay, _, cx| {
                this.dismiss_topmost_overlay(cx);
            }))
            // Header band (spec region 1) — full-width at every tier.
            .child(self.render_header())
            // Body: tier-dependent arrangement of regions 2–4.
            .child(match tier {
                Tier::Wide => {
                    // Base layout: filter rail + queue + detail in one row.
                    div()
                        .flex_1()
                        .min_h_0()
                        .flex()
                        .flex_row()
                        .child(self.render_filter_rail(cx))
                        .child(self.render_queue_pane(cx, tier))
                        .child(self.render_detail_pane(cx, tier))
                        .into_any_element()
                }
                Tier::Medium | Tier::Narrow => {
                    // Filters collapse behind a persistent toggle (collapsed
                    // by default); expanding reveals the controls inline above
                    // the queue. Collapsed filters keep applying.
                    div()
                        .flex_1()
                        .min_h_0()
                        .flex()
                        .flex_col()
                        .child(self.render_filters_toggle(cx))
                        .when(self.filters_open, |column| {
                            column.child(self.render_filters_panel(cx))
                        })
                        .child(if tier == Tier::Medium {
                            // Two regions in the row: queue + detail.
                            div()
                                .flex_1()
                                .min_h_0()
                                .flex()
                                .flex_row()
                                .child(self.render_queue_pane(cx, tier))
                                .child(self.render_detail_pane(cx, tier))
                                .into_any_element()
                        } else {
                            // Single column: queue, then detail as a stacked
                            // full-width section below it (not a modal).
                            div()
                                .flex_1()
                                .min_h_0()
                                .flex()
                                .flex_col()
                                .child(self.render_queue_pane(cx, tier))
                                .child(self.render_detail_pane(cx, tier))
                                .into_any_element()
                        })
                        .into_any_element()
                }
            })
            // Toast region + overlays (spec region 5) — tier-independent.
            .child(self.render_toasts(cx))
            .when(self.resolve_open, |root| {
                root.child(self.render_resolve_dialog(cx))
            })
            .when(self.assign_open, |root| {
                root.child(self.render_assign_sheet(cx))
            })
    }
}

impl Dashboard {
    // Header band ---------------------------------------------------------
    // FROM PACKAGE EXPORTS: title Text, fail-loads Switch, density
    // ToggleSwitch, and four Stat tiles.
    fn render_header(&self) -> gpui::AnyElement {
        div()
            .flex()
            .flex_col()
            .gap_2()
            .px_4()
            .py_3()
            .bg(rgb(SURFACE))
            .border_b_1()
            .border_color(rgb(BORDER))
            .child(
                div()
                    .flex()
                    .flex_row()
                    .flex_wrap()
                    .items_center()
                    .gap_4()
                    .child(self.title_header.clone())
                    // NOT FSDS: spacer — no Stack/Box primitive on the gpui
                    // target; plain flex growth is page-frame layout.
                    .child(div().flex_1())
                    .child(self.density_toggle.clone())
                    .child(self.fail_switch.clone()),
            )
            .child(
                div()
                    .flex()
                    .flex_row()
                    .flex_wrap()
                    .items_start()
                    .gap_6()
                    .child(self.stat_healthy.clone())
                    .child(self.stat_degraded.clone())
                    .child(self.stat_down.clone())
                    .child(self.stat_open.clone()),
            )
            .into_any_element()
    }

    // Filter rail (wide tier) ----------------------------------------------
    fn render_filter_rail(&self, cx: &Context<Self>) -> gpui::AnyElement {
        div()
            .w(px(248.))
            .flex_shrink_0()
            .h_full()
            .flex()
            .flex_col()
            .gap_2()
            .p_3()
            .bg(rgb(SURFACE))
            .border_r_1()
            .border_color(rgb(BORDER))
            .child(self.title_filters.clone())
            .child(self.search_control(cx))
            .child(self.divider_rail_search.clone())
            .child(self.environment_control(cx))
            .child(self.divider_rail_env.clone())
            .child(self.severity_control(cx))
            // NOT FSDS: Clear-filters button — the gpui target emits no
            // Button; the affordance itself is spec-required.
            .child(button(
                "clear-filters",
                "Clear filters",
                ButtonVariant::Ghost,
                true,
                cx.listener(|this, _, _, cx| this.clear_filters(cx)),
            ))
            .into_any_element()
    }

    // Shared filter controls (rail at wide tier; the medium/narrow inline
    // disclosure re-lays the same controls out above the queue).

    // NOT FSDS: search field — the hand-authored minimal input
    // (text_input.rs); gpui ships no text-input widget (finding).
    fn search_control(&self, _cx: &Context<Self>) -> gpui::AnyElement {
        div()
            .flex()
            .flex_col()
            .gap_1()
            .child(self.search_field.clone())
            .into_any_element()
    }

    // NOT FSDS: environment selector — the gpui target emits no Select; the
    // spec's fallback posture is simple segmented options.
    fn environment_control(&self, cx: &Context<Self>) -> gpui::AnyElement {
        div()
            .flex()
            .flex_col()
            .gap_1()
            .child(weak_text("Environment", MUTED))
            .child(
                div().flex().flex_row().flex_wrap().gap_1().children(
                    std::iter::once((None, "all"))
                        .chain(
                            Environment::DISPLAY_ORDER
                                .into_iter()
                                .map(|env| (Some(env), env.as_str())),
                        )
                        .map(|(value, label)| {
                            segment_button(
                                format!("env-{}", environment_label(value)),
                                label,
                                self.environment == value,
                                cx.listener(move |this, _, _, cx| this.set_environment(value, cx)),
                            )
                        })
                        .collect::<Vec<_>>(),
                ),
            )
            .into_any_element()
    }

    // FROM PACKAGE EXPORTS: severity Checkbox group.
    fn severity_control(&self, _cx: &Context<Self>) -> gpui::AnyElement {
        div()
            .flex()
            .flex_col()
            .gap_1()
            .child(weak_text("Severity", MUTED))
            .children(
                self.severity_checkboxes
                    .iter()
                    .map(|(_, checkbox)| checkbox.clone()),
            )
            .into_any_element()
    }

    // Responsive Filters toggle (medium/narrow tiers) -----------------------
    // NOT FSDS: persistent toggle — hand-authored button; the active-filter
    // count beside it IS FSDS (Badge variant "counter").
    fn render_filters_toggle(&self, cx: &Context<Self>) -> gpui::AnyElement {
        div()
            .flex()
            .flex_row()
            .flex_wrap()
            .items_center()
            .gap_2()
            .px_3()
            .pt_2()
            .child(button(
                "filters-toggle",
                format!("{} Filters", if self.filters_open { "▾" } else { "▸" }),
                ButtonVariant::Ghost,
                true,
                cx.listener(|this, _, _, cx| this.toggle_filters(cx)),
            ))
            .child(self.filter_count_badge.clone())
            .when(self.active_filter_count(cx) == 0, |row| {
                row.child(weak_text("No active filters", MUTED))
            })
            .into_any_element()
    }

    // Inline filter disclosure (medium/narrow tiers, expanded): the same
    // controls as the wide-tier rail, re-flowed as a wrapping panel above the
    // queue. Collapsing never clears state; filters keep applying while
    // collapsed (spec invariants). Page-frame panel is app-owned (NOT FSDS).
    fn render_filters_panel(&self, cx: &Context<Self>) -> gpui::AnyElement {
        div()
            .flex()
            .flex_row()
            .flex_wrap()
            .items_start()
            .gap_4()
            .mx_3()
            .mt_1()
            .p_3()
            .rounded(px(6.))
            .bg(rgb(SURFACE))
            .border_1()
            .border_color(rgb(BORDER))
            .child(self.search_control(cx))
            .child(self.environment_control(cx))
            .child(self.severity_control(cx))
            .child(button(
                "clear-filters-inline",
                "Clear filters",
                ButtonVariant::Ghost,
                true,
                cx.listener(|this, _, _, cx| this.clear_filters(cx)),
            ))
            .into_any_element()
    }

    // Queue pane ----------------------------------------------------------
    fn render_queue_pane(&mut self, cx: &mut Context<Self>, tier: Tier) -> gpui::AnyElement {
        let compact = self.compact;
        let widths = ColumnWidths::for_tier(tier);
        let mut pane = div()
            .flex_1()
            .min_w_0()
            .min_h_0()
            .flex()
            .flex_col()
            .px_3()
            .py_3()
            .gap_2();
        pane = pane
            .child(
                div()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_3()
                    .child(self.title_queue.clone())
                    .child(self.title_queue_count.clone()),
            )
            .child(self.divider_queue.clone())
            // NOT FSDS: column headers — the gpui target emits no Table/List;
            // the dense queue row grid is hand-authored (recorded finding).
            .child(queue_header_row(widths));
        match self.phase {
            LoadPhase::Loading => {
                // NOT FSDS: skeleton placeholder rows — no Skeleton/Spinner/
                // Progress component exists on the gpui target.
                pane = pane.child(div().flex().flex_col().gap_2().children((0..6).map(|row| {
                    div()
                        .h(px(if compact { 22. } else { 34. }))
                        .rounded(px(3.))
                        .bg(rgb(SKELETON))
                        .w(px(240. + (row as f32 * 83.) % 420.))
                })));
            }
            LoadPhase::Error => {
                // NOT FSDS: error region — no Alert/AlertNotice on the gpui
                // target; retry re-runs the load with the failure flag off.
                let message = self.error_message.clone().unwrap_or_default();
                pane = pane.child(
                    div()
                        .id("queue-error")
                        .m_2()
                        .p_3()
                        .rounded(px(6.))
                        .border_1()
                        .border_color(rgb(DANGER))
                        .bg(rgb(0xfdf2f2))
                        .text_color(rgb(DANGER))
                        .flex()
                        .flex_col()
                        .items_start()
                        .gap_2()
                        .child(weak_text("Couldn't load the queue", DANGER))
                        .child(message)
                        .child(button(
                            "queue-retry",
                            "Retry",
                            ButtonVariant::Primary,
                            true,
                            cx.listener(|this, _, _, cx| this.retry(cx)),
                        )),
                );
            }
            LoadPhase::Loaded if self.incidents.is_empty() => {
                // Interaction 8: distinct empty state (not blank, not loading).
                pane = pane.child(
                    div()
                        .id("queue-empty")
                        .m_2()
                        .p_6()
                        .rounded(px(6.))
                        .border_1()
                        .border_color(rgb(BORDER))
                        .flex()
                        .flex_col()
                        .items_center()
                        .gap_2()
                        .child(weak_text("No incidents match the current filters", MUTED))
                        .child(weak_text(
                            "Adjust the search, environment, or severity filters.",
                            MUTED,
                        )),
                );
            }
            LoadPhase::Loaded => {
                let incidents = self.incidents.clone();
                let selected_id = self.selected_id.clone();
                pane = pane.child(
                    div()
                        .id("queue-list")
                        .flex_1()
                        .min_h_0()
                        .overflow_y_scroll()
                        .flex()
                        .flex_col()
                        .children(incidents.into_iter().map(|incident| {
                            let is_selected = selected_id.as_deref() == Some(incident.id.as_str());
                            self.render_queue_row(incident, is_selected, compact, widths, cx)
                        })),
                );
            }
        }
        pane.into_any_element()
    }

    #[allow(clippy::too_many_arguments)]
    fn render_queue_row(
        &self,
        incident: Incident,
        selected: bool,
        compact: bool,
        widths: ColumnWidths,
        cx: &Context<Self>,
    ) -> Stateful<gpui::Div> {
        let id = incident.id.clone();
        let assignee = incident
            .assignee
            .clone()
            .unwrap_or_else(|| "Unassigned".to_string());
        let badge = self
            .severity_badges
            .iter()
            .find(|(severity, _)| *severity == incident.severity)
            .map(|(_, badge)| badge.clone());
        // App-owned density (the spec's pressure-point residual): the gpui
        // target emits no Table/List, so density is owned by this lane and
        // driven by the FSDS ToggleSwitch in the header.
        let row_height = if compact { 26. } else { 40. };
        let text_size = if compact { 11. } else { 13. };
        // Exactly-one selection with a visible selected indication (accent
        // background + accent border). App-owned because the gpui target has
        // no Table/List row-selection channel — recorded finding, mirroring
        // the React lane's finding 2.
        div()
            .id(SharedString::from(format!("row-{}", incident.id)))
            .h(px(row_height))
            .flex()
            .flex_row()
            .items_center()
            .gap_2()
            .px_2()
            .rounded(px(4.))
            .text_size(px(text_size))
            .cursor_pointer()
            .bg(if selected {
                rgb(ACCENT_SUBTLE)
            } else {
                rgb(SURFACE)
            })
            .border_1()
            .border_color(if selected {
                rgb(ACCENT)
            } else {
                rgb(0x00000000)
            })
            .hover(move |style| {
                if selected {
                    style.bg(rgb(ACCENT_SUBTLE))
                } else {
                    style.bg(rgb(HOVER))
                }
            })
            .on_click(cx.listener(move |this, _, _, cx| this.select_incident(&id, cx)))
            // Cells carry min_w_0 + truncation and no flex_shrink_0, so at
            // compressed tiers they squeeze and ellipsize instead of pushing
            // the row past the pane (no horizontal scrolling — spec
            // invariant). No column is ever dropped; widths are tier-aware.
            .child(
                div()
                    .w(px(widths.id))
                    .min_w_0()
                    .whitespace_nowrap()
                    .text_ellipsis()
                    .overflow_hidden()
                    .text_color(rgb(if selected { ACCENT } else { MUTED }))
                    .child(incident.id.clone()),
            )
            .child(
                div()
                    .flex_1()
                    .min_w_0()
                    .whitespace_nowrap()
                    .text_ellipsis()
                    .overflow_hidden()
                    .child(incident.title.clone()),
            )
            .child(
                div()
                    .w(px(widths.service))
                    .min_w_0()
                    .whitespace_nowrap()
                    .text_ellipsis()
                    .overflow_hidden()
                    .child(incident.service.clone()),
            )
            // FROM PACKAGE EXPORTS: severity Badge in each queue row.
            .child(div().w(px(widths.severity)).min_w_0().children(badge))
            .child(
                div()
                    .w(px(widths.environment))
                    .min_w_0()
                    .whitespace_nowrap()
                    .text_ellipsis()
                    .overflow_hidden()
                    .child(incident.environment.as_str()),
            )
            .child(
                div()
                    .w(px(widths.age))
                    .min_w_0()
                    .whitespace_nowrap()
                    .text_ellipsis()
                    .overflow_hidden()
                    .text_color(rgb(MUTED))
                    .child(format_age(&incident.opened_at)),
            )
            .child(
                div()
                    .w(px(widths.assignee))
                    .min_w_0()
                    .whitespace_nowrap()
                    .text_ellipsis()
                    .overflow_hidden()
                    .text_color(if incident.assignee.is_some() {
                        rgb(TEXT)
                    } else {
                        rgb(MUTED)
                    })
                    .child(assignee),
            )
    }

    // Detail pane ---------------------------------------------------------
    fn render_detail_pane(&mut self, cx: &mut Context<Self>, tier: Tier) -> gpui::AnyElement {
        // Tier sizing: fixed side pane when rowned with the queue (wide and
        // medium tiers), a stacked full-width section below the queue at the
        // narrow tier (visible section, not a modal; capped height with its
        // own scroll so the queue keeps reachable space at 720×520).
        let mut pane = div()
            .id("detail-pane")
            .when(tier == Tier::Wide, |pane| pane.w(px(380.)))
            .when(tier == Tier::Medium, |pane| pane.w(px(340.)))
            .when(tier == Tier::Narrow, |pane| {
                pane.w_full().max_h(px(260.)).overflow_y_scroll()
            })
            .flex_shrink_0()
            .min_h_0()
            .flex()
            .flex_col()
            .gap_2()
            .p_3()
            .bg(rgb(SURFACE))
            .when(tier == Tier::Narrow, |pane| pane.border_t_1())
            .when(tier != Tier::Narrow, |pane| pane.border_l_1())
            .border_color(rgb(BORDER));
        pane = pane
            .child(self.title_detail.clone())
            .child(self.divider_detail.clone());
        if self.detail_loading {
            // NOT FSDS: detail skeleton lines while get_incident resolves.
            pane = pane.child(div().flex().flex_col().gap_2().children(
                DETAIL_SKELETON_WIDTHS.map(|width| {
                    div()
                        .h(px(14.))
                        .rounded(px(3.))
                        .bg(rgb(SKELETON))
                        .w(px(width))
                }),
            ));
            return pane.into_any_element();
        }
        let Some(detail) = self.detail.clone() else {
            // Spec: when no row is selected, the detail pane shows an empty state.
            pane = pane.child(
                div()
                    .id("detail-empty")
                    .p_6()
                    .rounded(px(6.))
                    .border_1()
                    .border_color(rgb(BORDER))
                    .flex()
                    .flex_col()
                    .items_center()
                    .gap_2()
                    .child(weak_text("No incident selected", MUTED))
                    .child(weak_text(
                        "Select a queue row to inspect its detail.",
                        MUTED,
                    )),
            );
            return pane.into_any_element();
        };
        let assign_pending = self.assign_pending;
        let resolve_pending = self.resolve_pending;
        pane = pane
            // FROM PACKAGE EXPORTS: detail title Text + status Badge (updated
            // via mounted setters when the detail arrives).
            .child(
                div()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_2()
                    .child(self.detail_title.clone())
                    .child(self.detail_status_badge.clone()),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap_1()
                    .child(div().text_color(rgb(MUTED)).child(format!(
                        "{} · {} · opened {} ago · {}",
                        detail.incident.severity.as_str(),
                        detail.incident.environment.as_str(),
                        format_age(&detail.incident.opened_at),
                        detail
                            .incident
                            .assignee
                            .as_deref()
                            .map(|assignee| format!("assigned to {assignee}"))
                            .unwrap_or_else(|| "unassigned".to_string()),
                    ))),
            )
            .child(detail.description)
            // Interaction 5: progressive disclosure over the event timeline.
            .child(
                div()
                    .id("timeline-disclosure")
                    .cursor_pointer()
                    .rounded(px(4.))
                    .px_2()
                    .py_1()
                    .hover(|style| style.bg(rgb(HOVER)))
                    .child(format!(
                        "{} Timeline ({})",
                        if self.timeline_expanded { "▾" } else { "▸" },
                        detail.timeline.len()
                    ))
                    .on_click(cx.listener(|this, _, _, cx| this.toggle_timeline(cx))),
            )
            .when(self.timeline_expanded, |pane| {
                pane.child(
                    div()
                        .flex()
                        .flex_col()
                        .gap_1()
                        .pl_3()
                        .border_l_1()
                        .border_color(rgb(BORDER))
                        .children(detail.timeline.iter().map(|event| {
                            div().text_color(rgb(MUTED)).child(format!(
                                "{} — {} ({})",
                                event.kind,
                                event.message,
                                format_age(&event.at)
                            ))
                        })),
                )
            })
            .child(div().flex_1())
            // NOT FSDS: detail action row — no Button component on the gpui
            // target; the actions open the package-boundary overlay workflows.
            .child(
                div()
                    .flex()
                    .flex_row()
                    .gap_2()
                    .child(button(
                        "action-assign",
                        if assign_pending {
                            "Assigning…"
                        } else {
                            "Assign…"
                        },
                        ButtonVariant::Primary,
                        !assign_pending,
                        cx.listener(|this, _, _, cx| this.open_assign(cx)),
                    ))
                    .child(button(
                        "action-resolve",
                        if resolve_pending {
                            "Resolving…"
                        } else {
                            "Resolve & close"
                        },
                        ButtonVariant::Danger,
                        !resolve_pending,
                        cx.listener(|this, _, _, cx| this.open_resolve(cx)),
                    )),
            );
        pane.into_any_element()
    }

    // Toast region --------------------------------------------------------
    // NOT FSDS: toast region — no Toast component exists on the gpui target;
    // a hand-authored transient-acknowledgement stack (recorded finding).
    fn render_toasts(&self, cx: &Context<Self>) -> gpui::AnyElement {
        div()
            .absolute()
            .bottom(px(16.))
            .right(px(16.))
            .w(px(340.))
            .flex()
            .flex_col()
            .gap_2()
            .children(self.toasts.iter().map(|toast| {
                let id = toast.id;
                div()
                    .id(SharedString::from(format!("toast-{id}")))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_2()
                    .p_2()
                    .rounded(px(6.))
                    .bg(rgb(SURFACE))
                    .border_1()
                    .border_color(rgb(BORDER))
                    .shadow_md()
                    .child(
                        div()
                            .w(px(3.))
                            .h(px(24.))
                            .rounded_full()
                            .bg(rgb(toast.variant.color())),
                    )
                    .child(div().flex_1().min_w_0().child(toast.title.clone()))
                    .child(button(
                        SharedString::from(format!("toast-{id}-dismiss")),
                        "Dismiss",
                        ButtonVariant::Ghost,
                        true,
                        cx.listener(move |this, _, _, cx| this.dismiss_toast(id, cx)),
                    ))
            }))
            .into_any_element()
    }

    // Confirm dialog (spec region 5, interaction 7) ------------------------
    // NOT FSDS: no Dialog component on the gpui target — hand-authored modal
    // with Escape/backdrop dismissal and a hand-authored focus trap.
    fn render_resolve_dialog(&self, cx: &Context<Self>) -> gpui::AnyElement {
        let pending = self.resolve_pending;
        let id = self.selected_id.clone().unwrap_or_default();
        div()
            .absolute()
            .inset_0()
            .bg(rgba(0x14141466))
            .flex()
            .items_center()
            .justify_center()
            // Backdrop click dismisses (interaction 10).
            .on_mouse_down(
                MouseButton::Left,
                cx.listener(|this, _, _, cx| this.close_resolve(cx)),
            )
            .child(
                div()
                    .id("resolve-dialog")
                    .w(px(440.))
                    .flex()
                    .flex_col()
                    .gap_3()
                    .p_4()
                    .rounded(px(8.))
                    .bg(rgb(SURFACE))
                    .border_1()
                    .border_color(rgb(BORDER))
                    .shadow_lg()
                    // Clicks inside the panel must not dismiss.
                    .on_mouse_down(
                        MouseButton::Left,
                        cx.listener(|_, _, _, cx| cx.stop_propagation()),
                    )
                    .child(self.title_resolve.clone())
                    .child(format!(
                        "This removes {id} from the active queue and clears the selection. \
                         Cancelling leaves the queue unchanged."
                    ))
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .justify_end()
                            .gap_2()
                            .child(
                                button(
                                    "resolve-cancel",
                                    "Cancel",
                                    ButtonVariant::Ghost,
                                    true,
                                    cx.listener(|this, _, _, cx| this.close_resolve(cx)),
                                )
                                .track_focus(&self.focus_resolve_cancel),
                            )
                            .child(
                                button(
                                    "resolve-confirm",
                                    if pending {
                                        "Resolving…"
                                    } else {
                                        "Resolve & close"
                                    },
                                    ButtonVariant::Danger,
                                    !pending,
                                    cx.listener(|this, _, _, cx| this.commit_resolve(cx)),
                                )
                                .track_focus(&self.focus_resolve_confirm),
                            ),
                    ),
            )
            .into_any_element()
    }

    // Assign side sheet (spec region 5, interaction 6) ----------------------
    // NOT FSDS: no Sheet component on the gpui target — hand-authored right
    // side sheet with Escape/backdrop dismissal and a hand-authored focus trap.
    fn render_assign_sheet(&self, cx: &Context<Self>) -> gpui::AnyElement {
        let pending = self.assign_pending;
        let id = self.selected_id.clone().unwrap_or_default();
        div()
            .absolute()
            .inset_0()
            .bg(rgba(0x14141466))
            .flex()
            .flex_row()
            .justify_end()
            // Backdrop click dismisses (interaction 10).
            .on_mouse_down(
                MouseButton::Left,
                cx.listener(|this, _, _, cx| this.close_assign(cx)),
            )
            .child(
                div()
                    .id("assign-sheet")
                    .w(px(360.))
                    .h_full()
                    .flex()
                    .flex_col()
                    .gap_3()
                    .p_4()
                    .bg(rgb(SURFACE))
                    .border_l_1()
                    .border_color(rgb(BORDER))
                    .shadow_lg()
                    .on_mouse_down(
                        MouseButton::Left,
                        cx.listener(|_, _, _, cx| cx.stop_propagation()),
                    )
                    .child(self.title_assign.clone())
                    .child(weak_text(format!("Assignee for {id}"), MUTED))
                    .child(self.assignee_field.clone())
                    .child(div().flex_1())
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .justify_end()
                            .gap_2()
                            .child(
                                button(
                                    "assign-cancel",
                                    "Cancel",
                                    ButtonVariant::Ghost,
                                    true,
                                    cx.listener(|this, _, _, cx| this.close_assign(cx)),
                                )
                                .track_focus(&self.focus_assign_cancel),
                            )
                            .child(
                                button(
                                    "assign-complete",
                                    if pending { "Assigning…" } else { "Assign" },
                                    ButtonVariant::Primary,
                                    !pending,
                                    cx.listener(|this, _, _, cx| this.commit_assign(cx)),
                                )
                                .track_focus(&self.focus_assign_complete),
                            ),
                    ),
            )
            .into_any_element()
    }
}

// ----------------------------------------------------------------------
// NOT FSDS: hand-authored button + segment primitives — the gpui target's
// 7-component allowlist (Switch, ToggleSwitch, Checkbox, Text, Badge,
// Divider, Stat) includes no Button or Select. Styling approximates the
// package's action tokens. Handlers are `cx.listener` closures (typed
// `Fn(&ClickEvent, &mut Window, &mut App)`), so ownership stays with the
// Dashboard entity.
// ----------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ButtonVariant {
    Primary,
    Danger,
    Ghost,
}

fn button(
    id: impl Into<gpui::ElementId>,
    label: impl Into<SharedString>,
    variant: ButtonVariant,
    enabled: bool,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> Stateful<gpui::Div> {
    let (bg, fg, border) = match variant {
        ButtonVariant::Primary => (ACCENT, 0xffffff, ACCENT),
        ButtonVariant::Danger => (DANGER, 0xffffff, DANGER),
        ButtonVariant::Ghost => (SURFACE, TEXT, BORDER),
    };
    div()
        .id(id)
        .px_3()
        .py_1()
        .rounded(px(6.))
        .border_1()
        .border_color(rgb(border))
        .bg(rgb(bg))
        .text_color(rgb(fg))
        .text_size(px(13.))
        .child(label.into())
        .when(enabled, |button| {
            button
                .cursor_pointer()
                .hover(|style| style.opacity(0.85))
                .on_click(on_click)
        })
        .when(!enabled, |button| button.opacity(0.5))
}

fn segment_button(
    id: impl Into<gpui::ElementId>,
    label: &'static str,
    selected: bool,
    on_click: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> Stateful<gpui::Div> {
    let (bg, fg, border) = if selected {
        (ACCENT, 0xffffff, ACCENT)
    } else {
        (SURFACE, MUTED, BORDER)
    };
    div()
        .id(id)
        .px_2()
        .py_1()
        .rounded(px(6.))
        .border_1()
        .border_color(rgb(border))
        .bg(rgb(bg))
        .text_color(rgb(fg))
        .cursor_pointer()
        .hover(|style| style.opacity(0.85))
        .on_click(on_click)
        .child(label)
}

fn weak_text(label: impl Into<SharedString>, color: u32) -> gpui::Div {
    div().text_color(rgb(color)).child(label.into())
}

fn queue_header_row(widths: ColumnWidths) -> gpui::Div {
    div()
        .flex()
        .flex_row()
        .items_center()
        .gap_2()
        .px_2()
        .h(px(24.))
        .text_color(rgb(MUTED))
        .border_b_1()
        .border_color(rgb(BORDER))
        .child(
            div()
                .w(px(widths.id))
                .min_w_0()
                .whitespace_nowrap()
                .text_ellipsis()
                .overflow_hidden()
                .child("ID"),
        )
        .child(div().flex_1().min_w_0().child("Title"))
        .child(
            div()
                .w(px(widths.service))
                .min_w_0()
                .whitespace_nowrap()
                .text_ellipsis()
                .overflow_hidden()
                .child("Service"),
        )
        .child(
            div()
                .w(px(widths.severity))
                .min_w_0()
                .whitespace_nowrap()
                .text_ellipsis()
                .overflow_hidden()
                .child("Severity"),
        )
        .child(
            div()
                .w(px(widths.environment))
                .min_w_0()
                .whitespace_nowrap()
                .text_ellipsis()
                .overflow_hidden()
                .child("Env"),
        )
        .child(
            div()
                .w(px(widths.age))
                .min_w_0()
                .whitespace_nowrap()
                .text_ellipsis()
                .overflow_hidden()
                .child("Age"),
        )
        .child(
            div()
                .w(px(widths.assignee))
                .min_w_0()
                .whitespace_nowrap()
                .text_ellipsis()
                .overflow_hidden()
                .child("Assignee"),
        )
}
