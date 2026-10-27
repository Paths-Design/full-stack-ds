// Operations dashboard — jetpack-compose lane app.
//
// Realizes the framework-neutral examples/operations-dashboard/spec.md against
// the generated ds-jetpack-compose package: header summary band, filter rail,
// dense incident queue with exactly-one selection, selection-driven detail
// pane with progressive-disclosure timeline, assign Sheet, resolve-confirm
// Dialog, and transient Toast feedback — plus the loading / empty / error /
// pending states, all driven off the suspend-returning lane-local API.
//
// Only `com.fullstackds.components.*` / `com.fullstackds.tokens.*` public
// exports are used for FSDS surfaces. Regions the package cannot realize are
// composed from plain Compose and marked `NOT FSDS: <reason>` in source; the
// partial-realization ledger lives in README.md.

package com.fullstackds.examples.operationsdashboard.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text as M3Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.fullstackds.components.alert.Alert
import com.fullstackds.components.alert.AlertIntent
import com.fullstackds.components.alert.AlertLevel
import com.fullstackds.components.alertnotice.AlertNotice
import com.fullstackds.components.alertnotice.AlertNoticeStatus
import com.fullstackds.components.badge.Badge
import com.fullstackds.components.badge.BadgeIntent
import com.fullstackds.components.badge.BadgeVariant
import com.fullstackds.components.button.Button
import com.fullstackds.components.button.ButtonSize
import com.fullstackds.components.button.ButtonVariant
import com.fullstackds.components.card.Card
import com.fullstackds.components.card.CardDensity
import com.fullstackds.components.checkbox.Checkbox
import com.fullstackds.components.details.Details
import com.fullstackds.components.dialog.Dialog
import com.fullstackds.components.divider.Divider
import com.fullstackds.components.field.Field
import com.fullstackds.components.input.Input
import com.fullstackds.components.list.List as FsdsList
import com.fullstackds.components.list.ListAs
import com.fullstackds.components.list.ListSpacing
import com.fullstackds.components.select.Select
import com.fullstackds.components.select.SelectOption
import com.fullstackds.components.sheet.Sheet
import com.fullstackds.components.sheet.SheetSide
import com.fullstackds.components.skeleton.Skeleton
import com.fullstackds.components.skeleton.SkeletonVariant
import com.fullstackds.components.spinner.Spinner
import com.fullstackds.components.spinner.SpinnerSize
import com.fullstackds.components.stat.Stat
import com.fullstackds.components.stat.StatTrend
import com.fullstackds.components.status.Status
import com.fullstackds.components.status.StatusStatus
import com.fullstackds.components.table.Table
import com.fullstackds.components.text.Text as FsdsText
import com.fullstackds.components.text.TextElement
import com.fullstackds.components.text.TextVariant
import com.fullstackds.components.toast.Toast
import com.fullstackds.components.tooltip.Tooltip
import com.fullstackds.components.tooltip.TooltipPlacement
import com.fullstackds.examples.operationsdashboard.domain.Incident
import com.fullstackds.examples.operationsdashboard.domain.IncidentDetail
import com.fullstackds.examples.operationsdashboard.domain.ServiceStatus
import com.fullstackds.examples.operationsdashboard.domain.TimelineEvent

/** Responsive tiers, pinned by the spec's "Responsive behavior" section. */
private enum class ShellTier { Wide, Medium, Narrow }

/** Tier breakpoints on the window content width (spec authority: wide ≥1280, medium 900–1279, narrow <900). */
private val WIDE_MIN_WIDTH = 1280.dp
private val MEDIUM_MIN_WIDTH = 900.dp

