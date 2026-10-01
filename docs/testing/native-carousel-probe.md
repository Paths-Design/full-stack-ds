# Native Carousel primitive probe

This local lane runs the production React Native sequence primitive in a Release
iOS simulator application. It does not mount the generated Carousel. Its purpose
is to distinguish native presentation movement from a passing mock-boundary test.

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
duration. The current actor exercises one forward transition at a fixed width,
without autoplay. Generated control bindings, countdown fill/ring, interruption,
reverse navigation, reduced motion, accessibility, Android and other platform
targets require separate runtime witnesses. This lane is local and is not CI
or cross-platform parity evidence.
