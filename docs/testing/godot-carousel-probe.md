# Godot Carousel sequence probe

This local lane exercises an explicitly generated Carousel against the Godot
sequence runtime. Carousel remains outside the Godot registry allowlist. The
runtime and emitter are a partial native realization under
`CAROUSEL-MOTION-PARITY-01`, not a native parity claim.

Run from the bound worktree with Godot installed:

```bash
pnpm --filter @full-stack-ds/codegen build
pnpm exec vitest run packages/ds-codegen/src/frameworks/godot/factory.test.ts
node scripts/godot-sequence.mjs --render --mutations
```

`GODOT` can select another engine executable. The runner copies the authored
runtime into a unique ignored project under `tmp/godot-sequence/`, emits the
component from its current contract and sidecars, and records copied input
hashes. These projects, logs and images are regenerable evidence, not source.
The codegen build must precede the runner so its emission uses current source.

The headless budget fixture supplies finite timestamps to check composed pause
reasons, controlled acknowledgement, stale transition completion, focus stop,
explicit restart, invalid composition and teardown. The generated component
fixture uses real Godot Controls and engine event dispatch. It checks timer and
control bindings, shared progress, background pause, retained consumer identity,
transfer during movement, initial selection, and reduced-motion behavior. An
injected native preference query changes while movement is active and while
reading time is held: settlement preserves the other pause reasons and budget,
both projections respect reduction, and preference removal does not reset time.
The host can request reduction but cannot cancel a system request. Unknown native
preferences remain observable as `-1`. The spatial fixtures inject a known
non-reduced preference so their geometry is independent of the test machine.
The
geometry probe also compares equal elapsed time at increasing viewport widths,
checks the duration cap, and reverses movement with native RTL layout. The
intermediate geometry assertion seeks the actual native Tween deterministically;
it does not measure wall-clock rendering speed. Pointer events include viewport
entry and an explicit viewport size, as required for this injected-input setup.
The viewport reserves the largest minimum size among owned consumer Controls,
including inactive slides, and fills additional height supplied by its parent.
The fixture checks tall content, dynamic minimum-size changes, and removal so
released content no longer affects its previous owner's layout.

`--render` additionally opens a native Godot window. It samples the rendered
viewport during an unseeked forward transition, saves PNGs and pixel counts, and
requires several distinct intermediate edges between a full blue start and a
full green end when the native preference permits movement. If the system asks
for reduced motion, it instead requires an immediate switch without intermediate
edges. The receipt records the real DisplayServer query and effective preference;
the runner does not change operating-system settings. The additional half-budget progress screenshot is an explicit
paint sample, separate from naturally sampled movement and timed behavior.

`--mutations` alters only copies in scratch projects. It requires behavioral
failures for removed acknowledgement, stale-completion protection, reduced-motion
steps, system preference coupling, pointer intent, spatial interpolation, the size
cap, composed content sizing and the generated index binding.
A parser error, crash or timeout is inconclusive and fails the mutation run.

The native adapter consumes normalized sequence/channel facts and accessible
names. It currently presents both progress effects; authored presentation variants
are reported in `excludedProps`. Its directional glyphs and native Theme fallbacks
do not establish shared iconography or component-token styling parity. The adapter
samples Godot's `accessibility_should_reduce_animation` query before navigation
and on each processing frame, with `reduced_motion` as an additional host request.
Actual OS setting changes have not been driven in the local witness; changes are
tested through the query boundary. Engines without the query retain an explicit
unknown status. Screen-reader traversal during outgoing movement, announcements,
editor serialization, native export, arbitrary child lifecycle behavior and
other operating systems remain unverified. The existing Godot pilot's export
evidence does not cover this new sequence runtime.

See [Carousel semantics](../architecture/carousel-sequences.md), the
[Godot target boundary](../architecture/godot-target.md), and the separate
[React Native primitive probe](native-carousel-probe.md).
