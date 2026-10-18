---
doc_id: SPEC-ADMISSION-RAIL-001
authority: spec
status: implemented
title: Generated artifact admission rail
owner: "@darianrosebrook"
updated: 2026-08-17
verified_at_commit: b1d510f9
governs:
  - packages/ds-codegen/src/validation/types.ts
  - packages/ds-codegen/src/validation/admission-descriptor.ts
  - packages/ds-codegen/src/validation/native-compile-lane.ts
  - packages/ds-codegen/src/validation/required-mode.ts
  - packages/ds-codegen/src/validation/validate-cli.ts
  - packages/ds-codegen/src/validation/markdown-report.ts
  - packages/ds-codegen/src/validation/git-range-scope.ts
  - packages/ds-codegen/src/validation/artifact-join.ts
  - packages/ds-codegen/src/validation/component-index.ts
  - packages/ds-codegen/src/validation/emission-manifest-path.ts
  - packages/ds-codegen/src/validation/frameworks/react.ts
  - packages/ds-codegen/src/validation/frameworks/vue.ts
  - packages/ds-codegen/src/validation/frameworks/svelte.ts
  - packages/ds-codegen/src/validation/frameworks/lit.ts
  - packages/ds-codegen/src/validation/frameworks/angular.ts
  - packages/ds-codegen/src/validation/frameworks/react-native.ts
---

# Generated artifact admission rail

> CODEGEN-RAIL-DOCS-ADMISSION-ENTRY-01

The admission rail is the inspection surface that answers "what evidence backs the generated output checked into this repo?" It is invoked locally as `pnpm run governed:rail`, runs in CI on every PR, and produces a machine-readable JSON report (`RailReport`) plus a markdown projection at `tmp/generated-admission-report.md`.

This document teaches the rail's claim. The diagnostic codes, the manifest, and the four evidence rungs all exist to make one specific kind of trust inspectable. Reading this doc first lets the rest of the rail surfaces ([`docs/specifications/manifest-schema.md`](./manifest-schema.md), [`docs/specifications/governed-ci.md`](./governed-ci.md)) make sense.

## What problem this solves

All <!-- rail-admitted-target-count -->6 rail-admitted frameworks emit the whole loader-discovered contract corpus each, from a single contract source — several hundred artifact groups and well over a thousand generated files, plus contracts, plus the codegen itself. The question a reviewer or CI pipeline needs to answer about a PR that touches any of those is not "did the test suite pass." It's: **given the bytes checked in, can we honestly say where they came from and what looked at them?**

Do not hand-carry those magnitudes — they move whenever the corpus or the admitted target set does. Derive them instead:

- **Rail-admitted targets:** `packages/ds-codegen/src/validation/admission-descriptor.ts` is the registry and the sole authority (<!-- rail-admitted-target-count -->6 today: react, vue, svelte, lit, angular, react-native; `figma` is generate-admitted but rail-excluded).
- **Corpus size:** the loader, `packages/ds-codegen/src/contracts-fs.ts`, which walks `components/*/<Name>.contract.json`.
- **Groups and files:** read them off the last emission with
  `jq '{groups: (.groups | length), files: ([.groups[].files[]] | length)}' packages/ds-codegen/.emission-manifest.json`
  (gitignored per-machine state — regenerate with `pnpm run generate -- --target=all` if absent).

Without the rail, that question has no machine-readable answer. A reviewer can run `pnpm test` and see 1000+ passing tests, but they cannot tell whether the generated files match the contracts, whether the emitter has drifted since the artifacts were last regenerated, or whether the manifest the rail cites was written by the same Node/codegen/lockfile state as the verifier is running under.

The rail makes those questions answerable mechanically. It does not make the answer trustworthy by assertion — it makes the assertion's evidence inspectable.

## What the rail is

> **The admission rail does not make generated output trustworthy by assertion. It makes the trust claim inspectable by binding generated artifacts to the checks that admitted them, the contract bytes that produced them, the emitter source bytes that could affect them, and the bounded environment inputs under which the manifest was written.**

That single sentence is the durable claim. Everything below is its expansion.

The rail composes three records:

