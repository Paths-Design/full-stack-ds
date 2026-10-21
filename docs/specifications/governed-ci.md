---
doc_id: SPEC-GOVERNED-CI-001
authority: spec
status: implemented
title: Governed CI and the rail operator workflow
owner: "@darianrosebrook"
updated: 2026-10-20
verified_at_commit: 44cead708
governs:
  - package.json
  - .github/workflows/ci.yml
  - .githooks/pre-push
  - scripts/committed-tree-check.mjs
  - packages/ds-codegen/src/validation/validate-cli.ts
---

# Governed CI and the rail operator workflow

> CODEGEN-RAIL-DOCS-GOVERNED-CI-01

This doc is the operator-facing companion to [`docs/specifications/admission-rail.md`](./admission-rail.md) (the rail's concept) and [`docs/specifications/manifest-schema.md`](./manifest-schema.md) (the manifest's reference). Read those first if you haven't — this doc assumes you know what the rail proves and what the manifest carries.

This doc owns: what the operator runs, what CI runs, how the two compose, how to read the rail's outputs, and how to cite a rail result so a reviewer can rerun it.

## The rail commands

### `pnpm run governed:rail`

The default invocation. Equivalent to:

```bash
pnpm run generate:check \
  && pnpm run generate -- --target=all \
  && node packages/ds-codegen/dist/validation/validate-cli.js \
       --require-artifact-manifest
```

Three phases:

1. **Validate contracts** — schema shape plus cross-graph semantic checks, before anything is emitted. A contract that fails here never reaches the emitters, so the rail never admits bytes produced from an invalid graph.
2. **Generate** every registered target from contracts. Writes the v6 manifest at `packages/ds-codegen/.emission-manifest.json` as the last step.
3. **Validate** in required mode. Refuses to pass unless every integrity invariant holds (see admission-rail.md's diagnostic-code reading guide).

Exit code 0 = the bytes on disk match the manifest's claims across all four evidence rungs (artifact, contract, emitter source, environment) and every framework plan passed. Exit 1 = at least one rung drifted or a plan failed; stderr names the specific diagnostics with their codes and paths. Exit 2 = the validator hit a fatal error (for example an unknown `--framework`).

The validator writes to three surfaces:

- **stdout** — the canonical machine-readable JSON `RailReport`. The two earlier phases log their progress to stdout too, so the stdout of `pnpm run governed:rail` is not pure JSON. To query the report, run the validator on its own after a generation (see [Reading the RailReport JSON](#reading-the-railreport-json)).
- **stderr** — a human-readable summary table plus a "Required-mode diagnostics" block when codes fired.
- **`tmp/generated-admission-report.md`** (gitignored) — a markdown projection, written only when the run attributes components to a manifest. Without a usable manifest the validator skips it and says so on stderr, so a file from an earlier run can remain.

### `pnpm run governed:rail:changed`

Adds a reviewer projection scoped to the git range `origin/main...HEAD`:

```bash
pnpm run generate:check \
  && pnpm run generate -- --target=all \
  && node packages/ds-codegen/dist/validation/validate-cli.js \
       --require-artifact-manifest \
       --scope-to-git-range origin/main...HEAD
```

Same three phases. Same exit code semantics. Same JSON canonical output. The addition is a `scopedProjection` field on the report and a "Changed artifact scope" section in the markdown, narrowing the highlighted evidence to the change-relevant subset.

**The rail still admits the FULL workspace in scoped mode.** The scoped report is reviewer ergonomics, not a reduced gate: the rail's overall verdict is independent of the projection.

### `pnpm run governed:rail:react-native`

React Native is part of the default rail, and also has a targeted admission
lane for RN-only iteration:

```bash
pnpm run generate:check \
  && pnpm run generate:react-native \
  && node packages/ds-codegen/dist/validation/validate-cli.js \
       --require-artifact-manifest \
       --framework=react-native
```

This admits the generated RN package through package typecheck, lint, the package test script (`pnpm --filter @full-stack-ds/react-native run test`, whose render tests run against the Vitest-only native host shim aliased in `packages/ds-react-native/vitest.config.ts`), and required-mode manifest integrity scoped to the RN framework id. The lane does not prove simulator/device runtime behavior, native visual parity, platform accessibility parity, anchored collision handling, or compound-part emission.

`pnpm run governed:rail:react-native:changed` adds the same git-range projection as the web changed rail.

## Anatomy of a rail run

```
┌─────────────────────────────────────────────────────────────────┐
│ 0. pnpm run generate:check                                      │
│    • Contract schema shape + cross-graph semantic checks,       │
│      before any emission.                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. pnpm run generate -- --target=all                            │
│    • Build codegen (tsc).                                       │
│    • Read every loader-discovered contract.                     │
│    • Build IR per contract.                                     │
│    • For each framework, emit one artifact group per component  │
│      carrying all of that component's files.                    │
│    • Write .emission-manifest.json with v6 environment +        │
│      emitterSourceSets + groups + per-file digests.             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. node validate-cli.js --require-artifact-manifest             │
│                                                                 │
│    Read manifest:                                               │
│      • readManifestForVerification() — structural sanity        │
│        + digest grammar + framework key coverage.               │
│      • Returns {absent | schema_mismatch | parse_error | ok}.   │
│      • Non-ok kinds short-circuit framework plans.              │
│                                                                 │
│    Verify integrity (if manifest read = ok):                    │
│      • Output integrity: all manifest files exist + match sha.  │
│      • Untracked generated paths: walk components trees.        │
│      • Contract integrity: each contract still on disk + sha.   │
│      • Emitter integrity: each declared source still on disk.   │
│      • Environment integrity: nodeMajor, pkg version, lockfile. │
│                                                                 │
│    Run framework admission plans (parallel where independent):  │
│      • react: tsc + eslint                                      │
│      • vue: package typecheck (vue-tsc) + eslint                │
│      • svelte: package typecheck (svelte-check) + eslint        │
│      • angular: tsc + ngc strictTemplates + eslint              │
│      • lit: tsc + lit-analyzer + eslint                         │
│      • react-native: package typecheck + eslint + package tests │
│                                                                 │
│    Join manifest × command scopes → ArtifactAdmissionEntry per  │
│    group. Build per-component admission index.                  │
│                                                                 │
│    Optional: project to git range → scopedProjection.           │
│                                                                 │
│    Emit:                                                        │
│      stdout — RailReport JSON                                   │
│      stderr — summary table + required-mode diagnostics         │
│      tmp/generated-admission-report.md (when components are     │
│        attributed to a manifest)                                │
│                                                                 │
│    Exit 0 iff:                                                  │
│      • All required-mode invariants hold AND                    │
│      • Every framework plan exited 0.                           │
└─────────────────────────────────────────────────────────────────┘
```

Order matters: integrity invariants are checked BEFORE framework plans run. Catastrophic failures (MISSING / MALFORMED / SCHEMA_MISMATCH) short-circuit plan execution — running tsc/ngc/lit-analyzer when the evidence trail is already broken would only add misleading "pass" lines to a report that's going to fail anyway.

Non-catastrophic integrity diagnostics (HASH_MISMATCH, CONTRACT_HASH_MISMATCH, etc.) let plans run, because plan output is still meaningful evidence even when content has drifted.

## CI integration

The rail is wired into the gate job of [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) as a two-step proof. The order of these two steps is the load-bearing piece:

```yaml
- name: Governed generated-artifact rail
  run: pnpm run governed:rail

- name: Generated artifacts are committed
  run: node scripts/committed-tree-check.mjs generated
```

The steps after them — Compose↔RN token parity, the iconography export and ledger checks, and the realization ledgers (behavior, a11y, dead slots, pseudo-state, state suppression, token resolvability, custom regions, motion, carrier reachability, variant realization) — classify the bytes these two steps have just verified. The macOS GPUI job regenerates only the GPUI target and runs the same committed-output check after it.

### What each step proves

**Step 1 (`governed:rail`)**: every registered target was regenerated from contracts, and the rail-admitted families were admitted by required-mode manifest validation. After this step succeeds, the bytes on disk:

- Match the manifest's recorded digests across all four evidence rungs.
- Pass each rail-admitted framework's compiler, template checker and linter.

But — and this is why step 2 exists — the regeneration in step 1 may have changed bytes from what was committed. The manifest now matches disk, but disk may not match the committed tree.

**Step 2 (`committed-tree-check.mjs generated`)**: the regenerated workspace was already committed. The script fails when any tracked byte under `packages/` differs from `HEAD`, or when an untracked, non-ignored file appeared there, and lists each path with its git status. If it fails, the contracts or emitters changed without their emitted artifacts being regenerated and committed.

The check covers all of `packages/` rather than a list of generated roots. The generator writes from several code paths — components, barrels, primitives, content-transform runtimes, glyph catalogs, Figma descriptors, Unity and Godot components — into every target package, and a root list falls behind each new writer. Untracked files count because `git diff` alone cannot see a newly emitted file that was never committed.

### Why the order is load-bearing

Reversing would let a stale workspace pass the diff check on the way in:

- If the committed-output check ran first against an unchanged stale workspace, it would pass (the committed bytes match themselves).
- Then `governed:rail` would regenerate and the check would already be over.
- The change would land with stale artifacts.

Validating first, then refusing drift, is the only ordering that catches "contract changed but artifacts weren't regenerated."

### The same checks before a push

[`.githooks/pre-push`](../../.githooks/pre-push) runs the same script twice:

1. **Before any gate**, `committed-tree-check.mjs pushed <tip>` runs once per pushed ref and refuses the push when the working tree differs from any pushed commit — a tracked edit, staged or not, or an untracked, non-ignored file. The hook's gates read the working tree while the push publishes the commits, so without this a stray file could fail lint for a commit CI would pass, and an uncommitted fix could pass a commit CI would fail. Two refs whose trees differ cannot both match, so a push of several refs passes only when they all carry the checked-out tree; the first ref sets the range the classifier scopes.
2. **After `governed:rail`**, when the hook's classifier selects the rail group, `committed-tree-check.mjs generated --against <tip>` refuses regenerated output the pushed commit does not carry.

On a working branch, run `pnpm run governed:rail` on its own: a dirty tree is routine there, and the rail's verdict is still meaningful evidence about the bytes on disk.

### Failure modes in CI

| Symptom | Cause | Repair |
|---|---|---|
| `governed:rail` step fails with a `RAIL_REQUIRE_MANIFEST_*` diagnostic | Manifest invariant broken (digest drift, missing path, environment mismatch). | Read the diagnostic code and follow the repair in admission-rail.md's reading guide. Usually: `pnpm run generate -- --target=all`, then commit the resulting changes under `packages/`. |
| `governed:rail` step fails on a framework check (tsc/ngc/lit-analyzer/eslint/etc.) | Generated code doesn't compile or fails framework lint. | Read the framework diagnostic block in stderr. The fix typically lives in the contract or the emitter — not in the generated file (which is overwritten on regenerate). |
| `governed:rail` passes, the committed-output step fails | Contracts or emitters changed but the generated output under `packages/` wasn't regenerated and committed. | Run `pnpm run generate -- --target=all` locally, then commit every path the check listed. |
| pre-push refuses before any gate, listing paths | The working tree differs from the pushed commit. | Commit or remove the listed files, or push from a checkout that matches the commit. |

The third row is the case the step order exists for: a contract is edited, tests pass locally against the existing committed artifacts, and the change is pushed without regenerating.

## Reading the RailReport JSON

The validator's stdout is the canonical machine-readable record. The full type is `RailReport` in [`packages/ds-codegen/src/validation/types.ts`](../../packages/ds-codegen/src/validation/types.ts).

Top-level shape:

```ts
{
  timestamp: string;                          // ISO 8601 of the rail run
  scope: "workspace";                         // Always — see "what the rail is not" in admission-rail.md
  artifactSelection: "by_manifest" | "none";  // "by_manifest" when a manifest was consumed
  artifactManifest: EmissionManifest | null;  // The full manifest the rail attributed against
  requireArtifactManifest: boolean;           // Was --require-artifact-manifest passed?
  requiredModeDiagnostics?: RailDiagnostic[]; // Present when requireArtifactManifest = true
  componentsIndex?: ComponentAdmissionIndex;  // Per-component pivot of per-framework artifacts
  scopedProjection?: ScopedProjection;        // Present when --scope-to-git-range was passed
  frameworks: Record<FrameworkId, FrameworkValidationResult>;
  knownGaps: string[];                        // Declared analyzer-policy boundaries
  overall: "pass" | "fail";
}
```

### Common queries

Run the validator once after a generation and keep its stdout in a shell variable; each query then reads that report:

```bash
pnpm run generate -- --target=all
report="$(node packages/ds-codegen/dist/validation/validate-cli.js --require-artifact-manifest)"

# Did the rail pass?
jq '.overall' <<<"$report"
# → "pass" or "fail"

# What required-mode diagnostics fired (if any)?
jq '.requiredModeDiagnostics // [] | map(.code)' <<<"$report"
# → ["RAIL_REQUIRE_MANIFEST_CONTRACT_HASH_MISMATCH"]

# Which files drifted in a HASH_MISMATCH diagnostic?
jq '.requiredModeDiagnostics | map(select(.code == "RAIL_REQUIRE_MANIFEST_HASH_MISMATCH")) | .[0].paths' <<<"$report"

# How many groups did each framework admit?
jq '.frameworks | to_entries | map({key, count: (.value.artifacts // []) | length})' <<<"$report"

# What does the component pivot say about Button?
jq '.componentsIndex.Button' <<<"$report"
# → {react: {status, coverages, knownRuleNarrowings}, vue: {...}, ...}

# What were the scoped projection counts? (add --scope-to-git-range <base>...<head> to the validator)
jq '.scopedProjection | {matched: (.matchedGroups | length), changedFiles: (.changedGeneratedPaths | length), changedContracts: (.changedContractPaths | length)}' <<<"$report"

# What environment produced this manifest?
jq '.artifactManifest.environment' <<<"$report"
# → {nodeMajor: 22, codegenPackageVersion: "1.0.0", lockfile: {...}}
```

### Stable claims

These fields are public API for report tooling; they are not renamed without a deliberate breaking change:

- `overall` — always `"pass"` or `"fail"`.
- `requiredModeDiagnostics[i].code` — one of the documented `RAIL_REQUIRE_MANIFEST_*` codes.
- `frameworks[<id>].status` — `"pass"` or `"fail"`.
- `frameworks[<id>].checks` — the per-check outcome map.
- `componentsIndex[<name>][<framework>].status` — `"pass" | "fail" | "not_admitted"`.
- `scopedProjection.matchedGroups[i]` shape (component, framework, contract, files, admission).

Other fields (timestamps, manifest sub-shapes) follow the schema version in [`docs/specifications/manifest-schema.md`](./manifest-schema.md).

## Reading the markdown report

`tmp/generated-admission-report.md` is a readable projection of the same JSON, written when the run attributes components to a manifest. It is local and gitignored, and the next run overwrites it, so it is a reading aid, not evidence a reviewer can retrieve.

Section layout:

```
> Derived from RailReport at <timestamp>; manifest schemaVersion vN.
> The JSON is canonical.

# Framework admission rail report

- Overall: PASS|FAIL
- Scope: workspace
- Artifact selection: by_manifest | none
- Required-mode invocation: yes | no
- Manifest: <count> group(s), <count> file(s), schema vN, generated <when>

## Per-framework summary
  Table: framework | status | duration | checks | artifact groups

## Environment provenance         (only when manifest present)
  - Node major
  - Codegen package version
  - Lockfile path + short hash

## Per-framework emitter provenance (only when manifest present)
  Table: framework | source files count

## Changed artifact scope          (only when --scope-to-git-range was passed)
  Doctrine sentence: "Reviewer projection over the full admission
  report below. The rail still admitted the full workspace."

  - Counts: matched groups, changed files, changed contracts,
    unmatched generated paths, non-generated changed paths.

  Tables for: matched groups (with contract column),
              unmatched generated paths (with required-mode hand-off note),
              changed contracts (with required-mode hand-off note),
              non-generated changed paths.

## Per-component admission index    (only when manifest present)
  Table: Component | react | vue | svelte | lit | angular | react-native
  Cell values: status + coverage abbreviations + (rule narrowings if any).

## Required-mode diagnostics        (only when requiredModeDiagnostics non-empty)
  One subsection per diagnostic code, with message and up to 10 affected paths.

## Known gaps                       (only when knownGaps non-empty)
  Verbatim list of declared analyzer-policy boundaries.
```

The authority line at the top — "The JSON is canonical." — is deliberate: the markdown is a derived projection, and the JSON is what a reviewer queries.

## When to use `governed:rail:changed`

The changed-artifact projection is for **reviewer focus, not CI pipeline efficiency.** Two valid use cases:

1. **Reviewer walk-through.** For a change that touched contracts or codegen, the "Changed artifact scope" section names exactly which artifact groups were affected, which contracts changed, and which admission entries covered them. Faster comprehension than reading the full report.

2. **Enumerating affected components.** For a multi-component contract change, scoping lists the affected components without manually filtering the full per-component index.

Two invalid use cases:

1. **"Make CI faster."** The scoped report is a projection over the full admission run. It does not reduce verification scope. CI uses `governed:rail` (unscoped); `governed:rail:changed` runs the same full generate + full validate pipeline.

2. **"Skip rail for unchanged components."** The scoped report's `unmatchedGeneratedPaths` exists specifically to surface changed generated paths that no manifest group claims (the manifest is stale relative to the change). Treating a clean projection as "nothing changed" misreads the doctrine — the projection is what changed in the manifest's view, NOT a proof that nothing else needs checking.

## Local vs CI invocation

| Surface | Local | CI |
|---|---|---|
| `pnpm run governed:rail` | yes — verify before commit; pre-push runs it when the classifier selects the rail group | yes — gate job |
| `pnpm run governed:rail:changed` | yes — reviewer walk-through | no — the unscoped form is the gate |
| `node scripts/committed-tree-check.mjs generated` | pre-push, after the rail, against the pushed tip | yes — gate job after the rail, and GPUI job after `generate:gpui` |
| `node scripts/committed-tree-check.mjs pushed <tip>` | pre-push, before every gate | no — CI checks out the commit itself |
| `pnpm test` + `pnpm run test:vue` | yes; pre-push runs both when the classifier selects tests | yes — gate job |
| `pnpm run test:coverage` | yes | yes — coverage job: react, codegen, figma-plugin, tokens, showcase, vue, svelte, lit, angular and react-native suites under coverage thresholds |
| `pnpm run test:frameworks` | yes | no — CI runs the Svelte, Lit and Angular suites only through `test:coverage`; the React Native suite also runs in the gate job as the rail's react-native runtime check (`pnpm --filter @full-stack-ds/react-native run test`) |

## Citing a rail result

A citation is useful only if a reviewer can rerun it from a clean checkout. Cite three things: the command, the commit SHA it ran at, and its exit code. Counts, diagnostic codes and component lists are claims the reviewer re-derives by rerunning that command at that commit; quote them as such.

Do not cite a redirected stdout file, `tmp/generated-admission-report.md`, or `packages/ds-codegen/.emission-manifest.json`. All three are gitignored, per-machine state: they do not exist on a clean checkout, and the next run overwrites them.

### Citing a clean run

> `pnpm run governed:rail` exits 0 at `<sha>`, and `node scripts/committed-tree-check.mjs generated` exits 0 after it.

### Citing a scoped run

`origin/main` moves, so pin the range to commits:

> At `<head-sha>`, after `pnpm run generate -- --target=all`, `node packages/ds-codegen/dist/validation/validate-cli.js --require-artifact-manifest --scope-to-git-range <base-sha>...<head-sha>` exits 0; its scoped projection matches the Button groups on react, vue and lit and the changed contract `packages/ds-contracts/components/Button/Button.contract.json`.

### Citing a drift-and-fix

> At `<before-sha>`, `pnpm run governed:rail` exits 0 and `node scripts/committed-tree-check.mjs generated` then exits 1, listing the Button files under `packages/ds-*/src/components/Button/` that regeneration changed. `<fix-sha>` commits the regenerated output; at `<fix-sha>` both exit 0.

`governed:rail` rewrites the manifest before it validates, so on a clean checkout the hash and missing-source diagnostics (`*_HASH_MISMATCH`, `*_MISSING`) cannot fire: stale bytes show up in the committed-output check instead. A diagnostic that can fire there is one generation itself leaves behind, such as `RAIL_REQUIRE_MANIFEST_UNTRACKED_GENERATED_PATHS` for a committed generated file that no contract produces any more. A diagnostic seen only against a manifest from an earlier local run is local state; cite the command that reproduces the underlying drift instead.

### Citing a known-gap declaration

Known gaps are declared in tracked source: each framework plan's `knownGaps` list under `packages/ds-codegen/src/validation/frameworks/`. Cite the file and quote the entry, for example the Lit `no-incompatible-type-binding` boundary in `packages/ds-codegen/src/validation/frameworks/lit.ts`.

## Where to read next

- [`docs/specifications/admission-rail.md`](./admission-rail.md) — the conceptual entry point. What the rail proves, the four evidence rungs, the doctrinal non-claims, the diagnostic-code reading guide.
- [`docs/specifications/manifest-schema.md`](./manifest-schema.md) — the manifest's field-by-field reference and schema version history.
- [`docs/codegen-authority.md`](../codegen-authority.md) — the authority split that frames the rail's "validation evidence, not generation policy" role.
