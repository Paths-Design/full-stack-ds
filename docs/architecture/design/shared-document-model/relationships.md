---
doc_id: ARCH-SHARED-DOCUMENT-RELATIONSHIPS-001
authority: architecture
status: draft
title: Shared document relationships and candidate semantics
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - packages/ds-contracts/document-model/
---

# Relationships and candidate semantics

This document proposes meaning for the [paper model](README.md). The [coverage ledger](design-coverage.md) names unresolved decisions. Only the stated candidate subset is represented by schemas; broader product requirements stay visible rather than being silently removed.

## Entities and cardinality

| Entity | Relationship | Ownership rule |
|---|---|---|
| Project | Discovers workspace pages and dependency sources | Repo-relative paths and selected dependency revisions live in the manifest |
| Workspace page | Owns one authored document graph and its JSONL | This is a scratch editing space, not automatically an application route |
| Visual node | Has one identity and one structural owner; children are ordered edges | Roots and child edges are the authored structure; parent pointers are derived |
| Frame | A bounded visual node with sizing and clipping | A frame is not inherently a scene, route, component, or emitted code element |
| Component instance | References a library, definition identity, and version; supplies parameter bindings and eligible local properties | Definition source remains outside the instance; an instance edit cannot rewrite it |
| Scene | References a frame root, a local duration, and eligible scene overrides | A scene is a temporal composition, not a duplicate of its visual tree |
| Track | Belongs to one scene and targets one node/property address | Targets must be reachable from that scene's root |
| Sequence | Contains ordered, individually identified scene occurrences and transitions | Order and explicit placement determine playback; storyboard coordinates do not |
| Scene occurrence | References one scene and selects a source interval and sequence start | Repeating a scene produces a new occurrence identity, not a new scene or node identity |
| Transition | Connects two occurrences | The initial schema only admits a cut; overlap and cross-scene correspondence remain undesigned |
| Annotation | Attaches prose to an explicitly typed page/node/scene/sequence target | Narrative notes do not carry hidden motion instructions |

```mermaid
flowchart LR
  Project --> Page[Workspace page / JSONL]
  Project --> Tokens[Token sources]
  Project --> Library[Definitions and default profiles]
  Page --> Nodes[Visual graph]
  Nodes --> Instance[Component instance]
  Instance --> Library
  Page --> Scene
  Scene --> Frame[Frame root in visual graph]
  Scene --> Track
  Track --> Nodes
  Page --> Sequence
  Sequence --> Occurrence[Scene occurrence]
  Occurrence --> Scene
  Sequence --> Transition
  Plan[Explicit prototype plan] --> Page
  Plan --> Project
```

Stable identities survive rename and reparent. Duplicate creates fresh identities; duplicate-with-motion explicitly remaps copied references. Deletion must not leave an exportable dangling target. Cascade/delete repair policy, cross-page references, and library migration are not settled. The candidate schemas express identity shapes but cannot enforce these graph rules.

The application-page concept is distinct from the workspace page. A route/document target may eventually be attached through an adapter-owned mapping; neither a frame label nor a workspace page name is evidence of such a mapping.

## Values, defaults and edit destinations

An authored binding is either a typed literal or a token reference with an expected value type and source identity. It is never a number with an implicit unit. The initial literal types are number, string, boolean, dimension, duration and cubic Bézier easing. Parameter types are checked against the definition; property types against their declared consumers. Schema validation alone does not establish that compatibility.

Candidate base-property resolution, from lowest to highest precedence:

1. The node's selected, versioned kind default profile.
2. A component definition's eligible default, when the node is an instance.
3. Explicit node property override.
4. Explicit scene override, when evaluating that scene.

Each selected value can retain a token reference. Resolve it in the project's selected source revisions and named context; do not flatten it back into authored state. Component parameters resolve definition default → instance binding separately from visual properties. Parameter-to-property relationships require a declared adapter mapping rather than inventing a universal CSS cascade.

Then apply admitted motion to the resolved base. Playback and scrubbing return evaluated values and provenance without mutating any preceding layer. This is an abstract ownership chain, not a claim that existing FSDS CSS already realizes a portable document evaluator.

