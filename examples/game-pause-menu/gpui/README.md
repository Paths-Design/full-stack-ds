# Game pause menu — GPUI lane (Orion N5, parity rebuild)

A standalone macOS **GPUI** consumer lane for the game pause-menu example
([`../spec.md`](../spec.md)), rebuilt in the parity pass
([`../parity.md`](../parity.md)) so its four required captures are structurally
indistinguishable from the Unity and Godot lanes: same 1280 × 800 grid, same
panel/row/card rectangles, same copy, same palette, same canonical switch.

The lane consumes ONLY the public API of the bounded GPUI package
(`packages/ds-gpui`, path dependency `full-stack-ds-gpui`): the target's
7-component allowlist — **Switch, ToggleSwitch, Checkbox, Text, Badge, Divider,
Stat** — plus a lane-local data/domain seam and hand-authored plain-gpui regions
marked `// NOT FSDS: <reason>`.

> Status: **`cargo build` clean (0 warnings), 70 tests pass (default) / 73 with
> `--features capture`; all I1–I15 interactions are real code paths; the eight
> parity capture states are produced at exactly 1280 × 800; all 26 shared
> colour probes and all measured parity region boxes pass on this lane's
> captures** — see [Parity pass](#parity-pass) and [Evidence](#evidence).

## Claim

The framework-neutral pause-menu spec — four tabs (MAP / PROGRESS / ABILITIES /
SETTINGS), interactions I1–I15 over one fixture corpus, and the parity layout
authority — can be realized in a native GPUI app from the generated package's
public exports alone, at the **same absolute geometry and colours** as the other
engine lanes, with every region the 7-component allowlist does not admit
ledgered as a hand-authored fallback rather than silently counted as
design-system realization.

**Falsifiers.** Removing, renaming or privatizing any public symbol this lane
uses (`components::{Switch, Text, Badge, Divider, Stat}`,
`control::{ChangeRequest, BooleanState}`, `content::NativeContent`,
`style::Theme`) fails `cargo build`. A layout/colour value that is not read from
`fixtures/parity-layout.json` (or a `parity.md`-pinned default) is a parity
failure. Any lane source reaching into package internals is a boundary failure.

## Commands

```bash
# From the lane directory (rust-toolchain.toml pins 1.94.1):
cargo +1.94.1 build --locked          # clean build, 0 warnings
cargo +1.94.1 test  --locked          # 70 tests (3 lib + 2 palette + 16 parity + 49 seam)
cargo +1.94.1 build --features capture
cargo run                             # opens the 1280x800 pause menu on MAP
cargo run -- --tab settings           # open a specific tab

# Evidence (writes PNGs + capture-manifest.json directly to the target dir):
cd examples/game-pause-menu/gpui
cargo +1.94.1 run --locked --features capture -- \
  --capture /Users/darianrosebrook/Desktop/Projects/full-stack-ds/tmp/game-pause-menu/gpui
```

`rust-toolchain.toml` pins channel `1.94.1`; `Cargo.lock` is committed after a
successful resolve; `target/` and `evidence/` are lane-gitignored.

### Environment workarounds

1. **Metal toolchain.** This machine's Xcode 26 no longer ships the standalone
   `xcrun metal` shader compiler, so `gpui_macos`'s build script cannot
   precompile `shaders.metal` (`error: cannot execute tool 'metal' due to
   missing Metal Toolchain`). The lane enables upstream's
   `gpui_platform` feature **`runtime_shaders`** (same pinned zed revision
   `a38fc8c8…`; shaders compile at renderer startup). Apple's repair is
   `xcodebuild -downloadComponent MetalToolchain`, unavailable here.
2. **Evidence capture.** macOS Screen Recording permission is denied to the
   agent shell (`screencapture -l <windowid>` and full-screen `screencapture -x`
   both report "could not create image from window/display"). The pinned GPUI
   revision's `Window::render_to_image()` renders the current frame's scene
   without presenting it and without a TCC grant; it is gated behind
   gpui/gpui_macos `test-support`, so the lane exposes it as an opt-in cargo
   feature `capture = ["dep:image", "gpui_platform/test-support"]` (also
   forwarding `runtime_shaders`). Default build/test keeps the package pins
   unchanged.

## Parity pass

### Design authority consumed

`examples/game-pause-menu/fixtures/parity-layout.json` (the machine-readable
authority; lane copy embedded with `include_str!`) is parsed by
`src/seam/parity.rs` and validated before use:

- **viewport / shell**: header `(0,0,1280,104)`, tab bar `(0,104,1280,56)` with
  four equal 320-wide tabs, content `(24,176,1232,552)`, footer
  `(0,744,1280,56)`, right-aligned `NAV TARGET` value at x = 1256 / y = 770.
- **per tab**: MAP map panel `(24,176,872,552)` with sage field
  `(40,232,840,480)`, 24 px markers, icon panel `(912,176,344,552)` and 8 rows
  at `firstY 224 / rowH 48`; PROGRESS roster `(24,176,1232,552)` with 88 px
  rows and a paper drawer `(24,176,560,552)`; ABILITIES grid
  `(24,176,808,552)` with 5×2 152×240 cards (`firstY 224`, 12 px gaps) and
  detail panel `(848,176,408,552)` with a 2×3 slot grid; SETTINGS 2×2 panels at
  `(24,176)/(648,176)/(24,460)/(648,460)`, each 608×268 with a 36 px header.
- **settings sub-layout** pinned in the JSON: controller/audio rows, remap rows
  starting at y = 496, language labels at 612, dropdowns at 624 (200×28),
  `SUBTITLE BACKGROUND` label at 658, swatches at 670 (36×18), preview strip at
  `(664,694,576,26)`.
- **palette / type / switch**: every colour role and every type size comes from
  the JSON maps; the only type/chrome values not present in the JSON are the
  `parity.md` "Component styling defaults" pinned in `src/app/style.rs`
  (e.g. 9 px/800 rarity chips, 28 px/800 drawer title, 13 px/800 primary
  buttons) — one module, each value citing the parity document.
- **captures**: the JSON `captures` map drives the capture task; all states set
  the shared nav target `cache-02`.

The view is absolute-positioned from these rects (`src/app/widgets.rs` `at()` /
`rect_box()`); there is no responsive reflow or per-lane flex page frame.

### Canonical switch (the "pinched oval" fix)

Parity pins a stadium track with a circular thumb:

| Property | Value |
|---|---|
| track | 64 × 32 px, radius 16 px (half height) |
| track fill | ON `signal` #EF6A3C · OFF `graphite` #2E2E29 |
| track border | ON none · OFF 1 px `ruleStrong` #56564C |
| thumb | 24 × 24 px circle, radius 12 px, inset 4 px |
| thumb fill | ON `onSignal` #191917 · OFF `boneBright` #F4F1E6 |
| thumb offset | ON x = 36 px · OFF x = 4 px |

Root cause in this lane was two-fold, and both parts are fixed through explicit
per-instance `Theme::with_token` overrides on the generated `Switch`:

1. The first lane override set `switch.design.track.shape.radius` /
   `switch.design.thumb.shape.radius` to `0` for a square look, leaving a
   rounded-square thumb inside a pill track. The overrides are gone; the lane
   now pins `switch.size.lg.track.radius` = 16 px and
   `switch.design.thumb.shape.radius` = 12 px.
2. The generated `lg` control carries large-action **root chrome** (16 px inline
   padding, 8 px block padding, 12 px gap, 48 px min box) which inflated the
   component box to 96 × 48 and offset the track by (16,8) inside its slot. The
   lane pins the generated semantic size tokens
   (`semantic.action.size.large.padding-inline` / `padding-block` / `gap` /
   `min-width` / `min-height`) to `0` so the component box is exactly 64 × 32.
   The track and thumb geometry tokens
   (`switch.size.lg.track.width/height/radius`, `switch.size.lg.thumb.size/height`,
   `switch.size.lg.thumb.translate.off/on`, track padding, thumb radius and the
   track/thumb colour consumer tokens) are all overridden from the JSON switch
   contract.

Because the target's generated `Switch` exposes no state-conditional border
token, the lane retains **two pre-themed `Switch` entities** per toggle (OFF =
bordered graphite, ON = borderless signal) and renders the one matching the
domain state; both are controlled through `ChangeRequest`. A mounted GPUI layout
test (`src/app/mod.rs` → `mounted_switch_geometry_matches_parity`) asserts the
mounted component box and track are exactly 64 × 32 at their slot origin and the
thumb is 24 × 24; a token-cascade test asserts the resolved track/thumb
geometry + colours.

### Icon art (portable code tiles)

The first parity montage showed three icon languages: Unity and Godot used their
admitted `Icon` catalog glyphs while GPUI (no Icon component) drew placeholder
squares. The authority now pins icon surfaces to portable two-letter code tiles
(`fixtures/parity-layout.json` `iconArt`, `parity.md` → "Icon art"):

- **Icon-visibility rows** — 16 × 16 `graphite` tile, 1 px `ruleStrong` border,
  square corners, centred 8 px / 800 `boneBright` code = the pinned fixture
  catalog initials (`Info→IN`, `Placeholder→PL`, `Home→HO`, `Baseline→BL`,
  `Alarm→AL`, `CircleDot→CD`, `ChevronRight→CR`, `User→US`).
- **Ability-card art** — 40 × 40 tile with the same fill/border/corners, centred
  12 px / 800 `boneBright` code = the first two letters of the ability name
  (`THREADING→TH`, `OVERCLOCK→OV`, …). The selected-card outline stays signal.

The fixture catalog initials are pinned explicitly in
`seam::parity::icon_code` (the authority's list is not derivable from the first
two characters for `Baseline`); ability names use `code_two_letters` (first two
alphanumeric characters, uppercased). Generated `Icon` remains the realization
anywhere else a target admits it; on these two parity surfaces the code tile is
the shared app-authority art, not a package change.

### DS vs fallback per region

| Region | Realization | Status |
|---|---|---|
| Header band / tab bar / footer band (chrome, rules) | plain gpui frame + FSDS `Text`/`Stat`/`Divider`; tab buttons hand-authored | NOT FSDS frame — no Tabs/Stack/Card component |
| Header stat readouts (rank, level, earnings, followers) | FSDS `Stat` (forced 20 px/800 via tokens) + FSDS `Text` | **FSDS** |
| Header PAUSED chip | FSDS `Badge` label inside a hand-authored chip rectangle | mixed — Badge has no fixed-size/justify channel |
| Map panel, field, 60 px grid, corner ticks, field note | hand-authored gpui drawing + FSDS `Text` | NOT FSDS — no Map/Canvas component |
| Map markers (24 px squares, kind monograms, nav outline) | hand-authored + FSDS-palette `markerColors`/`markerMonograms` | NOT FSDS — no Icon component |
| Map icon-visibility panel (8 rows, canonical switches) | FSDS `Switch` + FSDS `Text` rows; 16 px portable code tile (`iconArt.rowTile`) hand-authored | mixed — Switch **FSDS**, Icon art app-authority |
| Marker popover (anchored, CLOSE + SET AS NAV TARGET) | hand-authored surface; FSDS `Text`/`Badge`/`Divider` + hand-authored buttons | NOT FSDS — no Popover/Button |
| Progress roster (rows, accent bar, reputation bar, status chips, `OPEN →`) | FSDS `Text`/`Badge`; bars/rows hand-authored | mixed |
| Progress paper dossier drawer (brief/history/perks/parts/SHOP PARTS) | hand-authored drawer + FSDS `Text`/`Badge`/`Divider` + hand-authored buttons | NOT FSDS — no Drawer/Sheet |
| Abilities card grid (5×2, rarity chip, 40 px portable code tile, name, pips, installed chip) | hand-authored cards + FSDS `Badge` (rarity/installed) and `Text` | mixed — no Card/Icon component; card art is the shared `iconArt.cardTile` code |
| Ability hover popover | hand-authored surface; FSDS `Text`/`Badge` | NOT FSDS — no Tooltip/Popover |
| Detail panel + vehicle loadout (2×3 slots, compatible outlines, install/remove/reject) | hand-authored rows + FSDS `Text`/`Badge` | mixed |
| General settings switches | FSDS `Switch` + FSDS `Text` rows | **FSDS** |
| Controller sliders / audio sliders | hand-authored 300×6 track + 16 px circular thumb, 20 click cells | NOT FSDS — no Slider |
| Remap rows + key-waiting modal | hand-authored modal; FSDS `Text`/`Divider`; hand-authored binding buttons | NOT FSDS — no Dialog/Button |
| Language dropdowns | hand-authored 200×28 graphite dropdowns | NOT FSDS — no Select |
| Subtitle background swatches + live preview | hand-authored swatches; FSDS `Text` preview; foreground picked from the palette | NOT FSDS — no ColorPicker |
| Rules / separators | FSDS `Divider` (margin zeroed via tokens) at JSON rects | **FSDS** |

Five of the seven admitted components are used (Switch, Text, Badge, Divider,
Stat); ToggleSwitch and Checkbox have no spec region requiring their semantics.
No layout number, colour or type size is re-typed in `src/app/`: geometry/colour
come from the parsed JSON; the handful of parity-document-pinned type/chrome
values live in `src/app/style.rs` with their source named.

### Typography (Inter pin)

The lane embeds the bundled Inter 4.1 static faces (`examples/game-pause-menu/fonts/inter`,
OFL) through `TextSystem::add_fonts` and pins the root family to `Inter`; this removes the
earlier `.SystemUIFont` fallback. Two weights are requested (400 regular / 700 bold) with the
authority's sizes and zero tracking; the retired 600/800 requests collapse to regular/bold. Text
weights are applied through the generated `Text` weight variants plus token overrides, and the
root `font_family` propagates into generated components. The parity palette and
type scale are resolved at load from `resolved.tokens.json` + `orion.tokens.json`
(embedded at compile time) through the authority's `colorTokens` / `typeTokens`
maps; the lane does not render from a lane-local palette copy. The lane also writes
`AppleFontSmoothing = 0` into its own application preferences domain before GPUI
initialises: the pinned `gpui_macos` renderer otherwise applies
CoreGraphics-style glyph dilation to light-on-dark text, which made the same
Inter Bold read ~40 % heavier than Unity/Godot. This is a per-app preference,
not a global font setting.

### Permitted differences (recorded)

- **Glyph rasterisation.** Same Inter faces, weights, sizes and zero tracking as
  the other lanes; only glyph anti-aliasing/hinting and sub-pixel baseline
  rounding differ. `parity.md` records the bbox tolerances used to verify this.
- **Line-height.** Absolute single-line text boxes use line-height 1 (body 1.2)
  as a font-metric choice; body-copy line breaks are expected to match because
  the faces and widths match.
- **Chips.** FSDS `Badge` provides chip typography but the target's Badge has no
  width/height/justify channel, so the exact chip rectangle is a hand-authored
  surface and the Badge label is centred inside it (ledger above).

### Verification

- Per-state **colour probes** from `examples/game-pause-menu/parity-check.mjs`:
  all 26 probes match the JSON palette on this lane's captures (including both
  switch tracks, the active tab fills, map field, panels, drawer ground, ACCESS
  chip and footer ground).
