---
doc_id: ADR-0001
authority: adr
status: active
title: "ADR 0001: structural freeze doctrine — freeze what must remain deliberate, measure what is expected to grow, freeze nothing before a release candidate"
owner: "@darianrosebrook"
updated: 2026-11-05
supersedes: null
# Declared governance role: this ADR governs the ADMISSIBILITY of freeze-shaped
# gates — whether a given ledger/ratchet/frozen expectation may be wired as
# blocking — NOT the content of the contracts those gates classify. Contract
# content authority stays with the contracts themselves and their schemas.
default_governance_role: implementation_constraint
governs:
  # The surfaces where freeze-shaped assertions empirically live in FSDS.
  # Grown, not closed: as new pin-shaped gates appear in new trees, they are
  # added here — and this list must never itself be pinned by a test that
  # enumerates its exact members.
  - packages/ds-tokens                 # token source, usage baseline, consumption ledgers
  - packages/ds-contracts              # closed vocabularies that ARE legitimately frozen (schemas)
  - packages/ds-codegen/src/analytical # frozen answer key, rule digest, necessity census
  - packages/ds-codegen/src/highlight  # golden token-stream fixtures
  - packages/ds-codegen/src/markdown   # golden tree fixtures
  - packages/ds-codegen/src/validation # contrast ledgers + known-gaps files
  - scripts                            # the derived-obligation audit family
---
# Structural Freeze Doctrine

Governance scope: every ledger ratchet, frozen expectation file, golden
fixture, count floor, and "known-*" gaps file in this repository, and every
future gate that reaches for freeze vocabulary. This ADR is the FSDS
adaptation of the doctrine proven in sterling
(`docs/architecture/adr/0051-structural-freeze-doctrine.md` in that repo); the
adaptation adds two rules sterling did not need — the release-candidate gate
(§2) and the void-hazard rule (§3) — because FSDS is a pre-release design
system whose primary contributors are agents, and agents respond to gates
differently than humans do.

## Purpose

A freeze is a governance instrument for making contract evolution deliberate.
It is not a mechanism for preserving whatever happens to exist today.

A valid freeze protects a structural invariant whose silent evolution could
widen authority, weaken evidence, break identity across targets, alter
compatibility, or change the meaning of a public seam. An invalid freeze
snapshots an open-ended inventory — the current population of an evolving
system — and then treats legitimate growth as contract failure.

The governing distinction:

> Freeze what must remain deliberate. Measure what is expected to grow.
> And freeze nothing that has not settled.

## 1. The two classes of pin

### 1.1 Structural freeze (admissible pre-RC, selectively)

A structural freeze guards the shape or identity basis of a governed
contract. FSDS examples: the closed token-kind enum in a component contract
(design authority expressed AS closedness); the contract schema itself; the
cross-framework token-stream identity fixtures (five generated packages must
produce identical streams from a byte-identical runtime); WCAG contrast pairs
(an external correctness contract, not taste).

A structural freeze is legitimate when an unreviewed addition, removal,
rename, reorder, or default would change what the system is allowed to mean
or prove.

A realization ledger is **not** on this list, and the distinction is the whole
point of §1.2. "Every contract-declared-vs-realized obligation" sounds
structural because each row names a contract obligation — but the ledger's
frozen content is the current *population* of unrealized rows, which grows
whenever a component is added and shrinks whenever a carrier is written. Both
directions fail the gate. A ledger that fires because the corpus grew is
classifying growth as breakage, and no amount of per-row contract vocabulary
converts that into an identity claim. Measure realization; do not freeze it
before RC.

The expected response to a structural-freeze failure is not "refresh the
snapshot." The response is: determine whether the change is intentional;
identify the governing authority; update the implementation and the freeze in
the same bounded slice; record why the new or removed member belongs; prove
the invariant still holds. The freeze is discharged by reasoning, not by
copying the new observed value.

### 1.2 Population pin (inadmissible as blocking, at any stage)

A population pin freezes the current members of a set that is naturally
expected to evolve. FSDS examples: which tokens are currently consumed; which
semantic namespaces currently have consumers; the count of unused tokens;
component admission lists read as inventories rather than decision records.

These pins fail when development succeeds. Their routine repair — append the
member, regenerate the snapshot, re-baseline — trains contributors and agents
to stop investigating the diff. A growing set may still be MEASURED,
enumerated, or reported. It must not be represented as closed unless
closedness is itself the governed claim (as it is for contract enums).

## 2. The release-candidate gate (FSDS addition)

