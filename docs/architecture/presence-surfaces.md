---
doc_id: ARCH-PRESENCE-SURFACES-001
authority: architecture
status: active
title: Presence Surfaces — the architectural family for tooltips, popovers, dialogs, menus, selects, toasts, coachmarks, and sheets
owner: "@darianrosebrook"
updated: 2026-09-30
governs:
  - packages/ds-contracts/components/Tooltip/Tooltip.contract.json
  - packages/ds-contracts/components/Popover/Popover.contract.json
  - packages/ds-contracts/components/Dialog/Dialog.contract.json
  - packages/ds-contracts/components/Sheet/Sheet.contract.json
  - packages/ds-contracts/components/Toast/Toast.contract.json
  - packages/ds-contracts/component.contract.schema.json
  - packages/ds-codegen/src/ir.ts
  - packages/ds-codegen/src/semantics.ts
  - packages/ds-codegen/src/frameworks/react-native/surface-emit.ts
---

# Presence Surfaces

Presence surfaces are UI surfaces that appear, persist, dismiss, block, anchor, or notify in relation to a user task. This document defines the architectural family and rejects "floating" as the family name.

## Definitive stances

> **"Floating" is not the family name.** Floating is a geometric implementation property of *some* anchored presence surfaces, not the architectural identity of the family.

> **A modal is not a component.** Modality is a behavioral property of a surface.

> **A dialog is a semantic surface.** A modal dialog is a dialog with blocking modality. A non-modal dialog is a dialog with non-blocking modality.

> **Consumer export names may remain separate from substrate classification.** The substrate (controller, IR shape, codegen path) is governed by this taxonomy. Public import names like `Dialog`, `Modal`, `ModalDialog`, `Menu`, `Dropdown` are a compatibility layer; they do not need to be consolidated.

## The two axes

Every presence surface occupies one position on each of two orthogonal axes:

1. **Presence**: `ephemeral` vs `persistent`
   - *Ephemeral*: closes when the trigger condition expires or a timing budget elapses (tooltip hover-out, toast timeout).
   - *Persistent*: remains open until explicitly dismissed (escape, close button, outside click, programmatic).

2. **Modality**: `blocking` vs `non-blocking`
   - *Blocking*: interaction with content outside the surface is prevented (focus trap, outside `inert`, overlay scrim).
   - *Non-blocking*: outside interaction remains available; the surface coexists with the page.

These axes are **orthogonal**. All four combinations exist in the real world; the taxonomy does not collapse them.

## Classification

| Kind        | Presence              | Modality                  | Positioning           | Interaction              |
|-------------|-----------------------|---------------------------|-----------------------|--------------------------|
| Tooltip     | Ephemeral             | Non-blocking              | Anchored              | Non-interactive content  |
| Popover     | Persistent            | Non-blocking              | Anchored              | Interactive content      |
| Dialog      | Persistent            | Non-blocking or blocking  | Centered / overlay    | Structured interaction   |
| Menu        | Persistent while open | Non-blocking              | Anchored              | Roving focus / commands  |
| Select      | Persistent while open | Non-blocking              | Anchored              | Form selection           |
| Toast       | Ephemeral             | Non-blocking              | Viewport-edge         | Notification             |
| Coachmark   | Persistent            | Often blocking            | Anchored or overlay   | Guided instruction       |
| Sheet       | Persistent            | Blocking or non-blocking  | Viewport-edge         | Structured interaction   |

The classification governs controller selection, ARIA wiring, and dismissal policy. It does **not** govern public component names.

**Realized vs reserved.** The table is the `kind` vocabulary, not a list of contracts. Six kinds are realized in the corpus today — `tooltip`, `popover`, `dialog` (×2), `sheet`, `toast`, and `coachmark` (Walkthrough). `menu` and `select` are **reserved vocabulary**: valid values with no contract declaring them yet, in the same sense as `fullscreen` below. Do not read a row here as evidence that a corresponding contract exists.

## Substrate vs surface

