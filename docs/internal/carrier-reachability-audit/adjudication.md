---
doc_id: AUDIT-WEB-STYLE-CARRIER-ADJUDICATION-001
authority: reference
status: implemented
title: Web style-carrier adjudication
owner: "@darianrosebrook"
updated: 2026-09-03
---

# Web style-carrier adjudication

Spec: `ADJUDICATE-WEB-STYLE-REALIZATION-DEBT-01`.

Two rails measure whether authored styling can attach to anything:

- **Forward** (`scripts/carrier-reachability-audit/`) — an authored selector
  requires a component-owned carrier the Web-DOM IR cannot produce, so the rule
  matches nothing.
- **Inverse** (`scripts/variant-style-audit/`) — the component emits a variant
  carrier and no CSS rule selects it, so choosing that value changes nothing.

This document records what each finding *is*, on evidence, and what was done.

The governing constraint is `FIX-DEAD-SLOT-UNRENDERED-PART-AUTHORITY-01`:

> Absence from a generated realization is evidence of a realization mismatch,
> never sufficient evidence that the declaring contract surface is stale.

Every retirement below therefore cites evidence sourced **independently of the
generated output** — the contract, its sidecars, or its usage examples.

## Forward: 18 findings, 11 carriers, all resolved

The 18 rows were 18 selector occurrences over 11 unique carriers; several
carriers were named by more than one selector. Grouped by carrier, with the
witnesses preserved:

| Carrier | Witness selectors | Adjudication | Outcome |
|---|---|---|---|
| `Button.button__spinner` | `spinner` | realization gap — the contract says `loading` "replaces content with a spinner and sets aria-busy", and declares `spinner` with role `decoration` | realized: `<span part="spinner" if="loading">` |
| `Button.button__loadingText` | `loadingText`, `.button[aria-busy="true"] .button__loadingText` | realization gap — declared part with role `label` | realized: `<span part="loadingText">` wrapping the children region |
| `Checkbox.checkbox__input` | `input`, 3 `:has()` state keys | realization gap — the contract describes a composite control (`root`/`input`/`indicator`) while `anatomy.dom` collapsed to a bare `<input>` | realized: `<label part="root">` wrapping input + indicator |
| `Checkbox.checkbox__indicator` | `indicator`, `.checkbox:hover …`, 3 `:has()` state keys | same | realized; see the `:has()` note below |
| `Details.details--none` | `.details--icon-none .details__icon` | selector defect — the sidecar named a namespaced modifier while the disjoint `icon` axis emits the bare `details--none` | selector repaired |
| `Details.details--right` | `.details--icon-right .details__icon` | same | selector repaired |
| `Skeleton.skeleton__stack` | `stack` | realization gap — see below | realized |
| `Skeleton.skeleton__shape` | `shape` | realization gap — see below | realized |
| `Tabs.tabs` | `--vertical __root` | selector defect — a part-suffixed key for the root | key rewritten to `--vertical` |
| `Text.text__error` | `error` | **contract retirement** — Text declares only `anatomy.parts: ["root"]`, no error/success variant, prop or token; nothing could ever select it | block deleted |
| `Text.text__success` | `success` | same | block deleted |

Forward ledger: **18 → 0**.

### Checkbox: making a carrier reachable made three selectors wrong

`Checkbox.styles.json` already carried `:has(.checkbox__input:checked)
.checkbox__indicator` and two siblings. While the carriers did not exist those
rules were dead, and their subject-less form was harmless. Realizing the
carriers made all three live — and a subject-less `:has(X) Y` matches *any*
ancestor holding a checked input and then *every* indicator beneath it, so one
checked checkbox painted its unchecked siblings.

Each key is now anchored to `.checkbox`, matching the precedent set for Switch.
JSDOM does not evaluate `:has()`, so this is proven in Chromium by
`e2e/style-carrier-rail.spec.ts`; reverting the anchoring turns the scoping
assertion red in all five web frameworks.

That the sidecar was authored *for* the composite topology is itself evidence
the contract, not the realization, was the correct side.

### Skeleton: the usage sidecar decided it

Skeleton declared `stack`, `row` and `shape` parts and a `lines` prop while
`anatomy.dom` was a childless `<div>`; every framework rendered one box for any
`lines` value. The evidence that the declaration was live is contract-side: the
curated usage example passes `lines: 3` and describes "a two-to-four line
paragraph", the part descriptions name a stack of repeated rows, and
`row`/`shape` are declared `multiple: true`.

`SkeletonLines` was retired and `lines` typed `number`. The `{min, max}` arm was
realized by no emitter, exercised by no test and used by no usage example, and
`iterate.kind: "count"` requires a number-typed prop.

