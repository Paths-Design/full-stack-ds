# Post-merge run receipt — main

**Status: post-restyle idle-machine rerun complete; all required checks green.**
This receipt records the run on `main` after the four Orion restyle passes.

## Environment

- Runner: `darianrosebrook` macOS host, `main` checkout.
- Idle window: load average **9.11** at the start of the root run (previous
  attempts were rejected at load ~230–320).
- Pinned lanes: GPUI 0.2.2 + Zed `a38fc8c` (Rust 1.94.1), Unity 6000.5.3f1,
  Godot 4.7.2.

## Results

| Check | Result |
|---|---|
| Root `pnpm test` | **389 files / 5718 tests passed**, exit 0, 185.8 s |
| GPUI tests | **70/70** (3 lib + 2 palette + 16 parity + 49 seam) |
| Godot tests | **209/209** |
| Unity EditMode lane | **37/37** |
| Captures | 8 states per lane from the post-restyle sources |
| Parity checker | 195 colour probes, 117 typography measurements, 24 RMSE pairs, 24 golden comparisons, **0 failures** after regenerating the committed goldens from this run |
| Token provenance | 19 colours / 21 type values resolve |
| Token consumption | 11 lane contract checks pass |

The only capture-timing allowance is the per-state golden RMSE of 0.06 for
`abilities-hover`; Godot samples that hover state mid-animation, and the global
golden threshold remains 0.02.

Receipt paths (gitignored): `tmp/parity-main-restyle/` and
`/tmp/parity-main-restyle/`.

## Acceptance status

- A1 human review: **accepted bounded claim** (this record and
  [`visual-review.md`](visual-review.md)).
- A2 post-merge idle-machine rerun: **complete** (this record).
- No full/pixel-identity claim; the source-design oracle still records the
  documented composition mismatches and the modal-scrim exception.
