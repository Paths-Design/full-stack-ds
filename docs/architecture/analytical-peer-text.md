---
doc_id: ARCH-ANALYTICAL-PEER-TEXT-01
authority: architecture
status: active
title: Bounded analytical textual peer
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - packages/ds-codegen/src/analytical/peer-text-probe.ts
  - scripts/analytical-peer-probe/
---

# Bounded analytical textual peer

The experimental text consumer derives scoped statements from the same minted
selected carrier as [readback and metric output](analytical-composite-output.md).
It earns a bounded contribution to the [M5 acceptance bar](analytical-capability-contract.md#m5--peer-projections-loss-and-residue).
It is not registered as a production format and does not establish M5 as a whole.

## Meaning and support

`producePeerText` receives a composite selection, selects readback from its
existing program, and lowers that minted selection. Raw declarations and source
populations never enter the consumer. Qualified datasets, retained composition,
range membership and facet panels come from the carried result. Text generation
does not qualify rows, bind operations or judge the composition again.

The consumer writes bounded member statements under retained layers, with
enclosing facet and embed context. Each statement identifies its dataset, view
path, typed grain, facet panels, field, value, common declared unit and named
endpoints. Dataset standing and host task identity are separate statements.
Host operations and comparison tasks are explicitly **not realized** by this
summary. No metric geometry or host aggregate is inferred from the text.

Missing required carried facts or unsupported formatting returns a format-specific
`unsupported` disposition with the lawful readback still available. Refused,
unproven and explicitly empty upstream inputs retain their distinct dispositions
and produce no successful peer. The selection mint check remains in force.

## Loss and presentation residue

The loss inventory covers carried observation values and unsupported host tasks;
it is not a complete inventory of every declaration, judgment or carrier metadata
field. An omitted value is identified by dataset, typed grain and field, without
silently including its value elsewhere in the artifact. Selected members and
their endpoints remain visible. Host task identity remains visible even though
its operation is not performed.

The executable witness uses two qualified snapshots of `samples` with the same
typed keys, including numeric `1` and string `"1"`. An embed contains a facet and
a shared layer; view `a` belongs to `d0` and view `b` to `d1`. In this witness the
summary loses eight observation values: `b` and `note` in each `d0` row, and `a`
and `note` in each `d1` row. The test changes each omitted value independently
and obtains an identical complete output artifact. Those collisions establish
actual unrecoverability for the named cases, rather than inferring loss from an
absent property name.

Line versus paragraph spacing and traversal of unordered supplied observations
are presentation residue. Both change the text while preserving independently
observed analytical facts. Declared analytical sort is outside this probe; row
permutation is not evidence of sort preservation. A request to put a baseline
change through the layout argument is unsupported.

## Evidence and falsifiers

Run from the repository root:

```sh
node scripts/analytical-peer-probe/run-proof.mjs
```

The command freshly compiles codegen, runs the Node tests, executes the compiled
consumer on baseline and changed inputs, and retains output bytes and independent
observations under ignored `tmp/analytical-peer-proof/`. Its receipt names the
revision, dirty state, source and compiled hashes, selected-output identity and
separate `peerTextBasis` consumer identity. Digests establish attribution only.
Consumer changes do not restamp selected meaning or the frozen Stage-2 basis.

The [fixture](../../scripts/analytical-peer-probe/fixture.mjs) exercises real
qualification, operation binding, composition selection and lowering. Expected
facts in [the tests](../../scripts/analytical-peer-probe/proof.test.mjs) were
committed before the consumer. The [observer](../../scripts/analytical-peer-probe/observe.mjs)
parses only output text and imports none of the producer, fixture or analytical
evaluator. Its facts must match the fixed expectations. It is a bounded evidence
reader, not a general text admission system or independent semantic judge.

The proof distinguishes these nearest counterexamples:

- Swapping dataset, view, typed key, range endpoint or host task preserves the
  numeric total while violating the expected association.
- Missing standing or task statements and nonfinite values fail observation.
- Changed selected values or population change the observed claims; formatting
  and unordered row permutation preserve those claims.
- Mutating source after selection or the returned output cannot revise custody.
- A separately executed compiled consumer with every record bound to `d0` fails
  the baseline identity assertion. The runner restores the compiled bytes in a
  `finally` block and requires that specific assertion failure.

These controls support the named claims, not a general mutation score. The
browser proof and its renderer/import controls remain a separate evidence lane.
This local probe is not an additional CI browser gate.

## Contribution and dependency boundary

The named witness needs no second authored interpretation or new upstream fact.
It preserves the scoped identities and bounded claims, measures specific loss,
and demonstrates nonempty presentation residue. It therefore contributes bounded
textual-peer evidence without a new M3 carrier defect in this case. It establishes
neither general composition, complete carrier recovery, navigational state or
accessibility behavior, aggregation realization, whole-system M4, complete M5,
nor hostile non-DOM M6 transfer.

Declared bound incidence and supplied population are used conditionally as carried
facts. This does not depend on proving their primitive necessity under Stage-2
subtraction. `REL-VIEW-ALGEBRA-01` remains parallel research debt; its frozen-basis
closure gate is unchanged and has not become an ordinary admission prerequisite.
The bounded slice and its evidence are recorded by `REL-PEER-TEXT-RESIDUE-PROBE-01`;
current capability status belongs in the [snapshot](../current-implementation-snapshot.md).
