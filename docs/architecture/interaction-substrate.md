---
doc_id: REF-INTERACTION-SUBSTRATE-001
authority: reference
status: active
title: Interaction substrate
owner: "@darianrosebrook"
updated: 2026-11-05
---

# Interaction substrate

The `interaction` capability links a value channel, invoking parts and content
presence in a framework-neutral contract. It is used by Details, ShowMore,
Accordion, Tabs, Dialog, Sheet, Popover and Tooltip. Geometry, modality and
outside-boundary dismissal remain the responsibility of the existing surface
capability. A dialog can be opened by external state without owning an opener.

```json
{
  "interaction": {
    "channel": "open",
    "content": "content",
    "presence": "unmount",
    "triggers": [{ "part": "summary", "operation": "toggle" }],
    "disabledProp": "disabled"
  }
}
```

`packages/ds-codegen/src/interaction.ts` validates these references and lowers
plain DOM activations into the semantic IR. The event names the channel setter;
`ActivationIR` owns toggle/open/close and native-default cancellation. A summary
cancels the browser's independent toggle before requesting a channel change.
Repeated parts declare selection or item toggling, so the emitters do not infer
this distinction from a component name. A competing authored click is rejected.

Presence is distinct from state: `unmount` binds the content guard to the channel,
`hidden` protects inactive repeated panels against authored display rules, and
`clamp` requires the existing line-clamp capability. Clamp sizing still comes
from text-overflow and style facts. Surface presence continues to govern anchored
content mounting. These policies preserve the existing public component APIs.
A trapped interaction also binds its declared content element to the target's
focus-scope handle; emitting a focus behavior without its DOM handle is insufficient.

The web factories emit the same `interaction.ts` runtime. Each framework retains
its reactive adapter, while uncontrolled commits, change notification, repeated
item transitions, activation cancellation and native event registration share
one source. The parent remains authoritative when a controlled value is supplied.
Defaults initialize internal state once, after framework inputs are available.
An event binding owns only the listeners it registered and cleans them up on
replacement or unmount.

## Host composition

React exposes `InteractionHost` and `bindInteractionHost` from the primitives
entry point. `InteractionHost` supplies a default button or adopts one child
with `asChild`. The child must forward props and its ref to an element. Consumer
handlers run before behavior handlers and may cancel them with `preventDefault`.
Refs receive the same element, including callback-ref cleanup; descriptive ARIA
references combine rather than overwrite one another. Disabled child semantics
are preserved. Host adoption itself does not turn an arbitrary element into a
keyboard-accessible button.

Anchored triggers and repeated selection/disclosure triggers use this same
React binding. An adopted host can also invoke externally controlled dialog
state, without adding a dialog-specific clone/ref implementation. Vue slot
bindings, Svelte actions/snippets, Angular anchor directives and Lit anchor
slots retain their idiomatic anchored-surface interfaces. This change does not
add a universal `asChild` API to those targets.

## Evidence and limits

- `interaction.test.ts` exercises renamed contracts and rejects invalid channel,
  part, operation, disabled and presence declarations.
- `interaction-runtime.test.ts` checks cancellation, ownership, immutable item
  transitions and independent listener disposal against the emitted runtime.
- `InteractionHost.test.tsx` checks nested adoption, callback order, ref identity
  and cleanup. Angular and Lit component tests cover late initial defaults and
  controlled parent updates.
- `e2e/details-disclosure.spec.ts` checks the homepage matrix and native summary
  activation across the web targets. `e2e/interaction-substrate.spec.ts` checks
  controlled ShowMore updates across those targets and React host composition,
  real panel visibility, keyboard activation and dialog focus return.

These witnesses do not establish complete accessibility or behavioral parity.
The shared content handle makes the existing focus adapters reachable; their
full focus policies are not unified by this slice. React Native lowers boolean
activation operations to native setters and remains admission-checked. Native
host adoption and native focus behavior are not claimed here.
