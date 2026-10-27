---
doc_id: ARCH-TOKENS-ARCHITECTURE-001
authority: architecture
status: implemented
title: Design Token Architecture
owner: "@darianrosebrook"
updated: 2026-09-11
verified_at_commit: 75af15dca077ee9c48029d915f9b62cd206eed91
governs:
  - packages/ds-tokens/src/**/*.tokens.json
  - src/components/properties-panel/**
  - packages/ds-tokens/build/**
  - packages/ds-tokens/generated/tokens.css
  - packages/ds-codegen/src/validation/tokens.ts
  - vite-plugin-fsds-data.ts
---

# Design Token Architecture

> TOKENS-WORKSTREAM-STEP-07

This document is the architectural record for the design-token graph. It exists for the same reason `codegen-authority.md` exists: a contributor a year from now should be able to read one doc and know **where token authority lives, what guarantees are real, and which decisions are load-bearing.** Without that, the workstream's decisions decay into folklore that gets re-litigated every time someone adds a token.

The workstream that produced this surface (`TOKENS-WORKSTREAM-STEP-02` through `STEP-06C`, commits `7c0e4f1` → `c02cfc0`) replaced a single hand-authored 2,948-line `designTokens.css` with a DTCG-1.0-validated graph that composes <!-- token-shard-count -->161 shards into a cascade-layered output. This doc is the entry point.

## What this proves

The design-token graph in `packages/ds-tokens` provides:

1. **A DTCG-1.0-valid source.** Every leaf token is a W3C Design Tokens Community Group spec object (`$type`, `$value`, optional `$description` / `$extensions`). The strict schema in `build/w3c/w3c-schema-strict.json` is the gate; `pnpm -F @full-stack-ds/tokens validate` fails loud on any non-spec input.
2. **A single CSS surface for consumers** at `packages/ds-tokens/generated/tokens.css`. One file. Cascade-layered: `@layer core, semantic, components, theme, brand, density;`. Read by `vite-plugin-fsds-data.ts` and shipped to framework preview iframes.
3. **A namespace-prefixed CSS variable surface.** Every emitted custom property is prefixed `--fsds-` (e.g. `--fsds-core-color-palette-neutral-500`). Project-namespaced so two design systems can coexist in the same DOM without collision.
4. **A brand cascade.** Brand identity overrides land at `@layer brand` keyed by `[data-brand="<id>"]` attribute selectors. Adding a brand is one file (`src/brands/<id>.tokens.json`) and a re-build.
5. **A density cascade.** Content-density overrides land at `@layer density` keyed by `[data-density="<id>"]`. The four canonical modes (`tight`, `compact`, `default`, `spacious`) live as siblings under `src/density/`.
6. **A contract→token-graph drift gate.** `validateContractTokens` in `packages/ds-codegen/src/validation/tokens.ts` runs on every `pnpm run generate:check` and refuses to pass if a contract references a `resolvesTo` path that doesn't exist in the composed graph.

## What this does NOT prove

The same way the admission rail makes its non-claims explicit, this graph's load-bearing absences matter:

- **It does not prove value correctness.** That `semantic.color.foreground.primary` resolves to `#141414` is a design decision, not a system invariant. Color contrast and visual coherence are reviewed separately.
- **It does not prove cross-shard reference resolution succeeds at validate time.** A `{x.y.z}` interpolation that fails to resolve at the resolver pass becomes a `var(--fsds-x-y-z)` call in the CSS output, which fails at *runtime* via fallback to the inline value, not at *build time*. The composer logs `[tokens] Reference validation warnings` but the build still emits.
- **The global graph does not own component boundaries.** Component-specific design addresses and shared box resets are emitted separately. See [component design bindings](design/component-design-bindings.md) for their current scoping and runtime evidence.
- **It does not prove `$type` correctness across composite alias chains.** A `dimension`-typed token may reference a `string`-typed primitive via `{x.y.z}` and produce a syntactically valid but semantically wrong CSS value. The W3C validator catches direct shape violations; chained type drift would need its own pass.
- **It does not prove that the old token surface and the new one produced byte-identical CSS.** They do not. The new surface drops legacy variants the contracts didn't depend on (verified by the byte-compare gate; see "Cutover provenance" below) and uses different composite-flattening conventions (e.g. `0px 1px 3px #0000001f` vs. `0 1px 3px rgba(0, 0, 0, 0.12)` — semantically equivalent, lexically different).

## The authority split

```
Token graph (src/)         declares design intent — primitives, aliases, cascade rules
Build pipeline (build/)     normalizes the graph → CSS surface + composed JSON
Generated surface           consumed by vite plugin → preview iframes
Contracts (ds-contracts/)   reference token paths via `resolvesTo`
Validator (ds-codegen/      proves contracts ↔ graph stay in sync
  validation/tokens.ts)
```

### Token graph owns design intent

The graph should say things like: this color is named `palette.neutral.500` and has the value `#717171`; this dimension is `shape.radius.04 = 16px`; this semantic alias is `color.foreground.primary` and resolves to `core.color.mode.dark`; this composite shadow is `elevation.level.1 = {offsetX: 0, offsetY: 1px, blur: 3px, color: rgba(0,0,0,0.12)}`.

The graph should **not** know: what CSS property a token will be written to (that's contract); which component instances will reference it (that's the contract → component CSS join); how to flatten a composite (that's emission).

### Build pipeline owns normalization + emission

`compose.ts` walks every `src/<category>/<tier>/<subtree>.tokens.json` shard, deep-merges them into one tree, writes `generated/composed.tokens.json` (gitignored intermediate). `global.ts` walks the composed tree and emits cascade-layered CSS via `--fsds-` prefix.

The pipeline is **not** allowed to know: that `Switch.background` needs blue; that `Dialog.scrim` is `color.overlay.scrim`. That mapping is the contract's job. Pipeline emits the graph as-is; contract picks tokens by path.

### Contracts own per-component token selection

A contract declares `tokens.<part>.<key> = { resolvesTo: "<dot.path>", fallback: "<css-value>", property: "<css-prop>", layer: "<tier>" }`. The contract is naming the token it wants by graph path, declaring what CSS property it binds to, and offering a hardcoded fallback for when the global stylesheet is missing.

Contracts are **not** allowed to: invent token names that don't exist in the graph. The validator catches this at `pnpm run generate:check`. Contracts are also **not** allowed to: embed raw CSS values in component CSS (that bypasses the graph). The emitter writes `var(--fsds-<resolved>, <fallback>)` — the graph value first, the contract's hardcoded fallback second.

### Validator owns the contracts ↔ graph invariant, not generation policy

`validateContractTokens` (`packages/ds-codegen/src/validation/tokens.ts`) loads the composed tree, projects every `$value`-bearing leaf to a dot-path, walks every contract's `tokens.*` tree, and reports DRIFT for any `resolvesTo` that isn't in the projected set. It does **not** decide what tokens should exist, which `fallback` is correct, or what `property` a token binds to. It only proves the path the contract names is a path the graph defines.

## The consumption model: what each token scope is FOR

The authority split above says who *owns* each stage of the pipeline. This section
says what each token scope is *for* from the consumer's side — who invokes it, and
therefore what "declared but unreferenced" means in that scope. The two are
different questions, and conflating them produces gates that measure the wrong
thing.

| Scope | Its consumer | Invoked by | "Declared but unreferenced" means |
|---|---|---|---|
| **base + semantic** (`tokens.css`) | the system | a contract names the path in `resolvesTo` | vocabulary nobody has drawn from yet. Normal. |
| **component-scoped** (`<Name>.tokens.json`) | the design tool | overriding the custom property on an instance | the override **interface is not wired yet**. A gap, not drift. |
| **brand-scoped** (`src/brands/<id>.tokens.json`) | the system's user | a family override, a single-token override, or a palette/ramp declared for later use | an offering nobody has drawn from yet. Normal, and explicitly expected. |

Three consequences follow, and each one is a different gate.

### A declaration is vocabulary when it is inert until invoked

The defect is never "declared and unused." It is **advertised as usable and inert
when used.**

- `color.palette.pink.300` with no referrer is a word in the dictionary. Nothing
  observes it until something references it, and then it resolves. Legitimate.
- A component variant or state axis declared with no realizing CSS is *already in
  the public API* — it surfaces as a prop and as a control in the showcase. A
  consumer can select it and nothing happens. That is a broken promise, not unused
  vocabulary.

The distinguishing test is whether the declaration is **reachable by a consumer
before anyone wires it.** Palette stops are not; props and editor controls are.

### Base + semantic: gate resolvability, not reference count

For a vocabulary layer, "how much of it is in use" is not a health signal. The
health signal is the inverse: **every reference must resolve.** An unresolvable
reference silently falls back to its literal, which makes the token layer
decorative for that binding while leaving every other gate green.

This is why the non-negotiable invariant above is stated in the resolvability
direction, and it is the direction the gates run in.

**Which gate asks which question:**

| gate | question | disposition |
|---|---|---|
| `audit:token-resolvability` | does every `var(--fsds-*)` a generated stylesheet reads resolve to a declared name? | **blocking**, two-directional ledger |
| `tokens:check-contrast` | do the curated foreground/background pairs meet WCAG AA? | blocking |
| `tokens:check-brand-refs` | does every `{ref}` in a brand override resolve? | blocking |
| `tokens:check-usage` | how much of the vocabulary is referenced? | **report-only** |

`tokens:check-usage` is report-only because reference count is not a health
signal for a layer that exists to be drawn from. Gating on it makes a legal act
fail the build: replacing a brand persona orphaned 26 `core.color.palette.*`
stops — a complete generated ramp losing its last consumer — and blocked a push
with nothing broken. The remedy the gate offered was to re-baseline, which would
have recorded a deliberate redesign as permanent debt.

**Non-claim.** The resolvability rail is *not* a superset of the usage gate. A
semantic or component token that loses its last consumer is no longer detected by
any blocking gate; that signal is not preserved elsewhere. It was dropped
deliberately — it could not distinguish an accidental binding deletion from an
intentional redesign, and it demonstrated that by firing on the latter — but the
loss is real, not an upgrade in disguise.

The naming seam this rail exists to catch: a dotted token path is lowered to a
CSS custom-property name in more than one place, and if those places disagree,
codegen emits a read of a name the graph never declares. The property then
renders its fallback literal — unreachable by any brand or theme re-point, and
invisible to every other gate, because CSS has no undefined-variable error.

`packages/ds-codegen/src/token-path.ts` is the single authority for that
lowering. Both `tokenSlug` (codegen's emit side) and `tokenPathToCSSVar`
(`packages/ds-tokens/build/core/index.ts`, the declare side) call it, and
`packages/ds-tokens/build/core/token-path.test.ts` fails if either re-inlines a
second one. Namespace inference — deciding that a bare `spacing.size.04` belongs
under `core-` — deliberately stays in the token build: it applies only to
unprefixed paths and its heuristics collide with component slot names.

Token names are kebab-case in emitted CSS regardless of how the source path is
cased, so a `resolvesTo` of `semantic.shape.control.border.defaultWidth` reads
`--fsds-semantic-shape-control-border-default-width` on both sides.

### Component-scoped: the slot is the interface, so the binding is the obligation

A component-scoped slot exists to be the design tool's override point. Its
declaration is legitimate on its own terms. But an override is only live if some
rule **reads** the custom property, so a declared slot with no binding is an
interface that is not yet wired.

Two pools behave differently here, and the difference is load-bearing:

- **Box-model pool** — wired by construction. `renderBoxModelConsumers` emits a
  `var()` consumer for every pool slot on every component root, so adding a slot to
  the pool makes it genuinely settable-later by anyone, with no authoring.
- **Component-local slots** — wired only when a `styles.json` entry binds them.
  Their names are semantic role paths (`button.color.background.default`), not CSS
  properties, so no generic auto-consumption is derivable. The binding must be
  declared.

Therefore: **extend the pool, or declare the binding. Declaring a component-local
slot and expecting to wire it later does not give the design tool anything.**

The corollary constrains the editor. Control derivation must not offer a control it
cannot prove is read — see `FIX-EDITOR-CONTROL-BINDING-PROOF-01` — and the audit of
unbound slots is an interface-completeness obligation, not a deletion list, see
`FEAT-COMPONENT-SLOT-BINDING-COMPLETENESS-01`.

### Brand-scoped: semantic vocabulary may precede use; component overrides need consumers

The brand layer's job is identity — hue, type family, radius character, motion
feel. It may legitimately declare a family override, a single token, or a whole
ramp intended for later use. A ramp shipped for later use is unreferenced *by
definition*, so usage-gating this scope contradicts one of its stated purposes.
What the brand layer does owe is resolvability, which `tokens:check-brand-refs`
already enforces. This allowance covers semantic vocabulary. Overrides under
`components.<Name>` must address an existing Web property consumer, including an
unset-by-default design slot; `generate:check` rejects retired names and typos.

Two limits on the brand layer, both incident-derived:

- **A brand specializes exposed design decisions without redefining structure.**
  Component defaults remain complete, so a brand does not need a declaration for
  every component. It may distinguish action radius from menu radius, card
  padding from control padding, or outlined from borderless surfaces through the
  current component token/design-slot interface. Anatomy and behavior stay in
  the contract. [Brand expression](design/brand-expression.md) records the
  application and component examples that exercise this distinction.
- **A brand must not reach past a semantic role into a value another role depends
  on.** Re-pointing `action.background.primary` at the same core token
  `action.background.danger` uses collapses two opposed intents onto one value; the
  cascade makes the brand win and no contrast gate can see it, because both sides
  are individually legible.

### What the absence of a token restricts

Absence of a token for a design decision restricts three things:

1. **What a designer can express in the editor.** The properties panel derives its
   controls from the token surface. No token, no control, drop to code.
2. **What survives the Figma round-trip.** The descriptor target emits from IR
   facts; a decision with no token is lost or frozen as a literal, silently.
3. **What can vary per brand or theme.** With no token the value is a literal in a
   `styles.json` and cannot be re-pointed, so the axis is frozen system-wide.

It does **not** restrict the rendered result — the literal can always be
hardcoded. Absence never blocks shipping a look; it removes that look from
governance. That asymmetry is why this particular debt accumulates without
anything appearing broken.

## The non-negotiable invariant

> **Every `resolvesTo` path in every contract must correspond to a `$value`-bearing leaf in the composed token graph.**

The graph may add, alias, or rename tokens freely. Contracts may reference any path that exists. But the moment a contract names a path the graph doesn't provide, `pnpm run generate:check` fails. Future regressions of the kind that motivated this workstream — `[object Object]` in tokens.css, 6 contract paths the new graph didn't satisfy, brand-emitted vars without canonical resolution — become impossible to ship silently.

The invariant is enforced by:

- `pnpm -F @full-stack-ds/tokens validate` → DTCG strict W3C schema validation on every shard (all <!-- token-shard-count -->161 must pass)
- `pnpm -F @full-stack-ds/tokens build` → composer normalizes; emitter flattens composites; emission is regenerable
- `pnpm run generate:check` → `validateContractTokens` per contract, fail-loud per missing path

The diagnostic-code shape mirrors the admission rail: every issue is a JSON-pointer to the failing field and a sentence describing what's wrong. No silent passes, no warnings-that-are-errors-elsewhere.

## The editor wire-honesty rule

> **A properties-panel control is offered only for a slot the committed generated CSS provably reads.**

An override is live when it reaches a real property through the CSS dependency graph. Component declarations without a property or behavior consumer fail validation; semantic vocabulary may remain unused. The [component consumption contract](design/component-token-consumption.md) governs retirement and target-specific projection.

- **Proof source:** generated React CSS and the imported shared box stylesheet, parsed into property roots and declaration dependencies. Disconnected aliases, comments, and quoted strings do not count.
- **Binding rule:** material resolvers prefer read slots and omit unread roles. New design-property controls use explicit typed bindings. Shared box controls retain the layered shorthand, axis, and side precedence.
- **Rendering rule:** native-only or compile-time-only declarations are not editable Web CSS controls. Missing CSS proof establishes no live control.

Verified at runtime by `e2e/editor-binding-rail.spec.ts` (Button: the shared gap control moves the preview's computed gap and clearing restores the default) and pinned by the read-proof block of `src/components/properties-panel/control-derivation.test.ts`.

The [showcase adoption](design/showcase-component-adoption.md) changes the
inspector's UI composition to generated Accordion, Button, Input and Select
without changing token derivation or override addresses. Input preserves
native number/color semantics; Select provides labeled choices and keyboard
selection. Collapsed sections hide their controls; callers and tests open a
section before editing. The production AST guard requires zero hand-authored
control sites.

## Load-bearing decisions

These choices are not arbitrary. Changing any of them invalidates load-bearing assumptions elsewhere — call out the breakage if you propose to.

### Decision 1: One emitter, not five

The four non-React frameworks each have their own emitter under `packages/ds-codegen/src/frameworks/<framework>/`. The token graph does **not** follow the same pattern. There is one emitter at `packages/ds-tokens/build/generators/global.ts` that produces CSS, and every framework imports the same generated file.

**Why:** tokens are framework-neutral. A `--fsds-core-color-palette-neutral-500` custom property resolves the same in every consumer (React, Vue, Svelte, Angular, Lit). Per-framework emission would invent five places where the same value could drift; the property-2 / property-5 doctrine in `docs/normal-form.md` exists exactly to prevent that.

**Consequence:** if a framework ever needs framework-specific token wiring (e.g. styled-components theme, CSS-in-JS), it imports `@full-stack-ds/tokens` and projects the CSS surface into its own substrate. The token graph itself is never per-framework.

### Decision 2: `--fsds-` namespace prefix

Every emitted CSS custom property has the prefix `--fsds-`. The default is set in `packages/ds-tokens/build/core/index.ts:tokenPathToCSSVar`. Brand and density overrides preserve the prefix.

**Why:** consumer applications may run alongside other design systems (a portfolio site, a host shell, a sibling app). `--color-primary` is too generic; `--fsds-semantic-color-foreground-primary` cannot collide.

**Consequence:** contracts always reference the unprefixed dot-path (`semantic.color.foreground.primary`); the prefix is appended at emission. Don't put `--fsds-` in `resolvesTo`. The prefix defaults in two places that must change together: `tokenSlug` in `packages/ds-codegen/src/token-path.ts` (the emit side) and the `prefix` default of `tokenPathToCSSVar` in `packages/ds-tokens/build/core/index.ts` (the declare side). Editing only one recreates the declare/emit mismatch the split exists to prevent.

### Decision 3: Cascade layer order — `core, semantic, components, theme, brand, density`

`@layer core, semantic, components, theme, brand, density;` at the top of every emitted `tokens.css` (`generateLayerDeclaration()` in `packages/ds-tokens/build/generators/global.ts`). The order is the precedence order: later layers win.

**Why:** brand tokens are identity overrides — they should beat semantic defaults for the same path. Density tokens are content-density overrides — they should beat brand for spacing because density is a viewer preference, brand is a producer identity. Theme follows components and precedes brand, supplying light/dark values before the selected brand specializes them.

`components` sits between `semantic` and `theme` for a reason distinct from the other layers: it doesn't hold token *values* the way `semantic`/`brand`/`density` do — it holds the generated component CSS itself. `ds-codegen`'s `emitTokensCss` (`packages/ds-codegen/src/css.ts`) wraps every component's structure/tokens CSS in `@layer components`. Per the CSS Cascade Layers spec, unlayered styles always beat layered styles regardless of specificity — so this also gives a consuming app's plain (unlayered) CSS a reliable way to override FSDS component CSS without `!important` or specificity games. It has to sit before `brand` so that a brand's component-scoped override (`components.<Name>.<path>` in a brand's token file, landing in `@layer brand`) wins over the component's own default — see "Component-scoped brand overrides" under "How to add a new brand" below. Shipped under `FEAT-BRAND-PERSONA-SCOPE-01` (closed, merge `8107091b`) and `FEAT-BRAND-PERSONA-VISUAL-QA-01` (closed, merge `3c5f398f`).

**Consequence:** if you introduce a new layer (e.g. `motion-reduce`, `high-contrast`), think about where it belongs in this stack and update both the `@layer` declaration in `global.ts` and this doc. Layer order is not configurable — it is part of the system's stance. This mechanism does not reach Lit's shadow DOM — `emitLitInlineCss` renders inside a separate cascade context `@layer` cannot cross, so Lit's isolation still comes from shadow DOM boundaries, not this layer order.

### Decision 4: Brand selector — `[data-brand="<id>"]`, not class

Brand overrides apply via `[data-brand="<id>"] { ... }` attribute selectors, not `.brand-default { ... }` class selectors.

**Why:** data attributes carry one value per attribute. A consumer can `<html data-brand="default">` and not worry about class-list management. A class would invite multi-class composition (`.brand-default .brand-corporate`) which conflicts with cascade-layer semantics. Attribute selectors also pair naturally with `[data-density="<id>"]` and any future `[data-mode]` / `[data-theme]` dimensions — same selector pattern, same shape.

**Consequence:** consumers wire `data-brand` on the document root or a section root. Don't write `.brand-default` CSS rules anywhere. The convention is enforced by the emitter, not the consumer — you can't ship a class-based brand layer through `loadBrandTokens`.

### Decision 5: $extensions theme keys use `fsds.{light,dark}`, not `design.paths.{light,dark}`

The portfolio source files this graph descended from used `$extensions["design.paths.light"]` / `["design.paths.dark"]` for theme variants. Our graph rewrote those to `$extensions["fsds.light"]` / `["fsds.dark"]` to match the prefix.

**Why:** the project-namespaced prefix should apply everywhere — including extension keys. `design.paths` is a portfolio-internal namespace; `fsds.` is ours.

**Consequence:** if you import a token file from another source, rewrite `design.paths.*` → `fsds.*` before landing it. There's no automatic migration path; both keys are valid DTCG extension names, but only `fsds.*` is read by `global.ts:processTokenValue`.

### Decision 6: composed.tokens.json is gitignored

The intermediate `packages/ds-tokens/generated/composed.tokens.json` is a 164-KB merged tree that compose.ts writes and global.ts reads. It is **not** committed; `.gitignore` excludes it.

**Why:** it's a build artifact. Every shard change re-emits it; tracking it would churn on every PR. The CSS surface (`tokens.css`) IS committed because consumers need it on fresh clone without running the build first.

**Consequence:** `validateContractTokens` (the gate) needs the composed JSON to run. If it's missing — fresh clone, deleted by accident — the validator returns one instructional issue per contract pointing at `pnpm -F @full-stack-ds/tokens build`. CI must run the token build before the codegen validate step. The top-level `pnpm run generate:check` does NOT yet auto-invoke the token build; that's a separate ordering concern that lands when CI sees the validator's "missing" path.

### Decision 7: Reconcile via aliases in the graph, not contract rewrites

When the byte-compare gate in `STEP-05` surfaced 6 contract paths the new graph didn't satisfy, the resolution path was to **add aliases in the graph** (e.g. `core.shape.radius.small` as alias for `{shape.radius.02}`), not to rewrite contracts to use new names.

**Why:** contract changes cascade through 5 frameworks' generated component CSS. Graph changes don't. For a one-time naming-drift reconciliation, "add 6 alias tokens" is cheaper than "rewrite 6 contract paths and regenerate 30+ component CSS files." The graph can carry both canonical names and aliases without ambiguity.

**Consequence:** if a contract is wrong and the graph is right, fix the contract. If the graph is wrong and the contract is right, fix the graph. If both are defensible, prefer the change that doesn't ripple through consumers. Don't add aliases reflexively — only when keeping a path is the lower-cost option.

## The pipeline, end to end

```
src/<category>/{core,semantic}/*.tokens.json     ← author here (DTCG strict)
                  ↓ compose.ts
                  ↓   - deep-merge every core+semantic shard
                  ↓   - apply core. / semantic. prefix transform on cross-refs
                  ↓   - resolver fallback (no resolver.json present)
                  ↓
generated/composed.tokens.json                    ← gitignored intermediate
                  ↓ global.ts
                  ↓   - walk every leaf
                  ↓   - flatten composites (color, dimension, shadow)
                  ↓   - classify into @layer core / @layer semantic
                  ↓   - loadBrandTokens → @layer brand
                  ↓   - loadDensityTokens → @layer density
                  ↓
generated/tokens.css                              ← committed, consumed
                  ↓ vite-plugin-fsds-data.ts
                  ↓
preview iframe <style data-fsds="tokens">         ← runtime consumer

Independently:

contracts/*.contract.json                         ← tokens.<part>.<key>.resolvesTo
                  ↓ ds-codegen / cli.ts --validate --check-semantics
                  ↓   validateContractTokens(contract)
                  ↓     - read composed.tokens.json
                  ↓     - project to set of valid dot-paths
                  ↓     - walk contract.tokens, validate each resolvesTo
                  ↓
DRIFT report or VALID                              ← the gate
```

## Cutover provenance

Before this workstream, `packages/ds-contracts/tokens/designTokens.css` (2,948 lines, hand-authored, regenerated occasionally from a separate pipeline) was the consumed token surface. The cutover happened at commit `f322b4c` (`STEP-05`):

- Deleted `packages/ds-contracts/tokens/designTokens.css` (replaced by `packages/ds-tokens/generated/tokens.css`)
- Deleted `packages/ds-contracts/tokens/globals.scss` (no consumers)
- Kept `packages/ds-contracts/tokens/vars.css` at cutover (scroll-driven animation primitives + Next.js font CSS-var bridges — NOT design tokens). The file and its directory were removed later; `vite-plugin-fsds-data.ts` still attempts a safe read of the path and tolerates its absence.
- Repointed `vite-plugin-fsds-data.ts` from the old path to the new one

The cutover's byte-compare diagnostic (script since removed; formerly `packages/ds-tokens/build/_oneshot/byte-compare-tokens.ts`) reported:

- **Section A** (contract refs satisfied by OLD surface): **100%** (123 / 123). Baseline integrity confirmed before cutover.
- **Section B** (OLD vars present in NEW surface): **81.70%** (144 / 787 missing). Most gaps are name-drift in tokens no contract or component consumed; some are intentional drops (legacy variants, unused scale points).
- **Section C** (contract refs satisfied by NEW surface): **100%** (123 / 123). The cutover-critical check.

Section C 100% is the load-bearing claim. Section B's 81.70% is informational — vars that nothing consumed went away, which is the expected outcome of a clean cutover. If Section C were ever less than 100%, the cutover would be unsafe.

The byte-compare script no longer exists — it was removed with the orphaned `_oneshot/` scaffolding. The Section A/B/C percentages are historical cutover provenance, not re-runnable diagnostics; the doctrinal record (this doc + the validator) is the retained authority.

## Classified inventory of layered overrides

| Layer | Source | Selector | When to use |
|---|---|---|---|
| `@layer core` | `src/*/core/*.tokens.json` | `:root` | Primitives — palette, raw scales, font weights, shape primitives. Should not reference anything; should be referenced. |
| `@layer semantic` | `src/*/semantic/*.tokens.json` | `:root` | Named aliases of core primitives — `foreground.primary`, `radius.medium`, `gap.grid`. References core via `{path}`. This is what contracts almost always cite. |
| `@layer components` | Generated component CSS (`emitTokensCss` in `packages/ds-codegen/src/css.ts`) | Each component's own class selectors (e.g. `.button`) | Every generated component's structure/tokens CSS. Not a token-value layer like the others — it holds the CSS itself, positioned here so unlayered consumer-app CSS always wins (per spec) and so `@layer brand` component-scoped overrides win over it. Does not reach Lit shadow DOM. |
| `@layer theme` | `$extensions.fsds.{light,dark}` on any token | `.light`, `.dark`, `@media (prefers-color-scheme: dark) :root` | Light/dark variants. Live and load-bearing — theme-flipping pairs must mirror each other, or a surface and its label can both be legible alone and invisible together. |
| `@layer brand` | `src/brands/<id>.tokens.json` | `[data-brand="<id>"]` | Brand-identity overrides. Each brand redeclares the semantic tokens it wants to differ. Ten brands: `default`, `canary`, `corporate`, `developer`, `fintech`, `forest`, `marketplace`, `monochrome`, `quickserve`, `streaming`. |
| `@layer density` | `src/density/<id>.tokens.json` | `[data-density="<id>"]` | Content-density overrides. Each density redeclares the semantic spacing tokens it wants to differ. Currently 4 densities (`tight`, `compact`, `default`, `spacious`, 14 overrides each). |

### Adjacent: per-component slot pools

Component-scoped CSS custom properties live alongside the global graph but are not part of it. Two pools exist:

| Pool | Source | Selector | Authority |
|---|---|---|---|
| **Component-local slots** | `<Name>.tokens.json` | `.<cssPrefix>` | Per-component themable surface. Slot names are cssPrefix-namespaced (e.g. `--fsds-button-color-background-default`). Authors declare what slots exist per component; consumers override per instance. |
| **Box-model primitive slots** | `box-model.primitive.schema.json` + `primitives/BoxModel.primitive.json` | `.<cssPrefix>` (every component) | Closed slot pool of shared names (`--fsds-box-model-padding-inline-start`, etc.), reset once per component boundary by a shared stylesheet, with component defaults at consumer sites. See [`ARCH-BOX-MODEL-PRIMITIVE-001`](./design/box-model-primitive.md). |

Both pools may `resolvesTo` paths in the global graph above — they extend the cascade with per-component override surfaces rather than competing with it. The box-model pool is the universal floor (every component gets it); component-local slots are the per-component vocabulary.

## Palette color ramps

Every hue in `src/color/core/palette.tokens.json` (`brand.primary`, `neutral`, `red`,
`orange`, `yellow`, `green`, `blue`, `teal`, `violet`, `pink`, `lime`, `emerald`, `cyan`,
`indigo` — 14 in all) is a **10-stop ramp**: `50`, `100`,
`200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`. Stops are stored as DTCG sRGB
component arrays (0–1).

Ramps are frozen, hand-maintained DTCG values in `src/color/core/palette.tokens.json`. The values were originally derived with [`@adobe/leonardo-contrast-colors`](https://github.com/adobe/leonardo) by `build/generators/generate-palette-ramps.ts`, which no longer exists; changing a ramp means editing the authored values directly. The derivation is recorded here for provenance:

- **Reference hues.** The hue's own anchor stops were passed to Leonardo as `colorKeys`, so the derived ramp interpolated through the existing brand colors and preserved their character. The derivation was idempotent by construction: it re-derived from a fixed set of anchor stops.
- **Interpolation space was `OKLCH`** — perceptually even steps that preserve chroma (colors
  stay rich, not muddy, across the ramp).
- **Stops are contrast-targeted.** Each stop was chosen as the color that hits a fixed WCAG contrast
  ratio against the lightest UI surface (`#fafafa` = `color.mode.light`). The ten ratios are
  logarithmically distributed:
  `[1.15, 1.47, 1.9, 2.49, 3.36, 4.61, 6.48, 9, 12.45, 16.1]` — five below 4.5 (50–400) and
  five at or above ~4.6 (500–900).
- **Why target `#fafafa`, not `#ffffff`.** `#fafafa` is the real lightest surface text sits
  on. Targeting it makes `500` land at exactly 4.61:1 from `#fafafa`, which is the same as
  white-on-`500` — so white text on a `500` fill (the canonical primary/accent fill used by
  buttons, badges, and accent surfaces) clears WCAG AA without bumping the ratio or distorting
  the distribution. A consequence: hues that are intrinsically light (e.g. yellow) are forced
  dark enough at `500` to carry white text, instead of failing as a pale fill.

After changing anchor colors or the ratio set, edit the ramp values in `palette.tokens.json` directly, then rebuild and re-run the contrast gate:

```bash
pnpm -F @full-stack-ds/tokens build         # recompose + re-emit tokens.css
pnpm run tokens:check-contrast              # curated AA/AAA pair gate
```

The curated contrast pairs the gate enforces live in
`build/w3c/w3c-contrast-validator.ts` (`extractCanonicalPairs`), evaluated in light and dark.
Adjusting a ramp can move a semantic pair across its threshold — re-point the affected
semantic alias to a wider stop (e.g. `background.disabled` widens to `neutral.100`/`neutral.800`
so disabled foreground keeps AA_LARGE 3:1) rather than loosening the gate.

## How to add a new token

1. Pick the tier — `core` (primitive) or `semantic` (named alias of a primitive).
2. Pick the category — `color`, `dimension`, `shape`, `motion`, `spacing`, `typography`, etc. (mirrors `src/` subdirs).
3. Pick the subtree — the file under `src/<category>/<tier>/<subtree>.tokens.json`. Create a new file if no subtree fits; the composer will pick it up.
4. Author the leaf in strict DTCG 1.0 shape — `$type` MUST be one of the spec types; `$value` MUST conform; dimensions MUST use `px` or `rem`.
5. Run `pnpm -F @full-stack-ds/tokens validate` to confirm DTCG-strict pass.
6. Run `pnpm -F @full-stack-ds/tokens build` to regenerate `tokens.css`.
7. If a contract should reference the new token, add `resolvesTo: "<tier>.<category>.<...>"` to the relevant `tokens.<part>.<key>` entry. `pnpm run generate:check` will fail at validate-time if you misspell the path — that's the gate working.

## How to add a new brand

1. Author `packages/ds-tokens/src/brands/<id>.tokens.json` with a `$brand` metadata block and a set of token overrides under semantic paths.
2. Use `$extensions.fsds.{light,dark}` for theme variants if needed.
3. Run `pnpm -F @full-stack-ds/tokens build`. `loadBrandTokens` auto-detects new brand files.
4. Consumer wires `<html data-brand="<id>">` to activate.

### Component-scoped brand overrides

A brand file can also override a single component's own local token, without touching the shared semantic default every other component consumes. This is a separate capability from the top-level `color`/`typography`/`spacing`/`shape`/`motion` blocks above, keyed by component name instead of semantic path:

1. Add a `components.<Name>.<path>` block to the brand file, where `<Name>` is the PascalCase contract name and `<path>` omits the component prefix. Both consumed local tokens (`components.Card.size.padding.inset`) and design slots (`components.CodeBlock.design.root.shape.radius`) are valid destinations. Run `generate:check` to validate those destinations and `tokens:check-brand-refs` to validate referenced values.
2. Run `pnpm -F @full-stack-ds/tokens build`. `processComponentBrandTokens` / `walkComponentBrandSubtree` (`packages/ds-tokens/build/generators/global.ts`) compile these to `--fsds-<cssPrefix>-<path>` variables in `@layer brand`. Values are emitted at the brand scope for detached parts and on component roots to supersede local defaults. Default applies both with and without an explicit root `data-brand` attribute. Unscoped Default selectors use zero specificity so a named brand wins independently of brand-file order. Portals outside a nested brand scope still need their intended brand at the portal destination.
3. This only wins the cascade because the component's own CSS is wrapped in `@layer components`, declared earlier than `@layer brand` (see Decision 3 above and the layer table). Without that wrapping, the component's unlayered CSS would beat the layered brand override regardless of layer order.
4. Schema reference: `packages/ds-tokens/src/brands/_schema.json`'s `components` property description. Use this only for values specific to one component in one brand — for values every component sharing that semantic path should also pick up, use the top-level blocks instead.

## How to add a new density mode

Same shape as a brand, but the file lands at `src/density/<id>.tokens.json` with a `$density` metadata block. Consumer wires `<html data-density="<id>">`.

## Cross-references

- [`docs/codegen-authority.md`](../codegen-authority.md) — codegen layer authority; tokens are framework-neutral and live outside the per-framework emitters, in line with that doc's "one emitter, not five" principle as applied to design tokens.
- [`docs/architecture/design/box-model-primitive.md`](./design/box-model-primitive.md) — box-model slot pool. The 14-slot `--fsds-box-model-*` surface that every component inherits as a stable substrate for padding / gap / sizing. Sits adjacent to this doc: it defines a slot pool, not new global tokens, and its slots may `resolvesTo` paths in the graph this doc governs.
- [`docs/architecture/component-layering.md`](./component-layering.md) — the `.css` vs `.tokens.css` layering rule and the variant-redirection pattern. Tokens in this graph are consumed by component-local slots, which then flow into `.css` (structure) and `.tokens.css` (per-scope resolution) per that doc's rule.
- [`docs/normal-form.md`](../normal-form.md) — property-2 (framework-neutral IR) and property-5 (fail-loud linters) are realized here as the single-emitter pipeline and the `validateContractTokens` gate.
- [`docs/specifications/admission-rail.md`](../specifications/admission-rail.md) — the rail's philosophy of "evidence is inspectable, claims are bounded" is the same philosophy this doc uses for the cutover provenance and the byte-compare gate.

## When in doubt

Ask: "If I delete this token from the graph, does anything break?" If the answer is "no contract references it and no committed component CSS references it," it's safe to remove. If "yes, contract X references it," the validator will tell you exactly which contract — don't guess. If "yes, hand-authored component CSS references it," that's a sign the contract is incomplete; the component CSS should pass through the contract, not bypass it.

When adding a new token, ask: "Does this belong at core (primitive) or semantic (alias)?" If you'd cite it directly from a contract, it's probably semantic. If it's something semantic tokens would reference but contracts wouldn't, it's core. When in doubt, put it under semantic — moving down a tier is cheaper than moving up because semantic→core requires adding a primitive AND aliasing it.
