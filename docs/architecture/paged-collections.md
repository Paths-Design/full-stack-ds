---
doc_id: ARCH-PAGED-COLLECTIONS-001
authority: architecture
status: active
title: Ordered sets, state projections and Pagination
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - packages/ds-contracts/components/Pagination
  - packages/ds-contracts/components/Carousel
  - packages/ds-contracts/components/PageNavigator
  - packages/ds-codegen/src/paging.ts
  - packages/ds-codegen/src/sequence.ts
---

# Ordered sets, state projections and Pagination

An ordered set can have an accepted current position and independently supplied
item state. A projection may simply display that state, or expose controls that
request another position. A paged collection is one use of this shared structure. Its content can be a
slide, a result page, an instruction step, or a stage inside a dialog.
Pagination is the reusable control surface for that selection. The consumer
owns what a position means and how its content becomes available.

## State and interaction are separate

The current location, item completion, partial progress, availability, and
interaction are distinct facts. Moving to a step does not complete it. Going
back does not undo completion. A connector between two activity markers can
show their supplied states without providing navigation. A completed item can
remain selectable; an incomplete item can be unavailable under its owner's
validation policy.

| Fact | Authority | Projection |
|---|---|---|
| Accepted position | Content or activity owner | Current marker, page ordinal, visible content |
| Completion | Activity owner | Check icon or completion text |
| Partial progress | Activity owner | Progress bar, ring, connector |
| Selection availability | Flow policy | Enabled navigation action |
| Interactivity | Contract anatomy and action bindings | Button/input, or a display-only element |

The paging substrate owns position request mechanics, not completion or workflow
transitions. `pagedSet` is a contract fact normalized into IR. It names a numeric
accepted-position channel, an ordered items prop, and optional known-count and
disabled props. It does not name a DOM part, create a button, prescribe an icon,
or assign a meaning to the records in the collection.

The `paged:` binding vocabulary exposes `index`, `count`, `ordinal`, `draft`,
and availability values separately from `request`, `previous`, `next`, `edit`,
`commit`, and `cancel` actions. A display-only composition binds values without
binding actions. Existing iteration and `componentRef` bindings project item
metadata into Text, Icon, Progress, or other existing components. Completion
and progress are never inferred from an index comparison.

## Ownership

| Participant | Owns |
|---|---|
| Paged-set policy | Finite bounds, request validation, event-turn duplicate suppression, and ordinal draft conversion. |
| Pagination | Position choices, current-position presentation, accessible labels, and selection requests. |
| Content owner | Accepted position, content identity, fetching or visibility, validation, and acknowledgement. |
| Sequence policy | Optional wrapping, automatic advancement, pause policy, elapsed budget, and movement. |
| Presence surface | Opening, dismissal, modality, focus containment, and return focus. |

These capabilities compose. A paged dialog combines presence with position
selection. A table combines data projection with position selection. Carousel
combines consumer-owned content with circular sequence policy and Pagination.
Neither modality nor autoplay is an intrinsic property of Pagination.

The accepted index is zero-based; labels are consumer-authored display and
accessible names. A numbered page label is presentation, not a second index.
Controlled Pagination requests a new index and waits for its consumer to
accept it. Uncontrolled Pagination can own local selection for a standalone
control demonstration. A content composition should share one accepted index
with its controls rather than create independent selection state.

## Independent axes

| Axis | Choices | Consequence |
|---|---|---|
| Presentation | Indicators or numbered/labeled pages | Changes the visible affordance, not position identity. |
| Navigation boundary | Bounded or circular | Changes previous/next availability; owned by the consumer's policy. |
| Advancement | Explicit or timed | Timing belongs to the sequence, never to Pagination. |
| Availability | Known finite positions or partially known data | Unknown totals and unavailable positions require an explicit consumer policy. |

Indicators suit a small finite set whose content provides context. Numbered
pages make ordinal position visible. Large result sets additionally need a
windowing/ellipsis policy; that policy cannot be inferred from a dot style.
Previous and Next may belong to a surrounding sequence or flow. They should
not be duplicated merely because that flow consumes Pagination.

## Accessibility

Each choice is a native button with a meaningful accessible label. The current
position is announced with `aria-current`; native Tab and Enter/Space behavior
remains available. Choosing a position does not by itself move focus into the
content. Tables, walkthroughs and dialog stages must declare any additional
focus or announcement policy appropriate to their task.

Selection is not tab selection: a row of page buttons must not claim `tablist`
semantics without tab-panel association and the corresponding keyboard rules.
An elapsed fill is decorative. Its source owns the clock and reduced-motion
policy; removing the projection cannot change advancement.

