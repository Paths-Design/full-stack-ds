# Full Stack DS for Unity UI Toolkit

A local UPM package with contract-generated Switch, Accordion, Popover and Tabs controls. Unity 6 is the API baseline. Generated controls carry `[UxmlElement]` and are usable from C#, UXML and UI Builder; the same runtime assembly serves Editor windows and `UIDocument` panels.

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
</ui:UXML>
```

## State and composition

Each generated root builds the contract's anatomy as a `VisualElement` tree: every part carries `name="<part>"` and the class `<prefix>__<part>`, and the contract's children hole is the root's `contentContainer`. Compound parts are separate generated elements composed by the consumer, as on the web: `AccordionItem`, `AccordionHeader`, `AccordionTrigger`, `AccordionContent`; `TabsList`, `TabsTab`, `TabsPanel`; `PopoverTrigger`, `PopoverContent`. Accordion and Tabs trigger and content parts carry a `Value` pairing key; every trigger part carries `Disabled`. Variant props set a root modifier class `<prefix>--<value>` (`tabs--pills`, `accordion--multiple`), as the web class recipe does.

The constructor attaches one behavior by contract fact and exposes it: `Switch.Control` (`BooleanControl`), `Accordion.Group` / `Tabs.Group` (`ItemGroup`), `Popover.Surface` (`AnchoredSurface`). Switch uses `Checked`, `value`, `SetValueWithoutNotify` and Unity's `RegisterValueChangedCallback`; its children are the label, and a click on the label outside the control toggles it once. Popover uses `Open` and the same boolean-channel APIs. Both expose the native `Trigger` button; Popover also exposes `Content`.

Accordion and Tabs expose `Value`, `Values`, `ValueChanged`, and `Group.SetValuesWithoutNotify`. The group discovers trigger and content sub-elements by part class under the root and pairs them by `Value`; trigger values must be non-empty and unique. Discovery runs on panel attachment, before pointer or submit input reaches a trigger, on root layout changes and on every public mutation; call `Group.Synchronize()` after inserting parts imperatively into an attached root if presentation must update before the next input. A part moved to another root leaves its previous group. Nested components keep their own parts.

Accordion defaults to single selection with `Collapsible = false`; use `Type = "multiple"` and `Values` for multiple sections. Tabs supports horizontal/vertical orientation, automatic/manual activation, looping, disabled items, Home/End, arrow navigation and `UnmountInactive`. Native UI Toolkit buttons own pointer and submit activation. Accordion's vertical arrows move focus without selecting.

Values assigned before attachment provide initial state. For owner-controlled state, set `Controlled = true`, handle `ValueRequested`, and commit an accepted value through `Checked`, `Open`, `Value` or `Values`. A request alone does not change presentation. This is a C# adaptation of the contract's controlled/default channel trio; C# event signatures use arrays for both Accordion selection modes.

Popover portals content to its current panel root. It uses the anchor/content union for outside-pointer and blur dismissal, returns focus to the trigger on Escape, and flips/shifts at panel edges. Dismissal flags remain configurable. Removing a Popover unregisters its panel callbacks and removes the floating content.

## Runtime styling

Controls attach the package stylesheet automatically in both Editor and Player panels. Popover content attaches it independently when moved to the panel root. Call `FullStackDS.Theme.Attach(container)` to apply the same text and button styling to a surrounding consumer container. The imported sample also includes the stylesheet for its layout and background.

The stylesheet lives in `Runtime/Resources/FullStackDS/Controls.uss`: explicit typography, selected/disabled/focus states, switch spacing and wrapped, scrollable floating content. These are Unity pilot defaults, not a generated projection of the complete token graph. Consumer overrides should target the part classes (`switch__track`, `tabs__tab`, …), the root modifiers (`tabs--pills`) and the state classes (`is-checked`, `is-open`, `is-selected`); floating content lives outside the originating container, so apply overrides to `popover.Content` as well.

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

`test:unity` copies the package and sample into `tmp/unity-pilot/project`, then runs real Unity EditMode tests. It needs an activated Editor license and a graphics device for the live Editor panels. Set `UNITY_EDITOR` to the Editor executable when using a different installation. Logs and NUnit XML stay in `tmp/unity-pilot`. Styling tests enter Play mode, render a real Player panel into a texture, and save PNG witnesses under `tmp/unity-pilot/screenshots`; Editor typography, spacing and focus are checked through resolved styles and geometry.

`node scripts/unity-player.mjs` builds and launches a fresh standalone macOS consumer, writes source-bound evidence under `tmp/unity-player/<run-id>`, and rejects absent/mismatched results. Its synthetic UI events prove bounded in-Player behavior, not input-device integration. The recorded environment is Unity 6000.5.3f1 with Metal; the declared 6000.0 minimum and other platforms remain unverified.

`node scripts/unity-tests.mjs --compile-only` is a separate diagnostic using the installed macOS Unity SDK, real Unity assemblies and Unity's UXML source generator. It checks runtime, Editor showcase and sample compilation; it does **not** run Unity, import UXML or execute tests.

## Pilot boundary

The allowlist is in the repository's `fsds.targets.json`. The Unity backend is selected by `--target=all` but is outside the TypeScript admission rail. Its EditMode lane is local and explicit, not an existing CI gate.

[`support-boundary.json`](../ds-codegen/src/frameworks/unity/support-boundary.json) is the machine-readable statement of what the Unity target lowers, leaves pending for a named parity phase, or refuses, with the mechanism or reason for each rule. Generation fails when a contract carries a fact no rule classifies, when an allowlisted component relies on a catch-all rule, or when a lowered claim is not realised by the control a component gets; see [Support boundary](../../docs/architecture/unity-target.md#support-boundary).

This slice implements the interactions above. It does not claim full framework parity, screen-reader integration, controller/gamepad navigation, cross-platform player-build admission, or full visual parity. Default-size switch geometry uses typed token fallback facts; the remaining visual skin is a small Unity-specific base theme. Dynamic brands, other switch sizes, token-color projection, motion, icon-catalog fidelity, browser form props and DOM IDs are not ported. The Accordion chevron is a placeholder element styled by the hand theme, not the iconography catalog. Tabs keeps an inactive panel's object state even when detached.