- **Region boxes** measured from the captures match the authority: map field
  `40,232,840,480`; active tab columns `0/320/640/960 × 320 × 56`; switch ON
  `1176,232,64,32` and OFF `1176,472,64,32`; SETTINGS general switch
  `552,222,64,32`; ACCESS chip `1080,240,76,22`; footer NAV TARGET value
  right-aligned to x = 1256; drawer paper occupies `24,176,560,552`.
- The lane's `tests/parity.rs` (13 tests) pins the JSON contract (shell rects,
  tab columns, per-tab rects, switch contract incl. off/on colours and pill
  math, palette/type maps, capture plan, settings sub-layout, nav-target pin)
  and the negative authoring paths.

## Evidence

`cargo run --features capture -- --capture <dir>` starts the real 1280×800
window, applies each state from the JSON `captures` map, waits for a paint,
reads the rendered frame with `Window::render_to_image()`, writes a PNG per
state and a `capture-manifest.json`, then exits. Captures are written to
`/Users/darianrosebrook/Desktop/Projects/full-stack-ds/tmp/game-pause-menu/gpui/`:

| File | State |
|---|---|
| `map.png` | MAP tab, nav target cache-02, weather-06 hidden |
| `progress.png` | PROGRESS tab, ares-logistics dossier drawer |
| `abilities.png` | ABILITIES tab, overclock pending, compatible slots outlined |
| `settings.png` | SETTINGS tab (all four panels) |
| `map-popover.png` | MAP tab with the beacon-05 popover |
| `abilities-hover.png` | ABILITIES hover popover over overclock |
| `settings-remap-modal.png` | remap modal waiting for INTERACT |
| `settings-subtitle.png` | SIGNAL swatch + Français subtitle preview |

