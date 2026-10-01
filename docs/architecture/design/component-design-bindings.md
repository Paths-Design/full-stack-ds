---
doc_id: ARCH-COMPONENT-DESIGN-BINDINGS-001
authority: architecture
status: implemented
title: Component design property bindings
owner: "@darianrosebrook"
updated: 2026-10-01
verified_at_commit: 395ecdbff
governs:
  - packages/ds-codegen/src/design-properties.ts
  - packages/ds-codegen/src/validation/component-design-policy.ts
  - packages/ds-contracts/component.styles.schema.json
  - packages/ds-contracts/components/**/*.styles.json
  - src/components/properties-panel/**
---

# Component design property bindings

A component design property is a supported override address with an actual consumer. Its value may be unset: rendering then follows the authored token reference and concrete fallback. Semantic tokens may also be unset at runtime or unconsumed. The global usage report keeps semantic non-use informational; it does not demand invented consumers. Referenced source paths still pass the existing token-graph validation.

## Authority and representation

`packages/ds-codegen/src/design-properties.ts` defines the closed property vocabulary and its CSS mappings. Its groups cover typography, background, foreground, border, shape, elevation, appearance, spacing, sizing, motion parameters, focus, and opt-in layout. Adding a new property requires changing that registry; arbitrary CSS keys cannot become public design properties through metadata alone.

An existing style entry can expose an independent override without moving its default:

```json
{
  "border-radius": {
    "resolvesTo": "card.size.radius",
    "fallback": "8px",
    "design": {
      "property": "shape.radius",
      "slot": "card.design.media.shape.radius"
    }
  }
}
```

Web CSS reads `var(--fsds-card-design-media-shape-radius, var(--fsds-card-size-radius, 8px))`. No declaration supplies a default to the new public override. Its absence is intentional; a brand or consumer can set it on a component or ancestor. Clearing it restores the original resolution chain. A malformed *present* CSS value is not repaired by `var()` fallback; callers must supply a value compatible with the property.

The component IR publishes the property identity, value category, anatomy part when unambiguous, source selector, expanded selector, public slot, default value/reference, and editable target family. Complex selectors retain their exact identity instead of guessing an anatomy part or state. Independently addressed consumers cannot share a public design slot accidentally. Shared defaults remain possible through their original token references.

Web override syntax is added in the CSS realization. It does not enter the default CSS facts that existing native emitters inspect. Figma descriptors carry the design-binding metadata alongside their original default style facts; this is metadata carriage, not proof of live design-tool override materialization. Native components retain their existing token resolution and theme APIs; the new override API is currently Web DOM.

## Consumer scoping

```css
/* A component family theme can be inherited from a container. */
.media-library {
  --fsds-card-design-root-shape-radius: 20px;
  --fsds-card-design-media-shape-radius: 12px;
}

