---
doc_id: ARCH-RESEARCH-PROGRAM-001
authority: architecture
status: active
title: The Research Program: Normal Form Across Domains
owner: "@darianrosebrook"
updated: 2026-09-19
governs:
  - src/views/Home.tsx
  - src/views/ArchitectureView.tsx
  - src/components/AboutDialog.tsx
---

# The Research Program: Normal Form Across Domains

This document states the project's research program as a whole. It extends
[`normal-form.md`](normal-form.md): that document names the seven properties and
argues them from the component corpus; this one names the domains under attack,
what each domain tests, and what counts as a meaningful result. Where the two
disagree, the [current implementation snapshot](current-implementation-snapshot.md)
is authoritative.

## What is under test

The component corpus is the easiest demonstration of the normal form, not its
definition. The object under test is whether the same architectural discipline
keeps reappearing when the *kind of thing being governed* changes. Every domain
in this repository is asked the same question:

> Given a domain containing authored meaning, composition, downstream consumers,
> and heterogeneous realizations, can we identify the smallest authoritative
> representation, normalize it without losing meaning, expose explicit degrees of
> freedom, derive target-specific projections without creating parallel
> authorities, and make violations observable enough that drift cannot survive
> silently?

Components make almost every property easy to demonstrate at once — typed
contracts, a shared IR, small primitives, heterogeneous realizations, fail-loud
references, controlled regeneration, consumer projections. That makes the
component corpus the existence proof and the thirty-second demo. It does not
make component portability the top-level taxonomy, and target count is not the
scorecard.

## The domain table

| Domain under attack | Authoritative thing | Composition being tested | Hostile question |
| --- | --- | --- | --- |
| Components | semantic component contract + sidecars | anatomy, behavior, state, composition | Can meaning survive radically different runtime substrates? |
| Design tokens | typed token graph (DTCG) | primitive → semantic → contextual resolution | Can value vocabulary, override interfaces, and material realization stay distinct? |
| Iconography | symbolic/vector contract | glyph identity + governed geometry | Can one symbolic artifact survive incompatible resource systems, and can its provenance machinery stay domain-neutral? |
| Analytical relations | typed relational structure | derivations + admissibility + projections | Can normal form govern a *space* of legal meanings, not merely describe one artifact? |
| Documentation/showcase | underlying contracts and evidence | human-facing projections + application consumption | Can explanation remain derived rather than becoming another authority, while consuming the system it describes? |
| Generated evidence | manifests, observations, receipts | attribution → verification → report projections | Can claims themselves be compositionally governed without conflating evidence with authority? |
| Target-pack/codegen infrastructure | admitted target declaration + IR | realization capability | Can extensibility avoid making core code a catalogue of known substrates? |

React, Vue, Svelte, Angular, Lit, React Native, SwiftUI, Jetpack Compose, Unity,
Godot, and Figma live **inside one cell** — the components row — as the
adversarial realization matrix for that one experiment. They are not the
taxonomy of the research.

The durable [domain realization comparison](domain-realization-comparison.md)
expands the component, iconography, and analytical rows through one stable
record: authority, normalized substrate, composition, realizations,
conservation, residue, refusal, evidence, current boundary, and integration
edges. It also defines the admission questions and row template for a future
domain.

### Where each row lives

- **Components.** `<!-- component-count -->53` contracts, one rendered
  primitive (`Stack`), `<!-- web-framework-count -->5` Web DOM emitters plus
  React Native admitted on the same rail, and registered native/design-tool
  targets outside it (`<!-- registered-target-count -->11` registered targets,
  `<!-- rail-admitted-target-count -->6` rail-admitted). Doctrine:
  [`normal-form.md`](normal-form.md); evidence: the snapshot's rail, runtime
  rail, and non-web generation rows.
- **Design tokens.** A DTCG source graph resolves primitive values into
  semantic aliases, theme/brand/density layers, and component bindings. The
  load-bearing finding is the distinction between **vocabulary and
  obligation**: an unused semantic palette entry is latent vocabulary and
  remains valid, while a component-scoped slot advertised as an override point
  but consumed by nothing is broken, because a consumer can invoke an interface
  that has no effect. The two look identical under a generic "unused token"
  metric and require opposite governance. Doctrine:
  [tokens architecture](architecture/tokens-architecture.md),
  [component token consumption](architecture/design/component-token-consumption.md).
- **Iconography.** `<!-- icon-count -->29` icons are ingested like a token and
  delivered like a component, then projected to SVG, React, Svelte, React
  Native, Android vector XML, Swift, and Kotlin. The center of gravity is the
  **emission ledger**: generated output is gitignored scratch, and the committed
  durable object is the content-addressed relation between governed input
  (`observation_ref`) and emitted bytes (`attachment_ref`). The ledger core is
  deliberately not icon-shaped — `build/ledger.mjs` is the target-agnostic core,
  and `build/ledger-components.mjs` drives the same core over a component
  framework target to demonstrate it
  ([iconography README](../packages/ds-iconography/README.md)).
