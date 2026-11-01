# React Native framework emitter

Status: **default rail target** (FEAT-MOBILE-RN-001). React Native is a
built-in target-pack listed in `fsds.targets.json`, so `--target=all`, the
default `governed:rail`, and the CI/pre-push generated-tree drift checks all
cover `packages/ds-react-native/`. Targeted runs remain available:

```bash
pnpm run generate:react-native
pnpm run typecheck:react-native
pnpm run test:react-native
pnpm run governed:rail:react-native
```

## Current slice

- Emits all <!-- component-count -->55 component contracts into `packages/ds-react-native/`.
- Typechecks against real React Native package types; the old local
  `declare module "react-native"` shim is not part of the rail.
- Emits Vitest suites for every component. Residual components keep type
  surface smokes; admitted behavior slices get focused host-render assertions
  through `react-test-renderer`.
- Emits per-component sibling `.tokens.ts` files that mirror the web
  `<Component>.tokens.css` artifact as typed native token scopes.
- Emits per-component sibling `.styles.ts` factories with `StyleSheet.create`.
  Structural style factories consume the typed token scopes through the RN
  theme context rather than hardcoded CSS fallbacks.
- Realizes variant styling from IR facts: per-variant StyleSheet entries are
  joined from root `cssBlocks` declarations × `variant_*` token scopes (the
  Button/Alert token-re-declaration pattern), or dereferenced through the
  owning scope when the variant block declares CSS properties directly (the
  Avatar/Text pattern). Variant axes without a contract prop get a
  synthesized union-typed prop from the class recipe, mirroring web. Text
  props land on a `rootText` style applied to the root text wrapper.
- Participates in the default admission rail (`pnpm run governed:rail`). This
  binds generated RN artifacts to contract bytes, RN emitter source bytes,
  environment provenance, and the RN package typecheck/test commands.
- Admits presence-surface slices through generated RN render tests: Dialog and
  Sheet lower to `Modal`; Toast lowers to an in-tree live region with
  auto-dismiss; Tooltip and Popover lower to an anchored transparent `Modal`
  positioned from `measureInWindow`.
- Collapses contracts that declare `native-toggle-affordance` to RN's native
  `Switch` primitive.
- Walks `ComponentIR.dom` for the rest of the corpus, lowering common HTML-ish
  hosts to `View`, `Pressable`, `TextInput`, `RNText`, and `RNImage`.
- Projects synchronous string, number and bigint children into native `Text` hosts. Scalar-only
  arrays and fragments form one text block, retaining one style and line limit.
  Mixed content preserves supplied elements and keyed consumer state; the
  normalizer traverses structural fragments, not arbitrary consumer elements.
  Native text roots retain their own text context. This does not qualify
  asynchronous children or global clipping of arbitrary mixed native views.
- Keeps channel state inside the generated component body for now; no separate
  RN behavior hooks are emitted yet.
- `examples/settings/react-native` is a public-export consumer typecheck lane.

## Known gaps

- Presence surfaces are admitted only for the current generic RN substrate:
  Dialog/Sheet, Toast, Tooltip, and Popover. Anchored collision handling
  (flip/shift), Walkthrough/coachmark, and compound-part surfaces remain
  unadmitted.
- Token realization is native and per-component, but still narrow. The RN
  target consumes `ComponentIR.tokenScopes` and `FsdsTheme` overrides; it does
  not yet project every CSS property into native `ViewStyle`/`TextStyle`.
- Variant realization covers root-scoped value modifiers and root
  pressed/disabled state styles. Part-scoped variant styling (Toast intents,
  Tabs pills), boolean modifiers (Card `--inset`), and em-relative sizing
  (Spinner's font-size trick) are not yet realized.
- Contract object aliases are emitted as `unknown` when no native data shape is
  available. This preserves typecheck without inventing schema semantics.
- `aria-labelledby` maps to `accessibilityLabelledBy`, which is Android-only in
  React Native. Cross-platform label derivation remains a follow-up.
- Runtime tests use a Vitest-only host shim for `View`/`Text`/`Pressable` etc.
  because Vite does not parse React Native's Flow runtime entrypoint directly.
  Type admission still resolves the real `react-native` package types.
- RN rail admission does not prove simulator/device execution, native visual
  parity, or platform accessibility parity.

## Layout

```
react-native/
├── factory.ts
├── component-source.ts
├── hook-source.ts
├── tests.ts
├── surface-emit.ts
├── surface-tests.ts
└── barrel.ts
```
