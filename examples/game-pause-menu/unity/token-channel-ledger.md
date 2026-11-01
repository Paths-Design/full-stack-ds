# Unity parity lane — token-channel and inline-style ledger

The parity lane places authority values as inline styles because the layout is
absolute (`fixtures/parity-layout.json`). This ledger records which of those
writes go through a generated-component token channel and which are kept inline
because the Unity target has no consumer for the underlying token family.

## Generated Card channel (used)

Generated `Card` publishes three component token variables consumed by its own
`.card` rule: `--fsds-card-color-background-default`,
`--fsds-card-color-border`, and `--fsds-card-size-radius`. The lane's parity
panel and ability-card classes set those variables from the Orion brand scope
(`.pause-app .parity-panel`, `.pause-app .ability-card` in
`Resources/Styles/PauseMenu.uss`) instead of repeating the authority values as
inline background/border/radius styles.

Removed from the C# lane: 3 direct `.style.*` writes and 6 helper invocations
(`BorderWidth` ×2, `BorderColor` ×2, `Radius` ×2) on card surfaces. The helpers
expand to 4 writes each, so the Card channel removes 27 property writes from
the parity construction path.

## Inline assignment baseline and remaining inventory

| Metric | Count |
|---|---|
| Inline `.style.*` assignments before this slice | 318 |
| Inline `.style.*` assignments after | 315 |
| Card-channel helper invocations removed | 6 |
| Effective property writes removed through the Card channel | 27 |

The 315 remaining writes were classified by the property they set. No further
generated-component channel is available for these categories on the current
Unity UI Toolkit projection:

| Category | Writes | Why inline |
|---|---:|---|
| Geometry (`position`, `left/top`, `width/height`, flex, overflow, display) | 120 | The parity authority pins absolute pixels per region; there is no token in the graph for a region rectangle, and a USS class would duplicate the authority without a token consumer. |
| Colour and border colour | 68 | Hand-authored chrome has no generated component to channel through; generated Badge/Button foreground colours are per-instance design values, and the Badge/Button radius token variable loses to the component's own stylesheet token block (verified: the chip became a pill when its inline pin was removed). Square pins stay inline and are ledgered here. |
| Padding | 36 | Per-region padding is authority geometry; generated Card padding variables are reset by `StripBox` and the hand-authored bands have no component channel. |
| Typography (`fontSize`, `letterSpacing`, font weight/alignment) | 36 | Generated `Text` size variants are a different scale (12–60 px) from the parity authority's arbitrary sizes (10–40 px); the authority sizes carry token provenance but no per-instance component token channel. |
| Border width | 27 | Authority hairlines (1–2 px) and per-edge pins; generated components do not expose every per-edge width as a token-consuming property. |
| Margin | 14 | Box reset/placement geometry. |
| Radius (hand-authored chrome, Tabs entries) | 4 | Hand-authored elements and the generated Tabs entry have no radius token consumer for this reset; inline pins retained. |
| Opacity/transform, min/max, other | 10 | State and layout facts with no token channel. |

## Brand-scope coverage

The Unity projection now emits every brand-layer variable that resolves to a
USS scalar, not only the graph tokens an admitted component already reads.
Orion's projected brand scope grew from **93 light / 68 dark** variables to
**217 light / 123 dark** variables, including the brand-only graphic surface and
status roles (`--fsds-semantic-color-surface-moss`,
`--fsds-semantic-color-status-alert`, `--fsds-semantic-color-status-clear`) and
the Orion shape/spacing/typography overrides. Design-slot brand overrides remain
in the existing `uss-design-slot` ledger reason; elevation/motion brand values
are projected as variables but the generated UI Toolkit rules have no shadow,
transition or motion consumer, so their use is a documented consumer gap rather
than a missing variable.
