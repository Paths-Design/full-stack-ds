# Full Stack DS for Unity UI Toolkit

A local UPM package with contract-generated Switch, Accordion, Popover, Tabs, Text, Divider, Icon, Button, Checkbox, ToggleSwitch, Blockquote, Stat, ProfileFlag, Badge, List, Alert, AlertNotice, Label and Breadcrumbs controls. Unity 6 is the API baseline. Generated controls carry `[UxmlElement]` and are usable from C#, UXML and UI Builder; the same runtime assembly serves Editor windows and `UIDocument` panels.

## Import

In Unity's Package Manager, choose **Install package from disk** and select this directory's `package.json`. Keep the package directory at a stable path. This is a local package, not a published Unity registry dependency.

Open **Window → Full Stack DS → Interactive Controls** for the C# showcase. Import **Interactive controls** from the package's Samples section to get `Controls.uxml` and `RuntimeExample.cs`. Open the UXML in UI Builder. For runtime use, assign it to a `UIDocument` with a `PanelSettings` asset and add `RuntimeExample` to that GameObject.

```xml
<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:ds="FullStackDS">
    <ds:Switch checked="true"><ui:Label text="Enable sound" /></ds:Switch>
    <ds:Accordion collapsible="true">
        <ds:AccordionItem>
            <ds:AccordionHeader><ds:AccordionTrigger value="graphics" text="Graphics" /></ds:AccordionHeader>
            <ds:AccordionContent value="graphics"><ui:Label text="Rendering preferences" /></ds:AccordionContent>
        </ds:AccordionItem>
    </ds:Accordion>
    <ds:Tabs>
        <ds:TabsList>
            <ds:TabsTab value="first" text="First" />
            <ds:TabsTab value="second" text="Second" />
        </ds:TabsList>
        <ds:TabsPanel value="first"><ui:Label text="First panel" /></ds:TabsPanel>
        <ds:TabsPanel value="second"><ui:Label text="Second panel" /></ds:TabsPanel>
    </ds:Tabs>
    <ds:Popover>
        <ds:PopoverTrigger text="Help" />
        <ds:PopoverContent><ui:Label text="Helpful content" /></ds:PopoverContent>
    </ds:Popover>
    <ds:Button variant="primary">Resume</ds:Button>
</ui:UXML>
```

## State and composition

Each generated root builds the contract's anatomy as a `VisualElement` tree: every part carries `name="<part>"` and the class `<prefix>__<part>`, and the contract's children hole is the root's `contentContainer`. Compound parts are separate generated elements composed by the consumer, as on the web: `AccordionItem`, `AccordionHeader`, `AccordionTrigger`, `AccordionContent`; `TabsList`, `TabsTab`, `TabsPanel`; `PopoverTrigger`, `PopoverContent`. Accordion and Tabs trigger and content parts carry a `Value` pairing key; every trigger part carries `Disabled`. Variant props set a root modifier class `<prefix>--<value>` (`tabs--pills`, `accordion--multiple`), as the web class recipe does.

The constructor attaches one behavior by contract fact and exposes it: `Switch.Control` (`BooleanControl`), `Accordion.Group` / `Tabs.Group` (`ItemGroup`), `Popover.Surface` (`AnchoredSurface`). Switch uses `Checked`, `value`, `SetValueWithoutNotify` and Unity's `RegisterValueChangedCallback`; its children are the label, and a click on the label outside the control toggles it once. Popover uses `Open` and the same boolean-channel APIs. Both expose the native `Trigger` button; Popover also exposes `Content`.

Accordion and Tabs expose `Value`, `Values`, `ValueChanged`, and `Group.SetValuesWithoutNotify`. The group discovers trigger and content sub-elements by part class under the root and pairs them by `Value`; trigger values must be non-empty and unique. Discovery runs on panel attachment, before pointer or submit input reaches a trigger, on root layout changes and on every public mutation; call `Group.Synchronize()` after inserting parts imperatively into an attached root if presentation must update before the next input. A part moved to another root leaves its previous group. Nested components keep their own parts.

Accordion defaults to single selection with `Collapsible = false`; use `Type = "multiple"` and `Values` for multiple sections. Tabs supports horizontal/vertical orientation, automatic/manual activation, looping, disabled items, Home/End, arrow navigation and `UnmountInactive`. Native UI Toolkit buttons own pointer and submit activation. Accordion's vertical arrows move focus without selecting.

