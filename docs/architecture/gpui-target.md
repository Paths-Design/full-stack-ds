---
doc_id: ARCH-GPUI-TARGET-001
authority: architecture
status: active
title: GPUI native target
owner: "@darianrosebrook"
updated: 2026-10-02
governs:
  - packages/ds-codegen/src/frameworks/gpui/**
  - packages/ds-gpui/**
  - scripts/gpui-pilot.mjs
  - scripts/gpui-gallery.mjs
---

# GPUI native target

GPUI is a registered Rust target with a bounded macOS realization. The allowlist
in [`fsds.targets.json`](../../fsds.targets.json) admits
<!-- target-component-count:gpui -->6 components: Switch, ToggleSwitch, Checkbox,
Text, Badge and Divider. Full-corpus generation selects that allowlist; explicit
requests for unsupported shapes fail with `GPUI_UNSUPPORTED_*` diagnostics.
GPUI has no admission descriptor and remains outside the TypeScript admission rail.

## Contract and style authority

The [emitter](../../packages/ds-codegen/src/frameworks/gpui/factory.ts) consumes
normalized control/channel, anatomy, variant and `NativeStyleRulesIR` facts.
The [shared normalizer](../../packages/ds-codegen/src/native-style-rules.ts)
owns part addresses, token references and variant/state predicates. Neither
emission nor the [native style substrate](../../packages/ds-gpui/src/style.rs)
selects realization rules by component identity.

The current source vocabulary is the contract-authored Web style vocabulary
projected into native rules, with source platform restrictions retained in IR.
This is a bounded realization of supported declarations, not a substrate-neutral
style language. Native rules consume geometry, spacing, typography, color,
supported borders, pseudo marks, variants and interactive states. Unsupported
selectors/properties are itemized in regenerated `capabilities.json` receipts;
invalid admitted scalar values and token cycles fail visibly.
Implicit hover thickness changes on asymmetric rectangular borders are outside
the admitted paint geometry and fail with `GPUI_BORDER_HOVER_GEOMETRY_UNSUPPORTED`.
The current allowlist does not require that transition.

`Theme::with_token` / `set_token` accept explicit global token, component token
and design-slot addresses. Matching state/variant definitions resolve before
property consumers; instance themes do not leak to neighboring components.
Unset overrides use authored fallback values, currently the light appearance.
There is no automatic system-dark response or loader for the complete brand
override graph. Generic native font aliases map to macOS fonts; this does not
establish identical Web font metrics.

## Input and owner updates

Boolean views implement `Render` and `EventEmitter<ChangeRequest>`. Pointer
activation requests a channel change. Uncontrolled views accept locally;
controlled views retain their owner's value until the owner explicitly accepts
the request. Generated builders project the authored value/default/disabled prop
names, and mounted `set_*` methods notify GPUI observers. `onChange` becomes an
event subscription whose request carries authored channel and handler metadata.

Normalized native host capabilities select Space activation and button-host
Enter activation. Held activation keys and control/alt/platform/function
modifiers are suppressed. Disabled controls suppress requests. A persistent
`FocusHandle` survives owner acceptance and variant redraws; disabled controls
leave the tab order and mounted enabling restores their existing handle. The
consumer host owns Tab/Shift-Tab traversal through GPUI's focus API, as shown by
the gallery and mounted tests.

Checkbox's mixed mark takes precedence over its checked mark. `indeterminate`
remains an explicit owner property: a checked-value request does not clear it.
Use the mounted `set_indeterminate` setter when the owner accepts that change.

## Commands and dependency

The package pins the published `gpui = "=0.2.2"` crate and commits its Cargo.lock;
third-party source remains in Cargo's external cache. The explicit native lane
uses Rust 1.90.0. macOS builds require Xcode and the Metal compiler; when missing,
`xcodebuild -downloadComponent MetalToolchain` provisions that component.
GPUI default features are disabled. Linux, Windows and upstream `main`
compatibility remain unverified. The package is excluded from pnpm workspace
discovery and Cargo build products remain ignored.

```bash
pnpm run tokens:build
pnpm run generate:gpui
pnpm run test:gpui
pnpm run dev:gpui
```

`dev:gpui` uses the [gallery wrapper](../../scripts/gpui-gallery.mjs) to compile
the real `component_gallery` example, package it as a macOS app, and open a fresh
instance. `node scripts/gpui-gallery.mjs --prepare-only` builds the app without
launching it; `--probe` gives the app an executable-hash-specific identity for
side-by-side inspection. `FSDS_GPUI_GALLERY_DIR` selects a different output root.
The default ignored output root is `tmp/gpui-gallery/`. The app's `Contents/`
contains `build-receipt.json` with the compiled executable SHA-256 and a
read-only `render-metrics.json` written by the running gallery. These diagnostics
help identify the inspected process and its actual native backing surface.

## Evidence and gate boundaries

The [native check script](../../scripts/gpui-pilot.mjs) runs
`cargo check --all-targets --locked` and `cargo test --all-targets --locked`.
Its `fsds.gpui-native-checks.v2` receipt records command logs, toolchain/platform,
revision, required named engine tests and source hashes before/after execution.
Changed inputs or missing required engine witnesses fail the lane. Receipts live
under ignored `tmp/gpui-pilot/<timestamp>/`; their hashes do not confer the
admission rail's four-rung binding.

[Mounted tests](../../packages/ds-gpui/tests/native_runtime.rs) dispatch pointer
and keyboard events through GPUI's test engine and inspect generated entities,
styles and layout. They cover owner refusal/acceptance, disabled suppression,
held/modifier keys, focus persistence and dynamic tab eligibility, mixed/checked
marks, size geometry, token overrides, typography, Badge and Divider. Tests in
[`style.rs`](../../packages/ds-gpui/tests/style.rs) additionally exercise the
generic border paint path. Engine dispatch and paint intent do not prove OS
hardware input or GPU pixels.

The real macOS gallery has separately been inspected in bounded visible states.
Actual app pointer activation observed an accepted checked value and a refused
request retaining the owner's value. OS keyboard activation is not established
by that inspection; keyboard evidence comes from the mounted engine tests.
The gallery's generic explicit edge-quad paint makes horizontal and vertical
thin asymmetric borders visible despite the pinned renderer's border-shader
limitation. It preserves authored layout and uses no component-name dispatch.

The inspected gallery reported a 1120-by-760 logical viewport and Metal drawable
at scale 1, with matching GPUI, native-window and layer scales. That rules out a
backing-resolution mismatch for this inspected window. Plain GPUI samples share
the observed softened edges. GPUI 0.2.2's unhinted grayscale glyph rendering,
fractional placement and signed-distance edge antialiasing remain a sharpness
limit; the native paint repair does not fix that quality gap or prove pixel parity.
The [gallery source](../../packages/ds-gpui/examples/component_gallery.rs)
contains the native surface metrics and plain-renderer comparison samples.
Preserve ignored evidence under `tmp/gpui-fidelity/GPUI-FIDELITY-PARITY-01/`
before retiring the worktree.

The configured `gpui-native` job in
[`ci.yml`](../../.github/workflows/ci.yml) provisions pinned Rust/Metal on macOS,
regenerates GPUI, checks committed Rust drift, runs the native lane and uploads
ignored receipts. Remote execution of that new job is not established here.
GPUI generated-source drift also participates in the general CI/pre-push diff
and change scoping. Pre-push does not automatically compile the native package.
Neither configuration admits GPUI to the TypeScript rail.

`GPUI-FIDELITY-PARITY-01` and its emitter/native child slices govern this
implementation; merge, acceptance evidence and closure are separate lifecycle
claims. The earlier `GPUI-TARGET-PILOT-01` records the initial Boolean pilot.

## Explicit residue

| Surface | Current limit |
|---|---|
| Text | Letter spacing, text transformation, justify alignment and the `truncate` prop are omitted. A transform/justify variant builder can select an authored axis while its unsupported styling remains a recorded no-op. |
| Badge | `icon` is narrowed to `SharedString` content; arbitrary native icon children and `showStatusIcon` are not realized. |
| Divider | `thickness`, `title` and `decorative` props are omitted. Supported token/design-slot overrides still control admitted border geometry. |
| All admitted components | Accessibility semantics, screen-reader behavior, form submission, field association, motion, compound composition and arbitrary native children are not established. |
| Target breadth | The allowlist does not establish full-corpus semantics, cross-platform behavior, upstream-main compatibility or visual parity. |

Further promotion requires admitting normalized capabilities and independent
consumer witnesses for the exact new claims. Keyboard and token styling are now
implemented within these boundaries; they are no longer blanket future work.
