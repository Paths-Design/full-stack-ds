# @full-stack-ds/swiftui

Generated SwiftUI realization of the FSDS component contracts. This is a
SwiftPM package (not a pnpm workspace member): `Package.swift` and this README
are hand-maintained, as is the token runtime
`Sources/DsSwiftUI/Tokens/FsdsTheme.swift`; everything under
`Sources/DsSwiftUI/Components/` and `Sources/DsSwiftUI/primitives/` is
generated output and must not be hand-edited.

## Regenerate

From the repository root:

```bash
pnpm run generate -- --target=all   # emits the allowlisted set (<!-- target-component-count:swiftui -->52 of the <!-- component-count -->53 corpus contracts)
```

`swiftui` is registered in `fsds.targets.json` with a **declared-admission
allowlist** (the <!-- target-component-count:swiftui -->52 allowlisted components): `--target=all` and
`pnpm run governed:rail` emit exactly that set and skip the rest by
declaration. Explicit single-component requests bypass the allowlist and
surface the emitter's own fail-loud errors. The target remains outside the
admission rail because it declares no `railFrameworkId`. Its generated
`Components/` and `primitives/` roots are nevertheless included in CI and
pre-push byte-drift checks; registration, drift gating, and admission are
separate claims.

## Build

Requires a local Swift toolchain (macOS):

```bash
swift build --package-path packages/ds-swiftui
```

## What is proven here

| Claim | Status |
|---|---|
| Contracts can emit compiling SwiftUI source through the shared IR | Yes — Switch emits a `Toggle(.switch)` View via the `native-toggle-affordance` collapse intent; `swift build` compiles the module |
| Controlled/uncontrolled channel semantics survive the projection | The `checked` channel lowers to `Binding<Bool>?` + `@State` + `onChange` with controlled-takes-precedence, matching React's `useControllableState` rule |
| Size variants resolve from typed token facts | Yes — `ir.tokenFacts` (FEAT-MOBILE-IR-001), not CSS parsing; `sm`/`lg` fall through to `md` until those tokens are authored |
| The Stack primitive lowers from `PrimitiveIR` like the web targets | Yes — axis (VStack/HStack) from `axisByVariant`, gated on `axisModes` only (native = neutral container, no imposed spacing); emitted via `emitPrimitives` with mutation-pinned gating |
| Multi-part anatomy emits with theme-driven styling | Yes — the projected-children action path (root button + single content region) emits `FsdsButton`; styling comes from `ir.tokenScopes` shipped as data and resolved through the hand-authored `FsdsTheme`, layering root + variant_<size> + variant_<intent>. The shared native conformance fixture pins slot-name override → semantic-ref override → authored literal/fallback for ordinary and layered resolution. |
| SwiftUI type collisions are handled grammatically | Yes — a reserved-type table exports colliding names with an `Fsds` prefix (`Button` → `FsdsButton`), the SwiftUI analog of Lit's `StackElement` rename |
| Compound-part composers emit as region closures | Yes — Card is one ViewBuilder region per compound part (header/content/footer/description), chrome presence-driven through FsdsTheme; axes without authored defaults are optional parameters whose layer applies only when set; keyword union members (`default`) are backtick-escaped |
| Body-evaluation smoke coverage | Every allowlisted component instantiates and evaluates its body through NSHostingController in the swift test lane — runtime crashes the compiler cannot see fail CI |
| Selection semantics compose the controllable substrate | Yes — SelectionState holds single+multi ControllableValue projections behind the mode-gated apply() (replace vs toggleMembership); Select lowers through it with a contract-alias-derived option struct and Menu iteration |
| Glyph pipeline renders the iconography catalog natively | Yes — hand-maintained SVGPath runtime (arc→cubic conversion, XCTest-pinned on real glyph bounds) + a generated GlyphCatalog substrate; Icon lowers through the iconGlyph class with size hints and catalog-driven decorative defaults; unknown names surface via accessibility, never silent |
| Anchored surfaces emit through native popovers | Tooltip's trigger region hosts consumer content and `onHover` drives the open channel. Popover's contract-authored `openTriggers: ["click"]` lowers to a plain native Button that toggles the same controllable channel and is disabled by the declared prop. The PressProof harness independently observes an OS accessibility press → `onOpenChange(true)` → visible content. |
| Centered-modal surfaces emit as sheets with the openness channel | Dialog presents a sheet and routes the platform presentation binding through `ControllableValue`; compound regions emit as closures (`body` renames to bodyContent for the View collision). Controlled/default presentation is host-proven; native-dismissal callback remains emitter-level because the harness cannot safely press into the modal sheet. |
| Value-channel text controls emit with the controllable-state projection | Yes — Input is a SwiftUI TextField whose string channel projects through Binding + @State + onChange (controlled takes precedence), keyed on the IR channel rather than component identity; placeholder/disabled realized, HTML-form props omitted |
| Named-slot composers emit as region closures | Yes — Field is one ViewBuilder region per dom slot (label/control/help/error/validatingIndicator), gated on every dom leaf being a slot (TextField's component-instance leaf and Dialog's surface block stay out); the web value-channel API is omitted, not accepted-and-ignored |

