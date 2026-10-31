# Unity lane — Orion N5 game pause menu (parity pass)

A Unity 6 UI Toolkit project that realizes the shared game pause-menu app shape
([`../spec.md`](../spec.md)) against the parity design authority
([`../parity.md`](../parity.md)) and the repository's generated UI Toolkit package
[`packages/ds-unity`](../../../packages/ds-unity). Four tabs — **MAP**, **PROGRESS**,
**ABILITIES**, **SETTINGS** — built at the pinned absolute 1280×800 geometry from
[`parity-layout.json`](../fixtures/parity-layout.json), with the Orion N5
palette and type scale, and the shared interaction contract I1..I15 intact.

The lane exists to answer two questions for the engine comparison:

1. Can one pinned game pause-menu interface be rebuilt in Unity from `ds-unity` public exports
   without re-deciding layout, colour or copy?
2. Where does the Unity projection help or get in the way for a consumer of this shape?

## Open, run, verify

Prerequisites: Unity **6000.5.3f1** with an activated license (macOS; the screenshot lane builds
the macOS Standalone Player). Override with `UNITY_EDITOR` if needed.

```sh
cd examples/game-pause-menu/unity

# EditMode lane: fixture/parity seam tests + I1..I15 interaction and parity geometry tests.
bash scripts/verify-unity.sh

# Player lane: builds the committed scene, drives the eight capture states declared in
# fixtures/parity-layout.json, writes 1280x800 PNGs + result.json into evidence/.
bash scripts/capture-screenshots.sh
```

Evidence is written to `evidence/` (gitignored). To open interactively: add this folder in Unity
Hub, open `Assets/PauseMenu/Scenes/PauseMenu.unity`, press Play.

### Local package dependency

`Packages/manifest.json` declares the design-system package as a local file dependency:

```json
"com.fullstackds.ui": "file:../../../../packages/ds-unity"
```

Unity resolves a relative `file:` dependency from the project's **`Packages/`** directory, so the
workspace package is four levels up from there (three from the project root). The package is read
from the checkout; no package bytes are copied and nothing under `packages/` is edited.

One import side effect: `packages/ds-unity` ships a few generated files without `.meta`
companions; importing it as a `file:` package lets Unity write those `.meta` files into the
package path (untracked drift). This lane does not commit them; they were removed after the
evidence runs. Completing the package's `.meta` coverage or embedding the package would remove it.

## Parity pass

### Design authority consumed

- [`parity.md`](../parity.md) — rendering rules, per-tab composition order, switch root
  cause, capture states, permitted differences.
- [`parity-layout.json`](../fixtures/parity-layout.json) — the machine-readable
  authority (viewport, colours, type scale, style, switch geometry, header/tab/footer rects, per-tab
  panels/rows/cards/drawer/popover/settings sub-layout, marker/rarity/status colour maps, capture
  states). Copied **verbatim** to `Assets/PauseMenu/Resources/Fixtures/parity-layout.json` and
  parsed by the lane adapter; no layout constant is re-typed in UI code.
- [`parity-check.mjs`](../parity-check.mjs) — the cross-engine probe tool. The lane's
  captures satisfy all 26 of its fixed colour probes (delta 0 at every probe point) when sampled
  with the committed probe list; the committed region-box helper has a tool defect described in the
  report to the Lead (see *Evidence*).

### Absolute geometry

Every region is an absolute rect from the layout authority. The Player log
(`evidence/player.log`, `FSDSPARITY` lines) records the computed boxes inside a real Player:

| Region | Measured worldBound |
|---|---|
| app root | `(0, 0, 1280, 800)` |
| header | `(0, 0, 1280, 104)` |
| tab bar list | `(0, 104, 1280, 56)` |
| tab cell 0 (MAP) | `(0, 104, 320, 56)` |
| content panel (MAP) | `(24, 176, 1232, 552)` |
| map field | `(40, 232, 840, 480)` |
| map marker relay-01 | `(213, 364, 24, 24)` |
| icon-filter switch (relay) | `(1176, 232, 64, 32)`, track radius 16, thumb 24×24 radius 12 |
| footer | `(0, 744, 1280, 56)` |
| paused chip | `(1184, 40, 64, 24)` |
| remap modal panel | `(430, 300, 420, 200)` |

