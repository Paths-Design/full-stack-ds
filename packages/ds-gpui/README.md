# Full Stack DS GPUI pilot

Generated Rust views for the Boolean-control allowlist in `fsds.targets.json`.
See the [target contract and limitations](../../docs/architecture/gpui-target.md).

```sh
pnpm run generate:gpui
pnpm run test:gpui
cargo run --locked --manifest-path packages/ds-gpui/Cargo.toml --example boolean_controls
```

Generated component sources and the Cargo dependency lock are repository-owned
inputs to review. `target/` contains ignored build products; generated capability receipts are
ignored scratch regenerated with the views. GPUI and all other
third-party dependency sources remain in Cargo's external cache.
