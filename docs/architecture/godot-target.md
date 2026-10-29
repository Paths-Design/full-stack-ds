---
doc_id: ARCH-GODOT-TARGET-001
authority: architecture
status: active
title: Godot comparative pilot
owner: "@darianrosebrook"
updated: 2026-10-29
governs:
  - packages/ds-codegen/src/frameworks/godot/
  - packages/ds-godot/
---

# Godot comparative pilot

`GODOT-COMPARATIVE-PILOT-01` adds an explicit Godot target and compares it with Unity using the frozen [semantic traces](../../packages/ds-godot/fixtures/traces.json). See [package instructions and limits](../../packages/ds-godot/README.md).

The lowering path is contract → ComponentIR → GDScript/PackedScene/Theme resources → shared Godot Control runtime. Dispatch uses value model, interaction operation, surface attachment, passive anatomy shape, and projected action content, not component identity. The generated controls carry operation and declared defaults; only the bounded behavior named in the capability receipt is realized. Unsupported shapes and unknown props reject emission; known excluded props remain named rather than receiving support credit. Passive text and rule shapes use the shared static-content runtime. Their style configuration is projected from normalized native style rules and token facts, including variant-scoped overrides. Projected actions use a separate shared runtime that resolves source-ordered token and style rules at render time, including size, intent, hover, pressed, focus, disabled, and token/design-slot overrides.

The initial common observations cover uncontrolled/disabled boolean state, controlled request versus commitment, collapsible single selection, disabled tab selection and surface toggling. Godot's native CheckButton and scene tree replace Unity UI Toolkit's button/visual tree. The surface uses a CanvasLayer within the viewport. This is a substrate choice, not a change to the shared state trace.

The test fixture saves/reopens a serialized scene through editor APIs, checks token fallback values in loaded Theme resources, executes graphics-backed observations and exports a fresh macOS application. The comparison runs Unity Editor-panel traces against Godot runtime/export traces. It requires matching run IDs and exact expected sequences. It does not claim input-device integration, accessibility, arbitrary composition, full visual parity or shared traces executed in a Unity Player.

For Switch, Accordion, Popover, and Tabs, the foreground Theme projection is intentionally narrow. Its changed-token probe reads `Theme.get_color()` and frees the probe before rendering; that observation does not prove rendered consumption. Text and Divider have a separate runtime witness: Text content, variant font size and weight, line spacing, and Divider orientation, thickness, margin and changed token color are checked on live Label and ColorRect nodes in the Editor and exported macOS Player. The action witness checks Button content, a focused `ui_accept` input path, activation suppression while disabled or loading, size and intent styles, native state styleboxes, and a changed token color sampled from the viewport image in both Editor and exported macOS Player. These are source-identified local observations, not a general visual or input-device parity claim.

`DSButton` exposes string `content`, `activated`, `variant`, `size_axis`, `axis_values`, `token_overrides`, `disabled`, `loading`, `aria_label`, and `title` through the shared action runtime. Authored defaults initialize action state before consumer overrides. Its capability receipt names the unsupported CSS and selectors, including state-specific typography and geometry and unused content gap. Native Control composition for arbitrary Web children is unlowered; Godot's indeterminate ProgressBar approximates the referenced Spinner. HTML `type` and `ariaExpanded`/`ariaPressed` are excluded. Authored transition rules and platform-restricted visual declarations are not silently treated as engine styling. Godot font metrics and letter spacing remain target approximations. `Text.as` and `Divider.decorative` remain excluded semantic props, so these admitted components do not establish full cross-target fidelity or accessibility parity. Expanding component admission follows capability decisions and independent consumer workflows, not the number of scenes that compile.

At source `62f37334`, comparison run `5af9bd21-83b8-4e79-ad7c-6fa825ccc9a2` passed the frozen cases against Unity 6000.5.3f1 and Godot 4.7.2. The Godot macOS export used the matching export template, Compatibility rendering, and ETC2/ASTC texture import. Run evidence includes `comparison.json`, per-engine receipts, editor serialization logs and an exported screenshot. Source trees and the trace file are hashed in the comparison receipt. The default `standalone` feature-name assumption was rejected during harness development; the exported witness uses Godot's `template` feature tag.
