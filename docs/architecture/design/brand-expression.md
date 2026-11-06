---
doc_id: REF-BRAND-EXPRESSION-001
authority: reference
status: active
title: Brand expression
owner: "@darianrosebrook"
updated: 2026-11-05
---

# Brand expression

Brand files under `packages/ds-tokens/src/brands/` contain two kinds of decisions:

- Semantic overrides establish shared typography, spacing, color, shape and motion.
- `components.<Name>` overrides specialize a current component token or design slot. A pill action does not imply a pill menu, code block or card.

The component key is the contract name. Its nested path omits the component prefix:

```json
{
  "components": {
    "CodeBlock": {
      "design": {
        "root": {
          "shape": {
            "radius": { "$type": "dimension", "$value": "8px" }
          }
        }
      }
    }
  }
}
```

This emits `--fsds-code-block-design-root-shape-radius`. The style sidecar binds that address to the component's radius property. An omitted override leaves the existing token/fallback chain intact. Existing consumed component token addresses remain valid too; a brand need not override every available slot.

`generate:check` validates destinations against the Web property-consumption closure. Unknown components, typos, retired names and declared but unconsumed tokens fail validation. `tokens:check-brand-refs` separately checks referenced values. Unused semantic vocabulary is allowed; compatibility aliases and allowance lists are not introduced. These are Web CSS brand checks, not native rendering claims.

## Cascade and scope

The token generator emits component values in `@layer brand`, after the component layer. It emits namespaced values at the brand scope so detached content, such as a portalled Popover, can inherit them. It also emits component-root rules so component-local defaults yield to the brand. The Default brand covers both explicit `data-brand="default"` and the showcase's unbranded root state.

Unscoped Default rules use zero specificity, preventing fallback values from overriding an explicit brand by file order. Explicit light and dark modes override the operating system preference. A document-level brand reaches portals mounted beneath that document. An application that portals outside a nested brand scope must carry its intended brand to the portal destination; this slice does not change portal ownership. Consumer unlayered CSS and inline overrides on the component remain stronger than layered brand rules.

## Authored distinctions

The shipped brand files are the value authority. This table describes their direction rather than duplicating the token values:

| Brand | Shape and surfaces | Typography and rhythm |
| --- | --- | --- |
| Default | Moderate corners, flat cards | Neutral sans serif, moderate spacing |
| Canary | Rounded, raised surfaces | Strong headings, generous spacing |
| Corporate | Small corners, outlined cards | Compact business layout |
| Developer | Small corners, raised cards | Compact layout, strong headings |
| Fintech | Restrained corners, outlined cards | Compact layout, steady motion |
| Forest | Soft raised surfaces, pill actions | Serif headings, generous spacing |
| Marketplace | Small corners, outlined cards | Dense browsing layout |
| Monochrome | Square surfaces and controls | Editorial serif headings, brisk motion |
| Quickserve | Rounded raised surfaces, pill actions | Heavy headings, spacious layout, brisk motion |
| Streaming | Borderless content surfaces, pill actions | Heavy sans-serif headings, moderate spacing |

The showcase consumes semantic heading/body families, heading weight, component spacing and interaction duration. Its shared Card wrappers inherit brand radius and elevation; authored wrapper padding still serves the preview layout. No per-brand app CSS branches are needed. Table density and application information architecture are not changed by this slice.

## Verification

`e2e/brand-expression.spec.ts` exercises the real appearance menu across shipped brands in forced light and dark modes, measures content/menu geometry and app typography/spacing, and checks dismissal. Separate preview witnesses cover CodeBlock and Button shape plus direct consumer overrides in React, Vue, Svelte, Angular and Lit. Browser screenshots are local artifacts under `test-results/`, not committed baselines.

Generator tests cover default, explicit-theme and detached-part declarations. Destination-validator tests remove a property consumer and reject its formerly valid override. The anchored-position regression uses a scaled painted rectangle and an unscaled layout size; the positioner uses the latter so an entrance animation cannot leave the resting menu beyond the viewport edge.

These checks establish the exercised CSS consumption, interactions and reviewed renders. They do not establish visual correctness for every component, all viewport sizes, native targets or every nested brand/portal arrangement.
