---
doc_id: ARCH-ANALYTICAL-CAPABILITY-01
authority: architecture
status: active
title: Analytical capability and evidence contract
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - packages/ds-codegen/src/analytical/**
  - scripts/analytical-capability-audit/**
---

# Analytical capability and evidence contract

The analytical goal is stable, authored meaning whose lawful projections follow
from declared relations, evidence, tasks and target capabilities. A consumer must
not independently choose populations, aggregation, units, order or analytical
standing. Form names are downstream descriptions of satisfied constraints, not
inputs that authorize an analysis. The result may have zero, one or multiple
lawful projections; insufficient evidence is distinct from contradiction.

This document is the normative definition of milestones M1–M6 and their evidence
semantics. It contains no milestone completion ledger. The
[implementation snapshot](../current-implementation-snapshot.md) routes current
claims to scoped evidence; [the doctrine](analytical-relation-doctrine.md) owns
the algebraic principles and ratification conditions; CAWS specs record bounded
investigations and their outcomes. Sessions explain changes of question.
Roadmaps, resume instructions and historical progress remain machine-local under
`docs/internal/`, as required by [document governance](../document_governance.md).

## Milestones are acceptance bars

The milestone numbers describe claims, not a waterfall execution schedule. A
later consumer may falsify an earlier representation before either milestone is
complete. Choose the next investigation by its concrete counterexample and
expected information gain. State the facts it needs and their authority.

Keep analytical admission, projection admissibility and realization support
separate. An unimplemented lowerer does not prove that no lawful projection
exists. A successful output does not prove the analysis was lawful. Evidence for
one bounded family does not establish the whole milestone.

Stage-2 subtraction is a closure obligation over that experiment's frozen basis,
not ordinary repository admission. Later-stage coordinates do not reopen a
closed basis. Stage 2 gates its own ratification claim and investigations whose
correctness depends on an unresolved result. Consuming an explicitly declared
fact can support conditional preservation without establishing that fact's
primitive necessity. A dependency assessment must name that distinction; it must
not declare independence merely because a consumer does not import subtraction.
The executable boundary is in [subtraction.ts](../../packages/ds-codegen/src/analytical/subtraction.ts)
and [its tests](../../packages/ds-codegen/src/analytical/subtraction.test.ts).

## M1 — Canonical analytical meaning

An authored declaration enters through the canonical loader/schema, receives a
semantic judgment, and yields an explicitly typed result. Its bindings select
source populations. Missing evidence remains distinct from an explicitly empty
population; contradiction remains distinct from an unresolved premise. Result
facts describe the result, including its actual grain.

Proof requires the real entry path, a binding change with descriptive metadata
unchanged, invalid resolving keys, out-of-universe endpoints, missing versus
empty populations, and an actual downstream consumer using the result without a
second interpretation. M1 does not require all M2 candidate construction to be
finished. A codomain mismatch must be exposed, not hidden in metadata or coerced
into a convenient scalar aggregate.

## M2 — Derived lawful projections

Construct candidates from declared primitives and independently meaningful
constraints over admitted results, tasks and capabilities. Aliases are removable
without changing semantic membership. For a declared bounded universe, establish
both soundness and completeness; search exhaustion is not a proof of no lawful
projection. Distinguish zero, one, multiple and unproven results from unavailable
implementation support.

Proof names exact expected membership before evaluation. Remove a capability,
supply a missing premise, rename identifiers, remove aliases and add irrelevant
facts; observe the predicted changes and invariants. A singleton is earned by
excluding alternatives through constraints. A candidate that needs form-specific
input is a counterexample, not an invitation to add a form allowlist.

## M3 — Compositional and unfamiliar cases

Layer, facet and embed derive obligations from operands and combinator rules.
Legal parts do not automatically form a legal whole: shared scales, alignment,
population and order must hold where applicable. Stock, graphs, hierarchies,
binned distributions and OHLC pressure their actual distinctions.

Each admitted combinator needs a lawful case and its nearest unlawful or
unproven neighbour, a nested interaction, and an unfamiliar recombination whose
expected outcome predates adaptation to it. If a new fact is required, preserve
the predecessor failure, justify the addition and test another recombination.
Bounded composition does not establish Stage-2 ratification or the doctrine's
full analytical-normal-form bar. A named-composite exception is a finding about
the algebra, not evidence of general composition.

## M4 — Observable consumer preservation

The same admitted analysis drives a readback peer and a visual realization
through their actual loading/production paths. Selection determines output;
empty admissible-and-supported selection produces no output. Runtime rows need
conformance evidence for the declared claim. A table agreeing with a visual
emitter that shares its error is insufficient.

Proof independently observes geometry, values, bindings, standing and relevant
accessibility structure. Test the represented quantity itself: area for an area
claim, and visible mappings for a shared-scale claim. Change baseline, extent or
association while explanations remain unchanged and require detection. Missing
observations must fail observation. Keep semantic admission, toolchain acceptance
and runtime preservation distinct. A consumer that invents an upstream fact
exposes missing authority rather than earning a domain-specific rendering rule.

## M5 — Peer projections, loss and residue

Textual and navigational peers derive from the same authority and preserve the
identities, population, order, units, essential claims and reachable states
applicable to their scope. A summary declares its scope. Loss identifies an
actual unrecoverable fact; an absent property name alone is not measured loss.
Residue names realization mechanics such as wrapping or navigation affordances
that cannot introduce or negate analytical standing.

Proof changes declared population or sort and observes the relevant peers;
changes a residue-only setting and observes invariant analytical claims; and
routes baseline or aggregation through a purported style path and requires
rejection or proper classification. Independently inspect shared claims, actual
loss and non-empty residue. Do not count lost identity as harmless residue or
require a fictitious loss merely to populate a report. A peer needing a second
authored interpretation exposes an incomplete shared authority. Together with
the preceding obligations, this establishes the doctrine's functionally complete
projection-system bar.

## M6 — Hostile non-DOM realization

The same analytical IR reaches an actual non-DOM consumer. Target differences
enter through capabilities and lowering mechanics, not target-specific analysis
or relation-name branches. Removing a capability changes the appropriate
admissibility/support disposition; unsupported output must not silently become a
different analysis. Another DOM framework alone does not satisfy this bar.

Proof executes the target consumer, including a capability-losing case and a
still-supported case, compares analytical claims and identifies genuine residue.
Descriptors and mocked target APIs do not suffice. If the target requires a
different analysis, narrow the thesis or justify a shared fact with its recorded
counterexample. With the earlier obligations met this completes the named FSDS
substrate experiment, not a universal theorem about compositional systems.

## Evidence and outcomes

Precommit the claim, nearest counterexample and informative versus status-changing
outcomes. Retain input, source revision, produced bytes, raw observations and
sensitivity controls. Positive evidence, negative findings and inconclusive runs
have different meanings. An attribution digest is not a correctness certificate.

| CAWS record | Permitted interpretation |
|---|---|
| Completed with passed evidence for every required criterion | Recorded completion; inspect evidence, scope and revision before claiming delivery |
| Abandoned with a waived/refused criterion | Inspect the reason for the specific negative result or unfinished obligation; no delivered-capability inference |
| Superseded | Historical record; follow the stated successor and its evidence, without double-counting |
| Active, missing evidence, failed or unchecked criteria | No completion inference; retain the named unresolved obligations |
| Closed without adequate evidence | Closure alone supplies no capability proof |

The read-only [outcome audit](../../scripts/analytical-capability-audit/README.md)
reports these distinctions. It neither executes evidence commands nor records
acceptance. CAWS evidence remains the bounded slice record, and the snapshot
remains the current-status routing surface. None of these artifacts becomes a
second definition of analytical meaning.
