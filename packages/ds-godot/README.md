# Godot comparative pilot

Copy `addons/full_stack_ds` into a Godot 4.7.2 project. The generated script classes and `.tscn` scenes in `components/` are editor-importable. No editor plugin must be enabled. Interaction controls depend on `runtime/control.gd`; passive text and rule shapes depend on `runtime/static_content.gd`.

This is a comparative semantic pilot with bounded component admission. For interaction controls, `value` is a normalized string channel, `controlled` prevents speculative state commitment, and `value_requested`/`value_changed` expose requests and accepted state. Boolean channels use `"true"` and `"false"`. Use `add_item(key, label, body, disabled)` after attachment for compound content. Add arbitrary content to a Popover's `content` after attachment. The surface is an in-viewport CanvasLayer overlay.

`DSText` accepts `content`, `variant`, `size_axis`, `weight`, `align`, `transform` and `truncate`. `DSDivider` accepts `orientation`, `thickness` and `title`. Their generated configuration carries normalized style rules and token values; the shared runtime renders a Label or a rule ColorRect. The `capabilities.json` receipt names the excluded semantic props and target approximations.

## Generate and verify

From the repository root:

```sh
pnpm --filter @full-stack-ds/codegen build
node packages/ds-codegen/dist/cli.js --target=godot
node scripts/godot-pilot.mjs
node scripts/engine-comparison.mjs
```

The Godot lane uses a fresh consumer project, imports resources, saves and reloads a serialized Switch in separate editor processes, runs graphics-backed traces, observes Text and Divider rendering properties, and exports/launches a macOS debug application. Install matching macOS export templates first. `GODOT` selects the binary; the default is `/Applications/Godot.app/Contents/MacOS/Godot`. The comparison also requires an activated Unity installation (`UNITY_EDITOR` override). Evidence stays under `tmp/`; no imported cache or downloaded engine assets belong in Git.

`fixtures/traces.json` was committed before implementation. Both engines consume it; the comparator requires the same run identity and ordered expected states. Unity executes these particular traces in an Editor panel; Godot executes them in an editor runtime and exported application. This comparison does not establish physical input integration or identical rendering. Unity's separate standalone lane is independent evidence, not execution of these shared traces in a Unity Player.

## Explicit limits

The generated `capabilities.json` beside each component names known excluded props. New unknown props and unsupported interaction/surface shapes reject generation. Known exclusions are not silently counted as implemented: multiple selection, variants, configurable focus/navigation, unmounting, placement/dismissal options, default-channel props and DOM form/ID fields are outside the traced behavior. Initial state can be set through `value`; callbacks adapt to signals. These adaptations do not establish full prop parity.

Interaction-control Theme resources project an unconditional authored foreground fallback through normalized token/CSS facts. A changed-token probe resolves to `#123456` in the loaded Theme. The static rule probe additionally checks that a changed token reaches a rendered ColorRect. Text uses contract typography scopes for size, weight, color and line spacing; Divider uses contract color, thickness and margin facts. Godot font metrics and letter spacing are target approximations. `Text.as` and `Divider.decorative` are explicit exclusions: this pilot does not establish heading-role or separator accessibility parity. It also does not establish resolved brand projection, complete styling for interaction controls, motion, iconography or arbitrary viewport support. Scene serialization is tested through Godot's editor APIs.
