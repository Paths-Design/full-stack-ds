# Post-merge run receipt — main

**Status: lane and capture rerun complete; root suite not yet idle-machine green.**
This receipt records what was actually run on `main` after merge commit
`5ae968ac6ee44208ad06ca1edc3104e8b18edd62`.

## Environment

- Runner: `darianrosebrook` macOS host, `main` checkout.
- Machine load during the rerun: **~230–320 load average**, with another
  project’s Unity/vitest/Blender work active. This was **not an idle machine**;
  the idle-machine condition on the spec remains open.
- Pinned lanes: GPUI 0.2.2 + Zed `a38fc8c` (Rust 1.94.1), Unity 6000.5.3f1,
  Godot 4.7.2.

## Lane and capture results

| Lane | Test result | Capture result |
|---|---|---|
| GPUI | `cargo +1.94.1 test --locked`: **70/70** (3 lib + 2 palette + 16 parity + 49 seam) | 8 states via `--features capture`; manifest written |
| Godot | headless `res://tests/test_main.tscn`: **209/209** | 8 states via `res://tools/capture.tscn`; `FSDS_GODOT_CAPTURE_OK` |
| Unity | lane `scripts/verify-unity.sh`: **37/37** EditMode | 8 states via `scripts/capture-screenshots.sh`; `result.json` `"passed": true` |

## Parity checker on the main captures

```
node examples/game-pause-menu/parity-check.mjs \
  --root /tmp/parity-main-rerun \
  --out /tmp/parity-main-rerun/report \
  --goldens examples/game-pause-menu/evidence/goldens
```

Result: **195 colour probes, 117 typography bbox/ink measurements, 24 pairwise
RMSE comparisons, 24 golden comparisons, 0 failures**. Every main capture
matched its committed golden exactly (`golden max RMSE = 0`). The bounded claim
printed by the checker is the claim supported by this run.

## Root suite

`pnpm test` on the same main checkout:

- **5427/5433 tests passed**, 370 files (5 files failed).
- All six failures were timeouts, not assertions: four 5 s timeouts, one 7.3 s
  timeout (limit 5 s), and one 240 s timeout in the Unity capability accounting
  test.
- Two vitest worker-RPC timeouts were also reported.
- Re-running the five affected files in isolation:
  **164/164 tests passed**, but the isolated harness still reported one
  worker-RPC error (`Timeout calling "onTaskUpdate"`). The workload/load, not a
  failing assertion, is the reproducible cause observed in this run.

Root-suite receipt paths (gitignored, local):

- `tmp/parity-main-rerun/root-tests.log`
- `tmp/parity-main-rerun/root-failing-isolated.log`
- lane logs and captures under `tmp/parity-main-rerun/`

## What remains open

1. **Idle-machine root rerun.** Re-run `pnpm test` on a quiet host (or accept
   the isolated-pass evidence explicitly). The lane/capture half is green.
2. **Human visual sign-off.** Review the committed
   [`montages/`](montages/) and the findings in
   [`visual-review.md`](visual-review.md), then record accept/reject/restyle.
   The oracle reports 90 composition-band violations; the current claim is
   bounded and does not assert source-design fidelity.
3. Only after both are resolved should the spec’s A1/A2 be marked pass and the
   slice closed.
