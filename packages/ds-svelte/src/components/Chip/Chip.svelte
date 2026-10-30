<script module lang="ts">
// @generated:start publicTypes
export type ChipType = "button" | "submit" | "reset";
export type ChipVariant = "default" | "selected" | "dismissible";
export type ChipSize = "small" | "medium" | "large";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import Button from "../Button/Button.svelte";
import { useFsdsMessages } from "../../primitives/messages.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  type?: ChipType;
  variant?: ChipVariant;
  size?: ChipSize;
  disabled?: boolean;
  icon?: unknown;
  title?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  onClick?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  class?: string;
  children?: import('svelte').Snippet;
}

let { type, variant, size, disabled, icon, title, ariaLabel, ariaExpanded, ariaPressed, onClick, dismissible, onDismiss, dismissLabel: dismissLabelProp, class: className, children }: Props = $props();
const ChipMessages = { dismiss: "Remove" };
const fsdsMessages = useFsdsMessages("Chip", ChipMessages);
const dismissLabel = $derived(dismissLabelProp ?? fsdsMessages.current.dismiss);
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "chip",
    variant ? `chip--${variant}` : null,
    size ? `chip--${size}` : null,
    disabled ? "chip--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<span class={classes} data-fsds-component="chip" data-fsds-box="">
  <Button class={'chip__action'} variant="ghost" onClick={onClick} type={type} disabled={disabled} ariaLabel={ariaLabel} ariaExpanded={ariaExpanded} ariaPressed={ariaPressed}>
    {#if icon}
    <span class={'chip__icon'} aria-hidden="true">{icon}</span>
    {/if}
    <span class={'chip__text'}>
      {@render children?.()}
    </span>
  </Button>
  {#if dismissible}
  <Button class={'chip__dismiss'} type="button" variant="ghost" onClick={onDismiss} disabled={disabled} ariaLabel={dismissLabel} />
  {/if}
</span>
