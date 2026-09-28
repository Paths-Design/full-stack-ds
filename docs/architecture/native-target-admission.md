---
doc_id: ARCH-NATIVE-TARGET-ADMISSION-001
authority: canonical
status: active
title: Native target admission — criteria per codegen output
owner: "@darianrosebrook"
updated: 2026-09-13
governs:
  - packages/ds-codegen/src/frameworks/native-emission-class.ts
  - packages/ds-codegen/src/frameworks/swift/swiftui/component-source.ts
  - packages/ds-codegen/src/frameworks/jetpack-compose
  - fsds.targets.json
  - scripts/compose-parity-diff.mjs
---

# Native target admission — criteria per codegen output

Status: active doctrine. Governs which components a native codegen output
(SwiftUI, Jetpack Compose) may admit, and what "admitted" proves. The
rail-admitted web family (React, Vue, Svelte, Angular, Lit, React Native)
is out of scope here; its admission authority is the admission-descriptor
registry plus the governed rail.

## The shared substrate

A component's durable semantics live in its contract; each native target is
a realization backend. Between the IR and the native emitters sits one
shared substrate module, `packages/ds-codegen/src/frameworks/native-emission-class.ts`
(sibling of `native-token-consumption.ts`), which owns the framework-neutral
**emission-class predicates**: the content-shape family
(`isProjectedChildrenAction`, `isStaticContent`, `isBareRuleLeaf`,
`isVisualOnlyLeaf`, `isGlyphHost`, `domGlyph`, `isIconDecoratedContent`),
the control family (`isValueChannelControl` with `soleInputElement` /
`soleValueChannel`, `isLabeledTextControl`, `isSelectionControl`,
`radioGroupFacts`), the collection family (`isArrayIteratedList`,
`isInteractiveComposite`, `isCountIteratedFieldGroup`, `isDateGridSurface`,
`isReferencedActionComposite`, `isNamedSlotComposer`), the surface family
(`isCenteredSurface`, `surfaceStringChannel`, `isViewportEdgeSurface`,
`isAnchoredSurface`), and the structural atoms (`countChildrenLeaves`,
`hasEssentialComponentInstance`). The module's exports are the authority
for the current list; this paragraph names the families, not a count.

Two rules govern what lives there:

1. **Identical predicates are written once.** When two targets implement the
   same class word-for-word (static content, projected-children action,
   bare-rule leaf, value-channel control), the predicate lives in the
   substrate and both emitters import it. A copy is a drift defect waiting
   to happen — this is how `isProjectedChildrenAction` started (exported
   from the swift emitter for the jetpack action path) before it had a
   durable home.
2. **Divergent predicates stay at the target, built from shared atoms.** The
   jetpack prop-text and expandable gates are deliberately broader than
   swift's (they realize shapes swift routes elsewhere). That divergence is
   target-capability information: unifying it would silently change one
   target's admitted set. Divergent predicates compose from the substrate's
   atoms so the difference is visible at the dispatch site.

An emission-class predicate that special-cases a component name is a
missing IR fact — push the fact down, never the name up.

## The admission ladder

A component is admissible for a native target when **all** of the following
hold. Each rung is mechanically checked; none is a judgment call.

