# Godot comparative pilot

Copy `addons/full_stack_ds` into a Godot 4.7.2 project. The generated script classes and `.tscn` scenes in `components/` are editor-importable. No editor plugin must be enabled. Channel controls depend on `runtime/control.gd`; passive text and rule shapes depend on `runtime/static_content.gd`; projected actions depend on `runtime/action.gd`; composed parts depend on `runtime/composite.gd`; `glyph_catalog.json`; generic anatomy components depend on `runtime/anatomy.gd`; wider presence surfaces (modals, sheets, toasts, coachmarks, tooltips) depend on `runtime/surface.gd`.

This is a comparative semantic pilot with bounded component admission. For interaction controls, `value` is a normalized string channel, `controlled` prevents speculative state commitment, and `value_requested`/`value_changed` expose requests and accepted state. Boolean channels use `"true"` and `"false"`. Use `add_item(key, label, body, disabled)` after attachment for compound content. Add arbitrary content to a Popover's `content` after attachment. The surface is an in-viewport CanvasLayer overlay.

`DSText` accepts `content`, `variant`, `size_axis`, `weight`, `align`, `transform` and `truncate`. `DSDivider` accepts `orientation`, `thickness` and `title`. Their generated configuration carries normalized style rules and token values; the shared runtime renders a Label or a rule ColorRect. The `capabilities.json` receipt names the excluded semantic props and target approximations.

`DSButton` accepts string `content`, `variant`, `size_axis`, `axis_values`, `token_overrides`, `disabled`, `loading`, `aria_label`, and `title`. Connect `activated` for the consumer action. It uses Godot's Button input path, including focused `ui_accept`, and resolves root, variant, and native-state styles from source-ordered rules. `token_overrides` accepts authored token or design-slot names. The native button suppresses activation while disabled or loading; loading replaces text with an indeterminate ProgressBar.

`DSCard` and `DSBadge` have serialized part hosts. Call `get_part(name)` on the instantiated scene to attach a consumer Control, and set that child's `owner` to the Card root when packing a composed scene. Card exposes `density`, `interactive`, `axis_values` and `token_overrides`; Badge exposes string `content`, `variant`, `intent`, `size_axis`, `axis_values` and `token_overrides`. Badge's `icon` part accepts a consumer Control. Restyling the parent keeps those child nodes and their state. The emitted capability receipts identify omitted styles and props. Badge does not supply a default status glyph.

`DSIcon` renders canonical iconography names. Set `glyph_name` and `size_axis` (`sm`, `md`, `lg`, `xl`), or use `set_contract_prop` with the generated contract prop names. The renderer selects the largest authored grid at or below the requested size, then rasterizes the authored SVG into the contract's size frame. An unknown name clears the texture. `currentColor` paths use the inherited Label foreground. Set `decorative = false` and `aria_label` for an informative icon. The native accessibility name and decorative-hidden flag are projected structurally; screen-reader delivery and parity are unverified.

## Admission set and boundary audit

The registry allowlist matches the Unity target's component set: every corpus contract emits a script, scene, theme and capability receipt. Widening from ten components was a capability slice — a generic anatomy shape, a wider presence-surface shape and a committed support-boundary ledger — not a registry edit.

Admission is structural, not behavioural. Each generated `capabilities.json` names the props it excludes and the semantics it does not realize; the generic anatomy shape emits a loadable part tree with inert declared props (data-driven iteration emits one host, component refs emit an empty host), and the presence-surface runtime implements an open flag and signal only — no backdrop, focus containment, dismissal, anchoring, stacking or timer. Treat every receipt's `omissions` list as the component's actual contract on this target.

Two gates pin the accounting:

```sh
pnpm run audit:godot-boundary   # ledger totality, receipt totality, inventory drift
pnpm run write:godot-boundary   # regenerate packages/ds-godot/verification/capability-inventory.json
```

A planner/ledger disagreement (a shape declining a fact the target lowers elsewhere) is recorded as a shape variance, not swallowed and not fatal. An unadjudicated contract family, a receipt that drops an excluded prop, or a drifted inventory exits non-zero.

