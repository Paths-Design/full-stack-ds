# Game pause menu — Orion N5

A game pause menu for the fictional *Orion N5 — Mars Expedition* game, realized
as three native consumer lanes over the repository's generated design-system
packages: **GPUI**, **Unity UI Toolkit**, and **Godot**.

This is an **app shape** in the [`examples/`](../README.md) portfolio. It is a
consumer-side proving surface for engine transfer and a usability comparison,
not a shipping game. The framework-neutral authority is
[`spec.md`](spec.md); every lane is a realization of it, not its own design.

The menu is drawn in the **Orion N5 graphic style**: hard-edged charcoal panels
on bone or ink grounds, a signal-orange action strip carrying near-black labels,
mint telemetry washes, hairline rules, heavy condensed-feeling micro-label type,
oversized numerals and no rounded corners. The style is registered as the
`orion` brand in [`packages/ds-tokens/src/brands/orion.tokens.json`](../../packages/ds-tokens/src/brands/orion.tokens.json)
(`data-brand="orion"`).

## Portfolio entry

| Question | Answer |
|---|---|
| **Claim** | One game pause-menu app — four tabs, 15 shared interactions, one fixture corpus — can be realized on GPUI, Unity UI Toolkit and Godot from each engine's generated DS package with the same semantics, using public package exports only, and every region the component allowlist does not admit is ledgered as a lane-local fallback rather than counted as design-system realization. |
| **Falsifier** | A lane cannot build/run from committed files; a lane reaches into generated internals or edits a package; the same interaction breaks in one lane with no ledgered engine-capability reason; the app spec must be rewritten per engine; or the `orion` brand fails the token gates / is unreachable on the target that claims brand support. |
| **Stress axis** | Density and composition: tabs, overlays (popover, left drawer, input-waiting modal), master-detail list→drawer, card grid with rarity tags and hover detail, form controls (switch, slider, dropdown, color picker), brand/theme delivery, and gamepad/keyboard focus. |
| **Transfer** | The app spec is engine-neutral. Lanes differ in idiom (UXML/USS vs `.tscn`/GDScript vs Rust views) but not in tab set, data meaning, or interaction result. |
| **Evidence closure** | Each lane's README names its build/test/capture commands; per-lane build logs, test results and four-tab screenshots are produced under `tmp/game-pause-menu/<engine>/` from committed sources plus each lane's documented setup step. |

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
plus a rebuild: `packages/ds-tokens/generated/tokens.css` gains
`@layer brand` scopes for `[data-brand="orion"]` (light/dark), and the generated
Unity stylesheet gains `.fsds-theme.fsds-brand-orion` blocks, so a Unity
consumer selects it with `Theme.SetBrand(container, "orion")`. The gates that
hold it:

- `pnpm tokens:build` — DTCG validation + emitted CSS.
- `pnpm tokens:check-brand-refs` — every `{ref}` resolves.
- `pnpm tokens:check-contrast` — curated WCAG AA pairs across the base tree and
  all 11 brands × 2 themes.

GPUI has no brand-graph loader (explicit token overrides only) and Godot has no
resolved brand projection; those two lanes apply the same palette through their
engine's own theme mechanism and state that in their READMEs.

## Lane matrix

| Concern | GPUI | Unity UI Toolkit | Godot |
|---|---|---|---|
| Package | `packages/ds-gpui` | `packages/ds-unity` | `packages/ds-godot` |
| Admitted components | Switch, ToggleSwitch, Checkbox, Text, Badge, Divider, Stat | Switch, Accordion, Popover, Tabs, Text, Divider, Icon | Switch, Accordion, Popover, Tabs, Text, Divider, Button, Badge, Card, Icon |
| Brand/theme delivery | — | — | — |
| Lane status | — | — | — |

> Filled in when the lanes land; each lane README carries its full
> realization ledger and interaction coverage table.

## Usability comparison

> Written after the three lanes land, from their READMEs and the captured
> evidence. It compares component coverage, theme delivery, composition
> friction, interaction ergonomics, iteration cost and verification tooling,
> with the findings each lane produced.

## How to run

> Filled in when the lanes land.

## Non-claims

- Not a shipping game, game-framework integration, or input-system simulation;
  screenshots are sampled states, not physical-device proof.
- Not visual-quality or cross-engine pixel-parity proof. Type metrics, focus
  models and native control chrome differ by engine.
- Not accessibility adequacy proof.
- Not generated-artifact admission: native targets are outside the TypeScript
  admission rail.