The substrate is the runtime machinery: controllers, contexts, registration, lifecycle, positioning. The surface is the consumer's component import. Two surfaces may share a substrate (Dialog + ModalDialog both compose the same dialog substrate); one surface may compose multiple substrates (Combobox = Select × Listbox).

**Substrate is governed by this document. Surface naming is governed by ergonomics and compatibility.**

## Controller hierarchy

```
SurfaceController                  abstract; lifecycle, modality, focus, dismissal — implemented
  └── AnchoredSurfaceController    Tooltip, Popover — adds trigger/content geometry — implemented
Dialog / Toast / Coachmark         family controllers below the anchored branch are target
                                   taxonomy, not shipped code: Dialog composes the dialog
                                   substrate from hooks (useControllableState + useDismissal +
                                   useFocusTrap + usePortal + useScrollLock); Toast and
                                   Coachmark follow the same hook-composition pattern pending
                                   dedicated controller families.
```

Naming convention: **`SurfaceController` at the abstract layer; subclasses suffixed with the surface family.** The name `FloatingController` is explicitly rejected — geometry does not name the family. Only the anchored subclass is realized today; the dialog/toast/coachmark families currently compose hook substrates rather than shipping dedicated controllers.

## Canonical consumer API

All presence surfaces share a compound API:

```tsx
<Surface>
  <Surface.Trigger asChild>
    <button>Open</button>
  </Surface.Trigger>
  <Surface.Content>
    {/* surface body */}
  </Surface.Content>
</Surface>
```

- `Surface.Trigger` registers the invoking DOM element with the root.
- `Surface.Content` registers the rendered surface element with the root.
- `Surface` (root) coordinates registration, owns the open channel, governs dismissal and focus per the surface's modality.

Surfaces without a trigger (e.g. Toast) omit `Surface.Trigger`. Surfaces without an anchored content placement (e.g. ModalDialog centered) still use `Surface.Content` but their controller's positioning strategy is `centered`, not `anchored`.

### `asChild` strategy

Each framework's `asChild` mechanism differs:

| Framework | Mechanism |
|---|---|
| React | `cloneElement(child, { ref: mergedRef, ...handlerProps })` |
| Vue | Slot-prop `triggerProps` bag with `registerAnchor` / `registerAnchorRefOnly` refs |
| Svelte 5 | Element snippet + action-based registration |
| Angular | *(planned)* Content projection with `@ContentChild` + a structural directive — **not implemented**; `@ContentChild` appears nowhere in the Angular emitter. Trigger registration today is a plain `@Directive` class in `frameworks/angular/surface-emit.ts`. |
| Lit | `<slot @slotchange>` with first-assigned-element adoption |

**Default for Phase F implementations**: each part renders its own host element (`<button>` for trigger, `<div>` for content). `asChild` is an opt-in escape hatch on frameworks where it stabilizes first (React, Vue, Svelte). Lit and Angular may ship `asChild` later.

## The `surface` contract block — paper sketch

The `surface` block is the **semantic classifier and controller-selection descriptor**. It does **not** duplicate the existing `portal`, `dismissal`, and `focus` blocks — those remain the detailed policy knobs.

### Responsibilities split

| Block | Owns |
|---|---|
| `surface` | Family classification (`kind`), behavioral axes (`presence`, `modality`), part participation (`anchor.part`, `content.part`), placement strategy, semantic dismissal list, semantic timing. |
| `portal` (existing) | Portal target, layering, backdrop. |
| `dismissal` (existing) | Per-trigger `enabledBy` prop wiring (e.g. `closeOnEscape`). |
| `focus` (existing) | Trap, return focus, initial focus, scroll lock, wrap. |

Codegen retains `surface.kind` as semantic vocabulary, but controller selection
is axis-derived. `buildSurfaceIR` normalizes attachment to `part`, `selector`,
`viewport`, or `flow`; the compound anchored controller is selected by
`attachment: part` plus `positioning.strategy: anchored`. The existing
`portal`/`dismissal`/`focus` blocks provide configuration knobs. There is no
`surface.focus` or `surface.portal` — those would create contradiction surfaces.

