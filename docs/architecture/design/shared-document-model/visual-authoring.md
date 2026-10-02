---
doc_id: ARCH-VISUAL-AUTHORING-PAPER-003
authority: architecture
status: draft
title: Visual authoring, token scope and component extraction
owner: "@darianrosebrook"
updated: 2026-10-02
governs:
  - packages/ds-contracts/document-model/
---

# Visual authoring, token scope and component extraction

Draft 0.3.0 extends the [composition authoring rules](authoring.md) with the user's Button-to-Banner workflow. These are paper semantics and source shapes, not a renderer, mutation executor, token resolver or durable store. [Worked states](visual-authoring-expectations.md) are independent future observations. The [coverage crosswalk](handoff-crosswalk.md) maps product requirements and explicitly named unknowns.

## Named models and ownership

| Name | Responsibility | Stored authority |
|---|---|---|
| CreationProfile | Version-selected frame/text defaults, referenced rather than baked | Default-profile source; a node selects a profile |
| CreationGesture | Tool, provisional identity, hit destination and document-space drag | Session only; successful commit supplies one operation |
| TextEditSession | Provisional text/content at a selected parent | Session only; commit inserts text, cancel inserts nothing |
| PropertyConsumer | Stable address, value type, semantic role and effective kind | Declared definition interface or supported kind vocabulary |
| Paint | Stable ordered appearance entry | This subset admits one enabled solid fill, locally authored or inherited |
| TokenEligibility | Optional roles and effective kinds eligible to bind a token | Namespaced token-source metadata, separate from token type |
| DefinitionBody | One reusable visual graph and its profile/default relationships | Definition source, never a copied instance tree |
| DefinitionPlacement | Canvas position and explicit entry into definition editing | Composition owns placement; definition owns appearance/content |
| ComponentInstance | Independent placed consumer of a definition | Composition or enclosing definition body; local overrides stay local |
| ExtractionCorrespondence | Old node identities mapped to fresh body identities and retained placement | Project-change receipt; not a second visual graph |
| LayoutPolicy | Authored sizing, padding and child distribution | Node/profile policy; resolved geometry is observational |
| ProjectChange | Coordinated page/source changes with expected revisions and history | Proposed project journal; durable publication remains undesigned |

The project still discovers workspace pages, compositions and dependency sources. A definition body owns a root frame and an explicit member list; each body member has exactly one structural owner. DefinitionPlacement and ComponentInstance carry definition references, empty direct children and eligible local placement/override facts. Neither flattens the body. Definition bodies may contain component instances referencing another definition; recursive definition cycles refuse. Interface-only external definitions remain representable without a body and require an advertised adapter before complete rendering can be claimed.

Composition roots may now be frame nodes or definition placements. Source placements keep their original page node ID and position. Component extraction creates fresh body IDs and records a complete one-to-one old-subtree-to-body mapping; the old root maps both to the retained placement and the new body root. Old descendants leave page membership. Undo restores exact prior subtree IDs, fields, membership and order. Selection is retargeted through the receipt; labels are not correspondence. Animated addresses, outside subtree references and unsupported external dependencies refuse extraction in this subset, rather than inventing remapping. GeneralExtractionReferenceRepair remains open.

Definition bodies preserve authored fields, absent overrides and selected profile references. For the first extraction, the root keeps sizing, layout, paint and corners; its canvas position remains on the placement, and its body's resting origin is explicitly zero. Nested children's local positions remain authored. Frame creation dimensions become definition defaults through the authored body, not copied into every consumer. A nested Button remains a reference when extracting Banner. No inferred slots, label parameter, click behavior, semantic button role, code counterpart or generated file is produced.

## Creation and addressed values

