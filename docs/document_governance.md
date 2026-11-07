---
doc_id: SPEC-DOC-GOV-001
authority: spec
status: active
title: Document Governance
owner: "@darianrosebrook"
updated: 2026-11-05
governs:
  - docs/**/*.md
---

# Document Governance

This spec defines the frontmatter contract that documents under `docs/` must follow. `pnpm run docs:check-links` runs fixture-tested metadata and location checks over tracked documents before checking relative links. The CAWS hook at `.caws/hooks/doc-frontmatter-check.sh` provides separate advisory warnings on `Write`/`Edit`; generator-written reports do not pass through that edit-time hook. `pnpm run docs:check-claims` separately gates marked values and verified-stamp freshness. Metadata validation does not verify narrative claims or establish that an authority/status label accurately describes its content.

## Scope

**Applies to:** every `.md` file under `docs/`.

**Exempt:**

- `README.md` at any depth (overview files, no governance needed).
- Anything under `docs/archive/` (frozen historical record).

## Required fields

Every governed doc must start with a YAML frontmatter block delimited by `---` on its own line, containing at minimum:

| Field | Purpose |
|---|---|
| `doc_id` | Stable identifier — never changes once assigned. Use kebab/uppercase per authority (e.g., `SPEC-…`, `ADR-…`, `RFC-…`). |
| `authority` | What kind of authority this doc carries. See enum below. |
| `status` | Lifecycle state. See enum below. |
| `title` | Human-readable title. |
| `owner` | Single point of accountability (typically a GitHub handle like `@darianrosebrook`). |
| `updated` | ISO date (`YYYY-MM-DD`) of last meaningful edit. |

## `authority` enum

Higher authority = harder to change without coordination. Listed roughly highest to lowest:

| Value | Use when… |
|---|---|
| `canonical` | The single source of truth on a topic. All other docs must defer to it. |
| `policy` | A binding rule for how work is done. |
| `architecture` | Cross-cutting structural decision. |
| `adr` | Architecture Decision Record — captures one decision and its context. |
| `spec` | Concrete contract for a component/feature/interface. |
| `roadmap` | Future-facing plan tracking work that has not landed. |
| `reference` | Stable factual lookup material (glossaries, APIs, schemas). |
| `working` | In-flight thinking, design discussion, drafts. |
| `ephemeral` | Short-lived notes that should be deleted or promoted later. |

## Location

The `authority` value determines where the doc lives on disk. The tree is partitioned so consumer-facing surfaces (`docs/`) stay durable, while ephemeral surfaces (roadmaps, working notes, in-flight thinking) live off-tree.

| Authority | Location | Tracked |
|---|---|---|
| `canonical` | `docs/` | yes |
| `policy` | `docs/` | yes |
| `architecture` | `docs/` | yes |
| `adr` | `docs/` | yes |
| `spec` | `docs/` | yes |
| `reference` | `docs/` | yes |
| `roadmap` | `docs/internal/` | no (`.gitignore`) |
| `working` | `docs/internal/` | no (`.gitignore`) |
| `ephemeral` | `docs/internal/` | no (`.gitignore`) |

**Why the partition exists.** Consumer-facing docs are the study surface a reader uses to understand the project. Roadmaps and working notes go stale faster than reference docs, and stale content in `docs/` becomes a trust hazard — readers can't distinguish "this teaches current reality" from "this is in-flight thinking from three weeks ago." Moving the ephemeral surfaces off-tree makes the partition mechanical rather than depending on reader judgment about each file.

**Collaboration.** `docs/internal/` is contributor-local. Teams that need to share roadmaps or working notes do so through an out-of-band surface (a team doc folder, an issue tracker, a wiki) — not through this repository.

**Enforcement.** `scripts/docs-metadata-check.mjs`, invoked by `pnpm run docs:check-links`, rejects tracked documents under `docs/internal/` and tracked durable-surface documents declaring `authority: roadmap | working | ephemeral`. Local ignored notes remain outside the tracked-document check. README/archive frontmatter exemptions do not permit tracked contributor-local output. The edit-time hook remains advisory.

## Tree layout

Minimal subdivision at the root keeps the study surface scannable. The
tracked tree is exactly:

| Location | Holds |
|---|---|
| `docs/` (root) | Orientation (`README.md`), the claim ledger (`current-implementation-snapshot.md`, canonical), system-wide doctrine (`normal-form.md`, `codegen-authority.md`), and this governance spec. Nothing else lands at root. |
| `docs/specifications/` | Every `authority: spec` doc — concrete contracts for components, schemas, rails, and interfaces. |
| `docs/architecture/` | Cross-cutting `authority: architecture` docs (system shape, taxonomies, doctrines). |
| `docs/architecture/design/` | Subsystem-scoped architecture docs (one primitive, one pipeline, one registry). |
| `docs/architecture/adr/` | `authority: adr` decision records. |
| `docs/*-audit/` | Tracked ratcheted matrices/reports and their adjudication records. Generated files are owned by the corresponding `scripts/*-audit/` producer; adjacent authority-bearing records may be hand-authored. |
| `docs/internal/` | Machine-local, untracked (see Location above): roadmaps, working notes, recon, agent-maintained measurements, and non-ratcheted audit output. |

A doc whose authority and location disagree with this table is misfiled —
fix the location or the label, whichever is lying. The cautionary tale is
real: a sibling project accumulated ~1,500 markdown files by letting
in-flight thinking land on the durable surface.

## Drafts confer no authority

`status: draft` means *proposal in the shape of its authority class*. A
draft `spec` is a proposed contract; a draft `architecture` doc is a
proposed shape. Drafts are **not citable as authority** — do not defer to
them, and do not let tooling enforce them.

The lifecycle obligation that follows:

- A doc that is **ratified in practice** — its claims are implemented,
  other docs defer to it, or tooling enforces it — must be promoted to
  `active` (or `implemented`/`proven` with `verified_at_commit`). A
  perpetual draft that everything obeys is mislabelled, and the label is a
  trust hazard in both directions.
- A draft **nobody will ratify** is working material: relabel
  `authority: working` and move it to `docs/internal/`.
- A draft whose content has been **superseded by landed work** does not get
  promoted on age — reconcile it or demote it.

## `status` enum

| Value | Meaning |
|---|---|
| `draft` | Not yet ratified. Content is provisional. |
| `active` | Ratified and current. The doc represents present intent. |
| `implemented` | The thing described is in code. Requires `verified_at_commit`. |
| `proven` | Implementation is verified by tests/audit. Requires `verified_at_commit`. |
| `superseded` | Replaced by a newer doc. Requires `superseded_by: <doc_id>`. |
| `archived` | Frozen and no longer maintained. |

## Conditional fields

The hook enforces these when the corresponding authority/status applies:

- **`governs:`** — required when `authority` is `canonical`, `architecture`, `adr`, or `spec`. List the modules, schemas, or specs this doc has authority over. May be an inline array (`[mod-a, mod-b]`) or a YAML list.
- **`verified_at_commit:`** — required when `status` is `implemented` or `proven`. A commit SHA where the claims were verified. Update on each verification.
- **`superseded_by:`** — required when `status` is `superseded`. The `doc_id` of the replacement.
- **`caws_specs:`** — required when `authority` is `roadmap`. List the CAWS spec IDs tracking the roadmap items (e.g., `[TC-01, TC-04]`).

## Example: spec authoring a contract

```yaml
---
doc_id: SPEC-STACK-001
authority: spec
status: active
title: Stack Primitive Contract
owner: "@darianrosebrook"
updated: 2026-05-14
governs:
  - packages/ds-contracts/primitives/Stack.primitive.json
  - packages/ds-codegen/src/primitive-contract.ts
---
```

## Example: superseded ADR

```yaml
---
doc_id: ADR-007
authority: adr
status: superseded
title: Direct DOM rendering for Modal
owner: "@darianrosebrook"
updated: 2026-04-02
superseded_by: ADR-012
---
```

## How the hook reports

The hook (`.caws/hooks/doc-frontmatter-check.sh`) is registered by the active CAWS `post_tool_use.sh` dispatcher and runs after `Write` or `Edit`. It is advisory: it emits a single `hookSpecificOutput` JSON block with `additionalContext` describing the missing/invalid field. It does **not** block the tool, and generator subprocesses do not traverse this tool-event path.

Validation passes are versioned in the script (V1 → V6) so newer rules can be added without breaking older docs that pre-date them.

## Not in scope

This spec governs frontmatter only. It does not prescribe document *structure* (headings, body conventions, code-block style). Those belong in separate style guides if needed.
