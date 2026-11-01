# Visual review record — Orion N5 pause menu

**Status: agent review complete; human sign-off pending.**

This record separates three questions that are often conflated:

1. **Cross-lane parity** — do GPUI, Unity and Godot agree with each other on
   the captured states? Evidence: [`../parity.md`](../parity.md),
   [`parity-report.json`](parity-report.json) from the reviewed run, and the
   committed goldens in [`goldens/`](goldens/).
2. **Source-design fidelity** — does the result look like the supplied Orion N5
   reference? Evidence: [`../fixtures/orion-style-oracle.json`](../fixtures/orion-style-oracle.json)
   and [`oracle-report.json`](oracle-report.json).
3. **Usability** — can a player understand and operate it efficiently? Not
   evaluated; see [`parity-matrix.md`](parity-matrix.md).

## Artifacts reviewed

- Reference board, sha256 `8e883260…`: grey/charcoal poster panels, mint
  fields, orange data plates, oversized grey display type, D35O technical
  framing.
- Reference orbital panel, sha256 `f0ec5f36…`: mint ribbed field, dark housing,
  full-width orange data band, oversized grey `79`, hex/orbit diagram,
  registration marks, barcode strips.
- The eight-state capture set and the eight review montages committed under
  [`montages/`](montages/). To reproduce them:

  ```sh
  node examples/game-pause-menu/parity-check.mjs \
    --root /abs/path/to/parity-evidence \
    --out /abs/tmp/parity-review \
    --goldens examples/game-pause-menu/evidence/goldens
  ```

  The checker now covers all eight states for RMSE and goldens, and the four
  base states for the authority probes. The committed montages are review
  artifacts derived from the reviewed capture set, not regression baselines;
  the goldens are the baselines.

## Agent findings

### What matches

- The palette anchors are close: reference mint `#C6D9C6` vs `sage #C6D9C7`;
  reference ink `#272726` vs `ink #141412`/`charcoal #232320`; reference orange
  `#E75C2F` vs `signal #EF6A3C`; reference moss-grey `#6F8B78` vs `moss #7D8F82`.
- The map screen is the strongest application: a large mint field inside dark
  chrome, orange controls, grid and technical micro-labels.
- The three lanes are visually consistent on the reviewed capture set within
  the declared tolerances, and the token path is exercised by runtime tests.

### Where the reference is not met

The oracle audit records **90 composition-band violations across 24
lane/state observations, with zero clean observations**. The family shares are
recorded in [`oracle-report.json`](oracle-report.json); representative values:

| Screen | Ink | Mint | Grey | Orange | Cream |
|---|---:|---:|---:|---:|---:|
| Reference style board | .400 | .279 | .179 | .108 | .000 |
| Reference orbital panel | .426 | .217 | .275 | .066 | .000 |
| `map` (GPUI) | .552 | .387 | .021 | .025 | .002 |
| `progress` (GPUI) | .658 | .036 | .013 | .027 | .242 |
| `abilities` (GPUI) | .909 | .003 | .059 | .021 | .001 |
| `settings` (GPUI) | .887 | .002 | .077 | .026 | .003 |

1. **Surface hierarchy is inverted.** The reference uses large mint and grey
   fields with orange bands; the app is 55–91 % near-black and confines mint to
   the map. The progress dossier uses warm cream, which is not a reference
   surface.
2. **The “big grey” display layer is absent.** No oversized grey numerals or
   wordmarks; the largest current type is 40 px. The reference's identity is
   carried by display-scale typography as much as by the palette.
3. **Orange is a state accent, not a field.** Reference orange occupies 6–11 %
   as bands/plates; the app uses ~2–3 % for tabs, toggles, chips and sliders.
4. **The industrial graphic language is mostly absent.** No thick housings,
   chamfered frames, hex/orbit diagrams, registration marks, barcode/mission
   strips or ribbed/hatched fields beyond the map grid.
5. **Hierarchy and focal data differ.** The reference centers large data
   lockups (`95%`, `7250`, `75.2%`, `32 days`); the app distributes small HUD
   labels and rows.

This is enough to say the app applies the Orion **palette** but not the Orion
**composition**. The docs now state that explicitly; see
[`../README.md`](../README.md) and [`../parity.md`](../parity.md).

## Human review checklist

A human reviewer should confirm or reject these before the word “full” is ever
used:

- [ ] Palette and typography parity across the eight captured states is
      visually acceptable, including the Unity body-copy weight residual.
- [ ] The map screen is accepted as the strongest on-brand screen.
- [ ] The composition/oracle gaps above are accepted as non-claims, or a
      restyle is requested.
- [ ] The bounded claim (not full/pixel parity; 1× 1280 × 800; pinned macOS
      host; eight states; no a11y/usability claim) is the intended claim.
- [ ] The Unity “ledgered migration started” wording is acceptable.

Reviewer: ____________________  Date: ____________  Decision: ____________

Notes:
