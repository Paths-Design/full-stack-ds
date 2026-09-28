---
doc_id: ARCH-MOTION-SUBSTRATE-001
authority: architecture
status: draft
title: Compositional motion — guiding principles
owner: "@darianrosebrook"
updated: 2026-09-27
governs:
  - packages/ds-codegen/src/ir.ts
  - packages/ds-contracts/component.contract.schema.json
  - packages/ds-tokens/src/motion/
caws_specs:
  - MOTION-PRINCIPLES-01
---

# Compositional motion

Motion describes how an owned part changes its presentation in relation to a
state change, a time budget, or another source of progress. Components compose
these relationships. Tokens supply reusable design values; realization backends
translate the relationships into platform behavior.

This document establishes design direction, not a claim that the substrate is
implemented. Principles, proposed representations, and observed support are
separate below. Revise the principles when evidence challenges them; do not
preserve an abstraction merely because it was written first.

## Relationship to the existing system

[Presence surfaces](presence-surfaces.md) classify behavior through capabilities
such as presence, modality, attachment, and positioning. Motion follows that
method: a name such as Toast or Spinner does not select a special animation
implementation. A component's declared parts and capabilities determine which
motion machinery can be used.

Motion composes with presence but also applies to persistent controls, icons,
loading indicators, and progress representations. It does not introduce another
rendered primitive alongside Stack. Shared controllers and non-rendering motion
capabilities can support existing anatomy and public component APIs.

The [codegen authority order](../codegen-authority.md) continues to apply:
contract semantics → normalized IR → target realization → observed evidence.
The [implementation snapshot](../current-implementation-snapshot.md) remains
the authority for delivered capabilities.

## Leading principles

### Describe relationships before choosing an animation engine

A motion declaration must answer: what changes, why it changes, where it starts,
where it should arrive, and who controls its progress. It must not require a
component name, CSS selector, React ref, or library-specific animation object to
express those semantics.

Prefer the platform's native mechanism where it satisfies the declaration.
Simple CSS transitions should not require a JavaScript frame loop. A native
backend or consumer-supplied adapter can make a different execution choice.
Framework neutrality means common semantics and explicit capability differences,
not identical trajectories or an obligation to implement every effect everywhere.

### Bind to owned parts and declared sources

Targets resolve through anatomy and instance identity. An unknown part or driver
is a diagnostic, never an inferred root target. Repeated parts require stable
item identity; reordering must not attach a running effect to a different item.
Nested components own their own parts. Cross-component coordination uses an
explicit exported participation point rather than reaching through arbitrary
descendants.

Structured drivers must reference existing channels, states, events, or progress
providers. Legacy free-form trigger prose remains declaration-only until migrated
and validated. A string that resembles a state transition is not an executable
binding, even when its spelling happens to match current state names.

### Compose values, effects, and coordination at distinct levels

| Level | Owns | Does not own |
|---|---|---|
| Token graph | Duration, delay, easing, displacement, scale, bounded profile values | Events, element references, clocks, dismissal |
| Motion binding | Target, driver, effect endpoints, profile reference | Framework syntax |
| Coordination | Shared progress, ordering, dependencies, bounded stagger | Independent copies of a participant's state |
| Runtime owner | Clock, interruption, completion, resource cleanup | Component-specific visual lore |
| Backend or adapter | Target handles and supported execution mechanisms | Semantic open/closed state or business actions |

Use typed composite tokens where the token format supports them. A DTCG
`transition` token combines duration, delay, and timing function; it does not
describe the animated target or endpoints. Profiles combining other values can
be token groups without inventing a standard token type. References must retain
type and provenance through resolution. Component-local slots need a real
consumer under the existing [token consumption rules](design/component-token-consumption.md).

Keep timing of presentation separate from timing of behavior. A brand's slower
entrance curve must not silently extend a notification's dwell budget. Theme
changes during motion need an explicit snapshot-or-retarget policy.

### One source of progress; one owner of each animated property

A countdown and its expiration consume the same budget. A progress bar, ring,
and label may project that budget differently, but none starts a second timer.
Pause reasons compose: leaving hover cannot resume a timer while focus still
requires it to pause. A driver distinguishes active time from wall-clock time
and defines hidden-page, suspension, reset, and changed-budget behavior.