@Composable
fun OperationsDashboardApp(modifier: Modifier = Modifier) {
    val scope = rememberCoroutineScope()
    val dash = remember { DashboardController(scope = scope) }

    // Initial load + live re-load on every filter change (debounce-free:
    // latency lives behind the API). Mirrors the React lane's effect.
    LaunchedEffect(dash.filters) {
        dash.load(dash.filters)
    }

    // NOT FSDS: responsive shell. The target exposes no breakpoint concept,
    // so the tier is app-computed from the window content width via
    // BoxWithConstraints (no material3-adaptive artifacts). Page-frame
    // plumbing only — the spec claims the frame/columns/responsive shell for
    // the app; component behavior within each region stays with the package.
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val tier = when {
            maxWidth >= WIDE_MIN_WIDTH -> ShellTier.Wide
            maxWidth >= MEDIUM_MIN_WIDTH -> ShellTier.Medium
            else -> ShellTier.Narrow
        }
        when (tier) {
            ShellTier.Wide -> WideShell(dash)
            ShellTier.Medium -> MediumShell(dash)
            ShellTier.Narrow -> NarrowShell(dash)
        }
    }

    // Overlays: the FSDS Dialog/Sheet/Toast gate their own content on the
    // controlled `open` channel, so these regions are inert while closed.
    // Tier-independent by construction (spec cross-tier invariant).
    AssignSheet(dash)
    ResolveDialog(dash)
    ToastRegion(dash)
}

// --- Shells (one per responsive tier) -------------------------------------------

/**
 * Wide (≥ 1280): the base layout — header band full-width; filter rail,
 * queue pane, and detail pane in one row.
 */
@Composable
private fun WideShell(dash: DashboardController) {
    Column(modifier = Modifier.fillMaxSize()) {
        HeaderBand(dash)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
        ) {
            // Page-frame layout only — the two-pane/column shell the design
            // system does not claim (spec: "Public package boundary"). The
            // Stack primitive has no Compose realization on this target, so
            // the shell uses plain Row/Column (ledgered NOT FSDS).
            Box(Modifier.width(300.dp).fillMaxHeight()) {
                FilterRail(dash, Modifier.fillMaxSize())
            }
            Box(Modifier.weight(1.2f).fillMaxHeight().padding(horizontal = 8.dp)) {
                QueuePane(dash, Modifier.fillMaxSize(), compact = false)
            }
            Box(Modifier.weight(1f).fillMaxHeight()) {
                DetailPane(dash, Modifier.fillMaxSize())
            }
        }
    }
}

/**
 * Medium (900–1279): queue + detail in the row; the filter rail is collapsed
 * behind a persistent Filters toggle (with the active-filter count), and the
 * filter Card is revealed as an inline disclosure above the queue. Collapsing
 * never clears filter state — filters keep applying while collapsed.
 */
