# docs/

Project documentation for **Full Stack DS** — a falsifiable architectural claim about contract-governed compositional systems, with a Web DOM design system as the existence proof.

## What goes here

Durable reference for a reader trying to understand the project — design rationale, architectural doctrine, contracts, ADRs, specs, reference material. Everything in this tree should still teach current reality six months from now.

In-flight thinking, roadmaps, and working notes do NOT go here. They live in `docs/internal/` (gitignored, per-contributor). See [`document_governance.md`](./document_governance.md) — "Location" section — for the authority→directory partition rule and the rationale (stale ephemeral content in a consumer-facing tree becomes a trust hazard).

## Frontmatter contract and checks

Every `.md` file in this directory (except this `README.md` and anything under `archive/`) must start with a YAML frontmatter block. The contract is defined in [`document_governance.md`](./document_governance.md), and the rule is checked advisory-only by the active CAWS hook at `.caws/hooks/doc-frontmatter-check.sh` on `Write`/`Edit`. The blocking freshness and derived-value gate is `pnpm run docs:check-claims`; the hook alone is not CI evidence.

Minimum required fields:

```yaml
---
doc_id: <STABLE-ID>
authority: <canonical|policy|architecture|adr|spec|reference>
status: <draft|active|implemented|proven|superseded|archived>
title: <human-readable title>
owner: "@<handle>"
updated: YYYY-MM-DD
---
```

The `roadmap | working | ephemeral` authority values are valid in the enum but require the doc to live under `docs/internal/` (gitignored).

Some authority/status combinations require extra fields (`governs`, `verified_at_commit`, `superseded_by`, `caws_specs`). See the governance spec for the full table and examples.

## Layout

The [shared Designer and Animator paper model](architecture/design/shared-document-model/README.md) proposes document relationships, isolated draft schemas, and a design coverage ledger. It does not claim an implemented editor or change component contract authority.

```
docs/
  README.md                              # This file (exempt from frontmatter rules)
  current-implementation-snapshot.md     # Claim ledger — the freshness authority
  codegen-authority.md                   # Codegen layer authority doctrine
  domain-realization-comparison.md       # Extensible authority/projection comparison
  normal-form.md                         # The seven properties of compositional systems
  research-program.md                    # The domain table + what counts as a result
  document_governance.md                 # Frontmatter + location rules (enforced advisory)
  specifications/
    admission-rail.md                    # Generated artifact admission rail (concept)
    manifest-schema.md                   # Emission manifest schema (reference)
    governed-ci.md                       # Rail operator workflow + CI integration
    states-to-css.md                     # Contract states → CSS selectors
    a2ui-projection.md                   # Agent-facing descriptor projection
  architecture/
    presence-surfaces.md                 # Tooltip/popover/dialog/sheet family doctrine
    motion-substrate.md                  # Motion principles and declaration/realization boundary
    tokens-architecture.md               # Design token graph + cascade + drift gate
    component-layering.md                # .css (structure) vs .tokens.css (realization)
    composer-slot-projection.md          # Named-slot projection across targets
    contract-group-axes.md               # layer / category / morphology / prop-bucket axes
    consumer-projection-doctrine.md      # Boring consumer surface + override doctrine
    analytical-relation-doctrine.md      # Typed analytical relations + combinatorial projection (L0–L2 kernel ratified)
    analytical-capability-contract.md   # Durable M1–M6 acceptance and evidence semantics; no progress ledger
    analytical-peer-text.md             # Bounded textual peer, measured loss, residue and falsifiers
    component-evidence-pages.md          # Component docs as evidence pages
    figma-plugin.md                      # Figma descriptor consumer (historical slice)
    design/
      box-model-primitive.md             # The 14-slot geometry pool
      target-pack-registry.md            # Target-pack manifest + extension seam
  carrier-reachability-audit/             # Machine-generated/ratcheted audit records
  dead-slot-audit/  pseudo-state-audit/   #   written by `pnpm run audit:*`,
  state-suppression-audit/                #   never corrected by hand
  token-resolvability-audit/
  archive/                               # Reserved: frozen historical docs, exempt from
                                         #   frontmatter rules. Does not exist yet.

docs/internal/                           # gitignored — per-contributor ephemera
  <roadmaps, working notes, in-flight thinking>
```

Generated matrices and reports inside the tracked `*-audit/` directories are rewritten by their
`scripts/<name>-audit/` producers; correct those producers rather than hand-editing generated output.
Adjacent adjudication or policy records may be hand-authored and identify their own authority.

New top-level docs should pick the right subfolder by authority — e.g., `specifications/` for `authority: spec` reference material, `adrs/` for `authority: adr`. Create the folder if it does not exist. Do NOT create `roadmaps/` or `working/` under `docs/`; those authorities partition into `docs/internal/`.
