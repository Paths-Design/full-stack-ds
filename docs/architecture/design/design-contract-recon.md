---
doc_id: RECON-DESIGN-SEMANTIC-PORTABILITY-001
authority: reference
status: active
title: Design binding authority and native style preservation recon
owner: "@darianrosebrook"
updated: 2026-09-06
governs:
  - scripts/design-contract-recon.mjs
  - scripts/design-contract-recon.test.mjs
---

# Design binding authority and native style preservation recon

**Decision: retain the current Web design-binding implementation. This recon does not justify an unwind or a slot-first schema rewrite.** Its initial run demonstrated separate, existing losses in native style realization: Card's clipping choice is ignored, and a percentage radius override becomes zero at SwiftUI's radius consumer. These findings constrain cross-target style-parity claims; they do not falsify the repository's stated cross-framework Web DOM claim.

The bounded follow-up in `NATIVE-STYLE-SUPPORT-01` resolves those witnesses at native realization boundaries; see [Native follow-up](#native-follow-up). The historical observations below remain dated evidence.

The audit is deliberately bounded. It does not establish that the entire contract is substrate-neutral, that every native style is correct, or that every design binding has adequate semantics. It establishes where the measured information is preserved and lost, and whether removing the new design metadata changes that result.

## Question and authority

The motivating concern was whether design bindings repeat the pattern of defining a capability through one backend's implementation, then translating that implementation into other backends. Syntax alone cannot settle this: a slot-keyed object can still encode CSS assumptions, and a CSS-keyed Web extension can be correctly scoped.

The current [binding contract](component-design-bindings.md) explicitly exposes its new override API to Web DOM. Native targets retain their token/theme APIs; Figma carries descriptor metadata. [Codegen authority](../../codegen-authority.md) places durable intent in the contract and realization in backends. The [README](../../../README.md) expressly does not claim substrate-neutral UI semantics.

We therefore tested three distinct hypotheses:

1. **Binding-layer regression:** adding `design` metadata changes existing defaults or native realizations.
2. **Native realization loss:** an authored decision reaches normalized facts but disappears or changes meaning downstream.
3. **Shared-contract inadequacy:** the intended decision cannot be represented without making one backend's meaning authoritative for every target.

Hypothesis 1 was not observed in the measured corpus. Hypothesis 2 has concrete witnesses. The witnesses do not establish hypothesis 3: the clipping distinction and radius value are already carried to the point where the native implementation loses them.

## Reproduction and evidence boundaries

From an installed repository checkout on macOS with Swift and Playwright Chromium available:

```sh
pnpm --filter @full-stack-ds/codegen build
pnpm run tokens:build
node --test scripts/design-contract-recon.test.mjs
node scripts/design-contract-recon.mjs
```

The probe writes only under ignored `tmp/design-contract-recon/` by default; `--out=/absolute/path` selects an evidence directory. It leaves production contracts, emitters and runtimes unchanged. Exit zero means the measurement completed, **not** that every measured capability passed. Missing corpus, mismatched target sets, missing tools, failed compilation and failed positive controls abort the run. This is an experiment, not a CI allowance ledger or a regression test that requires defects to persist.

`report.json` records the checkout commit, production source hashes, probe hash and tool versions. `metadata-erasure.json` contains per-component/per-target digests for the named React Native, SwiftUI and Compose cohort. `clipping.json`, `web.json`, `react-native.json`, `swift.json`, freshly emitted Card source and the Swift probe source preserve the observations. Generated output is not committed.

The recorded run used production sources from `main@3827f483`; the worktree additionally contained CAWS lifecycle commits and this recon's files. Historical observations below are dated 2026-09-06, not permanent corpus counts. Re-run the script for current results.

| Measurement | What actually executes | Proof ceiling |
| --- | --- | --- |
| Metadata erasure | Current contract loader, IR builder and registered native emitters, with and without only the `design` fields | Emitted source/default-fact identity; not native runtime equivalence under all inputs |
| Web radius/clipping | Chromium, generated CSS and shared box CSS on a controlled Card-shaped DOM | Computed styles and outside-child hit testing; not a framework mount or screenshot-fidelity claim |
| React Native radius | Actual token runtime plus freshly emitted token/style modules | Values handed to `StyleSheet.create`; registration is intercepted, so no device geometry claim |
| Swift radius and clipping | Actual `FsdsTheme.swift` and freshly emitted Card compiled with `swiftc`, rendered through `NSHostingView` in separate processes | Current probe measures pixels and explicit radius rejection on macOS; the original run measured the `?? 0` expression. Neither proves iOS device behavior |
| Figma | Descriptor defaults before/after erasure | Metadata carriage only; no live Figma materialization |

The scoped script invokes schema, semantic-reference, token-reference, style-reference, selector-collision, fallback and component-consumption checks for the clipping fixtures. It does not call hypothetical-fixture artifact-drift checks against the unrelated committed Card bytes. Schema acceptance is not framework admission or a promise of complete native style support.

## Observations

### Binding metadata does not change the measured existing native outputs

Removing all 1,035 design bindings from the 51-component corpus changed no generated native component/style/token output for the registered allowlists. The React Native and SwiftUI cohorts each covered 51 components; Compose covered its 23 allowed components. Card is not Compose-allowlisted, so the Card runtime witnesses make no Compose claim.

All normalized default CSS blocks, token scopes and Figma default CSS facts also remained identical. The controlled Web Card retained its defaults after metadata removal. Its independent media override changed the media radius from `8px` to `23px` while leaving the root at `8px`.

A native-only design entry (`platforms: ["ios"]`) is rejected with `Design overrides currently require a web consumer`. This is an explicit limitation consistent with the documented Web-only override API. Setting its Web design address in an RN theme does not create a native part control; that is outside the declared API, not evidence of a broken supported native control.

### Card clipping is represented upstream and dropped downstream

The paired fixture changes only this entry, keeping the rest of the real Card contract constant:

```json
{
  "overflow": {
    "literal": "visible",
    "platforms": ["web", "ios", "android"],
    "design": {
      "property": "layout.overflow",
      "slot": "card.design.root.layout.overflow"
    }
  }
}
```

The second input uses `hidden`. Both pass the listed source checks. `computeCssBlocks` retains the two distinct values for **each** requested platform. In Chromium, an overflowing child is hit-testable with `visible` and excluded with `hidden`. Thus the input distinction has an independently observed effect.

Yet the freshly emitted React Native and SwiftUI artifacts are byte-identical between the inputs. The same identity holds with all `design` metadata removed. A deterministic realization that receives identical generated behavior cannot implement both requested clipping choices.

The loss is localizable: React Native's style projection has no `overflow` mapping, while the SwiftUI region-container emitter applies `.clipShape(RoundedRectangle(...))` whenever radius chrome exists. The contract already carries the distinction; it is not necessary to invent a new semantic contract merely to preserve this choice. The narrow next action is native realization support or an explicit unsupported-property diagnostic. General native visual parity remains outside the existing claim ledger.

### Percentage radius is retained as data, then lost in Swift conversion

Using the existing public component-token address `card.size.radius`:

| Override | Chromium computed radius | RN style-construction value | Swift parsed radius | Swift consumer radius |
| --- | --- | --- | --- | --- |
| `8px` | `8px` baseline | `8` | `8` | `8` |
| `20px` | `20px` | `20` | `20` | `20` |
| `50%` | `50%` | `"50%"` | `nil` | `0` |

The absolute-length control verifies that the probe reaches working token consumers. The percentage string reaches the Swift token runtime, whose `px` accessor accepts only numbers and px-like strings. Card then uses `pxSlot("size.radius.default") ?? 0`. No claim is made about how RN lays out its percentage string on a device.

Swift's runtime comments already describe unsupported units returning nil. Therefore this is a demonstrated **unit-support limitation and fallback behavior**, not evidence that the new design bindings broke a previously promised percentage API. A future portable radius contract must distinguish absolute and relative geometry and declare support or rejection; silently treating a relative radius as zero cannot establish semantic parity.

The relevant Swift parser and clipping emission also exist at `059fda91^` (`84f0627145bd627109d6627a1afb6d3c49590256`), before the design-binding merge. This history check corroborates the current metadata-erasure experiment; it is not a historical runtime rerun.

## Disposition

| Finding | Classification | Required interpretation |
| --- | --- | --- |
| CSS-owned binding discovery and Web-shaped binding IR | Architectural coupling, explicitly scoped today | Insufficient by itself to justify replacement |
| Corpus native/default identity under metadata erasure | Bounded non-regression evidence | Preserve the useful binding/fallback/consumption work |
| All-platform clipping choice disappears in native emissions | Native projection/support-reporting gap | Fix the realization boundary or reject the unsupported request explicitly |
| Percentage radius becomes zero at Swift consumer | Existing native unit-support limitation | Define support/rejection and preserve intent before claiming portable radius semantics |
| Slot-first schema would solve these findings | Not established | Re-keying metadata alone does not repair either loss |

The next justified implementation is a bounded native style-support slice, beginning with clipping and radius-unit admission. A semantic-contract change becomes justified if that work produces a decision that cannot be carried without ambiguity by the existing contract. No production rewrite or native fix is included in this recon.


## Native follow-up

`NATIVE-STYLE-SUPPORT-01` keeps the Web binding schema intact. Normalization now carries the authored root clipping decision with its platform applicability. React Native lowers it to `overflow`, using `Platform.select` when iOS and Android differ. SwiftUI's generic region-composer path (Card and Field in the measured corpus) rounds the background independently and clips descendants only for an explicit `hidden` request. Absent clipping leaves content visible.

The supported native root policy is deliberately finite: literal `overflow: visible` or `hidden`. Root axis-specific, scrolling, multi-value and token-driven requests raise `NATIVE_ROOT_CLIPPING_UNSUPPORTED` when these consumers generate. A fallback does not constitute support for changing a clipping token at runtime. Web-only declarations remain Web-only. This slice does not claim native realization of conditional or part-scoped clipping, nor clipping parity for other SwiftUI emission classes or Compose.

SwiftUI region-composer radii now accept finite nonnegative numbers and decimal px lengths. An absent value stays absent and existing authored fallbacks still resolve normally. An explicit unsupported value, including `50%`, raises `FSDS_SWIFTUI_RADIUS_UNSUPPORTED` through a precondition at the generated radius consumer; it is not silently replaced by zero or another fallback. Applications handling external theme input can call `FsdsTokenValue.validatedRadius()` and handle its typed error before rendering. This rejection policy is scoped to region composers; other SwiftUI radius consumers still require their own support audit.

The updated probe renders freshly emitted default, visible and hidden Card variants through a real macOS host. It samples the overflowing child against an interior copy of the same witness color, avoiding assumptions about display color conversion. It also renders Field, samples both composers under `0px` and `20px`, and runs percentage overrides in their own processes. The follow-up observed visible/hidden pixels diverging, the corner changing with absolute radius, and percentage rejection reaching the generated view. React Native's actual generated style factory receives distinct overflow values; that remains style-construction evidence, not device paint. Corpus metadata erasure still preserves measured native emissions and defaults.

Reproduction remains the command sequence above, plus `swift test --package-path packages/ds-swiftui` and `pnpm exec vitest run packages/ds-codegen/src/frameworks/native-style-support.test.ts`. Probe output includes per-case PNGs and stderr alongside the source hashes and JSON measurements. Exit zero still means the experiment completed; use the observations to adjudicate the result. General native visual parity and a portable relative-radius model remain unproven.
