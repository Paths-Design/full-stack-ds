---
doc_id: ARCH-LOCALIZATION-001
authority: architecture
status: active
title: Component message catalogs
owner: "@darianrosebrook"
updated: 2026-10-18
verified_at_commit: 51e15eafd
governs:
  - packages/ds-contracts/component.contract.schema.json
  - packages/ds-codegen/src/messages.ts
  - packages/ds-codegen/src/message-catalog.ts
  - packages/ds-codegen/src/frameworks/native-messages.ts
  - packages/ds-codegen/src/validation/localization.ts
caws_specs:
  - I18N-MESSAGE-CATALOG-01
---

# Component message catalogs

Text a component owns, such as an accessible name, a role description, a
control caption or a page-count template, is declared once in the contract and
resolved at runtime through a catalog the consumer supplies. No emitter
authors user-facing text. Consumer content (slide bodies, step titles, labels a
consumer passes) is outside this mechanism.

## Contract surface

- **`messages`** declares each string the component owns:
  `{ "<key>": { "defaultMessage": "…", "description": "…", "params": ["…"] } }`.
  The description is the translator's context. A `{name}` placeholder in the
  default must appear in `params`, and the reverse.
- **`message:<key>`** references a message from a DOM attribute, content, or a
  component-instance binding. A parameterized message supplies each param as a
  value-shaped binding: `message:pageCount(count=paged:count)`.
- **`defaultMessage: "<key>"`** on a string prop makes the message the prop's
  default. It excludes a literal `default`.
- **`translatable: false`** marks a string prop whose literal default is not
  user-facing, such as Calendar's `locale` (`"en-US"`) or an icon name.
- **Sequence labels** (`sequence.labels.start/stop/item/position`) name
  messages. The sequence runtime is the only writer of the rotation control's
  text and name; `position` takes `index` and `count`.

The catalog key is `<Component>.<key>`. Every family uses the same key and the
same `{name}` placeholder syntax, so one translation file serves every target.

## Gates

Two checks run inside `pnpm run generate:check`.

`validateMessages` (`packages/ds-codegen/src/messages.ts`) fails the IR build
with `[MESSAGE_INVALID]` when:

- a reference does not parse;
- a key does not resolve;
- placeholders and declared params disagree, or a param is declared twice;
- a binding supplies different params than the message declares;
- a prop declares both `default` and `defaultMessage`, or puts `defaultMessage`
  on a prop that is not string-typed;
- a sequence label takes the wrong params;
- a declared message is never referenced.

An unparseable `message:` reference would otherwise fall through to a literal
and render its own text. This check refuses it instead.

`validateLocalization` (`packages/ds-codegen/src/validation/localization.ts`)
refuses English, or any letter-bearing literal, on every route text used to
take:

| Code | Route |
|---|---|
| `L10N_LITERAL_TEXT_ATTRIBUTE` | A static `aria-label`, `aria-roledescription`, `aria-valuetext`, `aria-description`, `aria-placeholder`, `title`, `placeholder` or `alt`; or a `literal:` or value-map arm bound to one. |
| `L10N_LITERAL_CONTENT` | Element content that is a `literal:`, including each `conditional:` arm. |
| `L10N_LITERAL_PROP_DEFAULT` | A translatable string prop with a literal default. |
| `L10N_LITERAL_INSTANCE_ATTRIBUTE` | A static attr or `literal:` binding on a `componentRef` node that feeds the referenced component's translatable string prop. |

"Letter" means any Unicode letter, so `literal:次へ` fails and `literal:×` passes.

## Runtime surface

Precedence everywhere is: explicit prop value, then the provided catalog
entry, then the contract default. A catalog is partial: a missing component or
key falls back per key.

| Family | Consumer supplies | Generated components read |
|---|---|---|
| React, React Native | `<FsdsMessagesProvider messages={catalog}>` (nested providers merge per key) | `useFsdsMessages("<Component>", defaults)` |
| Vue | `<FsdsMessagesProvider :messages>` or `provideFsdsMessages(refOrGetter)` | `useFsdsMessages` (computed) |
| Svelte | `setFsdsMessages(() => catalog)` during a parent's initialisation | `useFsdsMessages(...).current` |
| Angular | `provideFsdsMessages(catalog | signal)` | `injectFsdsMessages` (signal) |
| Lit | `setFsdsMessages(catalog)`, a document-wide registry | `FsdsMessagesController` (re-renders connected elements) |
| SwiftUI | `.fsdsMessages(FsdsMessages(bundle:table:overrides:))`; by default the `FsdsComponents` table in `Bundle.main` | `@Environment(\.fsdsMessages)` → `string(_:default:params:)` |
| Jetpack Compose | `CompositionLocalProvider(LocalFsdsMessages provides FsdsMessages(overrides, resolve))` | `LocalFsdsMessages.current.string(key, default, params)` |