| Rung | Criterion | Authority |
|---|---|---|
| C1 Class | The component's structural emission class is realized by the target's emitter, dispatching on a substrate (or explicitly target-local) predicate. Zero component-name checks in the dispatch path. | Code review + `grep` for name literals in dispatch; unit tests pin class routing |
| C2 Registration | The component is on the target's `components` allowlist in `fsds.targets.json`. The allowlist scopes *default* generation only — explicit per-component requests bypass it and must hit the emitter's fail-loud not-implemented throw for unimplemented classes. Admission never silences an emitter gap. | `fsds.targets.json`; CLI allowlist filter |
| C3 Bytes | The target's generated tree is committed and regeneration is byte-identical. | CI generated-tree diff; local `generate` + `git diff --exit-code` |
| C4 Compile | The target's own toolchain compiles the tree. Compose: `gradlew :library:compileKotlin` (plus the CI kotlinc smoke lane and the settings example consumer). SwiftUI: `swift build`/`swift test` over the SwiftPM package (the test target additionally evaluates every admitted component body). | Native compile lanes in CI |
| C5 Token parity | Every token definition the target emits is consumed, every lookup has a definition, shared slot identities agree with React Native, chrome roles are claimed per emitter path, and the composable API keeps `modifier` as the first optional parameter. The path must be the one that actually produced the bytes: a surface is classified by its own host marker **before** any marker whose host it reuses (an anchored surface is a `Popup(`, a centered surface may carry a `BasicTextField(`), because a misclassified path makes its chrome-role claim vacuous. Compose: `pnpm run parity:compose-tokens`. | `scripts/compose-parity-diff.mjs` (+ self-test, which pins each surface case in both directions) |
| C6 Substrate discipline | Committed substrates are foundation-only (zero `androidx.compose.material` imports) and live in family-named directories (`toggle/`, `rule/`, `controls/`) that never match a component name in any casing — on case-insensitive filesystems a `checkbox/` substrate dir and the generated `Checkbox/` component dir are one physical directory with two owners. | Review + the parity script's per-path detection |
| C8 Reference realization | A component that composes another generated component must (a) have that component on its own allowlist, so the generated call resolves, and (b) either realize each reference the contract declares or list it in the gate's divergence ledger. Both directions are mechanical: an unrealized reference that is not ledgered fails, and a ledgered reference that becomes realized fails as stale. | `scripts/compose-parity-diff.mjs` (`inspectComponentReferences`, reference ledger) |
| C7 Divergences ledgered | Every contract fact the realization does not lower (omitted props, binary-only state, unclaimed layout slots) is named as a divergence in the emitter's docstring and here — never silently dropped. | This document |

## Current per-target state

SwiftUI admits its explicit allowlist: `<!-- target-component-count:swiftui -->52`
of `<!-- component-count -->53` contracts. Jetpack Compose admits
`<!-- target-component-count:jetpack-compose -->52`, realized through the
emitter paths below (each dispatches on the substrate or its documented
local twin):

| Compose emitter path | Substrate predicate | Corpus consumers |
|---|---|---|
| native-toggle collapse | `collapseIntents: native-toggle-affordance` | Switch, ToggleSwitch |
| projected-children action | `isProjectedChildrenAction` (substrate) | Button, Links, NavList |
| boolean control | `isValueChannelControl` + boolean channel (substrate) | Checkbox |
| text control | `isValueChannelControl` + string channel (substrate) | Input |
| native-disclosure collapse | `collapseIntents: native-disclosure` | Details |
| radio collection | `radioGroupFacts` (substrate) | RadioGroup |
| array-iterated list | `isArrayIteratedList` (substrate) | Shuttle |
| interactive composite | `isInteractiveComposite` (substrate) | Accordion, Tabs |
| count-iterated field group | `isCountIteratedFieldGroup` (substrate) | OTP |
| date-grid surface | `isDateGridSurface` (substrate) | Calendar |
| referenced-action composite | `isReferencedActionComposite` (substrate) | Chip |
| passive tree item | `isPassiveTreeItem` (substrate) | NavTree |
| compound-part composer | `isCompoundPartComposer` (substrate) | Card |
| media leaf | `isMediaLeaf` (substrate) | Image |
| referenced content composite | `isReferencedContentComposite` (substrate) | Avatar |
| named-slot composer | `isNamedSlotComposer` (substrate) | Field |
| labeled text control | `isLabeledTextControl` (substrate) | TextField |
| selection control | `isSelectionControl` (substrate) | Select |
| centered surface | `isCenteredSurface` (substrate) + `surfaceStringChannel` (substrate) | Dialog, Command |
| viewport-edge surface | `isViewportEdgeSurface` (substrate) | Sheet, Toast |
| anchored surface | `isAnchoredSurface` (substrate) | Popover, Tooltip |
| bare-rule leaf | `isBareRuleLeaf` (substrate) | Divider |
| glyph host | `isGlyphHost` (substrate) | Icon |
| icon-decorated content | `isIconDecoratedContent` (substrate) | Alert, AlertNotice, Badge |
| prop-text leaf | target-local (broader than swift) | CodeBlock, CodeSnippet, Markdown, Text-leaf family |
| expandable content | target-local (broader than swift) | ShowMore, Truncate |
| progress indicator | target-local role+shape gate | Progress, Spinner |
| static content | `isStaticContent` (substrate) | the passive chrome family |

Dispatch precedence mirrors the swift dispatcher: a declared collapse
intent owns the realization before any structural class is consulted.

## Remaining components — required class and blocker

The compose allowlist does not yet admit <!-- target-component-remainder:jetpack-compose -->1 corpus
contracts. Each row below names the class that would carry one, whether that
class needs a shared-substrate move (the predicate is currently swift-local)
or is target-local, and the concrete blocker or decision that gates the
slice. The count is the derived complement of the `jetpack-compose`
allowlist, not a hand count. Measured from `packages/ds-swiftui` emission
classes and the IR probes recorded in the specs `FEAT-COMPOSE-*`.

| Component | Required class | Substrate move | Blocker / decision |
|---|---|---|---|
| NavTree | passive tree item | realized (`isPassiveTreeItem`, substrate) | the heading composes the catalog glyph beside the dom's link and label content props, and the list projects the consumer's children inside the declared content color. Unclaimed: `nav-tree.color.connector`, `color.foreground.current` / `.hover` / `.headingHover`, `color.outline.focus`, `size.fontSize.item`, `size.gap.item`, `size.margin.group` and `stateLayer.hover` / `.selected`, because the tree renders one heading and projects its items, so item-level and interaction-state slots have no node of their own. The glyph-host admission stays rejected: it would render a bare glyph and claim a tree. |
| Walkthrough | coachmark surface | yes (`isCoachmarkSurface`, substrate) | **The anchor decision, recorded:** a non-DOM target has no document to query, so the selector anchor degrades to a viewport-placed overlay while the contract's declared `placement` prop still drives the panel's alignment — the source of the anchor degrades, not the positioning vocabulary. This mirrors the target that already realizes the class: SwiftUI's `emitCoachmarkSurface` places the same panel the same way (`frameworks/swift/swiftui/surface-emit.ts`). Measured shape for the slice: a **number** channel (`index` / `defaultIndex` / `onStepChange`) — the corpus's only numeric channel; `steps: WalkthroughStepSpec[]`, `onComplete` / `onSkip` / `onPrevious` / `onNext` callbacks, `previousDisabled`, `nextLabel`, `progressLabel`, `label`, `storageKey`, `autoStart`, `closeOnOutsideClick` and the `placement` axis; two named slots (`title`, `description`); 23 root slots. SwiftUI's implementation is the reference for the navigation and completion wiring, and the same two checks apply: it declares a number step channel, and the panel renders only while the surface is open. |

Measured vs. inferred: every class named above is read from the generated swift tree's own emission-class comment except **Card**, **Field**, and **NavTree**, which carry none — their required class is inferred from their anatomy and is confirmed at slice time, not asserted here.

Shared-substrate ordering: the two predicates marked "yes" move into
`native-emission-class.ts` exactly once, as `isProjectedChildrenAction` and
every surface predicate before them did; each such move must leave the
SwiftUI regeneration byte-identical (the drift gate is the proof) — the
date-grid move is the latest proof of that rule. No surface predicate is
outstanding for the admitted set: the only declared surface still outside the
allowlist is Walkthrough, which `isAnchoredSurface` excludes because its
anchor is selector-sourced.

## Ledgered divergences (compose)