Other pinned boxes implemented from the authority: tab cells at 320×56 (active fill signal,
inactive text `textSecondary`, 1 px `rule` separators); map icon panel `(912, 176, 344, 552)` with
8 rows of 48 px and switches at row x=248/y=8; roster rows at `x=40, firstY=224, h=88`; drawer
`(24, 176, 560, 552)`; ability cards 152×240 at `firstY=224` with 12 px column/row gaps (second row
476..716 inside the 728 panel bottom); detail panel `(848, 176, 408, 552)` with a 2×3 180×60 slot
grid; settings 2×2 panels at `(24/648, 176/460)` with general/controller rows 44 px, remap rows
36 px, audio rows 28 px, language labels/dropdowns at 612/624, swatch label/swatches at 658/670,
preview strip `(664, 694, 576, 26)`; footer nav value right-aligned to x=1256 at y=770.

### Generated vs fallback per region

Generated components carry the structural realization wherever the 48-component Unity allowlist
admits one; the lane stylesheet only pins geometry/state colours the generated sheets cannot
express. Full machine-readable ledger: [`realization-ledger.json`](realization-ledger.json).

| Region | Realization | Notes |
|---|---|---|
| Tab bar cells + content region | **FSDS** `Tabs`/`TabsList`/`TabsTab`/`TabsPanel` | active fill/label painted on the generated `is-selected` state class |
| Header band | hand-authored shell + **FSDS** `Text`, `Badge` | absolute rects from the authority |
| Footer band | hand-authored shell + **FSDS** `Text` | nav value right-aligned per pinned correction |
| Paused chip, rarity chips, status chips, installed chips | **FSDS** `Badge` (+`BadgeContent`) | chip boxes/colours from the authority; status labels 9 px at the chip edge |
| Map / icon / roster / grid / detail / settings panels | **FSDS** `Card` + `CardHeader`/`CardContent` | 40 px panel header strips (36 px in settings), 1 px `rule` borders |
| Ability cards | **FSDS** `Card` + generated `Button` hit target, `Badge`, `Icon`, `Text` | 152×240, rarity chip 64×18 at (8,−9), selected 2 px signal outline |
| Icon filter toggles, general settings toggles | **FSDS** `Switch` | switch parity fix below |
| Map marker detail, ability hover detail | **FSDS** `Popover` family | pinned popover rects (392,272,360,232) and (224,320,320,180) |
| Reputation bars | **FSDS** `Progress` | 200×6, signal fill on graphite track |
| Faction row "cards", drawer actions, remap binding buttons, swatches, popover actions | **FSDS** `Button` | primary signal/onSignal; secondary transparent + `ruleStrong` border |
| Roster rows | generated `Button` rows + `Text`/`Progress`/`Badge` | "OPEN →" affordance at x=1180 |
| Faction drawer | **hand-authored** container + generated children | pinned non-modal overlay rect; admitted `Sheet` is a modal/portal surface (follow-on) |
| Remap capture modal | **hand-authored** overlay + generated children | pinned panel rect; key capture is the lane's root key handler (admitted `Dialog` is a follow-on) |
| Sliders (9) | **engine-native** `Slider` with internals styled from the authority | theme slider has no fill element, lane draws the signal fill clipped at the thumb edge |
| Language dropdowns (2) | **engine-native** `DropdownField` with internals styled | graphite fill, `ruleStrong` border, boneBright text, muted chevron |
| Map plot, grid lines, corner ticks, markers, subtitle preview strip | **hand-authored** app decoration | graphic-grammar regions owned by the app spec |

### Switch parity fix (the "pinched oval" defect)

The generated switch stylesheet projects the token pill radius verbatim
(`--fsds-switch-size-*-track-radius: 9999px`); UI Toolkit does not clamp that to a stadium, so the
64×32 track paints as an ellipse. The lane fixes it explicitly in
`Resources/Styles/PauseMenu.uss` rather than trusting the token:

- `.switch--lg` pinned to 64×32, generated padding/margins stripped;
- track `border-radius: 16px` (= half height, stadium), thumb 24×24 with `border-radius: 12px`;
- OFF: track `graphite` #2E2E29, 1 px `ruleStrong` border, `boneBright` thumb at inset 4;
- ON: track `signal` #EF6A3C with no border, `#191917` thumb, checked offset x=36;
- on/off colours and the thumb's state position are applied from the layout authority's `switch`
  block (and re-applied after silent `SetValueWithoutNotify` changes).

### Pinned corrections consumed

