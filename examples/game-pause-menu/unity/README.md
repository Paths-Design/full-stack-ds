# Unity lane — Orion N5 game pause menu

A Unity 6 project that realizes the shared game pause-menu app shape
([`../spec.md`](../spec.md)) with the repository's generated UI Toolkit package
[`packages/ds-unity`](../../../../packages/ds-unity). Four tabs — **MAP**, **PROGRESS**,
**ABILITIES**, **SETTINGS** — the shared interaction contract I1..I15, and the Orion N5
graphic style applied through the generated `.fsds-brand-orion` scope.

The lane exists to answer two questions for the engine comparison:

1. Can a dense game pause menu be built from `ds-unity` public exports without reaching
   into the package or rewriting the app spec?
2. Where does the Unity projection help or get in the way for a consumer of this shape?

Claim: the four-tab menu and the I1..I15 semantics run from committed project files against
the workspace package, every region the Unity allowlist does not admit is ledgered, and the
build/test/capture loop is reproducible with the two scripts below.

## Open, run, verify

Prerequisites: Unity **6000.5.3f1** with an activated license (macOS; the screenshot lane
builds the macOS Standalone Player). Set `UNITY_EDITOR` to a different editor binary if needed.

```sh
cd examples/game-pause-menu/unity

# EditMode lane: fixture seam tests + I1..I15 interaction coverage (~2 s after import).
bash scripts/verify-unity.sh

# Player lane: builds the committed scene, drives the six capture states, writes evidence/.
bash scripts/capture-screenshots.sh
```

Both scripts write to `evidence/` (gitignored; reported to the comparison document). To open
interactively: add this folder in Unity Hub, open `Assets/PauseMenu/Scenes/PauseMenu.unity`,
press Play. The only one-time setup is Unity's normal package import.

### Local package dependency

`Packages/manifest.json` declares the design-system package as a local dependency:

```json
"com.fullstackds.ui": "file:../../../../packages/ds-unity"
```

Unity resolves a relative `file:` dependency from the project's `Packages/` directory, not from
the project root — from `examples/game-pause-menu/unity/Packages/` the workspace package is four
levels up. From the project root the equivalent claim is
`../../../packages/ds-unity`. The package is read from the checkout; no package bytes are copied
into this lane and nothing under `packages/` is edited.

One import side effect to know about: `packages/ds-unity` ships a few generated files without
`.meta` companions. Importing it as a `file:` package lets Unity write those `.meta` files into
`packages/ds-unity` (untracked drift). This lane does not commit them; they were removed after
the evidence run. Completing the package's `.meta` coverage, or consuming it as an embedded
package, would remove the side effect.

## Project layout

```
Assets/PauseMenu/
  Runtime/GamePauseMenu.Runtime.asmdef     lane runtime assembly (references FullStackDS.Runtime)
  Runtime/Fixtures/Json.cs                 lane-local JSON reader (offset-carrying errors)
  Runtime/Fixtures/FixtureModel.cs         typed lane domain model
  Runtime/Fixtures/FixtureRepository.cs    the only layer that touches raw fixture shape + validation
  Runtime/App/OrionPalette.cs              appearance-fixture palette for app decoration
  Runtime/App/PauseMenuState.cs            one authoritative interaction store
  Runtime/App/PauseMenuApp.cs              theme scope, shell, generated Tabs, shared interactions
  Runtime/App/Chrome.cs                    header band, footer band
  Runtime/App/MapTab.cs                    map plot, marker popovers, icon visibility filter
  Runtime/App/ProgressTab.cs               faction list + left drawer
  Runtime/App/AbilitiesTab.cs              ability card grid + vehicle loadout
  Runtime/App/SettingsTab.cs               settings sections, remap modal, audio/subtitles
  Runtime/App/PauseMenuHost.cs             UIDocument scene host
  Runtime/App/CaptureHarness.cs            Player screenshot/evidence harness
  Editor/PauseMenuSetup.cs                 idempotent PanelSettings + scene setup, and
                                           PauseMenuBuild.BuildPlayer for the Player witness
  Tests/Editor/                            EditMode seam + interaction tests
  Resources/Fixtures/*.json                verbatim copies of the shared fixture corpus
  Resources/Styles/PauseMenu.uss           lane app chrome (not a package artifact)
  Resources/Styles/PauseMenuTheme.tss      Unity default theme import for the panel
  Scenes/PauseMenu.unity                   committed scene
  PanelSettings.asset                      constant-pixel-size panel, 1280x800 reference
scripts/verify-unity.sh, scripts/capture-screenshots.sh
realization-ledger.json                    machine-readable fallback ledger
```

## Admitted components used (public exports only)

