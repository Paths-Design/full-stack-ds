---
doc_id: ARCH-DATE-GRID-001
authority: architecture
status: active
title: Month date grids
owner: "@darianrosebrook"
updated: 2026-10-19
verified_at_commit: e1df6da47
governs:
  - packages/ds-codegen/src/date-grid.ts
  - packages/ds-codegen/src/date/date-grid.ts
  - packages/ds-contracts/components/Calendar
  - packages/ds-jetpack-compose/library/src/main/kotlin/com/fullstackds/date/FsdsDateGrid.kt
  - packages/ds-swiftui/Sources/DsSwiftUI/Presence/FsdsDateGrid.swift
caws_specs:
  - CALENDAR-DATE-GRID-01
---

# Month date grids

A month date grid shows one month as six locale-ordered weeks, lets a user move
between months, and selects a day or a range. The contract declares which
channels and props carry those facts; a runtime core in each target family
derives the grid from them. No emitter computes a date.

## Contract surface

`dateGrid` names the facts a core reads:

| Field | Requirement the IR enforces |
|---|---|
| `valueChannel` | a value channel typed `Date \| Date[]`, optionally `\| null`: the core commits a `Date` in single mode and a `Date[]` in range mode, never `null`, and reads `null` as no selection; its `onValueChange` takes `Date \| Date[]`, so a channel without the null arm passes its setter |
| `monthChannel` | a different value channel typed `Date`: any date inside the visible month |
| `modeProp` | a prop typed by a `"single" \| "range"` union |
| `localeProp` | a string prop declared `translatable: false`, carrying a BCP 47 tag |
| `minProp`, `maxProp` | optional `Date` props bounding the selectable days |
| `disabledProp`, `captionProp` | optional boolean and string props |

The dom binds the core through a closed vocabulary. `dateGrid:caption`,
`weekdays`, `weeks`, `previousDisabled`, `nextDisabled` and `multiselectable`
are values;
`dateGrid:previous`, `next` and `select(iter:item)` bind a click and
`dateGrid:keydown` binds a keydown. Only `weeks` and `weekdays` are iterable,
and a week's days iterate as `iter:item.days`, declaring the runtime item
types `DateGridWeek`, `DateGridWeekday` and `DateGridDay`.

The grid follows the ARIA grid pattern (`a11y.apgPattern: "grid"`): each day
is a `td` with `role="gridcell"`, and that gridcell is the control. It is
the roving tab stop, takes focus, carries the full-date `aria-label`,
`aria-selected`, `aria-current` and `aria-disabled`, and selects on click,
Enter or Space. Because focus and the selected state are on one element, a
screen reader reads the state with the focus. The day's number renders in a
presentational `span` inside the cell. The grid binds `aria-multiselectable`
to the mode: `"true"` in range mode, where several cells are selected, and
`"false"` in single mode. WAI-ARIA 1.2's grid role asks a grid that allows
several selected gridcells to declare it.

`buildDateGridIR` (`packages/ds-codegen/src/date-grid.ts`) refuses a contract
with `DATE_GRID_INVALID` unless:

- exactly one iteration walks a week's days;
- the selection state dimension's a11y attribute maps its two values to
  `"false"` and `"true"`, and the day cell binds that attribute
  (`aria-selected`) to `iter:item.selected`;
- the day cell declares `role="gridcell"` and itself binds `tabindex` to
  `iter:item.tabIndex`, `data-date` to `iter:item.key` and its click to
  `dateGrid:select(iter:item)`, so the tab stop, the focus target and the
  activated element are the gridcell;
- nothing inside the cell is focusable, editable or interactive: no natively
  focusable tag, `tabindex`, `contenteditable` other than `"false"`, event or
  component reference (attribute names compare case-insensitively);
- an ancestor of the cells binds keydown to `dateGrid:keydown`;
- the cells' `role="grid"` ancestor binds `aria-multiselectable` to
  `dateGrid:multiselectable`;
- no `dateGrid:` binding appears without a `dateGrid` declaration.

## The core