The web and React Native catalog shape is `{ [Component]: { [key]: text } }`
(`FsdsMessageCatalog`). `formatFsdsMessage` fills placeholders, so generated
code never concatenates text and translators control word order. An unknown
placeholder stays visible rather than becoming empty.

SwiftUI resolves `<Component>.<key>` through `Bundle.localizedString(forKey:value:table:)`.
`packages/ds-swiftui/Localization/FsdsComponents.xcstrings` is a generated
reference String Catalog with every key, its English default, and a translator
comment naming its placeholders. A host app adds a copy to its own target. The
catalog is regenerated with SwiftUI primitives, and `message-catalog.test.ts`
fails when the committed bytes differ from a fresh render of the corpus. In
SwiftUI, a message-defaulted parameter is stored as an optional. A computed
accessor applies the catalog at render time, because initializer defaults
cannot read the environment.

Compose message-defaulted parameters default to the catalog lookup, a
composable context. Body lookups use one hoisted
`val fsdsMessages = LocalFsdsMessages.current`, because `semantics {}`
lambdas are not composable. Android string resource names cannot contain
`.`, so a `resolve` bridge owns that mapping.

Figma descriptors carry `messages` and each prop's `defaultMessage` as
metadata. The Godot pilot renders contract defaults; it has no catalog.

## Evidence

- `packages/ds-codegen/src/messages.test.ts`: IR message facts, each
  `MESSAGE_INVALID` refusal by exact diagnostic, and the rotation control's
  single text writer.
- `packages/ds-codegen/src/validation/localization.test.ts`: the corpus passes;
  each `L10N_*` route fails with its pointer and message; `translatable: false`,
  letterless text and non-string instance props are admitted.
- `packages/ds-react/src/primitives/hooks/__tests__/messages.contract.ts` runs
  one obligation set against React, Vue, Svelte, Angular and Lit harnesses:
  defaults, attribute/content/prop replacement, per-key fallback, prop
  precedence, component scoping, and a parameterized template. Each harness
  also changes the catalog after mount, including the runtime-owned rotation
  text. `packages/ds-react-native/src/components/Carousel/__tests__/messages.test.tsx`
  asserts the same facts on `accessibilityLabel` and `Text`.
- `packages/ds-swiftui/Tests/DsSwiftUITests/FsdsMessagesTests.swift` and
  `packages/ds-jetpack-compose/library/src/test/kotlin/com/fullstackds/messages/FsdsMessagesTest.kt`:
  table, override and default precedence, plus reordered placeholders.

## Non-claims

- No plural or ICU selection. A message is one template with named
  placeholders.
- Text beside an input is its own message: PageNavigator renders the page
  field, then `pageCount` ("of {count}"). A language that needs words before
  the field, or the field inside one phrase, cannot reorder across it.
- Lit's catalog is document-wide, not tree-scoped.
- SwiftUI environment wiring is proven by compilation, emitted-source
  assertions and the `FsdsMessages` unit tests. The accessibility-tree test
  (`testWalkthroughControlsResolveFromTheMessageCatalog`) skips when the host
  does not trust the test runner for accessibility. Compose composition reads
  are proven by compilation, source assertions and the class unit tests; there
  is no Compose UI test harness.
- The reference `.xcstrings` is not consumed by the package's own bundle and is
  not compiled by an Xcode app build in CI.
- Compose still announces English `stateDescription` text ("expanded",
  "collapsed", "selected", "not selected") where it lacks platform semantics.
  Replacing it with `selected =` and expand/collapse semantics belongs to the
  native accessibility semantics slice, and `audit:a11y-realization` counts
  those facts as unrealized.
- The Compose Walkthrough emits no skip control.
- React Native has no role-description equivalent; `roleDescription`
  messages are not rendered there.
- Unity and GPUI do not lower messages. None of their allowlisted components
  declares a messages block, and no guard refuses one that does.
- Walkthrough's `steps` prop defaults to English demo data, which generated
  components render when a consumer passes no steps. It is consumer content in
  a default, outside the string-prop gate. The runtime fact rail reads it,
  so removing it requires the preview harnesses to supply steps.
- Locale-sensitive formatting (dates, numbers), `locale` behavior and
  right-to-left layout are separate concerns.
