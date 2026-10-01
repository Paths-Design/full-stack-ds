---
doc_id: ARCH-COMPOSITION-WORKED-EXPECTATIONS-002
authority: architecture
status: draft
title: Independent composition and animation expectations
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - packages/ds-contracts/document-model/examples/
---

# Independent worked expectations

These are authored future-runtime oracles, not evaluated observations. The [authoring rules](authoring.md) establish ownership and interpolation independently of a future implementation. The machine-readable `examples/expectations.json` carries these cases for later probes; schema qualification does not calculate any result here.

## Original inputs

Composition A owns Button A and its locally supplied arrow text; composition B owns Button B. Both reference one original Button definition. The definition defaults to label `Continue`, root translation X 0 px, opacity bound to `button.opacity` (initially 0.8), and an empty leading slot. Button A supplies label `Next`, its arrow and literal opacity 0.4. Button B inherits its label, leading slot and opacity. The definition is a paper interface, not a shipping FSDS component.

Each scene lasts 100 ticks at 1000 ticks/second. The continuous track targets Button A's root X. Its only key is X 20 px at tick 20, with linear easing. The key time retains the token `motion.arrival` (20 ms). Arrow visibility starts false and steps to true at tick 20. The visibility track changes no structure or ownership. Every modified scenario below starts from the original fixture unless stated otherwise.

## Inheritance and local ownership

| Case | Change | Button A | Button B | Required custody |
|---|---|---|---|---|
| ownership.initial | None | Next; arrow; opacity 0.4 | Continue; empty slot; opacity 0.8 | Distinct instance/composition IDs, same definition reference |
| ownership.definition | Definition label default becomes Proceed | Next | Proceed | Local label remains literal Next; inherited label remains absent |
| ownership.reset | Remove A's label override | Continue | Continue | Delete binding, do not copy Continue into A |
| ownership.slot-reset | Reset A's leading slot | Empty leading slot | Empty leading slot | Arrow identity retained for inverse custody; no definition write |
| ownership.token | Shared button.opacity changes to 0.6 | 0.4 | 0.6 | A literal persists; B remains bound through definition |
| ownership.nested | A supplies an instance of Button into its slot | Nested instance inherits its own definition unless locally overridden | Unchanged | Nested identity is independent of outer identity |

A dependency update must report both consumers, local fields protected from propagation, and incompatibilities before acceptance. Removing an addressed definition part blocks supported completion; it does not erase or reassign the override.

## Timeline observations

| Case | Setup | Tick 0 | Tick 10 | Tick 20 | Tick 100 | Saved base X |
|---|---|---|---|---|---|---|
| motion.static | Remove all X keys | 0 | 0 | 0 | 0 | 0 |
| motion.linear | Original single key | 0 | 10 | 20 | 20 | 0 |
| motion.base-edit | No key selected; set base X to 5 | 5 | 12.5 | 20 | 20 | 5 |
| motion.key-edit | Select terminal key; set its X to 30 | 0 | 15 | 30 | 30 | 0 |
| motion.explicit-start | Add X 4 key at tick 0 | 4 | 12 | 20 | 20 | 0 |
| motion.explicit-start-base | Above case; edit base X to 5 | 4 | 12 | 20 | 20 | 5 |
| motion.remove-final | Remove original final key; track disappears | 0 | 0 | 0 | 0 | 0 |
| motion.time-token | Change arrival to 40 ms | 0 | 5 | 10 | 20 | 20 | 0 |

In the time-token case, X reaches 20 at tick 40 and holds afterward. An arrival of 150 ms exceeds the scene and must diagnose incompatibility; it cannot silently clamp or resize the scene. A no-key edit at playhead 20 or 100 is still a base edit. Selecting the key changes its value even if the playhead is elsewhere. Button B stays static at X 0 throughout every A-only edit.

Arrow visibility is false at ticks 0, 10 and 19, true at ticks 20 and 100. No fractional boolean value or interpolated structure is valid. A zero-time authored key takes precedence over the implicit base. Scrubbing does not create keys or rewrite saved values; terminal hold does not become a persisted override.

## Transactions and inverse expectations

| Case | Proposed accepted action | Required result after undo |
|---|---|---|
| history.base | Set A base X 5 | Prior absent X override; inherited X 0 |
| history.key | Edit stable key ID from X 20 to X 30 | Same key ID, prior binding/time, base absent |
| history.remove | Remove final X key and empty track | Same track/key IDs and token time reference |
| history.slot | Replace supplied leading children | Prior ordered IDs and absence/presence restored exactly |
| history.insert | Insert fresh Button instance into composition | Prior edge/slot state; refuse if removal would strand later references |

Undo and redo append compensating transactions, preserving references and identities where admissible. A stale expected revision rejects all operations; a mixed valid/invalid transaction changes nothing. An undo that conflicts with later graph edits must preserve pending work and report the conflict. Before-images are authored state, not sampled values. The paper JSONL lists proposed actions only; no reducer or inverse executor runs here.

## Qualification boundary

The verifier checks draft schema shape, original example identities/addresses, token-reference retention, ledger history, oracle record shape and designated malformed neighbors. Its weakened-schema controls establish bounded sensitivity. It does not compute these tables, traverse arbitrary ownership graphs, resolve tokens, interpolate, replay history, save sources or render Button. A future evaluator must independently produce these observations from inputs, including negative cases; hardcoding the table is not an evaluator.
