# Examples

Consumer-app parity proving surfaces. **Not** demos, **not** documentation, **not** marketing surfaces.

This directory is the consumer-side falsification surface for the normal-form claim. The core repo proves that contracts can generate framework packages; `examples/` asks the next question: can those packages survive ordinary app composition without consumers learning renderer internals, generated file layout, or framework-specific escape hatches?

Each app shape declares one framework-neutral spec, then each framework lane realizes that spec through only its package's public exports. A passing example is bounded evidence that the public package boundary is usable. A failing example is also valuable: it localizes whether the leak is in the contract, IR, emitter, package export map, generated runtime behavior, or the app spec itself.

Read this as a proving-ground portfolio, not a demo gallery. Every app shape must name the claim it pressures, the falsifiers it admits, the evidence files it produces, and the non-claims it leaves outside scope.

## Current Status

| App shape | Implementations | Standing | Primary claim |
|---|---|---|---|
| `settings/` | `react/`, `vue/`, `react-native/`, `swift/`, `compose/` | scaffolded evidence lanes | A small forms, overlay, and layout consumer app can build against public package exports. The Vue lane is build/typecheck consumer evidence; the RN lane is typecheck-only consumer evidence; generated RN package admission lives in the default rail. The Swift lane is compile-only consumer evidence over the generated `ds-swiftui` package (macOS CI job; locally runnable for visual checks) realizing the Switch rows, the Stack primitive, FsdsButton actions, Card section chrome, FsdsField form rows, Input text controls, the Dialog confirmation modal, and the Tooltip hint today — the full settings-spec component set, with unrealized regions composed from plain SwiftUI and ledgered as non-claims in the lane README. The Compose lane (`FEAT-EXAMPLES-COMPOSE-SETTINGS-001`) is compile-only consumer evidence over the generated `ds-jetpack-compose` package via Gradle composite build — the Preferences rows through the generated `Switch`, unrealized regions plain Compose, CI-compiled in the `native-compile-rail` job's settings-lane step, locally runnable via `./gradlew run`. |
| `motion-lab/` | `svelte/`, `lit/` (GSAP), `swift/`, `compose/` (native animation) | browser-verified web lanes (Chromium, sampled evidence under `tmp/`), compile-only native lanes | Consumer-side animation engines and platform-native animation can drive FSDS public exports with every duration/easing/stagger/dwell resolved from the motion token graph at consumption time — including per-character text symbol swaps, exclusive single-channel takeover inside a component (Skeleton `animate="none"`), and SVG glyph effects — all outside the design system's own code. First slice promoted a real packaging fix: `@full-stack-ds/svelte` now ships a `./styles.css` consumer export. See [`motion-lab/spec.md`](./motion-lab/spec.md). |
| `operations-dashboard/` | _none yet_ | spec scaffold only | A dense internal operations surface — multi-axis filtering, a high-density queue, a selection-driven detail panel, status summaries, and overlay workflows — can be composed from public package exports with identical semantics across the five web frameworks. (Assembly-layer proving surface; no lanes implemented.) |
| `storefront-checkout/` | _none yet_ | spec scaffold only | A storefront-to-checkout assembly — product browsing, a derived-total cart, promo/error messaging, a validated multi-step checkout with disabled/validating/pending states, and review/confirmation — can be composed from public package exports with identical semantics across the five web frameworks. (Assembly-layer proving surface; no lanes implemented.) |
| `social-feed/` | _none yet_ | spec scaffold only | A dense social-feed assembly — nested-action feed items, a validating composer, optimistic reactions/comments with pending/error reconciliation, overflow menus driving report/hide flows, and a profile/notification surface — can be composed from public package exports with identical semantics across the five web frameworks. (Assembly-layer proving surface; no lanes implemented.) |
| `spatial-console/` | `web/` (React + Vue + Lit in one page) | experimental; locally runtime-verified, not in CI | React, Vue and Lit panels built from public package exports can be drawn into a WebGL scene via WICG HTML-in-Canvas and act as input surfaces for the scene through the browser's own hit testing. A second page, `cat.html`, is the typing-cat meme: one React site live on a laptop, tablet and phone at their own responsive layouts, typed into by a cat puppet driven by your keyboard and mouse. Requires a flagged Chrome; see [`spatial-console/README.md`](./spatial-console/README.md) for findings and non-claims. |