@Composable
private fun MediumShell(dash: DashboardController) {
    Column(modifier = Modifier.fillMaxSize()) {
        HeaderBand(dash)
        FilterDisclosureRow(dash, Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
        FiltersPanel(dash, Modifier.padding(horizontal = 12.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
        ) {
            Box(Modifier.weight(1.2f).fillMaxHeight().padding(horizontal = 8.dp)) {
                QueuePane(dash, Modifier.fillMaxSize(), compact = true)
            }
            Box(Modifier.weight(1f).fillMaxHeight()) {
                DetailPane(dash, Modifier.fillMaxSize())
            }
        }
    }
}

/**
 * Narrow (< 900): single stacked column in the spec's pinned order — header
 * band → filter controls (collapsed by default behind the same toggle) →
 * queue → detail pane as a full-width section below the queue in the scroll
 * (not a modal).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun NarrowShell(dash: DashboardController) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        HeaderBand(dash)
        FilterDisclosureRow(dash, Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
        FiltersPanel(dash, Modifier.padding(horizontal = 12.dp))
        QueuePane(dash, Modifier.fillMaxWidth().padding(horizontal = 12.dp), compact = true)
        Spacer(Modifier.height(12.dp))
        DetailPane(dash, Modifier.fillMaxWidth().padding(horizontal = 12.dp))
        Spacer(Modifier.height(12.dp))
    }
}

// --- Filter disclosure (medium + narrow tiers) -------------------------------------

/**
 * Persistent Filters toggle: FSDS Button + FSDS Badge count of active filter
 * values. While collapsed, filters keep applying (state lives in the
 * controller, not in the panel's visibility).
 */
@Composable
private fun FilterDisclosureRow(dash: DashboardController, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        val activeCount = dash.filters.activeCount
        Button(
            variant = ButtonVariant.Secondary,
            accessibilityLabel = if (dash.filtersOpen) "Hide filters" else "Show filters",
            onClick = { dash.filtersOpen = !dash.filtersOpen },
        ) {
            M3Text(
                if (dash.filtersOpen) "Hide filters" else "Filters",
                color = contentColor,
                maxLines = 1,
            )
        }
        // Spec: the toggle shows the count of active filters. Counter badge;
        // warning-intent when any filter is active, info when none.
        Badge(
            variant = BadgeVariant.Counter,
            intent = if (activeCount > 0) BadgeIntent.Warning else BadgeIntent.Info,
        ) {
            M3Text("$activeCount active", maxLines = 1)
        }
    }
}

/**
 * Inline disclosure hosting the existing filter Card. The panel is
 * height-bounded and internally scrollable so it can never push the queue
 * out of reach at the 720×520 invariant size.
 */
@Composable
private fun FiltersPanel(dash: DashboardController, modifier: Modifier = Modifier) {
    AnimatedVisibility(visible = dash.filtersOpen, modifier = modifier) {
        FilterRail(dash, Modifier.fillMaxWidth().heightIn(max = 320.dp))
    }
}

// --- Region 1: header band ----------------------------------------------------

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HeaderBand(dash: DashboardController) {
    // Summary counts are derived state: healthy/degraded/down from the loaded
    // service-health records, open incidents from the CURRENT (filtered)
    // queue — never hard-coded (spec interaction 1).
    val healthy = dash.services.count { it.status == ServiceStatus.Healthy }
    val degraded = dash.services.count { it.status == ServiceStatus.Degraded }
    val down = dash.services.count { it.status == ServiceStatus.Down }

    // NOT FSDS: header wrap. Foundation FlowRow wraps the summary tiles onto
    // additional lines at constrained widths (720×520 invariant) instead of
    // clipping or scrolling — pure page-frame arrangement.
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FsdsText(
            variant = TextVariant.Headline,
            `as` = TextElement.H1,
            modifier = Modifier.fillMaxWidth(),
        ) { M3Text("Operations dashboard") }

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            SummaryTile(
                label = "Healthy",
                statusValue = StatusStatus.Success,
                trend = StatTrend.Neutral,
                count = healthy,
            )
            SummaryTile(
                label = "Degraded",
                statusValue = StatusStatus.Warning,
                trend = if (degraded > 0) StatTrend.Down else StatTrend.Neutral,
                count = degraded,
            )
            SummaryTile(
                label = "Down",
                statusValue = StatusStatus.Danger,
                trend = if (down > 0) StatTrend.Down else StatTrend.Neutral,
                count = down,
            )

            // Open incidents: a Badge tile; the tooltip explains that the
            // count is filter-scoped (the spec's "secondary affordance" via
            // Tooltip).
            Card(density = CardDensity.Inset) {
                Stat(trend = StatTrend.Neutral) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Tooltip(
                            placement = TooltipPlacement.Bottom,
                            trigger = {
                                Badge(variant = BadgeVariant.Counter, intent = BadgeIntent.Info) {
                                    M3Text("Open incidents", maxLines = 1)
                                }
                            },
                        ) {
                            M3Text("Counts the current filtered queue, not the full fleet.")
                        }
                        M3Text(
                            text = "${dash.incidents.size}",
                            style = MaterialTheme.typography.headlineSmall,
                        )
                    }
                }
            }

            // Dev affordance: toggle the API's simulated load-failure flag so
            // the error + retry path is demonstrable from the UI (mirrors the
            // React lane).
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = dash.failLoads,
                    onChange = { dash.simulateLoadFailure(it) },
                    contentDescription = "Simulate load failure",
                )
                Spacer(Modifier.width(6.dp))
                M3Text("Simulate load failure", style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

@Composable
private fun SummaryTile(
    label: String,
    statusValue: StatusStatus,
    trend: StatTrend,
    count: Int,
) {
    Card(density = CardDensity.Inset) {
        Stat(trend = trend) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Status(status = statusValue) { M3Text(label) }
                M3Text(text = "$count", style = MaterialTheme.typography.headlineSmall)
            }
        }
    }
}

// --- Region 2: filter rail ------------------------------------------------------

