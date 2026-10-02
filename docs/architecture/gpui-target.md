---
doc_id: ARCH-GPUI-TARGET-001
authority: architecture
status: active
title: GPUI target pilot
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - packages/ds-codegen/src/frameworks/gpui/**
  - packages/ds-gpui/**
  - scripts/gpui-pilot.mjs
---

# GPUI target pilot

GPUI is a registered, experimental Rust target. The allowlist in
[`fsds.targets.json`](../../fsds.targets.json) admits
<!-- target-component-count:gpui -->2 Boolean controls: Switch and ToggleSwitch.
Full-corpus generation selects that allowlist; explicit component requests reach
the emitter and fail with `GPUI_UNSUPPORTED_*` diagnostics for unsupported shapes.
GPUI has no admission descriptor and remains outside the TypeScript admission rail.

The [emitter](../../packages/ds-codegen/src/frameworks/gpui/factory.ts) consumes
`FormControlIR`, its normalized channel, invoking part, disabled binding and
Boolean defaults. It does not dispatch on component identity. GPUI entities
implement `Render` and `EventEmitter<ChangeRequest>`; a pointer activation requests
a channel change. An uncontrolled view accepts it locally. A controlled view
keeps its owner's value until the owner explicitly accepts the request.
Disabled controls suppress requests in both modes.

The Rust API projects the channel's value and default prop names into builder
methods, with optional controlled values and initial Boolean defaults. Events
carry the authored channel and handler names as metadata; `onChange` becomes a
GPUI event subscription rather than a Rust field containing a DOM callback.
`default_checked` initializes state before mounting. After an entity is mounted,
consumers update `state.controlled` or `state.disabled` through `Entity::update`
and call `cx.notify()` when the update should render.

Each component's generated `capabilities.json` lists excluded props and the
unrealized capability families. Presentation is a consumer-supplied visible label
and a Boolean indicator. Neither the label nor the indicator is an accessibility
implementation. The pilot emits no token projection, size variants, form
submission, field association, compound parts, keyboard bindings, focus policy,
surfaces or motion. Source generation does not establish full contract realization.

## Dependency and commands

The dependency is the real published `gpui = "=0.2.2"` crate, with its transitive
resolution committed in Cargo.lock. It is not a stub or a vendored copy of Zed.
The [upstream GPUI source](https://github.com/zed-industries/zed/tree/main/crates/gpui)
is actively evolving; the inspected `main` revision
`57bfce2945c96103421bbdc4cc98fc2de5efe2fa` splits application creation through
`gpui_platform`, while this published release uses `gpui::Application::new()`.
Compatibility with upstream `main` is not established by this pilot.

```bash
pnpm run tokens:build
pnpm run generate:gpui
pnpm run test:gpui
cargo run --locked --manifest-path packages/ds-gpui/Cargo.toml --example boolean_controls
```

The explicit [validation script](../../scripts/gpui-pilot.mjs) runs
`cargo check --all-targets --locked` followed by `cargo test --locked`. It checks
the generated views and the hand-authored owner-controlled example against GPUI,
then executes shared state-policy and generated-control request tests. These
script saves command logs, source hashes, toolchain and platform in ignored
`tmp/gpui-pilot/<timestamp>/report.json`. Those hashes identify the checked
package bytes; they do not provide the admission rail's four-rung binding. The
tests establish value/request policy, including owner refusal and disabled
suppression. They do not inject pointer events or observe rendered frames.

On macOS, GPUI's real build requires Xcode and the Metal toolchain. When Xcode
reports that `metal` is unavailable, install its component with
`xcodebuild -downloadComponent MetalToolchain`. Rust 1.90.0 is the initial local
validation toolchain. The crate disables GPUI's default features; no Linux or
Windows build is claimed. The package is excluded from the pnpm workspace,
and its Cargo build products remain ignored.

## Evidence and promotion boundary

`GPUI-TARGET-PILOT-01` governs the first slice. Emitter tests substitute component
identity, rename channel and part bindings, change defaults, and require explicit
rejection of unsupported shapes and callbacks. Rust tests cover the state policy
and both generated controls. The explicit Cargo lane is separate from the six
rail-admitted targets and is not a CI or pre-push obligation in this slice.

Before extending the allowlist, admit each new capability through normalized IR
and real GPUI consumers. Keyboard/focus, accessibility, token consumption and
physical pointer handling need independent runtime witnesses. Compilation and
request-policy tests do not prove visual quality, cross-framework parity,
cross-platform behavior or complete semantics for either admitted contract.