- **Checkbox** — `indeterminate` is not lowered (the substrate is binary,
  matching the SwiftUI boolean-control twin); `name`/`value`/
  `ariaLabelledby` form-wiring props are omitted v1; `ariaLabel` lowers to
  the semantics `contentDescription`; checked-state colors fall back to
  ledgered constants until the token graph carries checked-scope slots;
  visual box geometry comes from the emitter's framework-grammar table
  because no `checkbox.size.*` token exists.
- **Divider** — the `thickness`/`title` string props are omitted v1 (the
  token slot drives thickness); `divider.spacing.margin` is unread (this
  class realizes the rule, not the surrounding layout rhythm).
- **Details (native disclosure)** — hover-scoped and focus-ring slots are
  unclaimed (the header keeps no hover interaction state v1); `details.
  typography.*` and `details.spacing.*` are unclaimed (default summary
  typography; content is a consumer composable). Accordion does NOT carry
  the disclosure intent (its `string | string[]` value channel is a
  multi-item shape for a later class).
- **Popover / Tooltip (anchored surfaces)** — collision handling (`flip-shift`) is not realized (placement applied as declared, `auto` treated as bottom); the panel is offset by the anchor's size rather than the panel's own extent, so Top/Left placements overlap rather than nest; the Tooltip `describedby` relationship lowers to the popup host only. Walkthrough stays unadmitted: its anchor is selector-sourced and needs a DOM selector lookup the substrate does not have.
- **Sheet / Toast (viewport-edge surfaces)** — Toast's `title`/`variant`/`politeness`/`action` are not lowered v1 (the content region carries the message) and a Toast without `duration` stays open until the channel closes; Sheet's `modal` axis is not lowered v1 (the host is always modal); both render through the foundation Dialog host with `usePlatformDefaultWidth = false` and an edge alignment driven by the placement enum.
- **Avatar (referenced content composite)** — renders the declared chrome and the gated initials fallback, with the accessible name from the `name` prop and the declared weight on the initials leaf. **The declared Image reference is composed**, through the vocabulary's class-supplied argument override: the contract gates the image on its `src` string while the Image class takes a consumer painter (the loader decision), so Avatar passes its own `painter` in place of the bound `src`. The override is declared at the call site and nothing is introspected. Unlowered: `priority` and the `status` part; `src` is declared and gates the image but is not fetched, which the loader decision covers. The vocabulary gained three general rules doing this: literal bindings map to their parameter, a binding defaults to the same-named parameter, and a non-boolean `if` guard reads as an existence check (`src != null`) rather than a truthiness test. `avatar.size.<member>` and `avatar.typography.fontFamily.sans` are React Native-consumed while the contract declares the size axis as a variant and this target maps no font family, so the path role claims the `size.border` / `size.radius` and `fontWeight` slots the contract does declare — both exclusions recorded, as with Image's size axis.
- **Image (media leaf)** — **the loader decision, recorded:** a foundation-only native target fetches and decodes nothing, so the image itself is the consumer's `Painter` and the class realizes the declared chrome plus the accessible name. With no painter it renders the alt text as the placeholder, which is also what keeps `box-model.gap` a real read rather than a claim. Unlowered: `src`, `width`, `height`, `aspectRatio`, `objectFit`, `objectPosition`, `loading`, `sizes`, `fallbackSrc`, the `placeholder` / `errorState` parts (there is no error channel to render), and `showPlaceholder` (supplying a painter is the consumer's choice). `image.size.*` is React Native-consumed but the contract declares the size axis as a variant, not as slots, so no Compose read can resolve it — the path role claims colour and radius only, and that exclusion is written here rather than silently narrowed.
- **Card (compound-part composer)** — with no dom and no per-part slots, the part vocabulary *is* the structure: the class emits a marker scope plus one region composable per declared part (read from the anatomy, never named in the emitter) and the root carries the declared chrome. The parts apply only their own modifier, because there is no declared geometry to apply inside one; `card.elevation.resting` / `.raised` are shadow strings with no converter; `card.color.focus.ring` and `card.focus.ring.width` / `.offset` need focus state the root does not keep; `card.color.background.hover` needs hover state; `card.size.gap.default` / `.padding.default` / `.padding.inset` and `card.typography.lineHeight.*` lose to the merged box-model pool and the content text style. The part-scoped description/link/note scopes are unread.
- **Field (named-slot composer)** — every declared slot becomes a null-safe content region rendered in document order, and the two text regions carry their declared typography through the content text-style local; the status axis drives the chrome through the layered lookup. The declared string channel is not threaded (the `control` slot owns the value, so a wrapper channel would be a second source of truth); `field.color.invalid-border` / `valid-border` / `focus-border`, `field.focus.ring.*` and `field.pad.x` are unclaimed (the status variants already override `field.color.border` in the layer the lookup reads, no focus interaction state is kept, and the merged box-model padding pool is the inset authority); `name` / `id` / `required` / `disabled` / `readOnly` / `validate` / `validating` are form wiring the consumer owns.
- **Chip (referenced-action composite)** — the action and optional dismiss controls are *composed*, not re-implemented: the class lowers each declared `componentRef` to a call on the referenced generated composable, importing its package and the axis enums the call names. The reference vocabulary decides every fact (see the emitter docstring); `chip.color.*.selected` / `chip.size.padding.*` are unclaimed because the variant layers override the same default slot names the layered lookup reads and the merged box-model pool is the inset authority; `chip.dismiss.gap` is unclaimed in favour of the shared `chip.size.gap` the web realization consumes; `chip.motion.duration.fast` is a CSS transition input; `chip.text.weight` rides the content text-style local; the referenced controls' `aria-expanded` / `aria-pressed` state bindings are named by the vocabulary and not lowered. **Reference ledger (C8): empty.** Every `componentRef` the corpus declares is realized: Details' and Accordion's chevrons, Alert's dismiss, Button's `loading`-gated spinner, Command's search glyph and Status's valueMap-named icon all compose the referenced generated component through one fact vocabulary, which declares a reference's bound props and its render guard as parameters from the contract's own defaults and accepts the modifier segments a class's own behavior needs (the disclosure and trigger rotations). The ledger remains a two-directional gate: adding a reference to any contract without realizing it fails, and an entry for a reference that becomes realized fails as stale. Accordion's chevron was dropped outright until this slice — the earlier entry that called it a painted equivalent was wrong, and realizing it is what corrected the record.
- **Calendar (date-grid surface)** — Compose realizes the declared grid itself: one row per calendar week of the contract's `days` prop, each day a selectable cell whose label is the closed `dateDayOfMonth` projection and whose activation writes the channel the IR's `compositeControl` names. `calendar.elevation.default` is a multi-layer shadow string with no elevation converter; `calendar.focus.ring.offset` has no outward box in a fixed-size grid, so both rings draw inside the cell bounds; the today ring reuses the declared focus-ring width because the contract declares no separate today-ring geometry; the nav triggers render as sized, labelled affordances with no month arithmetic (the contract supplies the visible `days`, so there is no month to step); `locale` and `shouldCloseOnSelect` are not lowered; `focus.strategy = "roving"` is not lowered (every day cell is a tab stop). SwiftUI still delegates this class to a platform `DatePicker` with its chrome unresolved — the shared predicate makes the same declared grid available to it, which is a separate slice.
- **Dialog (centered surface)** — `size`, `initialFocus` and `returnFocus` are not lowered v1 (platform-default width and focus); the panel renders only while open, matching the contract's persistent presence; anchored and viewport-edge surfaces remain routed to their scaffold.
- **Command (centered surface with a search channel)** — the second string channel lowers to a `BasicTextField` with the contract's `placeholder` default and the same controlled/uncontrolled split as the open channel. Eleven of the palette's nineteen declared slots are read — ten `command.*` slots plus `box-model.gap` — along with the merged box-model padding/min-width/min-height pool that every compose component receives. The eight unclaimed slots are: `command.color.overlay` is an `rgba()` value with no compose colour converter and the platform dialog already owns the scrim; `command.size.topOffset` is a `vh` value with no length converter; `command.shadow` is a multi-layer box-shadow string with no elevation converter; `command.size.icon` has no glyph host on a search-and-project root; `command.text.sizeSmall` styles result rows the consumer composes; `command.spacing.dialogPadding` loses to the merged box-model padding pool, which is the inset authority for every compose component; `command.color.backgroundHover` and `command.opacity.disabled` need hover and disabled interaction state the palette root does not keep v1. The `shouldFilter` / `filter` props and `label` / `searchLabel` / `emptyMessage` copy are not lowered (consumer-side data logic and labelling).
- **Select (selection control)** — `searchable`, `filterFn`, `triggerLabel`, `size` and `empty` are not lowered v1; the trigger shows the selected label (placeholder fallback); single-select closes the popup after choosing, multi-select stays open, and a controlled `open` always wins.
- **TextField (labeled text control)** — `type`, `name`, `required` and `ariaDescribedby` form-wiring props are not lowered v1; `invalid` gates the error region, which renders only when the consumer supplies it.
- **OTP (count-iterated field group)** — `onComplete`, the `mode` axis, and `readOnly` are not lowered v1 (value changes ride the channel); `label`/`fieldLabel`/`ariaDescribedby` lower to a single group contentDescription.
- **Accordion / Tabs (interactive composite)** — part-scoped typography (`accordion.text.sizeContent`) is unclaimed; group-level `disabled` is not lowered v1; a subcomponent used outside its root throws at CompositionLocal access (the swift @EnvironmentObject / RN compound-context trap).
- **Shuttle (array-iterated list)** — item removal is the swift twin's documented write (filter the item out); hover/active-scoped slots are unclaimed (no interaction state v1).
- **RadioGroup (radio collection)** — the option alias's `title`/help
  member is carried on the lowered data class but not rendered v1 (the
  SwiftUI twin lowers it to `.help`); the option rows use the content
  color for indicator and label (the contracts declare no radio-part
  color slots — RN consumes only the shared box-model family).