Screenshots are sampled states of the running app, not physical-device proof and
not an interaction recording.

## Tests

- `cargo +1.94.1 test --locked` → **70 tests**: 3 lib (`Switch` resolved-style + token resolver)
  token cascade), 2 colour helpers, 15 parity-layout contract tests (incl. the
  icon-art code language), 49 seam tests (fixture parsing/validation and every
  I1–I15 domain rule).
- `cargo +1.94.1 test --features capture` → **70 tests**: adds the 2 capture
  frame sanity tests and the mounted `Switch` geometry test (`TestAppContext`
  `debug_bounds`; 64×32 component box, 64×32 track, 24×24 thumb at slot origin).

The GPUI app has no automated end-to-end interaction/screenshot baseline; the
domain interactions are seam-tested and the parity evidence is state-driven
frame capture.

## Interaction coverage (I1–I15)

All interactions remain real code paths over the pure-std seam state; the parity
pass changed layout, not semantics. Mapping: I1 tab selection, I2 icon
visibility filter, I3/I4 marker popover + nav target, I5/I6 faction drawer +
disabled locked shop, I7–I9 ability selection / compatible install / reject +
remove, I10 hover popover, I11 General switches, I12 controller sliders, I13
remap wait/capture/cancel, I14 audio/language/subtitle swatch + preview, I15
one-overlay-at-a-time Escape dismissal. Escape and 1–4 tab keys are bound at the
window level; the domain rules are covered by the 49 seam tests.

## Non-claims

- **No automated visual/interaction proof.** The parity evidence is sampled
  frames of the running app; no screenshot baseline, mounted input test or
  cross-engine pixel-parity claim is made here.
- **Not accessibility proof.** Focus keys and hover paths exist; no a11y
  standard is claimed. Gamepad navigation is not simulated.
- **Partial realization.** Every NOT-FSDS row above is a fallback forced by the
  7-component allowlist, not a claim that the hand-authored surface equals a
  package component.
- **Theme delivery is explicit overrides, not brand-graph loading.** GPUI has no
  automatic brand/dark loader; the lane applies the JSON palette through
  per-instance `Theme::with_token` and lane-local colour constants.
- **Build environment deviation.** `runtime_shaders` is enabled on the same
  pinned zed revision because this machine's Xcode lacks the standalone Metal
  tool; the default build otherwise matches the package pins.
- **Not generated-artifact admission.** GPUI remains outside the TypeScript
  admission rail; this lane is hand-written consumer code plus a path
  dependency.
- **Cross-engine RMSE is not claimed by this lane.** The shared
  `parity-check.mjs` montage/RMSE comparison runs where all three lanes'
  captures exist; this lane only asserts its own probe/region geometry.
