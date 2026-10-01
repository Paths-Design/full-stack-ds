---
doc_id: ARCH-COMPOSITION-AUTHORING-PAPER-002
authority: architecture
status: draft
title: Composition ownership and animation authoring
owner: "@darianrosebrook"
updated: 2026-10-01
governs:
  - packages/ds-contracts/document-model/
---

# Composition ownership and animation authoring

Draft 0.2.0 records the user's confirmed ownership and keyframe rules. It is a paper contract: schemas qualify authored shapes, not inheritance, animation, replay, durable saves, or source edits. Read [relationships](relationships.md) for the surrounding project boundaries and [worked expectations](worked-expectations.md) for independent future runtime oracles.

## Definitions, compositions and consumers

A reusable definition publishes a stable identity/version, parameters, named parts with eligible property consumers, and slots with child constraints. This draft's definition schema describes that interface and its defaults, not an arbitrary component implementation or complete reusable visual tree. The original Button example is a declarative interface, not the existing FSDS Button contract or a renderer.

A composition owns one frame root and explicit `nodeIds` membership. Each page node belongs to exactly one composition; its membership includes its root. Structural edges determine the rendered graph. An unused local node can remain an inactive member after a slot is cleared, preserving its identity for reuse/undo; it is not implicitly rendered. Its tracks retain their keys and report an inactive target rather than creating a rendered child or changing ownership. General inactive-node cleanup and deletion remain later work. A scene references a composition identity and adds local time and tracks. The worked scenes consume different compositions. They share a Button definition, not a frame or instance identity. Deliberately referencing one composition from multiple scenes shares its base edits; merely using the same definition does not. Creating a scene does not automatically create a linked copy of another composition. Scene creation, duplication and reusable whole-composition instances need the later graph design.

A component instance retains a definition reference, parameter bindings, root-property overrides, part-property overrides and supplied slots. Only present fields override inheritance. A supplied slot list, including an empty list, is explicit local content; an absent slot inherits definition content. Definition fallback content is represented by a declared fallback identity in this bounded interface, not copied into the consumer graph. Instance `children` is empty: supplied slot node IDs are its structural ownership edges. Frames/groups retain ordered `children` edges. These two representations must not own the same child twice.

Nested instances keep their own identities and definition references. Supplying a nested Button into an outer Button's slot changes that outer consumer's slot; changing the nested Button changes that nested instance only. Definition updates reach inherited addresses in every compatible consumer, including nested consumers. A local override of one property does not detach the entire instance or freeze all inherited fields. A local slot replacement owns its supplied subtree, not the definition's internal tree.

Resolving an update uses the newly selected definition version. No pinned consumer updates merely because a newer file exists. Before accepting a dependency/version update, list affected direct and nested consumers, inherited fields that change, local fields that remain, and incompatible/removed addresses. Incompatible overrides remain inspectable and block a complete preview/output rather than being dropped or attached to a similarly named part. Definition-source persistence and atomic project/page updates remain later work.

## Addressed inspection and bindings

The nominated model is the repository's Properties Panel: controls derive from declared variants/props/defaults and design bindings with known consumers; parent-owned override state selects the edited consumer. This paper model preserves that method without making CSS names its portable authority. Existing Web CSS read proof does not authorize arbitrary native or external-project properties.

An editable address names the instance, the address kind, and a stable parameter, property, optional part, or slot identity. Labels and array indices are not addresses. The reserved definition part `root` publishes root consumers; omitting part identity addresses that root. Named non-root part overrides are separate from root overrides and cannot supply a second root spelling. The definition advertises eligible value types and animation support; an adapter must separately qualify its consumer and source mapping. Rendered internal structure and measured values may be inspected without becoming writable addresses. Editing a reusable definition is an explicit owner change, never a side effect of instance inspection.

Instance binding resolution is default profile → eligible definition default → local override. Parameter resolution is definition default → instance parameter binding. Part properties resolve their declared definition default → local part override. The first paper profile supplies root defaults only; conditional/profile/slot fallback expansion stays open. Clearing removes the override, not its resolved value. Zero, false and empty strings are present bindings. Invalid present values report errors. A token binding retains source identity, path and expected type; selected dependency revision/context determines its value. A literal remains literal even when equal to a token/default.

The current scratch inspector stores overrides by component name and applies picked token literals for preview. Those are implementation limits, not storage rules to transfer. The new example stores per-instance overrides and typed references. This slice does not change that inspector or preview.

## Scene time and animation keys

A scene owns a positive-duration local interval. Its start marker references its composition at tick 0. Its end marker at `durationTicks` represents the terminal evaluated composition. Both are derived boundary markers, not stored whole-scene snapshots or selectable authored keys. Inspecting the start edits base values; inspecting the end alone still edits base unless an authored key is explicitly selected.

No track means a static composition value for the entire scene. A track targets one eligible instance/node property, optionally a declared part. It has stable authored key identities, each with an absolute scene-local time and typed value binding. Key time is an integer tick or a duration binding measured from scene start; duration conversion must be exact in the selected timebase. Token time changes move the addressed key and require rechecking order, bounds and conflicts. They do not resize the scene.