`Button` is an action control rather than a channel: the generated class derives the native `UnityEngine.UIElements.Button`, so pointer activation and Space/Enter submit activation are the platform's. Assign `OnClick` to receive activation; `Disabled` gates it through `SetEnabled`. Consumer content composes into the control's own content container; the contract's loading-text wrapper is flattened and the guarded loading chrome is omitted (pending P4). `Size` / `Variant` set the `button--<size>` / `button--<variant>` class carriers. The contract's pending state is not realised: `Loading`, the ARIA state props and the HTML form `type` are refused by the support boundary, so the control exposes no loading affordance and consumers own any pending presentation.

`Checkbox` and `ToggleSwitch` are the second and third boolean forms of the same `BooleanControl` behavior. `Checkbox` is a label-host control: the generated root is the label host, the native control is a `Button` exposed as `Trigger`, and a click on the label outside the control toggles `Checked` once. `ToggleSwitch` is a root-control form: its form-control part is the root, so the generated class derives the native `UnityEngine.UIElements.Button`, exposes `Trigger => this`, and activation (pointer or Space/Enter) commits the checked channel. Both expose `Checked`, `value`, `SetValueWithoutNotify`, `RequestValue`, `Controlled`/`ValueRequested` and `Disabled`; the checked channel is observable as a `ChangeEvent<bool>` on the root. Each contract's `size` axis is withheld because its styles sidecar carries no size-predicated carrier, and the indeterminate/mixed state, ARIA relationship props and form fields are refused by the support boundary.

`Blockquote`, `Stat` and `ProfileFlag` are passive containers: each generated root is a `VisualElement` whose `contentContainer` is the consumer's composition point, and only carrier-backed style axes are exposed — `Blockquote.Variant`/`Size` and `Stat.Size`/`Trend`, each switching the root modifier class (`blockquote--bordered`, `stat--up`). Blockquote's citation `cite` URL is refused (no UI Toolkit consumer) and ProfileFlag's structured `profile` prop is pending P4 typed-declaration lowering, so neither generated control exposes those props; ProfileFlag is an identity shell plus the consumer's content.