## The cross-target finding

Four non-web emission predicates keyed on web DOM **topology** as a proxy for a
contract fact. Repairing a web carrier changes `anatomy.dom`, so each repair
silently changed — or hard-broke — a realization on another target. None of
these are visible to either rail.

| Predicate | Proxy used | Consequence of the repair | Contract fact now used |
|---|---|---|---|
| react-native `isCheckboxRootPattern` | input must be the **root** | RN fell onto the generic DOM walk: testID on a wrapper View instead of the interactive node, a duplicate `checked` key coercing `"mixed"` to false, no indicator mark, no label | `behavior.form.inputType`, minus the native-toggle collapse |
| swiftui `isProjectedChildrenAction` | root's **sole child** is a bare children node | Button matched no class; `--target=all` threw | one consumer content region, no named slots, real `<button>` dom root |
| swiftui `isTextValueControl` | input must be the **root** | Checkbox matched no class; `--target=all` threw | input is root-or-direct-child, not iterated, no projections |
| swiftui + compose `isStaticContent` | dom child list must be **empty** | Skeleton matched no class; `--target=all` threw | no consumer content leaf and no content binding |
| compose `isProgressIndicator` | "has any dom children" told Spinner from Skeleton | Skeleton became a spinning `FsdsProgressIndicator` and lost its `content` parameter | one leaf child whose part declares role `decoration` |

Generated native trees are byte-identical to `main` after every repair, which
is the proof that each predicate was re-narrowed to its original extension
rather than merely widened.

One further defect was newly *exposed* rather than pre-existing: Skeleton's
`if: "lines"` is the corpus's first numeric render guard, and React renders a
falsy number as text, so `{lines && …}` painted a stray `"0"`. The React
emitter now emits a ternary with an explicit null branch.

## Card: five carriers of unknown topology (audit only)

Card has no `anatomy.dom`, so `partsDeterminate` is `false` and the forward rail
correctly refuses to call anything impossible — its producible part set is
UNKNOWN, which is a third state distinct from *known reachable* and *known
impossible*. Card's five carriers are therefore adjudicated here, separately,
and were never in the forward count.

`.card__media`, `.card__actions`, `.card__badge`, `.card__link` and
`.card__note` are styled in generated CSS and carried by nothing. Card emits
four compound subcomponents (`CardHeader`, `CardContent`, `CardFooter`,
`CardDescription`) and no others.

**Cause**, and it is not Card's contract: `isCompoundPart` in
`packages/ds-codegen/src/semantics.ts` tests the part name against a hardcoded
`COMPOUND_PARTS` allowlist — `header, footer, body, content, title,
description, panel, item, option, group, list, tab, trigger`. `media`,
`actions`, `badge`, `link` and `note` are absent, so no subcomponent is emitted
for them. This is emitter lore standing in for a contract fact, the pattern the
layer ladder forbids.

**Adjudication: realization gap, on contract-sourced evidence.** Card's
`a2ui.usageHints` instruct consumers to "Use **Card.Link** to make the entire
card clickable", "Keep **Card.Actions** to 1–2 actions" and "**Card.Media**
expects a fixed-aspect image or media slot". The contract documents these as
subcomponents consumers are meant to use, and all five are declared parts with
declared slots and authored style blocks. None of that evidence comes from the
generated output.

**Not repaired in this slice, deliberately.** Two facts bound the repair:

1. Measured blast radius: Card is the **only** dom-less component with
   slot-bearing parts outside the allowlist, so a slot-driven rule reclassifies
   exactly these five. But `isCompoundPart` is applied to every component, not
   only dom-less ones, and 29 dom-bearing components declare slot-bearing parts
   outside the allowlist. A correct rule must therefore consult the contract
   (dom-less-ness), not just the part name — a codegen change with a much wider
   surface than a style-carrier adjudication.
2. `Card.Link` needs a decision this slice has no basis to make. Its declared
   role is `trigger`, Card declares no `href` prop, and `SEMANTIC_ELEMENTS` maps
   neither `link` nor a part's declared role to an element. Emitting it as a
   `<div>` would make the carrier reachable while contradicting the role.

## Card's historical badge-slot deletion, re-audited

This section records the audit revision. `SHOWCASE-COMPONENT-USABILITY-01`
subsequently removed Card's status axis and all of its accent-border tokens.
The badge region now supplies layout only; a composed Badge or Status owns its
paint. The historical deletion verdict below is unchanged.

`docs/current-implementation-snapshot.md` records that Card badge slots deleted
in the 114→98 unbound-interface burn were removed under the ground later
withdrawn, and had not been re-adjudicated.