/* Shared box controls target component boundaries explicitly. */
.media-library [data-fsds-component="card"] {
  --fsds-box-model-padding: 20px 24px;
  --fsds-box-model-padding-inline-start: 12px;
}
```

Component-specific design slots inherit deliberately, including into nested components of the same type. Shared `box-model.*` overrides reset at each component boundary to avoid leaking a Card's padding into an embedded Button. The separate `data-fsds-box` marker identifies the element that consumes geometry, including the inner rendered root of Angular and Lit components. Targeting all Cards is therefore explicit. A consumer can use unlayered CSS or a later declared layer; custom authored override regions remain outside generated component layers.

Brand design addresses are declared at the brand scope, including the unbranded
default scope. A nearer consumer ancestor can override them through inheritance;
an override on the component itself takes precedence over that ancestor. Clearing
both restores the brand value. Component token defaults that a component's own
token sheet redeclares still require local brand rules. Repeating public design
addresses in those local rules would defeat inherited consumer overrides,
regardless of the consumer rule's cascade layer.

The [showcase adoption](showcase-component-adoption.md) is a concrete nested
scope example: a Card frames a Card demonstration. The usage-preview container
resets the showcase's Card appearance overrides so the demonstrated component
retains its own defaults. Inline inspector overrides on that container still
win. Inheritance remains part of the public interface.

See [the box-model contract](./box-model-primitive.md) for default and shorthand precedence. Cross-portal inheritance still requires putting a consumer theme on an ancestor of the portaled surface or targeting that surface directly. This campaign does not transport scoped ancestor variables across a portal.

## Migration and editor

Image's opt-in media controls were justified by the [page attempts](retoken-page-attempts.md):
`sizing.aspect-ratio`, `media.fit`, and `media.position`. Their Web CSS chain is
design override → prop-derived CSS variable → literal default (`auto`, `fill`,
`50% 50%`). The ratio and position value categories describe these bounded
decisions; they do not open every CSS property to tokenization. Image's preset
mapping lives in its contract and normalizes through the shared finite-map IR.
The override remains independently settable when the prop is absent or present.

`node scripts/migrate-design-bindings.mjs --write` adds bindings without changing existing values or selectors. Run it after building codegen; without `--write` it reports any remaining mechanical adoption. Existing bindings keep their addresses. Conditional selector addresses are explicitly stored in the sidecar, so subsequent selector edits need not rename public slots.

The mechanical pass exposes common visual properties, existing token-backed sizing, and spacing. Literal intrinsic sizing, layout algorithms, arbitrary transforms, animation triggers, images, and content remain component/composition decisions. Layout registry entries require explicit adoption. Component tokens follow the [consumption contract](component-token-consumption.md): unused declarations are rejected, with no compatibility aliases. Native-only slots remain outside the Web inspector's editable controls.

`generate:check` enforces that common-property coverage through the same
`requiresDesignBinding` rule used by the migration script. Removing a binding
from an eligible Web property fails validation. The [component token naming
rule](component-token-naming.md) separately reserves terminal `default` for
declared state sibling families. Existing design addresses keep their identities
when their underlying component default address changes.

The inspector has a Design properties section grouped by source part/condition and property family. It edits the dedicated slot through the generated Input without repointing the shared semantic default. Empty input clears the override. Part selection uses the generated Select with selected-label projection and keyboard navigation; moving between parts retains each override. The existing box editor now targets the selected component's boundary, and its read proof includes the imported shared box controls.

## Evidence and limits

- `packages/ds-codegen/src/design-properties.test.ts` checks fallback preservation, property/namespace rejection, independent addresses, and native default separation.
- `packages/ds-codegen/src/frameworks/box-boundary.test.ts` checks emitted boundary/box markers throughout the corpus and protects the distinction between a component root and a disclosure item.
- `e2e/design-bindings.spec.ts` checks shared shorthand/side precedence, nested isolation, independent media radius, absent semantic CSS, consumer precedence, inspector edits, and mounted framework controls.
- `e2e/editor-binding-rail.spec.ts` checks the newly live shared gap control in the inspector.
- `e2e/image-media.spec.ts` checks Image dimensions, every ratio preset, fit/focal position, scoped overrides and clearing across the web frameworks, plus React inline-style composition. `e2e/retoken-pages.spec.ts` exercises real page compositions and records rendered media geometry.
- `e2e/fixtures/design-bindings-gallery.tsx` is a real generated React composition for visual and interaction review. Screenshots go to ignored Playwright output.

These witnesses do not prove every conditional selector is reachable, arbitrary retokening is accessible, full cross-framework visual parity, native runtime overrides, or complete coverage of design-tool paint/effect features. Broader binding coverage and visual fidelity remain separate claims.

The 2026-09-30 recheck reproduced seven failures before
`DESIGN-BINDING-CASCADE-01`. All five Card cases reached their override values
but expected the isolated 4px fallback after clearing; the loaded preview's
default is 12px. The inspector witness used native-select APIs against its
generated custom Select. The gallery exposed a real cascade defect: a local
brand declaration masked its inherited 24px design radius.

The token generator now keeps public design addresses at the brand scope.
The corrected witnesses verify the loaded defaults and use the Select's
actual trigger/options. The design-binding, editor-binding, and component-token
consumption suites pass together. Added cases check inherited and local radius
overrides, clearing, and default/Forest brands in explicit light/dark themes
across all five Web targets. The real composition retains independent Card and
media radii, spacing, pointer-state paint, and usable controls. These are bounded
runtime observations, not evidence of universal override coverage.

## Single-line text in composed feeds

The Pinterest caption attempt exposed a declared but discarded `Text.truncate`
prop. `TEXT-TRUNCATE-BINDING-01` binds it to a finite string-valued DOM state and
realizes single-line clipping through the Text style sidecar. Explicit string
values matter: a boolean presence attribute is not equivalent to the selector
value `true`. No emitter special case is required. False or absent truncation
restores normal wrapping. `e2e/text-truncation.spec.ts` checks constrained width,
clipped overflow, ellipsis, and clearing across the five Web DOM targets. This
is a Web realization claim; it does not establish native truncation parity.

The same attempt found the missing Text anatomy children outlet despite its
A2UI child allowance. The outlet is now explicit, so generated public types
and child projection agree; React rest-spread behavior is no longer relied on.

Angular additionally needs one projection outlet shared by its selectable host
tags. Its emitter now declares that body once as a template fragment and places
it inside the active host, following [Angular's projection guidance](https://angular.dev/guide/components/content-projection).
The browser check switches between paragraph, inline, and heading hosts before
checking truncation; this guards against silently losing the supplied child.

## Bounded overlay sizing

The [showcase usability follow-up](showcase-usability.md) adds explicit Dialog
minimum dimensions and a maximum-height override with a dynamic viewport
fallback. The body can shrink and scroll while the header and footer retain
their space. Walkthrough similarly bounds its surface to the viewport. These
use the existing sizing vocabulary; no new property bag or emitter-specific
component rule is introduced. `e2e/showcase-usability.spec.ts` checks a scoped
Dialog width/height override, body scrolling, and restoration after clearing.
Card status borders and duplicate badge paint were removed at the contract
source, including their retired design addresses.

## Loading-loop timing

The [motion pilot](../motion-substrate.md#first-executable-contract-repeating-loading-indicators)
moves Spinner rotation and Skeleton opacity out of authored animation strings
into part-bound loop declarations. Existing style design bindings retain their
addresses and property consumers. Loop duration and easing use the explicitly
named component tokens; a style binding for `transition-duration` does not also
control a loop's animation duration. No automatic motion-profile design control
or inspector driver editor is introduced. The Web lowering consumes loop facts
without adding them to the static style facts used by native backends.

## Carousel motion reconciliation

Carousel uses token-backed style consumers for its dots, ring and controls. Its advance duration and slide duration/easing are generation-resolved behavior inputs, not live CSS inspector overrides. The sequence controller owns progress and direct-child movement transforms; these are not newly exposed design-property controls.

Each Carousel indicator mode explicitly selects its visible decorations in the
style contract, including the combined mode; the variant audit checks those
carriers and browser tests check the resulting visibility.

## Paging composition reconciliation

Pagination declares its marker and numbered-choice properties in its style sidecar; PageNavigator declares field sizing and control spacing there. Both use the existing closed design-property registry and unset override/fallback chain. The extraction changes component ownership of picker styling without changing the registry, inspector override API, or native default facts. Design-policy and corpus boundary tests continue to enforce these obligations.