@Composable
private fun FilterRail(dash: DashboardController, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            FsdsText(variant = TextVariant.Title) { M3Text("Filters") }

            Field(
                label = { M3Text("Search") },
                control = {
                    Input(
                        value = dash.filters.search,
                        onChange = { dash.setSearch(it) },
                        placeholder = "id, title, or service",
                        modifier = Modifier.fillMaxWidth(),
                    )
                },
            )

            Field(
                label = { M3Text("Environment") },
                control = {
                    Select(
                        options = ENVIRONMENTS.map { SelectOption(value = it.value, label = it.label) },
                        value = dash.filters.environment,
                        onChange = { dash.setEnvironment(it) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                },
            )

            M3Text("Severity", style = MaterialTheme.typography.labelLarge)
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                SEVERITIES.forEach { severity ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = severity in dash.filters.severities,
                            onChange = { dash.toggleSeverity(severity) },
                            contentDescription = "Severity ${SEVERITY_LABEL[severity]}",
                        )
                        Spacer(Modifier.width(6.dp))
                        M3Text(SEVERITY_LABEL[severity] ?: severity.name)
                    }
                }
            }

            Divider(modifier = Modifier.fillMaxWidth())

            // Visible clear-filters affordance; disabled posture when nothing
            // is active (required interaction 3).
            Button(
                variant = ButtonVariant.Tertiary,
                disabled = !dash.filters.active,
                onClick = { dash.clearFilters() },
            ) {
                M3Text("Clear filters", color = contentColor)
            }
        }
    }
}

// --- Region 3: queue pane -------------------------------------------------------

/**
 * Layout rule for one queue column. Wide keeps the roomy fixed widths (title
 * flexes); medium/narrow share the row width by weight so no column is ever
 * dropped or clipped at the 720×520 invariant size — cells truncate to
 * ellipsis instead (spec cross-tier invariants).
 */
private data class QueueColumnSpec(val fixed: Dp?, val compactWeight: Float) {
    /**
     * Cell modifier for this column in the given tier. [scope] is the Row
     * scope the cell composes into (`weight` only exists there).
     */
    fun cellModifier(compact: Boolean, scope: RowScope): Modifier =
        if (compact) {
            with(scope) { Modifier.weight(compactWeight) }
        } else {
            fixed?.let { Modifier.width(it) } ?: with(scope) { Modifier.weight(1f) }
        }
}

private val COLUMN_ID = QueueColumnSpec(fixed = 96.dp, compactWeight = 1.4f)
private val COLUMN_TITLE = QueueColumnSpec(fixed = null, compactWeight = 2.4f)
private val COLUMN_SERVICE = QueueColumnSpec(fixed = 112.dp, compactWeight = 1.6f)
private val COLUMN_SEVERITY = QueueColumnSpec(fixed = 96.dp, compactWeight = 1.4f)
private val COLUMN_ENV = QueueColumnSpec(fixed = 60.dp, compactWeight = 1.0f)
private val COLUMN_AGE = QueueColumnSpec(fixed = 48.dp, compactWeight = 0.9f)
private val COLUMN_ASSIGNEE = QueueColumnSpec(fixed = 84.dp, compactWeight = 1.4f)

@Composable
private fun QueuePane(
    dash: DashboardController,
    modifier: Modifier = Modifier,
    compact: Boolean,
) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            when (dash.phase) {
                LoadPhase.Error -> QueueError(dash)
                LoadPhase.Loading -> QueueLoading()
                LoadPhase.Loaded ->
                    if (dash.incidents.isEmpty()) QueueEmpty() else QueueTable(dash, compact)
            }
        }
    }
}

/** Error state: FSDS AlertNotice with a retry affordance (required interaction 9). */
@Composable
private fun QueueError(dash: DashboardController) {
    AlertNotice(status = AlertNoticeStatus.Error) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            M3Text(dash.errorMessage ?: "Failed to load incidents.")
            Button(variant = ButtonVariant.Primary, onClick = { dash.retry() }) {
                M3Text("Retry", color = contentColor)
            }
        }
    }
}

