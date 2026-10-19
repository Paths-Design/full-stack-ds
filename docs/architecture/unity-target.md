---
doc_id: ARCH-UNITY-TARGET-001
authority: implementation
status: active
title: Unity UI Toolkit pilot
---

# Unity UI Toolkit pilot

`UNITY-INTERACTIVE-COMPONENTS-01` adds a registered Unity generation target with a bounded component allowlist and a local UPM package. Read [the package README](../../packages/ds-unity/README.md) for installation, supported behavior, commands and limitations.

The lowering path is `ComponentIR → Unity emitter → C# UXML controls → shared UI Toolkit runtime`. Boolean form-control facts select the boolean primitive; interaction operations select item-group behavior; part-attached, non-blocking, click-open surfaces select the anchored-surface primitive. Unsupported shapes throw. No dispatch rule branches on component identity. Auxiliary item controls are generated beside their parent; trigger and content nodes are composed by the shared runtime.

The wrappers carry normalized channel names, supported prop defaults, anatomy bindings, dismissal policy and typed default-size geometry. The shared runtime owns Unity event delivery, retained element trees, focus and panel coordinates. It does not read JSON contracts at runtime. The adapter maps the currently shared `type`, `collapsible`, `orientation`, `activationMode`, `loop`, `appearance` and `unmountInactive` prop vocabulary to C# options only when those props are declared. This is a bounded adapter, not proof that arbitrary future interaction options can be derived.

Verification has separate boundaries: TypeScript tests check routing and contract influence; compiler-only checks use real Unity reference assemblies and the UXML generator; EditMode tests require an activated Unity Editor and exercise import plus live panel events. The existing `governed:rail` does not execute the Unity lane. Neither compilation nor narrow EditMode facts establish full styling, accessibility or player runtime parity.

