# Operations dashboard — swift lane

A macOS SwiftUI consumer lane for the generated `packages/ds-swiftui` package.
It realizes the framework-neutral [`../spec.md`](../spec.md) as a real, runnable
`swift run` app — the Swift analog of the React lane (`../../react/`) — composed
**only through `import DsSwiftUI` public exports**, reached via a local
package-path dependency (the same consumer-boundary seam as
[`examples/settings/swift`](../../../examples/settings/swift)).

The data/API seam is a **lane-local port** of the shared seam
(`../../src/{types,data,api}/`): verbatim fixture copies under
`Sources/OperationsDashboardSeam/Fixtures/`, a fixture adapter that is the only
fixture-shape reader, and an `actor OperationsApi` whose async methods mirror
the TS API exactly (`listIncidents`, `getIncident`, `listServiceHealth`,
`assignIncident`, `resolveIncident`, `simulateLoadFailure`) with identical
filter semantics, `ApiResult<T>` (`case ok` / `case failure(ApiError)`), and
error codes (`LOAD_FAILED`, `NOT_FOUND`, `ALREADY_RESOLVED`). Determinism
rules are preserved: fixed `latencyMs` (default 0; the app passes 350),
explicit `failLoads` flag, no wall-clock randomness.

## Layout

```
Package.swift                        SwiftPM: executable product + seam target + test target
Sources/OperationsDashboard/         the app (UI) — imports SwiftUI + DsSwiftUI + the seam module only
Sources/OperationsDashboardSeam/     the seam port — domain types, adapter (only fixture reader), actor API
Sources/OperationsDashboardSeam/Fixtures/   verbatim copies of ../../fixtures (declared .copy, read via Bundle.module)
Tests/OperationsDashboardTests/      XCTest seam suite (latencyMs: 0)
```

The UI never reads fixtures or the adapter: it calls `createOperationsApi()` /
`OperationsApi` only, exactly as the React lane consumes `../../src/api`.

## Claim

A macOS SwiftUI app can compose the operations-dashboard spec's regions —
header summary band, filter rail, dense incident queue, selection-driven
detail pane, and the assign Sheet / resolve-confirm Dialog / Toast overlays,
with real loading / empty / error / pending states driven by the async seam
API — from public `DsSwiftUI` exports (`Card`, `Stack`, `FsdsField`, `Input`,
`Select`, `Checkbox`, `FsdsButton`, `FsdsTable`, `Badge`, `Status`, `Stat`,
`Details`, `Sheet`, `Dialog`, `Toast`, `Alert`, `AlertNotice`, `Skeleton`,
`Spinner`, `FsdsDivider`) under `.environment(\.fsdsTheme,
FsdsTheme(tokens: FsdsSemanticDefaults.light))`, with the lane's own code
limited to the data seam, the responsive page-frame shell (tier computation,
collapsed-filters disclosure, queue column-squeeze arithmetic), and native
text runs.

## Falsifier

- Removing, renaming, or privatizing any public symbol the app uses from
  `DsSwiftUI` fails this lane's `swift build`.
- Any edit here that reaches past the package boundary (importing
  `packages/ds-swiftui` source paths, re-declaring generated symbols, copying
  generated code) is a boundary failure, not a consumer workaround.
- Mutating the spec to dodge a gap is forbidden; gaps are ledgered below.

## Run

From the repository root:

```bash
swift build --package-path examples/operations-dashboard/swift   # CI-parity gate
swift test  --package-path examples/operations-dashboard/swift   # 18 seam tests + 8 shell tests
swift run   --package-path examples/operations-dashboard/swift   # opens the dashboard window (local)
```

### Responsive behavior

Realizes the spec's "### Responsive behavior" section. The shell measures the
window content width with a `GeometryReader` and lowers it to a `ShellTier`
(`ShellLayout.swift` — pure, unit-tested arithmetic):

- **Wide (≥ 1280pt)** — filter rail (264pt) + queue + detail (360pt) in one
  row, under the header band. The window minimum is 720×520, so every tier is
  actually reachable.
- **Medium (900–1279pt)** — queue + detail row; the rail is collapsed behind a
  persistent **Filters** toggle (`FsdsButton` + counter `Badge` showing the
  active-filter count). Expanding reveals the same filter `Card` inline above
  the row. Collapsed filters keep applying — only the controls are hidden.
- **Narrow (< 900pt)** — single column in the spec's order: header → filters
  (collapsed by default behind the same toggle) → queue → detail. The detail
  pane is a full-width section in the same vertical scroll, never a modal.

Cross-tier invariants: window resizes to 720×520 with no clipped or
unreachable region; the queue never scrolls horizontally — table columns
squeeze (floors when space allows, proportional below them, all seven columns
always present, widths sum exactly to the pane width via
`QueueColumns.widths(for:)`, cells truncate); filter, selection, and overlay
semantics are tier-independent (one `DashboardController` drives every shell).
The tier thresholds, per-tier queue widths, column invariants, and the
active-filter count are pinned by `ShellLayoutTests` — arithmetic only, not
rendered layout (see non-claims).

