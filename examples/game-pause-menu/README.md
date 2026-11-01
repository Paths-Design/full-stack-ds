# Game pause menu — Orion N5

A game pause menu for the fictional *Orion N5 — Mars Expedition* game, realized
as three native consumer lanes over the repository's generated design-system
packages: **GPUI**, **Unity UI Toolkit**, and **Godot**.

This is an **app shape** in the [`examples/`](../README.md) portfolio: a
consumer-side proving surface for engine transfer and cross-engine
implementation comparison, not a shipping game and not a usability study. The
framework-neutral authority is
[`spec.md`](spec.md); every lane is a realization of it, not its own design.

The menu uses the **Orion N5 palette and HUD grammar**: hard-edged charcoal
panels, a full-width signal-orange tab band, mint map/dossier fields, a steel
shell/footer, hairline rules, uppercase Inter micro-labels and square corners.
The style is registered as the `orion` brand in
[`packages/ds-tokens/src/brands/orion.tokens.json`](../../packages/ds-tokens/src/brands/orion.tokens.json)
(`data-brand="orion"`). Three restyle passes now give the menu the reference's orange tab band, mint
header/footer and map/dossier fields, a 160 px grey ghost `N5` display layer,
steel shell gaps, 2 px industrial panel frames and the GPUI modal scrim. The source-design oracle audit moved
from 90 violations / 0 clean observations to **30 / 6**: settings meets the
bands, abilities misses the ink ceiling by ~1.7 points, map/progress carry more
mint than the reference collage band, and the full-screen remap modal is
dominated by its scrim. Industrial framing and per-tab mint/grey field
conversion are still not claimed; the review record is
[`evidence/visual-review.md`](evidence/visual-review.md).

## Portfolio entry

| Question | Answer |
|---|---|
| **Claim** | One game pause-menu app — four tabs, 15 shared interactions, one fixture corpus — can be realized on GPUI, Unity UI Toolkit and Godot from each engine's generated DS package with the same semantics, using public package exports only, and every region the component allowlist does not admit is ledgered as a lane-local fallback rather than counted as design-system realization. |
| **Falsifier** | A lane cannot build/run from committed files; a lane reaches into generated internals or edits a package; the same interaction breaks in one lane with no ledgered engine-capability reason; the app spec must be rewritten per engine; or the `orion` brand fails the token gates / is unreachable on the target that claims brand support. |
| **Stress axis** | Density and composition: tabs, overlays (popover, left drawer, input-waiting modal), master-detail list→drawer, card grid with rarity tags and hover detail, form controls (switch, slider, dropdown, color picker), brand/theme delivery, and gamepad/keyboard focus. |
| **Transfer** | The app spec is engine-neutral. Lanes differ in idiom (UXML/USS vs `.tscn`/GDScript vs Rust views) but not in tab set, data meaning, or interaction result. |
| **Evidence closure** | Each lane's README names its build/test/capture commands; per-lane build logs, test results and four-tab screenshots are produced under `tmp/game-pause-menu/<engine>/` from committed sources plus each lane's documented setup step. |

## Parity pass — one interface, three engines

The first realization produced three visibly different interfaces. A second
slice (`GAME-PAUSE-MENU-PARITY-01`) pinned a single design authority and rebuilt
all three lanes to it:

- [`parity.md`](parity.md) and [`fixtures/parity-layout.json`](fixtures/parity-layout.json)
  define the absolute 1280 × 800 grid, colours, type scale, per-tab rects,
  switch geometry, icon-art tiles and the eight capture states. Every lane
  consumes a verbatim copy of the JSON through a typed, validating parser; no
  layout number is re-typed in app code.
- Verification: the committed [`parity-check.mjs`](parity-check.mjs) samples 195
  fixed pixels across the four probed states (layout extents, panel/tab/chip
  boxes, switch pill geometry, thumb centres), measures 117 typography
  bbox/ink values, computes 24 pairwise RMSE comparisons for all eight captured
  states, and compares 24 committed lossless-WebP image goldens. The reviewed
  run reports **0 failures**; labelled montages and difference images land under
  the checker's `--out` directory.
