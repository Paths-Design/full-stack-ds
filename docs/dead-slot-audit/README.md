# Component token audit

Run `pnpm run audit:dead-slots` after generation. The command rejects unused component declarations and unused emitted CSS declarations; no findings ledger or reseed mode exists. It checks emitted Web CSS and registered native dictionaries and keeps semantic non-use separate from component obligations.

See [the consumption contract](../architecture/design/component-token-consumption.md) for source authority, native projection, retirement decisions, and proof limits. Runtime reports are written under ignored `tmp/component-token-consumption/`.