`computeDateGrid` is a pure function of the options and one piece of state,
the focused day. The visible month is the month channel's value, else the
selection's month, else today's. Each of the 42 days carries its key
(`yyyy-mm-dd`), its number and full-date label, `selected`, `current` for
today, `disabled` for a day outside the bounds, `outsideMonth`, and
`tabIndex`. Days are local calendar days, so day arithmetic never crosses a
daylight-saving boundary.

Exactly one day is a tab stop: the focused day if it is in the visible month
and enabled, else the first selected day, else today, else the month's first
enabled day. The keyboard moves it:

| Key | Move |
|---|---|
| Arrow Left / Right | one day, mirrored when the grid's composed ancestry is `dir="rtl"` |
| Arrow Up / Down | one week |
| Home / End | the start or end of the locale's week |
| Page Up / Down | one month; with Shift, one year (clamped to the target month's length) |
| Enter, Space | select the focused day (a gridcell has no native activation); the key's default is prevented |

A move is clamped to the bounds. A move or a selection into another month
reports the month through `onMonthChange`, and the nav controls step it. The
binding calls `afterRender` after each render. The first render after the
grid is re-derived decides the move: if the targeted day is the tab stop,
focus moves to its gridcell, found by `data-date` inside the grid. Otherwise the
options refused the move (a controlled month that did not follow), so the tab
stop stays on the day the move started from and focus stays put. Either way
the request expires, so a later render never pulls focus back into the grid.
A selection hands focus over only when the activated day held it, read
through open shadow roots, so a selection never pulls focus into a grid.

In `range` mode a selection pairs a lone start with the new day into a sorted
span and otherwise starts a new range. Locale formatting is described in
[Component message catalogs](localization.md#dates).

## Per-family bindings

| Family | Core | Binding |
|---|---|---|
| React, React Native | `primitives/date/date-grid.ts` | `useDateGrid`; `afterRender` in an effect. React Native renders each gridcell as a `Pressable` with the `button` role (mobile platforms have no gridcell role) and `selected` and `disabled` state |
| Vue | the same core | `useDateGrid`; `afterRender` in `onUpdated` |
| Svelte | the same core | `createReactiveDateGrid`; `afterRender` in `$effect` |
| Angular | the same core | `createReactiveDateGrid` signals; `afterRender` in `ngAfterViewChecked`; iterations track by index |
| Lit | the same core | `DateGridController`; `afterRender` in `hostUpdated` |
| SwiftUI | `FsdsDateGrid.swift` | the date-grid surface class; day Buttons with the `.isSelected` trait and today as the accessibility value |
| Jetpack Compose | `FsdsDateGrid.kt` | the date-grid surface class; `selectable` day cells with `Role.Button` and collection row/column semantics |

The web and React Native components take the value channel as one
`value: Date | Date[] | null` prop: `undefined` leaves it uncontrolled and
`null` is a controlled empty selection. Neither native platform has an
idiomatic union, so the native components split it by mode:

| Target | Single mode | Range mode | Month |
|---|---|---|---|
| Jetpack Compose | `value: Date?`, `defaultValue`, `onChange` | `values: List<Date>?`, `defaultValues`, `onValuesChange` | `month: Date?`, `defaultMonth`, `onMonthChange` |
| SwiftUI | `value: Binding<Date?>?`, `defaultValue`, `onChange` | `values: Binding<[Date]>?`, `defaultValues`, `onValuesChange` | `month: Binding<Date?>?`, `defaultMonth`, `onMonthChange` |

On Compose an omitted `value` defaults to the `FsdsDateGrid.Uncontrolled`
marker, compared by identity, so an explicit `null` is a controlled empty
selection; an omitted `values` or `month` is `null` and uncontrolled, and
`emptyList()` clears a range. On SwiftUI a binding makes the value
controlled, and a binding holding `nil` is an empty selection.

The web core is copied from `packages/ds-codegen/src/date/date-grid.ts` into
each package by generation and drift-gated. The native cores are separate
implementations of the same rules over each platform's calendar API. Their
divergences are ledgered in
[Native target admission](native-target-admission.md#ledgered-divergences-compose).

## Evidence

- `packages/ds-codegen/src/date/date-grid.test.ts` pins derivation, tab-stop
  precedence, every key move with both bounds and RTL, range pairing, focus
  hand-off after a keyboard move and after a focused selection (including
  through a shadow root), a move a controlled month refuses, and the expiry of
  that move's focus.
- `packages/ds-codegen/src/date-grid.test.ts` pins the IR refusals, including
  a focusable control inside the cell (the shape before the grid pattern), an
  editable span inside it, a cell without `role="gridcell"`, a grid without
  `aria-multiselectable`, and value channels whose type merely names `Date`.
  The core test types a setter without the null arm against `onValueChange`,
  checked by the codegen package's `typecheck`.
- `packages/ds-react/src/primitives/hooks/__tests__/calendar.contract.ts` runs
  one obligation set through the React, Vue, Svelte, Angular and Lit harnesses,
  including the grid pattern's shape, the grid's multiple-selection
  declaration per mode, and Enter and Space selection; React Native has its own
  Calendar tests.
- `e2e/runtime-rail.spec.ts` drives Calendar in Chromium on all five web
  targets under a fixed clock: one tab stop on today, real arrow, Home, End and
  PageDown keys moving DOM focus onto the gridcell, Enter and Space selection
  with focus and `aria-selected` on that gridcell, no control inside any cell,
  a range selected by two clicks on a grid that declares multiple selection,
  an outside-month click keeping focus on its day, the month buttons, a
  de-DE grid, and days outside `minDate` and `maxDate` (or every day of a
  disabled calendar) marked `aria-disabled`, refusing a pointer click and the
  month buttons, with a key move stopping at the bound.
- `FsdsDateGridTest.kt` and `CalendarSemanticsTest.kt` (Compose, desktop JVM
  `runComposeUiTest`) and `FsdsDateGridTests.swift` pin the native cores and
  Compose's semantics tree, including a controlled `null` clearing the
  selection; `ControllableValueTests.swift` pins a SwiftUI binding holding
  `nil` as an empty value, and a channel that follows the binding and
  callback its view passed last.
- `swift run --package-path packages/ds-swiftui PressProofHarness` hosts the
  generated SwiftUI Calendar in a real macOS app and presses days through
  `AXPress`. It reads back one commit, the bound value and `AXSelected` on the
  pressed day alone; the selected day moving when the parent sets the value;
  the month channel and April's re-derived days; and, in de-DE, Monday-first
  headers, German day names and an uncontrolled selection. Generated SwiftUI
  views hold each controllable channel through `ControllableState` or
  `ControllableSelection`, which re-bind it to the view's current `Binding`
  before every body; a `Binding` held only inside the state object kept the
  value it had at first appearance, so a controlled day never showed as
  selected.
- `pnpm run audit:a11y-realization` checks roving focus, the declared keys,
  `aria-selected` and `aria-current` against the generated web output, and the
  state attributes against SwiftUI and Compose, where today beside a selection
  needs a state value of its own.

## Non-claims

- The grid is Gregorian. Hijri and Persian locales see Gregorian months.
- Native targets do not lower roving focus or the grid's keys: every enabled
  day is a focus stop. Compose does not announce today.
- Only the web targets declare multiple selection on the grid. The React
  Native, SwiftUI and Compose emitters do not lower `aria-multiselectable`;
  each day there still exposes its own selected state.
- No screen reader's output has been observed: the pattern puts focus and
  `aria-selected` on one element, and the browser tests read the DOM, not the
  accessibility tree. The SwiftUI accessibility-tree test skips under
  `swift test`, which exposes no accessibility tree for its own window even
  when the runner is trusted. The press-proof harness reads the macOS
  accessibility tree instead, but it needs accessibility access for the
  process that runs it, is not a CI step, and is not iOS evidence.
- `shouldCloseOnSelect` is declared and not lowered on any target: the grid
  owns no dismissal.
- The root keeps `role="application"`.
- A parent that updates a controlled month after the render following a key
  move does not get focus on the moved-to day: that render already refused
  the move.