- Cross-engine residual after the pass: **glyph anti-aliasing/hinting and
  sub-pixel baseline rounding on the one shared Inter face**, plus the Unity
  body-copy weight residual deliberately absorbed by the 45 % ink tolerance.
  Family, weights, sizes, tracking, line heights and copy wraps are pinned;
  geometry, colours, copy, component states and control shapes agree within the
  declared probe/tolerance matrix.
- **Bounded claim.** The evidence supports parity for the eight captured
  1280 × 800 states on the pinned macOS host, within the documented tolerances,
  with committed image goldens and a token-consumption gate. It does **not**
  support pixel identity, a full state/transition matrix, other DPI/backends/
  OSes, physical-input parity, accessibility or usability parity, or full
  source-design composition fidelity. The restyle pass is recorded in
  [`evidence/visual-review.md`](evidence/visual-review.md); the oracle audit now
  records 30 composition violations across 24 lane/state observations (6 clean)
  and still flags the abilities/settings ink/mint balance. The coverage matrix
  and conditions for a stronger claim are in
  [`evidence/parity-matrix.md`](evidence/parity-matrix.md).

### Why the switches looked like pinched ovals — and the fix

Three engines rendered three different switches for the same component because
the design system's "pill" is a token value rather than a geometry contract:

- **Unity** projected the token `switch...track.radius → 9999px` verbatim into
  USS. UI Toolkit treats `border-radius` as per-corner *elliptical* radii and
  does not collapse an oversized value into a stadium, so the 64 × 32 track
  painted as an ellipse. Fixed at both levels: the package's USS projection now
  clamps oversized corner radii to half the rule's smaller known dimension
  (`packages/ds-codegen/src/frameworks/unity/uss.ts`, unit-tested; Switch md
  12 px, lg 16 px, Button 16 px, badges/chips/dialogs et al. get stadium radii),
  and the lane sheet pins explicit 16 px track / 12 px thumb radii as
  belt-and-braces.
- **GPUI**'s generated large Switch carried large-action root chrome (16 px
  inline padding, 8 px block padding, 12 px gap, 48 px minimum box), which
  inflated the component to 96 × 48 and offset the 64 × 32 track by (16, 8);
  the lane had also overridden the thumb radius to 0. Fixed by pinning
  `semantic.action.size.large.*` to zero, using the JSON track/thumb radii, and
  pre-theming separate ON/OFF entities for the border contract.
- **Godot**'s generated boolean runtime is a `CheckButton` painted with
  default-theme icons: it never received the Orion fill, so the ON state looked
  like a plain light pill. Fixed with 64 × 32 SVG icon overrides for
  checked/unchecked that draw the JSON stadium, thumb and colours, with the
  lane-local theme emptying the CheckButton state styleboxes.
- The common root cause is recorded in [`parity.md`](parity.md): an oversized
  corner radius is a token value each engine interprets differently. The
  package-level USS clamp removes the Unity manifestation for every consumer;
  the GPUI/Godot lanes pin their composite/icon realizations.

### Design-token provenance

The authority is token-aware rather than a parallel palette: all 19 colours
carry a `colorTokens` entry (semantic token + `dark`/`light`/`both` mode) and
all 21 type values carry a `typeTokens` entry. Eleven colours resolve through
existing Orion semantic tokens in dark mode, five use the brand's light-mode
values for the light content surfaces embedded in the dark chrome, and the
three graphic status/surface hues (`moss`, `alert`, `clear`) are new Orion brand
tokens. The app-specific type sizes (11/13/28 px) plus the 160 px ghost display size are new Orion
`typography.graphic.size.*` tokens; the rest map to the core typography ramp and
zero tracking token. `node scripts/game-pause-token-provenance.mjs` fails if any
excerpted value drifts from `resolved.tokens.json` + `orion.tokens.json`.
At runtime, GPUI embeds both token files and resolves its parsed palette/type
scale from the provenance maps at load, and Godot's `setup.sh` copies them into
`res://fixtures/ds-tokens/` for its `TokenResolver`; neither lane renders from
the legacy `orion-appearance.json` palette copy.

