# Compose Operations Dashboard Example

A desktop (JVM) Compose consumer lane for the generated
`packages/ds-jetpack-compose` package, realizing the framework-neutral
[`../spec.md`](../spec.md) operations-dashboard shape. It is the consumer-side
falsification surface for the package boundary on this target: the app
compiles and runs only through `com.fullstackds.components.*` /
`com.fullstackds.tokens.*` public exports, reached via Gradle composite-build
substitution (`includeBuild("../../../packages/ds-jetpack-compose")`), exactly
as [`examples/settings/compose/`](../../settings/compose/) does.

This lane is a sibling of the React lane (`../react/`): same spec, same
regions, same ten required interactions, and a **lane-local port of the shared
data/API seam** (fixtures → adapter → functional API) with the same
determinism rules — fixed `latencyMs`, explicit `failLoads` flag, no
wall-clock randomness on the API path.

## Claim

A desktop Compose app can consume the generated ds-jetpack-compose package via
composite build and assemble the operations dashboard — multi-axis filtering
(live search / environment / severity checkboxes), a summary band whose counts
derive from the current filtered queue, a dense queue with exactly-one
selection driving a detail pane, progressive-disclosure timeline (FSDS
`Details`), an assign `Sheet`, a resolve-confirm `Dialog` whose confirmation
removes the item and raises a `Toast`, and real loading / empty / error /
pending states driven by a suspend-returning lane-local API — with the app's
FSDS surfaces composed only from the package's public exports.

**Falsifier for this lane:** any region above realizable only by reaching past
the public exports, or a required state/event not modelable through them. The
ledger below records what fell short rather than working around it silently.

## Layout

```
src/main/resources/fixtures/   lane-owned copies of the 4 shared fixtures (verbatim)
src/main/kotlin/…/domain/      domain + API types (port of ../src/types)
src/main/kotlin/…/data/        FixtureAdapter — the ONLY fixture-shape reader (port of ../src/data)
src/main/kotlin/…/api/         OperationsApi — suspend-returning seam (port of ../src/api)
src/main/kotlin/…/ui/          DashboardController (state) + OperationsDashboardApp (regions) + Format
src/test/kotlin/…              JVM seam tests (runTest, latencyMs = 0)
```

The adapter loads fixtures through the **classloader** from the lane-owned
resources — never `../../fixtures` at runtime. A malformed fixture throws
`IllegalStateException` at construction (authoring error, not a domain error).
The UI imports only the `api` package; `domain` types flow through it.

## Partial-realization ledger

| Spec region | Realized through | Status |
|---|---|---|
| Header summary band | `Card`(inset) + `Stat` + `Status` + `Badge`(counter) + `Tooltip`; counts derived from the filtered queue / loaded service health | **FSDS** |
| Filter rail | `Card` + `Field` + `Input` + `Select` + `Checkbox` group + `Divider` + `Button`(tertiary, Clear filters) | **FSDS** |
| Queue pane chrome / loading / empty / error | `Table` container + `Skeleton` + `Spinner` + `Alert` + `AlertNotice`(error) + retry `Button` | **FSDS** (rows NOT FSDS — see findings 1–2) |
| Queue rows + selection | `Table` container holds app-composed rows; id cell is a package `Button`(ghost); selection state + selected-row visual are app-side | NOT FSDS — `Table` emits no row/cell parts and no selection channel |
| Detail pane | `Card` + `Badge` + `Status` + `Details`(controlled) + `Divider` + action `Button`s | **FSDS** (timeline entries app-composed — `List` has no item part) |
| Progressive disclosure | `Details` with controlled `open`/`onOpenChange` | **FSDS** |
| Assign workflow | `Sheet`(right, controlled `open`/`onOpenChange`) + `Field`/`Input` + `Button`(loading/disabled pending) | **FSDS** |
| Resolve & close | `Dialog`(controlled; escape/backdrop dismissal on package default channels) + destructive `Button`(loading pending) | **FSDS** |
| Toast feedback | `Toast` with `duration` auto-dismiss + manual dismiss `Button` | **FSDS surface, degraded** — modal-centered overlay, no variant/intent channel |
| Text runs | `Text` (FSDS) for titles; material3 `Text` inside NOT-FSDS rows/cells | mixed |
| Stack layout | Compose `Column`/`Row`/`Box` page frame | NOT FSDS — Stack primitive not ported to this target (same as settings lane) |
| Density toggle (queue) | — | residual — `Table` exposes no density axis |
| Row overflow menu | — | residual — no Menu/Popover-composed menu; not required by the ten interactions |
| Responsive tiers (wide/medium/narrow) | app-computed `BoxWithConstraints` at the spec's 1280/900 breakpoints; three shell layouts | NOT FSDS — no breakpoint concept on the target (finding 7); page-frame plumbing the spec claims for the app |
| Filters disclosure (medium/narrow) | persistent toggle = FSDS `Button` + FSDS `Badge`(counter, active-filter count); panel = `AnimatedVisibility` hosting the same FSDS filter `Card` | **FSDS** toggle/badge + NOT FSDS disclosure wrapper (plain-Compose shell) |
| Header wrap at constrained widths | foundation `FlowRow` (page-frame arrangement only) | NOT FSDS — layout plumbing; no package behavior substituted |
| Column squeeze at constrained widths | per-tier column model: fixed widths at wide, weighted columns at medium/narrow, `maxLines=1` + ellipsis | NOT FSDS — `Table` exposes no column-priority/visibility API (finding 8); no column dropped |

