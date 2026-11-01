# Pause-menu parity evidence matrix

This matrix is the coverage contract behind the bounded claim in
[`../parity.md`](../parity.md). It records what is actually tested, where the
evidence lives, and what is explicitly outside the claim.

## Claimed surface

| Dimension | Claimed | Evidence |
|---|---|---|
| Lanes | GPUI 0.2.2 (pinned Zed revision, Rust 1.94.1), Unity UI Toolkit 6000.5.3f1, Godot 4.7.2 | lane build/test receipts; this document |
| Host | macOS, Metal-backed GPUI/Unity/Godot windows | pinned editor/runtime versions in lane READMEs |
| Viewport | 1280 × 800, 1× device pixel ratio | capture receipts and committed goldens |
| States | eight: `map`, `map-popover`, `progress`, `abilities`, `abilities-hover`, `settings`, `settings-remap-modal`, `settings-subtitle` | [parity-check.mjs](../parity-check.mjs) requires all eight per lane |
| Cross-lane structural comparison | 24 pairwise RMSE comparisons (8 states × 3 lane pairs), threshold 0.14 | `parity-check.mjs` report |
| Authority probes | 195 colour/geometry probes and 117 typography bbox/ink measurements across the four base states | `parity-check.mjs` report |
| Regression baseline | 24 committed image goldens (8 states × 3 lanes), lossless WebP + manifest binding the authority and token sources | [`evidence/goldens/`](goldens/) and `pnpm parity:goldens:check` |
| Token path | GPUI and Godot resolve the palette/type scale from the token graph; Unity's Card surface resolves through the generated component token variables in the Orion brand scope | [`scripts/game-pause-token-consumption.mjs`](../../../scripts/game-pause-token-consumption.mjs), GPUI/Godot tests, Unity `TokenConsumptionTests` |
| Token provenance | all 19 authority colours and 20 type values resolve from `resolved.tokens.json` or the Orion brand | [`scripts/game-pause-token-provenance.mjs`](../../../scripts/game-pause-token-provenance.mjs) |
| Source-design oracle | reference palette anchors and composition bands, with an audit report | [`fixtures/orion-style-oracle.json`](../fixtures/orion-style-oracle.json), [`oracle-report.json`](oracle-report.json) |

## Explicit non-coverage

| Dimension | Status | Consequence |
|---|---|---|
| Full-frame pixel identity | Not claimed | Probes, text metrics and RMSE, not raster equality; glyph rasterisation remains engine-specific |
| Full state/transition matrix | Not claimed | Eight captured states; no exhaustive hover/focus/disabled/pressed sweep, no transition sampling, no long-copy or error states |
| Physical input | Not claimed | Unity drives app APIs in a standalone Player; GPUI/Godot exercise mounted events in test harnesses |
| DPI / display scaling | Not claimed | 1× 1280 × 800 only |
| Backend / OS matrix | Not claimed | One macOS host and the pinned engine/backend combinations above |
| Other engine versions | Not claimed | Only the pinned versions listed above |
| Accessibility | Not evaluated | No screen-reader, keyboard-focus-order, contrast-at-runtime or reduced-motion audit across lanes |
| Usability | Not evaluated | No user study, task timing or comprehension measure; the example is an engine-transfer comparison, not a usability experiment |
| Source-design composition fidelity | Not met, recorded | The oracle audit records 90 composition-band violations across 24 lane/state observations; see [`visual-review.md`](visual-review.md) |
| Unity token-channel completion | Ledgered migration started | 318 → 315 direct inline assignments; generated Card surface channel only; badge/button/design-slot consumers remain unsupported |
| Brand design-slot overrides | Not projected | Remains ledgered as `uss-design-slot` in the Unity projection |
| Elevation/motion consumers | Not projected | The Unity sheet carries the variables but has no generated shadow/transition consumer |

## Required conditions for a stronger claim

A stronger parity claim would require at minimum:

1. A source-design oracle that passes composition, display-type and graphic-language criteria, not merely palette anchors.
2. Goldens for every claimed state at every claimed DPI/backend/OS combination.
3. Real input traces shared across lanes for every interactive state.
4. Runtime token-consumption assertions for every lane surface that claims token delivery, including Unity design slots and badge/button styling.
5. A separate accessibility and usability evaluation with its own evidence.

None of those conditions is established by this slice; the docs and checker
therefore state the bounded claim only.