The Unity projection now emits every brand-layer variable that resolves to a USS
scalar, growing Orion's generated brand scope from 93 light / 68 dark variables
to 217 light / 123 dark, including the brand-only graphic surface/status roles.
The Unity parity lane uses the generated `Card` component's token variables for
panel/ability-card surfaces. This is a **ledgered migration started**, not a
completed token-channel migration: 318 → 315 direct inline assignments, with the
remaining writes and channel classification recorded in
[`unity/token-channel-ledger.md`](unity/token-channel-ledger.md).

### Icon art

The first parity montage still showed two glyph languages (Unity/Godot catalog
icons) and one placeholder (GPUI has no Icon component). Icon surfaces are now
pinned to a portable code language in `parity-layout.json` `iconArt`: 16 × 16
`graphite`/`ruleStrong` tiles holding explicit two-letter codes for the
icon-visibility rows (`IN, PL, HO, BL, AL, CD, CR, US`), and 40 × 40 tiles
holding the first two letters of each ability name on ability cards
(`TH, OV, IO, …`). Generated `Icon` remains the realization elsewhere; on these
two parity surfaces the shared code tile is the art.

### Typography parity — one face, two weights, zero tracking

The first parity montage still showed three type languages: GPUI rendered the
native system face, Unity its UI Toolkit default, and Godot a `SystemFont`
fallback, with different weights and tracking. The typography pass pins all
three to the Orion brand face **Inter 4.1** (static Regular 400 / Bold 700,
vendored under [`fonts/`](fonts/README.md) with the SIL OFL licence) and loads
the exact same bytes in each engine: GPUI via `TextSystem::add_fonts`, Unity
via imported `Font` assets in `Resources/Fonts`, Godot via `FontFile` resources
copied into `res://fonts` by `setup.sh`.

- **Two weights only.** The 600/800 requests from the first pass are retired:
  labels, values, titles, tabs, chips and buttons are 700; body, row
  secondaries, metadata and hints are 400. All three engines map the same way
  (GPUI weight variant + token override, Godot file selection, Unity
  `FontDefinition` per weight with `FontStyle.Normal` so no faux bold is drawn).
- **Zero tracking.** The pinned GPUI renderer exposes no letter-spacing
  channel, so `type.letterSpacingMicro/Tab` are pinned to 0 and every engine
  stops applying tracking. That is stricter than accepting a per-engine
  divergence.
- **Line heights and vertical alignment** are pinned (labels 1.0 / body 1.2);
  wrapped body copy is top-aligned at its pinned y, chip labels are centred,
  and the footer hint string uses `white-space: pre` on Unity so UI Toolkit
  does not collapse its triple-space separators.
- **GPUI stroke weight.** The pinned gpui_macos renderer dilates glyphs while
  macOS font smoothing is enabled, so GPUI's Inter Bold read heavier than the
  other two engines even at identical widths. The GPUI lane now sets
  `AppleFontSmoothing = 0` in its own preferences domain before the text system
  starts (no global setting touched); row-label ink coverage moved from 0.479
  to 0.343 against Unity 0.332 / Godot 0.342. The checker's ink-coverage probe
  makes the weight comparable and fails on regression.
- **Verification:** the shared checker measures **39 pinned text strings × 3
  engines = 117 bbox + ink-coverage measurements** per run (wordmark, stat
  labels/values, tab labels, panel titles/metas, row labels/secondaries, field
  note, footer hints, nav target, drawer title/tagline/body, chips, dossier,
  card/detail copy, settings labels and values) and fails on >±4 px x/y,
  >±6/±5 px w/h or >25 % ink-coverage deltas. The final run reports
  **0 failures**, with Unity's dynamic-font rasterisation the widest geometric
  residual (≤4 px on 10 px labels).

## The app

Base viewport 1280 × 800, full-screen pause overlay:

1. **Header** — `ORION N5` wordmark + `MARS EXPEDITION`; commander readout of
   **ranking** (rank, level, global position), **earnings** (credits) and
   **total followers**; `PAUSED` status chip.
2. **Tab bar** — `MAP`, `PROGRESS`, `ABILITIES`, `SETTINGS` (exactly one active).
3. **Content region** — the active tab.
4. **Footer** — control hints and current nav-target summary.

