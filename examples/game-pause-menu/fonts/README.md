# Bundled font — Inter

The parity lanes all render the Orion type treatment with **Inter**, the
`typography.font.family.inter` face declared by the `orion` brand. The face is
vendored here because none of the three native renderers can be assumed to have
it installed, and cross-engine typography parity is only meaningful when all
three load the same bytes.

| File | Weight | Use |
|---|---|---|
| `inter/Inter-Regular.ttf` | 400 | body copy, row secondary lines, metadata, footer hints |
| `inter/Inter-Bold.ttf` | 700 | wordmark, values, tabs, labels, titles, chips, buttons |

Two static weights are pinned by `../parity.md` → "Typography": the pinned GPUI
renderer has no variable-axis or letter-spacing channel, so the lanes share the
same two static faces and tracking is zero everywhere.

Source: Inter 4.1 (https://github.com/rsms/inter/releases/tag/v4.1), static
TTFs from the release archive. Licensed under the SIL Open Font License 1.1 —
see [`inter/OFL.txt`](inter/OFL.txt). The files are unmodified.