The frame CreationProfile supplies 100 by 100 px, white solid fill, radius zero, padding zero, freeform layout and no clipping. A point-created frame inherits these fields; a drag-created frame authors width/height in document px. A successful positive-size drag commits once; pointer samples are session overlays. Escape or zero-area drag cancels. Zoom conversion happens before authoring; zoom itself is never saved as geometry. CanvasHitTestingAndSnapping defines the unambiguous case only: click within one unlocked editable frame selects that frame; otherwise create an independent composition. Ambiguous overlap/snapping remain open.

TextEditSession reserves a fresh identity, local click position and parent. Commit inserts content once; cancel creates no persisted node. Later text replacement is an explicit operation. Point text starts with intrinsic sizing and a selected text profile. Text label and content differ. Real font shaping is FontResolutionAndShaping, not this synthetic qualification fixture. Rename changes only the label and retains identity.

Known editable consumers include sizing.width/height (positive dimension), transform.translation.x/y (dimension), appearance.opacity (number), appearance.visible (boolean), typography.fontSize/lineHeight (dimension), solid paint color (color), linked corner radius (nonnegative dimension), and structured layout. Paint addresses name node ID, paint ID and color property. Corner addresses name node ID and the linked radius. Definition addresses additionally identify source/definition; a rendered nested address retains its owning instance path. Inspection of internals does not authorize editing them. A visual definition publishes its root frame kind consumers through its body; nested internal text is not automatically a public parameter. Source-placement editing explicitly chooses definition ownership; an ordinary instance cannot use a page operation to modify its definition.

This subset stores normalized sRGB color components and alpha; #111 authors [17/255,17/255,17/255] with alpha 1, and white authors [1,1,1] with alpha 1. Import spelling is not a second color authority. Other color spaces remain later work. A Paint retains its identity through literal-to-token replacement. Corners are linked here; independently authored corner radii are not silently inferred.

Profile → definition body → eligible local override remains the resolution order. Missing paint/corner/style fields inherit; an invalid present field refuses. A reference retains source ID, token path and expected type. Literal equality to a default or token does not imply inheritance. Public part consumers must correspond to body addresses; this subset does not automatically expose every body node to instances. DefinitionInterfaceExposure remains open.

## Token creation and scope

Create-token-and-bind stages a new named token, optional eligibility metadata and replacement of the selected literal. Token source, selected dependency revision and page revision must all match expectations before acceptance. Names collide within the selected source/path namespace; this pass rejects collisions rather than overwriting or silently adding a suffix. Token values and ordinary typed bindings are separate representations. TokenEligibility is under $extensions["org.full-stack-ds.editor"].eligibility with roles and nodeKinds. Unset eligibility allows any supported type-compatible consumer. Present lists are nonempty; empty scope cannot mean unrestricted.

Add Token offers a scope toggle and, when enabled, role selection and node-kind checkboxes. For action-bg-primary use role fill and kind frame. Both picker filtering and human/agent admission enforce the same predicate: compatible value type AND permitted role AND permitted effective kind. A component's frame root qualifies as frame; its instance wrapper is not the kind tested. Borders, text foregrounds and vector fills refuse this binding. border-radius-md and fg-primary-inverse are unscoped in the example. Metadata must survive source exchange; foreign-tool scope changes, reference migration and unknown scope versions remain TokenScopeEvolution. This bounded token schema is not full DTCG conformance or Resolver support.

Token creation does not change the kind default profile. #111 changes Button's authored fill only; it does not change newly created frames' white default. Undo restores the exact previous literal and removes the newly created token only if no later consumer would be stranded. A later reference or changed source revision refuses the entire inverse while preserving pending work. Scope changes are explicit token-source edits, not consequences of picker selection.

## Layout and extraction

The fixture uses horizontal flow, main-axis space-between, cross-axis start, zero padding and zero minimum gap. Child order is title then Button. Banner is fixed 800 by 150; Button is fixed 128 by 36 with shrink 0; title is intrinsic. Synthetic metrics give title 96 by 20 and Button label 48 by 20. The title begins at [0,0], Button at [672,0], leaving 576 between them. Button label remains at its clicked [0,0]; no centering was requested. Resolved positions do not overwrite child authored translations. Negative free space reports unsupported overflow in this subset; wrapping, flex shrink, real intrinsic sizing and broader conversion remain AdvancedLayoutResolution.