Keys must have unique identities and strictly increasing resolved times inside `[0, durationTicks]`. A key at tick 0 is an explicitly authored start value. Otherwise the resolved composition base is the implicit sample at tick 0. Each continuous key's easing controls the incoming segment from the preceding sample. Continuous translation/opacity uses interpolation; visibility is discrete and steps at the key time. Easing is not applied to a zero-length segment. After the last key, hold its value through scene end. Empty tracks are not stored; removing a track's final key removes that track atomically.

Interpolation of dimensional samples requires compatible units or a qualified exact conversion context; the original example uses only px. A token-bound key value retains its binding. Opacity bounds, reachability, type compatibility, key ordering/bounds, easing evaluation and simultaneous writer conflicts require future semantic validation beyond schema shape. This subset uses replacement composition and rejects multiple writers to one scene/node/part/property; additive/blended motion remains open. Reduced-motion `base` uses the resolved base; `jump-to-end` uses the terminal value. Neither authors either value.

Playback and scrubbing never mutate base state. With no authored key selected, a property edit changes the local composition base, even when the playhead is at a key or the scene end. With a key selected, it changes that key's binding, not its time or the base. A separate key-time edit moves the key. Adding a key is explicit, with a supplied time/value; this draft does not infer either from evaluated pixels. Auto-key, multi-key edits and nested preanimated definitions are deferred.

Adding a shape, text or instance inserts it into the composition and therefore makes it present throughout that scene. Timed appearance requires a visibility track with an explicit base and step keys. Visibility does not delete or reparent the node. A future layout contract must specify whether hidden content retains layout space; no layout effect is inferred here. When one composition is deliberately shared, insertion changes each scene's shared base; a scene-local visibility track affects only that scene.

## Atomic edits and history

The page owns composition transactions. Each accepted edit has identity, actor, expected/resulting page revisions, operation identities and composition owners. Motion operations also identify their scene. The validator must prove that every addressed node/scene belongs to that owner. A transaction accepts all operations or none. Selection, playhead and viewport remain session state. Human and agent routes use the same admitted operations.

| Operation | Atomic authored effect | Information required for inverse |
|---|---|---|
| Insert node/instance | Insert a fresh node at a named parent/slot and index in the owner composition | Exact inserted node, prior edge/slot presence and insertion transaction |
| Supply slot | Replace one instance's supplied child list, including explicit empty; never change its definition | Prior absence versus exact prior ordered list and child ownership |
| Reset slot | Remove the supplied slot so inheritance resumes | Exact prior list and its local subtree identities |
| Set/reset binding | Set typed binding or remove it at an instance parameter/root/part property address | Prior absence versus exact prior authored binding |
| Add track | Add a scene-owned property track with at least one key | Exact track identity and all bindings/keys |
| Add/edit key | Add a fresh key or replace the binding/time of an identified key | Prior key absence or exact key record; selection is not persisted |
| Remove key | Remove identified key; remove track if it becomes empty | Exact removed key, prior track and stable order |
| Remove track | Remove that scene's addressed animation; base remains | Exact track and key identities, binding references and times |
| Remove inserted node (inverse only) | Restore the preceding insertion destination state | Insertion provenance plus proof that no later outside reference is left dangling |

The page schema represents this bounded operation vocabulary and explicit undo/redo transaction links. It does not validate inverses or execute operations. Before-images are obtained from the accepted pre-state and must preserve authored bindings, absent slots and identities; evaluated values cannot serve as inverse data. Undo appends a compensating transaction against the current revision; redo restores the same identities when still admissible. A dependent later edit or stale source must reject the inverse atomically, preserving pending work for reconciliation. General deletion, subtree duplication, reparenting, graph repair, branch history and cross-file atomicity remain later designs.

Definition edits belong to the definition source, outside a page transaction. Their review request identifies expected source revision, selected next definition and impacted consumers; source admission/persistence is not represented by a page JSONL operation. Updating a definition cannot be smuggled through `set-binding`. The worked impact table describes prospective effects, not executed source writes.

## Draft change and remaining obligations

0.2.0 replaces direct scene/frame ownership with scene/composition references and replaces normalized-duration endpoint tracks with stable absolute-time property keys, implicit composition starts and terminal hold. It adds definition interfaces, part/slot overrides, addressed edit operations and history links. Old 0.1.0 records are rejected by the current draft; their source remains in Git at the preceding paper slice. No automatic runtime migration or backward compatibility is supplied.

Duration/easing tokens still participate: duration binds key time; easing binds incoming continuous segments. Frame-rate/rational sampling, rounding and recipe retiming remain open. [The coverage ledger](design-coverage.md) keeps interface/schema coverage separate from runtime proof. Following passes settle graph edits; replay/durability/dependencies; layout/recipes/conflicts/transitions/interruption; adapters/source/preview agreement; and richer text/vector/paint/effect/media authoring.
