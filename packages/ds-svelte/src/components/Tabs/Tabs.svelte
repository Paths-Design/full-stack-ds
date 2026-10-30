<script module lang="ts">
// @generated:start publicTypes
export type TabsOrientation = "horizontal" | "vertical";
export type TabsAppearance = "underline" | "pills";
export type TabsActivationMode = "automatic" | "manual";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { useTabs, provideTabsContext } from "./useTabs.svelte.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  appearance?: TabsAppearance;
  activationMode?: TabsActivationMode;
  loop?: boolean;
  unmountInactive?: boolean;
  idBase?: string;
  class?: string;
  "data-testid"?: string;
  children?: import('svelte').Snippet;
}

let {
  value,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  appearance = "underline",
  activationMode = "automatic",
  loop = true,
  unmountInactive,
  idBase: idBaseProp,
  class: className,
  "data-testid": dataTestid,
  children,
}: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useTabs({
  value: () => value,
  defaultValue: () => defaultValue,
  onValueChange: () => onValueChange,
  // idBase is stable after mount — use getter to avoid Svelte lint warning.
  get idBase() { return idBaseProp; },
});

provideTabsContext({
  get activeTab() { return behavior.activeTab; },
  setActiveTab(v) { behavior.setActiveTab(v); },
  get registeredTabs() { return behavior.registeredTabs; },
  registerTab(v) { behavior.registerTab(v); },
  unregisterTab(v) { behavior.unregisterTab(v); },
  idBase: behavior.idBase,
  get orientation() { return orientation ?? "horizontal"; },
  get activationMode() { return activationMode ?? "automatic"; },
  get loop() { return loop ?? true; },
  get unmountInactive() { return unmountInactive ?? true; },
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "tabs",
    orientation ? `tabs--${orientation}` : null,
    appearance ? `tabs--${appearance}` : null,
    activationMode ? `tabs--${activationMode}` : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<div data-fsds-component="tabs" data-fsds-box="" class={classes} data-testid={dataTestid}>
  {@render children?.()}
</div>