Unity's [custom-control documentation](https://docs.unity3d.com/6000.0/Documentation/Manual/UIE-create-custom-controls.html) defines the partial-class / `UxmlElement` registration mechanism. Unity's [package layout documentation](https://docs.unity3d.com/6000.0/Documentation/Manual/cus-layout.html) defines Runtime, Editor, Tests and Samples packaging.

## Recorded pilot verification

At source commit `c3b29662`, Unity 6000.5.3f1 ran `node scripts/unity-tests.mjs` with graphics enabled: all 14 EditMode cases passed, with no skipped cases. The runner imported the package as an embedded UPM package and imported its UXML/runtime sample into a consuming project's Assets directory. The UXML witness constructs the generated controls, discovers compound items, activates a tab and opens the popover. Other cases exercise boolean state, controlled requests, accordion single/multiple selection, keyboard tab navigation, panel retention, anchored dismissal and geometry.

The initial graphics-disabled run failed during panel setup; it supplied no behavior evidence. The first graphics-enabled run exposed a test-policy overlap: outside pointer focus changes also trigger blur. The final pointer case disables blur to isolate the outside-pointer policy; a separate real-focus case verifies blur across the anchor/content boundary.

The local evidence files are `tmp/unity-pilot/results.xml` and `tmp/unity-pilot/editor.log`, reproduced by the command above. They are not committed build artifacts. The existing root/framework suites and admission rail also passed during the slice; those checks do not extend Unity's narrow runtime claim. Player builds, screen-reader behavior and full visual parity remain outside this pilot.

## Runtime styling follow-up

`UNITY-RUNTIME-STYLING-01` addresses the Editor-default inheritance exposed by the consuming RC project: low-contrast Player text, partial native button styling, crowded disclosure labels and an unthemed portaled popover. The shared runtime attaches a package-owned USS resource to controls and floating content. This leaves contract lowering unchanged and keeps consumer panel scaling outside package authority.

`StylingTests.cs` checks Editor typography, switch/disclosure spacing and focus, then enters Play mode to render Player panels at 640×800 and 320×600 with Constant Pixel Size. It checks selected/disabled states, floating text/button styles, viewport containment and reachable scrolling. The runner writes screenshot witnesses beside its logs. These bounded checks do not establish arbitrary-resolution visual parity or player-build admission. The USS palette remains Unity-specific; full design-token and brand projection is future work.

## Capability inventory and standalone boundary

`UNITY-CAPABILITY-PLAYER-01` introduces reproducible source accounting:

```sh
pnpm --filter @full-stack-ds/codegen build
node packages/ds-codegen/dist/frameworks/unity/capabilities.js > tmp/unity-capabilities.json
node scripts/unity-player.mjs
```

The inventory walks the authoritative contract loader and registry. Each component receives a lowering `status`; each normalized prop is classified as `emitted-api` or `not-emitted` and carries the support-boundary rule for its family. Every contract and token/style sidecar leaf is listed individually with the disposition (`lowered`, `pending` or `refused`) and rule id that the [support boundary](#support-boundary) assigns it. Contract/sidecar hashes bind the observations to their inputs. The inventory is accounting, not proof of semantic parity; the generation gate belongs to the support boundary. `not-emitted` means no matching generated C# property: a callback can be lowered through a shared-runtime C# adaptation and a default channel through imperative initial assignment, and the boundary records each such adaptation as an explicit `via` mechanism rather than crediting it from property names.

The inventory finds only the allowlist admitted. Checkbox and ToggleSwitch pass the shape dispatcher but are unadmitted candidates; that does not establish their intended anatomy or behavior. Most other corpus shapes are rejected as `unsupported-shape`. The pilot emits no generated C# property for default channels, callback props, Switch size and form fields, or Tabs idBase. The boundary records the channel defaults and callbacks as `lowered` through runtime adaptations, Switch `name`/`value` and Tabs `idBase` as `refused` DOM-only fields, and Switch `size` as `pending` styling projection. An unknown prop on an allowlisted contract is listed as `not-emitted` in the inventory and fails generation until the boundary adjudicates its family.

The standalone witness copies the package into a fresh consuming project, creates a scene and PanelSettings, builds a macOS app, launches its executable with graphics, and requires an exact run identity and ordered check set. It records source hashes, logs, JSON and a screenshot under `tmp/unity-player/<run-id>/`. Tests prove package resources, generated UXML types, selected state changes, single callback delivery and popover placement/dismissal in an actual OSXPlayer process. UI events are synthetic. It does not prove physical keyboard/controller input routing, accessibility, UI Builder save/reopen, minimum-version compatibility, other operating systems or IL2CPP. The fixture runs in the background so an unattended window cannot stall the measurement.

At source `18abc116`, fresh run `9e7113e5-da40-4802-9e9b-8b8c0df36f90` passed all 11 required standalone checks; the optional Editor lane also passed all 17 cases. Recorded environment: Unity 6000.5.3f1, macOS, Metal, standalone Player. The package's declared 6000.0 minimum remains unverified; do not interpret this newer-version witness as minimum-version admission. The first background-disabled launch produced no usable receipt. A subsequent default-template project passed, but the stricter minimal project exposed an undeclared Test Framework dependency: package Editor tests were compiling without NUnit. The test assembly uses a package-version define constraint, so consumers without the Test Framework do not compile the optional tests; the explicit Editor test lane still exercises them. The minimal manifest declares only UIElements plus screenshot/image-conversion modules needed by the witness.

## Support boundary

`UNITY-SUPPORT-BOUNDARY-01` commits the machine-readable statement of what the Unity target lowers, defers and refuses: [`support-boundary.json`](../../packages/ds-codegen/src/frameworks/unity/support-boundary.json), validated against [`support-boundary.schema.json`](../../packages/ds-codegen/src/frameworks/unity/support-boundary.schema.json) and evaluated by [`boundary.ts`](../../packages/ds-codegen/src/frameworks/unity/boundary.ts). The file is an ordered rule list; the first matching rule wins. Every contract leaf and every token and style sidecar leaf resolves to exactly one rule, and each rule carries one disposition:

- `lowered`: the Unity emitter or the shared C# runtime realises the family. `via` names the mechanism, such as `RegisterValueChangedCallback` for a boolean channel's change member or pre-attachment assignment for a channel default.
- `pending`: a later parity phase lowers the family. `phase` names it and `reason` states what is missing. The phases are P2 (generic anatomy walker), P3 (styling projection), P4 (interaction families) and P5 (corpus and admission); the file's `phases` block summarises each.
- `refused`: UI Toolkit cannot realise the family idiomatically, and `reason` states why. Examples: HTML form submission fields have no form element to serialise into, USS has no `@keyframes`, and ARIA roles and relationships have no assistive-technology consumer.

The validator rejects a `lowered` rule without `via`, a `pending` rule without a phase and reason, and a `refused` rule without a reason. Only `pending` rules may be catch-alls.

Leaves are identity-keyed JSON pointers. An array element that carries a `name` or `part` is keyed by that identity rather than by its index. A prop member is keyed `<role>:<name>`, where the role comes from the contract's own `channels` and `form` blocks: `channel-value`, `channel-default`, `channel-change`, `form-field`, or `plain` for every other prop. Tabs' `value` is therefore keyed `channel-value:value`, while Switch's `name` and `value` are form fields because Switch participates in forms. Rules classify pointer families and never name a component. A `lowered` disposition says the family has a lowering; the component's inventory `status` says whether the dispatcher applies it to that component.

### Generation gate

The Unity emitter implements the codegen `admitContract` hook. The CLI's generate path calls it once per component with the validated contract, sidecar tokens and styles merged, before any lowering; watch mode passes the bare contract without the sidecar merge. A refusal fails generation like an emitter error, including under `--dry-run`. The gate has two refusals:

- `UNITY_BOUNDARY_UNCLASSIFIED`: a leaf matches no rule. Generation fails for every component, allowlisted or not.
- `UNITY_BOUNDARY_UNADJUDICATED`: an allowlisted component carries a leaf that only a `catchAll` rule matches. Catch-all rules classify unknown families as `pending` so that nothing is silently supported, and an allowlisted component may not rest on one. Widening the allowlist, or adding a prop to an admitted contract, therefore fails generation until a family rule in the boundary file decides it.
- `UNITY_BOUNDARY_UNREALIZED`: a `lowered` rule that declares `realizes` does not hold for the control this component gets. `emitted-property` requires the prop to be a generated public property, `selected-channel` and `selected-channel-member` tie channels and their props to the one channel the dispatcher selected, and `channel-change-event` requires an event to be emitted through that channel's change prop. A prop whose name belongs to a lowered family of another base (`orientation` on a Switch), a second channel, or an unrelated event is refused rather than dropped.

The dispatcher refuses by fact what a runtime base would otherwise contradict: a focus strategy that does not match the base (`UNITY_UNSUPPORTED_FOCUS`), a portal on a non-surface shape (`UNITY_UNSUPPORTED_PORTAL`), and a surface whose portal is disabled, whose presence is not persistent, whose content is not interactive, or whose interaction presence is not unmount (`UNITY_UNSUPPORTED_SURFACE`). Those refusals are what allow the matching families to be classified `lowered`.

An explicit `generate <Name>` request that bypasses the allowlist tolerates catch-all leaves but not unclassified or unrealised ones. The hook is admission only: it builds the IR to check realisation and derives no emitted source, so the generated C# does not depend on the boundary.

### Audit

`pnpm run audit:unity-boundary` builds the codegen package and runs the capability inventory in `--check` mode over the whole corpus. It fails on any unclassified leaf, on any allowlisted component that relies on a catch-all rule, on any dead rule that matches no live leaf, and on any allowlisted component whose control does not realise a lowered claim. It prints leaf counts per disposition and pending counts per phase. [`boundary.test.ts`](../../packages/ds-codegen/src/frameworks/unity/boundary.test.ts) pins the same audit, so the root `pnpm test` run in CI enforces it. The tests also pin role derivation from `channels` and `form`, identity keying, first-match ordering, `valueIn` filtering, both refusal codes and rejection of malformed rule files.

### What the boundary does not prove

The boundary is accounting plus a gate. A `lowered` disposition records that a family has a lowering; it is not semantic or runtime proof that the lowering is correct, and behavior evidence comes from the EditMode and Player witnesses above. Refusals are revisable decisions about UI Toolkit, not permanent exclusions. The `a11y` refusal, for example, holds only while UI Toolkit populates no assistive-technology tree, and the rule names that integration as the trigger to revisit it. Unity remains outside the TypeScript admission rail, and its EditMode and Player lanes are local runs, not CI gates.

### Next dependencies

In order. Each phase retires its `pending` rules, and the audit's per-phase pending count measures what remains.

1. **P2, anatomy walker.** Lower `ir.dom` and `ir.parts` into a generated VisualElement tree and turn the runtime bases into behavior mixins, retiring the `anatomy` and `slots` rules. Keep C# channel adaptation explicit rather than treating public property names as semantic equivalence.
2. **P3, styling projection.** Project consumed token, style and icon facts into generated USS, covering variants, states and box-model geometry. Emit explicit unsupported-property diagnostics, propagate the theme to floating content, and remove the hand-authored palette.
3. **P4, interaction families.** Lower static pressables, blocking and hover surfaces, composite and non-boolean form controls, componentRef composition, messages, motion and typed C# declarations. Each family moves from a catch-all to an explicit `lowered` or `refused` rule.
4. **P5, corpus and admission.** Compose an independent settings/inventory workflow to select the next component families and widen the allowlist toward the SwiftUI set, then add a CI compile lane, a committed-byte drift diff and build/runtime admission. Before widening platform promises, verify actual input routing, accessibility feasibility, UI Builder round trips and the minimum Unity version. The standalone fixture consumes the package sample, so it is not that independent application acceptance test.
