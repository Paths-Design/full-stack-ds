<script module lang="ts">
// @generated:start publicTypes
export type ButtonSize = "small" | "medium" | "large";
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "destructive" | "outline";
export type ButtonType = "button" | "submit" | "reset";
// @generated:end
</script>

<script lang="ts">
// @generated:start imports
import Spinner from "../Spinner/Spinner.svelte";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types

// @generated:end

// @custom:start types

// @custom:end

// @generated:start props
interface Props {
  size?: ButtonSize;
  variant?: ButtonVariant;
  type?: ButtonType;
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  title?: string;
  onClick?: () => void;
  class?: string;
  children?: import('svelte').Snippet;
}

let { size = "medium", variant = "primary", type = "button", loading, disabled, ariaLabel, ariaExpanded, ariaPressed, title, onClick, class: className, children }: Props = $props();
// @generated:end

// @generated:start classes
const classes = $derived(
  [
    "button",
    size ? `button--${size}` : null,
    variant ? `button--${variant}` : null,
    disabled ? "button--disabled" : null,
    className,
  ].filter(Boolean).join(" ")
);
// @generated:end

// @custom:start trailing

// @custom:end
</script>

<button class={classes} onclick={onClick} type={type} disabled={disabled} aria-label={ariaLabel} aria-expanded={ariaExpanded} aria-pressed={ariaPressed} aria-busy={loading} data-fsds-component="button" data-fsds-box="">
  {#if loading}
  <Spinner class={'button__spinner'} size="sm" inline={loading} ariaHidden={loading} />
  {/if}
  <span class={'button__loadingText'}>
    {@render children?.()}
  </span>
</button>
