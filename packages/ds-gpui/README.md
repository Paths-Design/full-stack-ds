# Full Stack DS GPUI native target

Generated Rust views for the registry's
<!-- target-component-count:gpui -->7-component allowlist: Switch, ToggleSwitch,
Checkbox, Text, Badge, Divider and Stat. Normalized contract/IR facts drive native
parts, supported styling, variants, token overrides, controlled requests and
retained native content. Stat adds prominent size/trend styling.
See the [target contract and exact limitations](../../docs/architecture/gpui-target.md).

```sh
pnpm run tokens:build
pnpm run generate:gpui
pnpm run test:gpui
pnpm run dev:gpui
```

Text, Badge, Switch and Stat expose `content(NativeContent)` and mounted
`set_content` / `clear_content` methods. Retain a generated component with
`NativeContent::view(entity)`; use `text`, ordered `group` or a fresh-element
`factory` for frame content. Explicit empty content suppresses the legacy label;
clearing content restores it. Named anatomy slots generate typed slot keys at
their authored positions. Checkbox and ToggleSwitch keep their bounded label API.
Repeated insertion sites and duplicate supplied view handles are rejected.
Factory-returned views and nested component placement remain consumer-owned.
Optional variants with an empty default can be reset to `""`, including Stat's
trend; `neutral` is a separate authored style.

The explicit native lane pins Zed revision `a38fc8c8de6e4010fadcfde7dd111d90dfd66845`
and Rust 1.94.1 on macOS with Xcode/Metal. It includes upstream device-pixel
snapping and macOS glyph dilation, and enables the real native font backend.
It checks every Cargo target and runs mounted GPUI engine tests. The gallery
launcher builds a real macOS app and opens a fresh instance; optional
`node scripts/gpui-gallery.mjs --prepare-only --probe` prepares a separately
identified diagnostic app. Build hashes, renderer sources and live font/surface metrics are
written inside the app's `Contents/` under ignored `tmp/gpui-gallery/`.

GPUI remains outside the TypeScript admission rail. A dedicated macOS CI lane
is configured, with remote execution still unverified. Engine input/layout
assertions and bounded gallery inspection do not establish hardware input,
accessibility, complete contract semantics, cross-platform or pixel parity.
Mounted fractional-layout tests establish device alignment through redraws;
native glyph coverage and presented image quality require the live gallery.

Generated Rust component sources and the Cargo dependency lock are
repository-owned review inputs. `target/`, capability receipts, packaged apps
and native check receipts are ignored regenerable artifacts. GPUI and all other
third-party dependency sources remain in Cargo's external cache.
