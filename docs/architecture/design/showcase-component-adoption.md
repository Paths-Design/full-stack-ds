---
doc_id: REF-SHOWCASE-COMPONENT-ADOPTION-001
authority: reference
status: active
title: Showcase component adoption
owner: "@darianrosebrook"
updated: 2026-11-05
---

# Showcase component adoption

The original production JSX census found 25 raw control/source sites. Both
adoption slices together replace all 25. The AST guard now requires zero:
there is no compatibility allowance for the eight sites left by the first
slice. The separate panel/pill census also ends at zero from its historical
baseline of 14.

| Source | Original raw sites | Remaining | Shared realization |
|---|---:|---:|---|
| JsonTreeViewer disclosures | 4 | 0 | Controlled Details |
| PropertySection toggle | 1 | 0 | Accordion |
| TokenPicker controls | 3 | 0 | Input and Button |
| TokenValueControl controls | 6 | 0 | Input and Button, including native color |
| PropertiesPanel controls | 7 | 0 | Input, Button and Select |
| Header brand input | 1 | 0 | RadioGroup |
| TokensView brand button | 1 | 0 | RadioGroup |
| CodeViewer source and trace controls | 2 | 0 | CodeBlock and Button |
| App panel class sites | 13 | 0 | Card and existing Popover.Content |
| App pill class site | 1 | 0 | Badge |

App layout, data processing, trace navigation and document structure remain
application responsibilities. Retired panel/pill/source skins have no
compatibility selectors. Appearance overrides use consumed design and
box-model slots.

## Upstream capabilities established by the remaining sites

**Input preserves native semantics.** Its contract no longer forces
`role=textbox` on number and color inputs. The Web DOM binding order realizes
the input type before its value so browsers do not sanitize color values
under the wrong native input type. Inspector number conversion still treats
an empty field as an unset override.

**Select displays its selected labels.** The closed
`project:selectionLabel(options, selection, fallback)` binding projects labels
from the option records in option order, handles scalar or multiple selection,
and uses a placeholder when nothing matches. The IR carries that value
projection; each JavaScript emitter supplies target syntax. It is not a
component-name dispatch. Native option buttons preserve disabled semantics. Lit omits absent option
attributes, preserves explicit false, and clears stale values when option
records change.
Selection dismissal consumes the declared policy, closes single selections
and restores trigger focus; multiple selections remain open. Relationships
supply instance-specific IDs, and keyboard navigation skips disabled options.

**RadioGroup owns single-choice controls.** Its options and selection channel
drive native radio inputs on the web. A required group name gives the browser
the grouping and form-submission identity; consumers must supply different
names for independent groups. Labels, disabled choices and horizontal/vertical
layout are declared in the contract. React Native lowers each labeled radio
to one accessible press target with a visible selection indicator. This
component is emitted by the admitted JavaScript targets and SwiftUI. The
SwiftUI realization derives a native radio-style Picker from the same
selection and label bindings; native form-name transport is not implied.

**CodeBlock owns the source surface.** A consumer content region can replace
the automatic literal-source renderer. CodeViewer supplies numbered lines and
Button annotations through that region while retaining the canonical code
string for copying. Trace lookup, selection and navigation stay in the
showcase. Absent content retains literal whitespace and escaping. The Lit
realization tracks slot presence and honors the negated children guard.
SwiftUI and Compose retain their literal-source initializer/parameter path
alongside optional consumer content; React Native gives the fallback its own
part so it does not apply the root padding twice.

## Evidence boundary

- `src/consumption/dogfooding-guard.test.ts`: production AST inventory requires
  zero raw control/source sites and zero retired surrogate classes.
- `src/components/shared-controls.test.tsx`: controlled selection authority,
  native form serialization, typed input values, source fallback and copying.
- `packages/ds-codegen/src/selection-label.test.ts`: malformed bindings,
  label projection values and independently renamed contract emission.
- `packages/ds-codegen/src/frameworks/consumer-content.test.ts`: renamed
  source fallback in native emitter outputs.
- `e2e/showcase-controls.spec.ts`: number/color semantics, radio keyboard
  navigation and disabled choices, Select labels/dismissal/focus across all
  five web frameworks; integrated brands, inspector selection and trace hits.
- `e2e/codeblock-whitespace.spec.ts`: literal whitespace and single-line
  geometry across the five web frameworks.
- `e2e/showcase-adoption.spec.ts`, `e2e/editor-binding-rail.spec.ts` and
  `e2e/showcase-usability.spec.ts`: desktop/narrow surfaces, preview isolation,
  editor changes, disclosure, palette, shell and overlay regressions.

Browser checks use Chromium. SwiftUI emission parity, compilation and
component body evaluation were checked, including the new native radio
realization. These do not establish native keyboard or accessibility
interaction parity. Compose source checks establish emitted structure. Screenshots and local gate logs stay in ignored runtime evidence.
