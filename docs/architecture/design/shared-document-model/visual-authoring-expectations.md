---
doc_id: ARCH-VISUAL-AUTHORING-EXPECTATIONS-003
authority: architecture
status: draft
title: Independent Button-to-Banner authored states
owner: "@darianrosebrook"
updated: 2026-10-02
governs:
  - packages/ds-contracts/document-model/examples/visual-authoring/
---

# Independent Button-to-Banner authored states

These are independently authored expected states, not replay or rendered observations. [Semantics](visual-authoring.md) defines ownership separately. The JSON workflow carries matching numeric revision/size/binding tables and explicit authored snapshots; qualification compares their custody rather than executing operations. All widths/heights are px. Project/definition/token revisions below are illustrative identities, not hashes.

The scratch page starts empty at revision 0, project p0, token source t0 and definition source d0. Banner's outer frame is node.banner at canvas [0,0]; Button's original frame is node.button at [900,0]. Its text is node.buttonText, title is node.title. Clicks inside frames use local [0,0]. A default paint is identified as paint.fill, foreground as paint.foreground. No animations or outside references are present. Body IDs and definition IDs are fresh, not derived from display names.

## Sixteen-step state table

| Step | Page revision | Project | Tokens | Definitions | Expected authored result and inverse custody |
|---|---|---|---|---|---|
| 1 | 1 | p0 | t0 | d0 | composition.banner owns node.banner; width/height absent, CreationProfile resolves 100×100 white; undo removes original composition/root |
| 2 | 2 | p0 | t0 | d0 | node.banner explicitly 800×150; undo restores absent dimensions, not copied 100s |
| 3 | 2 | p0 | t0 | d0 | Text tool active in session only; no authored mutation/history |
| 4 | 2 | p0 | t0 | d0 | Provisional node.title at local [0,0]; page still unchanged; cancel inserts nothing |
| 5 | 3 | p0 | t0 | d0 | Commit node.title content Banner Title; banner children [node.title]; undo restores empty children |
| 6 | 4 | p0 | t0 | d0 | New composition.button owns node.button at [900,0], explicit 128×36; drag is one operation |
| 7 | 5 | p0 | t0 | d0 | node.buttonText content Button at local [0,0], owned by node.button; undo preserves frame |
| 8 | 6 | p0 | t0 | d0 | node.button label Button; same node ID and children |
| 9 | 7 | p0 | t0 | d0 | Linked corner radius literal 12; undo restores absence/profile radius 0 |
| 10 | 8 | p1 | t1 | d0 | border-radius-md dimension 12px created; same corner now typed token reference; atomic source/page/dependency change |
| 11 | 9 | p1 | t1 | d0 | node.button paint.fill opaque #111111 literal; other frames keep inherited white |
| 12 | 10 | p2 | t2 | d0 | action-bg-primary color created with fill/frame scope; paint.fill retains ID and becomes typed reference |
| 13 | 12 | p3 | t3 | d0 | r11 explicitly sets text white; r12 creates fg-primary-inverse and binds paint.foreground; preserves authored operations separately |
| 14 | 14 | p4 | t3 | d1 | r13 extracts definition.button and retains node.button as source placement; r14 inserts fresh node.buttonInstance under banner; same definition reference |
| 15 | 15 | p4 | t3 | d1 | Banner flow horizontal/space-between/start, padding 0; children [node.title,node.buttonInstance], Button fixed 128×36 shrink 0 |
| 16 | 17 | p6 | t3 | d3 | r16 extracts definition.banner (d2), preserving nested definition.button; r17 explicitly renames definition and retained node.banner placement to Banner (d3) |

Node field absence and inherited defaults are essential assertions. Same appearance is not permission to replace inheritance with literals. Source changes p1–p6 carry expected/resulting project and source revisions, participating page transactions and history. Ordinary page-only edits do not change the manifest's source-selection revision. Sixteen user steps therefore need not equal sixteen saved transactions.

## Extraction custody

| Change | Original address | Definition-owned address | Retained placement / required relationship |
|---|---|---|---|
| Button root | node.button | body.buttonRoot | node.button stays at [900,0], references definition.button; body origin [0,0] |
| Button text | node.buttonText | body.buttonText | Original leaves page membership; body retains content, profile, white token reference |
| Banner root | node.banner | body.bannerRoot | node.banner retains identity and [0,0]; body retains 800×150 and layout |
| Banner title | node.title | body.bannerTitle | Fresh body identity, same content and profile |
| Nested Button | node.buttonInstance | body.bannerButton | Fresh body identity, still references definition.button; no copied Button subtree |

Definitions are selected through one source and revision. The nested Button reference resolves definition.button at its selected version; accepting a later compatible update changes inherited uses, while literal/local overrides stay local. There are no automatic public parameters or interaction roles. The original source placement permits explicit definition editing; a normal instance only edits its advertised local addresses.

## Independent future observations

| Case | Input / change | Required observation |
|---|---|---|
| visual.defaults | Point frame, no overrides | 100×100, white, radius 0; width/height fields remain absent |
| visual.radius-token | Literal 12 → border-radius-md | Radius stays 12, token reference retained |
| visual.fill-token | Literal #111111 → action-bg-primary | Same opaque color; paint ID stable; frame default stays white |
| visual.foreground-token | White → fg-primary-inverse | Same white; foreground paint ID stable |
| visual.button-extract | Extract Button | 128×36, radius/fill/text refs unchanged; selected placement ID retained |
| visual.banner-extract | Extract Banner | 800×150, same ordered children and nested Button reference |
| visual.inherited-update | Button definition radius becomes 16px | Source placement and unoverridden nested instance resolve 16; no local radius authored |
| visual.local-override | Nested Button radius explicitly 4px, then definition becomes 16 | Nested radius stays 4; source placement reaches 16 |
| visual.reset | Clear nested radius override | Inherits 16 without copying it locally |
| visual.scope-root | Frame-root instance fill uses action-bg-primary | Eligible through effective frame/fill consumer |
| visual.scope-reject | Border, text foreground or vector fill uses action-bg-primary | Picker omits and explicit human/agent bind refuses without mutation |
| visual.layout | Banner after step 15 | Title [0,0,96,20], Button [672,0,128,36], inter-child space 576 |
| visual.undo-token | Undo tokenization with no later references | Exact prior literal and paint ID; created token absent; no partial source/page change |
| visual.undo-token-dependent | Undo after another use was accepted | Refuses atomically; token, both references and pending inverse retained |
| visual.undo-extract | Undo Banner extraction before dependents | Exact original subtree IDs, membership, order, bindings and nested reference |
| visual.redo-extract | Redo admissible extraction | Same accepted body/definition/placement IDs and correspondence restored |
| visual.undo-button-dependent | Undo Button extraction while Banner consumes it | Refuses; undo dependent instance/Banner changes first |

Synthetic metrics are authored inputs: every character advance is 8 and line height is 20; no font asset is bundled. Banner Title has 12 characters; Button has 6. These expected boxes and spacing are authored independently, not calculated by the paper verifier. Negative free space diagnoses unsupported layout rather than silently shrinking Button. Zoom changes neither dimensions nor these document-space observations.

## Qualification boundary

Schema checks reject wrong types, missing metadata, flattened children and malformed correspondence. A separate original-fixture probe checks explicit reference/ownership/revision/eligibility neighbors and nonmutation; it is not a general graph validator or product admission route. Expected observations above remain future evaluator, inheritance, history, layout and persistence obligations. A fixture agreeing with this document does not prove it renders, saves or replays.
