---
doc_id: ARCH-TRANSFER-LIST-001
authority: architecture
status: active
title: Dual-listbox transfer
owner: "@darianrosebrook"
updated: 2026-10-21
verified_at_commit: 4ef5a4f30
governs:
  - packages/ds-codegen/src/transfer.ts
  - packages/ds-codegen/src/transfer/transfer-list.ts
  - packages/ds-contracts/components/Shuttle
  - packages/ds-jetpack-compose/library/src/main/kotlin/com/fullstackds/transfer/FsdsTransferList.kt
  - packages/ds-swiftui/Sources/DsSwiftUI/Presence/FsdsTransferList.swift
caws_specs:
  - SHUTTLE-DUAL-LISTBOX-01
---

# Dual-listbox transfer

A dual-listbox transfer (Shuttle) partitions a set of candidate ids between two
lists. The selected list is the value, in the order its items were moved in;
the available list is every option outside the value, in options order. A user
marks items in either list and moves the marked items to the other one. The
contract declares which channel and prop carry those facts; a runtime core in
each target family derives both lists from them. No emitter computes a list.

## Contract surface

`transfer` names the facts a core reads:

| Field | Requirement the IR enforces |
|---|---|
| `valueChannel` | a value channel typed `string[]`: the ids in the selected list |
| `optionsProp` | a prop typed as an array of strings: every candidate id, in display order |

The dom binds the core through a closed vocabulary. `transfer:available`,
`selected`, `addDisabled` and `removeDisabled` are values; only `available`
and `selected` are iterable, and both declare the runtime item type
`TransferListItem` (`key`, `label`, `side`, `marked`, `tabIndex`).
`transfer:add`, `remove` and `toggle(iter:item)` bind a click, and
`transfer:keydown` binds a keydown.

Each list follows the WAI-ARIA listbox pattern with multiple selection. The
option is the control: it is the list's roving tab stop, takes focus, carries
`aria-selected` for its mark and toggles the mark on click, so a screen reader
announces the mark with the focus. A mark is the listbox's selection, not the
component's value: marking an item moves nothing until Enter or a button
moves it. The root is a `role="group"` that accepts the contract's labeling.

`buildTransferIR` (`packages/ds-codegen/src/transfer.ts`) refuses a contract
with `TRANSFER_INVALID` unless:

- the value channel is typed `string[]` and the options prop is an array of
  strings;
- `transfer:keydown` binds a keydown and `add`, `remove` and `toggle` bind a
  click; a value is never an event handler, and only `available` and
  `selected` are iterated, each exactly once;
- a selection state dimension maps its two values to `"false"` and `"true"`
  through its a11y attribute, and each item binds that attribute to
  `iter:item.marked`;
- each item declares `role="option"` and binds `tabindex` to
  `iter:item.tabIndex`, `data-value` to `iter:item.key` and its click to
  `transfer:toggle(iter:item)`, and nothing inside an item is focusable or
  interactive;
- each item's parent declares `role="listbox"`, `aria-multiselectable="true"`
  and its `data-side`, and binds keydown to `transfer:keydown`;
- no `transfer:` binding appears without a `transfer` declaration.

## The core

`computeTransferList` (`packages/ds-codegen/src/transfer/transfer-list.ts`)
derives both lists from the options, the marks and each list's focused item.
Repeated ids collapse to their first occurrence, and an absent `options` or
`value` reads as none. A mark whose item is no longer on its side is dropped.
A non-empty list has exactly one tab stop: its focused item while that item
remains, else its first item.

The keys act on the list they are pressed in, read from the listbox's
`data-side`:

| Key | Effect |
|---|---|
| Arrow Down / Up | move the tab stop and focus one item; no wrapping |
| Home / End | move to the first or last item |
| Space | mark or unmark the focused item |
| Enter | move the list's marked items, or the focused item when none is marked, to the other list |
| Tab, others | left to the platform |