## Generate and verify

From the repository root:

```sh
pnpm --filter @full-stack-ds/codegen build
node packages/ds-codegen/dist/cli.js --target=godot
pnpm run test:godot
node scripts/engine-comparison.mjs
```

The Godot lane uses a fresh consumer project, imports resources, saves and reloads serialized Switch, composed Card, Icon and passive Text/Divider scenes in separate editor processes, runs graphics-backed traces, checks Button input and viewport pixels painted from changed tokens and passive rules, and exports/launches a macOS debug application. The passive fixture checks constrained Text layout, nondefault alignment/case/truncation settings, rule orientation and painted pixels after scene reload. Install matching macOS export templates first. `GODOT` selects the binary; the default is `/Applications/Godot.app/Contents/MacOS/Godot`. The comparison also requires an activated Unity installation (`UNITY_EDITOR` override). `FSDS_ENGINE_OUT` selects an absolute evidence directory; the default is under `tmp/godot-pilot/`. No imported cache or downloaded engine assets belong in Git.

The package also contains a small Godot consumer project (`project.godot` and `verification/glyph_probe.gd`). With an installed Godot 4.7.2 Editor and matching macOS export templates, import and run it with `--path` pointing to the absolute `packages/ds-godot` directory. The probe prints `FSDS_GLYPH_RESULT` in Editor runtime or exported Player. It checks distinct source glyph pixels, the 16/24 authored-grid choices and 20/24/32 frames, a live inherited foreground change, informative-name projection, and unknown-name disappearance. `verification/roundtrip.gd` saves and reloads Icon properties through editor APIs. The local `.gitignore` excludes imported caches, generated UIDs, saved scenes and export bundles.

`fixtures/traces.json` was committed before implementation. Both engines consume it; the comparator requires the same run identity and ordered expected states. Unity executes these particular traces in an Editor panel; Godot executes them in an editor runtime and exported application. This comparison does not establish physical input integration or identical rendering. Unity's separate standalone lane is independent evidence, not execution of these shared traces in a Unity Player.

## Explicit limits

The generated `capabilities.json` beside each component names known excluded props. New unknown props and unsupported interaction/surface shapes reject generation. Known exclusions are not silently counted as implemented: multiple selection, variants, configurable focus/navigation, unmounting, placement/dismissal options, default-channel props and DOM form/ID fields are outside the traced behavior. Initial state can be set through `value`; callbacks adapt to signals. These adaptations do not establish full prop parity.

Channel-control Theme resources project an unconditional authored foreground fallback through normalized token/CSS facts. A changed-token probe resolves to `#123456` in the loaded Theme. The static rule probe additionally checks that a changed token reaches a rendered ColorRect. Text uses contract typography scopes for size, weight, color and line spacing; Divider uses contract color, thickness and margin facts. Button consumes a bounded action-style subset, including size and intent token rebindings, native-state colors, typography, padding and shape. Its rendered token-color probe samples a viewport pixel in the Editor and exported Player.

Godot font metrics, rounded letter spacing and integer line spacing are target approximations; Text accepts string content but not the contract's node-ref children, and its case transform follows Godot string operations. `Text.as` and `Divider.decorative` are explicit exclusions. The passive capability receipts name these gaps. Button projects string content only; arbitrary native Control children are unlowered, and its indeterminate ProgressBar approximates the contract's Spinner. HTML `type`, `ariaExpanded` and `ariaPressed` are excluded. State-specific typography and geometry, unused content gap, transition styling and platform-restricted declarations remain listed as omissions in its capability receipt. Card's `title` slot lacks a normalized compound-part carrier, and its link/focus action, shadow and motion are unlowered. Badge's prose-only default status icon is not synthesized and `showStatusIcon` is excluded. The pilot does not establish heading or separator accessibility parity, Icon screen-reader delivery, root role/label projection for composites, resolved brand projection, full interaction-control styling, motion, physical-input or arbitrary viewport support. Scene serialization is tested through Godot's editor APIs.
