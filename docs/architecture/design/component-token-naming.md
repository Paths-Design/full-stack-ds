---
doc_id: ARCH-COMPONENT-TOKEN-NAMING-001
authority: architecture
status: implemented
title: Component token state and variant naming
owner: "@darianrosebrook"
updated: 2026-09-30
verified_at_commit: 38c798cb0eb2
governs:
  - packages/ds-contracts/components/**/*.tokens.json
  - packages/ds-codegen/src/component-token-naming.ts
  - packages/ds-codegen/src/validation/component-design-policy.ts
---

# Component token state and variant naming

Component tokens are a flat pool of consumed defaults. Style sidecars own property
reads and selector-scoped redefinitions. Public design bindings are separate,
unset override addresses. A CSS state chooses paint at its consumer; a variant
chooses its authored size or appearance. Neither introduces an unchecked token list.

Reserve a terminal `default` qualifier for a family with an explicitly declared
state sibling. A base slot without a state sibling uses a neutral name. Named
variant choices retain their qualifier; a small size is a variant, not a state.
The rule applies to component token declarations, not semantic graph vocabulary,
variant enum values, default props, or the word `default` in a CSS layer name.

| Decision | Component address | Reason |
| --- | --- | --- |
| Button background at rest | `button.color.background.default` | Has hover, active and disabled siblings |
| Button gap | `button.size.gap` | One live gap, redefined by size variants |
| Button medium typography | `button.size.fontSize.medium` | Explicit size qualifier; no default state claim |
| Avatar base size | `avatar.size` | Base geometry without state siblings |
| Avatar small size | `avatar.size.small` | Explicit variant choice |
| Avatar background | `avatar.color.background` | No declared background state siblings |
| Card radius | `card.size.radius` | A shared default shape decision |

The state vocabulary combines the contract's normalized states with common CSS
and interaction states. Variant membership alone never creates a state sibling.
An isolated state-qualified slot such as `input.color.focus` does not need a second
`default` qualifier. Shared `box-model.*` geometry keeps its canonical names.

`generate:check` rejects base slots incorrectly named as state defaults and missing
bindings for common Web design decisions. Layout and literal intrinsic sizing stay
opt-in. The design migration script and semantic validator share the coverage rule;
there is no exception ledger. Property identity, namespace, independent addresses,
token consumption, fallback freshness and brand destinations remain separate gates.

## Public API migration

`COMPONENT-TOKEN-COHESION-01` removes terminal `default` from base slots throughout
the corpus and updates sidecars, brand destinations, native consumers and generated
outputs together. CSS address spelling follows the same rename: for example,
`--fsds-button-size-gap-default` becomes `--fsds-button-size-gap`, and
`--fsds-avatar-size-default` becomes `--fsds-avatar-size`. Consumers must update
their authored overrides. Retired names are not emitted as compatibility aliases.
Existing design binding addresses and variant props retain their identities.

The rename preserves authored values and semantic references. Separate corrections
in the same slice route ordinary disclosure/navigation focus through
`semantic.focus.ring.*` and code typography through
`semantic.typography.semanticFamily.mono`. NavList deliberately retains its inward
ring offset to keep the indicator inside its painted item. Native role lookup
selects actual declared base or default-state slots; it never selects hover paint
as a rest value or manufactures an alias dictionary.

Unit checks reject naming collisions, missing bindings and non-rest role matches.
Browser witnesses exercise semantic focus and code-family changes, independent
overrides, clearing, Avatar variant dimensions and Button gap across Web targets.
These do not establish arbitrary theme accessibility or native device rendering.

A brand can address a neutral base and an explicit variant as sibling component
keys: `size` and `size.small`. Use the dotted variant key in that case so a token
leaf does not also become a nested group. Both destinations must have consumers.
