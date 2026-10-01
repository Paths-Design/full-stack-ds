---
doc_id: ARCH-COMPONENT-TOKEN-CONSUMPTION-001
authority: architecture
status: implemented
title: Component token consumption
owner: "@darianrosebrook"
updated: 2026-09-28
verified_at_commit: 3fd6f2eb23aaf8bc4dfa7c24cb42b1b64e2f7850
governs:
  - packages/ds-codegen/src/css-token-consumption.ts
  - packages/ds-codegen/src/validation/component-token-consumption.ts
  - packages/ds-codegen/src/frameworks/native-token-consumption.ts
  - packages/ds-codegen/src/frameworks/react-native/token-consumption.ts
  - scripts/dead-slot-audit/**
---

# Component token consumption

Component-scoped tokens are an executable interface. A declared address must reach a supported property or behavior. Unset overrides are valid; unused semantic vocabulary is valid. An unused component declaration is a contract error, with no compatibility alias, debt allowance, or reseed mode.

`generate:check` applies `validateComponentTokenConsumption`. Web roots are actual CSS properties, including keyframes and imported shared box-model consumers. The dependency walk follows `var()` references and nested fallbacks through declarations. A declaration, a disconnected alias chain, a comment, or a quoted example cannot establish consumption. Raw CSS custom-property declarations cannot bypass this rule by avoiding dotted token names. Alias cycles fail validation. The analysis conservatively combines selectors; it does not establish that a selector is reachable in every state.

`audit:dead-slots` additionally reads the emitted CSS for every Web target and checks native dictionaries against their actual emitted lookups. It rejects a missing expected property consumer, an unconsumed emitted declaration, or a cycle. Missing artifacts fail the audit. Its report lives in ignored `tmp/component-token-consumption/`; there is no committed findings baseline to expand.

Web token sheets and Lit inline styles contain only the used declaration closure. Public `design.*` override addresses remain unset and are consumed at the property, retaining the authored fallback chain. Shared box-model defaults remain at consumers, including variant and part defaults. Variant defaults previously occupied side override variables and defeated a consumer's axis/shorthand override; property fallbacks now preserve the shared layer precedence. No per-component reset pool is emitted.

Native output is projected independently. React Native token dictionaries follow actual typed `tokens.<scope>[name]` reads; Compose follows its emitted `layeredSlot` calls and axis branches plus direct per-component `<Name>TokenScopes[scope]?.get(name)` reads resolved through `fsdsTheme.resolve(...)`; SwiftUI follows emitted color and dimension suffix lookups. Direct Compose reads retain only the addressed scope. Compose's resolver reads reference values from the theme map, so a reference does not justify copying another component-table definition. The registry allowlists govern which explicit native targets may establish a source consumer. Figma descriptors carry contract metadata, not proof of live Figma controls.

`parity:compose-tokens` checks the emitted Compose dictionaries in both directions: each lookup has a definition in its addressed scope, and each definition has a consumer. Shared Compose/RN addresses must agree, while target-specific consumed vocabularies may differ. The existing supported chrome-role, content-color propagation and modifier-order checks remain obligations. Rejection fixtures run with the gate in CI and pre-push; generated toggle dictionaries also run through the Kotlin theme resolver to verify state fallbacks and override precedence. These checks replace the obsolete requirement to stamp identical native token lists.

The projected-content Compose control path consumes all four logical padding edges through `PaddingValues(start, top, end, bottom)`. Its parity obligation uses those canonical box-model slots, replacing the retired size-padding vocabulary; an end-edge override is independent of its starting edge.

Compile-time behavior defaults are distinct from runtime CSS overrides. Toast's notification dwell remains a behavior input and a React Native theme lookup. Web CSS does not declare an inert duration variable. SwiftUI now selects that same dismissal policy instead of using the first unrelated animation duration.

## Retirement decisions

The cleanup changes token declarations and backend lookups, not anatomy or supported axes. Existing property bindings are the retained design surface.

| Retired surface | Retained authority or decision |
| --- | --- |
| Button's old medium-named padding and height aliases | Canonical box-model slots. Compose now reads them; all supported size variants had identical references and fallbacks at the retired and canonical addresses. |
| Alert/AlertNotice per-level padding and typography aliases | The existing level variants redefine the live padding/text/title slots. Icon size can be added as a supported property binding when icon geometry is authored. |
| Field's alternate validating/valid colors and spacing presets | Existing status rules and design bindings govern the actual rendered border, text, and spacing. |
| Avatar, Calendar, NavList, Skeleton, Postcard, Toast alternate color/radius presets | Existing property and variant bindings govern the rendered choices; an extra named preset without a consumer is not a second interface. |
| Chip/Sheet/Table focus aliases | Existing focus properties and generated child controls retain their current bindings. No focus behavior or focus rule is removed. |
| Select icon colors; Image error/icon sizing; Calendar weekday/range vocabulary | These addresses did not bind a supported authored property. This does not delete anatomy or authorize inferring missing behavior from a generated artifact. A future feature must introduce its property and binding together. |
| Remaining duplicate spacing, typography, overlay, accent, and motion names | The current authored property/fallback chain and its typed design override remain authoritative. Unsupported alternate names are removed instead of aliased. |

Real native consumers are retained: Accordion border width, AlertNotice foreground, NavList background, Skeleton small radius, and Toast dismissal dwell. Their absence from Web CSS does not make them dead across targets. The Web inspector offers only the CSS property dependency closure, so native-only slots do not appear as working Web controls.

## Verification and limits

The focused tests introduce orphan declarations, sever property consumers, create disconnected aliases and cycles, and check that native projection retains real lookups while omitting unrelated data. Browser tests exercise defaults, clearing overrides, shared box precedence, nested isolation, and representative interactions. The campaign also compares sampled default computed styles before and after retirement and reviews the composed default/retokened gallery.

The static gate establishes dependency reachability, not arbitrary CSS value validity, accessibility adequacy, selector reachability in every state, or visual correctness under every theme. Native source projection does not by itself establish device behavior or cross-framework visual parity.

## Carousel motion reconciliation

Carousel adds compile-time behavior consumers for its advance dwell and spatial transition duration/easing. The sequence IR validates those references and supplies their resolved values to the web controllers. They are intentionally absent from the CSS declaration closure; changing a CSS variable does not retime these JavaScript behaviors.

## Unresolved native reads

The emission audit also rejects native token reads with no definition. Projection
onto consumed dictionaries must not hide an unknown lookup. React Native uses full
slot identities; Swift accepts its emitted full names or role suffixes; Compose
retains scope identity for direct reads. This closes a gap where a renamed
CodeBlock background could silently fall back to an unpainted native surface.