Sterling's doctrine admits a structural freeze whenever its review tests
pass. FSDS is pre-release, and pre-release surfaces are moving surfaces:
palettes get redirected, vocabularies grow ahead of consumers, repairs orphan
namespaces on purpose. Freezing the STATE of a moving surface converts every
legitimate redirection into a fight with the tooling, and agents — the
primary contributors here — resolve that fight in whichever direction the
gate makes cheapest (§3).

Therefore, in FSDS, freeze-class gates are admitted in two tiers:

- **Correctness invariants** (§1.1 surfaces protecting identity, resolvability,
  external contracts like WCAG, or cross-target equality) are admissible
  pre-RC. They gate what the system means, not what it currently contains.
- **State freezes** — anything whose frozen content is the current population
  of an evolving relationship (consumption membership, usage counts, admitted
  inventory as inventory) — are **not admissible until FSDS has a release
  candidate**.

FSDS is release-candidate when the owner declares an RC marker (a version tag
or recorded RC commit) AND a written release schedule exists naming the
planned release date. That boundary — not audit-introduction time, not
"the corpus looks stable" time — is when state freezes may be wired blocking.
The flip itself is a governed slice: re-derive the baseline once at RC (the
one sanctioned wholesale refresh), wire it, and record the decision.

Before the boundary, state-freeze gates run **report-only**: the measurement
ships, the matrix generates, the committed ledger is retained as the future
RC baseline, but nothing fails CI or pre-push. Report-only is not absent —
the observability that would have caught the stale `color.syntax` duplicate
survives; only the deletion pressure (§3) is removed.

## 3. The void-hazard rule (FSDS addition)

Design tokens are a palette and a semantic vocabulary to pull from. A token
that exists but is unconsumed is inventory — fine. What is NOT fine is an
agent inventing a token because the system "never provided something for that
use case," or because the thing that provided it was ripped out by a gate
whose cheapest discharge was deletion.

Deletion of vocabulary removes design authority. The next contributor who
needs that decision surface finds a void and fills it arbitrarily —
`hover-subtle`, `hover-heavy`, `hover-inverted` — exactly the proliferation a
group-decided, fixed vocabulary exists to prevent. Vocabulary shape is a
family decision; a gate must not un-make it one dead-namespace ledger entry at
a time.

Therefore: **a gate is inadmissible if its cheapest discharge is deletion.**
When a gate fires on unconsumed vocabulary, the sanctioned paths must be (in
order of increasing friction): consume it, keep it (do nothing — the gate was
wrong to fire), or record it as a deliberate family decision. "Delete it so
the gate goes green" must never be the path a time-pressed agent reaches for
first. Concretely: any future state-freeze gate re-enabled at RC must make
its keep/ledger path cheaper than its delete path, or it does not ship.

## 4. The rationale-bearing requirement

A structural freeze must state why each protected element exists. A bare
tuple, hash, snapshot, or golden file is insufficient when its only message
is "the code changed." The pin's value is the explanation it forces, not the
literal enumeration. FSDS application: golden fixtures carry their doctrine
in the fixture file header (regenerate, audit, freeze — never hand-edit);
contract enums carry design authority in the contract itself; ledgers carry
per-entry `spec` + `note`. A freeze that cannot say what authority its
members serve has insufficient standing and must be reconstructed or
retired.

## 5. Freeze placement

Place a freeze at the earliest boundary where structural drift becomes
authority-bearing. Do not freeze a downstream rendering when the real
contract is an upstream typed seam. FSDS application: component semantics
freeze at the CONTRACT; generated framework trees are projections and are
drift-gated (regenerate-and-compare), not hand-frozen; token semantics freeze
at the token source, not at any one package's emitted CSS.

## 6. Decision vocabulary

Every freeze review terminates in exactly one disposition:

- `KEEP_STRUCTURAL_FREEZE` — protects identity, an external contract, or a
  closed semantic vocabulary; stays blocking.
- `DEMOTE_TO_REPORT_ONLY_UNTIL_RC` — a state freeze wired before the §2
  boundary; measurement retained, blocking posture removed, ledger kept as
  the RC baseline.
- `LOOSEN_TO_INVARIANT` — freezes the current population of an open set;
  replace with a property that survives legitimate growth.
- `DELIBERATE_CONTRACT_EVOLUTION` — the protected structure is intentionally
  changing; implementation and freeze update together, atomically.
- `RETIRE_STALE_FREEZE` — the frozen structure no longer owns a live
  boundary.
- `BLOCKED_BY_UNGROUNDED_RATIONALE` — no authoritative rationale explains the
  freeze; do not loosen or extend until reconstructed.

## 7. Review tests

A proposed blocking freeze is valid only when all of the following have
acceptable answers (1, 2, 4, 5, 11, 12 are disqualifying on "no"):

1. What exact invariant does it protect?
2. Why would silent change be dangerous?
3. Is the frozen object structurally closed, or naturally expected to grow?
4. Does the freeze live at the authority-owning boundary?
5. Can a contributor discharge it only by explaining the semantic change?
6. Would blindly regenerating the expected value defeat the test?
7. Does each frozen member carry a rationale or traceable authority source?
8. Are additions and removals both detected?
9. Is the failure about what the system MEANS, or about what it currently
   CONTAINS?
10. Does the freeze avoid becoming a second authority over generated data?
11. If it fires on unconsumed vocabulary, is deletion the cheapest discharge?
    (If yes: inadmissible — §3.)
12. Is the surface it guards settled (post-RC) or moving (pre-RC)? (A state
    freeze on a moving surface: inadmissible — §2.)

## 8. Anti-patterns

- **Reflexive re-pin.** Observed value changes; expected value replaced
  without reading the semantic diff. Prohibited.
- **Success-hostile ledger.** New legitimate vocabulary fails solely because
  current consumption was frozen. Replace with an admission invariant or
  report-only.
- **Deletion-biased escape hatch.** A gate offers "fix the finding" whose
  mechanical form is deleting vocabulary, next to a high-friction
  ledger-with-spec path. Agents take the cheap path; the system loses its
  decision surface (§3). This is the anti-pattern the token-consumption
  audit instantiated and this ADR retires.
- **Cross-slice contamination.** A population ledger keyed on the whole corpus
  fires inside *every* concurrently-active slice the moment any one of them
  grows the corpus. The agent who trips it did not cause it and cannot
  discharge it within its own scope, so it either ledgers a stranger's rows
  under its own spec or misreads the block as damage to its own work. Both
  happened when NavTree landed (three slices affected). A gate whose failure
  is not attributable to the change that triggered it is inadmissible
  regardless of stage.
- **Snapshot as authority.** A generated snapshot becomes the only place
  defining the contract. The owner remains the typed schema or contract.
- **Freeze below the real seam.** Freezing a generated tree by hand instead
  of the contract that generates it.
- **Agent-revert-to-green.** A freeze so painful that an agent abandons a
  legitimate improvement to satisfy it. If the discharge path (regenerate,
  re-derive, ledger) is more expensive than reverting, the freeze trains the
  wrong behavior even when its class is correct.

## 9. Precedent (FSDS)

**Good structural freeze — the token-kind enum.** `CodeBlockTokenType` in the
CodeBlock contract is a closed vocabulary frozen at the contract. Adding a
kind is a deliberate, visible design decision at the authority-owning
boundary. Review tests 1, 2, 4, 5 all pass by construction.

**Good structural freeze with a mandated discharge — the golden stream
fixtures.** The four-language golden fixtures freeze cross-framework
token-stream identity: five packages shipping a byte-identical tokenizer must
produce these exact streams. Legitimate growth (grammar improvement) changes
streams; the sanctioned discharge is regenerate-audit-freeze in the same
slice as the grammar change — the doctrine is written into the fixture file
itself. Honest weakness (review test 6): a blind regen would carry a
regression through all five packages; the audit step in the fixture doctrine
is the mitigation, and this ADR keeps that mandate load-bearing.

**Bad population pin — twice.** The count-based usage gate (demoted to
report-only by `RAIL-TOKEN-REFERENCE-RESOLVABILITY-01`: gating on reference
count "makes a stated purpose of the vocabulary layer fail the build") was
re-introduced in stricter form by `RAIL-TOKEN-CONSUMPTION-AUDIT-01` (landed
2026-08-17): a blocking, shrink-only, per-entry dead-namespace ledger whose
failure message offered deletion as the mechanical fix. The owner pushback
that generated this ADR named both failure modes — growth fights the tooling;
deletion-biased discharge carves voids that agents fill with ad-hoc tokens.
Disposition: `DEMOTE_TO_REPORT_ONLY_UNTIL_RC`, applied by
`DOC-STRUCTURAL-FREEZE-DOCTRINE-01` the same day it landed. The measurement
(the scanner, the matrix, the seeded ledger) survives as the RC baseline; the
blocking posture does not survive the pre-RC boundary.

**Deletion that was justified — and the line that makes it so.** The stale
pre-repair `color.syntax.*` namespace was deleted
(`FIX-TOKENS-STALE-SYNTAX-NAMESPACE-01`) — legitimately, because it was a
DUPLICATE whose consumer had been re-pointed at the repaired
`foreground.syntax.*`, not merely because it was unconsumed. The
counterfactual is the lesson: under a deletion-biased gate, the same pressure
applies to live, non-duplicate vocabulary. Non-consumption alone is never a
deletion reason in FSDS; duplication, supersession, or an explicit family
decision is.

