---
doc_id: REF-GODOT-CAROUSEL-PROBE-001
authority: reference
status: active
title: Godot Carousel sequence probe
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - scripts/godot-sequence.mjs
  - packages/ds-godot/verification/sequence.gd
  - packages/ds-godot/verification/sequence_render.gd
---

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
# Also build and run a fresh local macOS app using installed export templates:
node scripts/godot-sequence.mjs --export --mutations
```

`GODOT` can select another engine executable. The runner copies the authored
runtime into a unique ignored project under `tmp/godot-sequence/`, emits the
component from its current contract and sidecars against the resolved contract
corpus, and records copied input hashes. Progress placement is an IR fact resolved
through the referenced Pagination anatomy; the native adapter does not infer
ownership from CSS selectors or assume that the picker is locally owned. These projects, logs and images are regenerable evidence, not source.
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
checks the duration cap, and reverses movement with native RTL layout. It checks
the shared square-root policy at a completion boundary: with a 250ms base and
320px reference, a 640px viewport remains unsettled at 353ms and settles by
354ms. The capped movement at 1280px must match 2560px. A monotonic larger-is-slower
check alone missed an earlier linear-scaling defect and is insufficient evidence.
The
intermediate geometry assertion seeks the actual native Tween deterministically;
it does not measure wall-clock rendering speed. Pointer events include viewport
entry and an explicit viewport size, as required for this injected-input setup.
The viewport reserves the largest minimum size among owned consumer Controls,
including inactive slides, and fills additional height supplied by its parent.
The fixture checks tall content, dynamic minimum-size changes, and removal so
released content no longer affects its previous owner's layout.

`--render` additionally opens a native Godot window and instantiates the emitted
PackedScene, including its Theme resource. It samples the rendered
viewport during an unseeked forward transition, saves PNGs and pixel counts, and
requires several distinct intermediate edges between a full blue start and a
full green end when the native preference permits movement. If the system asks
for reduced motion, it instead requires an immediate switch without intermediate
edges. The receipt records the real DisplayServer query and effective preference;
the runner does not change operating-system settings. The additional half-budget progress screenshot is an explicit
paint sample, separate from naturally sampled movement and timed behavior.

`--export` also runs that probe from a newly exported macOS debug application.
The exporter imports the unique scratch project, packages its normal main scene,
and launches the extracted executable without a project-path or script override.
The same probe records an exported-runtime flag, executable path and unique run
identity; the runner rejects a receipt from another run or the editor executable.
Images and observations are separate under `exported-witness/`, with the archive
hash and generated source hashes in its provenance record. This is an unsigned
local app, not a distributable release or proof for other operating systems.

`--mutations` alters only copies in scratch projects. It requires behavioral
failures for removed acknowledgement, stale-completion protection, reduced-motion
steps, system preference coupling, pointer intent, spatial interpolation, the size
cap, square-root scaling, composed content sizing and the generated index binding.
A parser error, crash or timeout is inconclusive and fails the mutation run.
The current-slide accessibility binding is checked separately from the native
accessibility tree: a correct boolean does not prove the platform received it.

## Native accessibility inspection

```bash
node scripts/godot-sequence.mjs --inspect-ax
node scripts/godot-sequence.mjs --inspect-ax --ax-control
FSDS_SEQUENCE_PHASE=transfer node scripts/godot-sequence.mjs --inspect-ax
```

These commands enable accessibility for the probe process and open a native
window for external inspection. They do not enable a system screen reader or
assert an automatic accessibility pass. The moving fixture seeks and pauses the
native tween: only Green slide action should be exposed, although both slides
remain painted. Activating Next should expose Blue slide action instead. The
scratch-only `--ax-control` removes the wrapper's native hidden flag; both actions
should then be exposed. The transfer fixture expects the moved Blue action under
Independent content and the retained Green action under Featured content.

On the inspected macOS/Godot 4.7.2 editor-binary run, native accessibility-tree
inspection reproduced both actions before repair, only the current action after
repair, and both again with the hidden-flag control. Native Next activation also
changed the exposed action correctly. This is tree and activation evidence, not
spoken VoiceOver output. The packaged entry point accepts `FSDS_SEQUENCE_PHASE`
for the same diagnostic, but the packaged transfer attempt timed out after 110
seconds without a readable native tree. Exported accessibility and post-transfer
assistive traversal remain unverified; ordinary exported rendering passed.

The native adapter consumes normalized sequence/channel facts and accessible
names. Progress presentation follows the contract-declared `when` condition,
composed with timer validity and active-item ownership. Switching between picker,
ring and both preserves the remaining budget. A manual sequence keeps a separate
selected-item cue while hiding timer projections. Its directional glyphs and native Theme fallbacks
do not establish shared iconography or component-token styling parity. The adapter
samples Godot's `accessibility_should_reduce_animation` query before navigation
and on each processing frame, with `reduced_motion` as an additional host request.
Actual OS setting changes have not been driven in the local witness; changes are
tested through the query boundary. Engines without the query retain an explicit
unknown status. Screen-reader speech, announcements,
editor-authored scene serialization, arbitrary child lifecycle behavior and
other operating systems remain unverified. The exported-app probe establishes
the bounded rendered transition and progress-paint scenario; the wider timer,
input, ownership and mutation fixtures still execute through the editor binary.

Progress visibility has one final owner in each adapter. The optional
`motion.progress[].when` condition names a declared variant axis and a nonempty
set of its values. The IR rejects unknown axes/values; framework props supply
the live presentation choice. Web and Godot runtimes combine it with timer
validity and current-item visibility, including immediate updates while paused.
The native probe removes the presentation and validity checks independently and
requires the corresponding behavioral failures. The declared condition does not
establish generated progress rendering in React Native, SwiftUI, Compose or Unity.

See [Carousel semantics](../architecture/carousel-sequences.md), the
[Godot target boundary](../architecture/godot-target.md), and the separate
[React Native primitive probe](native-carousel-probe.md).