/**
 * Loading state: FSDS Spinner is the visible signal, inside FSDS Skeleton
 * chrome rows. NOT FSDS inside Skeleton: the generated Skeleton resolves
 * token sizing but paints no placeholder surface — its content is
 * consumer-supplied — so the lane supplies inert, non-interactive stand-in
 * boxes purely for reserved height; no state indication is hand-rolled.
 * Recorded in the README partial-realization ledger.
 */
@Composable
private fun QueueLoading() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Spinner(size = SpinnerSize.Md, label = "Loading incidents")
        M3Text("Loading incidents…", style = MaterialTheme.typography.bodyMedium)
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        repeat(4) {
            Skeleton(variant = SkeletonVariant.Text, modifier = Modifier.fillMaxWidth()) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(10.dp),
                )
            }
        }
    }
}

/** Empty state: distinct from loading (required interaction 8). */
@Composable
private fun QueueEmpty() {
    Alert(intent = AlertIntent.Info, level = AlertLevel.Section) {
        M3Text("No incidents match the current filters.")
    }
}

@Composable
private fun QueueTable(dash: DashboardController, compact: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FsdsText(variant = TextVariant.Title) {
            M3Text("Incident queue (${dash.incidents.size})")
        }
        // FSDS Table chrome. NOT FSDS inside: the generated Compose Table is
        // only the padded/radius container — it emits no row/cell parts and
        // exposes no row-selection channel (the Compose twin of the React
        // lane's Table finding). Rows below are app-composed; selection state
        // is app-tracked and the selected-row visual is app-side. The
        // compact column model is likewise app-side: the Table exposes no
        // column-priority/visibility API (README ledger). Recorded in the
        // README partial-realization ledger.
        Table(modifier = Modifier.fillMaxWidth()) {
            Column {
                QueueHeaderRow(compact)
                dash.incidents.forEach { incident ->
                    QueueRow(
                        incident = incident,
                        isSelected = incident.id == dash.selectedId,
                        nowMs = queueNowMs(),
                        compact = compact,
                        onSelect = { dash.selectIncident(incident.id) },
                    )
                }
            }
        }
    }
}

/**
 * Composition-time display clock for age formatting. Display-only — the
 * data/API seam itself never reads the wall clock (determinism rule).
 */
@Composable
private fun queueNowMs(): Long = remember { System.currentTimeMillis() }

@Composable
private fun QueueHeaderRow(compact: Boolean) {
    Row(modifier = Modifier.fillMaxWidth()) {
        QueueCell(COLUMN_ID, compact, text = "ID", header = true)
        QueueCell(COLUMN_TITLE, compact, text = "Title", header = true)
        QueueCell(COLUMN_SERVICE, compact, text = "Service", header = true)
        QueueCell(COLUMN_SEVERITY, compact, text = "Severity", header = true)
        QueueCell(COLUMN_ENV, compact, text = "Env", header = true)
        QueueCell(COLUMN_AGE, compact, text = "Age", header = true)
        QueueCell(COLUMN_ASSIGNEE, compact, text = "Assignee", header = true)
    }
}

