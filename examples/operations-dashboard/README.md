# operations-dashboard

A consumer-app proving surface at the **assembly** layer. The authority for this
app shape is [`spec.md`](./spec.md); this README documents the lane-local
**data / API layer**, the first web lane (**React**), and the three **native
consumer lanes** (**Swift**, **Compose**, **GPUI**).

> Status: **data/API scaffold landed; React lane builds, typechecks, and renders
> in a browser (the seam is isomorphic); three native consumer lanes (`swift/`,
> `compose/`, `gpui/`) compile with green seam-test suites; Vue/Svelte/Angular/
> Lit lanes not yet implemented.** The `react/` folder is a real Vite + React app composing the
> dashboard through public `@full-stack-ds/react` exports and the app-local API
> barrel. The data/API seam loads fixtures as bundler modules, so it runs
> unchanged under Node (Vitest) and in the browser (Vite) — the lane renders with
> the queue/summary/detail regions populated from the API (see Findings → finding
> 3, resolved). The `vue/`, `svelte/`, `angular/`, `lit/` folders hold only
> `src/.gitkeep` placeholders. The native lanes are compile + seam-test consumer
> evidence over the generated native packages — see "Native consumer lanes"
> below; each owns its own fixture copies and language-native seam port.

## No backend

There is no server, no network, and no persistence. Data is static
JSON/JSONL fixtures read through a lane-local adapter and served by a lane-local
**functional API**. The promise-returning API is a real-to-life *shape* — it
makes loading / empty / error / pending / optimistic states real async
transitions — not a real backend. Nothing leaves the bundle.

## Layers

```
fixtures/*.json(l)   →   src/data/adapter.ts   →   src/api/   →   (future) framework lane UI
  raw fixture shape       parses + joins + memoizes   promise API     imports the API only
```

### 1. Fixtures (`fixtures/`)

| File | Format | Holds |
|---|---|---|
| `incidents.jsonl` | JSONL (one row/line) | The work-queue rows — 10 incidents spanning critical/high/low severity, prod/staging/dev environments, assigned and unassigned. |
| `timeline-events.jsonl` | JSONL (one event/line) | Per-incident timeline events for the selected-detail surface. |
| `incident-descriptions.json` | JSON lookup (id → text) | Long-form incident descriptions, kept out of the compact queue rows. |
| `service-health.json` | JSON | Per-service health for the summary band — covers healthy/degraded/down. |

The fixtures deliberately exercise: every service status, every severity, every
environment, assigned vs. unassigned items, an incident with a rich multi-event
timeline (`INC-1042`), a no-match filter (empty-state path), and — via the API's
failure flag — the simulated load-failure path.

### 2. Adapter (`src/data/adapter.ts`)

The **only** module that touches the raw fixture file shape. It reads and parses
the JSONL/JSON, joins descriptions and timelines onto incidents, sorts each
timeline chronologically, and memoizes the parsed snapshot (the static fixtures
are loaded **once** into memory). A malformed fixture throws at load time
(authoring error), rather than surfacing as a domain error to the UI.

### 3. Functional API (`src/api/`)

The surface future framework lanes import — from `src/api/index.ts` only. It is
promise-returning and owns its own mutable in-memory copy of the incident set
(seeded from the adapter snapshot), so mutations stay inside the API and never
touch the fixtures.

| Function | Returns | Notes |
|---|---|---|
| `createOperationsApi(options?)` | `OperationsApi` | Factory; loads fixtures via the adapter. |
| `listIncidents(filters?)` | `Promise<ApiResult<Incident[]>>` | Active incidents; filters by `search` (id/title/service, case-insensitive), `environment`, and `severities` (union within axis, intersection across axes). |
| `getIncident(id)` | `Promise<ApiResult<IncidentDetail>>` | Detail + ordered timeline; typed `NOT_FOUND` for unknown/resolved ids. |
| `listServiceHealth()` | `Promise<ApiResult<ServiceHealth[]>>` | Summary-band data. |
| `assignIncident(id, assignee)` | `Promise<ApiResult<Incident>>` | Mutates API state. |
| `resolveIncident(id)` | `Promise<ApiResult<Incident>>` | Removes from active queue; typed `ALREADY_RESOLVED` on re-resolve. |
| `simulateLoadFailure(enabled)` | `void` | Toggles the read-failure flag (drives error → retry). |