1. **The emission manifest** (`packages/ds-codegen/.emission-manifest.json`, gitignored). Written by the codegen CLI at the end of every successful `generate` run. Records what the producer claims it emitted, the contract bytes that drove each group, the bounded emitter source set per framework, and the generate-time environment fingerprint. Schema is versioned; see [`docs/specifications/manifest-schema.md`](./manifest-schema.md) for the field-by-field reference.

2. **Per-framework admission plans** (`packages/ds-codegen/src/validation/frameworks/*.ts`). Declare, per framework, which checks the rail will run (e.g. `tsc`, `ngc strictTemplates`, `lit-analyzer`, and for react-native a package typecheck plus generated render tests), what they exercise, and which artifact paths each check's command-line scope binds to. Each plan is wrapped by an `AdmissionDescriptor` in its own module and aggregated by `validation/admission-descriptor.ts`, which is the single place the rail's target set, generated-tree roots, source extensions, and report ordering are declared — five formerly-parallel literals now derive from it. Since CODEGEN-EMIT-LINT-HYGIENE-01 every rail-admitted plan also runs a `lint` check (`pnpm exec eslint packages/<pkg>/src --max-warnings=0` against the root flat config, generated `__tests__` included): the rail now also refuses emitted bytes the framework-agnostic linter rejects — unused imports, dead guards, type-only imports — with two declared policy boundaries (Lit's `no-this-alias`, see the lit plan's `knownGaps`) and two declared coverage gaps (`.vue`/`.svelte` SFCs need per-target eslint toolchains; see the vue and svelte plans' `knownGaps`).

3. **Required-mode verifier** (`packages/ds-codegen/src/validation/required-mode.ts`). Joins the manifest against the on-disk state and emits typed `RailDiagnostic` records when integrity claims do not hold. Each diagnostic has a stable code (e.g. `RAIL_REQUIRE_MANIFEST_HASH_MISMATCH`), an operator-facing message naming the specific failure, and a list of affected paths where applicable.

The producer and the verifier are decoupled: the producer never sees the verifier's checks, the verifier never re-derives the manifest. Their only contract is the on-disk manifest, the on-disk files it names, and the schema version stamped at the top.

## What the rail is not

These are global non-claims. They apply across all four current evidence rungs. If a reader does not encounter them before the ladder, the rail will be over-read as a reproducibility system, and its statements will be misinterpreted accordingly.

- **The rail does not prove deterministic regeneration.** Identical inputs running through identical emitter source under an identical environment may still produce non-identical output if the emitter has nondeterministic ordering, the formatter has time-of-day behavior, or the underlying runtime resolves modules differently. The rail records what produced the manifest; it does not assert that re-running with the same inputs would produce byte-identical output.

- **The rail does not perform full environment attestation.** OS, architecture, container image, package-manager registry mirror state, network conditions, and the resolver's transitive behavior are not captured. The environment rung records Node major, codegen package version, and lockfile bytes — and explicitly only those.

- **The rail does not assert per-file proof.** The framework checks the rail invokes (`tsc`, `ngc`, `lit-analyzer`) run at the package or workspace level, not on individual files in isolation. A passing rail says "this package compiled with these files in its tsconfig include graph." It does not say "this single artifact would compile if extracted from its package." The honest vocabulary is in the `ArtifactAdmissionCoverage` enum: `covered_by_workspace_check`, `covered_by_package_check`, `covered_by_direct_template_check` — three distinct strengths, none of them "per-file proven."

- **The rail does not prove semantic correctness.** Behavior tests in each framework workspace prove that the rendered interaction works. The rail proves that the artifacts are admissible by their framework's compiler/parser/linter. Both gates are required; neither subsumes the other. The rail is the admission half.

- **Changed-artifact scope is a reporting projection, not a reduced admission mode.** When `--scope-to-git-range` is passed, the rail STILL admits the full workspace; the projection narrows what the markdown report highlights. A passing scoped report does not mean a smaller set of artifacts was checked. Operators who want to "make CI faster by scoping" are pointed at the wrong tool.

- **"The admission rail" is not everything CI proves about generated code.** Two non-pnpm *native compile lanes* (Kotlin via `kotlinc`, Swift via `swiftc`) run as their own CI jobs — `native-compile-rail` and `native-compile-rail-swift` — driven by `packages/ds-codegen/src/validation/native-compile-lane.ts`. They are `RailTargetId`s, not `FrameworkId`s: they admit no component, are absent from the manifest, and sit outside the evidence ladder below. They exist to prove the rail can bind a compiler family that has no `tsc`/`vitest`, and they compile hand-authored example consumers rather than generated component trees. Do not read a green native lane as byte-provenance for emitted `.kt`/`.swift`.

The rung-specific non-claims (e.g. "contract provenance does not prove emitter determinism," "emitter provenance does not prove the source set is complete by construction") live alongside their respective schema versions in [`docs/specifications/manifest-schema.md`](./manifest-schema.md). They are not repeated here so this document stays the conceptual entry surface rather than a reference manual.

## The evidence ladder

The rail's claims compose as a ladder. Each rung adds one bounded class of attribution. Reading order matters: a rung's claim is honest only if the rungs below it are honest first.

### 1. Artifact attribution (CODEGEN-RAIL-ARTIFACT-MANIFEST-ADMISSION-01)

Every emitted file is recorded in the manifest with its post-write sha256 digest. The verifier rejects drift between the manifest and the on-disk bytes via `RAIL_REQUIRE_MANIFEST_HASH_MISMATCH` (file content drifted), `RAIL_REQUIRE_MANIFEST_MISSING_PATHS` (file deleted), and `RAIL_REQUIRE_MANIFEST_UNTRACKED_GENERATED_PATHS` (file on disk under a generated tree but not in the manifest — typically a partial-target regenerate).

Per-artifact-group `ArtifactAdmissionEntry` records bind each manifest group to the framework checks whose command-line scope includes it. Each entry carries the check name, its run status, and its coverage label (workspace / package / direct-template). A closure note can say "the lit-analyzer pass covered Button.ts with direct-template scope; the React tsc pass covered Button.tsx with package scope" without overclaiming per-file proof.

### 2. Contract provenance (CODEGEN-RAIL-CONTRACT-PROVENANCE-01)

Every manifest group records the contract file that produced it (`{ path, sha256 }`). The verifier rejects drift via `RAIL_REQUIRE_MANIFEST_CONTRACT_HASH_MISMATCH` (contract bytes changed since generation — the generated output may reflect a stale contract revision) and `RAIL_REQUIRE_MANIFEST_CONTRACT_MISSING` (contract deleted).

Contract integrity is checked independently of output integrity. A contract edit without regenerate produces clean output bytes on disk but drifted attribution: `HASH_MISMATCH` does not fire, but `CONTRACT_HASH_MISMATCH` does. Surfacing them separately lets a closure note cite which side of the source→artifact attribution moved.

### 3. Emitter source attribution (CODEGEN-RAIL-EMITTER-PROVENANCE-01)

Top-level `emitterSourceSets[framework]` records the bounded material codegen source set for each framework — the files whose bytes can materially affect what that framework emits. The verifier rejects drift via `RAIL_REQUIRE_MANIFEST_EMITTER_SOURCE_HASH_MISMATCH` (a codegen module was edited after generation — the manifest's attribution is stale) and `RAIL_REQUIRE_MANIFEST_EMITTER_SOURCE_MISSING` (a declared source file was renamed or removed).

"Bounded" and "material" are the load-bearing doctrine words. Authority lives in `cli.ts` as `SHARED_EMITTER_SOURCES` + `FRAMEWORK_EMITTER_SOURCES` — a static declaration, not a runtime import scan. Adding a new emitter helper requires explicitly extending the set; otherwise the manifest silently under-claims coverage. Cross-framework borrowing (e.g. `frameworks/react/hook-source.ts` is imported by vue/svelte/angular emitters) is handled by listing the file in every framework set that depends on it; drift dedupes to one diagnostic per path.

### 4. Environment attribution (CODEGEN-RAIL-ENVIRONMENT-PROVENANCE-01)

Top-level `environment` records Node major version, codegen package version, and the lockfile path + sha256 at generate time. The verifier rejects drift via:

- `RAIL_REQUIRE_MANIFEST_NODE_MAJOR_MISMATCH` — verifier's Node major differs from the manifest's.
- `RAIL_REQUIRE_MANIFEST_CODEGEN_VERSION_MISMATCH` — on-disk `packages/ds-codegen/package.json` version differs from recorded.
- `RAIL_REQUIRE_MANIFEST_CODEGEN_PACKAGE_MISSING_OR_MALFORMED` — verifier could not establish equality (file absent, unreadable, malformed JSON, or no string `version`).
- `RAIL_REQUIRE_MANIFEST_LOCKFILE_HASH_MISMATCH` — lockfile bytes drifted (catches direct dep, transitive dep, pnpm version, or registry resolution changes through a single digest).
- `RAIL_REQUIRE_MANIFEST_LOCKFILE_MISSING` — manifest's lockfile path no longer resolves to a regular file.

The lockfile hash cannot tell *which* dep changed; `git diff pnpm-lock.yaml` is the operator's job. The diagnostic's claim is bounded: "the dependency surface that produced this manifest is no longer on disk."

### 5. Future: deterministic replay

Not yet implemented. The ladder is intentionally incomplete at this rung. Closing it would require modeling container image / OS / architecture / registry mirror state as additional manifest fields, and a verification posture that compares those against the current environment. None of that exists today.

The current rail's environment rung does NOT subsume this. It records four bounded inputs and rejects drift on those four; it makes no claim about reproducibility under a different OS or container.

## The manifest is not the proof

A reader new to the rail often expects the manifest to BE the evidence — that if the manifest exists and matches on-disk state, the artifacts are proven good. That misreads what the manifest does.

The manifest is **an attribution record**, not a proof:

- It says "these emitted bytes came from this contract, generated by this emitter source, under this environment."
- It does NOT say "these emitted bytes are correct."

The proof comes from the checks the manifest is bound to: tsc, ngc, lit-analyzer, the behavior test suite, vitest-axe. The rail's job is to make sure those checks ran against the bytes the manifest names, not against substituted, stale, or unattributed files.

This split is why the rail can refuse with `RAIL_REQUIRE_MANIFEST_HASH_MISMATCH` even when the checks all passed: the checks may have passed against the right bytes, but the manifest's claim about those bytes is stale, so the rail's *attribution* is no longer honest. Operators are pointed at "regenerate to refresh the manifest," not at "the artifacts are broken."

## Optional mode vs required mode

The rail has two invocation modes with materially different evidence postures.

### Optional mode

`pnpm run validate:generated` (no flags). Runs each framework's admission plan and emits the rail report. If a manifest exists and matches the rail's expected schema version, it's used to attribute checks to artifact groups (`artifactSelection: "by_manifest"`). If the manifest is missing, schema-mismatched, or unparseable, the rail issues a stderr warning and falls back to unattributed admission (`artifactSelection: "none"`).

Optional mode is a developer ergonomic. It never fails on attribution problems; it only fails on framework check failures.

### Required mode

`pnpm run validate:generated --require-artifact-manifest` (the form CI uses, wrapped as `pnpm run governed:rail`). Refuses to pass when:

- The manifest is missing → `RAIL_REQUIRE_MANIFEST_MISSING`.
- The manifest exists but is unreadable / malformed JSON / structurally broken → `RAIL_REQUIRE_MANIFEST_MALFORMED`.
- The manifest's schema version is not what this rail consumes → `RAIL_REQUIRE_MANIFEST_SCHEMA_MISMATCH`.
- Any integrity check across the four evidence rungs fires.

Required mode short-circuits the framework plans entirely on MISSING / MALFORMED / SCHEMA_MISMATCH — running 20 seconds of tsc/ngc/lit-analyzer when the evidence trail is already broken would only add misleading "pass" lines to a report that's going to fail anyway. Other diagnostics (path / hash drift) let plans run, because their output is still meaningful evidence even when content has drifted.

CI must use required mode. Once attribution is available, governed admission must not silently degrade to unattributed workspace admission. The default of the rail script (`pnpm run governed:rail`) enforces this.

## Changed-artifact scope is projection, not a reduced gate

`--scope-to-git-range <range>` (e.g. `origin/main...HEAD`) adds a `scopedProjection` field to the report and a "Changed artifact scope" section to the markdown. The projection lists:

- Artifact groups whose files or contract path intersect the range.
- Changed generated paths the rail could NOT bind to any manifest group (review context — required-mode diagnostics are the authoritative failure surface for these).
- Changed contract paths the manifest attributes to one or more groups.
- Non-generated changed paths (contracts, codegen sources, configs).

The rail still admits the full workspace in scoped mode. The overall verdict is independent of the projection. A passing scoped run does not mean a narrower verification was performed.

This is load-bearing because the scoped surface is operationally tempting to misuse as "faster CI." It would corrupt the proof surface if used that way. The projection's job is reviewer focus — letting a closure note cite the PR-relevant subset of evidence — not reduced verification.

## Diagnostic code reading guide

All diagnostic codes follow the form `RAIL_REQUIRE_MANIFEST_<class>`. They are the public API the CI grep surface relies on; renaming any of them is a breaking change. Grouped by evidence layer:

### Schema / read-time (verifier cannot proceed)

| Code | Fires when | Repair |
|---|---|---|
| `RAIL_REQUIRE_MANIFEST_MISSING` | No manifest file on disk. | Run `pnpm run generate -- --target=all`. |
| `RAIL_REQUIRE_MANIFEST_MALFORMED` | Manifest exists but cannot be consumed: parse failure, read error, or structurally broken body. | Regenerate. The manifest will be rewritten. |
| `RAIL_REQUIRE_MANIFEST_SCHEMA_MISMATCH` | Manifest's `schemaVersion` is not the version this rail consumes. | Regenerate against the current schema. |

These three short-circuit the rail before framework plans run.

### Output integrity (rung 1: artifact attribution)

| Code | Fires when | Repair |
|---|---|---|
| `RAIL_REQUIRE_MANIFEST_MISSING_PATHS` | Manifest names files that do not exist on disk (or exist but are not regular files). | Restore or regenerate. |
| `RAIL_REQUIRE_MANIFEST_UNTRACKED_GENERATED_PATHS` | Files containing `@generated:start` exist on disk under any `packages/ds-{framework}/src/components/**` but are NOT in the manifest. | Regenerate with `--target=all`. |
| `RAIL_REQUIRE_MANIFEST_HASH_MISMATCH` | A manifest file's recorded digest does not match the on-disk bytes. | Regenerate, or revert the unintended edit. |

### Contract integrity (rung 2: contract provenance)

| Code | Fires when | Repair |
|---|---|---|
| `RAIL_REQUIRE_MANIFEST_CONTRACT_MISSING` | A contract path named by a manifest group is not on disk. | Restore the contract or regenerate. |
| `RAIL_REQUIRE_MANIFEST_CONTRACT_HASH_MISMATCH` | A contract is on disk but its bytes have drifted since the manifest was written. | Regenerate. |

### Emitter integrity (rung 3: emitter source attribution)

| Code | Fires when | Repair |
|---|---|---|
| `RAIL_REQUIRE_MANIFEST_EMITTER_SOURCE_MISSING` | A declared emitter source file is missing (or non-regular). | Regenerate, or restore the helper. |
| `RAIL_REQUIRE_MANIFEST_EMITTER_SOURCE_HASH_MISMATCH` | A codegen module was edited after generation. | Regenerate. The output may be byte-identical, but the manifest's attribution is stale. |

### Environment integrity (rung 4: environment provenance)

| Code | Fires when | Repair |
|---|---|---|
| `RAIL_REQUIRE_MANIFEST_NODE_MAJOR_MISMATCH` | Verifier's Node major differs from manifest's `nodeMajor`. | Install matching Node, or regenerate. |
| `RAIL_REQUIRE_MANIFEST_CODEGEN_VERSION_MISMATCH` | On-disk `packages/ds-codegen/package.json` version differs from manifest's recorded value. | Regenerate. |
| `RAIL_REQUIRE_MANIFEST_CODEGEN_PACKAGE_MISSING_OR_MALFORMED` | Verifier could not establish equality (file absent, unreadable, parse failure, no string version). | Restore the package.json or regenerate from a clean codegen workspace. |
| `RAIL_REQUIRE_MANIFEST_LOCKFILE_MISSING` | Manifest's lockfile path does not resolve to a regular file. | Restore the lockfile or regenerate. |
| `RAIL_REQUIRE_MANIFEST_LOCKFILE_HASH_MISMATCH` | Lockfile bytes drifted since generation. | Regenerate. Use `git diff pnpm-lock.yaml` to identify the moved dep. |

Distinct codes for distinct evidence states is doctrine, not preference. CODEGEN_VERSION_MISMATCH fires only when both sides parsed and disagreed; CODEGEN_PACKAGE_MISSING_OR_MALFORMED fires when the verifier could not even establish equality. A closure note can cite which one, and the operator's repair step is unambiguous.

## Verifier-never-throws doctrine

The verifier MUST NOT throw. Every IO error, every malformed input, every non-regular-file path, every JSON parse failure must collapse into a diagnostic — never into a stack trace.

This is enforced mechanically by `safeSha256OfRegularFile`, which returns a discriminated `{ kind: "ok" | "missing" | "not_regular_file" }`. Every digest comparison in the verifier routes through it. A hand-edited manifest pointing a generated-file path at a directory does not crash `fs.readFileSync` with EISDIR — it surfaces as `MISSING_PATHS`, because the operator's repair is the same as "the file isn't there to compare."

This matters because the verifier's job is to give honest evidence even when the manifest is broken. A stack trace tells the operator "the rail is buggy"; a `RAIL_REQUIRE_MANIFEST_MALFORMED` diagnostic tells them "your manifest is wrong, here's what specifically is wrong."

## How this relates to codegen authority

The codegen authority document (`docs/codegen-authority.md`) defines the layers that own different kinds of decisions:

- **Contract** owns component intent.
- **Semantic IR** owns normalized framework-neutral facts.
- **Framework emitter** owns realization syntax.
- **Admission rail** owns validation evidence, not generation policy.

The rail must not become a place where hidden generation policy lives. It surfaces "the framework rejected this," not "therefore the emitter should do something different." If a rule needs to live somewhere because the rail flagged something, the rule belongs in the contract or the IR — not in the rail.

The four evidence rungs taught here are how the rail *demonstrates* it owns evidence honestly. They are the layers that make "the rail owns validation evidence" auditable rather than aspirational.

## What to cite in closure notes

When closing a PR that involves the rail, the closure note should cite specific evidence rather than "the rail passed":

- Which rungs were exercised, with the counts read off *your* `RailReport` rather than copied from this doc. ("Output integrity verified against `<N>` files; contract integrity against `<N>` contracts; emitter integrity against `<N>` declared sources; environment under Node 22 + codegen 1.0.0 + lockfile sha256 `<prefix…>`")
- The scoped projection counts if the PR was scoped. ("3 matched artifact groups, 1 changed contract, 0 unmatched generated paths.")
- Any diagnostic codes that fired and how they were resolved. ("`CONTRACT_HASH_MISMATCH` on Button.contract.json was the load-bearing signal that contract edits hadn't been regenerated; resolved by running `pnpm run generate -- --target=all` and recommitting.")
- Any known gaps. ("Lit's `no-incompatible-type-binding` rule is disabled in `typecheck:templates`; declared in `knownGaps` and visible in the markdown report's `Known gaps` section.")

The rail report is designed to make those citations mechanical — the JSON is canonical, the markdown is a citation-friendly projection of the same evidence.

## Where to read next

- [`docs/specifications/manifest-schema.md`](./manifest-schema.md) — the manifest's field-by-field reference, schema migration history, and the rung-specific non-claims for each schema version.
- [`docs/specifications/governed-ci.md`](./governed-ci.md) — the operator workflow: what `governed:rail` and `governed:rail:changed` do, how the CI pipeline uses them, how to read a rail JSON or markdown report.
- `docs/codegen-authority.md` — the authority split this rail's "validation evidence, not generation policy" line refers to.