### Sketch

```json
"surface": {
  "kind": "tooltip | popover | dialog | menu | select | toast | coachmark | sheet",
  "presence": "ephemeral | persistent",
  "modality": "blocking | non-blocking",
  "anchor": {
    "part": "<anatomy part name with details.role === 'trigger'>",
    "relation": "describedby | controls-expanded | labelledby | activedescendant | none"
  },
  "content": {
    "part": "<anatomy part name with details.role of 'content' | 'region' | 'overlay'>",
    "interactive": true | false
  },
  "positioning": {
    "strategy": "anchored | centered | viewport-edge | inline",
    "placementProp": "<consumer-facing prop name>",
    "collision": "none | flip | shift | flip-shift"
  },
  "dismissal": ["escape" | "outside-click" | "blur" | "pointer-leave" | "close-button" | "timeout"],
  "timing": {
    "openDelayProp": "<prop name>",
    "closeDelayProp": "<prop name>",
    "autoDismissProp": "<prop name>"
  }
}
```

**`surface.dismissal` is the semantic list** — which dismissal modes this surface supports conceptually. The existing top-level `dismissal.triggers[].enabledBy` carries the prop-gated implementation policy (e.g. `closeOnEscape: boolean`). The two compose; they do not replace each other.

**`surface.timing` names the props**, not the values. Prop default values live in the existing `props.styled.members[].default` field, as today.

## Worked examples

### Tooltip

```json
"surface": {
  "kind": "tooltip",
  "presence": "ephemeral",
  "modality": "non-blocking",
  "anchor": { "part": "trigger", "relation": "describedby" },
  "content": { "part": "content", "interactive": false },
  "positioning": {
    "strategy": "anchored",
    "placementProp": "placement",
    "collision": "flip-shift"
  },
  "dismissal": ["escape", "blur", "pointer-leave"],
  "timing": {
    "openDelayProp": "openDelay",
    "closeDelayProp": "closeDelay"
  }
}
```

### Popover

```json
"surface": {
  "kind": "popover",
  "presence": "persistent",
  "modality": "non-blocking",
  "anchor": { "part": "trigger", "relation": "controls-expanded" },
  "content": { "part": "content", "interactive": true },
  "positioning": {
    "strategy": "anchored",
    "placementProp": "placement",
    "collision": "flip-shift"
  },
  "dismissal": ["escape", "outside-click"]
}
```

### Dialog (non-modal)

```json
"surface": {
  "kind": "dialog",
  "presence": "persistent",
  "modality": "non-blocking",
  "content": { "part": "content", "interactive": true },
  "positioning": { "strategy": "centered" },
  "dismissal": ["escape", "close-button"]
}
```

### Modal Dialog (Dialog with blocking modality)

```json
"surface": {
  "kind": "dialog",
  "presence": "persistent",
  "modality": "blocking",
  "content": { "part": "content", "interactive": true },
  "positioning": { "strategy": "centered" },
  "dismissal": ["escape", "close-button", "outside-click"]
}
```

Dialog's existing top-level `focus` block carries `strategy: "trap"`, `initialFocus: "prop:initialFocus"`, `returnFocus: "prop:returnFocus"`, `scrollLock: true`, and `wrap: true`. The optional focus props accept CSS selectors or element IDs; absent targets fall back to the first available child on opening and the previously focused element on closing. The focus lifecycle follows the mounted panel through portal changes. The `modal` prop gates trapping and scroll locking through `surface.modalityProp`; non-modal dialogs preserve outside focus. This policy does not declare or realize outside `inert`.

Opening-focus runtime witnesses live in [the Dialog focus rail](../../e2e/dialog-focus.spec.ts). It checks the five Web adapters and the React showcase's conditional mount; package tests additionally cover element IDs, malformed selectors, typing and portal relocation. The shared substrate also serves Sheet's existing trap policy.

### Toast

