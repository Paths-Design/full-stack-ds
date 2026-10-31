---
doc_id: EXAMPLE-GAME-PAUSE-MENU-001
authority: example-spec
status: active
title: Game pause menu — Orion N5
owner: "@darianrosebrook"
updated: 2026-10-31
governs:
  - examples/game-pause-menu/**
---

# Game pause menu — Orion N5

A game pause menu for the fictional *Orion N5 — Mars Expedition* game, realized
in three engine lanes built from the repository's generated design-system
packages: **GPUI** (`packages/ds-gpui`), **Unity** (`packages/ds-unity`), and
**Godot** (`packages/ds-godot`). This is an **app shape** in the
[`examples/`](../README.md) portfolio: a consumer-side proving surface for
engine transfer and a usability comparison, not a product.

The menu is drawn in the **Orion N5 graphic style**: the mission-control UI from
the design reference — hard-edged charcoal panels on bone or ink grounds, a
signal-orange action strip, mint telemetry washes, condensed grotesque
micro-labels, tabular rules, oversized numerals and no rounded corners.

## Claim

The same game pause-menu app — four tabs (Map, Progress, Abilities, Settings),
the interaction set below, and one shared fixture corpus — can be realized on
three native UI substrates from each engine's generated DS package, with the
same semantics, using the package's public exports, and every region the
component allowlist does not admit is ledgered as a lane-local fallback rather
than silently counted as design-system realization.

The comparison document this example produces answers a second, usability
question: where does each engine's DS package help or get in the way when a
consumer composes a dense game menu, and what does that imply for the package?

**Falsifiers.**

- A lane cannot build/run from committed files against the workspace packages.
- A lane reaches into generated package internals, copies generated component
  code, or edits a package instead of using public exports.
- The same app interaction works in one lane and not another without an
  explicit, ledgered engine capability finding.
- A lane is forced to rewrite the app spec (tab set, interaction semantics,
  data meaning) to make its engine work.
- The orion brand is not reachable by the engine's theme path that supposedly
  supports brands (Unity: `.fsds-brand-orion`), or fails the contrast gate.

## Visual direction (Orion N5)

The reference boards define the palette and graphic grammar. The brand layer
(`packages/ds-tokens/src/brands/orion.tokens.json`, `data-brand="orion"`) is the
authority for these values; [`fixtures/orion-appearance.json`](fixtures/orion-appearance.json)
is the lane-consumption copy for engines whose theme path does not load brand
overlays (see each lane README for which mechanism it uses).

| Role | Value | Use |
|---|---|---|
| Signal orange | `#EF6A3C` | primary action strip, active tab, selected slot, nav target |
| Deep signal | `#B83F16` | orange as *text* on bone (light theme; AA) |
| Hot signal | `#F78A5E` | orange as text/icons on ink (dark theme; AA) |
| Ink | `#141412` | app ground (dark), text on bone |
| Charcoal | `#232320` | panel ground |
| Graphite | `#2E2E29` | raised panel / card ground |
| Bone bright | `#F4F1E6` | paper ground (light) |
| Bone | `#E9E5D8` | secondary paper |
| Sage | `#C6D9C7` | telemetry wash, map ground (light) |
| Moss | `#7D8F82` | muted bars on sage |
| Alert | `#C8402C` | locked / danger |
| On-signal | `#191917` | text and icons on orange fills |

Graphic grammar (app-level, not component contracts):

- **Zero radius.** Controls, panels, cards and tabs are square. The brand sets
  control/card/component corner radii to `0`.
- **Micro-label caps.** Section labels, metadata and tab labels are uppercase,
  letter-spaced; values are large and heavy. Data reads like a specification
  board: `LABEL — VALUE`, hairline rules, tabular numeric blocks.
- **Orange is an action strip, not a wash.** Accent fills are saturated blocks
  (selected tab bar, primary action, active slot, nav-target marker) carrying
  near-black on-color text. Do not tint large surfaces orange.
- **Oversized numerals.** Rank/earnings/follower values, ability sizes and slot
  ids render large; the shell repeats the giant `N5` watermark motif from the
  reference (lane-local decoration).
- **Hairline structure.** 1px rules, dashed separators and corner ticks bracket
  regions. No shadows.

The menu runs dark-first (`ink` ground). A light-theme option is not required by
this app spec; the brand file still defines both themes so the token gates hold.

## Shell structure

A full-screen pause overlay, base viewport **1280 × 800** (usable down to
960 × 640; no horizontal scrolling at base size):

1. **Header band** — brand mark `ORION N5` + mission label `MARS EXPEDITION`;
   right side carries the commander readout: **ranking** (rank label, level,
   global position), **earnings** (credits), **total followers**. A `PAUSED`
   status chip sits at the band's trailing edge.
2. **Tab bar** across the top of the content region with exactly four tabs, in
   this order: **MAP**, **PROGRESS**, **ABILITIES**, **SETTINGS**. Tabs use the
   generated `Tabs` component where the engine admits it; where it does not, the
   lane authors a tab-like control and ledgers it. Tab selection is exclusive
   and keyboard/gamepad reachable where the engine's input model provides it.
3. **Content region** for the active tab (below).
4. **Footer band** — control hints (`BACK`, `SELECT`, `TAB`) and the current nav
   target summary (`NAV TARGET: —` until one is set). The footer is app-level
   chrome on every engine.

### Map tab

- **Map field** — a stylized top-down plot (lane-local drawing: grid, contour
  ticks, sector label) with one marker per fixture map icon, positioned by
  normalized `x`/`y`. Marker shape distinguishes `kind`; the current nav target
  is visually distinct. Only icons with `visible: true` are plotted.
- **Icon visibility panel** — the list of all fixture icons, one row each, with
  the generated `Switch` (all three targets admit Switch) toggling marker
  visibility. A switch OFF hides that marker immediately; ON restores it. The
  panel is a *filter over the map field*, not a mutation of the fixture.
- **Marker popover** — activating a marker opens a popover anchored to it with
  that icon's `label`, `sector`, `distanceKm`, `status`, `detail` and `reward`,
  and a **SET AS NAV TARGET** button. The popover closes on Escape/outside
  activation (engine permitting) or on selecting the button. Setting a target
  updates the footer summary and the marker highlight. Only one nav target at a
  time.
- **Commander readout** — ranking, earnings and total followers (from
  `commander.json`) are visible in this tab as a stat row (header band repeats
  them; the map tab owns the detailed presentation).

### Progress tab

- **Faction list** — one row per fixture faction with name, tagline, tier and
  reputation. `unlocked: false` factions show a locked treatment and their
  `requirement`; unlocked factions show reputation progress. No faction is
  selectable into a drawer without its row being visible in the list.
- **Left drawer** — selecting any faction row opens a drawer that enters **from
  the left edge of the content region** (it does not replace the list; the list
  stays visible and the drawer overlays its left side). The drawer holds the
  faction `description`, `history`, `perks` list and `parts` table (name, cost,
  rarity, size), plus a primary **SHOP PARTS** button. For a locked faction the
  button is present but disabled and the drawer states the unlock requirement.
  The drawer closes with BACK/Escape/close affordance and returns to the list.

### Abilities tab

- **Ability cards** — a grid of small cards, one per fixture ability: icon,
  name, and a **rarity tag over the top edge** of the card. The card also shows
  its **size** as pips or a size block. Rarity is data (`abilities[].rarity`),
  rendered as a tag; it is not re-derived per engine.
- **Hover popover** — pointer hover over a card opens a tooltip/popover with the
  ability's `description`, stat block and rarity/size detail. Hover-out closes
  it. Keyboard/gamepad focus does not have to open it (engines differ); the
  card's selected state can reveal the same content through the loadout panel.
- **Vehicle loadout** — the vehicle (fixture `vehicle.json`) exposes six slots
  with sizes (1–2). Selecting a card marks it as the pending ability and
  highlights slots whose size is `>= ability.size`. Activating a compatible slot
  installs the ability there (one ability per slot; installing replaces).
  Activating an incompatible slot is a no-op with a visible reject state.
  Installed abilities can be removed from their slot. A card whose ability is
  installed renders as installed.
- The loadout panel names the vehicle, its six slots, and each slot's installed
  ability or `EMPTY`.

### Settings tab

Four stacked sections; the tab scrolls if the viewport is short.

1. **General** — one generated `Switch` per fixture general toggle (`value`
   in the fixture). Each row shows label + description. All three targets admit
   Switch, so this section is fully design-system realized on every lane.
2. **Controller** — one slider per fixture controller setting (label, min, max,
   step, value, unit). Sliders are engine-native where the target has no Slider
   component in its allowlist (all three native allowlists lack Slider), and
   that fact is ledgered.
3. **Controller remap** — one row per fixture remap action showing the action
   label and current binding. Activating a row's binding button opens a **modal
   that waits for input**: the modal states `PRESS ANY KEY OR BUTTON`, then the
   next key/gamepad button press sets that action's binding and closes. Escape
   or a cancel affordance dismisses the modal without changing the binding.
   Only one remap modal is open at a time.
4. **Audio & subtitles** — four audio sliders, one audio-language dropdown, one
   subtitle-language dropdown, and a **subtitle background color picker**
   (swatch grid from the fixture color options). Picking a swatch updates the
   selected value and a live subtitle preview strip drawn with that background.

## Data and API layer

This app shape has no backend and no async domain; the fixtures are read once at
startup. Contract:

- `fixtures/commander.json` — identity, `rank`, `earnings`, `followers`, and
  the initial `navTarget` (`null`).
- `fixtures/map-icons.json` — `sector` plus `icons[]`: `id`, `kind`, `label`,
  `icon`, `x`, `y`, `visible`, `status`, `sector`, `distanceKm`, `detail`,
  `reward`.
- `fixtures/factions.json` — `factions[]`: `id`, `name`, `tagline`, `unlocked`,
  `tier`, `reputation`, `reputationMax`, `requirement`, `detail { description,
  history, perks[], parts[{ name, cost, rarity, size }] }`.
- `fixtures/abilities.json` — `abilities[]`: `id`, `name`, `description`,
  `rarity`, `size`, `icon`, `stats {}`, `detail`, `installed` (not authoritative
  — the vehicle owns installation).
- `fixtures/vehicle.json` — `name`, `slots[] { id, label, size, abilityId }`.
- `fixtures/settings.json` — `general[]`, `controller[]`, `remap[]`,
  `audio { sliders[], audioLanguage, subtitleLanguage, subtitleBackground }`.
- `fixtures/orion-appearance.json` — the lane-consumption copy of the brand
  palette plus graphic-style constants (radius, borders, type treatment).

Each lane copies the fixtures it consumes into its own lane directory (verbatim
where the engine requires embedded assets) and owns a lane-local parser/adapter
-- the only layer that touches raw fixture shape. Fixture shape is identical
across lanes; the domain semantics do not change per engine. A malformed fixture
is an authoring error and must fail the lane's parse test loudly.

## Interaction contract (shared across lanes)

| ID | Interaction | Observable result |
|---|---|---|
| I1 | Select MAP / PROGRESS / ABILITIES / SETTINGS | exactly one tab active; content region swaps; active tab styled |
| I2 | Toggle an icon-visibility switch OFF then ON | that marker leaves and returns to the map field; other markers unaffected |
| I3 | Activate a visible marker | anchored popover with that icon's detail and SET AS NAV TARGET |
| I4 | Activate SET AS NAV TARGET | footer `NAV TARGET` names the icon; marker highlighted; popover closes |
| I5 | Select an unlocked faction row | left drawer opens with details, perks, parts and an enabled SHOP PARTS |
| I6 | Select a locked faction row | left drawer opens with requirement and a disabled SHOP PARTS |
| I7 | Select an ability card | card selected; compatible vehicle slots highlighted |
| I8 | Activate a compatible slot | ability installed in slot; card marked installed; loadout panel updates |
| I9 | Activate an incompatible slot | no install; reject state visible |
| I10 | Hover an ability card | popover with description + stats + rarity/size |
| I11 | Toggle a General switch | switch value flips exactly once and row reflects it |
| I12 | Drag/adjust a Controller slider | value updates and is displayed |
| I13 | Activate a remap binding, then press a key/button | modal waits in `PRESS ANY KEY OR BUTTON`, then binds and closes |
| I14 | Adjust audio slider; change language dropdowns; pick subtitle background swatch | values update; subtitle preview strip reflects background + language |
| I15 | Close drawer / popover / remap modal with cancel | returns to prior state without changing data |

Semantics are engine-independent. Idioms (focus rings, gamepad navigation,
native control visuals) are expected to differ; the app semantics are not.

## Realization doctrine

- **Consume public exports only.** A lane imports its engine package the way its
  README documents. No reaching into generated internals, no copying generated
  component source into the lane.
- **Use the design system where admitted.** Every region that a target's
  allowlist admits must be realized with that generated component: Switch on all
  three, Tabs/Accordion/Popover on Unity and Godot, Button/Badge/Card/Icon on
  Godot, Text/Divider/Badge/Stat on GPUI, etc. Exact per-lane inventories are
  listed in each lane README.
- **Ledger every fallback.** Any region realized with engine-native or
  hand-authored UI because the allowlist does not admit it carries a source
  marker (`// NOT FSDS: <reason>` for C#/Rust, `# NOT FSDS: <reason>` for
  GDScript) and a row in the lane README's realization ledger.
- **No package edits.** If a lane is blocked by a package API, record the gap as
  a finding; do not change `packages/ds-*` from a lane. The brand addition to
  `packages/ds-tokens` and the regenerated Unity stylesheet are owned by the
  slice, not by a lane.
- **Theme path honesty.** Unity consumes the generated `.fsds-brand-orion` token
  scope. GPUI has no brand loader (explicit token overrides only) and Godot has
  no resolved brand projection; those lanes apply the orion palette through the
  engine's own theme mechanism from the lane-local appearance fixture and say so
  in their README.

## Acceptance bar

- `pnpm tokens:build`, `pnpm tokens:check-brand-refs`, `pnpm tokens:check-contrast`
  pass with the orion brand present (`tokens.css` contains the orion scope).
- `pnpm run generate:unity` is byte-stable and the committed
  `packages/ds-unity/Runtime/Resources/FullStackDS/Controls.uss` carries an
  `.fsds-brand-orion` section.
- Each lane produces build/test evidence and four-tab screenshot evidence
  (Map, Progress, Abilities, Settings) under the ignored
  `tmp/game-pause-menu/<engine>/` directory; the comparison README cites it.
- The comparison README states, per engine: admitted-component inventory,
  fallback ledger, brand/theme delivery, interaction coverage, evidence,
  non-claims, and the usability findings the lane produced.

## Non-claims

- Not a shipping game, not a game framework integration, not an input-system
  simulation. Engine screenshots are sampled states, not physical-device proof.
- Not visual-quality proof of the design system: hand-authored fallback regions
  are app-layer chrome, and their appearance is not a component-quality claim.
- Not cross-engine pixel parity. The menu is one design realized in three
  substrates; type metrics, focus models and native control chrome differ.
- Not accessibility adequacy proof. Focus/keyboard paths are exercised but no
  a11y standard is claimed by this example.
- Not generated-artifact admission. Native targets are outside the TypeScript
  admission rail.