The parity branch was re-merged before the final capture; the lane implements the correction set:
OFF switch colour, nav target in **every** capture state with the right-aligned 13 px/700 signal
value, ability-card boxes/rarity chip, roster `OPEN →`, the settings audio sub-layout, shortened
panel meta lines, mission line `MARS EXPEDITION // COMMANDER D3SO`, wordmark 40 px/800, and the
ink 12% grid / 12 px four-corner map ticks.

### Permitted differences

- Font family fallback and glyph rasterisation; anti-aliasing at rect edges (Unity's UI Toolkit
  default face, uppercase labels and letter-spacing pinned from the authority).
- Tab labels are left-aligned inside the 320 px cells (16 px padding). The authority does not pin
  tab-label alignment; left alignment is required for the committed parity probe points (tab-fill
  probes sample the cell centre) and matches the reference capture's solid-fill sampling.
- Status-chip labels render 9 px (normal weight) at the chip's left edge. The committed probe
  samples the chip fill at `(1118, 250)`, which only stays solid when the tag is a small edge label;
  the pinned prose says 10 px/800 and the JSON type map declares no 9 px chip size.
- Footer nav value uses the `body` type size (13 px) because the type map declares no footer-value
  size; it is right-aligned to x=1256 as pinned.
- Remap rows use the pinned `remapFirstRowY` (496) directly; the earlier authority revision's
  panel-relative value is superseded.
- Native slider/dropdown internals keep Unity theme behaviour; only their visual chrome is pinned.
- Rarity chips use 9 px/800 (pinned prose) although the type map has no 9 px key.

## Interaction coverage

Tested by `Assets/PauseMenu/Tests/Editor/PauseMenuInteractionTests.cs` (EditMode, real UI Toolkit
events, observable state assertions — values, state classes, resolved styles). "Capture" names the
PNG in `evidence/` that shows the resulting state.

| ID | Interaction | Test | Capture |
|---|---|---|---|
| I1 | select MAP/PROGRESS/ABILITIES/SETTINGS | `I1_TabSelection...` | all captures (tab bar) |
| I2 | toggle an icon-visibility switch OFF/ON | `I2_VisibilitySwitch...` | `map.png` (WEATHER MAST OFF) |
| I3 | activate a visible marker | `I3_MarkerActivation...` | `map-popover.png` |
| I4 | SET AS NAV TARGET | `I4_SetAsNavTarget...` | every capture (footer nav target) |
| I5 | unlocked faction drawer | `I5_UnlockedFaction...` | `progress.png` |
| I6 | locked faction drawer | `I6_LockedFaction...` | `progress.png` (locked rows behind drawer) |
| I7 | select an ability, compatible slots | `I7_SelectingAbility...` | `abilities.png` |
| I8 | install into a compatible slot | `I8_CompatibleSlot...` | `abilities.png` (initial installation) |
| I9 | incompatible slot rejects | `I9_IncompatibleSlot...` | not captured |
| I10 | hover an ability card | `I10_HoveringAbility...` | `abilities-hover.png` |
| I11 | toggle a general switch | `I11_GeneralSwitch...` | `settings.png` |
| I12 | adjust a controller slider | `I12_ControllerSlider...` | `settings.png` |
| I13 | remap modal waits then binds | `I13_RemapModal...` | `settings-remap-modal.png` |
| I14 | audio/language/subtitle swatch preview | `I14_AudioSlider...` | `settings-subtitle.png` |
| I15 | cancel drawer/popover/remap modal | `I15_CancelPaths...` | `settings-remap-modal.png` (waiting state) |

Additional tests: install-removal, pinned header/footer copy, four generated tabs + Orion scope,
12 fixture/parity seam tests (malformed fixtures fail loudly with file + JSON path), and parity
geometry tests (absolute rects applied, switch track 64×32 radius 16 / thumb 24 radius 12,
on/off colours from the layout, 8 capture states declared).

## Evidence

Environment: Unity **6000.5.3f1** (c2eb47b3a2a9), macOS Standalone Player (`OSXPlayer`), Metal.

- **EditMode** — `bash scripts/verify-unity.sh`
  - `<test-run result="Passed" total="35" passed="35" failed="0" skipped="0">`
  - `evidence/editmode-results.xml`, `evidence/editmode.log`