## Partial-realization ledger

Region / spec requirement | Realized through | FSDS / NOT FSDS
--- | --- | ---
Header summary band (tiles derived from the filtered queue) | `Card(density: .inset)` + `Stat` hosting `Status`/`Badge`; counts computed in `HeaderBand` | **FSDS**
Filter rail container | `Card` | **FSDS**
Search / environment fields | `FsdsField` (label/control regions) hosting `Input` (value channel) and `Select` (selection channel) | **FSDS**
Severity filter group | `Checkbox` per severity in `Stack`; group label is a plain text run (no Fieldset/Legend export on this target) | FSDS controls, **NOT FSDS** group label
"Clear filters" affordance | `FsdsButton` (tertiary), disabled via `filtersActive` | **FSDS**
Queue table root | `FsdsTable` | **FSDS**
Queue rows / columns / header row | Plain SwiftUI `HStack` grid inside the `FsdsTable` content region — the target's `FsdsTable` is a single passive content region with no table anatomy | **NOT FSDS** (finding 1)
Row selection (exactly one) | In-cell `FsdsButton` (package-owned press) + app-tracked id; selected-row **visual** indication is app-side background — no package-owned selection channel or styling exists | FSDS control, **NOT FSDS** indication (finding 2)
Queue loading state | `Skeleton` + `Spinner`; placeholder shapes are consumer-supplied (`Skeleton` applies token padding but renders no visual) | FSDS wrappers, **NOT FSDS** placeholder shapes (finding 3)
Queue empty state | `Alert(intent: .info, level: .section)` | **FSDS**
Load-failure error + retry | `AlertNotice(status: .error)` + `FsdsButton` retry | **FSDS**
Detail pane | `Card` + `Badge` + `Status`; description and meta as native text runs (React-lane finding-1 posture) | FSDS surfaces, **NOT FSDS** text runs
Timeline progressive disclosure | `Details(summary:)` (`DisclosureGroup`) | **FSDS**
Assign workflow | `Sheet` (title/bodyContent/footer regions) hosting `FsdsField`+`Input`; pending posture via `FsdsButton(loading:/disabled:)` | **FSDS**
Resolve & close confirm | `Dialog` (title/bodyContent/footer regions); confirm removes the item, clears selection, raises Toast; cancel is a no-op | **FSDS**
Transient acknowledgement | `Toast` (single surface, dwell auto-dismiss, `Badge` in the item region) | **FSDS** surface, variant conveyed via `Badge` — the Swift `Toast` exposes no variant channel (finding 4)
Multi-child layout inside regions | `Stack` (vertical/horizontal) | **FSDS**
Responsive tiers (wide/medium/narrow) | App-computed geometry: `GeometryReader` → `ShellTier` → three shells in `OperationsDashboardApp`; thresholds and width arithmetic in `ShellLayout.swift` | **NOT FSDS** (page-frame region the spec claims; no breakpoint concept exists on this target — finding 7)
Collapsed-filters toggle (medium/narrow) | `FsdsButton` + counter `Badge` (active-filter count) in a `Stack`; expansion shows the same filter `Card` inline; collapse mechanism is app shell state | FSDS controls, **NOT FSDS** disclosure plumbing (finding 7)
Queue table columns (flexible, never dropped) | `QueueColumns.widths(for:)` distributes the pane width — floors, proportional squeeze, exact sum; cells truncate via `lineLimit(1)`; the severity `Badge` label caps inside its track | **NOT FSDS** arithmetic inside the FSDS `FsdsTable` (no column-priority/visibility API on the target — finding 8)
Page-frame shell (header row, pane columns per tier, scroll ownership) | Plain SwiftUI `VStack`/`HStack`/`ScrollView` driven by the tier | **NOT FSDS** (allowed page-frame region per spec)
Density toggle | Not realized — `FsdsTable` exposes no density channel (spec-declared residual, finding 5) | —
Overlay dismissal | Esc / backdrop click dismissal is the native sheet surface the components present through (`onOpenChange` channel receives it); focus behavior is platform-modal, not component-owned | **FSDS** channels, platform mechanism (finding 6)

## Findings (boundary observations)

Recorded per the spec's falsifier discipline — gaps surfaced while assembling
the lane, not silently worked around:

1. **`FsdsTable` has no table anatomy.** Surface: `FsdsTable`. Missing: the
   SwiftUI export is a static-content wrapper — one passive content region
   with token padding + corner radius; no `TableHead`/`TableRow`/`TableCell`
   substructure, no column definition, no row-selection channel. Ledger text:
   *"Queue rows/columns/selection → plain SwiftUI composed inside FSDS
   `FsdsTable` (no table anatomy exported for swiftui)."* The React lane's
   finding 2 is a strict subset of this one: web `Table` has rows but no
   selection; Swift `FsdsTable` has neither rows nor selection.