`settings/` and `motion-lab/` are the app shapes with implemented lanes. `settings/` covers forms/overlay/layout parity (`react`, `vue`, a typecheck-only `react-native` fixture, a compile-only `swift` lane, and a compile-only `compose` lane); `motion-lab/` covers the animation stress axis (`svelte` + `lit` GSAP lanes verified in a browser at sampled states; compile-only `swift` and `compose` native lanes). The three assembly-layer app shapes — `operations-dashboard/`, `storefront-checkout/`, `social-feed/` — are **spec scaffolds only**: each has a framework-neutral `spec.md` and empty `react/`, `vue/`, `svelte/`, `angular/`, `lit/` lane folders (`src/.gitkeep` placeholders), and **no** implementation, package, or build files. They name a bounded claim a future lane will pressure; none of that claim is proven yet.

The five-framework app-parity claim is not proven by `examples/` yet. The repo's admitted five-framework evidence lives in codegen, generated packages, the governed rail, and the runtime fact rail. The examples directory is the consumer-transfer lane that should eventually make those claims more app-shaped.

These three app shapes deliberately sit at the **assembly** layer of the repo's layered component methodology (`src/views/ComponentComplexityView.tsx`: primitives → compounds → composers → assemblies). The methodology places a checkout flow, a dashboard, and an activity surface in the assembly tier — product-specific flows composed from system parts and *never forking or re-styling them*. That doctrine is the same boundary `examples/` enforces, stated in the methodology's vocabulary: an example that can only be assembled by reaching past the package boundary is evidence the composer/compound layer is not yet expressive enough to support assemblies.

## Normal-Form Pressure

`examples/` does not reinterpret contracts. It pressures the surfaces that normal form is supposed to make stable for consumers:

| Normal-form concern | How examples pressure it |
|---|---|
| Semantic authority | `spec.md` owns app requirements; framework lanes are realizations, not separate designs. |
| Public descriptor boundary | Apps import package exports only; private generated paths are treated as boundary failures. |
| Target transfer | The same app spec must survive React, Vue, Svelte, Angular, and Lit without semantic rewrites. |
| Fail-loud governance | Build, type, import, and interaction failures are evidence, not noise to work around. |
| Consumer dependency hygiene | App code must not depend on renderer seams, generator internals, or local styling patches to make behavior possible. |

If an example can only pass by teaching the consumer a framework-specific trick, the example did its job: it found a place where the normal-form boundary is too weak.

## Directory Contract

Each app shape follows this layout:

```text
examples/
  <app-name>/
    spec.md
    react/
    vue/
    svelte/
    angular/
    lit/
```

`spec.md` is the authority surface for the app shape. It states the app's required structure, interactions, component coverage, acceptance bar, findings, and non-claims. Framework directories are realizations of that spec, not independent product designs.

Framework lanes may use framework idioms. They may not change the app semantics. If a framework implementation needs a private import, hand-rolled substitute, CSS override, or behavior escape hatch that the others do not need, that is a parity finding.

## Data and API Layer

Examples have **no backend** — no server, no network, no persistence. But an app shape that pokes the UI directly at raw in-memory objects does not read real-to-life, and it fakes the async states (pending / optimistic / error) that make an assembly worth proving. So app shapes that need data structure their lane as three separated concerns:

1. **Fixtures** — static `*.json` / `*.jsonl` files in the lane holding the mock data (incidents, products, posts, etc.). Authored by hand; never imported from a package.
2. **Adapter** — a lane-local reader that parses the fixture(s) into typed records. The adapter is the only thing that touches the raw file shape; everything above it sees typed domain objects. The adapter may load the static JSON/JSONL fixtures once into memory; the UI calls only the promise-returning API, never the fixture or adapter directly.
3. **Functional API** — a lane-local, typed, **promise-returning** data-access surface (`getIncidents()`, `applyPromo(code)`, `submitComment(postId, body)`, …). The assembly calls only this API; it never reads the fixture or the adapter directly. Latency, the mock-failure flag, and any product policy live behind the API, so the UI's pending/optimistic/error states are *real* state transitions, not synchronous fakes.

This keeps "no backend" literally true — nothing leaves the bundle — while giving each assembly a real-to-life data boundary. The functional API is **app-layer code that lives entirely in the lane**: it is *not* part of the public package boundary and never substitutes for component behavior. A spec that needs data names its API surface in its State model; a spec that needs none (e.g. a pure forms app) may omit this layer.