@Composable
private fun QueueRow(
    incident: Incident,
    isSelected: Boolean,
    nowMs: Long,
    compact: Boolean,
    onSelect: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            // NOT FSDS: row-select affordance — the package Table has no
            // row-selection channel; this click target is app-side, and the
            // selected indication below is app-side for the same reason.
            .clickable(onClick = onSelect)
            .then(
                if (isSelected) {
                    Modifier.background(
                        MaterialTheme.colorScheme.secondaryContainer,
                        MaterialTheme.shapes.small,
                    )
                } else {
                    Modifier
                },
            )
            .padding(vertical = 6.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        // The id doubles as a package-owned press/focus affordance (the
        // React lane's in-cell Button posture, ported). In compact tiers the
        // button shares the row by weight and its label truncates.
        Button(
            variant = ButtonVariant.Ghost,
            size = ButtonSize.Small,
            accessibilityLabel = "Select ${incident.id}",
            onClick = onSelect,
            modifier = if (compact) Modifier.weight(COLUMN_ID.compactWeight) else Modifier,
        ) {
            M3Text(
                incident.id,
                color = contentColor,
                style = MaterialTheme.typography.labelMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        QueueCell(COLUMN_TITLE, compact, text = incident.title)
        QueueCell(COLUMN_SERVICE, compact, text = incident.service)
        Box(COLUMN_SEVERITY.cellModifier(compact, this)) {
            Badge(
                variant = BadgeVariant.Status,
                intent = severityIntent(incident.severity),
            ) {
                M3Text(
                    SEVERITY_LABEL[incident.severity] ?: incident.severity.name,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        QueueCell(COLUMN_ENV, compact, text = incident.environment.name.lowercase())
        QueueCell(COLUMN_AGE, compact, text = formatAge(incident.openedAt, nowMs))
        QueueCell(COLUMN_ASSIGNEE, compact, text = incident.assignee ?: "—")
    }
}

@Composable
private fun RowScope.QueueCell(
    spec: QueueColumnSpec,
    compact: Boolean,
    text: String,
    header: Boolean = false,
) {
    Box(modifier = spec.cellModifier(compact, this)) {
        M3Text(
            text = text,
            style = if (header) {
                MaterialTheme.typography.labelLarge
            } else {
                MaterialTheme.typography.bodySmall
            },
            fontWeight = if (header) FontWeight.SemiBold else null,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// --- Region 4: detail pane --------------------------------------------------------

@Composable
private fun DetailPane(dash: DashboardController, modifier: Modifier = Modifier) {
    val detail = dash.detail
    // Detail content falls back to the queue row while the detail fetch is in
    // flight (mirrors the React lane's `selected` derivation).
    val selected = detail?.incident ?: dash.selectedIncident

    Card(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (selected == null) {
                // Empty state: nothing selected (spec region 4).
                FsdsText(variant = TextVariant.Title) { M3Text("Detail") }
                Alert(intent = AlertIntent.Info, level = AlertLevel.Section) {
                    M3Text("Select an incident from the queue to see its detail and timeline.")
                }
            } else {
                FsdsText(variant = TextVariant.Title, `as` = TextElement.H2) {
                    M3Text(detail?.title ?: selected.title)
                }
                DetailContent(dash, selected, detail)
            }
        }
    }
}

@Composable
private fun DetailContent(
    dash: DashboardController,
    selected: Incident,
    detail: IncidentDetail?,
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Badge(variant = BadgeVariant.Status, intent = severityIntent(selected.severity)) {
            M3Text(SEVERITY_LABEL[selected.severity] ?: selected.severity.name)
        }
        Status(status = serviceStatusIntent(ServiceStatus.Degraded)) { M3Text(selected.service) }
    }

    M3Text(
        "${selected.environment.name.lowercase()} · opened " +
            "${formatAge(selected.openedAt, queueNowMs())} ago · " +
            (selected.assignee?.let { "@$it" } ?: "unassigned"),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )

    if (dash.detailLoading || detail == null) {
        Spinner(size = SpinnerSize.Md, label = "Loading detail")
        return
    }

    DetailBody(dash, detail)
}

@Composable
private fun DetailBody(dash: DashboardController, detail: IncidentDetail) {
    M3Text(detail.description, style = MaterialTheme.typography.bodyMedium)

    // Progressive disclosure (required interaction 5): the controlled FSDS
    // Details channel reveals/hides the timeline. State resets per selection.
    var timelineOpen by remember(detail.id) { mutableStateOf(false) }
    Details(
        summary = "Timeline (${detail.timeline.size})",
        open = timelineOpen,
        onOpenChange = { timelineOpen = it },
        modifier = Modifier.fillMaxWidth(),
    ) {
        // FSDS List chrome; NOT FSDS inside: the generated List is a Box with
        // no item part on this target, so entries are app-composed rows.
        FsdsList(`as` = ListAs.Ol, spacing = ListSpacing.Sm) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                detail.timeline.forEachIndexed { index, event ->
                    TimelineEntry(event, formatAge(event.at, queueNowMs()))
                }
            }
        }
    }

    Divider(modifier = Modifier.fillMaxWidth())

    // Action row: Assign opens the Sheet; Resolve & close opens the Dialog.
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(variant = ButtonVariant.Secondary, onClick = { dash.openAssign() }) {
            M3Text("Assign", color = contentColor)
        }
        Button(variant = ButtonVariant.Destructive, onClick = { dash.openResolve() }) {
            M3Text("Resolve & close", color = contentColor)
        }
    }
}

@Composable
private fun TimelineEntry(event: TimelineEvent, age: String) {
    Row(verticalAlignment = Alignment.Top) {
        M3Text(
            text = event.kind,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.width(84.dp),
        )
        M3Text(
            text = "${event.message} ($age)",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

// --- Region 5a: assign Sheet --------------------------------------------------------

@Composable
private fun AssignSheet(dash: DashboardController) {
    Sheet(
        open = dash.assignOpen,
        onOpenChange = { open -> if (open) dash.openAssign() else dash.closeAssign() },
        side = SheetSide.Right,
        ariaLabel = "Assign incident",
    ) {
        Column(
            modifier = Modifier.width(320.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            FsdsText(variant = TextVariant.Title) { M3Text("Assign incident") }
            M3Text(
                "Assign ${dash.selectedIncident?.id ?: "this incident"} to an on-call engineer.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Field(
                label = { M3Text("Assignee") },
                control = {
                    Input(
                        value = dash.assigneeInput,
                        onChange = { dash.assigneeInput = it },
                        placeholder = "e.g. @ada",
                        modifier = Modifier.fillMaxWidth(),
                    )
                },
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(variant = ButtonVariant.Secondary, onClick = { dash.closeAssign() }) {
                    M3Text("Cancel", color = contentColor)
                }
                Button(
                    variant = ButtonVariant.Primary,
                    loading = dash.assignPending,
                    disabled = dash.assignPending || dash.assigneeInput.isBlank(),
                    onClick = { dash.submitAssign() },
                ) {
                    M3Text("Assign", color = contentColor)
                }
            }
        }
    }
}

// --- Region 5b: resolve confirm Dialog ------------------------------------------------

@Composable
private fun ResolveDialog(dash: DashboardController) {
    Dialog(
        open = dash.resolveOpen,
        onOpenChange = { open -> if (open) dash.openResolve() else dash.closeResolve() },
        ariaLabel = "Resolve and close incident?",
    ) {
        // Escape and backdrop-click dismissal ride the FSDS Dialog's default
        // closeOnEscape/closeOnBackdropClick channels (required interaction 10).
        Column(
            modifier = Modifier.width(420.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            FsdsText(variant = TextVariant.Title) { M3Text("Resolve & close incident?") }
            M3Text(
                text = dash.selectedIncident?.let {
                    "This removes ${it.id} — \"${it.title}\" — from the active queue. " +
                        "This cannot be undone in the demo."
                } ?: "Select an incident first.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(variant = ButtonVariant.Secondary, onClick = { dash.closeResolve() }) {
                    M3Text("Cancel", color = contentColor)
                }
                Button(
                    variant = ButtonVariant.Destructive,
                    loading = dash.resolvePending,
                    disabled = dash.resolvePending || dash.selectedIncident == null,
                    onClick = { dash.confirmResolve() },
                ) {
                    M3Text("Resolve & close", color = contentColor)
                }
            }
        }
    }
}

// --- Region 5c: toast region -----------------------------------------------------------

/**
 * Transient feedback. NOT FSDS wrapping: the generated Compose Toast renders
 * as a centered modal overlay with no variant/intent channel (README ledger),
 * so the lane keeps a single active toast and expresses the variant only in
 * text. Auto-dismiss rides the component's `duration` channel; manual dismiss
 * uses the package Button.
 */
@Composable
private fun ToastRegion(dash: DashboardController) {
    val toast = dash.toast ?: return
    Toast(
        open = true,
        onOpenChange = { open -> if (!open) dash.dismissToast() },
        duration = 5000,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            M3Text(toast.title, style = MaterialTheme.typography.bodyMedium)
            Button(
                variant = ButtonVariant.Ghost,
                size = ButtonSize.Small,
                accessibilityLabel = "Dismiss notification",
                onClick = { dash.dismissToast() },
            ) {
                M3Text("Dismiss", color = contentColor)
            }
        }
    }
}
