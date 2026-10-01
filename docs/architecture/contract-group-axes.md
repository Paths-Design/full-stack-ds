---
doc_id: ARCH-CONTRACT-GROUP-AXES-001
authority: architecture
status: active
title: Contract Group Axes
owner: "@darianrosebrook"
updated: 2026-09-06
governs:
  - packages/ds-contracts/component.contract.schema.json
  - packages/ds-contracts/components/**/*.contract.json
  - packages/ds-contracts/a2ui/derive.ts
---

# Contract Group Axes

Component contract groups are not interchangeable labels for "component type." They encode separate axes of authority. Keeping those axes distinct prevents the contract from becoming a loose taxonomy that looks organized while allowing semantics to drift.

## Axis 1: Layer

`layer` is the complexity and authority axis.

It answers: how much behavior, composition, or orchestration does this artifact own?

The current layer vocabulary separates primitive, compound, composer, and assembly concerns. That distinction is about system responsibility, not visual category. A component can be visually simple and still own orchestration; a visually large artifact can still be a composition of lower-order pieces.

## Axis 2: Category

`category` is the behavioral family axis.

It answers: what kind of user-facing role does this component primarily serve?

The category enum is intentionally pragmatic rather than ontologically pure. It mixes action, input, feedback, glyph, display, structure, and surface because those buckets are useful for design-system defaults, documentation grouping, token coverage profiles, and audits. It should not be treated as a complete semantic theory of UI.

**That split has since happened.** `morphology` is now its own OPTIONAL schema field (`packages/ds-contracts/component.contract.schema.json`), sibling to `category` rather than a subdivision of it:

| Axis | Answers | Enum |
|---|---|---|
| `category` | what user-facing role does this serve? | action, input, feedback, glyph, display, structure, surface |
| `morphology` | what geometry / default affordance does it have? | `fixed-square`, `content-inline`, `identity-inline`, `linear-meter`, `loading-block`, `replaced-media` |

`morphology` selects a `StyleProfile` supplying box-model slot defaults plus root structural CSS, layered **between** the BoxModel primitive defaults and the component token sidecar — the sidecar still wins. When absent, the component keeps the legacy two-way primitive-under-sidecar merge, so adoption is incremental: 7 of <!-- component-count -->55 contracts declare it today.

`category` therefore stays behavioral and is no longer asked to carry geometry. It remains intentionally pragmatic rather than ontologically pure, and should still not be read as a complete semantic theory of UI.

## Axis 3: Prop legitimacy

Prop buckets are the public API legitimacy axis.

They answer: what kind of dependency may a consumer take on this property?

- `designed` is the intentional product-facing API.
- `passthrough` deliberately forwards substrate affordance without making every substrate detail semantic authority.
- `constrained` is valid only under named conditions.
- `restricted` records what consumers should not depend on.
- `styled` and `hook` are legacy surfaces that should not be the long-term source of consumer-facing authority.

A2UI should project from API legitimacy, not implementation shape. New derivation should prefer `designed` and `constrained`, summarize or omit `passthrough` depending on consumer, and treat `restricted` as negative guidance.

## Axis 4: Structural topology

`anatomy`, `slots`, and `relationships` are the structure axis.

They answer: what parts exist, how can content be hosted, and which entities relate to each other?

This axis should line up with DOM or framework output, but it should not be reduced to DOM trivia. A slot or relationship is a semantic hosting surface. If A2UI says a child is accepted, there should be a compatible slot or anatomy host. If a relationship names a controlled peer, that peer should be visible in the structural model.

## Axis 5: Interaction semantics

`channels`, `events`, and `stateMachine` are the interaction axis.

They answer: what state does the component expose, how does it change, and what notifications does it emit?

A channel is stateful control. An event is notification. A state machine is transition policy. They may be rendered through callbacks, signals, runes, controllers, or other target idioms, but those are realization details.

## Axis 6: Presence and surface semantics

`surface`, `portal`, `focus`, `dismissal`, and `motion` are the presence axis.

They answer: how does the component appear, disappear, anchor, trap focus, dismiss, animate, and coexist with the rest of the page?

Surface components should not smuggle product semantics into framework emitters. If a target needs special behavior for overlay, focus, Escape, outside-click, or anchoring, the missing fact should be promoted into this axis or a shared target-family semantic table.

## Axis 7: Data participation

`form`, `formControl`, `compositeControl`, and `dataModel` are the external data axis.

They answer separate questions. `form` says whether and how a value participates
in native form submission and validity. `formControl` identifies the rendered
interactive part, its value channel/model, and when interaction commits that
channel. `compositeControl` owns the corresponding facts for a repeated item
template: the item part, value channel, interaction model, commit timing, and
closed iteration-aware update expression. `dataModel` describes externally
modeled data and selection.

This axis is separate from visual category. Some input-like components are not form controls. Some display components carry selected state. The contract should state the data participation explicitly rather than inferring it from category alone.

The separation is intentional: a button-backed switch can be a boolean
`formControl` without claiming native `FormData` participation, while a native
checkbox can declare both capabilities. Field association targets
`formControl.part`; it must not assume that a compound component's root is the
labelable element.

`compositeControl` is deliberately separate from `formControl`: Select options,
Calendar days, and OTP fields are multiple runtime instances of one iterated
DOM template. Their item/index payload belongs to the binding IR, and must not
be reconstructed by component-name branches in framework emitters.

## Axis 8: Assistive-technology obligation

`a11y` is the assistive-technology obligation axis.

It answers: what role, naming, keyboard, and semantic attributes must be preserved for users of assistive technology?

Emitters may lower the obligation differently, but they may not fabricate missing names, roles, or state values from framework-local guesses. Missing accessible names or required ARIA values are contract gaps, not emitter opportunities.

## Axis 9: Consumer projection

`a2ui` is the consumer projection axis.

It answers: what surface may an agent or other non-renderer consumer depend on?

The authored block should stay slim. Most A2UI fields should derive from existing contract authority: prop buckets, types, enum domains, channels, events, form participation, usage hints, and children policy. Renderer seams should be stripped.

## Obligation rules

The axes become useful when combinations imply obligations:

- `category: input` should normally have `form`, `channels`, or a documented reason it is display-only.
- `surface` with dismissal should have focus and Escape/outside-click policy.
- `relationships` should match anatomy parts and accessible labeling references.
- `a2ui.children.accepts` should match compatible slots or anatomy hosts.
- `constrained` props should eventually have machine-checkable constraints, not only prose.
- raw semantic token usage should be auditable against category and state coverage.

The goal is a contract lint lattice: not just valid sections, but valid combinations. Schema validation proves shape; axis obligations prove the contract is coherent.
