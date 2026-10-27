# Operations dashboard — GPUI lane

A standalone macOS **GPUI** consumer lane for the operations-dashboard example
([`../spec.md`](../spec.md)). It realizes the app shape by consuming ONLY the
public API of the bounded GPUI package (`packages/ds-gpui`, consumed as the
path dependency `full-stack-ds-gpui`): the target's 7-component allowlist —
**Switch, ToggleSwitch, Checkbox, Text, Badge, Divider, Stat** — plus a
lane-local port of the data/API seam and its tests. This is the first example
lane for the GPUI target; its conventions mirror the other native lanes
(`examples/settings/swift`, `examples/settings/compose`).

> Status: **builds clean and the seam suite passes (16 tests); all ten spec
> interactions are implemented code paths; no automated visual or interaction
> proof exists** — see [Non-claims](#non-claims).

## Claim

A native macOS GPUI app can compose the operations-dashboard assembly —
multi-axis filtering, a dense incident queue with exactly-one selection, a
selection-driven detail pane with progressive-disclosure timeline, summary
`Stat`/`Badge` tiles derived from the filtered queue, and confirm-dialog / side
sheet / toast overlay workflows — from the 7-component public allowlist of
`full_stack_ds_gpui`, without importing package internals or copying generated
component code, with loading / empty / error / pending states as real async
transitions driven through gpui's executor (fixed-latency timer + explicit
failure flag, never wall-clock randomness).

**Falsifier:** removing, renaming, or privatizing any public symbol this lane
uses from `full_stack_ds_gpui` (e.g. `components::Checkbox`, `content::NativeContent`,
`control::ChangeRequest` via subscriptions) fails `cargo build`. Any edit here
reaching into package internals (path imports into generated component modules,
copying generated view code into the lane) is a boundary failure to fix in the
package, not the consumer.

## Partial-realization ledger

The GPUI target admits exactly 7 components. Every other region the spec
requires is hand-authored plain gpui, marked `NOT FSDS` in source, and listed
here so the boundary stays visible — the same discipline as the Compose and
Swift settings lanes:

| Spec region | Realized through | Status |
|---|---|---|
| Header summary tiles (Healthy / Degraded / Down / Open) | FSDS `Stat` (content + trend via `NativeContent`, counts re-derived per filtered load) | **FSDS** |
| Severity badges in queue rows + detail status badge | FSDS `Badge` (retained pool, `intent`/`variant`/`size`) | **FSDS** |
| Severity filter (multi-checkbox) | FSDS `Checkbox` ×3, controlled via `checked(Some(..))` + `ChangeRequest` subscribe | **FSDS** |
| Density toggle (pressure-point residual) | FSDS `ToggleSwitch`, controlled; density itself is app-owned | **FSDS control / app-owned density** |
| Section chrome (titles, labels, section rules) | FSDS `Text` (variant/size/weight) + FSDS `Divider` | **FSDS** |
| Simulated-load-failure switch (error → retry driver) | FSDS `Switch`, controlled | **FSDS** |
| Free-text search field | hand-authored minimal `TextField` (`src/text_input.rs`: FocusHandle + key-down accumulation + painted text/caret) | NOT FSDS — gpui 0.2.2 ships no text-input widget |
| Environment selector | hand-authored segmented buttons | NOT FSDS — no `Select` on the target |
| Clear-filters affordance, action buttons | hand-authored button primitive (`src/dashboard.rs`) | NOT FSDS — no `Button` on the target |
| Queue pane (columns, rows, exactly-one selection, selected indication, scroll) | hand-authored flex row grid | NOT FSDS — no `Table`/`List` on the target; no row-selection channel exists to consume |
| Loading skeletons (queue + detail) | hand-authored gray placeholder bars | NOT FSDS — no `Skeleton`/`Spinner`/`Progress` on the target |
| Error region + retry | hand-authored bordered error panel + retry button | NOT FSDS — no `Alert`/`AlertNotice` on the target |
| Empty states (queue + detail) | hand-authored bordered hint panels | NOT FSDS — no empty-state surface on the target |
| Confirm dialog (Resolve & close) | hand-authored modal: backdrop + panel, Escape/backdrop dismissal, hand-authored focus trap (Tab cycles the dialog's controls) | NOT FSDS — no `Dialog` on the target |
| Assign side sheet | hand-authored right sheet: backdrop, panel, assignee `TextField`, complete/cancel | NOT FSDS — no `Sheet` on the target |
| Toast region | hand-authored bottom-right stack with per-toast dismiss | NOT FSDS — no `Toast` on the target |
| Detail pane (title, description, meta, disclosure, action row) | hybrid: FSDS `Text` title + `Badge` status; hand-authored disclosure, meta, actions | mixed (marked in source) |
| Page frame (three-pane layout, spacing) | plain gpui flex layout | NOT FSDS — page-frame layout the target's allowlist does not claim |

Every hand-authored region carries a `// NOT FSDS: <reason>` marker (or a
`// FROM PACKAGE EXPORTS:` marker) in `src/dashboard.rs` / `src/text_input.rs`.

## Data / API seam (lane-local port)

The lane owns its own seam copy per the portfolio rule ("each lane owns its own
copy under its `<framework>/` folder"): the four fixture files under
`fixtures/` are **verbatim copies** (md5-verified at authoring time) of
`examples/operations-dashboard/fixtures/`, embedded at compile time with
`include_str!`. The layering mirrors the TypeScript seam exactly:

```
fixtures/*.json(l)  →  src/seam/adapter.rs  →  src/seam/operations_api.rs  →  src/dashboard.rs
  raw fixture shape      parses + joins +      synchronous typed API         the only caller
                         memoizes (panic on    (ApiResult<T> = Result)       (async via gpui)
                         malformed = authoring error)
```

- `src/seam/types.rs` — Rust port of `src/types/index.ts` (serde camelCase on
  the wire; `ApiErrorCode` = `LoadFailed` / `NotFound` / `AlreadyResolved`).
- `src/seam/adapter.rs` — the **only** fixture-shape reader; malformed fixtures
  panic at construction (authoring error), never surface as domain errors;
  timelines sorted chronologically regardless of fixture line order.
- `src/seam/operations_api.rs` — mirrors `OperationsApi` one-for-one:
  `list_incidents(filters)`, `get_incident(id)`, `list_service_health()`,
  `assign_incident(id, assignee)`, `resolve_incident(id)`,
  `set_load_failure(enabled)`. Filter semantics identical: case-insensitive
  substring over id/title/service; environment equality; union within the
  severity axis, intersection across axes.

**Determinism.** The seam is synchronous and pure (no gpui types, no threads,
no I/O at runtime). Async behavior lives in the UI layer: `cx.spawn` +
`cx.background_executor().timer(Duration::from_millis(latency_ms))` with the
API's fixed latency (binary: 250 ms so loading states are observable; tests:
0) and the explicit failure flag. There is no wall-clock read anywhere in the
lane; relative ages render against a fixed reference instant
(`format::REFERENCE_NOW`) instead of the React lane's `Date.now()` default —
a deliberate determinism-strengthening divergence, recorded here.

## Commands

```bash
# From the repo ROOT (the lane pins its own toolchain via rust-toolchain.toml,
# but cargo discovers that file from the CWD, not --manifest-path, so qualify
# the toolchain explicitly when invoking from outside the lane):
cargo +1.94.1 build --manifest-path examples/operations-dashboard/gpui/Cargo.toml
cargo +1.94.1 test  --manifest-path examples/operations-dashboard/gpui/Cargo.toml

# From inside the lane directory the plain invocations work:
cd examples/operations-dashboard/gpui && cargo build && cargo test

# Run (local visual inspection only; macOS; opens the dashboard window):
cd examples/operations-dashboard/gpui && cargo run
```

`rust-toolchain.toml` pins channel `1.94.1` (the toolchain
`packages/ds-gpui` requires; the machine default 1.90 is too old for the gpui
graph). `Cargo.lock` is committed after a successful resolve, mirroring
`packages/ds-gpui`; build output (`target/`) is ignored via the lane-local
`.gitignore` (source and lock remain tracked).

## GPUI-target posture

- **7-component allowlist**: Switch, ToggleSwitch, Checkbox, Text, Badge,
  Divider, Stat (`fsds.targets.json` → `gpui`). Everything else the spec
  expects (Table/List, Field/Input, Select, Button, Stack/Card, Tabs/
  Accordion/Details, Dialog, Sheet, Toast, Alert/AlertNotice, Skeleton,
  Spinner, Progress, Tooltip, Popover, Status) is **not emitted for this
  target**, so those regions are hand-authored fallbacks, not parity claims.
- **macOS-pinned**: gpui + gpui_platform at the same zed rev as
  `packages/ds-gpui` (`a38fc8c8de6e4010fadcfde7dd111d90dfd66845`),
  `default-features = false` + the `font-kit` gpui_platform feature. No
  cross-platform claim.
- **Outside the admission rail**: like all non-web targets, this lane is not
  verified by `governed:rail`; CI's committed-byte drift diff and native CI
  lanes are the only automated coverage of the package itself, and this lane
  adds compile + seam-test evidence for the consumer side.

## Boundary findings (surface / gap / ledger line)

1. **Text input.** surface: *any editable text* / gpui 0.2.2 ships no
   text-input widget; the lane hand-authors a minimal single-line focused
   field (FocusHandle + key-down accumulation via `key_char` + painted
   value/caret; no selection, IME composition, paste, or cursor positioning) /
   ledger: "search + assignee fields: NOT FSDS — no text-input widget on the
   gpui target."
2. **Table / List.** surface: *dense queue* / no table or list component, no
   row-selection channel, no package-owned selected-row or density styling;
   the lane hand-authors the row grid and the selection indication (the same
   gap the React lane recorded as finding 2) / ledger: "queue pane: NOT FSDS —
   no Table/List on the target; selection indication app-owned."
3. **Overlay surfaces.** surface: *Dialog / Sheet / Toast* / none exist, so
   dismissal channels, layering, and focus trapping are hand-authored per
   region (Escape + backdrop click; Tab cycles inside the open overlay) —
   there is no package dismissal contract to match across frameworks /
   ledger: "confirm dialog, side sheet, toasts: NOT FSDS — no overlay
   surfaces on the gpui target."
4. **Button.** surface: *every action* / no Button component; the lane's
   hand-authored buttons approximate package action tokens at the app layer /
   ledger: "actions: NOT FSDS — no Button on the target."
5. **Select.** surface: *environment filter* / no Select; spec-sanctioned
   fallback is simple segmented options / ledger: "environment selector: NOT
   FSDS — segmented fallback."
6. **Feedback surfaces.** surface: *Skeleton/Spinner/Progress, Alert/
   AlertNotice, Status, empty states* / none exist; loading/error/empty/
   pending are hand-authored regions driven by real async transitions /
   ledger: "loading/error/empty/pending regions: NOT FSDS."
7. **Stack / Card.** surface: *layout composition* / the two-pane frame and
   region spacing are plain gpui flex; the spec's Stack-owned composition has
   no counterpart on this target / ledger: "page frame: NOT FSDS."
8. **Pressure-point residuals.** multi-select (falls back to the FSDS Checkbox
   group, as the spec prescribes), Table-owned density (falls back to
   app-owned density behind an FSDS ToggleSwitch — the spec's named residual),
   row overflow menu (not implemented; would require a Menu/Popover surface
   that does not exist), pagination and sortable headers (not implemented;
   no Table to own them). All recorded as residuals, not silently dropped.

## Interaction coverage (implemented code paths)

All ten spec interactions are implemented: (1) live search narrowing with
summary recompute, (2) cross-axis intersection (search ∩ environment ∩
severity), (3) clear-filters restore, (4) exactly-one row selection driving
the detail pane, (5) timeline progressive disclosure, (6) assign sheet with
cancel no-op / complete + toast, (7) resolve confirm dialog with cancel no-op
/ confirm-removes-clears-selection + toast, (8) distinct empty state, (9)
simulated load failure + retry-with-flag-off, (10) overlay Escape/backdrop
dismissal with a hand-authored focus trap. **None of these is pinned by an
automated check** — the seam tests below are the only automated evidence.

## Tests

`cargo test` runs `tests/seam.rs` (16 tests, latency 0): fixture parsing and
the description/timeline joins (chronological order asserted), each filter
axis alone, cross-axis intersection, detail lookup, assign/resolve mutations
with per-instance isolation, typed `NOT_FOUND` / `ALREADY_RESOLVED` /
`LOAD_FAILED` paths, flag recovery, and service-health roll-up counts. The
suite exercises the data seam only — the GPUI app layer has no mounted-input
tests in this lane (the package's own `native_runtime` tests cover the
generated components they exercise, not this consumer).

## Non-claims

- **Compile + seam tests only.** The automated evidence is `cargo build` and
  the 16-test seam suite. `cargo run` opens the window for manual inspection,
  but there is **no automated visual proof, no mounted-engine interaction
  test, no screenshot baseline, and no runtime interaction check** for the
  dashboard itself.
- **No parity claim.** This lane does not assert cross-framework semantic
  parity with the React lane (or with future Vue/Svelte/Angular/Lit lanes);
  the shared seam shape and interaction list are realized independently here.
- **Partial realization.** Every `NOT FSDS` region above is a fallback the
  7-component allowlist forces, not a claim that the hand-authored surface is
  equivalent to a package component.
- **Not accessibility proof.** The hand-authored focus trap and painted text
  field prove compile-level wiring only; no a11y standard is claimed.
- **Not backend / data proof.** The seam is a fixture-backed shape (static
  embedded JSONL/JSON), not a server; nothing about real fetching, scale, or
  persistence is claimed.
- **Not generated-artifact admission.** Hand-written consumer code outside
  the codegen rail; GPUI remains outside the TypeScript admission rail.