## Responsive behavior

Implemented per the spec's "Responsive behavior" section
(EXAMPLES-OPS-DASH-RESPONSIVE-01). The tier is computed in-app from the window
content width via `BoxWithConstraints` (`maxWidth`): **wide ≥ 1280** keeps the
base three-pane row (300dp rail + queue + detail); **medium 900–1279** shows
queue + detail with the filter rail collapsed behind a persistent **Filters**
toggle (FSDS Button + FSDS Badge carrying the active-filter count; expanding
reveals the same filter `Card` inline above the queue via `AnimatedVisibility`);
**narrow < 900** stacks a single column in the spec's pinned order — header →
filters (collapsed by default) → queue → detail as a full-width section below
the queue in the scroll (not a modal).

Cross-tier invariants: collapsing the filter panel never clears filter state
(state lives in the controller, not the panel's visibility) and filters keep
applying while collapsed; the ten interaction semantics are tier-independent
(selection, overlays, and toasts are shared regions); the header summary tiles
wrap via `FlowRow`; queue cells truncate to ellipsis (`maxLines = 1`,
`TextOverflow.Ellipsis`) with weighted columns at constrained widths so nothing
clips and no column is dropped at the 720×520 invariant size; no horizontal
scrolling is introduced for the queue. The overlays behave identically at every
tier (the FSDS Dialog/Sheet/Toast own their surfaces).

## Commands

- Compile (the gate): `./gradlew compileKotlin --no-daemon`
- Seam tests (the gate): `./gradlew test --no-daemon`
- Run (local visual inspection): `./gradlew run`

Dependency pins: kotlinx-coroutines `1.8.0` (the same line the Compose
Multiplatform 1.8.0 runtime graph pulls) and kotlinx-serialization-json
`1.8.1` — the versions this repo's native-compile lane has demonstrably
resolved.

## Findings (boundary observations)

Recorded per the spec's falsifier discipline — gaps surfaced while assembling
the lane, not silently worked around:

1. **`Table` emits no row/cell parts on the Compose target.** The generated
   `com.fullstackds.components.table.Table` is a single `Box` with
   token-resolved padding/radius — there is no `TableHead`/`TableRow`/
   `TableCell` equivalent, so the "dense `Table`" region cannot exist through
   the package alone; the lane composes header/rows from plain Compose inside
   the FSDS `Table` container. *Gap: the Compose Table surface is a chrome
   box; a table needs row/cell anatomy to be a table.*

2. **`Table` has no row-selection channel (Compose twin of the React lane's
   finding 2).** No `selected`/`onSelect`/selection-indication channel exists,
   and with finding 1 there is no row part to hang one on. Selection is
   app-tracked; the row's click affordance is app-side (`clickable`), and the
   selected-row visual is app-side (`MaterialTheme.colorScheme
   .secondaryContainer` background — the one place app code crosses from
   page-frame into state indication, mirroring `.ops-row-selected` in the
   React lane). Package-owned interaction is retained where possible: the id
   cell is a FSDS `Button`(ghost). *Gap: package-owned row selection (state +
   indication) is missing on `Table`.*

3. **`Toast` renders as a centered modal overlay, not a transient corner
   region.** The generated Toast wraps its content in a full-screen modal
   `Dialog` centered on screen, and exposes no variant/intent channel — so a
   toast steals the app's focus surface and cannot carry success/error
   coloring. The lane keeps a single active toast, expresses the variant only
   in text, and rides the component's `duration` + `onOpenChange` channels for
   auto/manual dismissal. *Gap: Toast's surface posture (modal-centered) and
   missing variant channel make the spec's "transient feedback that must not
   steal focus" unrealizable through the package.*

4. **`Skeleton` paints no placeholder surface.** The generated Skeleton
   resolves token padding/min-height but renders only its (consumer-supplied)
   content — there is no block/shimmer painting — so a skeleton alone is
   invisible. The lane's visible loading signal is the FSDS `Spinner`; the
   Skeleton boxes carry inert, non-interactive stand-in content for reserved
   height only. *Gap: Skeleton's animate axis resolves tokens it never draws.*

5. **No `Stack` primitive on this target** (settings-lane ledger, unchanged):
   composition layout is `Column`/`Row`/`Box`, page-frame only.

6. **`Text`/`Field` posture differs from the React lane's finding 1:** the
   Compose `Field` takes `label`/`control` composable slots (usable, no
   children omission bug), and `Text` takes a content lambda (no typed
   children-string channel, but nothing drops at runtime). No lane action
   needed; recorded for cross-framework parity comparison.

7. **No breakpoint concept on the target.** Nothing in
   `ds-jetpack-compose` exposes a tier/breakpoint/window-size surface, so the
   spec's tiers are computed app-side from `BoxWithConstraints.maxWidth` at
   the pinned 1280/900 values (the lead's direction: no material3-adaptive
   artifacts). Tier semantics therefore live in the lane, and identical tier
   behavior across lanes is only provable by comparing lanes, not by any
   shared package contract. *Gap: responsive tiers are consumer-reimplemented
   per target; the package owns nothing about them.*

8. **`Table` exposes no column-priority/visibility API.** With finding 1
   (no row/cell parts) there is no surface on which the package could express
   column priority or visibility, so the "squeeze, never clip, never drop a
   column" invariant is met app-side: a per-tier column model (fixed widths at
   wide; weighted columns at medium/narrow) with `maxLines = 1` +
   `TextOverflow.Ellipsis` truncation. *Gap: column responsiveness is
   consumer-owned; the package contributes no table semantics at any tier.*

