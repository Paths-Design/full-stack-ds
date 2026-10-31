---
doc_id: EXAMPLE-GAME-PAUSE-MENU-PARITY-001
authority: example-spec
status: active
title: Game pause menu parity pass — Orion N5
owner: "@darianrosebrook"
updated: 2026-10-31
governs:
  - examples/game-pause-menu/**
---

# Game pause menu parity pass — Orion N5

The first realization of this app shape produced **three different-looking
interfaces**, not one interface in three substrates. This document is the single
design authority for the parity pass: every engine lane rebuilds its UI to the
same 1280 × 800 grid, the same component geometry, the same colours, the same
copy and the same capture states.

**Authority order**

1. [`fixtures/parity-layout.json`](fixtures/parity-layout.json) — machine-readable
   geometry, colours, type sizes and switch geometry. Lanes parse it; it is not
   re-typed per engine.
2. This document — rendering rules, per-tab composition order, copy formats,
   switch root causes, capture states and the permitted-difference list.
3. [`spec.md`](spec.md) — app semantics and interaction contract (unchanged).

Parity means: at 1280 × 800 the four captured tab states are structurally
indistinguishable across GPUI, Unity and Godot — header, tab bar, panel
rectangles, rows, cards, controls and switch geometry occupy the same pixels and
use the same colours. Type **rasterisation** and anti-aliasing may differ; layout
may not.

## Global rules

- **Absolute 1280 × 800 layout.** Every region is placed from the JSON rects.
  No responsive reflow, no per-engine flex decisions. Lanes may use their layout
  system, but the computed boxes must match the JSON.
- **Same copy.** Header values, labels, tab names, row text, card names, footer
  hints and capture-state selections come from the shared fixtures and the JSON;
  formatting is fixed:
  - rank line: `PATHFINDER III` / `LV 12 · GLOBAL #95 · TOP 5%`
  - earnings: `34,850 CR` / `1,200 CR PENDING`
  - followers: `52,400` / `+3.2% THIS CYCLE`
  - sector: `ARES BASIN // SECTOR 07` · scale: `SCALE 1:40K`
  - icon row: name + `STATUS · N.N KM` secondary line
- **Colours** come only from the JSON `colors` map (Orion palette). No lane
  invents a hue.
- **Type sizes** come only from the JSON `type` map. Uppercase for labels,
  tabs, panel titles, row labels, chips and buttons; sentence case for body
  copy. Letter-spacing is applied where the engine supports it; if an engine
  cannot express letter-spacing, note it in the lane README (permitted
  difference).
- **No shadows, no rounded panels.** `radius: 0` everywhere except the switch
  pill. Panel borders are 1px `rule`.
- **Generated components stay the realization** where the target admits them
  (tabs, switches, popovers, buttons, badges, cards, icons, text, dividers).
  Lane-local USS/theme/QSS-style overrides may force the JSON geometry; each
  override is a ledged row in the lane README. Hand-authored fallbacks remain
  only where the allowlist has no component (map plot, shell bands, drawers,
  sliders, dropdowns, colour picker, modal).
- **Capture states** are exactly `captures` in the JSON. Required four per
  lane: `map`, `progress`, `abilities`, `settings`; extra states:
  `map-popover`, `abilities-hover`, `settings-remap-modal`,
  `settings-subtitle`.

## Switch parity (the "pinched oval" defect)

Canonical switch geometry (all engines):

| Property | Value |
|---|---|
| Track | 64 × 32 px, corner radius **16 px** (= half height → stadium/pill) |
| Track border | 1 px `ruleStrong` when off; no border when on |
| Track fill | ON `signal` (#EF6A3C); OFF `graphite` (#2E2E29) |
| Thumb | 24 × 24 px circle, radius **12 px**, inset 4 px |
| Thumb fill | ON `onSignal` (#191917); OFF `boneBright` (#F4F1E6) |
| Thumb offset when on | x = 36 px (64 − 24 − 4) |

**Why the three engines rendered three different switch shapes**

- **Unity — true oval.** The package projects the token
  `switch.size.md.track.radius → semantic.shape.control.radius.pill` (9999px)
  verbatim into USS `border-radius`. Unity UI Toolkit's rounded-rectangle
  geometry does not clamp a single huge radius into a stadium on a 64 × 24
  track; it stretches the corner arcs into an elliptical pair, so the track
  paints as an ellipse. The lane never overrode the radius. Fix: lane
  stylesheet sets an explicit `border-radius: 16px` on a 64 × 32 track and
  `12px` on the 24 px thumb (and 36 px checked thumb translation), instead of
  trusting the 9999px token.
- **GPUI — rounded-rectangle thumb inside a pill track.** The generated thumb
  style declares `border-radius: 50%`; the GPUI style substrate maps a literal
  `50%` to a large pixel radius, but the lane overrode
  `switch.design.thumb.shape.radius` / `switch.design.track.shape.radius` to
  `0` for its square custom look. The result is a pill track with a square-ish
  thumb — the "pinched" read, and it differs from both other engines. Fix:
  remove the `0` radius overrides; set track radius 16, thumb 24 with radius
  12, explicit 64 × 32 track, 24 px thumb, 36 px checked translation, and the
  JSON colours through per-instance theme tokens.
- **Godot — default engine switch.** The generated boolean runtime is a Godot
  `CheckButton`; its track and thumb are engine default-theme icons. The lane
  never overrode those icons or the checked colour, so it painted a light
  default pill with no Orion signal fill — a third look. Fix: the lane supplies
  64 × 32 SVG icon overrides for checked/unchecked that draw the JSON pill
  geometry and colours (or an equivalent lane-drawn switch that consumes the
  same geometry; the generated `Switch` remains the admitted component and the
  override is ledgered). The package finding: control-family components expose
  no track/thumb styling channel on this target.
- Common root cause: **the design system's "pill" is a token value (9999px)
  rather than a geometry contract**, and each engine interprets an oversized
  corner radius differently. The parity fix pins the pill as explicit half-height
  radii per lane; the package-level follow-up is a radius-geometry contract or a
  per-engine pill translation.

## Per-tab composition

All coordinates are in `fixtures/parity-layout.json`. Draw order is back to
front; the drawer/popover/modal are overlays on top of their tab content.

### MAP

1. Map panel rect `map.mapPanel` (charcoal, 1 px rule) with a 40 px header
   strip: `ARES BASIN // SECTOR 07` left, `SCALE 1:40K` right.
2. Field rect `map.field` filled `sage`, 60 px grid lines, 12 px corner ticks.
   Markers are 24 px squares (kind colour + monogram) positioned by fixture
   `x`/`y` inside the field; only icons whose visibility switch is on are
   plotted; the nav target carries a 3 px signal outline.
3. Field footer note at `map.fieldNote`.
4. Icon panel rect `map.iconPanel` with title + meta and 8 rows from
   `map.iconRows`: 16 px glyph, 12 px name, 10 px `STATUS · N.N KM`, and a
   canonical switch at `switchX`/`switchY`. Panel note at `map.iconPanelNote`.
5. No commander stat block inside the tab — the header carries rank, earnings
   and followers on every tab.

### PROGRESS

1. Roster panel rect `progress.listPanel` with title + meta and 5 rows from
   `progress.rows`: 3 px accent bar, name, tagline, 200 × 6 reputation bar with
   `REPUTATION 68 / 100` label, status chip (`ACCESS` signal fill / `LOCKED`
   alert outline) and `OPEN DOSSIER →`.
2. When a faction is selected, the drawer rect `progress.drawer` (paper ground,
   ink text) overlays the left side of the list and renders: dossier meta +
   `CLOSE`, title, tagline, rule, BRIEF, HISTORY, PERKS bullets, PARTS table
   (PART / COST / RARITY / SIZE) and the `SHOP PARTS` button (disabled with the
   requirement shown when the faction is locked). The list remains visible to
   the right of the drawer.

### ABILITIES

1. Grid panel rect `abilities.gridPanel` with title + meta; 10 cards in
   5 columns × 2 rows from `abilities.cards`. Each card: rarity chip over the
   top edge, 40 px icon, name, `SIZE n` + pips, installed chip; selected card
   gets a 2 px signal outline.
2. Detail panel rect `abilities.detailPanel`: `ABILITY DETAIL` + compatible
   slot count, ability name, rarity/size chips, body copy, three stat blocks
   (HEAT / COOLDOWN / DRAW), rule, `VEHICLE LOADOUT` + vehicle name/chassis and
   a 2 × 3 slot grid from `abilities.slots` (compatible slots 2 px clear
   outline, installed slots show the ability name, empty slots show `EMPTY`).
   Pending-module note at `abilities.pendingNoteY`.
3. Hover state: `abilities.hoverPopover` over the grid with the ability name,
   rarity/size, body and stats.

### SETTINGS

Four panels in a 2 × 2 grid from `settings.panels`, each with a 36 px header:
GENERAL (5 switch rows), CONTROLLER (5 slider rows with value), CONTROLLER
REMAP (6 label + binding-button rows), AUDIO & SUBTITLES (4 sliders, two
language dropdowns, six subtitle-background swatches, live preview strip).
Remap modal at `settings.remapModal` centred with `PRESS ANY KEY OR BUTTON`,
the action name and a cancel affordance.
Settings is fully visible without scrolling at 1280 × 800 in this layout.

## Header, tab bar, footer

Exactly as in the JSON. Header stats are fixed to the fixture values; tab bar
tabs are equal 320 px columns, active tab signal fill with on-signal text; footer
shows control hints left and `NAV TARGET` + the fixture-selected target right
(em dash when none).

## Verification

Per lane, after rework:

1. Run the lane's existing build/tests (unchanged semantics, all pass).
2. Capture the required four + four extra states at exactly 1280 × 800 into the
   lane's `evidence/` directory with the same camera/framing as before.
3. Record a `parity` section in the lane README: geometry authority consumed,
   per-region DS vs fallback, switch implementation/root cause, permitted
   differences (font/letter-spacing), evidence.
4. The slice compares the three lanes' captures per tab: same panel/row/card
   rectangles and colours; only glyph rasterisation may differ. The comparison
   document records the result and the remaining non-claims.

## Permitted differences

- Font family/fallback and glyph rasterisation; letter-spacing where the engine
  cannot express it; line-break positions inside body copy if the font substitution
  forces them.
- Anti-aliasing at rect edges; sub-pixel rounding of text baselines.
- Native focus/hover decorations are not part of the captured states; when a
  capture triggers one it must be dismissed/unchanged.

Everything else — positions, sizes, colours, copy, component shapes, switch
geometry, active states and overlay states — is parity.
