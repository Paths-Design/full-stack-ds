# Game pause menu — GPUI lane (Orion N5)

A standalone macOS **GPUI** consumer lane for the game pause-menu example
([`../spec.md`](../spec.md)). It realizes the app shape by consuming ONLY the
public API of the bounded GPUI package (`packages/ds-gpui`, the path dependency
`full-stack-ds-gpui`): the target's 7-component allowlist — **Switch,
ToggleSwitch, Checkbox, Text, Badge, Divider, Stat** — plus a lane-local
data/domain seam and hand-authored plain-gpui regions marked
`// NOT FSDS: <reason>`.

> Status: **builds clean (`cargo build`, 0 warnings) and 51 seam/lib tests pass;
> all 15 shared interactions are implemented code paths; four required per-tab
> screenshots plus six interaction-state screenshots are captured from the
> running app** — see [Evidence](#evidence) and [Non-claims](#non-claims).

## Claim

The framework-neutral pause-menu spec — four tabs (MAP / PROGRESS / ABILITIES /
SETTINGS), the Orion N5 graphic style, and interactions I1–I15 over one fixture
corpus — can be realized in a native GPUI app from the generated package's public
exports alone, with the same domain semantics as the other engine lanes, and
every region the 7-component allowlist does not admit ledgered as a
hand-authored fallback rather than silently counted as design-system
realization.

**Falsifiers.** Removing, renaming or privatizing any public symbol this lane
uses (`components::{Switch, Text, Badge, Divider, Stat}`,
`control::{ChangeRequest, BooleanState}`, `content::NativeContent`,
`style::Theme`) fails `cargo build`. Any lane source reaching into package
internals or copying generated component code is a boundary failure. A spec
interaction that only works by changing app semantics per engine is a spec
violation; the domain rules live in `src/seam/` and are engine-independent.

## Commands

```bash
# From the lane directory (rust-toolchain.toml pins 1.94.1):
cargo build                      # clean build, 0 warnings
cargo test                       # 2 lib + 49 seam tests
cargo build --features capture   # unlocks --capture (see Evidence)
cargo run                        # opens the 1280x800 pause menu on MAP
cargo run -- --tab settings      # open on a specific tab

# From the repo root, if preferred (the toolchain file is discovered from the
# CWD, so qualify the toolchain explicitly):
cargo +1.94.1 build --manifest-path examples/game-pause-menu/gpui/Cargo.toml
cargo +1.94.1 test  --manifest-path examples/game-pause-menu/gpui/Cargo.toml
```

`rust-toolchain.toml` pins channel `1.94.1`, the toolchain `packages/ds-gpui`
requires. `Cargo.lock` is committed after a successful resolve; `target/` and
`evidence/` are ignored by the lane `.gitignore`.

### Environment workarounds (recorded as findings)

1. **Metal toolchain.** This machine's Xcode 26 no longer ships the standalone
   `xcrun metal` shader compiler, so `gpui_macos`'s build script cannot
   precompile `shaders.metal` (`error: cannot execute tool 'metal' due to
   missing Metal Toolchain`). The lane enables upstream's
   `gpui_platform` feature **`runtime_shaders`**: same pinned zed revision
   (`a38fc8c8…`), same renderer, but the shader library is compiled at renderer
   startup instead of at build time. Apple's repair is
   `xcodebuild -downloadComponent MetalToolchain`; it is not available in this
   environment.
2. **Evidence capture.** macOS Screen Recording permission is denied to the
   agent shell: `screencapture -l <windowid>` and full-screen `screencapture -x`
   both fail with "could not create image from window/display" (verified against
   an unrelated GPUI app after resolving its CGWindow id). Instead the pinned
   GPUI revision's `Window::render_to_image()` renders the current frame's scene
   to an RGBA image without presenting it and without a TCC grant. That method
   is gated behind gpui/gpui_macos `test-support`, so the lane exposes it as an
   opt-in cargo feature: `capture = ["dep:image", "gpui_platform/test-support"]`
   (plus `runtime_shaders`). The default build/test graph keeps the package
   pins unchanged.

## What is consumed from the package (public exports only)

| Component | Where used | Instances |
|---|---|---|
| `Switch` | MAP icon-visibility filter (I2), SETTINGS General toggles (I11) | 13 controlled switches (8 + 5) retained at startup, subscribed via `ChangeRequest` |
| `Text` | every label, value, caption, tab label, section heading, hint, modal copy, footer | retained `Text` pool keyed by logical site (~200 entities) |
| `Badge` | map status tags, rarity tags, faction ACCESS/LOCKED, PAUSED chip, INSTALLED, COMPATIBLE, REJECTED | retained `Badge` pool keyed by site (~45 entities) |
| `Divider` | section rules, popover/drawer/modal rules | retained per insertion site (12) |
| `Stat` | header ranking/level/earnings/followers, MAP commander readout, audio/ability stats values | retained `Stat` pool (~11 entities) |
| `Theme` | per-instance Orion token overrides on every component above (no brand loader exists on this target) | each retained entity carries a `Theme::with_token(..)` set |
| `ChangeRequest` / `BooleanState` / `NativeContent` | controlled value acceptance and hover/selection-independent state sync | — |

`ToggleSwitch` and `Checkbox` are admitted by the target but **no region in the
pause-menu spec requires multi-select or radio semantics**, so the lane does not
invent a use for them. (The generated Switch supports Space/Enter activation and
Tab focus; the lane host adds Escape and 1–4 tab keys.)

## Realization ledger

Every row is a region the spec requires that the 7-component allowlist cannot
express, realized as hand-authored plain gpui and marked
`// NOT FSDS: <reason>` in source (`src/app/*.rs`).

| Spec region | Realized through | Status |
|---|---|---|
| Header band (brand mark, mission, commander readouts, PAUSED chip) | FSDS `Text`/`Stat`/`Badge` inside a hand-authored flex band + orange action strip | mixed — text/stat/badge **FSDS**, band chrome NOT FSDS (no Stack/Card) |
| Four-tab bar, exclusive active state (I1) | hand-authored square tab buttons with FSDS `Text` labels | NOT FSDS — no Tabs component on the target |
| Map plot (grid, contour ticks, corner brackets, sector label, N5 watermark) | hand-authored gpui drawing with FSDS `Text` labels | NOT FSDS — no Map/Canvas/Icon component |
| Map markers: shape, status color, kind monogram, nav-target highlight | hand-authored absolute-positioned squares + plain text monogram | NOT FSDS — no Map/Icon component |
| Icon visibility panel (I2) | FSDS `Switch` + FSDS `Text`/`Badge` rows | **FSDS** controls, hand-authored page-frame rows |
| Marker popover, anchored, Escape/outside dismissal (I3/I4/I15) | hand-authored absolute panel + FSDS `Text`/`Badge`/`Divider` + hand-authored action button | NOT FSDS — no Popover/Overlay component |
| Commander readout in MAP (stat row) | FSDS `Text` + `Stat` rows | **FSDS** values, hand-authored row grid |
| Faction roster (locked/unlocked, reputation bars, requirement) | FSDS `Text`/`Badge`; hand-authored rows and hard-edged reputation bar | mixed — no Progress/Table component |
| Faction left drawer, overlays list, disabled shop on locked faction (I5/I6/I15) | hand-authored drawer surface + FSDS `Text`/`Badge`/`Divider` + hand-authored action button | NOT FSDS — no Drawer/Sheet component |
| Ability card grid; rarity tag over the card's top edge (I7) | hand-authored cards + FSDS `Badge` (rarity tag) and `Text` | mixed — no Card/Tag/Icon; tag is real FSDS Badge |
| Ability hover tooltip with description/stats/rarity/size (I10) | hand-authored absolute tooltip; FSDS `Text`/`Badge`/`Divider` inside | NOT FSDS — no Tooltip/Popover component |
| Vehicle loadout rows, compatible-slot highlight, install/remove, reject state (I8/I9) | hand-authored rows + FSDS `Text`/`Badge`/`Divider` | mixed — no List/Progress/Alert component |
| General settings switches (I11) | FSDS `Switch` + FSDS `Text` rows | **FSDS** |
| Controller stepped sliders (I12) | hand-authored tick-track slider (each tick a pointer target) + FSDS `Text` value | NOT FSDS — no Slider component on the target |
| Controller remap rows + key-waiting modal (I13/I15) | hand-authored modal/backdrop with focus + key capture; FSDS `Text`/`Divider`; hand-authored binding buttons | NOT FSDS — no Dialog/Modal/Button component |
| Audio sliders, language dropdowns, subtitle background swatch picker, live preview (I14) | hand-authored stepped sliders/dropdowns/swatches; FSDS `Text`; preview foreground picked from the Orion palette by the seam | NOT FSDS — no Slider/Select/ColorPicker component |
| Action buttons (SET AS NAV TARGET, SHOP PARTS, CLOSE/CANCEL, ×) | hand-authored square buttons, zero radius, signal-orange fill / disabled inset styling | NOT FSDS — no Button component on the target |
| Page frame (bands, content region, panels, scroll regions) | plain gpui flex layout | NOT FSDS — the target's allowlist claims no layout/page-frame component |

**Fallback summary:** 5 of the 7 admitted components are used (Switch, Text,
Badge, Divider, Stat); 2 have no spec region that needs their semantics
(ToggleSwitch, Checkbox). Every such region class is necessarily hand-authored
(header/footer chrome, tab bar, map plot/markers/watermark, marker popover,
faction drawer, ability cards/glyphs, tooltip, stepped sliders/language
dropdowns/swatches, remap modal, action buttons). GPUI therefore has the largest
fallback ledger of the three engine lanes by construction — its allowlist has no
Tabs, Popover, Overlay, Slider, Select, Button, Card or Icon.

## Theme delivery (Orion N5, no brand-graph loader)

The authority for the palette is the brand layer
`packages/ds-tokens/src/brands/orion.tokens.json`; GPUI has no brand loader, so
the lane consumes the lane-copied
[`fixtures/orion-appearance.json`](fixtures/orion-appearance.json) and applies it
through two explicit mechanisms, exactly as the app spec's "Theme path honesty"
doctrine requires:

1. **Generated components** receive per-instance
   `Theme::with_token(<address>, <value>)` overrides at the token addresses the
   generated contracts resolve:
   - `Text` → `text.design.root.foreground.color`
   - `Badge` → `badge.color.background.default` / `.hover`,
     `badge.color.foreground.primary`, `badge.color.border`,
     `semantic.shape.control.radius.default` (zero radius)
   - `Divider` → `divider.color`
   - `Stat` → `stat.color.foreground.value`
   - `Switch` → `semantic.color.background.tertiary` (off track),
     `semantic.color.foreground.accent` (on track),
     `semantic.color.background.primary` / `semantic.color.foreground.on.brand`
     (thumb), `semantic.color.border.subtle`,
     `switch.design.track.shape.radius` / `.thumb.shape.radius` (Orion's zero
     radius), `semantic.focus.ring.color`
2. **Hand-authored regions** use plain-gpui colors derived from the same
   fixture (`src/app/palette.rs`); every mixed surface tone is computed from a
   brand color (e.g. `map_ground = mix(ink, sage, 10%)`), never hard-coded.

Zero radius, uppercase micro-labels, hairline 1px rules, orange action blocks
with near-black on-color text and oversized numerals all follow the visual
direction; no bundled condensed grotesque exists, so the lane uses the native UI
face with heavy weights/letter-spaced overline roles (recorded in the fixture's
`fontNote`).

## Interaction coverage (I1–I15)

All paths are implemented in the app and their domain rules are unit-tested in
`tests/seam.rs`; the GPUI layer projects the same state.

| ID | Interaction | GPUI call path | Seam rule (tested) |
|---|---|---|---|
| I1 | Select MAP/PROGRESS/ABILITIES/SETTINGS | tab buttons / keys 1–4 → `select_tab` | `AppState::select_tab`; exactly one active tab by construction |
| I2 | Toggle an icon-visibility switch OFF then ON | controlled `Switch` → `ChangeRequest` subscription → `toggle_icon` | filter flips exactly one marker, fixtures immutable |
| I3 | Activate a visible marker | marker `on_click` → `open_marker` | hidden markers cannot be activated |
| I4 | Activate SET AS NAV TARGET | popover action → `set_nav_target` | one nav target, footer label updates, popover closes |
| I5 | Select an unlocked faction row | row `on_click` → `open_faction` | unlocked drawer enables SHOP PARTS |
| I6 | Select a locked faction row | row `on_click` → `open_faction` | locked drawer carries requirement + disabled action |
| I7 | Select an ability card | card `on_click` → `select_ability` | pending selection clears reject, computes compatible slots |
| I8 | Activate a compatible slot | slot `on_click` → `activate_slot` | installs, replaces occupant, one ability per slot |
| I9 | Activate an incompatible slot | slot `on_click` → `activate_slot` | no mutation + visible reject state |
| I10 | Hover an ability card | `on_hover` → `hover_ability` | tooltip content from fixture |
| I11 | Toggle a General switch | controlled `Switch` subscription → `toggle_general` | flips exactly one row once |
| I12 | Adjust a Controller slider | hand-authored tick track → `set_slider` | quantize to step, clamp to range, value displayed |
| I13 | Activate a remap binding, then press a key | modal focused; `on_key_down` → `capture_keystroke` | waits, next key binds and closes; Escape cancels |
| I14 | Adjust audio slider / change language / pick subtitle background | sliders, dropdowns, swatches → `set_audio` / `select_language` / `select_background` | values update; preview line reflects background + language; AA contrast foreground chosen |
| I15 | Close drawer / popover / remap modal with cancel | Escape action → `dismiss_overlay` | dismisses exactly one overlay, topmost first, data unchanged |

Escape is bound at the window level; number keys 1–4 select tabs. Overlay
dismissal order is modal → drawer → popover → dropdown, implemented in the seam
so it is engine-independent.

## Data / seam layering

```
fixtures/*.json  →  src/seam/adapter.rs  →  src/seam/state.rs  →  src/app/*.rs
raw fixture shape    parses + validates     domain transitions      the only caller
                     (panic on malformed =  (I1–I15, pure std)      (GPUI projection)
                      authoring error)
```

- `src/seam/types.rs` — serde types for the seven fixtures plus WCAG luminance /
  contrast helpers. Wire names are camelCase; the UI never sees raw JSON.
- `src/seam/adapter.rs` — the only fixture-shape reader; embeds the verbatim
  fixture copies (`include_str!`) and validates cross-file invariants (unique
  ids, normalized marker positions, known rarities, six vehicle slots with known
  ability ids, slider ranges/steps, declared language/background values,
  `#RRGGBB` palette, non-zero Orion radius rejected). Malformed fixtures panic
  with `GPUI_LANE_FIXTURE_INVALID` (authoring error) — exercised by tests.
- `src/seam/state.rs` — the pure domain state + every interaction transition
  listed above, plus `format_grouped` and the binding normalizer.
- `src/app/` — the GPUI owner entity (`Menu`), retained generated-component
  pools, hand-authored chrome/tabs/tabs/map/drawer/cards/settings/modal, and the
  capture task. No gpui type crosses into `src/seam/`.

The fixtures are verbatim copies of `examples/game-pause-menu/fixtures/` (they
belong to the Lead-owned scaffold; this lane does not edit them).

## Capture mechanism (evidence)

`cargo run --features capture -- --capture <dir>` starts the real app window at
1280×800, puts the domain into ten representative states (one at a time), waits
for a paint, reads the last rendered frame with `Window::render_to_image()`,
writes a PNG, and exits after recording `capture-manifest.json`. Frame-readiness
is asserted by sampling distinct colors (uniform/undrawn frames retry), so a
blank window fails loudly instead of producing black evidence.

Captured states (`evidence/`, gitignored; Lead copies them):

| File | State |
|---|---|
| `map.png` | MAP tab, default marker filter, commander readout |
| `progress.png` | PROGRESS tab, unlocked faction drawer with enabled SHOP PARTS |
| `abilities.png` | ABILITIES tab, size-2 ability pending, compatible slots highlighted, loadout rows |
| `settings.png` | SETTINGS tab scrolled to top (General + Controller) |
| `map-popover.png` | marker popover open on a beacon, nav target set (footer + orange marker) |
| `progress-locked-drawer.png` | locked faction drawer: requirement + disabled SHOP PARTS |
| `abilities-hover.png` | I10 hover tooltip over an ability card |
| `abilities-reject.png` | I9 reject state on an incompatible slot |
| `settings-remap-modal.png` | I13 remap modal waiting in “PRESS ANY KEY OR BUTTON” |
| `settings-audio.png` | I14 audio sliders, language dropdowns, swatch picker, live preview |

Screenshots are sampled states of the running app, not physical-device proof and
not an interaction recording.

## Tests

`cargo test` (default features): 2 lib tests (`src/app/palette.rs` mix/hex
round-trips) + 49 seam tests (`tests/seam.rs`). The seam suite covers:

- fixture loading counts + committed-corpus values; malformed JSON, missing
  field, duplicate id, non-normalized marker, unknown rarity, dangling slot
  ability, dangling nav target, invalid slider step, undeclared background,
  non-zero radius — each as a typed authoring error — and the loud panic
  boundary;
- I1 exactly-one-tab and tab-switch overlay scoping; I2 per-marker isolation +
  fixture immutability; I3/I4 visibility + single nav target; I5/I6
  drawer/locked-shop; I7–I9 compatibility, install/replace/single-instance,
  reject-without-mutation, remove, no-pending no-op, fixture `installed` field
  non-authoritative; I11 one-row toggle; I12 quantize/clamp/display; I13
  wait/bind/cancel/escape/one-modal; I14 sliders/languages/swatches/preview AA
  contrast; I15 one-overlay-at-a-time dismissal and data preservation.
- `cargo test --features capture` adds 3 capture tests (uniform frame ignored,
  varied frame meaningful, the four required tab files are planned, 54 total).

The GPUI app layer itself is not mounted in tests: this lane has no automated
mounted-engine interaction test. Interaction evidence is the state-driven
screenshots above plus the seam rules they exercise; the package's own
`native_runtime` tests cover the generated components, not this consumer.

## Non-claims

- **No automated visual/runtime interaction proof.** Screenshots are
  state-driven samples from the running app; no screenshot baseline, mounted
  GPUI input test, or pixel-parity claim is made.
- **Not accessibility proof.** Focus handles, Escape/1–4 keys and hover paths
  exist, but no a11y standard or screen-reader behavior is claimed. Gamepad
  navigation is not simulated.
- **No cross-engine parity claim.** This lane realizes the shared spec
  independently; idiom (focus model, hand-authored chrome) differs from the
  Unity and Godot lanes.
- **Partial realization.** Every NOT-FSDS row above is a fallback forced by the
  7-component allowlist, not a claim that the hand-authored surface equals a
  package component.
- **Theme delivery is explicit overrides, not brand-graph loading.** GPUI has no
  automatic brand/dark loader; the lane applies the fixture palette per instance
  and states so.
- **Build environment deviation.** `runtime_shaders` (same zed revision) is
  enabled because this machine's Xcode lacks the standalone Metal tool; the
  default lane pins are otherwise unchanged, but this build does not use
  build-time precompiled shaders.
- **Not generated-artifact admission.** GPUI remains outside the TypeScript
  admission rail; this lane is hand-written consumer code plus a path
  dependency.

## Findings for the usability comparison

1. **Largest fallback surface of the three engines.** With only 7 admitted
   components and no Tabs/Popover/Overlay/Slider/Select/Button/Card/Icon, nine
   region classes must be hand-authored. Composition is possible — the app runs
   and the domain is fully realized — but most of the visible UI is app code,
   not design-system code, and the DS contribution is concentrated in
   boolean controls, text, tags, rules and stat readouts.
2. **Generated `Text` is excellent for typographic roles, but sizing inside
   nested flex is consumer-owned.** Text variants/size/weight carry the type
   scale, yet inside nested flex columns and scroll containers the intrinsic
   text measure collapsed to near-zero in several placements (labels wrapped
   one character per line) until the lane wrapped every text site in explicit
   `w_full()`/fixed-width containers. Layout properties are not on the
   components and the page frame is consumer-owned, so this friction is
   structural on this target.
3. **Controlled Switch works well, but the consumer pays the label styling.**
   Subscribing to `ChangeRequest`, accepting explicitly and setting
   `checked(Some(..))` is a clear contract; the lane suppresses the generated
   label and renders a separate FSDS `Text` for micro-label styling and
   inherits near-black-on-dark otherwise. Per-instance theme tokens make the
   Orion track/thumb/zero-radius restyle possible, but each switch needs ~8
   token overrides — there is no brand layer to do it once.
4. **No overlay/dismissal/focus contract.** Popover, left drawer and modal are
   all consumer-authored. Escape precedence, backdrop clicks, focus routing to
   the waiting modal and one-at-a-time dismissal had to be designed by the lane
   (and are seam-tested) rather than consumed from a package primitive.
5. **Hover is consumer state.** The generated components don't expose a
   hover-popover channel; the ability tooltip renders from lane hover state,
   which also means the evidence capture drives the tooltip by setting that
   state rather than moving the mouse.
6. **Slider/Select/ColorPicker gaps are the biggest interaction cost.** Nine
   sliders (controller + audio), two language dropdowns and a six-swatch color
   picker had to be hand-authored with pointer targets; the seam owns
   quantization/clamping so semantics stay engine-independent.
7. **Verification tooling is the strongest part of the GPUI lane.** Once the
   `test-support` feature is enabled, `Window::render_to_image()` gives a
   dependency-free, permission-free way to capture exact app frames; that is
   cheaper and more reproducible than OS window capture. The friction is that
   this session path is behind a feature not exposed for normal consumers
   (`render_to_image` on macOS is gated on gpui_macos `test-support`), so a
   consumer lane must recompile the renderer graph to get screenshot evidence.
8. **Environment portability.** The documented GPUI lane prerequisites (Xcode +
   Metal tool + macOS) are now sharper: Xcode 26 without the downloadable Metal
   Toolchain component cannot build the pinned renderer's shaders, and the
   runtime-shader feature is the practical fallback.