## Consumer API and composition

`Pagination` accepts `pages` (ordered string labels), `index`, `defaultIndex`,
`onIndexChange`, `presentation` (`indicators` or `pages`), `label`, and `disabled`.
Labels may repeat; identity is the ordinal index. The accepted index and callback
form one numeric channel. The component is classified as a **composer** in the
contract taxonomy because it orchestrates that channel. Its button, marker,
fill, and label are owned anatomy parts rather than public compound children.

A results consumer owns both selection acknowledgement and content projection:

```tsx
const [page, setPage] = useState(0);
const pageSize = 12;
const labels = Array.from(
  { length: Math.ceil(results.length / pageSize) },
  (_, index) => String(index + 1),
);
const visibleResults = results.slice(page * pageSize, (page + 1) * pageSize);

return <>
  <Results rows={visibleResults} />
  <Pagination pages={labels} presentation="pages" label="Result pages"
    index={page} onIndexChange={setPage} />
</>;
```

The activity feed uses this composition with Postcards. A dialog stage can
share the same accepted-index channel while retaining its own validation and
presence rules. Fetching consumers may keep the accepted index unchanged
until their requested data is ready; Pagination does not infer acknowledgement.

Carousel consumes `fsds.Pagination` through `componentRef`, forwards labels
and accepted index, and forwards selection requests through its sequence
controller. The contract names the child-owned picker and fill using
`{ componentPart: "pagination", part: "item" }` and
`{ componentPart: "pagination", part: "fill" }`. The semantic IR resolves
these addresses against the contract corpus and rejects missing parts,
incompatible channel wiring, and competing progress ownership. Web backends
lower those normalized facts without a Pagination or Carousel name switch.
This addressing supports one locally composed component boundary, including
its custom-element shadow root; it is not arbitrary deep part traversal.

`progress="elapsed"` exposes the decorative fill to an enclosing controller;
`progress="none"` hides it. Pagination owns no elapsed value or timer.
Carousel's `sequence.advance` budget remains the source of its pill and ring.

## A page field is a composition

`PageNavigator` composes Button and Icon for bounded Previous/Next, Input for a
one-based page draft, text for the known total, and Pagination for optional
position choices. All share one accepted numeric channel. The field is an
existing Input instance; it does not add a native-input implementation to
Pagination or become a dot/numbered styling variant.

```tsx
<PageNavigator pageCount={15} index={page} onIndexChange={setPage} />
<PageNavigator pages={["Profile", "Preferences", "Confirm"]}
  presentation="pages" showChoices index={stage} onIndexChange={requestStage} />
```

The first composition can navigate a known count without allocating a label
for every page. The second explicitly composes location choices alongside the page field.
Enter, blur, or Go commits the draft; Escape restores the accepted ordinal.
Typing does not change location. Invalid, fractional, unsafe, or out-of-range
ordinals are rejected and the accepted value is restored. Controlled requests
wait for acknowledgement, and duplicate requests for the same location within one event turn
are suppressed. A later user intent can retry a request the owner did not accept. Empty, invalid, mismatched, and disabled collections disable
navigation. Page ordinals are one-based; the channel remains zero-based.

The Card sidecar includes a display-only completion/progress example.
`Progress`, `Text`, and `Icon` can form an activity summary alongside
the navigation composition. Modality, activity completion, connector coloring,
and validation remain independent of the paged-set policy. The examples supplied
by the user motivate this boundary; they are not copied into the repository.

## Composition and proof boundary

The extraction is governed by `PAGINATION-COMPOSITION-01`. Its first consumer
is [Carousel](carousel-sequences.md); the activity feed is an independent
results consumer. Contract tests cover composed-part resolution and rejection,
selection tests cover controlled acknowledgement and repeated labels, and
browser tests exercise standalone Pagination, composed PageNavigator, and Carousel across all five web
targets. These are bounded runtime witnesses, not general accessibility or
cross-platform paging certification.
Walkthrough, tables and dialog flows motivate the shared ownership boundary;
this document does not assert that their existing contracts have been migrated.
Unknown totals, server fetching, ellipsis windows, per-page availability, stable
identity under reordering, and validation-gated progression are separate
obligations. Web field behavior is checked through generated compositions; the
shared policy has separate React Native unit witnesses, without claiming native
keyboard, visual, or activity-workflow parity. Figma carries descriptor metadata.

[Presence surfaces](presence-surfaces.md) governs the independent presence
family. [Codegen authority](../codegen-authority.md) governs contract → IR →
framework realization. New paging consumers should compose these authorities
instead of adding component-name branches to an emitter.