| Generated component | Lane use | Public surface used |
|---|---|---|
| `Tabs` + `TabsList`/`TabsTab`/`TabsPanel` | the four-tab bar and content region | `Value`, `ValueChanged`, `Group.Triggers`, part classes |
| `Switch` | 8 icon-visibility filters, 5 general settings toggles | `Checked`, `Trigger`, `RegisterValueChangedCallback`, `SetValueWithoutNotify` |
| `Popover` + `PopoverTrigger`/`PopoverContent` | 8 map-marker detail surfaces, 10 ability hover surfaces | `Open`, `Trigger`, `Content`, `Placement` |
| `Accordion` + `AccordionItem`/`Header`/`Trigger`/`Content` | the four stacked settings sections | `Type="multiple"`, `Values`, `Group.Synchronize` behaviour |
| `Text` | all labels, values, micro-labels, stat blocks, list corpora | `text`, `Variant`, `Size` |
| `Divider` | hairline rules across shell, drawer, settings | `Orientation` |
| `Icon` | marker glyphs, ability glyphs, footer hints | `Name`, `Size` |

Theme path: `Theme.SetDark(root, true)` then `Theme.SetBrand(root, "orion")` opens the generated
`.fsds-brand-orion` token scope; component colours (switch track, tab text, text colours, focus
ring, zero control radius) resolve from that generated scope. No package file is edited.

## Realization ledger

Every region the Unity allowlist does not admit is a ledgered fallback; the machine-readable
copy is [`realization-ledger.json`](realization-ledger.json). Containers are app layout; the
ledger lists the controls/regions that are not generated components.

| Region | Realization | Why |
|---|---|---|
| Tab bar + content panels | **FSDS** `Tabs` family | admitted; compound parts composed as documented |
| Icon visibility filters, general toggles | **FSDS** `Switch` | admitted; label-host click toggles exactly once |
| Marker detail, ability hover detail | **FSDS** `Popover` family | admitted; click-open contract, hover driven through `Open` |
| Settings sections | **FSDS** `Accordion` family | admitted; `Type="multiple"`, all sections open initially |
| Labels, values, stat blocks, list rows text | **FSDS** `Text` | admitted; hundreds of instances |
| Rules | **FSDS** `Divider` | admitted |
| Marker/ability/hint glyphs | **FSDS** `Icon` | admitted; fixture PascalCase names adapted to catalog kebab keys |
| SET AS NAV TARGET, SHOP PARTS, drawer BACK/CANCEL, faction rows, loadout slots, remap binding, swatches | **Native** `Button` via one helper `Ui.NativeButton` (8 call sites) | Unity allowlist admits no Button (Godot does) |
| Paused chip, D3SO plate, tier/locked/unlocked chips, rarity tags, size tags, ON/OFF chips, footer key hints | **Hand-authored** chip (`Ui.Chip`) | no Badge in the Unity allowlist |
| Faction rows, ability card chrome, map/ability detail bodies, loadout slots | **Hand-authored** containers | no Card in the Unity allowlist |
| Faction reputation bars | **Hand-authored** track + fill | no Progress in the Unity allowlist |
| Controller + audio sliders (9) | **Native** `Slider` with app-side step snapping | none of the three native allowlists admit Slider |
| Audio/subtitle language dropdowns (2) | **Native** `DropdownField` | no Select in the Unity allowlist |
| Subtitle background swatch grid | **Hand-authored** buttons painted from fixture colour options | no colour control in the Unity allowlist |
| Remap capture modal | **Hand-authored** overlay + root key capture | no Dialog/Modal in the Unity allowlist |
| Faction drawer | **Hand-authored** ScrollView panel at the content region's left edge | no Drawer/Sheet in the Unity allowlist |
| Map plot, grid, contour ticks, sector/scale labels, N5 watermark, shell bands, subtitle preview strip | **App decoration** | graphic-grammar regions owned by the app spec, not component contracts |

## Theme and appearance

- Control theming is the generated brand path (above).
- App-level Orion graphic grammar (sage map ground, signal-orange active tab / nav-target marker /
  action strip, rarity and locked colours, micro-label tracking) is **not** exposed by the
  generated semantic-token projection, so the lane reads those raw values from the shared
  lane-consumption copy `fixtures/orion-appearance.json` through `OrionPalette` and paints the
  decoration from C#. The active-tab fill is applied to the generated Tabs `is-selected` state
  class (the generated sheet's `tab--active` selector is a documented `uss-selector` gap in the
  package README). This is app chrome, not a component-color claim.
- The lane stylesheet is attached to **every lane element**, not only to the app root. Generated
  controls attach the package sheet to their own root, so an ancestor-only consumer sheet loses
  same-specificity ties; see the first finding below.

## Interaction coverage

Tested by `Assets/PauseMenu/Tests/Editor/PauseMenuInteractionTests.cs` (EditMode, UI Toolkit
events, observable state assertions). "Capture" names the PNG in `evidence/` that shows the
resulting state.