- **Analytical relations.** A chart type is not a primitive; it is a
  **theorem**: a name for a bundle of preconditions on a typed relation plus a
  projection that discharges them. An illegal projection is typed as illegal
  with a named diagnostic; insufficient evidence remains `unproven` with an
  explicit obligation. The L0–L2 kernel is ratified by construction and by a
  necessity census — every coordinate carries a witness that removing it makes
  two states indistinguishable, or it has left the kernel. Stage 2 adds the L3
  derivation algebra: a derivation is a typed operator whose result is itself a
  relation, stated by one locus (`OPERATOR_LAWS`) and re-earning its coordinates
  by quotient and subtraction rather than by inspection. That slice's close
  condition is open. A bounded stage-three experiment now enumerates projection
  programs for one admitted analytical authority and lowers exactly two declared
  topologies into readback and metric representations. That experiment does not
  ratify a stage-two coordinate, establish a general projection system, measure
  realization-level residue, or close the stage-two subtraction. Doctrine:
  [analytical relation doctrine](architecture/analytical-relation-doctrine.md).
- **Documentation/showcase.** Component evidence pages derive anatomy, props,
  states, accessibility, usage, A2UI, token information, preview state, and
  source/evidence surfaces from the contracts rather than restating them in
  prose; governed doc markers derive counts and dates; and the showcase itself
  is a real consumer of the system it documents, held to it by consumption
  guards. Doctrine:
  [component evidence pages](architecture/component-evidence-pages.md).
- **Generated evidence.** The admission rail binds emitted artifacts to
  contract, codegen source, and bounded environment; derived-obligation ledgers
  ratchet in both directions; markdown reports are projections of canonical
  JSON. The question under test is whether claims can be compositionally
  governed without conflating evidence with authority. Doctrine:
  [admission rail](specifications/admission-rail.md).
- **Target packs.** Built-in targets are admitted through manifests and a
  registry; local target packs are metadata-only today. The test is whether
  extensibility lands in the registry seam rather than as new core code.
  Doctrine: [target-pack registry](architecture/design/target-pack-registry.md).

## Normal form is not reuse

> Normal form is not primarily about reuse. It is about finding the generative
> substrate from which a family of apparently distinct artifacts becomes
> derivable. Reuse is what it looks like afterward.

A named artifact — `Button`, `histogram`, `Icon`, a props table — is a theorem
of the substrate, not an authored primitive. The repository has four concrete
instances of this inversion:

- the primitive count staying at one across `<!-- component-count -->53`
  components;
- chart names banned below the projection layer (the analytical doctrine's
  single invariant);
- the icon emission ledger applied to component generation unchanged;
- documentation that derives its content rather than restating it.

The falsifier for the whole idea is the catalogue that moved underground: if
each new artifact still requires an artifact-specific clause — a branch on a
component name, a chart name in the schema, an icon name in the emitter — then
the ontology grew to absorb every instance and no substrate was found. The
positive evidence is different in kind: new phenomena fall out without changing
the source ontology; source coordinates survive subtraction tests; realization
families retain genuine residue; and the substrate predicts what is
*impossible*, not merely what is possible. That last point is why typed refusal
is central rather than an error-handling feature — unresolved references,
illegal projections, unsupported native shapes, and explicit non-claims are
where a substrate proves it can say no.

## What counts as a meaningful result

Counts are pressure, not results:

- "`<!-- component-count -->53` components now compile for target X" is useful,
  mostly incremental, evidence.
- "Removing this analytical coordinate makes two semantically distinct
  relations indistinguishable" is a result (the stage-1.5 necessity census).
- "The token system discovered that unreferenced vocabulary and unconsumed
  interfaces require opposite governance" is a result.
- "The icon emission ledger applied to components unchanged because its
  substrate contained only attribution relationships" is a result.
- "The documentation system derives its claims and consumes the generated
  system without establishing a second authority" is a result.

## Evidence strength today

Each domain carries graded proof strength; the snapshot's claim ledger is
authoritative for all of it. In one line each: components are the only family
proven end-to-end (emit → rail → runtime); tokens are CI-gated through build,
validation, contrast, and resolvability; iconography is drift-gated through
build and ledger; analytical relations have a ratified L0–L2 kernel, a built L3
derivation algebra under an open close condition, and a bounded stage-three
enumeration/lowering experiment whose two representations do not raise the
ratification boundary; the documentation/showcase surfaces are implemented and
consumption-guarded; the evidence machinery is CI-gated; target packs are a
metadata-only extension seam. Experimental machinery is named without being
promoted to general realization evidence.

## The falsification watch

The residue principle, adopted from the analytical doctrine:

> Heterogeneous realizations should share exactly the semantic structure they
> genuinely have in common, and no more.

If every realization has zero residue, realization semantics were smuggled into
the substrate. If nearly everything is residue, the shared substrate has no
explanatory power. The standing narrowing condition is equally explicit: if a
domain fundamentally requires target-specific semantic interpretation — not
merely target-specific syntax — then normal-form property 4 fails for that
class, and the claim is narrowed, not restated. Analytical relations are the
sharpest test of that condition this repository can mount.
