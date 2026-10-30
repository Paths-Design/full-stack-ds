# Godot comparative pilot

Copy `addons/full_stack_ds` into a Godot 4.7.2 project. The generated script classes and `.tscn` scenes in `components/` are editor-importable. No editor plugin must be enabled. Channel controls depend on `runtime/control.gd`; passive text and rule shapes depend on `runtime/static_content.gd`; projected actions depend on `runtime/action.gd`; composed parts depend on `runtime/composite.gd`.

This is a comparative semantic pilot with bounded component admission. For interaction controls, `value` is a normalized string channel, `controlled` prevents speculative state commitment, and `value_requested`/`value_changed` expose requests and accepted state. Boolean channels use `"true"` and `"false"`. Use `add_item(key, label, body, disabled)` after attachment for compound content. Add arbitrary content to a Popover's `content` after attachment. The surface is an in-viewport CanvasLayer overlay.

`DSText` accepts `content`, `variant`, `size_axis`, `weight`, `align`, `transform` and `truncate`. `DSDivider` accepts `orientation`, `thickness` and `title`. Their generated configuration carries normalized style rules and token values; the shared runtime renders a Label or a rule ColorRect. The `capabilities.json` receipt names the excluded semantic props and target approximations.

`DSButton` accepts string `content`, `variant`, `size_axis`, `axis_values`, `token_overrides`, `disabled`, `loading`, `aria_label`, and `title`. Connect `activated` for the consumer action. It uses Godot's Button input path, including focused `ui_accept`, and resolves root, variant, and native-state styles from source-ordered rules. `token_overrides` accepts authored token or design-slot names. The native button suppresses activation while disabled or loading; loading replaces text with an indeterminate ProgressBar.

`DSCard` and `DSBadge` have serialized part hosts. Call `get_part(name)` on the instantiated scene to attach a consumer Control, and set that child's `owner` to the Card root when packing a composed scene. Card exposes `density`, `interactive`, `axis_values` and `token_overrides`; Badge exposes string `content`, `variant`, `intent`, `size_axis`, `axis_values` and `token_overrides`. Badge's `icon` part accepts a consumer Control. Restyling the parent keeps those child nodes and their state. The emitted capability receipts identify omitted styles and props. Badge does not supply a default status glyph.

## Generate and verify

From the repository root:

```sh
pnpm --filter @full-stack-ds/codegen build
node packages/ds-codegen/dist/cli.js --target=godot
node scripts/godot-pilot.mjs
node scripts/engine-comparison.mjs
```

The Godot lane uses a fresh consumer project, imports resources, saves and reloads serialized Switch and composed Card scenes in separate editor processes, runs graphics-backed traces, observes Text and Divider rendering properties, checks Button input and viewport pixels painted from changed tokens, and exports/launches a macOS debug application. Install matching macOS export templates first. `GODOT` selects the binary; the default is `/Applications/Godot.app/Contents/MacOS/Godot`. The comparison also requires an activated Unity installation (`UNITY_EDITOR` override). Evidence stays under `tmp/`; no imported cache or downloaded engine assets belong in Git.

`fixtures/traces.json` was committed before implementation. Both engines consume it; the comparator requires the same run identity and ordered expected states. Unity executes these particular traces in an Editor panel; Godot executes them in an editor runtime and exported application. This comparison does not establish physical input integration or identical rendering. Unity's separate standalone lane is independent evidence, not execution of these shared traces in a Unity Player.

## Explicit limits

The generated `capabilities.json` beside each component names known excluded props. New unknown props and unsupported interaction/surface shapes reject generation. Known exclusions are not silently counted as implemented: multiple selection, variants, configurable focus/navigation, unmounting, placement/dismissal options, default-channel props and DOM form/ID fields are outside the traced behavior. Initial state can be set through `value`; callbacks adapt to signals. These adaptations do not establish full prop parity.

Channel-control Theme resources project an unconditional authored foreground fallback through normalized token/CSS facts. A changed-token probe resolves to `#123456` in the loaded Theme. The static rule probe additionally checks that a changed token reaches a rendered ColorRect. Text uses contract typography scopes for size, weight, color and line spacing; Divider uses contract color, thickness and margin facts. Button consumes a bounded action-style subset, including size and intent token rebindings, native-state colors, typography, padding and shape. Its rendered token-color probe samples a viewport pixel in the Editor and exported Player.

Godot font metrics and letter spacing are target approximations. `Text.as` and `Divider.decorative` are explicit exclusions. Button projects string content only; arbitrary native Control children are unlowered, and its indeterminate ProgressBar approximates the contract's Spinner. HTML `type`, `ariaExpanded` and `ariaPressed` are excluded. State-specific typography and geometry, unused content gap, transition styling and platform-restricted declarations remain listed as omissions in its capability receipt. Card's `title` slot lacks a normalized compound-part carrier, and its link/focus action, shadow and motion are unlowered. Badge's prose-only default status icon is not synthesized and `showStatusIcon` is excluded. The pilot does not establish heading or separator accessibility parity, root role/label projection for composites, resolved brand projection, full interaction-control styling, motion, general iconography, physical-input or arbitrary viewport support. Scene serialization is tested through Godot's editor APIs.