| ID | Interaction | Test | Capture |
|---|---|---|---|
| I1 | select MAP/PROGRESS/ABILITIES/SETTINGS | `I1_TabSelectionSwapsContentAndStylesExactlyOneActiveTab` | every capture (tab bar) |
| I2 | toggle an icon-visibility switch OFF then ON | `I2_VisibilitySwitchHidesAndRestoresOnlyItsMarker` | `map.png` (WEATHER MAST HIDDEN) |
| I3 | activate a visible marker | `I3_MarkerActivationOpensAnchoredPopoverWithDetail` | not captured (surface closes on I4) |
| I4 | SET AS NAV TARGET | `I4_SetAsNavTargetUpdatesFooterHighlightAndClosesPopover` | `map.png` + footer in every capture |
| I5 | unlocked faction drawer | `I5_UnlockedFactionOpensDrawerWithDetailsAndEnabledShop` | `progress.png` (ARES LOGISTICS, SHOP PARTS enabled) |
| I6 | locked faction drawer | `I6_LockedFactionDrawerStatesRequirementAndDisablesShop` | `progress.png` shows locked rows behind the drawer |
| I7 | select ability card, compatible slots highlighted | `I7_SelectingAbilityMarksItAndHighlightsCompatibleSlots` | `abilities.png` (OVERCLOCK, 3 compatible slots) |
| I8 | install into compatible slot (replacing) | `I8_CompatibleSlotInstallsAbilityAndReplacingSlotMovesInstallation` | `abilities.png` shows initial installation |
| I9 | incompatible slot rejects | `I9_IncompatibleSlotRejectsWithoutInstalling` | not captured |
| I10 | hover an ability card | `I10_HoveringAbilityCardOpensStatsPopoverAndHoverOutClosesIt` | not captured |
| I11 | toggle a general switch | `I11_GeneralSwitchFlipsExactlyOnceAndRowReflectsIt` | `settings.png` |
| I12 | adjust a controller slider | `I12_ControllerSliderSnapsUpdatesValueAndIsDisplayed` | `settings.png` |
| I13 | remap modal waits then binds the next key | `I13_RemapModalWaitsThenCapturesTheNextKey` | `remap-modal.png` |
| I14 | audio slider + language dropdowns + subtitle swatch | `I14_AudioSliderLanguagesAndSubtitleSwatchUpdateLivePreview` | `subtitle-picker.png` |
| I15 | cancel drawer / popover / remap modal | `I15_CancelPathsReturnToPriorStateWithoutChangingData` | `remap-modal.png` shows the waiting state |

Additional coverage: `InstalledAbilityCanBeRemovedFromItsSlot`, `ShellChromeRendersCommanderReadoutAndControlHints`,
`AppMountsWithFourGeneratedTabsAndOrionThemeScope`, and 13 fixture seam tests
(`FixtureSeamTests.cs`) that fail loudly on malformed fixture copies.

Fixture seam tests assert, per file and JSON path: missing member, wrong type, out-of-range
coordinate/reputation/slider value, duplicate id, unknown vehicle ability reference, locked
faction without a requirement, unknown subtitle option, non-`#RRGGBB` palette value, dangling
`navTarget`, JSON syntax/duplicate-key/trailing-content errors, and that every fixture icon name
maps to the generated glyph catalog key form.

## Evidence (produced by the committed scripts)

Environment: Unity **6000.5.3f1** (c2eb47b3a2a9), macOS Standalone Player (`OSXPlayer`), Metal.

- **EditMode lane** — `bash scripts/verify-unity.sh`
  - result: `total=31 passed=31 failed=0 skipped=0`, `<test-run ... result="Passed">`
  - `evidence/editmode-results.xml`, `evidence/editmode.log`
- **Player capture lane** — `bash scripts/capture-screenshots.sh`
  - `evidence/result.json`: `passed=true`, `editor=false`, `platform=OSXPlayer`,
    `width=1280 height=800`, six screenshots, 13 checks
  - screenshots (1280x800): `evidence/map.png` (131,118 B), `evidence/progress.png` (151,523 B),
    `evidence/abilities.png` (124,063 B), `evidence/settings.png` (130,186 B),
    `evidence/remap-modal.png` (121,199 B), `evidence/subtitle-picker.png` (101,828 B)
  - `evidence/build.log` (Player build), `evidence/player.log` (Player run incl. layout probe)
- The four required tab captures are `map.png`, `progress.png`, `abilities.png`, `settings.png`.
  `remap-modal.png` and `subtitle-picker.png` are extra interaction captures for the comparison
  document.
- Capture states: map — nav target `SUPPLY CACHE 02` set and `WEATHER MAST` filtered off;
  progress — ARES LOGISTICS drawer open; abilities — OVERCLOCK selected with compatible slots
  highlighted; settings — General + Controller section; remap modal — waiting for input;
  subtitle picker — SIGNAL background picked, subtitle language Français, live preview strip.

