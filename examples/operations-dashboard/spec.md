# Operations dashboard — spec

An internal operations command center: a single-tenant tool an on-call engineer or operations lead keeps open all day to watch a fleet of services, triage incidents, filter and scan a dense work queue, and drill into a selected item without losing the queue. Framework-agnostic. Every implementation under `examples/operations-dashboard/<framework>/` must satisfy this spec using only the public API of its corresponding `@full-stack-ds/<framework>` package.

This is not a marketing dashboard with four hero charts. It is a working surface: a filter rail, a status-summary band, a dense incident/work queue, a selected-item detail panel, and the overlays (toasts, a confirm dialog, a side sheet) that a real triage tool needs to acknowledge, escalate, and resolve work.

## Why this app

**Real consumer pressure.** Operational tools are where component libraries break. They demand high information density (a long list/table that must stay readable), persistent multi-axis filter state, a selection that drives a detail surface elsewhere on the page, transient feedback that must not steal focus, and a destructive action gated behind confirmation. Each of those is a place where a component can under-expose state, swallow an event, or force the consumer into a private import or a local CSS patch to get density or layout right.

**Why it is not a toy demo.** A toy demo renders a static table and calls it a dashboard. This spec forces *coupled* state: a filter narrows the queue, the narrowed queue drives the summary counts, selecting a row populates a detail panel, and acting on the detail item mutates the queue and raises a toast — all without a backend and all without the consumer reaching past the package boundary. If any of those couplings can only be wired by leaking renderer internals, this app shape has found a boundary weakness.

**Component families stressed.** Data display under density (`Table`, `List`, `Stat`, `Status`, `Badge`), navigation and disclosure (`Tabs`, `Accordion`, `Details`, `NavList`), filter inputs and choice controls (`Field`, `Input`, `Select`, `Checkbox`), transient and persistent feedback (`Toast`, `Alert`, `AlertNotice`, `Spinner`, `Skeleton`, `Progress`), and overlay workflows (`Dialog`, `Sheet`, `Popover`, `Tooltip`). Layout is owned by `Stack` and `Card`; the consumer must not hand-roll structural wrappers to get the two-pane (queue + detail) layout.

**This app shape IS the assembly layer.** The repo's layered methodology (see `src/views/ComponentComplexityView.tsx`) names four layers — primitives, compounds, composers, assemblies — and places an *analytics dashboard* squarely in the assembly tier: a product-specific flow, owned by the app, **composed from system parts and never forking or re-styling them.** This dashboard is exactly that assembly. Its purpose as a proving surface is to demonstrate that the lower three layers, as shipped through public package exports, are composable enough to assemble a serious internal tool **at the app layer** without the two assembly anti-patterns the methodology warns against: *pushing product policy into the system* and *forking system components inside assemblies*. Those two anti-patterns are precisely this spec's falsifiers (private imports, behavior-substituting local CSS) restated in the methodology's vocabulary. If the dashboard can only be assembled by reaching past the package boundary, the system's composers and compounds are not yet expressive enough to support assemblies.

## Primary claim

Once the framework lanes exist, this app shape proves a bounded claim: **a dense internal operations surface — multi-axis filtering, a high-density queue, a selection-driven detail panel, status summaries, and at least one overlay workflow (confirm dialog and a side sheet) — can be composed from the public exports of each `@full-stack-ds/<framework>` package, with identical consumer-facing semantics across React, Vue, Svelte, Angular, and Lit, without renderer-internal imports or local CSS substituting for package behavior.**

The claim is bounded: it asserts *consumer-app composability and cross-framework semantic parity for this app shape*, not that the dashboard is production-grade, performant at scale, accessible to a published standard, or visually polished.

## Falsifiers

Any of these is evidence the claim is false (or the boundary is too weak), to be recorded in the findings log — never worked around silently:

- **Private import.** A lane imports from `dist/`, a generated internal path, a source file, or any non-exported package path to obtain a component, type, behavior primitive, or style.
- **Local CSS substituting for package behavior.** A lane uses hand-authored CSS to supply density, selection indication, status color, overlay layering, focus styling, or any state indication the package should own. (Pure page-frame layout that no package component is responsible for is allowed, but must be minimal and noted.)
- **Missing public export.** A surface the app legitimately needs (a row-selection event, a filter-clear affordance, a toast trigger, a sheet open/close channel, a status variant) is not reachable from the public package exports.
- **Framework-specific semantic rewrite.** The spec has to be reinterpreted for one framework — e.g. one framework needs a different selection model, a different overlay dismissal contract, or a different event shape — to make the lane pass.
- **Missing required state or event.** The lane cannot model a required state (filtering, selected, loading, empty, error) or cannot observe a required event (row select, filter change, confirm, dismiss) through the public surface.
- **Inconsistent cross-framework semantics.** The same component requires materially different consumer semantics (event names, channel keys, controlled/uncontrolled posture, dismissal behavior) across frameworks.
- **App-spec rewrite to dodge a failure.** A failure is hidden by weakening this spec instead of filing the gap against the contract, IR, emitter, package export map, or runtime behavior.

## Framework-neutral requirements

### Page / screen structure

One page, no routing. A persistent top region, a left filter rail, a central queue pane, and a right detail pane. Use FSDS components (`Stack`, `Card`, etc.) for component composition and package-owned behavior. Minimal app-shell layout CSS is allowed for page regions the design system does not claim (the two-pane frame, columns, sticky regions, responsive shell), but it must not substitute for component behavior, state indication, density, focus, overlay, or token/styling surfaces — those must come from the package, and a place where app-shell CSS has to supply one of them is a finding.

### Responsive behavior

The shell is responsive: every lane implements the same tier semantics at the
same thresholds, measured on the app window's content width. The responsive
shell is app-layer code (the page-structure doctrine above claims the frame,
columns, and responsive shell for the app); packages owe component behavior
*within* each region. The React lane's stylesheet collapse is the reference
realization of the narrow tier.

Tiers (by window content width):

