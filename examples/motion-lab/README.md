# Motion Lab

Consumer-side proof that third-party (GSAP) and platform-native animation can drive FSDS public exports with **every timing value resolved from the FSDS motion token graph** — including effects beyond whole-element movement: staggered repeats, per-character symbol swaps, exclusive single-channel takeover inside a component, and SVG glyph effects.

The authority surface is [`spec.md`](./spec.md). Four lanes realize it: `svelte/`, `lit/` (GSAP), `swift/`, `compose/` (native animation). See the portfolio rules in [`../README.md`](../README.md).

## The one idea

Taste lives in tokens. Each lane animates against public package exports, and every duration / easing / stagger / dwell is read from the token graph at consumption time — CSS custom properties on the web (`--fsds-core-motion-*` from `@full-stack-ds/tokens/tokens.css`), committed generated constants on native (`FsdsMotionTokens`, from the same graph). A missing token throws; nothing silently defaults. Retime the token graph and every lane retimes with zero code changes.

```
token graph ──► tokens.css (--fsds-core-motion-*)  ──► shared adapter (src/motion) ──► GSAP
            └─► resolved.tokens.json ──► tools/gen-native-motion-tokens.mjs ──► FsdsMotionTokens ──► SwiftUI / Compose
```

## Running the lanes

All commands from the repo root (workspace install assumed).

```bash
# Web lanes (GSAP) — build/typecheck/serve
pnpm --filter @full-stack-ds/example-motion-lab-svelte build
pnpm --filter @full-stack-ds/example-motion-lab-svelte check    # svelte-check
pnpm --filter @full-stack-ds/example-motion-lab-svelte dev      # serve + open

pnpm --filter @full-stack-ds/example-motion-lab-lit build       # tsc --noEmit + vite build
pnpm --filter @full-stack-ds/example-motion-lab-lit dev

# Shared adapter suite (parsing, bezier solver, fail-loud probes)
pnpm run test:examples:data-api

# Native lanes
swift build --package-path examples/motion-lab/swift            # compile admission
swift run  --package-path examples/motion-lab/swift             # opens the window (local)
pnpm run typecheck:example:motion-compose                        # gradlew compileKotlin
./examples/motion-lab/compose/gradlew -p examples/motion-lab/compose run   # opens the window (local)
```

Sandboxed-environment notes (observed under a restricted shell, not needed in CI): `swift build` may need `--disable-sandbox` (SwiftPM's own `sandbox-exec` wrapper conflicts with outer sandboxes), and the Gradle wrapper may need `GRADLE_USER_HOME` pointed somewhere writable inside the workspace; Kotlin compilation then falls back from the daemon to in-process, which still compiles.

## Regenerating the native token constants

```bash
node examples/motion-lab/tools/gen-native-motion-tokens.mjs
```

Reads the committed `packages/ds-tokens/generated/resolved.tokens.json` and rewrites the two generated files (`swift/Sources/MotionLab/Generated/FsdsMotionTokens.swift`, `compose/.../Generated/FsdsMotionTokens.kt`). Fail-loud: a missing token aborts the generator. Regenerate and commit whenever the motion token graph changes.

## Evidence captured at verification time

Browser runtime evidence (Chromium, sampled states) for the web lanes is recorded under `tmp/motion-lab/` (gitignored scratch): `svelte-evidence.json`, `lit-evidence.json`, and four full-page screenshots (`{svelte,lit}-{default,reduced}.png`) covering default and reduced-motion emulation. The assertions cover: token readouts resolving real values, entrance/stagger/settle behaviors, mid-pulse skeleton opacities, live rotation matrices, scramble mid-swap symbol pools and identity-preserving settles, per-path SVG reveals, and complete reduced-motion substitution.

## Findings and boundaries

See [`spec.md`](./spec.md#findings) for the full findings ledger (Svelte CSS export gap promotion, Lit shadow-DOM part targeting, icon per-path identity boundaries, Compose reduced-motion signal, synthetic-click shadow semantics) and the non-claims. Headline boundaries: native lanes are compile-only evidence; web evidence is Chromium at sampled times; no new motion vocabulary enters contracts/emitters from this app.