| Tab | What it contains |
|---|---|
| **Map** | Stylized sector plot with markers; a switch per map-icon kind toggles marker visibility; activating a marker opens an anchored detail popover with **SET AS NAV TARGET**; commander stat block. |
| **Progress** | Faction roster with locked/unlocked state and requirement; selecting a row opens a **left-side drawer** with description, history, perks, parts table and **SHOP PARTS** (disabled while locked). |
| **Abilities** | Card grid with icon, rarity tag over the top edge and size; hover/selected detail popover; vehicle loadout with six sized slots — select a card then a compatible slot to install, incompatible slots reject, installed cards are marked. |
| **Settings** | General switches; controller sliders; controller remap whose binding button opens a **modal that waits for the next key/button**; audio/subtitle sliders, two language dropdowns and a subtitle-background color picker with a live preview strip. |

The 15-interaction contract (I1–I15) and acceptance bar live in
[`spec.md`](spec.md).

## Data

Static, hand-authored fixtures read once at startup (no backend, no network):

| Fixture | Contents |
|---|---|
| [`fixtures/commander.json`](fixtures/commander.json) | Identity, rank, earnings, followers, initial nav target. |
| [`fixtures/map-icons.json`](fixtures/map-icons.json) | Sector meta plus eight map icons (kind, position, visibility, status, distance, detail, reward). |
| [`fixtures/factions.json`](fixtures/factions.json) | Five factions (two locked) with reputation, requirement, detail, perks, parts. |
| [`fixtures/abilities.json`](fixtures/abilities.json) | Ten abilities with rarity, size, icon, stats and detail. |
| [`fixtures/vehicle.json`](fixtures/vehicle.json) | Six sized loadout slots and their current installs. |
| [`fixtures/settings.json`](fixtures/settings.json) | General toggles, controller sliders, remap bindings, audio sliders, languages, subtitle background options. |
| [`fixtures/orion-appearance.json`](fixtures/orion-appearance.json) | Lane-consumption copy of the Orion palette + graphic constants for targets without brand-graph loading. |

Each lane owns a lane-local copy of the fixtures it embeds and a lane-local
parser; the JSON shape is identical across lanes. Malformed fixtures are
authoring errors that fail the lane's parse test loudly.

## The `orion` brand

The brand layer is the authority for the palette. Adding it is one token file
plus a rebuild:

- `packages/ds-tokens/generated/tokens.css` gains `@layer brand` scopes for
  `[data-brand="orion"]` in light and dark, and the contrast gate evaluates the
  brand as one more instantiation — 648 curated WCAG AA pairs across the base
  tree plus all 11 brands × 2 themes.
- The generated Unity stylesheet gains `.fsds-theme.fsds-brand-orion` scopes
  (light + dark), so a Unity consumer selects it with
  `Theme.SetBrand(container, "orion")`; the stylesheet on this branch is
  generated from the current target (48 admitted Unity components) and carries
  the brand tokens alongside them.
- The brand carries zero control/card/component radii, compact density, heavy
  heading weight, and dark/light semantic surfaces; the app-level graphic
  grammar (orange action strip, sage map ground, micro-label caps, oversized
  numerals) is composed by each lane from the palette.

Gates that hold the brand: `pnpm tokens:validate`, `pnpm tokens:build`,
`pnpm tokens:check-brand-refs`, `pnpm tokens:check-contrast`, plus a stable
`pnpm run generate:unity` (the committed sheet carries the brand scopes).

GPUI has no brand-graph loader (explicit token overrides only) and Godot has no
resolved brand projection; those two lanes apply the same palette through
their engine's theme mechanism and state that in their READMEs.

## Lane matrix