2. **No row-selection channel or selected-row styling** (same gap as React
   finding 2, now confirmed on a second target family). Surface: `FsdsTable`
   row posture. Missing: `selected` / `onSelect` / `aria-selected`
   equivalent and package-owned selected-row indication. Selection runs
   through an in-cell `FsdsButton`; the visual indication is app-side.
3. **`Skeleton` is a passive wrapper on this target.** Surface: `Skeleton`.
   Missing: `variant`/`animate`/`density` resolve token scopes, but the body
   applies only padding — no placeholder shapes, no lines count, no shimmer.
   The loading placeholder is consumer-composed shapes inside the FSDS
   `Skeleton` region. Ledger text: *"Loading placeholders → consumer shapes
   inside FSDS `Skeleton` (wrapper renders no visual)."*
4. **`Toast` exposes no variant channel on Swift.** Surface: `Toast`. Missing:
   `ToastVariant`/`ToastPoliteness` enums are emitted as public types, but the
   component's init takes only `open`/`item`/`title`/`description` — no
   `variant:` parameter (the web `Toast` takes `variant`). The lane conveys
   severity through a `Badge` in the item region. Ledger text: *"Toast
   variant → Badge in item region (Swift Toast surface lacks the variant
   channel its own enums declare)."*
5. **Density toggle residual unsatisfied.** Surface: `FsdsTable`. Missing: no
   density/compactness channel (spec pressure-point residual). Ledger text:
   *"Density toggle → not realized; no package channel (spec residual)."*
6. **Dialog/Sheet delegate modality to the platform.** Surface: `Dialog`,
   `Sheet`. Both present their panel through the native `.sheet` modifier, so
   Esc/backdrop dismissal and focus exclusion are platform behaviors reported
   back through `onOpenChange`/`open` — correct per the component's declared
   channels, but no component-owned focus trap exists to assert. Ledger text:
   *"Overlay focus/dismissal → platform sheet mechanism behind FSDS open
   channels."*
7. **No breakpoint / container-size concept on the swiftui target.** Surface:
   the target as a whole (no component or runtime export answers "how wide am
   I?" or declares responsive behavior). Missing: anything equivalent to the
   web targets' container-query/breakpoint story, so tier computation is
   app-computed `GeometryReader` width in the consumer, and the spec's
   thresholds live in lane code (`ShellTier`) rather than anywhere
   package-owned. The collapsed-filters disclosure mechanism is likewise app
   shell state (only its controls are FSDS). Ledger text: *"Responsive tiers →
   app-computed GeometryReader width; no breakpoint/container-size concept
   exists on the swiftui target."*
8. **`FsdsTable` exposes no column-priority or column-visibility API.**
   Surface: `FsdsTable`. Missing: any channel to express "drop or deprioritize
   this column under width pressure," so the spec's never-drop invariant is
   realized as app arithmetic (`QueueColumns.widths(for:)`: floors when space
   allows, proportional squeeze below them, exact-width sum so rows can't
   overflow their pane). Ledger text: *"Table columns squeeze, never drop →
   app-side width distribution inside FSDS `FsdsTable` (no column
   priority/visibility API)."*

## Non-claims

- **Compile + tests only.** The gates prove the package graph compiles
  (`swift build`) and that the seam behaves (18 tests, `latencyMs: 0`) and the
  responsive shell arithmetic holds (8 `ShellLayoutTests`: tier thresholds,
  per-tier queue widths, column never-drop/exact-sum/floor/squeeze invariants,
  active-filter count). They do not prove UI correctness.
- **No automated visual, resize, or interaction proof.** `swift run` opens the
  window for manual inspection (all three tiers by resizing; filters,
  selection, detail disclosure, sheet, dialog, toast, error+retry, empty
  state), but no XCUITest/screenshot rail pins the rendered tier layouts or
  the spec's ten interactions — the shell tests pin the arithmetic, not the
  rendering. This matches (and does not exceed) the settings swift lane's
  evidence class.
- **No parity claim.** This lane does not claim semantic parity with the
  React/Vue/Svelte/Angular/Lit lanes — including responsive parity: same tier
  semantics by construction, not proven by a shared cross-lane check.
  Cross-framework parity remains the spec's open acceptance item (spec.md →
  Acceptance 3).
- **Not a backend.** The seam is a fixture-backed async shape, not a server;
  nothing about real fetching, pagination, or persistence is proven.
- **Not generated-artifact admission.** Hand-written consumer code outside the
  codegen rail; also not a pnpm workspace member (no `package.json`), so it
  joins no JS gates.
- **Lane-local seam copy.** The TS seam in `../../src/` is untouched; this
  lane owns its port per the golden template (fixtures copied verbatim —
  checksums verified at authoring time).