1. **Wide (≥ 1280px)** — the base layout: header band full-width; filter rail, queue pane, and detail pane in one row (rail ≈ 200–300px, queue flexible, detail ≈ 300–420px).
2. **Medium (900–1279px)** — two regions in the row: queue + detail. The filter rail is collapsed behind a persistent **Filters** toggle affordance; activating it reveals the filter controls (an inline disclosure above the queue, or an equivalent overlay panel — presentation is lane-idiomatic). While collapsed, filters keep applying, and the toggle shows the count of active filters.
3. **Narrow (< 900px)** — single column, in order: header band → filter controls (collapsed by default behind the same toggle) → queue → detail pane. The detail pane remains a visible section below the queue (stacked flow — the React lane's existing collapse is the reference), not a modal. Overlays (assign sheet, resolve dialog, toasts) behave as at any other tier.

Cross-tier invariants:

- The window resizes down to **720 × 520** with no clipped, truncated-past-recovery, or unreachable region; panes squeeze or reflow, never clip (the pre-responsive swift lane's fixed-frame clipping is the named anti-pattern).
- Row and cell content wraps or truncates; lanes must not introduce horizontal scrolling to fit the queue.
- No table column may be dropped at any tier (column visibility/priority is a package-level capability no target exposes — a recorded finding, not a lane-local workaround).
- Filter, selection, and overlay semantics are tier-independent: the ten interaction requirements behave identically at every tier.

### Required regions

1. **Header band** — app title, a global status summary expressed as `Stat`/`Status`/`Badge` tiles (e.g. *Healthy: 42*, *Degraded: 3*, *Down: 1*, *Open incidents: 7*). Counts are derived from the current (filtered) queue, not hard-coded.
2. **Filter rail** — a `Card` containing filter controls: a text `Field`/`Input` for free-text search over the queue, a `Select` for environment (e.g. prod / staging / dev), and a set of `Checkbox` controls (or a multi-select residual — see pressure points) for severity (critical / high / low). A visible "Clear filters" affordance resets all filter state.
3. **Queue pane** — a dense `Table` (preferred) or `List` of work items (incidents / alerts). Each row shows: id, title, service, severity (`Badge`/`Status`), environment, age, and assignee. Exactly one row may be selected at a time; the selected row is visually distinguished using package-owned selection indication. The pane has a density toggle (compact / comfortable) if the components expose one (residual otherwise — see pressure points).
4. **Detail pane** — a `Card` populated from the selected queue item. Shows full title, description, a timeline of events (a `List` or `Accordion`/`Details` for progressive disclosure), current status, and an action row. When no row is selected, this pane shows an empty state.
5. **Overlay surfaces** — a confirm `Dialog` (for the destructive "Resolve & close" / "Delete" action), a `Sheet` (for an "Escalate" or "Assign" side workflow), and a `Toast` region for transient acknowledgements. `Tooltip` and `Popover` may carry secondary affordances (e.g. explaining a status, a row overflow menu).

### Required interactions

- Typing in the search field filters the queue live (case-insensitive substring over id/title/service).
- Changing the environment `Select` filters the queue.
- Toggling a severity `Checkbox` filters the queue (multiple may be active; semantics are union within the severity axis, intersection across axes).
- "Clear filters" resets all filter state and restores the full queue.
- Selecting a queue row populates the detail pane and marks the row selected; selecting another row replaces the selection.
- Expanding a `Details`/`Accordion` section in the detail pane reveals the event timeline (progressive disclosure).
- An action in the detail pane ("Escalate"/"Assign") opens the `Sheet`; completing or cancelling it closes the sheet and (on complete) raises a `Toast`.
- The destructive action ("Resolve & close") opens a confirm `Dialog`; confirming removes the item from the queue, clears the selection, and raises a `Toast`; cancelling closes the dialog with no state change.
- Filtering to zero matches shows the queue empty state; clearing filters restores the queue.

### Data and API layer

No backend (no server, no network, no persistence). The lane structures its data as three separated concerns (see the portfolio README's "Data and API Layer"). This seam is now materialized for this app shape under `fixtures/` and `src/{types,data,api}/` — see [`README.md`](./README.md); the structure below describes that landed scaffold, with no change to app semantics.

1. **Fixtures** — static `*.json` / `*.jsonl` files in the lane holding the incident/queue records, service-health records, and event timelines.
2. **Adapter** — a lane-local reader that parses the fixtures into typed domain records (`Incident`, `ServiceHealth`, `TimelineEvent`). The adapter may load the static JSON/JSONL fixtures once into memory; the UI calls only the promise-returning API, never the fixture or adapter directly.
3. **Functional API** — a lane-local, typed, **promise-returning** surface the dashboard calls: e.g. `listIncidents(filters): Promise<Incident[]>`, `getIncident(id): Promise<IncidentDetail>`, `resolveIncident(id): Promise<void>`, `assignIncident(id, assignee): Promise<void>`. The simulated initial-load latency and the mock load-failure flag live **behind** this API, so the loading, empty, error, and pending states below are real async transitions, not synchronous fakes. The dashboard never reads the fixture or adapter directly.

### Required local / loading / empty / error states

- **Loading** — the queue and summary render a `Skeleton`/`Spinner`/`Progress` placeholder while the functional API's `listIncidents` promise is pending (simulated latency over the JSONL fixture; no network).
- **Empty** — the queue shows an empty state when filters match nothing, distinct from the loading state; the detail pane shows its own empty state when nothing is selected.
- **Error** — a simulated load failure (toggleable via a mock flag) renders an `Alert`/`AlertNotice` error region in the queue pane with a retry affordance that re-runs the simulated load.
- **Pending** — the destructive action and the sheet workflow show a pending/disabled state during their simulated commit before resolving (optimistic removal or commit-then-confirm; see state model).

### Expected components and pressure-point residuals

Expected (must come from public exports): `Stack`, `Card` (+ parts), `Field`, `Input`, `Select`, `Checkbox`, `Button`, `Table` (or `List`), `Badge`, `Status`, `Stat`, `Tabs` or `Accordion`/`Details`, `Dialog` (+ parts), `Sheet`, `Toast`, `Alert`/`AlertNotice`, `Skeleton`, `Spinner`, `Progress`, `Tooltip`, `Popover`.

Pressure-point residuals (the app naturally wants these; if no public export exists, that absence is a finding, not a reason to hand-roll): a **multi-select** for severity (the spec falls back to a `Checkbox` group), a **density toggle** owned by `Table`/`List`, a **row overflow menu** (a true `Menu`/`DropdownMenu` role; the spec falls back to `Popover` + `Button`s), **pagination** for the queue, and a **sortable column header** affordance on `Table`. Each residual the lane cannot satisfy from public exports is recorded below.

## Interaction requirements

These are concrete enough to become future Playwright / runtime checks. Each lane must satisfy all of them.

1. **Filter narrows queue.** Type a substring matching a subset of items into search → the queue row count decreases to exactly the matching set; the header summary counts recompute to the filtered set.
2. **Multi-axis filter intersection.** Select environment = `prod` and severity = `critical` → only rows that are both prod and critical remain.
3. **Clear filters restores.** With any filters active, activate "Clear filters" → all filter controls reset to default and the full queue returns.
4. **Selection drives detail.** Click a queue row → it gains the selected indication and the detail pane shows that item's title/description/timeline; clicking a second row moves the selection and replaces the detail content.
5. **Progressive disclosure.** In the detail pane, expand the event-timeline disclosure → previously hidden timeline entries become visible; collapse hides them again.
6. **Sheet workflow.** Trigger "Escalate"/"Assign" → a `Sheet` opens; cancel closes it with no queue change; complete closes it and a `Toast` appears acknowledging the action.
7. **Confirm-and-remove.** Trigger "Resolve & close" → a confirm `Dialog` opens; cancel leaves the item in the queue; confirm removes the item, clears the selection (detail pane returns to empty state), and raises a `Toast`.
8. **Empty state.** Filter to a string that matches nothing → the queue shows its empty state (not a blank pane, not the loading state); clearing filters restores rows.
9. **Error + retry.** With the mock failure flag on, trigger a load → an error `Alert` appears with a retry affordance; activating retry with the flag off resolves to a populated queue.
10. **Overlay focus & dismissal.** While the confirm `Dialog` is open, focus is trapped; `Escape` and backdrop click dismiss it (per the component's default channels); the `Sheet` dismisses per its own default channel. Dismissal semantics must match across frameworks.

## State model

App-local state only; no backend. Domain data is served by the lane's functional API (typed, promise-returning) over static JSON/JSONL fixtures via an adapter (see "Data and API layer"); UI state is held locally by the assembly. No package imports data.

- **User-controlled state:** search text, selected environment, active severity checkboxes, density toggle (if available), and the open/closed state of each overlay (dialog, sheet) where the component is used in a controlled posture.
- **Derived state:** the filtered queue (search ∩ environment ∩ severity), the header summary counts (derived from the filtered queue), the selected item's full detail (derived by looking up the selected id in the fixture), and the queue empty condition (derived: filtered length === 0).
- **Pending / optimistic state:** the initial load gate (the `listIncidents` promise: loading → loaded), the destructive-action commit (the item is shown pending/disabled while `resolveIncident` resolves, then removed — optimistic removal), and the sheet-workflow commit (`assignIncident` pending until resolved).
- **Error state:** the API's simulated load-failure flag and the resulting error region; retry re-invokes the API and transitions error → loading → loaded.
- **Display-only state:** the summary tiles, the timeline entries, row metadata (age, assignee), and any status copy — served by the API from the fixture, never edited by the user.

## Public package boundary

Framework implementations may import **only** from public `@full-stack-ds/<framework>` package exports and that package's public CSS/style export (e.g. `import "@full-stack-ds/<framework>/styles.css"`). No reaching into `dist/` internals, generated internals, source files, non-exported package paths, or copying package code into the lane. Behavior primitives (focus trap, dismissal, etc.) are consumed only insofar as a public component re-exports them; a lane must not import a renderer-internal hook directly. The fixtures, adapter, functional API, and page-frame glue are **lane-local app-layer code** — they live in the lane, not in any package, and are not part of the package boundary; component behavior, state indication, and styling come from the package.

## Acceptance

A future, populated lane is accepted when:

1. **Build acceptance.** The lane builds without errors against the committed workspace package (`pnpm build`), with no type errors that require casts past the public types.
2. **Interaction acceptance.** All ten interaction requirements above pass under a future Playwright/runtime check driven from committed files only.
3. **Cross-framework semantic parity.** The same spec is realized in React, Vue, Svelte, Angular, and Lit with identical consumer-facing semantics (same events observed, same channels, same controlled/uncontrolled posture, same dismissal behavior). Divergence is a finding.
4. **No escape-hatch acceptance.** No falsifier above is present: no private imports, no behavior-substituting local CSS, no spec rewrite, no hand-rolled replacement for a component the package should provide, and no forking/re-styling of a system component inside the assembly.

Until all admitted Web DOM lanes meet 1–4, this app shape remains a partial proving surface, not admitted parity evidence.

## Non-claims

- **Not visual-quality proof.** The dashboard uses package CSS and stays visually modest. It does not assert design polish, layout taste, or responsive breakpoints beyond what package components provide.
- **Not backend / data proof.** There is no backend: data is a static JSON/JSONL fixture read through a lane-local adapter and served by a lane-local functional API. The promise-returning API is a real-to-life *shape*, not a real backend — the app proves nothing about real data fetching, pagination at scale, websocket updates, or persistence.
- **Not standalone accessibility proof.** It exercises shipped component behavior; accessibility adequacy claims belong to component contracts, generated behavior primitives, and dedicated a11y rails — not to this example.
- **Not generated-artifact admission.** This app shape pressures *consumer-side package consumption*. The governed rail (artifact ↔ contract ↔ codegen ↔ environment binding) remains a separate, independent gate.

## React Native posture

RN is **not** an initial lane for this app shape. The operations dashboard is a dense two-pane DOM layout (table density, side sheet, hover affordances) whose first proof belongs to the admitted Web DOM family. If an RN follow-on is added later, its first posture is a **typecheck / consumer-transfer fixture** (mirroring `settings/react-native`), not full app parity — it would prove only that the RN package's public exports type-check against this app's component usage, not that the dense layout reaches visual or interaction parity. Until that fixture exists, this spec makes no RN claim.

## Initial findings log

Reserved for findings surfaced while implementing the framework lanes. Record each consumer-API gap, residual that could not be satisfied from public exports, or cross-framework semantic divergence here. **Do not silently change this spec to make a lane pass — record the gap, then promote it into an issue, contract, IR, emitter, package export, or test.**

Prose detail for the React findings lives in [`README.md`](./README.md) → "React lane → Findings".

| # | Lane(s) | Surface | Finding | Status |
|---|---------|---------|---------|--------|
| 1 | react | `Field`, `Text` | Both `Omit<…, "children">` from their public props and never re-add it; `Field` renders only `slots.label`/`slots.control`, never children. The idiomatic `<Field><Input/></Field>` drops the control at runtime and fails strict typecheck. Lane uses typed `slots={{ label, control }}` + native text elements; no cast past public types. | open — package export gap |
| 2 | react | `Table` / `TableRow` | No row-selection channel (`selected`/`onRowClick`/`aria-selected`) and no package-owned selected-row styling. Selection is app-tracked via an in-cell `Button`; the selected-row **visual** indication is app CSS (`.ops-row-selected`). | open — missing public export (state + indication) |
| 3 | react | data/API seam (`src/data/adapter.ts`) | **Resolved:** the adapter now loads fixtures as bundler modules (`?raw` imports), with no `node:fs`/`node:url`/`node:path` on the load path. Verified: 47 data/API tests pass, lane builds/typechecks, and a headless Chromium load renders the queue (incident ids present) with no node-externalization error. The same fix was applied to the `storefront-checkout` and `social-feed` seams, and the rule is codified as golden-template invariant #10 so future seams cannot reintroduce it. | resolved — seam is isomorphic (EXAMPLES-OPS-DASHBOARD-ISOMORPHIC-SEAM-01) |
| 4 | react | lane `tsconfig.json` | **Resolved with #3:** the adapter pulls no `node:` specifiers, so `node` types are no longer needed on its account. `vite/client` remains required — legitimately, for the `?raw` fixture imports' ambient module declarations. Retracting the now-unneeded `node` entry / `@types/node` is minor follow-up, not part of this slice. | resolved — follows from #3 |
| 5 | swift, compose | `Table` | Neither native package emits table anatomy: the SwiftUI `FsdsTable` is a single passive content region and the Compose `Table` is a padded `Box` — no row/cell/head parts. Queue rows are consumer-composed inside the FSDS container (plain SwiftUI / Compose, marked NOT FSDS). This is a superset of React finding 2's anatomy half. | open — missing public export (table anatomy) |
| 6 | react, swift, compose, gpui | `Table` selection | No row-selection channel (`selected`/`onRowClick`/`aria-selected`) and no package-owned selected-row indication on any target carrying `Table`; gpui emits no `Table` at all. Every lane selects through an in-cell package `Button` (app widget on gpui) + app-tracked id + app-side visual indication — the same boundary gap realized four times. | open — missing public export (state + indication) |
| 7 | swift, compose | `Skeleton` | Both native `Skeleton`s resolve token sizing but paint no placeholder surface (SwiftUI applies padding only; Compose paints nothing) — loading placeholders are consumer shapes composed inside the FSDS wrapper; the visible loading signal is the package `Spinner`. | open — partial realization |
| 8 | swift, compose | `Toast` | Swift `Toast` declares public `ToastVariant`/`ToastPoliteness` enums its initializer does not take (the lane expresses variant through a `Badge` in the item region); Compose `Toast` renders as a centered **modal** overlay with no variant channel — "transient feedback that must not steal focus" is unrealizable through either package. | open — missing/incorrect public surface |
| 9 | swift | `FsdsTable` density | No density channel exists on the native table (see #5 for the anatomy half), so the spec's density-toggle residual stays unrealized on the swift lane (gpui realizes an app-owned density behind the FSDS `ToggleSwitch`). | open — spec residual |
| 10 | swift | `Dialog`/`Sheet` dismissal | Overlays present via the native sheet mechanism behind the FSDS open channels; Esc/backdrop/focus-exclusion behavior is platform-owned, and there is no component-owned focus trap to assert. Realized through the components' default channels as the spec words it — ledgered, not separately provable. | open — platform-default realization |
| 11 | gpui | `Table`, `Button`, `Select`, `Dialog`/`Sheet`/`Toast`, `Skeleton`/`Spinner`/`Alert`/`Status`, `Stack`/`Card`, text input | The 7-component allowlist (Switch, ToggleSwitch, Checkbox, Text, Badge, Divider, Stat) covers the summary band, severity filters/badges, and chrome only. Every other dashboard region is hand-authored GPUI marked NOT FSDS — including a minimal text field (gpui 0.2.2 ships no text-input widget) and overlay surfaces with a hand-authored focus trap. The menu/pagination/sortable-header residuals are not implementable on this target at all. | open — allowlist boundary (by design; ledgered per component) |
| 12 | compose | `Field`, `Text` | Positive contrast with React finding 1: the Compose `Field` takes label/control composable slots and `Text` takes a content lambda — both usable, with no children-drop behavior. Recorded as the parity counterpoint to #1. | recorded — parity note |
| 13 | compose (vs web, swiftui) | `Status` border realization | Chip borders are inconsistent in the compose lane's summary band (Status chips Healthy/Degraded/Down borderless next to bordered severity/counter `Badge` chips). Authority chain: the contract styles sidecars give **both** components 1px solid variant-tinted borders (`badge.color.border` / `status.color.border` → semantic tokens, per-variant overrides), SwiftUI lowers both, but the generated Compose `Status` carries **no border slots at all** (no `border` in `Status.kt`/`StatusTokens.kt`) while Compose `Badge` keeps `badge.color.border` — the compose emitter drops Status's border surface. The fix belongs in the jetpack-compose emitter (or a contract-level border decision folded into `Status.styles.json`), regenerated across targets — never lane-local CSS. | open — native emitter realization gap |
| 14 | swift, compose, gpui | responsive tiers (platform) | No breakpoint/container-size concept exists on any native target: tiers are app-computed geometry (SwiftUI `GeometryReader`, Compose `BoxWithConstraints`, GPUI `window.viewport_size()`), and the spec's pinned thresholds live in lane code — nowhere package-owned. Cross-lane tier parity is therefore provable only by comparing lanes; web remains the only target with a platform breakpoint mechanism (CSS media queries). | open — platform gap (by design; ledgered per lane) |
| 15 | react, swift, compose, gpui | `Table` column priority | No table surface on any target exposes a column-priority/visibility or min-width API, so the responsive invariant "columns squeeze or truncate, never drop" is realized entirely app-side per lane (Swift per-column floors + exact-sum distribution, Compose per-tier fixed→weighted columns, GPUI tier-compressed widths, web via CSS minmax). | open — missing public export |
| 16 | compose, swift, gpui | minor realization notes | Per-lane notes from the responsive work: the Compose header wrap uses experimental foundation `FlowRow` (page-frame arrangement only); SwiftUI's FSDS `Badge` has no intrinsic max-width channel (squeeze capping applied to its content `Text`); GPUI has no resize-listener API (resize re-renders; the collapse choice is the only stored responsive state). | recorded — realization notes |
