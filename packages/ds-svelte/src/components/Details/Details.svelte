<script module lang="ts">
// @generated:start publicTypes
export type DetailsVariant = "default" | "inline" | "compact";
export type DetailsIcon = "left" | "right" | "none";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import { canActivateInteraction } from "../../primitives/interaction.js";
import { useDetails } from "./useDetails.svelte.js";
import Icon from "../Icon/Icon.svelte";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  summary: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  variant?: DetailsVariant;
  icon?: DetailsIcon;
  class?: string;
  children?: import('svelte').Snippet;
}

let { summary, open, defaultOpen, onOpenChange, disabled, variant = "default", icon = "left", class: className, children }: Props = $props();
// @generated:end

// @generated:start hook
const behavior = useDetails({
  open: () => open,
  defaultOpen: () => defaultOpen,
  onOpenChange: () => onOpenChange,
});
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "details",
    variant ? `details--${variant}` : null,
    icon ? `details--${icon}` : null,
    behavior.open ? "details--open" : null,
    disabled ? "details--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @generated:start fieldAssociation
const instanceId = $props.id();
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<details class={classes} open={behavior.open} data-fsds-component="details" data-fsds-box="">
  <summary class={'details__summary'} onclick={(e) => { if (canActivateInteraction(e, true)) behavior.setOpen(!behavior.open); }} aria-disabled={disabled} aria-controls={behavior.open ? `${instanceId}-content` : undefined}>
    <span class={'details__summaryContent'}>
      <Icon class={'details__icon'} name="chevron-down" size="sm" />
      <span class={'details__summaryText'}>{summary}</span>
    </span>
  </summary>
  {#if behavior.open}
  <div class={'details__content'} id={`${instanceId}-content`}>
    {@render children?.()}
  </div>
  {/if}
</details>
