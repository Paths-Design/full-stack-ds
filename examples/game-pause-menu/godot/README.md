# Orion N5 game pause menu — Godot lane (parity pass)

The Godot consumer realization of the shared game pause-menu app
([`../spec.md`](../spec.md)) for the fictional *Orion N5 — Mars Expedition*
game, rebuilt to the parity design authority
([`../parity.md`](../parity.md) +
[`fixtures/parity-layout.json`](fixtures/parity-layout.json)) on **Godot 4.7.2**,
from the generated Full Stack DS Godot package (`packages/ds-godot/addons`).

This lane is one of three parity-realizations of the same interface; the app
spec, fixtures and comparison document are owned by the slice.

## Claim

The four-tab pause menu (MAP / PROGRESS / ABILITIES / SETTINGS), the shared
I1–I15 interaction semantics and the shared fixture corpus are realized on the
Godot Control substrate at the **same 1280 × 800 boxes, colours and type sizes**
as the other engine lanes, using the package's generated components wherever the
Godot target admits them. Every layout constant is parsed from
`fixtures/parity-layout.json` — no geometry, colour or type size is re-typed in
lane source.

**Brand delivery.** The Godot target has no resolved brand projection (no
`data-brand` scope, no token-graph loader), so the Orion palette is applied by a
lane-local `Theme` (`scripts/orion_theme.gd`) projected from the same JSON
colour map, plus per-component `token_overrides` (Button/Badge/Card) and
`add_theme_*_override`/icon overrides on generated control-family nodes
(Tabs/Switch/Popover). This remains a package finding (F-GODOT-1).

## Design authority

| Source | Use in this lane |
|---|---|
| `fixtures/parity-layout.json` (lane copy, committed) | Every rect, colour, type size, switch geometry, marker/rarity/status colour map, capture-state list. Parsed by `scripts/parity_layout.gd`; validated loudly by the fixture adapter. |
| `../parity.md` | Rendering rules, per-tab composition order, switch parity, "Component styling defaults", permitted differences. |
| `../spec.md` | App semantics + I1–I15 interaction contract (unchanged). |
| parity branch commits `7897d0607` + `46c45e63a` | Pinned corrections merged before the final capture: OFF-switch colours, nav target in all capture states, card/rarity-chip boxes, roster `OPEN →`, settings audio sub-layout, shortened panel metas, ink grid lines, left-aligned 32 px-inset tab labels, and the portable icon-art language (explicit fixture-icon → code table + ability-name codes). |

## Setup

A Godot project can only resolve `res://` paths inside its own tree, so the
committed package is materialized into the lane at setup time and stays out of
git:

```sh
cd examples/game-pause-menu/godot
./setup.sh              # copies ../../../packages/ds-godot/addons/full_stack_ds -> ./addons/full_stack_ds
./setup.sh --check      # verifies the copy matches the package source
```

`addons/full_stack_ds/`, `.godot/`, `*.uid` and `evidence/` are gitignored. Set
`FSDS_GODOT_PACKAGE=/abs/path/to/packages/ds-godot` to copy from another
checkout. Measured: setup 0.06 s.

## Run / verify

Requires `/Applications/Godot.app/Contents/MacOS/Godot` (4.7.2); override with
`GODOT=/path/to/godot`.

```sh
GODOT=/Applications/Godot.app/Contents/MacOS/Godot

# Interactive menu (window 1280x800, gl_compatibility)
"$GODOT" --path "$PWD"

# Headless interaction + geometry tests (I1..I15, parity rects, switch icons,
# fixture failure paths). Exit 0 = all pass; prints TEST_PASS/TEST_FAIL lines.
"$GODOT" --headless --path "$PWD" res://tests/test_main.tscn

# Parity capture states (non-headless; reads the rendered viewport texture).
# Writes all eight `captures` states from the JSON and mirrors them into the
# slice evidence directory from inside the Godot process.
"$GODOT" --path "$PWD" res://tools/capture.tscn -- \
  --out="$PWD/evidence" \
  --mirror=/Users/darianrosebrook/Desktop/Projects/full-stack-ds/tmp/game-pause-menu/godot

# Cross-engine probe/montage (shared, run by the slice):
node ../parity-check.mjs --root /Users/darianrosebrook/Desktop/Projects/full-stack-ds/tmp/game-pause-menu
```

