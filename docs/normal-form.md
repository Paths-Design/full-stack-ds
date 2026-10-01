---
doc_id: ARCH-NORMAL-FORM-001
authority: architecture
status: active
title: The Normal Form of Compositional Systems
owner: "@darianrosebrook"
updated: 2026-10-01
verified_at_commit: 07d84e811
governs:
  - packages/ds-contracts/**/*.contract.json
  - packages/ds-contracts/component.contract.schema.json
  - packages/ds-contracts/primitives/Stack.primitive.json
  - packages/ds-contracts/primitives/primitive.contract.schema.json
  - packages/ds-contracts/a2ui/derive.ts
  - packages/ds-codegen/src/ir.ts
  - packages/ds-codegen/src/interaction.ts
  - packages/ds-codegen/src/interaction-runtime.ts
  - packages/ds-codegen/src/preserve.ts
  - packages/ds-codegen/src/component-token-naming.ts
  - packages/ds-codegen/src/validation/component-design-policy.ts
  - packages/ds-codegen/src/frameworks/**
---

# The Normal Form of Compositional Systems

This repository is not, primarily, a design system. It is a falsifiable claim about compositional systems, with a design system as the existence proof.

The claim, stated plainly:

> Compositional systems — systems where higher-order artifacts are assembled from lower-order ones under shared constraints — converge on a single architectural shape. That shape can be written down. Systems that conform to it compose cleanly across heterogeneous targets, regenerate safely, and survive transfer to new substrates. Systems that resist it accumulate a predictable family of symptoms — shadow files, stubbed-out implementations, force-pushes around quality gates, runtime drift between layers, irreproducible builds — that no amount of after-the-fact tooling fully fixes.

The constraint of "<!-- component-count -->55 components, 1 rendered primitive, <!-- web-framework-count -->5 Web DOM frameworks" exists to test this claim — a constraint now carried by <!-- registered-target-count -->11 registered codegen targets: the five web frameworks plus React Native (rail-admitted, a different substrate) and, outside the rail, Figma descriptors, SwiftUI, Jetpack Compose, and the bounded Unity UI Toolkit and Godot Control pilots. The five web frameworks remain the falsification surface with teeth — the only family proven end-to-end, from emission through admission to runtime — while the native targets are the adversarial extension of the same test at graded proof strength. If the same contract can drive React (function components with hooks), Vue (reactive composables), Svelte (compiler-driven runes), Angular (signals with dependency injection), and Lit (web components with reactive controllers) without leaking implementation detail into any of them — and without the contract growing per-framework escape hatches — then the contract is at the right level of abstraction for those realized facts. If it cannot, the abstraction leak should appear as target friction. Agreement across targets still does not establish that a contract fact is correct—or even influential—which is measured separately through authored review and contract mutation.

This document names the architectural shape, identifies the load-bearing pieces of this codebase that encode it, and states the falsification conditions. It is intended for readers who want to evaluate the architecture as a claim, not just use the codegen.

## Evidence status

This document argues from one concrete codebase. The current evidence is:

- <!-- component-count -->55 component contracts generated through one primitive. (Count is loader-derived — `contracts-fs.ts` walks `components/*/<Name>.contract.json`; do not hand-maintain this number, re-derive it.)
- Five Web DOM framework emitters consuming a shared IR, plus React Native on a different substrate consuming the same IR and admitted by the same rail.
- Two registered native targets outside the admission rail consuming the same IR: SwiftUI, allowlisted for <!-- target-component-count:swiftui -->52 contracts from the corpus, and Jetpack Compose, allowlisted for <!-- target-component-count:jetpack-compose -->52. Both generated roots are byte-drift-gated and compile through dedicated native CI lanes over hand-authored example consumers. SwiftUI additionally has CI-run body/state/resolver and sampled token-paint tests plus a separately invoked macOS press-proof harness for named interactions; Compose has resolver conformance tests but no UI-runtime lane. These are bounded facts, not broad native behavioral parity or device correctness.
- A bounded Unity UI Toolkit target with generated Switch, Accordion, Popover and Tabs controls, compound items, and a local UPM package. Real Unity EditMode tests verify UXML import and named interactions; this target is outside the TypeScript admission rail and has no full visual, accessibility or player-build parity claim. See [Unity pilot evidence](architecture/unity-target.md).
- Boundary checks in the IR that fail on unresolved contract references.
- Regeneration semantics that preserve custom regions while rewriting generated regions.
- An A2UI projection that exposes consumer-facing capability without renderer internals.
- A human product oracle at authorship and whole-component review time: the `src/` showcase projects every contract into component design/developer/token views, renders curated examples, and lets an author change props or repoint component-token values in the live previews. Brand files are discovered from `packages/ds-tokens/src/brands/*.tokens.json`, so adding a brand is one authored file rather than a component rewrite. An unsatisfactory result sends the author back to the owning token or contract. This practice can contradict generated output, but the repository does not claim that every such judgment has a durable per-component sign-off record.

This is sufficient to evaluate how far the seven properties hold in this repository. It is not sufficient, by itself, to prove that every declared fact is influential or correct, or that every compositional system must converge on this shape. The claim's broader scope is left for readers to test against systems they know.

The component design-binding campaign (`COMPONENT-DESIGN-BINDINGS-01`) adds another bounded instance of this split: style sidecars declare a closed design property and an independent override address; the IR publishes those facts; Web CSS supplies override/fallback syntax without changing the default style facts used by native emitters. Its browser witnesses cover editing, clearing, state interaction, and shared box scoping. They do not establish complete cross-platform retokening. `COMPONENT-TOKEN-CONSUMPTION-01` retires unused component declarations and requires property or behavior consumers, while each target emits only its used token closure; this static obligation still does not prove every selector is reachable or every visual decision is adequate. See [component design bindings](architecture/design/component-design-bindings.md).

The image-feed attempt found a declared Text truncation control with no realization and a missing anatomy children outlet. The contract now carries both, and the Angular emitter shares projected content across selectable host tags. Browser checks exercise those facts across the five Web targets; they do not establish arbitrary component completeness. See [the composed page attempt](architecture/design/retoken-page-attempts.md).

The native clipping follow-up preserves a root clipping fact with platform applicability in the IR, then lowers it separately from rounded background paint. SwiftUI region composers explicitly reject unsupported radius units at consumption. The [native follow-up](architecture/design/design-contract-recon.md#native-follow-up) records the macOS pixel and generated-consumer witnesses and their limits; it does not extend the Web override API to native targets.

Native token consumption also requires target-specific evidence. Compose's direct state lookups must retain definitions in the addressed scope, while theme references do not justify unused component-table copies. The native parity gate checks lookup coverage and shared addresses instead of requiring identical dictionaries across backends. Generated Kotlin resolver tests pin toggle fallbacks and override precedence; the projected-content control path consumes all four logical padding edges. See [component token consumption](architecture/design/component-token-consumption.md). These are binding and resolver facts, not native visual parity.

The [showcase usability follow-up](architecture/design/showcase-usability.md) separates component facts from consumer orchestration: Card no longer encodes task status as border chrome; Dialog carries bounded sizing; Walkthrough declares callback and index bindings while its example owns launch, sequence boundaries, and dismissal. Those bindings exposed generic Lit default-expression and React Native channel-read emission defects, repaired in the corresponding backends. Browser checks establish the showcase interactions; they do not establish built-in tour persistence or native anchored-tour behavior.

The [preformatted-content repair](architecture/design/preformatted-content.md) follows another browser counterexample: template indentation became visible text inside CodeBlock. The contract already declared a `pre` host. Vue, Angular, Svelte, and Lit now carry that HTML context through template emission, suppressing generator whitespace without trimming authored values. Exact-text browser checks cover the Web targets with highlighting enabled and disabled; this is a template-realization repair, not a new token or component-specific emitter exception.

The [loading-motion pilot](architecture/motion-substrate.md#first-executable-contract-repeating-loading-indicators)
adds a bounded executable witness: contracts bind repeat drivers to anatomy parts,
MotionIR resolves timing tokens and effect values, and shared Web CSS realizes
Spinner rotation and Skeleton opacity. A renamed contract challenges component
identity assumptions; browser witnesses sample progress, token timing, variants
and static reduced-motion states. Legacy transition prose remains declaration-only.
The Toast countdown additionally binds a decorative part to the existing surface
budget: web animation frames project remaining active time, while the budget alone
requests dismissal. Pause reasons compose and reduced motion substitutes discrete
steps without changing time. Native countdown carriers are not executable.
These loading and dismissal pilots extend the executable contract vocabulary without establishing native motion,
shared clocks, geometry-sensitive timing or a universal animation runtime.

## The discipline this is an instance of

The [component token cohesion migration](architecture/design/component-token-naming.md)
adds generic naming and common design-binding checks at the semantic boundary.
Contracts own state siblings, variant choices and property defaults; backends
read the actual declared token addresses. The emitted-artifact audit also
rejects unknown native reads instead of losing them during projection. Focus
and code typography consume shared semantic families while independent Web
design overrides retain clearing behavior. These are bounded source and browser
facts. Component-scoped declarations and their readers migrate together within
the packages; consumer design-binding addresses retain their identities.

The operative concern is governance, not composition. "Compositional" describes the result; governance describes the work. A system has the normal form when the rules about what can be composed with what, by whom, and under what guarantees are encoded structurally — in contracts, IRs, fail-loud boundaries, mutable/immutable site discipline, and consumer-facing descriptors — rather than encoded socially in convention, review culture, or institutional memory.

The point of encoding governance structurally is not control for its own sake. It is to **raise the floor so the quality bar is easier to hit**. Without the normal form, doing the right thing requires heroic effort by every contributor on every change. With it, the right thing is the path of least resistance, and the wrong thing is loud enough to be visible before it ships. A system in normal form does not produce better work by demanding better people; it produces consistent work by removing the choices that lead to drift.

The same discipline calibrates to the reliability of the consumer. When the consumer is a reasonably disciplined human, advisory linting and visual review can carry property 5 (fail-loud boundaries). When the consumer is a stochastic generator that will silently fabricate references it cannot resolve, property 5 has to be enforced harder — hashing, schema validation, fail-closed throws. The shape of the property is the same; the strictness scales with how much the consumer can be trusted to follow rules it has not been forced to follow. Whether this re-scaling generalizes cleanly to other substrates is a question this codebase alone cannot settle.

The [ordered-set composition](architecture/paged-collections.md) adds a bounded example of contract semantics below component presentation. A `pagedSet` descriptor and closed value/action bindings normalize into IR; shared target runtimes validate finite requests and keep a one-based field draft independent of accepted position. Pagination and PageNavigator consume those facts, while Carousel retains sequence timing and content ownership. A renamed contract lowers through every Web emitter, and display-only/selectable projection fixtures retain independently supplied completion and progress. These witnesses establish the represented position policy; they do not establish arbitrary activity workflows, validation-gated progression, stable identity under reordering, or native keyboard/visual parity.

## The move that produces normal-form systems

The seven properties are the outcome of a recurring methodological move. Naming it makes the doc actionable rather than descriptive:

1. **Refuse the surface request.** "Add a new component," "add a new variant," "add a new framework target," "add a new primitive" — these are usually requests to extend the surface rather than fix the underlying abstraction. Take the request seriously enough to ask what it is actually asking for.
2. **Diagnose the actual ask.** What is under-represented in the current contract? What state, what behavior, what consumer need is the surface request a proxy for? The diagnostic question is "what is the contract missing that makes the obvious answer wrong?"
3. **Name the domain-scoped trap.** Most surface requests are domain-specific solutions to under-represented general problems. Identify the place where one consumer's problem is being mistaken for the system's problem. That is where the wrong abstraction lives.
4. **Lower the primitive while raising the governance.** Push the new capability down into a primitive or a contract field that all consumers can use, not up into a new component or escape hatch. Simultaneously raise the governance to cover the new composition, so the lowering does not create a new ungoverned surface.
5. **Validate that governance survives the composition.** The test of the move is not "does the new thing work." It is "does the existing governance still apply to the new composition." If governance has to be relaxed to make the composition work, the move was wrong; the abstraction is still in the wrong place.

This is the move that, applied consistently, produces the constraint of "one primitive, many components" in this codebase. Each time a surface request for a new primitive was refused, the contract grew the fields that made the new primitive unnecessary instead. The result is a corpus where the primitive count has stayed at one across <!-- component-count -->55 components; it is not a proof that the primitive count would stay at one indefinitely.

The seven properties below are what falls out of running this move consistently. Read them as the residue of the methodology, not as a checklist that produces the methodology.

## The seven properties

A system in normal form has all seven of these properties. They are not independent — several imply the others — but each is worth naming because the failure modes look different when each is absent.

### 1. A typed contract that owns semantic authority for the artifact

There is exactly one governed source corpus where the meaning of an artifact lives. In this repo, the semantic root is `packages/ds-contracts/components/<Name>/<Name>.contract.json`, validated against `component.contract.schema.json`; adjacent schema-validated token and style sidecars own its realization bindings. Usage sidecars are curated documentation inputs, not codegen semantics. Generated source, generated tests, CSS, and agent-facing descriptors derive from those authorities. A human changes the owning contract or sidecar, not the generated framework realization, to make a durable change.

The word "semantic" is doing work. The contract owns what the component *means*: its anatomy, its props' types, its accessible role, its keyboard behavior, the channels through which it communicates with consumers, the events it emits. The contract does not own how any specific framework renders it, what classnames a particular CSS methodology generates, or what test harness runs against it. Those are realization details, downstream.

### 2. A framework-neutral intermediate representation derived from the contract by deterministic projection

Between contract and target sits an IR — assembled in `packages/ds-codegen/src/ir.ts` with focused semantic builders such as `interaction.ts` — that is built once per contract by `buildComponentIR` and consumed by all emitters. The IR is the single place where contract field interpretation happens. "Which props become BEM value modifiers", "which role is implicit on the chosen root element", "which surface attachment selects a controller", and "when does this form control commit its value" — these decisions are made once, in the IR, never in target-specific code.

The IR matters because it is what makes adding a new framework target *cheap*. Without it, each framework's emitter would re-interpret raw contract fields, and the cost of adding the sixth framework would be a multiple of the cost of adding the fifth. With it, a new emitter consumes the IR and produces idiomatic source — no contract semantics to relearn.

The projection from contract to IR is deterministic: a pure function, no I/O, no clock, no randomness. Given the same contract bytes, the IR is byte-identical. This is what makes regeneration safe.

### 3. One small set of typed primitives that compose into all higher-order constructs

The Web DOM component realization is composed around one rendered primitive: `Stack`, defined in `packages/ds-contracts/primitives/Stack.primitive.json`. There is no `Button` primitive, no `Input` primitive, no `Dialog` primitive. `Button` is `<Stack as="button">` with a contract that constrains its props. `Dialog` is `<Stack as="div" role="dialog">` plus compound parts, also stacks.

This is the constraint that pins the contract at the right level of abstraction. If a contract needs to escape into a new primitive to express something, the contract is missing a field. The intent is that every new behavior must be expressible *in the contract*, not in a new primitive. Across the current <!-- component-count -->55 components, no second primitive has been required; whether that continues under broader component pressure is open.

Here “one primitive” means one rendered primitive **contract**. Runtime adapters also exist: focus hooks, state adapters and `InteractionHost` bind behavior to a target element. React's host adapter can adopt an existing child without an additional wrapper. These adapters do not add component semantics to the primitive-contract corpus.

The number of primitives is part of the claim. One is not a magic number — two or three might also be in normal form for a different problem — but the claim is that the set is small, fixed, and chosen at the highest level of abstraction the domain permits. Systems that have a sprawling primitive catalog have not yet found the right abstraction.

### 4. Multiple realization targets, each idiomatic, each derived from the IR with zero contract interpretation in target code

The five Web DOM framework emitters under `packages/ds-codegen/src/frameworks/<framework>/` each consume the IR and produce framework-idiomatic source. "Idiomatic" is the operative word: the React output uses hooks, the Vue output uses composables, the Svelte output uses `.svelte.ts` rune-based stores, the Angular output uses signals with standalone components, the Lit output uses reactive controllers on `LitElement`. These are structurally opposed paradigms — immutable virtual-DOM with hooks vs. mutable shadow-DOM with controllers — and the contract abstraction spans both.

Critically, zero contract interpretation happens in target code. The React emitter does not know that `behavior.channels` exists; it knows only that the IR has `normalizedChannels` with a `callbackKind` already inferred. A target emitter that finds itself reading raw contract fields is a signal that the IR is missing a derivation, not that the target needs a new escape hatch.

The prediction the IR/emitter split underwrites is that adding a sixth target costs roughly one emitter against a stable IR. That prediction has now been tested, and the honest result is **partially confirmed**.

React Native is the sixth emitter (`frameworks/react-native/`, rail-admitted alongside the five web targets — see `packages/ds-codegen/src/validation/admission-descriptor.ts`). It consumes the same IR and required no per-component lore in the emitter. But it was **not** free: the IR had to grow substrate-aware facts to accommodate it and the other native targets — `tokenFacts`, `tokenScopes`, `BehaviorIR.normalizedChannels`, `SurfaceIR`, and the ARIA `RootSemanticsIR` projection all landed under `FEAT-MOBILE-IR-001`.

That is the informative outcome. The split held in the direction it claims — the *emitter* stayed thin and the contract grew no per-framework escape hatches — while the IR absorbed the cost, which is exactly where this architecture says cost should land. A sixth target that had forced contract changes, or per-component branches in an emitter, would have falsified the claim. One that forces IR extension refines it: the IR is the substrate-neutrality boundary, and reaching a genuinely new substrate is what moves it.

The seventh and eighth targets extend that result at graded proof strength. SwiftUI (`frameworks/swift/`, outside the admission rail) now emits its allowlisted <!-- target-component-count:swiftui -->52 contracts from the corpus, and Jetpack Compose (`frameworks/jetpack-compose/`, allowlisting <!-- target-component-count:jetpack-compose -->52) follows the same shape. Both consume the same substrate-aware IR facts, avoid per-component emitter-name lore in the enforced scope, are byte-drift-gated, and compile in dedicated native CI lanes. SwiftUI goes further: `swift test` evaluates every admitted component body and pins state, resolver, and sampled token-paint facts, while `PressProofHarness` separately exercises a bounded set of macOS interactions. Compose has no equivalent UI-runtime fact surface. None of that proves broad native behavioral or visual parity.

The native work also found the boundary of the claim: the contract and IR own portable shape, channel, and static token facts; substrate interaction physics remain target-runtime responsibility unless the contract explicitly models them. That is not a framework escape hatch, but it is a narrower claim than "all UI semantics are substrate-neutral." For those native extensions, additional representation cost landed in the IR. The bounded Unity UI Toolkit pilot subsequently reused existing boolean-control, item-interaction and anchored-surface facts without extending the IR. Its shared C# runtime owns Unity event delivery and panel geometry; its initial visual skin and supported option adapters are bounded backend work, not proof of universal design portability.

### 5. Boundary linters that fail loud on references to non-existent contract entities

The cleanest example in this codebase is `validateDomBindings` in `ir.ts`. When a contract's `anatomy.dom` block contains `bindings: { onChange: "channel:checked.onChange" }`, the IR builder walks the tree, looks up `checked` in the normalized-channels set, and *throws a descriptive error* if it does not exist. It does not silently emit a literal string `channel:checked.onChange` into the generated output. It does not log a warning. It fails the build.

This is fail-closed governance at codegen time. The principle: when the system has more information than the author (it knows what channels exist; the author might have mistyped), it rejects ambiguity loudly rather than guessing. The alternative — silent fallthrough to a literal string in the generated output — is common enough in codegen tools that we treat it as a default to be refused, not a discovery. The fail-closed choice keeps the contract authoritative; silent fallthrough lets the generated output become a second, accidental source of truth.

A system in normal form has fail-loud linters at *every* boundary where the system can detect ambiguity the author could not. The DOM-binding check is one; schema validation against `component.contract.schema.json` is another; the unresolved-type-ref pass in the IR is a third.

### 6. Stable mutable/immutable site discipline that allows human edits to survive regeneration without violating invariants

Generated files in this repo use `@generated:start`/`@generated:end` and `@custom:start`/`@custom:end` markers (`packages/ds-codegen/src/preserve.ts`). On regeneration, content inside `@custom` blocks is preserved verbatim across runs; `@generated` blocks are rewritten. CSS and pure scaffolding are always regenerated. Hand-authored TSX with detected interactive logic is preserved unless `--force` is passed.

The discipline matters because the alternative is the file mode every code generator eventually adopts: "generate once, then never regenerate, because the team has hand-edited the output." That mode means the contract is no longer authoritative. The marker discipline keeps the contract authoritative while permitting humans to extend the artifact at known sites.

The boundary itself is enforced by the system, not by the user. Editing outside a `@custom` block is allowed but documented as lossy; on the next regeneration the edit is overwritten. The user does not need to remember the rule; the rule is encoded in the output and the regeneration semantics.

### 7. A consumer-facing descriptor projected from the contract that strips renderer-internal seams and exposes only what the consumer is allowed to depend on

In this repo, the clearest instance is `packages/ds-contracts/a2ui/derive.ts`. The A2UI descriptor takes a component contract and projects it into an agent-facing view: prop allowlist, accepts, enum, required, events, form. It excludes by name (`className`, `style`, `ref`) and by type (`React.AllHTMLAttributes`, function-component shapes) — the seams that exist for renderer reasons and have no semantic meaning to a downstream consumer.

The point is not that agents are the only consumer. The point is that *every* consumer gets a projection of the contract scoped to what they are allowed to depend on. Documentation sites get prop tables. Design tools get tokens and variants. Test generators get behavior channels. Each projection is a deterministic derivation from the contract, and each one strips the seams that would let a consumer take a dependency on something that is not contractually stable.

A system in normal form has at least one such descriptor for every class of consumer that needs to reason about it without owning it.

## How the seven properties hang together

Property 1 (typed contract) gives the system a single authoritative source. Property 2 (IR) makes that source consumable by many targets at acceptable cost. Property 3 (small primitive set) forces the contract to live at the right level of abstraction by removing the escape valve of "just add a new primitive." Property 4 (idiomatic emitters with zero contract interpretation) makes the per-target cost roughly constant. Property 5 (fail-loud linters) keeps the contract authoritative by refusing to silently paper over author error. Property 6 (mutable/immutable site discipline) keeps the contract authoritative across human edits. Property 7 (consumer-facing descriptors) extends the contract's authority to consumers without exposing them to renderer detail they have no business depending on.

Drop any one of these and a predictable failure mode appears.

- Drop **property 1** and authority diffuses; multiple files become "kind of" the source of truth and they drift.
- Drop **property 2** and per-target cost compounds; the fifth framework costs 5× the first because each emitter re-derives semantics.
- Drop **property 3** and the primitive set grows without bound; "compositional" becomes aspirational.
- Drop **property 4** and the contract leaks; targets accumulate framework-specific escape hatches that the contract has to track.
- Drop **property 5** and the contract becomes suggestive; consumers learn not to trust it and start reading the generated output instead, which becomes the de facto source.
- Drop **property 6** and the contract stops being authoritative the first time a human edits a generated file.
- Drop **property 7** and consumers couple to renderer internals; the contract owns semantics on paper but cannot be changed in practice without breaking everyone.

These are not hypothetical. They are the symptoms that show up across the broader software industry whenever a system that *should* be compositional is not. Shadow file proliferation, stubbed-out implementations, force-pushes around quality gates, runtime drift between layers, irreproducible builds — these are not unrelated quality problems. They are the symptom catalog of compositional systems missing the normal form, and they are mostly diagnostic of which property is missing.

## Two functions worth reading carefully

`validateDomBindings` and `buildFormControlIR` in `ir.ts` are two clear instances of the discipline in this codebase. Most of the IR is mechanical translation; these functions encode architectural choices.

**`validateDomBindings`** is property 5 made concrete. It walks the IR's `DomNodeIR` tree, looks up every `channel:X` reference against the normalized-channel set and every `prop:Y` reference against the styled-prop set, and throws on the first violation. The comment in the source makes the intent explicit: "Throws a descriptive error so contract authors see exactly what went wrong... rather than silently emitting a literal string in the generated output." The function could have been a no-op. It could have logged a warning. It could have emitted the literal string and let the framework reject it at runtime. It throws. That is the discipline.

**`buildFormControlIR`** separates semantic intent from framework event idiom. A control contract names its rendered interactive part, value channel/model, and commit semantic (`input`, `change`, or `activation`). The builder validates that the part exists, is interactive, renders exactly once, and that the channel type agrees with the value model. It then injects one normalized event binding on that part. React, Vue, Svelte, Angular, and Lit spell the listener differently—including React's idiomatic `onChange` for the same per-input text commit that the other Web targets spell as `input`—but none decides whether a text field is per-keystroke or blur-timed. The same target part also receives ambient Field association, so a compound checkbox labels its native input rather than its wrapper. Native form serialization remains a separate `form` fact: ToggleSwitch is a boolean control without falsely claiming that its button realization contributes to `FormData`.

`buildInteractionIR` in `interaction.ts` applies the same discipline to trigger/content relationships. Contracts name the channel, triggering parts, operation and presence policy. It validates those references, synthesizes plain activation bindings, and binds trapped content to a focus handle. The shared web runtime owns controlled-state commits, cancellation and repeated-item transitions; framework adapters own reactive inputs and host attachment. Renamed-contract tests and browser witnesses cover this migration, including the matrix disclosure and real inactive-panel visibility. They do not establish complete focus-policy or accessibility parity; see [Interaction substrate](architecture/interaction-substrate.md).

`buildKeyboardActions` in `ir.ts` shows what the discipline buys when a realization has to reach every target at once. A structured `a11y.keyboard` entry may declare a `behavior` drawn from a closed vocabulary — `open`, `select`, and the four `roving-*` moves — and the IR lowers it into a keydown realization bound to the `when` part's rendered node. The op sequence is derived from declared facts only: the boolean channel for `open`, the `compositeControl` part for `select`, and `focus.strategy`, `focus.orientation` and `focus.wrap` for the roving moves. All five web emitters consume that op sequence; none of them knows which component it came from. The vocabulary being closed is the load-bearing part — an open one would let a contract smuggle a per-component instruction through as data. An entry that omits `behavior` produces no IR fact at all and stays declaration-only, realized by native host semantics or a behavior primitive, which keeps the declaration honest about what it does and does not attach.

These builders make the distinction between declared intent and an attached, observable realization explicit.

The Dialog opening-focus repair is a further bounded realization of the same split. The contract binds optional selector/element-ID props; `focusTargetProps` derives their primitive targets in the IR; each web adapter follows its mounted panel and preserves the activation's return target through portal replacement. Renamed-policy tests reject dependence on conventional prop names, and `e2e/dialog-focus.spec.ts` checks opening, static-content targeting, wrapping, return and non-modal focus across the five Web targets. The React conditional-composition regression fails with the original hook. This does not establish outside inertness, native focus parity, or realization of the contract's legacy transition prose.

## The cross-paradigm spread is the test

The five Web DOM frameworks were chosen for paradigm spread, not popularity. The contract must drive:

- **React** — function components, hooks (`useEffect`, `useState`, `useCallback`), synthetic events, virtual DOM, immutable props, hooks-as-state.
- **Vue 3** — single-file components, `<script setup>`, reactive composables, refs and reactives, template syntax with directives, value-shaped event handlers.
- **Svelte 5** — `.svelte` compiler output, runes (`$state`, `$derived`, `$effect`), `.svelte.ts` for shared logic, native event handlers, compiler-driven reactivity.
- **Angular** — standalone components, signals, dependency injection, decorators, RxJS-adjacent reactivity, change detection, two-way binding via `[(ngModel)]`-style conventions.
- **Lit** — web components, `LitElement`, reactive properties, reactive controllers, shadow DOM, tagged template literals, attribute reflection.

Hooks vs. controllers, virtual DOM vs. shadow DOM, immutable props vs. mutable reactive properties, synthetic events vs. native events, function components vs. classes. These paradigms are not minor variations on a theme. They are different answers to the same questions, and the contract must give an answer that is correct in each idiom without being framed in any of them.

The contract currently drives all five idiomatically, with hundreds of passing tests per framework. One leak mechanism is concrete: target code wanting component-specific interpretation rather than a shared IR fact. `no-component-name-lore.test.ts` rejects that form in the enforced emitter scope. It is not the only leak mechanism. A contract field can also be accepted and carried without affecting any realization. The expanded full contract-oracle profile detects nine of eleven curated one-leaf mutants and lets two survive end to end: the exact Badge mutations `rtl.flipIcon` true→false and `ssr.hydrateOn` none→interaction. Dialog's first state-machine event `open`→`reveal` survived the 2026-09-05 measurement and was killed at `generate-check` by the trigger-binding semantic rule (`FEAT-STATEMACHINE-TRIGGER-BINDING-01`, targeted full-profile run at `0641cf9f`): a transition event must now resolve to a declared trigger referent, so a name that references nothing fails the structural gate. Card's `actions` slot `required` false→true was killed at `root-tests` by the usage-audit obligation (`FEAT-SLOT-REQUIRED-USAGE-BINDING-01`, targeted full-profile run at `e6303029`): consumer-supplied required regions must be supplied by every curated frame. In contrast, a wrong `textOverflow.line` binding reaches the IR but is contradicted by a hand-authored IR-authority test, while a motion-property change is caught by the contract-derived motion ledger. The IR is centralized and shared, but neither its size nor emitter agreement proves every declared fact is consumed or correct.

The earlier non-web extensions have graded proof strength: React Native (rail-admitted with package runtime tests), SwiftUI (allowlisted emission, CI compile/test and sampled paint facts, plus a separately invoked macOS interaction harness), and Jetpack Compose (partial-corpus compile and resolver-test evidence). The question this section used to close on — whether a sixth or seventh framework would expose a leak — has been partially answered: three further targets landed without contract escape hatches or per-component emitter-name lore in the enforced scope. Whether the same line holds under broad native device behavior, accessibility, and visual pressure remains open.

## What this is not

This document does not claim that this codebase is the only well-designed compositional system. It claims that compositional systems that work well exhibit these seven properties, and that the codebase is one demonstration that the properties are achievable in practice for a non-trivial domain.

It does not claim that the codebase is feature-complete or production-grade beyond its own scope. The <!-- component-count -->55 components were chosen to exercise the contract; they are not optimized for adoption.

It does not claim that this is the only architectural shape compositional systems converge on. It claims this is *one* shape, written down, and offered for comparison against others.

## Falsification conditions

The claim is broad. It is also narrow enough to be falsified. The clean falsifications:

1. **A system lacking one property that matches or beats this system on predeclared outcomes.** "Works well" cannot be defined by restating the seven properties. On a fixed corpus and target sequence, compare externally observable measures such as semantic-defect escape under seeded mutations, regeneration loss/divergence, marginal engineering time for the next heterogeneous target, and consumer breakage after renderer-internal refactors. Declare the workload and thresholds before observing the result. A system without a framework-neutral IR, fail-loud boundary linters, or consumer descriptors that matches those outcomes would falsify the necessity of property 2, 5, or 7 respectively.

2. **A system with these seven properties that fails to compose.** Built the way the document describes, runs into the symptom catalog anyway. This would tell us the properties are insufficient and there is at least one more.

3. **A class of compositional systems where the contract cannot be made framework-neutral.** If there is a domain where the substrate fundamentally requires per-target semantic interpretation — and not just per-target syntactic translation — then property 4 fails for that class, and the claim must be narrowed.

The seven properties are stated at the level of generality where they are meant to compare against other compositional systems. Whether they do is left to the reader to test against systems they know.

## What this codebase demonstrates, and does not

The Image media probe exercises a further bounded use of the existing normal
form: finite value maps are accepted in `cssVariableBindings` as well as
attribute bindings, with the same source/domain validation. Image maps semantic
ratio presets to Web CSS ratios in its contract; emitters consume the normalized
map without knowing the component's name. This is a DOM realization, not evidence
that a native backend supports arbitrary CSS-variable bindings. React Native's
runtime-use collection now follows only the CSS bindings its existing native
lowerings actually consume. See [the page attempts](architecture/design/retoken-page-attempts.md).

It demonstrates that, for the <!-- component-count -->55 components built so far, a single typed contract corpus drives idiomatic source across React, Vue, Svelte, Angular, and Lit through one shared IR and one primitive — with React Native admitted to the same rail, the allowlisted SwiftUI emitter carrying bounded compile/test/paint/host-interaction facts outside it, and the partial-corpus Jetpack Compose emitter carrying compile and resolver-test facts outside it — with fail-closed boundary checks and preserved custom regions across regenerations. The IR centralizes semantic interpretation in the codegen layer, with focused builders beside its main assembly module; that relocation is an observable complexity cost, not evidence that the IR is small. A reader can clone the repo, regenerate, and inspect the IR and representative contracts directly.

It does not demonstrate that every compositional system must take this shape, that the contract will continue to hold past 100 components, that native behavior is broadly runtime-correct, that macOS host facts transfer to iOS/Android devices, or that the architecture transfers to substrates outside UI engineering. The Unity pilot adds a further bounded import/interaction witness. The Godot comparative pilot adds shared state traces across a Unity Editor panel and a Godot exported application, plus a narrow foreground-token projection. Neither establishes a broader native guarantee. Those are open questions, named here so the reader does not have to infer them.

The Compose supplied-source follow-up restores consumption of the shared
minimum-height slot in its outer chrome. All source branches use a minimum
constraint rather than a fixed height. Token parity, renamed-contract source
checks and Kotlin library compilation/tests establish the binding; they do not
establish rendered layout on Android devices.

## Carousel motion reconciliation

Carousel adds normalized sequence and motion facts without another rendered primitive contract. Renamed-contract tests exercise each web emitter to guard against component-name dispatch. React Native derives navigation, controlled index, reading-budget and token-resolved movement bindings from that sequence IR. A generated consumer's own autoplay clock drives a recorded iOS Simulator slide transition, with intermediate pixels observed; its controls, icons and progress presentation remain incomplete. The SwiftUI and Compose allowlists do not yet include Carousel. See [native implementation boundaries](architecture/carousel-sequences.md#native-implementation-work-in-progress) and the [bounded iOS witness](testing/native-carousel-probe.md).

Each progress binding declares its presentation condition in the motion contract.
The IR validates the variant axis and choices; web runtimes project visibility
without restarting the shared budget. Browser tests cover the default and explicit
indicator modes. The bounded Godot probe consumes the same conditions and composed
part ownership, with mutation controls for presentation and timer validity; it is
outside the registered component allowlist and does not establish native styling parity.

Figma descriptors carry normalized motion facts with a `descriptor-only`
realization label. Their serialized sequence metadata preserves the control
channel, shared reading budget, both progress bindings and size-aware movement
profile. Renamed-channel and transfer tests establish that metadata survives
emission; they do not establish a Figma prototype or native execution.