Extraction is a ProjectChange: create the definition/body, select its source revision, replace the original frame with DefinitionPlacement and publish correspondence together. Alt-drag is instance insertion, not subtree duplication: fresh instance ID, same definition identity, local destination and explicit sizing policy. Button instance edits address supported local overrides; definition edits propagate through selected references without flattening. Undo extraction requires no later dependent instance or external address; undo those dependent changes first. A definition update keeps local overrides and diagnoses removed consumers rather than dropping them.

## ProjectChange and inverse contract

In 0.3.0 a header establishes an empty page; initialize is optional as the first transaction only, while create-composition may be the first accepted edit. This changes the earlier initialization convention explicitly, without a replay implementation.

Every project change names identity, actor, expected/resulting project revisions, participating page transactions and source revisions, source operations, and edit/undo/redo provenance. Every participating page transaction references that project-change ID. A pure set-definition-binding change may have no page mutation; tokenization, extraction, their removal inverses and coordinated renaming require a page participant. Manifest components sources select definition-source records; project changes call that source kind definitions. A draft definition version is interpreted with its selected source revision, not treated as an immutable publication by itself. Source changes require explicit project revision selection; merely finding a newer file cannot silently change a pinned consumer. Source kinds are tokens or definitions; supported source operations are create-token, remove-created-token (inverse only), create-definition, remove-created-definition (inverse only), rename-definition, and set-definition-binding. Page operations add create-composition, rename-node, replace-text, set-layout, set-paint, set-corners, insert-instance, and extract-definition to the earlier bounded vocabulary. Composition creation owns its new root; extraction references the receipt and selected definition without embedding another body.

| Action | Owner and atomic effect | Inverse custody / refusal |
|---|---|---|
| Create composition/frame | Page and new composition; root and membership inserted together | Exact root/composition; refuse later dependent edges |
| Insert text/node/instance | Destination composition or explicit definition-body source | Prior parent order, original profile/refs and fresh identity |
| Rename / replace text | Addressed node's owner | Exact prior label/content; no definition inference |
| Set binding/paint/corners/layout | Addressed composition base or explicit definition source | Prior absence versus full authored record and paint identity |
| Create token and bind | Token source + binding owner + dependency selection | Prior literal, source absence, revisions; refuse later token consumers |
| Extract component | Definition source + page + dependency selection | Original subtree/membership/placement, full correspondence; refuse dependents |
| Undo / redo | Same owners against current expected revisions | Append compensation; never erase history or use evaluated before-images |

Paper source operations are declarative, not arbitrary file patches. A project change must include all source/page participants and dependency updates needed for its meaning. A page revision alone cannot establish completion. Stale revisions, duplicate identities, malformed ownership, missing dependency or incompatible scope refuse all participants. Durable staging/commit records, torn append, source reconciliation and multi-file recovery are ProjectChangeDurability and remain open; a shaped envelope or newline cannot prove atomic persistence. Human and agent routes require the same admission boundary.

## Version and qualification boundary

0.3.0 adds complete optional definition bodies, editable definition placements, colors/solid fills/linked corners, creation profiles, bounded layout, token eligibility, extraction receipts and project-change links. The isolated family rejects 0.2.0 without reinterpretation or runtime migration. Previous original composition/keyframe fixtures are reauthored at the new version, retaining their expectations. No previous application implementation or third-party fixture is reused.

Qualification compiles shapes and checks independent original fixture custody. Designated graph/revision/scope neighbors are checked by an example-only paper probe, not a product validator. No reducer, inheritance engine, font shaper, layout solver, token exchange layer, durable project journal, source adapter or preview executes. Named open obligations cannot be promoted by schema qualification.