Measured on this machine: headless suite 207 checks / 207 passed, 4.1 s,
`input_dispatch=viewport_push_input`; capture 4.8 s for eight 1280×800 PNGs.

## Parity geometry consumed

All boxes come from the JSON. The lane-local layout root is the tab content origin
(`content.x=24`, `content.y=176`); tab bodies span the full 1280 px so JSON x is
used directly and only y is offset.

| Region | Geometry (JSON) | Realization |
|---|---|---|
| Header band | `0,0,1280,104`; wordmark at 32,18 (40 px); mission at 32,72; stats at x=608/800/992; PAUSED chip `1184,40,64,24` | native band chrome; wordmark/stats native labels; PAUSED = generated **Badge** |
| Tab bar | `0,104,1280,56`; four `320`-wide tabs at x=0/320/640/960; labels left-aligned with a `32` px inset (`labelAlign=left` / `labelInset=32`); active `signal` fill + `onSignal` text; inactive `textSecondary`; 1 px `rule` separators | generated **Tabs** (`add_item` content slots) with per-trigger geometry/style overrides |
| Content region | `24,176,1232,552` (tab body 1280×552) | generated Tabs body panel |
| Footer band | `0,744,1280,56`; hints at `24,770`; NAV TARGET label at `1096,758`, target value right-aligned to `x=1256`, baseline `y=770`, 13 px/700 `signal`; every capture state carries `navTarget=cache-02` | native band chrome + labels |
| MAP | map panel `24,176,872,552`; field `40,232,840,480` (sage, 60 px grid, 12 px ticks, 24 px markers); icon panel `912,176,344,552`; 8 rows at `firstY=224,rowH=48`, switch `x=1176,y=row+8`; popover `392,272,360,232` | panel chrome/plot/markers native; 8 generated **Switch**; parity 16×16 code-tile row art (IN/PL/HO/BL/AL/CD/CR/US); top-left/title native labels |
| PROGRESS | roster `24,176,1232,552`; rows `x=40,firstY=224,rowH=88` (name x=56/y=12, tagline y=36, rep bar `800,44,200,6`, status chip `1080,16,76,22`, affordance `OPEN →` at x=1180, 11 px/700 `signal`); drawer `24,176,560,552` paper with fixed DSL rows; parts rarity chips 64×18 at 9 px | rows/rep bars/drawer native; generated **Badge** chips; generated **Button** (CLOSE/SHOP PARTS) |
| ABILITIES | grid panel `24,176,808,552`; cards `x=40,firstY=224,w=152,h=240,colGap=12,rowGap=12` (row 2 at y=476..716 inside the 728 panel bottom; art y=28, name y=84, size y=106, installed y=196; rarity chip exactly `8,-9,64,18` at 9 px/800); detail panel `848,176,408,552` (title y=232, chips y=268, body y=294, stats y=372, loadout y=448/466, slots `872,488,180,60` 2×3); hover popover `224,320,320,180` | generated **Card** surface+parts per card (parity 40×40 code-tile art, **Badge** rarity/installed), wrapper hit target; generated **Popover** for hover; native detail/slots |
| SETTINGS | four panels `24,176,608,268`, `648,176,608,268`, `24,460,608,268`, `648,460,608,268`; General/Controller rows 44 px pitch from y=216, remap rows 36 px pitch from y=496; audio rows y=496 pitch 28, language labels y=612, dropdowns y=624 (200×28), `SUBTITLE BACKGROUND` label y=658, swatches y=670 (36×18, 6 px gap), preview `664,694,576,26`; slider `300×6` thumb 16; binding button `120×28`; remap modal `430,300,420,200` | generated **Switch** (5 General rows) + **Button** (6 remap bindings + modal cancel); lane-local `ParitySlider`, native OptionButton/swatches/preview/modal |

## Admitted component inventory