**A removal-shaped gate that is admissible anyway — the analytical necessity
census.** `necessity.test.ts` refuses a kernel coordinate carrying no
necessity witness, and its cheaper discharge is removal (record it in
`removals.json`) rather than the harder one (find a witness). By the letter of
§3 that reads as a deletion-biased gate. It is admissible, and the reason
generalizes: §3 protects *vocabulary*, and this gate cannot reach vocabulary.
What it removes is an encoding **coordinate** — a degree of freedom in how a
thing is written down, not a thing the system can name — and
`REL-VIEW-ALGEBRA-01` made that separation structural rather than cultural:
coordinate verdicts are keyed by coordinate id, constructor dispositions by
operator name, and the gate reads only the former, so no unwitnessed
coordinate can retire an operator. Two mitigations keep removal reasoned
rather than cheap: it must name the authority that fails to require the
distinction, and it carries a re-earning stage, so absence is re-earnable
rather than final. The generalization worth keeping: a gate whose *intended*
outcome is removal is not a void hazard; a gate that measures presence and can
be evaded by deleting the measured thing is.

**A population pin caught before it shipped — the stage-2 subtraction gate.**
Its first form asserted that every *live* kernel coordinate appears in the
frozen stage-2 candidate set. That is a population pin in the §1.2 sense with
the census as its population, and it would have made a stage-3 coordinate fail
stage-2-era machinery — a closed experiment firing against work that neither
caused it nor could discharge it. Disposition: `LOOSEN_TO_INVARIANT`, applied
before the gate was ever wired. Two things replaced it. The gate proper became
a **slice-completion proof obligation** over a basis frozen at one commit —
every coordinate this experiment opened must receive a reasoned disposition
before the slice may claim ratification — which is terminal at zero for the
slice and deliberately absent from CI and hooks. The part worth keeping became
a property that survives growth: every live coordinate is either ratified by a
witness or owned by an explicitly open experiment. A later stage discharges it
by opening a basis that adjudicates its own coordinates, never by deleting
one; the remedy text says so and a test asserts that it does.

## 10. Classification of current FSDS gate surfaces

| Surface | Class | Posture pre-RC | At RC |
|---|---|---|---|
| Contract schemas + closed vocabularies (token kinds, languages, transform grammar) | Structural (design authority as closedness) | blocking | blocking |
| Golden token-stream / markdown-tree fixtures | Structural identity (cross-framework), mandated regen discharge | blocking | blocking |
| Token-reference resolvability (`audit:token-resolvability`) | Correctness (dangling names) | blocking | blocking |
| Component-contrast + ancestry ledgers (`generate:check` lens) | External contract (WCAG AA) | blocking | blocking |
| Realization ledgers (dead-slots, pseudo-state, state-suppression, behavior, a11y) | Contract-declared vs realized obligations, per-component | blocking | blocking |
| Usage count floor (`tokens:check-usage:gate`) | Population measurement | report-only (demoted by RAIL-TOKEN-REFERENCE-RESOLVABILITY-01) | candidate for blocking at RC |
| Native token-realization scoreboard | Population measurement (state freeze) | **removed** (FIX-UNWIND-FREEZE-RATCHETS-01) | re-introduce as measurement at RC, if wanted |
| Token-consumption ledger | Population measurement (state freeze) | **removed** (FIX-UNWIND-FREEZE-RATCHETS-01) | re-introduce as measurement at RC, if wanted |
| Emission manifest / drift diffs (`governed:rail`, CI tree diff) | Identity (bytes ↔ contract ↔ codegen ↔ env) | blocking | blocking |
| Analytical oracle custody + holdout rule digest (`corpus-integrity.ts`, `holdout.json`) | Identity (the frozen answer key, and the rule surface answering it), discharge is hand re-derivation with a recorded reason | blocking | blocking |
| Analytical necessity census (`necessity.test.ts` over the census, witnesses and removals) | Structural: a coordinate confers standing only with a witness. Freezes justification, not membership — see §9 for why its removal path is not a void hazard | blocking | blocking |
| Stage-2 coordinate subtraction ledger (`analytical:subtraction --gate`) | Slice-completion proof obligation over a frozen basis — not repo admission, and unwired from CI and hooks on purpose | terminal at zero for `REL-VIEW-ALGEBRA-01` | inert; the ledger survives as historical evidence |

## 11. Canonical statement

> FSDS freezes what its contracts mean: closed vocabularies, cross-target
> identity, external correctness floors. It does not freeze what its system
> currently contains. No state freeze is wired blocking before a declared
> release candidate with a written schedule, and no gate ships whose cheapest
> discharge is deleting vocabulary — presence is design authority, and a void
> is an invitation for arbitrary decisions the system exists to prevent.
