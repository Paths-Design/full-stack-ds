---
doc_id: REF-NATIVE-CAROUSEL-PROBE-001
authority: reference
status: active
title: Native Carousel probes
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - scripts/react-native-carousel-host.mjs
  - scripts/fixtures/carousel-native
  - scripts/native-carousel-pixels.mjs
---

# Native Carousel probes

This local lane runs either the production React Native sequence primitive or
the generated Carousel in a Release iOS simulator application. Its purpose is
to distinguish native presentation movement from a passing mock-boundary test.
The default mode isolates the primitive; `--generated` mounts the generated
Carousel, its composed Pagination, and its own autoplay clock.

The authored fixture is `scripts/fixtures/carousel-native/App.tsx`. The host
script resolves its sequence import to the repository's actual runtime. It
creates an isolated third-party host under ignored `tmp/native-carousel-host`;
neither that host nor downloaded dependencies belong in Git. Source hashes and
the built JavaScript bundle hash accompany the native receipt.

The fixture also renders the production `BudgetProgress` fill and ring at
0%, 25%, 50%, 75% and 100%. Take a simulator screenshot after launch to inspect
the quarter arcs and fill lengths. These samples establish bounded native
geometry, not a running countdown. Shared-clock pause/reset and reduced-motion
substitution are tested separately in the React Native package; generated
Carousel progress integration remains unfinished.

## Generated component witness

```sh
node scripts/react-native-carousel-host.mjs prepare --generated
node scripts/react-native-carousel-host.mjs build --generated
node scripts/react-native-carousel-host.mjs receive --generated
```

This mode uses `Generated.tsx` and writes to
`tmp/native-carousel-generated-proof`. Install that directory's Release app and
capture it using the same procedure below. Every native package source file and
the fixture participate in the build identity, including composed dependencies.
The actor accepts the index requested by the generated component's clock; it
never calls the sequence primitive directly. The receiver requires the generated
producer kind and matching source/bundle identity.

The 2026-10-01 local iOS run produced eleven intermediate painted positions and
a correctly aligned incoming slide. The moving and settled screenshots were
inspected. This is one forward autoplay transition at 320 points, not arbitrary
native compositions or full parity. The initial Release build failed because
the source-only paging hook imported `../paging.js`; the native import now omits
the extension so Metro resolves its TypeScript source. Unit tests and TypeScript
checking had not detected that packaging failure.

The same rendered witness exposes unfinished native presentation: Pagination
still appears as a vertical text list, arrows are missing, and the elapsed
projections are not yet connected to their generated parts. These are open
findings, not evidence of parity. Device measurements again remained stationary
during visible native-driver motion; the video pixels are the movement witness.

## Running locally

Requirements: Xcode with an available iOS simulator runtime, Node, Corepack,
pnpm 10.14.0, Ruby 3.3 with Bundler, and FFmpeg. Set `FSDS_RUBY_BINARY` if Ruby
is not installed at `/opt/homebrew/opt/ruby@3.3/bin/ruby`.

```sh
node scripts/react-native-carousel-host.mjs prepare
node scripts/react-native-carousel-host.mjs build
node scripts/react-native-carousel-host.mjs receive
```

The receiver listens on loopback port 5210. In another terminal, install the
app at `tmp/native-carousel-proof/build/Build/Products/Release-iphonesimulator/FsdsCarouselWitness.app`
on a task-owned simulator. Start a `simctl io DEVICE recordVideo --codec=h264 VIDEO.mov`
recording before launching `org.reactjs.native.example.FsdsCarouselWitness`.
Wait for the receipt, then stop the recorder with Ctrl-C so it finalizes the file.
Do not reuse another task's simulator or assume that an older recording belongs
to the current build. Preserve failed receipts before rerunning the receiver.

```sh
node scripts/native-carousel-pixels.mjs VIDEO.mov \
  tmp/native-carousel-proof/native-geometry.json \
  tmp/native-carousel-proof/native-pixels.json
node --test scripts/native-carousel-pixels.test.mjs
```

The pixel analyzer checks the fixture's row below its text, normalized from
display pixels to logical coordinates. It requires blue and green regions
inside the same viewport, at least three distinct leftward intermediate edges,
and stable endpoint colors. Its negative controls reject snaps, a repeated
single position, reversed movement and a missing painted strip. Inspect the
recording visually as well; this narrowly authored color fixture is not a
general visual-quality test.

## Evidence boundaries

The receiver verifies build identity, native layout dimensions, final index and
final alignment. It deliberately does not require intermediate
`measureInWindow` coordinates to move. In the initial iOS run, those coordinates
stayed fixed while recorded pixels visibly moved. The failed original coordinate
receipt is retained separately; replacing its interpretation does not erase it.

The pixel receipt hashes the supplied recording and geometry receipt. It does
not independently attest that they came from the same launch; the operator
owns that capture association. Frame sampling also does not prove exact motion
duration. The primitive actor exercises one forward transition at a fixed width without
autoplay; the generated actor exercises one forward autoplay transition.
Native control presentation, countdown fill/ring, interruption,
reverse navigation, reduced motion, accessibility, Android and other platform
targets require separate runtime witnesses. This lane is local and is not CI
or cross-platform parity evidence.
