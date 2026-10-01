---
doc_id: ARCH-CAROUSEL-SEQUENCES-001
authority: architecture
status: draft
title: Carousel composition and advance budgets
owner: "@darianrosebrook"
updated: 2026-09-28
governs:
  - packages/ds-codegen/src/sequence.ts
  - packages/ds-contracts/components/Carousel/
caws_specs:
  - CAROUSEL-TIMED-COMPOSER-01
  - CAROUSEL-MOTION-PARITY-01
---

# Carousel sequences

Carousel is the first persistent composer to consume an advance budget. It
composes arbitrary child content, a controlled or uncontrolled index channel,
native navigation buttons, and optional elapsed-time decorations. This is a
bounded Web DOM realization of the [motion substrate](motion-substrate.md).

## Principles

- **One budget, multiple projections.** The timer requests the next index;
  neither the pill nor the ring can advance the sequence. Removing or hiding
  either indicator does not change its duration.
- **Content time differs from movement time.** `carousel.timing.advance` resolves
  to the medium dwell token. Its generation-resolved value is the default active
  reading time per slide. `duration` overrides it in milliseconds; `null`, zero,
  negative or non-finite values disable it. Changing a CSS variable does not
  retime JavaScript. Component size does not scale this reading budget.
- **Composition retains content ownership.** Consumers supply one direct child
  element per entry in `slides` (accessible labels in matching order). A child
  can be a Card, image, article or another composition. The sequence owns only
  visibility, inertness, slide semantics and movement on those boundary elements.
  A transition temporarily gives transparent (`display: contents`) and
  non-replaced inline boundaries a `flow-root` box. This keeps generated custom
  element hosts transformable without reparenting framework-owned children.
  Box-producing display modes are retained, and the original inline display
  value and priority are restored when the slide leaves the sequence.
  Keep consumer transform animations inside that boundary. Text
  nodes alone are not slides. A count mismatch disables time and navigation.
- **Focus belongs to the reader.** Autoplay defaults off. Focus entering the
  carousel stops it until Start is explicitly activated. Hover and a hidden
  document pause active time independently; removing either pause must not
  remove another. Next, Previous and picker buttons retain focus.
  A pointer activation retains the rotation action pressed before focus entered;
  pressing Stop must not restart rotation when focus stops it first.
- **Completion is a request.** A controlled parent must acknowledge the new
  index before another timed advance is possible. An acknowledged index or
  changed label sequence starts a fresh budget. Indices wrap for navigation.
- **Reduced motion preserves meaning.** Both elapsed projections become
  discrete steps. Spatial transitions become instant; the full reading budget
  is preserved.

The interaction policy follows the [WAI carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).
Rotation is the first control in tab order. Inactive slides are hidden and inert;
the viewport announces changes politely during manual operation and is silent
during automatic rotation. Pickers use native buttons, with `aria-disabled` on
the selected one, rather than claiming tab semantics without tab keyboard rules.

## Contract and realization

`sequence` names the index channel, label collection, viewport, picker and action
parts, timing prop/token, autoplay prop, and accessible action labels.
`motion.progress` binds decorative anatomy parts to `sequence.advance`:

| Projection | Effect | Meaning |
|---|---|---|
| Active picker fill | `elapsed-width` | Horizontal progress from empty to full |
| Next-button ring | `elapsed-ring` | Clockwise progress from empty to full |

`indicator="pagination"`, `"next"`, or `"both"` selects the visible treatment.
The same source remains authoritative in every case. Track, foreground,
progress color and spacing are component token bindings. Ring shape and fill
geometry live in the style contract; the runtime supplies normalized progress.

`motion.sequenceTransition` binds the viewport's direct children to
`sequence.index` with the `slide-inline` effect. Next moves outgoing content left
and incoming content from the right; Previous reverses it, including at wrap.
RTL reverses the inline direction. Duration and easing resolve from component
motion tokens independently of the reading budget. Duration scales as
`base × clamp(sqrt(viewportWidth / referenceWidth), minMultiplier, maxMultiplier)`:
larger surfaces move more slowly within declared limits. The current contract
uses a 320px reference and multipliers from 0.5 to 2.

The Web Animations realization keeps outgoing content visible but inert and
hidden from accessibility while incoming content moves into place. A new
navigation interrupts from the current rendered transform. Completion releases
the next slide's full reading budget; animation completion never changes index.
Changing to reduced motion cancels movement immediately. Teardown restores the
consumer's inline styles and semantics.
Removing either participating slide cancels its movement before returning the
element to its consumer. Settled animation promises cannot subsequently mutate
released content. A temporary label/child mismatch or timing update recomputes
the movement pause, so presentation cannot consume the incoming reading budget.

The IR validates ownership and lowers the facts once. Each web emitter attaches
the controller through its framework lifecycle. The shared presence budget owns
the only deadline and frame loop; the sequence adds navigation, pause policy and
DOM projection. Framework code never selects this behavior by component name.

```tsx
<Carousel
  slides={["Overview", "Activity", "Next steps"]}
  autoPlay
  duration={6000}
  indicator="both"
>
  <Card>Overview content</Card>
  <Card>Activity content</Card>
  <Card>Next steps content</Card>
</Carousel>
```

## Boundaries and evidence

The contract and IR carry explicit `web: sequence-budget` and
`nonWeb: unrealized` capability facts. Generated native scaffolding is not a
native carousel implementation. Swipe physics, virtualization, per-slide durations, keyed reordering and public animation
adapter takeover remain outside this slice. Labels and children are an ordered
pair of inputs; replacing/reordering their sequence resets the budget rather
than transferring elapsed time to a different slide.

`packages/ds-codegen/src/carousel.test.ts` exercises normalization, rejected
bindings and renamed-contract generation. `sequence-budget.test.ts` exercises
the mirrored web controllers with a finite clock. `e2e/carousel.spec.ts` tests
generated web mounts with consumer DOM children, plus actual Card composition
in the React showcase. A generated Lit Card witness measures painted child
positions during forward and interrupted reverse motion through its normally
transparent host. Those witnesses do not establish arbitrary framework
child-component lifecycle parity or native behavior.
CI executes these browser regressions through `pnpm run e2e:carousel` alongside
the runtime fact and render-binding rails.
