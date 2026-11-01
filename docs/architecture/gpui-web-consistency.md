---
doc_id: ARCH-GPUI-WEB-CONSISTENCY-001
authority: architecture
status: active
title: GPUI ↔ web consistency
owner: "@darianrosebrook"
updated: 2026-11-01
governs:
  - scripts/gpui-web-consistency-audit.mjs
  - packages/ds-gpui/web-consistency-baseline.json
---

# GPUI ↔ web consistency

This doc records how far the GPUI target's generated components are from the
React/Vue/Svelte realizations of the same contracts, and the ratchet that keeps
the gap from growing silently. It is the evidence behind the GPUI parity goal;
the target doc ([GPUI target](gpui-target.md)) owns the realization boundary.

## What is measured

[The audit](../../scripts/gpui-web-consistency-audit.mjs) derives every number
from contract/IR facts and the generated artifacts. Nothing here is hand-counted.

| Dimension | Declared fact (from contract/IR) | Realized in a target |
|---|---|---|
| parts | distinct anatomy parts in the normalized DOM | web: the BEM block class (`<prefix>__<part>`, root is the bare block); GPUI: the part debug selector (`<prefix>-<part>`) |
| props | `styledProps` names | web: the generated props block; GPUI: generated builder methods plus receipt-claimed props |
| behavior | components carrying normalized event wires, channels, composite/interaction/surface facts | web: a handler syntax or a behavior hook; GPUI: a realized boolean control channel |
| a11y | components authoring `role`/`aria` facts in the contract or anatomy | role/aria attributes in the generated artifact |
| references | `componentRef` anatomy nodes | web: the referenced component rendered as a tag; GPUI: a retained `Entity<Child>` field |

Cross-check: the web columns agree with the committed derived audits —
behavior-realization reports every derived obligation realized across the five
web frameworks, and the anatomy audit reports 43/55 components fully styled
contract-side with 7 declared-part realization mismatches. The audit is a
*consistency* measurement, not a substitute for those gates.

## Current matrix

Aggregates over the 55-component corpus (214 declared parts, 379 declared props,
30 components with behavior facts, 44 with authored a11y facts):

| target | parts | props | behavior | a11y | references |
|---|---|---|---|---|---|
| React | 213/214 | 379/379 | 30/30 | 41/44 | 20/20 |
| Vue | 213/214 | 379/379 | 30/30 | 41/44 | 20/20 |
| Svelte | 213/214 | 379/379 | 30/30 | 40/44 | 20/20 |
| GPUI | 180/214 | 249/379 | 7/30 | 0/44 | 20/20 |

All five dimensions are measured from the committed generated source; the audit
does not read the regenerated, gitignored `capabilities.json` receipts, so a
fresh checkout and a post-generation tree produce the same numbers.

The three web frameworks are internally consistent (they are one IR through
three emitters). GPUI is consistent on **component identity** (55/55), partial on
**structure**, and materially behind on **semantics**.

### Divergence classes

- **Parts**: equal to web in 35 components, fewer in 20, never more. The
  by-reference composition slice closed the child-component gap (PageNavigator
  3/10→8/10, Chip 1/5→3/5, Button 1/3→2/3, Details 3/6→4/6, Accordion 5/7→6/7,
  Alert/Avatar/Status/Carousel +1 each), and reference bindings whose expression
  is a realized parent prop now drive the retained child through its generated
  setters each render. Remaining gaps are collection and overlay shapes:
  PageNavigator 8/10, Chip 3/5, Pagination 2/5, Select 6/9, Calendar 5/7, plus the
  single web-side miss of one Toast part.
- **Props**: 10 components project the full web prop surface, 5 at 80–99%,
  28 at 50–79%, 10 at 1–49%, 2 at 0%. The web targets project every declared prop.
- **Behavior**: 7 of 30 behavior-bearing components realize an interaction —
  three value channels (Switch, ToggleSwitch, Checkbox), two action controls
  (Button's root click, AlertNotice's dismiss trigger) that invoke a stored
  callback from pointer and keyboard activation, and two reference-event
  forwarders (Alert and Chip forward their retained trigger's click to the
  parent's dismiss/action callback). The remaining 23 are mounts only —
  disclosure (Accordion/Details/Tabs/ShowMore), surfaces
  (Dialog/Sheet/Toast/Tooltip/Popover/Command/Walkthrough), composite and
  collection state (Select/RadioGroup/OTP/Calendar/Shuttle/Pagination/Carousel),
  text input (Input/TextField/Field) and truncation (Truncate).
- **A11y**: 0 of 44. This is the documented GPUI non-claim, not an accident of
  this measurement.
- **References**: all 20 declared `componentRef` nodes are realized. Nested
  references (PageNavigator's previous/next icons inside the retained buttons)
  are projected through the child component's content API; a non-reference child
  nested inside a reference would still be named as a `ref-children` omission.
- **Styles**: the GPUI receipts name 481 omitted style declarations across the
  corpus, each adjudicated by the support-boundary ledger.

## The ratchet

`packages/ds-gpui/web-consistency-baseline.json` is the committed measurement.
`pnpm run audit:gpui-web-consistency` fails when any component loses a realized
fact (on GPUI **or** a web target), when a corpus component has no baseline
entry, or when a baseline entry names a component that no longer exists — so
progress must be rebaselined deliberately with
`pnpm run write:gpui-web-consistency`. The audit's `--self-test` proves the
regression, stale-entry and removed-entry detections fire.

## Limits

- Presence of a part class, prop name, handler syntax or role attribute is
  evidence of projection, not of styling correctness, interaction semantics,
  runtime behaviour or pixels. Mounted witnesses remain the runtime evidence.
- Web measurements parse generated source; a target that emits an equivalent
  fact through a different spelling would be undercounted. The web columns are
  corroborated by the committed audits above.
- The audit reads only committed generated source, so receipts never affect the
  numbers; a capability that is claimed in a receipt but absent from the source
  would be undercounted, which is the conservative direction.
