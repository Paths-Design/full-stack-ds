---
doc_id: ARCH-BOX-MODEL-PRIMITIVE-001
authority: architecture
status: implemented
title: Box-Model Primitive Slot Pool
owner: "@darianrosebrook"
updated: 2026-09-28
verified_at_commit: c2ad29f940d3cd01adde96da4ee43e884cd695e8
governs:
  - packages/ds-contracts/box-model.primitive.schema.json
  - packages/ds-contracts/primitives/BoxModel.primitive.json
  - packages/ds-codegen/src/box-model.ts
  - packages/ds-codegen/src/cli.ts
  - packages/ds-codegen/src/css.ts
  - packages/ds-codegen/src/ir.ts
---

# Box-model primitive slot pool

The schema owns the closed `box-model.*` vocabulary. The primitive owns conservative defaults for padding, gap, and intrinsic sizing. Component sidecars may override those defaults; morphology profiles supply an intermediate layer. The merge order remains primitive < morphology profile < authored sidecar. The material editor and native token facts retain that normalized surface.

## Web realization

Replaced elements need to preserve HTML sizing hints. Image's authored root
width/height defaults use `revert-layer`, because a literal `auto` overrides its
width/height attributes and selects intrinsic dimensions instead. Shared box
overrides still win in the later box layer, and explicit size variants still
win over root defaults. `e2e/image-media.spec.ts` checks 48px attribute sizing,
box overrides and clearing, and responsive/preset sizing on each web target.

The shared `primitives/box-model.css` stylesheet is emitted once per Web framework package and imported by each generated component stylesheet. Lit embeds the equivalent rules inside its shadow context, where a document stylesheet cannot reach. The preview loader explicitly inlines this dependency when constructing an iframe stylesheet.

Each `[data-fsds-component]` boundary resets the public `--fsds-box-model-*` variables to `initial` using `:where(...)` for zero specificity in light DOM. `initial` here means an unset custom property. It intentionally does **not** assign a universal zero or auto that would mask a component's authored design. Concrete defaults live at the component's consumer sites, including `resolvesTo` fallbacks.

The rendered box carries `data-fsds-box`; shared geometry rules target that marker. React, Vue, and Svelte put both markers on the same root. Angular and Lit have a component host boundary and a separate inner box: overrides set on the host inherit to that box without applying padding twice. Lit emits the boundary reset with `:host(...)` inside its shadow context. Svelte's primitive explicitly forwards both markers. Angular primitive layout uses layered CSS rather than inline host styles, so component and consumer controls can win.

Generated component token stylesheets no longer redeclare the same root box-model pool. Variant, state, and part defaults also lower to property fallbacks; they no longer populate the public shared override variables. Box overrides stay local to each boundary instead of inheriting into unrelated nested components.

Within the existing `components` cascade layer, the shared order is:

```css
@layer primitive, defaults, box, axes, sides;
```

Primitive layout precedes component defaults. Shared whole-box overrides precede axis overrides, which precede individual sides. Each optional control uses `revert-layer` when unset, preserving the preceding layer's value. This gives shorthand padding its normal multi-value meaning while permitting one logical side to be changed independently. Clearing the side restores the shorthand; clearing the shorthand restores the component default.

```css
[data-fsds-component="card"] {
  --fsds-box-model-padding: 20px 30px;
  --fsds-box-model-padding-inline-start: 7px;
}
```

This is ordinary consumer CSS, outside the generated layer. It wins without specificity escalation and does not change an embedded Button's padding. Ancestor-only declarations of shared box variables are intentionally reset at the next component boundary. Use a selector targeting those boundaries for a family-wide override. Component-specific inherited design controls are described in [component design bindings](./component-design-bindings.md).

## Vocabulary and extension

Padding uses logical axes and sides so it follows writing mode. Margin belongs to composition, and border belongs to the separate border design property set; neither is part of this pool. The schema remains the slot enumeration authority. To add a box control, extend the schema and primitive defaults, give it a consumer/default projection in the IR and affected backends, and verify unset, overridden, cleared, and nested behavior. Merely adding a declaration does not make a control usable.

## Authority and evidence

- `box-model.primitive.schema.json` enumerates legal slots and authoring value shapes.
- `primitives/BoxModel.primitive.json` defines defaults; `box-model.ts` merges them and emits shared controls from the same slot enumeration.
- `ir.ts` retains default facts for all backends. `css.ts` places concrete fallbacks at Web consumer sites and removes shared override defaults from every component declaration block.
- `box-model.test.ts` verifies default precedence, schema rejection, non-hoisting, and variant defaults at property consumers.
- `e2e/component-token-consumption.spec.ts` verifies that variant defaults cannot defeat shorthand, axis, and side overrides across Web targets.
- `e2e/design-bindings.spec.ts` checks actual browser shorthand/side behavior, restoration, nested isolation, and consumer precedence without the global semantic stylesheet.
- `e2e/showcase-controls.spec.ts` checks the composed inspector color well and source annotation geometry. Shared Input and Button consumers use scoped box/design overrides; this adoption adds no geometry slots.

Portal surfaces need their own applicable boundary/selector; this does not transport an ancestor's custom properties into a portal. Native emitters project the normalized material facts down to the slots their generated code reads. Shared CSS controls do not imply a native override API, identical behavior on all host elements, or visual correctness for every possible value.

Brand-expression reconciliation at the verification stamp above reviewed the CLI destination-validation addition: it does not change the box schema, primitive defaults, IR merge or shared reset rules. Component-specific brand variables live in a separate namespace; they do not bypass the public box-control boundary.

Motion reconciliation reviewed the declaration-custody and loading-loop changes
since the prior stamp. `webCssBlocks` now also consumes resolved loop facts; the
box default merge, boundary reset, and consumer fallback rules remain unchanged.
The root suite retains the box-model and framework boundary witnesses. Loading
loops do not introduce a geometry resolver or size-sensitive timing policy.