**Determinism.** No wall-clock randomness. Latency is a fixed
`options.latencyMs` (default `0`, so tests run instantly; a lane can pass e.g.
`400` to exercise loading states). Failure is an explicit flag
(`options.failLoads` or `simulateLoadFailure(true)`), never chance. Methods
resolve a discriminated `ApiResult<T>` (`{ ok: true, value } | { ok: false, error }`)
for domain failures rather than rejecting, so UI lanes model error states
without `try/catch` around every call.

## Consumption boundary

Future framework lanes import from **`src/api/index.ts` only**:

```ts
import { createOperationsApi, type Incident } from "../api";
```

They must **not** import the adapter (`src/data/`) or the raw `fixtures/`
directly. Fixture-shape knowledge lives in the adapter; the API is the contract
the UI codes against. Reaching past the API into the adapter or fixtures is a
boundary violation, the same class as reaching past the `@full-stack-ds/<fw>`
public package exports (see [`spec.md`](./spec.md) → "Public package boundary").

## Tests

`src/api/operations-api.test.ts` proves fixture parsing, search/environment/
severity filtering (and cross-axis intersection), detail + timeline joins,
`assignIncident`/`resolveIncident` state mutation (and per-instance isolation),
and that the simulated failure produces typed errors with recovery. They run
under plain Vitest (Node environment) with `latencyMs: 0`. Because the root
Vitest `include` does not cover `examples/`, this suite runs through the
committed examples data/API test lane — `pnpm run test:examples:data-api` from
the repo root (backed by `vitest.examples.config.ts`) — not via the root
`pnpm test`. That command runs all three example data/API suites together. It
proves the data/API seam only — not framework app parity, not visual proof, not
backend proof, and not generated-artifact admission. Whether `examples/` joins
CI is a separate future slice.

## React lane (`react/`)

A real Vite + React 19 app that assembles the dashboard from public
`@full-stack-ds/react` exports and consumes the data/API seam through the
app-local API barrel (`../../src/api`) — never the adapter or fixtures. State
lives in `src/useDashboard.ts` (the only module that calls the API); `src/App.tsx`
renders the regions; `src/format.ts` maps domain values to component props;
`src/app-shell.css` covers page-frame layout only.

```bash
# From the repo root (commands run against the workspace package):
pnpm --filter @full-stack-ds/example-operations-dashboard-react run dev
pnpm --filter @full-stack-ds/example-operations-dashboard-react run build
pnpm --filter @full-stack-ds/example-operations-dashboard-react run typecheck
```

The lane implements the spec's required regions (header summary band, filter
rail, dense incident `Table`, selection-driven detail pane, timeline disclosure
via `Details`, assign `Sheet`, resolve confirm `Dialog`, `Toast` feedback) and
the required states (loading via `Skeleton`, list success, selected detail,
search/environment/severity filters, empty result, simulated load-failure +
retry via `AlertNotice`, assign pending/success, resolve pending/success that
removes the item and clears the selection). Filtering and detail are driven off
the promise-returning API, so every state is a real async transition.

**Responsive behavior** (spec.md tiers): wide ≥1280px is the three-pane grid;
medium 900–1279px collapses the rail behind a package `Button` "Filters" toggle
(with a package `Badge` active-filter count) revealing the same filter Card as
an inline disclosure above the queue — filters keep applying while collapsed;
narrow <900px stacks header → filters → queue → detail in one column. Realized
entirely in `app-shell.css` media queries plus the toggle state in `App.tsx`;
a headless Playwright check (16 assertions across the tiers and the 720px
floor) pins the collapse semantics.

### Non-claims