Elapsed progress and eased visual progress are distinct. A linear countdown
must not inherit the easing curve used by an entrance. Dwell, finite transition,
repeating motion, and direct manipulation need different driver contracts.

Two effects cannot independently own the same target property. Composition of
translation, rotation, scale, positioning, and RTL transforms must have a declared
order or isolated carriers; transform order is not generally commutative.
Competing writers require an explicit handoff or are rejected.

### Presentation can lag intent; interaction policy cannot be accidental

Logical openness, render retention, and visual phase are distinct facts.
Closing may retain a part for exit presentation. Presence policy must separately
define interaction eligibility, focus return, trapping, outside inertness, and
layer retention during that interval. Opacity alone does not establish any of
those behaviors.

An entry origin, resting state, and exit destination may differ. Reopening during
exit requires a defined retarget or restart policy. Stale completion from an older
run must never remove a reopened part. Cancellation, adapter failure, zero
duration, absent animation events, and unmount must settle and clean up; completion
is bounded and must not depend exclusively on a browser event arriving.

Default direction: preserve continuity by retargeting from current presentation
where supported. Exact velocity continuity and spring equivalence are separate
capabilities, not assumptions hidden under the word "smooth."

### Larger spatial changes receive more time within a response budget

For otherwise comparable spatial transitions, increasing the moving part's
visual extent or travel distance must not shorten its duration. The relationship
is bounded so large surfaces remain responsive. This is a design constraint to
calibrate, not a physical law or a universal duration formula.

Measure the participating part, not its largest ancestor or a component's size
variant name. Account for the effect: a large rotating shape's edges travel
farther, a translation has a path length, and opacity has no spatial distance.
Declare the coordinate space and units. Size-sensitive spatial policy does not
automatically apply to fading, countdown budgets, or user-driven progress.

Start with tokenized extent/distance bands and bounded timing profiles. Runtime
geometry is an explicit resolver input with a defined unavailable-geometry
fallback; it must not enter code generation as a machine-dependent measurement.
Freeze measurements for a run or explicitly retarget after resize. Coordinated
parts may share a duration to preserve a meaningful arrival relationship.

User manipulation stays directly responsive while the gesture is active.
Size-sensitive settling may follow release. When a duration ceiling would make
a large movement too abrupt, consider reducing displacement or substituting an
effect rather than silently exceeding the responsiveness budget.

### Accessibility is an alternate presentation contract

Reduced motion preserves meaning, outcomes, and operability. Define substitution
per effect family: settle a state change, replace continuous motion with a static
loading indication, or represent remaining time without sweeping movement.
Essential information must not disappear when animation stops.

An OS preference or application setting changing mid-run must have a defined
settlement path. Suppressing motion must not prematurely expire a dwell clock,
leave a surface transparent, or strand exit retention. A shorter duration is not
universally an adequate substitute for motion.

### Extension changes realization, not semantic authority

A bring-your-own adapter receives resolved motion facts and platform-owned target
handles. It declares its supported effects and lifecycle operations. It reports
completion/cancellation for a specific run; it does not become the owner of the
open channel, dismissal decision, or time budget.

Execution ownership is exclusive for each effect. An adapter takeover disables
the built-in writer and defines restoration on disposal or failure. Unsupported
requests use a declared substitute or return a capability diagnostic. Silent
partial animation is not full realization.

## Proposed descriptive dimensions

These are design vocabulary, not an accepted schema or an unrestricted product
of options. Binding and capability checks decide which combinations are lawful.

| Dimension | Illustrative values | Constraint |
|---|---|---|
| Target | Anatomy part; exported icon part; repeated instance | Stable, owned identity |
| Driver | State change; budget; direct/external progress; repetition | One authoritative source |
| Effect | Opacity; translation; rotation; scale; extent | Typed endpoints and coordinate space |
| Timing | Token profile; geometry-sensitive profile; supplied progress | No independent duration for externally driven progress |
| Coordination | Together; sequence; bounded stagger | Acyclic dependencies and bounded total latency |
| Lifecycle | Retarget; cancel; settle; retain for exit | Run identity and explicit cleanup |
| Adaptation | Reduced-motion substitute; unsupported-target fallback | Preserve semantics and disclose capability |

Keep future APIs minimal until independent cases justify the dimensions.
Springs, layout interpolation, scroll timelines, shared-element transitions, and
path morphing are candidates with additional requirements, not implied support.

## Web realization: entry origins and `@starting-style`

