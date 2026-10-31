# Orion N5 game pause menu — Godot lane

The Godot consumer realization of the shared game pause-menu app
([`../spec.md`](../spec.md)) for the fictional *Orion N5 — Mars Expedition*
game, built from the generated Full Stack DS Godot package
(`packages/ds-godot/addons/full_stack_ds`) on **Godot 4.7.2**.

This is a lane of the `GAME-PAUSE-MENU-EXAMPLE-01` slice: the app spec,
fixtures, and comparison document are owned by the slice, not by this lane.

## Claim

The four-tab pause menu (MAP / PROGRESS / ABILITIES / SETTINGS), the shared
I1–I15 interaction semantics, and the shared fixture corpus are realized on the
Godot Control substrate using the package's generated components wherever the
Godot target admits them (Tabs, Switch, Popover, Button, Badge, Card, Icon,
Text, Divider). Every region realized with engine-native or hand-authored UI is
marked `# NOT FSDS: <reason>` in source and ledgered below.

**Brand delivery.** The Godot target has no resolved brand projection (no
`data-brand` scope, no token-graph loader), so the Orion palette from
[`fixtures/orion-appearance.json`](fixtures/orion-appearance.json) is applied
by a lane-local `Theme` (`scripts/orion_theme.gd`) plus per-component
`token_overrides` (Button/Badge/Card) and `add_theme_*_override` fallbacks on
generated control-family nodes (Switch/Tabs/Popover). This is the lane's
honest brand mechanism and is itself a package finding (F-GODOT-8).

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
checkout.

## Run

Requires `/Applications/Godot.app/Contents/MacOS/Godot` (4.7.2); override with
`GODOT=/path/to/godot`.

```sh
# Interactive menu (window 1280x800, gl_compatibility)
GODOT=/Applications/Godot.app/Contents/MacOS/Godot
"$GODOT" --path "$PWD"

# Headless interaction tests (I1..I15 + fixture-corpus failure paths)
"$GODOT" --headless --path "$PWD" res://tests/test_main.tscn
# exit 0 = all checks passed; prints TEST_PASS/TEST_FAIL lines and a
# TESTS_TOTAL/PASSED/FAILED summary (+ JSON at user://godot-lane-test-results.json)

# Screenshot capture (non-headless; reads the rendered viewport texture)
"$GODOT" --path "$PWD" res://tools/capture.tscn -- \
  --out="$PWD/evidence" \
  --mirror=/Users/darianrosebrook/Desktop/Projects/full-stack-ds/tmp/game-pause-menu/godot
```

Measured on this machine: setup <1 s, capture 2.9 s (8 PNGs), tests 3.6 s
(134 checks, 134 passed / 0 failed, `input_dispatch=viewport_push_input`).

## Generated component inventory (admitted and used)

| Component | Where it is used | Runtime instances |
|---|---|---|
| **Tabs** | Shell tab bar; each tab body is an `add_item` content slot (`scripts/app.gd`) | 1 tab bar / 4 item bodies |
| **Switch** | MAP icon-visibility filter rows (one per fixture icon); SETTINGS General toggles (one per fixture toggle) (`tabs/map_tab.gd`, `tabs/settings_tab.gd`) | 13 |
| **Popover** | MAP marker-detail anchored surface; ABILITIES card-hover tooltip (`scripts/app.gd`) | 2 |
| **Button** | `SET AS NAV TARGET`, popover CLOSE, dossier CLOSE, SHOP PARTS, remap CANCEL, one binding button per remap action (`scripts/app.gd`, `tabs/progress_tab.gd`, `tabs/settings_tab.gd`) | 7 static + 6 bindings |
| **Badge** | PAUSED chip, D3SO callsign plate, marker status, faction tier/locked tags, ability rarity tags, part rarity tags, installed tag (`scripts/app.gd`, `tabs/progress_tab.gd`, `tabs/abilities_tab.gd`) | ~22 |
| **Card** | ABILITIES ability cards (part hosts: header/content/footer) (`tabs/abilities_tab.gd`) | 10 |
| **Icon** | Map marker glyphs, ability-card glyphs (`widgets/marker_button.gd`, `tabs/abilities_tab.gd`) | 18 |
| **Text** | Map chrome (sector/scale captions on the sage telemetry ground), dossier description/history on the bone paper drawer (`widgets/map_field.gd`, `tabs/progress_tab.gd`) | 4 |
| **Divider** | Map field header rule, dossier rule (`widgets/map_field.gd`, `tabs/progress_tab.gd`) | 2 |
| Accordion | Admitted but unused — the app spec has no accordion-shaped region | 0 |