This is **doctrine for the future framework lanes**, not a scaffolding step bundled into a spec-only slice. Materializing the fixtures/adapter/API for an app shape is follow-on implementation work, tracked under its own spec. The first such materialization — the **golden example** — landed for `operations-dashboard/` (see [`operations-dashboard/README.md`](./operations-dashboard/README.md) and `operations-dashboard/{fixtures,src}/`); `storefront-checkout/` and `social-feed/` are still framework-lane scaffolds (`.gitkeep` only) and their data/API seam is not yet materialized.

## Golden data/API template

`operations-dashboard/` is the reference implementation of the data/API seam. Any app shape that materializes its own seam must copy these invariants so the pattern stays uniform across apps and parity does not drift. Read it alongside the working code in `operations-dashboard/` — this section is the contract, that directory is the example.

**Layer shape** (same in every app):

```
fixtures/*.json(l)  →  src/data/adapter.ts  →  src/api/ (+ index.ts barrel)  →  (future) framework lane UI
   raw fixture shape     parses/joins/memoizes    promise-returning API            imports the barrel only
```

**Transferable invariants:**

1. **Fixtures are static `*.json` / `*.jsonl`.** Hand-authored, committed, never imported from a package. JSONL for row/event streams (incidents, posts, comments, timeline events); JSON for small lookups/config (services, environments, descriptions).
2. **The adapter is the only layer that touches raw fixture shape.** It reads, parses, lightly validates, and joins fixtures into typed domain records. Nothing above it knows the file format. A malformed fixture *throws* at load time (an authoring error) — it is not surfaced to the UI as a domain failure.
3. **The adapter may load fixtures once into memory** and memoize the parsed snapshot. The API owns any mutable working copy; the adapter's snapshot stays immutable-by-convention.
4. **Domain types are lane-local app-layer types** (`src/types/`), not package exports and not FSDS contract types. They describe what the adapter parses and what the API returns.
5. **The API is promise-returning.** Every method is `async`, so the UI's loading / empty / error / pending / optimistic states are *real* async transitions, not synchronous fakes.
6. **The API returns a typed `ApiResult<T>` for domain failures** — a discriminated `{ ok: true; value: T } | { ok: false; error: ApiError }` — rather than throwing or rejecting. UI lanes narrow on `result.ok` and on `error.code` to drive error states without wrapping every call in `try/catch`. (Programmer errors — e.g. a malformed fixture at construction — may still throw.)
7. **Latency and failure are injectable and deterministic.** Latency is a fixed `latencyMs` option (default `0` so tests run instantly; a lane passes e.g. `400` to exercise loading states). Failure is an explicit flag/option (`failLoads`, or a runtime toggle like `simulateLoadFailure(enabled)`) — **never** wall-clock randomness or `Math.random()`. The same inputs always produce the same result, so the same code path is testable.
8. **A barrel file (`src/api/index.ts`) is the future UI consumption boundary.** It re-exports the API factory/class and the domain types. Future framework UI imports the barrel **only** — never the adapter (`src/data/`) and never the raw `fixtures/`. Reaching past the barrel is a boundary violation, the same class as reaching past the `@full-stack-ds/<fw>` public package exports.
9. **Tests cover the seam, not the UI.** A focused `src/**/*.test.ts` suite proves, at minimum: **parse** (every fixture row loads and joins), **query/filter** (each filter axis and cross-axis combination), **detail/read** (a single record + its joined relations), **mutation** (state-changing methods change observable state and isolate per API instance), **typed failure** (the simulated-failure flag yields the right `ApiError.code`, with a recovery/retry path), and **one falsifiability probe** (deliberately corrupt a fixture or expectation and confirm the relevant test goes red — proving the suite can fail for the right reason). Tests run under plain Vitest in a Node environment with `latencyMs: 0`.
10. **The adapter must be isomorphic — runtime-portable across node and browser.** The seam is consumed by both the Node test runner (the Vitest data/API lane) and browser framework lanes (Vite). The adapter loads fixtures as bundler modules — `?raw` imports for JSONL (parsed by the lane-local `parseJsonl`), native JSON imports or `?raw` + `JSON.parse` for JSON — and must **never** use `node:fs` / `node:url` / `node:path`. Those specifiers externalize to *throwing stubs* under a browser bundler: the production build succeeds, but the app crashes at runtime (e.g. `Uncaught TypeError: fileURLToPath is not a function`) with an empty root. That failure is invisible to both the build and the Node data/API test lane — which is why runtime portability is governed by this invariant, not by the test lane: a framework lane built against the seam must render in a real browser with a non-empty root and no node-externalization console error. A seam that copies invariants 1–9 but reaches for the node filesystem will pass every data/API test and still block every browser lane.

