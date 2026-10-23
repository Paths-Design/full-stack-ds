# @full-stack-ds/iconography

Governed icon contracts and projection emitters for Full Stack DS.

## Package consumption

```ts
import { resolveIcon } from '@full-stack-ds/iconography';

const glyph = resolveIcon('alarm', 24);
// glyph?.viewBox and glyph?.paths describe the selected authored size.
```

The package exports runtime lookup and glyph types at its root, the schema at
`@full-stack-ds/iconography/schema`, authored contracts under `icons/*`, and
target assets under `generated/*`. Framework component packages consume this
runtime directly; applications can use their `Icon` component. Generated React,
Svelte, and React Native assets are source files for the consuming framework's
compiler. Native target assets need their corresponding platform toolchain.

## License

MIT, copyright DesignPaths, LLC. Adapted Lucide and Feather icon geometry keeps
its upstream notices in THIRD_PARTY_NOTICES.

This package is the source surface for symbolic icon leaves such as
`fsds.icon.placeholder`. Component contracts and usage-style composition trees
should reference those leaves by stable name and size. Target emitters decide
how the icon becomes a framework-native import, SVG symbol, Android vector,
React Native component, Swift resource, or Kotlin resource. Figma currently
carries component descriptor metadata without vector geometry.

## Authority Model

- Source contracts live in `icons/<Name>/<Name>.icon.json`.
- Size variants are first-class authored glyphs, not scaled render requests.
- Vector path data is the governed payload.
- Platform names and target projections are derived from the contract.
- Generated output under `generated/` is scratch and must not be committed.

## Consumption by component codegen

Iconography and component contracts remain separate authorities. The icon
contract owns glyph identity and geometry; a component contract owns where the
glyph appears and which component prop selects it.

The live route is:

1. An `anatomy.dom[].iconGlyph` directive on an SVG node binds `nameFrom`
   and, optionally, `sizeFrom` to component props.
2. The semantic validation pass loads canonical names from the committed icon
   corpus. `validateContractIconRefs` rejects an unknown literal supplied
   through a component reference, and the usage validator applies the same
   known-name authority to authored usage compositions.
3. IR construction converts the directive into `IconGlyphIR`; it does not copy
   vector paths into the component contract.
4. The Web DOM emitters import `resolveIcon` from this package, choose the
   nearest authored size variant, and lower its path records without branching
   on an icon or component name. SwiftUI and Compose generate target-native
   glyph catalogs from the same icon corpus.

The standalone iconography build also emits React Native components. The
`@full-stack-ds/react-native` Icon component uses its glyph primitive to resolve
this package's paths and render them through `react-native-svg`. The Figma
component descriptor carries Icon props and metadata without vector geometry.

This integration makes iconography an input to component realization without
making either corpus a second authority over the other. See the
[domain realization comparison](https://github.com/Paths-Design/full-stack-ds/blob/main/docs/domain-realization-comparison.md)
for the repository-wide authority and residue map.

## Commands

```bash
pnpm --filter @full-stack-ds/iconography run validate
pnpm --filter @full-stack-ds/iconography run build
```

The build emits:

- `generated/catalog.json`
- `generated/web/sprite.svg`
- `generated/web/icons/*.svg`
- `generated/react/*.tsx`
- `generated/svelte/*.svelte`
- `generated/react-native/*.tsx`
- `generated/android/drawable/*.xml`
- `generated/android/residuals.json`
- `generated/swift/*.swift`
- `generated/kotlin/*.kt`

## Emission evidence ledger

`generated/` is gitignored scratch and is never committed. Drift is proven
instead by a committed content-addressed ledger, `emission-ledger.json`, which
binds each emission's declared inputs to its produced output bytes:

- `observation_ref` = `sha256` over the emission's declared inputs (the icon
  contract + generator + schema/manifest) — "what governed this".
- `attachment_ref` = `sha256` of each emitted file's bytes — "what it emitted".
- the `(observation_ref, attachment_ref)` join = the determinism edge — "these
  inputs yield these bytes".

Because the generator is a pure function of its declared inputs, the edge set is
stable: re-emitting an unchanged artifact reproduces an edge already in the
ledger and appends nothing. Two byte-identical outputs collapse to one edge, so
churn is `O(edges-that-actually-changed)`, not `O(files-regenerated)`.

```bash
node build/ledger-icons.mjs            # build, attest, WRITE emission-ledger.json (commit this)
node build/ledger-icons.mjs --check    # build, recompute, GATE against the committed ledger
```

The gate proves drift by set membership: every edge a fresh regeneration
produces must be present in the committed ledger; a missing edge is a hard
failure naming the exact unit and file. The ledger carries substrate evidence
only — input fingerprint, output hash, emission edge — with no trust/taint
adjudication, because a generated artifact's provenance is known a priori.

`build/ledger.mjs` is the target-agnostic core (hashing, rows, dedup join,
gate). `build/ledger-components.mjs` drives that same core over a component
framework target, demonstrating the substrate is not icon-shaped.