## Consumption-pilot findings and current disposition

The first real-consumer pilot (deduper's settings window, branch
`fsds/ds-swiftui-integration`) surfaced these beyond the resolver fix. One is
closed and the remaining findings are still current:

- **Closed — dark mode**: generated color facts now carry
  `.adaptive(light:dark:)`; `TokenPaintTests` samples Card under aqua and
  darkAqua and matches both values to the committed resolved graph.
- **Override seam is hex-only**: `FsdsTokenValue` cannot express system
  colors (`Color(nsColor: .windowBackgroundColor)`), so consumers cannot
  bridge dark-mode adaptation through the sanctioned channel.
- **Interaction depth**: hover/active slots exist as data but no `onHover`
  applies them; `.buttonStyle(.plain)` drops the focus ring; `9999px`
  radius reads as a pill everywhere it applies.
- **Field row form**: `FsdsField` always paints boxed chrome — no
  horizontal label-value row shape for settings screens (box-in-box when
  nested in Card).
- **Distribution**: path dependencies from sibling repos work, but the
  package cannot be consumed remotely while it lives in this monorepo.

## Runtime proof (press-proof harness, TEST-SWIFTUI-RUNTIME-BREADTH-01)

`swift run --package-path packages/ds-swiftui PressProofHarness` drives a
real App through OS-mediated accessibility interactions and exits nonzero
naming any failed counter. Current proven surface (press → channel):

- **Chip** (action, dismiss), **Walkthrough** (steps, skip, complete threshold)
- **Switch** — onChange `[true, false]`, binding syncs both ways
- **Select** — AXMenuButton trigger → menu option press → selection `"b"`
- **Popover** — native Button AXPress → first `onOpenChange` value `true` →
  content observable (phase unmount may append native-dismissal `false`)
- **Calendar** — AXIncrementor step → onChange fires exactly once
- **Dialog** — controlled false→true→false presentation and
  `defaultOpen: true` presentation at mount
- **Tabs** — selecting tab `b` drives the active-tab channel
- **Accordion** — expanding then collapsing item `k1` drives openness
- **Shuttle** — moving `beta` forward then back drives selection

Token painting is pixel-proven in `Tests/DsSwiftUITests/TokenPaintTests.swift`:
sampled pixels equal values read from the committed resolved token graph —
Card's background equals the graph's light value under aqua and its dark
value under darkAqua (the adaptive flip), Button equals the single-value
action-primary hex.

The harness found and fixed one real emitter defect (sheets anchored on
`EmptyView()` never present; the anchor is now a zero-size `Color.clear`,
regenerated for Dialog/Sheet/Command). It later falsified its own initial
structural finding for Tabs, Accordion, and Shuttle: their generated controls
now expose OS-pressable elements and the channel counters above move.

Host limitations (probe-evidenced, not component defects — each printed as
a `LIMITATION:` artifact by the harness):

- **SwiftUI TextFields accept AXValue writes without routing them to
  bindings** — OTP text-entry remains unproven; the host exposes no usable
  keyboard routing path for that field interaction.
- **Native sheet dismissal cannot be pressed safely from this harness's main
  thread** — AXPress into the presented modal blocks the AppKit run loop, so
  Dialog's native-dismissal → `onOpenChange` path remains emitter-level rather
  than OS-interaction proof.

## Parity

`node scripts/swift-parity-diff.mjs` generates every corpus contract
through both the react and swiftui emitters and exits nonzero if any
component emits for react but not swiftui. The admitted SwiftUI allowlist
covers <!-- target-component-count:swiftui -->52 of the <!-- component-count -->53
corpus contracts. RadioGroup lowers to a native radio-style Picker with
controlled or uncontrolled selection. Its generated source compiles and its
body evaluates in the component smoke suite; this does not establish native
keyboard or accessibility interaction parity. The script checks emission —
not visual or behavioral parity. (Token-value parity at the paint
level is sample-proven by `TokenPaintTests` — see runtime proof above.)

## Non-claims

- SwiftUI is registered, generated, drift-gated, and compile/test covered, but
  remains outside the six-target admission rail. None of those states implies
  the others.
- The press-proof harness is a reproducible local macOS/AppKit fact surface,
  not a required CI step and not iOS simulator/device evidence. CI runs
  `swift test`, which covers body evaluation, state/token helpers, and sampled
  token painting; its AX interaction cases skip visibly when the runner exposes
  no usable accessibility tree.
- Full-corpus emission and body evaluation do not prove every channel is
  behaviorally wired, visual parity, platform accessibility adequacy, or
  product correctness.
- Tooltip's declared focus trigger is not lowered on SwiftUI; its hover trigger
  is live. The Popover click trigger is host-proven on macOS, not iOS.
- Switch's track geometry comes from its authored size token facts
  (32/48/64 px). ToggleSwitch authors none, so it renders at the native
  Toggle's intrinsic size — its size prop has no visual effect on this target
  until its sidecar authors track tokens.
- OTP text entry and native modal-dismissal callbacks remain unproven through
  the host interaction harness for the limitations named above.
- Not published anywhere; workspace-only, consumed via local package path.