| Component | Parity use | Instances |
|---|---|---|
| **Tabs** | shell tab bar + content `add_item` bodies; triggers forced to the four 320×56 boxes, active/inactive styles from JSON | 1 bar / 4 bodies |
| **Switch** | MAP icon-visibility filters (8); SETTINGS General toggles (5); 64×32 pill with SVG icon overrides | 13 |
| **Popover** | marker detail (360×232) and ability hover (320×180) surfaces | 2 |
| **Button** | `SET AS NAV TARGET`, popover CLOSE, drawer CLOSE, SHOP PARTS, remap CANCEL, 6 remap binding buttons | 6 sites / 12+ instances |
| **Badge** | PAUSED chip (64×24), marker status, roster ACCESS/LOCKED (76×22), ability rarity (64×18), installed tag, part rarity, size chip | ~27 |
| **Card** | 10 ability cards (surface + part hosts for header/content/footer) | 10 |
| **Icon** | admitted but **not used**: parity icon surfaces are the pinned two-letter code tiles (app-authority decision so all three engines render the same art) | 0 |
| Text / Divider | admitted but **not used**: their baked type scale/foreground (`#141414`, 1 rem/0.75 rem) and Divider's baked `#d0d0d0` are not parity JSON values and have no override channel — ledgered finding (F-GODOT-2/F-GODOT-7) | 0 |
| Accordion | admitted but unused (no accordion-shaped region in this app) | 0 |

Consumed only through public exports: shipped `.tscn` scenes, `value` /
`value_requested` / `value_changed`, `add_item`, `content`, `activated`,
`token_overrides`, plus `add_theme_*_override` and icon overrides on generated
control-family nodes. No generated component source is copied into the lane and
`packages/ds-godot` is not modified.

## Switch parity fix (root cause)

The generated boolean runtime is a Godot `CheckButton`; its track and thumb are
engine default-theme icons, so on this target the Orion pill never painted. The
lane supplies **SVG icon overrides** for `checked`/`unchecked` (plus `*_disabled`)
that draw the JSON switch geometry: 64×32 stadium track (radius 16), 24 px circular
thumb (radius 12, inset 4), ON track `signal` + `onSignal` thumb at x=36, OFF track
`graphite` + 1 px `ruleStrong` border + `boneBright` thumb. Icons are rasterised at
2× and drawn at 64×32 through the `icon_max_width` theme constant; the lane-local
theme empties the CheckButton state styleboxes so only the pill paints. Measured on
the final captures: ON track `#EF6A3C` / thumb `#191917`, OFF track `#2E2E29`
(1 px `#56564C` border) / thumb `#F4F1E6`. The headless suite samples the override
textures to assert those colours and asserts every generated switch uses the
64×32 pill.

## Realization ledger (engine-native / hand-authored fallbacks)

Every fallback carries `# NOT FSDS: <reason>` in source.

| Region | Mechanism | Why | Source |
|---|---|---|---|
| Shell bands (header/tab-bar grounds/footer), panel chrome | native `Control`/`ColorRect`/`PanelFrame` | no layout/surface primitive admitted | `scripts/app.gd`, `widgets/panel_frame.gd` |
| Header wordmark/stats/mission, footer hints/nav value, panel titles/meta/rows | native `Label` | generated Text projects a fixed light-theme foreground and fixed type scale — cannot meet the JSON colours/sizes on ink grounds (F-GODOT-2) | `scripts/app.gd`, `tabs/*` |
| Tab selected/inactive styling; tab box geometry | `add_theme_*_override` on generated Tabs triggers | generated Tabs has no selected-tab style or per-tab geometry channel (F-GODOT-5) | `scripts/ds_factory.gd` |
| Switch track/thumb icons | SVG icon overrides on the generated CheckButton | **switch parity fix** (above; F-GODOT-10) | `scripts/ds_factory.gd` |
| Popover trigger hidden; surface size/style/placement | app-level surface override + parity rect / anchored clamp | generated Popover is trigger-driven, sizes from its content's first layout pass, and only positions below the trigger with Escape-only dismissal (F-GODOT-3/F-GODOT-4) | `scripts/ds_factory.gd`, `scripts/app.gd` |
| Badge content alignment | `content_label` centering | generated Badge exposes no content alignment channel | `scripts/ds_factory.gd` |
| Ability card hit target + selected outline | native wrapper `Button`; Card made transparent | generated Card has no activation/selected channel (F-GODOT-6) | `tabs/abilities_tab.gd` |
| Ability card internals | positioned children inside generated Card part slots | Card part hosts are flow containers; the JSON pins absolute y positions | `tabs/abilities_tab.gd` |
| Map field (sage ground, 60 px grid, 12 px corner ticks) | hand-authored `_draw` | no map/drawing component admitted | `widgets/map_field.gd` |
| Map markers (24 px square, monogram, nav outline) | native `Button` + `_draw` | no map-marker component admitted | `widgets/marker_button.gd` |
| Icon-visibility row art + ability-card art | 16×16 / 40×40 graphite code tiles (`graphite` + 1 px `ruleStrong`, code label) | parity "Icon art" pin: catalog glyphs are not portable across engines, so the two-letter code tile is the shared art | `scripts/ui_kit.gd` (`code_tile`), `tabs/map_tab.gd`, `tabs/abilities_tab.gd` |
| Roster rows, reputation bars, status/dossier links | native `Button` rows + `ProgressBar` | no List/Row/Progress component admitted | `tabs/progress_tab.gd` |
| Drawer surface + slide animation | lane `PanelFrame` + `Tween` | no Drawer/Sheet component admitted | `tabs/progress_tab.gd` |
| Detail panel stats, slot grid | native labels/buttons | no slot/stat component admitted | `tabs/abilities_tab.gd` |
| Sliders (5 controller + 4 audio) | lane-local `ParitySlider` | no Slider component admitted; JSON track/thumb geometry consumed | `widgets/parity_slider.gd` |
| Language dropdowns | native `OptionButton` | no Select/Dropdown component admitted | `tabs/settings_tab.gd` |
| Subtitle background swatches + preview strip | native colour-block `Button`s + panel/label | no ColorPicker/Swatch component admitted; preview foreground must adapt to the picked background | `tabs/settings_tab.gd` |
| Remap modal | native dim + panel overlay | no Dialog/Modal/Sheet component admitted | `scripts/app.gd` |
| Rules/separators | native `ColorRect` 1 px `rule`/`paperMuted` | generated Divider's colour is baked and not a parity value (F-GODOT-7) | `tabs/*` |

