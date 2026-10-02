---
doc_id: ARCH-VISUAL-AUTHORING-CROSSWALK-003
authority: architecture
status: draft
title: Handoff traceability and named unresolved obligations
owner: "@darianrosebrook"
updated: 2026-10-02
governs:
  - packages/ds-contracts/document-model/design-ledger.json
---

# Handoff traceability and named unresolved obligations

The retained Paths handoff describes the broader product. The original Button-to-Banner workflow specifies one bounded authoring path within it; neither replaces the other. The [machine ledger](../../../../packages/ds-contracts/document-model/design-ledger.json) carries stable requirement identities, lineage, blocking relationships and a crosswalk with owned decision/schema/example references. Its `handoff.N` entries refer to the retained acceptance scenario numbers; `workflow.N` entries refer to the user's sixteen steps. Coverage is paper design, never fulfillment through runtime execution.

## Handoff scenario crosswalk

| Scenario | Ledger families | Bounded contribution / remaining design |
|---|---|---|
| handoff.1 | creation, vector-text, identity, font-resolution-and-shaping | Frame/text creation described; vectors, grouping, actual fonts and reopen remain open |
| handoff.2 | definitions, layout, property-consumers | Independent instances and explicit root consumers; responsive layout and runtime isolation remain open |
| handoff.3 | tokens, token-scope-evolution, project-change | Typed refs and eligibility metadata; full DTCG Format 2025.10 exchange, Resolver support/context policy and collision review remain open |
| handoff.4 | base-motion, property-keys, interruption | Composition-backed starts, selected-key edits and terminal hold; trigger/reversal/output agreement remain open |
| handoff.5 | identity, general-extraction-reference-repair | Stable placements and bounded extraction mapping; duplication/reparent/world-coordinate repair remain open |
| handoff.6 | paint-effects, property-consumers | Solid color paints only; procedural effects and parameter motion remain open |
| handoff.7 | media, preview-output-agreement | Scene/occurrence vocabulary only; media source time, masks, audio and render settings remain open |
| handoff.8 | dependencies, component-extraction, history | Preserve nested definition refs and local overrides; reusable clips, update migration and inverse execution remain open |
| handoff.9 | adapters, source-persistence, definition-source-adapter | Ownership and revision boundaries; real-project render/save/discard/rebuild/reopen remain open |
| handoff.10 | source-persistence, definition-source-adapter | Generated source remains downstream; upstream mapping and repeated-generation witness remain open |
| handoff.11 | history, history-recovery, project-change-durability | Proposed meaningful gestures/inverse custody; durable storage, crash recovery and external reconciliation remain open |
| handoff.12 | agent-parity, property-consumers, project-change | Shared supported addresses; actual UI/agent admission, permission, locks and transport remain open |

The crosswalk's example references are inputs or partial expectations relevant to the scenario, not evidence that every scenario is implemented. The handoff's broad compositing remit and owned Designer visual direction remain retained. Interface obligations include mixed selection, missing dependencies, read-only states, unsaved previews, stale revisions, save failure and keyboard/focus access; `design.views` must not close until these have dedicated designs. Auto-key, media, nested motion and richer outputs do not become optional because this fixture omits them.

## Named unknowns and blocking edges

| Concept | Stable requirement ID | Blocks | Disposition |
|---|---|---|---|
| FontResolutionAndShaping | design.font-resolution-and-shaping | vector-text, layout | Open: fonts, fallback, shaping, wrapping and measured geometry |
| CanvasHitTestingAndSnapping | design.canvas-hit-testing-and-snapping | creation, views | Partial: known parent/document coordinates; overlap, snapping and locked/rotated hit tests open |
| DefinitionInterfaceExposure | design.definition-interface-exposure | definitions, property-consumers | Open: intentional promotion into public props/slots; no automatic label parameter |
| GeneralExtractionReferenceRepair | design.general-extraction-reference-repair | component-extraction, identity | Open: animation, outside/cross-page references, arbitrary graphs |
| AdvancedLayoutResolution | design.advanced-layout-resolution | layout | Open: constraints, wrapping, overflow, responsive sizing and relative units |
| TokenScopeEvolution | design.token-scope-evolution | tokens | Partial: initial role/kind eligibility; later migration, foreign metadata and scope versions open |
| ProjectChangeDurability | design.project-change-durability | project-change, history-recovery | Open: coordinated journals, durable commit, crash/external recovery |
| DefinitionSourceAdapter | design.definition-source-adapter | adapters, source-persistence | Open: real FSDS/external upstream ownership and authored mappings |
| PreviewAndOutputAgreement | design.preview-output-agreement | prototype, media, interruption | Open: independent render/output/source fidelity witnesses |

`blocks` is a requirement dependency, not a declaration that every bounded subcase is impossible before the whole topic closes. Every named obligation retains explicit remaining work and a future proof obligation. No arbitrary metadata bag or silent renderer decision substitutes for those designs.

## History lineage and delivery boundary

The stable `design.history-recovery` predecessor now retains recovery/durable-storage obligations; new `design.history` records the partial edit/inverse semantics already described in 0.2.0 and extended here. Both histories stay in the append-only changes list, including the split rationale. Schema links and proposed compensation do not establish an inverse executor or crash-safe history.

The [workflow states](visual-authoring-expectations.md) map all user steps, including session-only text selection/provisional creation and the separate source transactions inside tokenization/componentization. Definition placements, instance addresses and source revisions remain separate. Runtime status stays `not-implemented` throughout the ledger.

Next work keeps the approved dependency order: general graph edits/reference repair; replay/durable saves/dependency revisions; layout/motion recipes/conflicts/transitions/interruption; real-project adapters/source agreement; richer text/vector/paint/effect/media composition. This paper slice names their missing interfaces without implementing them.
