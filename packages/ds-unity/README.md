# Full Stack DS for Unity UI Toolkit

A local UPM package with contract-generated Switch, Accordion, Popover and Tabs controls. Unity 6 is the API baseline. Generated controls carry `[UxmlElement]` and are usable from C#, UXML and UI Builder; the same runtime assembly serves Editor windows and `UIDocument` panels.

## Import

In Unity's Package Manager, choose **Install package from disk** and select this directory's `package.json`. Keep the package directory at a stable path. This is a local package, not a published Unity registry dependency.

Open **Window → Full Stack DS → Interactive Controls** for the C# showcase. Import **Interactive controls** from the package's Samples section to get `Controls.uxml` and `RuntimeExample.cs`. Open the UXML in UI Builder. For runtime use, assign it to a `UIDocument` with a `PanelSettings` asset and add `RuntimeExample` to that GameObject.

```xml
<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:ds="FullStackDS">
    <ds:Switch label="Enable sound" checked="true" />
    <ds:Accordion collapsible="true">
        <ds:AccordionItem value="graphics" label="Graphics">
            <ui:Label text="Rendering preferences" />
        </ds:AccordionItem>
    </ds:Accordion>
    <ds:Tabs>
        <ds:TabsItem value="first" label="First"><ui:Label text="First panel" /></ds:TabsItem>
        <ds:TabsItem value="second" label="Second"><ui:Label text="Second panel" /></ds:TabsItem>
    </ds:Tabs>
    <ds:Popover label="Help"><ui:Label text="Helpful content" /></ds:Popover>
</ui:UXML>
```

## State and composition

Switch uses `Checked`, `value`, `SetValueWithoutNotify` and Unity's `RegisterValueChangedCallback`. Popover uses `Open` and the same boolean-channel APIs. `Label` supplies trigger text. Both expose the actual UI Toolkit `Trigger`; Popover routes `Add(child)` into its `Content` container.

Accordion and Tabs expose `Value`, `Values`, `ValueChanged`, and `SetValuesWithoutNotify`. Construct an `AccordionItem` or `TabsItem`, set its non-empty unique `Value` and `Label`, add arbitrary content with `item.Add(child)`, then call `group.AddItem(item)`. UXML children register on panel attachment. Use `RemoveItem` before changing keys or moving an item to another group. For imperative `Add`/`Remove` outside these helpers, call `SynchronizeChildren` to update registration.

Accordion defaults to single selection with `Collapsible = false`; use `Type = "multiple"` and `Values` for multiple sections. Tabs supports horizontal/vertical orientation, automatic/manual activation, looping, disabled items, Home/End, arrow navigation and `UnmountInactive`. Native UI Toolkit buttons own pointer and submit activation. Accordion's vertical arrows move focus without selecting.

Values assigned before attachment provide initial state. For owner-controlled state, set `Controlled = true`, handle `ValueRequested`, and commit an accepted value through `Checked`, `Open`, `Value` or `Values`. A request alone does not change presentation. This is a C# adaptation of the contract's controlled/default channel trio; C# event signatures use arrays for both Accordion selection modes.

Popover portals content to its current panel root. It uses the anchor/content union for outside-pointer and blur dismissal, returns focus to the trigger on Escape, and flips/shifts at panel edges. Dismissal flags remain configurable. Removing a Popover unregisters its panel callbacks and removes the floating content.

## Runtime styling

Controls attach the package stylesheet automatically in both Editor and Player panels. Popover content attaches it independently when moved to the panel root. Call `FullStackDS.Theme.Attach(container)` to apply the same text and button styling to a surrounding consumer container. The imported sample also includes the stylesheet for its layout and background.

The stylesheet lives in `Runtime/Resources/FullStackDS/Controls.uss`: explicit typography, selected/disabled/focus states, switch spacing and wrapped, scrollable floating content. These are Unity pilot defaults, not a generated projection of the complete token graph. Consumer overrides should target the `fsds-*` classes; floating content lives outside the originating container, so apply overrides to `popover.Content` as well.

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

This slice implements the interactions above. It does not claim full framework parity, screen-reader integration, controller/gamepad navigation, cross-platform player-build admission, or full visual parity. Default-size switch geometry uses typed token fallback facts; the remaining visual skin is a small Unity-specific base theme. Dynamic brands, other switch sizes, token-color projection, motion, exact compound anatomy, icon-catalog fidelity, browser form props and DOM IDs are not ported. The disclosure marker uses a text affordance rather than the iconography catalog. Tabs keeps an inactive panel's object state even when detached.