## Interaction coverage (shared I1–I15)

All 15 are implemented and covered by the headless suite (207 checks, including parity geometry, pinned corrections and icon-art probes). Full
screenshot evidence is the eight capture states; the four required states are
`map`, `progress`, `abilities`, `settings`.

| ID | Interaction | Test | Screenshot |
|---|---|---|---|
| I1 | select one of four tabs | `test_i1` (+ tab geometry in `test_geometry`, pinned values in `test_parity_pins`) | all four required states |
| I2 | toggle icon visibility OFF/ON | `test_i2` | map icon panel |
| I3 | activate marker → anchored popover | `test_i3_i4` | `map-popover.png` |
| I4 | SET AS NAV TARGET → footer + marker highlight | `test_i3_i4` | `map.png`, `map-popover.png` |
| I5 | unlocked faction → drawer + enabled SHOP PARTS | `test_i5` | `progress.png` |
| I6 | locked faction → requirement + disabled SHOP PARTS | `test_i6` | progress state (test-only assertion) |
| I7 | select card → selected + compatible slots | `test_i7` | `abilities.png` |
| I8 | install/replace in compatible slot | `test_i8` | `abilities.png` |
| I9 | incompatible slot → no install + reject | `test_i9` | transient, test-only |
| I10 | hover card → tooltip popover | `test_i10` | `abilities-hover.png` |
| I11 | toggle General switch | `test_i11` | `settings.png` |
| I12 | adjust Controller slider | `test_i12` | `settings.png` |
| I13 | remap waits → captures; cancel unchanged | `test_i13` (viewport input) | `settings-remap-modal.png` |
| I14 | audio slider/languages/subtitle background + preview | `test_i14` | `settings-subtitle.png` |
| I15 | cancel closes popover/drawer/modal unchanged | `test_i15` (+I13) | map/progress states |

Fixture failure paths: malformed JSON, missing keys, unknown glyph, wrong vehicle
slot count, incomplete parity layout (`test_corpus`).

## Parity pass

- **Geometry authority consumed:** `scripts/parity_layout.gd` wraps the parsed
  JSON; `UI.place_rect`/`UI.local` place every region from it. The suite asserts
  global rects for header/tab-bar/footer, all four tab triggers (320×56), content
  bodies (1280×552), map panel/field/icon panel, drawer, ability grid/detail panel,
  first card, first loadout slot and all four settings panels. No layout number is
  re-typed in lane source.
- **DS vs fallback per region:** see the inventory + ledger tables above. Generated
  components realize the tab bar, 13 switches, 2 popovers, all action buttons,
  ~27 chips, 10 cards and 18 icons; lane-local native chrome covers the shell
  bands, map plot/markers, roster rows, drawer surface, slots, sliders, dropdowns,
  swatches, preview and modal.
