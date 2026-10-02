---
doc_id: ARCH-SHARED-DOCUMENT-PAPER-001
authority: architecture
status: draft
title: Shared Designer and Animator document model
owner: "@darianrosebrook"
updated: 2026-10-02
governs:
  - packages/ds-contracts/document-model/
  - docs/architecture/design/shared-document-model/
---

# Shared Designer and Animator document model

This is a proposed paper model, not an implemented editor or a ratified interchange standard. It describes authored meaning before a canvas UI, renderer, host, or code target is selected. The schemas qualify original examples against a deliberately small candidate vocabulary; they do not enter component discovery, code generation, token builds, CI admission, or runtime evaluation.

Read [visual authoring](visual-authoring.md), [Button-to-Banner expected states](visual-authoring-expectations.md), [handoff crosswalk and named obligations](handoff-crosswalk.md), then [relationships and semantics](relationships.md), [composition authoring](authoring.md), [worked expectations](worked-expectations.md), then [design coverage](design-coverage.md). The machine-readable [design ledger](../../../../packages/ds-contracts/document-model/design-ledger.json) records what has and has not received a design. Its statuses describe design coverage, schema coverage, and runtime evidence separately. A schema-shaped record does not settle an open semantic decision.

## Confirmed product direction

- Designer supports broad freeform product design; Animator supports animation and compositing over the same editable objects.
- Component contracts describe reusable component semantics. Documents describe compositions, placed instances, pages, assets, and motion; they are a separate contract family.
- A scratch workspace page has a readable JSONL history. Shared dependencies belong to the Git project. Designer and Animator resolve the same authored token sources in that checkout.
- Creating a canvas object does not create a code counterpart. Prototype materialization is an explicit selection with an identified document revision, target, dependency context, and output ownership.
- Smart defaults remain referenced and inspectable. A local override changes its addressed use; clearing it restores resolution rather than copying a resolved value.
- Animator has a storyboard overview and a focused scene view. Both can add elements. Advanced timeline editing lives in the focused view's collapsible, resizable lower panel. Scene arrangement on the storyboard is independent of sequence time.
- Human and agent operations share edit ownership, revision checks, validation, and history boundaries.
- The representation aims to be inspectable, auditable, portable, and independent of a paid hosted service.

## Candidate files and authority

| File | Owns | Does not own |
|---|---|---|
| Project manifest | Page discovery, explicit dependency sources and selected revisions, token context, timebase | Component implementation, runtime readiness, Git synchronization |
| Page JSONL | Accepted authored transactions for one scratch workspace page | Pointer samples, measurements, arbitrary source edits, generated code |
| Reduced document state | Nodes, scenes, tracks, sequences, annotations at a revision | Independent authority when cached as a checkpoint |
| Default profile / reusable definition | Defaults and supported addresses for its declared kind/version | Every instance's local decisions |
| Token source | Typed source values, references, groups and metadata | Flattened renderer-specific substitutes |
| Prototype plan | Explicit selected revision/roots/target/dependencies/output intent | Automatic writes caused by canvas creation |
| Editor session state | Selection, viewport, focused scene, playhead, timeline panel size | Authored document meaning |
| Design coverage ledger | Requirement identities, design dispositions, missing decisions and proof obligations | Claims that schemas implement an editor |

The JSONL is authoritative for page edits. The manifest's dependency selection is authoritative for interpretation, so a page revision alone cannot reproduce a render: its project/dependency context must also be identified. Multi-file atomic saves and dependency snapshot custody remain open. Do not claim that a Git commit alone solves these concerns.

## Candidate schemas and examples

The [schema directory](../../../../packages/ds-contracts/document-model/) contains `common`, `project`, `default-profile`, `definition`, `visual-node`, `motion`, `edit-operation`, `document`, `page-record`, `prototype-plan`, `paper-expectations`, `appearance`, `authoring-token`, `definition-source`, `extraction-correspondence`, `project-change`, `visual-expectations`, and `design-ledger` schemas using JSON Schema Draft 2020-12. Version `0.3.0` identifies this candidate, not a supported migration policy. Objects reject unknown core fields; future extensions require a deliberate versioned contract.

The [project example](../../../../packages/ds-contracts/document-model/examples/project.json) selects original token and default-profile files. The [document example](../../../../packages/ds-contracts/document-model/examples/document.json) contains two composition-owned frames, two independent Button instances sharing one definition, local arrow content, scene-local translation and visibility tracks, and two occurrences separated by an explicit cut. It has no generated-source address.

The [page log](../../../../packages/ds-contracts/document-model/examples/page.jsonl) describes initialization, addressed base/key edits, slot supply/reset, insertion and compensating undo/redo as proposed accepted transactions. The [prototype plan](../../../../packages/ds-contracts/document-model/examples/prototype-plan.json) selects a prospective adapter and output directory. Neither example performs persistence or starts an adapter. The component dependency is an original definition interface, not a working component package. The [visual-authoring examples](../../../../packages/ds-contracts/document-model/examples/visual-authoring/) add original Button/Banner bodies, source placements, scoped tokens, proposed project changes and independent state tables. Old 0.1.0 and 0.2.0 examples remain in Git; the current draft does not migrate or reinterpret them.

Run from the repository root:

```sh
node packages/ds-contracts/document-model/verify.mjs
pnpm run docs:check-claims
pnpm run docs:check-links
```

The verifier compiles schemas, validates original examples, and checks declared invalid neighbors. It also checks bounded original-fixture graph/revision/eligibility custody separately from schema validation. It does not replay transactions, resolve tokens, provide general graph admission, evaluate motion/layout, or execute prototype plans. Those omissions have explicit ledger entries and independent worked expectations in the semantics document.

## Foundation and prior art

The authorized input is the sibling Paths `apps/designer-animator-rewrite-handoff` specification plus the user's clarified document, defaults, storyboard, and shared-token requirements. No old application implementation, Figma dump, supplied image, or third-party fixture is included here.

RC's method informs the separation of design narrative, canonical data, composition, and a bounded runtime consumption contract. Its game entities and engine schemas are not transferred. FSDS contributes [component design bindings](../component-design-bindings.md), [box defaults](../box-model-primitive.md), and existing contract/IR/target boundaries, whose current implementation claims remain in the [snapshot](../../../current-implementation-snapshot.md).

Existing token, scene, timeline, and UI interchange formats offer adjacent vocabulary. This slice adopts no claim that one already covers the entire editor document, and no new standard status. Token source exchange must qualify the declared DTCG profile separately; the small token example here is not a conformance suite.