```json
"surface": {
  "kind": "toast",
  "presence": "ephemeral",
  "modality": "non-blocking",
  "content": { "part": "content", "interactive": false },
  "positioning": { "strategy": "viewport-edge" },
  "dismissal": ["timeout", "close-button"],
  "timing": { "autoDismissProp": "duration" }
}
```

## `SurfaceIR` (implemented)

Analogous to `BehaviorIR`. **This shipped** — `SurfaceIR` is an exported interface at `packages/ds-codegen/src/ir.ts`, constructed by `buildSurfaceIR()` and hung off `ComponentIR.surface` during `buildComponentIR`. The shape below is the real one — re-quote it from the source rather than trusting this page. Two fields (`selectorAnchor`, `openTriggers`) were added after the original sketch:

```ts
export interface SurfaceIR {
  kind: ContractSurfaceKind;
  presence: ContractSurfacePresence;
  modality: ContractSurfaceModality;
  /** Axis-derived attachment target used to select shared surface machinery. */
  attachment: SurfaceAttachment; // "part" | "selector" | "viewport" | "flow"
  anchor?: SurfaceAnchorIR; // { part: PartIR; relation: ContractSurfaceAnchorRelation }
  /** Selector-sourced anchor — mutually exclusive with `anchor`
   * (validated fail-loud in buildSurfaceIR). */
  selectorAnchor?: SurfaceSelectorAnchorIR;
  content?: SurfaceContentIR; // { part: PartIR; interactive: boolean }
  positioning?: SurfacePositioningIR; // strategy, placementProp, collision
  /** Semantic dismissal mode list — composes with BehaviorIR's
   * normalizedDismissalTriggers. */
  dismissal: ContractSurfaceDismissalMode[];
  /** Anchor-element interactions that open the surface. Always an array.
   * Anchored surfaces and tooltips must declare at least one trigger;
   * non-anchored surfaces may omit. Validated fail-loud in buildSurfaceIR. */
  openTriggers: ContractSurfaceOpenTrigger[];
  timing?: SurfaceTimingIR;
}
```

The value sets and remaining member types live beside the interface — `SurfaceAnchorIR`, `SurfaceContentIR`, `SurfacePositioningIR`, `SurfaceTimingIR`, and `SurfaceSelectorAnchorIR` in `packages/ds-codegen/src/ir.ts`; `ContractSurfaceKind`, `ContractSurfacePresence`, `ContractSurfaceModality`, `ContractSurfaceAnchorRelation`, `ContractSurfaceDismissalMode`, and `ContractSurfaceOpenTrigger` in `packages/ds-codegen/src/contract.ts`; `SurfaceAttachment` in `packages/ds-codegen/src/semantics.ts`.

The IR builder copies `contract.surface` into `SurfaceIR`, resolves
`anchor.part` and `content.part` strings to `PartIR`, and derives the attachment
axis. Emitters select the controller from attachment plus positioning; they
read `surface.modality` to decide whether blocking machinery is required.
Changing only a named kind does not opt a component into or out of a shared
controller.

## What this rejects

- ❌ `floating` as the family name.
- ❌ `FloatingController` (and `FloatingRoot`, `FloatingTrigger`, `FloatingContent`) as architectural primitives. Geometry is subordinate.
- ❌ `surface.focus` and `surface.portal` sub-blocks. The existing top-level `focus` and `portal` remain canonical.
- ❌ Renaming or merging consumer-facing contracts as part of Gap 4 — e.g. folding a hypothetical separate `Modal` into `Dialog`, or a `Dropdown` into `Menu`. The substrate consolidation is the goal; consumer-facing export names are out of scope. (These names are illustrative: the corpus has never contained `Modal`, `Menu`, or `Dropdown` contracts. `Dialog` already carries modal behavior via a `modal` variant plus `modality: "blocking"` in its own `surface` block.)
- ❌ Hook-only / "headless" as the canonical public API. Compound consumer components remain the primary surface.

## What this enables