Consumed only through public exports: the shipped `.tscn` scenes, `content`/
`value` channels, `add_item`, `value_requested`/`value_changed`, `activated`,
`token_overrides`, `add_theme_*_override` fallbacks. No generated component
source is copied into the lane, and `packages/ds-godot` is not modified.

## Realization ledger (engine-native / hand-authored fallbacks)

Every fallback is marked `# NOT FSDS: <reason>` in source. "Native" means a
Godot Control; "hand-authored" means a lane-local `_draw`/scene composition.

| Region | Mechanism | Why (allowlist / package gap) | Source |
|---|---|---|---|
| App shell: header band, tab-bar grounds, footer band, content grounds, section chrome | Native `Control`/`ColorRect`/`PanelFrame` (`# NOT FSDS`) | No layout/surface primitive is admitted for app composition | `scripts/app.gd`, `widgets/panel_frame.gd` |
| Header stat readouts, footer hints, labels on ink/charcoal grounds | Native `Label` (`# NOT FSDS`) | **F-GODOT-1**: generated Text projects a fixed light-theme `#141414` foreground and has no `token_overrides`/theme channel → unusable on the dark ground | `scripts/app.gd`, `tabs/*` |
| Map field (grid, contour ticks, sector chrome, corner ticks) | Hand-authored `_draw` (`# NOT FSDS`) | No map/canvas/drawing component is admitted | `widgets/map_field.gd`, `widgets/corner_ticks.gd` |
| Map markers (shape per kind, nav-target highlight, status dot) | Native `Button` + `_draw`, generated Icon inside (`# NOT FSDS`) | No map-marker component is admitted | `widgets/marker_button.gd` |
| Icon-visibility panel rows, faction list rows | Native `Button` rows + labels (`# NOT FSDS`) | No List/ListItem/Row component is admitted | `tabs/map_tab.gd`, `tabs/progress_tab.gd` |
| Reputation bars, rank progression bar | Native `ProgressBar` (`# NOT FSDS`) | No Progress/Stat component is admitted | `tabs/map_tab.gd`, `tabs/progress_tab.gd` |
| Faction drawer surface and slide animation | Native PanelFrame + `Tween` (`# NOT FSDS`) | No Drawer/Sheet component is admitted | `tabs/progress_tab.gd` |
| Vehicle loadout slots + remove affordance | Native `Button` + lane stylebox states (`# NOT FSDS`) | No slot/stat component is admitted | `tabs/abilities_tab.gd` |
| Card hit target / selected + installed surfaces | Native wrapper `Button` (`# NOT FSDS`) | **F-GODOT-6**: generated Card has no activation/selected channel (`interactive` styles hover only) | `tabs/abilities_tab.gd` |
| Controller/audio sliders | Native `HSlider` (`# NOT FSDS`) | No Slider component is admitted on the Godot target | `tabs/settings_tab.gd` |
| Audio/subtitle language dropdowns | Native `OptionButton` (`# NOT FSDS`) | No Select/Dropdown component is admitted | `tabs/settings_tab.gd` |
| Subtitle background swatches | Native color-block `Button`s (`# NOT FSDS`) | No ColorPicker/Swatch component is admitted | `tabs/settings_tab.gd` |
| Subtitle preview strip | Native `PanelContainer` + adaptive-contrast native label (`# NOT FSDS`) | Preview foreground must adapt to the picked background; generated Text's foreground is fixed (F-GODOT-1) | `tabs/settings_tab.gd` |
| Remap modal overlay (waits for input) | Native dim + panel + label overlay (`# NOT FSDS`) | No Dialog/Modal/Sheet component is admitted | `scripts/app.gd` |
| Scroll region in Settings | Native `ScrollContainer` (`# NOT FSDS`) | No Scroll/field-list component is admitted | `tabs/settings_tab.gd` |
| Hairline rules and dashed separators on the ink ground | Native `ColorRect` / `DashedRule` (`# NOT FSDS`) | **F-GODOT-7**: generated Divider's color is fixed `#d0d0d0` and has no override channel — acceptable on paper, too bright for dark hairlines | `widgets/dashed_rule.gd`, `tabs/*` |
| Brand styling of generated control-family nodes (Switch/Tabs/Popover internals) | Lane `Theme` assignment + `add_theme_*_override` on generated trigger/surface nodes (`# NOT FSDS`) | **F-GODOT-2/F-GODOT-5**: no `token_overrides`/selected-tab style channel; authored theme projects a light-theme foreground | `scripts/ds_factory.gd` |
| Popover surface sizing/placement and outside-click dismissal | Lane re-fit after layout + viewport clamp (`# NOT FSDS`) | **F-GODOT-3/F-GODOT-4**: generated surface sizes from the first layout pass, defaults to 280×90 below the trigger, and only dismisses on Escape | `scripts/app.gd` |
| Popover trigger hidden for external anchors | `trigger.hide()` in `DSFactory.prepare_popover` (`# NOT FSDS`) | The generated Popover is trigger-driven; the app anchors its surface to a map marker/card instead | `scripts/ds_factory.gd` |

