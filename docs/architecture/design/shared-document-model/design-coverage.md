---
doc_id: ARCH-SHARED-DOCUMENT-COVERAGE-001
authority: architecture
status: draft
title: Shared document design coverage and unresolved obligations
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - packages/ds-contracts/document-model/design-ledger.json
---

# Design coverage and unresolved obligations

The [machine ledger](../../../../packages/ds-contracts/document-model/design-ledger.json) is the maintained record. This document defines its interpretation and update rules, rather than duplicating its individual statuses.

Every record has a stable requirement ID, requirement text, design coverage, schema coverage, runtime status, relationships, decision references, remaining design work, and proof obligations. `specified` means this paper draft gives the requirement's semantics; it does not mean the user has ratified them. `partial` means the stated subset has a design and the missing portion is named. `open` means no sufficient design exists. `deferred` is an explicit sequencing choice, not fulfillment or removal of the requirement.

Schema coverage is `represented`, `partial`, or `absent`. Runtime status starts at `not-implemented`; future entries may use `implemented-unverified` or `bounded-evidence`, but must name implementation/evidence references. Evidence is scoped: a supported web translation track cannot close native motion, media compositing or arbitrary components.

An append-only `changes` array records meaningful design transitions with date, requirement ID, old/new coverage and rationale. Initial creation records are included. This is a manually maintained design history, not a tamper-proof audit log. Git review preserves the authored ledger; the future page transaction log serves a different purpose.

## Coverage families

The ledger includes identity and graph ownership; reusable definitions and instances; smart defaults and typed bindings; project-shared tokens; workspace pages versus application pages; frames/scenes/sequences/occurrences/transitions; base versus evaluated motion; storyboard/focused editor views; JSONL/history/recovery; explicit preview/prototype materialization; real component adapters and source mapping; vector/text/layout; paint/effects; media/compositing; accessibility/interactions; dependencies/library updates; interchange/migrations; human/agent parity; and import provenance.

Broad freeform and compositing requirements remain present even when the first schemas only carry rectangle/text/frame and simple tracks. Unsupported candidates cannot be counted as fulfilled through arbitrary metadata bags.

## How to maintain it

1. Add or refine a stable requirement before changing its representation. Splitting a requirement preserves lineage in the change rationale.
2. Put semantic decisions in [relationships](relationships.md) or a dedicated successor design document. Reference those decisions from the record.
3. Update schema coverage only when its example has a qualifying check. Keep cross-reference, unit compatibility and runtime validation obligations explicit where JSON Schema cannot express them.
4. Record the previous and new design coverage in `changes`. Update the ledger's date in the same source commit.
5. Promote runtime status only against inspected implementation and bounded evidence. A future implementation spec closing does not automatically close the product requirement.
6. Run the paper verifier and doc checks. Review any ledger transition as a meaning change, not a routine refresh of counts.

## First unresolved design dependencies

Before a persisted editing implementation: graph/deletion rules, complete mutation/inverse vocabulary, transaction durability and external-change reconciliation.

Before a useful real-component preview: definition/property capability mapping, runtime provider context, rendered revision reporting, and isolation of distinct instances and simultaneous scene evaluations.

Before motion/code output: exact coordinate/layout semantics, conflict and interruption policy, target source maps, dependency custody, and preview/export agreement. The explicit cut example avoids deciding cross-scene correspondence prematurely.

Before broader design/compositing authoring: structured paint and vector geometry, text shaping/fonts, media/source time, masks/effect order, accessibility and interaction intent. These are product design obligations rather than assumptions a renderer may invent.