`Badge` is a carrier-backed container with a composed content part: `Badge.Variant` (`default`/`status`/`counter`/`tag`), `Badge.Intent` (`info`/`success`/`warning`/`danger`) and `Badge.Size` (`sm`/`md`/`lg`) switch the root modifier classes, and consumers compose a `BadgeContent` sub-element for the label or count (as with Accordion's compound parts). The contract's guarded icon decoration is a dynamic node-content prop, so the lowering omits it by fact: `icon` is pending P4 node-content projection and `showStatusIcon` is refused; the generated control exposes neither property.

`List` is a semantic container whose colliding variant axes use prefixed modifier carriers: `List.Variant` (`default`/`unstyled`/`inline`/`divided`/`spaced`) and `List.Size` (`sm`/`md`/`lg`) switch `list--variant-<value>`/`list--size-<value>` through the runtime `Variants.GetAxis`/`SetAxis` helpers, and items compose directly on the control. The contract's polymorphic `as` prop is refused, `marker` is refused because USS has no `list-style-type`, and `spacing` is pending P4 because its rules select sibling children with combinators the native selector grammar refuses; the generated control exposes only `Variant` and `Size`.

`Alert` and `AlertNotice` are static alert containers: `Alert.Intent` (`info`/`success`/`warning`/`danger`) and `Alert.Level` (`inline`/`section`/`page`), or `AlertNotice.Status` (`info`/`success`/`warning`/`error`) and `AlertNotice.Level`, switch the root modifier classes, and consumers compose content plus the `AlertBody`/`AlertTitle` (or `AlertNoticeBody`/`AlertNoticeTitle`) parts. Both contracts' guarded chrome — the node-content icon and the dismiss control (a composed Button on Alert, a native button on AlertNotice) — is omitted by fact: the generated controls expose no `Icon`, `Dismissible`, `OnDismiss` or `DismissLabel`, and the dismissal style selectors stay pending P4.

`Label` is a text wrapper deriving `TextElement`: set its `text` property or compose children, and its DOM form-association props (`htmlFor`, `form`) stay pending P4. `Breadcrumbs` is a semantic wrapper whose consumer composes `BreadcrumbsList` and `BreadcrumbsItem` parts; its a11y label binding is refused (UI Toolkit exposes no assistive-technology tree) and the `separator` prop is refused because separators are consumer-composed. The generated `FullStackDS.Label` shadows the native `UnityEngine.UIElements.Label` for code that imports `FullStackDS`, so native labels must be qualified there.

Values assigned before attachment provide initial state. For owner-controlled state, set `Controlled = true`, handle `ValueRequested`, and commit an accepted value through `Checked`, `Open`, `Value` or `Values`. A request alone does not change presentation. This is a C# adaptation of the contract's controlled/default channel trio; C# event signatures use arrays for both Accordion selection modes.

Popover portals content to its current panel root. It uses the anchor/content union for outside-pointer and blur dismissal, returns focus to the trigger on Escape, and flips/shifts at panel edges. Dismissal flags remain configurable. Removing a Popover unregisters its panel callbacks and removes the floating content.

## Runtime styling

`Runtime/Resources/FullStackDS/Controls.uss` is generated by `pnpm run generate:unity` from the token graph and the admitted contracts' style facts; do not edit it. Its token section declares the tokens the controls reference through `resolvesTo` or emitted literal `var()` reads as USS variables named as the web token build names them (`--fsds-semantic-color-foreground-primary`): light values on `.fsds-theme`, dark values on `.fsds-theme.fsds-theme--dark`, and each brand on `.fsds-theme.fsds-brand-<name>` and its dark variant. The component rules select the part classes (`switch__track`, `tabs__tab`, …), the root modifiers (`switch--lg`), the behavior state classes (`is-checked`, `is-open`, `is-selected`) and native pseudo-classes. Each declaration USS cannot realise is listed with its reason in `Controls.unsupported.json` beside the sheet (for example CSS grid, box shadows, `line-height`, `font-weight: 500`, `cursor`).

An ItemGroup's hidden-content presence fact lowers `:not([hidden])` onto its content state class, so open Accordion content receives its opacity and padding rules. A literal graph `var()` without an authored fallback receives the graph's light value as a fallback for controls outside a theme scope.

Four visible gaps follow from facts this projection does not carry:

- The Accordion chevron is the contract's static `componentRef: fsds.Icon` (`chevron-down`). The walker constructs the admitted Icon, forwards its authored name and size, and paints catalog geometry through `GlyphElement`. Dynamic reference bindings and references to unadmitted targets fail generation.
- The chevron's rotation while expanded (`[aria-expanded="true"]`) and the selected-tab styling (`tab--active`) use selectors outside the native style grammar; they are `uss-selector` ledger entries until the IR carries them as state predicates.
- Brand overrides of component design slots are `uss-design-slot` ledger entries; brands reach the controls through the token variables only.
- Button's contract styles a loading spinner and loading-text chrome, but the generated action control omits the guarded Spinner decoration and flattens the loading-text wrapper (both pending-P4 chrome). The sheet still carries the contract's `button__spinner` and `button__loadingText` rules, which have no live elements in the generated control.

Controls add the stylesheet to their own root but do not open a theme scope there, so the scope belongs to a consumer container:

- `Theme.Attach(container)` adds the stylesheet and the `fsds-theme` class (light, default brand).
- `Theme.SetDark(container, bool)` selects the dark or light values; `Theme.SetBrand(container, "canary")` replaces the brand class, and `null` selects the default brand. Both attach the container first. Brands are not validated: a name the sheet does not declare matches no rule, so the default brand's values apply.
- The nearest element carrying `fsds-theme` decides the values for its subtree.
- A control with no scope above it resolves the `var()` fallbacks in the sheet: the light values of the default brand. Dark and brand switching have no effect on it until a scope is attached above it.
- Popover content is moved to the panel root while open, outside the container. It carries its own scope and mirrors the dark and brand classes of the scope its Popover sits in, on every open and on every `SetDark`/`SetBrand` call.

Two runtime pieces realise facts USS cannot express. Switch mirrors its hidden form control's pointer and focus state onto the root as `is-hover`, `is-active` and `is-focus`, because the contract styles the track from the control's state and USS cannot select a sibling; the focus ring is therefore drawn on the track. `is-focus` follows UI Toolkit focus, which has no focus-visible distinction, so pointer focus shows the ring too. USS has no `gap`; the sheet sets `--fsds-gap` and the generated constructors call `Gap.Attach`, which turns it into a margin between consecutive in-flow children (absolutely positioned and `display: none` children are skipped; the margin replaces the child's own margin on that side).

`Samples~/InteractiveControls/Sample.uss` is sample-only consumer styling, not package theme authority, used by the sample and the Editor showcase: page layout, title and description typography, a skin for Unity's built-in buttons, labels and scrollers. It reads the generated token variables, selects built-in classes at single-class specificity and is attached before `Controls.uss`, so any property a generated rule sets wins. The sample UXML attaches it to the root and to `PopoverContent` (open content leaves the root's tree); the showcase finds it by its GUID once the sample is imported and otherwise runs on the generated sheet alone. Consumer overrides should target the part classes, root modifiers and state classes; floating content lives outside the originating container, so apply overrides to `popover.Content` as well.

`PanelSettings` still owns screen scaling. The visual witnesses use **Constant Pixel Size**, scale 1, at 640×800 and 320×600. A consumer using **Scale With Screen Size** and a 960×640 reference can shrink the entire interface in a small Game view. Choose the scale mode and reference resolution for your game; the package does not overwrite them. Reimport the sample from Package Manager to update a previously copied sample.

## Regenerate and verify

From the repository root:

```sh
pnpm run generate:unity
pnpm exec vitest run packages/ds-codegen/src/frameworks/unity/factory.test.ts
pnpm run audit:unity-boundary
pnpm run test:unity
```

`audit:unity-boundary` checks that every contract and sidecar leaf in the corpus resolves to a support-boundary rule, that no allowlisted component relies on a catch-all rule and that every rule matches at least one live leaf; it prints counts per disposition and pending counts per parity phase.

`Text` is a `TextElement`: assign `text` for string content, compose child elements through `Add`, and select `Variant`, `Size` and `Weight` from the generated USS carriers. `Divider` is a `VisualElement` with `Orientation` (`horizontal` or `vertical`); its border and spacing come from the token-backed sheet. A fixed native root of 16px converts authored `rem` typography to USS pixels. The boundary omits Text's semantic `as`, `align`, `transform` and `truncate`, and Divider's `decorative`, `thickness` and `title`; the generated attributes make no claim for them. Intermediate font weights, line-height, relative `em` geometry and native screen-reader semantics also remain gaps.

`Icon` exposes `Name` and `Size` (`sm`, `md`, `lg`, `xl`). The generated wrapper loads its stylesheet, resolves the name through the authored iconography catalog and paints with `Painter2D` in its USS-sized frame. Unknown names clear the glyph. Its foreground follows the resolved UI Toolkit color; a host can change that color live. A static admitted glyph reference, such as Accordion's chevron, constructs the same Icon and forwards its literal name and size; other referenced target capabilities or props fail generation. Editor and Player probes clone an Icon from UXML and check its state after reloading; the Editor also mounts a generated renamed host with a nested Icon. Decorative and accessible-name semantics have no Unity assistive-technology consumer in this package.

`test:unity` copies the package and sample into `tmp/unity-pilot/project`, then runs real Unity EditMode tests. It needs an activated Editor license and a graphics device for the live Editor panels. Set `UNITY_EDITOR` to the Editor executable when using a different installation. Logs, NUnit XML and a source-revision/results digest receipt stay in `tmp/unity-pilot`. Styling tests enter Play mode, render a real Player panel into a texture, and save PNG witnesses under `tmp/unity-pilot/screenshots`; Editor typography, spacing and focus are checked through resolved styles and geometry.

The generated styling candidate at source `f85a48f16` passed 42/42 EditMode cases on Unity 6000.5.3f1, with zero failures or skips (test-run start `2026-10-30 06:28:44Z`). Its six local PNG witnesses cover light, dark and narrow Player-context panels inside the Editor. The separate standalone Player lane below has its own source and receipt.

The Button action admission at source `9c95d7513` passed 51/51 EditMode cases on Unity 6000.5.3f1, with zero failures or skips (test-run start `2026-10-31 08:26:44Z`), including native submit activation, disabled suppression, content-host composition and size/variant carriers. `tmp/unity-pilot/provenance.json` binds the NUnit XML digest to that revision.

The boolean-controls admission at source `72833ffb7` passed 54/54 EditMode cases on Unity 6000.5.3f1, with zero failures or skips (test-run start `2026-10-31 09:01:57Z`); the added cases exercise label-host Checkbox activation and its native control, disabled suppression, ToggleSwitch root activation exactly once per activation, and the withheld indeterminate/size API.

The passive-containers admission at source `6a430ac8a` passed 55/55 EditMode cases on Unity 6000.5.3f1, with zero failures or skips (test-run start `2026-10-31 09:14:44Z`); the added case composes consumer children into each container, checks the variant/size/trend class carriers, and asserts no Cite/Profile API is exposed.

The Badge admission at source `70fc48807` passed 56/56 EditMode cases on Unity 6000.5.3f1, with zero failures or skips (test-run start `2026-10-31 09:27:13Z`); the added case composes a BadgeContent child, checks the variant/intent/size class carriers, and asserts the omitted icon chrome exposes no Icon/ShowStatusIcon property.

The List admission at source `dd4199529` passed 57/57 EditMode cases on Unity 6000.5.3f1, with zero failures or skips (test-run start `2026-10-31 09:44:45Z`); the added case composes items, checks the prefixed `list--variant-inline`/`list--size-lg` carriers, and asserts the absent As/Marker/Spacing API.

The alert-container admission at source `e13bcb88b` passed 58/58 EditMode cases on Unity 6000.5.3f1, with zero failures or skips (test-run start `2026-10-31 10:01:52Z`); the added case composes content, checks the alert/alert-notice carrier classes, and asserts the absent Icon/Dismissible/OnDismiss/DismissLabel API.

The semantic-wrapper admission at source `f9ced227b` passed 59/59 EditMode cases on Unity 6000.5.3f1, with zero failures or skips (test-run start `2026-10-31 10:18:50Z`); the added case sets the Label text, composes the Breadcrumbs list/item parts, and asserts the absent HtmlFor/Form/AriaLabel/Separator API.

`node scripts/unity-player.mjs` builds and launches a fresh standalone macOS consumer, writes source-bound evidence under `tmp/unity-player/<run-id>`, and rejects absent/mismatched results. Its synthetic UI events prove bounded in-Player behavior, not input-device integration. The recorded environment is Unity 6000.5.3f1 with Metal; the declared 6000.0 minimum and other platforms remain unverified.

`node scripts/unity-tests.mjs --compile-only` is a separate diagnostic using the installed macOS Unity SDK, real Unity assemblies and Unity's UXML source generator. It checks runtime, Editor showcase and sample compilation; it does **not** run Unity, import UXML or execute tests.

## Pilot boundary

The allowlist is in the repository's `fsds.targets.json`. The Unity backend is selected by `--target=all` but is outside the TypeScript admission rail. Its EditMode lane is local and explicit, not an existing CI gate.

[`support-boundary.json`](../ds-codegen/src/frameworks/unity/support-boundary.json) is the machine-readable statement of what the Unity target lowers, leaves pending for a named parity phase, or refuses, with the mechanism or reason for each rule. Generation fails when a contract carries a fact no rule classifies, when an allowlisted component relies on a catch-all rule, or when a lowered claim is not realised by the control a component gets; see [Support boundary](../../docs/architecture/unity-target.md#support-boundary).

This slice implements the interactions above. It does not claim full framework parity, screen-reader integration, controller/gamepad navigation, cross-platform player-build admission, or full visual parity. Styling is the generated projection described above; what it does not realise is listed in `Controls.unsupported.json`. Transitions keep their properties and durations, but a non-keyword easing is reduced to `ease`. The Accordion chevron paints its Icon componentRef; expanded-state rotation remains an unsupported selector. The action control carries no loading affordance, ARIA state or HTML form serialization. The boolean controls expose no indeterminate/mixed state and no form fields. The passive containers expose only carrier-backed style axes and their consumer content region; Blockquote's citation URL and ProfileFlag's structured profile data are refused/pending rather than approximated. Badge's guarded node-content icon decoration is omitted, with `icon` pending P4 and `showStatusIcon` refused. List exposes only its Variant and Size axes: `as` is refused, `marker` is refused because USS has no `list-style-type`, and `spacing` is pending P4. Alert and AlertNotice are static containers whose guarded icon and dismiss chrome is omitted; the dismissal callback, flag and label, and the composed action control, are pending P4. Label exposes no form association and Breadcrumbs exposes no a11y label or separator. Browser form props and DOM IDs are not ported. Tabs keeps an inactive panel's object state even when detached.