No other region uses hand-authored UI: tab bar, switches, popovers, action
buttons, tags, ability cards, map/drawer glyphs, and paper/dark captions use
generated components where the ground allows.

## Interaction coverage (shared I1–I15)

| ID | Interaction | Implementation | Tested (headless) | Screenshot |
|---|---|---|---|---|
| I1 | Select one of four tabs | generated Tabs `add_item`/`activate`, exactly one body visible | `test_i1` (20 checks over 4 tabs) | `map/progress/abilities/settings.png` |
| I2 | Toggle icon-visibility switch OFF/ON | generated Switch `activate` → app filter → marker visibility; fixture untouched | `test_i2` | map filter list in `map.png` |
| I3 | Activate a visible marker → anchored popover | native marker `pressed` → generated Popover open, clamped anchor | `test_i3_i4` | `popover.png` |
| I4 | SET AS NAV TARGET | generated Button `activated` → footer summary + marker highlight + popover close | `test_i3_i4` | `popover.png`, `map.png` footer |
| I5 | Unlocked faction → left drawer, enabled SHOP PARTS | native row → dossier drawer, generated Badge/Button/Text/Divider | `test_i5` | `progress.png`, `drawer.png` |
| I6 | Locked faction → drawer with requirement, disabled SHOP PARTS | same drawer, disabled generated Button | `test_i6` | drawer states in test log; capture shows unlocked drawer |
| I7 | Select ability card → selected + compatible slots highlighted | native card hit → lane style states; generated Icon/Badge inside Card | `test_i7` | `abilities.png` |
| I8 | Install into compatible slot (replace) | native slot `pressed` → fixture slot update + card/loadout refresh | `test_i8` | `abilities.png` installed/selected states |
| I9 | Incompatible slot → no install + reject state | lane reject style + timer | `test_i9` | not captured (transient state) |
| I10 | Hover ability card → tooltip popover | generated Popover, dark-themed attached content | `test_i10` | not captured (pointer state; covered by popover capture of the same component) |
| I11 | Toggle a General switch | generated Switch `value_changed` → app state + ON/OFF chip | `test_i11` | `settings.png` |
| I12 | Adjust a Controller slider | native HSlider `value_changed` → app state + readout | `test_i12` | `settings.png` |
| I13 | Remap binding → modal waits → capture; cancel unchanged | native modal + viewport key dispatch → generated Button reflects binding | `test_i13` (viewport `push_input`) | `remap-modal.png` |
| I14 | Audio slider, language dropdowns, subtitle background swatch + preview | native HSlider/OptionButton/swatch → adaptive preview strip | `test_i14` | `subtitle-picker.png` |
| I15 | Cancel closes popover/drawer/modal without data change | Escape via viewport input / close affordances; state asserted unchanged | `test_i15`, `test_i13` cancel path | `popover.png`/`drawer.png` (open states) |

Fixture failure paths are covered too: malformed JSON, missing required keys,
unknown glyph name, wrong vehicle slot count (`test_corpus`).

## Evidence

Lane-local (gitignored): `examples/game-pause-menu/godot/evidence/`
- `map.png`, `progress.png`, `abilities.png`, `settings.png` — required four tabs, 1280×800
- `popover.png` (marker detail), `drawer.png` (faction dossier), `remap-modal.png` (PRESS ANY KEY OR BUTTON), `subtitle-picker.png` (swatch + preview)