| Concern | GPUI | Unity UI Toolkit | Godot |
|---|---|---|---|
| Package | `packages/ds-gpui` | `packages/ds-unity` | `packages/ds-godot` |
| Allowlist at the parity pass | 7: Switch, ToggleSwitch, Checkbox, Text, Badge, Divider, Stat | **48** (the `UNITY-*-01` admission series landed while the first pass was in flight) | 10: Switch, Accordion, Popover, Tabs, Text, Divider, Button, Badge, Card, Icon |
| Generated components used by the lane | 5 of 7: Switch, Text, Badge, Divider, Stat (ToggleSwitch/Checkbox have no spec region; icon art is a pinned code tile because GPUI admits no Icon) | 11 of 48: Tabs family, Switch, Popover family, Card family, Badge, Button, Progress, Text, Divider (Icon admitted; parity icon surfaces use code tiles) | 9 of 10: Tabs, Switch ×13, Popover ×2, Button, Badge ×~27, Card ×10; Accordion unused, Text/Divider/Icon admitted-but-unused (baked scales/colours have no override channel — ledgered finding) |
| Brand path | explicit `Theme::with_token` per instance; no brand-graph loader | generated `.fsds-brand-orion` scope via `Theme.SetDark` + `Theme.SetBrand` | lane-local Orion `Theme` built from the appearance fixture; no resolved brand projection |
| Build / test | `cargo +1.94.1 build --locked` 0 warnings; 70 tests (73 with `--features capture`) | Unity 6000.5.3f1 EditMode: 37 tests pass; standalone Player capture `passed=true`, eight 1280 × 800 states + witness checks | Godot 4.7.2 headless: 209/209 checks pass (I1–I15 + parity geometry + icon art + fixture negatives + all-role token consumption, viewport input dispatch); setup <1 s |
| Screenshot path | `Window::render_to_image()` behind a lane `capture` feature; 8 states | Standalone macOS Player + `ScreenCapture`; 8 states | Viewport texture capture in a windowed run; 8 states |
| Lane evidence | `tmp/game-pause-menu/gpui/` | `tmp/game-pause-menu/unity/` | `tmp/game-pause-menu/godot/` |
| Parity result | **pass** — 195-pixel checker, 0 failures; montage identical to Unity/Godot apart from fonts | **pass** | **pass** |

## Usability comparison

### Method and its limits

One framework-neutral spec, one fixture corpus, the same 15 interactions and the
same Orion appearance were handed to three independent lane implementations, each
consuming only its engine package's public exports plus engine-native/hand-authored
fallbacks that it had to ledger. The comparison below is a judgment over the
lanes' READMEs, the code they produced and the captured states — not a benchmark
and not a pixel-parity test.

The comparison was made in two rounds. The first realization measured each
engine against the allowlist it had: Unity at that moment admitted only 7
components, so most of its screen was ledgered native/hand-authored chrome. The
parity pass then rebuilt the same interface on current `main` — Unity now
consumes 11 of its 48 admitted components (Tabs, Switch, Popover, Card, Badge,
Button, Progress, Text, Divider) — and pinned one absolute layout for all three
engines. The usability findings below describe where each package still helps or
fights a consumer; they are observations over the lanes' code and READMEs, not a
benchmark, and the parity pass supersedes the earlier visual differences.

### Verdict at a glance

| Dimension | GPUI | Unity UI Toolkit | Godot |
|---|---|---|---|
| DS coverage of a dense game menu | **weakest** — no structural/overlay/form components at all; DS realizes toggles, text, tags, rules and stats | **middle** — compound Tabs/Accordion/Popover are excellent, but no Button/Badge/Card/Progress/Slider/Select/colour/modal at base | **strongest** — tabs, popovers, buttons, badges, cards and icons are all generated |
| Fraction of the screen carried by generated components | smallest (switches, text, badges, rules, stats; everything structural is app code) | middle (tabs, settings sections, all toggles, popovers, text/rules/icons; rows/cards/buttons/metrics are fallbacks) | largest (tabs, buttons, badges, cards, popovers, toggles) |
| Brand / theme delivery | manual per-instance token overrides — controls restyled exactly, but no brand graph | **best** — one `Theme.SetBrand("orion")` opens the generated brand scope | manual theme resource; no resolved brand projection (a stated target gap) |
| Composition friction that cost the most time | no Tabs/Popover/Overlay/Button/Slider/Select; intrinsic text sizing in nested flex; hand-designed dismissal/focus | consumer-sheet precedence trap (generated controls self-attach the package sheet); detached popover content loses app classes; native slider/dropdown chrome fights the graphic style | generated `Text` min-width collapse (one char per line inside HBox/VBox/absolute chrome); popover content needs its own theme scope and viewport clamp |
| Iteration speed | slowest first build (renderer graph + pinned toolchain); fast incremental rebuilds | slowest loop in practice (domain reload/import; standalone Player build for visual states) | **fastest** — scene runs instantly; windowed capture writes PNGs directly |
| Verification tooling | good: dependency-free frame capture via `render_to_image` (behind `test-support`), rich seam tests | **strongest**: real EditMode harness with UI events + standalone Player capture + strict fixture seam | good: headless logic run for the seam, windowed viewport capture for visuals |
| Visual control of fallbacks | total (every pixel is app code) but that is the cost | native controls partially resist the style (rounded grey sliders/dropdowns) | native controls restyle well through the lane Theme; best fallback integration |