This lane proves *consumer-app composability for the React target only*. It is
**not** framework parity (Vue/Svelte/Angular/Lit lanes do not exist yet), **not**
visual proof (no screenshot or visual-regression baseline), **not** backend
proof (the API is a fixture-backed shape, not a server), and **not**
generated-artifact admission (this app is hand-written consumer code, outside the
codegen rail). The spec's ten interaction requirements are implemented but not
yet pinned by an automated Playwright/runtime check — that is a future slice.

### Findings (boundary observations)

These are recorded per the spec's falsifier discipline — gaps surfaced while
assembling the lane, **not** silently worked around:

1. **`Field` renders only `slots`, never `children`; `Text` omits `children`
   from its public type.** `FieldProps`/`TextProps` both `Omit<…, "children">`
   without re-adding it, and `Field`'s implementation renders `slots.label` /
   `slots.control` only (no `{children}`). So the idiomatic
   `<Field><Input/></Field>` pattern (used by `examples/settings/react`) silently
   drops the control at runtime *and* would fail a strict typecheck — that
   reference example simply has no `typecheck` script to catch it. This lane uses
   the typed `slots={{ label, control }}` surface for `Field`, and native
   semantic elements (`<h1>/<p>/<span>/<legend>`) for text runs, which pick up
   design-system typography from the package stylesheet cascade. **No cast past
   the public types is used.** *Gap: `Text`/`Field` are not usable as typed
   children containers; `Field`'s slot-only contract is undocumented in the
   export surface.*

2. **`Table`/`TableRow` expose no row-selection channel.** There is no
   `selected`/`onRowClick`/`aria-selected` prop and no package-owned selected-row
   styling. The lane drives selection with an in-cell `Button` (package-owned
   focus/press, `ariaPressed`) and tracks the id in app state, but the **visual**
   selected-row indication is app CSS (`.ops-row-selected` in `app-shell.css`) —
   the one place this lane's CSS crosses from page-frame into state indication.
   *Gap: package-owned row selection (state + indication) is missing on `Table`.*