Absence means inherit. Literal `0`, `false`, and an empty string are present values. `null` is not a reset spelling in this candidate. Removing an override restores the chain; an invalid present binding reports an error instead of falling through. Empty paint lists and disabling a paint will need explicit future representations; they cannot be inferred from absence.

Inspector edits name their destination: instance parameter, node property, scene override, keyframe, definition, token, or composition edge. A measured width or an evaluated translation is observational and read-only until an explicit operation chooses an authored destination. No `computed`, screen bounds, DOM objects, or source framework types are stored in the initial node schema.

## Geometry and composition boundaries

The first schema admits frames, groups, rectangle shapes, text, and component instances with ordered children and optional slot identities. It describes freeform versus flow layout but does not yet define a full layout solver. Semantic property addresses are qualified names such as `sizing.width` and `transform.translation.x`; schema syntax does not authorize arbitrary addresses or prove consumer reachability.

Transforms are presentation offsets relative to resting layout. They do not rewrite layout constraints. Translation tracks in the first example explicitly use parent coordinates. Units supported by the candidate dimension carrier are `px` and `rem`; conversion requires a declared environment, and portable layout meaning remains partial. Vectors, masks, paints, typography runs, procedural effects, media, and accessibility semantics need further design and dedicated schemas.

Reparenting must select preserve-world or preserve-local placement. An unrepresentable coordinate conversion refuses before mutation. Reuse of a definition does not establish animation continuity across different instances. The same visual root may be referenced by multiple scenes with scene-specific overrides; the compositor must isolate simultaneous evaluations. Shared-root overlap is not admitted by the first cut-only prototype subset. Adding an element from either view must identify whether it edits that shared root or a scene-local structure. Scene-local insertion/removal and the storyboard's representative sample time still need a design; the first schema does not guess those rules.

## Time and motion

The manifest selects positive integer ticks per second. Stored scene/sequence coordinates are nonnegative integer ticks. A duration literal carries `ms` or `s`; a duration token keeps that binding. Conversion into ticks must be exact in the first candidate, otherwise reject as unsupported; frame-rate sampling and rounding policy remain open.

A scene has an active local interval `[0, durationTicks)`. Focused inspection may evaluate its end boundary; sequence playback selects the next occurrence at a cut rather than drawing both. An occurrence samples `[sourceInTicks, sourceOutTicks)` at sequence time `atTicks`, at rate 1 in this candidate. Thus local scene time is `sourceInTicks + sequenceTime - atTicks`. Occurrences must fit scene duration, and transitions must name actual neighboring occurrences. Overlap requires a future transition design; array order is not permission to blend.

Track keyframes use normalized offsets from 0 to 1 within their duration. Offsets must increase strictly and cover both endpoints. A duration-token change preserves those offsets, deliberately retiming the track; it does not resize the scene or occurrence. A new duration exceeding available scene time is diagnosed before preview/export. An absolute-time keyframe mode is not admitted yet.

The bounded candidate properties are translation X/Y and opacity. Translation values require dimensions; opacity requires numbers in `[0,1]`. Each track explicitly selects replacement composition, before/after fill, easing and reduced-motion behavior. Concurrent writers to one scene/node/property are refused in this first subset; additive, blended and priority composition remain open. Schema validation does not enforce conflicts, binding compatibility or easing evaluation.

Slide-in/slide-out/custom are authoring recipes, not primitive track types. A future preset instance must retain its recipe identity/version, parameters, target and coordinate policy, with generated tracks remaining distinguishable from manual edits. Recipe editing/expansion is not yet designed. Input triggers, interruption, loops, spring motion, media time and export fidelity also remain open.

## JSONL and history

A page begins with a versioned header at revision 0. Each later line is one complete accepted transaction with a transaction identity, actor identity, expected revision, resulting revision and operations. Initialization contains the original complete document. Later example operations set or remove a node override; extending the operation vocabulary requires designing the corresponding ownership and inverse behavior.