### GPUI — most custom control, least design system

GPUI's target admits only seven basic components, so the lane used the DS for
boolean controls, typography, tags, rules and stat readouts and hand-authored
everything structural: tab bar, map plot/markers/watermark, marker popover,
faction roster + left drawer, ability card grid + hover tooltip, loadout rows,
action buttons, stepped sliders, language dropdowns, colour swatches, remap
modal and page frame. The generated `Switch`/`Text`/`Badge`/`Divider`/`Stat`
surface is clean and its controlled-state contract (`ChangeRequest`, explicit
owner acceptance, `set_*` setters) is the best-designed state handshake of the
three; `Badge` conveniently covers rarity tags, status chips and installed
marks.

What hurt: (1) intrinsic text sizing collapsed inside nested flex/scroll
containers until every text site was wrapped in an explicit-width container —
the same class of problem Godot hit, in a different typography component;
(2) there is no overlay/dismissal/focus contract, so Escape precedence, backdrop
dismissal and focus routing had to be designed and seam-tested by the lane;
(3) nine sliders, two dropdowns and a colour picker are hand-authored, which is
the single largest interaction cost; (4) there is no brand loader, so each
instance needs ~8 token overrides to express an Orion switch.

Upside: the seam is pure Rust and directly unit-tested (49 tests), the app has
exact rendering control, and `render_to_image` gives the most reproducible
screenshot evidence once the lane opts into the renderer's `test-support`
feature. Environment finding: Xcode 26 without the standalone Metal Toolchain
cannot build the pinned renderer's precompiled shaders; the lane uses upstream's
`runtime_shaders` feature on the same zed revision (ledgered in its README).

### Unity UI Toolkit — best compound composition and brand path; slowest loop and a sheet-precedence trap

Unity at the slice base had the compound controls that matter most for a menu
(Tabs, Accordion, Popover) and the lane's settings tab and tab bar were its
cheapest regions: composition uses the same public part elements as the web API,
state classes (`is-selected`, `is-open`, `is-checked`) make every interaction
assertable, and `Theme.SetDark` + `Theme.SetBrand("orion")` resolves the
generated brand scope with no package edits. The EditMode + standalone Player
test loop is the strongest verification surface of the three.

The costs: (1) **the sharpest consumer trap found in this exercise** — generated
controls attach the package stylesheet to their own root, so a lane sheet attached
only to the app container loses same-specificity ties and, e.g., a popover
resolves `position: relative`; the fix is attaching the consumer sheet to every
element plus two-class selectors, which every consumer will hit;
(2) detached popover content leaves the app tree, so theme mirrors automatically
but app chrome classes must be carried manually; (3) the 7-component allowlist
left rows, cards, badges, buttons, progress bars, colour swatches, the drawer and
the remap modal as native or hand-authored fallbacks — most of the screen — and
native `Slider`/`DropdownField` keep Unity's rounded grey chrome, visibly fighting
the zero-radius Orion style; (4) USS misses `gap`, `text-transform`, line-height
and intermediate weights, which is why ~1,400 lines of lane USS exist; (5) local
`file:` package resolution is from `Packages/` and the package's missing `.meta`
files cause untracked import drift.

The parallel `UNITY-*-01` admissions answer the coverage half of this: Button,
Badge, Card, Progress, Tooltip, Dialog, Sheet, Select, Input and more are now in
the target, which should move most of the ledgered fallbacks into generated
controls and make Unity the strongest of the three for this app shape once the
lane is re-run. The sheet-precedence and detached-content findings remain valid
regardless of coverage.