Mirrored to the slice evidence directory by the capture tool itself (the Godot
process writes there; no shell copy crosses the worktree boundary):
`/Users/darianrosebrook/Desktop/Projects/full-stack-ds/tmp/game-pause-menu/godot/`

Raw logs: `.../tmp/game-pause-menu/godot/capture-run.log`, `tests-run.log`.

## Source size

Source only, excluding the gitignored generated addon copy and fixtures:
**4,281 GDScript lines** (`scripts/` 2,020 · `tabs/` 1,287 · `widgets/` 334 ·
`tests/` 528 · `tools/` 112), **30 `.tscn` lines**, **65 shell lines**
(`setup.sh`). No TypeScript is authored by this lane. The copied addon is
~1,366 GDScript/runtime lines + generated component artifacts, all generated.

## Findings (feed the usability comparison)

- **F-GODOT-1 — Text is theme-locked and collapses.** `DSText` always projects
  `#141414` (its root style rule has no predicate and no override channel), so
  it is unusable on the dark ground, and its autowrapped `Label` reports a
  ~1-character minimum width: as an HBox child or an absolutely-positioned node
  it renders one character per line. The lane limits Text to light grounds and
  gives every absolute/HBox use an explicit minimum width.
- **F-GODOT-2 — Two incompatible styling surfaces.** Only action/composite
  runtimes (Button, Badge, Card) accept `token_overrides`; control-family
  runtimes (Switch, Tabs, Popover) accept none and their authored theme projects
  a light-theme foreground. Branding them requires assigning a lane-local Theme
  and overriding generated trigger/surface nodes.
- **F-GODOT-3 — Popover surface sizing is first-layout-pass based.** Attaching
  content whose wrapped minimum is only known after layout inflates the surface
  (measured 3,584 px tall panel for 219 px of content) and the runtime only
  positions below the trigger with a 280×90 default plus a 90 px viewport clamp.
  The lane re-fits the surface after two frames and re-anchors it with
  above/left fallbacks.
- **F-GODOT-4 — Attached Popover content loses the consumer theme scope.**
  Content is reparented into a `CanvasLayer` surface; a consumer theme applied to
  the app root does not reach it, so attached content must be authored against
  the surface's own theme. This is the same class of detached-surface theming
  gap recorded for Unity's portal.
- **F-GODOT-5 — Tabs has no selected-tab channel.** The active-tab block
  (orange fill, on-signal text) and the tab body panel styleboxes must be
  overridden per generated trigger/body node.
- **F-GODOT-6 — Card is presentation only.** `interactive` styles hover but
  there is no activated/selected channel, so a consumer must wrap Card in its own
  hit target to build a selectable card grid.
- **F-GODOT-7 — Divider/Text have no theme channel.** Fixed rule color
  `#d0d0d0` is fine on paper but too bright for ink-ground hairlines.
- **F-GODOT-8 — No resolved brand projection on the Godot target.** Unlike the
  Unity lane's `.fsds-brand-orion` scope, Godot consumers receive no brand
  tokens; every engine lane on this target must project the palette itself
  (this lane uses the shared appearance fixture + a lane-local Theme).
- **F-GODOT-9 — Control-family `_ready` mutates the shared authored theme
  resource.** `control.gd` writes light-theme Button/PanelContainer styleboxes
  into the loaded `theme.tres` at `_ready`; the lane avoids relying on that
  resource by assigning its own theme after instantiation.

## Non-claims

- Not a shipping game, not a game-framework input integration, not an
  input-system simulation. The remap modal is exercised with a synthetic
  `InputEventKey` pushed through the viewport, not physical OS input; gamepad
  capture code exists but is not exercised.
- Not visual-quality proof of the design system: the hand-authored regions are
  app-layer chrome and their appearance is not a component-quality claim.
- Not cross-engine pixel parity; focus models, native control chrome, and type
  metrics differ between Unity, GPUI and Godot.
- Not accessibility adequacy proof: focus/keyboard paths are exercised, but no
  a11y standard or screen-reader delivery is claimed.
- The screenshots are sampled states of one 1280×800 viewport, not
  physical-device or multi-resolution proof (`window/stretch/mode=canvas_items`
  scales the fixed design).
- Not generated-artifact admission: the Godot target is outside the TypeScript
  admission rail.
- The copied addon directory is generated; only the setup script and consumer
  sources are committed by this lane.