- **Player capture** — `bash scripts/capture-screenshots.sh`
  - `evidence/result.json`: `passed=true`, `editor=false`, `platform=OSXPlayer`,
    `width=1280 height=800`, 8 screenshots, 19 checks
  - required four: `map.png` (120,116 B), `progress.png` (139,446 B), `abilities.png`
    (132,995 B), `settings.png` (162,041 B)
  - extra states: `map-popover.png` (142,560 B), `abilities-hover.png` (144,483 B),
    `settings-remap-modal.png` (133,369 B), `settings-subtitle.png` (165,235 B)
  - `evidence/build.log`, `evidence/player.log` (includes the `FSDSPARITY` geometry probe)
- **Parity probe self-check** — the committed `parity-check.mjs` colour probes sampled against
  these captures (all 26 expected colour points, max delta 0). The tool's region-box helper is
  defective in the committed revision: its mask order is inverted (`-fill black -opaque` before
  `-fill white +opaque` makes the mask fully white — `magick … -format %[fx:mean]` = 1) and its
  `-trim` reference corner can sit inside the coloured region (active tabs/chips), so every lane,
  including a lane compared against itself, reports `1xN` boxes and 0.000 fill fractions. This was
  reported to the Lead with a repro; the lane's geometry is verified independently by the Player
  worldBounds above and by the colour probes.

## Findings for the usability comparison

1. **Sheet precedence still costs every consumer.** Generated controls attach `Controls.uss` to
   their own roots; a consumer sheet attached only to an ancestor loses same-specificity ties
   (`.text.text--title` beat `.ability-name`; `.popover` beat `.map-marker-popover`). The lane
   attaches the sheet to every element and uses two-class selectors. A `Theme.AttachAll` helper or
   a README precedence note would remove this trap for every consumer.
2. **Generated Card/Tabs/Badge/Progress/Button made the parity pass materially cheaper than the
   first pass.** The 48-component allowlist turned the first pass's hand-authored panels, rows and
   chips into generated composition; the remaining fallbacks are exactly the shapes parity pins as
   app overlay/engine-native (drawer, modal, sliders, dropdowns, map plot, shell bands).
3. **The switch defect was a projection bug, not a Unity limitation.** The generated track radius
   token is 9999px; pinning explicit stadium radii in lane USS fixed the pinched oval without
   touching the package. This is a crisp package bug: the generated sheet should project the
   stadium from height/2 (or expose a track-radius token that is not the pill token).
4. **Parity probing is now an executable gate — with two tool defects to fix.** The 26 colour
   probes are a good regression net (they caught the stale OFF-switch colours caused by
   `SetValueWithoutNotify` not raising ChangeEvent). The region-box checks need the mask order and
   trim-reference fixes above before they can gate anything.
5. **Pinned absolute geometry is straightforward in UI Toolkit** once the consumer sheet wins
   style ties: every region is a rect, every component is resized inline; the Player log matches
   the authority to the pixel. The awkward parts are generated component chrome (padding/gap
   defaults that must be stripped) and the floating popover placement (generated Popover anchors to
   its trigger; a fixed popover rect is reached with a zero-size anchor 4 px above the target).
6. **The parity pass forced consumer styling of generated state classes** (`is-selected`,
   `is-checked`, `is-open`), which is a stable public surface — but the lane also had to re-apply
   colours after silent state changes, an easy mistake the package could guard with a documented
   "style classes update even when the value does not notify" note.
7. **Engine-native chrome leaks.** Sliders/dropdowns keep Unity theme internals; styling them from
   the JSON took discovery of the theme class names (`unity-base-slider__tracker`,
   `unity-base-slider__dragger`, `unity-base-popup-field__input/text/arrow`) — a package helper or
   documented recipe would remove a per-consumer archaeology step.
8. **Tests stayed cheap:** 35 EditMode tests rerun in ~1.6 s after import; the Player build plus
   eight 1280×800 captures runs in ~90 s.

## Non-claims

- Not a shipping game or an input-system simulation; Player captures set state through the app's
  public API before capturing. No physical device proof.
- Not cross-engine pixel parity proof: this lane's evidence is Unity-side, at the pinned 1280×800
  capture states. Permitted differences above are real and disclosed.
- Native slider/dropdown interaction semantics are Unity's; only their pinned visual chrome is
  claimed.
- Hand-authored shell, map plot, drawer, modal and preview regions are app decoration, not
  component-quality claims.
- `ds-unity` remains outside the TypeScript admission rail; this evidence is local Unity
  6000.5.3f1 + macOS Player evidence, not CI or cross-platform proof.
- The percentage in a reputation bar and the like are fixture values; the lane does not own game
  state.