### Godot — richest native allowlist and fastest loop; generated typography and surface channels are the tax

Godot admitted the widest useful component set for this menu (10, including Button,
Badge, Card and Icon) and the lane was the most productive substrate: the tab bar,
ability-card grid with rarity badges, marker popover, action buttons, drawers and
status chips are generated components composed from public APIs; native
`HSlider`/`OptionButton` fallbacks restyle cleanly through the lane's Orion theme,
so the fallback regions still read as the same product. The loop is fast: setup is
sub-second, 134 headless checks run in 3.6 s, and the windowed capture writes eight
1280×800 PNGs in 2.9 s.

The tax is in missing channels rather than coverage: (1) generated `Text`
projects a fixed light-theme foreground and its autowrapped label reports a
~1-character minimum width, so it collapses to one character per line as an
HBox child or absolute node — the same class of defect GPUI hit; (2) only
action/composite runtimes (Button/Badge/Card) accept `token_overrides`;
control-family runtimes (Switch/Tabs/Popover) accept none and must be themed by
assigning a lane-local Theme and overriding generated nodes; (3) Popover sizes
its surface from the first layout pass and only anchors below the trigger, so a
consumer must re-fit/re-clamp; (4) Popover content is reparented into a
`CanvasLayer` and loses the consumer theme scope (same detached-surface class as
Unity's portal); (5) Tabs has no selected-tab channel, Card has no
activated/selected channel, and Divider's colour is fixed — all three had to be
overridden at app level; (6) there is no resolved brand projection on the Godot
target, so the lane owns the palette mapping.

### Cross-cutting findings

1. **Allowlist breadth, not renderer capability, decided how much of the app was
   design-system code.** GPUI could draw anything and chose to hand-author most
   of the screen; Godot admitted the widest useful set for this menu shape.
2. **Text intrinsic sizing is the recurring composition defect.** GPUI's text in
   nested flex and Godot's generated `Text` in HBox/VBox/absolute chrome both
   collapsed to near-zero width, producing one-character-per-line labels. A
   target-level "text does not own its layout width" fact/documentation gap
   exists in both packages, and each lane paid for it with explicit width wraps.
3. **Detached surfaces need a scope story.** Unity's Popover portal and Godot's
   popover content both leave the app tree; theme reach must be explicit in both.
   This is a cross-engine consumer requirement, not an engine quirk.
4. **Brand delivery is not uniform across targets.** Unity resolves the generated
   `.fsds-brand-orion` scope; GPUI has no brand loader; Godot has no resolved
   brand projection. The brand work happens once in tokens, but the consumer
   cost to *reach* it differs sharply per engine.
5. **A pause menu is overlay- and form-heavy.** The biggest interaction costs were
   sliders, dropdowns, colour selection and the input-waiting remap modal — none
   of which exists as a corpus component. Engine-native controls fill the hole,
   but their visual language is the engine's, not the design system's.
6. **Verification is a design-system feature.** Unity's EditMode+Player harness
   and GPUI's `render_to_image` made interaction and visual evidence cheap;
   Godot's headless logic + viewport capture is similarly direct. An engine
   package that makes consumer evidence expensive will lose consumers.

### Ranked next actionable gaps

| Priority | Target | Gap | Evidence |
|---|---|---|---|
| P0 | GPUI | Tabs, Popover, Button, Icon (structural + action + glyph) | largest hand-authored region classes; header/tab/popover/button regions |
| P0 | Unity | already addressed for Button/Badge/Card/Progress/Tooltip/Dialog/Sheet/Select/Input by the `UNITY-*-01` series; re-run this lane to consume them | target drift note above |
| P0 | Godot | `Text` min-width/intrinsic-sizing channel; popover content theme + clamp recipe | one-char-per-line lists; popover capture |
| P1 | Godot | Tooltip, Dialog/Sheet, Select, Progress (or document native fallback recipe) | abilities hover, remap modal, language dropdowns |
| P1 | All | A Slider/ColorPicker component family (or a documented engine-native recipe) | 9 sliders, 2 dropdowns, 6-swatch picker in every lane |
| P2 | All | Detached-surface scope helper (`Theme.AttachAll`/portal hook) and a text-sizing note in each engine README | Unity sheet precedence + portal; Godot popover |

## Evidence index

All screenshots are 1280 × 800; each lane captures the same eight states
(required four + `map-popover`, `abilities-hover`, `settings-remap-modal`,
`settings-subtitle`). Raw captures are produced by the lane's committed capture
command into its gitignored `evidence/` directory and mirrored to the `tmp/`
paths below; `tmp/` is not committed.

| Lane | Evidence directory | Test/build receipts | Captures |
|---|---|---|---|
| GPUI | `tmp/game-pause-menu/gpui/` | `build.log`, `test.log`, `test-capture.log`, `capture.log`, `capture-manifest.json` | 8 |
| Unity | `tmp/game-pause-menu/unity/` | `editmode-results.xml` (37/37), `editmode.log`, `player.log`, `result.json`, `build.log` | 8 |
| Godot | `tmp/game-pause-menu/godot/` | `parity-tests.log` (209/209), `parity-capture.log` | 8 |

Cross-engine verification: run `node examples/game-pause-menu/parity-check.mjs
--root tmp/parity-evidence` after pointing a `tmp/parity-evidence/{gpui,unity,godot}`
aggregate root at the three capture directories. The committed run report,
per-state montages and pairwise difference images are under
`tmp/parity-evidence/report/` (`parity-report.json` records the 195 colour/geometry
probes, 117 typography bbox measurements, 24 RMSE pairs for all eight states and
24 committed-golden comparisons; the reviewed run has 0 failures).

## How to run

```sh
# GPUI (macOS, pinned rust 1.94.1; first build compiles the pinned renderer graph)
cd examples/game-pause-menu/gpui
cargo build && cargo test
cargo run                                   # opens the menu on MAP
cargo run -- --tab settings                 # open on a specific tab
cargo run --features capture -- --capture /abs/evidence-dir

# Unity (Unity 6000.5.3f1 with an activated license, macOS)
cd examples/game-pause-menu/unity
bash scripts/verify-unity.sh                # EditMode seam + I1..I15 tests
bash scripts/capture-screenshots.sh         # standalone Player + eight captures

# Godot (Godot 4.7.2; GODOT=/path/to/godot to override)
cd examples/game-pause-menu/godot
./setup.sh                                  # copies the generated addon; copy is gitignored
"$GODOT" --headless --path "$PWD" res://tests/test_main.tscn   # 209/209 checks
"$GODOT" --path "$PWD" res://tools/capture.tscn -- --out="$PWD/evidence" \
  --mirror="$PWD/../../../tmp/game-pause-menu/godot"           # 8 captures

# Cross-engine parity check (needs ImageMagick; point at an aggregate capture root)
node examples/game-pause-menu/parity-check.mjs --root tmp/parity-evidence --out tmp/parity-evidence/report
```

## Non-claims

- Not a shipping game, game-framework integration, or input-system simulation;
  screenshots are sampled states, not physical-device proof.
- Not pixel-identical cross-engine rendering. The parity pass pins the interface
  structurally and compositionally; font family/rasterisation, glyph
  anti-aliasing and letter-spacing where an engine lacks the channel remain
  engine-specific.
- Not accessibility adequacy proof.
- Not generated-artifact admission: native targets are outside the TypeScript
  admission rail. The Unity pill-radius clamp is a projection fix with unit
  tests and a regenerated sheet, not admission.
- The Orion graphic grammar is composed per lane from the palette and the
  appearance fixture; only the Unity lane resolves it through the generated
  brand scope. GPUI/Godot decoration is app-owned, not a brand-projection claim.
- The image goldens are a regression baseline for the reviewed captures, not a
  full visual baseline: they catch drift in those eight states at 1280 × 800,
  not every layout regression, other states, DPI, backend or OS.
- The source-design oracle currently **fails its composition bands** (90
  violations across 24 lane/state observations). Palette anchors match; the
  reference's display typography, large mint/grey fields, orange data plates and
  industrial graphic language do not. See
  [`evidence/oracle-report.json`](evidence/oracle-report.json) and
  [`evidence/visual-review.md`](evidence/visual-review.md).
- Human visual sign-off is pending; the review record carries the checklist.