- **One controller per capability family**, configured by contract policy. The same `AnchoredSurfaceController` underlies any part-attached, anchored surface; kind remains descriptive vocabulary.
- **Consistent codegen seams** across React, Vue, Svelte, Angular, and Lit. The `surface` block is framework-neutral.
- **A taxonomy consumers can reason about.** "Is this surface ephemeral or persistent? Blocking or non-blocking?" answers most behavior questions without reading source.
- **Forward compatibility.** New surface kinds can reuse an existing controller by declaring matching axes; adding a kind does not require editing a controller allowlist.

## Platform realization

The taxonomy is consumed at three layers. The contract declares facts; the
IR (`buildSurfaceIR`) validates and normalizes them; each emitter lowers
them in its platform's idiom. Platform divergences live at the emitter and
its documentation, never in the contract.

**Contract adoption.** Tooltip, Popover, Dialog, Sheet, and Toast declare
`surface` blocks. A contract without a `surface` block emits through the
generic component path on every target — the block is required only for
surface-substrate lowering, and adding one without part attachment plus
anchored positioning does not change web emission (the web surface gates use
`isPartAnchoredSurface`). Close-affordance trigger parts bind their click
to the open channel in the dom tree, so dismissal-by-close-button lowers
through each framework's ordinary channel machinery.

**Web.** Part-attached anchored surfaces (currently tooltip and popover) route through the anchored
surface emitters in all five frameworks: compound trigger/content API,
`AnchoredSurfacePolicy`-driven, positioned by
`useAnchoredSurface`/`useAnchoredPosition`. Non-anchored kinds (dialog,
sheet, toast) keep their portal/dismissal/focus realization; their surface
block is taxonomy fact-tracking.

**React Native.** `rnSurfaceLowering` derives the substrate from the
taxonomy facts:

- *Blocking* (dialog, sheet) → an RN `Modal` host: `visible` bound to the
  open channel; escape dismissal lowers to `onRequestClose` (Android
  back); outside-click dismissal lowers to an overlay-part `Pressable`;
  both gated by their declared `enabledBy` props.
- *Non-blocking ephemeral* (toast) → an in-tree live region
  (`accessibilityLiveRegion`), no Modal.
- *Anchored* (tooltip, popover) → a trigger `Pressable` plus a transparent
  `Modal` positioned from `measureInWindow` of the anchor, with a
  synthesized `content` slot prop standing in for the web compound
  content API. Documented touch divergences: outside content is inert
  while open, hover/focus open-triggers lower to long-press, and
  pointer-leave dismissal lowers to backdrop press. Collision handling
  (flip/shift) is not realized on RN.

**Timing.** Ephemeral surfaces declare `timing.autoDismissProp` plus
`timeout` dismissal. The presence budget flows from the component's
`*.timing.auto-dismiss` token slot (semantic `motion.dwell.*` family) into
the `autoDismiss` behavior primitive, mirrored across all five web
packages and RN. Web behavior includes hover/focus pausing (WCAG 2.2.1
Timing Adjustable) and remaining-budget bookkeeping. Web resolves the token
default at generation time (not runtime-themeable); RN reads it
theme-reactively from the typed token scope.

**Reserved vocabulary.** `positioning.strategy: "fullscreen"` expresses a
full-screen takeover; no corpus contract uses it.

## References

- [Compositional motion](motion-substrate.md) — evolving motion principles, shared progress, and the boundary between logical presence and visual exit retention. This is design direction, not an implemented exit controller.

- `docs/normal-form.md` — the compositional-system architecture that this family slots into.
- `packages/ds-contracts/component.contract.schema.json` — the `surface` block schema, alongside the `portal`, `dismissal`, and `focus` blocks it coordinates with.

## Paged content inside a presence surface

A dialog or coachmark may host an ordered flow without changing its presence
classification. [Paged collections](paged-collections.md) governs position
selection and its content/validation ownership boundary. Presence continues
to govern opening, dismissal, modality, and focus containment. Pagination
alone does not establish a dialog workflow or a walkthrough migration.