- **Pinned-correction round (merged parity `7897d0607`):** OFF switch samples the
  graphite track and `boneBright` thumb; every capture state now sets
  `navTarget=cache-02` and the footer value is right-aligned to x=1256; ability
  cards and their 64×18/9 px rarity chips were measured in the captures
  (chip x=48..112, y=215..233 inside the 152×240 card); the audio sub-layout is the
  pinned `496/28` row pitch with labels at 612, dropdowns at 624 (200×28), swatch
  label 658 / swatches 670 (36×18) and preview (664,694,576,26); the roster
  affordance is `OPEN →` at x=1180; controller/remap/audio metas are the shortened
  JSON strings; the map grid is 1 px ink at 12% opacity with 12 px corner ticks.
- **Icon art (merged `46c45e63a`):** both icon surfaces use the portable two-letter
  code language: MAP rows render a 16×16 `graphite`/1 px `ruleStrong` tile with an
  8 px/800 `boneBright` code from the JSON `iconArt.rowTile.codes` table
  (`Info→IN`, `Placeholder→PL`, `Home→HO`, `Baseline→BL`, `Alarm→AL`,
  `CircleDot→CD`, `ChevronRight→CR`, `User→US`); ability cards render a 40×40
  tile with a 12 px/800 code from the first two alphanumeric characters of the
  ability name (`THREADING→TH`, `OVERCLOCK→OV`, `ION DRILL→IO`, `DRONE SWEEP→DR`,
  `SIGNAL JAM→SI`, `AEGIS PLATE→AE`, `RECON PING→RE`, `THRUSTER BLOOM→TH`,
  `HARDLIGHT CUT→HA`) while the selected-card signal outline stays untouched.
  Tab labels are left-aligned with the pinned 32 px inset.
- **Switch implementation:** generated `Switch` retained; engine-default
  CheckButton icons replaced with 64×32 SVG pill icons (see "Switch parity fix").
  The native CheckButton widget box measures 64×40 in Godot (CheckButton reserves
  icon height + 8 px); the SVG canvas is 64×40 with the pill drawn flush at its top,
  so the painted pill is exactly the JSON 64×32 geometry at `row+8` and the widget
  padding is the only native-control difference.
- **Permitted differences taken:** glyph anti-aliasing/hinting on the shared
  Inter faces; sub-pixel baseline rounding. Family, weights (400/700), sizes,
  zero tracking, chip centring and body-copy alignment are pinned and verified
  by the shared checker's 39 typography bbox probes. Everything else (rects,
  colours, copy, switch geometry, active/selected states, overlays) is
  parity-pinned.
- **Typography:** the lane loads the bundled Inter 4.1 static faces
  (`setup.sh` copies `../fonts/inter` into `res://fonts/inter`), maps weight
  < 700 to Regular and >= 700 to Bold with `FontFile.fixed_size`, and pins
  theme default fonts. The retired `SystemFont` projection and glyph tracking
  are gone. The taxonomy follows `parity.md` → "Typography parity".
- **Token palette:** `setup.sh` also copies `resolved.tokens.json` and the Orion
  brand file into `res://fixtures/ds-tokens/`; `TokenResolver` rewrites the
  authority's colours and type sizes from the `colorTokens` / `typeTokens`
  provenance maps at fixture load. `orion-appearance.json` is no longer loaded
  by this lane.

## Non-claims

- Not a shipping game, not a game-framework input integration, not an
  input-system simulation. Remap capture is exercised with a synthetic
  `InputEventKey` pushed through the viewport, not physical OS input; gamepad
  capture code exists but is unexercised.
- Not visual-quality proof of the design system: hand-authored regions are
  app-layer chrome and are not component-quality claims.
- Not cross-engine pixel parity proof by this lane alone: the shared
  `parity-check.mjs` montage/RMSE/probe run across all three lanes is the slice's
  evidence; its current probe-point issue is noted above.
- Not accessibility adequacy proof: focus/keyboard paths are exercised, but no
  a11y standard or screen-reader delivery is claimed.
- Screenshots are sampled 1280×800 states (`window/stretch/mode=canvas_items`),
  not physical-device or multi-resolution proof.
- Not generated-artifact admission: the Godot target is outside the TypeScript
  admission rail. The copied addon directory is generated and gitignored; only
  lane sources are committed.