## Findings for the usability comparison

1. **The consumer-sheet precedence trap is the sharpest edge.** Generated controls attach
   `Controls.uss` to their own root (`Theme.AddStyleSheet(this)`), so a lane sheet attached only
   to the app container *loses* same-specificity ties to generated variant rules
   (`.text.text--title` beat `.ability-name`; `.popover` beat `.map-marker-popover`, which
   resolved `position: relative` and laid markers out in flow). The fix is an app-level one:
   attach the consumer sheet to every element (one traversal) and use two-class selectors
   (`.pause-app .ability-name`). This is a documented consumer recipe now, but every consumer
   will hit it; a `Theme.AttachAll(root, sheets)` helper or a README section on sheet precedence
   would pay for itself.
2. **Compound composition is genuinely good.** Tabs, Accordion and Popover compose from public
   part elements exactly like the web API; state classes (`is-selected`, `is-open`, `is-checked`)
   made every interaction assertable without package internals. The tab bar, settings sections
   and all toggles were the cheapest regions in the lane.
3. **Coverage gap dominates the visual result.** The Unity allowlist (7 components) had no
   Button, Badge, Card, Progress, Slider, Select, colour control, Dialog or Drawer. Those are
   most of a game pause menu, so hand-authored/native chrome carries the majority of the screen. The
   design-system inheritance shows through in the tab bar, toggles, sections, popovers,
   typography, rules and icons — not in the faction rows, ability cards, loadout or settings
   controls. Native `Slider`/`DropdownField` keep Unity's default theme chrome (rounded, grey),
   which visibly fights the Orion zero-radius grammar in `settings.png`/`subtitle-picker.png`.
   This is the strongest engine-side argument for admitting Button/Badge/Card next.
4. **Floating content needs the consumer to know it leaves the tree.** Popover content portals to
   the panel root, so theme classes mirror automatically (verified: dark/brand scope survives the
   portal) but app-chrome classes do not. The README documents applying overrides to
   `popover.Content`; in practice the lane carries its `pause-app` class onto the content element
   so lane rules keep matching. A one-line contract note ("content is not a descendant of its
   owner") or an `onPortal` hook would remove the surprise.
5. **Hover is not a Popover fact.** The abilities tab needs a hover tooltip; the contract's
   Popover is trigger/click-open. Opening `Open` from pointer-enter/leave is ~6 lines and worked,
   but the trigger's own click still toggles, so a card click both selects and opens. A
   hover-intent channel (or documenting `Open` as the escape hatch) would make this explicit.
6. **Small component gaps that forced app code:** no Slider step prop (app-side snapping), no
   `text-transform` (uppercase strings live in the adapter), no `gap` in USS (dense card/grid
   spacing is margins), unsupported line-height/intermediate weights (micro-label density tuned
   per element). Individually small, together they are why the lane's USS is ~1,400 lines.
7. **The brand path works and is cheap.** `Theme.SetDark` + `Theme.SetBrand(container, "orion")`
   resolved the generated token scope with zero package changes; zero control radius, dark
   surfaces and orange accents came through. The raw signal/sage/alert graphics needed by the app
   spec are not in the semantic projection, so the lane reads `orion-appearance.json` for
   decoration — honest, but it means Unity's "brand is fully generated" claim stops at components.
8. **The test loop is good.** EditMode + a real Player window are both scriptable from committed
   files; the full lane (fixtures + 31 tests) reruns in ~2 s after import and the Player capture
   (build + six states) takes ~90 s. That is a better comparative proving surface than an Editor
   screenshot.
9. **Local-package ergonomics:** relative `file:` resolution is from `Packages/`, not the project
   root (a 30-second log read to discover), and the missing `.meta` files in the package cause
   untracked drift inside `packages/ds-unity` on import. Neither blocks the lane, both are worth
   fixing in the package/repo.

## Non-claims

- Not a shipping game or a game-framework integration; no backend, no persistence, no input
  system simulation. Engine screenshots are sampled states, not physical-device proof.
- The Player harness changes app state through the app's own public API before capturing; it
  proves the panel renders those states in a standalone Player, not that a physical gamepad or
  mouse produced them. Native control visuals are Unity theme chrome and are not design-system
  quality claims.
- Not cross-engine pixel parity: type metrics, focus models and native control chrome differ by
  design. Not an accessibility adequacy claim (focus paths exist; no a11y standard is claimed).
- Hand-authored regions are app-layer decoration; their appearance is not a component-quality
  claim. The map plot and shell bands are not design-system realizations.
- `ds-unity` remains outside the TypeScript admission rail; this lane's evidence is local build,
  local EditMode and local macOS Player evidence for Unity 6000.5.3f1, not CI or cross-platform
  proof.
