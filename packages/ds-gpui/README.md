# Full Stack DS GPUI native target

Generated Rust views for the registry's
<!-- target-component-count:gpui -->6-component allowlist: Switch, ToggleSwitch,
Checkbox, Text, Badge and Divider. Normalized contract/IR facts drive native
parts, supported styling, variants, token overrides and controlled requests.
See the [target contract and exact limitations](../../docs/architecture/gpui-target.md).

```sh
pnpm run tokens:build
pnpm run generate:gpui
pnpm run test:gpui
pnpm run dev:gpui
```

The explicit native lane pins GPUI 0.2.2 and Rust 1.90.0 on macOS with Xcode/Metal.
It checks every Cargo target and runs mounted GPUI engine tests. The gallery
launcher builds a real macOS app and opens a fresh instance; optional
`node scripts/gpui-gallery.mjs --prepare-only --probe` prepares a separately
identified diagnostic app. Build hashes and live backing-surface metrics are
written inside the app's `Contents/` under ignored `tmp/gpui-gallery/`.

GPUI remains outside the TypeScript admission rail. A dedicated macOS CI lane
is configured, with remote execution still unverified. Engine input/layout
assertions and bounded gallery inspection do not establish hardware input,
accessibility, complete contract semantics, cross-platform or pixel parity.
The pinned renderer's text/edge sharpness gap remains visible.

Generated Rust component sources and the Cargo dependency lock are
repository-owned review inputs. `target/`, capability receipts, packaged apps
and native check receipts are ignored regenerable artifacts. GPUI and all other
third-party dependency sources remain in Cargo's external cache.