3. **RESOLVED — the data/API seam was node-only and crashed at runtime in a
   browser.** `src/data/adapter.ts` previously computed its fixtures directory
   with `fileURLToPath(import.meta.url)` and read files with `readFileSync` from
   `node:fs` inside `loadFixtures()`, which `createOperationsApi()` calls on
   construction. The Vite build *succeeded* — Rolldown externalized `node:fs`,
   `node:url`, `node:path` "for browser compatibility" — but those externals were
   throwing stubs in the browser: serving the built lane (`vite preview`) and
   loading it produced an empty `#root` and the console error `Uncaught
   TypeError: (0 , j.fileURLToPath) is not a function`. **Fix:** the seam now
   loads fixtures as bundler modules (`?raw` imports for JSONL, `?raw` +
   `JSON.parse` for JSON), with no `node:fs` / `node:url` / `node:path` on the
   load path, so `createOperationsApi()` is browser-safe by transitivity — no
   barrel change needed. **Verified:** the 47 data/API tests still pass (`pnpm
   run test:examples:data-api`), the lane builds and typechecks, and a headless
   Chromium load of the built lane renders the queue (incident ids present in the
   DOM) with no node-externalization error. The rule is now codified for future
   seams as [invariant #10](../README.md#golden-dataapi-template) in the golden
   data/API template, and the same fix was applied to the `storefront-checkout`
   and `social-feed` seams so they cannot reintroduce the blocker.

4. **RESOLVED (with finding 3) — `tsc` no longer follows the API graph into
   node-targeted adapter code.** The adapter now uses bundler-module imports, so
   it pulls no `node:` specifiers into the lane's type graph. The lane's
   `tsconfig.json` still lists `"vite/client"` in `types` — that remains
   required, now legitimately, for the `?raw` fixture imports' ambient module
   declarations. The previous `node` types entry (and `@types/node`) was a
   consequence of the now-fixed node-only adapter and is retractable, though that
   cleanup is not part of this slice.

## Native consumer lanes (`swift/`, `compose/`, `gpui/`)

Three native lanes realize the same spec against the repo's generated native
packages, each consuming **only that package's public exports** through the
boundary its ecosystem provides (SwiftPM path dependency, Gradle composite-build
substitution, Cargo path dependency), and each porting the data/API seam into
its own language: lane-owned verbatim fixture copies, an adapter as the only
fixture-shape reader, and a typed async-equivalent API with the same filter
semantics, error codes (`LOAD_FAILED` / `NOT_FOUND` / `ALREADY_RESOLVED`),
fixed latency, and explicit failure flag as the TypeScript seam above.

| Lane | Package boundary | Gate (must exit 0) | Seam tests | Run (manual visual) |
|---|---|---|---|---|
| `swift/` | `import DsSwiftUI` via `.package(path: "../../../packages/ds-swiftui")` | `swift build --package-path examples/operations-dashboard/swift` | 18 (XCTest) | `swift run --package-path examples/operations-dashboard/swift` |
| `compose/` | `com.fullstackds.components.*` via `includeBuild("../../../packages/ds-jetpack-compose")` | `./gradlew compileKotlin` (from the lane folder) | 18 (kotlin.test) | `./gradlew run` |
| `gpui/` | `full_stack_ds_gpui` via Cargo path dep (7-component allowlist; zed renderer pinned to the package's exact rev) | `cargo build --manifest-path examples/operations-dashboard/gpui/Cargo.toml` | 16 (cargo test) | `cargo run --manifest-path examples/operations-dashboard/gpui/Cargo.toml` (macOS) |

All three implement the spec's ten interaction requirements as real code paths
(live filter narrowing with summary recompute, multi-axis intersection,
clear-filters restore, selection-driven detail, timeline disclosure, assign
Sheet, resolve-confirm Dialog with removal + selection clear + Toast, distinct
empty state, simulated load failure + retry, overlay dismissal through the
components' default channels). Each lane marks every region its package does not
cover `NOT FSDS` in source and carries a partial-realization ledger in its own
README; the consumer-API gaps all three surfaced are recorded in
[`spec.md`](./spec.md) → findings 5–12 (table anatomy, Table selection across
all four lanes, native Skeleton placeholders, native Toast posture/variant,
Swift overlay dismissal posture, the gpui allowlist boundary, and the Compose
Field/Text parity counterpoint to React finding 1).

**Responsive behavior** (spec.md tiers): all four lanes implement the same
pinned tiers — wide ≥1280 (rail + queue + detail row), medium 900–1279 (rail
collapsed behind a Filters toggle with an active-filter count badge; queue +
detail row), narrow <900 (single column, detail stacked below the queue), 720
× 520 floor, no horizontal scrolling, no dropped columns — each through its
platform idiom (SwiftUI `GeometryReader`, Compose `BoxWithConstraints`, GPUI
`window.viewport_size()`, CSS media queries on web). Tier behavior is
hand-inspectable by resizing (`swift run` / `./gradlew run` / `cargo run`);
the react lane additionally pins its collapse semantics with a headless
Playwright check, and the swift lane pins its tier/column arithmetic with
unit tests. Cross-lane findings from this work are recorded in
[`spec.md`](./spec.md) → findings 13–16.

**Non-claims for the native lanes.** They are compile + seam-test consumer
evidence — the native analog of the React lane's build/typecheck rung. No lane
runs in CI yet (wiring the three gates into CI is separate follow-up), no
automated visual or interaction proof exists, `swift run` / `./gradlew run` /
`cargo run` open windows for manual inspection only, and none of this is parity
evidence across frameworks: the gpui lane in particular realizes most regions
hand-authored (its target's allowlist is seven components by design). The
gpui lane is macOS-only, mirroring the target's pinned posture.

## Intended future use

When the remaining framework lanes are built, each lane's UI imports the
functional API above and renders the dashboard from it — driving its
loading/empty/error/pending/optimistic states off real promise transitions. This
data/API seam is shared in *shape* across lanes (the spec requires identical
consumer-facing semantics), but each lane owns its own copy under its
`<framework>/` folder unless a later slice extracts a shared lane-local module.
Materializing the equivalent seam for `storefront-checkout` and `social-feed` is
separate follow-on work under its own spec.