**Test-running note.** The root Vitest `include` covers `packages/**` and `src/**` only — it does **not** include `examples/**`, so the root `pnpm test` does not collect these suites. The committed **examples data/API test lane** runs all of them through one command: `pnpm run test:examples:data-api` (from the repo root, backed by `vitest.examples.config.ts`, Node environment). Use that command rather than a per-app scratch config, and do **not** widen the root test config to pick these up as part of a data/API slice. This lane proves the data/API seam only — not framework app parity, not visual proof, not backend proof, and not generated-artifact admission. Whether `examples/` joins CI is a separate future slice, not wired by this lane. Because this lane runs under Node only, it is structurally blind to a node-only adapter — runtime portability is governed by invariant #10 above, whose falsifier is a browser lane rendering, not a Node test.

A subagent materializing a new app's seam copies invariants 1–10 verbatim and only varies the *domain* (the records, the filter axes, the mutation methods) and the **one app-specific data/API decision** pinned in that app's own `spec.md` (see each spec's "Data and API layer" section).

## Claim Surface

Each app shape should answer these reviewer-facing questions before it becomes an admission target:

| Question | Requirement |
|---|---|
| Claim | What consumer-app capability is being pressured? |
| Falsifier | What concrete build, render, interaction, or package-boundary failure disproves the claim? |
| Stress axis | Which component family or consumer pattern is under pressure: forms, overlays, layout, state, animation, data display, or cross-framework composition? |
| Transfer | Does the same spec work across React, Vue, Svelte, Angular, and Lit without framework-specific semantic changes? |
| Evidence closure | Can a reviewer rerun the build and interaction checks from committed files only? |

An app shape without those answers is a useful scratch consumer, but it is not yet admissible evidence. The bar is not "the app looks plausible." The bar is "the app makes the package boundary falsifiable."

## What These Prove

1. Public package consumption: examples import from `@full-stack-ds/<framework>` package exports only.
2. Consumer-facing normal form: generated packages expose enough stable surface for app code to compose components without renderer knowledge.
3. Contract-level transfer pressure: one app spec must be realized in multiple framework idioms without smuggling framework lore into the spec.
4. Consumer API gaps: examples reveal missing events, missing attributes, incomplete CSS exports, awkward compound-component exports, or type surfaces that the showcase can hide.
5. Localized failures: if every framework fails the same way, the contract or shared codegen is suspect; if only one framework fails, that framework package or emitter is suspect.

## Falsifiers

The examples lane should fail honestly on any of these:

- A framework app cannot build from committed workspace packages.
- A package export is missing for a surface ordinary consumers need.
- An implementation reaches into `dist/`, generated internals, source files, or non-exported package paths.
- The implementation uses local CSS to supply behavior, structure, or state indication that the package should own.
- The app spec has to be rewritten for one framework to make the implementation possible.
- A required interaction works in one framework implementation but not another.
- The same component requires materially different consumer semantics across frameworks.
- A failure can only be hidden by weakening the app spec instead of fixing the contract, emitter, package export, or runtime behavior.

## Non-Claims

- Not visual-quality proof. The examples use package CSS and should stay visually modest.
- Not accessibility adequacy proof. They exercise shipped behavior, but accessibility claims belong to component contracts, generated behavior primitives, and dedicated rails.
- Not a replacement for unit tests. Component tests remain in `packages/ds-*/src/components/`.
- Not a replacement for the governed rail. Examples pressure package consumption; the rail binds emitted artifacts to contract, codegen, and environment evidence.
- Not current five-framework app parity. Today `settings/` has React, Vue, React Native, and Swift lanes, not all admitted Web DOM frameworks; the three assembly-layer app shapes are spec scaffolds with no lanes. The Swift lane is partial-realization evidence (only Switch exists on that target), not parity evidence.
- Not backend / data proof. Examples have no server, no network, and no persistence. Where a spec calls for a "functional API", that is a lane-local, typed, promise-returning data-access layer backed by static JSON/JSONL fixtures read through an adapter — a real-to-life *shape*, not a real backend. It proves nothing about data fetching, scale, or persistence.
- Not contract authority. App specs pressure package consumption; component semantics still live in `packages/ds-contracts/`.

## How to Run

Each implementation is a standalone app. From the repo root:

```bash
cd examples/settings/react
pnpm install
pnpm dev
pnpm build

cd examples/settings/vue
pnpm install
pnpm typecheck
pnpm build

cd examples/settings/react-native
pnpm install
pnpm typecheck
```

The Swift lane needs no install (SwiftPM, not pnpm). From the repo root:

```bash
swift build --package-path examples/settings/swift   # CI parity
swift run --package-path examples/settings/swift     # opens the window (local)
```

The motion-lab lanes (GSAP web + native animation; see [`motion-lab/README.md`](./motion-lab/README.md)):

```bash
pnpm --filter @full-stack-ds/example-motion-lab-svelte build
pnpm --filter @full-stack-ds/example-motion-lab-svelte dev
pnpm --filter @full-stack-ds/example-motion-lab-lit build
pnpm --filter @full-stack-ds/example-motion-lab-lit dev
swift build --package-path examples/motion-lab/swift   # compile admission
pnpm run typecheck:example:motion-compose
```

Run the committed examples data/API test lane (all three data seams plus the motion-lab token-adapter suite, one command):

```bash
pnpm run test:examples:data-api
```

Intended portfolio gate once examples are populated:

```bash
pnpm -r --filter "./examples/**" run build
```

If an example changes package-generated output or contract semantics, run the relevant root gates as well:

```bash
pnpm run generate:check
pnpm run governed:rail
```

## Adding an App Shape

1. Create `examples/<app-name>/spec.md`.
2. State the claim, falsifiers, stress axis, transfer expectation, acceptance bar, findings log, and non-claims in the spec.
3. Implement one framework first to expose consumer API gaps.
4. Port to the remaining admitted Web DOM frameworks one at a time.
5. Record findings in the spec until they are promoted into issues, contracts, emitters, package exports, or tests.

Good app shapes prove distinct consumer seams:

| App shape | Standing | Stress axis | Useful components |
|---|---|---|---|
| `settings/` | implemented (`react`, `react-native` typecheck fixture, `swift` compile-only lane) | Forms, overlays, basic layout | `Stack`, `Card`, `Field`, `Input`, `Switch`, `Button`, `Dialog`, `Tooltip` |
| `operations-dashboard/` | spec scaffold only | Dense operational state, filters, selection-driven detail | `Table`, `List`, `Stat`, `Status`, `Badge`, `Select`, `Checkbox`, `Dialog`, `Sheet`, `Toast`, `Alert` |
| `storefront-checkout/` | spec scaffold only | Choice controls, validation, derived totals, multi-step flow | `Card`, `Image`, `Field`, `Input`, `Select`, `Badge`, `Progress`, `Tabs`, `Dialog`, `Toast`, `OTP` |
| `social-feed/` | spec scaffold only | Dense nested interaction, media/identity, menus, optimistic state | `Postcard`, `Avatar`, `ProfileFlag`, `Image`, `Card`, `ShowMore`, `Truncate`, `Popover`, `Command`, `Details`, `Toast` |

Pick app shapes for what they can falsify, not what they look like. A good app shape is small enough that a reviewer can see the boundary failure and realistic enough that a package-consumption flaw cannot hide behind toy markup. The component columns are expected coverage, not a checklist — each spec also names *pressure-point residuals* (surfaces the app wants that may have no public export yet); a residual a lane cannot satisfy from public exports is a finding, not a reason to hand-roll.

## Adding a Framework Lane

1. Read `spec.md`.
2. Implement `examples/<app-name>/<framework>/` using only public package exports.
3. Build the app.
4. Compare consumer semantics against existing lanes.
5. If the framework needs an escape hatch, treat it as a package or emitter bug before changing the app spec.

## Evidence Files

| File | Purpose |
|---|---|
| `examples/README.md` | Portfolio-level rules for examples as consumer-pressure evidence. |
| `examples/<app-name>/spec.md` | App-shape claim, framework-neutral requirements, findings, and acceptance bar. |
| `examples/<app-name>/<framework>/package.json` | Public package-consumption boundary and build command. |
| Future Playwright specs | Runtime interaction evidence for app-level behavior. |