The handled keys prevent their default. A transfer appends the marked
available items to the end of the value in options order, or removes the
marked selected items, reports the new value through the channel's change
handler, and clears that side's marks, including when a controlled value does
not follow. After Enter, focus stays in the source list on the nearest item
that remains, or follows the moved item when the list empties. The binding
calls `afterRender` after each render, which moves DOM focus to the item a key
targeted once it renders, found by `data-value` inside the group; a render
nothing asked to focus leaves focus alone. The Add and Remove buttons are
disabled until their source list holds a mark.

## Per-family bindings

| Family | Core | Binding |
|---|---|---|
| React | `primitives/transfer/transfer-list.ts` | `useTransferList`; `afterRender` in an effect |
| Vue | the same core | `useTransferList`; `afterRender` in `onUpdated` |
| Svelte | the same core | `createReactiveTransferList`; `afterRender` in `$effect` |
| Angular | the same core | the transfer-list signal; `afterRender` in `ngAfterViewChecked` |
| Lit | the same core | `TransferListController`; `afterRender` in `hostUpdated` |
| React Native | the same core | `useTransferList` without `afterRender` (no key events reach a list); each item is a `Pressable` with the `button` role and a `selected` state, since mobile platforms have no listbox or option role |
| SwiftUI | `FsdsTransferList.swift` | the transfer surface class; item Buttons with the `.isSelected` trait for the mark |
| Jetpack Compose | `FsdsTransferList.kt` | the transfer surface class; `selectable(selected =)` items with `Role.Button` |

The web core is copied from `packages/ds-codegen/src/transfer/transfer-list.ts`
into each package by generation and drift-gated. The native cores implement
the same list rules over each platform's collections. The native surfaces do
not lower the listbox keys: every item is a focus stop the platform's screen
reader, switch access and full keyboard access traverse. Their divergences
are ledgered in
[Native target admission](native-target-admission.md#ledgered-divergences-compose).

## Text

The list names and the button captions are catalog messages
(`Shuttle.availableLabel`, `selectedLabel`, `add`, `remove`), resolved through
each target's message catalog ([Component message catalogs](localization.md)).
An item's text is its option id, rendered verbatim: the options are consumer
content, so a consumer that shows translated item text passes translated ids,
and the value then carries those strings.

## Evidence

- `packages/ds-codegen/src/transfer/transfer-list.test.ts` pins derivation,
  absent options or value, tab stops, marks, both transfers, every key with
  its bound, the list a key acts on, and focus after a key move, after Enter
  and when a list empties.
- `packages/ds-codegen/src/transfer.test.ts` pins the IR fact and each
  refusal, including an interactive element inside an item.
- `packages/ds-react/src/primitives/hooks/__tests__/shuttle.contract.ts` runs
  one obligation set through the React, Vue, Svelte, Angular and Lit
  harnesses, including a controlled value that does not follow a transfer;
  `packages/ds-react-native/src/components/Shuttle/__tests__/Shuttle.behavior.test.tsx`
  covers React Native.
- `e2e/shuttle.spec.ts` drives Shuttle in Chromium on all five web targets:
  the listbox shape and names, one tab stop per list, real arrow, Home, End,
  Space and Enter keys moving DOM focus and the mark, focus after Enter, and
  click marking with Add and Remove.
- `FsdsTransferListTest.kt` and `ShuttleSemanticsTest.kt` (Compose, desktop
  JVM `runComposeUiTest`) and `FsdsTransferListTests.swift` pin the native
  cores and Compose's semantics tree. The `PressProofHarness` presses an
  item, Add, another item and Remove through the macOS AppKit accessibility
  path and reads each item's AXSelected and the reported selection.

## Non-claims

- The native surfaces do not implement the listbox keyboard model; they rely
  on platform focus traversal.
- Item text is not localizable apart from the id (see [Text](#text)).
- The harness is a macOS host run, not iOS simulator or device evidence, and
  is not a CI step.
- No target supports drag-and-drop transfer, reordering the selected list, or
  filtering either list.
