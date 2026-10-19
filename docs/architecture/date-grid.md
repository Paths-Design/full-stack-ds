---
doc_id: ARCH-DATE-GRID-001
authority: architecture
status: active
title: Month date grids
owner: "@darianrosebrook"
updated: 2026-10-18
verified_at_commit: f597e8cb5
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
| `valueChannel` | a value channel typed `Date \| Date[]`, optionally `\| null`: the core commits a `Date` in single mode and a `Date[]` in range mode, and reads `null` as no selection |
| `monthChannel` | a different value channel typed `Date`: any date inside the visible month |
| `modeProp` | a prop typed by a `"single" \| "range"` union |
| `localeProp` | a string prop declared `translatable: false`, carrying a BCP 47 tag |
| `minProp`, `maxProp` | optional `Date` props bounding the selectable days |
| `disabledProp`, `captionProp` | optional boolean and string props |

The dom binds the core through a closed vocabulary. `dateGrid:caption`,
`weekdays`, `weeks`, `previousDisabled` and `nextDisabled` are values;
`dateGrid:previous`, `next` and `select(iter:item)` bind a click and
`dateGrid:keydown` binds a keydown. Only `weeks` and `weekdays` are iterable,
and a week's days iterate as `iter:item.days`, declaring the runtime item
types `DateGridWeek`, `DateGridWeekday` and `DateGridDay`.

`buildDateGridIR` (`packages/ds-codegen/src/date-grid.ts`) refuses a contract
with `DATE_GRID_INVALID` unless:

- exactly one iteration walks a week's days;
- the selection state dimension's a11y attribute maps its two values to
  `"false"` and `"true"`, and the day cell binds that attribute
  (`aria-selected`) to `iter:item.selected`;
- exactly one node under the cell binds `tabindex` to `iter:item.tabIndex`,
  and that node also binds `data-date` to `iter:item.key` and its click to
  `dateGrid:select(iter:item)`, so the tab stop, the focus target and the
  activated element are one element;
- an ancestor of the cells binds keydown to `dateGrid:keydown`;
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

A move is clamped to the bounds. A move or a selection into another month
reports the month through `onMonthChange`, and the nav controls step it. The
binding calls `afterRender` after each render. The first render after the
grid is re-derived decides the move: if the targeted day is the tab stop,
focus moves to its button, found by `data-date` inside the grid. Otherwise the
options refused the move (a controlled month that did not follow), so the tab
stop stays on the day the move started from and focus stays put. Either way
the request expires, so a later render never pulls focus back into the grid.
A selection hands focus over only when the activated button held it, read
through open shadow roots, so a selection never pulls focus into a grid.

In `range` mode a selection pairs a lone start with the new day into a sorted
span and otherwise starts a new range. Locale formatting is described in
[Component message catalogs](localization.md#dates).

## Per-family bindings

| Family | Core | Binding |
|---|---|---|
| React, React Native | `primitives/date/date-grid.ts` | `useDateGrid`; `afterRender` in an effect |
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
  day bindings split across the cell and its button and value channels whose
  type merely names `Date`.
- `packages/ds-react/src/primitives/hooks/__tests__/calendar.contract.ts` runs
  one obligation set through the React, Vue, Svelte, Angular and Lit harnesses;
  React Native has its own Calendar tests.
- `e2e/runtime-rail.spec.ts` drives Calendar in Chromium on all five web
  targets under a fixed clock: one tab stop on today, real arrow, Home, End and
  PageDown keys moving DOM focus, Enter and Space selection, an outside-month
  click keeping focus on its day, the month buttons, and a de-DE grid.
- `FsdsDateGridTest.kt` and `CalendarSemanticsTest.kt` (Compose, desktop JVM
  `runComposeUiTest`) and `FsdsDateGridTests.swift` pin the native cores and
  Compose's semantics tree, including a controlled `null` clearing the
  selection; `ControllableValueTests.swift` pins a SwiftUI binding holding
  `nil` as an empty value.
- `pnpm run audit:a11y-realization` checks roving focus, the declared keys,
  `aria-selected` and `aria-current` against the generated web output, and the
  state attributes against SwiftUI and Compose, where today beside a selection
  needs a state value of its own.

## Non-claims

- The grid is Gregorian. Hijri and Persian locales see Gregorian months.
- Native targets do not lower roving focus or the grid's keys: every enabled
  day is a focus stop. Compose does not announce today.
- No screen reader's announcement of `aria-selected` on the cell, with focus on
  its inner button, has been observed. The SwiftUI accessibility-tree test
  skips on a host that does not trust the test runner.
- `shouldCloseOnSelect` is declared and not lowered on any target: the grid
  owns no dismissal.
- The root keeps `role="application"`.
- A parent that updates a controlled month after the render following a key
  move does not get focus on the moved-to day: that render already refused
  the move.