- **Input (text control)** — `input.opacity.disabled` is unclaimed (a
  unitless numeric with no toFsds converter; disabled styling rides the
  bg/border color slots); form-wiring props (`name`/`id`/`ariaLabelledby`)
  are omitted v1; `ariaLabel` lowers to the semantics contentDescription.
- **Icon (glyph host)** — NavTree also matches `isGlyphHost` (its item
  icons carry the fact) but stays **unadmitted** on compose: its best
  class is array-iterated list, not yet landed; admission is the
  allowlist's decision, not the dispatch's. SwiftUI admits NavTree as a
  glyph-host v1 (icon-only rendering) — its own ledgered degradation.
  Icon's unknown-name fallback paints a dashed placeholder rather than
  nothing; glyph stroke inherits the content color (the `currentColor`
  analog).
- **Icon-decorated content (Alert/AlertNotice/Badge)** — part-scoped text
  typography (`*.text.size`/`*.text.weight`) is unclaimed: the content
  region is a consumer composable, not styled text (RN styles it); border
  width is 1.dp when a border color slot exists (no width slot in these
  contracts); a variant member whose semantic slot name differs
  (`error`↔`danger`) binds through the sole-unassigned-family-slot
  closure — deterministic from the scope facts, never a name table.
- **All control paths** — `box-model.gap` is unclaimed chrome: a lone
  control lays out no children; label/gap realization belongs to composer
  classes.

Adding a component is therefore not an emitter edit: land the class (or
confirm the existing class covers the shape), extend the parity script's
path/role table if the path is new, add the allowlist entry, regenerate,
and run C3–C5. Growing the corpus grows the ladder, not the criteria.

## Non-claims

Admission proves emit → drift-gate → compile → token-parity binding. It
does not prove visual parity with the web family, accessibility adequacy,
Android SDK/device or iOS simulator behavior, or component correctness
beyond what the SwiftUI test target's bounded facts cover. The Compose
lane has no UI-runtime lane; the SwiftUI PressProof harness is a
separately-invoked macOS witness, not a CI step.