Acceptance requires `expectedRevision = currentRevision` and `revision = currentRevision + 1`, uniqueness of transaction identities, and atomic validation of all operations. A stale or invalid operation changes nothing. Rejected requests are not successful page transactions; their audit disposition needs separate design. Revision numbers are local ordering, not globally unique Git revisions.

Undo/redo appends new accepted transactions referencing the operation being reversed; it does not erase history. Drag previews can be transient overlays, followed by one accepted meaningful edit. The full inverse vocabulary, branching, cross-page undo, compaction, durable append/fsync, torn-write recovery and external-change reconciliation are not implemented or fully designed. A newline does not prove durable persistence. Checkpoints are derived and must identify their source revision and integrity binding.

## Tokens and dependencies

Both modes select the same repo-relative token sources and resolver context. A token reference contains source identity and token path; the manifest carries the selected revision. Watching files should invalidate dependent evaluations, with unsaved edits, invalid source, saved revision and rendered revision reported separately. A Git project is the sharing boundary, not a synchronization process.

The example token source provides duration, easing and distance. Tracks bind duration and easing; their keyframe distances are explicit literals. The distance token is a prospective recipe input, so changing it does not retarget these manual tracks. This is deliberately smaller than the requested DTCG exchange coverage. Alias cycles, pointer references, composites, extensions, collision handling, source-preserving edits and Resolver context precedence remain qualification obligations. The current CSS-oriented resolved token output is not an editable interchange authority.

Relative paths identify dependencies, but safe path resolution must also account for symlinks and filesystem boundaries. The schema rejects obvious traversal and absolute paths; it is not a filesystem sandbox. Opaque example revisions are not content hashes, signatures or attestation. Pinning, relocation, missing-dependency recovery and multi-file transaction custody remain open.

## Preview and prototype materialization

Preview may render an existing component via a declared adapter without creating source. A prototype plan selects the document revision, project revision, dependency revisions, roots or sequence, adapter identity, target, required capabilities and proposed output root. `fail-on-unsupported` is the only candidate capability policy. Write conflict policy is explicit; target source maps and admission checks must be designed before execution.

One node may lower to many runtime elements, and several nodes may lower to one. Mapping is maintained by the adapter, not inferred from names. Generated components persist through their upstream contracts; external definitions are read-only unless a supported source-edit mapping is declared. Editor-created servers and attached servers have distinct ownership. Save success and preview freshness remain separate states.

No prototype execution, source editing, server management, target admission or output guarantee is implemented by these schemas. The example's `example.web-dom` adapter identity is fictional and carries no current capability claim.

## Independently specified worked expectations

These are design oracles for future implementation, not observed runtime results:

- In the original example, `motion.slideDuration` is 1000 ms and `motion.slideDistance` is 100 px. A linear entry from -100 px to 0 evaluates to -60 px at 400 ms. At exactly 1000 ms, forwards fill yields 0 px. Scrubbing leaves the node's base translation at its profile default of 0 px.
- The profile's opacity is 1, the example definition's opacity is 0.8, and the exit scene overrides it to 0.6. Setting the node opacity to literal 0 and then removing that override restores 0.8 in the entry scene and retains 0.6 in the exit scene. The reset must not become `null` or copy either resolved number into the node.
- The second occurrence begins at sequence tick 1000 and samples scene-local ticks 0 through 1000. At sequence tick 1400 its linear exit is +40 px. The first scene's entry track is not evaluated for that occurrence.
- Changing duration from 1000 to 500 ms places normalized midpoint at 250 ms. Changing it to 1500 ms exceeds the example scene and must produce an explicit incompatibility.
- Renaming the instance preserves its track target. An unrelated second instance cannot receive that track through a component-name match.
- A request expecting revision 1 after revision 2 has been accepted is rejected without altering state. A crash while saving cannot make a partial line into an accepted revision.
- Storyboard and focused editing at the same revision produce the same semantic transaction for the same addressed edit. Panel collapse and playhead movement produce no authored transaction.

Source round-trip tests must recover authored values and references, not just equivalent pixels. Runtime probes must independently check sampled geometry, component state, source persistence, preview/export agreement and negative controls. Passing the paper verifier establishes none of those runtime results.
