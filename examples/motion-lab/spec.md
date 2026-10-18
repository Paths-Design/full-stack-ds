# Motion Lab — spec

A single-page motion-effects lab. Framework-agnostic and engine-agnostic. Every implementation under `examples/motion-lab/<lane>/` must satisfy this spec using only the public API of its corresponding FSDS package (or generated native package) plus a third-party animation engine on the web lanes (GSAP) and platform-native animation on the native lanes.

## Why this app

This spec exercises the **animation** stress axis named in the examples portfolio: can a consumer — outside the design system's own code — drive real animation engines and platform animation over FSDS public exports, with **all timing resolved from the token graph**, including effects beyond whole-element movement (per-character text symbol swaps, one part inside a multi-part component, SVG internals)? The motion-substrate doctrine says taste lives in tokens, structure lives in contracts, and everything below part granularity is outside the fence; this app pressures where that fence actually sits from the consuming side.

Lanes (priority order per the requesting task): `svelte/` (GSAP), `lit/` (GSAP), `swift/` (SwiftUI native), `compose/` (Compose native). React/Vue/Angular/React Native lanes are future work, not claimed.

## Token authority

- **Web lanes** read every duration, easing, stagger, and dwell at runtime from the `--fsds-core-motion-*` custom properties that `@full-stack-ds/tokens/tokens.css` lowers onto `:root`. A missing or malformed token throws (`MotionTokenError`), naming the custom property — no silent defaults. The shared adapter lives at `../src/motion/` (`tokens.ts`, `bezier.ts`) and is unit-tested in the committed examples vitest lane.
- **Native lanes** consume `FsdsMotionTokens` constants generated from the committed `resolved.tokens.json` (a public export of `@full-stack-ds/tokens`) by `tools/gen-native-motion-tokens.mjs`. The generated files carry pure data (milliseconds, bezier control points); mapping onto `Animation.timingCurve` (SwiftUI) / `CubicBezierEasing` (Compose) lives in lane code.
- **No timing literals in effect code.** Animated durations, easings, staggers, and even replay reset delays derive from tokens in every lane. Page-layout spacing is not motion and is exempt.

## Stations

Each lane realizes the same five stations. Each station shows a live token readout naming the exact values it resolved.

1. **Entrance — whole component.** An FSDS Card composes in with opacity + rise + scale, `motion.duration.medium2` + `motion.easing.soft-enter`. Replay control.
2. **Stagger — repeated instances.** Six FSDS Badges reveal with per-item delay of `motion.stagger.sm`, each at `motion.duration.short2` + `motion.easing.quick-enter`. Stable DOM order; the stagger attaches to identity.
3. **Scramble — per-character symbol swap.** The lane splits its own label ("TOKENS DRIVE MOTION") into per-character slots with stable identity (`data-index`/`data-char`), cycles each through a symbol pool at `motion.duration.short1` with per-character offsets of `motion.stagger.xs`, then settles to the authored phrase.
4. **Part takeover — one channel, exclusively owned.** The Skeleton's own loop writer is disabled through its public prop (`animate="none"` / `.none` / `None`); the consumer then exclusively owns the opacity channel, pulsing at `motion.duration.medium` + `motion.easing.continuous` with `motion.stagger.md` offsets. The web Svelte lane pulses the internal `.skeleton__shape` parts (light DOM part classes); the Lit lane pulses component hosts; native lanes pulse hosts.
5. **Glyphs — whole SVG loop, per-path reveal.** An FSDS Icon whole-glyph rotates forever on `motion.easing.linear` at `motion.duration.medium1`. A second multi-path glyph reveals its individual `<path>` elements with `motion.duration.short3` + `motion.easing.soft-enter`, staggered by `motion.stagger.sm` (web: through the icon's rendered SVG; native: no public per-path access exists, so the native lanes substitute a whole-glyph `motion.easing.bounce` overshoot reveal and ledger the gap).

## Reduced motion

Every station substitutes a settled/static presentation under reduced motion: entrance skipped to final state, stagger settled, scramble always settled, takeover stopped at rest, loops stopped. Web lanes honor `prefers-reduced-motion: reduce` live (media-query listeners re-sync the presentation mid-session). SwiftUI honors `accessibilityReduceMotion`. Compose desktop has no OS reduced-motion signal — the lane ships an explicit in-app toggle standing in for that preference (a finding, not a silent approximation).

## Data and API layer

None. This app has no data seam; its fixtures are the stations themselves.

## Acceptance bar

- Each lane builds from committed workspace packages with its documented command (see README).
- Web lanes render in a real browser with every station live and token readouts resolved; browser-evaluated assertions and screenshots recorded under `tmp/motion-lab/` at verification time.
- Native lanes compile against the generated native packages' public API only.
- `pnpm run test:examples:data-api` passes including the shared adapter suite.
- A Svelte consumer can import `@full-stack-ds/svelte/styles.css` (packaging gap found by this app, promoted — see findings).

## Findings

Recorded while implementing; each is a portfolio-pressure result, not a workaround silently absorbed:

1. **Svelte consumer CSS export gap (promoted).** The Vue package ships `./styles.css`; the Svelte package exposed no way to load component styles through its export map (sibling generated CSS files, subpaths blocked by exports). Fixed packaging-only: `scripts/build-styles.mjs` concatenates the generated styles (import-resolving, order-preserving) into `dist/svelte.css`, exposed as `./styles.css`. No codegen or contract changes.
2. **Shadow DOM hides part-level takeover on Lit.** `.skeleton__shape` renders inside the skeleton's open shadow root; document-level part selectors cannot reach it. The Lit takeover station pulses component hosts (the cleaner boundary). Reaching an open `shadowRoot` is a platform-standard option (the Lit glyph station uses it for the icon's `<svg>` paths) — both facts are recorded, not hidden.
3. **Icon internals have no semantic part identities.** The per-path reveal binds to a DOM-order snapshot captured once at setup (web). Native lanes have no public per-path access at all (the glyph substrate renders opaque glyphs), so station 5 substitutes a whole-glyph bounce reveal there. This is the motion-substrate boundary observed from the consuming side.
4. **Compose desktop has no OS reduced-motion signal.** Unlike SwiftUI's `accessibilityReduceMotion` and the web's `prefers-reduced-motion`, Compose desktop exposes nothing equivalent; the lane ships an in-app toggle standing in for the OS preference and says so in its header.
5. **Synthetic clicks on Lit hosts do not retarget into shadow DOM.** A platform semantics note for anyone probing these lanes programmatically: dispatch clicks on the inner button (`host.shadowRoot.querySelector("button")`). Not a DS defect.

## Non-claims

- Not visual-quality proof; the stations are deliberately plain.
- Native lanes are compile-only evidence in this slice (`swift build`, `gradlew compileKotlin`); running the windows is documented for local inspection, but no automated native runtime assertions exist yet.
- Browser runtime evidence is Chromium at sampled times, reproducible via the committed dev/build commands; it is not a CI rail, and `examples/` does not join CI in this slice.
- Not five-framework web parity: Svelte and Lit only (by request). React/Vue/Angular/React Native lanes are future work.
- The examples vitest lane covers the token adapter's parsing/solving logic in Node; it does not exercise GSAP, browsers, or native runtimes.
- Nothing here admits new motion vocabulary into contracts, the IR, or emitters — by design this app pressures the consumer boundary, not the generator.