CSS `@starting-style` supplies the before-change style for a transition when a
previous rendered style is absent, such as insertion or becoming rendered after
`display: none`. It is a candidate lowering for entry origins. It participates
in normal cascade ordering and is not a keyframe-animation prerequisite.

The semantic contract should describe entry origin, resting state, and exit
destination. The web backend chooses `@starting-style`, ordinary transitions,
keyframes, or an adapter according to admitted capabilities. CSS syntax stays
below the contract boundary.

For suitable DOM surfaces, discrete `display` transitions and top-layer
`overlay` retention can cooperate with exit presentation. They do not retain a
node that a framework has removed. A backend must coordinate the renderer's
removal policy and preserve the presence policy's interaction/focus obligations.
Entry support alone is not an exit-lifecycle implementation.

Validate cascade layers, first render and re-entry, interrupted close/reopen,
top-layer behavior, reduced motion, and the supported browser baseline before
admitting this lowering. Do not infer support from syntax emission.

References: [MDN starting-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style)
and [CSS Transitions Level 2 draft](https://drafts.csswg.org/css-transitions-2/#defining-before-change-style).

## Composition examples and decisive witnesses

| Example | Composition | Evidence that would challenge the design |
|---|---|---|
| Disclosure | Panel extent + indicator rotation share a declared state change | Requires an emitter branch on the component name |
| Toast countdown | Dwell budget drives countdown and dismissal | Pause or changed duration makes the display disagree with expiration |
| Carousel countdown | Same budget machinery, different advance policy | Clock implementation contains toast-specific behavior |
| Icon response | Whole glyph or exported internal part follows a state/event | Binding depends on SVG path-array position |
| Presence transition | Content and backdrop coordinate, exit retains presentation | Old completion removes a newly reopened instance |
| Large and small parts | Same spatial profile with different explicit geometry | Increasing extent/distance makes comparable movement finish sooner |
| Adapter replacement | Same semantic declaration, different executor | Replacing the executor changes dismissal or interaction policy |

Whole-icon motion can reuse component-part binding. Internal icon motion requires
iconography to export semantic part identities across size variants. The current
[icon path schema](../../packages/ds-iconography/icon.contract.schema.json)
does not supply those identities. Morph compatibility requires its own evidence.

These witnesses define what an implementation must demonstrate. Cross-framework
compilation and CSS-property presence cannot substitute for runtime observations
of the named target, driver, lifecycle, and adaptation.

## Current boundary and evidence-led revision

The existing [MotionIR builder](../../packages/ds-codegen/src/ir.ts) carries
transition intent for inspection; style/keyframe declarations independently
produce animation. The first foundation preserves each authored trigger verbatim
(or null when absent), with `realization: "declaration-only"` on each transition.
This describes that declaration's lowering status, not whether the component has
any animation through other mechanisms. No string is promoted to a bound driver.

The existing [motion audit](../../scripts/motion-realization-audit/audit.mjs)
checks property presence and reference resolution against generated CSS and a
gap ledger. It does not establish part/trigger correspondence or runtime motion.
The existing reduced-motion CSS path also does not separately realize all the
policy distinctions in the motion schema.

Promotion to executable motion requires a resolved target, a bound driver,
validated effects/tokens, and a supported lowering with lifecycle evidence.
The first executable binding should pair a state-driven part transition with
a differently named witness using the same machinery. A shared-budget witness
then challenges whether the model generalizes beyond transitions. These are
admission criteria; this document does not schedule or certify those features.

Keep the following choices provisional until witnesses distinguish alternatives:
the public authoring shape; timing bands and size metric; run-time theme/geometry
retargeting; clock suspension policy; and adapter packaging. A maximal universal
animation runtime risks duplicating platform machinery; CSS-only recipes cannot
by themselves govern shared clocks and renderer retention. Start with explicit
bindings and the smallest shared runtime required by the admitted behavior.

When a witness refutes a principle, record the case, revise the principle and its
test together, and update the snapshot's support boundary. Keep exact syntax in
schema/API references once admitted. Keep this document focused on rationale,
ownership, constraints, and what evidence could change them. Do not weaken an
existing claim merely to reclassify a failing implementation as complete.

Further references:
- [DTCG transition composite](https://www.designtokens.org/tr/2025.10/format/#transition)
- [Fluent motion guidance](https://fluent2.microsoft.design/motion)