9. **`FlowRow` is an experimental foundation API.** The header-band wrap uses
   `androidx.compose.foundation.layout.FlowRow` under
   `@OptIn(ExperimentalLayoutApi::class)` — a Compose foundation dependency,
   not a package export, for pure page-frame arrangement (no behavior or state
   indication). Noted because it is the only non-stable API the lane compiles
   against.

## Interaction coverage (the spec's ten)

1. Filter narrows queue — live search over id/title/service, case-insensitive ✓
2. Multi-axis intersection — environment `Select` × severity checkboxes ✓
3. Clear filters restores ✓ (visible affordance, disabled posture when inactive)
4. Selection drives detail — exactly-one selection; second click replaces ✓
5. Progressive disclosure — FSDS `Details` controlled open ✓
6. Sheet workflow — assign sheet; cancel no-op; complete commits + Toast ✓
7. Confirm-and-remove — dialog; cancel no-op; confirm removes + clears
   selection + Toast ✓
8. Empty state — distinct from loading ✓
9. Error + retry — `AlertNotice` error region + retry `Button`; flag toggle in
   the header band ✓
10. Overlay focus & dismissal — FSDS `Dialog` default escape/backdrop
    channels; `Sheet` default dismissal channels ✓

## Non-claims

This lane proves **compile + seam-test evidence on the JVM rung**: the two
gates are `./gradlew compileKotlin --no-daemon` and `./gradlew test
--no-daemon` (seam behavior + the FilterState unit tests; the seam itself is
untouched by the responsive slice). `./gradlew run` opens the window for
manual visual inspection — **resizing across the 1280/900 boundaries and down
to 720×520 is inspectable by hand, but there are no runtime UI assertions, no
Playwright equivalent, and no screenshot baselines** pinning the tier
transitions or the ten interactions.
JVM artifacts are **not** Android artifacts — no Android device/emulator ran,
and no Android claim follows. The seam is a fixture-backed shape, not a
backend. This lane is **not** cross-framework parity evidence (the spec's
parity claim needs all Web DOM lanes plus these native rungs to be compared),
**not** visual-quality proof, and **not** generated-artifact admission — the
app is hand-written consumer code outside the codegen rail, consuming a target
outside the TypeScript admission rail. `NOT FSDS` regions are fallbacks, not
parity claims.