The commit is `571efd96`, and its message states the ground verbatim: *"Card's
ten non-accent badge color slots (**badge is a declared part the render never
emits**)"*. That is exactly the withdrawn inference.

The ten slots were `card.color.badge.{success,warning,info,error,neutral}.{background,foreground}`.

**Verdict: the deletion stands, on a different and contract-sourced ground.**
At the audit revision, Card declared no `success`/`warning`/`info`/`error`/`neutral` vocabulary
anywhere — not in `variants` (`status`: completed, in-progress, planned,
deprecated, category, complexity; `density`: default, inset), not in `types`,
not in a prop. No consumer could select those slots whether or not `badge` is
rendered. That is classifier rule 5b's ground — a slot keyed to a value no
declared axis admits — which the slice-0 investigation found survives, and it
is strictly stronger than the ground actually cited.

The mechanism at the audit revision confirmed the reading: Card's declared status values route
through a single `card.color.statusAccent.default` slot that the `--completed`
/ `--in-progress` / `--complexity` blocks re-point. The deleted set was a
parallel palette for a vocabulary Card never declared.

At that revision, the surviving `card.color.badge.accent.{background,foreground}` pair is
consumed by the `badge` style block and was unaffected by that audit. Whether `badge` renders
at all is the separate topology question above; the original burn conflated the
two, and they are now split.

## Inverse: 43 findings across 20 axes, adjudicated

The inverse ledger is a ratchet, not a defect list — a row may be resolved by
painting the value **or** by establishing that the axis is non-visual. It does
not need to reach zero.

Each finding now carries `adjudication`, `evidence` and `remedy`, stamped by
`scripts/variant-style-audit/apply-adjudication.mjs`, which throws on any
finding it has no rule for so a newly censused row cannot inherit a blank
verdict.

| Adjudication | Findings | Axes |
|---|---|---|
| `structural-behavioral` | 22 | Popover/Tooltip/Walkthrough `placement`, `List.as`, `Accordion.type`, `Calendar.mode`, `OTP.mode`, `Tabs.activationMode`, `Toast.politeness` |
| `visual-obligation` | 10 | `Checkbox.size`, `ToggleSwitch.size`, `Progress.size`, `NavTree.iconSize`, `NavList.orientation`, `Badge.variant=status` |
| `unresolved-contract-semantics` | 8 | `Postcard.type`, `Progress.variant`, `Select.position` |
| `stale-vocabulary` | 3 | `Badge.variant=default`, `Chip.variant=default`, `Divider.orientation=horizontal` |

Three groups deserve their reasoning stated rather than tabulated.

**Placement is not merely unpainted — a class would be wrong.** Popover,
Tooltip and Walkthrough each declare `surface.positioning` with
`strategy: anchored`, `placementProp: placement` and `collision: flip-shift`.
The side is resolved at runtime and applied as coordinates, and collision
handling can flip it. A `--top` modifier would assert a side the runtime has
already changed. This is a stronger claim than "correctly unstyled".

**`List.as` is realized, just not by CSS.** The generated source reads
`const As = as ?? "ul"` and renders `<Stack as={As}>` — the polymorphic root.
The value changes the element. The redundant `list--<tag>` carrier is what the
inverse audit sees; suppressing that carrier for polymorphic-tag axes would
remove the finding without changing behavior.

**`stale-vocabulary` here means an undeclared default, not a deletion.**
`variantDefault` resolves an axis default only from the keyed prop's declared
`default`; when that is absent, *no* value is treated as base-covered and the
de-facto default is flagged alongside real gaps. Chip's `default`, Badge's
`default` and Divider's `horizontal` are base rules, not missing styling. The
remedy is a one-line contract declaration. Details' two equivalents
(`variant=default`, `icon=left`) were in scope and are fixed, which is what took
the ledger from 45 to 43.

## Non-claims

- Reachability proves a selector has a producible attachment point. It does not
  prove the rule wins the cascade, changes computed style, supplies content the
  part needs, or realizes any visual distinction.
- The forward ledger reaching zero means no authored selector is *impossible*
  for a `partsDeterminate: true` component. Card's five remain unadjudicated as
  to topology, by design.
- The forward validator (`validateStylesCarrierReachability`) is still not
  wired into `generate:check`. Promotion at the now-zero baseline is a separate
  slice.
- The cross-target predicate repairs are proven by byte-identity of the
  generated native trees plus per-guard mutation tests. They are not a claim
  that the native emission classes are correct in general — three of the five
  were found only because a web repair happened to break them.
- SwiftUI's Skeleton still does not honor `lines`, and Compose's Button still
  renders no spinner. Both are pre-existing gaps outside these emission classes'
  reach, not regressions.
